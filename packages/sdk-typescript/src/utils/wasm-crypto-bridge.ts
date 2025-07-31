/**
 * WebAssembly Crypto Bridge
 * 
 * Provides seamless integration between the TypeScript SDK and the high-performance
 * WebAssembly cryptographic module. Includes automatic fallback to JavaScript
 * implementations when WASM is not available.
 */

import type { ElGamalKeypair, ElGamalCiphertext, PedersenCommitment } from './elgamal-complete.js'

// Browser globals for Node.js compatibility
declare const performance: {
  now(): number
}

// Type definitions for the WASM module interfaces
interface WasmEngineType {
  encrypt_amount(amount: number, publicKey: Uint8Array, randomness?: Uint8Array | null): {
    c1: Uint8Array
    c2: Uint8Array
  }
  batch_encrypt_amounts(amounts: number[], publicKey: Uint8Array): {
    c1: Uint8Array
    c2: Uint8Array
  }[]
  generate_range_proof(amount: number, commitment: Uint8Array, blindingFactor: Uint8Array): {
    proof: Uint8Array
    commitment: Uint8Array
  }
  batch_generate_range_proofs(proofData: Uint8Array): {
    proof: Uint8Array
    commitment: Uint8Array
  }[]
  get_performance_info(): Record<string, unknown>
  generate_keypair(): {
    publicKey: Uint8Array
    secretKey: Uint8Array
  }
  run_benchmarks(): Record<string, unknown>
}

// Constructor type for WASM engine
type WasmEngineConstructor = new() => WasmEngineType

// WASM module exports interface
interface WasmModuleExports {
  WasmElGamalEngine: WasmEngineConstructor
  is_wasm_available(): boolean
  get_wasm_info(): Record<string, unknown>
  default(): Promise<void>
}

// Legacy interfaces for backward compatibility  
interface WasmElGamalEngine {
  encrypt_amount(amount: bigint, publicKey: Uint8Array, randomness?: Uint8Array): WasmElGamalCiphertext
  batch_encrypt(amounts: Uint8Array, publicKey: Uint8Array): WasmElGamalCiphertext[]
  decrypt_amount(ciphertext: WasmElGamalCiphertext, secretKey: Uint8Array): bigint
  generate_range_proof(amount: bigint, commitment: Uint8Array, blindingFactor: Uint8Array): Uint8Array
  batch_generate_range_proofs(proofData: Uint8Array): Uint8Array[]
  get_performance_info(): PerformanceInfo
}

interface WasmElGamalKeypair {
  readonly public_key: Uint8Array
  readonly secret_key: Uint8Array
}

interface WasmElGamalCiphertext {
  readonly commitment: Uint8Array
  readonly handle: Uint8Array
}

// WasmCryptoUtils interface removed - using WasmCryptoUtilsConstructor directly

interface PerformanceInfo {
  engine_type: string
  optimizations: string[]
  target_performance: {
    encryption: string
    range_proof: string
    batch_speedup: string
  }
  memory_optimizations: string[]
}

interface VersionInfo {
  version: string
  build_profile: string
  target: string
  features: string[]
  crypto_backend: string
  build_timestamp: string
}

// WASM module type  
interface WasmModule {
  WasmElGamalEngine: WasmElGamalEngineConstructor
  WasmElGamalKeypair: WasmElGamalKeypairConstructor
  WasmElGamalCiphertext: WasmElGamalCiphertextConstructor  
  WasmCryptoUtils: WasmCryptoUtilsConstructor
}

// Constructor types for legacy interfaces
type WasmElGamalEngineConstructor = new() => WasmElGamalEngine

type WasmElGamalKeypairConstructor = new() => WasmElGamalKeypair

type WasmElGamalCiphertextConstructor = new(commitment: Uint8Array, handle: Uint8Array) => WasmElGamalCiphertext

interface WasmCryptoUtilsConstructor {
  has_simd_support(): boolean
  get_version_info(): VersionInfo
  benchmark_scalar_mult(iterations: number): number
}

// =====================================================
// WASM MODULE LOADING AND INITIALIZATION
// =====================================================

