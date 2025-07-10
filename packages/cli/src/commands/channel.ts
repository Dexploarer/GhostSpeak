import { logger } from '../utils/logger.js';
import {
  getRpc,
  getRpcSubscriptions,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';

import type {
  Channel,
  ChannelMetadata,
  TransactionResult,
  FilterParams,
} from '../types';
import type { PublicKey } from '@solana/web3.js';

/**
 * Channel creation options
 */
export interface CreateChannelOptions {
  description?: string;
  isPrivate?: boolean;
  maxParticipants?: number;
  encryptionEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new channel using the real SDK ChannelService
 * @param name - Channel name
 * @param options - Channel creation options (description, visibility, etc.)
 */
export async function createChannel(
  name: string,
  options: Partial<CreateChannelOptions>
): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('channel');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const channelService = new sdk.ChannelService(rpc, programId, commitment);
    const result: TransactionResult = await channelService.createChannel(
      signer,
      {
        name,
        ...options,
      }
    );
    logger.channel.info('✅ Created channel:', result);
  } catch (error) {
    logger.channel.error('❌ Failed to create channel:', error);
  }
}

/**
 * Channel listing options
 */
export interface ListChannelsOptions extends FilterParams {
  includePrivate?: boolean;
  includeArchived?: boolean;
  participantFilter?: PublicKey;
}

/**
 * List all channels for the current user using the real SDK ChannelService
 * @param options - Listing options (optional)
 */
export async function listChannels(
  options?: ListChannelsOptions
): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('channel');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    // Note: CLI doesn't support subscriptions, so we create service without them
    const channelService = new sdk.ChannelService(
      rpc,
      programId,
      commitment
    );
    const channels: Channel[] = await channelService.listUserChannels(
      signer.address
    );
    logger.channel.info('📡 Channels:', channels);
  } catch (error) {
    logger.channel.error('❌ Failed to list channels:', error);
  }
}

// TODO: Add more channel operations as SDK expands
