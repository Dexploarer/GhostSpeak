/**
 * Analytics Commands - System Analytics and Metrics
 *
 * Provides comprehensive analytics and performance metrics for the GhostSpeak platform.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import { isVerboseMode } from '../utils/cli-options.js';
import { ProgressIndicator } from '../utils/prompts.js';
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import { LazyModules } from '@ghostspeak/sdk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Real analytics service instance
let analyticsService: any = null;
let rpcClient: any = null;

async function getAnalyticsService() {
  if (!analyticsService) {
    try {
      // Load configuration
      const config = await ConfigManager.load();
      const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
      const programId = address(config.programId || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK');
      
      // Create RPC client
      rpcClient = createSolanaRpc(rpcUrl);
      
      // Load analytics service from SDK - connecting to actual PodAI program
      const analyticsModule = await LazyModules.analytics;
      analyticsService = new analyticsModule.AnalyticsService(rpcClient, programId);
      
      logger.general.debug('Analytics service initialized successfully');
    } catch (error) {
      logger.general.error('Failed to initialize analytics service:', error);
      throw error;
    }
  }
  return analyticsService;
}

interface TransactionRecord {
  signature: string;
  type: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  details?: any;
}

interface SessionState {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  activeAgent?: string;
  activeChannel?: string;
  pendingTransactions: TransactionRecord[];
  completedTransactions: TransactionRecord[];
}

interface RuntimeState {
  sessions: Record<string, SessionState>;
  currentSessionId?: string;
  globalStats: {
    totalTransactions: number;
    totalAgentsCreated: number;
    totalChannelsCreated: number;
    totalMessagessSent: number;
  };
}

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
  const cliLogger = new Logger(isVerboseMode());

  try {
    cliLogger.general.info(chalk.cyan('📊 GhostSpeak Analytics Dashboard'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(chalk.gray(`Time Period: ${period}`));
    cliLogger.general.info('');

    // Load configuration
    const config = await ConfigManager.load();
    cliLogger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));
    
    // Check if using real data
    try {
      const state = await loadSharedState();
      const hasRealData = state && (state.globalStats.totalTransactions > 0 || 
                                   Object.keys(state.sessions).length > 0);
      
      if (hasRealData) {
        cliLogger.general.info(chalk.green(`Data Source: Blockchain`));
        cliLogger.general.info(chalk.gray(`Active Sessions: ${Object.keys(state.sessions).length}`));
      } else {
        cliLogger.general.info(chalk.gray(`Data Source: No blockchain data available`));
      }
    } catch {
      cliLogger.general.info(chalk.gray(`Data Source: No blockchain data available`));
    }
    
    cliLogger.general.info('');

    // Fetch analytics data (now with real data support)
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
    // Get real analytics service connected to deployed PodAI program
    const analyticsService = await getAnalyticsService();
    const result = await analyticsService.getAnalytics();
    logger.analytics.info('📊 Analytics:', result);
  } catch (error) {
    logger.analytics.error('❌ Failed to show analytics:', error);
    throw error;
  }
}

function displayTransactionMetrics(transactions: AnalyticsData['transactions'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('🔄 Transaction Metrics:'));
  if (transactions.total === 0) {
    cliLogger.general.info(chalk.gray('  No transaction data available'));
    return;
  }
  cliLogger.general.info(`  Total Transactions: ${chalk.cyan(transactions.total.toLocaleString())}`);
  cliLogger.general.info(`  Successful: ${chalk.green(transactions.successful.toLocaleString())} (${((transactions.successful / transactions.total) * 100).toFixed(1)}%)`);
  cliLogger.general.info(`  Failed: ${chalk.red(transactions.failed.toLocaleString())} (${((transactions.failed / transactions.total) * 100).toFixed(1)}%)`);
  cliLogger.general.info(`  Avg Processing Time: ${chalk.blue(transactions.avgProcessingTime.toFixed(2))}ms`);
}

function displayAgentMetrics(agents: AnalyticsData['agents'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('🤖 Agent Metrics:'));
  if (agents.total === 0) {
    cliLogger.general.info(chalk.gray('  No agent data available'));
    return;
  }
  cliLogger.general.info(`  Total Agents: ${chalk.cyan(agents.total.toLocaleString())}`);
  cliLogger.general.info(`  Active: ${chalk.green(agents.active.toLocaleString())}`);
  cliLogger.general.info(`  Inactive: ${chalk.yellow(agents.inactive.toLocaleString())}`);
  if (agents.topPerformers.length > 0) {
    cliLogger.general.info('  Top Performers:');
    agents.topPerformers.forEach((agent, index) => {
      cliLogger.general.info(`    ${index + 1}. ${agent.name} (Score: ${agent.score})`);
    });
  }
}

function displayChannelMetrics(channels: AnalyticsData['channels'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('📡 Channel Metrics:'));
  if (channels.total === 0) {
    cliLogger.general.info(chalk.gray('  No channel data available'));
    return;
  }
  cliLogger.general.info(`  Total Channels: ${chalk.cyan(channels.total.toLocaleString())}`);
  cliLogger.general.info(`  Active Channels: ${chalk.green(channels.active.toLocaleString())}`);
  cliLogger.general.info(`  Messages Sent: ${chalk.blue(channels.messageCount.toLocaleString())}`);
  cliLogger.general.info(`  Avg Response Time: ${chalk.blue(channels.avgResponseTime.toFixed(2))}ms`);
}

function displayEscrowMetrics(escrow: AnalyticsData['escrow'], cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('💰 Escrow Metrics:'));
  if (escrow.completedTransactions === 0 && escrow.activeDeposits === 0) {
    cliLogger.general.info(chalk.gray('  No escrow data available'));
    return;
  }
  cliLogger.general.info(`  Total Volume: ${chalk.cyan(escrow.totalVolume.toFixed(2))} SOL`);
  cliLogger.general.info(`  Active Deposits: ${chalk.green(escrow.activeDeposits.toLocaleString())}`);
  cliLogger.general.info(`  Completed Transactions: ${chalk.blue(escrow.completedTransactions.toLocaleString())}`);
  cliLogger.general.info(`  Average Amount: ${chalk.blue(escrow.averageAmount.toFixed(4))} SOL`);
}

function displayPerformanceSummary(analytics: AnalyticsData, cliLogger: Logger): void {
  cliLogger.general.info(chalk.yellow('📈 Performance Summary:'));
  
  // Check if we have any data to display
  if (analytics.transactions.total === 0 && analytics.agents.total === 0 && analytics.channels.total === 0) {
    cliLogger.general.info(chalk.gray('  No performance data available'));
    return;
  }
  
  // Calculate rates only if we have data
  if (analytics.transactions.total > 0) {
    const successRate = (analytics.transactions.successful / analytics.transactions.total) * 100;
    const successColor = successRate >= 95 ? chalk.green : successRate >= 85 ? chalk.yellow : chalk.red;
    cliLogger.general.info(`  Success Rate: ${successColor(successRate.toFixed(1))}%`);
  }
  
  if (analytics.agents.total > 0) {
    const agentUtilization = (analytics.agents.active / analytics.agents.total) * 100;
    const agentColor = agentUtilization >= 70 ? chalk.green : agentUtilization >= 50 ? chalk.yellow : chalk.red;
    cliLogger.general.info(`  Agent Utilization: ${agentColor(agentUtilization.toFixed(1))}%`);
  }
  
  if (analytics.channels.total > 0) {
    const channelUtilization = (analytics.channels.active / analytics.channels.total) * 100;
    const channelColor = channelUtilization >= 60 ? chalk.green : channelUtilization >= 40 ? chalk.yellow : chalk.red;
    cliLogger.general.info(`  Channel Utilization: ${channelColor(channelUtilization.toFixed(1))}%`);
  }
}

async function fetchAnalyticsData(period: string): Promise<AnalyticsData> {
  try {
    // Get real analytics data from blockchain
    const analyticsService = await getAnalyticsService();
    const blockchainData = await analyticsService.getAnalytics({
      period: period,
      includeTransactions: true,
      includeAgents: true,
      includeChannels: true,
      includeEscrow: true
    });
    
    // Convert blockchain data to our analytics interface
    const analyticsData: AnalyticsData = {
      transactions: {
        total: blockchainData.transactions?.total || 0,
        successful: blockchainData.transactions?.successful || 0,
        failed: blockchainData.transactions?.failed || 0,
        avgProcessingTime: blockchainData.transactions?.avgProcessingTime || 0
      },
      agents: {
        total: blockchainData.agents?.total || 0,
        active: blockchainData.agents?.active || 0,
        inactive: blockchainData.agents?.inactive || 0,
        topPerformers: blockchainData.agents?.topPerformers || []
      },
      channels: {
        total: blockchainData.channels?.total || 0,
        active: blockchainData.channels?.active || 0,
        messageCount: blockchainData.channels?.messageCount || 0,
        avgResponseTime: blockchainData.channels?.avgResponseTime || 0
      },
      escrow: {
        totalVolume: blockchainData.escrow?.totalVolume || 0,
        activeDeposits: blockchainData.escrow?.activeDeposits || 0,
        completedTransactions: blockchainData.escrow?.completedTransactions || 0,
        averageAmount: blockchainData.escrow?.averageAmount || 0
      }
    };
    
    return analyticsData;
    
  } catch (error) {
    logger.general.warn('Failed to fetch blockchain analytics data, falling back to local state:', error);
    
    // Fallback: try to get data from local state file
    try {
      const state = await loadSharedState();
      if (state) {
        return calculateAnalyticsFromLocalState(state, period);
      }
    } catch (localError) {
      logger.general.warn('Failed to fetch local state data:', localError);
    }
    
    // Final fallback: return empty data
    return getEmptyData();
  }
}

// Helper function to calculate analytics from local state as fallback
function calculateAnalyticsFromLocalState(state: RuntimeState, period: string): AnalyticsData {
  // This is a simplified version of the previous logic for fallback only
  const allTransactions: any[] = [];
  const recentAgents = new Set<string>();
  const recentChannels = new Set<string>();
  
  // Process all sessions to gather metrics
  const now = new Date().getTime();
  const periodMillis = getPeriodMillis(period);
  
  for (const [sessionId, session] of Object.entries(state.sessions)) {
    const sessionAge = now - new Date(session.lastActivity).getTime();
    
    if (sessionAge <= periodMillis) {
      if (session.activeAgent) {
        recentAgents.add(session.activeAgent);
      }
      if (session.activeChannel) {
        recentChannels.add(session.activeChannel);
      }
    }
    
    allTransactions.push(...session.pendingTransactions, ...session.completedTransactions);
  }
  
  const successfulTx = allTransactions.filter(tx => tx.status === 'confirmed');
  const failedTx = allTransactions.filter(tx => tx.status === 'failed');
  
  return {
    transactions: {
      total: state.globalStats.totalTransactions || allTransactions.length,
      successful: successfulTx.length,
      failed: failedTx.length,
      avgProcessingTime: 0
    },
    agents: {
      total: state.globalStats.totalAgentsCreated || 0,
      active: recentAgents.size,
      inactive: Math.max(0, (state.globalStats.totalAgentsCreated || 0) - recentAgents.size),
      topPerformers: []
    },
    channels: {
      total: state.globalStats.totalChannelsCreated || 0,
      active: recentChannels.size,
      messageCount: state.globalStats.totalMessagessSent || 0,
      avgResponseTime: 0
    },
    escrow: {
      totalVolume: 0,
      activeDeposits: 0,
      completedTransactions: 0,
      averageAmount: 0
    }
  };
}

// Load shared state from file
async function loadSharedState(): Promise<RuntimeState | null> {
  try {
    const statePath = join(homedir(), '.ghostspeak', 'runtime-state.json');
    
    if (!existsSync(statePath)) {
      return null;
    }
    
    const stateData = readFileSync(statePath, 'utf8');
    return JSON.parse(stateData);
  } catch (error) {
    console.error('Error loading shared state:', error);
    return null;
  }
}

// Helper function to convert period to milliseconds
function getPeriodMillis(period: string): number {
  switch (period.toLowerCase()) {
    case 'hour':
      return 60 * 60 * 1000;
    case 'day':
      return 24 * 60 * 60 * 1000;
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000; // Default to week
  }
}

// Generate top performers from active agents
function generateTopPerformers(activeAgents: Set<string>): Array<{ name: string; score: number }> {
  const performers = Array.from(activeAgents).map(agent => ({
    name: agent,
    // Real score would come from blockchain metrics
    score: 0 // No score data available yet
  }));
  
  // Sort by score and return top 3
  return performers
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(p => ({ ...p, score: Math.round(p.score * 10) / 10 }));
}

// Calculate average response time from transactions
function calculateAvgResponseTime(transactions: any[]): number {
  const messageTx = transactions.filter(tx => tx.type === 'send_message');
  if (messageTx.length === 0) return 0;
  
  // Would need actual timestamp data from blockchain
  return 0; // No timing data available yet
}

// Calculate total volume from transactions
function calculateTotalVolume(transactions: any[]): number {
  return transactions
    .filter(tx => tx.details?.amount && tx.status === 'confirmed')
    .reduce((total, tx) => total + (tx.details.amount || 0), 0) / 1e9; // Convert lamports to SOL
}

// Calculate average amount from transactions
function calculateAverageAmount(transactions: any[]): number {
  const amountTx = transactions.filter(tx => tx.details?.amount && tx.status === 'confirmed');
  if (amountTx.length === 0) return 0;
  
  const total = amountTx.reduce((sum, tx) => sum + (tx.details.amount || 0), 0);
  return (total / amountTx.length) / 1e9; // Convert to SOL
}

// Get empty data when no blockchain data available
function getEmptyData(): AnalyticsData {
  return {
    transactions: {
      total: 0,
      successful: 0,
      failed: 0,
      avgProcessingTime: 0
    },
    agents: {
      total: 0,
      active: 0,
      inactive: 0,
      topPerformers: []
    },
    channels: {
      total: 0,
      active: 0,
      messageCount: 0,
      avgResponseTime: 0
    },
    escrow: {
      totalVolume: 0,
      activeDeposits: 0,
      completedTransactions: 0,
      averageAmount: 0
    }
  };
}

// Export new live dashboard function
export async function showLiveDashboard(period: string = 'week'): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Initializing live dashboard...');
  
  try {
    // Show progress while setting up
    progress.start();
    progress.succeed('Live dashboard initialized');
    
    // Initial dashboard display
    await showDashboard(period);
    
    cliLogger.general.info('');
    cliLogger.general.info(chalk.cyan('🔄 Live mode enabled - Dashboard will update every 5 seconds'));
    cliLogger.general.info(chalk.gray('Press Ctrl+C to exit'));
    cliLogger.general.info('');
    
    // Poll for changes every 5 seconds
    let lastStateHash = '';
    const intervalId = setInterval(async () => {
      try {
        const state = await loadSharedState();
        const currentStateHash = state ? JSON.stringify(state.globalStats) : '';
        
        // Check if state changed
        if (currentStateHash !== lastStateHash && currentStateHash !== '') {
          console.clear();
          await showDashboard(period);
          cliLogger.general.info('');
          cliLogger.general.info(chalk.cyan('🔄 Live mode - Last update: ' + new Date().toLocaleTimeString()));
          lastStateHash = currentStateHash;
        }
      } catch (error) {
        // Silently continue if state read fails
      }
    }, 5000);
    
    // Handle process termination
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      cliLogger.general.info('');
      cliLogger.general.info(chalk.gray('Live dashboard stopped'));
      process.exit(0);
    });
    
    // Keep process alive
    process.stdin.resume();
    
  } catch (error) {
    cliLogger.error('Live dashboard failed:', error);
    throw error;
  }
}

// Export function to get current metrics summary
export async function getMetricsSummary(): Promise<{
  transactions: number;
  agents: number;
  channels: number;
  messages: number;
  isLive: boolean;
}> {
  try {
    const state = await loadSharedState();
    
    if (!state) {
      return {
        transactions: 0,
        agents: 0,
        channels: 0,
        messages: 0,
        isLive: false
      };
    }
    
    return {
      transactions: state.globalStats.totalTransactions,
      agents: state.globalStats.totalAgentsCreated,
      channels: state.globalStats.totalChannelsCreated,
      messages: state.globalStats.totalMessagessSent,
      isLive: state.globalStats.totalTransactions > 0
    };
  } catch {
    return {
      transactions: 0,
      agents: 0,
      channels: 0,
      messages: 0,
      isLive: false
    };
  }
}
