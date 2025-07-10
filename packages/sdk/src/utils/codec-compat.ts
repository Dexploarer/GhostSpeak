/**
 * Codec Compatibility Layer for Web3.js v2
 * Provides missing methods and fixes for generated instruction builders
 */

import {
  type Codec,
  type Encoder,
  type Decoder,
  combineCodec,
  getStructEncoder,
  getStructDecoder,
  getU32Encoder,
  getU32Decoder,
  getU64Encoder,
  getU64Decoder,
  getUtf8Encoder,
  getUtf8Decoder,
  getBytesEncoder,
  getBytesDecoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  transformEncoder,
  transformDecoder,
} from '@solana/codecs';
import { 
  getAddressEncoder,
  getAddressDecoder,
  type Address,
  address,
} from '@solana/addresses';
// Base58 validation will be done using simple regex and length checks

/**
 * Enhanced codec that includes getSizeFromValue method
 */
export interface EnhancedCodec<TFrom, TTo = TFrom> extends Codec<TFrom, TTo> {
  getSizeFromValue?: (value: TFrom) => number;
}

/**
 * Enhanced encoder with getSizeFromValue
 */
export interface EnhancedEncoder<TFrom> extends Encoder<TFrom> {
  getSizeFromValue?: (value: TFrom) => number;
}

/**
 * Add getSizeFromValue method to an encoder
 */
export function withGetSize<TFrom>(
  encoder: Encoder<TFrom>,
  getSizeFromValue: (value: TFrom) => number
): EnhancedEncoder<TFrom> {
  return {
    ...encoder,
    encode: encoder.encode.bind(encoder),
    getSizeFromValue,
  };
}

/**
 * Create enhanced struct encoder with getSizeFromValue
 */
export function getEnhancedStructEncoder<T extends object>(
  fields: Array<[keyof T, EnhancedEncoder<any>]>
): EnhancedEncoder<T> {
  const baseEncoder = getStructEncoder(fields as any);
  
  return withGetSize(baseEncoder, (value: T) => {
    let size = 0;
    for (const [key, fieldEncoder] of fields) {
      if (fieldEncoder.getSizeFromValue) {
        size += fieldEncoder.getSizeFromValue(value[key]);
      } else if (fieldEncoder.fixedSize) {
        size += fieldEncoder.fixedSize;
      } else {
        // For variable size encoders without getSizeFromValue,
        // we need to encode to get the size
        const encoded = fieldEncoder.encode(value[key]);
        size += encoded.length;
      }
    }
    return size;
  });
}

/**
 * Create enhanced address encoder with proper validation
 */
export function getEnhancedAddressEncoder(): EnhancedEncoder<Address> {
  const baseEncoder = getAddressEncoder();
  
  return withGetSize(
    {
      ...baseEncoder,
      encode: (value: Address): Uint8Array => {
        try {
          // Validate the address format
          if (!isValidBase58Address(value)) {
            throw new Error(`Invalid address format: ${value}`);
          }
          return baseEncoder.encode(value);
        } catch (error) {
          throw new Error(`Address encoding failed: ${error}`);
        }
      },
    },
    () => 32 // Addresses are always 32 bytes
  );
}

/**
 * Create enhanced UTF8 encoder with getSizeFromValue
 */
export function getEnhancedUtf8Encoder(): EnhancedEncoder<string> {
  const baseEncoder = getUtf8Encoder();
  
  return withGetSize(baseEncoder, (value: string) => {
    return new TextEncoder().encode(value).length;
  });
}

/**
 * Create enhanced bytes encoder with getSizeFromValue
 */
export function getEnhancedBytesEncoder(config: { size: number }): EnhancedEncoder<Uint8Array> {
  const baseEncoder = getBytesEncoder(config);
  
  return withGetSize(baseEncoder, () => config.size);
}

/**
 * Create enhanced U64 encoder with BigInt support
 */
