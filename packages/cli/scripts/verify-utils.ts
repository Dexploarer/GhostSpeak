
import { WalletService } from '../src/services/wallet-service.js';
import { loadConfig } from '../src/utils/config.js';
import chalk from 'chalk';

async function verifyUtils() {
  console.log(chalk.cyan('🔍 Verifying Utility Services...'));

  try {
    // 1. Config Loading
    console.log('1. Verifying Config Loading...');
    const config = loadConfig();
    console.log('✅ Config loaded:', JSON.stringify(config, null, 2));

    // 2. Wallet Service
    console.log('2. Verifying WalletService...');
    const walletService = new WalletService();
    try {
       const signer = await walletService.getActiveSigner();
       if (signer) {
           console.log('✅ Active wallet found:', signer.address.toString());
       } else {
           console.log('⚠️  No active wallet found (expected if fresh install)');
       }
    } catch (e) {
        // It's okay if it fails due to no wallet, as long as the service instantiates
        console.log('ℹ️  Wallet check result:', e instanceof Error ? e.message : String(e));
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error);
    process.exit(1);
  }
}

void verifyUtils();
