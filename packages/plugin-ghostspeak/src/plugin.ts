import type {
  Action,
  ActionResult,
  Content,
  GenerateTextParams,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Plugin,
  Provider,
  ProviderResult,
  RouteRequest,
  RouteResponse,
  State,
} from '@elizaos/core';
import { ModelType, Service, logger } from '@elizaos/core';
import { z } from 'zod';
import { GhostSpeakClient, createPayAIClient } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';
import {
  issueCredentialAction,
  registerAgentAction,
  createDidAction,
  resolveDidAction,
  updateDidAction,
  stakeGhostAction,
  checkStakingAction,
  setPrivacyModeAction,
  createEscrowAction,
  createProposalAction,
  voteProposalAction,
} from './actions';
import { PayAIPollingService } from './services/PayAIPollingService';

/**
 * Defines the configuration schema for the plugin
 * Includes wallet configuration, Crossmint bridge settings, and PayAI integration
 */
const configSchema = z.object({
  // Wallet configuration (for signing transactions)
  AGENT_WALLET_PRIVATE_KEY: z
    .string()
    .optional()
    .describe('Private key for agent wallet (base58, hex, or JSON array format)'),

  // Crossmint configuration (for credential bridging to EVM)
  CROSSMINT_SECRET_KEY: z
    .string()
    .optional()
    .describe('Crossmint API secret key for credential bridging'),

  CROSSMINT_REPUTATION_TEMPLATE_ID: z
    .string()
    .optional()
    .describe('Crossmint template ID for reputation credentials'),

  CROSSMINT_ENV: z
    .enum(['staging', 'production'])
    .optional()
    .describe('Crossmint environment (staging or production)'),

  CROSSMINT_CHAIN: z
    .string()
    .optional()
    .default('base-sepolia')
    .describe('EVM chain for Crossmint (e.g., base-sepolia)'),

  // PayAI configuration (for webhook verification)
  PAYAI_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe('PayAI webhook secret for signature verification'),

  // Legacy example variable (kept for backwards compatibility)
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        logger.debug('Example plugin variable is not provided (this is expected)');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Action representing a hello world message.
 * @typedef {Object} Action
 * @property {string} name - The name of the action.
 * @property {string[]} similes - An array of related actions.
 * @property {string} description - A brief description of the action.
 * @property {Function} validate - Asynchronous function to validate the action.
 * @property {Function} handler - Asynchronous function to handle the action and generate a response.
 * @property {Object[]} examples - An array of example inputs and expected outputs for the action.
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      const response = 'Hello world!';

      if (callback) {
        await callback({
          text: response,
          actions: ['HELLO_WORLD'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['HELLO_WORLD'],
          source: message.content.source,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error in HelloWorld action:');
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'hello',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

/**
 * Helper function to get Ghost Score tier from score (0-1000 scale)
 * For display purposes - converts to Ghost Score first
 */
function getGhostScoreTier(ghostScore: number): string {
  if (ghostScore >= 900) return 'PLATINUM';
  if (ghostScore >= 750) return 'GOLD';
  if (ghostScore >= 500) return 'SILVER';
  if (ghostScore >= 200) return 'BRONZE';
  return 'NEWCOMER';
}

/**
 * Calculate reputation tier based on basis points (0-10000) and total jobs
 * Matches GhostSpeak web app's calculateReputationTier function
 */
function calculateReputationTier(reputationScoreBasisPoints: number, totalJobs: number): string {
  if (reputationScoreBasisPoints >= 9000 && totalJobs >= 100) return 'DIAMOND';
  if (reputationScoreBasisPoints >= 7500 && totalJobs >= 50) return 'PLATINUM';
  if (reputationScoreBasisPoints >= 6000 && totalJobs >= 25) return 'GOLD';
  if (reputationScoreBasisPoints >= 4000 && totalJobs >= 10) return 'SILVER';
  if (reputationScoreBasisPoints >= 2000 && totalJobs >= 5) return 'BRONZE';
  return 'NEWCOMER';
}

/**
 * Helper function to create GhostSpeak client
 */
function createGhostSpeakClient(): GhostSpeakClient {
  return new GhostSpeakClient({
    cluster: (process.env.SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL,
  });
}

/**
 * Ghost Score Action
 * Allows agents to check their own or another agent's Ghost Score
 */
const checkGhostScoreAction: Action = {
  name: 'CHECK_GHOST_SCORE',
  similes: ['GET_GHOST_SCORE', 'CHECK_REPUTATION', 'GET_REPUTATION', 'GHOST_SCORE'],
  description:
    'Check the Ghost Score (reputation) of an AI agent on GhostSpeak. Ghost Score is a 0-1000 credit rating based on transaction history, service quality, and credentials.',

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('ghost score') ||
      text.includes('reputation') ||
      text.includes('check score') ||
      text.includes('agent score')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      // Extract agent address from message
      const text = message.content.text || '';
      const addressMatch = text.match(/([A-Za-z0-9]{32,44})/);
      let agentAddress: Address | undefined;

      // Try to get agent address from message or use runtime agent ID
      if (addressMatch) {
        try {
          agentAddress = address(addressMatch[1]);
        } catch {
          // Invalid address format
        }
      }

      // If no address found, try to use the runtime's agent ID
      if (!agentAddress && runtime.agentId) {
        try {
          agentAddress = address(runtime.agentId);
        } catch {
          // Agent ID is not a valid Solana address
        }
      }

      if (!agentAddress) {
        const errorMsg =
          'Please provide a valid Solana agent address. Usage: "Check ghost score for [agent address]"';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CHECK_GHOST_SCORE'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent address required'),
        };
      }

      // Fetch Ghost Score
      const client = createGhostSpeakClient();
      const agentData = await client.agents.getAgentAccount(agentAddress);

      if (!agentData) {
        const errorMsg = `Agent not found at address ${agentAddress}`;
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CHECK_GHOST_SCORE'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent not found'),
        };
      }

      // Calculate Ghost Score
      const reputationScore = Number(agentData.reputationScore || 0);
      const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
      const tier = getGhostScoreTier(ghostScore);
      const totalJobs = Number(agentData.totalJobsCompleted || 0);
      const successRate =
        totalJobs > 0 ? Math.min(100, Math.round((reputationScore / totalJobs / 100) * 100)) : 0;

      const response = `Ghost Score for ${agentData.name || 'Agent'} (${agentAddress}):
📊 Ghost Score: ${ghostScore}/1000
🏆 Tier: ${tier}
✅ Total Jobs Completed: ${totalJobs}
📈 Success Rate: ${successRate}%
${agentData.isActive ? '🟢 Active' : '🔴 Inactive'}`;

      if (callback) {
        await callback({
          text: response,
          actions: ['CHECK_GHOST_SCORE'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
        data: {
          agentAddress: agentAddress.toString(),
          ghostScore,
          tier,
          totalJobs,
          successRate,
          isActive: agentData.isActive,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error checking Ghost Score:');
      const errorMsg = `Failed to check Ghost Score: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['CHECK_GHOST_SCORE'],
          source: message.content.source,
        });
      }
      return {
        success: false,
        text: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Check ghost score for 7xKXt...9Gk',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Ghost Score for Agent (7xKXt...9Gk):\n📊 Ghost Score: 785/1000\n🏆 Tier: GOLD\n✅ Total Jobs Completed: 1247\n📈 Success Rate: 94%\n🟢 Active',
          actions: ['CHECK_GHOST_SCORE'],
        },
      },
    ],
  ],
};

/**
 * Ghost Score Provider
 * Provides Ghost Score reputation data for state composition
 * Fetches real on-chain data from GhostSpeak blockchain
 */
const ghostScoreProvider: Provider = {
  name: 'GHOST_SCORE_PROVIDER',
  description: 'Provides Ghost Score reputation data for agents from on-chain GhostSpeak data',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      // Try to get agent address from runtime
      if (!runtime.agentId) {
        logger.debug('Ghost Score Provider: No agent ID available in runtime');
        return {
          text: 'No agent ID available',
          values: {},
          data: {},
        };
      }

      let agentAddress: Address;
      try {
        agentAddress = address(runtime.agentId);
        logger.debug({ agentAddress: agentAddress.toString() }, 'Ghost Score Provider: Resolved agent address');
      } catch (error) {
        logger.warn({ agentId: runtime.agentId, error }, 'Ghost Score Provider: Invalid agent ID format');
        return {
          text: 'Agent ID is not a valid Solana address',
          values: {},
          data: {},
        };
      }

      // Create GhostSpeak client with real blockchain connection
      const client = createGhostSpeakClient();
      const cluster = process.env.SOLANA_CLUSTER || 'devnet';
      logger.debug({ agentAddress: agentAddress.toString(), cluster }, 'Ghost Score Provider: Fetching real on-chain data');

      // Fetch real agent account data from blockchain
      let agentData;
      try {
        agentData = await client.agents.getAgentAccount(agentAddress);
        logger.debug({ found: !!agentData, hasReputationScore: !!agentData?.reputationScore }, 'Ghost Score Provider: Fetched agent account from blockchain');
      } catch (error) {
        logger.error({ agentAddress: agentAddress.toString(), error }, 'Ghost Score Provider: Failed to fetch agent account from blockchain');
        return {
          text: `Failed to fetch agent data from blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`,
          values: {},
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'blockchain',
          },
        };
      }

      if (!agentData) {
        logger.warn({ agentAddress: agentAddress.toString() }, 'Ghost Score Provider: Agent not found on blockchain');
        return {
          text: 'Agent not found on GhostSpeak blockchain',
          values: {},
          data: {
            agentAddress: agentAddress.toString(),
            source: 'blockchain',
          },
        };
      }

      // Calculate Ghost Score from real on-chain reputation data
      const reputationScore = Number(agentData.reputationScore || 0);
      const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
      const tier = getGhostScoreTier(ghostScore);
      const totalJobs = Number(agentData.totalJobsCompleted || 0);
      const totalJobsFailed = Number(agentData.totalJobsFailed || 0);
      const successRate =
        totalJobs > 0
          ? Math.min(100, Math.round(((totalJobs - totalJobsFailed) / totalJobs) * 100))
          : 0;

      // Try to fetch additional reputation metrics from reputation module if available
      let additionalMetrics = null;
      try {
        const reputationModule = client.reputation();
        // The reputation module can provide additional calculations if needed
        // For now, we use the comprehensive agent account data which includes reputation score
        logger.debug('Ghost Score Provider: Reputation module available for additional calculations');
      } catch (error) {
        // Reputation module might not be needed if agent account has all data
        logger.debug({ error }, 'Ghost Score Provider: Reputation module not available (using agent account data)');
      }

      // Build comprehensive reputation data from real blockchain data
      const reputationData = {
        ghostScore,
        tier,
        agentAddress: agentAddress.toString(),
        agentName: agentData.name || 'Unknown Agent',
        totalJobsCompleted: totalJobs,
        totalJobsFailed,
        successRate,
        isActive: agentData.isActive || false,
        reputationScoreBasisPoints: reputationScore,
        createdAt: agentData.createdAt ? Number(agentData.createdAt) : null,
        x402Enabled: agentData.x402Enabled || false,
        x402TotalCalls: agentData.x402TotalCalls ? Number(agentData.x402TotalCalls) : 0,
        x402TotalPayments: agentData.x402TotalPayments ? Number(agentData.x402TotalPayments) : 0,
        source: 'blockchain',
        fetchedAt: Date.now(),
        // Additional metrics if available
        ...(additionalMetrics || {}),
      };

      logger.debug({ ghostScore, tier, totalJobs }, 'Ghost Score Provider: Calculated reputation data');

      return {
        text: `Ghost Score: ${ghostScore}/1000 (${tier} tier) - ${totalJobs} jobs completed, ${successRate}% success rate`,
        values: {
          ghostScore,
          tier,
          totalJobs,
          successRate,
          isActive: agentData.isActive,
          agentAddress: agentAddress.toString(),
        },
        data: reputationData,
      };
    } catch (error) {
      logger.error({ error, stack: error instanceof Error ? error.stack : undefined }, 'Error in Ghost Score provider:');
      return {
        text: `Unable to fetch Ghost Score: ${error instanceof Error ? error.message : 'Unknown error'}`,
        values: {},
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        },
      };
    }
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('Starting starter service');
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('Stopping starter service');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('Stopping StarterService');
  }
}

export const starterPlugin: Plugin = {
  name: 'plugin-ghostspeak',
  description: 'Caisper - Bouncer & Concierge of the Solana Agents Club. Checks IDs at the door and knows exactly who you need inside.',
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.debug('Plugin initialized');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(', ') || 'Unknown validation error';
        throw new Error(`Invalid plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  routes: [
    {
      name: 'hello-world-route',
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: RouteRequest, res: RouteResponse) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
    {
      name: 'current-time-route',
      path: '/api/time',
      type: 'GET',
      handler: async (_req: RouteRequest, res: RouteResponse) => {
        // Return current time in various formats
        const now = new Date();
        res.json({
          timestamp: now.toISOString(),
          unix: Math.floor(now.getTime() / 1000),
          formatted: now.toLocaleString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
    },
    {
      name: 'ghost-score-route',
      path: '/api/ghost-score/:agentAddress',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const agentAddressParam = req.params?.agentAddress || req.url?.split('/').pop();
          
          if (!agentAddressParam) {
            return res.status(400).json({
              error: 'Agent address is required',
            });
          }

          let agentAddress: Address;
          try {
            agentAddress = address(agentAddressParam);
          } catch {
            return res.status(400).json({
              error: 'Invalid agent address format',
            });
          }

          const client = createGhostSpeakClient();
          const agentData = await client.agents.getAgentAccount(agentAddress);

          if (!agentData) {
            return res.status(404).json({
              error: 'Agent not found',
            });
          }

          // Calculate Ghost Score
          const reputationScore = Number(agentData.reputationScore || 0);
          const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
          const tier = getGhostScoreTier(ghostScore);
          const totalJobs = Number(agentData.totalJobsCompleted || 0);
          const successRate =
            totalJobs > 0 ? Math.min(100, Math.round((reputationScore / totalJobs / 100) * 100)) : 0;

          res.json({
            verified: true,
            ghostScore,
            tier,
            agentAddress: agentAddress.toString(),
            agentName: agentData.name || 'Unknown Agent',
            metrics: {
              totalJobs,
              successRate,
              isActive: agentData.isActive,
              reputationScore,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error({ error }, 'Error fetching Ghost Score:');
          res.status(500).json({
            error: 'Failed to fetch Ghost Score',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'credential-verify-route',
      path: '/api/credentials/verify',
      type: 'POST',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
          const { credential } = body;

          if (!credential) {
            return res.status(400).json({
              isValid: false,
              error: 'Missing credential in request body',
            });
          }

          // Basic credential structure validation
          if (!credential['@context'] || !credential.type || !credential.issuer) {
            return res.status(400).json({
              isValid: false,
              error: 'Invalid credential structure: missing required fields (@context, type, issuer)',
            });
          }

          // For now, return basic validation
          // In production, this would use CrossmintVCClient or similar
          const isValid = !!(
            credential['@context'] &&
            credential.type &&
            credential.issuer &&
            credential.credentialSubject
          );

          res.json({
            isValid,
            errors: isValid ? [] : ['Credential structure validation failed'],
            verifiedAt: new Date().toISOString(),
          });
        } catch (error) {
          logger.error({ error }, 'Error verifying credential:');
          res.status(500).json({
            isValid: false,
            error: 'Failed to verify credential',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'agent-search-route',
      path: '/api/agents/search',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const query = req.query?.query as string | undefined;
          const minScore = Number(req.query?.minScore) || 0;

          const client = createGhostSpeakClient();
          const allAgents = await client.agents.getAllAgents();

          // Filter agents
          let filteredAgents = allAgents.filter(({ data }) => {
            // Filter by minimum score
            const reputationScore = Number(data.reputationScore || 0);
            const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
            if (ghostScore < minScore) return false;

            // Filter by query (name or capabilities)
            if (query) {
              const queryLower = query.toLowerCase();
              const nameMatch = data.name?.toLowerCase().includes(queryLower);
              const descriptionMatch = data.description?.toLowerCase().includes(queryLower);
              return nameMatch || descriptionMatch;
            }

            return true;
          });

          // Map to response format
          const agents = filteredAgents.map(({ address, data }) => {
            const reputationScore = Number(data.reputationScore || 0);
            const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
            const tier = getGhostScoreTier(ghostScore);

            return {
              address: address.toString(),
              name: data.name || 'Unknown Agent',
              description: data.description,
              capabilities: [], // Would need to parse from metadata
              ghostScore,
              tier,
              isActive: data.isActive,
            };
          });

          res.json({ agents });
        } catch (error) {
          logger.error({ error }, 'Error searching agents:');
          res.status(500).json({
            error: 'Failed to search agents',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'reputation-breakdown-route',
      path: '/api/reputation/:agentAddress',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const agentAddressParam = req.params?.agentAddress || req.url?.split('/').pop();

          if (!agentAddressParam) {
            return res.status(400).json({
              error: 'Agent address is required',
            });
          }

          let agentAddress: Address;
          try {
            agentAddress = address(agentAddressParam);
          } catch {
            return res.status(400).json({
              error: 'Invalid agent address format',
            });
          }

          const client = createGhostSpeakClient();
          const agentData = await client.agents.getAgentAccount(agentAddress);

          if (!agentData) {
            return res.status(404).json({
              error: 'Agent not found',
            });
          }

          // Calculate breakdown metrics
          const reputationScore = Number(agentData.reputationScore || 0);
          const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
          const totalJobs = Number(agentData.totalJobsCompleted || 0);
          const totalJobsFailed = Number(agentData.totalJobsFailed || 0);
          const totalJobsAll = totalJobs + totalJobsFailed;

          const successRate = totalJobsAll > 0
            ? Math.round((totalJobs / totalJobsAll) * 100)
            : 0;

          const serviceQuality = Math.min(100, Math.round((ghostScore / 10) * 1.2));
          const responseTime = 95; // Would come from actual metrics
          const volumeConsistency = Math.min(100, Math.round((totalJobs / 100) * 100));

          // Calculate risk score (inverse of reputation)
          const riskScore = Math.max(0, Math.min(100, 100 - ghostScore / 10));
          const trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
            riskScore < 20 ? 'HIGH' : riskScore < 40 ? 'MEDIUM' : 'LOW';

          res.json({
            successRate,
            serviceQuality,
            responseTime,
            volumeConsistency,
            riskScore,
            trustLevel,
            badges: ghostScore >= 900 ? [
              { name: 'Elite', description: 'Top tier reputation' },
            ] : ghostScore >= 750 ? [
              { name: 'Gold', description: 'High reputation' },
            ] : [],
            performanceHistory: [],
            categoryScores: {},
          });
        } catch (error) {
          logger.error({ error }, 'Error fetching reputation breakdown:');
          res.status(500).json({
            error: 'Failed to fetch reputation breakdown',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'trust-scoreboard-route',
      path: '/api/trust-scoreboard',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const limit = Number(req.query?.limit) || 10;
          const category = req.query?.category as string | undefined;

          logger.info({ limit, category }, 'Trust scoreboard requested');

          const client = createGhostSpeakClient();
          
          // Fetch all agents from blockchain
          const allAgents = await client.agents.getAllAgents();

          // Filter by category if specified
          let filteredAgents = allAgents;
          if (category) {
            filteredAgents = allAgents.filter((agent: any) =>
              agent.data?.capabilities?.some((cap: string) =>
                cap.toLowerCase().includes(category.toLowerCase())
              )
            );
          }

          // Sort by reputation score (descending) and take top N
          // Matches GhostSpeak web app's useReputationLeaderboard implementation
          const sortedAgents = filteredAgents
            .map((agent: any) => {
              const reputationScoreBasisPoints = Number(agent.data?.reputationScore || 0);
              const ghostScore = Math.round(reputationScoreBasisPoints / 100); // Convert to 0-1000 scale
              const totalJobs = Number(agent.data?.totalJobsCompleted || 0);
              
              // Calculate tier using basis points + totalJobs (matches web app)
              const tier = calculateReputationTier(reputationScoreBasisPoints, totalJobs);
              
              // Calculate success rate
              const successRate =
                totalJobs > 0
                  ? Math.min(100, Math.round((reputationScoreBasisPoints / totalJobs / 100) * 100))
                  : 0;

              return {
                address: agent.address.toString(),
                name: agent.data?.name || 'Unknown Agent',
                ghostScore,
                tier,
                totalJobs,
                successRate,
                reputationScoreBasisPoints,
                hasCredential: false, // TODO: Check credential status from Crossmint
                credentialId: undefined,
              };
            })
            .sort((a: any, b: any) => b.reputationScoreBasisPoints - a.reputationScoreBasisPoints) // Sort by basis points
            .slice(0, limit)
            .map((agent: any, index: number) => ({
              ...agent,
              rank: index + 1,
            }));

          res.json({
            agents: sortedAgents,
            count: sortedAgents.length,
            total: filteredAgents.length,
          });
        } catch (error) {
          logger.error({ error }, 'Error fetching trust scoreboard:');
          res.status(500).json({
            error: 'Failed to fetch trust scoreboard',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'agent-register-route',
      path: '/api/agents/register',
      type: 'POST',
      handler: async (req: RouteRequest, res: RouteResponse, runtime?: IAgentRuntime) => {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
          const { name, description, agentId, agentType = 0, capabilities = [] } = body;

          if (!name || !description || !agentId) {
            return res.status(400).json({
              success: false,
              error: 'Missing required fields: name, description, and agentId are required',
            });
          }

          // Note: In a real implementation, this would need a wallet/signer from the runtime
          // For now, we'll return a mock response indicating the registration would happen
          // The actual registration requires a transaction signer which should come from the agent's wallet
          
          logger.info({ name, agentId, agentType }, 'Agent registration requested');

          // In production, this would:
          // 1. Get signer from runtime or request
          // 2. Create metadata URI (IPFS or similar)
          // 3. Call client.agents.register(signer, { ... })
          // 4. Return the agent address and transaction signature

          // Mock response for now - actual implementation needs wallet integration
          const mockAddress = '11111111111111111111111111111111'; // Would be derived from agentId + signer
          const mockSignature = 'mock-transaction-signature';

          res.json({
            success: true,
            address: mockAddress,
            signature: mockSignature,
            message: 'Agent registration initiated. In production, this would execute a blockchain transaction.',
          });
        } catch (error) {
          logger.error({ error }, 'Error registering agent:');
          res.status(500).json({
            success: false,
            error: 'Failed to register agent',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'payai-discover-route',
      path: '/api/payai/discover',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const capability = req.query?.capability as string | undefined;
          const maxPrice = req.query?.maxPrice ? Number(req.query.maxPrice) : undefined;

          // Initialize PayAI client
          const facilitatorUrl = process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network';
          const payaiClient = createPayAIClient({
            facilitatorUrl,
          });

          logger.info({ capability, maxPrice, facilitatorUrl }, 'PayAI discovery requested');

          const result = await payaiClient.listResources({
            capability,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
          });

          res.json({
            resources: result.resources || [],
            count: result.resources?.length || 0,
          });
        } catch (error) {
          logger.error({ error }, 'Error discovering PayAI agents:');
          res.status(500).json({
            error: 'Failed to discover PayAI agents',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'elizaos-discover-route',
      path: '/api/elizaos/discover',
      type: 'GET',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const capability = req.query?.capability as string | undefined;
          const elizaosApiUrl = process.env.ELIZAOS_CLOUD_API_URL || 'https://api.elizacloud.ai';
          const apiKey = process.env.ELIZAOS_CLOUD_API_KEY;

          // NOTE: Based on ElizaOS Cloud documentation (https://www.elizacloud.ai/.well-known/llms-full.txt),
          // there is no public agent discovery/marketplace API documented. Agents are created and managed
          // per user/organization via Visual Builder, REST API, or CLI.
          // 
          // This endpoint provides a placeholder for future agent discovery functionality.
          // For now, it returns empty results or mock data for demo purposes.
          
          if (!apiKey) {
            logger.warn('ELIZAOS_CLOUD_API_KEY not set, returning empty results');
            res.json({
              agents: [],
              count: 0,
              message: 'ElizaOS Cloud does not currently provide a public agent discovery API. Agents are managed per organization.',
              note: 'To create agents, use the Visual Builder, REST API, or CLI as documented at https://www.elizacloud.ai/docs',
            });
            return;
          }

          // Future: If ElizaOS Cloud adds agent discovery, implement here
          // For now, return empty results with helpful message
          logger.info('ElizaOS Cloud agent discovery requested, but API not available');
          res.json({
            agents: [],
            count: 0,
            message: 'Agent discovery API not yet available in ElizaOS Cloud',
            note: 'Agents are created and managed per organization. See https://www.elizacloud.ai/docs for agent creation methods.',
          });
        } catch (error) {
          logger.error({ error }, 'Error discovering ElizaOS Cloud agents:');
          res.status(500).json({
            error: 'Failed to discover ElizaOS Cloud agents',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'elizaos-register-route',
      path: '/api/elizaos/register',
      type: 'POST',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
          const { name, description, capabilities, contact_info } = body;

          if (!name || !description || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Missing required fields: name, description, and capabilities array are required',
            });
          }

          const elizaosApiUrl = process.env.ELIZAOS_CLOUD_API_URL || 'https://api.elizacloud.ai';
          const apiKey = process.env.ELIZAOS_CLOUD_API_KEY;

          // NOTE: Based on ElizaOS Cloud documentation (https://www.elizacloud.ai/.well-known/llms-full.txt),
          // agents are created via Visual Builder, REST API (for chat completions), or CLI deployment.
          // There is no documented public agent registration/marketplace API.
          //
          // This endpoint provides a placeholder that explains how to actually create agents.
          
          logger.info({ name, capabilities }, 'ElizaOS Cloud registration requested (placeholder)');
          
          // Return helpful response explaining how to actually create agents
          return res.json({
            success: false,
            message: 'ElizaOS Cloud does not provide a public agent registration API',
            instructions: {
              method1: {
                title: 'Visual Builder',
                description: 'Create agents using the no-code editor',
                url: 'https://www.elizacloud.ai/docs/quickstart#using-the-agent-creator',
              },
              method2: {
                title: 'REST API',
                description: 'Deploy agents via OpenAI-compatible API endpoints',
                url: 'https://www.elizacloud.ai/docs/quickstart#using-the-api',
              },
              method3: {
                title: 'CLI Deployment',
                description: 'Deploy from your local project',
                url: 'https://www.elizacloud.ai/docs/quickstart#using-the-cli',
              },
            },
            note: 'Agents are managed per organization, not registered to a public marketplace',
          });
        } catch (error) {
          logger.error({ error }, 'Error processing ElizaOS Cloud registration request:');
          res.status(500).json({
            success: false,
            error: 'Failed to process registration request',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
    {
      name: 'elizaos-register-with-ghostspeak-route',
      path: '/api/elizaos/register-with-ghostspeak',
      type: 'POST',
      handler: async (req: RouteRequest, res: RouteResponse) => {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
          const { elizaosAgentId, name, capabilities } = body;

          if (!elizaosAgentId || !name || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Missing required fields: elizaosAgentId, name, and capabilities array are required',
            });
          }

          logger.info({ elizaosAgentId, name, capabilities }, 'Registering ElizaOS Cloud agent with GhostSpeak');

          // This would require wallet signing in production
          // For now, return instructions on how to do this properly
          return res.json({
            success: false,
            message: 'Agent registration requires wallet signing',
            instructions: {
              step1: {
                title: 'Register Agent on GhostSpeak',
                description: 'Use the GhostSpeak SDK or CLI to register your agent',
                code: `import { GhostSpeakClient } from '@ghostspeak/sdk';
const client = new GhostSpeakClient({ cluster: 'devnet' });
const agent = await client.agents.register(signer, {
  name: '${name}',
  description: 'ElizaOS Cloud agent: ${elizaosAgentId}',
  capabilities: ${JSON.stringify(capabilities)},
});`,
              },
              step2: {
                title: 'Issue Verifiable Credential',
                description: 'Get W3C credential for cross-chain identity',
                code: `const credential = await client.credentials.issueAgentIdentityCredential({
  agentId: agent.address,
  name: '${name}',
  capabilities: ${JSON.stringify(capabilities)},
  syncToCrossmint: true, // Bridge to EVM
});`,
              },
              step3: {
                title: 'Link to ElizaOS Cloud',
                description: 'Store the GhostSpeak agent address in your ElizaOS Cloud agent metadata',
              },
            },
            note: 'Once registered, your agent will have on-chain reputation tracking and verifiable credentials',
          });
        } catch (error) {
          logger.error({ error }, 'Error registering agent to ElizaOS Cloud:');
          res.status(500).json({
            success: false,
            error: 'Failed to register agent to ElizaOS Cloud',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug({ keys: Object.keys(params) }, 'MESSAGE_RECEIVED param keys');
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug({ keys: Object.keys(params) }, 'VOICE_MESSAGE_RECEIVED param keys');
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.debug('WORLD_CONNECTED event received');
        // print the keys
        logger.debug({ keys: Object.keys(params) }, 'WORLD_CONNECTED param keys');
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.debug('WORLD_JOINED event received');
        // print the keys
        logger.debug({ keys: Object.keys(params) }, 'WORLD_JOINED param keys');
      },
    ],
  },
  services: [StarterService, PayAIPollingService],
  actions: [
    helloWorldAction,
    checkGhostScoreAction,
    issueCredentialAction,
    registerAgentAction,
    createDidAction,
    resolveDidAction,
    updateDidAction,
    stakeGhostAction,
    checkStakingAction,
    setPrivacyModeAction,
    createEscrowAction,
    createProposalAction,
    voteProposalAction,
    {
      name: 'VERIFY_ELIZAOS_AGENT',
      description: 'Verify an ElizaOS Cloud agent using GhostSpeak reputation and credentials. Checks Ghost Score, verifies W3C credentials, and provides trust assessment.',
      similes: ['VERIFY_ELIZAOS', 'CHECK_ELIZAOS_TRUST', 'ELIZAOS_VERIFICATION'],
      examples: [
        [
          {
            user: '{{user1}}',
            content: {
              text: 'Verify this ElizaOS Cloud agent: elizaos-agent-123',
            },
          },
        ],
        [
          {
            user: '{{user1}}',
            content: {
              text: 'Check the trust score for agent elizaos-agent-456',
            },
          },
        ],
      ],
      handler: async (runtime: IAgentRuntime, message: Memory): Promise<string | null> => {
        try {
          const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
          
          // Extract agent ID from message
          const agentIdMatch = text.match(/elizaos-agent-[\w-]+|agent[:\s]+([\w-]+)/i);
          const agentId = agentIdMatch ? (agentIdMatch[1] || agentIdMatch[0]) : null;

          if (!agentId) {
            return "I need an ElizaOS Cloud agent ID to verify. Format: 'Verify agent elizaos-agent-123' or 'Check trust for elizaos-agent-456'";
          }

          logger.info({ agentId }, 'Verifying ElizaOS Cloud agent with GhostSpeak');

          // Check if agent is registered with GhostSpeak
          // In production, this would look up the agent by ElizaOS Cloud ID mapping
          // For now, we'll provide instructions
          
          return `Hold my ectoplasm, checking ElizaOS Cloud agent "${agentId}"... 🔍

**ElizaOS Cloud Agent Verification**

To verify this agent with GhostSpeak's trust system:

1. **Check Registration**: First, verify if this agent is registered with GhostSpeak
   - If registered: I can pull their Ghost Score, credentials, and reputation breakdown
   - If not registered: They can register to get on-chain reputation tracking

2. **Ghost Score Check**: Use the Ghost Score Checker tool to see their reputation (0-1000)
   - Platinum (900+): Elite tier, highly trusted
   - Gold (750+): High reputation, reliable
   - Silver (500+): Good standing
   - Bronze (250+): Building reputation
   - Newcomer (<250): Just starting out

3. **Credential Verification**: Use Credential Verification to check their W3C credentials
   - Agent Identity credentials prove ownership
   - Reputation Tier credentials show their trust level
   - Job Completion credentials demonstrate work history

4. **Reputation Breakdown**: Get detailed metrics:
   - Success rate (payment completion)
   - Service quality (ratings)
   - Response time
   - Volume consistency

**To register this agent with GhostSpeak:**
Use the "Register to GhostSpeak" tool and provide:
- ElizaOS Cloud Agent ID: ${agentId}
- Agent name and capabilities
- I'll handle the on-chain registration and credential issuance

Want me to check if this agent is already registered, or help them get started? 👻`;
        } catch (error) {
          logger.error({ error }, 'Error verifying ElizaOS Cloud agent:');
          return `Sorry, I hit a snag verifying that agent. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ],
  providers: [helloWorldProvider, ghostScoreProvider],
  // dependencies: ['@elizaos/plugin-knowledge'], <--- plugin dependencies go here (if requires another plugin)
};

export default starterPlugin;
