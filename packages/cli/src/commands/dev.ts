/**
 * Dev Commands - Developer Tools and Utilities
 *
 * Provides development utilities including key management, testing, and debugging tools.
 */

import chalk from 'chalk';
import { ConfigManager } from '../core/ConfigManager.js';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

export async function manageKeys(): Promise<void> {

  try {
    logger.general.info(chalk.cyan('🔑 Key Management'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));
    logger.general.info('');

    // Check for existing Solana wallet
    const solanaConfigPath = join(
      homedir(),
      '.config',
      'solana',
      'cli',
      'config.yml'
    );
    const solanaKeypairPath = join(homedir(), '.config', 'solana', 'id.json');

    logger.general.info(chalk.yellow('Wallet Status:'));

    if (existsSync(solanaConfigPath)) {
      logger.general.info(
        `  Config: ${chalk.green('✓ Found')} (${solanaConfigPath})`
      );

      try {
        const configContent = readFileSync(solanaConfigPath, 'utf8');
        const keypairPathMatch = configContent.match(/keypair_path:\s*(.+)/);
        if (keypairPathMatch) {
          const keypairPath = keypairPathMatch[1].trim();
          logger.general.info(
            `  Keypair: ${chalk.green('✓ Found')} (${keypairPath})`
          );

          if (existsSync(keypairPath)) {
            const keypairData = JSON.parse(readFileSync(keypairPath, 'utf8'));
            logger.general.info(
              `  Keypair Valid: ${chalk.green('✓ Yes')} (${keypairData.length} bytes)`
            );
          } else {
            logger.general.info(
              `  Keypair Valid: ${chalk.red('✗ File not found')}`
            );
          }
        }
      } catch (error) {
        logger.general.info(
          `  Config Parse: ${chalk.red('✗ Error parsing config')}`
        );
      }
    } else {
      logger.general.info(`  Config: ${chalk.red('✗ Not found')}`);
      logger.general.info(`  Keypair: ${chalk.red('✗ Not configured')}`);
    }

    logger.general.info('');

    // Show key management options
    logger.general.info(chalk.yellow('Key Management Options:'));
    logger.general.info('  • Generate new keypair: solana-keygen new');
    logger.general.info('  • Import existing keypair: solana-keygen recover');
    logger.general.info('  • Show public key: solana-keygen pubkey');
    logger.general.info('  • Set config: solana config set --keypair <path>');
    logger.general.info('');

    // Show network configuration
    logger.general.info(chalk.yellow('Network Configuration:'));
    logger.general.info('  • Set devnet: solana config set --url devnet');
    logger.general.info('  • Set testnet: solana config set --url testnet');
    logger.general.info(
      '  • Set mainnet: solana config set --url mainnet-beta'
    );
    logger.general.info('  • Show config: solana config get');
    logger.general.info('');

    // Show airdrop options for devnet
    if (config.network === 'devnet') {
      logger.general.info(chalk.yellow('Devnet Airdrop:'));
      logger.general.info('  • Request SOL: solana airdrop 2');
      logger.general.info('  • Check balance: solana balance');
      logger.general.info('');
    }

    logger.general.info(chalk.green('✅ Key management information displayed'));
  } catch (error) {
    logger.dev.error('Key management failed:', error);
    throw error;
  }
}

/**
 * Interface for log display options
 */
export interface LogsOptions {
  lines?: number;
  level?: 'all' | 'error' | 'warn' | 'info' | 'debug';
  component?: string;
  follow?: boolean;
  location?: boolean;
}

/**
 * Show CLI and system logs with filtering and formatting
 */
