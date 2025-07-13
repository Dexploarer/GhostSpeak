/**
 * Message Commands - Blockchain-based Agent Communication
 *
 * Secure messaging between AI agents on the blockchain.
 */

import chalk from 'chalk';
import type { PublicKey } from '@solana/web3.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import { isVerboseMode } from '../utils/cli-options.js';

/**
 * Message content types
 */
export type MessageContentType = 'text' | 'json' | 'binary' | 'encrypted';

/**
 * Send message options
 */
export interface SendMessageOptions {
  contentType?: MessageContentType;
  encrypted?: boolean;
  replyTo?: string;
  metadata?: Record<string, any>;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  pageSize?: number; // Alias for limit to support CLI compatibility
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

export async function sendMessage(
  channel: string,
  content: string,
  options: SendMessageOptions = {}
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());

  try {
    // Validate inputs
    const trimmedChannel = channel.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedChannel) {
      logger.message.error(chalk.red('❌ Error: Channel ID cannot be empty'));
      process.exit(1);
    }
    
    if (!trimmedContent) {
      logger.message.error(chalk.red('❌ Error: Message content cannot be empty'));
      process.exit(1);
    }
    
    if (trimmedContent.length > 1000) {
      logger.message.error(chalk.red('❌ Error: Message content exceeds 1000 character limit'));
      process.exit(1);
    }
    
