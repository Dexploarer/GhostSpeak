/**
 * Comprehensive tests for Token Utilities
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import {
  // Core functions
  deriveAssociatedTokenAddress,
  deriveSplTokenAssociatedTokenAddress,
  deriveToken2022AssociatedTokenAddress,
  getAssociatedTokenAccount,
  
  // Token program detection
  detectTokenProgram,
  isToken2022Mint,
  getTokenProgramType,
  
  // Token 2022 extensions
  checkToken2022Extensions,
  hasTransferFeeExtension,
  hasConfidentialTransferExtension,
  hasInterestBearingExtension,
  getTransferFeeConfig,
  getConfidentialTransferConfig,
  getInterestBearingConfig,
  
  // Token account utilities
  calculateTokenAccountRent,
  getAllAssociatedTokenAddresses,
  validateAssociatedTokenAddress,
  
  // Helper functions
  getTokenProgramAddress,
  getTokenProgramFromAddress,
  formatTokenAmount,
  parseTokenAmount,
  getTokenExtensionData,
  parseTransferFeeConfig,
  fetchTransferFeeConfig,
  hasTransferFees,
  
  // Types
  TokenProgram,
  TokenExtension,
  type AssociatedTokenAccount,
  type TransferFeeConfig,
  type ConfidentialTransferConfig,
  type InterestBearingConfig
} from '../../../src/utils/token-utils.js'
import type { Address } from '@solana/addresses'
import { 
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
} from '../../../src/constants/system-addresses.js'

// Mock @solana/kit
vi.mock('@solana/kit', () => ({
  getProgramDerivedAddress: vi.fn(),
  getAddressEncoder: vi.fn(() => ({
    encode: vi.fn((address: Address) => new Uint8Array(32))
  })),
  createSolanaRpc: vi.fn()
}))

// Mock token-2022-rpc.js
vi.mock('../../../src/utils/token-2022-rpc.js', () => ({
  getMintWithExtensions: vi.fn()
}))

import { getProgramDerivedAddress, getAddressEncoder, createSolanaRpc } from '@solana/kit'
import { getMintWithExtensions } from '../../../src/utils/token-2022-rpc.js'

// Test addresses
const TEST_WALLET = '11111111111111111111111111111111' as Address
const TEST_MINT = '22222222222222222222222222222222' as Address
const TEST_ATA_SPL = '33333333333333333333333333333333' as Address
const TEST_ATA_2022 = '44444444444444444444444444444444' as Address

describe('Token Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Associated Token Address Derivation', () => {
    beforeEach(() => {
      // Mock PDA derivation
      (getProgramDerivedAddress as Mock).mockImplementation(async ({ programAddress }) => {
        if (programAddress === ASSOCIATED_TOKEN_PROGRAM_ADDRESS) {
          // Return different addresses based on token program in seeds
          const seeds = (getProgramDerivedAddress as Mock).mock.calls[
            (getProgramDerivedAddress as Mock).mock.calls.length - 1
          ]?.[0]?.seeds
          
          if (seeds?.[1] === TOKEN_PROGRAM_ADDRESS) {
            return [TEST_ATA_SPL, 255]
          } else if (seeds?.[1] === TOKEN_2022_PROGRAM_ADDRESS) {
            return [TEST_ATA_2022, 255]
          }
        }
        return ['55555555555555555555555555555555' as Address, 255]
      })
    })

    describe('deriveAssociatedTokenAddress', () => {
      it('should derive ATA for SPL Token by default', async () => {
        const ata = await deriveAssociatedTokenAddress(TEST_WALLET, TEST_MINT)
        
        expect(ata).toBe(TEST_ATA_SPL)
        expect(getProgramDerivedAddress).toHaveBeenCalledWith({
          programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
          seeds: expect.any(Array)
        })
      })

      it('should derive ATA for Token 2022 when specified', async () => {
        const ata = await deriveAssociatedTokenAddress(
          TEST_WALLET,
          TEST_MINT,
          TOKEN_2022_PROGRAM_ADDRESS
        )
        
        expect(ata).toBe(TEST_ATA_2022)
      })

      it('should use correct seed order', async () => {
        await deriveAssociatedTokenAddress(TEST_WALLET, TEST_MINT, TOKEN_PROGRAM_ADDRESS)
        
        const encoder = getAddressEncoder()
        expect(encoder.encode).toHaveBeenCalledWith(TEST_WALLET)
        expect(encoder.encode).toHaveBeenCalledWith(TOKEN_PROGRAM_ADDRESS)
        expect(encoder.encode).toHaveBeenCalledWith(TEST_MINT)
      })
    })

    describe('deriveSplTokenAssociatedTokenAddress', () => {
      it('should derive SPL Token ATA', async () => {
        const ata = await deriveSplTokenAssociatedTokenAddress(TEST_WALLET, TEST_MINT)
        
        expect(ata).toBe(TEST_ATA_SPL)
        expect(getAddressEncoder().encode).toHaveBeenCalledWith(TOKEN_PROGRAM_ADDRESS)
      })
    })

    describe('deriveToken2022AssociatedTokenAddress', () => {
      it('should derive Token 2022 ATA', async () => {
        const ata = await deriveToken2022AssociatedTokenAddress(TEST_WALLET, TEST_MINT)
        
        expect(ata).toBe(TEST_ATA_2022)
        expect(getAddressEncoder().encode).toHaveBeenCalledWith(TOKEN_2022_PROGRAM_ADDRESS)
      })
    })

    describe('getAssociatedTokenAccount', () => {
      it('should return complete ATA info for SPL Token', async () => {
        const ataInfo = await getAssociatedTokenAccount(TEST_WALLET, TEST_MINT)
        
        expect(ataInfo).toEqual({
          address: TEST_ATA_SPL,
          owner: TEST_WALLET,
          mint: TEST_MINT,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
          isToken2022: false
        })
      })

      it('should return complete ATA info for Token 2022', async () => {
        const ataInfo = await getAssociatedTokenAccount(
          TEST_WALLET,
          TEST_MINT,
          TOKEN_2022_PROGRAM_ADDRESS
        )
        
        expect(ataInfo).toEqual({
          address: TEST_ATA_2022,
          owner: TEST_WALLET,
          mint: TEST_MINT,
          tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
          isToken2022: true
        })
      })

      it('should default to SPL Token when program not specified', async () => {
        const ataInfo = await getAssociatedTokenAccount(TEST_WALLET, TEST_MINT)
        
        expect(ataInfo.tokenProgram).toBe(TOKEN_PROGRAM_ADDRESS)
        expect(ataInfo.isToken2022).toBe(false)
      })
    })
  })

  describe('Token Program Detection', () => {
    let mockRpc: any

    beforeEach(() => {
      mockRpc = {
        getAccountInfo: vi.fn(() => ({
          send: vi.fn()
        }))
      };
      (createSolanaRpc as Mock).mockReturnValue(mockRpc)
    })

    describe('detectTokenProgram', () => {
      it('should detect SPL Token program', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const program = await detectTokenProgram(TEST_MINT)
        
        expect(program).toBe(TOKEN_PROGRAM_ADDRESS)
        expect(mockRpc.getAccountInfo).toHaveBeenCalledWith(TEST_MINT, {
          encoding: 'base64',
          commitment: 'confirmed'
        })
      })

      it('should detect Token 2022 program', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_2022_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const program = await detectTokenProgram(TEST_MINT)
        
        expect(program).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      })

      it('should default to SPL Token for unknown program', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: '99999999999999999999999999999999' as Address,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const program = await detectTokenProgram(TEST_MINT)
        
        expect(program).toBe(TOKEN_PROGRAM_ADDRESS)
      })

      it('should handle mint not found', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: null
          })
        })

        await expect(detectTokenProgram(TEST_MINT)).rejects.toThrow('Mint account')
      })

      it('should use custom RPC endpoint', async () => {
        const customEndpoint = 'https://custom.rpc.endpoint'
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        await detectTokenProgram(TEST_MINT, customEndpoint)
        
        expect(createSolanaRpc).toHaveBeenCalledWith(customEndpoint)
      })

      it('should handle RPC errors gracefully', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockRejectedValue(new Error('RPC error'))
        })

        const program = await detectTokenProgram(TEST_MINT)
        
        expect(program).toBe(TOKEN_PROGRAM_ADDRESS) // Default on error
      })
    })

    describe('isToken2022Mint', () => {
      it('should return true for Token 2022 mint', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_2022_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const result = await isToken2022Mint(TEST_MINT)
        
        expect(result).toBe(true)
      })

      it('should return false for SPL Token mint', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const result = await isToken2022Mint(TEST_MINT)
        
        expect(result).toBe(false)
      })
    })

    describe('getTokenProgramType', () => {
      it('should return TOKEN_2022 enum for Token 2022 mint', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_2022_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const type = await getTokenProgramType(TEST_MINT)
        
        expect(type).toBe(TokenProgram.TOKEN_2022)
      })

      it('should return SPL_TOKEN enum for SPL Token mint', async () => {
        mockRpc.getAccountInfo.mockReturnValue({
          send: vi.fn().mockResolvedValue({
            value: {
              owner: TOKEN_PROGRAM_ADDRESS,
              data: [Buffer.from('mint data').toString('base64'), 'base64']
            }
          })
        })

        const type = await getTokenProgramType(TEST_MINT)
        
        expect(type).toBe(TokenProgram.SPL_TOKEN)
      })
    })
  })

  describe('Token 2022 Extensions', () => {
    let mockRpc: any

    beforeEach(() => {
      mockRpc = { test: 'rpc' }
      ;(createSolanaRpc as Mock).mockReturnValue(mockRpc)
    })

    describe('checkToken2022Extensions', () => {
      it('should check multiple extensions', async () => {
        const mockMintData = {
          extensions: {
            transferFeeConfig: { newerTransferFee: { transferFeeBasisPoints: 100 } },
            confidentialTransferMint: { authority: TEST_WALLET },
            interestBearingConfig: { currentRate: 500 }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await checkToken2022Extensions(TEST_MINT, [
          TokenExtension.TRANSFER_FEE_CONFIG,
          TokenExtension.CONFIDENTIAL_TRANSFER_MINT,
          TokenExtension.INTEREST_BEARING_MINT,
          TokenExtension.NON_TRANSFERABLE
        ])

        expect(result[TokenExtension.TRANSFER_FEE_CONFIG]).toBe(true)
        expect(result[TokenExtension.CONFIDENTIAL_TRANSFER_MINT]).toBe(true)
        expect(result[TokenExtension.INTEREST_BEARING_MINT]).toBe(true)
        expect(result[TokenExtension.NON_TRANSFERABLE]).toBe(false)
      })

      it('should handle mint not found', async () => {
        (getMintWithExtensions as Mock).mockResolvedValue(null)

        const result = await checkToken2022Extensions(TEST_MINT, [
          TokenExtension.TRANSFER_FEE_CONFIG
        ])

        expect(result[TokenExtension.TRANSFER_FEE_CONFIG]).toBe(false)
      })

      it('should handle errors gracefully', async () => {
        (getMintWithExtensions as Mock).mockRejectedValue(new Error('RPC error'))

        const result = await checkToken2022Extensions(TEST_MINT, [
          TokenExtension.TRANSFER_FEE_CONFIG,
          TokenExtension.CONFIDENTIAL_TRANSFER_MINT
        ])

        expect(result[TokenExtension.TRANSFER_FEE_CONFIG]).toBe(false)
        expect(result[TokenExtension.CONFIDENTIAL_TRANSFER_MINT]).toBe(false)
      })

      it('should check all extension types', async () => {
        const mockMintData = {
          extensions: {
            transferFeeConfig: {},
            mintCloseAuthority: {},
            confidentialTransferMint: {},
            defaultAccountState: {},
            nonTransferable: {},
            interestBearingConfig: {},
            permanentDelegate: {},
            transferHook: {},
            metadataPointer: {},
            tokenMetadata: {},
            groupPointer: {},
            tokenGroup: {}
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const allExtensions = Object.values(TokenExtension).filter(
          v => typeof v === 'number'
        ) as TokenExtension[]

        const result = await checkToken2022Extensions(TEST_MINT, allExtensions)

        // Mint-level extensions should be true
        expect(result[TokenExtension.TRANSFER_FEE_CONFIG]).toBe(true)
        expect(result[TokenExtension.MINT_CLOSE_AUTHORITY]).toBe(true)
        expect(result[TokenExtension.CONFIDENTIAL_TRANSFER_MINT]).toBe(true)
        expect(result[TokenExtension.DEFAULT_ACCOUNT_STATE]).toBe(true)
        expect(result[TokenExtension.NON_TRANSFERABLE]).toBe(true)
        expect(result[TokenExtension.INTEREST_BEARING_MINT]).toBe(true)
        expect(result[TokenExtension.PERMANENT_DELEGATE]).toBe(true)
        expect(result[TokenExtension.TRANSFER_HOOK]).toBe(true)
        expect(result[TokenExtension.METADATA_POINTER]).toBe(true)
        expect(result[TokenExtension.TOKEN_METADATA]).toBe(true)
        expect(result[TokenExtension.GROUP_POINTER]).toBe(true)
        expect(result[TokenExtension.TOKEN_GROUP]).toBe(true)

        // Account-level extensions should be false
        expect(result[TokenExtension.TRANSFER_FEE_AMOUNT]).toBe(false)
        expect(result[TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT]).toBe(false)
        expect(result[TokenExtension.IMMUTABLE_OWNER]).toBe(false)
        expect(result[TokenExtension.MEMO_TRANSFER]).toBe(false)
        expect(result[TokenExtension.NON_TRANSFERABLE_ACCOUNT]).toBe(false)
        expect(result[TokenExtension.CPI_GUARD]).toBe(false)
        expect(result[TokenExtension.TRANSFER_HOOK_ACCOUNT]).toBe(false)
      })
    })

    describe('Extension-specific helpers', () => {
      it('should check transfer fee extension', async () => {
        const mockMintData = {
          extensions: {
            transferFeeConfig: { newerTransferFee: { transferFeeBasisPoints: 100 } }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasTransferFeeExtension(TEST_MINT)
        
        expect(result).toBe(true)
        expect(getMintWithExtensions).toHaveBeenCalledWith(mockRpc, TEST_MINT, 'confirmed')
      })

      it('should check confidential transfer extension', async () => {
        const mockMintData = {
          extensions: {
            confidentialTransferMint: { authority: TEST_WALLET }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasConfidentialTransferExtension(TEST_MINT)
        
        expect(result).toBe(true)
      })

      it('should check interest bearing extension', async () => {
        const mockMintData = {
          extensions: {
            interestBearingConfig: { currentRate: 500 }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasInterestBearingExtension(TEST_MINT)
        
        expect(result).toBe(true)
      })
    })

    describe('Extension configuration getters', () => {
      it('should get transfer fee config', async () => {
        const mockConfig = {
          newerTransferFee: {
            epoch: BigInt(100),
            transferFeeBasisPoints: 250,
            maximumFee: BigInt(1000000)
          },
          olderTransferFee: {
            epoch: BigInt(99),
            transferFeeBasisPoints: 200,
            maximumFee: BigInt(900000)
          },
          transferFeeConfigAuthority: TEST_WALLET,
          withdrawWithheldAuthority: TEST_WALLET
        }
        
        const mockMintData = {
          extensions: { transferFeeConfig: mockConfig }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await getTransferFeeConfig(TEST_MINT)
        
        expect(config).toEqual({
          transferFeeBasisPoints: 250,
          maximumFee: BigInt(1000000),
          transferFeeConfigAuthority: TEST_WALLET,
          withdrawWithheldAuthority: TEST_WALLET,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(99),
            transferFeeBasisPoints: 200,
            maximumFee: BigInt(900000)
          },
          newerTransferFee: {
            epoch: BigInt(100),
            transferFeeBasisPoints: 250,
            maximumFee: BigInt(1000000)
          }
        })
      })

      it('should return null when no transfer fee config', async () => {
        const mockMintData = { extensions: {} }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await getTransferFeeConfig(TEST_MINT)
        
        expect(config).toBeNull()
      })

      it('should get confidential transfer config', async () => {
        const mockConfig = {
          authority: TEST_WALLET,
          autoApproveNewAccounts: true,
          auditorElgamalPubkey: new Uint8Array(32)
        }
        
        const mockMintData = {
          extensions: { confidentialTransferMint: mockConfig }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await getConfidentialTransferConfig(TEST_MINT)
        
        expect(config).toEqual({
          authority: TEST_WALLET,
          autoApproveNewAccounts: true,
          auditorElgamalPubkey: mockConfig.auditorElgamalPubkey
        })
      })

      it('should get interest bearing config', async () => {
        const mockConfig = {
          rateAuthority: TEST_WALLET,
          currentRate: 500,
          initializationTimestamp: BigInt(1700000000),
          lastUpdateTimestamp: BigInt(1700001000),
          preUpdateAverageRate: 450
        }
        
        const mockMintData = {
          extensions: { interestBearingConfig: mockConfig }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await getInterestBearingConfig(TEST_MINT)
        
        expect(config).toEqual(mockConfig)
      })

      it('should handle missing initialization timestamp', async () => {
        const mockConfig = {
          rateAuthority: TEST_WALLET,
          currentRate: 500,
          lastUpdateTimestamp: BigInt(1700001000),
          preUpdateAverageRate: 450
        }
        
        const mockMintData = {
          extensions: { interestBearingConfig: mockConfig }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await getInterestBearingConfig(TEST_MINT)
        
        expect(config?.initializationTimestamp).toBeDefined()
        expect(config?.initializationTimestamp).toBeGreaterThan(BigInt(0))
      })

      it('should handle RPC errors in config getters', async () => {
        (getMintWithExtensions as Mock).mockRejectedValue(new Error('RPC error'))

        const transferFeeConfig = await getTransferFeeConfig(TEST_MINT)
        const confidentialConfig = await getConfidentialTransferConfig(TEST_MINT)
        const interestConfig = await getInterestBearingConfig(TEST_MINT)
        
        expect(transferFeeConfig).toBeNull()
        expect(confidentialConfig).toBeNull()
        expect(interestConfig).toBeNull()
      })
    })
  })

  describe('Token Account Utilities', () => {
    describe('calculateTokenAccountRent', () => {
      it('should calculate rent for basic token account', () => {
        const rent = calculateTokenAccountRent([])
        
        expect(rent).toBe(BigInt(165 * 54)) // Base size * rate per byte
      })

      it('should add space for transfer fee amount extension', () => {
        const rent = calculateTokenAccountRent([TokenExtension.TRANSFER_FEE_AMOUNT])
        
        expect(rent).toBe(BigInt((165 + 16) * 54))
      })

      it('should add space for confidential transfer account', () => {
        const rent = calculateTokenAccountRent([TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT])
        
        expect(rent).toBe(BigInt((165 + 286) * 54))
      })

      it('should handle multiple extensions', () => {
        const rent = calculateTokenAccountRent([
          TokenExtension.TRANSFER_FEE_AMOUNT,
          TokenExtension.MEMO_TRANSFER,
          TokenExtension.CPI_GUARD
        ])
        
        expect(rent).toBe(BigInt((165 + 16 + 1 + 1) * 54))
      })

      it('should handle extensions with no additional space', () => {
        const rent = calculateTokenAccountRent([
          TokenExtension.IMMUTABLE_OWNER,
          TokenExtension.NON_TRANSFERABLE_ACCOUNT
        ])
        
        expect(rent).toBe(BigInt(165 * 54)) // No additional space needed
      })

      it('should add default space for unknown extensions', () => {
        const rent = calculateTokenAccountRent([999 as TokenExtension])
        
        expect(rent).toBe(BigInt((165 + 8) * 54))
      })
    })

    describe('getAllAssociatedTokenAddresses', () => {
      beforeEach(() => {
        (getProgramDerivedAddress as Mock).mockImplementation(async ({ seeds }) => {
          // Check token program in seeds to return different addresses
          const encodedSeeds = seeds as Uint8Array[]
          if (encodedSeeds[1] === TOKEN_PROGRAM_ADDRESS) {
            return [TEST_ATA_SPL, 255]
          } else if (encodedSeeds[1] === TOKEN_2022_PROGRAM_ADDRESS) {
            return [TEST_ATA_2022, 255]
          }
          return ['66666666666666666666666666666666' as Address, 255]
        })
      })

      it('should return both SPL and Token 2022 ATAs', async () => {
        const addresses = await getAllAssociatedTokenAddresses(TEST_WALLET, TEST_MINT)
        
        expect(addresses).toEqual({
          splToken: TEST_ATA_SPL,
          token2022: TEST_ATA_2022
        })
      })
    })

    describe('validateAssociatedTokenAddress', () => {
      beforeEach(() => {
        (getProgramDerivedAddress as Mock).mockImplementation(async ({ seeds }) => {
          const encodedSeeds = seeds as Uint8Array[]
          if (encodedSeeds[1] === TOKEN_PROGRAM_ADDRESS) {
            return [TEST_ATA_SPL, 255]
          } else if (encodedSeeds[1] === TOKEN_2022_PROGRAM_ADDRESS) {
            return [TEST_ATA_2022, 255]
          }
          return ['77777777777777777777777777777777' as Address, 255]
        })
      })

      it('should validate SPL Token ATA', async () => {
        const result = await validateAssociatedTokenAddress(
          TEST_ATA_SPL,
          TEST_WALLET,
          TEST_MINT
        )
        
        expect(result).toEqual({
          isValid: true,
          program: TOKEN_PROGRAM_ADDRESS
        })
      })

      it('should validate Token 2022 ATA', async () => {
        const result = await validateAssociatedTokenAddress(
          TEST_ATA_2022,
          TEST_WALLET,
          TEST_MINT
        )
        
        expect(result).toEqual({
          isValid: true,
          program: TOKEN_2022_PROGRAM_ADDRESS
        })
      })

      it('should reject invalid ATA', async () => {
        const result = await validateAssociatedTokenAddress(
          '88888888888888888888888888888888' as Address,
          TEST_WALLET,
          TEST_MINT
        )
        
        expect(result).toEqual({
          isValid: false
        })
      })
    })
  })

  describe('Helper Functions', () => {
    describe('getTokenProgramAddress', () => {
      it('should return SPL Token address', () => {
        const address = getTokenProgramAddress(TokenProgram.SPL_TOKEN)
        expect(address).toBe(TOKEN_PROGRAM_ADDRESS)
      })

      it('should return Token 2022 address', () => {
        const address = getTokenProgramAddress(TokenProgram.TOKEN_2022)
        expect(address).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      })

      it('should throw for unknown program', () => {
        expect(() => getTokenProgramAddress('unknown' as TokenProgram))
          .toThrow('Unknown token program')
      })
    })

    describe('getTokenProgramFromAddress', () => {
      it('should return SPL_TOKEN enum', () => {
        const program = getTokenProgramFromAddress(TOKEN_PROGRAM_ADDRESS)
        expect(program).toBe(TokenProgram.SPL_TOKEN)
      })

      it('should return TOKEN_2022 enum', () => {
        const program = getTokenProgramFromAddress(TOKEN_2022_PROGRAM_ADDRESS)
        expect(program).toBe(TokenProgram.TOKEN_2022)
      })

      it('should throw for unknown address', () => {
        expect(() => getTokenProgramFromAddress('99999999999999999999999999999999' as Address))
          .toThrow('Unknown token program address')
      })
    })

    describe('formatTokenAmount', () => {
      it('should format whole numbers', () => {
        expect(formatTokenAmount(BigInt(1000000), 6)).toBe('1')
        expect(formatTokenAmount(BigInt(5000000), 6)).toBe('5')
      })

      it('should format decimals', () => {
        expect(formatTokenAmount(BigInt(1500000), 6)).toBe('1.5')
        expect(formatTokenAmount(BigInt(1234567), 6)).toBe('1.234567')
      })

      it('should trim trailing zeros', () => {
        expect(formatTokenAmount(BigInt(1500000), 6)).toBe('1.5')
        expect(formatTokenAmount(BigInt(1230000), 6)).toBe('1.23')
      })

      it('should handle zero', () => {
        expect(formatTokenAmount(BigInt(0), 6)).toBe('0')
      })

      it('should handle different decimal places', () => {
        expect(formatTokenAmount(BigInt(100), 2)).toBe('1')
        expect(formatTokenAmount(BigInt(12345678900), 9)).toBe('12.3456789')
      })

      it('should handle very large numbers', () => {
        expect(formatTokenAmount(BigInt('1000000000000000000'), 18)).toBe('1')
        expect(formatTokenAmount(BigInt('123456789012345678901234567890'), 18))
          .toBe('123456789012.34567890123456789')
      })
    })

    describe('parseTokenAmount', () => {
      it('should parse whole numbers', () => {
        expect(parseTokenAmount('1', 6)).toBe(BigInt(1000000))
        expect(parseTokenAmount('5', 6)).toBe(BigInt(5000000))
      })

      it('should parse decimals', () => {
        expect(parseTokenAmount('1.5', 6)).toBe(BigInt(1500000))
        expect(parseTokenAmount('1.234567', 6)).toBe(BigInt(1234567))
      })

      it('should handle missing decimals', () => {
        expect(parseTokenAmount('10', 6)).toBe(BigInt(10000000))
      })

      it('should truncate excess decimals', () => {
        expect(parseTokenAmount('1.123456789', 6)).toBe(BigInt(1123456))
      })

      it('should pad insufficient decimals', () => {
        expect(parseTokenAmount('1.5', 6)).toBe(BigInt(1500000))
        expect(parseTokenAmount('1.1', 6)).toBe(BigInt(1100000))
      })

      it('should handle zero', () => {
        expect(parseTokenAmount('0', 6)).toBe(BigInt(0))
        expect(parseTokenAmount('0.0', 6)).toBe(BigInt(0))
      })

      it('should handle different decimal places', () => {
        expect(parseTokenAmount('1', 2)).toBe(BigInt(100))
        expect(parseTokenAmount('12.3456789', 9)).toBe(BigInt(12345678900))
      })
    })

    describe('getTokenExtensionData', () => {
      it('should get extension data from mint', () => {
        const mintData = {
          extensions: {
            transferFeeConfig: { test: 'data' }
          }
        }

        const data = getTokenExtensionData(mintData, TokenExtension.TRANSFER_FEE_CONFIG)
        
        expect(data).toBeInstanceOf(Buffer)
        expect(JSON.parse(data!.toString())).toEqual({ test: 'data' })
      })

      it('should return null for missing extension', () => {
        const mintData = {
          extensions: {}
        }

        const data = getTokenExtensionData(mintData, TokenExtension.TRANSFER_FEE_CONFIG)
        
        expect(data).toBeNull()
      })

      it('should return null for null mint data', () => {
        const data = getTokenExtensionData(null, TokenExtension.TRANSFER_FEE_CONFIG)
        
        expect(data).toBeNull()
      })

      it('should handle all extension types', () => {
        const mintData = {
          extensions: {
            transferFeeConfig: { fee: 100 },
            mintCloseAuthority: { authority: TEST_WALLET },
            confidentialTransferMint: { authority: TEST_WALLET },
            defaultAccountState: { state: 'frozen' },
            nonTransferable: true,
            interestBearingConfig: { rate: 500 },
            permanentDelegate: { delegate: TEST_WALLET },
            transferHook: { programId: TEST_WALLET },
            metadataPointer: { pointer: TEST_WALLET },
            tokenMetadata: { name: 'Test Token' },
            groupPointer: { pointer: TEST_WALLET },
            tokenGroup: { maxSize: 100 }
          }
        }

        // Test each extension type
        expect(getTokenExtensionData(mintData, TokenExtension.TRANSFER_FEE_CONFIG)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.MINT_CLOSE_AUTHORITY)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.CONFIDENTIAL_TRANSFER_MINT)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.DEFAULT_ACCOUNT_STATE)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.NON_TRANSFERABLE)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.INTEREST_BEARING_MINT)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.PERMANENT_DELEGATE)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.TRANSFER_HOOK)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.METADATA_POINTER)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.TOKEN_METADATA)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.GROUP_POINTER)).toBeInstanceOf(Buffer)
        expect(getTokenExtensionData(mintData, TokenExtension.TOKEN_GROUP)).toBeInstanceOf(Buffer)
      })
    })

    describe('parseTransferFeeConfig', () => {
      it('should parse from Buffer', () => {
        const configData = {
          transferFeeBasisPoints: 250,
          maximumFee: '1000000',
          transferFeeConfigAuthority: TEST_WALLET,
          withdrawWithheldAuthority: TEST_WALLET
        }
        const buffer = Buffer.from(JSON.stringify(configData))

        const config = parseTransferFeeConfig(buffer)
        
        expect(config.transferFeeBasisPoints).toBe(250)
        expect(config.maximumFee).toBe(BigInt(1000000))
        expect(config.transferFeeConfigAuthority).toBe(TEST_WALLET)
        expect(config.withdrawWithheldAuthority).toBe(TEST_WALLET)
      })

      it('should parse from object', () => {
        const configData = {
          transferFeeBasisPoints: 300,
          maximumFee: BigInt(2000000),
          transferFeeConfigAuthority: TEST_WALLET,
          withdrawWithheldAuthority: null
        }

        const config = parseTransferFeeConfig(configData)
        
        expect(config.transferFeeBasisPoints).toBe(300)
        expect(config.maximumFee).toBe(BigInt(2000000))
        expect(config.transferFeeConfigAuthority).toBe(TEST_WALLET)
        expect(config.withdrawWithheldAuthority).toBeNull()
      })

      it('should handle missing fields', () => {
        const config = parseTransferFeeConfig({})
        
        expect(config.transferFeeBasisPoints).toBe(0)
        expect(config.maximumFee).toBe(BigInt(0))
        expect(config.transferFeeConfigAuthority).toBeNull()
        expect(config.withdrawWithheldAuthority).toBeNull()
      })

      it('should handle invalid data', () => {
        const config = parseTransferFeeConfig(Buffer.from('invalid json'))
        
        expect(config.transferFeeBasisPoints).toBe(0)
        expect(config.maximumFee).toBe(BigInt(0))
      })

      it('should handle string maximumFee', () => {
        const configData = {
          maximumFee: '12345678901234567890'
        }

        const config = parseTransferFeeConfig(configData)
        
        expect(config.maximumFee).toBe(BigInt('12345678901234567890'))
      })

      it('should handle number maximumFee', () => {
        const configData = {
          maximumFee: 1000000
        }

        const config = parseTransferFeeConfig(configData)
        
        expect(config.maximumFee).toBe(BigInt(1000000))
      })
    })

    describe('fetchTransferFeeConfig', () => {
      let mockRpc: any

      beforeEach(() => {
        mockRpc = {}
      })

      it('should fetch and parse transfer fee config', async () => {
        const mockConfig = {
          transferFeeBasisPoints: 150,
          maximumFee: BigInt(500000)
        }
        
        const mockMintData = {
          extensions: { transferFeeConfig: mockConfig }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await fetchTransferFeeConfig(mockRpc, TEST_MINT)
        
        expect(config).toBeDefined()
        expect(config?.transferFeeBasisPoints).toBe(150)
        expect(config?.maximumFee).toBe(BigInt(500000))
      })

      it('should return null when no config', async () => {
        const mockMintData = { extensions: {} }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const config = await fetchTransferFeeConfig(mockRpc, TEST_MINT)
        
        expect(config).toBeNull()
      })

      it('should handle errors', async () => {
        (getMintWithExtensions as Mock).mockRejectedValue(new Error('RPC error'))

        const config = await fetchTransferFeeConfig(mockRpc, TEST_MINT)
        
        expect(config).toBeNull()
      })
    })

    describe('hasTransferFees', () => {
      let mockRpc: any

      beforeEach(() => {
        mockRpc = {}
      })

      it('should return true when fees are enabled', async () => {
        const mockMintData = {
          extensions: {
            transferFeeConfig: {
              transferFeeBasisPoints: 250,
              maximumFee: BigInt(1000000)
            }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasTransferFees(mockRpc, TEST_MINT)
        
        expect(result).toBe(true)
      })

      it('should return false when fees are zero', async () => {
        const mockMintData = {
          extensions: {
            transferFeeConfig: {
              transferFeeBasisPoints: 0,
              maximumFee: BigInt(0)
            }
          }
        }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasTransferFees(mockRpc, TEST_MINT)
        
        expect(result).toBe(false)
      })

      it('should return false when no fee config', async () => {
        const mockMintData = { extensions: {} }
        ;(getMintWithExtensions as Mock).mockResolvedValue(mockMintData)

        const result = await hasTransferFees(mockRpc, TEST_MINT)
        
        expect(result).toBe(false)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent ATA derivations', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(deriveAssociatedTokenAddress(TEST_WALLET, TEST_MINT))
      }

      const results = await Promise.all(promises)
      
      expect(results.every(ata => ata === TEST_ATA_SPL)).toBe(true)
    })

    it('should handle very long token amounts', () => {
      const veryLarge = BigInt('999999999999999999999999999999999999')
      const formatted = formatTokenAmount(veryLarge, 18)
      const parsed = parseTokenAmount(formatted, 18)
      
      expect(parsed).toBe(veryLarge)
    })

    it('should handle zero decimals', () => {
      expect(formatTokenAmount(BigInt(100), 0)).toBe('100')
      expect(parseTokenAmount('100', 0)).toBe(BigInt(100))
    })

    it('should handle empty extension arrays', () => {
      const rent = calculateTokenAccountRent([])
      expect(rent).toBeGreaterThan(BigInt(0))
    })
  })
})