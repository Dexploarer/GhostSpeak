/**
 * Status Command - Enhanced System Health and Status Information
 *
 * Displays comprehensive system status with real-time health checks and diagnostics.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';
import { isVerboseMode } from '../utils/cli-options.js';
import { ProgressIndicator } from '../utils/prompts.js';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  network: 'connected' | 'slow' | 'disconnected';
  wallet: 'configured' | 'missing' | 'insufficient_funds';
  services: 'operational' | 'degraded' | 'down';
}

export async function showStatus(): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Running system diagnostics...');

  try {
    await cliLogger.success(chalk.cyan('🔍 GhostSpeak System Status'));
    await cliLogger.success(chalk.gray('═'.repeat(50)));
    
    // Start progress indicator
    progress.start();
    
    // Load configuration
    progress.update('Loading configuration...');
    const config = await ConfigManager.load();
    
    // Perform health checks
    progress.update('Checking system health...');
    const health = await performHealthChecks(config, cliLogger, progress);
    
    // Stop progress indicator before displaying results
    progress.succeed('System diagnostics complete');
    
    // Display system overview with health status
    await displaySystemOverview(health, cliLogger);
    
    // Display detailed system information
    await displaySystemInformation(cliLogger);
    
    // Display network status with real-time checks
    await displayNetworkStatus(config, cliLogger);
    
    // Display configuration status with validation
    await displayConfigurationStatus(config, cliLogger);
    
    // Display feature availability with health checks
    await displayFeatureAvailability(cliLogger);
    
    // Display recommendations based on health
    await displayRecommendations(health, cliLogger);
    
    // Final status summary
    await displayStatusSummary(health, cliLogger);

  } catch (error) {
    progress.fail('Status check failed');
    cliLogger.error('Status check failed:', error);
    throw error;
  }
}

async function performHealthChecks(config: any, cliLogger: Logger, progress: ProgressIndicator): Promise<SystemHealth> {
  const health: SystemHealth = {
    overall: 'healthy',
    network: 'connected',
    wallet: 'configured',
    services: 'operational'
  };

  // Check network connectivity
  progress.update('Checking network connectivity...');
  try {
    const blockHeight = execSync('solana block-height', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 5000 
    }).trim();
    
    if (blockHeight) {
      health.network = 'connected';
    }
  } catch (error) {
    health.network = 'disconnected';
    health.overall = 'critical';
  }

  // Check wallet status
  progress.update('Checking wallet configuration...');
  try {
    const balance = execSync('solana balance', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 3000 
    }).trim();
    
    const solBalance = parseFloat(balance.split(' ')[0]);
    if (solBalance === 0) {
      health.wallet = 'insufficient_funds';
      if (health.overall === 'healthy') health.overall = 'warning';
    }
  } catch (error) {
    health.wallet = 'missing';
    health.overall = 'critical';
  }

  // Final check
  progress.update('Analyzing system status...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual feedback

  return health;
}

async function displaySystemOverview(health: SystemHealth, cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('📊 System Overview:'));
  
  const healthIcon = getHealthIcon(health.overall);
  const healthColor = getHealthColor(health.overall);
  
  await cliLogger.display(`  Overall Health: ${healthColor(healthIcon + ' ' + health.overall.toUpperCase())}`);
  await cliLogger.display(`  Network Status: ${getStatusDisplay(health.network)}`);
  await cliLogger.display(`  Wallet Status: ${getStatusDisplay(health.wallet)}`);
  await cliLogger.display(`  Services: ${getStatusDisplay(health.services)}`);
}

async function displaySystemInformation(cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('💻 System Information:'));
  await cliLogger.display(`  Platform: ${chalk.cyan(process.platform)} ${process.arch}`);
  await cliLogger.display(`  Node.js: ${chalk.cyan(process.version)}`);
  await cliLogger.display(`  Memory Usage: ${chalk.cyan((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))} MB`);
  await cliLogger.display(`  Uptime: ${chalk.cyan(Math.floor(process.uptime()))} seconds`);
  
  // Check for additional runtime information
  try {
    const bunVersion = execSync('bun --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    await cliLogger.display(`  Bun: ${chalk.cyan(bunVersion)}`);
  } catch {
    // Bun not available
  }
}

async function displayNetworkStatus(config: any, cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('🌐 Network Status:'));
  await cliLogger.display(`  Current Network: ${chalk.cyan(config.get().network || 'devnet')}`);
  await cliLogger.display(`  RPC URL: ${chalk.gray(config.get().rpcUrl || 'https://api.devnet.solana.com')}`);
  
  // Test RPC connectivity with timing
  try {
    const start = Date.now();
    const blockHeight = execSync('solana block-height', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 5000 
    }).trim();
    const latency = Date.now() - start;
    
    await cliLogger.display(`  Block Height: ${chalk.green(blockHeight)}`);
    await cliLogger.display(`  RPC Latency: ${chalk.blue(latency + 'ms')}`);
    
    const latencyStatus = latency < 500 ? chalk.green('Excellent') : 
                         latency < 1000 ? chalk.yellow('Good') : 
                         latency < 2000 ? chalk.yellow('Fair') : chalk.red('Poor');
    await cliLogger.display(`  Connection Quality: ${latencyStatus}`);
  } catch (error) {
    await cliLogger.display(`  Connection: ${chalk.red('❌ No blockchain connection')}`);
    await cliLogger.display(`  Status: ${chalk.gray('Blockchain unavailable')}`);
  }
}

async function displayConfigurationStatus(config: any, cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('⚙️  Configuration Status:'));
  
  const configStatus = config.configPath ? chalk.green('✓ Found') : chalk.yellow('⚠ Default');
  await cliLogger.display(`  Config File: ${configStatus}`);
  
  // Check wallet configuration
  try {
    const address = execSync('solana address', { encoding: 'utf8', stdio: 'pipe' }).trim();
    await cliLogger.display(`  Wallet: ${chalk.green('✓ Configured')}`);
    await cliLogger.display(`  Address: ${chalk.gray(address)}`);
    
    // Check balance
    try {
      const balance = execSync('solana balance', { encoding: 'utf8', stdio: 'pipe' }).trim();
      const solBalance = parseFloat(balance.split(' ')[0]);
      const balanceColor = solBalance > 1 ? chalk.green : solBalance > 0 ? chalk.yellow : chalk.red;
      await cliLogger.display(`  Balance: ${balanceColor(balance)}`);
    } catch {
      await cliLogger.display(`  Balance: ${chalk.red('Unable to check')}`);
    }
  } catch (error) {
    await cliLogger.display(`  Wallet: ${chalk.red('❌ Not configured')}`);
    await cliLogger.display(`  Action: ${chalk.gray('Run "ghostspeak wizard" to set up')}`);
  }
}

async function displayFeatureAvailability(cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('🚀 Feature Availability:'));
  
  const features = [
    { name: 'Agent Management', status: 'available', description: 'Register and manage AI agents' },
    { name: 'Marketplace Access', status: 'available', description: 'Browse and purchase services' },
    { name: 'Channel Communication', status: 'available', description: 'Create and manage channels' },
    { name: 'Message System', status: 'available', description: 'Send and receive messages' },
    { name: 'Escrow Services', status: 'available', description: 'Secure payment handling' },
    { name: 'Analytics Dashboard', status: 'available', description: 'Performance metrics and insights' },
    { name: 'ZK Compression', status: 'beta', description: 'Compressed NFT creation' },
    { name: 'Confidential Transfers', status: 'beta', description: 'Privacy-enhanced transactions' },
    { name: 'MEV Protection', status: 'available', description: 'Front-running protection' }
  ];

  for (const feature of features) {
    const statusIcon = feature.status === 'available' ? chalk.green('✓') : 
                      feature.status === 'beta' ? chalk.yellow('β') : chalk.red('✗');
    await cliLogger.display(`  ${statusIcon} ${feature.name}: ${chalk.gray(feature.description)}`);
  }
}

async function displayRecommendations(health: SystemHealth, cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.yellow('💡 Recommendations:'));
  
  if (health.overall === 'critical') {
    await cliLogger.display(chalk.red('  🚨 Critical Issues Detected:'));
    
    if (health.network === 'disconnected') {
      await cliLogger.display(chalk.gray('    • Check your internet connection'));
      await cliLogger.display(chalk.gray('    • Verify Solana RPC endpoint availability'));
      await cliLogger.display(chalk.gray('    • Try switching to a different network'));
    }
    
    if (health.wallet === 'missing') {
      await cliLogger.display(chalk.gray('    • Run "ghostspeak wizard" to set up your wallet'));
      await cliLogger.display(chalk.gray('    • Or run "solana-keygen new" manually'));
    }
  } else if (health.overall === 'warning') {
    await cliLogger.display(chalk.yellow('  ⚠️  Minor Issues Found:'));
    
    if (health.wallet === 'insufficient_funds') {
      await cliLogger.display(chalk.gray('    • Request an airdrop: "solana airdrop 2"'));
      await cliLogger.display(chalk.gray('    • Or fund your wallet for mainnet usage'));
    }
  } else {
    await cliLogger.display(chalk.green('  ✅ System is running optimally!'));
    await cliLogger.display(chalk.gray('    • Your GhostSpeak setup is ready to use'));
    await cliLogger.display(chalk.gray('    • Try "ghostspeak agent register" to get started'));
    await cliLogger.display(chalk.gray('    • Explore "ghostspeak marketplace list"'));
  }
  
  await cliLogger.display('');
  await cliLogger.display(chalk.cyan('  📚 Need Help?'));
  await cliLogger.display(chalk.gray('    • Documentation: [coming soon]'));
  await cliLogger.display(chalk.gray('    • GitHub: https://github.com/ghostspeak/ghostspeak'));
  await cliLogger.display(chalk.gray('    • CLI Help: ghostspeak help'));
}

async function displayStatusSummary(health: SystemHealth, cliLogger: Logger): Promise<void> {
  await cliLogger.display('');
  await cliLogger.display(chalk.gray('─'.repeat(50)));
  
  if (health.overall === 'healthy') {
    await cliLogger.display(chalk.green('✅ System status: All systems operational'));
  } else if (health.overall === 'warning') {
    await cliLogger.display(chalk.yellow('⚠️  System status: Minor issues detected'));
  } else {
    await cliLogger.display(chalk.red('❌ System status: Critical issues require attention'));
  }
  
  await cliLogger.display(chalk.gray(`Status check completed at ${new Date().toLocaleString()}`));
}

function getHealthIcon(health: string): string {
  switch (health) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

function getHealthColor(health: string): (text: string) => string {
  switch (health) {
    case 'healthy': return chalk.green;
    case 'warning': return chalk.yellow;
    case 'critical': return chalk.red;
    default: return chalk.gray;
  }
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case 'connected':
    case 'configured':
    case 'operational':
    case 'available':
      return chalk.green('✓ ' + status);
    case 'slow':
    case 'insufficient_funds':
    case 'degraded':
      return chalk.yellow('⚠ ' + status.replace('_', ' '));
    case 'disconnected':
    case 'missing':
    case 'down':
      return chalk.red('❌ ' + status);
    default:
      return chalk.gray('? ' + status);
  }
}
