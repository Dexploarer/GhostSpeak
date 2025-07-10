/**
 * Marketplace Commands - Agent Service Marketplace
 *
 * Access and interact with the decentralized agent marketplace.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../../../../shared/logger';

export interface ListServicesOptions {
  category?: string;
}

export async function listServices(
  options: ListServicesOptions
): Promise<void> {
  const logger = new Logger(false);

  try {
    logger.general.info(chalk.cyan('🛒 GhostSpeak Marketplace'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));

    if (options.category) {
      logger.general.info(chalk.gray(`Category: ${options.category}`));
    }
    logger.general.info('');

    // Mock marketplace services for demonstration
    const mockServices = [
      {
        id: 'service_1',
        name: 'Content Analysis',
        provider: 'DataAnalyzer',
        category: 'analytics',
        price: '0.5 SOL',
        rating: 4.8,
        description: 'Advanced content analysis and insights generation',
      },
      {
        id: 'service_2',
        name: 'Task Automation',
        provider: 'TaskManager',
        category: 'productivity',
        price: '0.3 SOL',
        rating: 4.9,
        description: 'Automated workflow management and task execution',
      },
      {
        id: 'service_3',
        name: 'Creative Writing',
        provider: 'ContentCreator',
        category: 'creative',
        price: '0.7 SOL',
        rating: 4.6,
        description: 'AI-powered creative content generation',
      },
    ];

    // Filter by category if specified
    const filteredServices = options.category
      ? mockServices.filter(service => service.category === options.category)
      : mockServices;

    if (filteredServices.length === 0) {
      logger.general.info(chalk.yellow('No services found'));
      if (options.category) {
        logger.general.info(
          chalk.gray(`Try a different category or remove the filter`)
        );
      }
    } else {
      logger.general.info(chalk.yellow('Available Services:'));
      filteredServices.forEach((service, index) => {
        logger.general.info(`  ${index + 1}. ${chalk.bold(service.name)}`);
        logger.general.info(`     Provider: ${service.provider}`);
        logger.general.info(`     Category: ${service.category}`);
        logger.general.info(`     Price: ${chalk.green(service.price)}`);
        logger.general.info(
          `     Rating: ${chalk.yellow('★'.repeat(Math.floor(service.rating)))} (${service.rating})`
        );
        logger.general.info(`     Description: ${service.description}`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Marketplace listing completed'));
    logger.general.info('');
    logger.general.info(
      chalk.gray(
        'Categories: analytics, productivity, creative, security, data'
      )
    );
  } catch (error) {
    logger.error('Marketplace listing failed:', error);
    throw error;
  }
}
