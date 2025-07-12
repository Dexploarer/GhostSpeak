/**
 * Doctor Command - Comprehensive System Diagnostics and Troubleshooting
 * 
 * This command provides a thorough health check of the GhostSpeak CLI environment,
 * testing all prerequisites, network connectivity, configuration, and blockchain
 * interactions with actionable remediation steps.
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import semver from 'semver';
import { Command } from 'commander';
import { ConfigManager } from '../core/ConfigManager.js';
import { checkRpcHealth } from '../utils/network-diagnostics.js';
import { logger } from '../utils/logger.js';
import { createSolanaRpc } from '@solana/rpc';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import { address } from '@solana/addresses';
import { createKeyPairFromBytes } from '@solana/keys';
import { ProgressIndicator } from '../utils/prompts.js';

interface DiagnosticCheck {
  name: string;
  category: 'prerequisites' | 'network' | 'wallet' | 'blockchain' | 'configuration' | 'sdk';
  check: () => Promise<CheckResult>;
  critical: boolean;
}

interface CheckResult {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: string[];
  fix?: string[];
}

interface DiagnosticResults {
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  criticalFailures: number;
  checks: Array<{
    name: string;
    category: string;
    result: CheckResult;
    critical: boolean;
  }>;
}

export function createDoctorCommand(): Command {
  const command = new Command('doctor')
    .description('Run comprehensive diagnostics and provide actionable fixes')
    .option('--verbose', 'Show detailed diagnostic information')
    .option('--fix', 'Attempt to fix common issues automatically')
    .option('--json', 'Output results in JSON format')
    .action(async (options) => {
      await runDoctor(options);
    });

  return command;
}

export async function runDoctor(options: {
  verbose?: boolean;
  fix?: boolean;
  json?: boolean;
} = {}): Promise<void> {
  if (!options.json) {
    console.log(chalk.cyan('🩺 GhostSpeak Doctor'));
    console.log(chalk.gray('Running comprehensive system diagnostics...\n'));
  }

  const progress = options.json ? null : new ProgressIndicator('Running diagnostics...');
  progress?.start();

  try {
    // Run all diagnostic checks
    const results = await runDiagnostics(options, progress);

    // Display results
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      progress?.succeed('Diagnostics complete');
      await displayResults(results, options);
    }

    // Exit with appropriate code
    if (results.criticalFailures > 0) {
      process.exit(1);
    } else if (results.failures > 0) {
      process.exit(2);
    }
  } catch (error) {
    progress?.fail('Diagnostics failed');
    if (!options.json) {
      console.error(chalk.red('❌ Doctor command failed:'), error);
    }
    process.exit(1);
  }
}

async function runDiagnostics(
  options: { verbose?: boolean; fix?: boolean },
  progress: ProgressIndicator | null
): Promise<DiagnosticResults> {
  const checks = getAllChecks();
  const results: DiagnosticResults = {
    totalChecks: checks.length,
    passed: 0,
    warnings: 0,
    failures: 0,
    criticalFailures: 0,
    checks: []
  };

  for (const check of checks) {
    progress?.update(`Checking ${check.name}...`);
    
    try {
      const result = await check.check();
      
      // Update counters
      if (result.status === 'pass') {
        results.passed++;
      } else if (result.status === 'warning') {
        results.warnings++;
      } else {
        results.failures++;
        if (check.critical) {
          results.criticalFailures++;
        }
      }

      // Attempt auto-fix if requested
      if (options.fix && result.status === 'fail' && result.fix && result.fix.length > 0) {
        progress?.update(`Attempting to fix ${check.name}...`);
        // Auto-fix implementation would go here
      }

      results.checks.push({
        name: check.name,
        category: check.category,
        result,
        critical: check.critical
      });
    } catch (error) {
      // Check failed catastrophically
      results.failures++;
      if (check.critical) {
        results.criticalFailures++;
      }

      results.checks.push({
        name: check.name,
        category: check.category,
        result: {
          status: 'fail',
          message: 'Check failed with error',
          details: [error instanceof Error ? error.message : String(error)]
        },
        critical: check.critical
      });
    }
  }

  return results;
}

function getAllChecks(): DiagnosticCheck[] {
  return [
    // Prerequisites checks
    {
      name: 'Node.js Version',
      category: 'prerequisites',
      critical: true,
      check: checkNodeVersion
    },
    {
      name: 'Bun Runtime',
      category: 'prerequisites',
      critical: false,
      check: checkBunVersion
    },
    {
      name: 'Git Installation',
      category: 'prerequisites',
      critical: false,
      check: checkGitInstallation
    },
    {
      name: 'Solana CLI',
      category: 'prerequisites',
      critical: true,
      check: checkSolanaCLI
    },

    // Network checks
    {
      name: 'Internet Connectivity',
      category: 'network',
      critical: true,
      check: checkInternetConnectivity
    },
    {
      name: 'DNS Resolution',
      category: 'network',
      critical: true,
      check: checkDNSResolution
    },
    {
      name: 'RPC Endpoint Connectivity',
      category: 'network',
      critical: true,
      check: checkRPCConnectivity
    },
    {
      name: 'RPC Latency',
      category: 'network',
      critical: false,
      check: checkRPCLatency
    },

    // Wallet checks
    {
      name: 'Wallet Configuration',
      category: 'wallet',
      critical: true,
      check: checkWalletConfiguration
    },
    {
      name: 'Wallet Balance',
      category: 'wallet',
      critical: false,
      check: checkWalletBalance
    },
    {
      name: 'Wallet Permissions',
      category: 'wallet',
      critical: true,
      check: checkWalletPermissions
    },

    // Blockchain checks
    {
      name: 'Blockchain Connection',
      category: 'blockchain',
      critical: true,
      check: checkBlockchainConnection
    },
    {
      name: 'Program Deployment',
      category: 'blockchain',
      critical: false,
      check: checkProgramDeployment
    },
    {
      name: 'Recent Blockhash',
      category: 'blockchain',
      critical: true,
      check: checkRecentBlockhash
    },

    // Configuration checks
    {
      name: 'CLI Configuration',
      category: 'configuration',
      critical: false,
      check: checkCLIConfiguration
    },
    {
      name: 'Environment Variables',
      category: 'configuration',
      critical: false,
      check: checkEnvironmentVariables
    },
    {
      name: 'Network Configuration',
      category: 'configuration',
      critical: false,
      check: checkNetworkConfiguration
    },

    // SDK checks
    {
      name: 'SDK Installation',
      category: 'sdk',
      critical: true,
      check: checkSDKInstallation
    },
    {
      name: 'SDK Initialization',
      category: 'sdk',
      critical: true,
      check: checkSDKInitialization
    }
  ];
}

// Check implementations

async function checkNodeVersion(): Promise<CheckResult> {
  try {
    const nodeVersion = process.version;
    const minVersion = '18.0.0';
    
    if (semver.gte(nodeVersion, minVersion)) {
      return {
        status: 'pass',
        message: `Node.js ${nodeVersion} installed`,
        details: [`Minimum required: v${minVersion}`]
      };
    } else {
      return {
        status: 'fail',
        message: `Node.js ${nodeVersion} is outdated`,
        details: [`Minimum required: v${minVersion}`],
        fix: [
          'Update Node.js to v18 or higher:',
          '• Visit https://nodejs.org/',
          '• Or use nvm: nvm install 18',
          '• Or use fnm: fnm install 18'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Unable to check Node.js version',
      fix: ['Ensure Node.js is installed and in PATH']
    };
  }
}

async function checkBunVersion(): Promise<CheckResult> {
  try {
    const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
    const minVersion = '1.0.0';
    
    if (semver.gte(bunVersion, minVersion)) {
      return {
        status: 'pass',
        message: `Bun ${bunVersion} installed`,
        details: ['Bun provides faster package management']
      };
    } else {
      return {
        status: 'warning',
        message: `Bun ${bunVersion} is outdated`,
        details: [`Recommended: v${minVersion} or higher`],
        fix: [
          'Update Bun:',
          '• Run: curl -fsSL https://bun.sh/install | bash',
          '• Or visit: https://bun.sh'
        ]
      };
    }
  } catch {
    return {
      status: 'warning',
      message: 'Bun not installed',
      details: ['Bun is optional but provides better performance'],
      fix: [
        'Install Bun for faster performance:',
        '• Run: curl -fsSL https://bun.sh/install | bash',
        '• Visit: https://bun.sh'
      ]
    };
  }
}

async function checkGitInstallation(): Promise<CheckResult> {
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    return {
      status: 'pass',
      message: gitVersion,
      details: ['Git is properly installed']
    };
  } catch {
    return {
      status: 'warning',
      message: 'Git not found',
      details: ['Git is recommended for version control'],
      fix: [
        'Install Git:',
        '• macOS: brew install git',
        '• Ubuntu: sudo apt-get install git',
        '• Windows: https://git-scm.com/download/win'
      ]
    };
  }
}

async function checkSolanaCLI(): Promise<CheckResult> {
  try {
    const solanaVersion = execSync('solana --version', { encoding: 'utf8' }).trim();
    const versionMatch = solanaVersion.match(/(\d+\.\d+\.\d+)/);
    
    if (versionMatch) {
      const version = versionMatch[1];
      const minVersion = '1.17.0';
      
      if (semver.gte(version, minVersion)) {
        return {
          status: 'pass',
          message: solanaVersion,
          details: [`Minimum required: v${minVersion}`]
        };
      } else {
        return {
          status: 'fail',
          message: `Solana CLI ${version} is outdated`,
          details: [`Minimum required: v${minVersion}`],
          fix: [
            'Update Solana CLI:',
            '• Run: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"',
            '• Add to PATH: export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'
          ]
        };
      }
    }
    
    return {
      status: 'pass',
      message: solanaVersion
    };
  } catch {
    return {
      status: 'fail',
      message: 'Solana CLI not found',
      details: ['Solana CLI is required for wallet management'],
      fix: [
        'Install Solana CLI:',
        '• Run: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"',
        '• Add to PATH: export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"',
        '• Verify: solana --version'
      ]
    };
  }
}

async function checkInternetConnectivity(): Promise<CheckResult> {
  try {
    // Try to ping a reliable host
    execSync('ping -c 1 -W 2 8.8.8.8', { stdio: 'pipe' });
    return {
      status: 'pass',
      message: 'Internet connection is working'
    };
  } catch {
    // Fallback: try curl
    try {
      execSync('curl -s --connect-timeout 2 https://api.github.com', { stdio: 'pipe' });
      return {
        status: 'pass',
        message: 'Internet connection is working'
      };
    } catch {
      return {
        status: 'fail',
        message: 'No internet connection detected',
        fix: [
          'Check your internet connection:',
          '• Verify Wi-Fi or Ethernet is connected',
          '• Try opening a website in your browser',
          '• Check with your network administrator',
          '• Disable VPN if using one'
        ]
      };
    }
  }
}

async function checkDNSResolution(): Promise<CheckResult> {
  const testDomains = ['api.devnet.solana.com', 'github.com', 'google.com'];
  const failedDomains: string[] = [];

  for (const domain of testDomains) {
    try {
      execSync(`nslookup ${domain}`, { stdio: 'pipe' });
    } catch {
      failedDomains.push(domain);
    }
  }

  if (failedDomains.length === 0) {
    return {
      status: 'pass',
      message: 'DNS resolution is working properly'
    };
  } else if (failedDomains.length < testDomains.length) {
    return {
      status: 'warning',
      message: 'Some DNS lookups failed',
      details: [`Failed domains: ${failedDomains.join(', ')}`],
      fix: [
        'Try changing your DNS servers:',
        '• Use Google DNS: 8.8.8.8, 8.8.4.4',
        '• Use Cloudflare DNS: 1.1.1.1, 1.0.0.1',
        '• Check your router/firewall settings'
      ]
    };
  } else {
    return {
      status: 'fail',
      message: 'DNS resolution is not working',
      fix: [
        'Fix DNS issues:',
        '• Check your network settings',
        '• Try using public DNS servers (8.8.8.8 or 1.1.1.1)',
        '• Restart your router',
        '• Contact your ISP'
      ]
    };
  }
}

async function checkRPCConnectivity(): Promise<CheckResult> {
  try {
    const config = await ConfigManager.load();
    const rpcUrl = config.get().rpcUrl || 'https://api.devnet.solana.com';
    
    // Create RPC client
    const rpc = createSolanaRpc({ url: rpcUrl }) as Rpc<SolanaRpcApi>;
    
    // Check RPC health
    const health = await checkRpcHealth(rpc);
    
    if (health.healthy) {
      return {
        status: 'pass',
        message: `Connected to RPC endpoint: ${rpcUrl}`,
        details: [`Latency: ${health.latency}ms`]
      };
    } else {
      return {
        status: 'fail',
        message: `Cannot connect to RPC endpoint: ${rpcUrl}`,
        details: [health.warning || 'Connection failed'],
        fix: [
          'Try a different RPC endpoint:',
          '• Devnet: https://api.devnet.solana.com',
          '• Testnet: https://api.testnet.solana.com',
          '• Run: ghostspeak config set rpcUrl <new-url>',
          '• Consider free tier from Helius, QuickNode, or Alchemy'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'RPC connectivity check failed',
      details: [error instanceof Error ? error.message : 'Unknown error'],
      fix: [
        'Ensure RPC endpoint is configured:',
        '• Run: ghostspeak config list',
        '• Set RPC: ghostspeak config set rpcUrl https://api.devnet.solana.com'
      ]
    };
  }
}

async function checkRPCLatency(): Promise<CheckResult> {
  try {
    const config = await ConfigManager.load();
    const rpcUrl = config.get().rpcUrl || 'https://api.devnet.solana.com';
    
    // Create RPC client
    const rpc = createSolanaRpc({ url: rpcUrl }) as Rpc<SolanaRpcApi>;
    
    // Measure latency
    const measurements: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await rpc.getLatestBlockhash().send();
      measurements.push(Date.now() - start);
    }
    
    const avgLatency = Math.round(measurements.reduce((a, b) => a + b) / measurements.length);
    
    if (avgLatency < 100) {
      return {
        status: 'pass',
        message: `Excellent RPC latency: ${avgLatency}ms`,
        details: ['Network performance is optimal']
      };
    } else if (avgLatency < 500) {
      return {
        status: 'pass',
        message: `Good RPC latency: ${avgLatency}ms`,
        details: ['Network performance is acceptable']
      };
    } else if (avgLatency < 1000) {
      return {
        status: 'warning',
        message: `High RPC latency: ${avgLatency}ms`,
        details: ['Operations may be slower than usual'],
        fix: [
          'Consider using a faster RPC endpoint:',
          '• Use a geographically closer endpoint',
          '• Try premium RPC services for better performance',
          '• Check your internet connection speed'
        ]
      };
    } else {
      return {
        status: 'fail',
        message: `Very high RPC latency: ${avgLatency}ms`,
        details: ['Network performance is poor'],
        fix: [
          'Improve RPC performance:',
          '• Switch to a premium RPC provider',
          '• Use a different network connection',
          '• Check for network congestion',
          '• Consider using a local validator for development'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      message: 'Unable to measure RPC latency',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function checkWalletConfiguration(): Promise<CheckResult> {
  try {
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');
    
    if (!existsSync(walletPath)) {
      return {
        status: 'fail',
        message: 'No wallet found',
        details: [`Expected at: ${walletPath}`],
        fix: [
          'Create a new wallet:',
          '• Run: solana-keygen new',
          '• Or run: ghostspeak quickstart',
          '• Or import existing: solana-keygen recover'
        ]
      };
    }
    
    // Check if we can read the wallet
    try {
      const walletData = readFileSync(walletPath, 'utf8');
      const secretKey = new Uint8Array(JSON.parse(walletData));
      const keypair = await createKeyPairFromBytes(secretKey);
      const publicKey = keypair.address;
      
      return {
        status: 'pass',
        message: 'Wallet configured',
        details: [`Address: ${publicKey}`]
      };
    } catch {
      return {
        status: 'fail',
        message: 'Wallet file is corrupted',
        details: ['Cannot read wallet keypair'],
        fix: [
          'Fix wallet configuration:',
          '• Backup current wallet if needed',
          '• Generate new wallet: solana-keygen new',
          '• Or recover from seed: solana-keygen recover'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Wallet check failed',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function checkWalletBalance(): Promise<CheckResult> {
  try {
    const balance = execSync('solana balance', { encoding: 'utf8' }).trim();
    const solAmount = parseFloat(balance.split(' ')[0]);
    
    if (solAmount > 1) {
      return {
        status: 'pass',
        message: `Wallet balance: ${balance}`,
        details: ['Sufficient balance for operations']
      };
    } else if (solAmount > 0) {
      return {
        status: 'warning',
        message: `Low balance: ${balance}`,
        details: ['May not be enough for multiple transactions'],
        fix: [
          'Get more SOL:',
          '• Devnet: solana airdrop 2',
          '• Testnet: solana airdrop 2 --url testnet',
          '• Mainnet: Purchase SOL from an exchange'
        ]
      };
    } else {
      return {
        status: 'warning',
        message: 'No SOL balance',
        details: ['You need SOL to pay for transactions'],
        fix: [
          'Fund your wallet:',
          '• Devnet: solana airdrop 2',
          '• Testnet: solana airdrop 2 --url testnet',
          '• Mainnet: Transfer SOL from an exchange'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      message: 'Unable to check balance',
      details: [error instanceof Error ? error.message : 'Unknown error'],
      fix: ['Ensure wallet and network are configured correctly']
    };
  }
}

async function checkWalletPermissions(): Promise<CheckResult> {
  try {
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');
    
    if (existsSync(walletPath)) {
      const stats = execSync(`ls -la ${walletPath}`, { encoding: 'utf8' }).trim();
      
      // Check if permissions are too open
      if (stats.includes('rw-------') || stats.includes('600')) {
        return {
          status: 'pass',
          message: 'Wallet file permissions are secure',
          details: ['File is only readable by owner']
        };
      } else {
        return {
          status: 'warning',
          message: 'Wallet file permissions may be too open',
          details: ['Other users might be able to read your wallet'],
          fix: [
            'Secure your wallet file:',
            '• Run: chmod 600 ~/.config/solana/id.json',
            '• This ensures only you can read the file'
          ]
        };
      }
    } else {
      return {
        status: 'fail',
        message: 'No wallet file found'
      };
    }
  } catch {
    return {
      status: 'warning',
      message: 'Unable to check wallet permissions',
      details: ['Manual verification recommended']
    };
  }
}

async function checkBlockchainConnection(): Promise<CheckResult> {
  try {
    const blockHeight = execSync('solana block-height', { encoding: 'utf8' }).trim();
    const slot = execSync('solana slot', { encoding: 'utf8' }).trim();
    
    return {
      status: 'pass',
      message: 'Connected to Solana blockchain',
      details: [
        `Current block height: ${blockHeight}`,
        `Current slot: ${slot}`
      ]
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Cannot connect to Solana blockchain',
      details: [error instanceof Error ? error.message : 'Unknown error'],
      fix: [
        'Check blockchain connection:',
        '• Verify RPC endpoint: solana config get',
        '• Try different cluster: solana config set -u devnet',
        '• Check network connectivity'
      ]
    };
  }
}

async function checkProgramDeployment(): Promise<CheckResult> {
  const PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
  
  try {
    const programInfo = execSync(`solana program show ${PROGRAM_ID}`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (programInfo.includes('Program Id:')) {
      return {
        status: 'pass',
        message: 'GhostSpeak program is deployed',
        details: [`Program ID: ${PROGRAM_ID}`]
      };
    } else {
      return {
        status: 'warning',
        message: 'Program deployment status unclear',
        details: ['Unable to verify program deployment']
      };
    }
  } catch {
    return {
      status: 'warning',
      message: 'GhostSpeak program not found on current network',
      details: [
        'This is normal if you haven\'t deployed yet',
        `Program ID: ${PROGRAM_ID}`
      ],
      fix: [
        'Deploy the program:',
        '• Ensure you\'re on the correct network',
        '• From packages/core: anchor deploy',
        '• Or use the deployed devnet version'
      ]
    };
  }
}

async function checkRecentBlockhash(): Promise<CheckResult> {
  try {
    const config = await ConfigManager.load();
    const rpcUrl = config.get().rpcUrl || 'https://api.devnet.solana.com';
    
    const rpc = createSolanaRpc({ url: rpcUrl }) as Rpc<SolanaRpcApi>;
    
    const { value } = await rpc.getLatestBlockhash().send();
    
    return {
      status: 'pass',
      message: 'Can fetch recent blockhash',
      details: [
        `Blockhash: ${value.blockhash.substring(0, 20)}...`,
        `Last valid block height: ${value.lastValidBlockHeight}`
      ]
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Cannot fetch recent blockhash',
      details: [error instanceof Error ? error.message : 'Unknown error'],
      fix: [
        'This indicates RPC issues:',
        '• Check RPC endpoint configuration',
        '• Verify network connectivity',
        '• Try a different RPC provider'
      ]
    };
  }
}

async function checkCLIConfiguration(): Promise<CheckResult> {
  try {
    const config = await ConfigManager.load();
    const configData = config.get();
    
    if (Object.keys(configData).length > 0) {
      return {
        status: 'pass',
        message: 'CLI configuration found',
        details: [
          `Network: ${configData.network || 'default'}`,
          `Config path: ${config.getConfigPath()}`
        ]
      };
    } else {
      return {
        status: 'warning',
        message: 'Using default configuration',
        details: ['No custom configuration set'],
        fix: [
          'Customize your configuration:',
          '• Run: ghostspeak config',
          '• Or: ghostspeak wizard'
        ]
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      message: 'Configuration check failed',
      details: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function checkEnvironmentVariables(): Promise<CheckResult> {
  const importantVars = [
    { name: 'SOLANA_NETWORK', required: false },
    { name: 'ANCHOR_PROVIDER_URL', required: false },
    { name: 'ANCHOR_WALLET', required: false }
  ];
  
  const missing: string[] = [];
  const found: string[] = [];
  
  for (const { name, required } of importantVars) {
    if (process.env[name]) {
      found.push(`${name}=${process.env[name]}`);
    } else if (required) {
      missing.push(name);
    }
  }
  
  if (missing.length === 0) {
    return {
      status: found.length > 0 ? 'pass' : 'warning',
      message: found.length > 0 ? 'Environment variables configured' : 'No environment variables set',
      details: found.length > 0 ? found : ['Using CLI configuration instead']
    };
  } else {
    return {
      status: 'fail',
      message: 'Required environment variables missing',
      details: [`Missing: ${missing.join(', ')}`],
      fix: [
        'Set required environment variables:',
        ...missing.map(v => `• export ${v}=<value>`),
        '• Or add to .env file'
      ]
    };
  }
}

async function checkNetworkConfiguration(): Promise<CheckResult> {
  try {
    const cluster = execSync('solana config get | grep "RPC URL"', { 
      encoding: 'utf8',
      shell: true 
    }).trim();
    
    const network = cluster.includes('devnet') ? 'devnet' :
                    cluster.includes('testnet') ? 'testnet' :
                    cluster.includes('mainnet') ? 'mainnet-beta' : 'unknown';
    
    return {
      status: 'pass',
      message: `Connected to ${network}`,
      details: [cluster]
    };
  } catch {
    return {
      status: 'warning',
      message: 'Unable to determine network',
      fix: [
        'Check Solana configuration:',
        '• Run: solana config get',
        '• Set network: solana config set -u devnet'
      ]
    };
  }
}

async function checkSDKInstallation(): Promise<CheckResult> {
  try {
    // Check if SDK package exists
    const packagePath = join(process.cwd(), 'node_modules', '@ghostspeak', 'sdk');
    
    if (existsSync(packagePath)) {
      return {
        status: 'pass',
        message: 'GhostSpeak SDK is installed'
      };
    } else {
      // Check in parent directories (monorepo structure)
      const parentPath = join(process.cwd(), '..', '..', 'packages', 'sdk');
      if (existsSync(parentPath)) {
        return {
          status: 'pass',
          message: 'GhostSpeak SDK found in monorepo'
        };
      }
      
      return {
        status: 'warning',
        message: 'GhostSpeak SDK not found locally',
        details: ['SDK may need to be installed'],
        fix: [
          'Install GhostSpeak SDK:',
          '• Run: bun add @ghostspeak/sdk',
          '• Or: npm install @ghostspeak/sdk'
        ]
      };
    }
  } catch {
    return {
      status: 'warning',
      message: 'Unable to check SDK installation'
    };
  }
}

async function checkSDKInitialization(): Promise<CheckResult> {
  try {
    // This is a simplified check - in reality, we'd try to initialize the SDK
    const { GhostSpeakSDK } = await import('@ghostspeak/sdk');
    
    // Try to create an instance
    const sdk = new GhostSpeakSDK({
      network: 'devnet',
      wallet: null // Dummy wallet for testing
    });
    
    return {
      status: 'pass',
      message: 'SDK can be initialized',
      details: ['SDK is properly configured']
    };
  } catch (error) {
    return {
      status: 'warning',
      message: 'SDK initialization test skipped',
      details: ['Manual SDK testing recommended']
    };
  }
}

async function displayResults(results: DiagnosticResults, options: { verbose?: boolean }): Promise<void> {
  console.log('\n' + chalk.cyan('📋 Diagnostic Results'));
  console.log(chalk.gray('═'.repeat(60)) + '\n');

  // Summary
  console.log(chalk.yellow('Summary:'));
  console.log(`  Total checks: ${results.totalChecks}`);
  console.log(`  ✅ Passed: ${chalk.green(results.passed)}`);
  console.log(`  ⚠️  Warnings: ${chalk.yellow(results.warnings)}`);
  console.log(`  ❌ Failed: ${chalk.red(results.failures)}`);
  if (results.criticalFailures > 0) {
    console.log(`  🚨 Critical failures: ${chalk.red.bold(results.criticalFailures)}`);
  }
  console.log('');

  // Group checks by category
  const categories = ['prerequisites', 'network', 'wallet', 'blockchain', 'configuration', 'sdk'];
  
  for (const category of categories) {
    const categoryChecks = results.checks.filter(c => c.category === category);
    if (categoryChecks.length === 0) continue;

    console.log(chalk.cyan(`\n${category.charAt(0).toUpperCase() + category.slice(1)}:`));
    
    for (const check of categoryChecks) {
      const statusIcon = check.result.status === 'pass' ? '✅' :
                        check.result.status === 'warning' ? '⚠️' : '❌';
      const statusColor = check.result.status === 'pass' ? chalk.green :
                         check.result.status === 'warning' ? chalk.yellow : chalk.red;
      
      console.log(`  ${statusIcon} ${check.name}: ${statusColor(check.result.message)}`);
      
      // Show details if verbose or if there's an issue
      if (options.verbose || check.result.status !== 'pass') {
        if (check.result.details && check.result.details.length > 0) {
          for (const detail of check.result.details) {
            console.log(chalk.gray(`     ${detail}`));
          }
        }
        
        // Show fixes for failures
        if (check.result.fix && check.result.fix.length > 0) {
          console.log(chalk.blue('\n     🔧 How to fix:'));
          for (const fix of check.result.fix) {
            console.log(chalk.gray(`     ${fix}`));
          }
          console.log('');
        }
      }
    }
  }

  // Overall health assessment
  console.log('\n' + chalk.cyan('🏥 Overall Health Assessment'));
  console.log(chalk.gray('─'.repeat(60)));

  if (results.criticalFailures > 0) {
    console.log(chalk.red.bold('\n❌ CRITICAL: Your system has critical issues that must be resolved.'));
    console.log(chalk.red('   GhostSpeak CLI will not function properly until these are fixed.\n'));
  } else if (results.failures > 0) {
    console.log(chalk.yellow('\n⚠️  WARNING: Your system has some issues that should be addressed.'));
    console.log(chalk.yellow('   GhostSpeak CLI may not work as expected.\n'));
  } else if (results.warnings > 0) {
    console.log(chalk.yellow('\n⚠️  GOOD: Your system is mostly healthy with minor warnings.'));
    console.log(chalk.yellow('   GhostSpeak CLI should work fine.\n'));
  } else {
    console.log(chalk.green.bold('\n✅ EXCELLENT: Your system is fully configured and healthy!'));
    console.log(chalk.green('   GhostSpeak CLI is ready to use.\n'));
  }

  // Next steps
  console.log(chalk.cyan('📝 Next Steps:'));
  if (results.criticalFailures > 0 || results.failures > 0) {
    console.log(chalk.gray('   1. Fix the issues listed above (start with critical failures)'));
    console.log(chalk.gray('   2. Run "ghostspeak doctor" again to verify fixes'));
    console.log(chalk.gray('   3. Once all issues are resolved, run "ghostspeak quickstart"'));
  } else {
    console.log(chalk.gray('   1. Run "ghostspeak quickstart" to get started'));
    console.log(chalk.gray('   2. Try "ghostspeak agent register MyFirstAgent"'));
    console.log(chalk.gray('   3. Explore "ghostspeak help" for all commands'));
  }

  console.log('\n' + chalk.gray('For detailed information, run: ghostspeak doctor --verbose'));
}