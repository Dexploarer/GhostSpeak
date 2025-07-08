#!/usr/bin/env bun

/**
 * GhostSpeak CLI Demo
 * 
 * Simple command-line interface to demonstrate GhostSpeak Protocol
 * functionality without the full React-based CLI.
 */

import { createDevnetClient } from './packages/sdk-typescript/src/index.js';
import { generateKeyPairSigner } from '@solana/signers';

// Simple CLI argument parser
const args = process.argv.slice(2);
const command = args[0] || 'help';

console.log('🚀 GhostSpeak Protocol CLI Demo');
console.log('===============================\n');

async function runCLI() {
  const client = createDevnetClient();
  
  switch (command) {
    case 'status':
      await showStatus(client);
      break;
      
    case 'agents':
      await listAgents(client);
      break;
      
    case 'balance':
      await checkBalance(client, args[1]);
      break;
      
    case 'reputation':
      await checkReputation(client, args[1]);
      break;
      
    case 'discover':
      await discoverAgents(client);
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

async function showStatus(client: any) {
  console.log('📊 GhostSpeak Protocol Status');
  console.log('-----------------------------');
  console.log(`🌐 Network: ${client.rpcEndpoint}`);
  console.log(`🎯 Program ID: ${client.programId}`);
  console.log(`⚙️ Commitment: ${client.getCommitment()}`);
  console.log(`🔗 WebSocket: ${client.getWsEndpoint() || 'Auto-derived'}`);
  
  console.log('\n🛠️ Available Services:');
  const services = [
    'agents', 'channels', 'messages', 'escrow', 'auctions', 
    'bulkDeals', 'reputation', 'realtime', 'crossPlatform',
    'messageRouter', 'offlineSync'
  ];
  
  for (const service of services) {
    const isLoaded = client[service] ? '✅' : '❌';
    console.log(`   ${isLoaded} ${service}`);
  }
}

async function listAgents(client: any) {
  console.log('🤖 Agent Discovery');
  console.log('------------------');
  
  try {
    const discovery = await client.agents.discoverAgents({ limit: 10 });
    console.log(`Found ${discovery.agents.length} agents:`);
    
    for (const [i, agent] of discovery.agents.entries()) {
      console.log(`\n${i + 1}. Agent: ${agent.name || 'Unnamed'}`);
      console.log(`   Address: ${agent.address?.substring(0, 20)}...`);
      console.log(`   Capabilities: ${agent.capabilities?.join(', ') || 'None listed'}`);
      console.log(`   Rate: ${agent.hourlyRate ? `${agent.hourlyRate} SOL/hr` : 'Not specified'}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function checkBalance(client: any, address?: string) {
  console.log('💰 Balance Check');
  console.log('----------------');
  
  if (!address) {
    // Generate a test address
    const testKey = await generateKeyPairSigner();
    address = testKey.address;
    console.log(`🔑 Generated test address: ${address.substring(0, 20)}...`);
  }
  
  try {
    const balance = await client.getBalance(address);
    console.log(`💰 Balance: ${balance} SOL`);
  } catch (error) {
    console.log(`❌ Error checking balance: ${error.message}`);
  }
}

async function checkReputation(client: any, address?: string) {
  console.log('⭐ Reputation Check');
  console.log('-------------------');
  
  if (!address) {
    const testKey = await generateKeyPairSigner();
    address = testKey.address;
    console.log(`🔑 Using test address: ${address.substring(0, 20)}...`);
  }
  
  try {
    const profile = await client.reputation.getReputationProfile(address);
    console.log(`⭐ Overall Score: ${profile.overallScore}/5`);
    console.log(`🏆 Tier: ${profile.tier}`);
    console.log(`📊 Total Ratings: ${profile.totalRatings}`);
    
    if (profile.categories) {
      console.log('\n📋 Category Breakdown:');
      for (const [category, score] of Object.entries(profile.categories)) {
        console.log(`   ${category}: ${score}/5`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function discoverAgents(client: any) {
  console.log('🔍 Smart Agent Discovery');
  console.log('------------------------');
  
  const filters = [
    { name: 'AI Developers', capabilities: [1, 4] },
    { name: 'Content Creators', capabilities: [2, 8] },
    { name: 'Data Analysts', capabilities: [1, 16] }
  ];
  
  for (const filter of filters) {
    console.log(`\n🎯 Searching for ${filter.name}...`);
    try {
      const discovery = await client.agents.discoverAgents({
        limit: 3,
        requiredCapabilities: filter.capabilities
      });
      
      console.log(`   Found ${discovery.agents.length} ${filter.name.toLowerCase()}`);
      for (const agent of discovery.agents.slice(0, 2)) {
        console.log(`   • ${agent.name || 'Unnamed'} (${agent.address?.substring(0, 15)}...)`);
      }
    } catch (error) {
      console.log(`   ❌ Search failed: ${error.message}`);
    }
  }
}

function showHelp() {
  console.log('📖 GhostSpeak CLI Commands');
  console.log('==========================');
  console.log('');
  console.log('Usage: bun cli-demo.ts <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  status              Show protocol status and services');
  console.log('  agents              List available agents');
  console.log('  balance [address]   Check SOL balance (generates test address if none provided)');
  console.log('  reputation [addr]   Check reputation profile');
  console.log('  discover            Smart agent discovery by categories');
  console.log('  help                Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun cli-demo.ts status');
  console.log('  bun cli-demo.ts agents');
  console.log('  bun cli-demo.ts balance');
  console.log('  bun cli-demo.ts discover');
}

// Run the CLI
runCLI().catch(console.error);