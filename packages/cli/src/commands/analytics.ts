/**
 * Analytics Commands - System Analytics and Metrics
 *
 * Provides comprehensive analytics and performance metrics for the GhostSpeak platform.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import {
  getRpc,
  getProgramId,
  getCommitment,
  getGhostspeakSdk,
} from '../context-helpers';

interface AnalyticsData {
  transactions: {
    total: number;
    successful: number;
    failed: number;
    avgProcessingTime: number;
  };
  agents: {
    total: number;
    active: number;
    inactive: number;
    topPerformers: Array<{ name: string; score: number }>;
  };
  channels: {
    total: number;
    active: number;
    messageCount: number;
    avgResponseTime: number;
  };
  escrow: {
    totalVolume: number;
    activeDeposits: number;
    completedTransactions: number;
    averageAmount: number;
  };
}

export async function showDashboard(period: string = 'week'): Promise<void> {
  const cliLogger = new Logger(false);

  try {
    cliLogger.general.info(chalk.cyan('📊 GhostSpeak Analytics Dashboard'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(chalk.gray(`Time Period: ${period}`));
    cliLogger.general.info('');

    // Load configuration
    const config = await ConfigManager.load();
    cliLogger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));
    cliLogger.general.info('');

    // Fetch analytics data (mock data for now)
    const analytics = await fetchAnalyticsData(period);

    // Display transaction metrics
    displayTransactionMetrics(analytics.transactions, cliLogger);
    cliLogger.general.info('');

    // Display agent metrics
    displayAgentMetrics(analytics.agents, cliLogger);
    cliLogger.general.info('');

    // Display channel metrics
    displayChannelMetrics(analytics.channels, cliLogger);
    cliLogger.general.info('');

    // Display escrow metrics
    displayEscrowMetrics(analytics.escrow, cliLogger);
    cliLogger.general.info('');

    // Performance summary
    displayPerformanceSummary(analytics, cliLogger);

    cliLogger.general.info(chalk.green('✅ Analytics dashboard displayed successfully'));
  } catch (error) {
    cliLogger.error('Analytics dashboard failed:', error);
    throw error;
  }
}

export async function showAnalytics(): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('analytics');
    const commitment = await getCommitment();
    const analyticsService = new sdk.AnalyticsService(
      rpc,
      programId,
      commitment
    );
    const result = await analyticsService.getAnalytics();
    logger.analytics.info('📊 Analytics:', result);
  } catch (error) {
    logger.analytics.error('❌ Failed to show analytics:', error);
  }
}

function displayTransactionMetrics(transactions: AnalyticsData['transactions'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('🔄 Transaction Metrics:'));
  cliLogger.general.info(`  Total Transactions: ${chalk.cyan(transactions.total.toLocaleString())}`);
  cliLogger.general.info(`  Successful: ${chalk.green(transactions.successful.toLocaleString())} (${((transactions.successful / transactions.total) * 100).toFixed(1)}%)`);
  cliLogger.general.info(`  Failed: ${chalk.red(transactions.failed.toLocaleString())} (${((transactions.failed / transactions.total) * 100).toFixed(1)}%)`);
  cliLogger.general.info(`  Avg Processing Time: ${chalk.blue(transactions.avgProcessingTime.toFixed(2))}ms`);
}

function displayAgentMetrics(agents: AnalyticsData['agents'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('🤖 Agent Metrics:'));
  cliLogger.general.info(`  Total Agents: ${chalk.cyan(agents.total.toLocaleString())}`);
  cliLogger.general.info(`  Active: ${chalk.green(agents.active.toLocaleString())}`);
  cliLogger.general.info(`  Inactive: ${chalk.yellow(agents.inactive.toLocaleString())}`);
  cliLogger.general.info('  Top Performers:');
  agents.topPerformers.forEach((agent, index) => {
    cliLogger.general.info(`    ${index + 1}. ${agent.name} (Score: ${agent.score})`);
  });
}

function displayChannelMetrics(channels: AnalyticsData['channels'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('📡 Channel Metrics:'));
  cliLogger.general.info(`  Total Channels: ${chalk.cyan(channels.total.toLocaleString())}`);
  cliLogger.general.info(`  Active Channels: ${chalk.green(channels.active.toLocaleString())}`);
  cliLogger.general.info(`  Messages Sent: ${chalk.blue(channels.messageCount.toLocaleString())}`);
  cliLogger.general.info(`  Avg Response Time: ${chalk.blue(channels.avgResponseTime.toFixed(2))}ms`);
}

function displayEscrowMetrics(escrow: AnalyticsData['escrow'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('💰 Escrow Metrics:'));
  cliLogger.general.info(`  Total Volume: ${chalk.cyan(escrow.totalVolume.toFixed(2))} SOL`);
  cliLogger.general.info(`  Active Deposits: ${chalk.green(escrow.activeDeposits.toLocaleString())}`);
  cliLogger.general.info(`  Completed Transactions: ${chalk.blue(escrow.completedTransactions.toLocaleString())}`);
  cliLogger.general.info(`  Average Amount: ${chalk.blue(escrow.averageAmount.toFixed(4))} SOL`);
}

function displayPerformanceSummary(analytics: AnalyticsData, cliLogger: Logger): void {
  const successRate = (analytics.transactions.successful / analytics.transactions.total) * 100;
  const agentUtilization = (analytics.agents.active / analytics.agents.total) * 100;
  const channelUtilization = (analytics.channels.active / analytics.channels.total) * 100;

  cliLogger.general.info(chalk.yellow('📈 Performance Summary:'));
  
  // Success rate indicator
  const successColor = successRate >= 95 ? chalk.green : successRate >= 85 ? chalk.yellow : chalk.red;
  cliLogger.general.info(`  Success Rate: ${successColor(successRate.toFixed(1))}%`);
  
  // Agent utilization
  const agentColor = agentUtilization >= 70 ? chalk.green : agentUtilization >= 50 ? chalk.yellow : chalk.red;
  cliLogger.general.info(`  Agent Utilization: ${agentColor(agentUtilization.toFixed(1))}%`);
  
  // Channel utilization
  const channelColor = channelUtilization >= 60 ? chalk.green : channelUtilization >= 40 ? chalk.yellow : chalk.red;
  cliLogger.general.info(`  Channel Utilization: ${channelColor(channelUtilization.toFixed(1))}%`);

  // Overall health indicator
  const overallHealth = (successRate + agentUtilization + channelUtilization) / 3;
  const healthColor = overallHealth >= 80 ? chalk.green : overallHealth >= 60 ? chalk.yellow : chalk.red;
  cliLogger.general.info(`  Overall Health: ${healthColor(overallHealth.toFixed(1))}%`);
}

async function fetchAnalyticsData(period: string): Promise<AnalyticsData> {
  // Mock data - in real implementation, this would fetch from the blockchain
  const mockData: AnalyticsData = {
    transactions: {
      total: 12450,
      successful: 12108,
      failed: 342,
      avgProcessingTime: 1247.5
    },
    agents: {
      total: 156,
      active: 134,
      inactive: 22,
      topPerformers: [
        { name: 'DataAnalyzer', score: 98.5 },
        { name: 'TaskManager', score: 97.2 },
        { name: 'ContentCreator', score: 95.8 }
      ]
    },
    channels: {
      total: 89,
      active: 67,
      messageCount: 34567,
      avgResponseTime: 892.3
    },
    escrow: {
      totalVolume: 2456.78,
      activeDeposits: 23,
      completedTransactions: 145,
      averageAmount: 16.9434
    }
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return mockData;
}
