/**
 * Instruction Builder Fixes
 * Resolves account count mismatches and type issues in generated code
 */

import type { Address } from '@solana/addresses';
import type { IAccountMeta, IInstruction, AccountRole } from './instruction-compat';
import { getFlexibleU64Encoder, safeNumberToBigInt } from './bigint-serialization';

/**
 * Enhanced account resolver with proper type checking
 */
export interface ResolvedAccount {
  value: Address | null;
  isWritable: boolean;
  isSigner?: boolean;
  role?: AccountRole;
}

/**
 * Account validation and resolution utilities
 */
export class AccountResolver {
  /**
   * Validate account count matches expected
   */
  static validateAccountCount(
    accounts: readonly IAccountMeta[],
    expected: number,
    instructionName: string
  ): void {
    if (accounts.length < expected) {
      throw new Error(
        `${instructionName}: Not enough accounts provided. Expected ${expected}, got ${accounts.length}`
      );
    }
  }

  /**
   * Safely get account from array with bounds checking
   */
  static getAccount(
    accounts: readonly IAccountMeta[],
    index: number,
    accountName: string,
    instructionName: string
  ): IAccountMeta {
    if (index >= accounts.length) {
      throw new Error(
        `${instructionName}: Account '${accountName}' at index ${index} not found. Only ${accounts.length} accounts provided.`
      );
    }
    return accounts[index];
  }

  /**
   * Resolve account with default values and proper typing
   */
  static resolveAccount(
    inputAccount: Address | null | undefined,
    defaultAddress?: Address,
    isWritable = false,
    isSigner = false
  ): ResolvedAccount {
    return {
      value: inputAccount ?? defaultAddress ?? null,
      isWritable,
      isSigner,
      role: isSigner 
        ? (isWritable ? 'writable_signer' : 'readonly_signer')
        : (isWritable ? 'writable' : 'readonly')
    };
  }

  /**
   * Convert resolved account to IAccountMeta format
   */
  static toAccountMeta(resolved: ResolvedAccount): IAccountMeta {
    if (!resolved.value) {
      throw new Error('Account address cannot be null');
    }

    return {
      address: resolved.value,
      role: resolved.role || (resolved.isWritable ? 'writable' : 'readonly')
    };
  }
}

/**
 * Instruction data encoding utilities with BigInt support
 */
export class InstructionDataEncoder {
  /**
   * Create encoder for instruction data with BigInt handling
   */
  static createDataEncoder<TArgs, TData>(
    structFields: Array<[string, any]>,
    discriminator: Uint8Array
  ) {
    return {
      encode: (args: TArgs): Uint8Array => {
        try {
          // Transform BigInt fields to ensure proper encoding
          const transformedArgs = this.transformBigIntFields(args);
          
          // Add discriminator to the beginning
          const data = { ...transformedArgs, discriminator };
          
          // Use the struct encoder with the transformed data
          const encoder = getStructEncoder(structFields);
          return encoder.encode(data);
        } catch (error) {
          throw new Error(`Failed to encode instruction data: ${error}`);
        }
      }
    };
  }

  /**
   * Transform BigInt fields for safe encoding
   */
  private static transformBigIntFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result = { ...obj };
    
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'number' || typeof value === 'bigint') {
        // Convert to safe BigInt
        result[key] = safeNumberToBigInt(value);
      } else if (Array.isArray(value)) {
        // Handle arrays
        result[key] = value.map(item => 
          typeof item === 'number' || typeof item === 'bigint' 
            ? safeNumberToBigInt(item) 
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively transform nested objects
        result[key] = this.transformBigIntFields(value);
      }
    }

    return result;
  }
}

/**
 * Enhanced instruction builder with proper error handling
 */
export class InstructionBuilder {
  /**
   * Build instruction with comprehensive validation
   */
  static buildInstruction<T extends IInstruction>(
    programAddress: Address,
    accounts: ResolvedAccount[],
    instructionData: Uint8Array,
    instructionName: string
  ): T {
    // Validate all accounts have addresses
    const validatedAccounts = accounts.map((account, index) => {
      if (!account.value) {
        throw new Error(
          `${instructionName}: Account at index ${index} has null address`
        );
      }
      return AccountResolver.toAccountMeta(account);
    });

    // Build the instruction
    const instruction = {
      programAddress,
      accounts: validatedAccounts,
      data: instructionData
    } as T;

    return instruction;
  }