export async function showLogs(options: LogsOptions = {}): Promise<void> {
  try {
    const {
      lines = 50,
      level = 'all',
      component,
      follow = false,
      location = false
    } = options;

    logger.dev.info(chalk.cyan('📋 GhostSpeak CLI Logs'));
    logger.dev.info(chalk.gray('─'.repeat(50)));
    
    if (location) {
      await showLogLocations();
      return;
    }

    // Find available log files
    const logFiles = findLogFiles();
    
    if (logFiles.length === 0) {
      logger.dev.info(chalk.yellow('⚠️  No log files found'));
      logger.dev.info(chalk.gray('Logs will appear here after CLI usage'));
      return;
    }

    // Display log files info
    logger.dev.info(chalk.yellow(`Found ${logFiles.length} log file(s):`));
    logFiles.forEach(file => {
      const stats = statSync(file.path);
      const size = formatFileSize(stats.size);
      const modified = stats.mtime.toISOString().split('T')[0];
      logger.dev.info(chalk.gray(`  • ${file.name} (${size}, modified: ${modified})`));
    });
    logger.dev.info('');

    // Read and display logs
    if (follow) {
      logger.dev.info(chalk.cyan('📡 Following logs (Press Ctrl+C to stop)'));
      logger.dev.info(chalk.gray('─'.repeat(50)));
      await followLogs(logFiles, { level, component, lines });
    } else {
      logger.dev.info(chalk.cyan(`📄 Recent ${lines} log entries`));
      if (level !== 'all') {
        logger.dev.info(chalk.gray(`Level filter: ${level.toUpperCase()}`));
      }
      if (component) {
        logger.dev.info(chalk.gray(`Component filter: ${component}`));
      }
      logger.dev.info(chalk.gray('─'.repeat(50)));
      
      await displayRecentLogs(logFiles, { level, component, lines });
    }

  } catch (error) {
    logger.dev.error('Failed to show logs:', error);
    throw error;
  }
}

/**
 * Display log file locations and information
 */
async function showLogLocations(): Promise<void> {
  const logFiles = findLogFiles();
  const cliDir = process.cwd();
  
  logger.dev.info(chalk.yellow('📍 Log File Locations:'));
  logger.dev.info('');
  
  if (logFiles.length === 0) {
    logger.dev.info(chalk.gray('  No log files found yet'));
    logger.dev.info(chalk.gray('  Logs will be created in:'));
    logger.dev.info(chalk.gray(`    ${cliDir}/`));
    return;
  }

  logFiles.forEach(file => {
    const stats = statSync(file.path);
    const size = formatFileSize(stats.size);
    const modified = stats.mtime.toLocaleString();
    
    logger.dev.info(chalk.cyan(`  ${file.name}`));
    logger.dev.info(chalk.gray(`    Path: ${file.path}`));
    logger.dev.info(chalk.gray(`    Size: ${size}`));
    logger.dev.info(chalk.gray(`    Modified: ${modified}`));
    logger.dev.info('');
  });

  logger.dev.info(chalk.yellow('💡 Tips:'));
  logger.dev.info(chalk.gray('  • Use --verbose flag for debug logs'));
  logger.dev.info(chalk.gray('  • Logs rotate automatically when they get large'));
  logger.dev.info(chalk.gray('  • Use "ghostspeak dev logs --follow" for live monitoring'));
}

/**
 * Find all available log files
 */
