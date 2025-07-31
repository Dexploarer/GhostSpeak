/**
 * Comprehensive tests for format-helpers.ts
 * Testing all formatting utility functions for consistent output
 */

import { describe, it, expect, vi } from 'vitest'
import {
  infoBox,
  successBox,
  warningBox,
  createTable,
  formatStatus,
  formatSOL,
  formatAddress,
  formatSignature,
  formatTimestamp,
  progressBar,
  bulletList,
  summaryCard,
  formatQRPlaceholder,
  divider,
  keyValue,
  stepIndicator
} from '../../src/utils/format-helpers'

// Mock chalk to return plain text for easier testing
vi.mock('chalk', () => ({
  default: {
    green: (text: string) => text,
    yellow: (text: string) => text,
    red: (text: string) => text,
    gray: (text: string) => text,
    blue: (text: string) => text,
    cyan: (text: string) => text,
    white: (text: string) => text,
    black: (text: string) => text,
    magenta: (text: string) => text,
    bold: (text: string) => text
  }
}))

// Mock boxen
vi.mock('boxen', () => ({
  default: (text: string, options: any) => `[${options.title || 'BOX'}] ${text}`
}))

// Mock cli-table3
vi.mock('cli-table3', () => ({
  default: class MockTable {
    constructor(options: any) {
      this.options = options
    }
    toString() { return 'mock-table' }
  }
}))

// Mock helpers
vi.mock('../../src/utils/helpers.js', () => ({
  shortenAddress: (addr: string, length = 6) => `${addr.slice(0, length)}...${addr.slice(-length)}`,
  lamportsToSol: (lamports: bigint) => (Number(lamports) / 1000000000).toString(),
  formatDate: (timestamp: number) => new Date(timestamp * 1000).toISOString(),
  formatRelativeTime: (timestamp: number) => '2 hours ago'
}))