    cliLogger.general.info(chalk.cyan('💬 Sending Agent Message'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Channel: ${chalk.blue(trimmedChannel)}`);
    cliLogger.general.info(`Content: ${chalk.gray(trimmedContent.length > 50 ? trimmedContent.substring(0, 50) + '...' : trimmedContent)}`);
    
    if (options.encrypted) {
      cliLogger.general.info(`Encryption: ${chalk.green('Enabled')}`);
    }
    
    cliLogger.general.info('');
    
    // Load SDK services and configuration
    const { getGhostspeakSdk, getRpc, getRpcSubscriptions, getKeypair, getProgramId } = await import('../context-helpers.js');
    const { withTimeout, TIMEOUTS, withTimeoutAndRetry } = await import('../utils/timeout.js');
    const { getNetworkRetryConfig } = await import('../utils/network-diagnostics.js');
    const { ProgressIndicator } = await import('../utils/prompts.js');
    const { LazyModules } = await import('@ghostspeak/sdk');
    const { address } = await import('@solana/addresses');
    
    const progress = new ProgressIndicator('Preparing message...');
    progress.start();
    
    try {
      // Initialize services
      progress.update('Loading wallet and configuration...');
      const [rpc, rpcSubscriptions, keypair] = await withTimeout(
        Promise.all([
          getRpc(),
          getRpcSubscriptions(),
          getKeypair()
        ]),
        TIMEOUTS.SDK_INIT,
        'Service initialization'
      );
      
      const programId = await getProgramId('message');
      const programAddress = address(programId);
      
      // Load message service from SDK
      progress.update('Initializing message service...');
      const messageModule = await withTimeout(
        LazyModules.message,
        TIMEOUTS.SDK_INIT,
        'Message service loading'
      );
      
      const messageService = new messageModule.MessageService(
        rpc,
        rpcSubscriptions,
        programAddress,
        'confirmed'
      );
      
      progress.update('Connecting to blockchain...');
      
      // Convert channel to address if it's not already
      const channelAddress = address(trimmedChannel);
      
      // Determine message type from options
      const messageType = options.contentType === 'json' ? 1 : 
                         options.contentType === 'binary' ? 2 : 
                         options.contentType === 'encrypted' ? 3 : 0;
      
      progress.update('Sending message to channel...');
      
      // Send message using SDK service with retry logic
      const result = await withTimeoutAndRetry(
        () => messageService.sendChannelMessage(
          keypair,
          channelAddress,
          trimmedContent,
          messageType
        ),
        'Message sending',
        TIMEOUTS.TRANSACTION,
        getNetworkRetryConfig({
          maxRetries: 3,
        }),
        {
          showRetryHint: true,
          warningThreshold: 80
        }
      );
      
      progress.succeed('Message sent successfully');
      
      // Show success details
      logger.message.info('');
      logger.message.info(chalk.green('✅ Message Sent Successfully'));
      logger.message.info(chalk.gray('─'.repeat(50)));
      logger.message.info(`Message ID: ${chalk.cyan(result.messageId)}`);
      logger.message.info(`Transaction: ${chalk.gray(result.signature)}`);
      logger.message.info(`Channel: ${chalk.blue(trimmedChannel)}`);
      logger.message.info('');
      
      // Show optional metadata if provided
      if (options.metadata && Object.keys(options.metadata).length > 0) {
        logger.message.info(chalk.yellow('Metadata:'));
        Object.entries(options.metadata).forEach(([key, value]) => {
          logger.message.info(`  ${key}: ${chalk.gray(JSON.stringify(value))}`);
        });
        logger.message.info('');
      }
      
    } catch (innerError) {
      progress.fail('Failed to send message');
      throw innerError;
    }
    
  } catch (error) {
    logger.message.error(chalk.red('❌ Failed to send message:'), error);
    logger.message.info('');
    logger.message.info(chalk.yellow('💡 Troubleshooting:'));
    logger.message.info(chalk.gray('   • Ensure blockchain connection is available'));
    logger.message.info(chalk.gray('   • Check that the channel exists'));
    logger.message.info(chalk.gray('   • Verify wallet has sufficient SOL for transaction fees'));
    logger.message.info(chalk.gray('   • Run "ghostspeak doctor" to diagnose connection issues'));
    
    // Exit with error code
    process.exit(1);
  }
}

export async function listMessages(
  channelId: string,
  options?: ListMessagesOptions
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());

  try {
    // Validate channel ID
    const trimmedChannelId = channelId.trim();
    
    if (!trimmedChannelId) {
      logger.message.error(chalk.red('❌ Error: Channel ID cannot be empty'));
      process.exit(1);
    }
    
    logger.message.info(chalk.cyan('📋 Listing Messages'));
    logger.message.info(chalk.gray('─'.repeat(50)));
    logger.message.info(`Channel: ${chalk.blue(trimmedChannelId)}`);
    
    // Show filter options if provided
    if (options) {
      const displayLimit = options.limit || options.pageSize;
      if (displayLimit) {
        logger.message.info(`Limit: ${chalk.yellow(displayLimit)}`);
      }
      if (options.fromTimestamp) {
        logger.message.info(`From: ${chalk.yellow(new Date(options.fromTimestamp).toLocaleString())}`);
      }
      if (options.toTimestamp) {
        logger.message.info(`To: ${chalk.yellow(new Date(options.toTimestamp).toLocaleString())}`);
      }
      if (options.contentTypeFilter && options.contentTypeFilter.length > 0) {
        logger.message.info(`Types: ${chalk.yellow(options.contentTypeFilter.join(', '))}`);
      }
    }
    
    logger.message.info('');
    
    // Load SDK services and configuration
    const { getRpc, getRpcSubscriptions, getProgramId } = await import('../context-helpers.js');
    const { withTimeout, TIMEOUTS } = await import('../utils/timeout.js');
    const { ProgressIndicator, createTable } = await import('../utils/prompts.js');
    const { LazyModules } = await import('@ghostspeak/sdk');
    const { address } = await import('@solana/addresses');
    
    const progress = new ProgressIndicator('Loading messages...');
    progress.start();
    
    try {
      // Initialize services
      progress.update('Connecting to blockchain...');
      const [rpc, rpcSubscriptions] = await withTimeout(
        Promise.all([
          getRpc(),
          getRpcSubscriptions()
        ]),
        TIMEOUTS.SDK_INIT,
        'Service initialization'
      );
      
      const programId = await getProgramId('message');
      const programAddress = address(programId);
      
      // Load message service from SDK
      progress.update('Initializing message service...');
      const messageModule = await withTimeout(
        LazyModules.message,
        TIMEOUTS.SDK_INIT,
        'Message service loading'
      );
      
      const messageService = new messageModule.MessageService(
        rpc,
        rpcSubscriptions,
        programAddress,
        'confirmed'
      );
      
      // Convert channel ID to address
      const channelAddress = address(trimmedChannelId);
      
      progress.update('Fetching messages from channel...');
      
      // Get messages from channel with limit
      const limit = options?.limit || options?.pageSize || 20;
      const messages = await withTimeout(
        messageService.getChannelMessages(channelAddress, limit),
        TIMEOUTS.RPC_CALL,
        'Message fetching'
      );
      
      progress.succeed(`Found ${messages.length} messages`);
      
      // Display messages
      if (messages.length === 0) {
        logger.message.info(chalk.yellow('No messages found in this channel'));
        logger.message.info('');
        return;
      }
      
      // Apply filters if provided
      let filteredMessages = messages;
      
      if (options?.fromTimestamp) {
        filteredMessages = filteredMessages.filter(msg => msg.timestamp >= options.fromTimestamp!);
      }
      
      if (options?.toTimestamp) {
        filteredMessages = filteredMessages.filter(msg => msg.timestamp <= options.toTimestamp!);
      }
      
      if (options?.senderFilter) {
        const senderAddress = options.senderFilter.toString();
        filteredMessages = filteredMessages.filter(msg => msg.sender === senderAddress);
      }
      
      if (options?.contentTypeFilter && options.contentTypeFilter.length > 0) {
        const typeMap: Record<MessageContentType, number> = {
          'text': 0,
          'json': 1,
          'binary': 2,
          'encrypted': 3
        };
        const filterTypes = options.contentTypeFilter.map(t => typeMap[t]);
        filteredMessages = filteredMessages.filter(msg => filterTypes.includes(msg.messageType));
      }
      
      // Create table for display
      const table = createTable({
        head: ['Time', 'Sender', 'Type', 'Content', 'Status'],
        colWidths: [20, 15, 10, 40, 10],
        wordWrap: true
      });
      
      // Format message type
      const getMessageTypeName = (type: number): string => {
        switch (type) {
          case 0: return 'Text';
          case 1: return 'JSON';
          case 2: return 'Binary';
          case 3: return 'Encrypted';
          case 4: return 'System';
          default: return 'Unknown';
        }
      };
      
      // Add messages to table
      filteredMessages.forEach((msg) => {
        const time = new Date(msg.timestamp).toLocaleString();
        const sender = `${msg.sender.slice(0, 4)}...${msg.sender.slice(-4)}`;
        const type = getMessageTypeName(msg.messageType);
        const content = msg.encrypted ? 
          chalk.gray('[Encrypted]') : 
          msg.content.length > 40 ? 
            msg.content.slice(0, 37) + '...' : 
            msg.content;
        const status = msg.edited ? chalk.yellow('Edited') : chalk.green('Original');
        
        table.push([time, sender, type, content, status]);
      });
      
      logger.message.info('');
      console.log(table.toString());
      logger.message.info('');
      
      // Show summary
      logger.message.info(chalk.gray('─'.repeat(50)));
      logger.message.info(`Total messages: ${chalk.cyan(messages.length)}`);
      if (filteredMessages.length < messages.length) {
        logger.message.info(`Filtered: ${chalk.yellow(filteredMessages.length)}`);
      }
      logger.message.info('');
      
      // Show tips
      if (messages.length === limit) {
        logger.message.info(chalk.yellow('💡 Tip: Use --limit to see more messages'));
      }
      
    } catch (innerError) {
      progress.fail('Failed to fetch messages');
      throw innerError;
    }
    
  } catch (error) {
    logger.message.error(chalk.red('❌ Failed to list messages:'), error);
    logger.message.info('');
    logger.message.info(chalk.yellow('💡 Troubleshooting:'));
    logger.message.info(chalk.gray('   • Ensure the channel ID is valid'));
    logger.message.info(chalk.gray('   • Check blockchain connection'));
    logger.message.info(chalk.gray('   • Run "ghostspeak doctor" to diagnose issues'));
    
    // Exit with error code
    process.exit(1);
  }
}