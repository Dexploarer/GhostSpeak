import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Address, TransactionSigner, IInstruction } from '@solana/kit'
import { address } from '@solana/addresses'
import { Connection, PublicKey } from '@solana/web3.js'
import { TEST_ADDRESSES } from '../../helpers/setup.js'
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'

// Mock @solana/spl-token
vi.mock('@solana/spl-token', () => ({
  // Constants
  TOKEN_2022_PROGRAM_ID: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
  TOKEN_PROGRAM_ID: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  ASSOCIATED_TOKEN_PROGRAM_ID: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
  ExtensionType: {
    TransferFeeConfig: 0,
    ConfidentialTransferMint: 1,
    InterestBearingMint: 2,
    DefaultAccountState: 3,
    MintCloseAuthority: 4,
    PermanentDelegate: 5,
    TransferHook: 6,
    MetadataPointer: 7
  },
  
  // Functions
  createInitializeMint2Instruction: vi.fn(),
  createTransferCheckedInstruction: vi.fn(),
  createTransferCheckedWithFeeInstruction: vi.fn(),
  createInitializeTransferFeeConfigInstruction: vi.fn(),
  createInitializeInterestBearingMintInstruction: vi.fn(),
  createInitializeDefaultAccountStateInstruction: vi.fn(),
  createInitializeMintCloseAuthorityInstruction: vi.fn(),
  createInitializePermanentDelegateInstruction: vi.fn(),
  getMintLen: vi.fn(),
  getExtensionTypes: vi.fn(),
  getTransferFeeConfig: vi.fn(),
  getAccount: vi.fn(),
  getMint: vi.fn(),
  getAssociatedTokenAddressSync: vi.fn(),
  createAssociatedTokenAccountIdempotentInstruction: vi.fn()
}))

// Mock @solana/web3.js
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn(() => ({
    getAccountInfo: vi.fn(),
    getMinimumBalanceForRentExemption: vi.fn()
  })),
  PublicKey: vi.fn((value: string) => ({
    toString: () => value,
    toBase58: () => value,
    equals: (other: any) => value === other.toString()
  })),
  SystemProgram: {
    programId: { toString: () => '11111111111111111111111111111111' }
  }
}))

// Mock confidential-transfer-manager
vi.mock('../../../src/utils/confidential-transfer-manager.js', () => ({
  ConfidentialTransferManager: vi.fn().mockImplementation(() => ({
    createConfigureAccountInstructions: vi.fn().mockResolvedValue({
      instructions: [{
        programAddress: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        accounts: [],
        data: new Uint8Array()
      }],
      proofInstructions: [],
      warnings: []
    }),
    createDepositInstructions: vi.fn().mockResolvedValue({
      instructions: [{
        programAddress: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        accounts: [],
        data: new Uint8Array()
      }],
      proofInstructions: [],
      encryptedAmount: { commitment: { commitment: new Uint8Array(32) }, handle: { handle: new Uint8Array(32) } },
      warnings: []
    }),
    createWithdrawInstructions: vi.fn().mockResolvedValue({
      instructions: [{
        programAddress: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        accounts: [],
        data: new Uint8Array()
      }],
      proofInstructions: [],
      warnings: []
    }),
    createTransferInstructions: vi.fn().mockResolvedValue({
      instructions: [{
        programAddress: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        accounts: [],
        data: new Uint8Array()
      }],
      proofInstructions: [],
      newSourceBalance: { commitment: { commitment: new Uint8Array(32) }, handle: { handle: new Uint8Array(32) } },
      destCiphertext: { commitment: { commitment: new Uint8Array(32) }, handle: { handle: new Uint8Array(32) } },
      warnings: []
    })
  }))
}))

