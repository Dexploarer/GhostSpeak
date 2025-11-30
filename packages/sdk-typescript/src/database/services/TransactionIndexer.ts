/**
 * Transaction Indexing Service
 * 
 * Indexes x402 payment transactions to Turso database for fast queries
 * and analytics aggregation.
 * 
 * @module database/services/TransactionIndexer
 */

import { eq, desc, and, sql } from 'drizzle-orm'
import { getDb } from '../db.js'
import { x402Transactions, agentAnalytics, type X402Transaction, type NewX402Transaction } from '../schema/index.js'
import { isAvailable } from '../connection.js'
import type { Address } from '@solana/kit'

/**
 * Transaction query filters
 */
export interface TransactionFilters {
    agentAddress?: string
    payerAddress?: string
    status?: 'confirmed' | 'finalized' | 'failed'
    tokenMint?: string
    fromTime?: number // Unix timestamp
    toTime?: number // Unix timestamp
    limit?: number
    offset?: number
}

/**
 * Transaction Indexing Service
 * 
 * Manages indexing of x402 payment transactions from Solana.
 */
export class TransactionIndexer {
    private static instance: TransactionIndexer | null = null

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): TransactionIndexer {
        if (!TransactionIndexer.instance) {
            TransactionIndexer.instance = new TransactionIndexer()
        }
        return TransactionIndexer.instance
    }

    /**
     * Check if indexer is available
     */
    async isIndexerAvailable(): Promise<boolean> {
        return await isAvailable()
    }

    /**
     * Index a transaction
     * 
     * @param transaction - Transaction data to index
     */
    async indexTransaction(transaction: NewX402Transaction): Promise<void> {
        if (!await this.isIndexerAvailable()) {
            console.warn('[TransactionIndexer] Database not available, skipping indexing')
            return
        }

        try {
            const db = await getDb()

            // Insert or update transaction
            await db
                .insert(x402Transactions)
                .values({
                    ...transaction,
                    createdAt: transaction.createdAt ?? Date.now(),
                    updatedAt: transaction.updatedAt ?? Date.now()
                })
                .onConflictDoUpdate({
                    target: x402Transactions.signature,
                    set: {
                        status: transaction.status,
                        responseTimeMs: transaction.responseTimeMs,
                        updatedAt: Date.now()
                    }
                })

            console.log(`[TransactionIndexer] Indexed transaction ${transaction.signature}`)

            // Update agent analytics asynchronously
            this.updateAgentAnalytics(transaction.agentAddress, transaction.amount).catch(err =>
                console.warn('[TransactionIndexer] Failed to update analytics:', err)
            )
        } catch (error) {
            console.error('[TransactionIndexer] Failed to index transaction:', error)
        }
    }

    /**
     * Index batch of transactions
     * 
     * @param transactions - Array of transactions to index
     */
    async indexTransactions(transactions: NewX402Transaction[]): Promise<void> {
        if (!await this.isIndexerAvailable() || transactions.length === 0) {
            return
        }

        try {
            const db = await getDb()
            const now = Date.now()

            // Add timestamps to all transactions
            const txsWithTimestamps = transactions.map(tx => ({
                ...tx,
                createdAt: tx.createdAt ?? now,
                updatedAt: tx.updatedAt ?? now
            }))

            // Batch insert
            await db.insert(x402Transactions).values(txsWithTimestamps)

            console.log(`[TransactionIndexer] Indexed ${transactions.length} transactions`)

            // Update analytics for unique agents
            const uniqueAgents = [...new Set(transactions.map(tx => tx.agentAddress))]
            await Promise.all(
                uniqueAgents.map(agentAddress => {
                    const agentTxs = transactions.filter(tx => tx.agentAddress === agentAddress)
                    const totalAmount = agentTxs.reduce((sum, tx) => sum + BigInt(tx.amount), 0n)
                    return this.updateAgentAnalytics(agentAddress, totalAmount.toString()).catch(err =>
                        console.warn(`[TransactionIndexer] Failed to update analytics for ${agentAddress}:`, err)
                    )
                })
            )
        } catch (error) {
            console.error('[TransactionIndexer] Failed to index transactions:', error)
        }
    }

    /**
     * Get transaction by signature
     * 
     * @param signature - Transaction signature
     */
    async getTransaction(signature: string): Promise<X402Transaction | null> {
        if (!await this.isIndexerAvailable()) {
            return null
        }

        try {
            const db = await getDb()
            const results = await db
                .select()
                .from(x402Transactions)
                .where(eq(x402Transactions.signature, signature))
                .limit(1)

            return results[0] ?? null
        } catch (error) {
            console.warn('[TransactionIndexer] Failed to get transaction:', error)
            return null
        }
    }

    /**
     * Get transactions with filters
     * 
     * @param filters - Query filters
     */
    async getTransactions(filters: TransactionFilters = {}): Promise<X402Transaction[]> {
        if (!await this.isIndexerAvailable()) {
            return []
        }

        try {
            const db = await getDb()
            const {
                agentAddress,
                payerAddress,
                status,
                tokenMint,
                fromTime,
                toTime,
                limit = 50,
                offset = 0
            } = filters

            // Build WHERE conditions
            const conditions = []
            if (agentAddress) {
                conditions.push(eq(x402Transactions.agentAddress, agentAddress))
            }
            if (payerAddress) {
                conditions.push(eq(x402Transactions.payerAddress, payerAddress))
            }
            if (status) {
                conditions.push(eq(x402Transactions.status, status))
            }
            if (tokenMint) {
                conditions.push(eq(x402Transactions.tokenMint, tokenMint))
            }
            if (fromTime) {
                conditions.push(sql`${x402Transactions.blockTime} >= ${fromTime}`)
            }
            if (toTime) {
                conditions.push(sql`${x402Transactions.blockTime} <= ${toTime}`)
            }

            // Build and execute query
            if (conditions.length > 0) {
                const results = await db
                    .select()
                    .from(x402Transactions)
                    .where(and(...conditions))
                    .orderBy(desc(x402Transactions.blockTime))
                    .limit(limit)
                    .offset(offset)
                return results
            } else {
                const results = await db
                    .select()
                    .from(x402Transactions)
                    .orderBy(desc(x402Transactions.blockTime))
                    .limit(limit)
                    .offset(offset)
                return results
            }
        } catch (error) {
            console.warn('[TransactionIndexer] Failed to get transactions:', error)
            return []
        }
    }

    /**
     * Get agent transaction history
     * 
     * @param agentAddress - Agent address
     * @param limit - Maximum results
     */
    async getAgentTransactions(
        agentAddress: string,
        limit = 50
    ): Promise<X402Transaction[]> {
        return this.getTransactions({ agentAddress, limit })
    }

    /**
     * Get transaction count for agent
     * 
     * @param agentAddress - Agent address
     * @param status - Optional status filter
     */
    async getAgentTransactionCount(
        agentAddress: string,
        status?: 'confirmed' | 'finalized' | 'failed'
    ): Promise<number> {
        if (!await this.isIndexerAvailable()) {
            return 0
        }

        try {
            const db = await getDb()

            const conditions = [eq(x402Transactions.agentAddress, agentAddress)]
            if (status) {
                conditions.push(eq(x402Transactions.status, status))
            }

            const result = await db
                .select({ count: sql<number>`count(*)` })
                .from(x402Transactions)
                .where(and(...conditions))

            return result[0]?.count ?? 0
        } catch (error) {
            console.warn('[TransactionIndexer] Failed to get transaction count:', error)
            return 0
        }
    }

    /**
     * Get total revenue for agent
     * 
     * @param agentAddress - Agent address
     */
    async getAgentRevenue(agentAddress: string): Promise<string> {
        if (!await this.isIndexerAvailable()) {
            return '0'
        }

        try {
            const db = await getDb()

            const result = await db
                .select({
                    total: sql<string>`CAST(SUM(CAST(${x402Transactions.amount} AS INTEGER)) AS TEXT)`
                })
                .from(x402Transactions)
                .where(
                    and(
                        eq(x402Transactions.agentAddress, agentAddress),
                        eq(x402Transactions.status, 'finalized')
                    )
                )

            return result[0]?.total ?? '0'
        } catch (error) {
            console.warn('[TransactionIndexer] Failed to get agent revenue:', error)
            return '0'
        }
    }

    /**
     * Update agent analytics based on transaction
     * 
     * @param agentAddress - Agent address
     * @param amount - Transaction amount
     */
    private async updateAgentAnalytics(
        agentAddress: string,
        amount: string
    ): Promise<void> {
        if (!await this.isIndexerAvailable()) {
            return
        }

        try {
            const db = await getDb()

            // Get current analytics
            const existing = await db
                .select()
                .from(agentAnalytics)
                .where(eq(agentAnalytics.agentAddress, agentAddress))
                .limit(1)

            const now = Date.now()

            if (existing.length > 0) {
                // Update existing analytics
                const current = existing[0]
                const newRevenue = BigInt(current.totalRevenue) + BigInt(amount)
                const newTotal = current.totalTransactions + 1
                const newSuccessful = current.successfulTransactions + 1
                const successRate = (newSuccessful / newTotal) * 100

                await db
                    .update(agentAnalytics)
                    .set({
                        totalRevenue: newRevenue.toString(),
                        totalTransactions: newTotal,
                        successfulTransactions: newSuccessful,
                        successRate,
                        lastTransactionAt: now,
                        updatedAt: now
                    })
                    .where(eq(agentAnalytics.agentAddress, agentAddress))
            } else {
                // Create new analytics
                await db.insert(agentAnalytics).values({
                    agentAddress,
                    totalRevenue: amount,
                    totalTransactions: 1,
                    successfulTransactions: 1,
                    successRate: 100,
                    averageRating: 0,
                    averageResponseTimeMs: 0,
                    lastTransactionAt: now,
                    updatedAt: now
                })
            }
        } catch (error) {
            console.error('[TransactionIndexer] Failed to update agent analytics:', error)
        }
    }

    /**
     * Delete old transactions (cleanup)
     * 
     * @param olderThan - Delete transactions older than this timestamp
     */
    async cleanupOldTransactions(olderThan: number): Promise<number> {
        if (!await this.isIndexerAvailable()) {
            return 0
        }

        try {
            const db = await getDb()

            const result = await db
                .delete(x402Transactions)
                .where(sql`${x402Transactions.blockTime} < ${olderThan}`)

            console.log(`[TransactionIndexer] Cleaned up old transactions`)
            return 0 // Drizzle doesn't return affected rows for delete
        } catch (error) {
            console.error('[TransactionIndexer] Failed to cleanup transactions:', error)
            return 0
        }
    }
}

// Export singleton instance
export const transactionIndexer = TransactionIndexer.getInstance()
