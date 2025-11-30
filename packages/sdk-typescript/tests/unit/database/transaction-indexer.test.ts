/**
 * Unit tests for TransactionIndexer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TransactionIndexer } from '../../../src/database/services/TransactionIndexer.js'

// Mock the database connection
vi.mock('../../../src/database/connection.js', () => ({
    isAvailable: vi.fn(() => Promise.resolve(false))
}))

describe('TransactionIndexer', () => {
    let indexer: TransactionIndexer

    beforeEach(() => {
        indexer = TransactionIndexer.getInstance()
    })

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = TransactionIndexer.getInstance()
            const instance2 = TransactionIndexer.getInstance()

            expect(instance1).toBe(instance2)
        })
    })

    describe('isIndexerAvailable', () => {
        it('should return false when database not available', async () => {
            const available = await indexer.isIndexerAvailable()

            expect(available).toBe(false)
        })
    })

    describe('indexTransaction (without database)', () => {
        it('should not throw when database not available', async () => {
            const consoleSpy = vi.spyOn(console, 'warn')

            await indexer.indexTransaction({
                signature: 'test_sig',
                agentAddress: 'agent',
                payerAddress: 'payer',
                recipientAddress: 'recipient',
                amount: '1000',
                tokenMint: 'USDC',
                tokenDecimals: 6,
                status: 'confirmed',
                blockTime: Math.floor(Date.now() / 1000),
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Database not available')
            )

            consoleSpy.mockRestore()
        })
    })

    describe('indexTransactions (without database)', () => {
        it('should not throw for empty array', async () => {
            await expect(
                indexer.indexTransactions([])
            ).resolves.toBeUndefined()
        })

        it('should not throw when database not available', async () => {
            await expect(
                indexer.indexTransactions([
                    {
                        signature: 'sig1',
                        agentAddress: 'agent',
                        payerAddress: 'payer',
                        recipientAddress: 'recipient',
                        amount: '1000',
                        tokenMint: 'USDC',
                        tokenDecimals: 6,
                        status: 'confirmed',
                        blockTime: Math.floor(Date.now() / 1000),
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }
                ])
            ).resolves.toBeUndefined()
        })
    })

    describe('getTransaction (without database)', () => {
        it('should return null when database not available', async () => {
            const tx = await indexer.getTransaction('test_sig')

            expect(tx).toBeNull()
        })
    })

    describe('getTransactions (without database)', () => {
        it('should return empty array when database not available', async () => {
            const txs = await indexer.getTransactions()

            expect(txs).toEqual([])
        })

        it('should handle filters gracefully', async () => {
            const txs = await indexer.getTransactions({
                agentAddress: 'test',
                status: 'finalized',
                limit: 10
            })

            expect(txs).toEqual([])
        })
    })

    describe('getAgentTransactions (without database)', () => {
        it('should return empty array when database not available', async () => {
            const txs = await indexer.getAgentTransactions('test_agent')

            expect(txs).toEqual([])
        })
    })

    describe('getAgentTransactionCount (without database)', () => {
        it('should return 0 when database not available', async () => {
            const count = await indexer.getAgentTransactionCount('test_agent')

            expect(count).toBe(0)
        })

        it('should handle status filter', async () => {
            const count = await indexer.getAgentTransactionCount('test_agent', 'finalized')

            expect(count).toBe(0)
        })
    })

    describe('getAgentRevenue (without database)', () => {
        it('should return "0" when database not available', async () => {
            const revenue = await indexer.getAgentRevenue('test_agent')

            expect(revenue).toBe('0')
        })
    })

    describe('cleanupOldTransactions (without database)', () => {
        it('should return 0 when database not available', async () => {
            const deleted = await indexer.cleanupOldTransactions(Date.now() - 86400000)

            expect(deleted).toBe(0)
        })
    })
})
