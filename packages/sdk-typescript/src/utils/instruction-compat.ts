/**
 * Instruction compatibility shim for Web3.js v2
 * Provides the missing interface types that generated code expects
 */

import type { Address } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';

// Core instruction interfaces that generated code expects
export interface IInstruction<
  TProgramAddress extends string = string, 
  TAccounts extends readonly unknown[] = readonly unknown[]
> {
  readonly programAddress: Address<TProgramAddress>;
  readonly accounts: TAccounts;
}

export interface IInstructionWithData<TData = Uint8Array> extends IInstruction {
  readonly data: TData;
}

export interface IInstructionWithAccounts<TAccounts extends readonly unknown[] = readonly unknown[]> 
  extends IInstruction<string, TAccounts> {
  readonly accounts: TAccounts;
}

// Account meta interfaces
export interface IAccountMeta<TAddress extends string = string> {
  readonly address: Address<TAddress>;
  readonly role: AccountRole;
}

export interface IAccountSignerMeta<TAddress extends string = string, TSigner = TransactionSigner<TAddress>> 
  extends IAccountMeta<TAddress> {
  readonly signer: TSigner;
}

export interface IAccountLookupMeta<TAddress extends string = string, TLookupTableAddress extends string = string> {
  readonly address: TAddress;
  readonly addressIndex: number;
  readonly lookupTableAddress: Address<TLookupTableAddress>;
  readonly role: AccountRole;
}

// Account role type
export type AccountRole = 'readonly' | 'writable' | 'readonly_signer' | 'writable_signer';

// Account role enum constants for compatibility
export const AccountRole = {
  READONLY: 'readonly' as const,
  WRITABLE: 'writable' as const,
  READONLY_SIGNER: 'readonly_signer' as const,
  WRITABLE_SIGNER: 'writable_signer' as const
} as const;

// Re-export for convenience
export type {
  Address,
  TransactionSigner
};