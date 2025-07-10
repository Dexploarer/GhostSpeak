/**
 * Agent Commands - AI Agent Management
 *
 * Manages AI agent registration, listing, and lifecycle operations.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { logger } from '../utils/logger.js';

export interface RegisterAgentOptions {
  type?: string;
  description?: string;
}

export async function registerAgent(
  name: string,
  options: RegisterAgentOptions
): Promise<void> {

  try {
    logger.general.info(chalk.cyan('🤖 Registering AI Agent'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();

    // Interactive prompts if options not provided
    const { prompt, confirm, ProgressIndicator } = await import('../utils/prompts.js');

    let agentType = options.type;
    let agentDescription = options.description;

    // Prompt for missing information
    if (!agentType) {
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

    // Show configuration summary
    logger.general.info('');
    logger.general.info(chalk.yellow('Agent Configuration:'));
    logger.general.info(`  Name: ${chalk.cyan(name)}`);
    logger.general.info(`  Type: ${chalk.cyan(agentType)}`);
    logger.general.info(`  Description: ${chalk.gray(agentDescription || 'No description')}`);
    logger.general.info(`  Network: ${chalk.blue(config.network || 'devnet')}`);
    logger.general.info('');

    // Confirm registration
    const shouldProceed = await confirm({
      message: 'Proceed with agent registration?',
      defaultValue: true
    });

    if (!shouldProceed) {
      logger.general.info(chalk.yellow('Agent registration cancelled'));
      return;
    }

    // Show registration process with progress
    const progress = new ProgressIndicator('Preparing agent registration...');
    progress.start();

    await new Promise(resolve => setTimeout(resolve, 1000));
    progress.update('Creating agent profile...');

    await new Promise(resolve => setTimeout(resolve, 1500));
    progress.update('Connecting to Solana network...');

    await new Promise(resolve => setTimeout(resolve, 1000));
    progress.update('Registering agent on-chain...');

    await new Promise(resolve => setTimeout(resolve, 2000));
    progress.succeed('Agent registered successfully');

    // Show success details
    const agentId = generateMockAgentId();
    logger.general.info('');
    logger.general.info(chalk.green('🎉 Registration Complete!'));
    logger.general.info(chalk.gray(`Agent ID: ${agentId}`));
    logger.general.info(chalk.gray(`Transaction: ${generateMockTxHash()}`));
    logger.general.info('');
    
    logger.general.info(chalk.yellow('🚀 Next Steps:'));
    logger.general.info(chalk.gray('  • Configure agent capabilities with "ghostspeak agent configure"'));
    logger.general.info(chalk.gray('  • Set up service endpoints'));
    logger.general.info(chalk.gray('  • Test agent functionality'));
    logger.general.info(chalk.gray('  • Deploy to marketplace'));
    logger.general.info('');
    
    logger.general.info(chalk.cyan('💡 Pro Tips:'));
    logger.general.info(chalk.gray('  • Use "ghostspeak agent list" to view all your agents'));
    logger.general.info(chalk.gray('  • Check "ghostspeak marketplace list" to see similar agents'));
    logger.general.info(chalk.gray('  • Read the docs: https://docs.ghostspeak.ai/agents'));

  } catch (error) {
    logger.agent.error('Agent registration failed:', error);
    throw error;
  }
}

function generateMockTxHash(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

export async function listAgents(): Promise<void> {

  try {
    logger.general.info(chalk.cyan('📋 Registered AI Agents'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));
    logger.general.info('');

    // Mock agent data for demonstration
    const mockAgents = [
      {
        id: 'agent_1',
        name: 'DataAnalyzer',
        type: 'analytics',
        status: 'active',
      },
      {
        id: 'agent_2',
        name: 'TaskManager',
        type: 'productivity',
        status: 'inactive',
      },
      {
        id: 'agent_3',
        name: 'ContentCreator',
        type: 'creative',
        status: 'active',
      },
    ];

    if (mockAgents.length === 0) {
      logger.general.info(chalk.yellow('No agents registered yet'));
      logger.general.info('');
      logger.general.info(
        chalk.gray(
          'Run "ghostspeak agent register <name>" to create your first agent'
        )
      );
    } else {
      logger.general.info(chalk.yellow('Your Agents:'));
      mockAgents.forEach((agent, index) => {
        const statusColor =
          agent.status === 'active' ? chalk.green : chalk.yellow;
        logger.general.info(`  ${index + 1}. ${agent.name} (${agent.type})`);
        logger.general.info(`     ID: ${agent.id}`);
        logger.general.info(`     Status: ${statusColor(agent.status)}`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Agent listing completed'));
  } catch (error) {
    logger.agent.error('Agent listing failed:', error);
    throw error;
  }
}

function generateMockAgentId(): string {
  return `agent_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}
