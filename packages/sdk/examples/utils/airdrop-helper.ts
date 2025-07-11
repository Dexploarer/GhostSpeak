/**
 * Airdrop Helper Utility
 * 
 * Provides automatic SOL airdrop functionality for SDK examples
 * with proper rate limiting and error handling.
 */

import type { Address } from '@solana/addresses';
import { createSolanaRpc } from '@solana/rpc';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AirdropConfig {
  /** RPC endpoint to use for airdrop */
  rpcEndpoint?: string;
  /** Minimum balance threshold in SOL */
  minBalance?: number;
  /** Amount to airdrop in SOL */
  airdropAmount?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Show verbose output */
  verbose?: boolean;
}

const DEFAULT_CONFIG: Required<AirdropConfig> = {
  rpcEndpoint: 'https://api.devnet.solana.com',
  minBalance: 0.01,
  airdropAmount: 1,
  maxRetries: 3,
  retryDelay: 2000,
  verbose: true
};

export class AirdropHelper {
  private config: Required<AirdropConfig>;
  private rpc: any;
  private lastAirdropTime: Map<string, number> = new Map();
  private readonly RATE_LIMIT_DELAY = 5000; // 5 seconds between airdrops per address

  constructor(config: AirdropConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rpc = createSolanaRpc(this.config.rpcEndpoint);
  }

  /**
   * Check balance and airdrop if needed
   */
  async ensureBalance(address: Address): Promise<boolean> {
    try {
      // Check current balance
      const balance = await this.getBalance(address);
      
      if (this.config.verbose) {
        console.log(`💰 Current balance for ${address}: ${balance.toFixed(4)} SOL`);
      }

      // Check if airdrop is needed
      if (balance >= this.config.minBalance) {
        if (this.config.verbose) {
          console.log('✅ Sufficient balance available');
        }
        return true;
      }

      // Attempt airdrop
      if (this.config.verbose) {
        console.log(`⚠️  Low balance detected (${balance.toFixed(4)} SOL < ${this.config.minBalance} SOL)`);
        console.log('🪂 Attempting automatic airdrop...');
      }

      const success = await this.requestAirdrop(address);
      
      if (success) {
        // Wait a bit for the airdrop to be processed
        await this.sleep(2000);
        
        // Verify new balance
        const newBalance = await this.getBalance(address);
        if (this.config.verbose) {
          console.log(`✅ New balance: ${newBalance.toFixed(4)} SOL`);
        }
        
        return newBalance >= this.config.minBalance;
      }

      return false;
    } catch (error) {
      if (this.config.verbose) {
        console.error('❌ Error checking/ensuring balance:', error);
      }
      return false;
    }
  }

