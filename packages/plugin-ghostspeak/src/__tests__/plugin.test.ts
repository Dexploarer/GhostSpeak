import { describe, expect, it, beforeEach } from 'bun:test';
import { ghostspeakPlugin, starterPlugin, GhostSpeakService } from '../index';
import {
  type IAgentRuntime,
  type Memory,
  type Content,
  type HandlerCallback,
  logger,
} from '@elizaos/core';
import dotenv from 'dotenv';
import {
  createMockRuntime,
  createTestMemory,
  createTestState,
} from './test-utils';

// Setup environment variables
dotenv.config();

describe('GhostSpeak Plugin Configuration', () => {
  it('should have correct plugin metadata', () => {
    expect(ghostspeakPlugin.name).toBe('plugin-ghostspeak');
    expect(ghostspeakPlugin.description).toBeDefined();
    expect(ghostspeakPlugin.description.length).toBeGreaterThan(0);
    expect(ghostspeakPlugin.actions).toBeDefined();
    expect(ghostspeakPlugin.actions?.length).toBeGreaterThan(0);
    expect(ghostspeakPlugin.providers).toBeDefined();
    expect(ghostspeakPlugin.providers?.length).toBeGreaterThan(0);
    expect(ghostspeakPlugin.services).toBeDefined();
    expect(ghostspeakPlugin.services?.length).toBeGreaterThan(0);
    expect(ghostspeakPlugin.events).toBeDefined();
  });

  it('should export starterPlugin for backwards compatibility', () => {
    expect(starterPlugin).toBe(ghostspeakPlugin);
  });

  it('should have required actions', () => {
    const actionNames = ghostspeakPlugin.actions?.map(a => a.name) || [];
    expect(actionNames).toContain('CHECK_GHOST_SCORE');
    expect(actionNames).toContain('REGISTER_AGENT');
    expect(actionNames).toContain('ISSUE_CREDENTIAL');
    expect(actionNames).toContain('CREATE_DID');
    expect(actionNames).toContain('RESOLVE_DID');
    expect(actionNames).toContain('UPDATE_DID');
    expect(actionNames).toContain('STAKE_GHOST');
    expect(actionNames).toContain('CHECK_STAKING');
    expect(actionNames).toContain('SET_PRIVACY_MODE');
    expect(actionNames).toContain('CREATE_ESCROW');
  });

  it('should have required providers', () => {
    const providerNames = ghostspeakPlugin.providers?.map(p => p.name) || [];
    expect(providerNames).toContain('GHOST_SCORE_PROVIDER');
    expect(providerNames).toContain('AGENT_CONTEXT_PROVIDER');
  });

  it('should initialize with valid configuration', async () => {
    const runtime = createMockRuntime();
    const config = {
      SOLANA_CLUSTER: 'devnet',
    };

    if (ghostspeakPlugin.init) {
      await ghostspeakPlugin.init(config, runtime);
    }

    expect(process.env.SOLANA_CLUSTER).toBe('devnet');
  });

  it('should handle initialization without config', async () => {
    const runtime = createMockRuntime();

    if (ghostspeakPlugin.init) {
      // Init should not throw even with empty config
      await ghostspeakPlugin.init({}, runtime);
    }
  });
});

describe('CHECK_GHOST_SCORE Action', () => {
  let runtime: IAgentRuntime;
  const checkGhostScoreAction = ghostspeakPlugin.actions?.find(a => a.name === 'CHECK_GHOST_SCORE');

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should have CHECK_GHOST_SCORE action', () => {
    expect(checkGhostScoreAction).toBeDefined();
    expect(checkGhostScoreAction?.name).toBe('CHECK_GHOST_SCORE');
    expect(checkGhostScoreAction?.description).toBeDefined();
    expect(checkGhostScoreAction?.similes).toContain('GET_GHOST_SCORE');
  });

  it('should validate messages containing ghost score keywords', async () => {
    if (!checkGhostScoreAction?.validate) {
      throw new Error('CHECK_GHOST_SCORE action validate not found');
    }

    const testCases = [
      { text: 'check ghost score', expected: true },
      { text: 'what is my reputation?', expected: true },
      { text: 'check score for agent', expected: true },
      { text: 'agent score please', expected: true },
      { text: 'hello world', expected: false },
      { text: 'goodbye', expected: false },
    ];

    for (const { text, expected } of testCases) {
      const message = createTestMemory({
        content: { text, source: 'test' },
      });
      const isValid = await checkGhostScoreAction.validate(runtime, message);
      expect(isValid).toBe(expected);
    }
  });

  it('should handle missing GhostSpeak service gracefully', async () => {
    if (!checkGhostScoreAction?.handler) {
      throw new Error('CHECK_GHOST_SCORE action handler not found');
    }

    const message = createTestMemory({
      content: { text: 'check ghost score', source: 'test' },
    });

    // Runtime without the service registered
    const runtimeWithoutService = createMockRuntime({
      getService: () => null,
    });

    let callbackContent: any = null;
    const callback: HandlerCallback = async (content: Content) => {
      callbackContent = content;
      return [];
    };

    const result = await checkGhostScoreAction.handler(
      runtimeWithoutService,
      message,
      undefined,
      undefined,
      callback
    );

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
  });
});

