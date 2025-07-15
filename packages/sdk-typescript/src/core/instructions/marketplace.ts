/**
 * Marketplace Instructions - July 2025 Implementation
 */

import { 
  type Address,
  getAddressEncoder,
  getProgramDerivedAddress
} from '@solana/addresses';
import { 
  type IAccountMeta,
  type IInstruction,
  AccountRole
} from '@solana/instructions';
import type { TransactionSigner } from '@solana/signers';
import { GHOSTSPEAK_PROGRAM_ID } from '../types.js';
import { deriveServiceListingPda, deriveAgentPda, serializeString } from '../utils.js';

/**
 * Create Service Listing instruction
 * Discriminator: [91, 37, 216, 26, 93, 146, 13, 182]
 */
export async function createServiceListingInstruction(
  creator: TransactionSigner,
  agentId: string,
  listingId: bigint,
  name: string,
  description: string,
  price: bigint,
  deliveryTime: number,
  category: string
): Promise<IInstruction> {
  // Derive PDAs
  const agentPda = await deriveAgentPda(creator.address, agentId);
  const listingPda = await deriveServiceListingPda(creator.address, listingId);
  
  // User registry PDA (simplified for now)
  const encoder = getAddressEncoder();
  const userRegistrySeeds = [
    Buffer.from('user_registry'),
    encoder.encode(creator.address)
  ];
  const [userRegistryPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: userRegistrySeeds
  });
  
  const accounts: IAccountMeta[] = [
    { 
      address: listingPda,
      role: AccountRole.WRITABLE
    },
    {
      address: agentPda,
      role: AccountRole.READONLY
    },
    {
      address: userRegistryPda,
      role: AccountRole.WRITABLE
    },
    {
      address: creator.address,
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
  
  // Serialize instruction data
  const discriminator = new Uint8Array([91, 37, 216, 26, 93, 146, 13, 182]);
  
  // Build data buffer
  const listingIdBytes = new Uint8Array(8);
  new DataView(listingIdBytes.buffer).setBigUint64(0, listingId, true);
  
  const nameBytes = serializeString(name, 128);
  const descBytes = serializeString(description, 512);
  const categoryBytes = serializeString(category, 64);
  const currencyBytes = serializeString('USDC', 16); // Default to USDC
  
  const priceBytes = new Uint8Array(8);
  new DataView(priceBytes.buffer).setBigUint64(0, price, true);
  
  const deliveryBytes = new Uint8Array(4);
  new DataView(deliveryBytes.buffer).setUint32(0, deliveryTime, true);
  
  // Combine all data
  const totalSize = discriminator.length + listingIdBytes.length + 
    nameBytes.length + descBytes.length + categoryBytes.length + 
    currencyBytes.length + priceBytes.length + deliveryBytes.length;
    
  const data = new Uint8Array(totalSize);
  let offset = 0;
  
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(listingIdBytes, offset);
  offset += listingIdBytes.length;
  data.set(nameBytes, offset);
  offset += nameBytes.length;
  data.set(descBytes, offset);
  offset += descBytes.length;
  data.set(priceBytes, offset);
  offset += priceBytes.length;
  data.set(currencyBytes, offset);
  offset += currencyBytes.length;
  data.set(categoryBytes, offset);
  offset += categoryBytes.length;
  data.set(deliveryBytes, offset);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}

