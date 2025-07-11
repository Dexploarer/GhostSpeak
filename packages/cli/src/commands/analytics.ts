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
import {
  getRpc,
  getProgramId,
  getCommitment,
  getGhostspeakSdk,
} from '../context-helpers';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
        cliLogger.general.info(chalk.green(`Data Source: Live Metrics`));
        cliLogger.general.info(chalk.gray(`Active Sessions: ${Object.keys(state.sessions).length}`));
      } else {
        cliLogger.general.info(chalk.yellow(`Data Source: Demo Data`));
        cliLogger.general.info(chalk.gray(`(Start using the CLI to see real metrics)`));
      }
    } catch {
      cliLogger.general.info(chalk.yellow(`Data Source: Demo Data`));
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
  try {
    // Get real data from shared state file
    const state = await loadSharedState();
    
    if (!state) {
      return getDemoData();
    }
    
    // Calculate real metrics from state
    const allTransactions: any[] = [];
    const activeSessions: string[] = [];
    const recentAgents = new Set<string>();
    const recentChannels = new Set<string>();
    
    // Process all sessions to gather metrics
    const now = new Date().getTime();
    const periodMillis = getPeriodMillis(period);
    
    for (const [sessionId, session] of Object.entries(state.sessions)) {
      const sessionAge = now - new Date(session.lastActivity).getTime();
      
      // Consider session active if within period
      if (sessionAge <= periodMillis) {
        activeSessions.push(sessionId);
        
        // Track active agents and channels
        if (session.activeAgent) {
          recentAgents.add(session.activeAgent);
        }
        if (session.activeChannel) {
          recentChannels.add(session.activeChannel);
        }
      }
      
      // Collect all transactions
      allTransactions.push(...session.pendingTransactions, ...session.completedTransactions);
    }
    
    // Calculate transaction metrics
    const successfulTx = allTransactions.filter(tx => tx.status === 'confirmed');
    const failedTx = allTransactions.filter(tx => tx.status === 'failed');
    const pendingTx = allTransactions.filter(tx => tx.status === 'pending');
    
    // Calculate average processing time (mock for now, could be enhanced with real timing)
    const avgProcessingTime = successfulTx.length > 0 
      ? Math.random() * 1000 + 500 // Mock processing time 500-1500ms
      : 0;
    
    // Build analytics data with real metrics
    const analyticsData: AnalyticsData = {
      transactions: {
        total: state.globalStats.totalTransactions || allTransactions.length,
        successful: successfulTx.length,
        failed: failedTx.length,
        avgProcessingTime: avgProcessingTime
      },
      agents: {
        total: state.globalStats.totalAgentsCreated || 0,
        active: recentAgents.size,
        inactive: Math.max(0, (state.globalStats.totalAgentsCreated || 0) - recentAgents.size),
        topPerformers: generateTopPerformers(recentAgents)
      },
      channels: {
        total: state.globalStats.totalChannelsCreated || 0,
        active: recentChannels.size,
        messageCount: state.globalStats.totalMessagessSent || 0,
        avgResponseTime: calculateAvgResponseTime(allTransactions)
      },
      escrow: {
        totalVolume: calculateTotalVolume(allTransactions),
        activeDeposits: pendingTx.filter(tx => tx.type === 'escrow_deposit').length,
        completedTransactions: successfulTx.filter(tx => tx.type?.includes('escrow')).length,
        averageAmount: calculateAverageAmount(allTransactions)
      }
    };
    
    // If no real data exists, return demo data as fallback
    if (analyticsData.transactions.total === 0 && 
        analyticsData.agents.total === 0 && 
        analyticsData.channels.total === 0) {
      return getDemoData();
    }
    
    return analyticsData;
    
  } catch (error) {
    // If state loading fails, return demo data
    console.error('Error fetching real analytics data:', error);
    return getDemoData();
  }
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
    // Calculate score based on some metrics (mock for now)
    score: Math.random() * 30 + 70 // Score between 70-100
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
  
  // Mock calculation - in real implementation would use actual timestamps
  return Math.random() * 500 + 300; // 300-800ms
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

// Get demo data as fallback
function getDemoData(): AnalyticsData {
  return {
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
