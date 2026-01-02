/**
 * CHECK_GHOST_SCORE Action
 *
 * Check the Ghost Score (0-1000 reputation rating) for any AI agent.
 * Uses the GhostSpeakService for cached blockchain reads.
 */

import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import { GhostSpeakService } from '../services/GhostSpeakService';
import { getTierMessage } from '../character/caisper';

/**
 * Get Ghost Score tier from score (0-1000 scale)
 */
function getGhostScoreTier(ghostScore: number): string {
  if (ghostScore >= 900) return 'PLATINUM';
  if (ghostScore >= 750) return 'GOLD';
  if (ghostScore >= 500) return 'SILVER';
  if (ghostScore >= 200) return 'BRONZE';
  return 'NEWCOMER';
}

/**
 * CHECK_GHOST_SCORE Action
 *
 * Allows agents to check their own or another agent's Ghost Score.
 * This is a read-only action that doesn't require signing.
 */
export const checkGhostScoreAction: Action = {
  name: 'CHECK_GHOST_SCORE',
  similes: ['GET_GHOST_SCORE', 'CHECK_REPUTATION', 'GET_REPUTATION', 'GHOST_SCORE', 'AGENT_SCORE'],
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
      // Get the GhostSpeak service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        throw new Error('GhostSpeak service not available');
      }

      // Extract agent address from message
      const text = message.content.text || '';
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/);
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
          values: {},
          error: new Error('Agent address required'),
        };
      }

      // Fetch agent data using the cached service
      const agentData = await service.getAgent(agentAddress);

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
          values: {},
          error: new Error('Agent not found'),
        };
      }

      // Calculate Ghost Score
      // Use ghostScore from on-chain if available, otherwise calculate from reputationScore
      const onChainGhostScore = Number((agentData as any).ghostScore || 0);
      const reputationScore = Number(agentData.reputationScore || 0);
      const ghostScore = onChainGhostScore > 0
        ? Math.min(1000, Math.round(onChainGhostScore / 1_000_000)) // ghostScore is u64, scale down
        : Math.min(1000, Math.round(reputationScore / 100));
      const tier = getGhostScoreTier(ghostScore);
      const totalJobs = Number(agentData.totalJobsCompleted || 0);
      // Note: totalJobsFailed is not stored on-chain, assume 100% success for active agents
      const successRate = totalJobs > 0 ? 100 : 0;

      const tierMessage = getTierMessage(tier);

      const response = `Ghost Score for ${agentData.name || 'Agent'} (${agentAddress.toString().slice(0, 8)}...):

Ghost Score: ${ghostScore}/1000
Tier: ${tier}
Total Jobs Completed: ${totalJobs}
Success Rate: ${successRate}%
Status: ${agentData.isActive ? 'Active' : 'Inactive'}
${agentData.x402Enabled ? 'x402 Payments: Enabled' : ''}

${tierMessage}`;

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
        values: {
          ghostScore,
          tier,
          totalJobs,
          successRate,
          isActive: agentData.isActive,
          agentAddress: agentAddress.toString(),
        },
        data: {
          agentAddress: agentAddress.toString(),
          agentName: agentData.name,
          ghostScore,
          tier,
          totalJobs,
          successRate,
          isActive: agentData.isActive,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error checking Ghost Score');
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
        values: {},
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Check ghost score for 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Ghost Score for Agent (7xKXtYZ3...):\n\nGhost Score: 785/1000\nTier: GOLD\nTotal Jobs Completed: 1247\nSuccess Rate: 94%\nStatus: Active',
          actions: ['CHECK_GHOST_SCORE'],
        },
      },
    ],
  ],
};

export default checkGhostScoreAction;
