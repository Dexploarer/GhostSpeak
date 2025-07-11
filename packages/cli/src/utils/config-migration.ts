/**
 * Configuration Migration Utility
 * 
 * Helps migrate from old CLI-only configuration to the new shared configuration system
 */

import { existsSync } from 'fs';
import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { ConfigManager, type GhostSpeakConfig } from '../core/ConfigManager.js';
// import { SharedConfig } from '@ghostspeak/sdk/config';
import { logger } from './logger.js';

export async function migrateConfiguration(): Promise<boolean> {
  const oldConfigPath = join(homedir(), '.ghostspeak', 'config.json');
  const newConfigPath = join(homedir(), '.ghostspeak', 'shared-config.json');
  
  // Check if migration is needed
  if (!existsSync(oldConfigPath)) {
    logger.general.info(chalk.gray('No legacy configuration found'));
    return false;
  }
  
  if (existsSync(newConfigPath)) {
    logger.general.info(chalk.yellow('Shared configuration already exists'));
    return false;
  }
  
  logger.general.info(chalk.cyan('🔄 Migrating configuration to new shared system...'));
  
  try {
    // Load old config
    const oldConfigData = await readFile(oldConfigPath, 'utf8');
    const oldConfig: GhostSpeakConfig = JSON.parse(oldConfigData);
    
    // Load new shared config system
    // const sharedConfig = await SharedConfig.load();
    
    // Migrate network settings
    await sharedConfig.setNetwork({
      network: oldConfig.network,
      rpcUrl: oldConfig.rpcUrl || getDefaultRpcUrl(oldConfig.network),
    });
    
    // Migrate agents
    for (const [name, agent] of Object.entries(oldConfig.agents)) {
      await sharedConfig.addAgent({
        name,
        address: agent.address as any, // Will need proper conversion
        type: agent.type,
        description: agent.description,
        createdAt: new Date(agent.lastUsed),
        lastUsed: new Date(agent.lastUsed),
      });
    }
    
    // Migrate channels
    for (const [name, channel] of Object.entries(oldConfig.channels)) {
      await sharedConfig.addChannel({
        name,
        address: channel.address as any, // Will need proper conversion
        type: channel.type,
        description: channel.description,
        createdAt: new Date(channel.lastUsed),
        lastUsed: new Date(channel.lastUsed),
      });
    }
    
    // Migrate developer settings
    await sharedConfig.update({
      developer: {
        debugMode: oldConfig.developer.debugMode,
        verboseLogging: oldConfig.verbose,
        showTransactionDetails: oldConfig.developer.showTransactionDetails,
        simulateTransactions: true,
      },
    });
    
    // Migrate security settings
    await sharedConfig.update({
      security: {
        confirmTransactions: oldConfig.security.confirmTransactions,
        maxTransactionValue: BigInt(oldConfig.security.maxTransactionValue),
        requireApprovalForLargeTransactions: oldConfig.security.requirePinForLargeTransactions,
        encryptLocalStorage: false,
      },
    });
    
    // Set current state
    if (oldConfig.defaultAgent) {
      await sharedConfig.update({
        state: {
          currentAgent: oldConfig.defaultAgent,
          currentChannel: oldConfig.defaultChannel,
        },
      });
    }
    
    // Backup old config
    const backupPath = `${oldConfigPath}.backup.${Date.now()}`;
    await rename(oldConfigPath, backupPath);
    
    logger.general.info(chalk.green('✅ Configuration migrated successfully'));
    logger.general.info(chalk.gray(`Old config backed up to: ${backupPath}`));
    
    // Show migration summary
    logger.general.info('');
    logger.general.info(chalk.yellow('Migration Summary:'));
    logger.general.info(`  Agents migrated: ${Object.keys(oldConfig.agents).length}`);
    logger.general.info(`  Channels migrated: ${Object.keys(oldConfig.channels).length}`);
    logger.general.info(`  Network: ${oldConfig.network}`);
    logger.general.info('');
    
    return true;
  } catch (error) {
    logger.general.error(chalk.red('❌ Configuration migration failed:'), error);
    return false;
  }
}

function getDefaultRpcUrl(network: string): string {
  switch (network) {
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    default:
      return 'https://api.devnet.solana.com';
  }
}

/**
 * Check if configuration needs migration
 */
export async function needsMigration(): Promise<boolean> {
  const oldConfigPath = join(homedir(), '.ghostspeak', 'config.json');
  const newConfigPath = join(homedir(), '.ghostspeak', 'shared-config.json');
  
  return existsSync(oldConfigPath) && !existsSync(newConfigPath);
}