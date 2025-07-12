/**
 * Temporary stub for registerAgent instruction
 * This file is created to fix build errors until proper code generation is complete
 */

import type { Address } from '@solana/addresses';
import type { IInstruction } from '@solana/instructions';
import type { IAccountMeta } from '@solana/accounts';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';

export interface RegisterAgentInstructionDataArgs {
  agentPubkey: Address;
  capabilities: bigint;
  metadataUri: string;
}

export interface RegisterAgentAsyncInput {
  signer: KeyPairSigner;
  capabilities: bigint;
  metadataUri: string;
}

// Temporary implementation - this should be replaced with proper codegen
export async function getRegisterAgentInstructionAsync(
  input: RegisterAgentAsyncInput,
  config?: { programAddress?: Address }
): Promise<IInstruction> {
  // This is a stub implementation
  // The actual implementation will be generated from the IDL
  throw new Error('RegisterAgent instruction not yet implemented. Please run code generation.');
}

export type RegisterAgentInstruction = IInstruction;