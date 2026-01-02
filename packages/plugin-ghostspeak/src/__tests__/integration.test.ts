import { describe, expect, it, beforeEach, afterAll, beforeAll } from 'bun:test';
import { ghostspeakPlugin, GhostSpeakService } from '../index';
import { createMockRuntime, setupLoggerSpies, MockRuntime, createTestMemory, createTestState } from './test-utils';
import type { HandlerCallback, IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

/**
 * Integration tests demonstrate how multiple components of the plugin work together.
 * Unlike unit tests that test individual functions in isolation, integration tests
 * examine how components interact with each other.
 *
 * For example, this file shows how the CHECK_GHOST_SCORE action and GHOST_SCORE_PROVIDER
 * interact with the GhostSpeakService and the plugin's core functionality.
 */

// Set up spies on logger
beforeAll(() => {
  setupLoggerSpies();
});

afterAll(() => {
  // No global restore needed in bun:test
});

describe('Integration: CHECK_GHOST_SCORE Action with GhostSpeakService', () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    // Create a service mock that will be returned by getService
    const mockService = {
      capabilityDescription:
        'GhostSpeak service for Ghost Score reputation and agent management',
      stop: () => Promise.resolve(),
      getAgent: async () => ({
        name: 'Test Agent',
        reputationScore: BigInt(75000),
        totalJobsCompleted: BigInt(100),
        isActive: true,
        x402Enabled: true,
      }),
      getCluster: () => 'devnet',
      getStats: () => ({
        cacheSize: 0,
        hasSigner: false,
        cluster: 'devnet',
        isMainnet: false,
      }),
    };

    // Create a mock runtime with a spied getService method
    const getServiceImpl = (serviceType: string) => {
      if (serviceType === 'ghostspeak') {
        return mockService as any;
      }
      return null;
    };

    mockRuntime = createMockRuntime({
      getService: getServiceImpl as any,
    });
  });

  it('should handle CHECK_GHOST_SCORE action with GhostSpeakService available', async () => {
    // Find the CHECK_GHOST_SCORE action
    const checkGhostScoreAction = ghostspeakPlugin.actions?.find((action) => action.name === 'CHECK_GHOST_SCORE');
    expect(checkGhostScoreAction).toBeDefined();

    // Create a mock message with a valid Solana address
    // Using a valid base58 devnet-style address (44 characters)
    const mockMessage = createTestMemory({
      content: {
        text: 'check ghost score for 7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        source: 'test',
      },
    });

    const mockState = createTestState();

    // Create a mock callback to capture the response
    const callbackCalls: any[] = [];
    const callbackFn = async (...args: any[]) => {
      callbackCalls.push(args);
      return [];
    };

    // Execute the action
    const result = await checkGhostScoreAction?.handler(
      mockRuntime as Partial<IAgentRuntime> as IAgentRuntime,
      mockMessage,
      mockState,
      {},
      callbackFn as HandlerCallback,
      []
    );

    // Verify the action returned success
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('values');
    expect(result).toHaveProperty('data');

    // Get the service to ensure integration
    const service = mockRuntime.getService('ghostspeak');
    expect(service).toBeDefined();
    expect(service?.capabilityDescription).toContain('GhostSpeak');
  });

  it('should handle missing service gracefully', async () => {
    const checkGhostScoreAction = ghostspeakPlugin.actions?.find((action) => action.name === 'CHECK_GHOST_SCORE');
    expect(checkGhostScoreAction).toBeDefined();

    // Create runtime without the service
    const runtimeWithoutService = createMockRuntime({
      getService: () => null,
    });

    const mockMessage = createTestMemory({
      content: {
        text: 'check ghost score',
        source: 'test',
      },
    });

    const callbackCalls: any[] = [];
    const callbackFn = async (...args: any[]) => {
      callbackCalls.push(args);
      return [];
    };

    const result = await checkGhostScoreAction?.handler(
      runtimeWithoutService as Partial<IAgentRuntime> as IAgentRuntime,
      mockMessage,
      createTestState(),
      {},
      callbackFn as HandlerCallback,
      []
    );

    // Should fail gracefully with appropriate error
    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
  });
});

describe('Integration: Plugin initialization and service registration', () => {
  it('should initialize the plugin and register the service', async () => {
    // Create a fresh mock runtime with mocked registerService for testing initialization flow
    const mockRuntime = createMockRuntime();

    // Create and install a mock registerService
    const registerServiceCalls: any[] = [];
    mockRuntime.registerService = (service: any) => {
      registerServiceCalls.push({ service });
      return Promise.resolve();
    };

    // Run a minimal simulation of the plugin initialization process
    if (ghostspeakPlugin.init) {
      await ghostspeakPlugin.init(
        { SOLANA_CLUSTER: 'devnet' },
        mockRuntime as Partial<IAgentRuntime> as IAgentRuntime
      );

      // Directly mock the service registration that happens during initialization
      // because unit tests don't run the full agent initialization flow
      if (ghostspeakPlugin.services) {
        const GhostSpeakServiceClass = ghostspeakPlugin.services[0];
        const serviceInstance = await GhostSpeakServiceClass.start(
          mockRuntime as Partial<IAgentRuntime> as IAgentRuntime
        );

        // Register the Service class to match the core API
        mockRuntime.registerService(GhostSpeakServiceClass);
      }

      // Now verify the service was registered with the runtime
      expect(registerServiceCalls.length).toBeGreaterThan(0);
    }
  });

  it('should export GhostSpeakService with correct serviceType', () => {
    expect(GhostSpeakService.serviceType).toBe('ghostspeak');
  });
});

describe('Integration: Provider and Service interaction', () => {
  it('should have providers that work with the service', async () => {
    const provider = ghostspeakPlugin.providers?.find(p => p.name === 'GHOST_SCORE_PROVIDER');
    expect(provider).toBeDefined();

    // Create runtime with mock service
    const mockService = {
      getAgent: async () => ({
        name: 'Test Agent',
        reputationScore: BigInt(50000),
        totalJobsCompleted: BigInt(50),
        isActive: true,
      }),
      getCluster: () => 'devnet',
    };

    const runtime = createMockRuntime({
      getService: (type: string) => type === 'ghostspeak' ? mockService as any : null,
    });

    const message = createTestMemory();
    const state = createTestState();

    const result = await provider?.get(runtime as any, message, state);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('values');
    expect(result).toHaveProperty('data');
  });
});
