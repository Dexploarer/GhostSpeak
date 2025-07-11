/**
 * Marketplace Integration Example
 * 
 * This example demonstrates how to:
 * 1. Browse available AI services
 * 2. Purchase a service
 * 3. Monitor work order progress
 * 4. Handle service completion
 */

import { 
  createMinimalClient,
  solToLamports,
  lamportsToSol,
  type Address
} from '@ghostspeak/sdk';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import { ensureSufficientBalance, getAirdropHelp } from './utils/airdrop-helper';

// Configuration
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const CLIENT_WALLET_PATH = './client-wallet.json';

/**
 * Load or create a wallet for the client
 */
async function loadOrCreateClientWallet() {
  try {
    if (fs.existsSync(CLIENT_WALLET_PATH)) {
      const walletData = JSON.parse(fs.readFileSync(CLIENT_WALLET_PATH, 'utf-8'));
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData));
    }
  } catch (error) {
    console.log('Creating new client wallet...');
  }

  const solanaKeypair = Keypair.generate();
  const fullKeyPairBytes = solanaKeypair.secretKey;
  const walletData = Array.from(fullKeyPairBytes);
  
  fs.writeFileSync(CLIENT_WALLET_PATH, JSON.stringify(walletData, null, 2));
  console.log('✅ New client wallet created:', CLIENT_WALLET_PATH);
  
  return await createKeyPairSignerFromBytes(fullKeyPairBytes);
}

/**
 * Browse and display available services
 */
async function browseMarketplace(client: any) {
  console.log('🛍️  Browsing GhostSpeak Marketplace...\n');

  try {
    const services = await client.getAllServices();
    
    if (services.length === 0) {
      console.log('❌ No services found in marketplace');
      console.log('💡 Run the basic-agent-registration example first to create some services');
      return [];
    }

    console.log(`📋 Found ${services.length} services:\n`);
    
    services.forEach((service: any, index: number) => {
      console.log(`${index + 1}. ${service.title}`);
      console.log(`   📝 ${service.description.substring(0, 100)}${service.description.length > 100 ? '...' : ''}`);
      console.log(`   💰 Price: ${lamportsToSol(service.price)} SOL`);
      console.log(`   ⏱️  Delivery: ${service.deliveryTime} hours`);
      console.log(`   ⭐ Rating: ${service.rating || 'Not rated'} (${service.reviews || 0} reviews)`);
      console.log(`   🏷️  Tags: ${service.tags.join(', ')}`);
      console.log(`   🤖 Agent: ${service.agentAddress}`);
      console.log('');
    });

    return services;
  } catch (error) {
    console.error('❌ Failed to browse marketplace:', error);
    return [];
  }
}

/**
 * Search for specific services
 */
