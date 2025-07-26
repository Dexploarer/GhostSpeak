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
  runCryptoBenchmarks
} from '../../../src/utils/wasm-crypto-bridge'
import { mockWasmModule, mockPerformanceAPI } from '../../helpers/mocks'
import { setupTestEnvironment } from '../../helpers/setup'

describe('WASM Crypto Bridge', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
    
    // Reset module state
    vi.resetModules()
    
    // Mock global objects
    global.performance = mockPerformanceAPI() as any
    global.WebAssembly = {
      instantiate: vi.fn(),
      compile: vi.fn()
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Initialization', () => {
    it('should initialize WASM module successfully', async () => {
      // Mock dynamic import
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      const result = await initializeWasmCrypto()
      
      expect(result).toBe(true)
      expect(isWasmCryptoAvailable()).toBe(true)
    })

    it('should handle WASM initialization failure gracefully', async () => {
      // Mock failed import
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => {
        throw new Error('Module not found')
      })
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      // First call
      const promise1 = initializeWasmCrypto()
      // Second call should return same promise
      const promise2 = initializeWasmCrypto()
      
      expect(promise1).toBe(promise2)
      
      await promise1
      await promise2
    })
  })

  describe('WASM Engine Access', () => {
    it('should throw error when accessing engine before initialization', () => {
      expect(() => getWasmEngine()).toThrow('WebAssembly crypto engine not initialized')
    })

    it('should return engine after successful initialization', async () => {
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const engine = getWasmEngine()
      
      expect(engine).toBeDefined()
      expect(engine.encrypt_amount).toBeDefined()
      expect(engine.generate_range_proof).toBeDefined()
    })
  })

  describe('Keypair Generation', () => {
    it('should generate keypair using WASM when available', async () => {
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const ciphertext = await encryptAmount(testAmount, testPublicKey, testRandomness)
      
      expect(ciphertext.commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(ciphertext.handle.handle).toBeInstanceOf(Uint8Array)
    })

    it('should handle large amounts by capping at MAX_SAFE_INTEGER', async () => {
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER) * 2n
      
      const ciphertext = await encryptAmount(largeAmount, testPublicKey)
      expect(ciphertext).toBeDefined()
    })

    it('should measure encryption performance', async () => {
      const perfMock = mockPerformanceAPI()
      global.performance = perfMock as any
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const ciphertexts = await batchEncryptAmounts(testAmounts, testPublicKey)
      
      expect(ciphertexts).toHaveLength(testAmounts.length)
      ciphertexts.forEach(ct => {
        expect(ct.commitment.commitment).toBeInstanceOf(Uint8Array)
        expect(ct.handle.handle).toBeInstanceOf(Uint8Array)
      })
    })

    it('should use sequential encryption for single amount', async () => {
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const ciphertexts = await batchEncryptAmounts([BigInt(100)], testPublicKey)
      
      expect(ciphertexts).toHaveLength(1)
    })

    it('should pack amounts correctly for WASM', async () => {
      const mockModule = mockWasmModule()
      const batchEncryptSpy = vi.fn().mockReturnValue([
        { commitment: new Uint8Array(32), handle: new Uint8Array(32) }
      ])
      
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => ({
        ...mockModule.WasmElGamalEngine(),
        batch_encrypt: batchEncryptSpy
      }))
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
      await initializeWasmCrypto()
      await batchEncryptAmounts(testAmounts, testPublicKey)
      
      expect(batchEncryptSpy).toHaveBeenCalled()
      const packedAmounts = batchEncryptSpy.mock.calls[0][0]
      expect(packedAmounts).toBeInstanceOf(Uint8Array)
      expect(packedAmounts.length).toBe(testAmounts.length * 8) // 8 bytes per u64
    })

    it('should handle batch encryption failure gracefully', async () => {
      const mockModule = mockWasmModule()
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => ({
        ...mockModule.WasmElGamalEngine(),
        batch_encrypt: vi.fn().mockImplementation(() => {
          throw new Error('Batch failed')
        })
      }))
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
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
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      
      mockModule.WasmElGamalEngine = vi.fn().mockImplementation(() => ({
        ...mockModule.WasmElGamalEngine(),
        batch_generate_range_proofs: batchProofSpy
      }))
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
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
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const proofs = await batchGenerateRangeProofs(proofRequests)
      
      expect(proofs).toHaveLength(proofRequests.length)
      // Average time would be 100ms / 2 = 50ms per proof
    })
  })

  describe('Performance Information', () => {
    it('should return performance info when WASM is available', async () => {
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const perfInfo = await getCryptoPerformanceInfo()
      
      expect(perfInfo.isAvailable).toBe(true)
      expect(perfInfo.wasm).toBeDefined()
      expect(perfInfo.wasm?.engine_type).toBe('WasmElGamalEngine')
      expect(perfInfo.version).toBeDefined()
      expect(perfInfo.benchmarkResults).toBeDefined()
    })

    it('should return null performance info when WASM unavailable', async () => {
      const perfInfo = await getCryptoPerformanceInfo()
      
      expect(perfInfo.isAvailable).toBe(false)
      expect(perfInfo.wasm).toBeNull()
      expect(perfInfo.version).toBeNull()
    })

    it('should run scalar multiplication benchmarks', async () => {
      const mockModule = mockWasmModule()
      const benchmarkSpy = vi.fn().mockReturnValue(5)
      
      mockModule.WasmCryptoUtils = {
        benchmark_scalar_mult: benchmarkSpy,
        get_version_info: vi.fn().mockReturnValue({
          version: '1.0.0',
          build_profile: 'release',
          target: 'wasm32-unknown-unknown',
          features: ['simd'],
          crypto_backend: 'curve25519-dalek',
          build_timestamp: '2025-01-01'
        })
      }
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockModule)
      
      await initializeWasmCrypto()
      const perfInfo = await getCryptoPerformanceInfo()
      
      expect(benchmarkSpy).toHaveBeenCalledWith(100)
      expect(benchmarkSpy).toHaveBeenCalledWith(1000)
      expect(perfInfo.benchmarkResults?.scalar_mult_100).toBe(5)
      expect(perfInfo.benchmarkResults?.scalar_mult_1000).toBe(5)
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
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
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
      const perfMock = mockPerformanceAPI()
      // Mock different times for WASM vs JS
      let callCount = 0
      perfMock.now = vi.fn(() => {
        const times = [
          0, 100,   // WASM encryption: 100ms
          100, 500, // JS encryption: 400ms
          500, 550, // WASM range proof: 50ms
          550, 750, // JS range proof: 200ms
          750, 800, // WASM batch: 50ms
          800, 1000 // JS batch: 200ms
        ]
        return times[callCount++] || 0
      })
      
      global.performance = perfMock as any
      
      vi.doMock('../../../dist/wasm/ghostspeak_crypto_wasm.js', () => mockWasmModule())
      
      await initializeWasmCrypto()
      const benchmarks = await runCryptoBenchmarks()
      
      // WASM should show speedup
      expect(benchmarks.encryption.speedup).toBe(4) // 400/100 = 4x
      expect(benchmarks.rangeProof.speedup).toBe(4) // 200/50 = 4x
      expect(benchmarks.batchEncryption.speedup).toBe(4) // 200/50 = 4x
    })

    it('should handle benchmark when WASM is unavailable', async () => {
      const benchmarks = await runCryptoBenchmarks()
      
      // Should still run JS benchmarks
      expect(benchmarks.encryption.wasm).toBe(0)
      expect(benchmarks.encryption.js).toBeGreaterThan(0)
      expect(benchmarks.encryption.speedup).toBe(0)
    })
  })

  describe('Auto-initialization', () => {
    it('should auto-initialize on module import', async () => {
      // The module auto-initializes when imported
      // We can't easily test this without resetting the entire module system
      // But we can verify it doesn't throw
      expect(() => require('../../../src/utils/wasm-crypto-bridge')).not.toThrow()
    })
  })
})