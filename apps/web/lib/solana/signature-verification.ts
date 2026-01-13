/**
 * Solana Wallet Signature Verification
 *
 * Utilities for verifying wallet ownership via message signing.
 * Compatible with Solana Web3.js v5 and modern wallet standards.
 */

import { address, Address } from '@solana/addresses'
import * as nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Standard message format for wallet ownership proof
 */
export interface SignatureVerificationMessage {
  action: string
  timestamp: number
  agentAddress: string
  nonce?: string
}

/**
 * Verify a signed message from a Solana wallet
 *
 * @param message - The original message object that was signed
 * @param signature - Base58-encoded signature from wallet
 * @param expectedSigner - Expected signer's wallet address
 * @returns true if signature is valid and matches expected signer
 */
export function verifyWalletSignature(
  message: SignatureVerificationMessage,
  signature: string,
  expectedSigner: Address | string
): boolean {
  try {
    // Normalize address
    const signerAddress = typeof expectedSigner === 'string'
      ? address(expectedSigner)
      : expectedSigner

    // Convert message to bytes (must match client-side encoding)
    const messageString = JSON.stringify(message)
    const messageBytes = new TextEncoder().encode(messageString)

    // Decode signature from base58
    const signatureBytes = bs58.decode(signature)

    // Decode public key from base58 address
    const publicKeyBytes = bs58.decode(signerAddress)

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    )

    return isValid
  } catch (error) {
    console.error('[Signature Verification] Error:', error)
    return false
  }
}

/**
 * Create a message for the user to sign
 *
 * @param action - The action being performed (e.g., 'claim_agent', 'register_agent')
 * @param agentAddress - The agent address being claimed/registered
 * @param nonce - Optional nonce for replay protection
 * @returns Message object to be signed by wallet
 */
export function createVerificationMessage(
  action: string,
  agentAddress: string,
  nonce?: string
): SignatureVerificationMessage {
  return {
    action,
    timestamp: Date.now(),
    agentAddress,
    nonce: nonce || crypto.randomUUID(),
  }
}

/**
 * Check if a signature is expired (older than 5 minutes)
 *
 * @param message - The signed message
 * @returns true if signature is expired
 */
export function isSignatureExpired(
  message: SignatureVerificationMessage,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  const age = Date.now() - message.timestamp
  return age > maxAgeMs
}

/**
 * Validate message format
 */
export function validateMessageFormat(
  message: unknown
): message is SignatureVerificationMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }

  const msg = message as Record<string, unknown>

  return (
    typeof msg.action === 'string' &&
    typeof msg.timestamp === 'number' &&
    typeof msg.agentAddress === 'string' &&
    (msg.nonce === undefined || typeof msg.nonce === 'string')
  )
}

/**
 * High-level verification function that checks signature, expiration, and format
 *
 * @param message - The message object
 * @param signature - Base58-encoded signature
 * @param expectedSigner - Expected signer address
 * @returns Verification result with detailed error message
 */
export function verifyClaimSignature(
  message: unknown,
  signature: string,
  expectedSigner: Address | string
): { valid: boolean; error?: string } {
  // Validate message format
  if (!validateMessageFormat(message)) {
    return { valid: false, error: 'Invalid message format' }
  }

  // Check expiration
  if (isSignatureExpired(message)) {
    return { valid: false, error: 'Signature expired (max age: 5 minutes)' }
  }

  // Verify signature
  const isValid = verifyWalletSignature(message, signature, expectedSigner)

  if (!isValid) {
    return { valid: false, error: 'Invalid signature' }
  }

  return { valid: true }
}
