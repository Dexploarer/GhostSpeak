/**
 * Simplified Marketplace Instructions - Minimal Working Version
 * July 2025 Implementation
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
import { deriveAgentPda, serializeString } from '../utils.js';

/**
 * Create Service Listing instruction - SIMPLIFIED VERSION
 * Uses minimal parameters to avoid serialization issues
 * Discriminator: [91, 37, 216, 26, 93, 146, 13, 182]
 */
export async function createSimpleServiceListingInstruction(
  creator: TransactionSigner,
  agentId: string,
  listingId: bigint,
  title: string,
  price: bigint
): Promise<IInstruction> {
  const encoder = getAddressEncoder();
  
  // Derive PDAs (using empty string for agent due to current bug)
  const agentPda = await deriveAgentPda(creator.address, '');
  
  // CRITICAL FIX: Use empty string for listing_id due to Rust program bug
  // Similar to agent registration, the Rust program doesn't use the listing_id parameter in PDA derivation
  const [listingPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('service_listing'),
      encoder.encode(creator.address),
      Buffer.from('') // Empty string - Rust program bug ignores the listing_id parameter
    ]
  });
  
  // User registry PDA
  const [userRegistryPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('user_registry'),
      encoder.encode(creator.address)
    ]
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
      address: '11111111111111111111111111111111' as Address,
      role: AccountRole.READONLY
    },
    {
      address: 'SysvarC1ock11111111111111111111111111111111' as Address,
      role: AccountRole.READONLY
    }
  ];
  
  // SIMPLIFIED: Create minimal instruction data to avoid complex struct serialization
  const discriminator = new Uint8Array([91, 37, 216, 26, 93, 146, 13, 182]);
  
  // Instead of complex ServiceListingData struct, use individual simple parameters
  // This follows the successful agent registration pattern
  
  // ServiceListingData struct with absolute minimal values:
  const titleBytes = serializeString(title.substring(0, 10), 16);
  const descriptionBytes = serializeString("Service", 16);  
  
  const priceBytes = new Uint8Array(8);
  new DataView(priceBytes.buffer).setBigUint64(0, price, true);
  
  const tokenMintBytes = new Uint8Array(32); // Zero pubkey
  const serviceTypeBytes = serializeString("Service", 16);
  const paymentTokenBytes = new Uint8Array(32); // Zero pubkey
  
  const estimatedDeliveryBytes = new Uint8Array(8);
  new DataView(estimatedDeliveryBytes.buffer).setBigInt64(0, BigInt(3600), true); // 1 hour
  
  // Single tag with minimal size
  const tagsVecLength = new Uint8Array(4);
  new DataView(tagsVecLength.buffer).setUint32(0, 1, true);
  const tagBytes = serializeString("svc", 8);
  
  // Listing ID parameter
  const listingIdBytes = serializeString(listingId.toString().substring(0, 6), 8);
  
  // Combine data with minimal allocation
  const data = new Uint8Array(
    discriminator.length + 
    titleBytes.length +
    descriptionBytes.length +
    priceBytes.length +
    tokenMintBytes.length +
    serviceTypeBytes.length +
    paymentTokenBytes.length +
    estimatedDeliveryBytes.length +
    tagsVecLength.length +
    tagBytes.length +
    listingIdBytes.length
  );
  
  let offset = 0;
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(titleBytes, offset);
  offset += titleBytes.length;
  data.set(descriptionBytes, offset);
  offset += descriptionBytes.length;
  data.set(priceBytes, offset);
  offset += priceBytes.length;
  data.set(tokenMintBytes, offset);
  offset += tokenMintBytes.length;
  data.set(serviceTypeBytes, offset);
  offset += serviceTypeBytes.length;
  data.set(paymentTokenBytes, offset);
  offset += paymentTokenBytes.length;
  data.set(estimatedDeliveryBytes, offset);
  offset += estimatedDeliveryBytes.length;
  data.set(tagsVecLength, offset);
  offset += tagsVecLength.length;
  data.set(tagBytes, offset);
  offset += tagBytes.length;
  data.set(listingIdBytes, offset);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}