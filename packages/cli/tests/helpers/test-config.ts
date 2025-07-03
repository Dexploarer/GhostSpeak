import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { getAddressEncoder, address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Test configuration interface
 */
export interface TestConfig {
  rpcUrl: string;
  commitment: Commitment;
  programId: Address;
  timeout: number;
}

/**
 * Default test configuration
 */
export const defaultTestConfig: TestConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  commitment: 'confirmed',
  programId: address('podAI123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  timeout: 30000
};

/**
 * Test network configuration
 */
export const testNetworks = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  local: 'http://localhost:8899'
};

/**
 * Test environment checker
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.JEST_WORKER_ID !== undefined ||
         process.env.VITEST !== undefined ||
         process.env.BUN_TEST !== undefined;
}

/**
 * Test mode detector
 */
export function getTestMode(): 'unit' | 'integration' | 'e2e' {
  const testFile = process.env.JEST_TEST_PATH || process.argv[1] || '';
  
  if (testFile.includes('unit') || testFile.includes('.spec.')) {
    return 'unit';
  } else if (testFile.includes('integration')) {
    return 'integration';
  } else if (testFile.includes('e2e')) {
    return 'e2e';
  }
  
  return 'unit'; // Default
}

/**
 * Create test RPC client
 */
export function createTestRpc(config: TestConfig = defaultTestConfig): Rpc<SolanaRpcApi> {
  return createSolanaRpc(config.rpcUrl);
}

/**
 * Test keypair generator with error handling
 */
export async function createTestKeypair(): Promise<KeyPairSigner> {
  try {
    return await generateKeyPairSigner();
  } catch (error) {
    throw new Error(`Failed to generate test keypair: ${error}`);
  }
}

/**
 * Create multiple test keypairs
 */
export async function createTestKeypairs(count: number): Promise<KeyPairSigner[]> {
  try {
    return await Promise.all(
      Array.from({ length: count }, () => generateKeyPairSigner())
    );
  } catch (error) {
    throw new Error(`Failed to generate ${count} test keypairs: ${error}`);
  }
}

/**
 * Test address utilities
 */
export function createTestAddress(seed?: string): Address {
  if (seed) {
    // Create deterministic address from seed for testing
    const encoder = new TextEncoder();
    const seedBytes = encoder.encode(seed);
    const hash = new Uint8Array(32);
    
    // Simple hash for testing (not cryptographically secure)
    for (let i = 0; i < seedBytes.length && i < 32; i++) {
      hash[i] = seedBytes[i];
    }
    
    return getAddressEncoder().decode(hash);
  }
  
  // Generate random test address
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return getAddressEncoder().decode(randomBytes);
}

/**
 * Test data cleanup utilities
 */
export class TestDataManager {
  private createdAccounts: Address[] = [];
  private createdKeypairs: KeyPairSigner[] = [];

  async createKeypair(): Promise<KeyPairSigner> {
    const keypair = await createTestKeypair();
    this.createdKeypairs.push(keypair);
    return keypair;
  }

  addAccount(address: Address): void {
    this.createdAccounts.push(address);
  }

  async cleanup(): Promise<void> {
    // Clear tracking arrays
    this.createdAccounts.length = 0;
    this.createdKeypairs.length = 0;
    
    console.log('🧹 Test data cleanup completed');
  }

  getCreatedAccounts(): Address[] {
    return [...this.createdAccounts];
  }

  getCreatedKeypairs(): KeyPairSigner[] {
    return [...this.createdKeypairs];
  }
}

/**
 * Test environment validator
 */
export async function validateTestEnvironment(config: TestConfig = defaultTestConfig): Promise<boolean> {
  try {
    const rpc = createTestRpc(config);
    const slot = await rpc.getSlot().send();
    
    console.log(`✅ Test environment validated at slot ${slot}`);
    return true;
  } catch (error) {
    console.error('❌ Test environment validation failed:', error);
    return false;
  }
}

/**
 * Test fixtures
 */
export const testFixtures = {
  async createBasicTestSetup() {
    const config = defaultTestConfig;
    const rpc = createTestRpc(config);
    const payer = await generateKeyPairSigner();
    const testAgents = await Promise.all(
      Array.from({ length: 5 }, () => generateKeyPairSigner())
    );
    const testChannels = Array.from({ length: 3 }, (_, i) => 
      createTestAddress(`test-channel-${i}`)
    );

    return {
      config,
      rpc,
      payer,
      testAgents,
      testChannels
    };
  },

  async createIntegrationTestSetup() {
    const config = defaultTestConfig;
    const rpc = createTestRpc(config);
    const dataManager = new TestDataManager();
    
    // Validate environment first
    const isValid = await validateTestEnvironment(config);
    if (!isValid) {
      throw new Error('Test environment validation failed');
    }

    return {
      config,
      rpc,
      dataManager
    };
  }
};

/**
 * Test timeout utilities
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = defaultTestConfig.timeout
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Test retry utilities
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries) {
        console.warn(`Test operation failed, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}