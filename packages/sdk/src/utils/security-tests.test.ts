/**
 * Security Tests for GhostSpeak Protocol
 * 
 * Comprehensive test suite for all security fixes including:
 * - Input validation
 * - Resource limits
 * - Access control
 * - Rate limiting
 * - Arithmetic overflow protection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PublicKey, Keypair } from '@solana/web3.js';
import { 
  InputValidator, 
  ValidationError,
  MAX_AGENTS_PER_USER,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  RATE_LIMIT_REQUESTS_PER_SECOND,
} from './input-validator';
import { 
  SecurityMiddleware, 
  SecurityContext 
} from './security-middleware';
import { 
  AccessControlManager, 
  ChannelType, 
  PermissionLevel 
} from './access-control';

describe('Security Validation Tests', () => {
  let securityMiddleware: SecurityMiddleware;
  let accessControl: AccessControlManager;
  let mockUser: PublicKey;
  let mockContext: SecurityContext;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware();
    accessControl = new AccessControlManager();
    mockUser = Keypair.generate().publicKey;
    mockContext = {
      user: mockUser,
      endpoint: 'test',
      timestamp: Date.now(),
      requestId: 'test-request',
    };
  });

  afterEach(() => {
    securityMiddleware.clearAuditLogs();
    accessControl.clearPermissions();
    // Clear rate limit map
    (InputValidator as any).rateLimitMap.clear();
  });

  describe('Input Validation', () => {
    describe('String Sanitization', () => {
      it('should sanitize valid strings', () => {
        const input = 'Valid Agent Name';
        const result = InputValidator.sanitizeString(input, 50, 'name');
        expect(result).toBe('Valid Agent Name');
      });

      it('should reject strings that are too long', () => {
        const input = 'x'.repeat(100);
        expect(() => {
          InputValidator.sanitizeString(input, 50, 'name');
        }).toThrow(ValidationError);
      });

      it('should reject empty strings', () => {
        expect(() => {
          InputValidator.sanitizeString('', 50, 'name');
        }).toThrow(ValidationError);
      });

      it('should detect and reject XSS attempts', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          '<iframe src="javascript:alert(1)"></iframe>',
          'javascript:alert(1)',
          '<img onerror="alert(1)" src="x">',
          'vbscript:msgbox(1)',
          '<object data="data:text/html,<script>alert(1)</script>"></object>',
        ];

        maliciousInputs.forEach(input => {
          expect(() => {
            InputValidator.sanitizeString(input, 200, 'test');
          }).toThrow(ValidationError);
        });
      });

      it('should detect SQL injection patterns', () => {
        const sqlInputs = [
          "'; DROP TABLE users; --",
          "1' UNION SELECT * FROM agents --",
          "admin'/**/OR/**/1=1",
          'test" OR 1=1 --',
        ];

        sqlInputs.forEach(input => {
          expect(() => {
            InputValidator.sanitizeString(input, 200, 'query');
          }).toThrow(ValidationError);
        });
      });

      it('should remove control characters', () => {
        const input = 'Test\x00\x01\x02String';
        const result = InputValidator.sanitizeString(input, 50, 'test');
        expect(result).toBe('TestString');
      });

      it('should normalize whitespace', () => {
        const input = '  Multiple   Spaces   ';
        const result = InputValidator.sanitizeString(input, 50, 'test');
        expect(result).toBe('Multiple Spaces');
      });
    });

    describe('HTML Sanitization', () => {
      it('should sanitize HTML content', () => {
        const input = '<p>Safe content</p><script>alert("xss")</script>';
        const result = InputValidator.sanitizeHtml(input);
        expect(result).toBe('<p>Safe content</p>');
      });

      it('should preserve safe HTML tags', () => {
        const input = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
        const result = InputValidator.sanitizeHtml(input);
        expect(result).toContain('<strong>');
        expect(result).toContain('<em>');
      });

      it('should remove dangerous attributes', () => {
        const input = '<a href="javascript:alert(1)" onclick="alert(1)">Link</a>';
        const result = InputValidator.sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onclick');
      });
    });

    describe('Address Validation', () => {
      it('should validate correct Solana addresses', () => {
        const validAddress = Keypair.generate().publicKey.toBase58();
        expect(InputValidator.validateAddress(validAddress)).toBe(true);
      });

      it('should reject invalid addresses', () => {
        const invalidAddresses = [
          'invalid',
          '1111111111111111111111111111111', // too short
          '111111111111111111111111111111111', // too long
          'not-base58-chars-@#$%',
        ];

        invalidAddresses.forEach(address => {
          expect(InputValidator.validateAddress(address)).toBe(false);
        });
      });
    });

    describe('Amount Validation', () => {
      it('should validate amounts within range', () => {
        const result = InputValidator.validateAmount(1000, 100, 10000);
        expect(result).toBe(1000);
      });

      it('should reject amounts below minimum', () => {
        expect(() => {
          InputValidator.validateAmount(50, 100, 10000);
        }).toThrow(ValidationError);
      });

      it('should reject amounts above maximum', () => {
        expect(() => {
          InputValidator.validateAmount(20000, 100, 10000);
        }).toThrow(ValidationError);
      });

      it('should handle string inputs', () => {
        const result = InputValidator.validateAmount('1000', 100, 10000);
        expect(result).toBe(1000);
      });

      it('should reject non-numeric strings', () => {
        expect(() => {
          InputValidator.validateAmount('not-a-number', 100, 10000);
        }).toThrow(ValidationError);
      });

      it('should detect overflow conditions', () => {
        expect(() => {
          InputValidator.validateAmount(Number.MAX_SAFE_INTEGER + 1, 0, Number.MAX_VALUE);
        }).toThrow(ValidationError);
      });
    });

    describe('Array Validation', () => {
      it('should validate string arrays within limits', () => {
        const array = ['item1', 'item2', 'item3'];
        const result = InputValidator.validateStringArray(array, 5, 10);
        expect(result).toEqual(['item1', 'item2', 'item3']);
      });

      it('should reject arrays that are too long', () => {
        const array = Array(20).fill('item');
        expect(() => {
          InputValidator.validateStringArray(array, 5, 10);
        }).toThrow(ValidationError);
      });

      it('should sanitize individual items', () => {
        const array = ['<script>alert(1)</script>'];
        expect(() => {
          InputValidator.validateStringArray(array, 5, 50);
        }).toThrow(ValidationError);
      });
    });

    describe('Metadata URI Validation', () => {
      it('should validate HTTPS URIs', () => {
        const uri = 'https://example.com/metadata.json';
        const result = InputValidator.validateMetadataUri(uri);
        expect(result).toBe(uri);
      });

      it('should validate IPFS URIs', () => {
        const uri = 'ipfs://QmTest123';
        const result = InputValidator.validateMetadataUri(uri);
        expect(result).toBe(uri);
      });

      it('should reject invalid schemes', () => {
        const invalidUris = [
          'ftp://example.com/file',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
        ];

        invalidUris.forEach(uri => {
          expect(() => {
            InputValidator.validateMetadataUri(uri);
          }).toThrow(ValidationError);
        });
      });
    });

    describe('Complex Object Validation', () => {
      it('should validate agent registration data', () => {
        const data = {
          name: 'Test Agent',
          description: 'A test agent for validation',
          capabilities: ['coding', 'testing'],
          metadataUri: 'https://example.com/metadata.json',
          serviceEndpoint: 'https://agent.example.com/api',
        };

        const result = InputValidator.validateAgentRegistration(data);
        expect(result.name).toBe('Test Agent');
        expect(result.capabilities).toHaveLength(2);
      });

      it('should validate work order data', () => {
        const data = {
          title: 'Test Work Order',
          description: 'Test description',
          requirements: ['requirement1', 'requirement2'],
          paymentAmount: 1000000,
          deadline: Math.floor(Date.now() / 1000) + 86400,
        };

        const result = InputValidator.validateWorkOrder(data);
        expect(result.title).toBe('Test Work Order');
        expect(result.paymentAmount).toBe(1000000);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const identifier = 'test-user';
      
      // Should allow up to the limit
      for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_SECOND; i++) {
        expect(() => {
          InputValidator.checkRateLimit(identifier);
        }).not.toThrow();
      }
    });

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-user-2';
      
      // Fill up the rate limit
      for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_SECOND; i++) {
        InputValidator.checkRateLimit(identifier);
      }
      
      // Next request should be blocked
      expect(() => {
        InputValidator.checkRateLimit(identifier);
      }).toThrow(ValidationError);
    });

    it('should reset rate limit after time window', (done) => {
      const identifier = 'test-user-3';
      
      // Fill up the rate limit
      for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_SECOND; i++) {
        InputValidator.checkRateLimit(identifier);
      }
      
      // Wait for rate limit window to pass
      setTimeout(() => {
        expect(() => {
          InputValidator.checkRateLimit(identifier);
        }).not.toThrow();
        done();
      }, 1100); // Just over 1 second
    }, 2000);

    it('should handle different users independently', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      // Fill rate limit for user1
      for (let i = 0; i < RATE_LIMIT_REQUESTS_PER_SECOND; i++) {
        InputValidator.checkRateLimit(user1);
      }
      
      // User2 should still be able to make requests
      expect(() => {
        InputValidator.checkRateLimit(user2);
      }).not.toThrow();
    });
  });

  describe('Security Middleware', () => {
    it('should intercept and validate operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await securityMiddleware.intercept(
        'test-action',
        mockContext,
        operation,
        {
          input: { name: 'Test Agent' },
        }
      );
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should block operations with invalid input', async () => {
      const operation = jest.fn();
      
      await expect(
        securityMiddleware.intercept(
          'registerAgent',
          mockContext,
          operation,
          {
            input: {
              name: '<script>alert(1)</script>',
              description: 'Test',
              capabilities: [],
              metadataUri: 'https://example.com',
              serviceEndpoint: 'https://example.com',
            },
          }
        )
      ).rejects.toThrow();
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should enforce rate limits', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Execute multiple operations quickly
      const promises = Array(20).fill(null).map(() =>
        securityMiddleware.intercept('test-action', mockContext, operation)
      );
      
      // Some should be rejected due to rate limiting
      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('should log audit events', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await securityMiddleware.intercept('test-action', mockContext, operation);
      
      const logs = securityMiddleware.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('test-action');
      expect(logs[0].result).toBe('success');
    });
  });

  describe('Access Control', () => {
    beforeEach(() => {
      accessControl.clearPermissions();
    });

    it('should manage user roles', () => {
      const user = Keypair.generate().publicKey;
      
      accessControl.assignRole(user, 'agent_owner');
      
      const context = accessControl.getUserContext(user);
      expect(context.roles).toContain('agent_owner');
      expect(context.permissions.has('agent.update')).toBe(true);
    });

    it('should check permissions correctly', () => {
      const user = Keypair.generate().publicKey;
      
      accessControl.assignRole(user, 'marketplace_user');
      
      expect(accessControl.hasPermission(user, 'service.purchase')).toBe(true);
      expect(accessControl.hasPermission(user, 'agent.delete')).toBe(false);
    });

    it('should manage channel permissions', () => {
      const owner = Keypair.generate().publicKey;
      const participant = Keypair.generate().publicKey;
      
      const permissions = accessControl.createChannel(
        'test-channel',
        owner,
        ChannelType.PRIVATE,
        true,
        [participant]
      );
      
      expect(permissions.participants).toContain(participant);
      expect(permissions.isPrivate).toBe(true);
    });

    it('should validate channel access', () => {
      const owner = Keypair.generate().publicKey;
      const participant = Keypair.generate().publicKey;
      const outsider = Keypair.generate().publicKey;
      
      accessControl.createChannel(
        'test-channel-2',
        owner,
        ChannelType.PRIVATE,
        true,
        [participant]
      );
      
      expect(accessControl.checkChannelAccess(owner, 'test-channel-2', 'write')).toBe(true);
      expect(accessControl.checkChannelAccess(participant, 'test-channel-2', 'read')).toBe(true);
      expect(accessControl.checkChannelAccess(outsider, 'test-channel-2', 'read')).toBe(false);
    });

    it('should handle private channel encryption', () => {
      const channelId = 'encrypted-channel';
      const owner = Keypair.generate().publicKey;
      
      accessControl.createChannel(channelId, owner, ChannelType.PRIVATE, true);
      
      const message = 'Secret message';
      const encrypted = accessControl.encryptMessage(channelId, message);
      const decrypted = accessControl.decryptMessage(channelId, encrypted);
      
      expect(decrypted).toBe(message);
      expect(encrypted).not.toBe(message);
    });

    it('should add and remove channel participants', () => {
      const owner = Keypair.generate().publicKey;
      const newParticipant = Keypair.generate().publicKey;
      const channelId = 'management-test';
      
      accessControl.createChannel(channelId, owner, ChannelType.GROUP, false);
      
      // Add participant
      accessControl.addChannelParticipant(channelId, owner, newParticipant);
      expect(accessControl.checkChannelAccess(newParticipant, channelId, 'read')).toBe(true);
      
      // Remove participant
      accessControl.removeChannelParticipant(channelId, owner, newParticipant);
      expect(accessControl.checkChannelAccess(newParticipant, channelId, 'read')).toBe(false);
    });

    it('should enforce private channel message encryption', () => {
      const channelId = 'private-enforcement';
      const owner = Keypair.generate().publicKey;
      
      accessControl.createChannel(channelId, owner, ChannelType.PRIVATE, true);
      
      // Should allow encrypted messages
      expect(() => {
        accessControl.validatePrivateChannelMessage(channelId, 'encrypted-content', true);
      }).not.toThrow();
      
      // Should reject unencrypted messages in private channels
      expect(() => {
        accessControl.validatePrivateChannelMessage(channelId, 'plain-text', false);
      }).toThrow(ValidationError);
    });
  });

  describe('Resource Limits', () => {
    it('should enforce agent count limits', () => {
      // This would be tested against the smart contract
      // For now, we test the constants are properly defined
      expect(MAX_AGENTS_PER_USER).toBe(100);
      expect(MAX_MESSAGE_LENGTH).toBe(1000);
      expect(MAX_NAME_LENGTH).toBe(64);
    });

    it('should validate message length limits', () => {
      const shortMessage = 'Short message';
      const longMessage = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
      
      expect(() => {
        InputValidator.validateMessage(shortMessage);
      }).not.toThrow();
      
      expect(() => {
        InputValidator.validateMessage(longMessage);
      }).toThrow(ValidationError);
    });

    it('should detect spam patterns', () => {
      const spamMessage = 'a'.repeat(50); // 50 repeated characters
      
      expect(() => {
        InputValidator.validateMessage(spamMessage);
      }).toThrow(ValidationError);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete agent registration flow', async () => {
      const user = new PublicKey('dddddddddddddddddddddddddddddddd');
      const operation = jest.fn().mockResolvedValue({ success: true });
      
      const agentData = {
        name: 'Integration Test Agent',
        description: 'Testing full validation flow',
        capabilities: ['testing', 'validation'],
        metadataUri: 'https://example.com/metadata.json',
        serviceEndpoint: 'https://agent.example.com/api',
      };
      
      const result = await securityMiddleware.intercept(
        'registerAgent',
        { ...mockContext, user },
        operation,
        { input: agentData }
      );
      
      expect(result.success).toBe(true);
      expect(operation).toHaveBeenCalled();
      
      const logs = securityMiddleware.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].result).toBe('success');
    });

    it('should handle complete message sending flow', async () => {
      const user = new PublicKey('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
      const channelId = 'integration-channel';
      
      // Setup channel
      accessControl.createChannel(channelId, user, ChannelType.PRIVATE, true);
      
      const operation = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
      
      const result = await securityMiddleware.intercept(
        'sendMessage',
        { ...mockContext, user },
        operation,
        {
          input: { content: 'Test message for integration' },
          requiredRole: 'channel_participant',
        }
      );
      
      expect(result.messageId).toBe('msg-123');
    });

    it('should prevent unauthorized access attempts', async () => {
      const user = new PublicKey('ffffffffffffffffffffffffffffffff');
      const channelId = 'unauthorized-test';
      const owner = new PublicKey('1111111111111111111111111111111a');
      
      // Create channel without user as participant
      accessControl.createChannel(channelId, owner, ChannelType.PRIVATE, true);
      
      const operation = jest.fn();
      
      await expect(
        securityMiddleware.intercept(
          'sendMessage',
          { ...mockContext, user },
          operation,
          {
            input: { content: 'Unauthorized message' },
            requiredRole: 'channel_participant',
          }
        )
      ).rejects.toThrow();
      
      expect(operation).not.toHaveBeenCalled();
    });
  });
});