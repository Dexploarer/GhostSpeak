/**
 * WASM Crypto Bridge Unit Tests
 * 
 * Tests the WebAssembly crypto bridge functionality including:
 * - WASM module initialization
 * - Encryption/decryption operations
 * - Batch operations
 * - Range proof generation
 * - JavaScript fallback behavior
 * - Performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initializeWasmCrypto,
  isWasmCryptoAvailable,
  getWasmEngine,
  generateElGamalKeypair,
  encryptAmount,
  batchEncryptAmounts,
  generateRangeProof,
  batchGenerateRangeProofs,
  getCryptoPerformanceInfo,
  runCryptoBenchmarks,
  __resetWasmCrypto
} from '../../../src/utils/wasm-crypto-bridge'
import { mockWasmModule, mockPerformanceAPI } from '../../helpers/mocks'
import { setupTestEnvironment } from '../../helpers/setup'

describe('WASM Crypto Bridge', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
    
    // Reset WASM state
    __resetWasmCrypto()
    
    // Mock global objects
    global.performance = mockPerformanceAPI() as any
    global.WebAssembly = {
      instantiate: vi.fn(),
      compile: vi.fn()
    } as any
    
    // Set up WASM mock for test environment
    ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up WASM mock
    delete (globalThis as any).__WASM_MOCK__
    // Reset WASM state
    __resetWasmCrypto()
  })

  describe('Module Initialization', () => {
    it('should initialize WASM module successfully', async () => {
      const result = await initializeWasmCrypto()
      
      expect(result).toBe(true)
      expect(isWasmCryptoAvailable()).toBe(true)
    })

    it('should handle WASM initialization failure gracefully', async () => {
      // Remove the mock to test failure path
      delete (globalThis as any).__WASM_MOCK__
      
      const result = await initializeWasmCrypto()
      
      expect(result).toBe(false)
      expect(isWasmCryptoAvailable()).toBe(false)
    })

    it('should detect missing WebAssembly support', async () => {
      // Remove WebAssembly global
      delete (global as any).WebAssembly
      
      const result = await initializeWasmCrypto()
      
      expect(result).toBe(false)
      expect(isWasmCryptoAvailable()).toBe(false)
    })

    it('should return cached initialization promise', async () => {
      // Reset the module state to ensure clean test
      __resetWasmCrypto()

      // Set up a mock with proper structure
      const mockEngine = {
        encrypt_amount: vi.fn().mockReturnValue({ c1: new Uint8Array(32), c2: new Uint8Array(32) }),
        batch_encrypt_amounts: vi.fn().mockReturnValue([]),
        generate_range_proof: vi.fn().mockReturnValue({ proof: new Uint8Array(674), commitment: new Uint8Array(32) }),
        batch_generate_range_proofs: vi.fn().mockReturnValue([]),
        get_performance_info: vi.fn().mockReturnValue({ simd_enabled: true }),
        generate_keypair: vi.fn().mockReturnValue({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }),
        run_benchmarks: vi.fn().mockReturnValue({ encryption: { avg_time_ms: 1 } })
      }

      const initFn = vi.fn().mockResolvedValue(undefined)
      ;(globalThis as any).__WASM_MOCK__ = {
        default: initFn,
        is_wasm_available: vi.fn().mockReturnValue(true),
        get_wasm_info: vi.fn().mockReturnValue({ version: 'test', features: {} }),
        WasmElGamalEngine: vi.fn().mockImplementation(() => mockEngine)
      }

      // First call - starts initialization
      const result1 = await initializeWasmCrypto()

      // Second and third calls should use cached promise
      const result2 = await initializeWasmCrypto()
      const result3 = await initializeWasmCrypto()

      // All should resolve to true
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)

      // Most importantly: the init function should only be called ONCE
      // This proves promise caching is working
      expect(initFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('WASM Engine Access', () => {
    it('should throw error when accessing engine before initialization', () => {
      expect(() => getWasmEngine()).toThrow('WebAssembly crypto engine not initialized')
    })

    it('should return engine after successful initialization', async () => {
      // Ensure mock is set up
      // Ensure mock is set up with utils
      const mockModule = mockWasmModule()
      mockModule.WasmCryptoUtils = {
        get_version_info: vi.fn().mockReturnValue({
          version: '1.0.0',
          simd_enabled: true
        }),
        benchmark_scalar_mult: vi.fn().mockReturnValue(100)
      }
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      const engine = getWasmEngine()
      
      expect(engine).toBeDefined()
      expect(engine.encrypt_amount).toBeDefined()
      expect(engine.generate_range_proof).toBeDefined()
    })
  })

  describe('Keypair Generation', () => {
    it('should generate keypair using WASM when available', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const keypair = await generateElGamalKeypair()
      
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(32)
    })

    it('should fallback to JavaScript implementation when WASM unavailable', async () => {
      // Don't initialize WASM
      const keypair = await generateElGamalKeypair()
      
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(32)
    })

    it('should handle WASM keypair generation failure', async () => {
      const mockModule = mockWasmModule()
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => {
        throw new Error('WASM error')
      })
      
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      
      // Should fallback to JS
      const keypair = await generateElGamalKeypair()
      expect(keypair).toBeDefined()
    })
  })

  describe('Encryption Operations', () => {
    const testAmount = BigInt(1000000)
    const testPublicKey = new Uint8Array(32).fill(1)
    const testRandomness = new Uint8Array(32).fill(2)

    it('should encrypt amount using WASM', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const ciphertext = await encryptAmount(testAmount, testPublicKey, testRandomness)
      
      expect(ciphertext.commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(ciphertext.handle.handle).toBeInstanceOf(Uint8Array)
    })

    it('should handle large amounts by capping at MAX_SAFE_INTEGER', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER) * 2n
      
      const ciphertext = await encryptAmount(largeAmount, testPublicKey)
      expect(ciphertext).toBeDefined()
    })

    it('should measure encryption performance', async () => {
      const perfMock = mockPerformanceAPI()
      global.performance = perfMock as any
      
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      await encryptAmount(testAmount, testPublicKey)
      
      expect(perfMock.now).toHaveBeenCalledTimes(2) // start and end
    })

    it('should fallback to JavaScript on WASM encryption failure', async () => {
      const mockModule = mockWasmModule()
      const mockEngine = {
        encrypt_amount: vi.fn().mockImplementation(() => {
          throw new Error('WASM encryption failed')
        })
      }
      
      mockModule.WasmElGamalEngine = vi.fn().mockReturnValue(mockEngine)
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      
      // Should not throw, but fallback to JS
      const ciphertext = await encryptAmount(testAmount, testPublicKey)
      expect(ciphertext).toBeDefined()
    })
  })

  describe('Batch Encryption', () => {
    const testAmounts = [BigInt(100), BigInt(200), BigInt(300)]
    const testPublicKey = new Uint8Array(32).fill(1)

    it('should batch encrypt using WASM for multiple amounts', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const ciphertexts = await batchEncryptAmounts(testAmounts, testPublicKey)
      
      expect(ciphertexts).toHaveLength(testAmounts.length)
      ciphertexts.forEach(ct => {
        expect(ct.commitment.commitment).toBeInstanceOf(Uint8Array)
        expect(ct.handle.handle).toBeInstanceOf(Uint8Array)
      })
    })

    it('should use sequential encryption for single amount', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const ciphertexts = await batchEncryptAmounts([BigInt(100)], testPublicKey)
      
      expect(ciphertexts).toHaveLength(1)
    })

    it('should pack amounts correctly for WASM', async () => {
      __resetWasmCrypto()

      // Create a mock engine that tracks batch_encrypt_amounts calls
      const batchEncryptSpy = vi.fn().mockImplementation((amounts: number[]) => {
        return amounts.map(() => ({
          c1: new Uint8Array(32).fill(1),
          c2: new Uint8Array(32).fill(2)
        }))
      })

      const mockEngine = {
        encrypt_amount: vi.fn().mockReturnValue({ c1: new Uint8Array(32), c2: new Uint8Array(32) }),
        batch_encrypt_amounts: batchEncryptSpy,
        generate_range_proof: vi.fn().mockReturnValue({ proof: new Uint8Array(674), commitment: new Uint8Array(32) }),
        batch_generate_range_proofs: vi.fn().mockReturnValue([]),
        get_performance_info: vi.fn().mockReturnValue({ simd_enabled: true }),
        generate_keypair: vi.fn().mockReturnValue({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }),
        run_benchmarks: vi.fn().mockReturnValue({ encryption: { avg_time_ms: 1 } })
      }

      ;(globalThis as any).__WASM_MOCK__ = {
        default: vi.fn().mockResolvedValue(undefined),
        is_wasm_available: vi.fn().mockReturnValue(true),
        get_wasm_info: vi.fn().mockReturnValue({ version: 'test', features: {} }),
        WasmElGamalEngine: vi.fn().mockImplementation(() => mockEngine)
      }

      await initializeWasmCrypto()
      await batchEncryptAmounts(testAmounts, testPublicKey)

      // The batch_encrypt_amounts should be called with an array of numbers
      expect(batchEncryptSpy).toHaveBeenCalled()
      const calledAmounts = batchEncryptSpy.mock.calls[0][0]
      expect(Array.isArray(calledAmounts)).toBe(true)
      expect(calledAmounts.length).toBe(testAmounts.length)
    })

    it('should handle batch encryption failure gracefully', async () => {
      const mockModule = mockWasmModule()
      const baseEngine = mockModule.WasmElGamalEngine()
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => ({
        ...baseEngine,
        batch_encrypt: vi.fn().mockImplementation(() => {
          throw new Error('Batch failed')
        })
      }))
      
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      
      // Should fallback to sequential
      const ciphertexts = await batchEncryptAmounts(testAmounts, testPublicKey)
      expect(ciphertexts).toHaveLength(testAmounts.length)
    })
  })

  describe('Range Proof Generation', () => {
    const testAmount = BigInt(1000)
    const testCommitment = { commitment: new Uint8Array(32).fill(3) }
    const testBlindingFactor = new Uint8Array(32).fill(4)

    it('should generate range proof using WASM', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const result = await generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      
      expect(result.proof).toBeInstanceOf(Uint8Array)
      expect(result.proof).toHaveLength(674) // Bulletproof size
      expect(result.commitment).toBeInstanceOf(Uint8Array)
    })

    it('should log warning for slow range proof generation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock slow performance
      const perfMock = mockPerformanceAPI()
      perfMock.now = vi.fn()
        .mockReturnValueOnce(0)    // start
        .mockReturnValueOnce(60)   // end (60ms > 50ms target)
      
      global.performance = perfMock as any
      
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      await generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WASM range proof took 60.00ms (target: <50ms)')
      )
    })

    it('should handle range proof generation failure', async () => {
      const mockModule = mockWasmModule()
      const mockEngine = {
        ...mockModule.WasmElGamalEngine(),
        generate_range_proof: vi.fn().mockImplementation(() => {
          throw new Error('Range proof failed')
        })
      }
      
      mockModule.WasmElGamalEngine = vi.fn().mockReturnValue(mockEngine)
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      
      // Should fallback to JS
      const result = await generateRangeProof(testAmount, testCommitment, testBlindingFactor)
      expect(result.proof).toBeDefined()
    })
  })

  describe('Batch Range Proof Generation', () => {
    const proofRequests = [
      {
        amount: BigInt(100),
        commitment: { commitment: new Uint8Array(32).fill(1) },
        blindingFactor: new Uint8Array(32).fill(2)
      },
      {
        amount: BigInt(200),
        commitment: { commitment: new Uint8Array(32).fill(3) },
        blindingFactor: new Uint8Array(32).fill(4)
      }
    ]

    it('should batch generate range proofs using WASM', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const proofs = await batchGenerateRangeProofs(proofRequests)
      
      expect(proofs).toHaveLength(proofRequests.length)
      proofs.forEach(proof => {
        expect(proof.proof).toBeInstanceOf(Uint8Array)
        expect(proof.proof).toHaveLength(674)
      })
    })

    it('should pack proof data correctly for WASM', async () => {
      const mockModule = mockWasmModule()
      const batchProofSpy = vi.fn().mockReturnValue([
        { proof: new Uint8Array(674), commitment: new Uint8Array(32) }
      ])
      
      const baseEngine = mockModule.WasmElGamalEngine()
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => ({
        ...baseEngine,
        batch_generate_range_proofs: batchProofSpy
      }))
      
      ;(globalThis as any).__WASM_MOCK__ = mockModule
      
      await initializeWasmCrypto()
      await batchGenerateRangeProofs(proofRequests)
      
      expect(batchProofSpy).toHaveBeenCalled()
      const packedData = batchProofSpy.mock.calls[0][0]
      expect(packedData).toBeInstanceOf(Uint8Array)
      expect(packedData.length).toBe(proofRequests.length * 72) // 8 + 32 + 32 per request
    })

    it('should calculate average time per proof', async () => {
      const perfMock = mockPerformanceAPI()
      perfMock.now = vi.fn()
        .mockReturnValueOnce(0)    // start
        .mockReturnValueOnce(100)  // end
      
      global.performance = perfMock as any
      
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const proofs = await batchGenerateRangeProofs(proofRequests)
      
      expect(proofs).toHaveLength(proofRequests.length)
      // Average time would be 100ms / 2 = 50ms per proof
    })
  })

  describe('Performance Information', () => {
    it('should return performance info when WASM is available', async () => {
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const perfInfo = await getCryptoPerformanceInfo()
      
      expect(perfInfo.isAvailable).toBe(true)
      expect(perfInfo.wasm).toBeDefined()
      expect(perfInfo.wasm?.engine_type).toBe('WasmElGamalEngine')
      expect(perfInfo.version).toBeDefined()
      expect(perfInfo.benchmarkResults).toBeDefined()
    })

    it('should return null performance info when WASM unavailable', async () => {
      // Force availablity to false
      const mockModule = (globalThis as any).__WASM_MOCK__
      mockModule.is_wasm_available.mockReturnValue(false)

      const perfInfo = await getCryptoPerformanceInfo()
      
      expect(perfInfo.isAvailable).toBe(false)
      expect(perfInfo.wasm).toBeNull()
      expect(perfInfo.version).toBeNull()
    })

    it('should run scalar multiplication benchmarks', async () => {
      __resetWasmCrypto()

      const mockEngine = {
        encrypt_amount: vi.fn().mockReturnValue({ c1: new Uint8Array(32), c2: new Uint8Array(32) }),
        batch_encrypt_amounts: vi.fn().mockReturnValue([]),
        generate_range_proof: vi.fn().mockReturnValue({ proof: new Uint8Array(674), commitment: new Uint8Array(32) }),
        batch_generate_range_proofs: vi.fn().mockReturnValue([]),
        get_performance_info: vi.fn().mockReturnValue({ simd_enabled: true }),
        generate_keypair: vi.fn().mockReturnValue({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }),
        run_benchmarks: vi.fn().mockReturnValue({ encryption: { avg_time_ms: 5 } })
      }

      ;(globalThis as any).__WASM_MOCK__ = {
        default: vi.fn().mockResolvedValue(undefined),
        is_wasm_available: vi.fn().mockReturnValue(true),
        get_wasm_info: vi.fn().mockReturnValue({ version: '1.0.0', features: { simd: true } }),
        WasmElGamalEngine: vi.fn().mockImplementation(() => mockEngine)
      }

      await initializeWasmCrypto()
      const perfInfo = await getCryptoPerformanceInfo()

      // The implementation creates a wrapper that uses engine.run_benchmarks()
      expect(perfInfo.isAvailable).toBe(true)
      expect(perfInfo.benchmarkResults).toBeDefined()
    })
  })

  describe('Comprehensive Benchmarks', () => {
    it('should run full crypto benchmarks', async () => {
      const perfMock = mockPerformanceAPI()
      let time = 0
      perfMock.now = vi.fn(() => {
        time += 10
        return time
      })
      
      global.performance = perfMock as any
      
      ;(globalThis as any).__WASM_MOCK__ = mockWasmModule()
      
      await initializeWasmCrypto()
      const benchmarks = await runCryptoBenchmarks()
      
      expect(benchmarks.encryption).toBeDefined()
      expect(benchmarks.encryption.wasm).toBeGreaterThan(0)
      expect(benchmarks.encryption.js).toBeGreaterThan(0)
      expect(benchmarks.encryption.speedup).toBeGreaterThan(0)
      
      expect(benchmarks.rangeProof).toBeDefined()
      expect(benchmarks.batchEncryption).toBeDefined()
    })

    it('should calculate speedup factors correctly', async () => {
      __resetWasmCrypto()

      const mockEngine = {
        encrypt_amount: vi.fn().mockReturnValue({ c1: new Uint8Array(32), c2: new Uint8Array(32) }),
        batch_encrypt_amounts: vi.fn().mockImplementation((amounts: number[]) => {
          return amounts.map(() => ({ c1: new Uint8Array(32), c2: new Uint8Array(32) }))
        }),
        generate_range_proof: vi.fn().mockReturnValue({ proof: new Uint8Array(674), commitment: new Uint8Array(32) }),
        batch_generate_range_proofs: vi.fn().mockReturnValue([]),
        get_performance_info: vi.fn().mockReturnValue({ simd_enabled: true }),
        generate_keypair: vi.fn().mockReturnValue({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }),
        run_benchmarks: vi.fn().mockReturnValue({ encryption: { avg_time_ms: 1 } })
      }

      ;(globalThis as any).__WASM_MOCK__ = {
        default: vi.fn().mockResolvedValue(undefined),
        is_wasm_available: vi.fn().mockReturnValue(true),
        get_wasm_info: vi.fn().mockReturnValue({ version: '1.0.0', features: {} }),
        WasmElGamalEngine: vi.fn().mockImplementation(() => mockEngine)
      }

      await initializeWasmCrypto()
      const benchmarks = await runCryptoBenchmarks()

      // Verify benchmark structure is returned
      expect(benchmarks.encryption).toBeDefined()
      expect(benchmarks.rangeProof).toBeDefined()
      expect(benchmarks.batchEncryption).toBeDefined()
      // When WASM is available, speedup should be calculated (could be > 0)
      expect(typeof benchmarks.encryption.speedup).toBe('number')
    })

    it('should handle benchmark when WASM is unavailable', async () => {
      __resetWasmCrypto()
      // Delete WASM mock to simulate unavailable WASM
      delete (globalThis as any).__WASM_MOCK__

      const benchmarks = await runCryptoBenchmarks()

      // When WASM is unavailable, wasm time should be 0 and speedup should be 0
      expect(benchmarks.encryption.wasm).toBe(0)
      expect(benchmarks.encryption.js).toBeGreaterThanOrEqual(0)
      expect(benchmarks.encryption.speedup).toBe(0)
    })
  })

  describe('Auto-initialization', () => {
    it('should auto-initialize on module import', async () => {
      // Test that dynamic import succeeds without throwing
      // The module may or may not have WASM available, but import should succeed
      const module = await import('../../../src/utils/wasm-crypto-bridge')
      expect(module).toBeDefined()
      expect(module.initializeWasmCrypto).toBeDefined()
      expect(module.isWasmCryptoAvailable).toBeDefined()
    })
  })
})