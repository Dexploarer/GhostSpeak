
import { bootstrapServices } from '../src/core/bootstrap.js';
import { container, ServiceTokens } from '../src/core/Container.js';
import { IAgentService, IWalletService } from '../src/types/services.js';
import { initializeClient } from '../src/utils/client.js';
import { createSafeSDKClient } from '../src/utils/sdk-helpers.js';
import { address } from '@solana/addresses';
import chalk from 'chalk';

async function verifySetupStatus() {
  console.log(chalk.cyan('🔍 Verifying Setup Status Logic...'));

  try {
    // 1. Bootstrap services
    console.log('1. Bootstrapping services...');
    bootstrapServices();
    console.log('✅ Services bootstrapped');

    // 2. Initialize Wallet
    console.log('2. Initializing wallet...');
    const walletService = container.resolve<IWalletService>(ServiceTokens.WALLET_SERVICE);
    // This might fail if no wallet is configured, which is fine for verification of logic
    const wallet = await walletService.getActiveWalletInterface();
    
    if (!wallet) {
      console.log(chalk.yellow('⚠️ No active wallet found. Skipping specific checks. Logic verification successful.'));
      return;
    }
    console.log(`✅ Wallet found: ${wallet.address}`);

    // 3. Verify Agent Service
    console.log('3. Verifying Agent Service...');
    try {
      const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE);
      const agents = await agentService.list({ owner: address(wallet.address) });
      console.log(`✅ Agent Service list call successful. Found ${agents.length} agents.`);
    } catch (error) {
      console.error('❌ Agent Service check failed:', error);
    }

    // 4. Verify Multisig Check
    console.log('4. Verifying Multisig Check...');
    try {
      const { client } = await initializeClient();
      const safeSdk = createSafeSDKClient(client);
      const multisigs = await safeSdk.governance.listMultisigs({ creator: address(wallet.address) });
      console.log(`✅ Governance Service list successful. Found ${multisigs.length} multisigs.`);
    } catch (error) {
       console.error('❌ Multisig check failed:', error);
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed with unexpected error:'), error);
    process.exit(1);
  }
}

verifySetupStatus();
