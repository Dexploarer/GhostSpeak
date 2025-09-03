import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerRegisterCommand } from '../../../../src/commands/agent/register.js';
import * as agentPrompts from '../../../../src/prompts/agent.js';
import * as agentHelpers from '../../../../src/commands/agent/helpers.js';
import { container, ServiceTokens } from '../../../../src/core/Container.js';
import * as errorHandler from '../../../../src/utils/enhanced-error-handler.js';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';

// Mock dependencies
vi.mock('chalk', async (importOriginal) => {
  const originalChalk = await importOriginal<typeof chalk>();
  return {
    ...originalChalk,
    red: (str: string) => str,
    cyan: (str: string) => str,
    gray: (str: string) => str,
    yellow: (str: string) => str,
    green: (str: string) => str,
    inverse: (str: string) => str,
  };
});
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('../../../../src/prompts/agent.js');
vi.mock('../../../../src/commands/agent/helpers.js');
vi.mock('../../../../src/core/Container.js');
vi.mock('../../../../src/utils/enhanced-error-handler.js');

const mockAgentService = {
  register: vi.fn(),
};

describe('agent register command', () => {
  let parentCommand: Command;
  let command: Command;

  beforeEach(() => {
    parentCommand = new Command();
    registerRegisterCommand(parentCommand);
    command = parentCommand.commands[0];

    // Mock the container to return the mock service
    vi.spyOn(container, 'resolve').mockReturnValue(mockAgentService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully register an agent with valid inputs', async () => {
    // Arrange
    const mockAgentData = {
      name: 'Test Agent',
      description: 'A test agent description.',
      capabilities: ['testing', 'mocking'],
      serviceEndpoint: 'http://test.com/agent',
    };
    const mockRegisteredAgent = {
      id: 'agent-123',
      address: { toString: () => 'agent-address-xyz' },
      ...mockAgentData,
    };

    vi.spyOn(agentPrompts, 'registerAgentPrompts').mockResolvedValue(mockAgentData);
    vi.spyOn(agentHelpers, 'validateAgentParams').mockReturnValue(null);
    mockAgentService.register.mockResolvedValue(mockRegisteredAgent);
    vi.spyOn(agentHelpers, 'displayRegisteredAgentInfo');

    // Act
    await command.parseAsync([], { from: 'user' });

    // Assert
    expect(agentPrompts.registerAgentPrompts).toHaveBeenCalled();
    expect(agentHelpers.validateAgentParams).toHaveBeenCalledWith({
      name: mockAgentData.name,
      description: mockAgentData.description,
      capabilities: mockAgentData.capabilities,
    });
    expect(mockAgentService.register).toHaveBeenCalledWith({
      name: mockAgentData.name,
      description: mockAgentData.description,
      capabilities: mockAgentData.capabilities,
      category: mockAgentData.capabilities[0],
      metadata: {
        serviceEndpoint: mockAgentData.serviceEndpoint,
      },
    });
    expect(agentHelpers.displayRegisteredAgentInfo).toHaveBeenCalledWith(mockRegisteredAgent);
    expect(prompts.outro).toHaveBeenCalledWith('Agent registration completed');
  });

  it('should handle user cancellation during prompts', async () => {
    // Arrange
    vi.spyOn(agentPrompts, 'registerAgentPrompts').mockResolvedValue(prompts.cancel as any);
    vi.spyOn(prompts, 'isCancel').mockReturnValue(true);

    // Act
    await command.parseAsync([], { from: 'user' });

    // Assert
    expect(prompts.cancel).toHaveBeenCalledWith('Agent registration cancelled');
    expect(mockAgentService.register).not.toHaveBeenCalled();
  });

  it('should handle validation failure', async () => {
    // Arrange
    const mockAgentData = {
      name: 't',
      description: 'short',
      capabilities: [],
    };
    const validationError = 'Agent name must be at least 3 characters long';

    vi.spyOn(agentPrompts, 'registerAgentPrompts').mockResolvedValue(mockAgentData);
    vi.spyOn(agentHelpers, 'validateAgentParams').mockReturnValue(validationError);

    // Act
    await command.parseAsync([], { from: 'user' });

    // Assert
    expect(prompts.cancel).toHaveBeenCalledWith(validationError);
    expect(mockAgentService.register).not.toHaveBeenCalled();
  });

  it('should handle registration failure from the service', async () => {
    // Arrange
    const mockAgentData = {
      name: 'Test Agent',
      description: 'A test agent description.',
      capabilities: ['testing', 'mocking'],
    };
    const registrationError = new Error('Network timeout');

    vi.spyOn(agentPrompts, 'registerAgentPrompts').mockResolvedValue(mockAgentData);
    vi.spyOn(agentHelpers, 'validateAgentParams').mockReturnValue(null);
    mockAgentService.register.mockRejectedValue(registrationError);
    vi.spyOn(errorHandler, 'displayErrorAndCancel');
    vi.spyOn(prompts, 'isCancel').mockReturnValue(false);

    // Act
    await command.parseAsync([], { from: 'user' });

    // Assert
    expect(mockAgentService.register).toHaveBeenCalled();
    expect(errorHandler.displayErrorAndCancel).toHaveBeenCalledWith(registrationError, 'Agent registration');
  });
});