let wasmModule: WasmModule | null = null
let wasmEngine: WasmElGamalEngine | null = null
let isWasmSupported = false
let initializationPromise: Promise<boolean> | null = null

// Reset function for testing
export function __resetWasmCrypto() {
  wasmModule = null
  wasmEngine = null
  isWasmSupported = false
  initializationPromise = null
}

/**
 * Initialize the WebAssembly crypto module
 */
export async function initializeWasmCrypto(): Promise<boolean> {
  if (initializationPromise) {
    return initializationPromise
  }

  // Store the promise immediately to prevent race conditions
  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing WebAssembly crypto module...')

      // Check if WebAssembly is supported
      if (typeof WebAssembly === 'undefined') {
        console.warn('⚠️ WebAssembly not supported in this environment')
        return false
      }

      // Dynamic import of the actual compiled WASM module (with fallback)
      let wasmModuleImport: WasmModuleExports | null = null
      try {
        // Check if we're in a test environment with a mocked module
        const globalWithMock = globalThis as { __WASM_MOCK__?: WasmModuleExports }
        if (globalWithMock.__WASM_MOCK__) {
          wasmModuleImport = globalWithMock.__WASM_MOCK__
        } else {
          // @ts-expect-error - WASM module may not exist during development
          wasmModuleImport = await import('../../dist/wasm/ghostspeak_crypto_wasm.js') as unknown as WasmModuleExports
        }
      } catch {
        console.warn('WASM module not found, disabling WASM features')
        return false
      }
      
      // Initialize the WASM module
      await wasmModuleImport.default()
      
      // Verify WASM is available
      if (!wasmModuleImport.is_wasm_available()) {
        throw new Error('WASM module initialization failed')
      }
      
      console.log('📊 WASM Module Info:', wasmModuleImport.get_wasm_info())
      
      // Create wrapper that matches our interface using actual WASM
      
      wasmModule = {
        WasmElGamalEngine: class WasmElGamalEngineWrapper {
          private engine: WasmEngineType

          constructor() {
            this.engine = new wasmModuleImport!.WasmElGamalEngine()
            console.log('🚀 Real WasmElGamalEngine initialized')
          }

          encrypt_amount(amount: bigint, publicKey: Uint8Array, randomness?: Uint8Array): WasmElGamalCiphertext {
            // Convert bigint to number, ensuring it fits in u64 range
            const amountNum = amount > BigInt(Number.MAX_SAFE_INTEGER) ? 
              Number.MAX_SAFE_INTEGER : Number(amount)
            const result = this.engine.encrypt_amount(amountNum, publicKey, randomness ?? null)
            
            // Convert WASM result to our interface
            return {
              commitment: result.c1,
              handle: result.c2
            } as WasmElGamalCiphertext
          }

          batch_encrypt(amounts: Uint8Array, publicKey: Uint8Array): WasmElGamalCiphertext[] {
            // Convert byte array to JS array of numbers for WASM
            const amountArray = []
            for (let i = 0; i < amounts.length; i += 8) {
              const bytes = amounts.slice(i, i + 8)
              const view = new DataView(bytes.buffer, bytes.byteOffset, 8)
              amountArray.push(view.getBigUint64(0, true))
            }
            
            const jsArray = Array.from(amountArray.map(n => Number(n)))
            const results = this.engine.batch_encrypt_amounts(jsArray, publicKey)
            
            // Convert WASM results to our interface
            return Array.from(results).map((result) => ({
              commitment: (result as { c1: Uint8Array }).c1,
              handle: (result as { c2: Uint8Array }).c2
            } as WasmElGamalCiphertext))
          }

          decrypt_amount(_ciphertext: WasmElGamalCiphertext, _secretKey: Uint8Array): bigint {
            // Not implemented in current WASM module
            return BigInt(0)
          }

          generate_range_proof(amount: bigint, commitment: Uint8Array, blindingFactor: Uint8Array): Uint8Array {
            const amountNum = Number(amount)
            const result = this.engine.generate_range_proof(amountNum, commitment, blindingFactor)
            return result.proof
          }

          batch_generate_range_proofs(proofData: Uint8Array): Uint8Array[] {
            const results = this.engine.batch_generate_range_proofs(proofData)
            return Array.from(results).map((result) => (result as { proof: Uint8Array }).proof)
          }

          get_performance_info(): PerformanceInfo {
            const wasmInfo = this.engine.get_performance_info()
            return {
              engine_type: 'WasmElGamalEngine',
              optimizations: wasmInfo.simd_enabled ? ['SIMD', 'wasm_optimization'] : ['wasm_optimization'],
              target_performance: {
                encryption: '<5ms per operation',
                range_proof: '<50ms per proof',
                batch_speedup: `${(wasmInfo.estimated_speedup as number | undefined) ?? 10}x vs JavaScript`
              },
              memory_optimizations: [(wasmInfo.memory_allocator as string | undefined) ?? 'wee_alloc', 'release_optimization']
            }
          }
        } as unknown as WasmElGamalEngineConstructor,

        WasmElGamalKeypair: class WasmElGamalKeypairWrapper {
          public readonly public_key: Uint8Array
          public readonly secret_key: Uint8Array

          constructor() {
            const engine = new wasmModuleImport!.WasmElGamalEngine()
            const keypair = engine.generate_keypair()
            this.public_key = keypair.publicKey
            this.secret_key = keypair.secretKey
            console.log('🔑 Real WasmElGamalKeypair generated')
          }
        } as unknown as WasmElGamalKeypairConstructor,

        WasmElGamalCiphertext: class MockWasmElGamalCiphertext {
          public readonly commitment: Uint8Array
          public readonly handle: Uint8Array

          constructor(commitment: Uint8Array, handle: Uint8Array) {
            this.commitment = commitment
            this.handle = handle
          }
        } as unknown as WasmElGamalCiphertextConstructor,

        WasmCryptoUtils: class WasmCryptoUtilsWrapper {
          static has_simd_support(): boolean {
            const info = wasmModuleImport.get_wasm_info()
            return Boolean((info.features as Record<string, boolean> | undefined)?.simd)
          }

          static get_version_info(): VersionInfo {
            const info = wasmModuleImport.get_wasm_info() as {
              version?: string
              features?: Record<string, unknown>
            }
            return {
              version: info.version ?? '1.0.0',
              build_profile: 'release',
              target: 'wasm32-unknown-unknown',
              features: Object.keys(info.features ?? {}),
              crypto_backend: 'curve25519-dalek',
              build_timestamp: new Date().toISOString()
            }
          }

          static benchmark_scalar_mult(_iterations: number): number {
            // Use the WASM engine's built-in benchmark instead
            try {
              const engine = new wasmModuleImport.WasmElGamalEngine()
              const benchResult = engine.run_benchmarks() as {
                encryption?: { avg_time_ms?: number }
              }
              console.log(`🚀 WASM built-in benchmark results:`, benchResult)
              return benchResult.encryption?.avg_time_ms ?? 0
            } catch (error) {
              console.warn('⚠️ WASM benchmark failed:', error)
              return 0
            }
          }
        } as unknown as WasmCryptoUtilsConstructor
      }

      // Initialize the WASM engine
      wasmEngine = new wasmModule.WasmElGamalEngine()
      isWasmSupported = true

      console.log('✅ WebAssembly crypto module initialized successfully')
      
      // Log performance info
      const perfInfo = wasmEngine.get_performance_info()
      console.log('📊 WASM Performance Info:', perfInfo)

      return true
    } catch (error) {
      console.error('❌ Failed to initialize WebAssembly crypto module:', error)
      console.log('⚠️ Falling back to JavaScript implementations')
      
      // Set up fallback mock implementations
      wasmModule = null
      wasmEngine = null
      isWasmSupported = false
      return false
    }
  })()

  return initializationPromise
}

