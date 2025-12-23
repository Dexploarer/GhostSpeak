
import { initializeClient } from '../src/utils/client.js';
import { createSafeSDKClient } from '../src/utils/sdk-helpers.js';
import chalk from 'chalk';

async function verifyManagementMenu() {
  console.log(chalk.cyan('🔍 Verifying Management Menu & Read Operations...'));

  try {
    const { client } = await initializeClient('devnet');
    
    // We don't need to actually call the blockchain (which needs real data), 
    // just verify the methods exist on the client instance.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = client as any;

    const checks = [
      { module: 'Agent', method: 'getAgentAccount', exists: !!c.agent?.getAgentAccount },
      { module: 'Agent', method: 'getAllAgents', exists: !!c.agent?.getAllAgents }, 
      
      { module: 'Marketplace', method: 'getServiceListing', exists: !!c.marketplace?.getServiceListing },
      { module: 'Marketplace', method: 'getAllServiceListings', exists: !!c.marketplace?.getAllServiceListings },
      
      { module: 'Escrow', method: 'getEscrowAccount', exists: !!c.escrow?.getEscrowAccount },
      { module: 'Escrow', method: 'getAllEscrows', exists: !!c.escrow?.getAllEscrows },
      
      // Dispute methods are often part of escrow or marketplace
      { module: 'Escrow', method: 'dispute', exists: !!c.escrow?.dispute },
    ];

    console.log('--------------------------------------------------');
    let allPass = true;
    checks.forEach(check => {
      if (check.exists) {
        console.log(`✅ ${check.module}.${check.method} exists`);
      } else {
        console.log(`❌ ${check.module}.${check.method} MISSING`);
        allPass = false;
      }
    });
    console.log('--------------------------------------------------');
    
    // Analytics is usually a separate service or on the client root
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((client as any).analytics) {
        console.log('✅ Analytics module found');
    } else {
        console.log('⚠️  Analytics module/service check skipped (might not be on SDK client)');
    }

    if (!allPass) {
      console.error(chalk.red('❌ Some management methods are missing from the SDK client.'));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error);
    process.exit(1);
  }
}

verifyManagementMenu();
