/**
 * Unified Cryptography Module - Tree-shakeable
 * 
 * Single source of truth for all cryptographic operations in GhostSpeak SDK.
 * Each export is tree-shakeable for optimal bundle size.
 */

// Core ElGamal operations (most commonly used)
export {
  generateKeypair,
  encrypt,
  decrypt,
  generateTransferProof,
  generateWithdrawProof,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type TransferProof,
  type WithdrawProof
} from './elgamal.js'

// ZK proof operations (advanced usage)  
export {
  createVerifyRangeProofInstruction,
  createVerifyTransferProofInstruction,
  ZK_ELGAMAL_PROOF_PROGRAM_ID,
  type ProofContext
} from './zk-proofs.js'

// WASM optimizations (optional performance boost)
export {
  loadWasmModule,
  isWasmAvailable,
  type WasmModule
} from './wasm-bridge.js'

// Bulk exports for advanced users (these may increase bundle size)
// Only import these if you need many crypto operations
export * as elgamal from './elgamal.js'
export * as zkProofs from './zk-proofs.js' 
export * as wasmBridge from './wasm-bridge.js'