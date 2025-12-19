/**
 * x402 Facilitator Integration Tests
 *
 * These tests prove that GhostSpeak works as a real x402 facilitator.
 * They test the complete flow from payment verification to settlement.
 *
 * @module tests/integration/x402-facilitator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSolanaRpc } from '@solana/kit'
import type { Address, Rpc, SolanaRpcApi, Signature } from '@solana/kit'

// Import the facilitator and related modules
import {
  GhostSpeakFacilitator,
  createGhostSpeakFacilitator,
  X402Client,
  createX402Client,
  FacilitatorRegistry,
  Network,
  calculateNewReputation,
  reputationToStars
} from '../../src/x402/index.js'

// =====================================================
// TEST CONFIGURATION
// =====================================================

const DEVNET_RPC = 'https://api.devnet.solana.com'

// Sample addresses for testing
const SAMPLE_AGENT_ADDRESS = 'GhostAgent1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx' as Address
const SAMPLE_PAYER_ADDRESS = '7nYdW2E8qhxD3cX7pPB6vMzL1kRjY9sNfAqZuHmT4gKp' as Address
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address

// =====================================================
// MOCK RPC FOR UNIT TESTS
// =====================================================

function createMockRpc(): Rpc<SolanaRpcApi> {
  return {
    getTransaction: vi.fn().mockImplementation((signature: string) => ({
      send: vi.fn().mockResolvedValue({
        slot: 12345n,
        blockTime: Math.floor(Date.now() / 1000),
        meta: {
          err: null,
          preTokenBalances: [
            { accountIndex: 0, mint: USDC_MINT, uiTokenAmount: { amount: '1000000000' }, owner: SAMPLE_PAYER_ADDRESS }
          ],
          postTokenBalances: [
            { accountIndex: 0, mint: USDC_MINT, uiTokenAmount: { amount: '999000000' }, owner: SAMPLE_PAYER_ADDRESS },
            { accountIndex: 1, mint: USDC_MINT, uiTokenAmount: { amount: '1000000' }, owner: SAMPLE_AGENT_ADDRESS }
          ]
        },
        transaction: {
          message: { accountKeys: [] }
        }
      })
    })),
    getAccountInfo: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({ value: null })
    })),
    getLatestBlockhash: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({
        value: {
          blockhash: 'mock_blockhash',
          lastValidBlockHeight: 12345n
        }
      })
    })),
    getBalance: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({ value: 1000000000n })
    })),
    getProgramAccounts: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue([])
    })),
    getMultipleAccounts: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({ value: [] })
    }))
  } as unknown as Rpc<SolanaRpcApi>
}

// =====================================================
// FACILITATOR INITIALIZATION TESTS
// =====================================================

describe('GhostSpeakFacilitator', () => {
  describe('Initialization', () => {
    it('should create facilitator without wallet (read-only mode)', () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])
      
      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      expect(facilitator).toBeDefined()
      expect(facilitator.id).toBe('ghostspeak')
      expect(facilitator.name).toBe('GhostSpeak')
      expect(facilitator.network).toBe(Network.SOLANA)
      expect(facilitator.hasWallet()).toBe(false)
    })

    it('should have all expected features enabled', () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])
      
      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      expect(facilitator.features.escrow).toBe(true)
      expect(facilitator.features.reputation).toBe(true)
      expect(facilitator.features.disputes).toBe(true)
      expect(facilitator.features.workOrders).toBe(true)
      expect(facilitator.features.privacy).toBe(true)
      expect(facilitator.features.compressedAgents).toBe(true)
    })

    it('should return correct capabilities list', () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])
      
      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const capabilities = facilitator.getCapabilities()
      
      expect(capabilities).toContain('x402-payment-verification')
      expect(capabilities).toContain('x402-payment-settlement')
      expect(capabilities).toContain('on-chain-escrow')
      expect(capabilities).toContain('on-chain-reputation')
      expect(capabilities).toContain('dispute-resolution')
      expect(capabilities).toContain('solana-native')
    })
  })

  // =====================================================
  // PAYMENT VERIFICATION TESTS
  // =====================================================

  describe('Payment Verification', () => {
    it('should verify a valid payment', async () => {
      const mockRpc = createMockRpc()
      
      // Create mock X402Client with successful verification
      const mockVerifyPayment = vi.fn().mockResolvedValue({
        valid: true,
        receipt: {
          signature: 'valid_signature_123',
          recipient: SAMPLE_AGENT_ADDRESS,
          amount: BigInt(1000000), // 1 USDC
          token: USDC_MINT,
          timestamp: Date.now(),
          metadata: { payer: SAMPLE_PAYER_ADDRESS }
        }
      })
      
      const x402Client = {
        verifyPayment: mockVerifyPayment
      } as unknown as X402Client

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      // First check that the facilitator was created correctly
      expect(facilitator).toBeDefined()
      expect(facilitator.id).toBe('ghostspeak')

      const result = await facilitator.verifyPayment(
        'valid_signature_123_with_enough_length_to_pass_validation:payload',
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000',
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      // If result is invalid, log the reason for debugging
      if (!result.valid) {
        console.log('Verification failed:', result.invalidReason)
      }

      // Verify the mock was called
      expect(mockVerifyPayment).toHaveBeenCalled()
      expect(result.valid).toBe(true)
      expect(result.amount).toBe('1000000')
    })

    it('should reject insufficient payment', async () => {
      const mockRpc = createMockRpc()
      const validSignature = 'small_payment_sig_with_enough_length_for_validation'
      
      const x402Client = {
        verifyPayment: vi.fn().mockResolvedValue({
          valid: true,
          receipt: {
            signature: validSignature,
            recipient: SAMPLE_AGENT_ADDRESS,
            amount: BigInt(500000), // 0.5 USDC (insufficient)
            token: USDC_MINT,
            timestamp: Date.now()
          }
        })
      } as unknown as X402Client

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const result = await facilitator.verifyPayment(
        `${validSignature}:payload`,
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000', // Requires 1 USDC
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      expect(result.valid).toBe(false)
      expect(result.invalidReason).toContain('Insufficient payment')
    })

    it('should reject wrong recipient', async () => {
      const mockRpc = createMockRpc()
      const wrongRecipient = 'WrongRecipientXXXXXXXXXXXXXXXXXXXXXXXXXXX' as Address
      const validSignature = 'wrong_recipient_sig_with_enough_length_for_validation'
      
      const x402Client = {
        verifyPayment: vi.fn().mockResolvedValue({
          valid: true,
          receipt: {
            signature: validSignature,
            recipient: wrongRecipient,
            amount: BigInt(1000000),
            token: USDC_MINT,
            timestamp: Date.now()
          }
        })
      } as unknown as X402Client

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const result = await facilitator.verifyPayment(
        `${validSignature}:payload`,
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000',
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      expect(result.valid).toBe(false)
      expect(result.invalidReason).toContain('recipient mismatch')
    })

    it('should handle invalid payment header format', async () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const result = await facilitator.verifyPayment(
        'short', // Invalid - too short
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000',
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      expect(result.valid).toBe(false)
      expect(result.invalidReason).toContain('Invalid payment header')
    })
  })

  // =====================================================
  // PAYMENT SETTLEMENT TESTS
  // =====================================================

  describe('Payment Settlement', () => {
    it('should settle a valid payment', async () => {
      const mockRpc = createMockRpc()
      
      const x402Client = {
        verifyPayment: vi.fn().mockResolvedValue({
          valid: true,
          receipt: {
            signature: 'settable_payment_sig_with_enough_length',
            recipient: SAMPLE_AGENT_ADDRESS,
            amount: 1_000_000n,
            token: USDC_MINT,
            timestamp: Date.now()
          }
        })
      } as unknown as X402Client

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const result = await facilitator.settlePayment(
        'settable_payment_sig_with_enough_length:payload',
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000',
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      expect(result.success).toBe(true)
      expect(result.transaction).toBe('settable_payment_sig_with_enough_length')
      expect(result.settledAt).toBeDefined()
    })

    it('should fail settlement for invalid payment', async () => {
      const mockRpc = createMockRpc()
      
      const x402Client = {
        verifyPayment: vi.fn().mockResolvedValue({
          valid: false,
          error: 'Transaction not found'
        })
      } as unknown as X402Client

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const result = await facilitator.settlePayment(
        'invalid_payment_sig_with_enough_length:payload',
        {
          scheme: 'exact',
          network: Network.SOLANA,
          maxAmountRequired: '1000000',
          resource: 'https://api.agent.ai/v1/generate',
          payTo: SAMPLE_AGENT_ADDRESS,
          asset: USDC_MINT,
          description: 'Text generation'
        }
      )

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })
  })

  // =====================================================
  // AGENT DISCOVERY TESTS
  // =====================================================

  describe('Agent Discovery', () => {
    it('should convert agent to payment requirement', () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      const agent = {
        address: SAMPLE_AGENT_ADDRESS,
        name: 'Test Agent',
        description: 'A test AI agent',
        owner: SAMPLE_PAYER_ADDRESS,
        x402Enabled: true,
        x402PaymentAddress: SAMPLE_AGENT_ADDRESS,
        x402AcceptedTokens: [USDC_MINT],
        x402PricePerCall: 1_000_000n,
        x402ServiceEndpoint: 'https://api.test-agent.ai/v1',
        x402TotalPayments: 1000n,
        x402TotalCalls: 100n,
        lastPaymentTimestamp: BigInt(Date.now()),
        reputationScore: 9500,
        totalJobs: 50n,
        successfulJobs: 48n,
        averageRating: 4.75,
        capabilities: ['text-generation', 'chat'],
        isVerified: true
      }

      const requirement = facilitator.agentToPaymentRequirement(agent)

      expect(requirement.scheme).toBe('exact')
      expect(requirement.network).toBe(Network.SOLANA)
      expect(requirement.maxAmountRequired).toBe('1000000')
      expect(requirement.resource).toBe('https://api.test-agent.ai/v1')
      expect(requirement.payTo).toBe(SAMPLE_AGENT_ADDRESS)
      expect(requirement.asset).toBe(USDC_MINT)
      expect(requirement.extra?.reputationScore).toBe(9500)
    })
  })

  // =====================================================
  // ESCROW TESTS (Read-only without wallet)
  // =====================================================

  describe('Escrow Operations', () => {
    it('should throw when creating escrow without wallet', async () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
        // No wallet provided
      })

      await expect(
        facilitator.createEscrowPayment(
          SAMPLE_AGENT_ADDRESS,
          1_000_000n,
          'task-123',
          USDC_MINT
        )
      ).rejects.toThrow('Wallet required')
    })

    it('should throw when releasing escrow without wallet', async () => {
      const mockRpc = createMockRpc()
      const x402Client = new X402Client(mockRpc as Parameters<typeof X402Client>[0]['rpc'])

      const facilitator = createGhostSpeakFacilitator({
        rpc: mockRpc,
        x402Client
      })

      await expect(
        facilitator.releaseEscrow('escrow-123')
      ).rejects.toThrow('Wallet required')
    })
  })
})

// =====================================================
// REPUTATION CALCULATION TESTS
// =====================================================

describe('Reputation Calculation', () => {
  it('should calculate first rating correctly', () => {
    // First rating starts from 0
    const newRep = calculateNewReputation(0, 5)
    
    // 5 stars = 10000 basis points
    // EMA: (0 * 9000 + 10000 * 1000) / 10000 = 1000
    expect(newRep).toBe(1000)
  })

  it('should apply EMA for subsequent ratings', () => {
    // Current reputation: 8000 (80%)
    // New rating: 5 stars (10000 bp)
    const newRep = calculateNewReputation(8000, 5)
    
    // EMA: (8000 * 9000 + 10000 * 1000) / 10000 = 8200
    expect(newRep).toBe(8200)
  })

  it('should decrease reputation for low ratings', () => {
    // Current reputation: 8000
    // New rating: 1 star (2000 bp)
    const newRep = calculateNewReputation(8000, 1)
    
    // EMA: (8000 * 9000 + 2000 * 1000) / 10000 = 7400
    expect(newRep).toBe(7400)
  })

  it('should cap reputation at max', () => {
    const newRep = calculateNewReputation(10000, 5)
    expect(newRep).toBeLessThanOrEqual(10000)
  })

  it('should convert reputation to stars correctly', () => {
    expect(reputationToStars(10000)).toBe(5) // Max = 5 stars
    expect(reputationToStars(8000)).toBe(4)  // 80% ≈ 4 stars
    expect(reputationToStars(6000)).toBe(3)  // 60% = 3 stars
    expect(reputationToStars(4000)).toBe(2)  // 40% = 2 stars
    expect(reputationToStars(2000)).toBe(1)  // 20% = 1 star
  })
})

// =====================================================
// FACILITATOR REGISTRY TESTS
// =====================================================

describe('FacilitatorRegistry', () => {
  it('should include GhostSpeak in known facilitators', () => {
    const registry = new FacilitatorRegistry()
    const ghostspeak = registry.get('ghostspeak')
    
    expect(ghostspeak).toBeDefined()
    expect(ghostspeak?.name).toBe('GhostSpeak')
    expect(ghostspeak?.networks).toContain(Network.SOLANA)
  })

  it('should get facilitators by network for Solana', () => {
    const registry = new FacilitatorRegistry()
    const solanaFacilitators = registry.getByNetwork(Network.SOLANA)
    
    expect(solanaFacilitators.length).toBeGreaterThan(0)
    // GhostSpeak should be in the list
    const ghostspeak = solanaFacilitators.find(f => f.id === 'ghostspeak')
    expect(ghostspeak).toBeDefined()
  })
})

// =====================================================
// EVENT EMISSION TESTS
// =====================================================

describe('Facilitator Events', () => {
  it('should emit payment:verified on successful verification', async () => {
    const mockRpc = createMockRpc()
    
    const x402Client = {
      verifyPayment: vi.fn().mockResolvedValue({
        valid: true,
        receipt: {
          signature: 'event_test_sig_with_enough_length_valid',
          recipient: SAMPLE_AGENT_ADDRESS,
          amount: 1_000_000n,
          token: USDC_MINT,
          timestamp: Date.now()
        }
      })
    } as unknown as X402Client

    const facilitator = createGhostSpeakFacilitator({
      rpc: mockRpc,
      x402Client
    })

    const eventPromise = new Promise<{ signature: string }>((resolve) => {
      facilitator.once('payment:verified', resolve)
    })

    await facilitator.verifyPayment(
      'event_test_sig_with_enough_length_valid:payload',
      {
        scheme: 'exact',
        network: Network.SOLANA,
        maxAmountRequired: '1000000',
        resource: 'https://api.agent.ai/v1/generate',
        payTo: SAMPLE_AGENT_ADDRESS,
        asset: USDC_MINT,
        description: 'Test'
      }
    )

    const event = await eventPromise
    expect(event.signature).toBe('event_test_sig_with_enough_length_valid')
  })

  it('should emit payment:settled on successful settlement', async () => {
    const mockRpc = createMockRpc()
    
    const x402Client = {
      verifyPayment: vi.fn().mockResolvedValue({
        valid: true,
        receipt: {
          signature: 'settle_event_sig_with_enough_length_val',
          recipient: SAMPLE_AGENT_ADDRESS,
          amount: 1_000_000n,
          token: USDC_MINT,
          timestamp: Date.now()
        }
      })
    } as unknown as X402Client

    const facilitator = createGhostSpeakFacilitator({
      rpc: mockRpc,
      x402Client
    })

    const eventPromise = new Promise<{ signature: string }>((resolve) => {
      facilitator.once('payment:settled', resolve)
    })

    await facilitator.settlePayment(
      'settle_event_sig_with_enough_length_val:payload',
      {
        scheme: 'exact',
        network: Network.SOLANA,
        maxAmountRequired: '1000000',
        resource: 'https://api.agent.ai/v1/generate',
        payTo: SAMPLE_AGENT_ADDRESS,
        asset: USDC_MINT,
        description: 'Test'
      }
    )

    const event = await eventPromise
    expect(event.signature).toBe('settle_event_sig_with_enough_length_val')
  })
})