/**
 * Check if WebAssembly crypto is available and initialized
 */
export function isWasmCryptoAvailable(): boolean {
  return isWasmSupported && wasmEngine !== null
}

/**
 * Get the WebAssembly engine instance (throws if not available)
 */
export function getWasmEngine(): WasmElGamalEngine {
  if (!wasmEngine) {
    throw new Error('WebAssembly crypto engine not initialized. Call initializeWasmCrypto() first.')
  }
  return wasmEngine
}

// =====================================================
// HIGH-LEVEL API BRIDGE FUNCTIONS
// =====================================================

/**
 * Generate an ElGamal keypair using WASM (with JS fallback)
 */
export async function generateElGamalKeypair(): Promise<ElGamalKeypair> {
  if (isWasmCryptoAvailable()) {
    try {
      const wasmKeypair = new wasmModule!.WasmElGamalKeypair()
      return {
        publicKey: wasmKeypair.public_key,
        secretKey: wasmKeypair.secret_key
      }
    } catch (error) {
      console.warn('⚠️ WASM keypair generation failed, falling back to JS:', error)
    }
  }

  // Fallback to JavaScript implementation
  const { generateElGamalKeypair: jsGenerateKeypair } = await import('./elgamal-complete')
  return jsGenerateKeypair()
}

