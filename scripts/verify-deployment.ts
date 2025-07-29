#!/usr/bin/env tsx
/**
 * @fileoverview GhostSpeak deployment verification system
 * @description Comprehensive verification of program deployment, IDL, and network connectivity
 * @author GhostSpeak Development Team
 * @version 1.0.0
 * 
 * @example
 * ```bash
 * # Verify deployment on current cluster
 * npm run verify:deployment
 * 
 * # Direct script execution
 * tsx scripts/verify-deployment.ts
 * ```
 */

import { execSync } from 'child_process'
import chalk from 'chalk'
import { createSolanaRpc, address } from '@solana/kit'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Result of deployment verification process
 */
interface VerificationResult {
  /** Overall verification success status */
  success: boolean;
  /** Program ID if found */
  programId?: string;
  /** Whether IDL file exists */
  idlExists: boolean;
  /** Whether program is deployed on chain */
  programDeployed: boolean;
  /** Whether wallet configuration is found */
  walletFound: boolean;
  /** Number of recent transactions */
  recentActivity: number;
  /** List of errors encountered */
  errors: string[];
}

/**
 * Comprehensive deployment verification system
 * Checks program deployment, IDL, wallet configuration, and network activity
 */
class DeploymentVerifier {
  private errors: string[] = [];

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[${new Date().toISOString()}] ${message}`));
  }

  private addError(error: string): void {
    this.errors.push(error);
    this.log(error, 'error');
  }

  private getProgramId(): string | null {
    try {
      const programIdOutput = execSync('anchor keys list', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      const programId = programIdOutput.split(':')[1]?.trim();
      
      if (!programId) {
        this.addError('Could not determine program ID from anchor keys');
        return null;
      }
      
      this.log(`Program ID: ${programId}`, 'info');
      return programId;
    } catch (error) {
      this.addError(`Failed to get program ID: ${error}`);
      return null;
    }
  }

  private checkIdlExists(): boolean {
    try {
      const idlPath = join(process.cwd(), 'target', 'idl', 'ghostspeak_marketplace.json');
      if (existsSync(idlPath)) {
        const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
        this.log(`IDL found: ${idl.metadata?.name || 'unknown'} v${idl.metadata?.version || 'unknown'}`, 'success');
        return true;
      } else {
        this.log('IDL file not found', 'warn');
        return false;
      }
    } catch (error) {
      this.addError(`Failed to check IDL: ${error}`);
      return false;
    }
  }

  async verify(): Promise<VerificationResult> {
    this.log('🔍 Starting GhostSpeak deployment verification', 'info');
    
    const result: VerificationResult = {
      success: false,
      idlExists: false,
      programDeployed: false,
      walletFound: false,
      recentActivity: 0,
      errors: []
    };

    // Get program ID
    const programId = this.getProgramId();
    if (!programId) {
      result.errors = this.errors;
      return result;
    }
    result.programId = programId;

    // Check IDL
    result.idlExists = this.checkIdlExists();
    
    // Connect to cluster and check program deployment
    const cluster = process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com';
    this.log(`Connecting to cluster: ${cluster}`, 'info');
    
    try {
      const rpc = createSolanaRpc(cluster);
      
      // Check if program is deployed
      const accountInfo = await rpc.getAccountInfo(address(programId), {
        encoding: 'base64'
      }).send();
      
      if (accountInfo.value) {
        result.programDeployed = true;
        const dataSize = accountInfo.value.data[0] ? 
          Buffer.from(accountInfo.value.data[0], 'base64').length : 0;
        this.log(`Program deployed - Size: ${dataSize} bytes, Lamports: ${accountInfo.value.lamports}`, 'success');
      } else {
        this.addError('Program not found on chain');
      }

      // Check recent activity
      const signatures = await rpc.getSignaturesForAddress(
        address(programId),
        { limit: 5 }
      ).send();
      
      result.recentActivity = signatures.length;
      this.log(`Found ${signatures.length} recent transactions`, 'info');
      
    } catch (error) {
      this.addError(`Failed to verify program deployment: ${error}`);
    }

    // Check wallet
    result.walletFound = this.checkWallet();

    // Final result
    result.success = result.programDeployed && this.errors.length === 0;
    result.errors = this.errors;

    return result;
  }

  private checkWallet(): boolean {
    try {
      const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
      if (existsSync(walletPath)) {
        this.log(`Wallet found at: ${walletPath}`, 'success');
        return true;
      } else {
        this.log('Wallet not found', 'warn');
        return false;
      }
    } catch (error) {
      this.addError(`Failed to check wallet: ${error}`);
      return false;
    }
  }
}

async function main(): Promise<void> {
  const verifier = new DeploymentVerifier();
  
  try {
    const result = await verifier.verify();
    
    // Display summary
    console.log(chalk.bold.blue('\n📊 Verification Summary:'));
    console.log(`Program ID: ${result.programId || 'N/A'}`);
    console.log(`IDL Exists: ${result.idlExists ? '✅' : '❌'}`);
    console.log(`Program Deployed: ${result.programDeployed ? '✅' : '❌'}`);
    console.log(`Wallet Found: ${result.walletFound ? '✅' : '❌'}`);
    console.log(`Recent Activity: ${result.recentActivity} transactions`);
    
    if (result.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${result.errors.length}`));
      result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
    }
    
    if (result.success) {
      console.log(chalk.bold.green('\n✅ Verification completed successfully!'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red('\n❌ Verification failed!'));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Verification error:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Verification system error:'), error);
    process.exit(1);
  });
}

export { DeploymentVerifier };
export type { VerificationResult };