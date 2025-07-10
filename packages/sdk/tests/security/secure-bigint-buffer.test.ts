/**
 * Security Tests for Secure BigInt Buffer Implementation
 * 
 * Validates the mitigation for CVE-2025-3194 (bigint-buffer vulnerability)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  secureToBigIntLE,
  secureToBigIntBE,
  secureToBufferLE,
  secureToBufferBE,
  SecureBigIntBuffer,
  AuditedBigIntBuffer,
  type SecurityAuditEntry
} from '../../src/utils/secure-bigint-buffer';

describe('Secure BigInt Buffer Security Tests', () => {
  describe('Buffer to BigInt Conversions', () => {
    describe('secureToBigIntLE', () => {
      it('should convert valid buffers correctly', () => {
        // Test vectors
        const testCases = [
          { buffer: Buffer.from([0x00]), expected: 0n },
          { buffer: Buffer.from([0x01]), expected: 1n },
          { buffer: Buffer.from([0xFF]), expected: 255n },
          { buffer: Buffer.from([0x00, 0x01]), expected: 256n },
          { buffer: Buffer.from([0xFF, 0xFF]), expected: 65535n },
          { buffer: Buffer.from([0x12, 0x34, 0x56, 0x78]), expected: 0x78563412n },
          { 
            buffer: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), 
            expected: 0xFFFFFFFFFFFFFFFFn 
          }
        ];
        
        for (const { buffer, expected } of testCases) {
          const result = secureToBigIntLE(buffer);
          expect(result).toBe(expected);
        }
      });
      
      it('should reject oversized buffers (CVE-2025-3194 mitigation)', () => {
        const oversizedBuffers = [
          Buffer.alloc(9),   // 1 byte too large
          Buffer.alloc(16),  // Double size
          Buffer.alloc(32),  // Quadruple size
          Buffer.alloc(100), // Extremely large
        ];
        
        for (const buffer of oversizedBuffers) {
          expect(() => secureToBigIntLE(buffer))
            .toThrow(/exceeds maximum allowed size/);
        }
      });
      
      it('should reject null or undefined buffers', () => {
        expect(() => secureToBigIntLE(null as any))
          .toThrow(/Buffer cannot be null or undefined/);
        expect(() => secureToBigIntLE(undefined as any))
          .toThrow(/Buffer cannot be null or undefined/);
      });
      
      it('should handle Uint8Array inputs', () => {
        const uint8Array = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
        const result = secureToBigIntLE(uint8Array);
        expect(result).toBe(0x78563412n);
      });
    });
    
    describe('secureToBigIntBE', () => {
      it('should convert valid buffers correctly', () => {
        const testCases = [
          { buffer: Buffer.from([0x00]), expected: 0n },
          { buffer: Buffer.from([0x01]), expected: 1n },
          { buffer: Buffer.from([0xFF]), expected: 255n },
          { buffer: Buffer.from([0x01, 0x00]), expected: 256n },
          { buffer: Buffer.from([0xFF, 0xFF]), expected: 65535n },
          { buffer: Buffer.from([0x12, 0x34, 0x56, 0x78]), expected: 0x12345678n },
          { 
            buffer: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), 
            expected: 0xFFFFFFFFFFFFFFFFn 
          }
        ];
        
        for (const { buffer, expected } of testCases) {
          const result = secureToBigIntBE(buffer);
          expect(result).toBe(expected);
        }
      });
      
      it('should reject oversized buffers', () => {
        const oversized = Buffer.alloc(10);
        expect(() => secureToBigIntBE(oversized))
          .toThrow(/exceeds maximum allowed size/);
      });
    });
  });
  
  describe('BigInt to Buffer Conversions', () => {
    describe('secureToBufferLE', () => {
      it('should convert valid BigInts correctly', () => {
        const testCases = [
          { value: 0n, width: 1, expected: [0x00] },
          { value: 255n, width: 1, expected: [0xFF] },
          { value: 256n, width: 2, expected: [0x00, 0x01] },
          { value: 0x12345678n, width: 4, expected: [0x78, 0x56, 0x34, 0x12] },
          { 
            value: 0xFFFFFFFFFFFFFFFFn, 
            width: 8, 
            expected: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF] 
          }
        ];
        
        for (const { value, width, expected } of testCases) {
          const result = secureToBufferLE(value, width);
          expect(Array.from(result)).toEqual(expected);
        }
      });
      
      it('should reject negative values', () => {
        expect(() => secureToBufferLE(-1n))
          .toThrow(/cannot be negative/);
        expect(() => secureToBufferLE(-100n))
          .toThrow(/cannot be negative/);
      });
      
      it('should reject values exceeding u64 max', () => {
        const tooBig = 0xFFFFFFFFFFFFFFFFn + 1n;
        expect(() => secureToBufferLE(tooBig))
          .toThrow(/exceeds maximum u64 value/);
      });
      
      it('should reject invalid widths', () => {
        expect(() => secureToBufferLE(100n, 0))
          .toThrow(/Invalid width/);
        expect(() => secureToBufferLE(100n, -1))
          .toThrow(/Invalid width/);
        expect(() => secureToBufferLE(100n, 9))
          .toThrow(/Invalid width/);
      });
      
      it('should reject values that do not fit in specified width', () => {
        expect(() => secureToBufferLE(256n, 1))
          .toThrow(/does not fit in 1 bytes/);
        expect(() => secureToBufferLE(65536n, 2))
          .toThrow(/does not fit in 2 bytes/);
      });
    });
    
    describe('secureToBufferBE', () => {
      it('should convert valid BigInts correctly', () => {
        const testCases = [
          { value: 0n, width: 1, expected: [0x00] },
          { value: 255n, width: 1, expected: [0xFF] },
          { value: 256n, width: 2, expected: [0x01, 0x00] },
          { value: 0x12345678n, width: 4, expected: [0x12, 0x34, 0x56, 0x78] },
        ];
        
        for (const { value, width, expected } of testCases) {
          const result = secureToBufferBE(value, width);
          expect(Array.from(result)).toEqual(expected);
        }
      });
      
      it('should use default width of 8', () => {
        const result = secureToBufferBE(0x1234n);
        expect(result.length).toBe(8);
        expect(Array.from(result)).toEqual([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34]);
      });
    });
  });
  
  describe('SecureBigIntBuffer Class', () => {
    it('should provide compatible interface', () => {
      const buffer = Buffer.from([0x12, 0x34, 0x56, 0x78]);
      const secure = new SecureBigIntBuffer(buffer);
      
      expect(secure.toBigIntLE()).toBe(0x78563412n);
      expect(secure.toBigIntBE()).toBe(0x12345678n);
    });
    
    it('should provide static methods', () => {
      const value = 0x12345678n;
      
      const leBuffer = SecureBigIntBuffer.toBufferLE(value, 4);
      expect(Array.from(leBuffer)).toEqual([0x78, 0x56, 0x34, 0x12]);
      
      const beBuffer = SecureBigIntBuffer.toBufferBE(value, 4);
      expect(Array.from(beBuffer)).toEqual([0x12, 0x34, 0x56, 0x78]);
      
      expect(SecureBigIntBuffer.fromBufferLE(leBuffer)).toBe(value);
      expect(SecureBigIntBuffer.fromBufferBE(beBuffer)).toBe(value);
    });
    
    it('should reject oversized buffers in constructor', () => {
      const oversized = Buffer.alloc(16);
      expect(() => new SecureBigIntBuffer(oversized))
        .toThrow(/exceeds maximum allowed size/);
    });
  });
  
  describe('AuditedBigIntBuffer', () => {
    beforeEach(() => {
      AuditedBigIntBuffer.clearAuditLog();
    });
    
    it('should log successful operations', () => {
      const buffer = Buffer.from([0x12, 0x34, 0x56, 0x78]);
      const result = AuditedBigIntBuffer.toBigIntLE(buffer);
      
      expect(result).toBe(0x78563412n);
      
      const auditLog = AuditedBigIntBuffer.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].operation).toBe('toBigIntLE');
      expect(auditLog[0].inputSize).toBe(4);
      expect(auditLog[0].outputValue).toBe('2018915346');
      expect(auditLog[0].error).toBeUndefined();
    });
    
    it('should log failed operations', () => {
      const oversized = Buffer.alloc(16);
      
      expect(() => AuditedBigIntBuffer.toBigIntLE(oversized))
        .toThrow(/exceeds maximum allowed size/);
      
      const auditLog = AuditedBigIntBuffer.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].operation).toBe('toBigIntLE');
      expect(auditLog[0].inputSize).toBe(16);
      expect(auditLog[0].error).toContain('exceeds maximum allowed size');
    });
    
    it('should track security metrics', () => {
      // Perform various operations
      AuditedBigIntBuffer.toBigIntLE(Buffer.from([0x01]));
      AuditedBigIntBuffer.toBigIntBE(Buffer.from([0x02]));
      AuditedBigIntBuffer.toBufferLE(100n, 2);
      
      // Trigger an error
      try {
        AuditedBigIntBuffer.toBigIntLE(Buffer.alloc(20));
      } catch {}
      
      const metrics = AuditedBigIntBuffer.getSecurityMetrics();
      expect(metrics.totalOperations).toBe(4);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.largestInput).toBe(20);
      expect(metrics.operations['toBigIntLE']).toBe(2);
      expect(metrics.operations['toBigIntBE']).toBe(1);
      expect(metrics.operations['toBufferLE']).toBe(1);
    });
    
    it('should limit audit log size', () => {
      // Fill up the audit log
      for (let i = 0; i < 1005; i++) {
        AuditedBigIntBuffer.toBigIntLE(Buffer.from([i & 0xFF]));
      }
      
      const auditLog = AuditedBigIntBuffer.getAuditLog();
      expect(auditLog.length).toBe(1000); // Should be capped at max size
    });
  });
  
  describe('Edge Cases and Security Boundaries', () => {
    it('should handle empty buffers', () => {
      const empty = Buffer.alloc(0);
      const result = secureToBigIntLE(empty);
      expect(result).toBe(0n);
    });
    
    it('should handle single byte edge values', () => {
      expect(secureToBigIntLE(Buffer.from([0x00]))).toBe(0n);
      expect(secureToBigIntLE(Buffer.from([0x7F]))).toBe(127n);
      expect(secureToBigIntLE(Buffer.from([0x80]))).toBe(128n);
      expect(secureToBigIntLE(Buffer.from([0xFF]))).toBe(255n);
    });
    
    it('should handle u64 boundary values', () => {
      // Maximum u64 value
      const maxU64Buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      expect(secureToBigIntLE(maxU64Buffer)).toBe(0xFFFFFFFFFFFFFFFFn);
      
      // One less than max
      const almostMaxBuffer = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      expect(secureToBigIntLE(almostMaxBuffer)).toBe(0xFFFFFFFFFFFFFFFEn);
    });
    
    it('should provide consistent round-trip conversions', () => {
      const testValues = [
        0n,
        1n,
        255n,
        256n,
        65535n,
        65536n,
        0x12345678n,
        0xABCDEF0123456789n,
        0xFFFFFFFFFFFFFFFFn
      ];
      
      for (const value of testValues) {
        // LE round trip
        const leBuffer = secureToBufferLE(value);
        const leResult = secureToBigIntLE(leBuffer);
        expect(leResult).toBe(value);
        
        // BE round trip
        const beBuffer = secureToBufferBE(value);
        const beResult = secureToBigIntBE(beBuffer);
        expect(beResult).toBe(value);
      }
    });
    
    it('should handle concurrent operations safely', async () => {
      const operations = Array(100).fill(0).map((_, i) => 
        Promise.resolve(secureToBigIntLE(Buffer.from([i])))
      );
      
      const results = await Promise.all(operations);
      
      // Verify all results are correct
      results.forEach((result, index) => {
        expect(result).toBe(BigInt(index));
      });
    });
  });
  
  describe('Performance Characteristics', () => {
    it('should handle large batch operations efficiently', () => {
      const startTime = performance.now();
      
      // Perform 10000 conversions
      for (let i = 0; i < 10000; i++) {
        const buffer = Buffer.from([
          i & 0xFF,
          (i >> 8) & 0xFF,
          (i >> 16) & 0xFF,
          (i >> 24) & 0xFF
        ]);
        const result = secureToBigIntLE(buffer);
        expect(result).toBe(BigInt(i));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
      console.log(`10000 conversions completed in ${duration.toFixed(2)}ms`);
    });
  });
});