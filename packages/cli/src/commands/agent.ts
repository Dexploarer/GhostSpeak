/**
 * Agent Commands - AI Agent Management
 *
 * Manages AI agent registration, listing, and lifecycle operations.
 * Now integrated with the SDK for real blockchain operations.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { logger } from '../utils/logger.js';
import { UnifiedClient } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import { TimeoutError } from '../utils/timeout.js';
import { ErrorHandler } from '../services/error-handler.js';
import { withTimeout, TIMEOUTS, withTimeoutAndRetry } from '../utils/timeout.js';
import { preOperationCheck, getNetworkRetryConfig } from '../utils/network-diagnostics.js';

export interface RegisterAgentOptions {
  type?: string;
  description?: string;
  yes?: boolean;
  nonInteractive?: boolean;
}

// Get or create unified client instance
let unifiedClient: UnifiedClient | null = null;

async function getUnifiedClient(): Promise<UnifiedClient> {
  if (!unifiedClient) {
    try {
      logger.general.debug('Initializing GhostSpeak SDK...');
      
      // Create client with timeout protection
      unifiedClient = await withTimeout(
        UnifiedClient.create({
          autoStartSession: true,
        }),
        TIMEOUTS.SDK_INIT,
        'SDK initialization'
      );
      
      logger.general.debug('SDK initialized successfully');
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'SDK initialization',
        suggestion: 'Run "ghostspeak doctor" to diagnose connection issues'
      });
    }
  }
  return unifiedClient;
}

export async function registerAgent(
  name: string,
  options: RegisterAgentOptions
): Promise<void> {
  try {
    // Validate agent name early to fail fast
    const trimmedName = name?.trim() || '';
    
    if (!trimmedName) {
      logger.general.error(chalk.red('❌ Error: Agent name cannot be empty'));
      logger.general.info(chalk.gray('Please provide a valid agent name'));
      logger.general.info(chalk.gray('Example: ghostspeak agent register MyAgent'));
      // Force immediate exit to prevent any hanging
      process.exit(1);
    }
    
    // Validate name length
    if (trimmedName.length < 2) {
      logger.general.error(chalk.red('❌ Error: Agent name must be at least 2 characters long'));
      process.exit(1);
    }
    
    if (trimmedName.length > 50) {
      logger.general.error(chalk.red('❌ Error: Agent name must be 50 characters or less'));
      process.exit(1);
    }
    
    // Validate name format (alphanumeric, underscores, hyphens)
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(trimmedName)) {
      logger.general.error(chalk.red('❌ Error: Agent name can only contain letters, numbers, underscores, and hyphens'));
      logger.general.info(chalk.gray('Invalid characters detected in: ' + name));
      logger.general.info(chalk.gray('Valid examples: MyAgent, agent_123, ai-helper'));
      process.exit(1);
    }
    
    // Check for reserved names
    const reservedNames = ['agent', 'system', 'admin', 'test', 'null', 'undefined'];
    if (reservedNames.includes(trimmedName.toLowerCase())) {
      logger.general.error(chalk.red(`❌ Error: "${trimmedName}" is a reserved name`));
      logger.general.info(chalk.gray('Please choose a different name'));
      process.exit(1);
    }
    
    // Use the validated trimmed name
    const validatedName = trimmedName;
    
    logger.general.info(chalk.cyan('🤖 Registering AI Agent'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Check if we're in non-interactive mode
    const isNonInteractive = options.nonInteractive || options.yes || process.env.CI === 'true';
    
    // Interactive prompts if options not provided and not in non-interactive mode
    const { prompt, confirm, ProgressIndicator } = await import('../utils/prompts.js');

    let agentType = options.type || 'general';
    let agentDescription = options.description;

    // Prompt for missing information only in interactive mode
    if (!isNonInteractive) {
      if (!options.type) {
        const { select } = await import('../utils/prompts.js');
        agentType = await select({
          message: 'Select agent type:',
          choices: [
            { name: 'General Purpose', value: 'general', description: 'Multi-purpose AI agent' },
            { name: 'Analytics', value: 'analytics', description: 'Data analysis and insights' },
            { name: 'Productivity', value: 'productivity', description: 'Task automation and management' },
            { name: 'Creative', value: 'creative', description: 'Content creation and design' },
            { name: 'Trading', value: 'trading', description: 'DeFi and trading operations' },
            { name: 'Custom', value: 'custom', description: 'Specialized custom agent' }
          ],
          defaultIndex: 0
        });
      }

      if (!agentDescription) {
        agentDescription = await prompt({
          message: 'Enter agent description',
          defaultValue: `A ${agentType} AI agent`,
          required: false
        });
      }
    } else {
      // In non-interactive mode, use defaults if not provided
      if (!agentDescription) {
        agentDescription = `A ${agentType} AI agent`;
      }
    }

    // Get unified client configuration - required for blockchain operations
    const client = await getUnifiedClient();
    const config = client.getConfig();
    const keypair = client.getKeypair();
    
    // Check if wallet is configured
    if (!keypair) {
      logger.general.error(chalk.red('❌ Error: No wallet configured'));
      logger.general.info('');
      logger.general.info(chalk.yellow('💡 To register agents on the blockchain, you need a wallet:'));
      logger.general.info(chalk.gray('  • Run "ghostspeak quickstart" to set up your wallet'));
      logger.general.info(chalk.gray('  • Or configure manually with "solana-keygen new"'));
      logger.general.info('');
      process.exit(1);
    }

    // Show configuration summary
    logger.general.info('');
    logger.general.info(chalk.yellow('Agent Configuration:'));
    logger.general.info(`  Name: ${chalk.cyan(validatedName)}`);
    logger.general.info(`  Type: ${chalk.cyan(agentType)}`);
    logger.general.info(`  Description: ${chalk.gray(agentDescription || 'No description')}`);
    logger.general.info(`  Network: ${chalk.blue(config.network.network)}`);
    logger.general.info(`  Wallet: ${chalk.gray(keypair.publicKey.toBase58())}`);
    logger.general.info('');

    // Confirm registration (skip in non-interactive mode)
    let shouldProceed = true;
    if (!isNonInteractive) {
      shouldProceed = await confirm({
        message: 'Proceed with agent registration on-chain?',
        defaultValue: true
      });

      if (!shouldProceed) {
        logger.general.info(chalk.yellow('Agent registration cancelled'));
        return;
      }
    } else {
      logger.general.info(chalk.gray('Non-interactive mode: proceeding with registration...'));
    }

    // Show registration process with progress
    const progress = new ProgressIndicator('Preparing agent registration...');
    progress.start();

    try {
      progress.update('Creating agent profile...');
      
      // Define capabilities based on agent type
      const capabilities = getCapabilitiesForType(agentType);
      
      progress.update('Connecting to Solana network...');
      progress.update('Registering agent on-chain...');
      
      // Register agent on blockchain with retry logic
      const result = await withTimeoutAndRetry(
        () => client.registerAgent(
          validatedName,
          agentType,
          agentDescription,
          capabilities
        ),
        'Agent registration',
        TIMEOUTS.AGENT_REGISTER,
        getNetworkRetryConfig({
          maxRetries: 2,  // Less retries for registration to avoid duplicates
        }),
        {
          showRetryHint: true,
          warningThreshold: 70
        }
      );
      
      progress.succeed('Agent registered successfully');

      // Show success details
      logger.general.info('');
      logger.general.info(chalk.green('🎉 Agent Successfully Registered on Blockchain!'));
      logger.general.info(chalk.gray(`Agent Address: ${result.address}`));
      logger.general.info(chalk.gray(`Transaction: ${result.signature}`));
      logger.general.info('');
      
      logger.general.info(chalk.yellow('🚀 Next Steps:'));
      logger.general.info(chalk.gray('  • View your agent with "ghostspeak agent list"'));
      logger.general.info(chalk.gray('  • Configure capabilities with "ghostspeak agent configure"'));
      logger.general.info(chalk.gray('  • Set up service endpoints'));
      logger.general.info(chalk.gray('  • Test agent functionality'));
      logger.general.info('');
      logger.general.info(chalk.cyan('💡 Pro Tips:'));
      logger.general.info(chalk.gray('  • Check "ghostspeak marketplace list" to see similar agents'));
      logger.general.info(chalk.gray('  • Use "ghostspeak help agent" for more information'));
      
    } catch (error) {
      progress.fail('Agent registration failed');
      throw error;
    }

  } catch (error) {
    logger.agent.error('Agent registration failed:', error);
    throw error;
  }
}


export async function listAgents(): Promise<void> {
  try {
    logger.general.info(chalk.cyan('📋 Registered AI Agents'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Get unified client - required for blockchain operations
    const client = await getUnifiedClient();
    const config = client.getConfig();
    const keypair = client.getKeypair();
    
    // Check if wallet is configured
    if (!keypair) {
      logger.general.error(chalk.red('\u274c Error: No wallet configured'));
      logger.general.info('');
      logger.general.info(chalk.yellow('💡 To view blockchain agents, you need a wallet:'));
      logger.general.info(chalk.gray('  • Run "ghostspeak quickstart" to set up your wallet'));
      logger.general.info(chalk.gray('  • Or configure manually with "solana-keygen new"'));
      logger.general.info('');
      process.exit(1);
    }
    
    // Get agents from blockchain with retry logic
    const agents = await withTimeoutAndRetry(
      () => client.listAgents(),
      'Agent listing',
      TIMEOUTS.ACCOUNT_FETCH,
      getNetworkRetryConfig(),
      { showRetryHint: true }
    );
    
    logger.general.info(chalk.gray(`Network: ${config.network.network}`));
    logger.general.info('');

    if (agents.length === 0) {
      logger.general.info(chalk.yellow('No agents registered on blockchain yet'));
      logger.general.info('');
      logger.general.info(
        chalk.gray(
          'Run "ghostspeak agent register <name>" to create your first agent'
        )
      );
    } else {
      logger.general.info(chalk.yellow('Your On-Chain Agents:'));
      agents.forEach((agent, index) => {
        logger.general.info(`  ${index + 1}. ${agent.name} (${agent.type})`);
        logger.general.info(`     Address: ${chalk.gray(agent.address)}`);
        logger.general.info(`     Status: ${chalk.green('on-chain')}`);
        if (agent.description) {
          logger.general.info(`     Description: ${chalk.gray(agent.description)}`);
        }
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Agent listing completed'));
  } catch (error) {
    logger.agent.error('Agent listing failed:', error);
    throw error;
  }
}


function getCapabilitiesForType(type: string): string[] {
  const capabilityMap: Record<string, string[]> = {
    general: ['data-processing', 'task-automation', 'api-integration'],
    analytics: ['data-analysis', 'reporting', 'visualization', 'prediction'],
    productivity: ['task-management', 'scheduling', 'automation', 'workflow'],
    creative: ['content-generation', 'design', 'editing', 'multimedia'],
    trading: ['market-analysis', 'trading-signals', 'portfolio-management', 'defi'],
    custom: ['custom-capability'],
  };
  
  return capabilityMap[type] || capabilityMap.general;
}
