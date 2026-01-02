#!/usr/bin/env bun
/**
 * Test script for ExternalIdResolver
 * Tests integration with local devnet API
 */

import { ExternalIdResolver } from './src/modules/api/ExternalIdResolver.js';
import { address } from '@solana/addresses';

async function testResolver() {
  console.log('🧪 Testing ExternalIdResolver with devnet API...\n');

  const resolver = new ExternalIdResolver({
    cluster: 'localnet' // Uses http://localhost:3001
  });

  // Test 1: Check API health
  console.log('1️⃣ Testing API health check...');
  try {
    const health = await resolver.checkHealth();
    console.log('✅ Health check passed:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Network: ${health.network}`);
    console.log(`   RPC Connected: ${health.rpc.connected}`);
    console.log(`   RPC Latency: ${health.rpc.latency}ms\n`);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return;
  }

  // Test 2: Test lookup with non-existent ID (should error)
  console.log('2️⃣ Testing lookup with non-existent external ID...');
  try {
    await resolver.lookup('payai', 'non-existent-agent');
    console.log('❌ Expected error but got success\n');
  } catch (error: any) {
    if (error.name === 'ExternalIdNotFoundError') {
      console.log('✅ Correctly threw ExternalIdNotFoundError');
      console.log(`   Message: ${error.message}\n`);
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }

  // Test 3: Test getGhost with non-existent address (should error)
  console.log('3️⃣ Testing getGhost with non-existent address...');
  try {
    const testAddress = address('11111111111111111111111111111111');
    await resolver.getGhost(testAddress);
    console.log('❌ Expected error but got success\n');
  } catch (error: any) {
    if (error.name === 'GhostNotFoundError') {
      console.log('✅ Correctly threw GhostNotFoundError');
      console.log(`   Message: ${error.message}\n`);
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }

  // Test 4: Test exists method
  console.log('4️⃣ Testing exists method...');
  try {
    const exists = await resolver.exists('payai', 'non-existent-agent');
    console.log(`✅ exists() returned: ${exists} (expected: false)\n`);
  } catch (error) {
    console.error('❌ exists() threw error:', error);
  }

  // Test 5: Test resolveBatch with non-existent IDs
  console.log('5️⃣ Testing resolveBatch with non-existent IDs...');
  try {
    const results = await resolver.resolveBatch([
      { platform: 'payai', externalId: 'agent-1' },
      { platform: 'elizaos', externalId: 'agent-2' },
      { platform: 'test', externalId: 'agent-3' }
    ]);
    console.log('✅ resolveBatch completed:');
    console.log(`   Results: ${results.filter(r => r !== null).length} found, ${results.filter(r => r === null).length} not found\n`);
  } catch (error) {
    console.error('❌ resolveBatch error:', error);
  }

  // Test 6: Test API URL getters/setters
  console.log('6️⃣ Testing API URL management...');
  try {
    const currentUrl = resolver.getApiUrl();
    console.log(`✅ Current API URL: ${currentUrl}`);
    resolver.setApiUrl('http://test.example.com');
    console.log(`✅ Changed API URL to: ${resolver.getApiUrl()}`);
    resolver.setApiUrl(currentUrl); // Reset
    console.log(`✅ Reset API URL to: ${resolver.getApiUrl()}\n`);
  } catch (error) {
    console.error('❌ API URL management error:', error);
  }

  console.log('✨ ExternalIdResolver test suite completed!');
}

testResolver().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
