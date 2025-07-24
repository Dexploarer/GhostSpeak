import { describe, it, expect, vi, beforeEach } from 'vitest'
import { address } from '@solana/addresses'
import {
  TOKEN_2022_PROGRAM_ID,
  getMintWithExtensions,
  getMultipleMintsWithExtensions,
  mintHasExtension,
  getTokenAccountWithExtensions,
  getTokenAccountsByOwnerWithExtensions,
  getAccountSizeForExtensions,
  isToken2022,
  getTokenProgramForMint,
  type MintWithExtensions,
  type TokenAccountWithExtensions
} from '../../src/utils/token-2022-rpc'
import { ExtensionType, AccountState } from '../../src/types/token-2022-types'
import type { Address } from '@solana/addresses'

// Mock RPC client
const createMockRpc = () => ({
  getAccountInfo: vi.fn(),
  getMultipleAccounts: vi.fn(),
  getProgramAccounts: vi.fn()
})

// Helper to create base64 encoded data
const encodeData = (data: Uint8Array): string => Buffer.from(data).toString('base64')

// Helper to create mint data with extensions
function createMintData(hasExtensions: boolean = false): Uint8Array {
  const data = new Uint8Array(hasExtensions ? 200 : 82)
  const view = new DataView(data.buffer)
  
  // Basic mint structure
  data[0] = 1 // Has mint authority
  // Mint authority (32 bytes) - fill with test data
  for (let i = 1; i <= 32; i++) data[i] = i
  
  // Supply (8 bytes)
  view.setBigUint64(33, 1000000n, true)
  
  // Decimals
  data[41] = 9
  
  // Is initialized
  data[42] = 1
  
  // Has freeze authority
  data[43] = 1
  // Freeze authority (32 bytes)
  for (let i = 44; i <= 75; i++) data[i] = i + 32
  
  if (hasExtensions) {
    // Add transfer fee config extension
    const offset = 82
    view.setUint16(offset, ExtensionType.TransferFeeConfig, true)
    view.setUint16(offset + 2, 108, true) // Extension length
    
    // Extension data (simplified)
    for (let i = offset + 4; i < offset + 4 + 108; i++) {
      data[i] = 0
    }
  }
  
  return data
}

// Helper to create token account data with extensions
function createTokenAccountData(hasExtensions: boolean = false): Uint8Array {
  const data = new Uint8Array(hasExtensions ? 300 : 165)
  const view = new DataView(data.buffer)
  
  // Mint (32 bytes)
  for (let i = 0; i < 32; i++) data[i] = 1
  
  // Owner (32 bytes)
  for (let i = 32; i < 64; i++) data[i] = 2
  
  // Amount (8 bytes)
  view.setBigUint64(64, 500000n, true)
  
  // Has delegate
  data[72] = 0
  // Skip delegate bytes (32)
  
  // State
  data[105] = AccountState.Initialized
  
  // Is native
  data[106] = 0
  // Skip native amount (8)
  
  // Delegated amount (8 bytes)
  view.setBigUint64(115, 0n, true)
  
  // Has close authority
  data[123] = 0
  // Skip close authority (32)
  
  if (hasExtensions) {
    // Add transfer fee amount extension
    const offset = 165
    view.setUint16(offset, ExtensionType.TransferFeeAmount, true)
    view.setUint16(offset + 2, 8, true) // Extension length
    view.setBigUint64(offset + 4, 100n, true) // Withheld amount
  }
  
  return data
}

