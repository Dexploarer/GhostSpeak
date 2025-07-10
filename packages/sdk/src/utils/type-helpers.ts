/**
 * Type assertion helpers for Web3.js v2 compatibility
 */

import type { IAccountMeta, IAccountSignerMeta } from './instruction-compat.js';
import type { Address } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';

/**
 * Convert ReadonlyUint8Array to Uint8Array
 */
export function toUint8Array(data: readonly number[] | Uint8Array): Uint8Array {
  return new Uint8Array(data);
}

/**
 * Type assertion for account meta
 */
export function asAccountMeta<T extends string = string>(
  account: string | IAccountMeta<T>
): IAccountMeta<T> {
  if (typeof account === 'string') {
    return {
      address: account as Address<T>,
      role: 'readonly' as const,
    };
  }
  return account;
}

/**
 * Type assertion for signer account meta
 */
export function asSignerAccountMeta<T extends string = string>(
  account: string | IAccountSignerMeta<T, TransactionSigner<T>>
): IAccountSignerMeta<T, TransactionSigner<T>> {
  if (typeof account === 'string') {
    return {
      address: account as Address<T>,
      role: 'readonly_signer' as const,
      signer: undefined as any, // Will be properly typed at usage
    };
  }
  return account;
}

/**
 * Create a writable account meta
 */
export function createWritableAccount<T extends string = string>(
  address: Address<T>
): IAccountMeta<T> {
  return {
    address,
    role: 'writable' as const,
  };
}

/**
 * Create a readonly account meta
 */
export function createReadonlyAccount<T extends string = string>(
  address: Address<T>
): IAccountMeta<T> {
  return {
    address,
    role: 'readonly' as const,
  };
}

/**
 * Create a writable signer account meta
 */
export function createWritableSignerAccount<T extends string = string>(
  address: Address<T>,
  signer: TransactionSigner<T>
): IAccountSignerMeta<T, TransactionSigner<T>> {
  return {
    address,
    role: 'writable_signer' as const,
    signer,
  };
}

/**
 * Create a readonly signer account meta
 */
export function createReadonlySignerAccount<T extends string = string>(
  address: Address<T>,
  signer: TransactionSigner<T>
): IAccountSignerMeta<T, TransactionSigner<T>> {
  return {
    address,
    role: 'readonly_signer' as const,
    signer,
  };
}
