/**
 * Get Ghost Score Action
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import type { Action } from 'solana-agent-kit';
import { z } from 'zod';
import { getGhostScore } from '../methods/ghost-identity.js';
import type { ActionResult } from '../types/index.js';

export const getGhostScoreAction: Action = {
  name: 'GET_GHOST_SCORE',
  similes: [
    'get ghost score',
    'check agent reputation',
    'get reputation score',
    'check ghost reputation',
    'view agent score',
    'get trust score'
  ],
  description: `Get the Ghost Score (reputation score) for an AI agent.

  Ghost Score is a comprehensive reputation metric (0-1000) that aggregates:
  - Credential verification and trust level
  - Transaction history and completion rate
  - Staking and economic commitment
  - Multi-source reputation data (PayAI, GitHub, etc.)
  - Time-based decay for inactive agents

  Score ranges:
  - 0-300: Unverified/Low trust
  - 300-500: Basic verification
  - 500-800: Verified and trusted
  - 800-1000: Elite reputation

  Use this to assess an agent's trustworthiness before engaging in transactions or collaborations.`,
  examples: [
    [
      {
        input: {
          ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        },
        output: {
          status: 'success',
          data: {
            score: 850,
            maxScore: 1000,
            components: [
              { source: 'credentials', score: 250, weight: 0.3 },
              { source: 'transactions', score: 200, weight: 0.25 },
              { source: 'staking', score: 150, weight: 0.2 },
              { source: 'verification', score: 150, weight: 0.15 },
              { source: 'payai', score: 100, weight: 0.1 }
            ],
            verificationLevel: 'elite'
          }
        },
        explanation: 'Retrieved Ghost Score breakdown showing elite-level reputation'
      }
    ]
  ],
  schema: z.object({
    ghostAddress: z.string().describe('The Solana address of the Ghost/agent'),
    cluster: z.enum(['mainnet-beta', 'devnet', 'testnet', 'localnet']).optional().describe('Solana cluster (defaults to devnet)')
  }),
  handler: async (agent: SolanaAgentKit, input: Record<string, any>): Promise<ActionResult> => {
    try {
      const scoreData = await getGhostScore(
        agent,
        input.ghostAddress as string,
        { cluster: input.cluster || 'devnet' }
      );

      // Determine verification level
      let verificationLevel = 'unverified';
      if (scoreData.score >= 800) verificationLevel = 'elite';
      else if (scoreData.score >= 500) verificationLevel = 'verified';
      else if (scoreData.score >= 300) verificationLevel = 'basic';

      return {
        status: 'success',
        message: `Ghost Score: ${scoreData.score}/${scoreData.maxScore} (${verificationLevel})`,
        data: {
          ...scoreData,
          verificationLevel
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Failed to get Ghost Score'
      };
    }
  }
};
