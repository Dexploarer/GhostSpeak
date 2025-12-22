import { describe, it, expect } from 'vitest'
import { address } from '@solana/addresses'
import {
  toAddress,
  toSignature,
  formatLamports,
  parseAmount
} from '../../../src/utils/format'
import type { Address } from '@solana/addresses'
import type { Signature } from '@solana/kit'

describe('Format Utilities', () => {
  describe('toAddress', () => {
    it('should convert valid base58 string to Address', () => {
      const addressString = '11111111111111111111111111111112'
      const result = toAddress(addressString)
      
      expect(result).toBe(addressString)
      expect(typeof result).toBe('string')
    })

    it('should return Address as-is when already an Address', () => {
      const addr = address('11111111111111111111111111111112')
      const result = toAddress(addr)
      
      expect(result).toBe(addr)
    })

    it('should handle valid Solana addresses', () => {
      const validAddress = 'JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk'
      const result = toAddress(validAddress)
      
      expect(result).toBe(validAddress)
    })

    it('should throw error for invalid base58 addresses', () => {
      const invalidAddress = 'invalidaddress123'
      
      expect(() => toAddress(invalidAddress)).toThrow()
    })

    it('should throw error for addresses with wrong length', () => {
      const wrongLength = '111111111111111111111'
      
      expect(() => toAddress(wrongLength)).toThrow()
    })
  })

  describe('toSignature', () => {
    it('should convert string to Signature type', () => {
      const sigString = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d6mbNm8orYH1Y7Y7dJwqsUjmAfwvJMqJvR68SgAkHthux'
      const result = toSignature(sigString)
      
      expect(result).toBe(sigString)
      expect(typeof result).toBe('string')
    })

    it('should return Signature as-is when already a Signature', () => {
      const sig = 'existingSignature' as Signature
      const result = toSignature(sig)
      
      expect(result).toBe(sig)
    })

    it('should handle empty string signatures', () => {
      const emptySignature = ''
      const result = toSignature(emptySignature)
      
      expect(result).toBe('')
    })

    it('should handle any string format as signature', () => {
      // Signatures are not validated in this function
      const anyString = 'any-format-signature'
      const result = toSignature(anyString)
      
      expect(result).toBe(anyString)
    })
  })

  describe('formatLamports', () => {
    it('should format 1 SOL correctly', () => {
      const lamports = 1_000_000_000n
      const result = formatLamports(lamports)
      
      expect(result).toBe('1')
    })

    it('should format fractional SOL correctly', () => {
      const lamports = 1_500_000_000n
      const result = formatLamports(lamports)
      
      expect(result).toBe('1.5')
    })

    it('should format small amounts correctly', () => {
      const lamports = 1_000_000n // 0.001 SOL
      const result = formatLamports(lamports)
      
      expect(result).toBe('0.001')
    })

    it('should format zero correctly', () => {
      const lamports = 0n
      const result = formatLamports(lamports)
      
      expect(result).toBe('0')
    })

    it('should handle very large amounts', () => {
      const lamports = 1_000_000_000_000_000n // 1,000,000 SOL
      const result = formatLamports(lamports)
      
      expect(result).toBe('1000000')
    })

    it('should format amounts with many decimal places', () => {
      const lamports = 123_456_789n // 0.123456789 SOL
      const result = formatLamports(lamports)
      
      expect(result).toBe('0.123456789')
    })

    it('should remove trailing zeros', () => {
      const lamports = 1_230_000_000n // 1.23 SOL
      const result = formatLamports(lamports)
      
      expect(result).toBe('1.23')
    })
  })

  describe('parseAmount', () => {
    it('should parse 1 SOL correctly', () => {
      const amount = '1'
      const result = parseAmount(amount)
      
      expect(result).toBe(1_000_000_000n)
    })

    it('should parse fractional SOL correctly', () => {
      const amount = '1.5'
      const result = parseAmount(amount)
      
      expect(result).toBe(1_500_000_000n)
    })

    it('should parse small amounts correctly', () => {
      const amount = '0.001'
      const result = parseAmount(amount)
      
      expect(result).toBe(1_000_000n)
    })

    it('should parse zero correctly', () => {
      const amount = '0'
      const result = parseAmount(amount)
      
      expect(result).toBe(0n)
    })

    it('should handle empty string as zero', () => {
      const amount = ''
      const result = parseAmount(amount)
      
      expect(result).toBe(0n)
    })

    it('should handle very large amounts', () => {
      const amount = '1000000'
      const result = parseAmount(amount)
      
      expect(result).toBe(1_000_000_000_000_000n)
    })

    it('should handle scientific notation', () => {
      const amount = '1e6'
      const result = parseAmount(amount)
      
      expect(result).toBe(1_000_000_000_000_000n)
    })

    it('should handle negative amounts', () => {
      const amount = '-1'
      const result = parseAmount(amount)
      
      expect(result).toBe(-1_000_000_000n)
    })

    it('should throw error for invalid input', () => {
      expect(() => parseAmount('abc')).toThrow('Invalid amount: abc')
      expect(() => parseAmount('not-a-number')).toThrow('Invalid amount: not-a-number')
      expect(() => parseAmount('_123')).toThrow('Invalid amount: _123')
    })

    it('should handle amounts with many decimal places', () => {
      const amount = '0.123456789'
      const result = parseAmount(amount)
      
      expect(result).toBe(123_456_789n)
    })

    it('should handle rounding correctly', () => {
      // This amount would have floating point precision issues
      const amount = '0.1234567891'
      const result = parseAmount(amount)
      
      // Should round to nearest lamport
      expect(result).toBe(123_456_789n)
    })

    it('should handle leading/trailing spaces', () => {
      const amount = ' 1.5 '
      const result = parseAmount(amount)
      
      expect(result).toBe(1_500_000_000n)
    })
  })

  describe('Round-trip conversion', () => {
    it('should maintain precision in round-trip conversion', () => {
      const testCases = [
        '1',
        '1.5',
        '0.123456789',
        '1000000',
        '0.000000001'
      ]

      for (const original of testCases) {
        const lamports = parseAmount(original)
        const formatted = formatLamports(lamports)
        const roundTrip = parseAmount(formatted)
        
        expect(roundTrip).toBe(lamports)
      }
    })

    it('should handle edge cases in round-trip', () => {
      // Test very small amounts
      const smallLamports = 1n
      const smallFormatted = formatLamports(smallLamports)
      const smallParsed = parseAmount(smallFormatted)
      
      expect(smallParsed).toBe(smallLamports)

      // Test maximum safe integer
      const maxSafeLamports = BigInt(Number.MAX_SAFE_INTEGER)
      const maxFormatted = formatLamports(maxSafeLamports)
      const maxParsed = parseAmount(maxFormatted)
      
      expect(maxParsed).toBe(maxSafeLamports)
    })
  })

  describe('Type safety', () => {
    it('should properly type Address results', () => {
      const addressString = '11111111111111111111111111111112'
      const result: Address = toAddress(addressString)
      
      expect(result).toBe(addressString)
    })

    it('should properly type Signature results', () => {
      const sigString = 'test-signature'
      const result: Signature = toSignature(sigString)
      
      expect(result).toBe(sigString)
    })
  })
})