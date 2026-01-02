#!/usr/bin/env bun
/**
 * Basic Usage Example for GhostSpeak solana-agent-kit Plugin
 *
 * This example demonstrates how to use the GhostSpeak plugin to add
 * identity and reputation to your solana-agent-kit agents.
 */

import { SolanaAgentKit } from 'solana-agent-kit';
import { GhostPlugin, createGhostPlugin } from '../src/index.js';
import { Keypair } from '@solana/web3.js';

// Example agent address (replace with actual Ghost address for testing)
const EXAMPLE_GHOST_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🚀 GhostSpeak Plugin Example\n');

  // Create a wallet for the agent (in production, use proper key management)
  const wallet = Keypair.generate();

  // Initialize solana-agent-kit with GhostSpeak plugin
  const agent = new SolanaAgentKit(wallet, RPC_URL, {})
    .use(GhostPlugin); // Default devnet configuration

  console.log('✅ Agent initialized with Ghost identity support\n');

  // Example 1: Resolve External ID to Ghost Address
  console.log('📍 Example 1: Resolve External ID');
  console.log('-----------------------------------');
  try {
    const ghostAddress = await agent.methods.resolveExternalId({
      platform: 'payai',
      externalId: 'agent-123'
    });
    console.log(`✅ Resolved payai:agent-123 → ${ghostAddress}\n`);
  } catch (error: any) {
    console.log(`ℹ️  ${error.message} (expected for demo)\n`);
  }

  // Example 2: Get Ghost Identity
  console.log('👤 Example 2: Get Ghost Identity');
  console.log('-----------------------------------');
  try {
    const identity = await agent.methods.getGhostIdentity(EXAMPLE_GHOST_ADDRESS);
    console.log(`Name: ${identity.name}`);
    console.log(`Description: ${identity.description}`);
    console.log(`Ghost Score: ${identity.ghostScore}/1000`);
    console.log(`Status: ${identity.status}`);
    console.log(`Verified: ${identity.isVerified ? '✅' : '❌'}`);
    console.log(`External IDs: ${identity.externalIdentifiers.length}`);
    if (identity.didAddress) {
      console.log(`DID: ${identity.didAddress}`);
    }
    console.log();
  } catch (error: any) {
    console.log(`⚠️  ${error.message}\n`);
  }

  // Example 3: Get Ghost Score (Reputation)
  console.log('⭐ Example 3: Get Ghost Score');
  console.log('-----------------------------------');
  try {
    const score = await agent.methods.getGhostScore(EXAMPLE_GHOST_ADDRESS);
    console.log(`Score: ${score.score}/${score.maxScore}`);
    console.log('Components:');
    score.components.forEach(c => {
      console.log(`  - ${c.source}: ${c.score} (weight: ${(c.weight * 100).toFixed(0)}%)`);
    });
    console.log();
  } catch (error: any) {
    console.log(`⚠️  ${error.message}\n`);
  }

  // Example 4: Verify Ghost Identity
  console.log('🔐 Example 4: Verify Ghost');
  console.log('-----------------------------------');
  try {
    const verification = await agent.methods.verifyGhost(EXAMPLE_GHOST_ADDRESS);
    console.log(`Verified: ${verification.isVerified ? '✅' : '❌'}`);
    console.log(`Ghost Score: ${verification.ghostScore}/1000`);
    console.log(`Verification Level: ${verification.verificationLevel}`);
    console.log(`Credentials: ${verification.credentials.length}`);

    // Trust recommendation based on level
    switch (verification.verificationLevel) {
      case 'elite':
        console.log('✅ Recommendation: Highly trusted agent');
        break;
      case 'verified':
        console.log('✅ Recommendation: Verified and trusted');
        break;
      case 'basic':
        console.log('⚠️  Recommendation: Basic verification - suitable for low-risk');
        break;
      case 'unverified':
        console.log('❌ Recommendation: Proceed with caution');
        break;
    }
    console.log();
  } catch (error: any) {
    console.log(`⚠️  ${error.message}\n`);
  }

  // Example 5: Check External ID Existence
  console.log('🔍 Example 5: Check External ID Existence');
  console.log('-----------------------------------');
  try {
    const exists = await agent.methods.checkExternalIdExists({
      platform: 'payai',
      externalId: 'agent-123'
    });
    console.log(`PayAI agent-123 exists: ${exists ? '✅ Yes' : '❌ No'}\n`);
  } catch (error: any) {
    console.log(`ℹ️  ${error.message}\n`);
  }

  // Example 6: Get All External IDs
  console.log('🌐 Example 6: Get All External IDs');
  console.log('-----------------------------------');
  try {
    const externalIds = await agent.methods.getExternalIds(EXAMPLE_GHOST_ADDRESS);
    console.log(`Found ${externalIds.length} external identifiers:`);
    externalIds.forEach(id => {
      console.log(`  - ${id.platform}:${id.externalId} (verified: ${id.verified ? '✅' : '❌'})`);
    });
    console.log();
  } catch (error: any) {
    console.log(`⚠️  ${error.message}\n`);
  }

  console.log('✨ Example completed!');
  console.log('\n💡 Tip: Replace EXAMPLE_GHOST_ADDRESS with an actual Ghost address from devnet');
}

// Example 7: Custom Configuration
async function customConfigExample() {
  console.log('\n🔧 Example 7: Custom Configuration');
  console.log('-----------------------------------');

  const wallet = Keypair.generate();

  // Create plugin with custom configuration
  const customPlugin = createGhostPlugin({
    cluster: 'devnet',
    verbose: true,  // Enable logging
    // apiUrl: 'http://localhost:3001'  // Custom API (for local development)
  });

  const agent = new SolanaAgentKit(wallet, RPC_URL, {})
    .use(customPlugin);

  console.log('✅ Agent initialized with custom Ghost configuration\n');
}

// Run examples
main()
  .then(() => customConfigExample())
  .then(() => {
    console.log('\n🎉 All examples completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  });
