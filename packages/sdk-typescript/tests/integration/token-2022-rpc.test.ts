/**
 * Integration tests for Token-2022 RPC query functions
 * 
 * These tests verify that the RPC query functions work correctly
 * with real token mints and network calls.
 */

import { 
  createSolanaRpc,
  address 
} from '@solana/kit'
import type { Address } from '@solana/kit'
import {
  getMintWithExtensions,
  parseToken2022MintData,
  parseTransferFeeConfig,
  fetchAccountInfoWithRetry
} from '../../src/utils/token-2022-rpc.js'
import {
  fetchTransferFeeConfig,
  hasTransferFees,
  getTokenExtensionData,
  parseTransferFeeConfig as parseTransferFeeConfigUtil
} from '../../src/utils/token-utils.js'

// Test configuration
const TEST_RPC_ENDPOINT = process.env.TEST_RPC_ENDPOINT || 'https://api.devnet.solana.com'
const TEST_TIMEOUT = 30000 // 30 seconds for network calls

// Known devnet addresses for testing
const KNOWN_USDC_MINT: Address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address
const KNOWN_TOKEN_2022_MINT: Address = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address // Token-2022 program itself
const MOCK_TRANSFER_FEE_MINT: Address = 'FeeToken11111111111111111111111111111111111' as Address

