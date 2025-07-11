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
    },
    agent: {
      error: vi.fn(),
    },
  },
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
    
    vi.mocked(ConfigManager).getInstance.mockReturnValue(mockConfigManager);
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