/**
 * Test Helpers for GhostSpeak CLI
 * Mock SDK clients, wallet utilities, and RPC responses
 */

import { vi } from 'vitest'
import type { Address } from '@solana/addresses'

/**
 * Mock Agent Data
 */
export const createMockAgentData = (overrides?: any) => ({
  name: 'TestAgent',
  address: 'TestAgent1111111111111111111111111111' as Address,
  owner: 'Owner11111111111111111111111111111111' as Address,
  reputationScore: 50000, // 500 Ghost Score (500 * 100)
  totalJobsCompleted: 100,
  totalJobsFailed: 10,
  createdAt: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  ...overrides
})

/**
 * Mock SDK Client
 */
export const createMockSDKClient = () => ({
  agent: {
    getAgentAccount: vi.fn(async () => createMockAgentData()),
    listByOwner: vi.fn(async () => [createMockAgentData()]),
    create: vi.fn(async () => ({ signature: 'mock-signature-123' })),
    update: vi.fn(async () => ({ signature: 'mock-signature-456' }))
  },
  staking: {
    stake: vi.fn(async () => ({ signature: 'mock-stake-signature' })),
    unstake: vi.fn(async () => ({ signature: 'mock-unstake-signature' })),
    getStakingAccount: vi.fn(async () => ({
      stakedAmount: BigInt(10000 * 1_000_000_000), // 10,000 GHOST
      pendingRewards: BigInt(125.5 * 1_000_000_000), // 125.5 GHOST
      lastClaimed: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000)
    })),
    claimRewards: vi.fn(async () => ({ signature: 'mock-claim-signature' }))
  },
  privacy: {
    setPrivacyMode: vi.fn(async () => ({ signature: 'mock-privacy-signature' })),
    getPrivacySettings: vi.fn(async () => ({
      mode: 'selective',
      scoreVisible: false,
      tierVisible: true,
      metricsVisible: false
    }))
  },
  did: {
    create: vi.fn(async () => ({ signature: 'mock-did-create-signature' })),
    update: vi.fn(async () => ({ signature: 'mock-did-update-signature' })),
    resolve: vi.fn(async () => ({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111',
      verificationMethod: [],
      service: []
    })),
    deactivate: vi.fn(async () => ({ signature: 'mock-did-deactivate-signature' }))
  },
  escrow: {
    create: vi.fn(async () => ({ signature: 'mock-escrow-create-signature' })),
    approve: vi.fn(async () => ({ signature: 'mock-escrow-approve-signature' })),
    dispute: vi.fn(async () => ({ signature: 'mock-escrow-dispute-signature' })),
    getEscrow: vi.fn(async () => ({
      address: 'Escrow111111111111111111111111111111' as Address,
      job: 'Test job',
      creator: 'Creator1111111111111111111111111111' as Address,
      agent: 'Agent111111111111111111111111111111' as Address,
      amount: BigInt(100 * 1_000_000_000), // 100 GHOST
      status: 'pending'
    })),
    listEscrows: vi.fn(async () => [])
  }
})

/**
 * Mock Wallet
 */
export const createMockWallet = () => ({
  address: 'Wallet11111111111111111111111111111111' as Address,
  publicKey: new Uint8Array(32),
  secretKey: new Uint8Array(64)
})

/**
 * Mock RPC Client
 */
export const createMockRpc = () => ({
  getBalance: vi.fn(() => ({
    send: vi.fn(async () => ({ value: BigInt(1_000_000_000) })) // 1 SOL
  })),
  getLatestBlockhash: vi.fn(() => ({
    send: vi.fn(async () => ({
      value: {
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: BigInt(123456)
      }
    }))
  })),
  sendTransaction: vi.fn(() => ({
    send: vi.fn(async () => 'mock-tx-signature')
  })),
  confirmTransaction: vi.fn(() => ({
    send: vi.fn(async () => ({ value: { err: null } }))
  }))
})

/**
 * Mock Prompts
 */
export const createMockPrompts = () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(async () => 'mock-input'),
  select: vi.fn(async () => 'mock-choice'),
  confirm: vi.fn(async () => true),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn()
  })),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  },
  note: vi.fn()
})

/**
 * Mock initializeClient
 */
export const createMockInitializeClient = (
  sdkClient = createMockSDKClient(),
  wallet = createMockWallet(),
  rpc = createMockRpc()
) => {
  return vi.fn(async () => ({
    client: sdkClient,
    wallet,
    rpc,
    pooledRpc: null
  }))
}

/**
 * Helper to test Ghost Score calculation
 */
export const calculateGhostScore = (reputationScore: number): number => {
  return Math.min(1000, Math.round(reputationScore / 100))
}

/**
 * Helper to determine tier from Ghost Score
 */
export const determineTier = (ghostScore: number): string => {
  if (ghostScore >= 900) return 'PLATINUM'
  if (ghostScore >= 750) return 'GOLD'
  if (ghostScore >= 500) return 'SILVER'
  if (ghostScore >= 200) return 'BRONZE'
  return 'NEWCOMER'
}

/**
 * Helper to calculate staking tier
 */
export const calculateStakingTier = (amountStaked: number): number => {
  if (amountStaked >= 50000) return 5
  if (amountStaked >= 25000) return 4
  if (amountStaked >= 10000) return 3
  if (amountStaked >= 5000) return 2
  if (amountStaked >= 1000) return 1
  return 0
}

/**
 * Helper to calculate escrow deposit percentage
 */
export const calculateDepositPercentage = (tier: string): number => {
  if (tier === 'PLATINUM' || tier === 'GOLD') return 0
  if (tier === 'SILVER') return 15
  return 25 // BRONZE or NEWCOMER
}

/**
 * Wait for async operations
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock console methods to prevent log spam during tests
 */
export const mockConsole = () => {
  const originalConsole = { ...console }
  console.log = vi.fn()
  console.info = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()

  return () => {
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  }
}