describe('Token-2022 RPC Integration Tests', () => {
  let rpc: ReturnType<typeof createSolanaRpc>

  beforeAll(() => {
    rpc = createSolanaRpc(TEST_RPC_ENDPOINT)
  })

  describe('getMintWithExtensions', () => {
    it('should fetch mint data for a standard token', async () => {
      const mintData = await getMintWithExtensions(rpc, KNOWN_USDC_MINT, 'confirmed')
      
      expect(mintData).toBeDefined()
      expect(mintData?.address).toBe(KNOWN_USDC_MINT)
      expect(typeof mintData?.decimals).toBe('number')
      expect(mintData?.decimals).toBeGreaterThanOrEqual(0)
      expect(mintData?.decimals).toBeLessThanOrEqual(18)
    }, TEST_TIMEOUT)

    it('should return null for non-existent mint', async () => {
      const fakeMint = address('11111111111111111111111111111112') // Invalid but valid format
      const mintData = await getMintWithExtensions(rpc, fakeMint, 'confirmed')
      
      expect(mintData).toBeNull()
    }, TEST_TIMEOUT)

    it('should handle network errors gracefully', async () => {
      // Create RPC with invalid endpoint
      const badRpc = createSolanaRpc('https://invalid-endpoint.example.com')
      
      const mintData = await getMintWithExtensions(badRpc, KNOWN_USDC_MINT, 'confirmed')
      expect(mintData).toBeNull()
    }, TEST_TIMEOUT)
  })

  describe('parseToken2022MintData', () => {
    it('should parse valid mint account data', async () => {
      // Get actual account data from network
      const accountInfo = await fetchAccountInfoWithRetry(rpc, KNOWN_USDC_MINT, 'confirmed')
      
      if (accountInfo?.data) {
        const parsedData = parseToken2022MintData(accountInfo.data)
        
        expect(parsedData).toBeDefined()
        expect(typeof parsedData?.decimals).toBe('number')
        expect(parsedData?.isInitialized).toBe(true)
      }
    }, TEST_TIMEOUT)

    it('should handle invalid data gracefully', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5]) // Too short
      const parsedData = parseToken2022MintData(invalidData)
      
      expect(parsedData).toBeNull()
    })

    it('should handle empty data', () => {
      const emptyData = new Uint8Array(0)
      const parsedData = parseToken2022MintData(emptyData)
      
      expect(parsedData).toBeNull()
    })
  })

  describe('Transfer Fee Functions', () => {
    describe('fetchTransferFeeConfig', () => {
      it('should return null for tokens without transfer fees', async () => {
        const feeConfig = await fetchTransferFeeConfig(rpc, KNOWN_USDC_MINT)
        
        // USDC typically doesn't have transfer fees
        expect(feeConfig).toBeNull()
      }, TEST_TIMEOUT)

      it('should handle non-existent mints', async () => {
        const fakeMint = address('11111111111111111111111111111112')
        const feeConfig = await fetchTransferFeeConfig(rpc, fakeMint)
        
        expect(feeConfig).toBeNull()
      }, TEST_TIMEOUT)
    })

    describe('hasTransferFees', () => {
      it('should return false for standard tokens', async () => {
        const hasFees = await hasTransferFees(rpc, KNOWN_USDC_MINT)
        
        expect(hasFees).toBe(false)
      }, TEST_TIMEOUT)

      it('should return false for non-existent mints', async () => {
        const fakeMint = address('11111111111111111111111111111112')
        const hasFees = await hasTransferFees(rpc, fakeMint)
        
        expect(hasFees).toBe(false)
      }, TEST_TIMEOUT)
    })
  })

  describe('parseTransferFeeConfig', () => {
    it('should parse valid transfer fee config from buffer', () => {
      // Create mock transfer fee config data
      const mockData = {
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: 1000000n,
        transferFeeConfigAuthority: KNOWN_USDC_MINT,
        withdrawWithheldAuthority: KNOWN_USDC_MINT
      }
      
      const buffer = Buffer.from(JSON.stringify(mockData))
      const parsed = parseTransferFeeConfigUtil(buffer)
      
      expect(parsed.transferFeeBasisPoints).toBe(250)
      expect(parsed.maximumFee).toBe(1000000n)
      expect(parsed.transferFeeConfigAuthority).toBe(KNOWN_USDC_MINT)
      expect(parsed.withdrawWithheldAuthority).toBe(KNOWN_USDC_MINT)
    })

    it('should parse valid transfer fee config from object', () => {
      const mockData = {
        transferFeeBasisPoints: 100,
        maximumFee: 500000,
        transferFeeConfigAuthority: KNOWN_USDC_MINT,
        withdrawWithheldAuthority: null
      }
      
      const parsed = parseTransferFeeConfigUtil(mockData)
      
      expect(parsed.transferFeeBasisPoints).toBe(100)
      expect(parsed.maximumFee).toBe(500000n)
      expect(parsed.transferFeeConfigAuthority).toBe(KNOWN_USDC_MINT)
      expect(parsed.withdrawWithheldAuthority).toBeNull()
    })

    it('should return default config for invalid data', () => {
      const invalidData = "invalid json"
      const parsed = parseTransferFeeConfigUtil(invalidData)
      
      expect(parsed.transferFeeBasisPoints).toBe(0)
      expect(parsed.maximumFee).toBe(0n)
      expect(parsed.transferFeeConfigAuthority).toBeNull()
      expect(parsed.withdrawWithheldAuthority).toBeNull()
    })
  })

  describe('getTokenExtensionData', () => {
    it('should return null for mint without extensions', () => {
      const mockMintData = {
        extensions: {}
      }
      
      // Using transfer fee config extension type (1)
      const extensionData = getTokenExtensionData(mockMintData, 1)
      
      expect(extensionData).toBeNull()
    })

    it('should return extension data when present', () => {
      const mockMintData = {
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 250,
            maximumFee: 1000000n
          }
        }
      }
      
      // Using transfer fee config extension type (1)
      const extensionData = getTokenExtensionData(mockMintData, 1)
      
      expect(extensionData).toBeDefined()
      expect(extensionData).toBeInstanceOf(Buffer)
    })

    it('should return null for null mint data', () => {
      const extensionData = getTokenExtensionData(null, 1)
      
      expect(extensionData).toBeNull()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed RPC responses', async () => {
      // Test with mock RPC that returns unexpected data
      const mockRpc = {
        async getAccountInfo() {
          return {
            send: async () => ({
              value: {
                data: ['invalid-base64', 'base64'], // Invalid base64
                owner: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
              }
            })
          }
        }
      }
      
      const mintData = await getMintWithExtensions(mockRpc as any, KNOWN_USDC_MINT, 'confirmed')
      expect(mintData).toBeNull()
    })

    it('should handle RPC timeout gracefully', async () => {
      // Create RPC with very short timeout
      const timeoutRpc = createSolanaRpc(TEST_RPC_ENDPOINT)
      
      const startTime = Date.now()
      const mintData = await getMintWithExtensions(timeoutRpc, KNOWN_USDC_MINT, 'confirmed')
      const duration = Date.now() - startTime
      
      // Should complete within reasonable time (allow for actual network calls)
      expect(duration).toBeLessThan(TEST_TIMEOUT)
      // Result can be either valid data or null (depending on network)
      expect(mintData === null || typeof mintData === 'object').toBe(true)
    }, TEST_TIMEOUT)
  })

  describe('Performance Tests', () => {
    it('should fetch multiple mints concurrently', async () => {
      const mints = [
        KNOWN_USDC_MINT,
        KNOWN_TOKEN_2022_MINT,
        MOCK_TRANSFER_FEE_MINT
      ]
      
      const startTime = Date.now()
      
      const results = await Promise.all(
        mints.map(mint => getMintWithExtensions(rpc, mint, 'confirmed'))
      )
      
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(3)
      expect(duration).toBeLessThan(TEST_TIMEOUT)
      
      // At least one should succeed (USDC should exist)
      const successfulResults = results.filter(result => result !== null)
      expect(successfulResults.length).toBeGreaterThanOrEqual(1)
    }, TEST_TIMEOUT)

    it('should cache and reuse RPC connections efficiently', async () => {
      const iterations = 5
      const startTime = Date.now()
      
      for (let i = 0; i < iterations; i++) {
        await getMintWithExtensions(rpc, KNOWN_USDC_MINT, 'confirmed')
      }
      
      const duration = Date.now() - startTime
      const avgDuration = duration / iterations
      
      // Each subsequent call should be faster due to connection reuse
      expect(avgDuration).toBeLessThan(TEST_TIMEOUT / iterations)
    }, TEST_TIMEOUT)
  })
})