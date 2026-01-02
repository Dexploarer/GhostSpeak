/**
 * Solana Attestation Service (SAS) Helper
 *
 * Provides utilities for creating and managing SAS attestations for Ghost ownership claims.
 *
 * @module SASAttestationHelper
 */

import { address, type Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getUtf8Encoder
} from '@solana/kit'

/**
 * SAS Program ID (official Solana Foundation attestation service)
 */
export const SAS_PROGRAM_ID = address('22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG')

/**
 * Attestation PDA seed prefix
 */
export const ATTESTATION_SEED = 'attestation'

/**
 * Credential PDA seed prefix
 */
export const CREDENTIAL_SEED = 'credential'

/**
 * Schema PDA seed prefix
 */
export const SCHEMA_SEED = 'schema'

/**
 * GhostSpeak ownership credential configuration
 */
export interface GhostSpeakCredentialConfig {
  /** Credential issuer (typically the GhostSpeak program or a trusted authority) */
  issuer: Address
  /** Credential name */
  name: string
  /** Credential description */
  description: string
  /** Schema definition URI (JSON schema for attestation data) */
  schemaUri: string
}

/**
 * SAS Attestation data for Ghost ownership
 */
export interface GhostOwnershipAttestationData {
  /** x402 payment address being claimed */
  x402PaymentAddress: Address
  /** Network identifier (devnet, mainnet-beta, etc.) */
  network: string
  /** Optional GitHub username for verification */
  githubUsername?: string
  /** Optional Twitter handle for verification */
  twitterHandle?: string
  /** Timestamp of attestation creation */
  timestamp: bigint
}

/**
 * Result of attestation PDA derivation
 */
export interface AttestationPDAResult {
  /** Derived attestation PDA */
  attestationPda: Address
  /** Bump seed for PDA */
  bump: number
}

/**
 * Configuration for creating a Ghost ownership attestation
 */
export interface CreateAttestationConfig {
  /** SAS Credential address (issuer of attestations) */
  credentialAddress: Address
  /** SAS Schema address (defines attestation structure) */
  schemaAddress: Address
  /** x402 payment address to attest ownership of */
  x402PaymentAddress: Address
  /** Network identifier */
  network: string
  /** Optional social proof */
  githubUsername?: string
  twitterHandle?: string
  /** Attestation expiry (Unix timestamp) - defaults to 1 year */
  expiryTimestamp?: bigint
}

/**
 * SASAttestationHelper - Utilities for creating and managing SAS attestations
 */
export class SASAttestationHelper {
  /**
   * Derive attestation PDA for a given credential, schema, and nonce
   *
   * PDA seeds: ["attestation", credential, schema, nonce]
   *
   * @param credentialAddress - SAS Credential address (issuer)
   * @param schemaAddress - SAS Schema address (defines structure)
   * @param nonce - Unique nonce (typically the x402_payment_address)
   * @returns Attestation PDA and bump
   */
  static async deriveAttestationPda(
    credentialAddress: Address,
    schemaAddress: Address,
    nonce: Address
  ): Promise<AttestationPDAResult> {
    const [pda, bump] = await getProgramDerivedAddress({
      programAddress: SAS_PROGRAM_ID,
      seeds: [
        getUtf8Encoder().encode(ATTESTATION_SEED),
        getAddressEncoder().encode(credentialAddress),
        getAddressEncoder().encode(schemaAddress),
        getAddressEncoder().encode(nonce)
      ]
    })

    return {
      attestationPda: pda,
      bump
    }
  }

  /**
   * Derive credential PDA for an issuer
   *
   * PDA seeds: ["credential", issuer]
   *
   * @param issuer - Issuer's public key
   * @returns Credential PDA and bump
   */
  static async deriveCredentialPda(issuer: Address): Promise<AttestationPDAResult> {
    const [pda, bump] = await getProgramDerivedAddress({
      programAddress: SAS_PROGRAM_ID,
      seeds: [
        getUtf8Encoder().encode(CREDENTIAL_SEED),
        getAddressEncoder().encode(issuer)
      ]
    })

    return {
      attestationPda: pda,
      bump
    }
  }

  /**
   * Derive schema PDA for a credential
   *
   * PDA seeds: ["schema", credential, schema_name]
   *
   * @param credentialAddress - Credential address
   * @param schemaName - Schema identifier
   * @returns Schema PDA and bump
   */
  static async deriveSchemaPda(
    credentialAddress: Address,
    schemaName: string
  ): Promise<AttestationPDAResult> {
    const [pda, bump] = await getProgramDerivedAddress({
      programAddress: SAS_PROGRAM_ID,
      seeds: [
        getUtf8Encoder().encode(SCHEMA_SEED),
        getAddressEncoder().encode(credentialAddress),
        getUtf8Encoder().encode(schemaName)
      ]
    })

    return {
      attestationPda: pda,
      bump
    }
  }

