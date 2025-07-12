/**
 * Channel Service Wrapper with Timeout and Retry Logic
 * Provides enhanced error handling for CLI operations
 */

import { withTimeoutAndRetry, TIMEOUTS, DEFAULT_RETRY_CONFIG } from '../utils/timeout.js';
import { logger } from '../utils/logger.js';
import { getNetworkRetryConfig } from '../utils/network-diagnostics.js';
import type { KeyPairSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';

/**
 * Wrapper around SDK ChannelService with timeout and retry logic
 */
export class ChannelServiceWrapper {
  constructor(private channelService: any) {}

  /**
   * Create a channel with timeout and retry protection
   */
  async createChannel(
    signer: KeyPairSigner,
    options: {
      name: string;
      description: string;
      visibility: number;
      maxParticipants?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Attempting channel creation:', options.name);
        const result = await this.channelService.createChannel(signer, options);
        logger.channel.debug('Channel creation successful:', result);
        return result;
      },
      'Channel creation',
      TIMEOUTS.CHANNEL_CREATE,
      getNetworkRetryConfig({
        maxRetries: 2, // Reduce retries for creation to avoid duplicate attempts
        shouldRetry: (error: unknown) => {
          // Don't retry if channel already exists
          if (error instanceof Error && error.message.includes('already exists')) {
            return false;
          }
          // Use network retry logic for other errors
          return getNetworkRetryConfig().shouldRetry?.(error) ?? false;
        }
      }),
      {
        showRetryHint: true,
        warningThreshold: 70
      }
    );
  }

  /**
   * List user channels with timeout and retry protection
   */
  async listUserChannels(creator: Address) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Fetching channels for:', creator);
        const channels = await this.channelService.listUserChannels(creator);
        logger.channel.debug(`Found ${channels.length} channels`);
        return channels;
      },
      'Channel list fetch',
      TIMEOUTS.ACCOUNT_FETCH,
      getNetworkRetryConfig(),
      {
        showRetryHint: true,
        warningThreshold: 80
      }
    );
  }

  /**
   * Get channel info with timeout and retry protection
   */
  async getChannel(channelPda: Address) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Fetching channel info:', channelPda);
        const channel = await this.channelService.getChannel(channelPda);
        logger.channel.debug('Channel info retrieved:', channel);
        return channel;
      },
      'Channel info fetch',
      TIMEOUTS.ACCOUNT_FETCH,
      getNetworkRetryConfig(),
      {
        showRetryHint: true,
        warningThreshold: 80
      }
    );
  }

  /**
   * Send a message with timeout and retry protection
   */
  async sendChannelMessage(
    signer: KeyPairSigner,
    recipient: Address,
    options: {
      payload: string;
      messageType?: number;
      expirationDays?: number;
      recipient?: Address;
    }
  ) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Sending message to channel');
        const result = await this.channelService.sendChannelMessage(signer, recipient, options);
        logger.channel.debug('Message sent successfully:', result);
        return result;
      },
      'Message sending',
      TIMEOUTS.TRANSACTION_SEND,
      getNetworkRetryConfig(),
      {
        showRetryHint: true,
        warningThreshold: 70
      }
    );
  }

  /**
   * Join a channel with timeout and retry protection
   */
  async joinChannel(signer: KeyPairSigner, channelPda: Address) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Joining channel:', channelPda);
        const result = await this.channelService.joinChannel(signer, channelPda);
        logger.channel.debug('Channel joined successfully:', result);
        return result;
      },
      'Channel join',
      TIMEOUTS.RPC_CALL,
      getNetworkRetryConfig(),
      {
        showRetryHint: true
      }
    );
  }

  /**
   * Leave a channel with timeout and retry protection
   */
  async leaveChannel(signer: KeyPairSigner, channelPda: Address) {
    return withTimeoutAndRetry(
      async () => {
        logger.channel.debug('Leaving channel:', channelPda);
        const result = await this.channelService.leaveChannel(signer, channelPda);
        logger.channel.debug('Channel left successfully:', result);
        return result;
      },
      'Channel leave',
      TIMEOUTS.RPC_CALL,
      getNetworkRetryConfig(),
      {
        showRetryHint: true
      }
    );
  }
}

/**
 * Create a wrapped channel service with timeout and retry logic
 */
export function createChannelServiceWrapper(channelService: any): ChannelServiceWrapper {
  return new ChannelServiceWrapper(channelService);
}