/**
 * Fixed Marketplace Instructions - Correct Anchor Struct Serialization
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
import { GHOSTSPEAK_PROGRAM_ID } from '../types.js';
import { deriveAgentPda, serializeString, serializeVec } from '../utils.js';

/**
 * Serialize ServiceListingData struct exactly as Anchor expects
 */
function serializeServiceListingData(data: {
  title: string;
  description: string;
  price: bigint;
  tokenMint: Uint8Array;
  serviceType: string;
  paymentToken: Uint8Array;
  estimatedDelivery: bigint;
  tags: string[];
}): Uint8Array {
  // Anchor serializes structs by concatenating all fields in order
  // Each field is serialized according to its type
  
  // 1. title: String
  const titleBytes = serializeString(data.title, 32);
  
  // 2. description: String  
  const descriptionBytes = serializeString(data.description, 64);
  
  // 3. price: u64 (8 bytes, little-endian)
  const priceBytes = new Uint8Array(8);
  new DataView(priceBytes.buffer).setBigUint64(0, data.price, true);
  
  // 4. token_mint: Pubkey (32 bytes)
  const tokenMintBytes = data.tokenMint;
  
  // 5. service_type: String
  const serviceTypeBytes = serializeString(data.serviceType, 16);
  
  // 6. payment_token: Pubkey (32 bytes)
  const paymentTokenBytes = data.paymentToken;
  
  // 7. estimated_delivery: i64 (8 bytes, little-endian)
  const deliveryBytes = new Uint8Array(8);
  new DataView(deliveryBytes.buffer).setBigInt64(0, data.estimatedDelivery, true);
  
  // 8. tags: Vec<String>
  const tagsBytes = serializeVec(data.tags, (tag) => serializeString(tag, 16));
  
  // Combine all struct fields
  const totalSize = titleBytes.length + descriptionBytes.length + priceBytes.length + 
                   tokenMintBytes.length + serviceTypeBytes.length + paymentTokenBytes.length +
                   deliveryBytes.length + tagsBytes.length;
  
  const structData = new Uint8Array(totalSize);
  let offset = 0;
  
  structData.set(titleBytes, offset);
  offset += titleBytes.length;
  structData.set(descriptionBytes, offset);
  offset += descriptionBytes.length;
  structData.set(priceBytes, offset);
  offset += priceBytes.length;
  structData.set(tokenMintBytes, offset);
  offset += tokenMintBytes.length;
  structData.set(serviceTypeBytes, offset);
  offset += serviceTypeBytes.length;
  structData.set(paymentTokenBytes, offset);
  offset += paymentTokenBytes.length;
  structData.set(deliveryBytes, offset);
  offset += deliveryBytes.length;
  structData.set(tagsBytes, offset);
  
  return structData;
}

/**
 * Create Service Listing instruction with correct Anchor struct serialization
 * Discriminator: [91, 37, 216, 26, 93, 146, 13, 182]
 */
export async function createFixedServiceListingInstruction(
  creator: TransactionSigner,
  agentId: string,
  listingId: bigint,
  title: string,
  description: string,
  price: bigint
): Promise<IInstruction> {
  const encoder = getAddressEncoder();
  
  // Derive PDAs (using empty string due to Rust bugs)
  const agentPda = await deriveAgentPda(creator.address, '');
  
  const [listingPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('service_listing'),
      encoder.encode(creator.address),
      Buffer.from('') // Empty string - Rust program bug
    ]
  });
  
  const [userRegistryPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('user_registry'),
      encoder.encode(creator.address)
    ]
  });
  
  const accounts: IAccountMeta[] = [
    { address: listingPda, role: AccountRole.WRITABLE },
    { address: agentPda, role: AccountRole.READONLY },
    { address: userRegistryPda, role: AccountRole.WRITABLE },
    { address: creator.address, role: AccountRole.WRITABLE_SIGNER },
    { address: '11111111111111111111111111111111' as Address, role: AccountRole.READONLY },
    { address: 'SysvarC1ock11111111111111111111111111111111' as Address, role: AccountRole.READONLY }
  ];
  
  // Instruction data format:
  // 1. Discriminator (8 bytes)
  // 2. ServiceListingData struct (Anchor serialized)
  // 3. listing_id String parameter
  
  const discriminator = new Uint8Array([91, 37, 216, 26, 93, 146, 13, 182]);
  
  // Serialize ServiceListingData struct
  const structData = serializeServiceListingData({
    title: title.substring(0, 16),
    description: description.substring(0, 32),
    price: price,
    tokenMint: new Uint8Array(32), // Zero pubkey
    serviceType: 'Service',
    paymentToken: new Uint8Array(32), // Zero pubkey
    estimatedDelivery: BigInt(3600), // 1 hour
    tags: ['svc'] // Single tag
  });
  
  // Serialize listing_id parameter (separate from struct)
  const listingIdBytes = serializeString(listingId.toString().substring(0, 8), 12);
  
  // Combine: discriminator + struct + parameter
  const data = new Uint8Array(discriminator.length + structData.length + listingIdBytes.length);
  let offset = 0;
  
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(structData, offset);
  offset += structData.length;
  data.set(listingIdBytes, offset);
  
  console.log('📊 FIXED INSTRUCTION ANALYSIS:');
  console.log('- Total size:', data.length, 'bytes');
  console.log('- Discriminator:', discriminator.length, 'bytes');
  console.log('- Struct data:', structData.length, 'bytes');
  console.log('- Parameter:', listingIdBytes.length, 'bytes');
  console.log('- Price bytes at struct offset:', Array.from(data.slice(discriminator.length + 36 + 68, discriminator.length + 36 + 68 + 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}