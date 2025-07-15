/**
 * Core Utils - July 2025 Web3.js v2 Patterns
 */

import { getAddressEncoder, getProgramDerivedAddress, type Address } from '@solana/addresses';
import { GHOSTSPEAK_PROGRAM_ID } from './types.js';

/**
 * Derive PDA for agent account
 */
export async function deriveAgentPda(owner: Address, agentId: string): Promise<Address> {
  const encoder = getAddressEncoder();
  const seeds = [
    Buffer.from('agent'),
    encoder.encode(owner),
    Buffer.from(agentId)
  ];
  
  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds
  });
  
  return pda;
}

/**
 * Derive PDA for service listing
 * CRITICAL: Must match Rust seeds exactly: [b"service_listing", creator.key().as_ref(), listing_id.as_bytes()]
 */
export async function deriveServiceListingPda(creator: Address, listingId: bigint): Promise<Address> {
  const encoder = getAddressEncoder();
  const seeds = [
    Buffer.from('service_listing'),
    encoder.encode(creator),
    Buffer.from(listingId.toString()) // Convert to string then to bytes like Rust listing_id.as_bytes()
  ];
  
  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds
  });
  
  return pda;
}

/**
 * Derive PDA for work order
 */
export async function deriveWorkOrderPda(listing: Address, buyer: Address): Promise<Address> {
  const encoder = getAddressEncoder();
  const seeds = [
    Buffer.from('work_order'),
    encoder.encode(listing),
    encoder.encode(buyer)
  ];
  
  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds
  });
  
  return pda;
}

/**
 * Serialize string for Anchor
 */
export function serializeString(str: string, maxLen: number): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const buffer = new Uint8Array(4 + maxLen);
  
  // Write length (u32 little-endian)
  new DataView(buffer.buffer).setUint32(0, encoded.length, true);
  
  // Write string data
  buffer.set(encoded.slice(0, maxLen), 4);
  
  return buffer;
}

/**
 * Serialize vector for Anchor
 */
export function serializeVec<T>(items: T[], serializeItem: (item: T) => Uint8Array): Uint8Array {
  const serializedItems = items.map(serializeItem);
  const totalLength = 4 + serializedItems.reduce((sum, item) => sum + item.length, 0);
  const buffer = new Uint8Array(totalLength);
  
  // Write vector length (u32 little-endian)
  new DataView(buffer.buffer).setUint32(0, items.length, true);
  
  // Write items
  let offset = 4;
  for (const item of serializedItems) {
    buffer.set(item, offset);
    offset += item.length;
  }
  
  return buffer;
}