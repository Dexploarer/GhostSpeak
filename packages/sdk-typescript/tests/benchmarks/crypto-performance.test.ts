/**
 * Crypto Performance Benchmarks
 * 
 * Comprehensive performance testing suite for comparing JavaScript and
 * WebAssembly implementations of cryptographic operations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  initializeWasmCrypto,
  isWasmCryptoAvailable,
  encryptAmount,
  batchEncryptAmounts,
  generateRangeProof,
  batchGenerateRangeProofs,
  runCryptoBenchmarks,
  getCryptoPerformanceInfo
} from '../../src/utils/wasm-crypto-bridge.js'
import {
  WasmBatchProofManager,
  createWasmOptimizedBatchManager
} from '../../src/utils/batch-proof-manager-wasm.js'
import {
  generateElGamalKeypair as jsGenerateKeypair,
  encryptAmount as jsEncryptAmount,
  generateRangeProof as jsGenerateRangeProof,
  decryptAmount as jsDecryptAmount,
  generateBulletproof as jsGenerateBulletproof,
  generateTransferProof as jsGenerateTransferProof,
  createPedersenCommitmentFromAmount
} from '../../src/utils/elgamal-complete.js'

// =====================================================
// TEST SETUP AND CONFIGURATION
// =====================================================

const BENCHMARK_CONFIG = {
  // Number of iterations for each benchmark
  ITERATIONS: {
    QUICK: 10,      // For quick CI tests
    STANDARD: 50,   // For standard benchmarks
    THOROUGH: 200   // For comprehensive testing
  },
  
  // Performance targets (in milliseconds)
  TARGETS: {
    ENCRYPTION: 5,        // <5ms per encryption
    RANGE_PROOF: 50,      // <50ms per range proof
    BATCH_SPEEDUP: 2,     // Minimum 2x speedup for batches
    WASM_SPEEDUP: 1.5     // Minimum 1.5x speedup over JS
  },
  
  // Test data sizes
  BATCH_SIZES: [1, 5, 10, 20, 50],
  
  // Test amounts (focusing on commonly used values)
  TEST_AMOUNTS: [
    BigInt(0),          // Zero amount (fixed in corrected implementation)
    BigInt(1),          // Minimum non-zero
    BigInt(1000),       // Small amount
    BigInt(1000000),    // Medium amount  
    BigInt(1000000000), // Large amount
    BigInt(2) ** BigInt(32) - BigInt(1), // 32-bit max
    BigInt(2) ** BigInt(48) - BigInt(1)  // Reduced from 63-bit for performance
  ]
}

// Test fixtures
let testKeypair: { publicKey: Uint8Array; secretKey: Uint8Array }
let testPublicKey: Uint8Array
let testCommitment: { commitment: Uint8Array }
let testBlindingFactor: Uint8Array

describe('Crypto Performance Benchmarks', () => {
  beforeAll(async () => {
    console.log('🚀 Initializing crypto performance benchmarks...')
    
    // Initialize WASM
    const wasmSuccess = await initializeWasmCrypto()
    console.log(`📊 WASM Available: ${wasmSuccess}`)
    
    // Generate test data
    testKeypair = await jsGenerateKeypair()
    testPublicKey = testKeypair.publicKey
    testCommitment = { commitment: new Uint8Array(32).fill(0xAB) }
    testBlindingFactor = new Uint8Array(32).fill(0xCD)
    
    // Log performance info
    if (isWasmCryptoAvailable()) {
      const perfInfo = await getCryptoPerformanceInfo()
      console.log('📈 WASM Performance Info:', perfInfo)
    }
  })

  afterAll(() => {
    console.log('✅ Crypto performance benchmarks completed')
  })

  // =====================================================
  // BASIC OPERATION BENCHMARKS
  // =====================================================

  describe('Individual Operation Performance', () => {
    it('should benchmark twisted ElGamal encryption performance', async () => {
      const amount = BigInt(1000000)
      const iterations = BENCHMARK_CONFIG.ITERATIONS.STANDARD
      
      console.log(`🔬 Benchmarking ${iterations} twisted ElGamal encryptions...`)
      
      // JavaScript benchmark using corrected implementation
      const jsStartTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        jsEncryptAmount(amount, testPublicKey)
      }
      const jsTime = performance.now() - jsStartTime
      const jsAvgTime = jsTime / iterations
      
      // WASM benchmark (if available)
      let wasmTime = 0
      let wasmAvgTime = 0
      let speedup = 1
      
      if (isWasmCryptoAvailable()) {
        const wasmStartTime = performance.now()
        for (let i = 0; i < iterations; i++) {
          await encryptAmount(amount, testPublicKey)
        }
        wasmTime = performance.now() - wasmStartTime
        wasmAvgTime = wasmTime / iterations
        speedup = jsTime / wasmTime
      }
      
      console.log(`📊 Twisted ElGamal Encryption Results:`)
      console.log(`  JS:   ${jsTime.toFixed(2)}ms total, ${jsAvgTime.toFixed(2)}ms avg`)
      console.log(`  WASM: ${wasmTime.toFixed(2)}ms total, ${wasmAvgTime.toFixed(2)}ms avg`)
      console.log(`  Speedup: ${speedup.toFixed(2)}x`)
      
      // Performance assertions - twisted ElGamal should be efficient
      expect(jsAvgTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION * 2)
      
      if (isWasmCryptoAvailable()) {
        expect(wasmAvgTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION)
        expect(speedup).toBeGreaterThan(BENCHMARK_CONFIG.TARGETS.WASM_SPEEDUP)
      }
    })

    it('should benchmark bulletproof range proof generation', async () => {
      const amount = BigInt(1000000)
      const iterations = BENCHMARK_CONFIG.ITERATIONS.QUICK // Bulletproofs are expensive
      
      console.log(`🔬 Benchmarking ${iterations} bulletproof generations...`)
      
      // Create proper Pedersen commitment for testing
      const commitment = createPedersenCommitmentFromAmount(amount)
      
      // JavaScript benchmark using corrected bulletproof implementation
      const jsStartTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        jsGenerateBulletproof(amount, commitment, commitment.randomness)
      }
      const jsTime = performance.now() - jsStartTime
      const jsAvgTime = jsTime / iterations
      
      // WASM benchmark (if available)
      let wasmTime = 0
      let wasmAvgTime = 0
      let speedup = 1
      
      if (isWasmCryptoAvailable()) {
        const wasmStartTime = performance.now()
        for (let i = 0; i < iterations; i++) {
          await generateRangeProof(amount, commitment, commitment.randomness)
        }
        wasmTime = performance.now() - wasmStartTime
        wasmAvgTime = wasmTime / iterations
        speedup = jsTime / wasmTime
      }
      
      console.log(`📊 Bulletproof Range Proof Results:`)
      console.log(`  JS:   ${jsTime.toFixed(2)}ms total, ${jsAvgTime.toFixed(2)}ms avg`)
      console.log(`  WASM: ${wasmTime.toFixed(2)}ms total, ${wasmAvgTime.toFixed(2)}ms avg`)
      console.log(`  Speedup: ${speedup.toFixed(2)}x`)
      
      // Performance assertions for bulletproofs
      if (isWasmCryptoAvailable()) {
        expect(wasmAvgTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.RANGE_PROOF)
        expect(speedup).toBeGreaterThan(BENCHMARK_CONFIG.TARGETS.WASM_SPEEDUP)
      }
    })
  })

    it('should benchmark zero amount encryption (bug fix verification)', async () => {
      const iterations = BENCHMARK_CONFIG.ITERATIONS.STANDARD
      
      console.log(`🔬 Benchmarking ${iterations} zero amount encryptions (bug fix)...`)
      
      // JavaScript benchmark for zero amounts
      const jsStartTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        const ciphertext = jsEncryptAmount(BigInt(0), testPublicKey)
        // Verify decryption works (this was the bug)
        const decrypted = jsDecryptAmount(ciphertext, testKeypair.secretKey)
        expect(decrypted).toBe(BigInt(0))
      }
      const jsTime = performance.now() - jsStartTime
      const jsAvgTime = jsTime / iterations
      
      // WASM benchmark (if available)
      let wasmTime = 0
      let wasmAvgTime = 0
      
      if (isWasmCryptoAvailable()) {
        const wasmStartTime = performance.now()
        for (let i = 0; i < iterations; i++) {
          await encryptAmount(BigInt(0), testPublicKey)
        }
        wasmTime = performance.now() - wasmStartTime
        wasmAvgTime = wasmTime / iterations
      }
      
      console.log(`📊 Zero Amount Encryption Results:`)
      console.log(`  JS:   ${jsTime.toFixed(2)}ms total, ${jsAvgTime.toFixed(2)}ms avg`)
      console.log(`  WASM: ${wasmTime.toFixed(2)}ms total, ${wasmAvgTime.toFixed(2)}ms avg`)
      
      // Zero amounts should be fast to encrypt
      expect(jsAvgTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION)
      
      if (isWasmCryptoAvailable()) {
        expect(wasmAvgTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION * 0.5)
      }
    })
  })

  // =====================================================
  // BATCH OPERATION BENCHMARKS
  // =====================================================

  describe('Batch Operation Performance', () => {
    it('should benchmark batch encryption across different sizes', async () => {
      console.log('🔬 Benchmarking batch encryption performance...')
      
      const results: Array<{
        size: number
        jsTime: number
        wasmTime: number
        speedup: number
      }> = []
      
      for (const batchSize of BENCHMARK_CONFIG.BATCH_SIZES) {
        const amounts = Array(batchSize).fill(BigInt(1000000))
        
        // JavaScript (sequential) benchmark
        const jsStartTime = performance.now()
        for (const amount of amounts) {
          await jsEncryptAmount(amount, testPublicKey)
        }
        const jsTime = performance.now() - jsStartTime
        
        // WASM batch benchmark
        let wasmTime = 0
        let speedup = 1
        
        if (isWasmCryptoAvailable()) {
          const wasmStartTime = performance.now()
          await batchEncryptAmounts(amounts, testPublicKey)
          wasmTime = performance.now() - wasmStartTime
          speedup = jsTime / wasmTime
        }
        
        results.push({ size: batchSize, jsTime, wasmTime, speedup })
        
        console.log(`  Batch size ${batchSize}: JS ${jsTime.toFixed(2)}ms, WASM ${wasmTime.toFixed(2)}ms, ${speedup.toFixed(2)}x speedup`)
      }
      
      // Verify batch operations show improving speedup with size
      if (isWasmCryptoAvailable()) {
        const largestBatch = results[results.length - 1]
        expect(largestBatch.speedup).toBeGreaterThan(BENCHMARK_CONFIG.TARGETS.BATCH_SPEEDUP)
        
        // Speedup should generally increase with batch size
        const smallBatch = results[1] // Skip size 1
        const largeBatch = results[results.length - 1]
        expect(largeBatch.speedup).toBeGreaterThanOrEqual(smallBatch.speedup * 0.8) // Allow some variance
      }
    })

    it('should benchmark batch range proof generation', async () => {
      if (!isWasmCryptoAvailable()) {
        console.log('⚠️ Skipping batch range proof benchmark - WASM not available')
        return
      }
      
      console.log('🔬 Benchmarking batch range proof generation...')
      
      const batchSizes = [2, 5, 10] // Smaller batches for expensive range proofs
      const results: Array<{
        size: number
        jsTime: number
        wasmTime: number
        speedup: number
      }> = []
      
      for (const batchSize of batchSizes) {
        const proofRequests = Array(batchSize).fill(null).map(() => ({
          amount: BigInt(Math.floor(Math.random() * 1000000)),
          commitment: { commitment: new Uint8Array(32).fill(Math.floor(Math.random() * 256)) },
          blindingFactor: new Uint8Array(32).fill(Math.floor(Math.random() * 256))
        }))
        
        // JavaScript (sequential) benchmark
        const jsStartTime = performance.now()
        for (const request of proofRequests) {
          await jsGenerateRangeProof(request.amount, request.commitment, request.blindingFactor)
        }
        const jsTime = performance.now() - jsStartTime
        
        // WASM batch benchmark
        const wasmStartTime = performance.now()
        await batchGenerateRangeProofs(proofRequests)
        const wasmTime = performance.now() - wasmStartTime
        
        const speedup = jsTime / wasmTime
        results.push({ size: batchSize, jsTime, wasmTime, speedup })
        
        console.log(`  Batch size ${batchSize}: JS ${jsTime.toFixed(2)}ms, WASM ${wasmTime.toFixed(2)}ms, ${speedup.toFixed(2)}x speedup`)
      }
      
      // Verify meaningful speedup for batch operations
      results.forEach(result => {
        expect(result.speedup).toBeGreaterThan(BENCHMARK_CONFIG.TARGETS.WASM_SPEEDUP)
      })
    })
  })

  // =====================================================
  // WASM BATCH PROOF MANAGER BENCHMARKS
  // =====================================================

  describe('WASM Batch Proof Manager Performance', () => {
    let wasmManager: WasmBatchProofManager
    let jsManager: WasmBatchProofManager

    beforeAll(() => {
      wasmManager = createWasmOptimizedBatchManager(1_400_000, true)
      jsManager = createWasmOptimizedBatchManager(1_400_000, false)
    })

    it('should benchmark batch proof manager performance', async () => {
      console.log('🔬 Benchmarking WasmBatchProofManager...')
      
      const proofRequests = Array(10).fill(null).map(() => ({
        amount: BigInt(Math.floor(Math.random() * 1000000)),
        commitment: { commitment: new Uint8Array(32).fill(Math.floor(Math.random() * 256)) },
        blindingFactor: new Uint8Array(32).fill(Math.floor(Math.random() * 256))
      }))
      
      // WASM manager benchmark
      let wasmTime = 0
      let wasmMetrics: any = null
      
      if (isWasmCryptoAvailable()) {
        wasmManager.addBatchRangeProofTasks(proofRequests, 10)
        
        const wasmStartTime = performance.now()
        const wasmResult = await wasmManager.processBatch()
        wasmTime = performance.now() - wasmStartTime
        wasmMetrics = wasmResult.metrics
        
        expect(wasmResult.failures).toHaveLength(0)
        expect(wasmResult.proofs.length).toBeGreaterThan(0)
      }
      
      // JS manager benchmark
      jsManager.addBatchRangeProofTasks(proofRequests, 10)
      
      const jsStartTime = performance.now()
      const jsResult = await jsManager.processBatch()
      const jsTime = performance.now() - jsStartTime
      
      expect(jsResult.failures).toHaveLength(0)
      expect(jsResult.proofs.length).toBeGreaterThan(0)
      
      console.log(`📊 Batch Manager Results:`)
      console.log(`  JS Manager:   ${jsTime.toFixed(2)}ms`)
      console.log(`  WASM Manager: ${wasmTime.toFixed(2)}ms`)
      
      if (wasmMetrics) {
        console.log(`  WASM Metrics:`)
        console.log(`    Speedup Factor: ${wasmMetrics.speedupFactor.toFixed(2)}x`)
        console.log(`    Boundary Crossings: ${wasmMetrics.boundaryCrossings}`)
        console.log(`    WASM Time: ${wasmMetrics.wasmTime.toFixed(2)}ms`)
        console.log(`    Bridge Time: ${wasmMetrics.bridgeTime.toFixed(2)}ms`)
        
        // Verify WASM optimizations
        expect(wasmMetrics.speedupFactor).toBeGreaterThan(1)
        expect(wasmMetrics.boundaryCrossings).toBeLessThan(50) // Should be efficient
      }
      
      // Verify performance improvement
      if (isWasmCryptoAvailable() && wasmTime > 0) {
        const speedup = jsTime / wasmTime
        console.log(`  Overall Speedup: ${speedup.toFixed(2)}x`)
        expect(speedup).toBeGreaterThan(1)
      }
    })

    it('should verify boundary crossing optimization', async () => {
      if (!isWasmCryptoAvailable()) {
        console.log('⚠️ Skipping boundary crossing test - WASM not available')
        return
      }
      
      console.log('🔬 Testing boundary crossing optimization...')
      
      // Test with various batch sizes to verify optimization
      const testSizes = [1, 5, 15, 25]
      const boundaryResults: Array<{ size: number; crossings: number; efficiency: number }> = []
      
      for (const size of testSizes) {
        const requests = Array(size).fill(null).map(() => ({
          amount: BigInt(1000),
          commitment: { commitment: new Uint8Array(32).fill(0) },
          blindingFactor: new Uint8Array(32).fill(0)
        }))
        
        const manager = createWasmOptimizedBatchManager()
        manager.addBatchRangeProofTasks(requests, 10)
        
        const result = await manager.processBatch()
        const crossings = result.metrics.boundaryCrossings
        const efficiency = size / crossings // Operations per crossing
        
        boundaryResults.push({ size, crossings, efficiency })
        
        console.log(`  Size ${size}: ${crossings} crossings, ${efficiency.toFixed(2)} ops/crossing`)
        
        // Verify reasonable boundary crossing limits
        expect(crossings).toBeLessThan(size * 2) // Should be much less than 2 per operation
        expect(crossings).toBeGreaterThan(0) // Should have some crossings
      }
      
      // Verify efficiency generally improves with batch size
      const smallBatch = boundaryResults[0]
      const largeBatch = boundaryResults[boundaryResults.length - 1]
      
      if (largeBatch.size > smallBatch.size) {
        expect(largeBatch.efficiency).toBeGreaterThanOrEqual(smallBatch.efficiency * 0.8)
      }
    })
  })

  // =====================================================
  // COMPREHENSIVE BENCHMARK SUITE
  // =====================================================

  describe('Comprehensive Performance Analysis', () => {
    it('should run full crypto benchmark suite', async () => {
      console.log('🏁 Running comprehensive crypto benchmarks...')
      
      const benchmarkResults = await runCryptoBenchmarks()
      
      console.log('📊 Complete Benchmark Results:')
      console.log(`  Encryption Speedup: ${benchmarkResults.encryption.speedup.toFixed(2)}x`)
      console.log(`  Range Proof Speedup: ${benchmarkResults.rangeProof.speedup.toFixed(2)}x`)
      console.log(`  Batch Encryption Speedup: ${benchmarkResults.batchEncryption.speedup.toFixed(2)}x`)
      
      // Verify all benchmarks show improvement (when WASM is available)
      if (isWasmCryptoAvailable()) {
        expect(benchmarkResults.encryption.speedup).toBeGreaterThan(1)
        expect(benchmarkResults.rangeProof.speedup).toBeGreaterThan(1)
        expect(benchmarkResults.batchEncryption.speedup).toBeGreaterThan(1)
        
        // Batch operations should show the most improvement
        expect(benchmarkResults.batchEncryption.speedup).toBeGreaterThanOrEqual(
          benchmarkResults.encryption.speedup
        )
      }
    })

    it('should verify performance targets are met', async () => {
      if (!isWasmCryptoAvailable()) {
        console.log('⚠️ Skipping performance targets - WASM not available')
        return
      }
      
      console.log('🎯 Verifying performance targets...')
      
      // Test encryption target (<5ms)
      const encryptStartTime = performance.now()
      await encryptAmount(BigInt(1000000), testPublicKey)
      const encryptTime = performance.now() - encryptStartTime
      
      console.log(`  Encryption: ${encryptTime.toFixed(2)}ms (target: <${BENCHMARK_CONFIG.TARGETS.ENCRYPTION}ms)`)
      expect(encryptTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION)
      
      // Test range proof target (<50ms)
      const proofStartTime = performance.now()
      await generateRangeProof(BigInt(1000000), testCommitment, testBlindingFactor)
      const proofTime = performance.now() - proofStartTime
      
      console.log(`  Range Proof: ${proofTime.toFixed(2)}ms (target: <${BENCHMARK_CONFIG.TARGETS.RANGE_PROOF}ms)`)
      expect(proofTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.RANGE_PROOF)
      
      console.log('✅ All performance targets met!')
    })

    it('should analyze memory usage and optimization', async () => {
      if (!isWasmCryptoAvailable()) {
        console.log('⚠️ Skipping memory analysis - WASM not available')
        return
      }
      
      console.log('🧠 Analyzing memory usage and optimization...')
      
      const manager = createWasmOptimizedBatchManager()
      
      // Create a larger batch to test memory optimization
      const largeProofRequests = Array(20).fill(null).map((_, i) => ({
        amount: BigInt(i * 1000),
        commitment: { commitment: new Uint8Array(32).fill(i % 256) },
        blindingFactor: new Uint8Array(32).fill((i * 7) % 256)
      }))
      
      manager.addBatchRangeProofTasks(largeProofRequests, 10)
      
      const result = await manager.processBatch()
      const analytics = manager.getPerformanceAnalytics()
      
      console.log(`📈 Performance Analytics:`)
      console.log(`  Average Speedup: ${analytics.averages.speedup.toFixed(2)}x`)
      console.log(`  Average WASM Time: ${analytics.averages.wasmTime.toFixed(2)}ms`)
      console.log(`  Average Boundary Crossings: ${analytics.averages.boundaryCrossings.toFixed(1)}`)
      console.log(`  Speedup Trend: ${analytics.trends.speedupTrend}`)
      console.log(`  Performance Trend: ${analytics.trends.performanceTrend}`)
      
      // Verify optimization effectiveness
      expect(analytics.averages.speedup).toBeGreaterThan(1)
      expect(analytics.averages.boundaryCrossings).toBeLessThan(100)
      expect(result.metrics.speedupFactor).toBeGreaterThan(1)
      
      console.log('✅ Memory optimization analysis complete')
    })

    it('should benchmark complete transfer proof generation', async () => {
      console.log('🔬 Benchmarking complete transfer proof generation...')
      
      const sourceBalance = BigInt(10000)
      const transferAmount = BigInt(3000)
      const iterations = 5 // Transfer proofs are very expensive
      
      // Create test keypairs
      const sourceKeypair = jsGenerateKeypair()
      const destKeypair = jsGenerateKeypair()
      
      const results: number[] = []
      
      for (let i = 0; i < iterations; i++) {
        const sourceEncrypted = jsEncryptAmount(sourceBalance, sourceKeypair.publicKey)
        
        const startTime = performance.now()
        const transferProof = jsGenerateTransferProof(
          sourceEncrypted,
          transferAmount,
          sourceKeypair,
          destKeypair.publicKey
        )
        const proofTime = performance.now() - startTime
        
        results.push(proofTime)
        
        // Verify the proof components
        expect(transferProof.transferProof.encryptedTransferAmount).toBeInstanceOf(Uint8Array)
        expect(transferProof.transferProof.newSourceCommitment).toBeInstanceOf(Uint8Array)
        expect(transferProof.transferProof.equalityProof).toBeInstanceOf(Uint8Array)
        expect(transferProof.transferProof.validityProof).toBeInstanceOf(Uint8Array)
        expect(transferProof.transferProof.rangeProof).toBeInstanceOf(Uint8Array)
        
        console.log(`  Transfer proof ${i + 1}: ${proofTime.toFixed(2)}ms`)
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length
      const maxTime = Math.max(...results)
      const minTime = Math.min(...results)
      
      console.log(`📊 Transfer Proof Generation Results:`)
      console.log(`  Average: ${avgTime.toFixed(2)}ms`)
      console.log(`  Range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`)
      
      // Transfer proofs are complex but should complete in reasonable time
      expect(avgTime).toBeLessThan(500) // 500ms target for complete transfer proof
      expect(maxTime).toBeLessThan(1000) // No single proof should take more than 1s
    })
  })

  // =====================================================
  // EDGE CASES AND STRESS TESTS
  // =====================================================

  describe('Edge Cases and Stress Tests', () => {
    it('should handle different amount sizes efficiently (including zero)', async () => {
      console.log('🔬 Testing twisted ElGamal performance across different amount sizes...')
      
      const results: Array<{ amount: bigint; time: number; decryptTime: number }> = []
      
      for (const amount of BENCHMARK_CONFIG.TEST_AMOUNTS) {
        // Encryption benchmark
        const encryptStartTime = performance.now()
        let ciphertext
        
        if (isWasmCryptoAvailable()) {
          ciphertext = await encryptAmount(amount, testPublicKey)
        } else {
          ciphertext = jsEncryptAmount(amount, testPublicKey)
        }
        
        const encryptTime = performance.now() - encryptStartTime
        
        // Decryption benchmark (verify zero amounts work)
        const decryptStartTime = performance.now()
        const decrypted = jsDecryptAmount(ciphertext, testKeypair.secretKey, amount + 1000n)
        const decryptTime = performance.now() - decryptStartTime
        
        // Verify correctness (especially for zero)
        expect(decrypted).toBe(amount)
        
        results.push({ amount, time: encryptTime, decryptTime })
        
        console.log(`  Amount ${amount}: encrypt ${encryptTime.toFixed(2)}ms, decrypt ${decryptTime.toFixed(2)}ms`)
        
        // Verify reasonable performance for all amounts
        expect(encryptTime).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION * 2)
      }
      
      // Verify zero amount performance (was previously broken)
      const zeroResult = results.find(r => r.amount === BigInt(0))
      expect(zeroResult).toBeDefined()
      expect(zeroResult!.time).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION)
      expect(zeroResult!.decryptTime).toBeLessThan(10) // Should be very fast
      
      // Verify performance is consistent across different amounts
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length
      const maxTime = Math.max(...results.map(r => r.time))
      
      expect(maxTime).toBeLessThan(avgTime * 3) // No single operation should be 3x slower than average
    })

    it('should maintain performance under concurrent operations', async () => {
      if (!isWasmCryptoAvailable()) {
        console.log('⚠️ Skipping concurrency test - WASM not available')
        return
      }
      
      console.log('🔬 Testing concurrent operation performance...')
      
      const concurrentOperations = 10
      const operationsPerBatch = 5
      
      const startTime = performance.now()
      
      // Run multiple batch operations concurrently
      const promises = Array(concurrentOperations).fill(null).map(async () => {
        const amounts = Array(operationsPerBatch).fill(BigInt(1000))
        return batchEncryptAmounts(amounts, testPublicKey)
      })
      
      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime
      
      console.log(`  Concurrent Operations: ${concurrentOperations}`)
      console.log(`  Operations per Batch: ${operationsPerBatch}`)
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`)
      console.log(`  Average per Operation: ${(totalTime / (concurrentOperations * operationsPerBatch)).toFixed(2)}ms`)
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations)
      results.forEach(result => {
        expect(result).toHaveLength(operationsPerBatch)
      })
      
      // Verify reasonable performance under concurrency
      const avgTimePerOperation = totalTime / (concurrentOperations * operationsPerBatch)
      expect(avgTimePerOperation).toBeLessThan(BENCHMARK_CONFIG.TARGETS.ENCRYPTION * 2)
    })
  })
})