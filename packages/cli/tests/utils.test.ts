import { describe, it, expect } from 'vitest'
import { formatDate, shortenAddress, lamportsToSol } from '../src/utils/helpers'

describe('CLI Format Utils', () => {
  describe('formatDate', () => {
    it('should format timestamps correctly', () => {
      const timestamp = 1737000000 // Jan 15, 2025
      const formatted = formatDate(timestamp)
      
      expect(formatted).toMatch(/2025/)
      expect(formatted).toMatch(/1/) // Month or day containing 1
    })
    
    it('should handle current time', () => {
      const now = Math.floor(Date.now() / 1000)
      const formatted = formatDate(now)
      
      expect(formatted).toBeTruthy()
      expect(formatted.length).toBeGreaterThan(0)
    })
  })
  
  describe('shortenAddress', () => {
    it('should shorten long addresses', () => {
      const address = '11111111111111111111111111111111'
      const shortened = shortenAddress(address)
      
      expect(shortened).toBe('1111...1111')
      expect(shortened.length).toBeLessThan(address.length)
    })
    
    it('should handle custom char length', () => {
      const address = '123456789012345678901234567890'
      const shortened = shortenAddress(address, 6)
      
      expect(shortened).toBe('123456...567890')
    })
  })
  
  describe('lamportsToSol', () => {
    it('should convert lamports to SOL', () => {
      expect(lamportsToSol(1000000000)).toBe('1.0000')
      expect(lamportsToSol(1500000000)).toBe('1.5000')
      expect(lamportsToSol(123456789)).toBe('0.1235')
    })
    
    it('should handle bigint amounts', () => {
      expect(lamportsToSol(1000000000n)).toBe('1.0000')
      expect(lamportsToSol(500000000n)).toBe('0.5000')
    })
    
    it('should handle zero', () => {
      expect(lamportsToSol(0)).toBe('0.0000')
      expect(lamportsToSol(0n)).toBe('0.0000')
    })
  })
})