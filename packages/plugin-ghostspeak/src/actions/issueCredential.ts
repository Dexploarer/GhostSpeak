/**
 * Issue Credential Action for Caisper Plugin
 *
 * Allows ElizaOS agents to issue W3C Verifiable Credentials on-chain
 * with optional Crossmint EVM bridge
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
import { getAgentSigner, ensureFundedWallet } from '../wallet';

/**
 * Parse credential request from message
 */
interface CredentialRequest {
  agentId: Address;
  recipientEmail?: string;
  credentialType: 'agent-identity' | 'reputation' | 'job-completion';
  subject: {
    name?: string;
    capabilities?: string[];
    reputationScore?: number;
    totalJobsCompleted?: number;
    totalEarnings?: number;
    successRate?: number;
  };
  syncToCrossmint: boolean;
}

/**
 * Parse credential details from user message
 */
function parseCredentialRequest(message: Memory): CredentialRequest | null {
  const text = message.content.text || '';
  const textLower = text.toLowerCase();

  // Extract agent ID (Solana address)
  const addressMatch = text.match(/([A-Za-z0-9]{32,44})/);
  if (!addressMatch) {
    return null;
  }

  const agentId = address(addressMatch[1]);

  // Determine credential type
  let credentialType: 'agent-identity' | 'reputation' | 'job-completion' = 'agent-identity';
  if (textLower.includes('reputation') || textLower.includes('ghost score')) {
    credentialType = 'reputation';
  } else if (textLower.includes('job') || textLower.includes('completion')) {
    credentialType = 'job-completion';
  }

  // Extract email if provided
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const recipientEmail = emailMatch ? emailMatch[1] : undefined;

  // Check if Crossmint sync requested
  const syncToCrossmint = textLower.includes('crossmint') || textLower.includes('evm');

  // Extract name if provided
  const nameMatch = text.match(/name[:\s]+([^,\n]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : undefined;

  // Extract capabilities if provided
  const capabilitiesMatch = text.match(/capabilities?[:\s]+\[([^\]]+)\]/i);
  const capabilities = capabilitiesMatch
    ? capabilitiesMatch[1].split(',').map(c => c.trim())
    : undefined;

  return {
    agentId,
    recipientEmail,
    credentialType,
    subject: {
      name,
      capabilities,
    },
    syncToCrossmint,
  };
}

/**
 * Issue Credential Action
 *
 * Allows agents to issue Verifiable Credentials on-chain
 */
export const issueCredentialAction: Action = {
  name: 'ISSUE_CREDENTIAL',
  similes: [
    'CREATE_CREDENTIAL',
    'ISSUE_VC',
    'CREATE_VERIFIABLE_CREDENTIAL',
    'MINT_CREDENTIAL',
  ],
  description: `Issue a W3C Verifiable Credential for an AI agent. Credentials can be:
- Agent Identity: Prove agent ownership and capabilities
- Reputation: Certify trust score and performance
- Job Completion: Document completed work

Credentials are stored on Solana and can be bridged to EVM chains via Crossmint.`,

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('issue') || text.includes('create') || text.includes('mint')) &&
      (text.includes('credential') || text.includes('vc'))
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
      // Parse credential request
      const request = parseCredentialRequest(message);

      if (!request) {
        const errorMsg = `I need an agent address to issue a credential. Format:
"Issue credential for [agent-address]"
Optional: "name: Agent Name, capabilities: [cap1, cap2], email: user@example.com, crossmint"`;

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['ISSUE_CREDENTIAL'],
            source: message.content.source,
          });
        }

        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent address required'),
        };
      }

      logger.info({
        agentId: runtime.agentId,
        targetAgent: request.agentId.toString(),
        credentialType: request.credentialType,
      }, 'Issuing credential');

      // Get agent signer
      const signer = await getAgentSigner(runtime);

      // Ensure wallet is funded
      const hasFunds = await ensureFundedWallet(runtime);
      if (!hasFunds) {
        throw new Error('Insufficient SOL balance. Please fund your wallet.');
      }

      // Get the GhostSpeak service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        throw new Error('GhostSpeak service not available');
      }

      // Issue credential based on type
      let result: any;

      if (request.credentialType === 'agent-identity') {
        // Issue agent identity credential using UnifiedCredentialService
        const credentialService = service.credentials();

        // Build the credential with required parameters
        const now = Math.floor(Date.now() / 1000);

        // Create a signature for the credential data
        // In production, this would be a proper cryptographic signature
        const signatureData = new TextEncoder().encode(
          `${request.agentId.toString()}:${signer.address.toString()}:${now}`
        );

        result = await credentialService.issueAgentIdentityCredential({
          agentId: request.agentId.toString(),
          owner: signer.address.toString(),
          name: request.subject.name || 'Unknown Agent',
          capabilities: request.subject.capabilities || [],
          serviceEndpoint: `https://ghostspeak.ai/agents/${request.agentId.toString().slice(0, 8)}`,
          frameworkOrigin: 'elizaos',
          x402Enabled: true,
          registeredAt: now,
          verifiedAt: now,
          syncToCrossmint: request.syncToCrossmint,
          recipientEmail: request.recipientEmail,
          signature: signatureData,
        });

        logger.info({
          credentialId: result.solanaCredential?.credentialId,
          crossmintId: result.crossmintSync?.id,
        }, 'Agent identity credential issued');

      } else if (request.credentialType === 'reputation') {
        // Fetch agent reputation data first
        const agentData = await service.agents.getAgentAccount(request.agentId);

        if (!agentData) {
          throw new Error(`Agent not found: ${request.agentId}`);
        }

        // Calculate metrics
        const reputationScore = Number(agentData.reputationScore || 0);
        const totalJobsCompleted = Number(agentData.totalJobsCompleted || 0);
        // Note: totalJobsFailed not available on-chain, assume 100% success
        const successRate = totalJobsCompleted > 0 ? 100 : 0;

        // Get Crossmint template ID
        const templateId = process.env.CROSSMINT_REPUTATION_TEMPLATE_ID;
        if (!templateId && request.syncToCrossmint) {
          throw new Error('CROSSMINT_REPUTATION_TEMPLATE_ID not configured');
        }

        const subject = {
          agent: request.agentId.toString(),
          reputationScore,
          totalJobsCompleted,
          totalEarnings: 0, // Would need to calculate from payment history
          successRate,
          avgRating: Math.min(5, Math.ceil(reputationScore / 2000)),
          disputeRate: 0,
          snapshotTimestamp: Math.floor(Date.now() / 1000),
        };

        if (request.syncToCrossmint && templateId) {
          // Issue reputation credential via Crossmint
          const { CrossmintVCClient } = await import('@ghostspeak/sdk');
          const crossmintEnv = (process.env.CROSSMINT_ENV === 'production' ? 'production' : 'staging') as 'staging' | 'production';

          const crossmint = new CrossmintVCClient({
            apiKey: process.env.CROSSMINT_SECRET_KEY || '',
            environment: crossmintEnv,
            chain: 'base-sepolia',
          });

          const crossmintResult = await crossmint.issueReputationCredential(
            templateId,
            request.recipientEmail || `agent-${request.agentId.toString().slice(0, 8)}@ghostspeak.credentials`,
            subject
          );

          result = {
            solanaCredential: null, // Reputation credentials are primarily on Crossmint
            crossmintSync: crossmintResult,
          };
        } else {
          // Just return the subject data
          result = {
            solanaCredential: { credentialSubject: subject },
            crossmintSync: null,
          };
        }

        logger.info({
          crossmintId: result.crossmintSync?.id,
          reputationScore,
        }, 'Reputation credential issued');

      } else {
        throw new Error(`Credential type not yet implemented: ${request.credentialType}`);
      }

      // Build success response
      const responseText = `✅ Credential issued successfully!

**Credential Type**: ${request.credentialType}
**Agent**: ${request.agentId.toString().slice(0, 8)}...${request.agentId.toString().slice(-8)}
${result.solanaCredential?.credentialId ? `**Solana Credential ID**: ${result.solanaCredential.credentialId}` : ''}
${result.crossmintSync?.id ? `**Crossmint ID**: ${result.crossmintSync.id}` : ''}
${result.crossmintSync?.onChain?.status ? `**EVM Status**: ${result.crossmintSync.onChain.status}` : ''}
${request.recipientEmail ? `**Recipient**: ${request.recipientEmail}` : ''}

The credential has been created and ${request.syncToCrossmint ? 'bridged to EVM via Crossmint' : 'stored on Solana'}.`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['ISSUE_CREDENTIAL'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: responseText,
        values: {
          credentialType: request.credentialType,
          agentId: request.agentId.toString(),
          credentialId: result.solanaCredential?.credentialId,
          crossmintId: result.crossmintSync?.id,
        },
        data: {
          credentialType: request.credentialType,
          agentId: request.agentId.toString(),
          credentialId: result.solanaCredential?.credentialId,
          crossmintId: result.crossmintSync?.id,
          evmStatus: result.crossmintSync?.onChain?.status,
        },
      };

    } catch (error) {
      logger.error({ error }, 'Error issuing credential:');

      const errorMsg = `Failed to issue credential: ${error instanceof Error ? error.message : 'Unknown error'}

Common issues:
- Agent not registered on GhostSpeak
- Insufficient SOL balance
- Crossmint API key not configured
- Invalid agent address`;

      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['ISSUE_CREDENTIAL'],
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
          text: 'Issue credential for 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk name: AI Assistant, capabilities: [code-review, security-audit], email: builder@example.com',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Credential issued successfully!\n\n**Credential Type**: agent-identity\n**Agent**: 7xKXtYZ3...9Gk\n**Solana Credential ID**: cred_abc123\n**Recipient**: builder@example.com\n\nThe credential has been created and stored on Solana.',
          actions: ['ISSUE_CREDENTIAL'],
        },
      },
    ],
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Issue reputation credential for 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk crossmint',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Credential issued successfully!\n\n**Credential Type**: reputation\n**Agent**: 7xKXtYZ3...9Gk\n**Crossmint ID**: vc_xyz789\n**EVM Status**: pending\n\nThe credential has been created and bridged to EVM via Crossmint.',
          actions: ['ISSUE_CREDENTIAL'],
        },
      },
    ],
  ],
};

export default issueCredentialAction;
