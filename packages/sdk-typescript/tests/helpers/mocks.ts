/**
 * Mock Helpers for Testing
 * 
 * Provides mock implementations for external dependencies
 */

import { vi } from 'vitest'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type { ElGamalKeypair, ElGamalCiphertext } from '../../src/utils/elgamal-complete'

// Mock WASM module
export function mockWasmModule() {
  const mockEngine = {
    encrypt_amount: vi.fn().mockReturnValue({
      c1: new Uint8Array(32).fill(1),
      c2: new Uint8Array(32).fill(2)
    }),
    batch_encrypt: vi.fn().mockImplementation((amounts) => {
      // Return array matching the input length
      const numAmounts = amounts.length / 8 // Each amount is 8 bytes
      return Array(numAmounts).fill(null).map((_, i) => ({
        commitment: new Uint8Array(32).fill(1 + i),
        handle: new Uint8Array(32).fill(2 + i)
      }))
    }),
    batch_encrypt_amounts: vi.fn().mockImplementation((amounts) => {
      // Return array matching the input length
      const numAmounts = amounts.length / 8 // Each amount is 8 bytes
      return Array(numAmounts).fill(null).map((_, i) => ({
        c1: new Uint8Array(32).fill(1 + i),
        c2: new Uint8Array(32).fill(2 + i)
      }))
    }),
    generate_range_proof: vi.fn().mockReturnValue({
      proof: new Uint8Array(674).fill(0),
      commitment: new Uint8Array(32).fill(3)
    }),
    batch_generate_range_proofs: vi.fn().mockImplementation((proofData) => {
      // Estimate number of proofs based on input data size
      // Each proof request would typically be amount (8 bytes) + commitment (32 bytes) + blinding factor (32 bytes) = 72 bytes
      const numProofs = Math.max(1, Math.floor(proofData.length / 72))
      return Array(numProofs).fill(null).map((_, i) => ({
        proof: new Uint8Array(674).fill(i),
        commitment: new Uint8Array(32).fill(3 + i)
      }))
    }),
    get_performance_info: vi.fn().mockReturnValue({
      simd_enabled: true,
      estimated_speedup: 10,
      memory_allocator: 'wee_alloc'
    }),
    generate_keypair: vi.fn().mockReturnValue({
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(32).fill(2)
    }),
    run_benchmarks: vi.fn().mockReturnValue({
      encryption: { avg_time_ms: 0.5 },
      range_proof: { avg_time_ms: 5.0 }
    })
  }

  return {
    default: vi.fn().mockResolvedValue(undefined),
    WasmElGamalEngine: vi.fn().mockImplementation(function() {
      return mockEngine
    }),
    is_wasm_available: vi.fn().mockReturnValue(true),
    get_wasm_info: vi.fn().mockReturnValue({
      version: '1.0.0',
      features: { simd: true, threads: false }
    })
  }
}

// Mock browser environment
export function mockBrowserEnvironment(capabilities = {}) {
  const defaultCapabilities = {
    webAssembly: true,
    webAssemblySIMD: true,
    webAssemblyThreads: false,
    bigInt: true,
    textEncoding: true,
    cryptoRandom: true,
    performanceNow: true,
    workers: true,
    sharedArrayBuffer: false,
    browser: {
      name: 'Chrome',
      version: '120.0',
      engine: 'Blink'
    },
    performanceScore: 85
  }
  
  return { ...defaultCapabilities, ...capabilities }
}

// Mock ElGamal keypair
export function mockElGamalKeypair(): ElGamalKeypair {
  return {
    publicKey: new Uint8Array(32).fill(1),
    secretKey: new Uint8Array(32).fill(2)
  }
}

// Mock ElGamal ciphertext
export function mockElGamalCiphertext(): ElGamalCiphertext {
  return {
    commitment: { commitment: new Uint8Array(32).fill(3) },
    handle: { handle: new Uint8Array(32).fill(4) }
  }
}

// Mock range proof
export function mockRangeProof() {
  return {
    proof: new Uint8Array(674).fill(0),
    commitment: new Uint8Array(32).fill(5)
  }
}

// Mock proof data
export function mockProofData() {
  return {
    rangeProof: new Uint8Array(674).fill(0),
    validityProof: new Uint8Array(96).fill(1),
    equalityProof: new Uint8Array(192).fill(2)
  }
}

// Mock RPC response for account info
export function mockAccountInfo(data: Uint8Array, owner: Address) {
  return {
    data,
    executable: false,
    lamports: 1000000,
    owner,
    rentEpoch: 0
  }
}

// Mock transaction result
export function mockTransactionResult(success = true) {
  return {
    value: {
      err: success ? null : { InstructionError: [0, 'Custom'] },
      logs: success ? ['Program log: Success'] : ['Program log: Error']
    }
  }
}

// Mock performance API
export function mockPerformanceAPI() {
  let time = 0
  
  return {
    now: vi.fn(() => {
      time += 10 // Increment by 10ms each call
      return time
    }),
    reset: () => { time = 0 }
  }
}

// Mock crypto API
export function mockCryptoAPI() {
  return {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
  }
}

// Mock fetch for WASM module loading
export function mockFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
  })
}

// Mock WebAssembly API
export function mockWebAssembly() {
  return {
    instantiate: vi.fn().mockResolvedValue({
      instance: {
        exports: mockWasmModule()
      }
    }),
    compile: vi.fn().mockResolvedValue({})
  }
}