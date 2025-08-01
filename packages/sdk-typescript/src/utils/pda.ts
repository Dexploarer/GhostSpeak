import type { Address } from '@solana/addresses'
import { 
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder,
  getU64Encoder
} from '@solana/kit'

/**
 * Utility functions for Program Derived Addresses (PDAs)
 * Based on generated patterns from Codama
 */

/**
 * Derive agent PDA (original function)
 * Pattern: ['agent', owner, agentId]
 * NOTE: Uses raw UTF-8 bytes to match smart contract's agent_id.as_bytes()
 */
export async function deriveAgentPdaOriginal(
  programId: Address,
  owner: Address,
  agentId: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
      getAddressEncoder().encode(owner),
      // Use raw UTF-8 bytes to match smart contract: agent_id.as_bytes()
      getUtf8Encoder().encode(agentId)
    ]
  })
  return address
}

/**
 * Derive agent PDA (SDK compatible version)
 * Pattern: ['agent', owner, agentId]
 */
export async function deriveAgentPda(params: {
  owner: Address
  agentId: string
  programAddress: Address
}): Promise<[Address, number]> {
  const result = await getProgramDerivedAddress({
    programAddress: params.programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
      getAddressEncoder().encode(params.owner),
      getUtf8Encoder().encode(params.agentId)
    ]
  })
  return [result[0], result[1]]
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
 * NOTE: Smart contract expects orderId as little-endian bytes, not U64 encoded
 */
export async function deriveWorkOrderPda(
  programId: Address,
  client: Address,
  orderId: bigint
): Promise<Address> {
  // Convert orderId to little-endian bytes (8 bytes) to match smart contract expectation
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
 * Derive A2A session PDA (original function)
 * Pattern: ['a2a_session', creator]
 */
export async function deriveA2ASessionPdaOriginal(
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
 * Derive A2A session PDA (wrapper for SDK compatibility)
 * This function wraps deriveChannelPda to match the expected signature
 */
export async function deriveA2ASessionPda(params: {
  channelId: string
  programAddress: Address
}): Promise<[Address, number]> {
  // For enhanced channels, we use the channel PDA derivation
  const address = await deriveChannelPda(params.programAddress, params.channelId)
  return [address, 0] // Return bump as 0 since we don't calculate it here
}

/**
 * Derive channel PDA (for enhanced channels)
 * Pattern: ['channel', channelId]
 */
export async function deriveChannelPda(
  programId: Address,
  channelId: string
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        99, 104, 97, 110, 110, 101, 108
      ])), // 'channel'
      getUtf8Encoder().encode(channelId)
    ]
  })
  return address
}

/**
 * Derive A2A message PDA
 * Pattern: ['a2a_message', session, session.created_at]
 * NOTE: Fixed to match smart contract expectation - uses session.created_at as little-endian bytes
 */
export async function deriveA2AMessagePda(
  programId: Address,
  session: Address,
  sessionCreatedAt: bigint  // Changed from messageId to sessionCreatedAt
): Promise<Address> {
  // Convert sessionCreatedAt to little-endian bytes (8 bytes) to match smart contract expectation
  const createdAtBytes = new Uint8Array(8)
  const dataView = new DataView(createdAtBytes.buffer)
  dataView.setBigInt64(0, sessionCreatedAt, true) // little-endian
  
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 50, 97, 95, 109, 101, 115, 115, 97, 103, 101
      ])), // 'a2a_message'
      getAddressEncoder().encode(session),
      createdAtBytes  // Fixed: use raw little-endian bytes instead of U64 encoder
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
 * Derive replication template PDA
 * Pattern: ['replication_template', sourceAgent]
 */
export async function deriveReplicationTemplatePda(
  programId: Address,
  sourceAgent: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        114, 101, 112, 108, 105, 99, 97, 116, 105, 111, 110, 95, 116, 101, 109, 112, 108, 97, 116, 101
      ])), // 'replication_template'
      getAddressEncoder().encode(sourceAgent)
    ]
  })
  return address
}

/**
 * Derive replication record PDA
 * Pattern: ['replication_record', replicationTemplate, buyer]
 */
export async function deriveReplicationRecordPda(
  programId: Address,
  replicationTemplate: Address,
  buyer: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        114, 101, 112, 108, 105, 99, 97, 116, 105, 111, 110, 95, 114, 101, 99, 111, 114, 100
      ])), // 'replication_record'
      getAddressEncoder().encode(replicationTemplate),
      getAddressEncoder().encode(buyer)
    ]
  })
  return address
}

/**
 * Derive agent tree config PDA for compressed agents
 * Pattern: ['agent_tree_config', signer]
 */
export async function deriveAgentTreeConfigPda(
  programId: Address,
  signer: Address
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 103, 101, 110, 116, 95, 116, 114, 101, 101, 95, 99, 111, 110, 102, 105, 103
      ])), // 'agent_tree_config'
      getAddressEncoder().encode(signer)
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

/**
 * Derive work order PDA
 * Pattern: ['work_order', client, orderId]
 */
export async function deriveWorkOrderPDA(
  client: Address,
  orderId: bigint,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    getBytesEncoder().encode(new Uint8Array([119, 111, 114, 107, 95, 111, 114, 100, 101, 114])), // 'work_order'
    getAddressEncoder().encode(client),
    getU64Encoder().encode(orderId)
  ]
  
  const result = await getProgramDerivedAddress({
    programAddress: programId,
    seeds
  })
  
  // getProgramDerivedAddress returns a tuple
  return [result[0], result[1]]
}

/**
 * Derive work delivery PDA
 * Pattern: ['work_delivery', workOrder]
 */
export async function deriveWorkDeliveryPDA(
  workOrder: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    getBytesEncoder().encode(new Uint8Array([119, 111, 114, 107, 95, 100, 101, 108, 105, 118, 101, 114, 121])), // 'work_delivery'
    getAddressEncoder().encode(workOrder)
  ]
  
  const result = await getProgramDerivedAddress({
    programAddress: programId,
    seeds
  })
  
  // getProgramDerivedAddress returns a tuple
  return [result[0], result[1]]
}

/**
 * Derive escrow PDA (original function - deprecated)
 * Pattern: ['escrow', workOrder]
 */
export async function deriveEscrowPDAOriginal(
  workOrder: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    getBytesEncoder().encode(new Uint8Array([101, 115, 99, 114, 111, 119])), // 'escrow'
    getAddressEncoder().encode(workOrder)
  ]
  
  const result = await getProgramDerivedAddress({
    programAddress: programId,
    seeds
  })
  
  // getProgramDerivedAddress returns a tuple
  return [result[0], result[1]]
}

/**
 * Derive escrow PDA (SDK compatible version)
 * Pattern: ['escrow', escrowId/taskId]
 */
export async function deriveEscrowPDA(params: {
  client: Address
  provider: Address
  escrowId: string
  programAddress: Address
}): Promise<[Address, number]> {
  // The Rust program uses ['escrow', task_id.as_bytes()]
  // The escrowId parameter is used as the task_id
  const seeds = [
    getBytesEncoder().encode(new Uint8Array([101, 115, 99, 114, 111, 119])), // 'escrow'
    getUtf8Encoder().encode(params.escrowId)
  ]
  
  const result = await getProgramDerivedAddress({
    programAddress: params.programAddress,
    seeds
  })
  
  // getProgramDerivedAddress returns a tuple
  return [result[0], result[1]]
}