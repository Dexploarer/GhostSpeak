import { describe, it, expect } from 'vitest'
import { toAddress, toSignature, formatLamports, parseAmount } from '../../src/utils/format'
import { address, signature } from '@solana/addresses'

describe('Format Utils', () => {
  describe('toAddress', () => {
    it('should convert string to Address', () => {
      const pubkey = '11111111111111111111111111111111'
      const result = toAddress(pubkey)
      
      expect(result).toBe(address(pubkey))
    })
    
    it('should return Address as-is', () => {
      const addr = address('11111111111111111111111111111111')
      const result = toAddress(addr)
      
      expect(result).toBe(addr)
    })
  })
  
  describe('toSignature', () => {
    it('should convert string to Signature', () => {
      const sig = '1111111111111111111111111111111111111111111111111111111111111111'
      const result = toSignature(sig)
      
      expect(result).toBe(signature(sig))
    })
  })
  
  describe('formatLamports', () => {
    it('should format lamports to SOL', () => {
      expect(formatLamports(1000000000n)).toBe('1')
      expect(formatLamports(1500000000n)).toBe('1.5')
      expect(formatLamports(1234567890n)).toBe('1.23456789')
      expect(formatLamports(0n)).toBe('0')
    })
  })
  
  describe('parseAmount', () => {
    it('should parse SOL to lamports', () => {
      expect(parseAmount('1')).toBe(1000000000n)
      expect(parseAmount('1.5')).toBe(1500000000n)
      expect(parseAmount('0.123456789')).toBe(123456789n)
      expect(parseAmount('0')).toBe(0n)
    })
    
    it('should handle edge cases', () => {
      expect(parseAmount('0.000000001')).toBe(1n)
      expect(parseAmount('1000000')).toBe(1000000000000000n)
    })
  })
})