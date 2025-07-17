import type { Address } from '@solana/addresses'
import { 
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder,
  getU32Encoder,
  getU64Encoder,
  addEncoderSizePrefix
} from '@solana/kit'

/**
 * Utility functions for Program Derived Addresses (PDAs)
 * Based on generated patterns from Codama
 */

/**
 * Derive agent PDA
 * Pattern: ['agent', owner, agentId]
 * NOTE: Uses length-prefixed string encoding to match smart contract expectations
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
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(listingId)
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
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(jobId)
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
 * Pattern: ['work_order', employer, orderId]
 */
export async function deriveWorkOrderPda(
  programId: Address,
  employer: Address,
  orderId: bigint
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        119, 111, 114, 107, 95, 111, 114, 100, 101, 114
      ])), // 'work_order'
      getAddressEncoder().encode(employer),
      getU64Encoder().encode(orderId)
    ]
  })
  return address
}

/**
 * Derive work delivery PDA
 * Pattern: ['work_delivery', workOrder, provider]
 */
export async function deriveWorkDeliveryPda(
  programId: Address,
  workOrder: Address,
  provider: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        119, 111, 114, 107, 95, 100, 101, 108, 105, 118, 101, 114, 121
      ])), // 'work_delivery'
      getAddressEncoder().encode(workOrder),
      getAddressEncoder().encode(provider)
    ]
  })
  return address
}

/**
 * Derive payment PDA
 * Pattern: ['payment', workOrder, payer]
 */
export async function derivePaymentPda(
  programId: Address,
  workOrder: Address,
  payer: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        112, 97, 121, 109, 101, 110, 116
      ])), // 'payment'
      getAddressEncoder().encode(workOrder),
      getAddressEncoder().encode(payer)
    ]
  })
  return address
}

/**
 * Derive A2A session PDA
 * Pattern: ['a2a_session', creator]
 */
export async function deriveA2ASessionPda(
  programId: Address,
  creator: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 50, 97, 95, 115, 101, 115, 115, 105, 111, 110
      ])), // 'a2a_session'
      getAddressEncoder().encode(creator)
    ]
  })
  return address
}

/**
 * Derive A2A message PDA
 * Pattern: ['a2a_message', session, session.created_at]
 * NOTE: Fixed to match smart contract expectation - uses session.created_at, not messageId
 */
export async function deriveA2AMessagePda(
  programId: Address,
  session: Address,
  sessionCreatedAt: bigint  // Changed from messageId to sessionCreatedAt
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 50, 97, 95, 109, 101, 115, 115, 97, 103, 101
      ])), // 'a2a_message'
      getAddressEncoder().encode(session),
      getU64Encoder().encode(sessionCreatedAt)  // Fixed: use session.created_at
    ]
  })
  return address
}

/**
 * Derive user registry PDA
 * Pattern: ['user_registry', signer]
 * NOTE: Fixed to match smart contract expectations - includes signer address
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
 * Derive agent verification PDA
 * Pattern: ['agent_verification', agent, verifier]
 */
export async function deriveAgentVerificationPda(
  programId: Address,
  agent: Address,
  verifier: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 103, 101, 110, 116, 95, 118, 101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110
      ])), // 'agent_verification'
      getAddressEncoder().encode(agent),
      getAddressEncoder().encode(verifier)
    ]
  })
  return address
}

/**
 * Generic PDA finder for custom use cases
 * Pattern: seeds array with automatic encoding
 */
export async function findProgramDerivedAddress(
  seeds: (string | Address | Uint8Array)[],
  programId: Address
): Promise<[Address, number]> {
  const encodedSeeds = seeds.map(seed => {
    if (typeof seed === 'string') {
      return getUtf8Encoder().encode(seed)
    } else if (typeof seed === 'object' && seed.constructor === Uint8Array) {
      return seed
    } else {
      // Assume it's an Address
      return getAddressEncoder().encode(seed as unknown as Address)
    }
  })

  const result = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: encodedSeeds
  })
  return [result[0], result[1]]
}