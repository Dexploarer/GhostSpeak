/**
 * DID (Decentralized Identifier) Actions for ElizaOS Plugin
 * W3C DID document management on GhostSpeak blockchain
 */

import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';
import { GhostSpeakService } from '../services/GhostSpeakService';

/**
 * Create DID Document Action
 * Creates a new W3C-compliant DID document on-chain
 */
export const createDidAction: Action = {
  name: 'CREATE_DID',
  similes: ['CREATE_DID_DOCUMENT', 'REGISTER_DID', 'NEW_DID'],
  description:
    'Create a W3C-compliant Decentralized Identifier (DID) document on GhostSpeak blockchain. DIDs provide verifiable, decentralized digital identity for AI agents.',

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('create did') ||
      text.includes('register did') ||
      text.includes('new did document') ||
      text.includes('create identifier')
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
      // Get agent address from runtime
      if (!runtime.agentId) {
        const errorMsg = 'Agent ID not available in runtime';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CREATE_DID'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('Agent ID required'),
        };
      }

      let agentAddress: Address;
      try {
        agentAddress = address(runtime.agentId);
      } catch {
        const errorMsg = 'Agent ID is not a valid Solana address';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CREATE_DID'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('Invalid agent address'),
        };
      }

      // Parse optional DID parameters from message
      const text = message.content.text || '';
      const nameMatch = text.match(/name[:\s]+([^\s,]+)/i);
      const didName = nameMatch ? nameMatch[1] : runtime.character?.name || 'Agent';

      // Note: In production, this would require wallet signing
      // For now, we provide instructions on how to create DID
      const instructions = `To create a DID document for agent "${didName}" (${agentAddress}):

1. **Using GhostSpeak CLI:**
   \`\`\`bash
   ghost did create --controller ${agentAddress}
   \`\`\`

2. **Using GhostSpeak SDK:**
   \`\`\`typescript
   import { GhostSpeakClient } from '@ghostspeak/sdk';

   const client = new GhostSpeakClient({ cluster: 'devnet' });
   const did = await client.did.createDidDocument(signer, {
     controller: '${agentAddress}',
     verificationMethods: [{
       type: 'Ed25519VerificationKey2020',
       publicKey: signerPublicKey
     }]
   });

   console.log('DID Created:', did.didString);
   // Example: did:sol:devnet:${agentAddress.slice(0, 8)}...
   \`\`\`

3. **What you get:**
   - W3C-compliant DID string (did:sol:devnet:...)
   - On-chain DID document with verification methods
   - Service endpoints for agent discovery
   - Ability to update/deactivate DID later

4. **Why create a DID:**
   - Verifiable identity across platforms
   - Cryptographic proof of ownership
   - Interoperable with W3C standards
   - Required for verifiable credentials`;

      if (callback) {
        await callback({
          text: instructions,
          actions: ['CREATE_DID'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: instructions,
        data: {
          agentAddress: agentAddress.toString(),
          agentName: didName,
          cluster: process.env.SOLANA_CLUSTER || 'devnet',
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error creating DID:');
      const errorMsg = `Failed to create DID: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['CREATE_DID'],
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
          text: 'Create a DID document for my agent',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I can help you create a W3C-compliant DID document. This will give you a verifiable decentralized identifier on the Solana blockchain.',
          actions: ['CREATE_DID'],
        },
      },
    ],
  ],
};

/**
 * Resolve DID Document Action
 * Fetches and displays a DID document from blockchain
 */
export const resolveDidAction: Action = {
  name: 'RESOLVE_DID',
  similes: ['GET_DID', 'LOOKUP_DID', 'FETCH_DID_DOCUMENT'],
  description:
    'Resolve and fetch a W3C DID document from the GhostSpeak blockchain. Returns verification methods, service endpoints, and DID metadata.',

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('resolve did') ||
      text.includes('get did') ||
      text.includes('lookup did') ||
      text.includes('fetch did') ||
      text.includes('did:sol:')
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

      // Extract DID string or address from message
      const didMatch = text.match(/did:sol:(devnet|mainnet|testnet):([A-Za-z0-9]{32,44})/);
      const addressMatch = text.match(/([A-Za-z0-9]{32,44})/);

      let targetAddress: Address | undefined;

      if (didMatch) {
        // Extract address from DID string
        targetAddress = address(didMatch[2]);
      } else if (addressMatch) {
        // Use address directly
        try {
          targetAddress = address(addressMatch[1]);
        } catch {
          // Invalid address
        }
      } else if (runtime.agentId) {
        // Use runtime agent ID
        try {
          targetAddress = address(runtime.agentId);
        } catch {
          // Invalid agent ID
        }
      }

      if (!targetAddress) {
        const errorMsg = 'Please provide a DID string (did:sol:devnet:...) or agent address';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['RESOLVE_DID'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('DID or address required'),
        };
      }

      // Get the GhostSpeak service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        throw new Error('GhostSpeak service not available');
      }

      const didDocument = await service.did().resolve(targetAddress);

      if (!didDocument) {
        const errorMsg = `No DID document found for ${targetAddress}`;
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['RESOLVE_DID'],
            source: message.content.source,
          });
        }
        return {
          success: false,
          text: errorMsg,
          error: new Error('DID not found'),
        };
      }

      const response = `DID Document for ${targetAddress}:

📋 **DID Information:**
- DID String: ${didDocument.did || `did:sol:${process.env.SOLANA_CLUSTER || 'devnet'}:${targetAddress}`}
- Controller: ${didDocument.controller?.toString() || targetAddress}
- Status: ${didDocument.deactivated ? '🔴 Deactivated' : '🟢 Active'}

🔑 **Verification Methods:** ${didDocument.verificationMethods?.length || 0}
${didDocument.verificationMethods?.map((vm: any, i: number) => `  ${i + 1}. ${vm.methodType} (ID: ${vm.id})`).join('\n') || 'None'}

🔌 **Service Endpoints:** ${didDocument.serviceEndpoints?.length || 0}
${didDocument.serviceEndpoints?.map((s: any, i: number) => `  ${i + 1}. ${s.serviceType}: ${s.serviceEndpoint}`).join('\n') || 'None'}

📅 **Timestamps:**
- Created: ${didDocument.createdAt ? new Date(Number(didDocument.createdAt) * 1000).toISOString() : 'Unknown'}
- Updated: ${didDocument.updatedAt ? new Date(Number(didDocument.updatedAt) * 1000).toISOString() : 'Never'}`;

      if (callback) {
        await callback({
          text: response,
          actions: ['RESOLVE_DID'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: response,
        data: {
          didString: didDocument.did,
          controller: didDocument.controller?.toString(),
          isActive: !didDocument.deactivated,
          verificationMethodCount: didDocument.verificationMethods?.length || 0,
          serviceEndpointCount: didDocument.serviceEndpoints?.length || 0,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error resolving DID:');
      const errorMsg = `Failed to resolve DID: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['RESOLVE_DID'],
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
          text: 'Resolve DID for 7xKXt...9Gk',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'DID Document for 7xKXt...9Gk:\n📋 DID String: did:sol:devnet:7xKXt...9Gk\n🟢 Active\n🔑 2 Verification Methods\n🔌 1 Service Endpoint',
          actions: ['RESOLVE_DID'],
        },
      },
    ],
  ],
};

