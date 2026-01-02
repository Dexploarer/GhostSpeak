/**
 * Resolve External ID Action
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import type { Action } from 'solana-agent-kit';
import { z } from 'zod';
import { resolveExternalId } from '../methods/ghost-identity.js';
import type { ActionResult } from '../types/index.js';

export const resolveExternalIdAction: Action = {
  name: 'RESOLVE_EXTERNAL_ID',
  similes: [
    'resolve external id',
    'find ghost by platform id',
    'lookup agent by external id',
    'get ghost from payai id',
    'resolve platform identifier',
    'find agent by platform'
  ],
  description: `Resolve a platform-specific external ID to a Ghost address.

  Agents can be identified across multiple platforms using external IDs. This action maps external identifiers to Solana Ghost addresses.

  Supported platforms:
  - payai: PayAI Network agent IDs
  - elizaos: ElizaOS framework agent IDs
  - github: GitHub-verified agent IDs
  - twitter: Twitter/X-verified agent IDs
  - Custom platforms defined by facilitators

  This is useful when you know an agent's ID on PayAI or ElizaOS but need their Ghost address for on-chain interactions.`,
  examples: [
    [
      {
        input: {
          platform: 'payai',
          externalId: 'agent-123'
        },
        output: {
          status: 'success',
          data: {
            ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            platform: 'payai',
            externalId: 'agent-123'
          }
        },
        explanation: 'Resolved PayAI agent ID to Ghost address'
      }
    ],
    [
      {
        input: {
          platform: 'elizaos',
          externalId: 'eliza-bot-456'
        },
        output: {
          status: 'success',
          data: {
            ghostAddress: 'BrG44HdsEhzapvs8bEqzvkq4egwevS3fRE6ze2ENo6S8',
            platform: 'elizaos',
            externalId: 'eliza-bot-456'
          }
        },
        explanation: 'Resolved ElizaOS agent ID to Ghost address'
      }
    ]
  ],
  schema: z.object({
    platform: z.string().describe('Platform name (e.g., payai, elizaos, github, twitter)'),
    externalId: z.string().describe('Platform-specific agent identifier'),
    cluster: z.enum(['mainnet-beta', 'devnet', 'testnet', 'localnet']).optional().describe('Solana cluster (defaults to devnet)')
  }),
  handler: async (agent: SolanaAgentKit, input: Record<string, any>): Promise<ActionResult> => {
    try {
      const ghostAddress = await resolveExternalId(
        agent,
        {
          platform: input.platform as string,
          externalId: input.externalId as string
        },
        { cluster: input.cluster || 'devnet' }
      );

      return {
        status: 'success',
        message: `Resolved ${input.platform}:${input.externalId} to Ghost address`,
        data: {
          ghostAddress: ghostAddress.toString(),
          platform: input.platform,
          externalId: input.externalId
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Failed to resolve external ID'
      };
    }
  }
};
