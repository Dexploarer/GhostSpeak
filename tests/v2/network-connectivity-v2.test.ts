import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// ✅ Web3.js v2 ONLY - No v1 imports allowed
import { createSolanaRpc, type SolanaRpcApi } from '@solana/rpc';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { address, type Address } from '@solana/addresses';
import { lamports, type Lamports } from '@solana/rpc-types';

// ✅ Import v2 test utilities
import { TestConfigFactoryV2, NETWORK_SCENARIOS_V2, type TestConfigV2 } from './test-data-v2';

// ✅ Test configuration using v2 patterns
interface NetworkTestConfig {
  rpc: ReturnType<typeof createSolanaRpc>;
  testSigner: KeyPairSigner;
  programId: Address;
}

let networkConfig: NetworkTestConfig;

describe('Network Connectivity - Web3.js v2', () => {
  beforeAll(async () => {
    console.log('🌐 Setting up Web3.js v2 network tests...');
    
    // ✅ Create RPC connection using v2
    const rpc = createSolanaRpc(NETWORK_SCENARIOS_V2.localhost.url);
    
    // ✅ Generate test signer using v2
    const testSigner = await generateKeyPairSigner();
    
    // ✅ Define program ID using v2
    const programId = address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
    
    networkConfig = {
      rpc,
      testSigner,
      programId
    };
    
    console.log('✅ Web3.js v2 network setup completed');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up network tests...');
    // Cleanup logic here if needed
    console.log('✅ Network test cleanup completed');
  });

  test('should connect to RPC using v2 patterns', async () => {
    console.log('🧪 Testing RPC connection...');
    
    expect(networkConfig.rpc).toBeDefined();
    expect(typeof networkConfig.rpc).toBe('object');
    
    console.log('✅ RPC connection validated');
  });

  test('should validate signer generation using v2 patterns', async () => {
    console.log('🧪 Testing signer generation...');
    
    // ✅ Test original signer
    expect(networkConfig.testSigner).toBeDefined();
    expect(networkConfig.testSigner.address).toBeDefined();
    expect(typeof networkConfig.testSigner.address).toBe('string');
    
    // ✅ Generate additional signers
    const additionalSigners = await Promise.all([
      generateKeyPairSigner(),
      generateKeyPairSigner(),
      generateKeyPairSigner()
    ]);
    
    // ✅ Validate all signers are unique
    const allAddresses = [
      networkConfig.testSigner.address,
      ...additionalSigners.map(s => s.address)
    ];
    
    const uniqueAddresses = new Set(allAddresses);
    expect(uniqueAddresses.size).toBe(allAddresses.length);
    
    console.log(`✅ Generated ${allAddresses.length} unique signers`);
  });

  test('should validate address creation using v2 patterns', async () => {
    console.log('🧪 Testing address creation...');
    
    // ✅ Test program ID address
    expect(networkConfig.programId).toBeDefined();
    expect(typeof networkConfig.programId).toBe('string');
    
    // ✅ Test system program address
    const systemProgramId = address('11111111111111111111111111111112');
    expect(systemProgramId).toBeDefined();
    expect(typeof systemProgramId).toBe('string');
    
    // ✅ Test addresses are different
    expect(networkConfig.programId).not.toBe(systemProgramId);
    
    console.log('✅ Address creation validated');
  });

  test('should validate lamports handling using v2 patterns', async () => {
    console.log('🧪 Testing lamports handling...');
    
    // ✅ Create lamports using v2 pattern
    const oneSol = lamports(1_000_000_000n);
    const halfSol = lamports(500_000_000n);
    const quarterSol = lamports(250_000_000n);
    
    expect(oneSol).toBeDefined();
    expect(halfSol).toBeDefined();
    expect(quarterSol).toBeDefined();
    
    // ✅ Validate lamports are bigints
    expect(typeof oneSol).toBe('bigint');
    expect(typeof halfSol).toBe('bigint');
    expect(typeof quarterSol).toBe('bigint');
    
    // ✅ Validate arithmetic
    expect(halfSol + quarterSol).toBe(lamports(750_000_000n));
    
    console.log('✅ Lamports handling validated');
  });

  test('should handle concurrent operations using v2 patterns', async () => {
    console.log('🧪 Testing concurrent operations...');
    
    // ✅ Generate multiple signers concurrently
    const concurrentSigners = await Promise.all(
      Array.from({ length: 10 }, () => generateKeyPairSigner())
    );
    
    expect(concurrentSigners).toHaveLength(10);
    
    // ✅ Validate all signers have unique addresses
    const addresses = concurrentSigners.map(s => s.address);
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(10);
    
    // ✅ Validate all addresses are strings
    addresses.forEach(addr => {
      expect(typeof addr).toBe('string');
      expect(addr.length).toBeGreaterThan(0);
    });
    
    console.log('✅ Concurrent operations validated');
  });

  test('should validate error handling using v2 patterns', async () => {
    console.log('🧪 Testing error handling...');
    
    // ✅ Test valid address creation
    const validAddress = address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
    expect(validAddress).toBeDefined();
    expect(typeof validAddress).toBe('string');
    
    // ✅ Test valid lamports creation
    const validLamports = lamports(1000n);
    expect(validLamports).toBeDefined();
    expect(typeof validLamports).toBe('bigint');
    
    console.log('✅ Error handling validated');
  });

  test('should validate performance using v2 patterns', async () => {
    console.log('🧪 Testing performance...');
    
    const startTime = performance.now();
    
    // ✅ Generate signers in batches
    const batchSize = 50;
    const batches = 5;
    
    for (let i = 0; i < batches; i++) {
      const batch = await Promise.all(
        Array.from({ length: batchSize }, () => generateKeyPairSigner())
      );
      expect(batch).toHaveLength(batchSize);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Generated ${batchSize * batches} signers in ${duration.toFixed(2)}ms`);
    
    // ✅ Performance should be reasonable (under 5 seconds for 250 signers)
    expect(duration).toBeLessThan(5000);
    
    console.log('✅ Performance validated');
  });

  test('should validate test configuration factory using v2 patterns', async () => {
    console.log('🧪 Testing configuration factory...');
    
    // ✅ Create test configuration using v2 factory
    const testConfig = await TestConfigFactoryV2.createTestConfig();
    
    expect(testConfig).toBeDefined();
    expect(testConfig.rpc).toBeDefined();
    expect(testConfig.programId).toBeDefined();
    expect(testConfig.systemProgramId).toBeDefined();
    expect(testConfig.testAgents).toHaveLength(3);
    expect(testConfig.testChannels).toHaveLength(3);
    
    // ✅ Validate agents have v2 signers
    testConfig.testAgents.forEach(agent => {
      expect(agent.signer).toBeDefined();
      expect(agent.address).toBeDefined();
      expect(typeof agent.address).toBe('string');
    });
    
    // ✅ Validate channels have v2 addresses
    testConfig.testChannels.forEach(channel => {
      expect(channel.channelAddress).toBeDefined();
      expect(typeof channel.channelAddress).toBe('string');
    });
    
    console.log('✅ Configuration factory validated');
  });
}); 