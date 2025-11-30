/**
 * Transaction Index Schema
 * 
 * Drizzle ORM schema for indexing x402 payment transactions.
 * Enables fast queries for transaction history and analytics.
 * 
 * @module database/schema/transactions
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

/**
 * x402 transactions table - indexes all payment transactions
 */
export const x402Transactions = sqliteTable('x402_transactions', {
    // Primary key - Solana transaction signature
    signature: text('signature').primaryKey(),

    // Addresses
    agentAddress: text('agent_address').notNull(), // Agent that received payment
    payerAddress: text('payer_address').notNull(), // Who paid
    recipientAddress: text('recipient_address').notNull(), // Payment recipient

    // Payment details
    amount: text('amount').notNull(), // Amount in token's smallest unit (stored as text for bigint)
    tokenMint: text('token_mint').notNull(), // Token used for payment
    tokenDecimals: integer('token_decimals').notNull(),

    // Transaction status
    status: text('status').notNull().default('confirmed'), // 'confirmed', 'finalized', 'failed'

    // Timing
    blockTime: integer('block_time').notNull(), // Unix timestamp from Solana
    responseTimeMs: integer('response_time_ms'), // API response time (nullable)

    // Metadata
    metadataHash: text('metadata_hash'), // IPFS hash if applicable (nullable)

    // Timestamps
    createdAt: integer('created_at').notNull(), // When indexed
    updatedAt: integer('updated_at').notNull() // Last update
}, (table) => ({
    // Indexes for common queries
    agentIdx: index('idx_tx_agent').on(table.agentAddress),
    payerIdx: index('idx_tx_payer').on(table.payerAddress),
    blockTimeIdx: index('idx_tx_block_time').on(table.blockTime),
    statusIdx: index('idx_tx_status').on(table.status),
    tokenIdx: index('idx_tx_token').on(table.tokenMint),
    // Composite index for agent + time range queries
    agentTimeIdx: index('idx_tx_agent_time').on(table.agentAddress, table.blockTime)
}))

// TypeScript types inferred from schema
export type X402Transaction = typeof x402Transactions.$inferSelect
export type NewX402Transaction = typeof x402Transactions.$inferInsert
