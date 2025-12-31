import type { Address } from '@solana/addresses'
import { 
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder
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

// deriveAgentPdaOriginal implementation above

export async function deriveAgentPda(params: {
  owner: Address
  agentId: string
  programAddress: Address
}): Promise<[Address, number]> {
  const [address, bump] = await getProgramDerivedAddress({
    programAddress: params.programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
      getAddressEncoder().encode(params.owner),
      getUtf8Encoder().encode(params.agentId)
    ]
  })
  return [address, bump]
}

// Legacy Marketplace PDAs removed




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

export async function deriveA2ASessionPda(params: {
  initiator: Address
  programAddress: Address
}): Promise<[Address, number]> {
  const result = await getProgramDerivedAddress({
    programAddress: params.programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        97, 50, 97, 95, 115, 101, 115, 115, 105, 111, 110
      ])), // 'a2a_session'
      getAddressEncoder().encode(params.initiator)
    ]
  })
  return [result[0], result[1]]
}

// Legacy Channel PDA removed

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

// Legacy Service Purchase PDA removed

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

// Legacy Replication PDAs removed

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

/**
 * Derive escrow PDA (simple version for EscrowModule)
 * Pattern: ['escrow', buyer, seller, nonce]
 */
export async function deriveEscrowPda(
  programId: Address,
  buyer: Address,
  seller: Address,
  nonce: number
): Promise<Address> {
  // Convert nonce to little-endian bytes (8 bytes)
  const nonceBytes = new Uint8Array(8)
  const dataView = new DataView(nonceBytes.buffer)
  dataView.setUint32(0, nonce, true) // little-endian, use 4 bytes for number
  
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([101, 115, 99, 114, 111, 119])), // 'escrow'
      getAddressEncoder().encode(buyer),
      getAddressEncoder().encode(seller),
      nonceBytes.slice(0, 4) // Only use 4 bytes for the nonce
    ]
  })
  return address
}

/**
 * Derive associated token account PDA
 * Pattern: [wallet, TOKEN_PROGRAM_ID, mint]
 */
export async function deriveTokenAccountPda(
  wallet: Address,
  mint: Address
): Promise<Address> {
  // Associated Token Account program ID
  const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address
  // Token program ID  
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
  
  const [address] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    seeds: [
      getAddressEncoder().encode(wallet),
      getAddressEncoder().encode(TOKEN_PROGRAM_ID),
      getAddressEncoder().encode(mint)
    ]
  })
  return address
}


/**
 * Derive message PDA
 * Pattern: ['message', channel, nonce]
 */
export async function deriveMessagePda(
  programId: Address,
  channel: Address,
  nonce: number
): Promise<Address> {
  // Convert nonce to little-endian bytes (4 bytes)
  const nonceBytes = new Uint8Array(4)
  const dataView = new DataView(nonceBytes.buffer)
  dataView.setUint32(0, nonce, true) // little-endian
  
  const [address] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([
        109, 101, 115, 115, 97, 103, 101 // 'message'
      ])),
      getAddressEncoder().encode(channel),
      nonceBytes
    ]
  })
  return address
}