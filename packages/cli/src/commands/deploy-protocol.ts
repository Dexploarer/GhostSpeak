/**
 * Deploy Protocol Command - Simplified deployment for PoD Protocol
 */

import { select, input, confirm } from '@inquirer/prompts';
import { UIManager } from '../ui/ui-manager.js';
import { NetworkManager } from '../utils/network-manager.js';
import { ConfigManager } from '../utils/config-manager.js';
import { Command } from 'commander';
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import { createKeyPairSignerFromBytes } from '@solana/signers';
// import { getAddressFromEnvironment } from '@solana/addresses';
import chalk from 'chalk';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export class DeployProtocolCommand {
  private ui: UIManager;
  // private network: NetworkManager;
  // private config: ConfigManager;

  constructor() {
    this.ui = new UIManager();
    // this.network = new NetworkManager();
    // this.config = new ConfigManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle('Deploy Protocol', 'Deploy and validate podAI Protocol infrastructure');

      // Get deployment options
      const networkChoice = await select({
        message: 'Select deployment network:',
        choices: [
          { name: '🧪 Devnet (Recommended)', value: 'devnet' },
          { name: '🔧 Testnet', value: 'testnet' },
          { name: '🚀 Mainnet-Beta', value: 'mainnet' }
        ]
      });

      const programId = await input({
        message: 'Program ID (leave empty for default):',
        default: 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'
      });

      const confirmed = await confirm({
        message: `Deploy to ${networkChoice} with program ${programId}?`,
        default: true
      });

      if (!confirmed) {
        this.ui.warning('Deployment cancelled');
        return;
      }

      await this.deployProtocol({
        network: networkChoice,
        programId,
        wallet: undefined
      });

    } catch (error) {
      this.ui.error('Deployment failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async deployProtocol(options: { network: string; programId?: string; wallet?: string }): Promise<void> {
    this.ui.startProgress('Deploying Protocol Infrastructure');

    // Implementation of the deployment logic
    await this.runDeployment(options);
  }

  private async runDeployment(options: { network: string; programId?: string; wallet?: string }): Promise<void> {
    // The original deployment logic, cleaned up
    const { network, programId: inputProgramId, wallet: walletPath } = options;

    console.clear();
    console.log(chalk.cyan(figlet.textSync('podAI Deploy', { horizontalLayout: 'full' })));
    console.log(chalk.yellow('🚀 Deploying podAI Protocol Infrastructure\n'));

    const spinner = createSpinner('Initializing deployment...').start();

    try {
      // Network configuration
      const networks = {
        devnet: 'https://api.devnet.solana.com',
        testnet: 'https://api.testnet.solana.com', 
        mainnet: 'https://api.mainnet-beta.solana.com'
      };

      const rpcUrl = networks[network as keyof typeof networks];
      if (!rpcUrl) {
        throw new Error(`Invalid network: ${network}`);
      }

      spinner.update({ text: 'Connecting to Solana...' });

      // Initialize Solana RPC client
      const rpc = createSolanaRpc(rpcUrl);

      // Load wallet
      let walletBytes: Uint8Array;
      try {
        if (process.env.SOLANA_PRIVATE_KEY) {
          walletBytes = new Uint8Array(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
        } else {
          const defaultWalletPath = walletPath || join(homedir(), '.config', 'solana', 'id.json');
          const secretKey = JSON.parse(readFileSync(defaultWalletPath, 'utf8'));
          walletBytes = new Uint8Array(secretKey);
        }
      } catch (error) {
        throw new Error('Could not load wallet. Set SOLANA_PRIVATE_KEY or ensure wallet exists at ~/.config/solana/id.json');
      }

      const signer = await createKeyPairSignerFromBytes(walletBytes);

      // Check wallet balance
      const balanceResponse = await rpc.getBalance(signer.address).send();
      const balanceSOL = Number(balanceResponse.value) / 1e9;
      
      if (balanceSOL < 0.1) {
        throw new Error(`Insufficient balance: ${balanceSOL} SOL. Need at least 0.1 SOL for deployment checks.`);
      }

      spinner.success(`Connected to ${network} | Balance: ${balanceSOL.toFixed(4)} SOL`);

      // Validate program deployment
      spinner.start('Validating program deployment...');
      
      const programId = inputProgramId ? 
        address(inputProgramId) : 
        address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');

      try {
        const accountInfo = await rpc.getAccountInfo(programId).send();
        if (!accountInfo.value) {
          spinner.warn(`Program not found at ${programId}. You may need to deploy the Rust program first.`);
        } else {
          spinner.success(`Program validated at ${programId}`);
        }
      } catch (error) {
        spinner.warn(`Could not validate program: ${error}`);
      }

      // Check network health
      spinner.start('Checking network health...');
      
      await rpc.getHealth().send();
      const slotResponse = await rpc.getSlot().send();
      
      spinner.success(`Network healthy | Current slot: ${slotResponse}`);

      // Deployment summary
      console.log(chalk.green('\n✅ Deployment Check Complete!\n'));
      
      console.log(chalk.blue('📋 Deployment Summary:'));
      console.log(`   Network: ${network}`);
      console.log(`   RPC Endpoint: ${rpcUrl}`);
      console.log(`   Program ID: ${programId}`);
      console.log(`   Deployer: ${signer.address}`);
      console.log(`   Balance: ${balanceSOL.toFixed(4)} SOL`);
      console.log(`   Current Slot: ${slotResponse}`);
      
      console.log(chalk.yellow('\n💡 Next Steps:'));
      console.log('   1. Ensure the Rust program is deployed at the specified address');
      console.log('   2. Test agent registration with: podai register-agent');
      console.log('   3. Create channels with: podai manage-channels create');
      console.log('   4. Monitor analytics with: podai view-analytics');

      console.log(chalk.cyan('\n🎉 podAI Protocol deployment validation complete!'));

    } catch (error) {
      spinner.error(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

export const deployProtocolCommand = new Command('deploy-protocol')
  .description('Deploy the podAI Protocol infrastructure')
  .option('-n, --network <network>', 'Solana network (devnet, testnet, mainnet)', 'devnet')
  .option('-p, --program-id <programId>', 'Program ID to use for deployment')
  .option('-w, --wallet <path>', 'Path to wallet keypair file')
  .action(async (options) => {
    console.clear();
    console.log(chalk.cyan(figlet.textSync('podAI Deploy', { horizontalLayout: 'full' })));
    console.log(chalk.yellow('🚀 Deploying podAI Protocol Infrastructure\n'));

    const spinner = createSpinner('Initializing deployment...').start();

    try {
      // Network configuration
      const networks = {
        devnet: 'https://api.devnet.solana.com',
        testnet: 'https://api.testnet.solana.com', 
        mainnet: 'https://api.mainnet-beta.solana.com'
      };

      const rpcUrl = networks[options.network as keyof typeof networks];
      if (!rpcUrl) {
        throw new Error(`Invalid network: ${options.network}`);
      }

      spinner.update({ text: 'Connecting to Solana...' });

      // Initialize Solana RPC client
      const rpc = createSolanaRpc(rpcUrl);

      // Load wallet
      let walletBytes: Uint8Array;
      try {
        if (process.env.SOLANA_PRIVATE_KEY) {
          walletBytes = new Uint8Array(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
        } else {
          const walletPath = options.wallet || join(homedir(), '.config', 'solana', 'id.json');
          const secretKey = JSON.parse(readFileSync(walletPath, 'utf8'));
          walletBytes = new Uint8Array(secretKey);
        }
      } catch (error) {
        throw new Error('Could not load wallet. Set SOLANA_PRIVATE_KEY or specify wallet path with -w');
      }

      const signer = await createKeyPairSignerFromBytes(walletBytes);

      // Check wallet balance
      const balanceResponse = await rpc.getBalance(signer.address).send();
      const balanceSOL = Number(balanceResponse.value) / 1e9;
      
      if (balanceSOL < 0.1) {
        throw new Error(`Insufficient balance: ${balanceSOL} SOL. Need at least 0.1 SOL for deployment checks.`);
      }

      spinner.success(`Connected to ${options.network} | Balance: ${balanceSOL.toFixed(4)} SOL`);

      // Validate program deployment
      spinner.start('Validating program deployment...');
      
      const programId = options.programId ? 
        address(options.programId) : 
        address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');

      try {
        const accountInfo = await rpc.getAccountInfo(programId).send();
        if (!accountInfo.value) {
          spinner.warn(`Program not found at ${programId}. You may need to deploy the Rust program first.`);
        } else {
          spinner.success(`Program validated at ${programId}`);
        }
      } catch (error) {
        spinner.warn(`Could not validate program: ${error}`);
      }

      // Check network health
      spinner.start('Checking network health...');
      
      await rpc.getHealth().send();
      const slotResponse = await rpc.getSlot().send();
      
      spinner.success(`Network healthy | Current slot: ${slotResponse}`);

      // Deployment summary
      console.log(chalk.green('\n✅ Deployment Check Complete!\n'));
      
      console.log(chalk.blue('📋 Deployment Summary:'));
      console.log(`   Network: ${options.network}`);
      console.log(`   RPC Endpoint: ${rpcUrl}`);
      console.log(`   Program ID: ${programId}`);
      console.log(`   Deployer: ${signer.address}`);
      console.log(`   Balance: ${balanceSOL.toFixed(4)} SOL`);
      console.log(`   Current Slot: ${slotResponse}`);
      
      console.log(chalk.yellow('\n💡 Next Steps:'));
      console.log('   1. Ensure the Rust program is deployed at the specified address');
      console.log('   2. Test agent registration with: podai register-agent');
      console.log('   3. Create channels with: podai manage-channels create');
      console.log('   4. Monitor analytics with: podai view-analytics');

      console.log(chalk.cyan('\n🎉 podAI Protocol deployment validation complete!'));

    } catch (error) {
      spinner.error(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Helper function to validate program deployment
 */
async function validateProgramDeployment(rpc: any, programId: string): Promise<boolean> {
  try {
    const accountInfo = await rpc.getAccountInfo(address(programId)).send();
    return accountInfo.value !== null;
  } catch {
    return false;
  }
}

/**
 * Helper function to estimate deployment costs
 */
function estimateDeploymentCosts(): { programDeployment: number; operations: number; total: number } {
  return {
    programDeployment: 5.0, // Estimated SOL for program deployment
    operations: 0.1, // Estimated SOL for initialization operations
    total: 5.1
  };
}

// Export helper functions for testing
export { validateProgramDeployment, estimateDeploymentCosts };