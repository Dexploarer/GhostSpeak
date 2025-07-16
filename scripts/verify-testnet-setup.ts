#!/usr/bin/env tsx

/**
 * Testnet Setup Verification Script
 * 
 * This script verifies that the testnet testing infrastructure is properly configured:
 * - Environment setup verification
 * - Network connectivity checks
 * - CLI availability and functionality
 * - Program deployment status
 * - Basic operation testing
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

interface VerificationResult {
  category: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: string;
  }[];
}

class TestnetSetupVerifier {
  private results: VerificationResult[] = [];

  async verifySetup(): Promise<boolean> {
    console.log(chalk.blue.bold('\n🔍 GhostSpeak Testnet Setup Verification\n'));
    
    try {
      await this.verifyEnvironment();
      await this.verifyNetworkConnectivity();
      await this.verifyCLIFunctionality();
      await this.verifyProgramDeployment();
      await this.verifyBasicOperations();
      
      return this.generateReport();
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Verification failed!'));
      console.error(chalk.red((error as Error).message));
      return false;
    }
  }

  private async verifyEnvironment(): Promise<void> {
    console.log(chalk.yellow('🔧 Verifying environment...'));
    
    const checks: VerificationResult['checks'] = [];
    
    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      
      if (majorVersion >= 20) {
        checks.push({
          name: 'Node.js Version',
          status: 'pass',
          message: `${nodeVersion} (✓ >= 20.x required)`,
        });
      } else {
        checks.push({
          name: 'Node.js Version',
          status: 'fail',
          message: `${nodeVersion} (✗ >= 20.x required)`,
          details: 'Please upgrade to Node.js 20.x or higher'
        });
      }
    } catch {
      checks.push({
        name: 'Node.js',
        status: 'fail',
        message: 'Not installed or not in PATH',
        details: 'Please install Node.js 20.x or higher'
      });
    }
    
    // Check Solana CLI
    try {
      const solanaVersion = execSync('solana --version', { encoding: 'utf8' }).trim();
      checks.push({
        name: 'Solana CLI',
        status: 'pass',
        message: solanaVersion,
      });
    } catch {
      checks.push({
        name: 'Solana CLI',
        status: 'fail',
        message: 'Not installed or not in PATH',
        details: 'Please install Solana CLI: sh -c "$(curl -sSfL https://release.solana.com/v2.1.0/install)"'
      });
    }
    
    // Check Anchor CLI
    try {
      const anchorVersion = execSync('anchor --version', { encoding: 'utf8' }).trim();
      checks.push({
        name: 'Anchor CLI',
        status: 'pass',
        message: anchorVersion,
      });
    } catch {
      checks.push({
        name: 'Anchor CLI',
        status: 'fail',
        message: 'Not installed or not in PATH',
        details: 'Please install Anchor CLI: npm install -g @coral-xyz/anchor-cli@0.31.1'
      });
    }
    
    // Check TypeScript execution
    try {
      execSync('tsx --version', { encoding: 'utf8' });
      checks.push({
        name: 'TypeScript Execution (tsx)',
        status: 'pass',
        message: 'Available',
      });
    } catch {
      checks.push({
        name: 'TypeScript Execution (tsx)',
        status: 'fail',
        message: 'Not available',
        details: 'Please install tsx: npm install -g tsx'
      });
    }
    
    // Check environment variables
    const requiredEnvVars = ['HOME'];
    const optionalEnvVars = ['TESTNET_RPC_URL', 'SLACK_WEBHOOK_URL'];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'pass',
          message: 'Set',
        });
      } else {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'fail',
          message: 'Not set',
          details: `Please set ${envVar} environment variable`
        });
      }
    }
    
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'pass',
          message: 'Set (optional)',
        });
      } else {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'warning',
          message: 'Not set (optional)',
          details: `Consider setting ${envVar} for enhanced functionality`
        });
      }
    }
    
    this.results.push({
      category: 'Environment',
      checks
    });
  }

  private async verifyNetworkConnectivity(): Promise<void> {
    console.log(chalk.yellow('🌐 Verifying network connectivity...'));
    
    const checks: VerificationResult['checks'] = [];
    
    // Check Solana config
    try {
      const config = execSync('solana config get', { encoding: 'utf8' });
      const rpcUrl = config.match(/RPC URL: (.*)/)?.[1]?.trim();
      
      checks.push({
        name: 'Solana Configuration',
        status: 'pass',
        message: `RPC URL: ${rpcUrl}`,
      });
      
      if (rpcUrl?.includes('testnet')) {
        checks.push({
          name: 'Network Configuration',
          status: 'pass',
          message: 'Configured for testnet',
        });
      } else {
        checks.push({
          name: 'Network Configuration',
          status: 'warning',
          message: `Not configured for testnet (current: ${rpcUrl})`,
          details: 'Run: solana config set --url https://api.testnet.solana.com'
        });
      }
    } catch {
      checks.push({
        name: 'Solana Configuration',
        status: 'fail',
        message: 'Unable to read configuration',
        details: 'Please check Solana CLI installation'
      });
    }
    
    // Check testnet connectivity
    try {
      execSync('solana cluster-version', { stdio: 'pipe', timeout: 10000 });
      checks.push({
        name: 'Testnet Connectivity',
        status: 'pass',
        message: 'Connected to Solana testnet',
      });
    } catch {
      checks.push({
        name: 'Testnet Connectivity',
        status: 'fail',
        message: 'Unable to connect to testnet',
        details: 'Check network connection and RPC URL'
      });
    }
    
    // Check wallet setup
    try {
      const balance = execSync('solana balance', { encoding: 'utf8', timeout: 10000 });
      const balanceAmount = parseFloat(balance.split(' ')[0]);
      
      if (balanceAmount >= 10) {
        checks.push({
          name: 'Wallet Balance',
          status: 'pass',
          message: `${balanceAmount} SOL (sufficient for testing)`,
        });
      } else if (balanceAmount >= 2) {
        checks.push({
          name: 'Wallet Balance',
          status: 'warning',
          message: `${balanceAmount} SOL (low for extensive testing)`,
          details: 'Consider getting more SOL: solana airdrop 10'
        });
      } else {
        checks.push({
          name: 'Wallet Balance',
          status: 'fail',
          message: `${balanceAmount} SOL (insufficient for testing)`,
          details: 'Get SOL for testing: solana airdrop 10'
        });
      }
    } catch {
      checks.push({
        name: 'Wallet Balance',
        status: 'fail',
        message: 'Unable to check wallet balance',
        details: 'Ensure wallet is configured: solana config get'
      });
    }
    
    this.results.push({
      category: 'Network Connectivity',
      checks
    });
  }

  private async verifyCLIFunctionality(): Promise<void> {
    console.log(chalk.yellow('🔧 Verifying CLI functionality...'));
    
    const checks: VerificationResult['checks'] = [];
    
    // Check if GhostSpeak CLI is available
    try {
      const helpOutput = execSync('npx ghostspeak --help', { encoding: 'utf8', timeout: 15000 });
      
      if (helpOutput.includes('GhostSpeak')) {
        checks.push({
          name: 'GhostSpeak CLI',
          status: 'pass',
          message: 'Available and responsive',
        });
      } else {
        checks.push({
          name: 'GhostSpeak CLI',
          status: 'warning',
          message: 'Available but unexpected output',
          details: 'CLI may not be properly built'
        });
      }
    } catch {
      checks.push({
        name: 'GhostSpeak CLI',
        status: 'fail',
        message: 'Not available or not working',
        details: 'Build the CLI: npm run build:cli'
      });
    }
    
    // Check CLI commands
    const commands = ['agent', 'marketplace', 'escrow', 'config'];
    
    for (const command of commands) {
      try {
        execSync(`npx ghostspeak ${command} --help`, { stdio: 'pipe', timeout: 10000 });
        checks.push({
          name: `CLI Command: ${command}`,
          status: 'pass',
          message: 'Available',
        });
      } catch {
        checks.push({
          name: `CLI Command: ${command}`,
          status: 'fail',
          message: 'Not available or not working',
          details: `Command "${command}" is not accessible`
        });
      }
    }
    
    this.results.push({
      category: 'CLI Functionality',
      checks
    });
  }

  private async verifyProgramDeployment(): Promise<void> {
    console.log(chalk.yellow('📦 Verifying program deployment...'));
    
    const checks: VerificationResult['checks'] = [];
    const programId = '5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK';
    
    // Check if program account exists
    try {
      const accountInfo = execSync(`solana account ${programId} --output json`, { encoding: 'utf8' });
      const account = JSON.parse(accountInfo);
      
      if (account.executable) {
        checks.push({
          name: 'Program Account',
          status: 'pass',
          message: 'Deployed and executable',
          details: `Program ID: ${programId}`
        });
      } else {
        checks.push({
          name: 'Program Account',
          status: 'fail',
          message: 'Account exists but not executable',
          details: 'Program may not be properly deployed'
        });
      }
      
      // Check program size
      const lamports = account.lamports || 0;
      checks.push({
        name: 'Program Size',
        status: 'pass',
        message: `${lamports} lamports`,
      });
      
    } catch {
      checks.push({
        name: 'Program Account',
        status: 'fail',
        message: 'Program not deployed or not accessible',
        details: 'Deploy the program: npm run deploy:testnet'
      });
    }
    
    // Check IDL availability
    try {
      execSync(`anchor idl fetch ${programId}`, { stdio: 'pipe' });
      checks.push({
        name: 'Program IDL',
        status: 'pass',
        message: 'Available on-chain',
      });
    } catch {
      checks.push({
        name: 'Program IDL',
        status: 'warning',
        message: 'Not available on-chain',
        details: 'Upload IDL: npm run idl:init'
      });
    }
    
    this.results.push({
      category: 'Program Deployment',
      checks
    });
  }

  private async verifyBasicOperations(): Promise<void> {
    console.log(chalk.yellow('⚡ Verifying basic operations...'));
    
    const checks: VerificationResult['checks'] = [];
    
    // Test marketplace listing
    try {
      execSync('npx ghostspeak marketplace list --network testnet', { stdio: 'pipe', timeout: 15000 });
      checks.push({
        name: 'Marketplace Query',
        status: 'pass',
        message: 'Marketplace listing successful',
      });
    } catch (error) {
      checks.push({
        name: 'Marketplace Query',
        status: 'fail',
        message: 'Marketplace listing failed',
        details: (error as Error).message
      });
    }
    
    // Test agent listing
    try {
      execSync('npx ghostspeak agent list --network testnet', { stdio: 'pipe', timeout: 15000 });
      checks.push({
        name: 'Agent Query',
        status: 'pass',
        message: 'Agent listing successful',
      });
    } catch (error) {
      checks.push({
        name: 'Agent Query',
        status: 'fail',
        message: 'Agent listing failed',
        details: (error as Error).message
      });
    }
    
    // Test escrow listing
    try {
      execSync('npx ghostspeak escrow list --network testnet', { stdio: 'pipe', timeout: 15000 });
      checks.push({
        name: 'Escrow Query',
        status: 'pass',
        message: 'Escrow listing successful',
      });
    } catch (error) {
      checks.push({
        name: 'Escrow Query',
        status: 'fail',
        message: 'Escrow listing failed',
        details: (error as Error).message
      });
    }
    
    this.results.push({
      category: 'Basic Operations',
      checks
    });
  }

  private generateReport(): boolean {
    console.log(chalk.blue.bold('\n📊 Verification Results\n'));
    
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;
    
    for (const result of this.results) {
      console.log(chalk.cyan.bold(`\n${result.category}`));
      console.log(chalk.cyan('─'.repeat(result.category.length + 10)));
      
      for (const check of result.checks) {
        totalChecks++;
        
        let statusIcon: string;
        let statusColor: (str: string) => string;
        
        switch (check.status) {
          case 'pass':
            statusIcon = '✅';
            statusColor = chalk.green;
            passedChecks++;
            break;
          case 'fail':
            statusIcon = '❌';
            statusColor = chalk.red;
            failedChecks++;
            break;
          case 'warning':
            statusIcon = '⚠️';
            statusColor = chalk.yellow;
            warningChecks++;
            break;
        }
        
        console.log(`${statusIcon} ${check.name}: ${statusColor(check.message)}`);
        
        if (check.details) {
          console.log(chalk.gray(`   ${check.details}`));
        }
      }
    }
    
    // Summary
    console.log(chalk.blue.bold('\n📋 Summary'));
    console.log(chalk.blue('═'.repeat(30)));
    console.log(chalk.white(`Total Checks: ${totalChecks}`));
    console.log(chalk.green(`Passed: ${passedChecks}`));
    console.log(chalk.yellow(`Warnings: ${warningChecks}`));
    console.log(chalk.red(`Failed: ${failedChecks}`));
    
    const successRate = (passedChecks / totalChecks) * 100;
    console.log(chalk.blue(`Success Rate: ${successRate.toFixed(1)}%`));
    
    // Overall status
    if (failedChecks === 0) {
      console.log(chalk.green.bold('\n🎉 All checks passed! Testnet setup is ready.'));
      if (warningChecks > 0) {
        console.log(chalk.yellow(`Note: ${warningChecks} warning(s) - consider addressing for optimal experience.`));
      }
      return true;
    } else {
      console.log(chalk.red.bold(`\n❌ ${failedChecks} check(s) failed. Please fix the issues above.`));
      return false;
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const verifier = new TestnetSetupVerifier();
  const success = await verifier.verifySetup();
  
  if (success) {
    console.log(chalk.green.bold('\n🚀 Ready to run testnet testing scripts!'));
    console.log(chalk.blue('\nAvailable commands:'));
    console.log(chalk.white('  npm run deploy:testnet     - Deploy to testnet'));
    console.log(chalk.white('  npm run test:testnet       - Run comprehensive tests'));
    console.log(chalk.white('  npm run test:performance   - Run performance benchmarks'));
    console.log(chalk.white('  npm run test:error-recovery - Run error recovery tests'));
    console.log(chalk.white('  npm run monitor:testnet     - Start continuous monitoring'));
    console.log(chalk.white('  npm run ci:pipeline        - Run full CI pipeline'));
  } else {
    console.log(chalk.red.bold('\n🔧 Please fix the issues above before running testnet tests.'));
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestnetSetupVerifier };