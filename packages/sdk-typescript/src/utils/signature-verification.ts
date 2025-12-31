/**
 * Agent Authorization Signature Verification
 *
 * Ed25519 signature creation and verification for GhostSpeak's
 * trustless agent pre-authorization system.
 *
 * Enables verifiable delegation of reputation update authority.
 */

import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type {
  ReputationAuthorization,
  AuthorizationMessage,
  CreateAuthorizationParams,
  SolanaNetwork,
} from '../types/authorization/authorization-types'
import bs58 from 'bs58'

/**
 * Keypair interface for Ed25519 signing operations
 * Compatible with both legacy and modern Solana key formats
 */
export interface SigningKeypair {
  publicKey: {
    toBase58(): string
    toBytes(): Uint8Array
  }
  secretKey: Uint8Array
}

/**
 * Authorization message domain separator
 * Prevents signature reuse across different protocols
 */
const DOMAIN_SEPARATOR = 'GhostSpeak Reputation Authorization'

/**
 * Create authorization message for signing
 *
 * Message format:
 * - Domain separator (prevents cross-protocol replay)
 * - Agent address (32 bytes)
 * - Authorized source (32 bytes)
 * - Index limit (8 bytes, u64 big-endian)
 * - Expiration timestamp (8 bytes, u64 big-endian)
 * - Network string (variable length)
 * - Nonce (optional, 32 bytes if present)
 *
 * @param message - Authorization message parameters
 * @returns Buffer ready for signing
 */
export function createAuthorizationMessage(message: AuthorizationMessage): Buffer {
  const components: Buffer[] = []

  // 1. Domain separator
  components.push(Buffer.from(DOMAIN_SEPARATOR, 'utf8'))

  // 2. Agent address (32 bytes)
  const agentBytes = bs58.decode(message.agentAddress)
  components.push(Buffer.from(agentBytes))

  // 3. Authorized source (32 bytes)
  const sourceBytes = bs58.decode(message.authorizedSource)
  components.push(Buffer.from(sourceBytes))

  // 4. Index limit (8 bytes, u64 big-endian)
  const indexLimitBuffer = Buffer.allocUnsafe(8)
  indexLimitBuffer.writeBigUInt64BE(BigInt(message.indexLimit))
  components.push(indexLimitBuffer)

  // 5. Expiration timestamp (8 bytes, u64 big-endian)
  const expiresAtBuffer = Buffer.allocUnsafe(8)
  expiresAtBuffer.writeBigUInt64BE(BigInt(message.expiresAt))
  components.push(expiresAtBuffer)

  // 6. Network string
  components.push(Buffer.from(message.network, 'utf8'))

  // 7. Nonce (optional, 32 bytes)
  if (message.nonce) {
    components.push(Buffer.from(message.nonce, 'utf8'))
  }

  return Buffer.concat(components)
}

/**
 * Sign authorization message with agent's private key
 *
 * @param message - Authorization message to sign
 * @param agentKeypair - Agent's keypair (must match message.agentAddress)
 * @returns Ed25519 signature (64 bytes)
 */
export async function signAuthorizationMessage(
  message: AuthorizationMessage,
  agentKeypair: SigningKeypair
): Promise<Uint8Array> {
  // Verify keypair matches agent address
  const keypairAddress = agentKeypair.publicKey.toBase58()
  if (keypairAddress !== message.agentAddress) {
    throw new Error(
      `Keypair public key ${keypairAddress} does not match agent address ${message.agentAddress}`
    )
  }

  // Create message buffer
  const messageBuffer = createAuthorizationMessage(message)

  // Sign with Ed25519
  const nacl = await import('tweetnacl')
  const signature = nacl.sign.detached(messageBuffer, agentKeypair.secretKey)

  return signature
}

/**
 * Verify authorization signature
 *
 * @param authorization - Authorization to verify
 * @returns True if signature is valid
 */
export async function verifyAuthorizationSignature(
  authorization: ReputationAuthorization
): Promise<boolean> {
  try {
    // Reconstruct message
    const message: AuthorizationMessage = {
      agentAddress: authorization.agentAddress,
      authorizedSource: authorization.authorizedSource,
      indexLimit: authorization.indexLimit,
      expiresAt: authorization.expiresAt,
      network: authorization.network,
      nonce: authorization.nonce,
    }

    const messageBuffer = createAuthorizationMessage(message)

    // Verify signature
    const nacl = await import('tweetnacl')
    const agentPubkeyBytes = bs58.decode(authorization.agentAddress)
    const isValid = nacl.sign.detached.verify(
      messageBuffer,
      authorization.signature,
      agentPubkeyBytes
    )

    return isValid
  } catch (error) {
    console.error('[Auth Signature] Verification failed:', error)
    return false
  }
}

/**
 * Create a complete authorization with signature
 *
 * @param params - Authorization parameters
 * @param agentKeypair - Agent's keypair for signing
 * @returns Complete signed authorization
 */