describe('SPL Token Integration', () => {
  let connection: Connection
  let payer: TransactionSigner
  let mintAuthority: TransactionSigner
  let owner: TransactionSigner
  let mint: TransactionSigner
  let sourceAccount: Address
  let destAccount: Address

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock connection
    connection = new Connection('http://localhost:8899')
    vi.mocked(connection.getMinimumBalanceForRentExemption).mockResolvedValue(1000000)
    vi.mocked(connection.getAccountInfo).mockResolvedValue(null)

    // Setup mock signers
    payer = {
      address: TEST_ADDRESSES.authority,
      signTransactions: vi.fn(),
      signMessages: vi.fn()
    }

    mintAuthority = {
      address: TEST_ADDRESSES.user,
      signTransactions: vi.fn(),
      signMessages: vi.fn()
    }

    owner = {
      address: TEST_ADDRESSES.agent,
      signTransactions: vi.fn(),
      signMessages: vi.fn()
    }

    mint = {
      address: TEST_ADDRESSES.mint,
      signTransactions: vi.fn(),
      signMessages: vi.fn()
    }

    sourceAccount = TEST_ADDRESSES.token
    destAccount = address('7Lz7fJenQxMdh1u4SxbJFSRXMET38qLPJwXCeJP4F3gJ')

    // Import module after mocks are set up
    const splTokenModule = await import('@solana/spl-token')
    
    // Setup default mock implementations
    vi.mocked(splTokenModule.getMintLen).mockReturnValue(82)
    vi.mocked(splTokenModule.getAssociatedTokenAddressSync).mockReturnValue(
      new PublicKey(sourceAccount)
    )
    vi.mocked(splTokenModule.createInitializeMint2Instruction).mockReturnValue({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [],
      data: Buffer.from([])
    })
    vi.mocked(splTokenModule.createTransferCheckedInstruction).mockReturnValue({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [],
      data: Buffer.from([])
    })
  })

  describe('createMintWithExtensions', () => {
    it('should create mint with transfer fee extension', async () => {
      const { createMintWithExtensions } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getMintLen).mockReturnValue(165) // Mint + extension size
      vi.mocked(splTokenModule.createInitializeTransferFeeConfigInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })

      const params = {
        mint,
        decimals: 9,
        mintAuthority: mintAuthority.address,
        payer,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 50, // 0.5%
            maximumFee: 1000000n,
            transferFeeConfigAuthority: mintAuthority.address,
            withdrawWithheldAuthority: mintAuthority.address
          }
        }
      }

      const instructions = await createMintWithExtensions(connection, params)

      expect(instructions).toHaveLength(3) // Allocate, InitTransferFee, InitMint
      expect(splTokenModule.getMintLen).toHaveBeenCalledWith([ExtensionType.TransferFeeConfig])
      expect(splTokenModule.createInitializeTransferFeeConfigInstruction).toHaveBeenCalled()
    })

    it('should create mint with confidential transfer extension', async () => {
      const { createMintWithExtensions } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getMintLen).mockReturnValue(200) // Larger size for confidential

      const params = {
        mint,
        decimals: 6,
        mintAuthority: mintAuthority.address,
        payer,
        extensions: {
          confidentialTransfers: {
            authority: mintAuthority.address,
            autoApproveNewAccounts: true,
            auditorElgamalPubkey: new Uint8Array(32)
          }
        }
      }

      const instructions = await createMintWithExtensions(connection, params)

      // Confidential transfers are not directly supported, only allocate + init mint
      expect(instructions).toHaveLength(2) // Allocate, InitMint (no InitConfidential)
      expect(splTokenModule.getMintLen).toHaveBeenCalledWith([ExtensionType.ConfidentialTransferMint])
    })

    it('should create mint with multiple extensions', async () => {
      const { createMintWithExtensions } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getMintLen).mockReturnValue(300) // Multiple extensions
      vi.mocked(splTokenModule.createInitializeDefaultAccountStateInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })
      vi.mocked(splTokenModule.createInitializeMintCloseAuthorityInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })

      const params = {
        mint,
        decimals: 9,
        mintAuthority: mintAuthority.address,
        freezeAuthority: mintAuthority.address,
        payer,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 100,
            maximumFee: 5000000n
          },
          defaultAccountState: 'initialized' as const,
          mintCloseAuthority: mintAuthority.address
        }
      }

      const instructions = await createMintWithExtensions(connection, params)

      expect(instructions.length).toBeGreaterThanOrEqual(5) // Multiple extension inits
      expect(splTokenModule.getMintLen).toHaveBeenCalledWith([
        ExtensionType.TransferFeeConfig,
        ExtensionType.DefaultAccountState,
        ExtensionType.MintCloseAuthority
      ])
    })

    it('should create basic mint without extensions', async () => {
      const { createMintWithExtensions } = await import('../../../src/utils/spl-token-integration.js')
      
      const params = {
        mint,
        decimals: 9,
        mintAuthority: mintAuthority.address,
        payer
      }

      const instructions = await createMintWithExtensions(connection, params)

      expect(instructions).toHaveLength(2) // Allocate + InitMint
    })
  })

  describe('transferWithFee', () => {
    it('should create transfer instruction with fee calculation', async () => {
      const { transferWithFee } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      const mockTransferFeeConfig = {
        withheldAmount: 0n,
        newerTransferFee: {
          epoch: 0n,
          maximumFee: 1000000n,
          transferFeeBasisPoints: 50 // 0.5%
        },
        olderTransferFee: {
          epoch: 0n,
          maximumFee: 1000000n,
          transferFeeBasisPoints: 50
        }
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getTransferFeeConfig).mockReturnValue(mockTransferFeeConfig as any)
      vi.mocked(splTokenModule.createTransferCheckedWithFeeInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })

      const params = {
        source: sourceAccount,
        destination: destAccount,
        authority: owner,
        mint: mint.address,
        amount: 100000n,
        decimals: 9
      }

      const instruction = await transferWithFee(connection, params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
      expect(splTokenModule.createTransferCheckedWithFeeInstruction).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }), // source
        expect.objectContaining({ toString: expect.any(Function) }), // mint
        expect.objectContaining({ toString: expect.any(Function) }), // destination
        expect.objectContaining({ toString: expect.any(Function) }), // authority
        100000n,
        9,
        500n, // 0.5% of 100000
        [],
        expect.objectContaining({ toString: expect.any(Function) }) // TOKEN_2022_PROGRAM_ID
      )
    })

    it('should handle maximum fee cap', async () => {
      const { transferWithFee } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      const mockTransferFeeConfig = {
        withheldAmount: 0n,
        newerTransferFee: {
          epoch: 0n,
          maximumFee: 1000n, // Low maximum
          transferFeeBasisPoints: 500 // 5%
        },
        olderTransferFee: {
          epoch: 0n,
          maximumFee: 1000n,
          transferFeeBasisPoints: 500
        }
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getTransferFeeConfig).mockReturnValue(mockTransferFeeConfig as any)

      const params = {
        source: sourceAccount,
        destination: destAccount,
        authority: owner,
        mint: mint.address,
        amount: 1000000n, // Large amount
        decimals: 9
      }

      const instruction = await transferWithFee(connection, params)

      expect(instruction).toBeDefined()
      expect(splTokenModule.createTransferCheckedWithFeeInstruction).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({ toString: expect.any(Function) }),
        1000000n,
        9,
        1000n, // Capped at maximum
        [],
        expect.objectContaining({ toString: expect.any(Function) }) // TOKEN_2022_PROGRAM_ID
      )
    })

    it('should handle mint without transfer fee extension', async () => {
      const { transferWithFee } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getTransferFeeConfig).mockReturnValue(null)
      vi.mocked(splTokenModule.createTransferCheckedInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })

      const params = {
        source: sourceAccount,
        destination: destAccount,
        authority: owner,
        mint: mint.address,
        amount: 100000n,
        decimals: 9
      }

      const instruction = await transferWithFee(connection, params)

      expect(instruction).toBeDefined()
      expect(splTokenModule.createTransferCheckedInstruction).toHaveBeenCalled()
      expect(splTokenModule.createTransferCheckedWithFeeInstruction).not.toHaveBeenCalled()
    })
  })

  describe('getOrCreateAssociatedTokenAccount', () => {
    it('should return existing associated token account', async () => {
      const { getOrCreateAssociatedTokenAccount } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockAccount = {
        address: sourceAccount,
        mint: mint.address,
        owner: owner.address,
        amount: 1000000n,
        delegate: null,
        delegatedAmount: 0n,
        isInitialized: true,
        isFrozen: false,
        isNative: false,
        rentExemptReserve: null,
        closeAuthority: null
      }
      
      vi.mocked(splTokenModule.getAccount).mockResolvedValue(mockAccount as any)

      const result = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint.address,
        owner.address
      )

      expect(result.address).toBe(sourceAccount)
      expect(result.instruction).toBeUndefined()
      expect(splTokenModule.getAccount).toHaveBeenCalled()
    })

    it('should create new associated token account when not exists', async () => {
      const { getOrCreateAssociatedTokenAccount } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getAccount).mockRejectedValue(new Error('Account not found'))
      vi.mocked(splTokenModule.createAssociatedTokenAccountIdempotentInstruction).mockReturnValue({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [],
        data: Buffer.from([])
      })

      const result = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint.address,
        owner.address
      )

      expect(result.address).toBe(sourceAccount)
      expect(result.instruction).toBeDefined()
      expect(splTokenModule.createAssociatedTokenAccountIdempotentInstruction).toHaveBeenCalled()
    })

    it('should handle different programs correctly', async () => {
      const { getOrCreateAssociatedTokenAccount } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getAccount).mockRejectedValue(new Error('Account not found'))

      // Test with Token program
      const tokenProgram = new PublicKey(TOKEN_PROGRAM_ID.toString())
      const result = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint.address,
        owner.address,
        false, // allowOwnerOffCurve
        null,  // commitment
        null,  // confirmOptions
        tokenProgram
      )

      expect(result.instruction).toBeDefined()
    })
  })

  describe('isToken2022', () => {
    it('should identify Token-2022 mints', async () => {
      const { isToken2022 } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      // Mock successful getMint with TOKEN_2022_PROGRAM_ID
      vi.mocked(splTokenModule.getMint).mockResolvedValueOnce({
        address: new PublicKey(mint.address),
        decimals: 9,
        tlvData: Buffer.from([])
      } as any)

      const result = await isToken2022(connection, mint.address)
      
      expect(result).toBe(true)
      expect(splTokenModule.getMint).toHaveBeenCalledWith(
        connection,
        expect.objectContaining({ toString: expect.any(Function) }),
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    })

    it('should identify legacy Token mints', async () => {
      const { isToken2022 } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      // Mock failed getMint with TOKEN_2022_PROGRAM_ID
      vi.mocked(splTokenModule.getMint).mockRejectedValueOnce(new Error('Not Token-2022'))

      const result = await isToken2022(connection, mint.address)
      
      expect(result).toBe(false)
    })

    it('should return false for non-existent accounts', async () => {
      const { isToken2022 } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      vi.mocked(splTokenModule.getMint).mockRejectedValueOnce(new Error('Account not found'))

      const result = await isToken2022(connection, mint.address)
      
      expect(result).toBe(false)
    })
  })

  describe('getMintExtensions', () => {
    it('should detect transfer fee extension', async () => {
      const { getMintExtensions } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([1, 0, 100, 0]) // Mock TLV data
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getExtensionTypes).mockReturnValue([ExtensionType.TransferFeeConfig])

      const extensions = await getMintExtensions(connection, mint.address)
      
      expect(extensions).toContain(ExtensionType.TransferFeeConfig)
      expect(splTokenModule.getExtensionTypes).toHaveBeenCalledWith(mockMint.tlvData)
    })

    it('should return empty array for mint without extensions', async () => {
      const { getMintExtensions } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getExtensionTypes).mockReturnValue([])

      const extensions = await getMintExtensions(connection, mint.address)
      
      expect(extensions).toEqual([])
    })
  })

  describe('calculateTransferAmountWithFee', () => {
    it('should calculate fee for transfer amount', async () => {
      const { calculateTransferAmountWithFee } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      const mockTransferFeeConfig = {
        withheldAmount: 0n,
        newerTransferFee: {
          epoch: 0n,
          maximumFee: 1000000n,
          transferFeeBasisPoints: 100 // 1%
        },
        olderTransferFee: {
          epoch: 0n,
          maximumFee: 1000000n,
          transferFeeBasisPoints: 100
        }
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getTransferFeeConfig).mockReturnValue(mockTransferFeeConfig as any)

      const result = await calculateTransferAmountWithFee(
        connection,
        mint.address,
        50000n
      )
      
      expect(result.amount).toBe(50000n)
      expect(result.fee).toBe(500n) // 1% of 50000
    })

    it('should handle zero amount', async () => {
      const { calculateTransferAmountWithFee } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      const mockMint = {
        address: mint.address,
        decimals: 9,
        tlvData: Buffer.from([])
      }
      
      vi.mocked(splTokenModule.getMint).mockResolvedValue(mockMint as any)
      vi.mocked(splTokenModule.getTransferFeeConfig).mockReturnValue(null)

      const result = await calculateTransferAmountWithFee(
        connection,
        mint.address,
        0n
      )
      
      expect(result.amount).toBe(0n)
      expect(result.fee).toBe(0n)
    })
  })

  describe('Confidential Transfer Operations', () => {
    it('should configure confidential account', async () => {
      const { configureConfidentialAccount } = await import('../../../src/utils/spl-token-integration.js')
      
      const elgamalPubkey = new Uint8Array(32)
      elgamalPubkey.fill(1)
      
      const instruction = await configureConfidentialAccount(
        sourceAccount,
        mint.address,
        elgamalPubkey,
        new Uint8Array(64),
        100n,
        0,
        owner
      )
      
      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
    })

    it('should create deposit confidential instruction', async () => {
      const { depositConfidential } = await import('../../../src/utils/spl-token-integration.js')
      
      const instruction = await depositConfidential(
        sourceAccount,
        mint.address,
        100000n,
        9,
        0, // proofInstructionOffset
        owner
      )
      
      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
    })

    it('should create withdraw confidential instruction', async () => {
      const { withdrawConfidential } = await import('../../../src/utils/spl-token-integration.js')
      
      const instruction = await withdrawConfidential(
        sourceAccount,
        mint.address,
        50000n,
        9,
        new Uint8Array(64), // newDecryptableAvailableBalance
        0, // proofInstructionOffset
        owner
      )
      
      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
    })

    it('should create transfer confidential instruction', async () => {
      const { transferConfidential } = await import('../../../src/utils/spl-token-integration.js')
      
      const instruction = await transferConfidential(
        sourceAccount,
        destAccount,
        mint.address,
        new Uint8Array(64), // newSourceDecryptableAvailableBalance
        0, // proofInstructionOffset
        owner
      )
      
      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(TEST_ADDRESSES.token2022Program)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const { createMintWithExtensions } = await import('../../../src/utils/spl-token-integration.js')
      
      vi.mocked(connection.getMinimumBalanceForRentExemption).mockRejectedValue(
        new Error('Network error')
      )

      const params = {
        mint,
        decimals: 9,
        mintAuthority: mintAuthority.address,
        payer
      }

      await expect(createMintWithExtensions(connection, params))
        .rejects.toThrow('Network error')
    })

    it('should handle invalid mint addresses', async () => {
      const { isToken2022 } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      // isToken2022 uses getMint, not getAccountInfo
      vi.mocked(splTokenModule.getMint).mockRejectedValue(
        new Error('Invalid public key')
      )

      // isToken2022 catches errors and returns false
      const result = await isToken2022(connection, 'invalid-address' as Address)
      expect(result).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should efficiently batch multiple operations', async () => {
      const { getOrCreateAssociatedTokenAccount } = await import('../../../src/utils/spl-token-integration.js')
      const splTokenModule = await import('@solana/spl-token')
      
      // Reset all mocks first
      vi.mocked(splTokenModule.getMint).mockReset()
      vi.mocked(splTokenModule.getAccount).mockReset()
      
      // Mock getMint to fail for both Token-2022 and regular Token programs
      vi.mocked(splTokenModule.getMint).mockRejectedValue(new Error('Invalid mint'))
      vi.mocked(splTokenModule.getAccount).mockRejectedValue(new Error('Not found'))

      const start = performance.now()
      
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint.address,
            owner.address
          ).catch(() => ({ 
            address: sourceAccount, 
            instruction: undefined 
          })) // Handle error to prevent test failure
        )
      }
      
      await Promise.all(promises)
      
      const elapsed = performance.now() - start
      
      // Should complete 10 operations quickly
      expect(elapsed).toBeLessThan(50)
      // getMint is called twice per operation (Token-2022 check then regular check)
      expect(splTokenModule.getMint).toHaveBeenCalledTimes(20)
    })
  })
})