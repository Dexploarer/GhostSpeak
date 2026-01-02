/**
 * SAS (Solana Attestation Service) helper utilities for CLI
 *
 * Provides functions for creating attestations to prove Ghost ownership
 */

import {
  deriveAttestationPda,
  getCreateAttestationInstruction,
  serializeAttestationData,
  type SchemaLayout,
} from 'sas-lib'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes, type TransactionSigner } from '@solana/signers'
import { getAddressEncoder } from '@solana/kit'
import { existsSync } from 'fs'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

/**
 * SAS Configuration from environment or config files
 */
export interface SASConfig {
  credentialPda: Address
  agentIdentitySchema: Address
  authority: Address
  authorizedSigner: TransactionSigner
}

/**
 * Load SAS configuration from environment or config files
 */
export async function loadSASConfig(): Promise<SASConfig> {
  // Try loading from monorepo config first
  const monorepoConfigPath = join(process.cwd(), '../../packages/web/sas-config.json')
  const monorepoKeypairsPath = join(process.cwd(), '../../packages/web/sas-keypairs.json')

  // Fallback to local config
  const localConfigPath = join(homedir(), '.ghostspeak', 'sas-config.json')
  const localKeypairsPath = join(homedir(), '.ghostspeak', 'sas-keypairs.json')

  let configPath = existsSync(monorepoConfigPath) ? monorepoConfigPath : localConfigPath
  let keypairsPath = existsSync(monorepoKeypairsPath) ? monorepoKeypairsPath : localKeypairsPath

  if (!existsSync(configPath)) {
    throw new Error(
      'SAS configuration not found. Please run the SAS setup script:\n' +
      'bun packages/web/scripts/setup-sas.ts'
    )
  }

  if (!existsSync(keypairsPath)) {
    throw new Error(
      'SAS keypairs not found. Please run the SAS setup script:\n' +
      'bun packages/web/scripts/setup-sas.ts'
    )
  }

  // Load config
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  const keypairs = JSON.parse(readFileSync(keypairsPath, 'utf-8'))

  // Reconstruct authorized signer from keypair bytes
  const authorizedSignerBytes = new Uint8Array(keypairs.authorizedSigner1)
  const authorizedSigner = await createKeyPairSignerFromBytes(authorizedSignerBytes)

  return {
    credentialPda: address(config.credentialPda),
    agentIdentitySchema: address(config.schemas.AGENT_IDENTITY),
    authority: address(config.authority),
    authorizedSigner,
  }
}

/**
 * Create an attestation proving ownership of an x402 payment address
 *
 * For Ghost claiming, we create an AGENT_IDENTITY attestation where:
 * - nonce = x402_payment_address (the Ghost's payment address)
 * - data = serialized agent identity data
 */
export async function createGhostOwnershipAttestation(params: {
  sasConfig: SASConfig
  payer: TransactionSigner
  ghostPaymentAddress: Address
  agentData: {
    agent: string
    did: string
    name: string
    capabilities: string
    x402Enabled: boolean
    x402ServiceEndpoint: string
    owner: string
    registeredAt: number
    issuedAt: number
  }
  expiryDays?: number
}) {
  const { sasConfig, payer, ghostPaymentAddress, agentData, expiryDays = 365 } = params

  // Derive attestation PDA using Ghost's payment address as nonce
  const [attestationPda] = await deriveAttestationPda({
    credential: sasConfig.credentialPda,
    schema: sasConfig.agentIdentitySchema,
    nonce: ghostPaymentAddress,
  })

  // Calculate expiry timestamp
  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60

  // Create schema layout for AGENT_IDENTITY
  // Layout matches packages/web/lib/sas/config.ts AGENT_IDENTITY schema
  const schemaLayout: SchemaLayout = {
    layout: new Uint8Array([
      0, // Pubkey (agent)
      4, // String (did)
      4, // String (name)
      4, // String (capabilities)
      1, // Bool (x402Enabled)
      4, // String (x402ServiceEndpoint)
      0, // Pubkey (owner)
      7, // i64 (registeredAt)
      7, // i64 (issuedAt)
    ]),
    fieldNames: [
      'agent',
      'did',
      'name',
      'capabilities',
      'x402Enabled',
      'x402ServiceEndpoint',
      'owner',
      'registeredAt',
      'issuedAt',
    ],
  }

  // Serialize attestation data
  const serializedData = serializeAttestationData(schemaLayout, agentData)

  // Create attestation instruction
  const instruction = await getCreateAttestationInstruction({
    payer,
    authority: sasConfig.authorizedSigner,
    credential: sasConfig.credentialPda,
    schema: sasConfig.agentIdentitySchema,
    attestation: attestationPda,
    nonce: ghostPaymentAddress,
    expiry: expiryTimestamp,
    data: serializedData,
  })

  return {
    instruction,
    attestationPda,
    expiryTimestamp,
  }
}

/**
 * Derive the attestation PDA for a Ghost
 * This matches the derivation in the on-chain program
 */
export async function deriveGhostAttestationPda(
  credentialPda: Address,
  schemaPda: Address,
  ghostPaymentAddress: Address
): Promise<Address> {
  const [attestationPda] = await deriveAttestationPda({
    credential: credentialPda,
    schema: schemaPda,
    nonce: ghostPaymentAddress,
  })

  return attestationPda
}