  /**
   * Get balance for an address
   */
  private async getBalance(address: Address): Promise<number> {
    try {
      const result = await this.rpc
        .getBalance(address, { commitment: 'confirmed' })
        .send();
      
      return Number(result.value) / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  /**
   * Request airdrop with rate limiting and retries
   */
  private async requestAirdrop(address: Address): Promise<boolean> {
    // Check rate limit
    const lastAirdrop = this.lastAirdropTime.get(address);
    if (lastAirdrop) {
      const timeSinceLastAirdrop = Date.now() - lastAirdrop;
      if (timeSinceLastAirdrop < this.RATE_LIMIT_DELAY) {
        const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastAirdrop;
        if (this.config.verbose) {
          console.log(`⏳ Rate limit: waiting ${(waitTime / 1000).toFixed(1)}s before next airdrop...`);
        }
        await this.sleep(waitTime);
      }
    }

    // Try multiple methods
    const methods = [
      () => this.airdropViaRpc(address),
      () => this.airdropViaCli(address),
      () => this.airdropViaFaucet(address)
    ];

    for (const method of methods) {
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          const success = await method();
          if (success) {
            this.lastAirdropTime.set(address, Date.now());
            return true;
          }
        } catch (error) {
          if (this.config.verbose && attempt === this.config.maxRetries) {
            console.log(`⚠️  Method failed: ${error}`);
          }
        }

        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay);
        }
      }
    }

    return false;
  }

  /**
   * Airdrop via RPC
   */
  private async airdropViaRpc(address: Address): Promise<boolean> {
    try {
      const lamports = Math.floor(this.config.airdropAmount * 1_000_000_000);
      const signature = await this.rpc
        .requestAirdrop(address, lamports)
        .send();

      if (this.config.verbose) {
        console.log(`✅ Airdrop requested via RPC: ${signature}`);
      }

      // Wait for confirmation
      await this.waitForConfirmation(signature);
      return true;
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        throw new Error('RPC rate limit hit');
      }
      throw error;
    }
  }

  /**
   * Airdrop via Solana CLI
   */
  private async airdropViaCli(address: Address): Promise<boolean> {
    try {
      const command = `solana airdrop ${this.config.airdropAmount} ${address} --url ${this.config.rpcEndpoint}`;
      
      if (this.config.verbose) {
        console.log('🔧 Trying Solana CLI airdrop...');
      }

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('Requesting airdrop')) {
        throw new Error(`CLI error: ${stderr}`);
      }

      if (this.config.verbose && stdout) {
        console.log(`✅ CLI airdrop: ${stdout.trim()}`);
      }

      return true;
    } catch (error: any) {
      // Check if Solana CLI is installed
      if (error.message?.includes('command not found')) {
        throw new Error('Solana CLI not installed');
      }
      throw error;
    }
  }

  /**
   * Airdrop via web faucet (backup method)
   */
  private async airdropViaFaucet(address: Address): Promise<boolean> {
    if (this.config.verbose) {
      console.log('\n📋 Manual airdrop options:');
      console.log(`   1. Solana CLI: solana airdrop ${this.config.airdropAmount} ${address}`);
      console.log(`   2. Web Faucet: https://faucet.solana.com`);
      console.log(`   3. Sol Faucet: https://solfaucet.com`);
      console.log(`   4. QuickNode Faucet: https://faucet.quicknode.com/solana/devnet`);
      console.log(`\n   Address to fund: ${address}`);
      console.log(`   Amount needed: ${this.config.airdropAmount} SOL\n`);
    }
    
    throw new Error('Automatic airdrop unavailable - see manual options above');
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(signature: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.rpc
          .getSignatureStatuses([signature])
          .send();

        if (status.value[0]?.confirmationStatus === 'confirmed') {
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(1000);
    }

    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly airdrop instructions
   */
  static getAirdropInstructions(address: Address): string {
    return `
🪂 Airdrop Instructions
=====================

Your wallet needs SOL to pay for transactions. Here are your options:

1. **Automatic Airdrop** (if available):
   The example will try to airdrop automatically

2. **Solana CLI** (recommended):
   \`\`\`bash
   solana airdrop 1 ${address}
   \`\`\`

3. **Web Faucets**:
   • Sol Faucet: https://solfaucet.com
   • QuickNode: https://faucet.quicknode.com/solana/devnet
   • Official: https://faucet.solana.com

4. **Rate Limits**:
   • Wait 20-30 seconds between requests
   • Try different faucets if one is down
   • Use VPN if consistently blocked

5. **Verification**:
   Check your balance with:
   \`\`\`bash
   solana balance ${address}
   \`\`\`

💡 Tip: Save your wallet file to reuse the same address!
`;
  }
}

/**
 * Convenience function for examples
 */
export async function ensureSufficientBalance(
  address: Address,
  config?: AirdropConfig
): Promise<boolean> {
  const helper = new AirdropHelper(config);
  return helper.ensureBalance(address);
}

/**
 * Get formatted airdrop instructions
 */
export function getAirdropHelp(address: Address): void {
  console.log(AirdropHelper.getAirdropInstructions(address));
}