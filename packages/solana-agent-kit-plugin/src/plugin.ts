/**
 * GhostSpeak Plugin for solana-agent-kit
 *
 * Adds universal AI agent identity and reputation to solana-agent-kit
 */

import type { Plugin } from 'solana-agent-kit';
import type { GhostPluginConfig } from './types/index.js';
import * as methods from './methods/index.js';
import {
  getGhostIdentityAction,
  resolveExternalIdAction,
  getGhostScoreAction,
  verifyGhostAction,
} from './actions/index.js';

/**
 * Create GhostSpeak plugin for solana-agent-kit
 *
 * @param config - Plugin configuration options
 * @returns Plugin instance
 *
 * @example
 * ```typescript
 * import { SolanaAgentKit } from 'solana-agent-kit';
 * import { createGhostPlugin } from '@ghostspeak/solana-agent-kit-plugin';
 *
 * const agent = new SolanaAgentKit(wallet, RPC_URL, {})
 *   .use(createGhostPlugin({ cluster: 'devnet' }));
 *
 * // Get Ghost identity
 * const identity = await agent.methods.getGhostIdentity(ghostAddress);
 *
 * // Resolve external ID
 * const address = await agent.methods.resolveExternalId({
 *   platform: 'payai',
 *   externalId: 'agent-123'
 * });
 * ```
 */
export function createGhostPlugin(config?: GhostPluginConfig): Plugin {
  return {
    name: 'GhostSpeak',

    methods: {
      // Ghost identity management
      registerGhost: methods.registerGhost,
      getGhostIdentity: methods.getGhostIdentity,
      resolveExternalId: methods.resolveExternalId,
      getGhostScore: methods.getGhostScore,
      verifyGhost: methods.verifyGhost,
      checkExternalIdExists: methods.checkExternalIdExists,
      getExternalIds: methods.getExternalIds,
    },

    actions: [
      getGhostIdentityAction,
      resolveExternalIdAction,
      getGhostScoreAction,
      verifyGhostAction,
    ],

    initialize: function() {
      // Bind methods with configuration
      const boundMethods = { ...this.methods };

      // Log initialization if verbose
      if (config?.verbose) {
        console.log('[GhostSpeak Plugin] Initialized with config:', {
          cluster: config.cluster || 'devnet',
          apiUrl: config.apiUrl || 'auto'
        });
      }

      // Bind each method
      Object.entries(boundMethods).forEach(([methodName, method]) => {
        if (typeof method === 'function') {
          this.methods[methodName] = method;
        }
      });

      if (config?.verbose) {
        console.log(`[GhostSpeak Plugin] Registered ${this.actions.length} actions and ${Object.keys(this.methods).length} methods`);
      }
    }
  };
}

/**
 * Default GhostSpeak plugin (devnet configuration)
 */
export const GhostPlugin = createGhostPlugin({ cluster: 'devnet' });
