/**
 * ElGamal WASM-Optimized Engine Unit Tests
 * 
 * Tests the WASM-optimized ElGamal engine including:
 * - Engine initialization and configuration
 * - Automatic WASM detection and fallback
 * - Performance tracking and optimization
 * - Batch operations with speedup verification
 * - Browser compatibility integration
 * - Performance profiling and export
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WasmOptimizedElGamalEngine,
  getElGamalEngine,
  initializeElGamalEngine,
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  generateRangeProof,
  batchEncryptAmounts,
  batchGenerateRangeProofs,
  type ElGamalConfig
} from '../../../src/utils/elgamal-wasm-optimized.js'
import { mockWasmModule, mockBrowserEnvironment, mockPerformanceAPI } from '../../helpers/mocks'
import { setupTestEnvironment } from '../../helpers/setup'

describe('ElGamal WASM-Optimized Engine', () => {
  let engine: WasmOptimizedElGamalEngine

  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
    vi.resetModules()
    
    // Mock performance API
    global.performance = mockPerformanceAPI() as any
    
    // Mock browser compatibility
    vi.mock('../../../src/utils/browser-compatibility', () => ({
      initializeBrowserCompatibility: vi.fn().mockResolvedValue({
        getConfig: () => ({
          useWasm: true,
          useBatchOperations: true,
          useParallelProcessing: true,
          maxConcurrentOps: 4,
          preferredBatchSize: 10,
          useFallbacks: true,
          optimizationLevel: 'advanced'
        }),
        getCapabilities: () => mockBrowserEnvironment()
      }),
      getBrowserCompatibilityManager: vi.fn().mockReturnValue({
        getConfig: () => ({
          optimizationLevel: 'advanced'
        }),
        getCapabilities: () => mockBrowserEnvironment()
      })
    }))
    
    // Mock WASM crypto bridge
    vi.mock('../../../src/utils/wasm-crypto-bridge', () => ({
      initializeWasmCrypto: vi.fn().mockResolvedValue(true),
      generateElGamalKeypair: vi.fn().mockResolvedValue({
        publicKey: new Uint8Array(32).fill(1),
        secretKey: new Uint8Array(32).fill(2)
      }),
      encryptAmount: vi.fn().mockResolvedValue({
        commitment: { commitment: new Uint8Array(32).fill(3) },
        handle: { handle: new Uint8Array(32).fill(4) }
      }),
      batchEncryptAmounts: vi.fn().mockResolvedValue([
        {
          commitment: { commitment: new Uint8Array(32).fill(3) },
          handle: { handle: new Uint8Array(32).fill(4) }
        }
      ]),
      generateRangeProof: vi.fn().mockResolvedValue({
        proof: new Uint8Array(674).fill(0),
        commitment: new Uint8Array(32).fill(5)
      }),
      batchGenerateRangeProofs: vi.fn().mockResolvedValue([
        {
          proof: new Uint8Array(674).fill(0),
          commitment: new Uint8Array(32).fill(5)
        }
      ])
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Engine Configuration', () => {
    it('should create engine with default configuration', () => {
      engine = new WasmOptimizedElGamalEngine()
      expect(engine).toBeDefined()
    })

    it('should create engine with custom configuration', () => {
      const config: Partial<ElGamalConfig> = {
        forceImplementation: 'wasm',
        enableProfiling: false,
        preferredBatchSize: 20,
        maxConcurrentOps: 8,
        wasmTimeout: 10000
      }
      
      engine = new WasmOptimizedElGamalEngine(config)
      expect(engine).toBeDefined()
    })

    it('should update configuration based on browser capabilities', async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
      
      // Configuration should be updated from browser compatibility manager
      const perfData = engine.exportPerformanceData()
      expect(perfData.config.preferredBatchSize).toBe(10)
      expect(perfData.config.maxConcurrentOps).toBe(4)
    })
  })

  describe('Engine Initialization', () => {
    it('should initialize successfully with WASM available', async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
      
      // Should be initialized
      const perfData = engine.exportPerformanceData()
      expect(perfData.browserInfo).toBeDefined()
    })

    it('should initialize with WASM disabled when forced to JavaScript', async () => {
      engine = new WasmOptimizedElGamalEngine({ forceImplementation: 'javascript' })
      await engine.initialize()
      
      const { initializeWasmCrypto } = await import('../../../src/utils/wasm-crypto-bridge')
      expect(initializeWasmCrypto).not.toHaveBeenCalled()
    })

    it('should handle browser compatibility initialization failure', async () => {
      vi.mock('../../../src/utils/browser-compatibility', () => ({
        initializeBrowserCompatibility: vi.fn().mockRejectedValue(new Error('Browser error')),
        getBrowserCompatibilityManager: vi.fn().mockReturnValue({
          getConfig: () => null,
          getCapabilities: () => null
        })
      }))
      
      engine = new WasmOptimizedElGamalEngine()
      
      // Should not throw
      await expect(engine.initialize()).resolves.not.toThrow()
    })

    it('should only initialize once', async () => {
      engine = new WasmOptimizedElGamalEngine()
      
      await engine.initialize()
      await engine.initialize() // Second call
      
      const { initializeWasmCrypto } = await import('../../../src/utils/wasm-crypto-bridge')
      expect(initializeWasmCrypto).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keypair Generation', () => {
    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should generate keypair with WASM', async () => {
      const result = await engine.generateKeypair()
      
      expect(result.result.publicKey).toBeInstanceOf(Uint8Array)
      expect(result.result.publicKey).toHaveLength(32)
      expect(result.result.secretKey).toBeInstanceOf(Uint8Array)
      expect(result.result.secretKey).toHaveLength(32)
      
      expect(result.performance.usedWasm).toBe(true)
      expect(result.performance.implementation).toBe('wasm')
      expect(result.performance.optimizationLevel).toBe('advanced')
    })

    it('should fallback to JavaScript on WASM failure', async () => {
      const wasmModule = await import('../../../src/utils/wasm-crypto-bridge')
      wasmModule.generateElGamalKeypair = vi.fn().mockRejectedValue(new Error('WASM error'))
      
      const result = await engine.generateKeypair()
      
      expect(result.result).toBeDefined()
      expect(result.performance.usedWasm).toBe(false)
      expect(result.performance.implementation).toBe('javascript')
    })

    it('should use seed when provided', async () => {
      const seed = new Uint8Array(32).fill(42)
      const result = await engine.generateKeypair(seed)
      
      expect(result.result).toBeDefined()
    })

    it('should record performance metrics', async () => {
      const result = await engine.generateKeypair()
      
      expect(result.performance.timeMs).toBeGreaterThanOrEqual(0)
      
      const stats = engine.getPerformanceStats()
      expect(stats.totalOperations).toBeGreaterThan(0)
    })
  })

  describe('Encryption Operations', () => {
    const testAmount = BigInt(1000000)
    const testPublicKey = new Uint8Array(32).fill(1)
    const testRandomness = new Uint8Array(32).fill(2)

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should encrypt amount with WASM', async () => {
      const result = await engine.encryptAmount(testAmount, testPublicKey, testRandomness)
      
      expect(result.result.commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(result.result.handle.handle).toBeInstanceOf(Uint8Array)
      expect(result.performance.usedWasm).toBe(true)
      expect(result.performance.implementation).toBe('wasm')
    })

    it('should handle encryption without randomness', async () => {
      const result = await engine.encryptAmount(testAmount, testPublicKey)
      
      expect(result.result).toBeDefined()
      expect(result.performance.usedWasm).toBe(true)
    })

    it('should fallback to JavaScript on WASM failure', async () => {
      const wasmModule = await import('../../../src/utils/wasm-crypto-bridge')
      wasmModule.encryptAmount = vi.fn().mockRejectedValue(new Error('WASM error'))
      
      const result = await engine.encryptAmount(testAmount, testPublicKey)
      
      expect(result.result).toBeDefined()
      expect(result.performance.usedWasm).toBe(false)
      expect(result.performance.implementation).toBe('javascript')
    })

    it('should respect forceImplementation setting', async () => {
      engine = new WasmOptimizedElGamalEngine({ forceImplementation: 'javascript' })
      await engine.initialize()
      
      const result = await engine.encryptAmount(testAmount, testPublicKey)
      
      expect(result.performance.implementation).toBe('javascript')
    })
  })

  describe('Batch Encryption', () => {
    const testAmounts = [BigInt(100), BigInt(200), BigInt(300), BigInt(400), BigInt(500)]
    const testPublicKey = new Uint8Array(32).fill(1)

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should batch encrypt with WASM optimization', async () => {
      const result = await engine.encryptAmountsBatch(testAmounts, testPublicKey)
      
      expect(result.result).toHaveLength(testAmounts.length)
      expect(result.performance.usedWasm).toBe(true)
      expect(result.performance.implementation).toBe('wasm')
      
      expect(result.batchMetrics.batchSize).toBe(testAmounts.length)
      expect(result.batchMetrics.avgTimePerItem).toBeGreaterThanOrEqual(0)
      expect(result.batchMetrics.speedupFactor).toBeGreaterThan(1)
      expect(result.batchMetrics.memoryEfficiency).toBe(85) // WASM efficiency
    })

    it('should use sequential encryption for small batches', async () => {
      engine = new WasmOptimizedElGamalEngine({ preferredBatchSize: 10 })
      await engine.initialize()
      
      const smallBatch = [BigInt(100)]
      const result = await engine.encryptAmountsBatch(smallBatch, testPublicKey)
      
      expect(result.result).toHaveLength(1)
      // May still use WASM but not batch operation
    })

    it('should calculate correct speedup factor', async () => {
      const result = await engine.encryptAmountsBatch(testAmounts, testPublicKey)
      
      // Speedup should be calculated based on batch size
      const expectedSpeedup = Math.min(testAmounts.length * 0.8, 8)
      expect(result.batchMetrics.speedupFactor).toBe(expectedSpeedup)
    })

    it('should handle batch encryption failure gracefully', async () => {
      const wasmModule = await import('../../../src/utils/wasm-crypto-bridge')
      wasmModule.batchEncryptAmounts = vi.fn().mockRejectedValue(new Error('Batch failed'))
      
      const result = await engine.encryptAmountsBatch(testAmounts, testPublicKey)
      
      expect(result.result).toHaveLength(testAmounts.length)
      expect(result.performance.implementation).toBe('javascript')
      expect(result.batchMetrics.memoryEfficiency).toBe(60) // JS efficiency
    })
  })

  describe('Decryption Operations', () => {
    const testCiphertext = {
      commitment: { commitment: new Uint8Array(32).fill(3) },
      handle: { handle: new Uint8Array(32).fill(4) }
    }
    const testSecretKey = new Uint8Array(32).fill(2)

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should decrypt amount using JavaScript', async () => {
      const result = await engine.decryptAmount(testCiphertext, testSecretKey)
      
      expect(result.performance.usedWasm).toBe(false)
      expect(result.performance.implementation).toBe('javascript')
      // Result may be null if amount is too large
    })

    it('should record decryption performance', async () => {
      await engine.decryptAmount(testCiphertext, testSecretKey)
      
      const stats = engine.getPerformanceStats()
      const breakdown = stats.operationBreakdown['decryption']
      
      expect(breakdown).toBeDefined()
      expect(breakdown.count).toBe(1)
      expect(breakdown.wasmUsage).toBe(0) // No WASM for decryption yet
    })
  })

  describe('Range Proof Generation', () => {
    const testAmount = BigInt(1000)
    const testCommitment = { commitment: new Uint8Array(32).fill(3) }
    const testBlindingFactor = new Uint8Array(32).fill(4)

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should generate range proof with WASM', async () => {
      const result = await engine.generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      
      expect(result.result.proof).toBeInstanceOf(Uint8Array)
      expect(result.result.proof).toHaveLength(674)
      expect(result.performance.usedWasm).toBe(true)
      expect(result.performance.implementation).toBe('wasm')
    })

    it('should warn about slow range proof generation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock slow performance
      const perfMock = mockPerformanceAPI()
      perfMock.now = vi.fn()
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(60) // 60ms > 50ms target
      
      global.performance = perfMock as any
      
      await engine.generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Range proof generation took 60.00ms (target: <50ms)')
      )
    })

    it('should disable warning when profiling is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      engine = new WasmOptimizedElGamalEngine({ enableProfiling: false })
      await engine.initialize()
      
      // Mock slow performance
      const perfMock = mockPerformanceAPI()
      perfMock.now = vi.fn()
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(60)
      
      global.performance = perfMock as any
      
      await engine.generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('Batch Range Proof Generation', () => {
    const proofRequests = Array(5).fill(null).map((_, i) => ({
      amount: BigInt(100 * (i + 1)),
      commitment: { commitment: new Uint8Array(32).fill(i + 1) },
      blindingFactor: new Uint8Array(32).fill(i + 10)
    }))

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should batch generate range proofs with WASM', async () => {
      const result = await engine.generateRangeProofsBatch(proofRequests)
      
      expect(result.result).toHaveLength(proofRequests.length)
      expect(result.performance.usedWasm).toBe(true)
      
      expect(result.batchMetrics.batchSize).toBe(proofRequests.length)
      expect(result.batchMetrics.speedupFactor).toBeGreaterThan(1)
      expect(result.batchMetrics.memoryEfficiency).toBe(90) // WASM efficiency for proofs
    })

    it('should calculate higher speedup for range proofs', async () => {
      const result = await engine.generateRangeProofsBatch(proofRequests)
      
      // Range proofs show more speedup than encryption
      const expectedSpeedup = Math.min(proofRequests.length * 1.5, 10)
      expect(result.batchMetrics.speedupFactor).toBe(expectedSpeedup)
    })
  })

  describe('Transfer Proof Generation', () => {
    const sourceBalance = {
      commitment: { commitment: new Uint8Array(32).fill(10) },
      handle: { handle: new Uint8Array(32).fill(11) }
    }
    const amount = BigInt(500)
    const sourceKeypair = {
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(32).fill(2)
    }
    const destPubkey = new Uint8Array(32).fill(3)

    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should generate transfer proof using JavaScript', async () => {
      const result = await engine.generateTransferProof(
        sourceBalance,
        amount,
        sourceKeypair,
        destPubkey
      )
      
      expect(result.result.transferProof).toBeDefined()
      expect(result.result.newSourceBalance).toBeDefined()
      expect(result.result.destCiphertext).toBeDefined()
      
      expect(result.performance.usedWasm).toBe(false)
      expect(result.performance.implementation).toBe('javascript')
    })
  })

  describe('Performance Statistics', () => {
    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should track performance statistics', async () => {
      // Perform various operations
      await engine.generateKeypair()
      await engine.encryptAmount(BigInt(100), new Uint8Array(32))
      await engine.encryptAmount(BigInt(200), new Uint8Array(32))
      
      const stats = engine.getPerformanceStats()
      
      expect(stats.totalOperations).toBe(3)
      expect(stats.wasmOperations).toBe(3)
      expect(stats.jsOperations).toBe(0)
      expect(stats.averageWasmTime).toBeGreaterThan(0)
      expect(stats.operationBreakdown).toBeDefined()
    })

    it('should calculate operation breakdown correctly', async () => {
      await engine.generateKeypair()
      await engine.encryptAmount(BigInt(100), new Uint8Array(32))
      await engine.encryptAmount(BigInt(200), new Uint8Array(32))
      
      const stats = engine.getPerformanceStats()
      
      expect(stats.operationBreakdown['keypair_generation'].count).toBe(1)
      expect(stats.operationBreakdown['encryption'].count).toBe(2)
      expect(stats.operationBreakdown['encryption'].wasmUsage).toBe(1) // 100% WASM
    })

    it('should calculate speedup factor', async () => {
      // Force some operations to use JS
      const wasmModule = await import('../../../src/utils/wasm-crypto-bridge')
      let useWasm = true
      wasmModule.encryptAmount = vi.fn().mockImplementation(async () => {
        if (useWasm) {
          useWasm = false
          throw new Error('Force JS fallback')
        }
        return {
          commitment: { commitment: new Uint8Array(32) },
          handle: { handle: new Uint8Array(32) }
        }
      })
      
      await engine.encryptAmount(BigInt(100), new Uint8Array(32)) // Falls back to JS
      await engine.encryptAmount(BigInt(200), new Uint8Array(32)) // Uses WASM
      
      const stats = engine.getPerformanceStats()
      
      expect(stats.jsOperations).toBe(1)
      expect(stats.wasmOperations).toBe(1)
      expect(stats.wasmSpeedup).toBeGreaterThan(0)
    })

    it('should clear performance history', async () => {
      await engine.generateKeypair()
      
      let stats = engine.getPerformanceStats()
      expect(stats.totalOperations).toBe(1)
      
      engine.clearPerformanceHistory()
      
      stats = engine.getPerformanceStats()
      expect(stats.totalOperations).toBe(0)
    })

    it('should limit performance history size', async () => {
      // Perform more than 1000 operations
      for (let i = 0; i < 1010; i++) {
        await engine.encryptAmount(BigInt(i), new Uint8Array(32))
      }
      
      const stats = engine.getPerformanceStats()
      expect(stats.totalOperations).toBe(1000) // Limited to last 1000
    })
  })

  describe('Performance Data Export', () => {
    beforeEach(async () => {
      engine = new WasmOptimizedElGamalEngine()
      await engine.initialize()
    })

    it('should export performance data', async () => {
      await engine.generateKeypair()
      await engine.encryptAmount(BigInt(100), new Uint8Array(32))
      
      const data = engine.exportPerformanceData()
      
      expect(data.config).toBeDefined()
      expect(data.browserInfo).toBeDefined()
      expect(data.performanceHistory).toHaveLength(2)
      expect(data.stats).toBeDefined()
      expect(data.stats.totalOperations).toBe(2)
    })

    it('should include browser capabilities in export', () => {
      const data = engine.exportPerformanceData()
      
      expect(data.browserInfo?.webAssembly).toBe(true)
      expect(data.browserInfo?.performanceScore).toBe(85)
      expect(data.browserInfo?.browser.name).toBe('Chrome')
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same engine instance', () => {
      const engine1 = getElGamalEngine()
      const engine2 = getElGamalEngine()
      
      expect(engine1).toBe(engine2)
    })

    it('should initialize singleton engine', async () => {
      const engine = await initializeElGamalEngine()
      
      expect(engine).toBeDefined()
      expect(getElGamalEngine()).toBe(engine)
    })

    it('should use config only on first creation', () => {
      const engine1 = getElGamalEngine({ preferredBatchSize: 20 })
      const engine2 = getElGamalEngine({ preferredBatchSize: 30 }) // Ignored
      
      expect(engine1).toBe(engine2)
    })
  })

  describe('Convenience Functions', () => {
    it('should generate keypair using convenience function', async () => {
      const keypair = await generateElGamalKeypair()
      
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
    })

    it('should encrypt amount using convenience function', async () => {
      const ciphertext = await encryptAmount(
        BigInt(1000),
        new Uint8Array(32).fill(1)
      )
      
      expect(ciphertext.commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(ciphertext.handle.handle).toBeInstanceOf(Uint8Array)
    })

    it('should decrypt amount using convenience function', async () => {
      const ciphertext = {
        commitment: { commitment: new Uint8Array(32).fill(3) },
        handle: { handle: new Uint8Array(32).fill(4) }
      }
      
      const result = await decryptAmount(ciphertext, new Uint8Array(32).fill(2))
      
      // Result may be null if decryption fails
      expect(result === null || typeof result === 'bigint').toBe(true)
    })

    it('should generate range proof using convenience function', async () => {
      const proof = await generateRangeProof(
        BigInt(1000),
        { commitment: new Uint8Array(32).fill(3) },
        new Uint8Array(32).fill(4)
      )
      
      expect(proof.proof).toBeInstanceOf(Uint8Array)
      expect(proof.proof).toHaveLength(674)
    })

    it('should batch encrypt using convenience function', async () => {
      const ciphertexts = await batchEncryptAmounts(
        [BigInt(100), BigInt(200)],
        new Uint8Array(32).fill(1)
      )
      
      expect(ciphertexts).toHaveLength(2)
    })

    it('should batch generate range proofs using convenience function', async () => {
      const proofs = await batchGenerateRangeProofs([
        {
          amount: BigInt(100),
          commitment: { commitment: new Uint8Array(32).fill(1) },
          blindingFactor: new Uint8Array(32).fill(2)
        }
      ])
      
      expect(proofs).toHaveLength(1)
      expect(proofs[0].proof).toHaveLength(674)
    })
  })

  describe('Auto-detection and Optimization', () => {
    it('should use WASM for operations that benefit from it', async () => {
      engine = new WasmOptimizedElGamalEngine({ forceImplementation: 'auto' })
      await engine.initialize()
      
      const encryptResult = await engine.encryptAmount(BigInt(100), new Uint8Array(32))
      const rangeProofResult = await engine.generateRangeProof(
        BigInt(100),
        { commitment: new Uint8Array(32) },
        new Uint8Array(32)
      )
      
      expect(encryptResult.performance.usedWasm).toBe(true)
      expect(rangeProofResult.performance.usedWasm).toBe(true)
    })

    it('should respect preferredBatchSize configuration', async () => {
      engine = new WasmOptimizedElGamalEngine({ preferredBatchSize: 4 })
      await engine.initialize()
      
      // Batch of 2 is below preferred size / 2
      const smallBatch = [BigInt(100), BigInt(200)]
      const result = await engine.encryptAmountsBatch(smallBatch, new Uint8Array(32))
      
      expect(result.result).toHaveLength(2)
    })
  })
})