function findLogFiles(): Array<{ name: string; path: string; type: string }> {
  const cliDir = process.cwd();
  const possibleLogFiles = [
    'output.log',
    'debug_output.log',
    'full_output.log', 
    'message_output.log',
    'error.log',
    'cli.log',
    'ghostspeak.log'
  ];

  const foundFiles: Array<{ name: string; path: string; type: string }> = [];

  // Check for log files in current directory
  possibleLogFiles.forEach(filename => {
    const fullPath = join(cliDir, filename);
    if (existsSync(fullPath)) {
      foundFiles.push({
        name: filename,
        path: fullPath,
        type: detectLogType(filename)
      });
    }
  });

  // Check for additional log files that might exist
  try {
    const files = readdirSync(cliDir);
    files.forEach(file => {
      if (file.endsWith('.log') && !possibleLogFiles.includes(file)) {
        const fullPath = join(cliDir, file);
        foundFiles.push({
          name: file,
          path: fullPath,
          type: 'general'
        });
      }
    });
  } catch (error) {
    // Ignore directory read errors
  }

  return foundFiles.sort((a, b) => {
    const statA = statSync(a.path);
    const statB = statSync(b.path);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
}

/**
 * Detect log file type based on filename
 */
function detectLogType(filename: string): string {
  if (filename.includes('debug')) return 'debug';
  if (filename.includes('error')) return 'error';
  if (filename.includes('message')) return 'message';
  if (filename.includes('full')) return 'full';
  return 'general';
}

/**
 * Display recent log entries with filtering
 */
async function displayRecentLogs(
  logFiles: Array<{ name: string; path: string; type: string }>,
  options: { level: string; component?: string; lines: number }
): Promise<void> {
  const { level, component, lines } = options;
  
  // Read from the most recent log file first
  const primaryLogFile = logFiles[0];
  if (!primaryLogFile) return;

  try {
    const content = readFileSync(primaryLogFile.path, 'utf8');
    const logLines = content.split('\n').filter(line => line.trim());
    
    // Take the last N lines
    const recentLines = logLines.slice(-lines);
    
    let filteredLines = recentLines;
    
    // Apply level filter
    if (level !== 'all') {
      const levelPattern = new RegExp(`\\[\\d+m${level.toUpperCase()}\\[\\d+m`, 'i');
      filteredLines = filteredLines.filter(line => levelPattern.test(line));
    }
    
    // Apply component filter
    if (component) {
      const componentPattern = new RegExp(`component: "${component}"`, 'i');
      filteredLines = filteredLines.filter(line => 
        componentPattern.test(line) || 
        line.includes(`${component} `)
      );
    }

    if (filteredLines.length === 0) {
      logger.dev.info(chalk.yellow('No matching log entries found'));
      return;
    }

    // Display filtered lines
    filteredLines.forEach(line => {
      const formattedLine = formatLogLine(line);
      console.log(formattedLine);
    });
    
    logger.dev.info('');
    logger.dev.info(chalk.gray(`Showing ${filteredLines.length} of ${recentLines.length} recent entries from ${primaryLogFile.name}`));
    
  } catch (error) {
    logger.dev.error(`Failed to read log file ${primaryLogFile.path}:`, error);
  }
}

/**
 * Follow logs in real-time (simplified implementation)
 */
async function followLogs(
  logFiles: Array<{ name: string; path: string; type: string }>,
  options: { level: string; component?: string; lines: number }
): Promise<void> {
  // For now, just show recent logs and inform about follow mode
  logger.dev.info(chalk.yellow('📝 Note: Live log following is not yet implemented'));
  logger.dev.info(chalk.gray('Showing recent entries instead:'));
  logger.dev.info('');
  
  await displayRecentLogs(logFiles, options);
  
  logger.dev.info('');
  logger.dev.info(chalk.gray('💡 Tip: Run the command again to see newer entries'));
}

/**
 * Format log line for better readability
 */
function formatLogLine(line: string): string {
  // Remove ANSI color codes for cleaner output when needed
  // But preserve important formatting
  
  // Extract timestamp if present
  const timestampMatch = line.match(/\[([\d-\s:.]+)\]/);
  const timestamp = timestampMatch ? timestampMatch[1] : '';
  
  // Extract component if present  
  const componentMatch = line.match(/component: "([^"]+)"/);
  const component = componentMatch ? componentMatch[1] : '';
  
  // Extract level
  const levelMatch = line.match(/\[\d+m(INFO|WARN|ERROR|DEBUG)\[\d+m/);
  const logLevel = levelMatch ? levelMatch[1] : '';
  
  if (timestamp && component && logLevel) {
    // Clean up the message part
    let message = line.replace(/\[\d+m.*?\[\d+m/g, '').replace(/component: "[^"]+"/, '').trim();
    message = message.replace(/^\s*:\s*/, '').trim();
    
    if (message) {
      const levelColor = getLevelColor(logLevel);
      return `${chalk.gray(timestamp)} ${levelColor(logLevel.padEnd(5))} ${chalk.cyan(component.padEnd(10))} ${message}`;
    }
  }
  
  // Return original line if we can't parse it nicely
  return line;
}

/**
 * Get color for log level
 */
function getLevelColor(level: string): (text: string) => string {
  switch (level.toLowerCase()) {
    case 'error': return chalk.red;
    case 'warn': return chalk.yellow;
    case 'info': return chalk.green;
    case 'debug': return chalk.blue;
    default: return chalk.gray;
  }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}
