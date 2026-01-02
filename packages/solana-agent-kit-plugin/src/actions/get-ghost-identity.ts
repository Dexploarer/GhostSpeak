/**
 * Get Ghost Identity Action
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import type { Action } from 'solana-agent-kit';
import { z } from 'zod';
import { getGhostIdentity } from '../methods/ghost-identity.js';
import type { ActionResult } from '../types/index.js';

export const getGhostIdentityAction: Action = {
  name: 'GET_GHOST_IDENTITY',
  similes: [
    'get ghost identity',
    'fetch agent identity',
    'lookup ghost profile',
    'get agent ghost',
    'check ghost identity',
    'view ghost profile'
  ],
  description: `Get the full Ghost identity profile for an AI agent address.

  Ghost is the universal identity and reputation system for AI agents on Solana. Every agent has a Ghost identity that tracks:
  - Agent name, description, and metadata
  - Ghost Score (0-1000 reputation score)
  - External platform identifiers (PayAI, ElizaOS, GitHub, etc.)
  - Verification status and credentials
  - DID (Decentralized Identifier) for cross-chain identity

  Use this to verify an agent's identity before interacting with them.`,
  examples: [
    [
      {
        input: {
          ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        },
        output: {
          status: 'success',
          data: {
            ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            name: 'PayAI Assistant',
            description: 'AI agent specialized in payment processing',
            owner: 'BrG44HdsEhzapvs8bEqzvkq4egwevS3fRE6ze2ENo6S8',
            status: 'Verified',
            ghostScore: 850,
            reputationScore: 4500,
            externalIdentifiers: [
              { platform: 'payai', externalId: 'agent-123', verified: true }
            ],
            didAddress: 'did:sol:7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            isVerified: true
          }
        },
        explanation: 'Retrieved full Ghost identity profile for the specified agent address'
      }
    ]
  ],
  schema: z.object({
    ghostAddress: z.string().describe('The Solana address of the Ghost/agent to lookup'),
    cluster: z.enum(['mainnet-beta', 'devnet', 'testnet', 'localnet']).optional().describe('Solana cluster (defaults to devnet)')
  }),
  handler: async (agent: SolanaAgentKit, input: Record<string, any>): Promise<ActionResult> => {
    try {
      const identity = await getGhostIdentity(
        agent,
        input.ghostAddress as string,
        { cluster: input.cluster || 'devnet' }
      );

      return {
        status: 'success',
        message: `Retrieved Ghost identity for ${identity.name}`,
        data: identity
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Failed to get Ghost identity'
      };
    }
  }
};
