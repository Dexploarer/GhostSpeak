import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import { 
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder,
  getU32Encoder,
  addEncoderSizePrefix
} from '@solana/kit'

/**
 * CLI PDA utilities for deriving on-chain addresses
 * Mirrors the SDK patterns but for CLI usage
 */

/**
 * Derive agent PDA
 * Pattern: ['agent', owner, agentId] with length-prefixed agentId
 */
export async function deriveAgentPda(
  programId: Address,
  owner: Address,
  agentId: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
      getAddressEncoder().encode(owner),
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(agentId)
    ]
  })
  return address
}

/**
 * Derive service listing PDA  
 * Pattern: ['service_listing', creator, listingId]
 */
export async function deriveServiceListingPda(
  programId: Address,
  creator: Address,
  listingId: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        115, 101, 114, 118, 105, 99, 101, 95, 108, 105, 115, 116, 105, 110, 103
      ])), // 'service_listing'
      getAddressEncoder().encode(creator),
      getUtf8Encoder().encode(listingId)
    ]
  })
  return address
}

/**
 * Derive job posting PDA
 * Pattern: ['job_posting', employer, jobId]
 */
export async function deriveJobPostingPda(
  programId: Address,
  employer: Address,
  jobId: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        106, 111, 98, 95, 112, 111, 115, 116, 105, 110, 103
      ])), // 'job_posting'
      getAddressEncoder().encode(employer),
      getUtf8Encoder().encode(jobId)
    ]
  })
  return address
}

/**
 * Derive job application PDA
 * Pattern: ['job_application', jobPosting, applicant]
 */
export async function deriveJobApplicationPda(
  programId: Address,
  jobPosting: Address,
  applicant: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        106, 111, 98, 95, 97, 112, 112, 108, 105, 99, 97, 116, 105, 111, 110
      ])), // 'job_application'
      getAddressEncoder().encode(jobPosting),
      getAddressEncoder().encode(applicant)
    ]
  })
  return address
}

/**
 * Derive work order PDA (used for escrow functionality)
 * Pattern: ['work_order', client, orderId] (little-endian bytes)
 */
export async function deriveWorkOrderPda(
  programId: Address,
  client: Address,
  orderId: bigint
): Promise<Address> {
  // Convert orderId to little-endian bytes (8 bytes)
  const orderIdBytes = new Uint8Array(8)
  const dataView = new DataView(orderIdBytes.buffer)
  dataView.setBigUint64(0, orderId, true) // little-endian
  
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        119, 111, 114, 107, 95, 111, 114, 100, 101, 114
      ])), // 'work_order'
      getAddressEncoder().encode(client),
      orderIdBytes
    ]
  })
  return address
}

/**
 * Derive user registry PDA
 * Pattern: ['user_registry', signer]
 */
export async function deriveUserRegistryPda(
  programId: Address,
  signer: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121
      ])), // 'user_registry'
      getAddressEncoder().encode(signer)
    ]
  })
  return address
}

/**
 * Derive service purchase PDA
 * Pattern: ['service_purchase', serviceListing, buyer]
 */
export async function deriveServicePurchasePda(
  programId: Address,
  serviceListing: Address,
  buyer: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        115, 101, 114, 118, 105, 99, 101, 95, 112, 117, 114, 99, 104, 97, 115, 101
      ])), // 'service_purchase'
      getAddressEncoder().encode(serviceListing),
      getAddressEncoder().encode(buyer)
    ]
  })
  return address
}

/**
 * Derive job contract PDA (for accepted applications)
 * Pattern: ['job_contract', jobPosting, agent]
 */
export async function deriveJobContractPda(
  programId: Address,
  jobPosting: Address,
  agent: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        106, 111, 98, 95, 99, 111, 110, 116, 114, 97, 99, 116
      ])), // 'job_contract'
      getAddressEncoder().encode(jobPosting),
      getAddressEncoder().encode(agent)
    ]
  })
  return address
}

/**
 * Generate a unique ID for listings/jobs
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number | string): bigint {
  const amount = typeof sol === 'string' ? parseFloat(sol) : sol
  return BigInt(Math.floor(amount * 1_000_000_000))
}

/**
 * Get default payment token (native SOL)
 */
export function getDefaultPaymentToken(): Address {
  return address('So11111111111111111111111111111111111111112')
}

/**
 * Get USDC token mint address for devnet
 */
export function getUSDCMintDevnet(): Address {
  // This is a common devnet USDC mint, but in production this should be configurable
  return address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
}

/**
 * Calculate deadline timestamp
 */
export function calculateDeadline(days: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + days * 24 * 60 * 60)
}