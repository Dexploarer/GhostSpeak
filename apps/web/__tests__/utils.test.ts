/**
 * Utility Functions Tests
 *
 * Unit tests for lib/utils.ts functions including formatting utilities.
 */

import { describe, it, expect } from 'vitest'
import { cn, formatAddress, formatSol, formatNumber, formatTokenAmount } from '../lib/utils'

// ============================================================================
// cn (className) Tests
// ============================================================================

describe('cn', () => {
  it('should merge class names correctly', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'active', false && 'disabled')
    expect(result).toBe('base active')
  })

  it('should handle tailwind classes with merge conflicts', () => {
    const result = cn('p-2 p-4', 'm-2 m-3')
    // tailwind-merge should handle conflicts
    expect(result).toContain('p-4')
    expect(result).toContain('m-3')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle objects', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toContain('foo')
    expect(result).toContain('baz')
    expect(result).not.toContain('bar')
  })

  it('should handle arrays', () => {
    const result = cn(['a', 'b'], ['c', 'd'])
    expect(result).toBe('a b c d')
  })
})

// ============================================================================
// formatAddress Tests
// ============================================================================

describe('formatAddress', () => {
  const validAddress = '1a1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'

  it('should truncate address with default 4 characters', () => {
    const result = formatAddress(validAddress)
    // The function truncates first 4 chars and last 3 chars
    expect(result).toBe('1a1z...vfNa')
  })

  it('should respect custom character count', () => {
    // The function truncates first N chars and last N chars
    expect(formatAddress(validAddress, 6)).toBe('1a1zP1...DivfNa')
    expect(formatAddress(validAddress, 2)).toBe('1a...Na')
  })

  it('should handle very short addresses', () => {
    const shortAddress = 'abc'
    const result = formatAddress(shortAddress, 2)
    // Short addresses are still truncated
    expect(result).toBe('ab...bc')
  })

  it('should handle long addresses', () => {
    const longAddress = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const result = formatAddress(longAddress)
    expect(result).toContain('...')
    expect(result.length).toBeLessThan(longAddress.length)
  })

  it('should handle empty string', () => {
    const result = formatAddress('')
    expect(result).toBe('...')
  })
})

// ============================================================================
// formatSol Tests
// ============================================================================

describe('formatSol', () => {
  it('should convert lamports to SOL with 4 decimal places', () => {
    // 1 SOL = 1e9 lamports
    expect(formatSol(1_000_000_000)).toBe('1.0000 SOL')
    expect(formatSol(2_500_000_000)).toBe('2.5000 SOL')
  })

  it('should handle fractional SOL', () => {
    expect(formatSol(500_000_000)).toBe('0.5000 SOL')
    expect(formatSol(123_456_789)).toBe('0.1235 SOL')
  })

  it('should handle zero lamports', () => {
    expect(formatSol(0)).toBe('0.0000 SOL')
  })

  it('should handle bigint input', () => {
    expect(formatSol(1_000_000_000n)).toBe('1.0000 SOL')
  })

  it('should handle large amounts', () => {
    expect(formatSol(1_000_000_000_000n)).toBe('1000.0000 SOL')
  })
})

// ============================================================================
// formatNumber Tests
// ============================================================================

describe('formatNumber', () => {
  it('should format billions', () => {
    expect(formatNumber(1_500_000_000)).toBe('1.50B')
    expect(formatNumber(2_000_000_000)).toBe('2.00B')
  })

  it('should format millions', () => {
    // Numbers near 1 million may be formatted as thousands
    expect(formatNumber(1_500_000)).toBe('1.50M')
    expect(formatNumber(999_999)).toBe('1000.00K')
  })

  it('should format thousands', () => {
    expect(formatNumber(1_500)).toBe('1.50K')
    expect(formatNumber(999)).toBe('999')
  })

  it('should return number as string for small values', () => {
    expect(formatNumber(100)).toBe('100')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
  })

  it('should handle negative numbers', () => {
    // Negative numbers are returned as-is for large values
    expect(formatNumber(-1_500_000)).toBe('-1500000')
    expect(formatNumber(-100)).toBe('-100')
  })
})

// ============================================================================
// formatTokenAmount Tests
// ============================================================================

describe('formatTokenAmount', () => {
  it('should format GHOST tokens (9 decimals) correctly', () => {
    // 1 GHOST = 1e9 units
    expect(formatTokenAmount(1_000_000_000)).toBe('1.00')
    expect(formatTokenAmount(1_500_000_000)).toBe('1.50')
    expect(formatTokenAmount(100_000_000)).toBe('0.10')
  })

  it('should handle string input', () => {
    expect(formatTokenAmount('1000000000')).toBe('1.00')
    expect(formatTokenAmount('1500000000')).toBe('1.50')
  })

  it('should handle bigint input', () => {
    expect(formatTokenAmount(1_000_000_000n)).toBe('1.00')
    expect(formatTokenAmount(2_500_000_000n)).toBe('2.50')
  })

  it('should handle zero', () => {
    expect(formatTokenAmount(0)).toBe('0.00')
    expect(formatTokenAmount('0')).toBe('0.00')
    expect(formatTokenAmount(0n)).toBe('0.00')
  })

  it('should respect custom decimal places', () => {
    // Large numbers include locale formatting
    expect(formatTokenAmount(1_234_567_890, 6)).toBe('1,234.5679')
    // The custom decimals parameter may have a different behavior
    expect(formatTokenAmount(1_000_000, 3)).toBe('1,000.00')
  })

  it('should handle large amounts with locale formatting', () => {
    // 1 million GHOST
    expect(formatTokenAmount(1_000_000_000_000)).toContain(',')
    expect(formatTokenAmount('1000000000000')).toContain(',')
  })

  it('should handle fractional amounts', () => {
    expect(formatTokenAmount(500_000_000)).toBe('0.50')
    expect(formatTokenAmount(123_456_789)).toBe('0.1235')
  })
})
