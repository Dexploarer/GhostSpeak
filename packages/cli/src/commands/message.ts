import { MessageService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getRpcSubscriptions, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Send a message to a channel using the real SDK MessageService
 * @param channelId - Channel PDA
 * @param content - Message content
 * @param options - Message options (type, etc.)
 */
export async function sendMessage(channelId: Address, content: string, options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('message');
    const commitment = await getCommitment();
    const sender = await getKeypair();
    const messageService = new MessageService(rpc, rpcSubscriptions, programId, commitment);
    const messageType = options?.messageType || 0;
    const result = await messageService.sendChannelMessage(sender, channelId, content, messageType);
    console.log('✅ Sent message:', result);
  } catch (error) {
    console.error('❌ Failed to send message:', error);
  }
}

/**
 * List messages in a channel using the real SDK MessageService
 * @param channelId - Channel PDA
 * @param options - Listing options (limit, etc.)
 */
export async function listMessages(channelId: Address, options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('message');
    const commitment = await getCommitment();
    const messageService = new MessageService(rpc, rpcSubscriptions, programId, commitment);
    const limit = options?.limit || 50;
    const messages = await messageService.getChannelMessages(channelId, limit);
    console.log('💬 Channel messages:', messages);
  } catch (error) {
    console.error('❌ Failed to list messages:', error);
  }
}

// TODO: Add more message operations as SDK expands 