  /**
   * Create instruction with proper account resolution
   */
  static createInstruction<TInput, TInstruction extends IInstruction>(
    programAddress: Address,
    input: TInput,
    accountsBuilder: (input: TInput) => ResolvedAccount[],
    dataEncoder: { encode: (input: TInput) => Uint8Array },
    instructionName: string
  ): TInstruction {
    try {
      // Resolve accounts
      const accounts = accountsBuilder(input);
      
      // Encode data
      const data = dataEncoder.encode(input);
      
      // Build instruction
      return this.buildInstruction<TInstruction>(
        programAddress,
        accounts,
        data,
        instructionName
      );
    } catch (error) {
      throw new Error(`Failed to create ${instructionName} instruction: ${error}`);
    }
  }
}

/**
 * System program constants and helpers
 */
export const SYSTEM_PROGRAM_ADDRESS = '11111111111111111111111111111111' as Address;
export const TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address;
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address;

/**
 * Common account resolvers
 */
export const CommonAccounts = {
  /**
   * Resolve system program account
   */
  systemProgram: (): ResolvedAccount => ({
    value: SYSTEM_PROGRAM_ADDRESS,
    isWritable: false,
    isSigner: false,
    role: 'readonly'
  }),

  /**
   * Resolve token program account
   */
  tokenProgram: (): ResolvedAccount => ({
    value: TOKEN_PROGRAM_ADDRESS,
    isWritable: false,
    isSigner: false,
    role: 'readonly'
  }),

  /**
   * Resolve associated token program account
   */
  associatedTokenProgram: (): ResolvedAccount => ({
    value: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    isWritable: false,
    isSigner: false,
    role: 'readonly'
  })
};

/**
 * Validation utilities for instruction parameters
 */
export class ParameterValidator {
  /**
   * Validate required string parameter
   */
  static validateString(value: string, paramName: string, minLength = 1): void {
    if (typeof value !== 'string') {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.length < minLength) {
      throw new Error(`${paramName} must be at least ${minLength} characters long`);
    }
  }

  /**
   * Validate required address parameter
   */
  static validateAddress(value: Address | undefined | null, paramName: string): Address {
    if (!value) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  /**
   * Validate BigInt parameter
   */
  static validateBigInt(value: bigint | number, paramName: string, min = 0n): bigint {
    const bigintValue = safeNumberToBigInt(value);
    if (bigintValue < min) {
      throw new Error(`${paramName} must be at least ${min}`);
    }
    return bigintValue;
  }

  /**
   * Validate array parameter
   */
  static validateArray<T>(value: T[], paramName: string, minLength = 0): T[] {
    if (!Array.isArray(value)) {
      throw new Error(`${paramName} must be an array`);
    }
    if (value.length < minLength) {
      throw new Error(`${paramName} must have at least ${minLength} items`);
    }
    return value;
  }
}

/**
 * Instruction parser utilities with enhanced error handling
 */
export class InstructionParser {
  /**
   * Parse instruction with account validation
   */
  static parseInstruction<TData, TAccounts>(
    instruction: IInstruction & { data: Uint8Array },
    dataDecoder: { decode: (data: Uint8Array) => TData },
    accountNames: string[],
    instructionName: string
  ): { data: TData; accounts: Record<string, IAccountMeta> } {
    try {
      // Validate account count
      AccountResolver.validateAccountCount(
        instruction.accounts,
        accountNames.length,
        instructionName
      );

      // Parse data
      const data = dataDecoder.decode(instruction.data);

      // Map accounts to named object
      const accounts: Record<string, IAccountMeta> = {};
      accountNames.forEach((name, index) => {
        accounts[name] = AccountResolver.getAccount(
          instruction.accounts,
          index,
          name,
          instructionName
        );
      });

      return { data, accounts };
    } catch (error) {
      throw new Error(`Failed to parse ${instructionName} instruction: ${error}`);
    }
  }
}

// Re-export utilities for convenience
export { ResolvedAccount, AccountResolver, InstructionDataEncoder, InstructionBuilder };
export type { AccountRole };