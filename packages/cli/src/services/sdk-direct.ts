/**
 * Real SDK integration connecting to deployed PodAI program
 * Uses Web3.js v2 patterns with actual blockchain operations
 */

import { createSolanaRpc, type Rpc, type SolanaRpcApi } from '@solana/rpc';
import { address, type Address } from '@solana/addresses';
import { type KeyPairSigner } from '@solana/signers';
import { logger } from '../utils/logger.js';
import { LazyModules } from '@ghostspeak/sdk';

/**
 * Initialize real SDK services connecting to deployed PodAI program
 */
export async function initializeDirectSdk(rpc: Rpc<SolanaRpcApi>, programId: Address) {
  try {
    logger.general.debug('Initializing real SDK services for PodAI program...');
    
    // Load real SDK services
    const [
      agentModule,
      channelModule,
      messageModule,
      escrowModule,
      marketplaceModule
    ] = await Promise.all([
      LazyModules.agent,
      LazyModules.channel,
      LazyModules.message,
      LazyModules.escrow,
      LazyModules.marketplace
    ]);
    
    return {
      AgentService: agentModule.AgentService,
      ChannelService: channelModule.ChannelService,
      MessageService: messageModule.MessageService,
      EscrowService: escrowModule.EscrowService,
      MarketplaceService: marketplaceModule.MarketplaceService,
    };
  } catch (error) {
    logger.general.error('Failed to initialize real SDK services:', error);
    throw error;
  }
}

/**
 * Register an agent directly using real SDK connected to PodAI program
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
  const agentService = new sdk.AgentService(rpc, programId);
  
  // Register agent on actual blockchain using real PodAI program
  const result = await agentService.registerAgent({
    authority: signer,
    name,
    agentType: type,
    description: description || '',
    capabilities: capabilities || []
  });
  
  return {
    address: result.agentAddress,
    signature: result.signature
  };
}

/**
 * Create a channel directly using real SDK connected to PodAI program
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
  const channelService = new sdk.ChannelService(rpc, programId);
  
  // Create channel on actual blockchain using real PodAI program
  const result = await channelService.createChannel({
    authority: signer,
    name: options.name,
    description: options.description,
    visibility: options.visibility,
    maxParticipants: options.maxParticipants || 100
  });
  
  return {
    channelId: result.channelId,
    channelPda: result.channelAddress,
    signature: result.signature
  };
}

/**
 * List user channels directly using real SDK
 */
export async function listUserChannelsDirect(
  rpc: Rpc<SolanaRpcApi>,
  programId: Address,
  creator: Address
): Promise<any[]> {
  const sdk = await initializeDirectSdk(rpc, programId);
  const channelService = new sdk.ChannelService(rpc, programId);
  
  // Get real channels from blockchain
  return channelService.listUserChannels({ authority: creator });
}