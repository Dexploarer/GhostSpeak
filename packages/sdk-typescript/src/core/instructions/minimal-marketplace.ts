/**
 * Minimal Marketplace Instructions - Absolute minimum for working price serialization
 * Based on the successful simple approach but with corrected price field positioning
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
import { deriveAgentPda } from '../utils.js';

/**
 * Create ultra-minimal service listing to isolate and fix price issue
 */
export async function createMinimalServiceListingInstruction(
  creator: TransactionSigner,
  agentId: string,
  listingId: bigint,
  price: bigint
): Promise<IInstruction> {
  const encoder = getAddressEncoder();
  
  // Use working PDA derivation patterns
  const agentPda = await deriveAgentPda(creator.address, '');
  
  const [listingPda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('service_listing'),
      encoder.encode(creator.address),
      Buffer.from('')
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
  
  // Use absolute minimal data that should work based on successful patterns
  const discriminator = new Uint8Array([91, 37, 216, 26, 93, 146, 13, 182]);
  
  // Minimal ServiceListingData:
  // 1. title: String = "hi" (2 chars)
  const title = new Uint8Array([
    2, 0, 0, 0,           // length = 2 (u32 little-endian)
    0x68, 0x69,           // "hi" 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // padding to 32
  ]);
  
  // 2. description: String = "ok" (2 chars)
  const description = new Uint8Array([
    2, 0, 0, 0,           // length = 2 (u32 little-endian)
    0x6f, 0x6b,           // "ok"
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // padding to 64
  ]);
  
  // 3. price: u64 - THIS IS THE CRITICAL FIELD
  const priceBytes = new Uint8Array(8);
  new DataView(priceBytes.buffer).setBigUint64(0, price, true);
  
  // 4. token_mint: Pubkey (32 bytes zeros)
  const tokenMint = new Uint8Array(32);
  
  // 5. service_type: String = "s" (1 char)
  const serviceType = new Uint8Array([
    1, 0, 0, 0,           // length = 1
    0x73,                 // "s"
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // padding to 32
  ]);
  
  // 6. payment_token: Pubkey (32 bytes zeros)
  const paymentToken = new Uint8Array(32);
  
  // 7. estimated_delivery: i64 = 3600
  const deliveryBytes = new Uint8Array(8);
  new DataView(deliveryBytes.buffer).setBigInt64(0, 3600n, true);
  
  // 8. tags: Vec<String> = empty
  const tags = new Uint8Array([0, 0, 0, 0]); // length = 0
  
  // listing_id parameter = "1"
  const listingIdParam = new Uint8Array([
    1, 0, 0, 0,           // length = 1
    0x31,                 // "1"
    0, 0, 0               // minimal padding
  ]);
  
  // Combine all data
  const data = new Uint8Array([
    ...discriminator,
    ...title,
    ...description,
    ...priceBytes,
    ...tokenMint,
    ...serviceType,
    ...paymentToken,
    ...deliveryBytes,
    ...tags,
    ...listingIdParam
  ]);
  
  console.log('\n📊 MINIMAL INSTRUCTION ANALYSIS:');
  console.log('- Total size:', data.length, 'bytes');
  console.log('- Price value:', price.toString());
  console.log('- Price bytes:', Array.from(priceBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('- Price offset in data:', discriminator.length + title.length + description.length);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}