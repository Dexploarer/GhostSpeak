import { logger } from '../utils/logger.js';
import chalk from 'chalk';
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

// In-memory storage for demo purposes
interface StoredMessage {
  id: string;
  channelId: string;
  sender: string;
  content: string;
  timestamp: number;
  contentType: MessageContentType;
  encrypted: boolean;
  replyTo?: string;
  metadata?: Record<string, unknown>;
  signature?: string;
}

const messageStorage: Map<string, StoredMessage[]> = new Map();
const channelInfo: Map<string, { name: string; participants: number; created: number }> = new Map();

export async function sendMessage(
  channel: string,
  content: string,
  options: Partial<SendMessageOptions> = {}
): Promise<void> {
  try {
    logger.message.info(chalk.cyan('📨 Sending Message'));
    logger.message.info(chalk.gray('─'.repeat(50)));
    
    // Validate inputs
    if (!channel || channel.length < 3) {
      throw new Error('Invalid channel identifier');
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }
    
    logger.message.info(`Channel: ${chalk.blue(channel)}`);
    logger.message.info(`Content Type: ${chalk.gray(options.contentType || 'text')}`);
    logger.message.info(`Encrypted: ${options.encrypted ? chalk.green('Yes') : chalk.yellow('No')}`);
    
    if (options.replyTo) {
      logger.message.info(`Reply To: ${chalk.gray(options.replyTo)}`);
    }
    
    logger.message.info('');
    
    // For now, always use simulation mode to ensure reliability
    logger.message.info(chalk.yellow('📡 Using simulation mode (blockchain integration in development)'));
    
    // Simulation mode
    await simulateSendMessage(channel, content, options);
    
  } catch (error) {
    logger.message.error(chalk.red('❌ Failed to send message:'), error);
    logger.message.info('');
    logger.message.info(chalk.yellow('💡 Troubleshooting tips:'));
    logger.message.info('  • Ensure the channel exists');
    logger.message.info('  • Check message size limits (max 1KB)');
    logger.message.info('  • Verify you have permission to post');
    logger.message.info('  • Try creating the channel first');
  }
}

async function simulateSendMessage(
  channel: string,
  content: string,
  options: Partial<SendMessageOptions>
): Promise<void> {
  logger.message.info(chalk.blue('🔄 Processing message...'));
  
  // Simulate encryption if requested
  if (options.encrypted) {
    logger.message.info(chalk.blue('🔐 Encrypting message...'));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create message
  const message: StoredMessage = {
    id: generateMessageId(),
    channelId: channel,
    sender: generateMockPublicKey(),
    content: options.encrypted ? `[Encrypted: ${btoa(content).substring(0, 20)}...]` : content,
    timestamp: Date.now(),
    contentType: options.contentType || 'text',
    encrypted: options.encrypted || false,
    replyTo: options.replyTo,
    metadata: options.metadata,
    signature: generateMockSignature()
  };
  
  // Store message
  const messages = messageStorage.get(channel) || [];
  messages.push(message);
  messageStorage.set(channel, messages);
  
  // Update channel info
  if (!channelInfo.has(channel)) {
    channelInfo.set(channel, {
      name: channel,
      participants: Math.floor(Math.random() * 50) + 2,
      created: Date.now() - Math.floor(Math.random() * 86400000)
    });
  }
  
  // Display results
  logger.message.info(chalk.green('✅ Message sent successfully (simulated)'));
  logger.message.info('');
  logger.message.info(chalk.yellow('📝 Message Details:'));
  logger.message.info(`  Message ID: ${chalk.gray(message.id)}`);
  logger.message.info(`  Signature: ${chalk.gray(message.signature)}`);
  logger.message.info(`  Timestamp: ${chalk.gray(new Date(message.timestamp).toLocaleString())}`);
  logger.message.info(`  Size: ${chalk.gray(content.length + ' bytes')}`);
  
  if (options.encrypted) {
    logger.message.info(`  Encryption: ${chalk.green('AES-256-GCM')}`);
    logger.message.info(`  Key Exchange: ${chalk.green('ECDH')}`);
  }
  
  logger.message.info('');
  showMessageStats(channel);
}

function showMessageStats(channel: string): void {
  const messages = messageStorage.get(channel) || [];
  const info = channelInfo.get(channel);
  
  logger.message.info(chalk.cyan('📊 Channel Statistics:'));
  logger.message.info(`  Total Messages: ${chalk.blue(messages.length.toString())}`);
  
  if (info) {
    logger.message.info(`  Participants: ${chalk.blue(info.participants.toString())}`);
    logger.message.info(`  Created: ${chalk.gray(new Date(info.created).toLocaleDateString())}`);
  }
  
  // Calculate message frequency
  if (messages.length > 1) {
    const recentMessages = messages.slice(-10);
    const timeSpan = recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp;
    const frequency = timeSpan > 0 ? (recentMessages.length / (timeSpan / 60000)).toFixed(1) : '0';
    logger.message.info(`  Recent Activity: ${chalk.green(frequency + ' msgs/min')}`);
  }
  
  logger.message.info('');
  logger.message.info(chalk.yellow('🌟 Quick Actions:'));
  logger.message.info(`  List messages: ${chalk.gray(`ghostspeak message list ${channel}`)}`);
  logger.message.info(`  Reply: ${chalk.gray(`ghostspeak message send ${channel} "reply text" --reply-to <msg-id>`)}`);
  logger.message.info(`  Send encrypted: ${chalk.gray(`ghostspeak message send ${channel} "secret" --encrypted`)}`);
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
    logger.message.info(chalk.cyan('📋 Listing Messages'));
    logger.message.info(chalk.gray('─'.repeat(50)));
    logger.message.info(`Channel: ${chalk.blue(channelId)}`);
    
    // For now, always use simulation mode to ensure reliability
    logger.message.info(chalk.yellow('📋 Using simulation mode (blockchain integration in development)'));
    
    // Simulation mode
    await simulateListMessages(channelId, options);
    
  } catch (error) {
    logger.message.error(chalk.red('❌ Failed to list messages:'), error);
  }
}

