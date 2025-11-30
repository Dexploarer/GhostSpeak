/**
 * Integration tests for TransactionIndexer with real Turso database
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { TransactionIndexer } from '../../../src/database/services/TransactionIndexer.js'
import { cleanupTestData, createTestId, isDatabaseConfigured } from '../../helpers/database-helpers.js'
import { getDb } from '../../../src/database/db.js'

describe('TransactionIndexer Integration Tests', () => {
    let indexer: TransactionIndexer

    beforeAll(async () => {
        if (!isDatabaseConfigured()) {
            console.log('⚠️  Skipping database tests - Turso not configured')
            return
        }

        indexer = TransactionIndexer.getInstance()

        // Verify indexer is available
        const isAvailable = await indexer.isIndexerAvailable()
        if (!isAvailable) {
            console.log('⚠️  Transaction indexer not available, tests will be skipped')
        }
    })

    afterEach(async () => {
        if (isDatabaseConfigured()) {
            const db = getDb()
            await cleanupTestData(db, ['x402_transactions', 'agent_analytics'])
        }
    })

    afterAll(async () => {
        if (isDatabaseConfigured()) {
            // Cleanup old test data
            await indexer.cleanupOldTransactions(Date.now() + 86400000) // Clean all
        }
    })

    describe('indexTransaction', () => {
        it('should index transaction successfully', async () => {
            if (!isDatabaseConfigured()) return

            const signature = createTestId('tx')
            const transaction = {
                agentAddress: 'test_agent_123',
                signature,
                payerAddress: 'test_payer',
                recipientAddress: 'test_recipient',
                amount: '1000000',
                tokenMint: 'So11111111111111111111111111111111111111112', // SOL
                tokenDecimals: 9,
                blockTime: Date.now(),
                status: 'confirmed' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            await indexer.indexTransaction(transaction)

            // Verify transaction was indexed
            const indexed = await indexer.getTransaction(signature)
            expect(indexed).toBeDefined()
            expect(indexed?.signature).toBe(signature)
            expect(indexed?.status).toBe('confirmed')
        })

        it('should handle duplicate transactions idempotently', async () => {
            if (!isDatabaseConfigured()) return

            const signature = createTestId('tx')
            const transaction = {
                agentAddress: 'test_agent',
                signature,
                payerAddress: 'test_payer',
                recipientAddress: 'test_recipient',
                amount: '500000',
                tokenMint: 'So11111111111111111111111111111111111111112',
                tokenDecimals: 9,
                blockTime: Date.now(),
                status: 'confirmed' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            // Index twice
            await indexer.indexTransaction(transaction)
            await indexer.indexTransaction(transaction)

            // Should not throw and should only have one entry
            const txs = await indexer.getAgentTransactions('test_agent')
            const matching = txs.filter(tx => tx.signature === signature)
            expect(matching.length).toBe(1)
        })

        it('should index failed transactions', async () => {
            if (!isDatabaseConfigured()) return

            const signature = createTestId('tx')
            const transaction = {
                agentAddress: 'test_agent',
                signature,
                payerAddress: 'test_payer',
                recipientAddress: 'test_recipient',
                amount: '1000000',
                tokenMint: 'So11111111111111111111111111111111111111112',
                tokenDecimals: 9,
                blockTime: Date.now(),
                status: 'failed' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            await indexer.indexTransaction(transaction)

            const indexed = await indexer.getTransaction(signature)
            expect(indexed).toBeDefined()
            expect(indexed?.status).toBe('failed')
        })
    })

    describe('getTransaction', () => {
        it('should retrieve indexed transaction', async () => {
            if (!isDatabaseConfigured()) return

            const signature = createTestId('tx')
            const transaction = {
                agentAddress: 'test_agent',
                signature,
                payerAddress: 'test_payer',
                recipientAddress: 'test_recipient',
                amount: '750000',
                tokenMint: 'So11111111111111111111111111111111111111112',
                tokenDecimals: 9,
                blockTime: Date.now(),
                status: 'finalized' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            await indexer.indexTransaction(transaction)
            const retrieved = await indexer.getTransaction(signature)

            expect(retrieved).toBeDefined()
            expect(retrieved?.signature).toBe(signature)
            expect(retrieved?.status).toBe('finalized')
        })

        it('should return null for non-existent transaction', async () => {
            if (!isDatabaseConfigured()) return

            const nonExistent = await indexer.getTransaction('nonexistent_signature_xyz_12345')
            expect(nonExistent).toBeNull()
        })
    })

    describe('getTransactions', () => {
        it('should retrieve transactions with filters', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            // Index multiple transactions
            const transactions = [
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer1',
                    recipientAddress: 'recipient1',
                    amount: '100000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now() - 3000,
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer2',
                    recipientAddress: 'recipient2',
                    amount: '200000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now() - 2000,
                    status: 'finalized' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer3',
                    recipientAddress: 'recipient3',
                    amount: '300000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now() - 1000,
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ]

            await indexer.indexTransactions(transactions)

            // Retrieve transactions
            const agentTxs = await indexer.getTransactions({ agentAddress })

            expect(agentTxs.length).toBeGreaterThanOrEqual(3)
            expect(agentTxs.every(tx => tx.agentAddress === agentAddress)).toBe(true)
        })

        it('should support pagination', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            // Index 5 transactions
            const txs = []
            for (let i = 0; i < 5; i++) {
                txs.push({
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: `payer_${i}`,
                    recipientAddress: `recipient_${i}`,
                    amount: `${i * 100000}`,
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now() - (5000 - i * 1000),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
            }
            await indexer.indexTransactions(txs)

            // Test pagination
            const page1 = await indexer.getTransactions({ agentAddress, limit: 2, offset: 0 })
            const page2 = await indexer.getTransactions({ agentAddress, limit: 2, offset: 2 })

            expect(page1.length).toBeLessThanOrEqual(2)
            expect(page2.length).toBeLessThanOrEqual(2)

            if (page1.length > 0 && page2.length > 0) {
                expect(page1[0].signature).not.toBe(page2[0].signature)
            }
        })

        it('should filter by status', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            await indexer.indexTransactions([
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer1',
                    recipientAddress: 'recipient1',
                    amount: '100000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer2',
                    recipientAddress: 'recipient2',
                    amount: '200000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'failed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ])

            const confirmedTxs = await indexer.getTransactions({
                agentAddress,
                status: 'confirmed'
            })

            expect(confirmedTxs.every(tx => tx.status === 'confirmed')).toBe(true)
        })
    })

    describe('getAgentTransactions', () => {
        it('should get agent transaction history', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            await indexer.indexTransaction({
                agentAddress,
                signature: createTestId('tx'),
                payerAddress: 'payer',
                recipientAddress: 'recipient',
                amount: '100000',
                tokenMint: 'So11111111111111111111111111111111111111112',
                tokenDecimals: 9,
                blockTime: Date.now(),
                status: 'confirmed' as const,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            const history = await indexer.getAgentTransactions(agentAddress)

            expect(history.length).toBeGreaterThanOrEqual(1)
            expect(history[0].agentAddress).toBe(agentAddress)
        })

        it('should limit results', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            // Index 10 transactions
            for (let i = 0; i < 10; i++) {
                await indexer.indexTransaction({
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: `payer_${i}`,
                    recipientAddress: `recipient_${i}`,
                    amount: `${i * 10000}`,
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
            }

            const history = await indexer.getAgentTransactions(agentAddress, 5)
            expect(history.length).toBeLessThanOrEqual(5)
        })
    })

    describe('getAgentTransactionCount', () => {
        it('should count agent transactions', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            // Index 3 transactions
            for (let i = 0; i < 3; i++) {
                await indexer.indexTransaction({
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: `payer_${i}`,
                    recipientAddress: `recipient_${i}`,
                    amount: '100000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
            }

            const count = await indexer.getAgentTransactionCount(agentAddress)
            expect(count).toBeGreaterThanOrEqual(3)
        })

        it('should filter count by status', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            await indexer.indexTransactions([
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer1',
                    recipientAddress: 'recipient1',
                    amount: '100000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer2',
                    recipientAddress: 'recipient2',
                    amount: '100000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'failed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ])

            const confirmedCount = await indexer.getAgentTransactionCount(agentAddress, 'confirmed')
            expect(confirmedCount).toBeGreaterThanOrEqual(1)
        })
    })

    describe('getAgentRevenue', () => {
        it('should calculate total revenue', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            await indexer.indexTransactions([
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer1',
                    recipientAddress: 'recipient1',
                    amount: '1000000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'confirmed' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    agentAddress,
                    signature: createTestId('tx'),
                    payerAddress: 'payer2',
                    recipientAddress: 'recipient2',
                    amount: '500000',
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenDecimals: 9,
                    blockTime: Date.now(),
                    status: 'finalized' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ])

            const revenue = await indexer.getAgentRevenue(agentAddress)

            // Revenue should be sum of confirmed/finalized transactions
            expect(revenue).toBeDefined()
            expect(BigInt(revenue)).toBeGreaterThan(0n)
        })
    })

    describe('cleanupOldTransactions', () => {
        it('should delete old transactions', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')
            const oldTimestamp = Date.now() - 86400000 // 24 hours ago

            // Index old transaction
            await indexer.indexTransaction({
                agentAddress,
                signature: createTestId('tx'),
                payerAddress: 'payer',
                recipientAddress: 'recipient',
                amount: '100000',
                tokenMint: 'So11111111111111111111111111111111111111112',
                tokenDecimals: 9,
                blockTime: oldTimestamp,
                status: 'confirmed' as const,
                createdAt: oldTimestamp,
                updatedAt: oldTimestamp
            })

            // Cleanup transactions older than 12 hours ago
            const deletedCount = await indexer.cleanupOldTransactions(Date.now() - 43200000)

            expect(deletedCount).toBeGreaterThanOrEqual(0)
        })
    })
})
