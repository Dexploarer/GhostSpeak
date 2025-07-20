import { describe, it, expect } from 'vitest'
import { formatDate, truncateAddress, formatAmount } from '../src/utils/format'

describe('CLI Format Utils', () => {
  describe('formatDate', () => {
    it('should format timestamps correctly', () => {
      const timestamp = 1737000000 // Jan 15, 2025
      const formatted = formatDate(timestamp)
      
      expect(formatted).toMatch(/2025/)
      expect(formatted).toMatch(/Jan/)
    })
    
    it('should handle current time', () => {
      const now = Math.floor(Date.now() / 1000)
      const formatted = formatDate(now)
      
      expect(formatted).toBeTruthy()
      expect(formatted.length).toBeGreaterThan(0)
    })
  })
  
  describe('truncateAddress', () => {
    it('should truncate long addresses', () => {
      const address = '11111111111111111111111111111111'
      const truncated = truncateAddress(address)
      
      expect(truncated).toBe('11111111...11111111')
      expect(truncated.length).toBeLessThan(address.length)
    })
    
    it('should handle short addresses', () => {
      const address = '1234'
      const truncated = truncateAddress(address)
      
      expect(truncated).toBe(address)
    })
  })
  
  describe('formatAmount', () => {
    it('should format SOL amounts', () => {
      expect(formatAmount(1000000000)).toBe('1 SOL')
      expect(formatAmount(1500000000)).toBe('1.5 SOL')
      expect(formatAmount(123456789)).toBe('0.123456789 SOL')
    })
    
    it('should format bigint amounts', () => {
      expect(formatAmount(1000000000n)).toBe('1 SOL')
      expect(formatAmount(500000000n)).toBe('0.5 SOL')
    })
    
    it('should handle zero', () => {
      expect(formatAmount(0)).toBe('0 SOL')
      expect(formatAmount(0n)).toBe('0 SOL')
    })
  })
})