describe('Format Helpers', () => {
  describe('infoBox', () => {
    it('should create info box with string content', () => {
      const result = infoBox('Test Title', 'Test content')
      expect(result).toContain('Test Title')
      expect(result).toContain('Test content')
    })

    it('should create info box with array content', () => {
      const result = infoBox('Test Title', ['Line 1', 'Line 2'])
      expect(result).toContain('Test Title')
      expect(result).toContain('Line 1\nLine 2')
    })

    it('should handle options', () => {
      const result = infoBox('Title', 'Content', { borderColor: 'red', padding: 2 })
      expect(result).toContain('Title')
      expect(result).toContain('Content')
    })
  })

  describe('successBox', () => {
    it('should create success box with message only', () => {
      const result = successBox('Operation successful')
      expect(result).toContain('✅ Operation successful')
    })

    it('should create success box with details', () => {
      const result = successBox('Operation successful', ['Detail 1', 'Detail 2'])
      expect(result).toContain('✅ Operation successful')
      expect(result).toContain('• Detail 1')
      expect(result).toContain('• Detail 2')
    })
  })

  describe('warningBox', () => {
    it('should create warning box with message only', () => {
      const result = warningBox('Warning message')
      expect(result).toContain('⚠️  Warning message')
    })

    it('should create warning box with actions', () => {
      const result = warningBox('Warning message', ['Action 1', 'Action 2'])
      expect(result).toContain('⚠️  Warning message')
      expect(result).toContain('Actions:')
      expect(result).toContain('1. Action 1')
      expect(result).toContain('2. Action 2')
    })
  })

  describe('createTable', () => {
    it('should create table with headers', () => {
      const table = createTable(['Header 1', 'Header 2'])
      expect(table).toBeDefined()
      expect(table.toString()).toBe('mock-table')
    })

    it('should create table with options', () => {
      const table = createTable(['Header 1'], { colWidths: [20], wordWrap: true })
      expect(table).toBeDefined()
    })
  })

  describe('formatStatus', () => {
    it('should format known statuses', () => {
      expect(formatStatus('active')).toContain('🟢')
      expect(formatStatus('pending')).toContain('⏳')
      expect(formatStatus('completed')).toContain('✅')
      expect(formatStatus('failed')).toContain('❌')
      expect(formatStatus('cancelled')).toContain('🚫')
      expect(formatStatus('disputed')).toContain('⚖️')
      expect(formatStatus('open')).toContain('📋')
      expect(formatStatus('in_progress')).toContain('🔨')
      expect(formatStatus('submitted')).toContain('📝')
    })

    it('should handle unknown status', () => {
      const result = formatStatus('unknown_status')
      expect(result).toContain('❓')
      expect(result).toContain('unknown_status')
    })

    it('should normalize status names', () => {
      expect(formatStatus('IN-PROGRESS')).toContain('🔨')
      expect(formatStatus('in_progress')).toContain('🔨')
      expect(formatStatus('inprogress')).toContain('🔨') // This will match now
    })
  })

  describe('formatSOL', () => {
    it('should format zero amounts', () => {
      expect(formatSOL(0)).toBe('0 SOL')
      expect(formatSOL(0n)).toBe('0 SOL')
      expect(formatSOL('0')).toBe('0 SOL')
    })

    it('should format small amounts', () => {
      expect(formatSOL(50000)).toBe('< 0.0001 SOL') // Less than 0.0001
      expect(formatSOL(100000)).toBe('0.0001 SOL')
    })

    it('should format medium amounts', () => {
      expect(formatSOL(500000000)).toBe('0.5000 SOL') // 0.5 SOL
      expect(formatSOL(1000000000)).toBe('1.000 SOL') // 1 SOL
    })

    it('should format large amounts', () => {
      expect(formatSOL(150000000000n)).toBe('150.00 SOL') // 150 SOL
    })

    it('should handle string input', () => {
      expect(formatSOL('1.5')).toBe('1.500 SOL')
    })
  })

  describe('formatAddress', () => {
    const testAddress = '11111111111111111111111111111111'

    it('should format address with shortening', () => {
      const result = formatAddress(testAddress)
      expect(result).toContain('111111...111111')
      expect(result).toContain('(click to copy)')
    })

    it('should format address without shortening', () => {
      const result = formatAddress(testAddress, { shorten: false })
      expect(result).toContain(testAddress)
    })

    it('should format address without copy hint', () => {
      const result = formatAddress(testAddress, { copyHint: false })
      expect(result).not.toContain('(click to copy)')
    })
  })

  describe('formatSignature', () => {
    it('should format transaction signature', () => {
      const signature = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      const result = formatSignature(signature)
      expect(result).toContain('abcdef12...34567890') // 8 chars from each end as implemented
    })
  })

  describe('formatTimestamp', () => {
    const testTimestamp = 1640995200 // Jan 1, 2022

    it('should format absolute timestamp', () => {
      const result = formatTimestamp(testTimestamp)
      expect(result).toContain('2022-01-01')
    })

    it('should format relative timestamp', () => {
      const result = formatTimestamp(testTimestamp, true)
      expect(result).toContain('2 hours ago')
    })

    it('should handle bigint timestamp', () => {
      const result = formatTimestamp(BigInt(testTimestamp))
      expect(result).toContain('2022-01-01')
    })
  })

  describe('progressBar', () => {
    it('should create progress bar', () => {
      const result = progressBar(50, 100)
      expect(result).toContain('50%')
      expect(result).toContain('█')
      expect(result).toContain('░')
    })

    it('should handle zero progress', () => {
      const result = progressBar(0, 100)
      expect(result).toContain('0%')
      expect(result).toContain('░')
    })

    it('should handle full progress', () => {
      const result = progressBar(100, 100)
      expect(result).toContain('100%')
      expect(result).toContain('█')
    })

    it('should handle custom width', () => {
      const result = progressBar(25, 100, 20)
      expect(result).toContain('25%')
    })
  })

  describe('bulletList', () => {
    it('should create bullet list with default options', () => {
      const result = bulletList(['Item 1', 'Item 2'])
      expect(result).toContain('• Item 1')
      expect(result).toContain('• Item 2')
    })

    it('should create bullet list with custom options', () => {
      const result = bulletList(['Item 1'], { indent: 4, bullet: '-' })
      expect(result).toContain('    - Item 1')
    })
  })

  describe('summaryCard', () => {
    it('should create summary card', () => {
      const items = [
        { label: 'Name', value: 'Test Agent' },
        { label: 'Status', value: 'Active' }
      ]
      const result = summaryCard('Agent Details', items)
      expect(result).toContain('Agent Details')
      expect(result).toContain('Name')
      expect(result).toContain('Test Agent')
      expect(result).toContain('Status')
      expect(result).toContain('Active')
    })
  })

  describe('formatQRPlaceholder', () => {
    it('should create QR placeholder without label', () => {
      const result = formatQRPlaceholder('test-data')
      expect(result).toContain('┌─────────────┐')
      expect(result).toContain('█')
    })

    it('should create QR placeholder with label', () => {
      const result = formatQRPlaceholder('test-data', 'Scan this code')
      expect(result).toContain('┌─────────────┐')
      expect(result).toContain('Scan this code')
    })
  })

  describe('divider', () => {
    it('should create divider with default options', () => {
      const result = divider()
      expect(result).toBe('─'.repeat(50))
    })

    it('should create divider with custom length', () => {
      const result = divider(20)
      expect(result).toBe('─'.repeat(20))
    })

    it('should create divider with custom character', () => {
      const result = divider(10, '=')
      expect(result).toBe('='.repeat(10))
    })
  })

  describe('keyValue', () => {
    it('should format key-value with defaults', () => {
      const result = keyValue('Key', 'Value')
      expect(result).toContain('Key: Value')
    })

    it('should format key-value with custom options', () => {
      const result = keyValue('Key', 'Value', {
        keyColor: 'blue',
        valueColor: 'green',
        separator: ' ='
      })
      expect(result).toContain('Key = Value')
    })
  })

  describe('stepIndicator', () => {
    it('should create step indicator without label', () => {
      const result = stepIndicator(2, 5)
      expect(result).toContain('Step 2 of 5')
      expect(result).toContain('●') // completed step
      expect(result).toContain('◉') // current step
      expect(result).toContain('○') // future step
    })

    it('should create step indicator with label', () => {
      const result = stepIndicator(1, 3, 'Setup')
      expect(result).toContain('Step 1 of 3')
      expect(result).toContain('Setup')
    })

    it('should handle edge cases', () => {
      const firstStep = stepIndicator(1, 1)
      expect(firstStep).toContain('Step 1 of 1')
      
      const lastStep = stepIndicator(3, 3)
      expect(lastStep).toContain('Step 3 of 3')
    })
  })
})