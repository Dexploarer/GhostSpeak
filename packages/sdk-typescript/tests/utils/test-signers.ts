/**
 * Test Utilities - Transaction Signer Conversions
 *
 * Utilities for converting between different signer formats in tests
 */

import { Keypair } from '@solana/web3.js'
import type { TransactionSigner } from '@solana/kit'
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/signers'
import { readFileSync } from 'fs'
import { homedir } from 'os'

/**
 * Convert web3.js Keypair to @solana/kit TransactionSigner
 *
 * Uses @solana/signers's createKeyPairSignerFromPrivateKeyBytes which properly
 * implements the TransactionPartialSigner interface with correct signature dictionaries.
 *
 * @param keypair - web3.js Keypair
 * @returns Promise<TransactionSigner> compatible with @solana/kit
 */
export async function keypairToTransactionSigner(keypair: Keypair): Promise<TransactionSigner> {
  // web3.js Keypair.secretKey is 64 bytes (32-byte private key + 32-byte public key)
  // @solana/signers expects only the 32-byte private key
  const privateKeyBytes = keypair.secretKey.slice(0, 32)

  // @solana/signers can create a proper signer from the secret key bytes
  const signer = await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes, false)
  return signer as TransactionSigner
}

/**
 * Load Keypair from file system
 *
 * @param path - Path to keypair JSON file (supports ~ for home directory)
 * @returns Keypair loaded from file
 */
export function loadKeypairFromFile(path: string): Keypair {
  // Expand ~ to home directory
  const expandedPath = path.startsWith('~')
    ? path.replace('~', homedir())
    : path

  // Read and parse keypair file
  const keypairData = JSON.parse(readFileSync(expandedPath, 'utf-8'))

  // Keypair files are arrays of numbers (the secret key bytes)
  const secretKey = Uint8Array.from(keypairData)

  return Keypair.fromSecretKey(secretKey)
}

/**
 * Load funded devnet wallet from default Solana CLI location
 *
 * @returns Promise<TransactionSigner> for the default Solana CLI wallet
 */
export async function loadDevnetWallet(): Promise<TransactionSigner> {
  const keypair = loadKeypairFromFile('~/.config/solana/id.json')
  return await keypairToTransactionSigner(keypair)
}

/**
 * Load funded devnet wallet as Keypair (for signing authorizations)
 *
 * @returns Keypair for the default Solana CLI wallet
 */
export function loadDevnetKeypair(): Keypair {
  return loadKeypairFromFile('~/.config/solana/id.json')
}
