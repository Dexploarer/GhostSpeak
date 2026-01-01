/**
 * Protocol Actions for ElizaOS Plugin
 * Staking, Privacy, Escrow (Ghost Protect), and Governance actions for GhostSpeak
 */

import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';

/**
 * Helper function to create GhostSpeak client
 */
function createGhostSpeakClient(): GhostSpeakClient {
  return new GhostSpeakClient({
    cluster: (process.env.SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL,
  });
}

// ======================
// STAKING ACTIONS (GHOST Token Staking)
// ======================

/**
 * Stake GHOST Tokens Action
 * Stake GHOST tokens to increase reputation weight
 */
export const stakeGhostAction: Action = {
  name: 'STAKE_GHOST',
  similes: ['STAKE_TOKENS', 'LOCK_GHOST', 'DEPOSIT_GHOST'],
  description:
    'Stake GHOST tokens to increase reputation weight and earn staking rewards. Staked tokens are locked for a minimum period.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('stake') || text.includes('lock ghost') || text.includes('deposit ghost');
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
      const text = message.content.text || '';
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ghost|tokens?)/i);
      const amount = amountMatch ? amountMatch[1] : '0';

      const instructions = `To stake GHOST tokens:

**Using GhostSpeak CLI:**
\`\`\`bash
ghost staking stake --amount ${amount || '100'}
\`\`\`

**Using GhostSpeak SDK:**
\`\`\`typescript
const client = new GhostSpeakClient({ cluster: 'devnet' });
await client.staking.stakeGhost(signer, {
  amount: ${amount || '100'} * 10**9, // Convert to lamports
});
\`\`\`

**Benefits of Staking:**
- 📈 Increase reputation weight (1.5x multiplier)
- 💰 Earn staking rewards (variable APY)
- 🏆 Unlock higher tiers faster
- 🔒 Minimum lock period: 7 days

**Current Status:**
- Staked Amount: Check with \`ghost staking status\`
- Available Rewards: Auto-compound daily
- Unstaking: 7-day cooldown period`;

      if (callback) {
        await callback({
          text: instructions,
          actions: ['STAKE_GHOST'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: instructions,
        data: { requestedAmount: amount },
      };
    } catch (error) {
      logger.error({ error }, 'Error staking GHOST:');
      const errorMsg = `Failed to stake GHOST: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['STAKE_GHOST'],
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
          text: 'Stake 100 GHOST tokens',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Staking GHOST tokens boosts your reputation weight by 1.5x!',
          actions: ['STAKE_GHOST'],
        },
      },
    ],
  ],
};

/**
 * Check Staking Status Action
 */
export const checkStakingAction: Action = {
  name: 'CHECK_STAKING',
  similes: ['STAKING_STATUS', 'MY_STAKES', 'STAKING_INFO'],
  description: 'Check your GHOST token staking status, rewards, and unlock schedule.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('staking status') ||
      text.includes('check stake') ||
      text.includes('my stakes') ||
      text.includes('staking info')
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
      const response = `Use these commands to check staking status:

**CLI:**
\`\`\`bash
ghost staking status
\`\`\`

**SDK:**
\`\`\`typescript
const status = await client.staking.getStakingStatus(agentAddress);
console.log('Staked:', status.stakedAmount);
console.log('Rewards:', status.pendingRewards);
console.log('Unlock Time:', status.unlockTimestamp);
\`\`\``;

      if (callback) {
        await callback({
          text: response,
          actions: ['CHECK_STAKING'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
      };
    } catch (error) {
      logger.error({ error }, 'Error checking staking:');
      return {
        success: false,
        text: `Failed to check staking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// ======================
// PRIVACY ACTIONS
// ======================

/**
 * Set Privacy Mode Action
 */
export const setPrivacyModeAction: Action = {
  name: 'SET_PRIVACY_MODE',
  similes: ['PRIVACY_MODE', 'HIDE_REPUTATION', 'PRIVACY_SETTINGS'],
  description: 'Set privacy mode for reputation visibility: PUBLIC, SELECTIVE, or PRIVATE.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('privacy') || text.includes('hide reputation') || text.includes('private mode');
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
      const text = message.content.text?.toLowerCase() || '';
      let mode = 'SELECTIVE';
      if (text.includes('public')) mode = 'PUBLIC';
      else if (text.includes('private')) mode = 'PRIVATE';

      const response = `Privacy mode settings:

**Modes:**
- 🌐 PUBLIC: All reputation data visible
- 🎯 SELECTIVE: Show tier/range only (default)
- 🔒 PRIVATE: Hide all reputation data

**Current Mode Detected:** ${mode}

**To set privacy:**
\`\`\`bash
ghost privacy set-mode --mode ${mode.toLowerCase()}
\`\`\`

**SDK:**
\`\`\`typescript
await client.privacy.setPrivacyMode(signer, {
  mode: '${mode}'
});
\`\`\`

**Note:** Privacy settings only affect public viewing. Counterparties in transactions can always verify your reputation.`;

      if (callback) {
        await callback({
          text: response,
          actions: ['SET_PRIVACY_MODE'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
        data: { mode },
      };
    } catch (error) {
      logger.error({ error }, 'Error setting privacy:');
      return {
        success: false,
        text: `Failed to set privacy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Set my reputation to private mode',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I can help you configure privacy settings. Private mode hides all reputation data from public view.',
          actions: ['SET_PRIVACY_MODE'],
        },
      },
    ],
  ],
};

// ======================
// ESCROW ACTIONS (Ghost Protect)
// ======================

/**
 * Create Escrow Action
 */
export const createEscrowAction: Action = {
  name: 'CREATE_ESCROW',
  similes: ['NEW_ESCROW', 'GHOST_PROTECT', 'CREATE_GHOST_PROTECT'],
  description: 'Create a Ghost Protect escrow for secure B2C transactions with buyer protection.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('create escrow') ||
      text.includes('new escrow') ||
      text.includes('ghost protect') ||
      text.includes('buyer protection')
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
      const text = message.content.text || '';
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sol|usdc)/i);
      const amount = amountMatch ? amountMatch[1] : '0';

      const response = `Create Ghost Protect Escrow:

**What is Ghost Protect?**
B2C escrow system with:
- ✅ Buyer protection (refund if service not delivered)
- ⏱️ 7-day delivery window
- ⚖️ Dispute resolution
- 🔒 Funds locked until delivery approved

**CLI:**
\`\`\`bash
ghost escrow create \\
  --buyer <buyer-address> \\
  --amount ${amount || '1.0'} \\
  --token SOL \\
  --description "Service delivery"
\`\`\`

**SDK:**
\`\`\`typescript
const escrow = await client.escrow.createEscrow(signer, {
  buyer: buyerAddress,
  amount: ${amount || '1.0'} * 10**9,
  deliveryDeadline: 7 * 24 * 60 * 60, // 7 days
});
\`\`\`

**Process:**
1. Agent creates escrow
2. Buyer funds escrow
3. Agent delivers service
4. Agent submits proof of delivery
5. Buyer approves → funds released
6. Or dispute filed → arbitration`;

      if (callback) {
        await callback({
          text: response,
          actions: ['CREATE_ESCROW'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
        data: { amount },
      };
    } catch (error) {
      logger.error({ error }, 'Error creating escrow:');
      return {
        success: false,
        text: `Failed to create escrow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

// ======================
// GOVERNANCE ACTIONS
// ======================

/**
 * Create Proposal Action
 */
export const createProposalAction: Action = {
  name: 'CREATE_PROPOSAL',
  similes: ['NEW_PROPOSAL', 'GOVERNANCE_PROPOSAL', 'PROPOSE'],
  description: 'Create a governance proposal for GhostSpeak protocol changes.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('create proposal') ||
      text.includes('new proposal') ||
      text.includes('governance') ||
      text.includes('propose')
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
      const response = `Create Governance Proposal:

**Proposal Types:**
- 📋 Protocol Update
- 💰 Treasury Allocation
- ⚙️ Parameter Change
- 🏛️ Governance Rule Change

**Requirements:**
- Minimum 1000 GHOST tokens staked
- Proposal bond: 100 GHOST
- Voting period: 7 days
- Quorum: 10% of staked tokens

**CLI:**
\`\`\`bash
ghost governance propose \\
  --type "protocol_update" \\
  --title "Add new feature X" \\
  --description "Detailed proposal..." \\
  --voting-period 7
\`\`\`

**SDK:**
\`\`\`typescript
const proposal = await client.governance.createProposal(signer, {
  type: 'ProtocolUpdate',
  title: 'Add feature X',
  description: 'Full proposal text...',
  votingPeriodDays: 7,
});
\`\`\``;

      if (callback) {
        await callback({
          text: response,
          actions: ['CREATE_PROPOSAL'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
      };
    } catch (error) {
      logger.error({ error }, 'Error creating proposal:');
      return {
        success: false,
        text: `Failed to create proposal: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};

/**
 * Vote on Proposal Action
 */
export const voteProposalAction: Action = {
  name: 'VOTE_PROPOSAL',
  similes: ['VOTE', 'CAST_VOTE', 'GOVERNANCE_VOTE'],
  description: 'Vote on a governance proposal (Yes/No/Abstain).',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('vote') && (text.includes('proposal') || text.includes('governance'));
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
      const text = message.content.text?.toLowerCase() || '';
      let vote = 'abstain';
      if (text.includes('yes') || text.includes('approve')) vote = 'yes';
      else if (text.includes('no') || text.includes('reject')) vote = 'no';

      const response = `Vote on Governance Proposal:

**Vote Options:**
- ✅ Yes (approve)
- ❌ No (reject)
- ⚪ Abstain (neutral)

**Detected Vote:** ${vote.toUpperCase()}

**CLI:**
\`\`\`bash
ghost governance vote \\
  --proposal <proposal-id> \\
  --vote ${vote}
\`\`\`

**SDK:**
\`\`\`typescript
await client.governance.vote(signer, {
  proposalId: proposalAddress,
  vote: '${vote}',
});
\`\`\`

**Voting Power:**
Based on staked GHOST tokens + reputation weight`;

      if (callback) {
        await callback({
          text: response,
          actions: ['VOTE_PROPOSAL'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
        data: { vote },
      };
    } catch (error) {
      logger.error({ error }, 'Error voting:');
      return {
        success: false,
        text: `Failed to vote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [],
};