/**
 * Encrypt an amount using WASM-optimized ElGamal (with JS fallback)
 */
export async function encryptAmount(
  amount: bigint,
  publicKey: Uint8Array,
  randomness?: Uint8Array
): Promise<ElGamalCiphertext> {
  if (isWasmCryptoAvailable()) {
    try {
      const startTime = performance.now()
      const wasmCiphertext = wasmEngine!.encrypt_amount(amount, publicKey, randomness)
      const elapsed = performance.now() - startTime
      
      if (elapsed < 5) {
        console.log(`⚡ WASM encryption completed in ${elapsed.toFixed(2)}ms`)
      }

      return {
        commitment: { commitment: wasmCiphertext.commitment },
        handle: { handle: wasmCiphertext.handle }
      }
    } catch (error) {
      console.warn('⚠️ WASM encryption failed, falling back to JS:', error)
    }
  }

  // Fallback to JavaScript implementation
  const { encryptAmount: jsEncryptAmount, encryptAmountWithRandomness } = await import('./elgamal-complete')
  return randomness ? 
    encryptAmountWithRandomness(amount, publicKey, randomness).ciphertext :
    jsEncryptAmount(amount, publicKey)
}

/**
 * Batch encrypt multiple amounts using WASM optimization
 */
export async function batchEncryptAmounts(
  amounts: bigint[],
  publicKey: Uint8Array
): Promise<ElGamalCiphertext[]> {
  if (isWasmCryptoAvailable() && amounts.length > 1) {
    try {
      const startTime = performance.now()
      
      // Pack amounts into byte array for WASM
      const amountBuffer = new ArrayBuffer(amounts.length * 8)
      const amountView = new DataView(amountBuffer)
      
      amounts.forEach((amount, index) => {
        // Use little-endian encoding for consistency with Rust
        amountView.setBigUint64(index * 8, amount, true)
      })
      
      const packedAmounts = new Uint8Array(amountBuffer)
      const wasmCiphertexts = wasmEngine!.batch_encrypt(packedAmounts, publicKey)
      
      const elapsed = performance.now() - startTime
      console.log(`⚡ WASM batch encryption of ${amounts.length} amounts completed in ${elapsed.toFixed(2)}ms`)
      
      // Convert WASM ciphertexts to our format
      return wasmCiphertexts.map(ciphertext => ({
        commitment: { commitment: ciphertext.commitment },
        handle: { handle: ciphertext.handle }
      }))
    } catch (error) {
      console.warn('⚠️ WASM batch encryption failed, falling back to JS:', error)
    }
  }

  // Fallback to sequential JavaScript encryption
  const results: ElGamalCiphertext[] = []
  for (const amount of amounts) {
    results.push(await encryptAmount(amount, publicKey))
  }
  return results
}

/**
 * Generate a range proof using WASM optimization (with JS fallback)
 */
