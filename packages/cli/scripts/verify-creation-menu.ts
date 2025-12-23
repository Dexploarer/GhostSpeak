
import { bootstrapServices } from '../src/core/bootstrap.js';
import { container, ServiceTokens } from '../src/core/Container.js';
import { initializeClient } from '../src/utils/client.js';
import { createSafeSDKClient } from '../src/utils/sdk-helpers.js';
import { MarketplaceService } from '../src/services/MarketplaceService.js';
import chalk from 'chalk';

async function verifyCreationMenuServices() {
  console.log(chalk.cyan('🔍 Verifying Creation Menu Services...'));

  try {
    // 1. Bootstrap
    bootstrapServices();
    console.log('✅ Services bootstrapped');

    // 2. Marketplace Service
    console.log('2. Verifying Marketplace Service...');
    try {
      const marketplaceService = container.resolve<MarketplaceService>(ServiceTokens.MARKETPLACE_SERVICE);
      if (marketplaceService) {
          console.log('✅ MarketplaceService resolved');
      }
    } catch (error) {
      console.error('❌ MarketplaceService failed:', error);
    }

    // 3. SDK Clients (Escrow, Channel, Auction, Governance)
    console.log('3. Verifying SDK Clients...');
    try {
      const { client } = await initializeClient('devnet');
      
      console.log('--------------------------------------------------');
      console.log('🔍 Client Keys:', JSON.stringify(Object.keys(client), null, 2));
      const proto = Object.getPrototypeOf(client);
      console.log('🔍 Client Prototype Keys:', JSON.stringify(Object.getOwnPropertyNames(proto), null, 2));
      console.log('--------------------------------------------------');
      
      if (client.agent) console.log('✅ Agent module found');
      if ((client as any).marketplace) console.log('✅ Marketplace module found');
      else console.log('❌ Marketplace module MISSING');
      
      if ((client as any).escrow) console.log('✅ Escrow module found');
      else console.log('❌ Escrow module MISSING');

    } catch (error) {
       console.error('❌ SDK Client verification failed:', error);
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error);
    process.exit(1);
  }
}

verifyCreationMenuServices();
