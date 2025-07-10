/**
 * Secure wrapper for bigint-buffer to mitigate CVE-2025-3194
 * 
 * This module provides a secure implementation of BigInt to Buffer conversions
 * with comprehensive validation and overflow protection to address the security
 * vulnerability in bigint-buffer <= 1.1.5
 * 
 * @security CVE-2025-3194 - Buffer overflow via toBigIntLE() function
 * @see https://github.com/advisories/GHSA-3gc7-fjrx-p6mg
 */

/**
 * Maximum safe buffer size to prevent overflow attacks
 * Limited to 8 bytes (64 bits) which is the maximum for u64 in Solana
 */
const MAX_BUFFER_SIZE = 8;

/**
 * Maximum value for u64 (2^64 - 1)
 */
const MAX_U64 = 0xFFFFFFFFFFFFFFFFn;

/**
 * Validates buffer size to prevent overflow
 */
function validateBufferSize(buffer: Buffer | Uint8Array, operation: string): void {
  if (!buffer) {
    throw new Error(`${operation}: Buffer cannot be null or undefined`);
  }
  
  if (buffer.length > MAX_BUFFER_SIZE) {
    throw new Error(
      `${operation}: Buffer size ${buffer.length} exceeds maximum allowed size ${MAX_BUFFER_SIZE}`
    );
  }
}

/**
 * Validates BigInt value is within safe bounds
 */
function validateBigIntValue(value: bigint, operation: string): void {
  if (value < 0n) {
    throw new Error(`${operation}: BigInt value cannot be negative: ${value}`);
  }
  
  if (value > MAX_U64) {
    throw new Error(
      `${operation}: BigInt value ${value} exceeds maximum u64 value ${MAX_U64}`
    );
  }
}

/**
 * Securely converts a Buffer to BigInt in little-endian format
 * Replacement for vulnerable bigint-buffer.toBigIntLE()
 */
export function secureToBigIntLE(buffer: Buffer | Uint8Array): bigint {
  validateBufferSize(buffer, 'secureToBigIntLE');
  
  let result = 0n;
  const bytes = new Uint8Array(buffer);
  
  // Process bytes in little-endian order
  for (let i = 0; i < bytes.length; i++) {
    // Validate each byte
    if (bytes[i] > 255) {
      throw new Error(`secureToBigIntLE: Invalid byte value at position ${i}: ${bytes[i]}`);
    }
    
    // Build the BigInt safely
    result = result | (BigInt(bytes[i]) << (BigInt(i) * 8n));
    
    // Check for overflow after each operation
    if (result > MAX_U64) {
      throw new Error(
        `secureToBigIntLE: Overflow detected at byte position ${i}. Result ${result} exceeds maximum`
      );
    }
  }
  
  return result;
}

/**
 * Securely converts a Buffer to BigInt in big-endian format
 * Replacement for vulnerable bigint-buffer.toBigIntBE()
 */
export function secureToBigIntBE(buffer: Buffer | Uint8Array): bigint {
  validateBufferSize(buffer, 'secureToBigIntBE');
  
  let result = 0n;
  const bytes = new Uint8Array(buffer);
  
  // Process bytes in big-endian order
  for (let i = 0; i < bytes.length; i++) {
    // Validate each byte
    if (bytes[i] > 255) {
      throw new Error(`secureToBigIntBE: Invalid byte value at position ${i}: ${bytes[i]}`);
    }
    
    // Build the BigInt safely
    result = (result << 8n) | BigInt(bytes[i]);
    
    // Check for overflow after each operation
    if (result > MAX_U64) {
      throw new Error(
        `secureToBigIntBE: Overflow detected at byte position ${i}. Result ${result} exceeds maximum`
      );
    }
  }
  
  return result;
}

/**
 * Securely converts a BigInt to Buffer in little-endian format
 * Replacement for vulnerable bigint-buffer.toBufferLE()
 */
export function secureToBufferLE(value: bigint, width: number = 8): Buffer {
  validateBigIntValue(value, 'secureToBufferLE');
  
  if (width <= 0 || width > MAX_BUFFER_SIZE) {
    throw new Error(
      `secureToBufferLE: Invalid width ${width}. Must be between 1 and ${MAX_BUFFER_SIZE}`
    );
  }
  
  const buffer = Buffer.alloc(width);
  let temp = value;
  
  for (let i = 0; i < width; i++) {
    buffer[i] = Number(temp & 0xFFn);
    temp = temp >> 8n;
  }
  
  // Ensure the value fits in the specified width
  if (temp > 0n) {
    throw new Error(
      `secureToBufferLE: Value ${value} does not fit in ${width} bytes`
    );
  }
  
  return buffer;
}

/**
 * Securely converts a BigInt to Buffer in big-endian format
 * Replacement for vulnerable bigint-buffer.toBufferBE()
 */
