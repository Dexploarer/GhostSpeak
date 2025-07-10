/**
 * Type fixes for generated instruction compatibility
 */

import type { IAccountMeta } from '../utils/instruction-compat';

// Type assertion utilities for generated code
export function asAccountArray<T extends readonly any[]>(
  accounts: T
): readonly IAccountMeta<string>[] {
  return accounts as any;
}

export function asInstructionData(data: Uint8Array): Uint8Array {
  return new Uint8Array(data);
}

export function suppressTypeError<T>(value: any): T {
  return value as T;
}
