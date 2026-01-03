/**
 * GhostSpeak ElizaOS Plugin
 *
 * Caisper - Bouncer & Concierge of the Solana Agents Club.
 * Checks IDs at the door and knows exactly who you need inside.
 *
 * Core capabilities:
 * - Ghost Score reputation (0-1000 credit rating)
 * - Agent registration on-chain
 * - W3C Verifiable Credentials
 * - DID document management
 * - Staking, Escrow, Privacy controls
 */

import type { Plugin } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { z } from 'zod';

// Services
import { GhostSpeakService } from './services/GhostSpeakService';

// Actions
import {
  checkGhostScoreAction,
  registerAgentAction,
  issueCredentialAction,
  acceptPaymentAction,
  createDidAction,
  resolveDidAction,
  updateDidAction,
  stakeGhostAction,
  checkStakingAction,
  setPrivacyModeAction,
  createEscrowAction,
} from './actions';

// Providers
import { ghostScoreProvider, agentContextProvider } from './providers';

// Config
import { ghostspeakConfigSchema } from './config';

// Character
import { caisperPersona } from './character/caisper';

/**
 * GhostSpeak Plugin Definition
 *
 * A slim plugin definition that wires together all components.
 * Business logic is in actions, services, and providers.
 */
export const ghostspeakPlugin: Plugin = {
  name: 'plugin-ghostspeak',
  description: `${caisperPersona.name} - ${caisperPersona.role}. ${caisperPersona.tagline}`,

  // Configuration schema
  config: {
    AGENT_WALLET_PRIVATE_KEY: process.env.AGENT_WALLET_PRIVATE_KEY,
    SOLANA_CLUSTER: process.env.SOLANA_CLUSTER,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    CROSSMINT_SECRET_KEY: process.env.CROSSMINT_SECRET_KEY,
    CROSSMINT_REPUTATION_TEMPLATE_ID: process.env.CROSSMINT_REPUTATION_TEMPLATE_ID,
    CROSSMINT_ENV: process.env.CROSSMINT_ENV,
    GHOSTSPEAK_MERCHANT_ADDRESS: process.env.GHOSTSPEAK_MERCHANT_ADDRESS,
    PAYAI_FACILITATOR_URL: process.env.PAYAI_FACILITATOR_URL,
  },

  /**
   * Initialize plugin with validated configuration
   */
  async init(config: Record<string, string>) {
    logger.info({ persona: caisperPersona.name }, 'Initializing GhostSpeak plugin');

    try {
      // Validate configuration
      const validatedConfig = await ghostspeakConfigSchema.parseAsync(config);

      // Set environment variables from validated config
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }

      logger.info({
        cluster: validatedConfig.SOLANA_CLUSTER || 'devnet',
        hasWallet: !!validatedConfig.AGENT_WALLET_PRIVATE_KEY,
        hasCrossmint: !!validatedConfig.CROSSMINT_SECRET_KEY,
      }, 'GhostSpeak plugin configured');

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues?.map((e) => e.message)?.join(', ') || 'Unknown validation error';
        throw new Error(`Invalid plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  // Services
  services: [GhostSpeakService],

  // Actions (no governance - removed per redesign)
  actions: [
    // Core
    checkGhostScoreAction,
    registerAgentAction,
    issueCredentialAction,

    // Payment (x402 via PayAI)
    acceptPaymentAction,

    // DID
    createDidAction,
    resolveDidAction,
    updateDidAction,

    // Protocol
    stakeGhostAction,
    checkStakingAction,
    setPrivacyModeAction,
    createEscrowAction,
  ],

  // Providers
  providers: [ghostScoreProvider, agentContextProvider],

  // Event handlers
  events: {
    MESSAGE_RECEIVED: [
      async (payload: any) => {
        logger.debug({ roomId: payload.message?.roomId }, 'GhostSpeak: Message received');
      },
    ],

    ACTION_COMPLETED: [
      async (payload: any) => {
        // Track successful blockchain operations
        const action = payload.action || '';
        const result = payload.result || {};
        if (result.success && typeof action === 'string' && action.includes('GHOST')) {
          logger.info({ action, data: result.data }, 'GhostSpeak action completed');
        }
      },
    ],
  },

  // No routes - actions handle all interactions
  // Routes removed per redesign
};

// Legacy export for backwards compatibility
export const starterPlugin = ghostspeakPlugin;

// Service export for direct access
export { GhostSpeakService as StarterService } from './services/GhostSpeakService';

export default ghostspeakPlugin;
