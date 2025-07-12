/**
 * Tests for agent command functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerAgent, listAgents } from './agent';
import { ConfigManager } from '../core/ConfigManager';
import { logger } from '../utils/logger';

// Mock dependencies
vi.mock('../core/ConfigManager');
vi.mock('../utils/logger', () => ({
  logger: {
    general: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
    agent: {
      error: vi.fn(),
    },
  },
}));

// Mock context helpers
vi.mock('../context-helpers.js', () => ({
  getRpc: vi.fn().mockResolvedValue({
    getLatestBlockhash: () => ({
      send: vi.fn().mockResolvedValue({ blockhash: 'test' })
    })
  })
}));

// Mock network diagnostics
vi.mock('../utils/network-diagnostics.js', () => ({
  preOperationCheck: vi.fn().mockResolvedValue({ proceed: true, offline: false }),
  getNetworkRetryConfig: vi.fn().mockReturnValue({
    maxRetries: 2,
    delayMs: 100,
    shouldRetry: () => false
  })
}));

// Mock prompts
vi.mock('../utils/prompts', () => ({
  prompt: vi.fn().mockResolvedValue('Test description'),
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue('general'),
  ProgressIndicator: vi.fn(() => ({
    start: vi.fn(),
    update: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

describe('Agent Commands', () => {
  let mockConfigManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup ConfigManager mock
    mockConfigManager = {
      addAgent: vi.fn(),
      save: vi.fn(),
      listAgents: vi.fn().mockReturnValue([]),
    };
    
    vi.mocked(ConfigManager).load = vi.fn().mockResolvedValue(mockConfigManager);
  });

  describe('registerAgent', () => {
    it('should register an agent in simulation mode when no wallet is configured', async () => {
      // Act
      await registerAgent('TestAgent', {
        type: 'general',
        description: 'Test agent description',
      });

      // Assert
      expect(mockConfigManager.addAgent).toHaveBeenCalledWith(
        'TestAgent',
        expect.any(String), // Generated address
        'general',
        'Test agent description'
      );
      expect(mockConfigManager.save).toHaveBeenCalled();
      
      // Check that success message was shown
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('Registration Complete!')
      );
    });

    it('should show simulation mode message when no wallet is configured', async () => {
      // Act
      await registerAgent('TestAgent', {
        type: 'analytics',
      });

      // Assert - check for simulation mode messages
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('No wallet configured - Running in simulation mode')
      );
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('Simulation Mode - Agent created locally')
      );
    });
    
    describe('input validation', () => {
      it('should reject empty agent names', async () => {
        // Mock process.exit to prevent test from exiting
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        // Test empty string
        await expect(registerAgent('', { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        expect(logger.general.error).toHaveBeenCalledWith(
          expect.stringContaining('Agent name cannot be empty')
        );
        expect(mockExit).toHaveBeenCalledWith(1);
        
        mockExit.mockRestore();
      });
      
      it('should reject whitespace-only names', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        // Test various whitespace combinations
        await expect(registerAgent('   ', { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        await expect(registerAgent('\t\n', { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        await expect(registerAgent('    \t    ', { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
      });
      
      it('should reject names that are too short', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        await expect(registerAgent('a', { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        expect(logger.general.error).toHaveBeenCalledWith(
          expect.stringContaining('must be at least 2 characters')
        );
        expect(mockExit).toHaveBeenCalledWith(1);
        
        mockExit.mockRestore();
      });
      
      it('should reject names that are too long', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        const longName = 'a'.repeat(51);
        await expect(registerAgent(longName, { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        expect(logger.general.error).toHaveBeenCalledWith(
          expect.stringContaining('must be 50 characters or less')
        );
        expect(mockExit).toHaveBeenCalledWith(1);
        
        mockExit.mockRestore();
      });
      
      it('should reject names with special characters', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        const invalidNames = [
          'agent@123',
          'agent#test',
          'agent$money',
          'agent%percent',
          'agent&and',
          'agent*star',
          'agent space',
          'agent/slash',
          'agent\\backslash',
          'agent.dot',
          'agent,comma',
          'agent!exclaim',
          'agent?question',
          'agent(paren)',
          'agent[bracket]',
          'agent{brace}',
          'agent|pipe',
          'agent~tilde',
          'agent`backtick',
          'agent"quote',
          "agent'apostrophe",
          'agent<less>',
          'agent=equal',
          'agent+plus',
        ];
        
        for (const invalidName of invalidNames) {
          vi.clearAllMocks();
          await expect(registerAgent(invalidName, { type: 'general' }))
            .rejects.toThrow('Process exited');
        }
        
        expect(logger.general.error).toHaveBeenCalledWith(
          expect.stringContaining('can only contain letters, numbers, underscores, and hyphens')
        );
        
        mockExit.mockRestore();
      });
      
      it('should accept valid agent names', async () => {
        const validNames = [
          'MyAgent',
          'agent123',
          'AI_Assistant',
          'test-agent',
          'Agent_123-test',
          'AB',  // Minimum length
          'a'.repeat(50),  // Maximum length
        ];
        
        for (const validName of validNames) {
          vi.clearAllMocks();
          await registerAgent(validName, { type: 'general' });
          
          // Should not throw and should proceed with registration
          expect(mockConfigManager.addAgent).toHaveBeenCalledWith(
            validName,
            expect.any(String),
            'general',
            expect.any(String)
          );
        }
      });
      
      it('should reject reserved names', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        const reservedNames = ['agent', 'system', 'admin', 'test', 'null', 'undefined'];
        
        for (const reserved of reservedNames) {
          vi.clearAllMocks();
          await expect(registerAgent(reserved, { type: 'general' }))
            .rejects.toThrow('Process exited');
          
          // Also test case-insensitive
          await expect(registerAgent(reserved.toUpperCase(), { type: 'general' }))
            .rejects.toThrow('Process exited');
        }
        
        expect(logger.general.error).toHaveBeenCalledWith(
          expect.stringContaining('is a reserved name')
        );
        
        mockExit.mockRestore();
      });
      
      it('should trim whitespace from agent names', async () => {
        await registerAgent('  ValidAgent  ', { type: 'general' });
        
        // Should use trimmed name
        expect(mockConfigManager.addAgent).toHaveBeenCalledWith(
          'ValidAgent',  // Trimmed
          expect.any(String),
          'general',
          expect.any(String)
        );
      });
      
      it('should handle null or undefined names gracefully', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('Process exited');
        });
        
        await expect(registerAgent(null as any, { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        await expect(registerAgent(undefined as any, { type: 'general' }))
          .rejects.toThrow('Process exited');
        
        mockExit.mockRestore();
      });
    });
  });

  describe('listAgents', () => {
    it('should list agents from local config when unified client is not available', async () => {
      // Setup
      mockConfigManager.listAgents.mockReturnValue([
        {
          name: 'Agent1',
          agent: {
            address: 'mockAddress123',
            type: 'general',
            description: 'Test agent',
          },
        },
      ]);

      // Act
      await listAgents();

      // Assert
      expect(mockConfigManager.listAgents).toHaveBeenCalled();
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('Agent1 (general)')
      );
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('simulated')
      );
    });

    it('should show message when no agents exist', async () => {
      // Setup
      mockConfigManager.listAgents.mockReturnValue([]);

      // Act
      await listAgents();

      // Assert
      expect(logger.general.info).toHaveBeenCalledWith(
        expect.stringContaining('No agents registered yet')
      );
    });
  });
});