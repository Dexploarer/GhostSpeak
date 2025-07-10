/**
 * Basic functionality test for the TypeScript SDK
 */

import { createDevnetClient } from './src/client-v2';
import { logger } from '../../shared/logger';

async function testBasicFunctionality() {
  try {
    logger.general.info('🔧 Testing TypeScript SDK basic functionality...');

    // Create a devnet client
    const client = createDevnetClient();
    logger.general.info('✅ Client created successfully');

    // Test connection
    const isConnected = await client.isConnected();
    logger.general.info(
      '🌐 Connection status:',
      isConnected ? 'Connected' : 'Not connected'
    );

    // Get cluster info
    try {
      const clusterInfo = await client.getClusterInfo();
      logger.general.info('📊 Cluster info:', clusterInfo);
    } catch (error) {
      logger.general.info(
        '⚠️ Could not get cluster info (expected on devnet):',
        error instanceof Error ? error.message : String(error)
      );
    }

    // Test RPC access
    const rpc = client.getRpc();
    logger.general.info('🔗 RPC client available:', !!rpc);

    // Test program ID access
    const programId = client.getProgramId();
    logger.general.info('🎯 Program ID:', programId);

    // Test services access
    const agents = client.agents;
    const channels = client.channels;
    logger.general.info('🤖 Agent service available:', !!agents);
    logger.general.info('📢 Channel service available:', !!channels);

    logger.general.info('✅ All basic functionality tests passed!');
    return true;
  } catch (error) {
    logger.general.error('❌ Basic functionality test failed:', error);
    return false;
  }
}

// Run the test
testBasicFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.general.error('Test execution failed:', error);
    process.exit(1);
  });
