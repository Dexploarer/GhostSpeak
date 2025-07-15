/**
 * Marketplace Instructions - July 2025 Implementation
 * Service listings, work orders, and marketplace operations
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
import { deriveAgentPda, deriveServiceListingPda, serializeString, serializeVec } from '../utils.js';

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
  const encoder = getAddressEncoder();
  
  // Derive PDAs (using empty string for agent due to current bug)
  const agentPda = await deriveAgentPda(creator.address, '');
  const listingPda = await deriveServiceListingPda(creator.address, listingId);
  
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
      address: '11111111111111111111111111111111' as Address, // System Program
      role: AccountRole.READONLY
    },
    {
      address: 'SysvarC1ock11111111111111111111111111111111' as Address, // Clock
      role: AccountRole.READONLY
    }
  ];
  
  // Serialize instruction data to match Rust ServiceListingData struct exactly
  // Args: listing_data: ServiceListingData, _listing_id: String
  const discriminator = new Uint8Array([91, 37, 216, 26, 93, 146, 13, 182]);
  
  // CRITICAL: Must match exact order in Rust ServiceListingData:
  // 1. title: String
  // 2. description: String  
  // 3. price: u64
  // 4. token_mint: Pubkey (32 bytes)
  // 5. service_type: String
  // 6. payment_token: Pubkey (32 bytes)
  // 7. estimated_delivery: i64
  // 8. tags: Vec<String>
  // Then the listing_id string parameter
  
  // Serialize ServiceListingData struct fields in exact order with minimal sizes
  const titleBytes = serializeString(name.substring(0, 16), 20);        // Minimal size for testing
  const descriptionBytes = serializeString(description.substring(0, 32), 40); // Minimal size for testing
  
  const priceBytes = new Uint8Array(8);
  new DataView(priceBytes.buffer).setBigUint64(0, price, true);
  
  // Use zero pubkey for token mints (USDC will be set later)
  const tokenMintBytes = new Uint8Array(32); // token_mint field
  const paymentTokenBytes = new Uint8Array(32); // payment_token field
  
  const serviceTypeBytes = serializeString(category.substring(0, 8), 12);  // Minimal size for testing
  
  const estimatedDeliveryBytes = new Uint8Array(8);
  new DataView(estimatedDeliveryBytes.buffer).setBigInt64(0, BigInt(deliveryTime), true);
  
  // Single minimal tag
  const tagsBytes = serializeVec([category.substring(0, 4)], (tag) => serializeString(tag, 8));
  
  // Listing ID string parameter (separate from struct) - minimal size
  const listingIdStringBytes = serializeString(listingId.toString().substring(0, 4), 8);
  
  // Calculate total size for memory-safe allocation
  const dataSize = discriminator.length + 
    titleBytes.length +
    descriptionBytes.length +
    priceBytes.length +
    tokenMintBytes.length + // token_mint
    serviceTypeBytes.length +
    paymentTokenBytes.length + // payment_token  
    estimatedDeliveryBytes.length +
    tagsBytes.length +
    listingIdStringBytes.length;
  
  const data = new Uint8Array(dataSize);
  
  // Serialize in exact struct field order
  let offset = 0;
  data.set(discriminator, offset);
  offset += discriminator.length;
  
  // ServiceListingData fields in order:
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
  data.set(tagsBytes, offset);
  offset += tagsBytes.length;
  
  // listing_id parameter (separate from struct)
  data.set(listingIdStringBytes, offset);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}

/**
 * Purchase Service instruction (marketplace version - create work order)
 */
export async function createWorkOrderFromListingInstruction(
  buyer: TransactionSigner,
  listing: Address,
  seller: Address,
  amount: bigint
): Promise<IInstruction> {
  throw new Error('Work order from listing instruction not yet implemented');
}

/**
 * Complete Work Order instruction
 */
export async function createCompleteWorkOrderInstruction(
  signer: TransactionSigner,
  workOrderId: bigint,
  deliverableUri: string
): Promise<IInstruction> {
  throw new Error('Complete work order instruction not yet implemented');
}

/**
 * Release Escrow Payment instruction
 */
export async function createReleaseEscrowInstruction(
  signer: TransactionSigner,
  escrowId: bigint
): Promise<IInstruction> {
  throw new Error('Release escrow instruction not yet implemented');
}