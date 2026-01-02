/**
 * Verify Ghost Identity Action
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import type { Action } from 'solana-agent-kit';
import { z } from 'zod';
import { verifyGhost } from '../methods/ghost-identity.js';
import type { ActionResult } from '../types/index.js';

export const verifyGhostAction: Action = {
  name: 'VERIFY_GHOST',
  similes: [
    'verify ghost',
    'verify agent identity',
    'check agent verification',
    'verify ai agent',
    'validate ghost identity',
    'check ghost credentials'
  ],
  description: `Verify a Ghost identity and get comprehensive verification status.

  This action performs a full verification check on an agent's Ghost identity, including:
  - Verification status (verified/unverified)
  - Ghost Score and reputation level
  - Verification tier (unverified, basic, verified, elite)
  - Issued credentials and trust indicators

  Verification levels:
  - unverified: No verification or score < 300
  - basic: Score 300-499, basic verification
  - verified: Score 500-799, full verification
  - elite: Score 800+, elite status with multiple credentials

  Use this before making high-value transactions or establishing long-term collaborations with an agent.`,
  examples: [
    [
      {
        input: {
          ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        },
        output: {
          status: 'success',
          data: {
            isVerified: true,
            ghostScore: 850,
            reputationScore: 4500,
            verificationLevel: 'elite',
            credentials: [
              'credential:kyc_verified',
              'credential:service_provider',
              'credential:payai_integration'
            ],
            recommendation: 'Highly trusted agent with elite verification'
          }
        },
        explanation: 'Verified elite-level Ghost with high trust score and multiple credentials'
      }
    ],
    [
      {
        input: {
          ghostAddress: 'BrG44HdsEhzapvs8bEqzvkq4egwevS3fRE6ze2ENo6S8'
        },
        output: {
          status: 'success',
          data: {
            isVerified: false,
            ghostScore: 250,
            reputationScore: 500,
            verificationLevel: 'unverified',
            credentials: [],
            recommendation: 'Proceed with caution - unverified agent'
          }
        },
        explanation: 'Unverified Ghost with low score - exercise caution'
      }
    ]
  ],
  schema: z.object({
    ghostAddress: z.string().describe('The Solana address of the Ghost/agent to verify'),
    cluster: z.enum(['mainnet-beta', 'devnet', 'testnet', 'localnet']).optional().describe('Solana cluster (defaults to devnet)')
  }),
  handler: async (agent: SolanaAgentKit, input: Record<string, any>): Promise<ActionResult> => {
    try {
      const verification = await verifyGhost(
        agent,
        input.ghostAddress as string,
        { cluster: input.cluster || 'devnet' }
      );

      // Generate recommendation based on verification level
      let recommendation = '';
      switch (verification.verificationLevel) {
        case 'elite':
          recommendation = 'Highly trusted agent with elite verification';
          break;
        case 'verified':
          recommendation = 'Verified agent with good reputation';
          break;
        case 'basic':
          recommendation = 'Basic verification - suitable for low-risk interactions';
          break;
        case 'unverified':
          recommendation = 'Proceed with caution - unverified agent';
          break;
      }

      return {
        status: 'success',
        message: `Verification: ${verification.verificationLevel} (Score: ${verification.ghostScore}/1000)`,
        data: {
          ...verification,
          recommendation
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Failed to verify Ghost'
      };
    }
  }
};
