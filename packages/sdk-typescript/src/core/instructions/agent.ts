/**
 * Agent Instructions - July 2025 Implementation
 * Using @solana/kit (Web3.js v2) patterns
 */

import { 
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address 
} from '@solana/addresses';
import { 
  type IAccountMeta,
  type IInstruction,
  AccountRole
} from '@solana/instructions';
import type { TransactionSigner } from '@solana/signers';
import { GHOSTSPEAK_PROGRAM_ID } from '../../types/index.js';
import { deriveAgentPda, serializeString, serializeVec } from '../utils.js';

/**
 * Register Agent instruction
 * Discriminator: [135, 157, 66, 195, 2, 113, 175, 30]
 */
export async function createRegisterAgentInstruction(
  signer: TransactionSigner,
  agentId: string,
  agentType: number,
  metadataUri: string
): Promise<IInstruction> {
  // Derive agent PDA - TEMPORARY FIX: Use empty string for PDA as program expects
  // TODO: Fix the Rust program to use the actual agent_id parameter
  const agentPda = await deriveAgentPda(signer.address, '');
  
  // Derive user registry PDA
  const encoder = getAddressEncoder();
  const [userRegistryPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('user_registry'),
      encoder.encode(signer.address)
    ]
  });
  
  // Build accounts based on IDL
  const accounts: IAccountMeta[] = [
    { 
      address: agentPda,
      role: AccountRole.WRITABLE // init account
    },
    {
      address: userRegistryPda,
      role: AccountRole.WRITABLE // init_if_needed
    },
    {
      address: signer.address,
      role: AccountRole.WRITABLE_SIGNER
    },
    {
      address: '11111111111111111111111111111111' as Address, // System Program
      role: AccountRole.READONLY
    },
    {
      address: 'SysvarC1ock11111111111111111111111111111111' as Address, // Clock
      role: AccountRole.READONLY
    }
  ];
  
  // Serialize instruction data based on IDL args: agent_type: u8, metadata_uri: String, agent_id: String
  const discriminator = new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]);
  const agentTypeBytes = new Uint8Array([agentType]); // u8
  const metadataUriBytes = serializeString(metadataUri, 256);
  const agentIdBytes = serializeString(agentId, 64);
  
  // Combine all data
  const data = new Uint8Array(
    discriminator.length + 
    agentTypeBytes.length +
    metadataUriBytes.length +
    agentIdBytes.length
  );
  
  let offset = 0;
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(agentTypeBytes, offset);
  offset += agentTypeBytes.length;
  data.set(metadataUriBytes, offset);
  offset += metadataUriBytes.length;
  data.set(agentIdBytes, offset);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}

/**
 * Update Agent instruction
 * Discriminator: [65, 42, 123, 32, 163, 229, 57, 177]
 */
export async function createUpdateAgentInstruction(
  signer: TransactionSigner,
  agentId: string,
  name?: string,
  description?: string,
  capabilities?: string[]
): Promise<IInstruction> {
  const agentPda = await deriveAgentPda(signer.address, agentId);
  
  const accounts: IAccountMeta[] = [
    { 
      address: agentPda,
      role: AccountRole.WRITABLE
    },
    {
      address: signer.address,
      role: AccountRole.WRITABLE_SIGNER
    }
  ];
  
  // Build update data with options
  const discriminator = new Uint8Array([65, 42, 123, 32, 163, 229, 57, 177]);
  const agentIdBytes = serializeString(agentId, 64);
  
  // Serialize options (1 byte for presence + data if present)
  const nameOption = name ? 
    new Uint8Array([1, ...serializeString(name, 128)]) : 
    new Uint8Array([0]);
    
  const descOption = description ? 
    new Uint8Array([1, ...serializeString(description, 512)]) : 
    new Uint8Array([0]);
    
  const capsOption = capabilities ? 
    new Uint8Array([1, ...serializeVec(capabilities, (cap) => serializeString(cap, 64))]) : 
    new Uint8Array([0]);
  
  // Calculate total size
  const totalSize = discriminator.length + agentIdBytes.length + 
    nameOption.length + descOption.length + capsOption.length;
  
  const data = new Uint8Array(totalSize);
  let offset = 0;
  
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(agentIdBytes, offset);
  offset += agentIdBytes.length;
  data.set(nameOption, offset);
  offset += nameOption.length;
  data.set(descOption, offset);
  offset += descOption.length;
  data.set(capsOption, offset);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}

/**
 * Activate Agent instruction
 * Discriminator: [252, 139, 87, 21, 195, 152, 29, 217]
 */
export async function createActivateAgentInstruction(
  signer: TransactionSigner,
  agentId: string
): Promise<IInstruction> {
  const agentPda = await deriveAgentPda(signer.address, agentId);
  
  const accounts: IAccountMeta[] = [
    { 
      address: agentPda,
      role: AccountRole.WRITABLE
    },
    {
      address: signer.address,
      role: AccountRole.WRITABLE_SIGNER
    },
    {
      address: 'SysvarC1ock11111111111111111111111111111111' as Address, // Clock
      role: AccountRole.READONLY
    }
  ];
  
  const discriminator = new Uint8Array([252, 139, 87, 21, 195, 152, 29, 217]);
  const agentIdBytes = serializeString(agentId, 64);
  
  const data = new Uint8Array(discriminator.length + agentIdBytes.length);
  data.set(discriminator, 0);
  data.set(agentIdBytes, discriminator.length);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}