export async function createSignedAuthorization(
  params: CreateAuthorizationParams,
  agentKeypair: SigningKeypair
): Promise<ReputationAuthorization> {
  // Get agent address from keypair
  const agentAddress = address(agentKeypair.publicKey.toBase58())

  // Calculate expiration
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = params.expiresAt || now + (params.expiresIn || 30 * 24 * 60 * 60) // Default 30 days

  // Default index limit
  const indexLimit = params.indexLimit || 1000

  // Default network (would need to be passed or detected from cluster)
  const network: SolanaNetwork = params.network || 'devnet'

  // Use "default" nonce if not provided to avoid PDA seed length issues (64-char hex exceeds 32-byte limit)
  // Note: This matches Rust's unwrap_or(&String::from("default")) behavior
  const nonce = params.nonce !== undefined ? params.nonce : "default"

  // Create message
  const message: AuthorizationMessage = {
    agentAddress,
    authorizedSource: params.authorizedSource,
    indexLimit,
    expiresAt,
    network,
    nonce,
  }

  // Sign message
  const signature = await signAuthorizationMessage(message, agentKeypair)

  // Return complete authorization
  const authorization: ReputationAuthorization = {
    agentAddress,
    authorizedSource: params.authorizedSource,
    indexLimit,
    expiresAt,
    network,
    signature,
    nonce,
    metadata: params.metadata,
  }

  return authorization
}

/**
 * Generate a random nonce for replay protection
 *
 * @returns 32-byte random nonce as hex string
 */
export function generateNonce(): string {
  // Use global crypto if available (browser/modern Node.js)
  if (globalThis.crypto) {
    const buffer = new Uint8Array(32)
    globalThis.crypto.getRandomValues(buffer)
    return Buffer.from(buffer).toString('hex')
  }

  // Fallback for Node.js < 19 (though we require Node 24+)
  // This branch should rarely execute but provides compatibility
  const nodeCrypto = eval('require')('crypto')
  const buffer = new Uint8Array(32)
  nodeCrypto.webcrypto.getRandomValues(buffer)
  return Buffer.from(buffer).toString('hex')
}

/**
 * Serialize authorization to JSON-safe format
 *
 * @param authorization - Authorization to serialize
 * @returns JSON-safe object (signature as base58)
 */
export function serializeAuthorization(authorization: ReputationAuthorization): {
  agentAddress: string
  authorizedSource: string
  indexLimit: number
  expiresAt: number
  network: SolanaNetwork
  signature: string
  nonce?: string
  metadata?: any
} {
  return {
    agentAddress: authorization.agentAddress,
    authorizedSource: authorization.authorizedSource,
    indexLimit: authorization.indexLimit,
    expiresAt: authorization.expiresAt,
    network: authorization.network,
    signature: bs58.encode(authorization.signature),
    nonce: authorization.nonce,
    metadata: authorization.metadata,
  }
}

/**
 * Deserialize authorization from JSON format
 *
 * @param data - Serialized authorization data
 * @returns ReputationAuthorization with Uint8Array signature
 */
export function deserializeAuthorization(data: {
  agentAddress: string
  authorizedSource: string
  indexLimit: number
  expiresAt: number
  network: SolanaNetwork
  signature: string
  nonce?: string
  metadata?: any
}): ReputationAuthorization {
  return {
    agentAddress: data.agentAddress as Address,
    authorizedSource: data.authorizedSource as Address,
    indexLimit: data.indexLimit,
    expiresAt: data.expiresAt,
    network: data.network,
    signature: bs58.decode(data.signature),
    nonce: data.nonce,
    metadata: data.metadata,
  }
}

/**
 * Get authorization ID (deterministic hash)
 *
 * @param authorization - Authorization to hash
 * @returns Base58-encoded SHA-256 hash
 */
export async function getAuthorizationId(authorization: ReputationAuthorization): Promise<string> {
  const serialized = serializeAuthorization(authorization)
  const json = JSON.stringify(serialized)
  const encoder = new TextEncoder()
  const data = encoder.encode(json)

  // Use global crypto if available
  let crypto: Crypto
  if (globalThis.crypto) {
    crypto = globalThis.crypto
  } else {
    // Fallback for Node.js < 19
    const nodeCrypto = eval('require')('crypto')
    crypto = nodeCrypto.webcrypto as Crypto
  }

  // SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)

  return bs58.encode(hashArray)
}

/**
 * Check if authorization is expired
 *
 * @param authorization - Authorization to check
 * @param currentTime - Current Unix timestamp (defaults to now)
 * @returns True if expired
 */
export function isAuthorizationExpired(
  authorization: ReputationAuthorization,
  currentTime?: number
): boolean {
  const now = currentTime || Math.floor(Date.now() / 1000)
  return now >= authorization.expiresAt
}

/**
 * Check if authorization has exceeded index limit
 *
 * @param authorization - Authorization to check
 * @param currentIndex - Current usage count
 * @returns True if exhausted
 */
export function isAuthorizationExhausted(
  authorization: ReputationAuthorization,
  currentIndex: number
): boolean {
  return currentIndex >= authorization.indexLimit
}

/**
 * Validate authorization network matches expected
 *
 * @param authorization - Authorization to check
 * @param expectedNetwork - Expected network
 * @returns True if networks match
 */
export function validateAuthorizationNetwork(
  authorization: ReputationAuthorization,
  expectedNetwork: SolanaNetwork
): boolean {
  return authorization.network === expectedNetwork
}
