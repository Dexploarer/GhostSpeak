import { 
  createSolanaRpc, 
  generateKeyPairSigner, 
  address, 
  type KeyPairSigner, 
  type Address
} from '@solana/web3.js';

export interface TestConfig {
  rpc: ReturnType<typeof createSolanaRpc>;
  payerSigner: KeyPairSigner;
  programId: Address;
  network: 'devnet' | 'testnet' | 'localnet';
}

export interface TestEnvironmentData {
  payer: KeyPairSigner;
  testAgents: KeyPairSigner[];
  testChannels: Address[];
}

export interface TestEnvironment {
  config: TestConfig;
  rpc: ReturnType<typeof createSolanaRpc>;
  data: TestEnvironmentData;
}

export async function createTestConfig(): Promise<TestConfig> {
  const rpc = createSolanaRpc('http://127.0.0.1:8899');
  const payerSigner = await generateKeyPairSigner();
  const programId = address('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  
  return {
    rpc,
    payerSigner,
    programId,
    network: 'localnet'
  };
}

/**
 * Test environment management for Web3.js v2
 */
export class TestEnvironmentManager {
  /**
   * Setup a complete test environment with RPC and test data
   */
  static async setupTestEnvironment(): Promise<TestEnvironment> {
    const config = await createTestConfig();
    
    // Test RPC connection
    try {
      const slot = await config.rpc.getSlot().send();
      console.log(`Connected to test network at slot: ${slot}`);
    } catch (error) {
      throw new Error(`Failed to connect to test RPC: ${error}`);
    }

    const data = await this.createTestData();
    
    return {
      config,
      rpc: config.rpc,
      data
    };
  }

  /**
   * Create test data with Web3.js v2 patterns
   */
  static async createTestData(): Promise<TestEnvironmentData> {
    const payer = await generateKeyPairSigner();
    const testAgents = await Promise.all(
      Array.from({ length: 5 }, () => generateKeyPairSigner())
    );
    const testChannels = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const signer = await generateKeyPairSigner();
        return signer.address;
      })
    );

    return {
      payer,
      testAgents,
      testChannels
    };
  }

  /**
   * Cleanup test environment
   */
  static async cleanup(): Promise<void> {
    // Web3.js v2 RPC connections don't require explicit cleanup
    console.log('Test environment cleaned up');
  }

  /**
   * Validate test environment health
   */
  static async validateEnvironment(env: TestEnvironment): Promise<boolean> {
    try {
      // Test basic RPC functionality
      await env.rpc.getSlot().send();
      
      // Validate test data
      if (!env.data.payer || !env.data.testAgents.length || !env.data.testChannels.length) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Environment validation failed:', error);
      return false;
    }
  }
}

/**
 * Configuration defaults for different test scenarios
 */
export const TEST_CONFIGS = {
  unit: {
    network: 'localnet' as const,
    rpcUrl: 'http://127.0.0.1:8899',
    timeout: 5000
  },
  integration: {
    network: 'devnet' as const,
    rpcUrl: 'https://api.devnet.solana.com',
    timeout: 30000
  },
  e2e: {
    network: 'devnet' as const,
    rpcUrl: 'https://api.devnet.solana.com',
    timeout: 60000
  }
};

/**
 * Helper utilities for test configuration
 */
export class TestConfigUtils {
  static async createMinimalConfig(): Promise<TestConfig> {
    return createTestConfig();
  }

  static async createConfigForNetwork(network: 'devnet' | 'testnet' | 'localnet'): Promise<TestConfig> {
    const rpcUrls = {
      localnet: 'http://127.0.0.1:8899',
      devnet: 'https://api.devnet.solana.com',
      testnet: 'https://api.testnet.solana.com'
    };

    const rpc = createSolanaRpc(rpcUrls[network]);
    const payerSigner = await generateKeyPairSigner();
    const programId = address('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

    return {
      rpc,
      payerSigner,
      programId,
      network
    };
  }
}

/**
 * Cleanup test environment resources
 */
export async function cleanupTestEnvironment(): Promise<void> {
  // Clean up any test resources
  // In Web3.js v2, RPC connections don't need explicit cleanup
  console.log('Test environment cleanup completed');
}
