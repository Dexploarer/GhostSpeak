import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'
import type { IInstruction } from '@solana/kit'
import type { ElGamalKeypair, ElGamalCiphertext, ElGamalPubkey } from '../../../src/utils/elgamal.js'
import { ed25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/curves/abstract/utils'
import { TEST_ADDRESSES } from '../../helpers/setup.js'
import type { Connection } from '@solana/web3.js'

// Mock modules must be defined at the top level
vi.mock('../../../src/utils/elgamal.js')
vi.mock('../../../src/utils/zk-proof-builder.js')

describe('ConfidentialTransferManager', () => {
  let manager: any // ConfidentialTransferManager
  let mockConnection: Connection
  let mockMint: Address
  let mockAuthority: TransactionSigner
  let mockAccount: Address
  let mockElGamalKeypair: ElGamalKeypair
  let mockElGamalPubkey: ElGamalPubkey
  let mockCiphertext: ElGamalCiphertext

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock addresses
    mockMint = TEST_ADDRESSES.mint
    mockAccount = TEST_ADDRESSES.token

    // Setup mock authority signer
    mockAuthority = {
      address: TEST_ADDRESSES.authority,
      signTransactions: vi.fn(),
      signMessages: vi.fn()
    }

    // Setup mock ElGamal keypair
    const privKey = randomBytes(32)
    privKey[0] &= 248
    privKey[31] &= 127
    privKey[31] |= 64
    // Use the private key directly without converting to BigInt
    const pubKey = ed25519.getPublicKey(privKey)
    
    mockElGamalKeypair = {
      publicKey: pubKey,
      secretKey: privKey
    }

    mockElGamalPubkey = pubKey

    // Setup mock ciphertext
    const commitment = ed25519.ExtendedPoint.BASE.multiply(12345n).toRawBytes()
    const handle = ed25519.ExtendedPoint.BASE.multiply(67890n).toRawBytes()
    mockCiphertext = {
      commitment: { commitment },
      handle: { handle }
    }

    // Setup mocks
    const elgamalModule = await import('../../../src/utils/elgamal.js')
    const zkProofModule = await import('../../../src/utils/zk-proof-builder.js')

    // Mock elgamal functions - only mock functions that actually exist
    if (elgamalModule.generateElGamalKeypair) {
      vi.mocked(elgamalModule.generateElGamalKeypair).mockImplementation(() => mockElGamalKeypair)
    }
    if (elgamalModule.encryptAmount) {
      vi.mocked(elgamalModule.encryptAmount).mockImplementation(() => mockCiphertext)
    }
    if (elgamalModule.decryptAmount) {
      vi.mocked(elgamalModule.decryptAmount).mockImplementation(() => 1000n)
    }

    // Mock zk-proof-builder functions
    if (zkProofModule.isZkProgramAvailable) {
      vi.mocked(zkProofModule.isZkProgramAvailable).mockReturnValue(false)
    }
    if (zkProofModule.getZkProgramStatus) {
      vi.mocked(zkProofModule.getZkProgramStatus).mockReturnValue('ZK ElGamal Proof Program is currently disabled (as of July 2025)')
    }
    if (zkProofModule.generateRangeProofWithCommitment) {
      vi.mocked(zkProofModule.generateRangeProofWithCommitment).mockReturnValue({
        proof: new Uint8Array(674),
        commitment: new Uint8Array(32),
        requiresZkProgram: false
      })
    }
    if (zkProofModule.generateTransferProofWithInstruction) {
      vi.mocked(zkProofModule.generateTransferProofWithInstruction).mockReturnValue({
        transferProof: {
          encryptedTransferAmount: new Uint8Array(64),
          newSourceCommitment: new Uint8Array(32),
          equalityProof: new Uint8Array(192),
          validityProof: new Uint8Array(96),
          rangeProof: new Uint8Array(674)
        },
        newSourceBalance: mockCiphertext,
        destCiphertext: mockCiphertext,
        requiresZkProgram: false
      })
    }

    // Setup mock connection
    mockConnection = {
      getAccountInfo: vi.fn(),
      sendTransaction: vi.fn(),
      confirmTransaction: vi.fn(),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 1000
      })
    } as unknown as Connection

    // Import and create manager instance
    const { ConfidentialTransferManager } = await import('../../../src/utils/confidential-transfer-manager.js')
    manager = new ConfidentialTransferManager(mockConnection)
  })

  describe('Program Status', () => {
    it('should report ZK program status', () => {
      const status = manager.getZkProgramStatus()
      expect(status).toContain('disabled')
      expect(status).toContain('July 2025')
    })

    it('should check if ZK program is available', () => {
      expect(manager.isZkProgramAvailable()).toBe(false)
    })
  })

  describe('Keypair Generation', () => {
    it('should generate ElGamal keypair', async () => {
      const { generateElGamalKeypair } = await import('../../../src/utils/elgamal.js')
      
      const keypair = manager.generateKeypair()
      
      expect(keypair).toEqual(mockElGamalKeypair)
      expect(generateElGamalKeypair).toHaveBeenCalled()
    })
  })

  describe('Mint Configuration', () => {
    it('should create configure mint instruction', async () => {
      const config = {
        mint: mockMint,
        authority: mockAuthority,
        autoApproveNewAccounts: true,
        auditorElgamalPubkey: mockElGamalPubkey
      }

      const instruction = manager.createConfigureMintInstruction(config)

      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(instruction.accounts).toHaveLength(2)
      expect(instruction.accounts[0]).toEqual({ address: mockMint, role: 2 })
      expect(instruction.accounts[1]).toEqual({ address: mockAuthority.address, role: 3 })
      expect(instruction.data).toBeInstanceOf(Uint8Array)
    })

    it('should handle missing auditor pubkey', () => {
      const config = {
        mint: mockMint,
        authority: mockAuthority,
        autoApproveNewAccounts: false
      }

      const instruction = manager.createConfigureMintInstruction(config)

      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Account Configuration', () => {
    it('should create configure account instructions', async () => {
      const params = {
        account: mockAccount,
        mint: mockMint,
        authority: mockAuthority,
        elgamalKeypair: mockElGamalKeypair,
        maxPendingBalanceCredits: 100n
      }

      const result = await manager.createConfigureAccountInstructions(params)

      expect(result.instructions).toHaveLength(1)
      expect(result.proofInstructions).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      
      const instruction = result.instructions[0]
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(instruction.accounts).toHaveLength(3)
    })

    it('should add warning when ZK program required', async () => {
      const { generateRangeProofWithCommitment } = await import('../../../src/utils/zk-proof-builder.js')
      
      vi.mocked(generateRangeProofWithCommitment).mockReturnValueOnce({
        proof: new Uint8Array(674),
        commitment: new Uint8Array(32),
        requiresZkProgram: true
      })

      const params = {
        account: mockAccount,
        mint: mockMint,
        authority: mockAuthority,
        elgamalKeypair: mockElGamalKeypair,
        maxPendingBalanceCredits: 100n
      }

      const result = await manager.createConfigureAccountInstructions(params)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('disabled')
    })
  })

  describe('Deposit Operations', () => {
    it('should create deposit instructions', async () => {
      const params = {
        account: mockAccount,
        mint: mockMint,
        authority: mockAuthority,
        amount: 1000n,
        decimals: 9
      }

      const result = await manager.createDepositInstructions(params)

      expect(result.instructions).toHaveLength(1)
      expect(result.proofInstructions).toHaveLength(0)
      expect(result.encryptedAmount).toEqual(mockCiphertext)
      expect(result.warnings).toHaveLength(0)

      const instruction = result.instructions[0]
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(instruction.accounts).toHaveLength(3)
    })

    it('should handle deposit with proof instruction', async () => {
      const { generateRangeProofWithCommitment } = await import('../../../src/utils/zk-proof-builder.js')

      const mockProofInstruction: IInstruction = {
        programAddress: TEST_ADDRESSES.zkProofProgram,
        accounts: [],
        data: new Uint8Array()
      }
      
      vi.mocked(generateRangeProofWithCommitment).mockReturnValueOnce({
        proof: new Uint8Array(674),
        commitment: new Uint8Array(32),
        requiresZkProgram: true,
        instruction: mockProofInstruction
      })

      const params = {
        account: mockAccount,
        mint: mockMint,
        authority: mockAuthority,
        amount: 5000n,
        decimals: 6
      }

      const result = await manager.createDepositInstructions(params)

      expect(result.proofInstructions).toHaveLength(1)
      expect(result.proofInstructions[0]).toEqual(mockProofInstruction)
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('Transfer Operations', () => {
    it('should create transfer instructions', async () => {
      const params = {
        source: mockAccount,
        destination: address('7Lz7fJenQxMdh1u4SxbJFSRXMET38qLPJwXCeJP4F3gJ'),
        mint: mockMint,
        authority: mockAuthority,
        amount: 1000n,
        sourceKeypair: mockElGamalKeypair,
        destElgamalPubkey: mockElGamalPubkey,
        newSourceDecryptableBalance: 4000n
      }

      const result = await manager.createTransferInstructions(params)

      expect(result.instructions).toHaveLength(1)
      expect(result.proofInstructions).toHaveLength(0)
      expect(result.newSourceBalance).toEqual(mockCiphertext)
      expect(result.destCiphertext).toEqual(mockCiphertext)
      expect(result.warnings).toHaveLength(0)

      const instruction = result.instructions[0]
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(instruction.accounts).toHaveLength(4)
    })

    it('should handle transfer with proof instruction', async () => {
      const { generateTransferProofWithInstruction } = await import('../../../src/utils/zk-proof-builder.js')

      const mockProofInstruction: IInstruction = {
        programAddress: TEST_ADDRESSES.zkProofProgram,
        accounts: [],
        data: new Uint8Array()
      }
      
      vi.mocked(generateTransferProofWithInstruction).mockReturnValueOnce({
        transferProof: {
          encryptedTransferAmount: new Uint8Array(64),
          newSourceCommitment: new Uint8Array(32),
          equalityProof: new Uint8Array(192),
          validityProof: new Uint8Array(96),
          rangeProof: new Uint8Array(674)
        },
        newSourceBalance: mockCiphertext,
        destCiphertext: mockCiphertext,
        requiresZkProgram: true,
        instruction: mockProofInstruction
      })

      const params = {
        source: mockAccount,
        destination: address('7Lz7fJenQxMdh1u4SxbJFSRXMET38qLPJwXCeJP4F3gJ'),
        mint: mockMint,
        authority: mockAuthority,
        amount: 2000n,
        sourceKeypair: mockElGamalKeypair,
        destElgamalPubkey: mockElGamalPubkey,
        newSourceDecryptableBalance: 3000n
      }

      const result = await manager.createTransferInstructions(params)

      expect(result.proofInstructions).toHaveLength(1)
      expect(result.proofInstructions[0]).toEqual(mockProofInstruction)
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('Helper Methods', () => {
    it('should generate zero balance proof', async () => {
      const { generateRangeProofWithCommitment } = await import('../../../src/utils/zk-proof-builder.js')

      // Test indirectly through configure account
      const params = {
        account: mockAccount,
        mint: mockMint,
        authority: mockAuthority,
        elgamalKeypair: mockElGamalKeypair,
        maxPendingBalanceCredits: 100n
      }

      await manager.createConfigureAccountInstructions(params)

      expect(generateRangeProofWithCommitment).toHaveBeenCalledWith(
        0n, // Zero amount for zero balance proof
        expect.any(Uint8Array),
        'zk_program_with_fallback' // ProofMode value
      )
    })
  })

  describe('Performance', () => {
    it('should handle multiple operations efficiently', async () => {
      const { generateRangeProofWithCommitment } = await import('../../../src/utils/zk-proof-builder.js')

      const start = performance.now()
      
      // Create multiple deposit instructions
      const promises = []
      for (let i = 0; i < 10; i++) {
        const params = {
          account: mockAccount,
          mint: mockMint,
          authority: mockAuthority,
          amount: BigInt(i * 100),
          decimals: 9
        }
        promises.push(manager.createDepositInstructions(params))
      }
      
      await Promise.all(promises)
      
      const elapsed = performance.now() - start
      
      // Should process 10 deposits in under 50ms
      expect(elapsed).toBeLessThan(50)
      expect(generateRangeProofWithCommitment).toHaveBeenCalledTimes(10) // 10 from the loop
    })
  })
})