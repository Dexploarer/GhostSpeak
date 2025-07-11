import { logger } from '../utils/logger.js';
import {
  getRpc,
  getRpcSubscriptions,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';
import { 
  confirm, 
  ProgressIndicator,
  success,
  error as showError,
  info,
  createTable
} from '../utils/prompts.js';
import chalk from 'chalk';

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
    // Validate channel name
    const trimmedName = name.trim();
    
    // Check if name is empty or just whitespace
    if (!trimmedName) {
      showError(
        'Invalid channel name',
        'Channel name cannot be empty or contain only whitespace.'
      );
      return;
    }
    
    // Check name length (1-50 characters)
    if (trimmedName.length > 50) {
      showError(
        'Channel name too long',
        'Channel names must be 50 characters or less. Please use a shorter name.'
      );
      return;
    }
    
    // Check for invalid characters (optional - allow alphanumeric, spaces, hyphens, underscores)
    const invalidCharsPattern = /[^a-zA-Z0-9\s\-_]/;
    if (invalidCharsPattern.test(trimmedName)) {
      showError(
        'Invalid characters in channel name',
        'Channel names can only contain letters, numbers, spaces, hyphens, and underscores.'
      );
      return;
    }
    
    // Check if name starts or ends with special characters
    if (/^[\s\-_]|[\s\-_]$/.test(trimmedName)) {
      showError(
        'Invalid channel name format',
        'Channel names cannot start or end with spaces, hyphens, or underscores.'
      );
      return;
    }
    
    // Show channel details before creation
    console.log('\n' + chalk.cyan('📋 Channel Details:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`${chalk.bold('Name:')} ${trimmedName}`);
    console.log(`${chalk.bold('Description:')} ${options.description || 'No description provided'}`);
    console.log(`${chalk.bold('Visibility:')} ${options.isPrivate ? '🔒 Private' : '🌍 Public'}`);
    console.log(`${chalk.bold('Max Participants:')} ${options.maxParticipants || 'Unlimited'}`);
    console.log(`${chalk.bold('Encryption:')} ${options.encryptionEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    
    if (options.metadata && Object.keys(options.metadata).length > 0) {
      console.log(`${chalk.bold('Metadata:')} ${JSON.stringify(options.metadata, null, 2)}`);
    }
    console.log(chalk.gray('─'.repeat(40)) + '\n');

    // Ask for confirmation
    const shouldCreate = await confirm({
      message: `Create channel "${trimmedName}" with these settings?`,
      defaultValue: true
    });

    if (!shouldCreate) {
      info('Channel creation cancelled');
      return;
    }

    // Show progress indicator
    const progress = new ProgressIndicator(`Creating channel "${trimmedName}"...`);
    progress.start();

    try {
      const sdk = await getGhostspeakSdk();
      const rpc = await getRpc();
      const programId = getProgramId('channel');
      const commitment = await getCommitment();
      const signer = await getKeypair();
      
      // Update progress
      progress.update('Initializing channel service...');
      const channelService = new sdk.ChannelService(rpc, programId, commitment);
      
      // Update progress
      progress.update('Sending transaction to blockchain...');
      const result = await channelService.createChannel(
        signer,
        {
          name: trimmedName,
          description: options.description || '',
          visibility: options.isPrivate ? 1 : 0, // 1 for private, 0 for public
          maxParticipants: options.maxParticipants || 100,
          metadata: options.metadata || {},
        }
      );
      
      // Stop progress and show success
      progress.succeed(`Channel "${trimmedName}" created successfully!`);
      
      // Display channel information
      console.log('\n' + chalk.green('✨ Channel Created Successfully!'));
      console.log(chalk.gray('─'.repeat(50)));
      
      // Create a nice table display
      const details = [
        ['Channel ID', result.channelId],
        ['Channel Address', result.channelPda],
        ['Transaction Signature', result.signature],
        ['Status', '✅ Active'],
        ['Created By', signer.address]
      ];
      
      createTable(['Property', 'Value'], details);
      
      console.log('\n' + chalk.yellow('💡 Next Steps:'));
      console.log('  • Invite participants using: ' + chalk.cyan(`ghostspeak channel invite ${result.channelId} <address>`));
      console.log('  • Send a message: ' + chalk.cyan(`ghostspeak channel message ${result.channelId} "Hello!"`));
      console.log('  • View channel details: ' + chalk.cyan(`ghostspeak channel info ${result.channelId}`));
      
      // Log for debugging if verbose mode
      logger.channel.debug('Channel creation result:', result);
      
    } catch (err) {
      progress.fail(`Failed to create channel "${trimmedName}"`);
      throw err;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show user-friendly error messages
    if (errorMessage.includes('insufficient')) {
      showError(
        'Insufficient SOL balance',
        'You need more SOL to create a channel. Please fund your wallet and try again.'
      );
    } else if (errorMessage.includes('already exists')) {
      showError(
        'Channel already exists',
        'A channel with this name already exists. Please choose a different name.'
      );
    } else if (errorMessage.includes('network')) {
      showError(
        'Network connection error',
        'Unable to connect to Solana network. Please check your internet connection and try again.'
      );
    } else {
      showError(
        'Failed to create channel',
        errorMessage
      );
    }
    
    // Log full error for debugging
    logger.channel.error('Channel creation error:', error);
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
  const progress = new ProgressIndicator('Fetching channels...');
  
  try {
    progress.start();
    
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('channel');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    
    // Update progress
    progress.update('Connecting to channel service...');
    
    // Note: CLI doesn't support subscriptions, so we create service without them
    const channelService = new sdk.ChannelService(
      rpc,
      programId,
      commitment
    );
    
    // Update progress
    progress.update('Loading your channels...');
    
    const channels: Channel[] = await channelService.listUserChannels(
      signer.address
    );
    
    progress.succeed('Channels loaded successfully');
    
    // Display channels
    if (channels.length === 0) {
      console.log('\n' + chalk.yellow('📭 No channels found'));
      console.log(chalk.gray('You haven\'t created or joined any channels yet.'));
      console.log('\n' + chalk.cyan('💡 Get started:'));
      console.log('  • Create a channel: ' + chalk.cyan('ghostspeak channel create <name>'));
      console.log('  • Join a channel: ' + chalk.cyan('ghostspeak channel join <channel-id>'));
    } else {
      console.log('\n' + chalk.green(`📡 Found ${channels.length} channel${channels.length > 1 ? 's' : ''}:`));
      console.log(chalk.gray('─'.repeat(80)));
      
      // Apply filters if provided
      let filteredChannels = channels;
      
      if (options?.includePrivate === false) {
        filteredChannels = filteredChannels.filter(ch => !ch.metadata.isPrivate);
      }
      
      if (options?.participantFilter) {
        filteredChannels = filteredChannels.filter(ch => 
          ch.participants.some(p => p.toString() === options.participantFilter?.toString())
        );
      }
      
      // Sort by last activity (most recent first)
      filteredChannels.sort((a, b) => 
        b.lastActivity.toNumber() - a.lastActivity.toNumber()
      );
      
      // Create table data
      const tableData = filteredChannels.map((channel, index) => {
        const visibility = channel.metadata.isPrivate ? '🔒 Private' : '🌍 Public';
        const participants = `${channel.participants.length}${channel.metadata.maxParticipants ? `/${channel.metadata.maxParticipants}` : ''}`;
        const lastActivity = new Date(channel.lastActivity.toNumber() * 1000).toLocaleDateString();
        
        return [
          (index + 1).toString(),
          channel.metadata.name,
          visibility,
          participants,
          lastActivity,
          channel.id.toString().substring(0, 8) + '...'
        ];
      });
      
      createTable(
        ['#', 'Name', 'Visibility', 'Participants', 'Last Activity', 'Channel ID'],
        tableData
      );
      
      if (filteredChannels.length < channels.length) {
        console.log('\n' + chalk.gray(`(Showing ${filteredChannels.length} of ${channels.length} channels based on filters)`));
      }
      
      console.log('\n' + chalk.yellow('💡 Actions:'));
      console.log('  • View channel details: ' + chalk.cyan('ghostspeak channel info <channel-id>'));
      console.log('  • Send a message: ' + chalk.cyan('ghostspeak channel message <channel-id> "Hello!"'));
      console.log('  • Leave a channel: ' + chalk.cyan('ghostspeak channel leave <channel-id>'));
    }
    
    // Log debug info
    logger.channel.debug('Raw channel data:', channels);
    
  } catch (error) {
    progress.fail('Failed to fetch channels');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show user-friendly error messages
    if (errorMessage.includes('network')) {
      showError(
        'Network connection error',
        'Unable to connect to Solana network. Please check your internet connection and try again.'
      );
    } else if (errorMessage.includes('wallet')) {
      showError(
        'Wallet not found',
        'Please ensure you have a valid wallet configured. Run "ghostspeak config" to set up your wallet.'
      );
    } else {
      showError(
        'Failed to list channels',
        errorMessage
      );
    }
    
    logger.channel.error('Channel listing error:', error);
  }
}

// TODO: Add more channel operations as SDK expands
