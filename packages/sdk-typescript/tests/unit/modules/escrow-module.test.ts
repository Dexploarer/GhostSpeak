/**
 * EscrowModule Tests
 *
 * Tests the EscrowModule class which manages escrow transactions
 * for the GhostSpeak protocol.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { GhostSpeakConfig } from '../../../src/types'

// Valid test addresses (well-known Solana addresses)
const PROGRAM_ID = address('11111111111111111111111111111111')
const BUYER_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const AGENT_ADDRESS = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const ARBITRATOR_ADDRESS = address('SysvarRent111111111111111111111111111111111')
const ESCROW_ADDRESS = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const ESCROW_VAULT = address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
const TOKEN_MINT = address('So11111111111111111111111111111111111111112')
const CLIENT_TOKEN_ACCOUNT = address('Sysvar1nstructions1111111111111111111111111')
const AGENT_TOKEN_ACCOUNT = address('SysvarC1ock11111111111111111111111111111111')
const AGENT_STAKING = address('SysvarS1otHashes111111111111111111111111111')

// Mock InstructionBuilder to avoid actual transaction signing
const mockExecute = vi.fn().mockResolvedValue('mock-signature')
const mockGetAccount = vi.fn().mockResolvedValue(null)

vi.mock('../../../src/core/InstructionBuilder.js', () => ({
  InstructionBuilder: vi.fn().mockImplementation(() => ({
    execute: mockExecute,
    getAccount: mockGetAccount,
    executeBatch: vi.fn().mockResolvedValue('mock-batch-signature'),
    estimateCost: vi.fn().mockResolvedValue(5000n),
    explain: vi.fn().mockResolvedValue('Mock explanation'),
    debug: vi.fn().mockResolvedValue({}),
    enableDebug: vi.fn(),
    getAccounts: vi.fn().mockResolvedValue([]),
    getProgramAccounts: vi.fn().mockResolvedValue([])
  }))
}))

// Mock CacheManager
vi.mock('../../../src/core/CacheManager.js', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    isEnabled: vi.fn().mockReturnValue(false),
    getAccount: vi.fn().mockReturnValue(undefined),
    setAccount: vi.fn(),
    invalidateAccount: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({ hits: 0, misses: 0 })
  }))
}))

// Mock the generated index to return instruction builders
vi.mock('../../../src/generated/index.js', () => ({
  getCreateEscrowInstructionAsync: vi.fn().mockResolvedValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getSubmitDeliveryInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getApproveDeliveryInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getFileDisputeInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getArbitrateDisputeInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getGhostProtectEscrowDecoder: () => ({
    decode: () => ({
      escrowId: 123n,
      amount: 1000000n,
      client: BUYER_ADDRESS,
      agent: AGENT_ADDRESS,
      status: { active: {} },
      jobDescription: 'Test job',
      deadline: 1700000000n,
      deliveryProof: null
    })
  })
}))

// Now import the EscrowModule which uses the mocked InstructionBuilder
import { EscrowModule } from '../../../src/modules/escrow/EscrowModule.js'
import type { TransactionSigner } from '@solana/kit'
import {
  getCreateEscrowInstructionAsync,
  getSubmitDeliveryInstruction,
  getApproveDeliveryInstruction,
  getFileDisputeInstruction,
  getArbitrateDisputeInstruction
} from '../../../src/generated/index.js'

describe('EscrowModule', () => {
  let escrowModule: EscrowModule
  let config: GhostSpeakConfig
  let mockClient: TransactionSigner
  let mockAgent: TransactionSigner
  let mockArbitrator: TransactionSigner

  beforeEach(() => {
    vi.clearAllMocks()
    mockExecute.mockResolvedValue('mock-signature')
    mockGetAccount.mockResolvedValue(null)

    config = {
      programId: PROGRAM_ID,
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
      cluster: 'devnet'
    }

    mockClient = {
      address: BUYER_ADDRESS,
      signTransactionMessage: vi.fn()
    } as unknown as TransactionSigner

    mockAgent = {
      address: AGENT_ADDRESS,
      signTransactionMessage: vi.fn()
    } as unknown as TransactionSigner

    mockArbitrator = {
      address: ARBITRATOR_ADDRESS,
      signTransactionMessage: vi.fn()
    } as unknown as TransactionSigner

    escrowModule = new EscrowModule(config)
  })

  describe('createEscrow', () => {
    it('should create a new escrow', async () => {
      const result = await escrowModule.createEscrow({
        agent: AGENT_ADDRESS,
        clientTokenAccount: CLIENT_TOKEN_ACCOUNT,
        escrowVault: ESCROW_VAULT,
        tokenMint: TOKEN_MINT,
        client: mockClient,
        escrowId: 123n,
        amount: 1000000n,
        jobDescription: 'Test job description',
        deadline: 1700000000n
      })

      expect(result).toBe('mock-signature')
      expect(getCreateEscrowInstructionAsync).toHaveBeenCalled()
    })

    it('should pass correct parameters to instruction', async () => {
      const params = {
        agent: AGENT_ADDRESS,
        clientTokenAccount: CLIENT_TOKEN_ACCOUNT,
        escrowVault: ESCROW_VAULT,
        tokenMint: TOKEN_MINT,
        client: mockClient,
        escrowId: 456n,
        amount: 2000000n,
        jobDescription: 'Another job',
        deadline: 1800000000n
      }

      await escrowModule.createEscrow(params)

      expect(getCreateEscrowInstructionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: params.agent,
          escrowId: params.escrowId,
          amount: params.amount
        }),
        expect.objectContaining({ programAddress: config.programId })
      )
    })
  })

  describe('submitDelivery', () => {
    it('should submit delivery proof', async () => {
      const result = await escrowModule.submitDelivery({
        escrow: ESCROW_ADDRESS,
        agent: AGENT_ADDRESS,
        agentOwner: mockAgent,
        deliveryProof: 'ipfs://QmTest123'
      })

      expect(result).toBe('mock-signature')
      expect(getSubmitDeliveryInstruction).toHaveBeenCalled()
    })
  })

  describe('approveDelivery', () => {
    it('should approve delivery and release funds', async () => {
      const result = await escrowModule.approveDelivery({
        escrow: ESCROW_ADDRESS,
        escrowVault: ESCROW_VAULT,
        agentTokenAccount: AGENT_TOKEN_ACCOUNT,
        client: mockClient
      })

      expect(result).toBe('mock-signature')
      expect(getApproveDeliveryInstruction).toHaveBeenCalled()
    })
  })

  describe('fileDispute', () => {
    it('should file a dispute', async () => {
      const result = await escrowModule.fileDispute({
        escrow: ESCROW_ADDRESS,
        client: mockClient,
        reason: 'Service not delivered as promised'
      })

      expect(result).toBe('mock-signature')
      expect(getFileDisputeInstruction).toHaveBeenCalled()
    })
  })

  describe('arbitrateDispute', () => {
    it('should arbitrate a dispute', async () => {
      const result = await escrowModule.arbitrateDispute({
        escrow: ESCROW_ADDRESS,
        escrowVault: ESCROW_VAULT,
        clientTokenAccount: CLIENT_TOKEN_ACCOUNT,
        agentTokenAccount: AGENT_TOKEN_ACCOUNT,
        agentStaking: AGENT_STAKING,
        arbitrator: mockArbitrator,
        decision: { favorClient: {} } as any
      })

      expect(result).toBe('mock-signature')
      expect(getArbitrateDisputeInstruction).toHaveBeenCalled()
    })
  })

  describe('getEscrow', () => {
    it('should fetch escrow details', async () => {
      const escrow = await escrowModule.getEscrow(ESCROW_ADDRESS)

      // Mock returns null since BaseModule.getAccount is mocked to return null
      expect(escrow).toBeNull()
    })
  })
})