export function getEnhancedU64Encoder(): EnhancedEncoder<bigint> {
  const baseEncoder = getU64Encoder();
  
  return withGetSize(
    {
      ...baseEncoder,
      encode: (value: bigint | number): Uint8Array => {
        const bigIntValue = typeof value === 'number' ? BigInt(value) : value;
        if (bigIntValue < 0n || bigIntValue > 0xFFFFFFFFFFFFFFFFn) {
          throw new Error(`Value ${bigIntValue} is out of range for u64`);
        }
        return baseEncoder.encode(bigIntValue);
      },
    },
    () => 8 // U64 is always 8 bytes
  );
}

/**
 * Create enhanced U32 encoder
 */
export function getEnhancedU32Encoder(): EnhancedEncoder<number> {
  const baseEncoder = getU32Encoder();
  
  return withGetSize(baseEncoder, () => 4); // U32 is always 4 bytes
}

/**
 * Create enhanced array encoder with size prefix
 */
export function getEnhancedArrayEncoder<T>(
  itemEncoder: EnhancedEncoder<T>
): EnhancedEncoder<T[]> {
  const baseEncoder = addEncoderSizePrefix(
    {
      encode: (items: T[]): Uint8Array => {
        const chunks: Uint8Array[] = [];
        for (const item of items) {
          chunks.push(itemEncoder.encode(item));
        }
        return combineBytes(chunks);
      },
    },
    getU32Encoder()
  );
  
  return withGetSize(baseEncoder, (items: T[]) => {
    let size = 4; // 4 bytes for the length prefix
    for (const item of items) {
      if (itemEncoder.getSizeFromValue) {
        size += itemEncoder.getSizeFromValue(item);
      } else if (itemEncoder.fixedSize) {
        size += itemEncoder.fixedSize;
      } else {
        size += itemEncoder.encode(item).length;
      }
    }
    return size;
  });
}

/**
 * Validate base58 address format
 */
export function isValidBase58Address(value: string): boolean {
  try {
    // Check if it's a string
    if (typeof value !== 'string') {
      return false;
    }
    
    // Check length (Solana addresses are 32-44 characters in base58)
    if (value.length < 32 || value.length > 44) {
      return false;
    }
    
    // Check if it only contains valid base58 characters
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    if (!base58Regex.test(value)) {
      return false;
    }
    
    // Basic validation - in a real implementation you'd use proper base58 validation
    // For now, we'll trust the @solana/addresses module to validate properly
    try {
      address(value);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Create address from string with validation
 */
export function createAddress(value: string): Address {
  if (!isValidBase58Address(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return address(value);
}

/**
 * Safe BigInt conversion
 */
export function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(`Cannot convert non-integer ${value} to BigInt`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    return BigInt(value);
  }
  throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

/**
 * Combine multiple byte arrays
 */
function combineBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Create enhanced instruction data encoder
 */
export function createInstructionDataEncoder<TArgs>(
  discriminator: Uint8Array,
  fields: Array<[string, EnhancedEncoder<any>]>
): EnhancedEncoder<TArgs> {
  const allFields = [
    ['discriminator', getEnhancedBytesEncoder({ size: discriminator.length })],
    ...fields,
  ] as Array<[string, EnhancedEncoder<any>]>;
  
  const structEncoder = getEnhancedStructEncoder(allFields);
  
  return transformEncoder(structEncoder, (value: TArgs) => ({
    ...value,
    discriminator,
  }));
}

/**
 * Re-export commonly used codecs with enhancements
 */
export {
  getStructEncoder,
  getStructDecoder,
  getBytesDecoder,
  getUtf8Decoder,
  getU32Decoder,
  getU64Decoder,
  addDecoderSizePrefix,
  combineCodec,
  transformEncoder,
  transformDecoder,
  type Codec,
  type Encoder,
  type Decoder,
};

/**
 * Export enhanced versions as the default
 */
export const codecs = {
  struct: getEnhancedStructEncoder,
  address: getEnhancedAddressEncoder,
  utf8: getEnhancedUtf8Encoder,
  bytes: getEnhancedBytesEncoder,
  u64: getEnhancedU64Encoder,
  u32: getEnhancedU32Encoder,
  array: getEnhancedArrayEncoder,
};