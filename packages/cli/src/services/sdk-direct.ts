/**
 * Direct SDK integration without UnifiedClient
 * Uses Web3.js v2 patterns directly
 */

import { createSolanaRpc, type Rpc, type SolanaRpcApi } from '@solana/rpc';
import { address, type Address } from '@solana/addresses';
import { type KeyPairSigner } from '@solana/signers';
import { logger } from '../utils/logger.js';

/**
 * Create a mock RPC subscriptions object for CLI usage
 * The CLI doesn't need real-time subscriptions
 */
export function createMockRpcSubscriptions(): any {
  return {
    channelCreated: () => ({ subscribe: () => Promise.resolve({ unsubscribe: () => {} }) }),
    channelUpdated: () => ({ subscribe: () => Promise.resolve({ unsubscribe: () => {} }) }),
    messageSent: () => ({ subscribe: () => Promise.resolve({ unsubscribe: () => {} }) }),
    // Add other subscription methods as needed
  };
}

// Import services directly to avoid dynamic import issues
import { AgentService } from '../../../sdk/src/services/agent.js';
import { ChannelService } from '../../../sdk/src/services/channel.js';
import { MessageService } from '../../../sdk/src/services/message.js';
import { EscrowService } from '../../../sdk/src/services/escrow.js';
import { MarketplaceService } from '../../../sdk/src/services/marketplace.js';

/**
 * Initialize SDK services directly without UnifiedClient
 */
export async function initializeDirectSdk(rpc: Rpc<SolanaRpcApi>, programId: Address) {
  try {
    // Create mock subscriptions for CLI
    const mockSubscriptions = createMockRpcSubscriptions();
    
    // Return service classes with mock subscriptions
    return {
      AgentService,
      ChannelService,
      MessageService,
      EscrowService,
      MarketplaceService,
      mockSubscriptions,
    };
  } catch (error) {
    logger.general.error('Failed to initialize SDK services:', error);
    throw error;
  }
}

/**
 * Register an agent directly using SDK
 */
export async function registerAgentDirect(
  rpc: Rpc<SolanaRpcApi>,
  signer: KeyPairSigner,
  programId: Address,
  name: string,
  type: string,
  description?: string,
  capabilities?: string[]
): Promise<{ address: Address; signature: string }> {
  const sdk = await initializeDirectSdk(rpc, programId);
  const agentService = new sdk.AgentService(rpc, sdk.mockSubscriptions, programId, 'confirmed');
  
  // Generate unique agent ID
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create agent through service
  const result = await agentService.verifyAgent(signer, {
    agentId,
    name,
    agentType: type,
    description: description || '',
    capabilities: capabilities || [],
    metadata: {}
  });
  
  return {
    address: result.agentPda,
    signature: result.signature
  };
}

/**
 * Create a channel directly using SDK
 */
export async function createChannelDirect(
  rpc: Rpc<SolanaRpcApi>,
  signer: KeyPairSigner,
  programId: Address,
  options: {
    name: string;
    description: string;
    visibility: number;
    maxParticipants?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<{ channelId: string; channelPda: Address; signature: string }> {
  const sdk = await initializeDirectSdk(rpc, programId);
  const channelService = new sdk.ChannelService(rpc, sdk.mockSubscriptions, programId, 'confirmed');
  
  return channelService.createChannel(signer, options);
}

/**
 * List user channels directly using SDK
 */
export async function listUserChannelsDirect(
  rpc: Rpc<SolanaRpcApi>,
  programId: Address,
  creator: Address
): Promise<any[]> {
  const sdk = await initializeDirectSdk(rpc, programId);
  const channelService = new sdk.ChannelService(rpc, sdk.mockSubscriptions, programId, 'confirmed');
  
  return channelService.listUserChannels(creator);
}