export function secureToBufferBE(value: bigint, width: number = 8): Buffer {
  validateBigIntValue(value, 'secureToBufferBE');
  
  if (width <= 0 || width > MAX_BUFFER_SIZE) {
    throw new Error(
      `secureToBufferBE: Invalid width ${width}. Must be between 1 and ${MAX_BUFFER_SIZE}`
    );
  }
  
  const buffer = Buffer.alloc(width);
  let temp = value;
  
  for (let i = width - 1; i >= 0; i--) {
    buffer[i] = Number(temp & 0xFFn);
    temp = temp >> 8n;
  }
  
  // Ensure the value fits in the specified width
  if (temp > 0n) {
    throw new Error(
      `secureToBufferBE: Value ${value} does not fit in ${width} bytes`
    );
  }
  
  return buffer;
}

/**
 * Secure wrapper class that provides the same interface as bigint-buffer
 * but with comprehensive security validations
 */
export class SecureBigIntBuffer {
  private readonly buffer: Buffer;
  
  constructor(buffer: Buffer | Uint8Array) {
    validateBufferSize(buffer, 'SecureBigIntBuffer constructor');
    this.buffer = Buffer.from(buffer);
  }
  
  toBigIntLE(): bigint {
    return secureToBigIntLE(this.buffer);
  }
  
  toBigIntBE(): bigint {
    return secureToBigIntBE(this.buffer);
  }
  
  static toBufferLE(value: bigint, width?: number): Buffer {
    return secureToBufferLE(value, width);
  }
  
  static toBufferBE(value: bigint, width?: number): Buffer {
    return secureToBufferBE(value, width);
  }
  
  static fromBufferLE(buffer: Buffer | Uint8Array): bigint {
    return secureToBigIntLE(buffer);
  }
  
  static fromBufferBE(buffer: Buffer | Uint8Array): bigint {
    return secureToBigIntBE(buffer);
  }
}

/**
 * Polyfill exports for drop-in replacement of bigint-buffer
 * These can be used to monkey-patch the vulnerable module
 */
export const polyfill = {
  toBigIntLE: secureToBigIntLE,
  toBigIntBE: secureToBigIntBE,
  toBufferLE: secureToBufferLE,
  toBufferBE: secureToBufferBE,
};

/**
 * Security audit trail for tracking usage
 */
export interface SecurityAuditEntry {
  operation: string;
  timestamp: Date;
  inputSize?: number;
  outputValue?: string;
  error?: string;
}

/**
 * Audited wrapper that logs all operations for security monitoring
 */
export class AuditedBigIntBuffer {
  private static auditLog: SecurityAuditEntry[] = [];
  private static maxLogSize = 1000;
  
  static toBigIntLE(buffer: Buffer | Uint8Array): bigint {
    const entry: SecurityAuditEntry = {
      operation: 'toBigIntLE',
      timestamp: new Date(),
      inputSize: buffer.length,
    };
    
    try {
      const result = secureToBigIntLE(buffer);
      entry.outputValue = result.toString();
      this.addAuditEntry(entry);
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      this.addAuditEntry(entry);
      throw error;
    }
  }
  
  static toBigIntBE(buffer: Buffer | Uint8Array): bigint {
    const entry: SecurityAuditEntry = {
      operation: 'toBigIntBE',
      timestamp: new Date(),
      inputSize: buffer.length,
    };
    
    try {
      const result = secureToBigIntBE(buffer);
      entry.outputValue = result.toString();
      this.addAuditEntry(entry);
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      this.addAuditEntry(entry);
      throw error;
    }
  }
  
  static toBufferLE(value: bigint, width?: number): Buffer {
    const entry: SecurityAuditEntry = {
      operation: 'toBufferLE',
      timestamp: new Date(),
      inputSize: width,
    };
    
    try {
      const result = secureToBufferLE(value, width);
      entry.outputValue = `Buffer(${result.length})`;
      this.addAuditEntry(entry);
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      this.addAuditEntry(entry);
      throw error;
    }
  }
  
  static toBufferBE(value: bigint, width?: number): Buffer {
    const entry: SecurityAuditEntry = {
      operation: 'toBufferBE',
      timestamp: new Date(),
      inputSize: width,
    };
    
    try {
      const result = secureToBufferBE(value, width);
      entry.outputValue = `Buffer(${result.length})`;
      this.addAuditEntry(entry);
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      this.addAuditEntry(entry);
      throw error;
    }
  }
  
  private static addAuditEntry(entry: SecurityAuditEntry): void {
    this.auditLog.push(entry);
    
    // Prevent unbounded growth
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }
  }
  
  static getAuditLog(): readonly SecurityAuditEntry[] {
    return [...this.auditLog];
  }
  
  static clearAuditLog(): void {
    this.auditLog = [];
  }
  
  static getSecurityMetrics(): {
    totalOperations: number;
    errorCount: number;
    largestInput: number;
    operations: Record<string, number>;
  } {
    const metrics = {
      totalOperations: this.auditLog.length,
      errorCount: 0,
      largestInput: 0,
      operations: {} as Record<string, number>,
    };
    
    for (const entry of this.auditLog) {
      // Count errors
      if (entry.error) {
        metrics.errorCount++;
      }
      
      // Track largest input
      if (entry.inputSize && entry.inputSize > metrics.largestInput) {
        metrics.largestInput = entry.inputSize;
      }
      
      // Count operations
      metrics.operations[entry.operation] = (metrics.operations[entry.operation] || 0) + 1;
    }
    
    return metrics;
  }
}

// Export default secure implementation
export default SecureBigIntBuffer;