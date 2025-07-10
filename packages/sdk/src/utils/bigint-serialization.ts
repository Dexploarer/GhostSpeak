/**
 * BigInt Serialization Utilities for Web3.js v2
 * Provides robust BigInt handling for Solana blockchain interactions
 */

import { 
  getU64Encoder, 
  getU64Decoder, 
  transformEncoder, 
  transformDecoder,
  type Encoder,
  type Decoder,
  type Codec,
  combineCodec
} from '@solana/codecs';

/**
 * Safe BigInt conversion with overflow protection
 */
export function safeBigIntToU64(value: bigint | number): bigint {
  const bigIntValue = typeof value === 'number' ? BigInt(value) : value;
  
  if (bigIntValue < 0n) {
    throw new Error(`BigInt value cannot be negative: ${bigIntValue}`);
  }
  
  const MAX_U64 = 18446744073709551615n; // 2^64 - 1
  if (bigIntValue > MAX_U64) {
    throw new Error(`BigInt value exceeds u64 maximum (${MAX_U64}): ${bigIntValue}`);
  }
  
  return bigIntValue;
}

/**
 * Safe number to BigInt conversion with validation
 */
export function safeNumberToBigInt(value: number | bigint): bigint {
  if (typeof value === 'bigint') {
    return safeBigIntToU64(value);
  }
  
  if (!Number.isInteger(value)) {
    throw new Error(`Number must be an integer: ${value}`);
  }
  
  if (value < 0) {
    throw new Error(`Number cannot be negative: ${value}`);
  }
  
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new Error(`Number exceeds safe integer range: ${value}`);
  }
  
  return BigInt(value);
}

/**
 * Enhanced U64 encoder with flexible input types
 */
export function getFlexibleU64Encoder(): Encoder<number | bigint> {
  return transformEncoder(
    getU64Encoder(),
    (value: number | bigint) => safeNumberToBigInt(value)
  );
}

/**
 * Enhanced U64 decoder that always returns BigInt
 */
export function getFlexibleU64Decoder(): Decoder<bigint> {
  return getU64Decoder();
}

/**
 * Combined codec for flexible BigInt handling
 */
export function getFlexibleU64Codec(): Codec<number | bigint, bigint> {
  return combineCodec(
    getFlexibleU64Encoder(),
    getFlexibleU64Decoder()
  );
}

/**
 * Timestamp utilities for blockchain timestamps
 */
export class TimestampUtils {
  /**
   * Convert JavaScript Date to blockchain timestamp (seconds since epoch)
   */
  static dateToTimestamp(date: Date): bigint {
    return BigInt(Math.floor(date.getTime() / 1000));
  }
  
  /**
   * Convert blockchain timestamp to JavaScript Date
   */
  static timestampToDate(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }
  
  /**
   * Get current timestamp as BigInt
   */
  static now(): bigint {
    return BigInt(Math.floor(Date.now() / 1000));
  }
  
  /**
   * Add duration to timestamp
   */
  static addDuration(timestamp: bigint, durationSeconds: number): bigint {
    return timestamp + BigInt(durationSeconds);
  }
  
  /**
   * Check if timestamp is in the past
   */
  static isExpired(timestamp: bigint): boolean {
    return timestamp < TimestampUtils.now();
  }
}

/**
 * Token amount utilities for precise calculations
 */
export class TokenAmountUtils {
  /**
   * Convert token amount with decimals to raw amount
   */
  static toRawAmount(amount: number, decimals: number): bigint {
    if (amount < 0) {
      throw new Error('Token amount cannot be negative');
    }
    
    const multiplier = 10 ** decimals;
    return BigInt(Math.floor(amount * multiplier));
  }
  
  /**
   * Convert raw amount to human-readable amount with decimals
   */
  static fromRawAmount(rawAmount: bigint, decimals: number): number {
    // For large BigInt values, we need to handle division carefully to avoid precision loss
    if (decimals === 0) {
      return Number(rawAmount);
    }
    
    const divisor = BigInt(10 ** decimals);
    const quotient = rawAmount / divisor;
    const remainder = rawAmount % divisor;
    
    // Check if the quotient exceeds safe integer range
    if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Amount ${rawAmount} is too large to convert to number safely`);
    }
    
    // Calculate decimal part with proper precision
    const decimalPart = Number(remainder) / (10 ** decimals);
    return Number(quotient) + decimalPart;
  }
  
  /**
   * Format amount for display with proper decimal places
   */
  static formatAmount(amount: bigint, decimals: number, displayDecimals = 6): string {
    const humanAmount = TokenAmountUtils.fromRawAmount(amount, decimals);
    return humanAmount.toFixed(displayDecimals);
  }
  
  /**
   * Parse string amount to raw BigInt
   */
  static parseAmount(amountStr: string, decimals: number): bigint {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount string: ${amountStr}`);
    }
    return TokenAmountUtils.toRawAmount(amount, decimals);
  }
}

/**
 * ID generation utilities for consistent ID handling
 */
export class IdUtils {
  /**
   * Generate a random ID as BigInt
   */
  static generateRandomId(): bigint {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    
    let result = 0n;
    for (let i = 0; i < 8; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    
    return result;
  }
  
  /**
   * Convert string ID to BigInt (for database IDs, etc.)
   */
  static stringToId(str: string): bigint {
    const num = parseInt(str, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid ID string: ${str}`);
    }
    return BigInt(num);
  }
  
  /**
   * Ensure ID is within valid range
   */
  static validateId(id: bigint): bigint {
    if (id < 0n) {
      throw new Error('ID cannot be negative');
    }
    if (id > 0xFFFFFFFFFFFFFFFFn) { // Max u64
      throw new Error('ID exceeds maximum value');
    }
    return id;
  }
}

/**
 * Serialization validation utilities
 */
export class SerializationValidator {
  /**
   * Validate all BigInt fields in an object
   */
  static validateBigIntFields(obj: Record<string, any>, fields: string[]): void {
    for (const field of fields) {
      if (obj[field] !== undefined && obj[field] !== null) {
        try {
          safeBigIntToU64(obj[field]);
        } catch (error) {
          throw new Error(`Invalid BigInt value for field '${field}': ${error}`);
        }
      }
    }
  }
  
  /**
   * Sanitize object by converting number fields to BigInt
   */
  static sanitizeBigIntFields<T extends Record<string, any>>(
    obj: T, 
    fields: string[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = safeNumberToBigInt(result[field]);
      }
    }
    
    return result;
  }
}

// Re-export common types for convenience
export type BigIntLike = bigint | number;
export type TimestampLike = bigint | number | Date;

/**
 * Convert any timestamp-like value to BigInt
 */
export function toTimestamp(value: TimestampLike): bigint {
  if (value instanceof Date) {
    return TimestampUtils.dateToTimestamp(value);
  }
  return safeNumberToBigInt(value);
}