describe('Token-2022 RPC Functions', () => {
  let mockRpc: ReturnType<typeof createMockRpc>
  
  beforeEach(() => {
    mockRpc = createMockRpc()
  })

  describe('getMintWithExtensions', () => {
    it('should parse basic mint without extensions', async () => {
      const mintAddress = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      const mintData = createMintData(false)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(mintData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const result = await getMintWithExtensions(mockRpc, mintAddress)
      
      expect(result).not.toBeNull()
      expect(result?.address).toBe(mintAddress)
      expect(result?.supply).toBe(1000000n)
      expect(result?.decimals).toBe(9)
      expect(result?.isInitialized).toBe(true)
      expect(result?.extensions).toEqual({})
    })
    
    it('should parse mint with transfer fee extension', async () => {
      const mintAddress = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      const mintData = createMintData(true)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(mintData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const result = await getMintWithExtensions(mockRpc, mintAddress)
      
      expect(result).not.toBeNull()
      expect(result?.extensions.transferFeeConfig).toBeDefined()
    })
    
    it('should return null for non-existent mint', async () => {
      const mintAddress = address('11111111111111111111111111111112')
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: null
      })
      
      const result = await getMintWithExtensions(mockRpc, mintAddress)
      expect(result).toBeNull()
    })
    
    it('should throw error for non-Token-2022 mint', async () => {
      const mintAddress = address('11111111111111111111111111111112')
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(new Uint8Array(82)), 'base64'],
          owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 1000000,
          executable: false
        }
      })
      
      await expect(getMintWithExtensions(mockRpc, mintAddress))
        .rejects.toThrow('Not a Token-2022 mint')
    })
    
    it('should handle string data format', async () => {
      const mintAddress = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      const mintData = createMintData(false)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: encodeData(mintData), // String format instead of array
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const result = await getMintWithExtensions(mockRpc, mintAddress)
      expect(result).not.toBeNull()
      expect(result?.decimals).toBe(9)
    })
  })

  describe('getMultipleMintsWithExtensions', () => {
    it('should fetch multiple mints', async () => {
      const mint1 = address('11111111111111111111111111111112')
      const mint2 = address('So11111111111111111111111111111111111111112')
      const mintData = createMintData(false)
      
      mockRpc.getMultipleAccounts.mockResolvedValueOnce({
        value: [
          {
            data: [encodeData(mintData), 'base64'],
            owner: TOKEN_2022_PROGRAM_ID,
            lamports: 1000000,
            executable: false
          },
          null // Second mint doesn't exist
        ]
      })
      
      // Mock individual getAccountInfo calls
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(mintData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const results = await getMultipleMintsWithExtensions(mockRpc, [mint1, mint2])
      
      expect(results).toHaveLength(2)
      expect(results[0]).not.toBeNull()
      expect(results[1]).toBeNull()
    })
  })

  describe('mintHasExtension', () => {
    it('should detect transfer fee extension', async () => {
      const mintAddress = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      const mintData = createMintData(true)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(mintData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const hasExtension = await mintHasExtension(
        mockRpc,
        mintAddress,
        ExtensionType.TransferFeeConfig
      )
      
      expect(hasExtension).toBe(true)
    })
    
    it('should return false for missing extension', async () => {
      const mintAddress = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      const mintData = createMintData(false)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(mintData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      const hasExtension = await mintHasExtension(
        mockRpc,
        mintAddress,
        ExtensionType.TransferFeeConfig
      )
      
      expect(hasExtension).toBe(false)
    })
  })

  describe('getTokenAccountWithExtensions', () => {
    it('should parse basic token account', async () => {
      const accountAddress = address('11111111111111111111111111111112')
      const accountData = createTokenAccountData(false)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(accountData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 2000000,
          executable: false
        }
      })
      
      const result = await getTokenAccountWithExtensions(mockRpc, accountAddress)
      
      expect(result).not.toBeNull()
      expect(result?.address).toBe(accountAddress)
      expect(result?.amount).toBe(500000n)
      expect(result?.state).toBe(AccountState.Initialized)
      expect(result?.extensions).toEqual({})
    })
    
    it('should parse token account with extensions', async () => {
      const accountAddress = address('11111111111111111111111111111112')
      const accountData = createTokenAccountData(true)
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(accountData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 2000000,
          executable: false
        }
      })
      
      const result = await getTokenAccountWithExtensions(mockRpc, accountAddress)
      
      expect(result).not.toBeNull()
      expect(result?.extensions.transferFeeAmount).toBeDefined()
      expect(result?.extensions.transferFeeAmount?.withheldAmount).toBe(100n)
    })
  })

  describe('getTokenAccountsByOwnerWithExtensions', () => {
    it('should fetch all token accounts for owner', async () => {
      const owner = address('11111111111111111111111111111112')
      const accountData = createTokenAccountData(false)
      
      mockRpc.getProgramAccounts.mockResolvedValueOnce({
        value: [
          {
            pubkey: address('So11111111111111111111111111111111111111112'),
            account: {
              data: [encodeData(accountData), 'base64'],
              owner: TOKEN_2022_PROGRAM_ID,
              lamports: 2000000,
              executable: false
            }
          }
        ]
      })
      
      // Mock individual getAccountInfo call
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(accountData), 'base64'],
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 2000000,
          executable: false
        }
      })
      
      const results = await getTokenAccountsByOwnerWithExtensions(mockRpc, owner)
      
      expect(results).toHaveLength(1)
      expect(results[0].amount).toBe(500000n)
    })
    
    it('should filter by mint if provided', async () => {
      const owner = address('11111111111111111111111111111112')
      const mint = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      
      mockRpc.getProgramAccounts.mockResolvedValueOnce({
        value: []
      })
      
      const results = await getTokenAccountsByOwnerWithExtensions(mockRpc, owner, mint)
      
      expect(mockRpc.getProgramAccounts).toHaveBeenCalledWith(
        TOKEN_2022_PROGRAM_ID,
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              memcmp: expect.objectContaining({
                offset: 0, // Mint offset
                bytes: expect.any(String)
              })
            })
          ])
        })
      )
      expect(results).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    describe('getAccountSizeForExtensions', () => {
      it('should calculate size for mint with no extensions', () => {
        const size = getAccountSizeForExtensions(82, [])
        expect(size).toBe(83) // Base + account type discriminator
      })
      
      it('should calculate size for mint with transfer fee extension', () => {
        const size = getAccountSizeForExtensions(82, [ExtensionType.TransferFeeConfig])
        // 82 (base) + 2 (type) + 2 (length) + 108 (extension) + 1 (discriminator)
        expect(size).toBe(195)
      })
      
      it('should calculate size for account with multiple extensions', () => {
        const size = getAccountSizeForExtensions(165, [
          ExtensionType.TransferFeeAmount,
          ExtensionType.ImmutableOwner,
          ExtensionType.MemoTransfer
        ])
        // 165 (base) + 3*(2+2) (headers) + 8 + 0 + 1 (data) + 1 (discriminator)
        expect(size).toBe(187)
      })
      
      it('should handle large extensions', () => {
        const size = getAccountSizeForExtensions(82, [
          ExtensionType.ConfidentialTransferAccount,
          ExtensionType.TokenMetadata
        ])
        // 82 + 2*(2+2) + 402 + 256 + 1
        expect(size).toBe(749)
      })
    })

    describe('isToken2022', () => {
      it('should return true for Token-2022 mint', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(new Uint8Array(82)), 'base64'],
            owner: TOKEN_2022_PROGRAM_ID,
            lamports: 1000000,
            executable: false
          }
        })
        
        const result = await isToken2022(mockRpc, mintAddress)
        expect(result).toBe(true)
      })
      
      it('should return false for legacy token mint', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(new Uint8Array(82)), 'base64'],
            owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            lamports: 1000000,
            executable: false
          }
        })
        
        const result = await isToken2022(mockRpc, mintAddress)
        expect(result).toBe(false)
      })
      
      it('should return false for non-existent account', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: null
        })
        
        const result = await isToken2022(mockRpc, mintAddress)
        expect(result).toBe(false)
      })
    })

    describe('getTokenProgramForMint', () => {
      it('should return Token-2022 program ID', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(new Uint8Array(82)), 'base64'],
            owner: TOKEN_2022_PROGRAM_ID,
            lamports: 1000000,
            executable: false
          }
        })
        
        const programId = await getTokenProgramForMint(mockRpc, mintAddress)
        expect(programId).toBe(TOKEN_2022_PROGRAM_ID)
      })
      
      it('should return legacy token program ID', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        const legacyTokenProgram = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(new Uint8Array(82)), 'base64'],
            owner: legacyTokenProgram,
            lamports: 1000000,
            executable: false
          }
        })
        
        const programId = await getTokenProgramForMint(mockRpc, mintAddress)
        expect(programId).toBe(legacyTokenProgram)
      })
      
      it('should throw for non-existent mint', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: null
        })
        
        await expect(getTokenProgramForMint(mockRpc, mintAddress))
          .rejects.toThrow('Mint account not found')
      })
      
      it('should throw for unknown token program', async () => {
        const mintAddress = address('11111111111111111111111111111112')
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(new Uint8Array(82)), 'base64'],
            owner: address('UnknownProgram111111111111111111111111111'),
            lamports: 1000000,
            executable: false
          }
        })
        
        await expect(getTokenProgramForMint(mockRpc, mintAddress))
          .rejects.toThrow('Unknown token program')
      })
    })
  })

  describe('Extension Parsing', () => {
    it('should parse all supported mint extensions', async () => {
      // This is a comprehensive test to ensure all extension types are handled
      const extensionTypes = [
        ExtensionType.TransferFeeConfig,
        ExtensionType.MintCloseAuthority,
        ExtensionType.ConfidentialTransferMint,
        ExtensionType.DefaultAccountState,
        ExtensionType.NonTransferable,
        ExtensionType.InterestBearingConfig,
        ExtensionType.PermanentDelegate,
        ExtensionType.TransferHook,
        ExtensionType.MetadataPointer,
        ExtensionType.TokenMetadata,
        ExtensionType.GroupPointer,
        ExtensionType.TokenGroup
      ]
      
      // Test that each extension type is recognized
      for (const extensionType of extensionTypes) {
        const data = new Uint8Array(300)
        const view = new DataView(data.buffer)
        
        // Basic mint data
        data[42] = 1 // initialized
        
        // Add extension
        const offset = 82
        view.setUint16(offset, extensionType, true)
        view.setUint16(offset + 2, 100, true) // Dummy length
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(data), 'base64'],
            owner: TOKEN_2022_PROGRAM_ID,
            lamports: 1000000,
            executable: false
          }
        })
        
        const mint = await getMintWithExtensions(
          mockRpc,
          address('11111111111111111111111111111112')
        )
        
        expect(mint).not.toBeNull()
        // At least one extension should be parsed
        expect(Object.keys(mint!.extensions).length).toBeGreaterThan(0)
      }
    })
    
    it('should parse all supported account extensions', async () => {
      const accountExtensionTypes = [
        ExtensionType.TransferFeeAmount,
        ExtensionType.ConfidentialTransferAccount,
        ExtensionType.ImmutableOwner,
        ExtensionType.MemoTransfer,
        ExtensionType.NonTransferableAccount,
        ExtensionType.CpiGuard,
        ExtensionType.TransferHookAccount,
        ExtensionType.GroupMemberPointer,
        ExtensionType.TokenGroupMember
      ]
      
      for (const extensionType of accountExtensionTypes) {
        const data = new Uint8Array(400)
        const view = new DataView(data.buffer)
        
        // Basic account data
        data[105] = AccountState.Initialized
        
        // Add extension
        const offset = 165
        view.setUint16(offset, extensionType, true)
        view.setUint16(offset + 2, 100, true) // Dummy length
        
        mockRpc.getAccountInfo.mockResolvedValueOnce({
          value: {
            data: [encodeData(data), 'base64'],
            owner: TOKEN_2022_PROGRAM_ID,
            lamports: 2000000,
            executable: false
          }
        })
        
        const account = await getTokenAccountWithExtensions(
          mockRpc,
          address('11111111111111111111111111111112')
        )
        
        expect(account).not.toBeNull()
        // At least one extension should be parsed
        expect(Object.keys(account!.extensions).length).toBeGreaterThan(0)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed account data gracefully', async () => {
      const mintAddress = address('11111111111111111111111111111112')
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: [encodeData(new Uint8Array(10)), 'base64'], // Too small
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      // This should handle the error internally
      const result = await getMintWithExtensions(mockRpc, mintAddress)
      expect(result).toBeDefined() // May be partial data or error handled
    })
    
    it('should handle unexpected data format', async () => {
      const mintAddress = address('11111111111111111111111111111112')
      
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: { unexpected: 'format' }, // Wrong format
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          executable: false
        }
      })
      
      await expect(getMintWithExtensions(mockRpc, mintAddress))
        .rejects.toThrow('Unexpected data format')
    })
  })
})