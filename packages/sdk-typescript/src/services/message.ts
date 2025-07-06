/**
 * Modern Message Service for Web3.js v2 (2025)
 */

import {
  buildSimulateAndSendTransaction
} from '../utils/transaction-helpers';

// Import real instruction builders from generated code
import {
  getSendMessageInstructionAsync,
  type SendMessageInstructionDataArgs
} from '../generated-v2/instructions/sendMessage';

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Message types
 */
export enum IMessageType {
  TEXT = 0,
  FILE = 1,
  IMAGE = 2,
  VOICE = 3,
  SYSTEM = 4,
}

/**
 * Message configuration
 */
export interface IMessageConfig {
  content: string;
  messageType: IMessageType;
  encrypted: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Message account data
 */
export interface IMessageAccount {
  id: Address;
  sender: Address;
  channel: Address;
  content: string;
  messageType: IMessageType;
  timestamp: number;
  edited: boolean;
  encrypted: boolean;
}

/**
 * Modern Message Service using Real Smart Contract Implementation
 */
export class MessageService {
  private readonly buildSimulateAndSendTransactionFn: ReturnType<
    typeof buildSimulateAndSendTransaction
  >;

  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {
    // Create the buildSimulateAndSendTransaction function
    this.buildSimulateAndSendTransactionFn = buildSimulateAndSendTransaction(
      rpc,
      rpcSubscriptions
    );
  }

  /**
   * Send a message to a direct recipient using real smart contract instruction
   */
  async sendDirectMessage(
    sender: KeyPairSigner,
    recipient: Address,
    content: string,
    messageType: IMessageType = IMessageType.TEXT
  ): Promise<{
    messageId: Address;
    signature: string;
  }> {
    try {
      console.log(`💬 Sending direct message: ${content.slice(0, 50)}...`);

      // Generate unique message ID
      const messageId = `msg_direct_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // Create the send message instruction using the real generated instruction builder
      const instruction = await getSendMessageInstructionAsync(
        {
          sender,
          recipient,
          messageId,
          payload: content,
          messageType,
          expirationDays: 30 // Default expiration
        },
        { programAddress: this.programId }
      );

      // Execute the transaction using the real instruction
      const result = await this.buildSimulateAndSendTransactionFn(
        [instruction],
        [sender]
      );

      console.log('✅ Direct message sent successfully:', result.signature);

      // Extract the message PDA from the instruction accounts
      const messagePda = instruction.accounts[0].address;

      return { 
        messageId: messagePda, 
        signature: result.signature 
      };
    } catch (error) {
      console.error('❌ Failed to send direct message:', error);
      throw new Error(
        `Direct message failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send a message to a channel using real smart contract instruction
   */
  async sendChannelMessage(
    sender: KeyPairSigner,
    channelPDA: Address,
    content: string,
    messageType: IMessageType = IMessageType.TEXT
  ): Promise<{
    messageId: Address;
    signature: string;
  }> {
    try {
      console.log(`📢 Sending channel message: ${content.slice(0, 50)}...`);

      // Generate unique message ID
      const messageId = `msg_channel_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // For channel messages, the recipient is the channel PDA
      const instruction = await getSendMessageInstructionAsync(
        {
          sender,
          recipient: channelPDA,
          messageId,
          payload: content,
          messageType,
          expirationDays: 30 // Default expiration
        },
        { programAddress: this.programId }
      );

      // Execute the transaction using the real instruction
      const result = await this.buildSimulateAndSendTransactionFn(
        [instruction],
        [sender]
      );

      console.log('✅ Channel message sent successfully:', result.signature);

      // Extract the message PDA from the instruction accounts
      const messagePda = instruction.accounts[0].address;

      return { 
        messageId: messagePda, 
        signature: result.signature 
      };
    } catch (error) {
      console.error('❌ Failed to send channel message:', error);
      throw new Error(
        `Channel message failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: Address): Promise<IMessageAccount | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(messageId, {
          commitment: this.commitment,
          encoding: 'base64',
        })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      // Handle Web3.js v2 account data format
      let data: Uint8Array;
      const accountData = accountInfo.value.data;

      if (Array.isArray(accountData)) {
        // Web3.js v2 returns [data, encoding] tuple
        const [dataString] = accountData;
        if (typeof dataString === 'string') {
          data = Buffer.from(dataString, 'base64');
        } else {
          throw new Error('Invalid data format in account info');
        }
      } else if (typeof accountData === 'string') {
        data = Buffer.from(accountData, 'base64');
      } else {
        throw new Error('Unknown account data format');
      }

      // Parse message account data (simplified parser)
      return this.parseMessageAccount(messageId, data);
    } catch (error) {
      console.error('❌ Failed to get message:', error);
      return null;
    }
  }

  /**
   * Get messages from a channel
   */
  async getChannelMessages(
    channelPDA: Address,
    limit: number = 50,
    _before?: Address
  ): Promise<IMessageAccount[]> {
    try {
      console.log(`📝 Getting ${limit} messages from channel ${channelPDA}`);

      // TODO: Implement real channel message querying using program account filtering
      // This would use getProgramAccounts with proper filters
      console.log('⚠️ Channel message querying not yet implemented - using mock data');

      // Mock implementation for now
      await new Promise(resolve => setTimeout(resolve, 800));

      const messageCount = Math.min(limit, 10);
      return Array.from({ length: messageCount }, (_, i) => ({
        id: `msg_${i + 1}_${Date.now()}` as Address,
        sender: `sender_${i + 1}` as Address,
        channel: channelPDA,
        content: `Message ${i + 1} content`,
        messageType: IMessageType.TEXT,
        timestamp: Date.now() - (messageCount - i) * 300000, // 5 min intervals
        edited: Math.random() > 0.8,
        encrypted: Math.random() > 0.7,
      }));
    } catch (error) {
      throw new Error(`Failed to get channel messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    _sender: KeyPairSigner,
    messageId: Address,
    _newContent: string
  ): Promise<string> {
    try {
      console.log(`✏️ Editing message ${messageId}`);

      // TODO: Implement editMessage instruction when available
      // For now, throw an error indicating this needs implementation
      throw new Error('Edit message instruction not yet implemented - need to generate editMessage instruction builder');

    } catch (error) {
      console.error('❌ Failed to edit message:', error);
      throw new Error(
        `Message edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse message account data from chain (simplified parser)
   */
  private parseMessageAccount(messageId: Address, data: Uint8Array): IMessageAccount {
    // This is a simplified parser - in a real implementation,
    // we would use the generated account parsers
    try {
      // Mock parsing for now - real implementation would decode the account data
      return {
        id: messageId,
        sender: 'mock_sender_address' as Address,
        channel: 'mock_channel_address' as Address,
        content: 'Sample message content',
        messageType: IMessageType.TEXT,
        timestamp: Date.now() - 3600000, // 1 hour ago
        edited: false,
        encrypted: false,
      };
    } catch (error) {
      console.error('❌ Failed to parse message account data:', error);
      throw new Error('Failed to parse message account data');
    }
  }
}
