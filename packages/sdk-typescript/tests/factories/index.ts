/**
 * Test Data Factories
 * 
 * Factory functions to create mock test data for GhostSpeak SDK tests
 */

import { address, type Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

// Helper to generate random IDs
const randomId = () => Math.random().toString(36).substring(7)

/**
 * Create a mock agent for testing
 */
export const createMockAgent = (overrides: Partial<{
    address: Address
    owner: Address
    name: string
    description: string
    endpoint: string
    isActive: boolean
    reputation: number
    totalEarnings: bigint
    totalServices: bigint
}> = {}) => ({
    address: address('AGENTtest' + randomId().padEnd(32, '0').substring(0, 32)),
    owner: address('OWNERtest' + randomId().padEnd(32, '0').substring(0, 32)),
    name: 'TestAgent',
    description: 'An agent for testing',
    endpoint: 'https://test-agent.example.com',
    isActive: true,
    reputation: 100,
    totalEarnings: 0n,
    totalServices: 0n,
    ...overrides
})

/**
 * Create a mock escrow for testing
 */
export const createMockEscrow = (overrides: Partial<{
    address: Address
    provider: Address
    requester: Address
    amount: bigint
    status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed'
    serviceId: string
    createdAt: bigint
}> = {}) => ({
    address: address('ESCROWts' + randomId().padEnd(32, '0').substring(0, 32)),
    provider: address('PROVtest' + randomId().padEnd(32, '0').substring(0, 32)),
    requester: address('REQUtest' + randomId().padEnd(32, '0').substring(0, 32)),
    amount: 1_000_000n, // 1 SOL in lamports
    status: 'pending' as const,
    serviceId: 'svc_' + randomId(),
    createdAt: BigInt(Date.now()),
    ...overrides
})

/**
 * Create a mock transaction for testing
 */
export const createMockTransaction = (overrides: Partial<{
    signature: string
    agent: Address
    amount: bigint
    status: 'pending' | 'confirmed' | 'failed'
    timestamp: bigint
    type: 'payment' | 'registration' | 'escrow' | 'governance'
}> = {}) => ({
    signature: 'TX' + randomId().padEnd(86, '0').substring(0, 86),
    agent: address('AGENTtx' + randomId().padEnd(32, '0').substring(0, 32)),
    amount: 500_000n,
    status: 'confirmed' as const,
    timestamp: BigInt(Date.now()),
    type: 'payment' as const,
    ...overrides
})

/**
 * Create a mock channel for testing
 */
export const createMockChannel = (overrides: Partial<{
    id: string
    channelType: 'Direct' | 'Group' | 'Broadcast'
    participants: Address[]
    admin: Address
    messageCount: bigint
    createdAt: bigint
    isActive: boolean
}> = {}) => ({
    id: 'channel_' + randomId(),
    channelType: 'Direct' as const,
    participants: [
        address('USER1test' + randomId().padEnd(32, '0').substring(0, 32)),
        address('USER2test' + randomId().padEnd(32, '0').substring(0, 32))
    ],
    admin: address('ADMINtest' + randomId().padEnd(32, '0').substring(0, 32)),
    messageCount: 0n,
    createdAt: BigInt(Date.now()),
    isActive: true,
    ...overrides
})

/**
 * Create a mock governance proposal for testing
 */
export const createMockProposal = (overrides: Partial<{
    id: bigint
    title: string
    description: string
    proposer: Address
    status: 'active' | 'passed' | 'rejected' | 'executed'
    votesFor: bigint
    votesAgainst: bigint
    quorum: bigint
    endTime: bigint
    proposalType: 'parameter' | 'upgrade' | 'treasury'
}> = {}) => ({
    id: BigInt(Math.floor(Math.random() * 1000)),
    title: 'Test Proposal',
    description: 'A proposal for testing purposes',
    proposer: address('PROPOSERt' + randomId().padEnd(32, '0').substring(0, 32)),
    status: 'active' as const,
    votesFor: 0n,
    votesAgainst: 0n,
    quorum: 1000n,
    endTime: BigInt(Date.now() + 86400000), // 24 hours from now
    proposalType: 'parameter' as const,
    ...overrides
})

/**
 * Create a mock message for testing
 */
export const createMockMessage = (overrides: Partial<{
    id: bigint
    sender: Address
    content: string
    timestamp: bigint
    channelId: string
    hasAttachment: boolean
    reactions: Record<string, Address[]>
}> = {}) => ({
    id: BigInt(Math.floor(Math.random() * 10000)),
    sender: address('SENDERtest' + randomId().padEnd(32, '0').substring(0, 32)),
    content: 'Test message',
    timestamp: BigInt(Date.now()),
    channelId: 'channel_' + randomId(),
    hasAttachment: false,
    reactions: {},
    ...overrides
})

/**
 * Create a mock TransactionSigner for testing
 */
export const createMockSigner = (overrides: Partial<{
    address: Address
}> = {}): TransactionSigner => ({
    address: overrides.address ?? address('SIGNERtest' + randomId().padEnd(32, '0').substring(0, 32)),
    keyPair: {} as CryptoKeyPair,
    signMessages: vi.fn(),
    signTransactions: vi.fn()
})

/**
 * Create a mock marketplace listing for testing
 */
export const createMockListing = (overrides: Partial<{
    id: string
    agent: Address
    owner: Address
    price: bigint
    title: string
    description: string
    category: string
    isActive: boolean
    rating: number
    totalSales: bigint
}> = {}) => ({
    id: 'listing_' + randomId(),
    agent: address('AGENTlist' + randomId().padEnd(32, '0').substring(0, 32)),
    owner: address('OWNERlist' + randomId().padEnd(32, '0').substring(0, 32)),
    price: 1_000_000n,
    title: 'Test Service',
    description: 'A test service listing',
    category: 'AI/ML',
    isActive: true,
    rating: 5,
    totalSales: 0n,
    ...overrides
})

// Re-export vi from vitest for convenience
export { vi } from 'vitest'
