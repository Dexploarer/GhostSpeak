/**
 * WASM Bridge for Cryptographic Operations
 * 
 * Optional performance optimization layer that loads WASM modules
 * for compute-intensive cryptographic operations.
 */

// =====================================================
// TYPES
// =====================================================

export interface WasmModule {
  generate_range_proof: (
    value: string,
    commitment: Uint8Array,
    randomness: Uint8Array
  ) => Promise<Uint8Array>
  
  generate_validity_proof: (
    publicKey: Uint8Array,
    commitment: Uint8Array,
    handle: Uint8Array,
    randomness: Uint8Array
  ) => Promise<Uint8Array>
  
  generate_equality_proof: (
    sourceCommitment: Uint8Array,
    destCommitment: Uint8Array,
    amount: string,
    sourceRandomness: Uint8Array,
    destRandomness: Uint8Array
  ) => Promise<Uint8Array>
  
  generate_withdraw_proof: (
    balance: string,
    secretKey: Uint8Array,
    commitment: Uint8Array,
    handle: Uint8Array
  ) => Promise<Uint8Array>
  
  scalar_multiply: (
    point: Uint8Array,
    scalar: Uint8Array
  ) => Uint8Array
  
  point_add: (
    point1: Uint8Array,
    point2: Uint8Array
  ) => Uint8Array
  
  point_subtract: (
    point1: Uint8Array,
    point2: Uint8Array
  ) => Uint8Array
}

// =====================================================
// WASM LOADER
// =====================================================

let wasmModule: WasmModule | null = null
let loadingPromise: Promise<void> | null = null

/**
 * Load WASM module for cryptographic operations
 */
export async function loadWasmModule(): Promise<void> {
  // Return if already loaded
  if (wasmModule) return
  
  // Return existing loading promise if in progress
  if (loadingPromise) return loadingPromise
  
  // Check if in browser environment
  if (typeof window === 'undefined') {
    console.log('⚠️ WASM only available in browser environment')
    return
  }
  
  loadingPromise = loadWasmModuleInternal()
  return loadingPromise
}

async function loadWasmModuleInternal(): Promise<void> {
  try {
    // Dynamic import of WASM module - check if it exists
    let wasmImport: unknown
    try {
      wasmImport = await import('../wasm/ghostspeak_wasm.js')
    } catch {
      throw new Error('WASM module not built')
    }
    
    // Type guard for WASM import
    if (!wasmImport || typeof wasmImport !== 'object') {
      throw new Error('Invalid WASM module import')
    }
    
    const wasmImportTyped = wasmImport as { default: () => Promise<void> }
    const initWasm = wasmImportTyped.default
    
    // Initialize WASM
    if (typeof initWasm === 'function') {
      await initWasm()
    } else {
      throw new Error('WASM init function not found')
    }
    
    // Store module reference
    wasmModule = wasmImportTyped as unknown as WasmModule
    
    // Store in global for ElGamal module access
    if (typeof window !== 'undefined') {
      (window as { ghostspeak_wasm?: WasmModule }).ghostspeak_wasm = wasmModule
    }
    
    console.log('✅ WASM module loaded successfully')
  } catch (error) {
    console.warn('⚠️ Failed to load WASM module:', error)
    wasmModule = null
  }
}

/**
 * Check if WASM module is available
 */
export function isWasmAvailable(): boolean {
  return wasmModule !== null
}

/**
 * Get WASM module instance
 */
export function getWasmModule(): WasmModule | null {
  return wasmModule
}

// =====================================================
// PERFORMANCE BENCHMARKING
// =====================================================

/**
 * Benchmark WASM vs JavaScript performance
 */
export async function benchmarkWasm(): Promise<{
  wasmTime: number
  jsTime: number
  speedup: number
} | null> {
  if (!isWasmAvailable()) {
    console.log('⚠️ WASM not available for benchmarking')
    return null
  }
  
  const iterations = 100
  const testData = new Uint8Array(32).fill(1)
  
  // Get performance API
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now()
  
  // Benchmark WASM
  const wasmStart = now()
  for (let i = 0; i < iterations; i++) {
    wasmModule!.scalar_multiply(testData, testData)
  }
  const wasmTime = now() - wasmStart
  
  // Benchmark JavaScript (using noble/curves)
  const { ed25519 } = await import('@noble/curves/ed25519')
  const jsStart = now()
  for (let i = 0; i < iterations; i++) {
    const point = ed25519.ExtendedPoint.BASE
    const scalar = BigInt('0x' + Buffer.from(testData).toString('hex'))
    point.multiply(scalar % ed25519.CURVE.n)
  }
  const jsTime = now() - jsStart
  
  const speedup = jsTime / wasmTime
  
  console.log(`📊 WASM Benchmark Results:`)
  console.log(`   WASM: ${wasmTime.toFixed(2)}ms`)
  console.log(`   JS: ${jsTime.toFixed(2)}ms`)
  console.log(`   Speedup: ${speedup.toFixed(2)}x`)
  
  return { wasmTime, jsTime, speedup }
}

// =====================================================
// FALLBACK HANDLERS
// =====================================================

/**
 * Create a function that falls back to JS if WASM fails
 */
export function createWasmFallback<T extends (...args: unknown[]) => unknown>(
  wasmFn: T | undefined,
  jsFallback: T
): T {
  return ((...args: Parameters<T>) => {
    if (wasmFn && isWasmAvailable()) {
      try {
        return wasmFn(...args) as ReturnType<T>
      } catch (error) {
        console.warn('⚠️ WASM call failed, using JS fallback:', error)
      }
    }
    return jsFallback(...args) as ReturnType<T>
  }) as T
}

// =====================================================
// AUTO-INITIALIZATION
// =====================================================

// Automatically try to load WASM when module is imported in browser
if (typeof window !== 'undefined') {
  // Use setTimeout to avoid blocking module loading
  setTimeout(() => {
    loadWasmModule().catch(error => {
      console.warn('⚠️ Background WASM loading failed:', error)
    })
  }, 0)
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  loadWasmModule,
  isWasmAvailable,
  getWasmModule,
  benchmarkWasm,
  createWasmFallback
}