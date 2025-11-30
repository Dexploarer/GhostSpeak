/**
 * Test Assertion Helpers
 * 
 * Reusable assertion functions for GhostSpeak SDK tests
 */

import { expect } from 'vitest'
import type { Address } from '@solana/addresses'

/**
 * Assert that a transaction result is valid
 */
export const expectTransactionSuccess = (result: unknown) => {
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect((result as string).length).toBeGreaterThan(0)
    // Solana signatures are typically 87-88 base58 characters
    expect((result as string).length).toBeGreaterThanOrEqual(64)
}

/**
 * Assert that an agent has valid structure
 */
export const expectValidAgent = (agent: any) => {
    expect(agent).toBeDefined()
    expect(agent.address).toBeDefined()
    expect(agent.owner).toBeDefined()
    expect(agent.name).toBeDefined()
    expect(typeof agent.isActive).toBe('boolean')
    expect(typeof agent.reputation).toBe('number')

    // Validate address format
    expect(agent.address).toMatch(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/)
    expect(agent.owner).toMatch(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/)
}

/**
 * Assert that an escrow has valid structure
 */
export const expectValidEscrow = (escrow: any) => {
    expect(escrow).toBeDefined()
    expect(escrow.address).toBeDefined()
    expect(escrow.provider).toBeDefined()
    expect(escrow.requester).toBeDefined()
    expect(typeof escrow.amount).toBe('bigint')
    expect(escrow.amount).toBeGreaterThan(0n)
    expect(escrow.status).toMatch(/^(pending|active|completed|cancelled|disputed)$/)
}

/**
 * Assert that a channel has valid structure
 */
export const expectValidChannel = (channel: any) => {
    expect(channel).toBeDefined()
    expect(channel.id).toBeDefined()
    expect(channel.channelType).toMatch(/^(Direct|Group|Broadcast)$/)
    expect(Array.isArray(channel.participants)).toBe(true)
    expect(channel.participants.length).toBeGreaterThan(0)
    expect(typeof channel.messageCount).toBe('bigint')
}

/**
 * Assert that a proposal has valid structure
 */
export const expectValidProposal = (proposal: any) => {
    expect(proposal).toBeDefined()
    expect(typeof proposal.id).toBe('bigint')
    expect(proposal.title).toBeDefined()
    expect(proposal.description).toBeDefined()
    expect(proposal.proposer).toBeDefined()
    expect(proposal.status).toMatch(/^(active|passed|rejected|executed)$/)
    expect(typeof proposal.votesFor).toBe('bigint')
    expect(typeof proposal.votesAgainst).toBe('bigint')
}

/**
 * Assert that a message has valid structure
 */
export const expectValidMessage = (message: any) => {
    expect(message).toBeDefined()
    expect(typeof message.id).toBe('bigint')
    expect(message.sender).toBeDefined()
    expect(message.content).toBeDefined()
    expect(typeof message.content).toBe('string')
    expect(typeof message.timestamp).toBe('bigint')
}

/**
 * Assert that an SDK error has the expected structure
 */
export const expectSDKError = (error: any, expectedCode?: string) => {
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBeDefined()

    if (expectedCode) {
        expect(error.code).toBe(expectedCode)
    }
}

/**
 * Assert that an address is valid Solana format
 */
export const expectValidAddress = (address: Address | string) => {
    expect(address).toBeDefined()
    expect(typeof address).toBe('string')
    // Solana addresses are 32-44 base58 characters
    expect(address).toMatch(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/)
}

/**
 * Assert that a transaction signature is valid format
 */
export const expectValidSignature = (signature: string) => {
    expect(signature).toBeDefined()
    expect(typeof signature).toBe('string')
    // Solana signatures are typically 87-88 base58 characters
    expect(signature.length).toBeGreaterThanOrEqual(64)
    expect(signature.length).toBeLessThanOrEqual(128)
}

/**
 * Assert that a timestamp is reasonable (not too old, not in future)
 */
export const expectReasonableTimestamp = (timestamp: bigint) => {
    expect(typeof timestamp).toBe('bigint')

    const now = BigInt(Date.now())
    const oneYearAgo = now - BigInt(365 * 24 * 60 * 60 * 1000)
    const oneYearFromNow = now + BigInt(365 * 24 * 60 * 60 * 1000)

    expect(timestamp).toBeGreaterThan(oneYearAgo)
    expect(timestamp).toBeLessThan(oneYearFromNow)
}

/**
 * Assert that a bigint amount is valid (positive)
 */
export const expectValidAmount = (amount: bigint, min: bigint = 0n) => {
    expect(typeof amount).toBe('bigint')
    expect(amount).toBeGreaterThanOrEqual(min)
}

/**
 * Assert that pagination parameters are valid
 */
export const expectValidPagination = (result: any) => {
    expect(result).toBeDefined()
    expect(Array.isArray(result.items) || Array.isArray(result)).toBe(true)

    if ('hasMore' in result) {
        expect(typeof result.hasMore).toBe('boolean')
    }

    if ('nextCursor' in result) {
        expect(result.nextCursor === null || typeof result.nextCursor === 'string').toBe(true)
    }
}

/**
 * Assert that a listing has valid structure
 */
export const expectValidListing = (listing: any) => {
    expect(listing).toBeDefined()
    expect(listing.id).toBeDefined()
    expect(listing.agent).toBeDefined()
    expect(listing.owner).toBeDefined()
    expect(typeof listing.price).toBe('bigint')
    expect(listing.price).toBeGreaterThan(0n)
    expect(listing.title).toBeDefined()
    expect(typeof listing.isActive).toBe('boolean')
}

/**
 * Assert that account data format is valid
 */
export const expectValidAccountData = (account: any) => {
    expect(account).toBeDefined()
    expect(account.address).toBeDefined()
    expect(account.data).toBeDefined()
    expectValidAddress(account.address)
}

/**
 * Assert array length is within expected range
 */
export const expectArrayLength = (arr: any[], min: number, max?: number) => {
    expect(Array.isArray(arr)).toBe(true)
    expect(arr.length).toBeGreaterThanOrEqual(min)

    if (max !== undefined) {
        expect(arr.length).toBeLessThanOrEqual(max)
    }
}