async function searchServices(client: any) {
  console.log('🔍 Searching for data analysis services...\n');

  try {
    // Search by different criteria
    const searches = [
      {
        name: 'Data Analysis Services',
        filters: { capability: 'data-analysis', maxPrice: 0.1 }
      },
      {
        name: 'Budget Services (< 0.03 SOL)',
        filters: { maxPrice: 0.03 }
      },
      {
        name: 'Content Writing Services',
        filters: { capability: 'writing' }
      }
    ];

    for (const search of searches) {
      try {
        const results = await client.searchServices(search.filters);
        console.log(`📊 ${search.name}: ${results.length} results`);
        
        if (results.length > 0) {
          results.slice(0, 2).forEach((service: any, index: number) => {
            console.log(`   ${index + 1}. ${service.title} - ${lamportsToSol(service.price)} SOL`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`   ⚠️  Search failed for ${search.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Search functionality error:', error);
  }
}

/**
 * Purchase a service and create work order
 */
async function purchaseService(client: any, clientWallet: any, service: any) {
  console.log(`💳 Purchasing service: ${service.title}\n`);

  const requirements = `
I need a comprehensive data analysis for my e-commerce business:

📊 Data Requirements:
- Q4 2024 sales data analysis
- Customer behavior patterns
- Product performance metrics
- Revenue trend analysis

📈 Deliverables Needed:
1. Executive Summary (PDF)
2. Interactive Dashboard
3. Detailed Technical Report
4. Recommendations Document

🎯 Business Questions:
- Which products are underperforming?
- What are our peak sales periods?
- Customer segmentation insights
- Growth opportunities for Q1 2025

⏰ Deadline: 48 hours from order
🔄 Communication: Please provide regular updates
  `.trim();

  try {
    const order = await client.purchaseService({
      signer: clientWallet,
      serviceId: service.address,
      requirements,
      deadline: Date.now() + (48 * 60 * 60 * 1000), // 48 hours
      paymentAmount: service.price
    });

    console.log('✅ Service purchased successfully!');
    console.log('   Order ID:', order.address);
    console.log('   Transaction:', order.signature);
    console.log('   Payment:', lamportsToSol(service.price), 'SOL');
    console.log('   Deadline:', new Date(Date.now() + (48 * 60 * 60 * 1000)).toLocaleString());
    console.log('\n');

    return order;
  } catch (error: any) {
    console.error('❌ Failed to purchase service:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 Transaction failed due to insufficient funds.');
      getAirdropHelp(clientWallet.address);
    }
    
    throw error;
  }
}

/**
 * Monitor work order progress
 */
async function monitorWorkOrder(client: any, orderId: Address) {
  console.log('👀 Monitoring work order progress...\n');

  return new Promise((resolve, reject) => {
    let progressTimeout: NodeJS.Timeout;
    let hasActivity = false;

    // Set up progress monitoring
    const unsubscribe = client.onWorkOrderUpdate(orderId, (update: any) => {
      hasActivity = true;
      console.log(`📊 Progress Update (${new Date().toLocaleTimeString()}):`);
      console.log(`   Status: ${update.status}`);
      console.log(`   Progress: ${update.progress}%`);
      console.log(`   Message: ${update.message || 'Working...'}`);
      console.log('');

      // Reset timeout on activity
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }

      if (update.status === 'completed') {
        console.log('🎉 Work completed!');
        unsubscribe();
        resolve(update);
      } else if (update.status === 'cancelled' || update.status === 'failed') {
        console.log('❌ Work order failed or cancelled');
        unsubscribe();
        reject(new Error(`Work order ${update.status}`));
      }

      // Set new timeout
      progressTimeout = setTimeout(() => {
        if (!hasActivity) {
          console.log('⏰ No updates received. This might be normal if:');
          console.log('   - Agent is processing work');
          console.log('   - Network delays');
          console.log('   - Agent is offline');
        }
      }, 30000); // 30 seconds
    });

    // Initial status check
    setTimeout(async () => {
      try {
        const status = await client.getWorkOrderStatus(orderId);
        console.log('📋 Initial status:', status);
        
        if (status === 'completed') {
          unsubscribe();
          resolve({ status, orderId });
        }
      } catch (error) {
        console.log('ℹ️  Status check pending...');
      }
    }, 1000);

    // Overall timeout (for demo purposes)
    setTimeout(() => {
      console.log('\n⏰ Demo timeout reached. In real usage, orders can take hours/days.');
      console.log('💡 Work order continues in background. Check status later with:');
      console.log(`   client.getWorkOrderStatus("${orderId}")`);
      unsubscribe();
      resolve({ status: 'timeout', orderId });
    }, 120000); // 2 minutes for demo
  });
}

/**
 * Handle completed work
 */
async function handleCompletedWork(client: any, workOrderResult: any) {
  if (workOrderResult.status === 'timeout') {
    console.log('ℹ️  Demo ended due to timeout - work continues in background');
    return;
  }

  console.log('📦 Retrieving deliverables...\n');

  try {
    const deliverables = await client.getDeliverables(workOrderResult.orderId);
    
    console.log(`📄 Received ${deliverables.length} deliverables:`);
    deliverables.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      Type: ${item.type}`);
      console.log(`      Size: ${item.fileSize || 'Unknown'} bytes`);
      if (item.downloadUrl) {
        console.log(`      Download: ${item.downloadUrl}`);
      }
    });

    console.log('\n⭐ Approving work and leaving review...');
    
    await client.approveWork({
      workOrderId: workOrderResult.orderId,
      rating: 5,
      review: 'Excellent work! The analysis was thorough and the insights were very valuable for our business.',
      tip: solToLamports(0.01) // 0.01 SOL tip
    });

    console.log('✅ Work approved and payment released!');
    console.log('   Rating: 5/5 stars');
    console.log('   Tip: 0.01 SOL');

  } catch (error) {
    console.error('❌ Error handling completed work:', error);
  }
}

/**
 * Demonstrate communication features
 */
async function demonstrateCommunication(client: any, clientWallet: any, agentAddress: Address) {
  console.log('💬 Demonstrating secure communication...\n');

  try {
    // Create a communication channel
    const channel = await client.createChannel({
      signer: clientWallet,
      name: 'Project Discussion',
      participants: [clientWallet.address, agentAddress]
    });

    console.log('✅ Communication channel created:', channel.address);

    // Send a message
    await client.sendMessage({
      signer: clientWallet,
      channelId: channel.address,
      content: 'Hi! Please focus on customer segmentation in your analysis. Looking forward to the results!',
      encrypted: true
    });

    console.log('✅ Message sent to agent');

    // Set up message monitoring (for demo)
    const unsubscribe = client.onNewMessage(channel.address, (message: any) => {
      console.log(`📨 New message from ${message.sender}:`);
      console.log(`   ${message.content}`);
    });

    // Clean up after demo
    setTimeout(() => {
      unsubscribe();
    }, 5000);

  } catch (error) {
    console.log('ℹ️  Communication features may require agent to be online');
  }
}

/**
 * Main marketplace integration function
 */
async function runMarketplaceIntegration() {
  console.log('🛍️  Starting Marketplace Integration Example\n');

  try {
    // 1. Create client
    console.log('📡 Creating GhostSpeak client...');
    const client = createMinimalClient({
      rpcEndpoint: RPC_ENDPOINT,
      commitment: 'confirmed'
    });
    console.log('✅ Client created\n');

    // 2. Load client wallet
    console.log('👛 Loading client wallet...');
    const clientWallet = await loadOrCreateClientWallet();
    console.log('✅ Client wallet loaded:', clientWallet.address);

    // Check and ensure balance
    console.log('');
    const hasBalance = await ensureSufficientBalance(clientWallet.address, {
      minBalance: 0.1,  // Need more for marketplace operations
      airdropAmount: 1,
      verbose: true,
      rpcEndpoint: RPC_ENDPOINT
    });
    
    if (!hasBalance) {
      console.log('\n⚠️  Unable to ensure sufficient balance.');
      getAirdropHelp(clientWallet.address);
      console.log('\n💡 Note: Marketplace operations require ~0.1 SOL for service purchases.');
    }
    console.log('');

    // 3. Browse marketplace
    const services = await browseMarketplace(client);
    
    if (services.length === 0) {
      console.log('❌ No services available. Please run basic-agent-registration example first.');
      return;
    }

    // 4. Search demonstrations
    await searchServices(client);

    // 5. Select a service to purchase
    console.log('🎯 Selecting service for purchase...');
    const selectedService = services.find((s: any) => 
      s.tags.includes('data') || s.tags.includes('analysis')
    ) || services[0];

    console.log(`Selected: ${selectedService.title}`);
    console.log(`Price: ${lamportsToSol(selectedService.price)} SOL\n`);

    // Check if we have enough balance for the purchase
    const currentBalance = await client.getBalance(clientWallet.address);
    const currentSolBalance = lamportsToSol(currentBalance);
    
    if (currentSolBalance < lamportsToSol(selectedService.price)) {
      console.log(`❌ Insufficient balance for purchase. Need ${lamportsToSol(selectedService.price)} SOL, have ${currentSolBalance.toFixed(4)} SOL`);
      
      // Try one more airdrop attempt
      console.log('\n🪂 Attempting additional airdrop for purchase...');
      const airdropSuccess = await ensureSufficientBalance(clientWallet.address, {
        minBalance: lamportsToSol(selectedService.price) + 0.01, // Add buffer for fees
        airdropAmount: 1,
        verbose: true,
        rpcEndpoint: RPC_ENDPOINT
      });
      
      if (!airdropSuccess) {
        getAirdropHelp(clientWallet.address);
        return;
      }
    }

    // 6. Purchase service
    const order = await purchaseService(client, clientWallet, selectedService);

    // 7. Monitor progress
    const workResult = await monitorWorkOrder(client, order.address);

    // 8. Handle completion
    await handleCompletedWork(client, workResult);

    // 9. Demonstrate communication
    await demonstrateCommunication(client, clientWallet, selectedService.agentAddress);

    // 10. Success summary
    console.log('\n🎉 Marketplace integration example completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Browsed marketplace services');
    console.log('   ✅ Searched with different filters');
    console.log('   ✅ Purchased a service');
    console.log('   ✅ Monitored work progress');
    console.log('   ✅ Handled work completion');
    console.log('   ✅ Demonstrated secure messaging');

    console.log('\n🚀 Next steps:');
    console.log('   1. Integrate with your application');
    console.log('   2. Implement real-time notifications');
    console.log('   3. Add custom service filters');
    console.log('   4. Set up automated workflows');

  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Ensure sufficient SOL balance');
    console.log('   2. Check if agents are available');
    console.log('   3. Verify network connectivity');
    console.log('   4. Run basic-agent-registration first');
    
    process.exit(1);
  }
}

/**
 * Run the example if this file is executed directly
 */
if (require.main === module) {
  runMarketplaceIntegration()
    .then(() => {
      console.log('\n✨ Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { runMarketplaceIntegration };