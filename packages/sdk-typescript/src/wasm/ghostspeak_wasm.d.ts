/**
 * Type declarations for WASM module
 * This module may not exist if WASM is not built
 */

declare module '../wasm/ghostspeak_wasm.js' {
  export default function init(): Promise<void>;
  
  // ElGamal functions
  export function elgamal_encrypt(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  export function elgamal_decrypt(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function elgamal_generate_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
  
  // Bulletproof functions
  export function bulletproof_prove(value: bigint, blinding: Uint8Array): Uint8Array;
  export function bulletproof_verify(proof: Uint8Array, commitment: Uint8Array): boolean;
  
  // ZK proof functions
  export function zk_prove_range(value: bigint, min: bigint, max: bigint): Uint8Array;
  export function zk_verify_range(proof: Uint8Array, commitment: Uint8Array): boolean;
}

// Export types for the JS file compatibility
export default function init(): Promise<void>;
export function elgamal_encrypt(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
export function elgamal_decrypt(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array;
export function elgamal_generate_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
export function bulletproof_prove(value: bigint, blinding: Uint8Array): Uint8Array;
export function bulletproof_verify(proof: Uint8Array, commitment: Uint8Array): boolean;
export function zk_prove_range(value: bigint, min: bigint, max: bigint): Uint8Array;
export function zk_verify_range(proof: Uint8Array, commitment: Uint8Array): boolean;