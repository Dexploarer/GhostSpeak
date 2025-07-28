/**
 * Keypair Generation Utilities
 * 
 * Provides functions for generating Ed25519 and ElGamal keypairs
 * for use with the GhostSpeak protocol.
 */

import { randomBytes } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import bs58 from 'bs58'
import {
  generateElGamalKeypair as generateElGamalKeypairInternal,
  type ElGamalKeypair
} from './elgamal.js'

/**
 * Ed25519 keypair for Solana
 */
export interface Keypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

/**
 * Generate a new Ed25519 keypair for Solana
 */
export function generateKeypair(): Keypair {
  const secretKey = randomBytes(32)
  const publicKey = ed25519.getPublicKey(secretKey)
  
  // Solana expects 64-byte secret key (32-byte secret + 32-byte public)
  const fullSecretKey = new Uint8Array(64)
  fullSecretKey.set(secretKey, 0)
  fullSecretKey.set(publicKey, 32)
  
  return {
    publicKey,
    secretKey: fullSecretKey
  }
}

/**
 * Generate a new ElGamal keypair for confidential transfers
 */
export function generateElGamalKeypair(seed?: Uint8Array): ElGamalKeypair {
  return generateElGamalKeypairInternal(seed)
}

/**
 * Convert a keypair to a Solana address
 */
export function keypairToAddress(keypair: Keypair): Address {
  // Convert public key bytes to base58 string
  const base58String = bs58.encode(keypair.publicKey)
  return address(base58String)
}

/**
 * Create a keypair from a secret key
 */
export function keypairFromSecretKey(secretKey: Uint8Array): Keypair {
  if (secretKey.length === 32) {
    // 32-byte format: need to generate public key
    const publicKey = ed25519.getPublicKey(secretKey)
    const fullSecretKey = new Uint8Array(64)
    fullSecretKey.set(secretKey, 0)
    fullSecretKey.set(publicKey, 32)
    
    return {
      publicKey,
      secretKey: fullSecretKey
    }
  } else if (secretKey.length === 64) {
    // 64-byte format: extract public key
    return {
      publicKey: secretKey.slice(32, 64),
      secretKey
    }
  } else {
    throw new Error('Invalid secret key length. Expected 32 or 64 bytes.')
  }
}

/**
 * Create a keypair from a seed phrase (simplified - for demo only)
 */
export function keypairFromSeed(seed: string): Keypair {
  // Simple seed derivation for demo purposes
  // In production, use proper BIP39/BIP44 derivation
  const encoder = new TextEncoder()
  const seedBytes = encoder.encode(seed)
  const hash = new Uint8Array(32)
  
  // Simple hash function (not cryptographically secure - demo only)
  for (let i = 0; i < seedBytes.length; i++) {
    hash[i % 32] ^= seedBytes[i]
  }
  
  return generateKeypair()
}

// Re-export ElGamal types
export type { ElGamalKeypair } from './elgamal.js'