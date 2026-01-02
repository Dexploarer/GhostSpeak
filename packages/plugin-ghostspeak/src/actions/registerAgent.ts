/**
 * Register Agent Action for Caisper Plugin
 *
 * Allows ElizaOS agents to register themselves or other agents on GhostSpeak
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
import { GhostSpeakService } from '../services/GhostSpeakService';
import { getAgentSigner, ensureFundedWallet } from '../wallet';

/**
 * Parse agent registration request from message
 */
interface RegistrationRequest {
  name: string;
  description: string;
  capabilities: string[];
  model?: string;
  agentType?: number;
  useCompressedNFT?: boolean;
}

/**
 * Parse registration details from user message
 */
function parseRegistrationRequest(message: Memory): RegistrationRequest | null {
  const text = message.content.text || '';

  // Extract name (required)
  const nameMatch = text.match(/name[:\s]+([^,\n]+)/i);
  if (!nameMatch) {
    return null;
  }
  const name = nameMatch[1].trim();

  // Extract description (required)
  const descMatch = text.match(/description[:\s]+([^,\n]+)/i);
  if (!descMatch) {
    return null;
  }
  const description = descMatch[1].trim();

  // Extract capabilities (required)
  const capMatch = text.match(/capabilities?[:\s]+\[([^\]]+)\]/i);
  if (!capMatch) {
    return null;
  }
  const capabilities = capMatch[1].split(',').map(c => c.trim());

  // Extract optional model
  const modelMatch = text.match(/model[:\s]+([^,\n]+)/i);
  const model = modelMatch ? modelMatch[1].trim() : undefined;

  // Extract optional agent type
  const typeMatch = text.match(/type[:\s]+(\d+)/i);
  const agentType = typeMatch ? parseInt(typeMatch[1]) : 0;

  // Check if compressed NFT requested
  const useCompressedNFT = text.toLowerCase().includes('compressed') ||
    text.toLowerCase().includes('cnft');

  return {
    name,
    description,
    capabilities,
    model,
    agentType,
    useCompressedNFT,
  };
}

/**
 * Register Agent Action
 *
 * Registers an agent on GhostSpeak blockchain with on-chain identity
 */
export const registerAgentAction: Action = {
  name: 'REGISTER_AGENT',
  similes: [
    'CREATE_AGENT',
    'REGISTER_ON_GHOSTSPEAK',
    'ONBOARD_AGENT',
    'SETUP_AGENT',
  ],
  description: `Register an AI agent on GhostSpeak blockchain. Creates on-chain identity with:
- Unique agent address
- Name and description
- Capabilities list
- Optional compressed NFT (5000x cheaper)

Registered agents can:
- Accumulate Ghost Score (reputation)
- Earn verifiable credentials
- Participate in x402 payment protocol
- Track job history on-chain`,

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('register') || text.includes('create') || text.includes('onboard')) &&
      text.includes('agent')
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
      // Parse registration request
      const request = parseRegistrationRequest(message);

      if (!request) {
        const errorMsg = `I need agent details to register. Format:
"Register agent name: My Agent, description: What it does, capabilities: [cap1, cap2]"
Optional: "model: gpt-4, type: 0, compressed"`;

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['REGISTER_AGENT'],
            source: message.content.source,
          });
        }

        return {
          success: false,
          text: errorMsg,
          error: new Error('Registration details required'),
        };
      }

      logger.info({
        agentId: runtime.agentId,
        agentName: request.name,
        useCompressedNFT: request.useCompressedNFT,
      }, 'Registering agent on GhostSpeak');

      // Get agent signer
      const signer = await getAgentSigner(runtime);

      logger.info({
        signerAddress: signer.address,
      }, 'Using signer for registration');

      // Ensure wallet is funded
      const hasFunds = await ensureFundedWallet(runtime);
      if (!hasFunds) {
        throw new Error('Insufficient SOL balance. Please fund your wallet or wait for airdrop.');
      }

      // Get the GhostSpeak service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        throw new Error('GhostSpeak service not available');
      }

      // Register agent
      let result: any;

      // Build metadata for capabilities
      const metadata = {
        capabilities: request.capabilities,
        model: request.model,
        framework: 'elizaos',
        registeredAt: Date.now(),
      };
      const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;

      // Generate unique agent ID
      const agentId = `${request.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      if (request.useCompressedNFT) {
        // Use compressed NFT (requires merkle tree)
        // For now, fall back to regular registration
        // TODO: Implement compressed NFT registration with merkle tree
        logger.warn('Compressed NFT registration not yet implemented, using standard registration');

        result = await service.agents.register(signer, {
          name: request.name,
          description: request.description,
          metadataUri,
          agentId,
          agentType: request.agentType || 0,
        });
      } else {
        // Standard registration
        result = await service.agents.register(signer, {
          name: request.name,
          description: request.description,
          metadataUri,
          agentId,
          agentType: request.agentType || 0,
        });
      }

      logger.info({
        agentAddress: result.address,
        signature: result.signature,
      }, 'Agent registered successfully');

      // Log the agent address for reference
      logger.debug({
        agentAddress: result.address.toString(),
      }, 'Agent registered - address can be used for future operations');

      // Build success response
      const responseText = `✅ Agent registered successfully on GhostSpeak!

**Agent Address**: ${result.address.toString()}
**Name**: ${request.name}
**Description**: ${request.description}
**Capabilities**: ${request.capabilities.join(', ')}
${request.model ? `**Model**: ${request.model}` : ''}
**Network**: ${process.env.SOLANA_CLUSTER || 'devnet'}
**Transaction**: ${result.signature}

Your agent now has an on-chain identity! It can:
- ✅ Accumulate Ghost Score (reputation)
- ✅ Earn verifiable credentials
- ✅ Accept x402 payments
- ✅ Track job history on-chain

Next steps:
1. Issue an identity credential: "Issue credential for ${result.address.toString().slice(0, 8)}..."
2. Start completing jobs to build reputation
3. Check your Ghost Score: "Check ghost score for ${result.address.toString().slice(0, 8)}..."`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['REGISTER_AGENT'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: responseText,
        data: {
          agentAddress: result.address.toString(),
          signature: result.signature,
          name: request.name,
          capabilities: request.capabilities,
          network: process.env.SOLANA_CLUSTER || 'devnet',
        },
      };

    } catch (error) {
      logger.error({ error }, 'Error registering agent:');

      const errorMsg = `Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}

Common issues:
- Insufficient SOL balance (need ~0.01 SOL for transaction)
- Invalid agent details
- Network connection issues
- Agent already registered with this wallet

Try:
1. Check your SOL balance
2. Verify agent details are correct
3. Try again in a moment`;

      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['REGISTER_AGENT'],
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
          text: 'Register agent name: Code Reviewer, description: AI agent for code analysis and security audits, capabilities: [code-review, security-audit, bug-detection], model: gpt-4',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Agent registered successfully on GhostSpeak!\n\n**Agent Address**: 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk\n**Name**: Code Reviewer\n**Description**: AI agent for code analysis and security audits\n**Capabilities**: code-review, security-audit, bug-detection\n**Model**: gpt-4\n**Network**: devnet\n**Transaction**: 5jHD...\n\nYour agent now has an on-chain identity!',
          actions: ['REGISTER_AGENT'],
        },
      },
    ],
  ],
};

export default registerAgentAction;