/**
 * Update DID Document Action
 * Updates verification methods or service endpoints
 */
export const updateDidAction: Action = {
  name: 'UPDATE_DID',
  similes: ['MODIFY_DID', 'UPDATE_DID_DOCUMENT', 'CHANGE_DID'],
  description:
    'Update a DID document by adding/removing verification methods or service endpoints. Requires controller authority.',

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('update did') ||
      text.includes('modify did') ||
      text.includes('change did') ||
      text.includes('add verification') ||
      text.includes('add service endpoint')
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
      const instructions = `To update a DID document:

**Using GhostSpeak CLI:**
\`\`\`bash
# Add verification method
ghost did update --add-verification-method <type> <public-key>

# Add service endpoint
ghost did update --add-service <type> <endpoint-url>

# Remove verification method
ghost did update --remove-verification-method <method-id>
\`\`\`

**Using GhostSpeak SDK:**
\`\`\`typescript
await client.did.updateDidDocument(signer, {
  did: 'did:sol:devnet:...',
  addVerificationMethods: [{
    type: 'Ed25519VerificationKey2020',
    publicKey: newPublicKey
  }],
  addServices: [{
    type: 'AgentService',
    endpoint: 'https://myagent.com/api'
  }]
});
\`\`\`

**What you can update:**
- ✅ Add/remove verification methods (keys)
- ✅ Add/remove service endpoints
- ✅ Update controller (transfer ownership)
- ❌ Cannot change DID string itself

**Requirements:**
- Must be the controller of the DID
- Need wallet signature to authorize changes
- Changes are recorded on-chain`;

      if (callback) {
        await callback({
          text: instructions,
          actions: ['UPDATE_DID'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: instructions,
      };
    } catch (error) {
      logger.error({ error }, 'Error updating DID:');
      const errorMsg = `Failed to update DID: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['UPDATE_DID'],
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
          text: 'Update my DID document to add a new service endpoint',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I can help you update your DID document. You can add verification methods or service endpoints.',
          actions: ['UPDATE_DID'],
        },
      },
    ],
  ],
};