  /**
   * Serialize Ghost ownership attestation data for on-chain storage
   *
   * Format: Borsh serialization
   * - x402_payment_address: 32 bytes
   * - network: String (length-prefixed)
   * - github_username: Option<String>
   * - twitter_handle: Option<String>
   * - timestamp: i64 (8 bytes)
   *
   * @param data - Attestation data to serialize
   * @returns Serialized buffer
   */
  static serializeAttestationData(data: GhostOwnershipAttestationData): Uint8Array {
    // TODO: Implement proper Borsh serialization
    // For now, return a simple concatenation (placeholder)
    const encoder = new TextEncoder()

    const networkBytes = encoder.encode(data.network)
    const githubBytes = data.githubUsername ? encoder.encode(data.githubUsername) : new Uint8Array()
    const twitterBytes = data.twitterHandle ? encoder.encode(data.twitterHandle) : new Uint8Array()

    // Calculate total size
    const totalSize =
      32 + // x402_payment_address
      4 + networkBytes.length + // network (length prefix + data)
      1 + (data.githubUsername ? 4 + githubBytes.length : 0) + // github option
      1 + (data.twitterHandle ? 4 + twitterBytes.length : 0) + // twitter option
      8 // timestamp

    const buffer = new Uint8Array(totalSize)
    let offset = 0

    // x402_payment_address (32 bytes)
    const addressBytes = Buffer.from(data.x402PaymentAddress)
    buffer.set(addressBytes.slice(0, 32), offset)
    offset += 32

    // network (length-prefixed string)
    const networkLengthView = new DataView(buffer.buffer, offset, 4)
    networkLengthView.setUint32(0, networkBytes.length, true)
    offset += 4
    buffer.set(networkBytes, offset)
    offset += networkBytes.length

    // github_username (Option<String>)
    if (data.githubUsername) {
      buffer[offset] = 1 // Some
      offset += 1
      const githubLengthView = new DataView(buffer.buffer, offset, 4)
      githubLengthView.setUint32(0, githubBytes.length, true)
      offset += 4
      buffer.set(githubBytes, offset)
      offset += githubBytes.length
    } else {
      buffer[offset] = 0 // None
      offset += 1
    }

    // twitter_handle (Option<String>)
    if (data.twitterHandle) {
      buffer[offset] = 1 // Some
      offset += 1
      const twitterLengthView = new DataView(buffer.buffer, offset, 4)
      twitterLengthView.setUint32(0, twitterBytes.length, true)
      offset += 4
      buffer.set(twitterBytes, offset)
      offset += twitterBytes.length
    } else {
      buffer[offset] = 0 // None
      offset += 1
    }

    // timestamp (i64)
    const timestampView = new DataView(buffer.buffer, offset, 8)
    timestampView.setBigInt64(0, data.timestamp, true)

    return buffer
  }

  /**
   * Get GhostSpeak default credential configuration
   *
   * This returns the official GhostSpeak credential issuer settings
   * for production use.
   *
   * @param issuer - Credential issuer address (typically the GhostSpeak program authority)
   * @returns Default credential configuration
   */
  static getDefaultCredentialConfig(issuer: Address): GhostSpeakCredentialConfig {
    return {
      issuer,
      name: 'GhostSpeak AI Agent Ownership',
      description: 'Attestation proving ownership of an AI agent registered on the GhostSpeak protocol',
      schemaUri: 'https://ghostspeak.ai/schemas/agent-ownership-v1.json'
    }
  }

  /**
   * Check if an attestation is expired
   *
   * @param expiryTimestamp - Expiry timestamp (Unix seconds)
   * @param currentTimestamp - Current timestamp (defaults to now)
   * @returns True if expired
   */
  static isAttestationExpired(
    expiryTimestamp: bigint,
    currentTimestamp?: bigint
  ): boolean {
    const now = currentTimestamp ?? BigInt(Math.floor(Date.now() / 1000))
    return expiryTimestamp < now
  }

  /**
   * Calculate default expiry timestamp (1 year from now)
   *
   * @param fromTimestamp - Starting timestamp (defaults to now)
   * @returns Expiry timestamp
   */
  static calculateDefaultExpiry(fromTimestamp?: bigint): bigint {
    const now = fromTimestamp ?? BigInt(Math.floor(Date.now() / 1000))
    const oneYear = BigInt(365 * 24 * 60 * 60) // 365 days in seconds
    return now + oneYear
  }

  /**
   * Create attestation instruction data
   *
   * NOTE: This is a helper for building the SAS create_attestation instruction.
   * The actual instruction building should be done using the SAS SDK or program IDL.
   *
   * @param config - Attestation configuration
   * @returns Prepared attestation data and PDA
   */
  static async prepareAttestation(
    config: CreateAttestationConfig
  ): Promise<{
    attestationData: Uint8Array
    attestationPda: Address
    bump: number
    expiryTimestamp: bigint
  }> {
    // Derive attestation PDA
    const { attestationPda, bump } = await this.deriveAttestationPda(
      config.credentialAddress,
      config.schemaAddress,
      config.x402PaymentAddress // Use x402 address as nonce
    )

    // Calculate expiry
    const expiryTimestamp = config.expiryTimestamp ?? this.calculateDefaultExpiry()

    // Serialize attestation data
    const attestationData = this.serializeAttestationData({
      x402PaymentAddress: config.x402PaymentAddress,
      network: config.network,
      githubUsername: config.githubUsername,
      twitterHandle: config.twitterHandle,
      timestamp: BigInt(Math.floor(Date.now() / 1000))
    })

    return {
      attestationData,
      attestationPda,
      bump,
      expiryTimestamp
    }
  }
}
