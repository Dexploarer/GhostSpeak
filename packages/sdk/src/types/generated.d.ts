/**
 * Type declarations for generated code compatibility
 */

declare module '@solana/instructions' {
  interface IAccountMeta<TAddress extends string = string> {
    readonly address: TAddress;
    readonly role: 'readonly' | 'writable' | 'readonly_signer' | 'writable_signer' | number;
  }

  interface IAccountSignerMeta<TAddress extends string = string, TSigner = any> extends IAccountMeta<TAddress> {
    readonly signer: TSigner;
  }
}

// Allow flexible account role types for generated code
declare global {
  type AccountRole = 'readonly' | 'writable' | 'readonly_signer' | 'writable_signer' | number;

  // Add ReadonlyUint8Array compatibility
  interface ReadonlyUint8Array {
    readonly length: number;
    readonly [n: number]: number;
    forEach(callbackfn: (value: number, index: number, array: ReadonlyUint8Array) => void, thisArg?: any): void;
    map<U>(callbackfn: (value: number, index: number, array: ReadonlyUint8Array) => U, thisArg?: any): U[];
    slice(start?: number, end?: number): ReadonlyUint8Array;
    subarray(start?: number, end?: number): ReadonlyUint8Array;
  }
}
