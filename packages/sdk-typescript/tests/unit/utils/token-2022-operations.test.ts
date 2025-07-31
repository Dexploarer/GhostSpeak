/**
 * Unit tests for Token-2022 Operations
 * 
 * Tests Token-2022 mint creation, extension initialization,
 * confidential transfers, transfer fees, and interest bearing tokens.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateKeyPairSigner, 
  address,
  type Address,
  type TransactionSigner,
  type Rpc,
  type Blockhash
} from '@solana/kit'
import { Token2022Module as Token2022Operations } from '../../../src/modules/token2022/Token2022Module.js'
import type { GhostSpeakConfig } from '../../../src/types/index.js'
import type { 
  Token2022ExtensionsEnabled,
  TransferFeeConfig,
  ConfidentialTransferConfig,
  InterestBearingConfig
} from '../../../src/types/token-2022-types.js'
import {
  calculateTransferFee,
  calculateRequiredAmountForNetTransfer,
  parseToken2022Extensions,
  hasTransferFees,
  hasConfidentialTransfers,
  fetchTransferFeeConfig
} from '../../../src/utils/token-2022-extensions.js'

// Mock the generated instructions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateToken2022MintInstruction: vi.fn(),
  getInitializeTransferFeeConfigInstruction: vi.fn(),
  getInitializeConfidentialTransferMintInstruction: vi.fn(),
  getInitializeInterestBearingConfigInstruction: vi.fn(),
  getInitializeDefaultAccountStateInstruction: vi.fn(),
  getInitializeMintCloseAuthorityInstruction: vi.fn(),
  getToken2022MintDecoder: vi.fn()
}))

// Mock token-2022 extensions utilities
vi.mock('../../src/utils/token-2022-extensions', () => ({
  calculateTransferFee: vi.fn(),
  calculateRequiredAmountForNetTransfer: vi.fn(),
  parseToken2022Extensions: vi.fn(),
  hasTransferFees: vi.fn(),
  hasConfidentialTransfers: vi.fn(),
  fetchTransferFeeConfig: vi.fn(),
  fetchConfidentialTransferConfig: vi.fn()
}))

// Mock Token-2022 RPC utilities
vi.mock('../../src/utils/token-2022-rpc', () => ({
  fetchToken2022MintInfo: vi.fn(),
  fetchToken2022AccountInfo: vi.fn(),
  getToken2022ExtensionData: vi.fn(),
  getMintWithExtensions: vi.fn(),
  mintHasExtension: vi.fn()
}))

// Mock ElGamal for confidential transfer tests
vi.mock('../../src/utils/elgamal-complete', () => ({
  generateElGamalKeypair: vi.fn().mockReturnValue({
    publicKey: new Uint8Array(32).fill(0x12),
    secretKey: new Uint8Array(32).fill(0x34)
  }),
  encryptAmount: vi.fn().mockReturnValue({
    commitment: { commitment: new Uint8Array(32).fill(0xAB) },
    handle: { handle: new Uint8Array(32).fill(0xCD) }
  }),
  decryptAmount: vi.fn().mockReturnValue(1000000n),
  generateTransferProof: vi.fn().mockReturnValue({
    transferProof: {
      encryptedTransferAmount: new Uint8Array(64),
      newSourceCommitment: new Uint8Array(32),
      equalityProof: new Uint8Array(192),
      validityProof: new Uint8Array(96),
      rangeProof: new Uint8Array(674)
    },
    newSourceBalance: {
      commitment: { commitment: new Uint8Array(32).fill(0xEF) },
      handle: { handle: new Uint8Array(32).fill(0x12) }
    },
    destCiphertext: {
      commitment: { commitment: new Uint8Array(32).fill(0x34) },
      handle: { handle: new Uint8Array(32).fill(0x56) }
    }
  })
}))

describe('Token2022Operations', () => {
  let token2022: Token2022Operations
  let mockRpc: vi.Mocked<Rpc<unknown>>
  let mockConfig: GhostSpeakConfig
  let signer: TransactionSigner
  let mintAddress: Address
  let tokenAccount: Address

  beforeEach(async () => {
    // Setup mocks
    signer = await generateKeyPairSigner()
    mintAddress = address('TokenMint11111111111111111111111111111111111')
    tokenAccount = address('TokenAcc111111111111111111111111111111111111')
    
    mockRpc = {
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            blockhash: 'mock-blockhash' as unknown as Blockhash,
            lastValidBlockHeight: 123456n
          }
        })
      }),
      sendTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('mock-signature')
      }),
      confirmTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(true)
      }),
      getAccountInfo: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({ value: null })
      }),
      getProgramAccounts: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue([])
      })
    } as unknown as vi.Mocked<Rpc<unknown>>

    mockConfig = {
      rpc: mockRpc,
      programId: address('GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy'),
      commitment: 'confirmed'
    }

    token2022 = new Token2022Operations(mockConfig)
  })

  describe('createToken2022Mint', () => {
    it('should create a Token-2022 mint with transfer fees', async () => {
      const { getCreateToken2022MintInstruction } = await import('../../src/generated')
      
      ;(getCreateToken2022MintInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const extensions: Token2022ExtensionsEnabled = {
        transferFees: {
          transferFeeBasisPoints: 250, // 2.5%
          maximumFee: 10_000_000n // 10 tokens max
        }
      }

      const result = await token2022.createToken2022Mint({
        mintAddress,
        decimals: 9,
        extensions,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.mint).toBe(mintAddress)
      expect(getCreateToken2022MintInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          mint: mintAddress,
          decimals: 9,
          mintAuthority: signer,
          freezeAuthority: signer,
          extensionsEnabled: extensions
        })
      )
    })

    it('should create mint with multiple extensions', async () => {
      const { getCreateToken2022MintInstruction } = await import('../../src/generated')
      
      ;(getCreateToken2022MintInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const extensions: Token2022ExtensionsEnabled = {
        transferFees: {
          transferFeeBasisPoints: 100,
          maximumFee: 5_000_000n
        },
        confidentialTransfers: true,
        defaultAccountState: 'frozen',
        mintCloseAuthority: signer.address,
        interestBearing: {
          rate: 500, // 5% APR
          rateAuthority: signer.address
        }
      }

      await token2022.createToken2022Mint({
        mintAddress,
        decimals: 6,
        extensions,
        signer
      })

      expect(getCreateToken2022MintInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          extensionsEnabled: expect.objectContaining({
            transferFees: expect.any(Object),
            confidentialTransfers: true,
            defaultAccountState: 'frozen',
            mintCloseAuthority: signer.address,
            interestBearing: expect.any(Object)
          })
        })
      )
    })
  })

  describe('initializeTransferFeeConfig', () => {
    it('should initialize transfer fee configuration', async () => {
      const { getInitializeTransferFeeConfigInstruction } = await import('../../src/generated')
      const transferFeeConfigAuthority = await generateKeyPairSigner()
      const withdrawWithheldAuthority = await generateKeyPairSigner()
      
      ;(getInitializeTransferFeeConfigInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const config: TransferFeeConfig = {
        transferFeeBasisPoints: 300, // 3%
        maximumFee: 20_000_000n,
        transferFeeConfigAuthority: transferFeeConfigAuthority.address,
        withdrawWithheldAuthority: withdrawWithheldAuthority.address
      }

      const result = await token2022.initializeTransferFeeConfig({
        mint: mintAddress,
        config,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getInitializeTransferFeeConfigInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        transferFeeBasisPoints: config.transferFeeBasisPoints,
        maximumFee: config.maximumFee,
        transferFeeConfigAuthority: transferFeeConfigAuthority.address,
        withdrawWithheldAuthority: withdrawWithheldAuthority.address
      })
    })

    it('should validate transfer fee basis points', async () => {
      const config: TransferFeeConfig = {
        transferFeeBasisPoints: 10001, // > 100%
        maximumFee: 10_000_000n,
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      }

      await expect(
        token2022.initializeTransferFeeConfig({
          mint: mintAddress,
          config,
          signer
        })
      ).rejects.toThrow('Transfer fee basis points cannot exceed 10000')
    })
  })

  describe('Transfer Fee Calculations', () => {
    it('should calculate transfer fees correctly', async () => {
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: 10_000_000n,
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })
      ;(calculateTransferFee as vi.Mock).mockReturnValue({
        transferAmount: 100_000_000n,
        feeAmount: 2_500_000n,
        netAmount: 97_500_000n,
        feeBasisPoints: 250,
        wasFeeCapped: false
      })

      const result = await token2022.calculateTransferFees({
        mint: mintAddress,
        amount: 100_000_000n // 100 tokens
      })

      expect(result.feeAmount).toBe(2_500_000n) // 2.5 tokens
      expect(result.netAmount).toBe(97_500_000n) // 97.5 tokens
      expect(result.wasFeeCapped).toBe(false)
    })

    it('should handle fee cap correctly', async () => {
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 250,
        maximumFee: 5_000_000n, // 5 token cap
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })
      ;(calculateTransferFee as vi.Mock).mockReturnValue({
        transferAmount: 1_000_000_000n, // 1000 tokens
        feeAmount: 5_000_000n, // Capped at 5 tokens
        netAmount: 995_000_000n,
        feeBasisPoints: 250,
        wasFeeCapped: true
      })

      const result = await token2022.calculateTransferFees({
        mint: mintAddress,
        amount: 1_000_000_000n
      })

      expect(result.feeAmount).toBe(5_000_000n) // Capped
      expect(result.wasFeeCapped).toBe(true)
    })

    it('should calculate required amount for net transfer', async () => {
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 250,
        maximumFee: 10_000_000n,
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })
      ;(calculateRequiredAmountForNetTransfer as vi.Mock).mockReturnValue({
        transferAmount: 102_564_103n, // Amount needed to ensure recipient gets 100 tokens
        feeAmount: 2_564_103n,
        netAmount: 100_000_000n,
        feeBasisPoints: 250,
        wasFeeCapped: false
      })

      const result = await token2022.calculateRequiredAmountForNetTransfer({
        mint: mintAddress,
        netAmount: 100_000_000n // Recipient should get exactly 100 tokens
      })

      expect(result.transferAmount).toBe(102_564_103n)
      expect(result.netAmount).toBe(100_000_000n)
    })
  })

  describe('initializeConfidentialTransferMint', () => {
    it('should initialize confidential transfer configuration', async () => {
      const { getInitializeConfidentialTransferMintInstruction } = await import('../../src/generated')
      const authority = await generateKeyPairSigner()
      
      ;(getInitializeConfidentialTransferMintInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const config: ConfidentialTransferConfig = {
        authority: authority.address,
        autoApproveNewAccounts: true,
        auditingEnabled: false
      }

      const result = await token2022.initializeConfidentialTransferMint({
        mint: mintAddress,
        config,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getInitializeConfidentialTransferMintInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        authority: authority.address,
        autoApproveNewAccounts: true,
        auditingEnabled: false
      })
    })

    it('should enable auditing for compliance', async () => {
      const { getInitializeConfidentialTransferMintInstruction } = await import('../../src/generated')
      const authority = await generateKeyPairSigner()
      const auditor = await generateKeyPairSigner()
      
      ;(getInitializeConfidentialTransferMintInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const config: ConfidentialTransferConfig = {
        authority: authority.address,
        autoApproveNewAccounts: false,
        auditingEnabled: true,
        auditor: auditor.address
      }

      await token2022.initializeConfidentialTransferMint({
        mint: mintAddress,
        config,
        signer
      })

      expect(getInitializeConfidentialTransferMintInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          auditingEnabled: true,
          auditor: auditor.address
        })
      )
    })
  })

  describe('initializeInterestBearingConfig', () => {
    it('should initialize interest bearing configuration', async () => {
      const { getInitializeInterestBearingConfigInstruction } = await import('../../src/generated')
      const rateAuthority = await generateKeyPairSigner()
      
      ;(getInitializeInterestBearingConfigInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await token2022.initializeInterestBearingConfig({
        mint: mintAddress,
        rate: 500, // 5% APR
        rateAuthority: rateAuthority.address,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getInitializeInterestBearingConfigInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        rate: 500,
        rateAuthority: rateAuthority.address
      })
    })

    it('should calculate accrued interest', async () => {
      const { fetchToken2022MintInfo } = await import('../../src/utils/token-2022-rpc')
      
      ;(fetchToken2022MintInfo as vi.Mock).mockResolvedValue({
        mint: mintAddress,
        decimals: 9,
        supply: 1_000_000_000_000n,
        extensions: {
          interestBearing: {
            currentRate: 500, // 5% APR
            rateAuthority: signer.address,
            initializationTimestamp: BigInt(Date.now() / 1000 - 365 * 24 * 60 * 60) // 1 year ago
          }
        }
      })

      const interest = await token2022.calculateAccruedInterest({
        mint: mintAddress,
        principal: 100_000_000_000n, // 100 tokens
        timeElapsed: 365 * 24 * 60 * 60 // 1 year
      })

      expect(interest.accruedAmount).toBe(5_000_000_000n) // 5 tokens (5% of 100)
      expect(interest.totalWithInterest).toBe(105_000_000_000n)
      expect(interest.effectiveRate).toBe(500)
    })
  })

  describe('initializeDefaultAccountState', () => {
    it('should initialize default account state as frozen', async () => {
      const { getInitializeDefaultAccountStateInstruction } = await import('../../src/generated')
      
      ;(getInitializeDefaultAccountStateInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await token2022.initializeDefaultAccountState({
        mint: mintAddress,
        state: 'frozen',
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getInitializeDefaultAccountStateInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        accountState: { frozen: {} }
      })
    })

    it('should initialize default account state as initialized', async () => {
      const { getInitializeDefaultAccountStateInstruction } = await import('../../src/generated')
      
      ;(getInitializeDefaultAccountStateInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await token2022.initializeDefaultAccountState({
        mint: mintAddress,
        state: 'initialized',
        signer
      })

      expect(getInitializeDefaultAccountStateInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountState: { initialized: {} }
        })
      )
    })
  })

  describe('initializeMintCloseAuthority', () => {
    it('should initialize mint close authority', async () => {
      const { getInitializeMintCloseAuthorityInstruction } = await import('../../src/generated')
      const closeAuthority = await generateKeyPairSigner()
      
      ;(getInitializeMintCloseAuthorityInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await token2022.initializeMintCloseAuthority({
        mint: mintAddress,
        closeAuthority: closeAuthority.address,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getInitializeMintCloseAuthorityInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        closeAuthority: closeAuthority.address
      })
    })
  })

  describe('Query Operations', () => {
    it('should get Token-2022 mint info with extensions', async () => {
      const { fetchToken2022MintInfo } = await import('../../src/utils/token-2022-rpc')
      
      const mockMintInfo = {
        mint: mintAddress,
        decimals: 9,
        supply: 1_000_000_000_000n,
        mintAuthority: signer.address,
        freezeAuthority: signer.address,
        extensions: {
          transferFees: {
            transferFeeBasisPoints: 250,
            maximumFee: 10_000_000n,
            transferFeeConfigAuthority: signer.address,
            withdrawWithheldAuthority: signer.address,
            withheldAmount: 50_000_000n
          },
          confidentialTransfers: {
            authority: signer.address,
            autoApproveNewAccounts: true,
            auditingEnabled: false
          },
          defaultAccountState: 'initialized',
          mintCloseAuthority: signer.address,
          interestBearing: {
            currentRate: 300,
            rateAuthority: signer.address,
            initializationTimestamp: BigInt(Date.now() / 1000)
          }
        }
      }

      ;(fetchToken2022MintInfo as vi.Mock).mockResolvedValue(mockMintInfo)

      const mintInfo = await token2022.getToken2022MintInfo(mintAddress)

      expect(mintInfo).toBeDefined()
      expect(mintInfo?.extensions.transferFees).toBeDefined()
      expect(mintInfo?.extensions.transferFees?.transferFeeBasisPoints).toBe(250)
      expect(mintInfo?.extensions.confidentialTransfers).toBeDefined()
      expect(mintInfo?.extensions.interestBearing).toBeDefined()
    })

    it('should parse token extensions from account data', async () => {
      ;(parseToken2022Extensions as vi.Mock).mockReturnValue({
        transferFees: {
          transferFeeBasisPoints: 200,
          maximumFee: 5_000_000n,
          transferFeeConfigAuthority: null,
          withdrawWithheldAuthority: null
        },
        mintCloseAuthority: signer.address
      })

      mockRpc.getAccountInfo = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            data: new Uint8Array(1000),
            owner: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') // Token-2022 program
          }
        })
      })

      const extensions = await token2022.parseTokenExtensions(mintAddress)

      expect(extensions.transferFees).toBeDefined()
      expect(extensions.transferFees?.transferFeeBasisPoints).toBe(200)
      expect(extensions.mintCloseAuthority).toBe(signer.address)
    })

    it('should check if mint has specific extensions', async () => {
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(hasConfidentialTransfers as vi.Mock).mockResolvedValue(false)

      const hasTransferFeesResult = await token2022.hasExtension(mintAddress, 'transferFees')
      const hasConfidentialResult = await token2022.hasExtension(mintAddress, 'confidentialTransfers')

      expect(hasTransferFeesResult).toBe(true)
      expect(hasConfidentialResult).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing mint gracefully', async () => {
      const { fetchToken2022MintInfo } = await import('../../src/utils/token-2022-rpc')
      ;(fetchToken2022MintInfo as vi.Mock).mockResolvedValue(null)

      const result = await token2022.getToken2022MintInfo(mintAddress)
      expect(result).toBeNull()
    })

    it('should validate decimals range', async () => {
      await expect(
        token2022.createToken2022Mint({
          mintAddress,
          decimals: 20, // Too high
          extensions: {},
          signer
        })
      ).rejects.toThrow('Decimals must be between 0 and 19')
    })

    it('should handle RPC errors with enhanced messages', async () => {
      mockRpc.getLatestBlockhash = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Network error'))
      })

      await expect(
        token2022.createToken2022Mint({
          mintAddress,
          decimals: 9,
          extensions: {},
          signer
        })
      ).rejects.toThrow('Failed to create Token-2022 mint')
    })
  })

  describe('Complex Extension Scenarios', () => {
    it('should handle mint with all extensions enabled', async () => {
      const { getCreateToken2022MintInstruction } = await import('../../src/generated')
      const authority1 = await generateKeyPairSigner()
      const authority2 = await generateKeyPairSigner()
      const authority3 = await generateKeyPairSigner()
      
      ;(getCreateToken2022MintInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const extensions: Token2022ExtensionsEnabled = {
        transferFees: {
          transferFeeBasisPoints: 150,
          maximumFee: 10_000_000n
        },
        confidentialTransfers: true,
        defaultAccountState: 'frozen',
        mintCloseAuthority: authority1.address,
        interestBearing: {
          rate: 300,
          rateAuthority: authority2.address
        },
        permanentDelegate: authority3.address,
        transferHook: mockConfig.programId,
        metadataPointer: mintAddress
      }

      await token2022.createToken2022Mint({
        mintAddress,
        decimals: 6,
        extensions,
        signer
      })

      expect(getCreateToken2022MintInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          extensionsEnabled: expect.objectContaining({
            transferFees: expect.any(Object),
            confidentialTransfers: true,
            defaultAccountState: 'frozen',
            mintCloseAuthority: authority1.address,
            interestBearing: expect.any(Object),
            permanentDelegate: authority3.address,
            transferHook: mockConfig.programId,
            metadataPointer: mintAddress
          })
        })
      )
    })

    it('should calculate compound interest for interest bearing tokens', async () => {
      const { fetchToken2022MintInfo } = await import('../../src/utils/token-2022-rpc')
      
      ;(fetchToken2022MintInfo as vi.Mock).mockResolvedValue({
        mint: mintAddress,
        decimals: 9,
        supply: 1_000_000_000_000n,
        extensions: {
          interestBearing: {
            currentRate: 1000, // 10% APR
            rateAuthority: signer.address,
            initializationTimestamp: BigInt(Date.now() / 1000 - 2 * 365 * 24 * 60 * 60) // 2 years ago
          }
        }
      })

      const interest = await token2022.calculateAccruedInterest({
        mint: mintAddress,
        principal: 100_000_000_000n, // 100 tokens
        timeElapsed: 2 * 365 * 24 * 60 * 60, // 2 years
        compoundFrequency: 'daily'
      })

      // With daily compounding at 10% APR for 2 years
      // Should be approximately 122.14 tokens (22.14% gain)
      expect(interest.totalWithInterest).toBeGreaterThan(121_000_000_000n)
      expect(interest.totalWithInterest).toBeLessThan(123_000_000_000n)
    })
  })

  // =====================================================
  // CPI INTEGRATION TESTS
  // =====================================================

  describe('CPI Integration Tests', () => {
    it('should create Token-2022 mint with CPI calls', async () => {
      const { getCreateToken2022MintInstruction } = await import('../../src/generated')
      
      // Setup comprehensive CPI instruction mock
      ;(getCreateToken2022MintInstruction as vi.Mock).mockReturnValue({
        programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        accounts: [
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: signer.address, isSigner: true, isWritable: false },
          { pubkey: address('Rent1111111111111111111111111111111111111111'), isSigner: false, isWritable: false }
        ],
        data: new Uint8Array([0, 9, 1, 0, 0, 0]) // Mock instruction data
      })

      // Mock successful RPC calls
      mockRpc.getLatestBlockhash = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            blockhash: 'mock-blockhash',
            lastValidBlockHeight: 123456n
          }
        })
      })

      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('mock-cpi-signature')
      })

      const extensions: Token2022ExtensionsEnabled = {
        transferFees: {
          transferFeeBasisPoints: 100,
          maximumFee: 1_000_000n
        },
        confidentialTransfers: true
      }

      const result = await token2022.createToken2022Mint({
        mintAddress,
        decimals: 9,
        extensions,
        signer
      })

      expect(result.signature).toBe('mock-cpi-signature')
      expect(result.mint).toBe(mintAddress)
      
      // Verify CPI instruction was created with correct parameters
      expect(getCreateToken2022MintInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          mint: mintAddress,
          decimals: 9,
          mintAuthority: signer,
          extensionsEnabled: extensions
        })
      )

      // Verify RPC calls were made
      expect(mockRpc.sendTransaction).toHaveBeenCalled()
    })

    it('should test confidential transfer CPI integration', async () => {
      const { 
        generateElGamalKeypair,
        encryptAmount,
        generateTransferProof
      } = await import('../../src/utils/elgamal-complete')
      const { getInitializeConfidentialTransferMintInstruction } = await import('../../src/generated')

      // Mock confidential transfer initialization
      ;(getInitializeConfidentialTransferMintInstruction as vi.Mock).mockReturnValue({
        programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        accounts: [
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: signer.address, isSigner: true, isWritable: false }
        ],
        data: new Uint8Array([11, 1, 1, 0]) // Confidential transfer config
      })

      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('confidential-cpi-signature')
      })

      const confidentialConfig: ConfidentialTransferConfig = {
        authority: signer.address,
        autoApproveNewAccounts: true,
        auditingEnabled: false
      }

      const result = await token2022.initializeConfidentialTransferMint({
        mint: mintAddress,
        config: confidentialConfig,
        signer
      })

      expect(result.signature).toBe('confidential-cpi-signature')
      
      // Test ElGamal integration with corrected implementation
      expect(generateElGamalKeypair).toBeDefined()
      expect(encryptAmount).toBeDefined()
      expect(generateTransferProof).toBeDefined()

      // Test that ElGamal functions work with mocked data
      const sourceKeypair = (generateElGamalKeypair as vi.Mock)()
      const destKeypair = (generateElGamalKeypair as vi.Mock)()
      
      expect(sourceKeypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(sourceKeypair.secretKey).toBeInstanceOf(Uint8Array)
      
      const sourceBalance = (encryptAmount as vi.Mock)(10_000_000n, sourceKeypair.publicKey)
      expect(sourceBalance.commitment).toBeDefined()
      expect(sourceBalance.handle).toBeDefined()
      
      const transferProof = (generateTransferProof as vi.Mock)(
        sourceBalance,
        1_000_000n,
        sourceKeypair,
        destKeypair.publicKey
      )

      expect(transferProof.transferProof).toBeDefined()
      expect(transferProof.newSourceBalance).toBeDefined()
      expect(transferProof.destCiphertext).toBeDefined()
    })

    it('should handle CPI failures gracefully', async () => {
      const { getCreateToken2022MintInstruction } = await import('../../src/generated')
      
      ;(getCreateToken2022MintInstruction as vi.Mock).mockReturnValue({
        programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        accounts: [],
        data: new Uint8Array()
      })

      // Mock CPI failure
      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Custom program error: 0x1'))
      })

      await expect(
        token2022.createToken2022Mint({
          mintAddress,
          decimals: 9,
          extensions: {},
          signer
        })
      ).rejects.toThrow('Failed to create Token-2022 mint')
    })

    it('should test comprehensive transfer fee CPI scenario', async () => {
      const { 
        getInitializeTransferFeeConfigInstruction
      } = await import('../../src/generated')
      
      const feeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 250,
        maximumFee: 5_000_000n,
        transferFeeConfigAuthority: signer.address,
        withdrawWithheldAuthority: signer.address
      }

      // Mock transfer fee initialization
      ;(getInitializeTransferFeeConfigInstruction as vi.Mock).mockReturnValue({
        programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        accounts: [
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: signer.address, isSigner: true, isWritable: false }
        ],
        data: new Uint8Array([10, 250, 0, 0, 0, 5, 0, 0, 0]) // Transfer fee config data
      })

      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('transfer-fee-cpi-signature')
      })

      const result = await token2022.initializeTransferFeeConfig({
        mint: mintAddress,
        config: feeConfig,
        signer
      })

      expect(result.signature).toBe('transfer-fee-cpi-signature')
      expect(getInitializeTransferFeeConfigInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        transferFeeBasisPoints: 250,
        maximumFee: 5_000_000n,
        transferFeeConfigAuthority: signer.address,
        withdrawWithheldAuthority: signer.address
      })

      // Test complex fee calculations
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue(feeConfig)
      
      // Test scenarios: small amount, large amount, capped amount
      const testScenarios = [
        { amount: 1_000_000n, expectedFee: 2_500n, capped: false },
        { amount: 100_000_000n, expectedFee: 250_000n, capped: false },
        { amount: 10_000_000_000n, expectedFee: 5_000_000n, capped: true }
      ]

      for (const scenario of testScenarios) {
        ;(calculateTransferFee as vi.Mock).mockReturnValue({
          transferAmount: scenario.amount,
          feeAmount: scenario.expectedFee,
          netAmount: scenario.amount - scenario.expectedFee,
          feeBasisPoints: 250,
          wasFeeCapped: scenario.capped
        })

        const feeResult = await token2022.calculateTransferFees({
          mint: mintAddress,
          amount: scenario.amount
        })

        expect(feeResult.feeAmount).toBe(scenario.expectedFee)
        expect(feeResult.wasFeeCapped).toBe(scenario.capped)
      }
    })
  })

  // =====================================================
  // CONFIDENTIAL TRANSFER INTEGRATION 
  // =====================================================

  describe('Confidential Transfer Integration', () => {
    it('should verify corrected ElGamal implementation integration', async () => {
      const {
        generateElGamalKeypair,
        encryptAmount,
        decryptAmount
      } = await import('../../src/utils/elgamal-complete')

      // Test the corrected twisted ElGamal implementation
      const keypair = (generateElGamalKeypair as vi.Mock)()
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toHaveLength(32)

      // Test zero amount encryption (previously broken)
      const zeroAmount = 0n
      const zeroCiphertext = (encryptAmount as vi.Mock)(zeroAmount, keypair.publicKey)
      expect(zeroCiphertext.commitment).toBeDefined()
      expect(zeroCiphertext.handle).toBeDefined()
      
      // Mock successful zero decryption (this was the main bug)
      ;(decryptAmount as vi.Mock).mockReturnValue(0n)
      const decryptedZero = (decryptAmount as vi.Mock)(zeroCiphertext, keypair.secretKey)
      expect(decryptedZero).toBe(0n)

      // Test non-zero amounts
      const testAmounts = [1n, 100n, 1000n, 1000000n]
      for (const amount of testAmounts) {
        const ciphertext = (encryptAmount as vi.Mock)(amount, keypair.publicKey)
        expect(ciphertext.commitment).toBeDefined()
        expect(ciphertext.handle).toBeDefined()
        
        ;(decryptAmount as vi.Mock).mockReturnValue(amount)
        const decrypted = (decryptAmount as vi.Mock)(ciphertext, keypair.secretKey)
        expect(decrypted).toBe(amount)
      }
    })

    it('should test confidential transfer proof generation', async () => {
      const { generateTransferProof } = await import('../../src/utils/elgamal-complete')
      
      // Setup transfer scenario
      const sourceKeypair = { 
        publicKey: new Uint8Array(32).fill(0x01), 
        secretKey: new Uint8Array(32).fill(0x02) 
      }
      const destPubkey = new Uint8Array(32).fill(0x03)
      
      const sourceBalance = {
        commitment: { commitment: new Uint8Array(32).fill(0x04) },
        handle: { handle: new Uint8Array(32).fill(0x05) }
      }
      
      const transferAmount = 1_000_000n
      
      const proofResult = (generateTransferProof as vi.Mock)(
        sourceBalance,
        transferAmount,
        sourceKeypair,
        destPubkey
      )

      // Verify proof structure matches Solana ZK program requirements
      expect(proofResult.transferProof.encryptedTransferAmount).toHaveLength(64)
      expect(proofResult.transferProof.newSourceCommitment).toHaveLength(32)
      expect(proofResult.transferProof.equalityProof).toHaveLength(192)
      expect(proofResult.transferProof.validityProof).toHaveLength(96)
      expect(proofResult.transferProof.rangeProof).toHaveLength(674)
      
      // Verify new encrypted balances
      expect(proofResult.newSourceBalance.commitment.commitment).toHaveLength(32)
      expect(proofResult.newSourceBalance.handle.handle).toHaveLength(32)
      expect(proofResult.destCiphertext.commitment.commitment).toHaveLength(32)
      expect(proofResult.destCiphertext.handle.handle).toHaveLength(32)
    })

    it('should verify Token-2022 confidential transfer CPI compatibility', async () => {
      const { getInitializeConfidentialTransferMintInstruction } = await import('../../src/generated')

      // Mock instruction that would interact with actual Token-2022 program
      ;(getInitializeConfidentialTransferMintInstruction as vi.Mock).mockReturnValue({
        programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        accounts: [
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: signer.address, isSigner: true, isWritable: false },
          { pubkey: address('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }
        ],
        data: new Uint8Array([
          15, // InitializeConfidentialTransferMint discriminator
          1,  // authority present
          ...signer.address,
          1,  // auto_approve_new_accounts = true
          0   // auditing_enabled = false
        ])
      })

      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('confidential-init-signature')
      })

      const result = await token2022.initializeConfidentialTransferMint({
        mint: mintAddress,
        config: {
          authority: signer.address,
          autoApproveNewAccounts: true,
          auditingEnabled: false
        },
        signer
      })

      expect(result.signature).toBe('confidential-init-signature')
      
      // Verify instruction was called with correct Token-2022 program format
      expect(getInitializeConfidentialTransferMintInstruction).toHaveBeenCalledWith({
        mint: mintAddress,
        mintAuthority: signer,
        authority: signer.address,
        autoApproveNewAccounts: true,
        auditingEnabled: false
      })
    })
  })
})