describe('GHOST_SCORE_PROVIDER', () => {
  const provider = ghostspeakPlugin.providers?.find(p => p.name === 'GHOST_SCORE_PROVIDER');
  let runtime: IAgentRuntime;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should have GHOST_SCORE_PROVIDER', () => {
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('GHOST_SCORE_PROVIDER');
    expect(provider?.description).toBeDefined();
  });

  it('should handle missing service gracefully', async () => {
    if (!provider?.get) {
      throw new Error('GHOST_SCORE_PROVIDER get not found');
    }

    const runtimeWithoutService = createMockRuntime({
      getService: () => null,
    });

    const message = createTestMemory();
    const state = createTestState();

    const result = await provider.get(runtimeWithoutService, message, state);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('values');
    expect(result).toHaveProperty('data');
  });
});

describe('AGENT_CONTEXT_PROVIDER', () => {
  const provider = ghostspeakPlugin.providers?.find(p => p.name === 'AGENT_CONTEXT_PROVIDER');
  let runtime: IAgentRuntime;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should have AGENT_CONTEXT_PROVIDER', () => {
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('AGENT_CONTEXT_PROVIDER');
    expect(provider?.description).toBeDefined();
  });

  it('should handle missing service gracefully', async () => {
    if (!provider?.get) {
      throw new Error('AGENT_CONTEXT_PROVIDER get not found');
    }

    const runtimeWithoutService = createMockRuntime({
      getService: () => null,
    });

    const message = createTestMemory();
    const state = createTestState();

    const result = await provider.get(runtimeWithoutService, message, state);

    expect(result).toHaveProperty('text');
    expect(result.values).toHaveProperty('serviceAvailable', false);
  });
});

describe('GhostSpeakService', () => {
  let runtime: IAgentRuntime;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should have correct service type', () => {
    expect(GhostSpeakService.serviceType).toBe('ghostspeak');
  });

  it('should start the service', async () => {
    const service = await GhostSpeakService.start(runtime);
    expect(service).toBeInstanceOf(GhostSpeakService);
    expect(service.capabilityDescription).toBeDefined();
  });

  it('should provide capability description', async () => {
    const service = await GhostSpeakService.start(runtime);
    expect(service.capabilityDescription).toContain('GhostSpeak');
    expect(service.capabilityDescription).toContain('reputation');
  });

  it('should provide cluster information', async () => {
    const service = await GhostSpeakService.start(runtime);
    expect(service.getCluster()).toBeDefined();
    expect(['devnet', 'mainnet-beta', 'testnet']).toContain(service.getCluster());
  });

  it('should provide stats', async () => {
    const service = await GhostSpeakService.start(runtime);
    const stats = service.getStats();
    expect(stats).toHaveProperty('cacheSize');
    expect(stats).toHaveProperty('hasSigner');
    expect(stats).toHaveProperty('cluster');
    expect(stats).toHaveProperty('isMainnet');
  });

  it('should stop service correctly', async () => {
    const service = await GhostSpeakService.start(runtime);
    await service.stop();
    // Service should be stopped without errors
  });
});

describe('Event Handlers', () => {
  it('should have MESSAGE_RECEIVED event handler', () => {
    const handler = ghostspeakPlugin.events?.MESSAGE_RECEIVED;
    expect(handler).toBeDefined();
    expect(Array.isArray(handler)).toBe(true);
    expect(handler?.length).toBeGreaterThan(0);
  });

  it('should have ACTION_COMPLETED event handler', () => {
    const handler = ghostspeakPlugin.events?.ACTION_COMPLETED;
    expect(handler).toBeDefined();
    expect(Array.isArray(handler)).toBe(true);
    expect(handler?.length).toBeGreaterThan(0);
  });
});
