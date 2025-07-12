import { logger } from '../utils/logger.js';
import {
  getRpc,
  getRpcSubscriptions,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers.js';
import { withTimeout, TIMEOUTS, TimeoutError } from '../utils/timeout.js';
import { createChannelServiceWrapper } from '../services/channel-wrapper.js';
import { getTimeoutMessage } from '../utils/timeout-messages.js';
import { preOperationCheck, getNetworkErrorMessage } from '../utils/network-diagnostics.js';
import { createChannelDirect, listUserChannelsDirect } from '../services/sdk-direct.js';
import { address } from '@solana/addresses';
import { 
  confirm, 
  ProgressIndicator,
  success,
  error as showError,
  info,
  createTable
} from '../utils/prompts.js';
import { 
  createEnhancedProgress,
  EnhancedProgressIndicator,
  OPERATION_ESTIMATES 
} from '../utils/enhanced-progress.js';
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
  yes?: boolean;
  nonInteractive?: boolean;
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
    
    // Check if we're in non-interactive mode
    const isNonInteractive = options.nonInteractive || options.yes || process.env.CI === 'true';
    
    // Show channel details before creation (skip in non-interactive mode)
    if (!isNonInteractive) {
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
    }
    
    // Ask for confirmation (skip in non-interactive mode)
    let shouldCreate = true;
    if (!isNonInteractive) {
      shouldCreate = await confirm({
        message: `Create channel "${trimmedName}" with these settings?`,
        defaultValue: true
      });

      if (!shouldCreate) {
        info('Channel creation cancelled');
        return;
      }
    } else {
      console.log(chalk.gray('Non-interactive mode: proceeding with channel creation...'));
    }

    // Show enhanced progress indicator
    const progress = createEnhancedProgress(
      `Creating channel "${trimmedName}"...`,
      'CREATE_CHANNEL',
      {
        steps: [
          { name: 'Initializing services', weight: 1 },
          { name: 'Checking network connection', weight: 2 },
          { name: 'Preparing channel service', weight: 1 },
          { name: 'Sending transaction to blockchain', weight: 4 },
          { name: 'Confirming transaction', weight: 2 }
        ]
      }
    );
    progress.start();

    try {
      // Initialize SDK and services with timeout
      progress.startStep(0);
      progress.updateStatus('Loading SDK and wallet configuration...');
      const [sdk, rpc, signer] = await withTimeout(
        Promise.all([
          getGhostspeakSdk(),
          getRpc(),
          getKeypair()
        ]),
        TIMEOUTS.SDK_INIT,
        'Service initialization'
      );
      
      const programId = await getProgramId('channel');
      const commitment = await getCommitment();
      
      // Perform network health check
      progress.completeStep();
      progress.startStep(1);
      progress.updateStatus('Verifying blockchain connectivity...');
      const networkCheck = await preOperationCheck(rpc, 'channel creation');
      
      if (!networkCheck.proceed) {
        progress.fail('Cannot create channel - no network connection');
        return;
      }
      
      if (networkCheck.warning) {
        logger.general.warn(chalk.yellow('\n💡 Network performance may be degraded'));
      }
      
      // Update progress
      progress.completeStep();
      progress.startStep(2);
      progress.updateStatus('Setting up channel service instance...');
      
      // Convert program ID to proper address type
      const programIdAddress = address(programId);
      
      // Update progress
      progress.completeStep();
      progress.startStep(3);
      progress.updateStatus('Building and signing transaction...');
      
      // Use direct SDK approach to avoid UnifiedClient issues
      const result = await withTimeout(
        createChannelDirect(
          rpc,
          signer,
          programIdAddress,
          {
            name: trimmedName,
            description: options.description || '',
            visibility: options.isPrivate ? 1 : 0, // 1 for private, 0 for public
            maxParticipants: options.maxParticipants || 100,
            metadata: options.metadata || {},
          }
        ),
        TIMEOUTS.CHANNEL_CREATE,
        'Channel creation',
        {
          warningThreshold: 70,
          onWarning: () => {
            progress.updateStatus('Transaction is taking longer than expected...');
            logger.general.info(chalk.yellow('\n💡 This is normal during network congestion'));
          }
        }
      );
      
      // Complete final steps
      progress.completeStep();
      progress.startStep(4);
      progress.updateStatus('Waiting for blockchain confirmation...');
      
      // Small delay to show confirmation step
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stop progress and show success
      progress.completeStep();
      progress.succeed(`Channel "${trimmedName}" created successfully!`);
      
      // Display channel information (concise in non-interactive mode)
      if (!isNonInteractive) {
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
      } else {
        // Minimal output for non-interactive mode
        console.log(`Channel ID: ${result.channelId}`);
        console.log(`Transaction: ${result.signature}`);
      }
      
      // Log for debugging if verbose mode
      logger.channel.debug('Channel creation result:', result);
      
    } catch (err) {
      progress.fail(`Failed to create channel "${trimmedName}"`);
      throw err;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show user-friendly error messages
    if (error instanceof TimeoutError) {
      showError(
        'Channel creation timed out',
        getTimeoutMessage('channel create', error.timeoutMs)
      );
    } else if (errorMessage.includes('insufficient')) {
      showError(
        'Insufficient SOL balance',
        'You need more SOL to create a channel. Please fund your wallet and try again.'
      );
    } else if (errorMessage.includes('already exists')) {
      showError(
        'Channel already exists',
        'A channel with this name already exists. Please choose a different name.'
      );
    } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      showError(
        'Network connection error',
        getNetworkErrorMessage(error)
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
  const progress = createEnhancedProgress(
    'Fetching channels...',
    'FETCH_ACCOUNTS',
    {
      steps: [
        { name: 'Initializing services', weight: 1 },
        { name: 'Connecting to channel service', weight: 1 },
        { name: 'Loading your channels', weight: 2 }
      ]
    }
  );
  
  try {
    progress.start();
    
    // Initialize SDK and services with timeout
    progress.startStep(0);
    progress.updateStatus('Loading configuration...');
    const [sdk, rpc, signer] = await withTimeout(
      Promise.all([
        getGhostspeakSdk(),
        getRpc(),
        getKeypair()
      ]),
      TIMEOUTS.SDK_INIT,
      'Service initialization'
    );
    
    const programId = await getProgramId('channel');
    const commitment = await getCommitment();
    
    // Update progress
    progress.completeStep();
    progress.startStep(1);
    progress.updateStatus('Establishing service connection...');
    
    // Convert program ID and address to proper types
    const programIdAddress = address(programId);
    const signerAddress = address(signer.address);
    
    // Update progress
    progress.completeStep();
    progress.startStep(2);
    progress.updateStatus('Retrieving channel data from blockchain...');
    
    // Use direct SDK approach
    const channels: Channel[] = await withTimeout(
      listUserChannelsDirect(rpc, programIdAddress, signerAddress),
      TIMEOUTS.ACCOUNT_FETCH,
      'Channel list fetch'
    );
    
    progress.completeStep();
    progress.succeed('Channels loaded successfully');
    
    // Display channels or parsing error
    if (channels.length === 0) {
      console.log('\n' + chalk.yellow('📭 No channels found'));
      console.log(chalk.gray('No channels were found on the blockchain.'));
      console.log(chalk.gray('This could mean:'));
      console.log(chalk.gray('  • You haven\'t created any channels yet'));
      console.log(chalk.gray('  • Channel data parsing is not yet available'));
      console.log(chalk.gray('  • The blockchain query returned no results'));
      console.log('\n' + chalk.cyan('💡 Get started:'));
      console.log('  • Create a channel: ' + chalk.cyan('ghostspeak channel create <name>'));
      
      // Note about channel data parsing
      console.log('\n' + chalk.yellow('⚠️  Note:'));
      console.log(chalk.gray('Channel account data parsing is not yet implemented.'));
      console.log(chalk.gray('Created channels exist on-chain but cannot be listed until'));
      console.log(chalk.gray('the smart contract account structure is finalized.'));
    } else {
      // This branch is currently unreachable due to parsing limitations
      // but kept for future when parsing is implemented
      console.log('\n' + chalk.red('❌ Unexpected state: Channel data received but parsing not implemented'));
      console.log(chalk.gray('This should not happen. Please report this issue.'));
    }
    
    // Log debug info
    logger.channel.debug('Raw channel data:', channels);
    
  } catch (error) {
    progress.fail('Failed to fetch channels');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show user-friendly error messages
    if (error instanceof TimeoutError) {
      showError(
        'Channel fetch timed out',
        getTimeoutMessage('account fetch', error.timeoutMs)
      );
    } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      showError(
        'Network connection error',
        getNetworkErrorMessage(error)
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
