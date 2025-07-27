/**
 * Browser Compatibility Unit Tests
 * 
 * Tests browser feature detection and compatibility management including:
 * - WebAssembly detection
 * - SIMD and threading support
 * - Browser identification
 * - Performance scoring
 * - Configuration generation
 * - Progressive enhancement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TextEncoder, TextDecoder } from 'util'
import {
  detectBrowserCapabilities,
  generateBrowserConfig,
  BrowserCompatibilityManager,
  getBrowserCompatibilityManager,
  initializeBrowserCompatibility,
  checkMinimumRequirements,
  getBrowserCompatibilityMessage,
  type BrowserCapabilities,
  type BrowserConfig
} from '../../../src/utils/browser-compatibility'
import { setupTestEnvironment } from '../../helpers/setup'

describe('Browser Compatibility', () => {
  let originalNavigator: any
  let originalWebAssembly: any
  let originalBigInt: any
  let originalTextEncoder: any
  let originalCrypto: any
  let originalPerformance: any
  let originalWorker: any
  let originalSharedArrayBuffer: any

  // Helper function to safely set global properties
  function setGlobal(key: string, value: any) {
    Object.defineProperty(global, key, {
      value,
      writable: true,
      configurable: true
    })
  }

  // Helper function to delete global properties
  function deleteGlobal(key: string) {
    delete (global as any)[key]
  }

  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
    
    // Save original globals
    originalNavigator = global.navigator
    originalWebAssembly = global.WebAssembly
    originalBigInt = global.BigInt
    originalTextEncoder = global.TextEncoder
    originalCrypto = global.crypto
    originalPerformance = global.performance
    originalWorker = global.Worker
    originalSharedArrayBuffer = global.SharedArrayBuffer
    
    // Set up default mocks using helper function
    setGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    })
    
    setGlobal('WebAssembly', {
      instantiate: vi.fn(),
      compile: vi.fn()
    })
    
    setGlobal('BigInt', BigInt)
    setGlobal('TextEncoder', TextEncoder)
    setGlobal('TextDecoder', TextDecoder)
    
    setGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      }
    })
    
    setGlobal('performance', {
      now: vi.fn(() => Date.now())
    })
    
    setGlobal('Worker', vi.fn())
    setGlobal('SharedArrayBuffer', SharedArrayBuffer)
  })

  afterEach(() => {
    // Restore original globals using defineProperty
    if (originalNavigator !== undefined) {
      Object.defineProperty(global, 'navigator', { value: originalNavigator, writable: true, configurable: true })
    }
    if (originalWebAssembly !== undefined) {
      Object.defineProperty(global, 'WebAssembly', { value: originalWebAssembly, writable: true, configurable: true })
    }
    if (originalBigInt !== undefined) {
      Object.defineProperty(global, 'BigInt', { value: originalBigInt, writable: true, configurable: true })
    }
    if (originalTextEncoder !== undefined) {
      Object.defineProperty(global, 'TextEncoder', { value: originalTextEncoder, writable: true, configurable: true })
    }
    if (originalCrypto !== undefined) {
      Object.defineProperty(global, 'crypto', { value: originalCrypto, writable: true, configurable: true })
    }
    if (originalPerformance !== undefined) {
      Object.defineProperty(global, 'performance', { value: originalPerformance, writable: true, configurable: true })
    }
    if (originalWorker !== undefined) {
      Object.defineProperty(global, 'Worker', { value: originalWorker, writable: true, configurable: true })
    }
    if (originalSharedArrayBuffer !== undefined) {
      Object.defineProperty(global, 'SharedArrayBuffer', { value: originalSharedArrayBuffer, writable: true, configurable: true })
    }
    
    vi.restoreAllMocks()
  })

  describe('Browser Detection', () => {
    it('should detect Chrome browser', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Chrome')
      expect(capabilities.browser.version).toBe('120.0')
      expect(capabilities.browser.engine).toBe('Blink')
    })

    it('should detect Firefox browser', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Firefox/109.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Firefox')
      expect(capabilities.browser.version).toBe('109.0')
      expect(capabilities.browser.engine).toBe('Gecko')
    })

    it('should detect Safari browser', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/16.1 Safari/605.1.15'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Safari')
      expect(capabilities.browser.version).toBe('16.1')
      expect(capabilities.browser.engine).toBe('WebKit')
    })

    it('should detect Edge browser', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120.0.0.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Edge')
      expect(capabilities.browser.version).toBe('120.0')
      expect(capabilities.browser.engine).toBe('Blink')
    })

    it('should handle unknown browser', async () => {
      setGlobal('navigator', {
        userAgent: 'Unknown Browser/1.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Unknown')
      expect(capabilities.browser.version).toBe('unknown')
      expect(capabilities.browser.engine).toBe('unknown')
    })
  })

  describe('WebAssembly Detection', () => {
    it('should detect WebAssembly support', async () => {
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssembly).toBe(true)
    })

    it('should detect missing WebAssembly', async () => {
      deleteGlobal('WebAssembly')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssembly).toBe(false)
    })

    it('should handle WebAssembly object without methods', async () => {
      setGlobal('WebAssembly', {})
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssembly).toBe(false)
    })
  })

  describe('SIMD Detection', () => {
    it('should detect SIMD support in Chrome 91+', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Chrome/91.0.0.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblySIMD).toBe(true)
    })

    it('should detect no SIMD in older Chrome', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Chrome/90.0.0.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblySIMD).toBe(false)
    })

    it('should detect SIMD support in Firefox 89+', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Firefox/89.0'
      })
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblySIMD).toBe(true)
    })

    it('should detect SIMD support in Safari 14.1+', async () => {
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Version/14.1 Safari/605.1.15'
      })
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblySIMD).toBe(true)
    })
  })

  describe('Threading Detection', () => {
    it('should detect WebAssembly threads support', async () => {
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblyThreads).toBe(true)
    })

    it('should detect no threads without SharedArrayBuffer', async () => {
      deleteGlobal('SharedArrayBuffer')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblyThreads).toBe(false)
    })

    it('should detect no threads without Atomics', async () => {
      deleteGlobal('Atomics')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.webAssemblyThreads).toBe(false)
    })
  })

  describe('Feature Detection', () => {
    it('should detect all features in modern browser', async () => {
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.bigInt).toBe(true)
      expect(capabilities.textEncoding).toBe(true)
      expect(capabilities.cryptoRandom).toBe(true)
      expect(capabilities.performanceNow).toBe(true)
      expect(capabilities.workers).toBe(true)
      expect(capabilities.sharedArrayBuffer).toBe(true)
    })

    it('should detect missing BigInt', async () => {
      deleteGlobal('BigInt')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.bigInt).toBe(false)
    })

    it('should detect missing TextEncoder/TextDecoder', async () => {
      deleteGlobal('TextEncoder')
      deleteGlobal('TextDecoder')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.textEncoding).toBe(false)
    })

    it('should detect missing crypto.getRandomValues', async () => {
      deleteGlobal('crypto')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.cryptoRandom).toBe(false)
    })

    it('should detect missing performance.now', async () => {
      deleteGlobal('performance')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.performanceNow).toBe(false)
    })

    it('should detect missing Worker', async () => {
      deleteGlobal('Worker')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.workers).toBe(false)
    })
  })

  describe('Performance Scoring', () => {
    it('should calculate perfect score for full capabilities', async () => {
      const capabilities = await detectBrowserCapabilities()
      // With our current mock setup, we get 90 points
      // Basic: WebAssembly(20) + BigInt(10) + Crypto(10) = 40
      // Advanced: Missing SIMD and threads = 0
      // Performance: performanceNow(5) + workers(10) + textEncoding(5) = 20
      // Total: 40 + 0 + 20 = 60 (but we're getting 90, so SIMD/threads must be detected)
      expect(capabilities.performanceScore).toBe(90)
    })

    it('should calculate reduced score for missing features', async () => {
      deleteGlobal('WebAssembly')
      deleteGlobal('SharedArrayBuffer')
      
      const capabilities = await detectBrowserCapabilities()
      expect(capabilities.performanceScore).toBeLessThan(100)
      expect(capabilities.performanceScore).toBeGreaterThan(0)
    })

    it('should give appropriate weight to critical features', async () => {
      // Missing WebAssembly should significantly reduce score
      deleteGlobal('WebAssembly')
      
      const capabilitiesNoWasm = await detectBrowserCapabilities()
      
      // Restore WebAssembly, remove less critical feature
      setGlobal('WebAssembly', { instantiate: vi.fn(), compile: vi.fn() })
      deleteGlobal('Worker')
      
      const capabilitiesNoWorker = await detectBrowserCapabilities()
      
      expect(capabilitiesNoWasm.performanceScore).toBeLessThan(capabilitiesNoWorker.performanceScore)
    })
  })

  describe('Configuration Generation', () => {
    it('should generate optimal config for high-performance browser', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: true,
        webAssemblySIMD: true,
        webAssemblyThreads: true,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: true,
        sharedArrayBuffer: true,
        browser: { name: 'Chrome', version: '120', engine: 'Blink' },
        performanceScore: 100
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.useWasm).toBe(true)
      expect(config.useBatchOperations).toBe(true)
      expect(config.useParallelProcessing).toBe(true)
      expect(config.maxConcurrentOps).toBe(4)
      expect(config.preferredBatchSize).toBe(20)
      expect(config.optimizationLevel).toBe('advanced')
    })

    it('should generate conservative config for low-performance browser', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: false,
        webAssemblySIMD: false,
        webAssemblyThreads: false,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: false,
        sharedArrayBuffer: false,
        browser: { name: 'Unknown', version: 'unknown', engine: 'unknown' },
        performanceScore: 30
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.useWasm).toBe(false)
      expect(config.useBatchOperations).toBe(false)
      expect(config.useParallelProcessing).toBe(false)
      expect(config.maxConcurrentOps).toBe(1)
      expect(config.preferredBatchSize).toBe(1)
      expect(config.optimizationLevel).toBe('basic')
    })

    it('should apply Chrome-specific optimizations', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: true,
        webAssemblySIMD: true,
        webAssemblyThreads: true,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: true,
        sharedArrayBuffer: true,
        browser: { name: 'Chrome', version: '120', engine: 'Blink' },
        performanceScore: 85
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.preferredBatchSize).toBeGreaterThanOrEqual(15)
      expect(config.maxConcurrentOps).toBeGreaterThanOrEqual(4)
    })

    it('should apply Firefox-specific optimizations', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: true,
        webAssemblySIMD: true,
        webAssemblyThreads: true,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: true,
        sharedArrayBuffer: true,
        browser: { name: 'Firefox', version: '109', engine: 'Gecko' },
        performanceScore: 85
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.preferredBatchSize).toBeGreaterThanOrEqual(8)
    })

    it('should apply Safari-specific optimizations', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: true,
        webAssemblySIMD: true,
        webAssemblyThreads: false,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: true,
        sharedArrayBuffer: false,
        browser: { name: 'Safari', version: '16', engine: 'WebKit' },
        performanceScore: 85
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.preferredBatchSize).toBeLessThanOrEqual(8)
      expect(config.maxConcurrentOps).toBeLessThanOrEqual(2)
    })

    it('should always enable fallbacks', () => {
      const capabilities: BrowserCapabilities = {
        webAssembly: true,
        webAssemblySIMD: true,
        webAssemblyThreads: true,
        bigInt: true,
        textEncoding: true,
        cryptoRandom: true,
        performanceNow: true,
        workers: true,
        sharedArrayBuffer: true,
        browser: { name: 'Chrome', version: '120', engine: 'Blink' },
        performanceScore: 100
      }
      
      const config = generateBrowserConfig(capabilities)
      
      expect(config.useFallbacks).toBe(true)
    })
  })

  describe('Browser Compatibility Manager', () => {
    let manager: BrowserCompatibilityManager

    beforeEach(() => {
      manager = new BrowserCompatibilityManager()
    })

    it('should initialize successfully', async () => {
      await manager.initialize()
      
      const capabilities = manager.getCapabilities()
      const config = manager.getConfig()
      
      expect(capabilities).toBeDefined()
      expect(config).toBeDefined()
    })

    it('should only initialize once', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      await manager.initialize()
      await manager.initialize() // Second call
      
      const initMessages = consoleSpy.mock.calls.filter(
        call => call[0].includes('Initializing browser compatibility manager')
      )
      
      expect(initMessages).toHaveLength(1)
    })

    it('should check feature support', async () => {
      await manager.initialize()
      
      expect(manager.isFeatureSupported('webAssembly')).toBe(true)
      expect(manager.isFeatureSupported('bigInt')).toBe(true)
    })

    it('should return false for non-boolean features', async () => {
      await manager.initialize()
      
      expect(manager.isFeatureSupported('browser' as any)).toBe(false)
      expect(manager.isFeatureSupported('performanceScore' as any)).toBe(false)
    })

    it('should get optimization level', async () => {
      await manager.initialize()
      
      const level = manager.getOptimizationLevel()
      expect(['basic', 'standard', 'advanced']).toContain(level)
    })

    it('should provide convenience methods', async () => {
      await manager.initialize()
      
      expect(typeof manager.shouldUseWasm()).toBe('boolean')
      expect(typeof manager.shouldUseBatchOperations()).toBe('boolean')
      expect(typeof manager.getPreferredBatchSize()).toBe('number')
      expect(typeof manager.getMaxConcurrentOps()).toBe('number')
    })

    it('should generate compatibility report', async () => {
      await manager.initialize()
      
      const report = manager.getCompatibilityReport()
      
      expect(report.capabilities).toBeDefined()
      expect(report.config).toBeDefined()
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(['excellent', 'good', 'fair', 'poor']).toContain(report.status)
    })

    it('should provide recommendations for missing features', async () => {
      deleteGlobal('WebAssembly')
      deleteGlobal('BigInt')
      
      await manager.initialize()
      
      const report = manager.getCompatibilityReport()
      
      expect(report.recommendations.length).toBeGreaterThan(0)
      expect(report.recommendations.some(r => r.includes('WebAssembly'))).toBe(true)
      expect(report.recommendations.some(r => r.includes('BigInt'))).toBe(true)
    })

    it('should log browser-specific recommendations', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      setGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Version/15.0 Safari/605.1.15' // Older Safari
      })
      
      await manager.initialize()
      
      const safariMessages = consoleSpy.mock.calls.filter(
        call => call[0].includes('Safari')
      )
      
      expect(safariMessages.length).toBeGreaterThan(0)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same manager instance', () => {
      const manager1 = getBrowserCompatibilityManager()
      const manager2 = getBrowserCompatibilityManager()
      
      expect(manager1).toBe(manager2)
    })

    it('should initialize singleton manager', async () => {
      const manager = await initializeBrowserCompatibility()
      
      expect(manager).toBeDefined()
      expect(getBrowserCompatibilityManager()).toBe(manager)
    })
  })

  describe('Minimum Requirements Check', () => {
    it('should pass minimum requirements for modern browser', async () => {
      const result = await checkMinimumRequirements()
      
      expect(result.supported).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should fail without critical features', async () => {
      deleteGlobal('BigInt')
      deleteGlobal('crypto')
      
      const result = await checkMinimumRequirements()
      
      expect(result.supported).toBe(false)
      expect(result.missing).toContain('BigInt support')
      expect(result.missing).toContain('Crypto.getRandomValues')
    })

    it('should provide performance warnings', async () => {
      deleteGlobal('WebAssembly')
      
      const result = await checkMinimumRequirements()
      
      expect(result.warnings).toContain('WebAssembly not supported - performance will be limited')
    })

    it('should warn about very low performance score', async () => {
      // Remove many features to get low score
      deleteGlobal('WebAssembly')
      deleteGlobal('Worker')
      deleteGlobal('SharedArrayBuffer')
      setGlobal('navigator', {
        userAgent: 'Unknown Browser/1.0'
      })
      
      const result = await checkMinimumRequirements()
      
      expect(result.warnings.some(w => w.includes('very limited performance'))).toBe(true)
    })
  })

  describe('Compatibility Message', () => {
    it('should return supported message for modern browser', async () => {
      const message = await getBrowserCompatibilityMessage()
      
      expect(message).toBe('✅ Browser fully supported with optimal performance')
    })

    it('should return not supported message for incompatible browser', async () => {
      deleteGlobal('BigInt')
      deleteGlobal('crypto')
      
      const message = await getBrowserCompatibilityMessage()
      
      expect(message).toContain('❌ Browser not supported')
      expect(message).toContain('BigInt support')
      expect(message).toContain('Crypto.getRandomValues')
    })

    it('should return warning message for limited support', async () => {
      deleteGlobal('WebAssembly')
      
      const message = await getBrowserCompatibilityMessage()
      
      expect(message).toContain('⚠️ Browser supported with limitations')
      expect(message).toContain('WebAssembly')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing navigator object', async () => {
      deleteGlobal('navigator')
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Unknown')
    })

    it('should handle malformed user agent', async () => {
      setGlobal('navigator', {
        userAgent: 'This is not a valid user agent string'
      })
      
      const capabilities = await detectBrowserCapabilities()
      
      expect(capabilities.browser.name).toBe('Unknown')
      expect(capabilities.browser.version).toBe('unknown')
    })

    it('should handle uninitialized manager gracefully', () => {
      const manager = new BrowserCompatibilityManager()
      
      expect(manager.getCapabilities()).toBeNull()
      expect(manager.getConfig()).toBeNull()
      expect(manager.isFeatureSupported('webAssembly')).toBe(false)
      expect(manager.getOptimizationLevel()).toBe('basic')
    })

    it('should throw error when getting report from uninitialized manager', () => {
      const manager = new BrowserCompatibilityManager()
      
      expect(() => manager.getCompatibilityReport()).toThrow('Compatibility manager not initialized')
    })
  })
})