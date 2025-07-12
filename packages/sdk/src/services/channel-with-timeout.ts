/**
 * Channel Service with built-in timeout protection
 * Wraps the base ChannelService with configurable timeouts
 */

import { ChannelService, type ICreateChannelOptions, type IChannelCreationResult, type ISendMessageOptions, type IChannelAccount } from './channel.js';
import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Default timeout values for channel operations
 */
export const CHANNEL_TIMEOUTS = {
  CREATE: 30000,      // 30 seconds for channel creation
  SEND_MESSAGE: 20000, // 20 seconds for sending messages
  GET_CHANNEL: 10000,  // 10 seconds for fetching channel info
  LIST_CHANNELS: 15000, // 15 seconds for listing channels
  JOIN_LEAVE: 10000,   // 10 seconds for join/leave operations
} as const;

/**
 * Channel Service with Timeout Protection
 * Ensures all operations complete within reasonable time limits
 */
export class ChannelServiceWithTimeout extends ChannelService {
  constructor(
    rpc: Rpc<SolanaRpcApi>,
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
    programId: Address,
    commitment: Commitment = 'confirmed',
    private readonly timeouts = CHANNEL_TIMEOUTS
  ) {
    super(rpc, rpcSubscriptions, programId, commitment);
  }

  /**
   * Creates a channel with timeout protection
   */
  async createChannel(
    signer: KeyPairSigner,
    options: ICreateChannelOptions,
    timeoutMs = this.timeouts.CREATE
  ): Promise<IChannelCreationResult> {
    return this.withTimeout(
      () => super.createChannel(signer, options),
      timeoutMs,
      'Channel creation'
    );
  }

  /**
   * Sends a message with timeout protection
   */
  async sendChannelMessage(
    signer: KeyPairSigner,
    recipient: Address,
    options: ISendMessageOptions,
    timeoutMs = this.timeouts.SEND_MESSAGE
  ): Promise<string> {
    return this.withTimeout(
      () => super.sendChannelMessage(signer, recipient, options),
      timeoutMs,
      'Message sending'
    );
  }

  /**
   * Gets channel info with timeout protection
   */
  async getChannel(
    channelPda: Address,
    timeoutMs = this.timeouts.GET_CHANNEL
  ): Promise<IChannelAccount | null> {
    return this.withTimeout(
      () => super.getChannel(channelPda),
      timeoutMs,
      'Channel fetch'
    );
  }

  /**
   * Lists user channels with timeout protection
   */
  async listUserChannels(
    creator: Address,
    timeoutMs = this.timeouts.LIST_CHANNELS
  ): Promise<IChannelAccount[]> {
    return this.withTimeout(
      () => super.listUserChannels(creator),
      timeoutMs,
      'Channel list fetch'
    );
  }

  /**
   * Joins a channel with timeout protection
   */
  async joinChannel(
    signer: KeyPairSigner,
    channelPda: Address,
    timeoutMs = this.timeouts.JOIN_LEAVE
  ): Promise<string> {
    return this.withTimeout(
      () => super.joinChannel(signer, channelPda),
      timeoutMs,
      'Channel join'
    );
  }

  /**
   * Leaves a channel with timeout protection
   */
  async leaveChannel(
    signer: KeyPairSigner,
    channelPda: Address,
    timeoutMs = this.timeouts.JOIN_LEAVE
  ): Promise<string> {
    return this.withTimeout(
      () => super.leaveChannel(signer, channelPda),
      timeoutMs,
      'Channel leave'
    );
  }

  /**
   * Generic timeout wrapper for any async operation
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Factory function to create a ChannelService with timeout protection
 */
export function createChannelServiceWithTimeout(
  rpc: Rpc<SolanaRpcApi>,
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
  programId: Address,
  commitment: Commitment = 'confirmed',
  timeouts?: Partial<typeof CHANNEL_TIMEOUTS>
): ChannelServiceWithTimeout {
  return new ChannelServiceWithTimeout(
    rpc,
    rpcSubscriptions,
    programId,
    commitment,
    timeouts ? { ...CHANNEL_TIMEOUTS, ...timeouts } : CHANNEL_TIMEOUTS
  );
}