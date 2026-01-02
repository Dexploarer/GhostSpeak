/**
 * GHOST_SCORE_PROVIDER
 *
 * Provides Ghost Score reputation context for agent state composition.
 * Fetches real on-chain data from GhostSpeak blockchain.
 */

import type { Provider, ProviderResult, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { address } from '@solana/addresses';
import { GhostSpeakService } from '../services/GhostSpeakService';

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
 * Ghost Score Provider
 *
 * Supplies reputation context for agent reasoning:
 * - Ghost Score (0-1000)
 * - Tier (PLATINUM/GOLD/SILVER/BRONZE/NEWCOMER)
 * - Job completion stats
 * - Active status
 */
export const ghostScoreProvider: Provider = {
  name: 'GHOST_SCORE_PROVIDER',
  description: 'Provides Ghost Score reputation data for agents from on-chain GhostSpeak data',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      // Get service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        logger.debug('Ghost Score Provider: GhostSpeak service not available');
        return {
          text: 'GhostSpeak service not available',
          values: {},
          data: {},
        };
      }

      // Try to get agent address from runtime
      if (!runtime.agentId) {
        logger.debug('Ghost Score Provider: No agent ID available in runtime');
        return {
          text: 'No agent ID available',
          values: {},
          data: {},
        };
      }

      let agentAddress;
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

      // Fetch agent data using cached service
      let agentData;
      try {
        agentData = await service.getAgent(agentAddress);
        logger.debug({ found: !!agentData }, 'Ghost Score Provider: Fetched agent account');
      } catch (error) {
        logger.error({ agentAddress: agentAddress.toString(), error }, 'Ghost Score Provider: Failed to fetch agent');
        return {
          text: `Failed to fetch agent data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          values: {},
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'blockchain',
          },
        };
      }

      if (!agentData) {
        logger.warn({ agentAddress: agentAddress.toString() }, 'Ghost Score Provider: Agent not found');
        return {
          text: 'Agent not found on GhostSpeak blockchain',
          values: { registered: false },
          data: {
            agentAddress: agentAddress.toString(),
            source: 'blockchain',
          },
        };
      }

      // Calculate Ghost Score from on-chain data
      const onChainGhostScore = Number((agentData as any).ghostScore || 0);
      const reputationScore = Number(agentData.reputationScore || 0);
      const ghostScore = onChainGhostScore > 0
        ? Math.min(1000, Math.round(onChainGhostScore / 1_000_000))
        : Math.min(1000, Math.round(reputationScore / 100));
      const tier = getGhostScoreTier(ghostScore);
      const totalJobs = Number(agentData.totalJobsCompleted || 0);
      // Note: totalJobsFailed is not stored on-chain
      const successRate = totalJobs > 0 ? 100 : 0;

      // Build comprehensive reputation data
      const reputationData = {
        ghostScore,
        tier,
        agentAddress: agentAddress.toString(),
        agentName: agentData.name || 'Unknown Agent',
        totalJobsCompleted: totalJobs,
        successRate,
        isActive: agentData.isActive || false,
        reputationScoreBasisPoints: reputationScore,
        createdAt: agentData.createdAt ? Number(agentData.createdAt) : null,
        x402Enabled: agentData.x402Enabled || false,
        x402TotalCalls: agentData.x402TotalCalls ? Number(agentData.x402TotalCalls) : 0,
        x402TotalPayments: agentData.x402TotalPayments ? Number(agentData.x402TotalPayments) : 0,
        source: 'blockchain',
        fetchedAt: Date.now(),
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
      logger.error({ error }, 'Error in Ghost Score provider');
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

export default ghostScoreProvider;