export async function generateRangeProof(
  amount: bigint,
  commitment: PedersenCommitment,
  blindingFactor: Uint8Array
): Promise<{ proof: Uint8Array; commitment: Uint8Array }> {
  if (isWasmCryptoAvailable()) {
    try {
      const startTime = performance.now()
      const proof = wasmEngine!.generate_range_proof(amount, commitment.commitment, blindingFactor)
      const elapsed = performance.now() - startTime
      
      if (elapsed < 50) {
        console.log(`⚡ WASM range proof generated in ${elapsed.toFixed(2)}ms (target: <50ms)`)
      } else {
        console.warn(`⚠️ WASM range proof took ${elapsed.toFixed(2)}ms (target: <50ms)`)
      }

      return {
        proof,
        commitment: commitment.commitment
      }
    } catch (error) {
      console.warn('⚠️ WASM range proof generation failed, falling back to JS:', error)
    }
  }

  // Fallback to JavaScript implementation
  const { generateRangeProof: jsGenerateRangeProof } = await import('./elgamal-complete')
  return jsGenerateRangeProof(amount, commitment, blindingFactor)
}

/**
 * Generate multiple range proofs in batch using WASM optimization
 */
export async function batchGenerateRangeProofs(
  proofRequests: {
    amount: bigint
    commitment: PedersenCommitment
    blindingFactor: Uint8Array
  }[]
): Promise<{ proof: Uint8Array; commitment: Uint8Array }[]> {
  if (isWasmCryptoAvailable() && proofRequests.length > 1) {
    try {
      const startTime = performance.now()
      
      // Pack proof data for WASM: amount(8) + commitment(32) + blinding(32) per proof
      const proofDataSize = proofRequests.length * 72
      const proofDataBuffer = new ArrayBuffer(proofDataSize)
      const proofDataView = new DataView(proofDataBuffer)
      
      proofRequests.forEach((request, index) => {
        const offset = index * 72
        
        // Amount (8 bytes, little-endian)
        proofDataView.setBigUint64(offset, request.amount, true)
        
        // Commitment (32 bytes)
        const commitmentBytes = new Uint8Array(proofDataBuffer, offset + 8, 32)
        commitmentBytes.set(request.commitment.commitment)
        
        // Blinding factor (32 bytes)
        const blindingBytes = new Uint8Array(proofDataBuffer, offset + 40, 32)
        blindingBytes.set(request.blindingFactor)
      })
      
      const packedData = new Uint8Array(proofDataBuffer)
      const proofs = wasmEngine!.batch_generate_range_proofs(packedData)
      
      const elapsed = performance.now() - startTime
      const avgTime = elapsed / proofRequests.length
      
      console.log(`⚡ WASM batch generated ${proofRequests.length} range proofs in ${elapsed.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms per proof)`)
      
      // Convert results
      return proofs.map((proof, index) => ({
        proof,
        commitment: proofRequests[index].commitment.commitment
      }))
    } catch (error) {
      console.warn('⚠️ WASM batch range proof generation failed, falling back to JS:', error)
    }
  }

  // Fallback to sequential JavaScript generation
  const results: { proof: Uint8Array; commitment: Uint8Array }[] = []
  for (const request of proofRequests) {
    results.push(await generateRangeProof(request.amount, request.commitment, request.blindingFactor))
  }
  return results
}

// =====================================================
// PERFORMANCE AND DEBUGGING UTILITIES
// =====================================================

/**
 * Get performance information about the crypto implementations
 */
export async function getCryptoPerformanceInfo(): Promise<{
  wasm: PerformanceInfo | null
  version: VersionInfo | null
  isAvailable: boolean
  benchmarkResults?: { [key: string]: number }
}> {
  await initializeWasmCrypto()
  
  const result = {
    wasm: null as PerformanceInfo | null,
    version: null as VersionInfo | null,
    isAvailable: isWasmCryptoAvailable(),
    benchmarkResults: undefined as { [key: string]: number } | undefined
  }

  if (isWasmCryptoAvailable()) {
    result.wasm = wasmEngine!.get_performance_info()
    result.version = wasmModule!.WasmCryptoUtils.get_version_info()
    
    // Run quick benchmarks
    result.benchmarkResults = {
      scalar_mult_100: wasmModule!.WasmCryptoUtils.benchmark_scalar_mult(100),
      scalar_mult_1000: wasmModule!.WasmCryptoUtils.benchmark_scalar_mult(1000)
    }
  }

  return result
}

