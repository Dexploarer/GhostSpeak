import { vi } from 'vitest'
import { address } from '@solana/addresses'

// Mock the generated instruction functions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateEscrowInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getCompleteEscrowInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getCancelEscrowInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getDisputeEscrowInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getProcessPartialRefundInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  EscrowStatus: {
    Active: 'Active',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
    Disputed: 'Disputed'
  }
}))

import { describe, it, expect, beforeEach } from 'vitest'
import { EscrowModule } from '../../../src/modules/escrow/EscrowModule.js'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { EscrowStatus } from '../../../src/generated/index.js'
import { NATIVE_MINT_ADDRESS } from '../../../src/constants/system-addresses.js'

describe('EscrowModule', () => {
  let escrowModule: EscrowModule
  let mockClient: GhostSpeakClient
  let mockBuyer: TransactionSigner
  let mockSeller: TransactionSigner

  beforeEach(() => {
    // Create mock client
    mockClient = {
      programId: address('11111111111111111111111111111119'),
      config: {
        endpoint: 'https://api.devnet.solana.com'
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn().mockResolvedValue({
        data: {
          status: EscrowStatus.Active,
          amount: 1000000n,
          buyer: address('11111111111111111111111111111114'),
          seller: address('11111111111111111111111111111115')
        }
      })
    } as unknown as GhostSpeakClient

    // Create mock signers
    mockBuyer = {
      address: address('BuyerWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    mockSeller = {
      address: address('Se11erWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    // Create escrow module instance
    escrowModule = new EscrowModule(mockClient)
  })

  describe('create', () => {
    it('should create a new escrow', async () => {
      const result = await escrowModule.create({
        escrowId: 'escrow-123',
        amount: 1000000n,
        buyer: mockBuyer.address,
        seller: mockSeller.address,
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create escrow with SOL (native mint)', async () => {
      const result = await escrowModule.create({
        escrowId: 'escrow-sol',
        amount: 1000000n,
        buyer: mockBuyer.address,
        seller: mockSeller.address,
        mint: NATIVE_MINT_ADDRESS,
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
    })

    it('should create escrow with custom token', async () => {
      const customMint = address('TokenMintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      
      const result = await escrowModule.create({
        escrowId: 'escrow-token',
        amount: 1000000n,
        buyer: mockBuyer.address,
        seller: mockSeller.address,
        mint: customMint,
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('complete', () => {
    it('should complete an escrow', async () => {
      const result = await escrowModule.complete({
        escrowId: 'escrow-123',
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('should cancel an escrow', async () => {
      const result = await escrowModule.cancel({
        escrowId: 'escrow-123',
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('dispute', () => {
    it('should raise a dispute', async () => {
      const result = await escrowModule.dispute({
        escrowId: 'escrow-123',
        reason: 'Service not delivered as promised',
        signers: [mockBuyer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('processPartialRefund', () => {
    it('should process a partial refund', async () => {
      const result = await escrowModule.processPartialRefund({
        escrowId: 'escrow-123',
        refundAmount: 500000n,
        signers: [mockSeller]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should validate refund amount', async () => {
      await expect(
        escrowModule.processPartialRefund({
          escrowId: 'escrow-123',
          refundAmount: 2000000n, // More than escrow amount
          signers: [mockSeller]
        })
      ).rejects.toThrow('Refund amount exceeds escrow amount')
    })
  })

  describe('getEscrowDetails', () => {
    it('should fetch escrow details', async () => {
      const details = await escrowModule.getEscrowDetails('escrow-123')

      expect(details).toEqual({
        status: EscrowStatus.Active,
        amount: 1000000n,
        buyer: address('BuyerWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
        seller: address('Se11erWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      })
      expect(mockClient.fetchAccount).toHaveBeenCalled()
    })
  })
})