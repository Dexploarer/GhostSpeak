import { logger } from '../utils/logger.js';
import {
  getRpc,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';

import type {
  Message,
  MessageMetadata,
  MessageContentType,
  TransactionResult,
  PaginationParams,
} from '../types';
import type { PublicKey } from '@solana/web3.js';

/**
 * Message sending options
 */
export interface SendMessageOptions {
  contentType?: MessageContentType;
  encrypted?: boolean;
  replyTo?: string;
  attachments?: Array<{
    name: string;
    type: string;
    data: Buffer;
  }>;
  metadata?: Record<string, unknown>;
}

export async function sendMessage(
  channel: string,
  content: string,
  options: Partial<SendMessageOptions>
): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('message');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const messageService = new sdk.MessageService(rpc, programId, commitment);
    const result: TransactionResult = await messageService.sendMessage(
      signer,
      channel,
      content,
      options
    );
    logger.message.info('✅ Sent message:', result);
  } catch (error) {
    logger.message.error('❌ Failed to send message:', error);
  }
}

/**
 * Message listing options
 */
export interface ListMessagesOptions extends PaginationParams {
  fromTimestamp?: number;
  toTimestamp?: number;
  senderFilter?: PublicKey;
  contentTypeFilter?: MessageContentType[];
}

/**
 * List messages in a channel using the real SDK MessageService
 * @param channelId - Channel PDA
 * @param options - Listing options (limit, etc.)
 */
export async function listMessages(
  channelId: string,
  options?: ListMessagesOptions
): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('message');
    const commitment = await getCommitment();
    const messageService = new sdk.MessageService(rpc, programId, commitment);
    const limit = options?.pageSize || 50;
    const messages: Message[] = await messageService.getChannelMessages(
      channelId,
      limit
    );
    logger.message.info('💬 Channel messages:', messages);
  } catch (error) {
    logger.message.error('❌ Failed to list messages:', error);
  }
}

// TODO: Add more message operations as SDK expands
