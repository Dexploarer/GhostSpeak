/**
 * Comprehensive tests for transaction URL generation utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Signature, Address } from '@solana/kit'
import {
  detectClusterFromEndpoint,
  getSolanaExplorerUrl,
  getSolscanUrl,
  getSolanaFMUrl,
  getXrayUrl,
  generateExplorerUrls,
  createTransactionResult,
  getAccountExplorerUrls,
  logTransactionDetails,
  createTransactionMarkdown,
  waitForTransactionConfirmation,
  type SolanaCluster,
  type TransactionResult
} from '../../../src/utils/transaction-urls.js'

describe('Transaction URL Utilities', () => {
  const mockSignature = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d' as Signature
  const mockAddress = '7Lz7fJenQxMdh1u4SxbJFSRXMET38qLPJwXCeJP4F3gJ' as Address

  describe('detectClusterFromEndpoint', () => {
    it('should detect devnet cluster', () => {
      const devnetUrls = [
        'https://api.devnet.solana.com',
        'https://devnet.helius-rpc.com',
        'https://solana-devnet.g.alchemy.com',
        'https://rpc.devnet.solana.com'
      ]

      devnetUrls.forEach(url => {
        expect(detectClusterFromEndpoint(url)).toBe('devnet')
      })
    })

    it('should detect testnet cluster', () => {
      const testnetUrls = [
        'https://api.testnet.solana.com',
        'https://testnet.solana.com',
        'https://rpc.testnet.solana.com'
      ]

      testnetUrls.forEach(url => {
        expect(detectClusterFromEndpoint(url)).toBe('testnet')
      })
    })

    it('should detect localnet cluster', () => {
      const localUrls = [
        'http://localhost:8899',
        'http://127.0.0.1:8899',
        'https://localhost:8899',
        'http://localhost:1234'
      ]

      localUrls.forEach(url => {
        expect(detectClusterFromEndpoint(url)).toBe('localnet')
      })
    })

    it('should default to mainnet-beta for other URLs', () => {
      const mainnetUrls = [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana',
        'https://mainnet.helius-rpc.com',
        'https://solana-mainnet.g.alchemy.com'
      ]

      mainnetUrls.forEach(url => {
        expect(detectClusterFromEndpoint(url)).toBe('mainnet-beta')
      })
    })
  })

  describe('getSolanaExplorerUrl', () => {
    it('should generate mainnet URL by default', () => {
      const url = getSolanaExplorerUrl(mockSignature)
      expect(url).toBe(`https://explorer.solana.com/tx/${mockSignature}`)
    })

    it('should generate devnet URL', () => {
      const url = getSolanaExplorerUrl(mockSignature, 'devnet')
      expect(url).toBe(`https://explorer.solana.com/tx/${mockSignature}?cluster=devnet`)
    })

    it('should generate testnet URL', () => {
      const url = getSolanaExplorerUrl(mockSignature, 'testnet')
      expect(url).toBe(`https://explorer.solana.com/tx/${mockSignature}?cluster=testnet`)
    })

    it('should generate localnet URL with custom RPC', () => {
      const url = getSolanaExplorerUrl(mockSignature, 'localnet')
      expect(url).toBe(`https://explorer.solana.com/tx/${mockSignature}?cluster=custom&customUrl=http://localhost:8899`)
    })
  })

  describe('getSolscanUrl', () => {
    it('should generate mainnet URL by default', () => {
      const url = getSolscanUrl(mockSignature)
      expect(url).toBe(`https://solscan.io/tx/${mockSignature}`)
    })

    it('should generate devnet URL', () => {
      const url = getSolscanUrl(mockSignature, 'devnet')
      expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=devnet`)
    })

    it('should generate testnet URL', () => {
      const url = getSolscanUrl(mockSignature, 'testnet')
      expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=testnet`)
    })

    it('should return local message for localnet', () => {
      const url = getSolscanUrl(mockSignature, 'localnet')
      expect(url).toBe(`Local transaction: ${mockSignature} (not viewable on Solscan)`)
    })
  })

  describe('getSolanaFMUrl', () => {
    it('should generate mainnet URL by default', () => {
      const url = getSolanaFMUrl(mockSignature)
      expect(url).toBe(`https://solana.fm/tx/${mockSignature}`)
    })

    it('should generate devnet URL with correct cluster param', () => {
      const url = getSolanaFMUrl(mockSignature, 'devnet')
      expect(url).toBe(`https://solana.fm/tx/${mockSignature}?cluster=devnet-solana`)
    })

    it('should generate testnet URL with correct cluster param', () => {
      const url = getSolanaFMUrl(mockSignature, 'testnet')
      expect(url).toBe(`https://solana.fm/tx/${mockSignature}?cluster=testnet-solana`)
    })

    it('should return local message for localnet', () => {
      const url = getSolanaFMUrl(mockSignature, 'localnet')
      expect(url).toBe(`Local transaction: ${mockSignature} (not viewable on SolanaFM)`)
    })
  })

  describe('getXrayUrl', () => {
    it('should generate mainnet URL by default', () => {
      const url = getXrayUrl(mockSignature)
      expect(url).toBe(`https://xray.helius.xyz/tx/${mockSignature}`)
    })

    it('should generate devnet URL with network param', () => {
      const url = getXrayUrl(mockSignature, 'devnet')
      expect(url).toBe(`https://xray.helius.xyz/tx/${mockSignature}?network=devnet`)
    })

    it('should generate testnet URL with network param', () => {
      const url = getXrayUrl(mockSignature, 'testnet')
      expect(url).toBe(`https://xray.helius.xyz/tx/${mockSignature}?network=testnet`)
    })

    it('should return local message for localnet', () => {
      const url = getXrayUrl(mockSignature, 'localnet')
      expect(url).toBe(`Local transaction: ${mockSignature} (not viewable on XRAY)`)
    })
  })

  describe('generateExplorerUrls', () => {
    it('should generate all explorer URLs for mainnet', () => {
      const urls = generateExplorerUrls(mockSignature)
      
      expect(urls).toHaveProperty('solanaExplorer')
      expect(urls).toHaveProperty('solscan')
      expect(urls).toHaveProperty('solanaFM')
      expect(urls).toHaveProperty('xray')
      
      expect(urls.solanaExplorer).toContain('explorer.solana.com')
      expect(urls.solscan).toContain('solscan.io')
      expect(urls.solanaFM).toContain('solana.fm')
      expect(urls.xray).toContain('xray.helius.xyz')
    })

    it('should generate all explorer URLs for devnet', () => {
      const urls = generateExplorerUrls(mockSignature, 'devnet')
      
      expect(urls.solanaExplorer).toContain('cluster=devnet')
      expect(urls.solscan).toContain('cluster=devnet')
      expect(urls.solanaFM).toContain('cluster=devnet-solana')
      expect(urls.xray).toContain('network=devnet')
    })

    it('should handle localnet correctly', () => {
      const urls = generateExplorerUrls(mockSignature, 'localnet')
      
      expect(urls.solanaExplorer).toContain('customUrl=http://localhost:8899')
      expect(urls.solscan).toContain('Local transaction')
      expect(urls.solanaFM).toContain('Local transaction')
      expect(urls.xray).toContain('Local transaction')
    })
  })

  describe('createTransactionResult', () => {
    it('should create complete transaction result with defaults', () => {
      const result = createTransactionResult(mockSignature, 'devnet')
      
      expect(result.signature).toBe(mockSignature)
      expect(result.cluster).toBe('devnet')
      expect(result.commitment).toBe('confirmed')
      expect(result.timestamp).toBeGreaterThan(0)
      expect(result.timestamp).toBeLessThanOrEqual(Date.now())
      expect(result.urls).toBeDefined()
    })

    it('should create transaction result with custom commitment', () => {
      const result = createTransactionResult(mockSignature, 'mainnet-beta', 'finalized')
      
      expect(result.commitment).toBe('finalized')
    })

    it('should include all URLs in result', () => {
      const result = createTransactionResult(mockSignature, 'testnet')
      
      expect(Object.keys(result.urls)).toHaveLength(4)
      expect(result.urls.solanaExplorer).toContain('testnet')
      expect(result.urls.solscan).toContain('testnet')
      expect(result.urls.solanaFM).toContain('testnet')
      expect(result.urls.xray).toContain('testnet')
    })
  })

  describe('getAccountExplorerUrls', () => {
    it('should generate account URLs for mainnet', () => {
      const urls = getAccountExplorerUrls(mockAddress)
      
      expect(urls.solanaExplorer).toBe(`https://explorer.solana.com/address/${mockAddress}`)
      expect(urls.solscan).toBe(`https://solscan.io/account/${mockAddress}`)
      expect(urls.solanaFM).toBe(`https://solana.fm/address/${mockAddress}`)
    })

    it('should generate account URLs for devnet', () => {
      const urls = getAccountExplorerUrls(mockAddress, 'devnet')
      
      expect(urls.solanaExplorer).toBe(`https://explorer.solana.com/address/${mockAddress}?cluster=devnet`)
      expect(urls.solscan).toBe(`https://solscan.io/account/${mockAddress}?cluster=devnet`)
      expect(urls.solanaFM).toBe(`https://solana.fm/address/${mockAddress}?cluster=devnet-solana`)
    })

    it('should generate account URLs for testnet', () => {
      const urls = getAccountExplorerUrls(mockAddress, 'testnet')
      
      expect(urls.solanaExplorer).toContain('?cluster=testnet')
      expect(urls.solscan).toContain('?cluster=testnet')
      expect(urls.solanaFM).toContain('?cluster=testnet-solana')
    })
  })

  describe('logTransactionDetails', () => {
    let consoleSpy: any

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log transaction details with formatting', () => {
      const result: TransactionResult = {
        signature: mockSignature,
        cluster: 'devnet',
        urls: generateExplorerUrls(mockSignature, 'devnet'),
        commitment: 'confirmed',
        timestamp: Date.now()
      }

      logTransactionDetails(result)

      expect(consoleSpy).toHaveBeenCalled()
      
      const allLogs = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n')
      expect(allLogs).toContain('TRANSACTION SUCCESSFUL')
      expect(allLogs).toContain(mockSignature)
      expect(allLogs).toContain('devnet')
      expect(allLogs).toContain('confirmed')
      expect(allLogs).toContain('Solana Explorer')
      expect(allLogs).toContain('Solscan')
      expect(allLogs).toContain('SolanaFM')
      expect(allLogs).toContain('XRAY')
    })

    it('should include emoji icons in log output', () => {
      const result = createTransactionResult(mockSignature, 'mainnet-beta')
      logTransactionDetails(result)

      const allLogs = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n')
      expect(allLogs).toContain('🎉')
      expect(allLogs).toContain('📝')
      expect(allLogs).toContain('🌐')
      expect(allLogs).toContain('⏰')
      expect(allLogs).toContain('🔒')
      expect(allLogs).toContain('🔗')
      expect(allLogs).toContain('🔍')
      expect(allLogs).toContain('📊')
      expect(allLogs).toContain('🎯')
      expect(allLogs).toContain('⚡')
    })
  })

  describe('createTransactionMarkdown', () => {
    it('should create markdown link with default text', () => {
      const markdown = createTransactionMarkdown(mockSignature, 'mainnet-beta')
      
      expect(markdown).toContain('[View Transaction')
      expect(markdown).toContain(mockSignature.slice(0, 8))
      expect(markdown).toContain('...]')
      expect(markdown).toContain('(https://explorer.solana.com/tx/')
    })

    it('should create markdown link with custom text', () => {
      const customText = 'Click here to view'
      const markdown = createTransactionMarkdown(mockSignature, 'devnet', customText)
      
      expect(markdown).toBe(`[${customText}](https://explorer.solana.com/tx/${mockSignature}?cluster=devnet)`)
    })

    it('should handle different clusters', () => {
      const clusters: SolanaCluster[] = ['mainnet-beta', 'devnet', 'testnet', 'localnet']
      
      clusters.forEach(cluster => {
        const markdown = createTransactionMarkdown(mockSignature, cluster)
        expect(markdown).toContain(`[View Transaction`)
        expect(markdown).toContain('](')
        
        if (cluster !== 'mainnet-beta') {
          expect(markdown).toContain('cluster=')
        }
      })
    })
  })

  describe('waitForTransactionConfirmation', () => {
    let consoleSpy: any

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log initial confirmation details', () => {
      // Start the wait but don't await (we'll cancel it)
      const promise = waitForTransactionConfirmation(mockSignature, 'devnet', 'confirmed', 30000)

      // Should log initial waiting message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Waiting for transaction confirmation'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`Signature: ${mockSignature}`))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cluster: devnet'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Commitment: confirmed'))

      // Don't actually wait for it to complete
      promise.catch(() => {}) // Suppress unhandled rejection
    })

    it('should timeout after specified duration', async () => {
      // Set a short timeout that will definitely fail
      const promise = waitForTransactionConfirmation(mockSignature, 'devnet', 'confirmed', 1000)

      await expect(promise).rejects.toThrow('Transaction confirmation timeout after 1000ms')
    })

    it('should accept different commitment levels', () => {
      const commitments = ['processed', 'confirmed', 'finalized'] as const

      commitments.forEach(commitment => {
        consoleSpy.mockClear()
        
        const promise = waitForTransactionConfirmation(mockSignature, 'mainnet-beta', commitment, 30000)
        
        const allLogs = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n')
        expect(allLogs).toContain(`Commitment: ${commitment}`)
        
        promise.catch(() => {}) // Suppress unhandled rejection
      })
    })

    it('should accept different timeout values', () => {
      const timeouts = [5000, 10000, 30000, 60000]

      timeouts.forEach(timeout => {
        consoleSpy.mockClear()
        
        const promise = waitForTransactionConfirmation(mockSignature, 'testnet', 'confirmed', timeout)
        
        // Verify it's tracking the timeout
        expect(promise).toBeDefined()
        
        promise.catch(() => {}) // Suppress unhandled rejection
      })
    })
  })

  describe('Edge cases and validation', () => {
    it('should handle very long signatures', () => {
      const longSignature = 'a'.repeat(88) as Signature
      const urls = generateExplorerUrls(longSignature)
      
      Object.values(urls).forEach(url => {
        expect(url).toContain(longSignature)
      })
    })

    it('should handle empty cluster string gracefully', () => {
      // TypeScript won't allow this, but testing runtime behavior
      const url = getSolanaExplorerUrl(mockSignature, '' as any)
      // Should default to mainnet behavior
      expect(url).toBe(`https://explorer.solana.com/tx/${mockSignature}`)
    })

    it('should create consistent timestamps', () => {
      const before = Date.now()
      const result = createTransactionResult(mockSignature, 'devnet')
      const after = Date.now()
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.timestamp).toBeLessThanOrEqual(after)
    })

    it('should handle special characters in signatures', () => {
      // Base58 signatures shouldn't have special chars, but testing defensive coding
      const specialSig = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp-_+=' as Signature
      const url = getSolanaExplorerUrl(specialSig)
      
      expect(url).toContain(specialSig)
    })
  })

  describe('URL format validation', () => {
    it('should generate valid HTTPS URLs', () => {
      const clusters: SolanaCluster[] = ['mainnet-beta', 'devnet', 'testnet']
      
      clusters.forEach(cluster => {
        const urls = generateExplorerUrls(mockSignature, cluster)
        
        // Skip localnet as it has special handling
        if (cluster !== 'localnet') {
          expect(urls.solanaExplorer).toMatch(/^https:\/\//)
          expect(urls.solscan).toMatch(/^https:\/\//)
          expect(urls.solanaFM).toMatch(/^https:\/\//)
          expect(urls.xray).toMatch(/^https:\/\//)
        }
      })
    })

    it('should include signature in all URLs', () => {
      const urls = generateExplorerUrls(mockSignature, 'devnet')
      
      Object.values(urls).forEach(url => {
        if (!url.startsWith('Local transaction')) {
          expect(url).toContain(mockSignature)
        }
      })
    })

    it('should use correct query parameter format', () => {
      const devnetUrls = generateExplorerUrls(mockSignature, 'devnet')
      
      expect(devnetUrls.solanaExplorer).toMatch(/\?cluster=devnet$/)
      expect(devnetUrls.solscan).toMatch(/\?cluster=devnet$/)
      expect(devnetUrls.solanaFM).toMatch(/\?cluster=devnet-solana$/)
      expect(devnetUrls.xray).toMatch(/\?network=devnet$/)
    })
  })
})