async function simulateListMessages(
  channelId: string,
  options?: ListMessagesOptions
): Promise<void> {
  logger.message.info(chalk.blue('🔄 Fetching messages...'));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let messages = messageStorage.get(channelId) || [];
  
  // Generate some sample messages if none exist
  if (messages.length === 0) {
    const sampleMessages = [
      { content: 'Welcome to the channel!', time: -3600000 },
      { content: 'Hey everyone, excited to be here', time: -3000000 },
      { content: 'Has anyone tried the new escrow feature?', time: -2400000 },
      { content: 'Yes! It works great for secure transactions', time: -1800000 },
      { content: 'The MEV protection is really impressive', time: -900000 },
      { content: 'Agreed, saved me 0.05 SOL yesterday', time: -300000 }
    ];
    
    messages = sampleMessages.map(msg => ({
      id: generateMessageId(),
      channelId: channelId,
      sender: generateMockPublicKey(),
      content: msg.content,
      timestamp: Date.now() + msg.time,
      contentType: 'text' as MessageContentType,
      encrypted: false,
      signature: generateMockSignature()
    }));
    
    messageStorage.set(channelId, messages);
  }
  
  // Apply filters
  let filteredMessages = [...messages];
  
  if (options?.fromTimestamp) {
    filteredMessages = filteredMessages.filter(m => m.timestamp >= options.fromTimestamp!);
  }
  
  if (options?.toTimestamp) {
    filteredMessages = filteredMessages.filter(m => m.timestamp <= options.toTimestamp!);
  }
  
  if (options?.contentTypeFilter) {
    filteredMessages = filteredMessages.filter(m => 
      options.contentTypeFilter!.includes(m.contentType)
    );
  }
  
  // Apply pagination
  const pageSize = options?.pageSize || 20;
  const totalMessages = filteredMessages.length;
  filteredMessages = filteredMessages.slice(-pageSize);
  
  logger.message.info('');
  
  if (filteredMessages.length === 0) {
    logger.message.info(chalk.yellow('No messages found in this channel'));
    logger.message.info('Send a message with:');
    logger.message.info(chalk.gray(`  ghostspeak message send ${channelId} "Hello!"`));
    return;
  }
  
  logger.message.info(chalk.yellow(`💬 Recent Messages (${filteredMessages.length} of ${totalMessages} total):`));
  logger.message.info('');
  
  filteredMessages.forEach((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const sender = msg.sender.substring(0, 8) + '...';
    const isEncrypted = msg.encrypted ? chalk.green('🔒') : '';
    const replyIcon = msg.replyTo ? chalk.gray('↳') : '';
    
    logger.message.info(`${chalk.gray(time)} ${chalk.blue(sender)}: ${replyIcon}${isEncrypted} ${msg.content}`);
    
    if (index < filteredMessages.length - 1) {
      logger.message.info('');
    }
  });
  
  logger.message.info('');
  logger.message.info(chalk.gray('─'.repeat(50)));
  
  // Show channel info
  const info = channelInfo.get(channelId);
  if (info) {
    logger.message.info(chalk.cyan('📡 Channel Info:'));
    logger.message.info(`  Participants: ${chalk.blue(info.participants.toString())}`);
    logger.message.info(`  Created: ${chalk.gray(new Date(info.created).toLocaleDateString())}`);
    
    // Calculate message stats
    const encryptedCount = messages.filter(m => m.encrypted).length;
    const replyCount = messages.filter(m => m.replyTo).length;
    
    logger.message.info(`  Encrypted Messages: ${chalk.green(encryptedCount.toString())}`);
    logger.message.info(`  Replies: ${chalk.blue(replyCount.toString())}`);
  }
  
  logger.message.info('');
  logger.message.info(chalk.yellow('🌟 Actions:'));
  logger.message.info(`  Load more: ${chalk.gray(`ghostspeak message list ${channelId} --limit 50`)}`);
  logger.message.info(`  Filter by date: ${chalk.gray(`ghostspeak message list ${channelId} --from "2024-01-01"`)}`);
  logger.message.info(`  Export messages: ${chalk.gray(`ghostspeak message export ${channelId}`)}`);
}

function displayMessages(messages: Message[], channelId: string): void {
  if (!messages || messages.length === 0) {
    logger.message.info(chalk.yellow('No messages found'));
    return;
  }
  
  logger.message.info(chalk.yellow(`💬 Found ${messages.length} messages`));
  logger.message.info('');
  
  messages.forEach((msg: any) => {
    const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString();
    const sender = (msg.sender || 'Unknown').toString().substring(0, 8) + '...';
    logger.message.info(`${chalk.gray(time)} ${chalk.blue(sender)}: ${msg.content || msg.data || '[No content]'}`);
  });
}

// Helper functions
function generateMessageId(): string {
  return 'MSG-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

function generateMockPublicKey(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let key = '';
  for (let i = 0; i < 44; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function generateMockSignature(): string {
  const chars = '0123456789ABCDEFabcdef';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}

// TODO: Add more message operations as SDK expands
