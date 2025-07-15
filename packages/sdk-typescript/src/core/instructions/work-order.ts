/**
 * Work Order Instructions - July 2025 Implementation
 */

import { 
  type Address 
} from '@solana/addresses';
import { 
  type IAccountMeta,
  type IInstruction,
  AccountRole
} from '@solana/instructions';
import type { TransactionSigner } from '@solana/signers';
import { GHOSTSPEAK_PROGRAM_ID } from '../types.js';
import { deriveWorkOrderPda } from '../utils.js';

/**
 * Purchase Service instruction (creates work order)
 * Discriminator: [194, 57, 126, 134, 253, 24, 15, 4]
 */
export async function createPurchaseServiceInstruction(
  buyer: TransactionSigner,
  listing: Address,
  seller: Address,
  amount: bigint
): Promise<IInstruction> {
  // Derive work order PDA
  const workOrderPda = await deriveWorkOrderPda(listing, buyer.address);
  
  const accounts: IAccountMeta[] = [
    { 
      address: workOrderPda,
      role: AccountRole.WRITABLE
    },
    {
      address: listing,
      role: AccountRole.READONLY
    },
    {
      address: buyer.address,
      role: AccountRole.WRITABLE_SIGNER
    },
    {
      address: seller,
      role: AccountRole.WRITABLE
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
  const discriminator = new Uint8Array([194, 57, 126, 134, 253, 24, 15, 4]);
  
  const amountBytes = new Uint8Array(8);
  new DataView(amountBytes.buffer).setBigUint64(0, amount, true);
  
  const data = new Uint8Array(discriminator.length + amountBytes.length);
  data.set(discriminator, 0);
  data.set(amountBytes, discriminator.length);
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts,
    data
  };
}