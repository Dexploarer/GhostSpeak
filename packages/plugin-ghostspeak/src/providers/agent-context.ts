/**
 * AGENT_CONTEXT_PROVIDER
 *
 * Provides agent identity and metadata context for state composition.
 * Supplies information about the agent's capabilities, status, and configuration.
 */

import type { Provider, ProviderResult, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { address } from '@solana/addresses';
import { GhostSpeakService } from '../services/GhostSpeakService';

/**
 * Agent Context Provider
 *
 * Supplies agent metadata for agent reasoning:
 * - Registration status
 * - Agent name and type
 * - Active status
 * - x402 payment configuration
 * - Wallet availability
 */
export const agentContextProvider: Provider = {
  name: 'AGENT_CONTEXT_PROVIDER',
  description: 'Provides agent identity and capabilities context from GhostSpeak blockchain',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      // Get service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        return {
          text: 'GhostSpeak service not available',
          values: { registered: false, serviceAvailable: false },
          data: {},
        };
      }

      // Check if wallet is configured
      const hasSigner = service.hasSigner();
      const signerAddress = service.getSignerAddress();

      // Try to get agent address from runtime
      if (!runtime.agentId) {
        return {
          text: 'No agent context available',
          values: {
            registered: false,
            hasSigner,
            signerAddress: signerAddress?.toString() || null,
          },
          data: {},
        };
      }

      let agentAddress;
      try {
        agentAddress = address(runtime.agentId);
      } catch {
        return {
          text: 'Agent ID is not a valid Solana address',
          values: {
            registered: false,
            hasSigner,
            invalidAgentId: true,
          },
          data: {},
        };
      }

      // Fetch agent data
      let agentData;
      try {
        agentData = await service.getAgent(agentAddress);
      } catch (error) {
        logger.warn({ error, agentAddress: agentAddress.toString() }, 'Failed to fetch agent context');
        return {
          text: 'Unable to fetch agent data',
          values: {
            registered: false,
            hasSigner,
            agentAddress: agentAddress.toString(),
          },
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
        };
      }

      if (!agentData) {
        return {
          text: 'Agent not registered on GhostSpeak',
          values: {
            registered: false,
            hasSigner,
            agentAddress: agentAddress.toString(),
            canRegister: hasSigner,
          },
          data: {},
        };
      }

      // Build agent context
      const context = {
        registered: true,
        agentAddress: agentAddress.toString(),
        name: agentData.name,
        description: agentData.description,
        agentType: agentData.agentType,
        isActive: agentData.isActive,
        x402Enabled: agentData.x402Enabled,
        hasSigner,
        createdAt: agentData.createdAt ? Number(agentData.createdAt) : null,
        metadataUri: agentData.metadataUri,
      };

      const statusText = agentData.isActive ? 'Active' : 'Inactive';
      const x402Text = agentData.x402Enabled ? 'x402 Payments: Enabled' : '';

      return {
        text: `Agent: ${agentData.name} | Type: ${agentData.agentType} | ${statusText}${x402Text ? ' | ' + x402Text : ''}`,
        values: context,
        data: {
          description: agentData.description,
          metadataUri: agentData.metadataUri,
          fullAgentData: agentData,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error in Agent Context provider');
      return {
        text: 'Agent context unavailable',
        values: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },
};

export default agentContextProvider;