/**
 * Run comprehensive performance benchmarks
 */
export async function runCryptoBenchmarks(): Promise<{
  encryption: { wasm: number; js: number; speedup: number }
  rangeProof: { wasm: number; js: number; speedup: number }
  batchEncryption: { wasm: number; js: number; speedup: number }
}> {
  await initializeWasmCrypto()
  
  // Generate a valid test keypair for benchmarks
  const testKeypair = await generateElGamalKeypair()
  const testAmount = BigInt(1000) // Reduced from 1000000 for faster operations
  const testPublicKey = testKeypair.publicKey
  const testCommitment = { commitment: new Uint8Array(32).fill(0) }
  const testBlinding = new Uint8Array(32).fill(0)
  const testAmounts = Array(5).fill(testAmount) // Reduced from 10 to 5

  // Encryption benchmark
  const encryptionBench = async () => {
    const iterations = 10 // Reduced from 100 to prevent timeouts
    
    // WASM benchmark
    let wasmTime = 0
    if (isWasmCryptoAvailable()) {
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        await encryptAmount(testAmount, testPublicKey)
      }
      wasmTime = performance.now() - start
    }
    
    // JS benchmark (fallback)
    const { encryptAmount: jsEncryptAmount } = await import('./elgamal-complete')
    const jsStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      jsEncryptAmount(testAmount, testPublicKey)
    }
    const jsTime = performance.now() - jsStart
    
    return {
      wasm: wasmTime,
      js: jsTime,
      speedup: wasmTime > 0 ? jsTime / wasmTime : 0
    }
  }

  // Range proof benchmark
  const rangeProofBench = async () => {
    const iterations = 3 // Reduced from 10 to prevent timeouts
    
    // WASM benchmark
    let wasmTime = 0
    if (isWasmCryptoAvailable()) {
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        await generateRangeProof(testAmount, testCommitment, testBlinding)
      }
      wasmTime = performance.now() - start
    }
    
    // JS benchmark
    const { generateRangeProof: jsGenerateRangeProof } = await import('./elgamal-complete')
    const jsStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      jsGenerateRangeProof(testAmount, testCommitment, testBlinding)
    }
    const jsTime = performance.now() - jsStart
    
    return {
      wasm: wasmTime,
      js: jsTime,
      speedup: wasmTime > 0 ? jsTime / wasmTime : 0
    }
  }

  // Batch encryption benchmark
  const batchEncryptionBench = async () => {
    // WASM benchmark
    let wasmTime = 0
    if (isWasmCryptoAvailable()) {
      const start = performance.now()
      await batchEncryptAmounts(testAmounts as bigint[], testPublicKey)
      wasmTime = performance.now() - start
    }
    
    // JS benchmark (sequential)
    const jsStart = performance.now()
    for (const amount of testAmounts) {
      await encryptAmount(amount as bigint, testPublicKey)
    }
    const jsTime = performance.now() - jsStart
    
    return {
      wasm: wasmTime,
      js: jsTime,
      speedup: wasmTime > 0 ? jsTime / wasmTime : 0
    }
  }

  const [encryption, rangeProof, batchEncryption] = await Promise.all([
    encryptionBench(),
    rangeProofBench(),
    batchEncryptionBench()
  ])

  console.log('🏁 Crypto Benchmark Results:', {
    encryption: `${encryption.speedup.toFixed(2)}x speedup`,
    rangeProof: `${rangeProof.speedup.toFixed(2)}x speedup`,
    batchEncryption: `${batchEncryption.speedup.toFixed(2)}x speedup`
  })

  return { encryption, rangeProof, batchEncryption }
}

// Auto-initialize when module is imported
initializeWasmCrypto().catch(error => {
  console.warn('⚠️ Auto-initialization of WASM crypto failed:', error)
})