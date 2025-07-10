/**
 * Bankrun Test Client
 *
 * Provides a high-performance test client using solana-bankrun for fast
 * blockchain simulation without network dependencies.
 */

import { start } from 'solana-bankrun';
import type { BankrunProvider } from 'solana-bankrun';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { address, type Address } from '@solana/addresses';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../../shared/logger';

/**
 * Bankrun configuration for test optimization
 */
export interface BankrunConfig {
  programId: string;
  programPath?: string;
  genesisConfig?: {
    accountsCluster: string;
    slotsPerEpoch: number;
    ticksPerSlot: number;
  };
  computeUnitLimit?: number;
  preloadAccounts?: Array<{
    pubkey: string;
    lamports: number;
    data?: Buffer;
  }>;
}

/**
 * Default bankrun configuration optimized for performance
 */
export const DEFAULT_BANKRUN_CONFIG: BankrunConfig = {
  programId: '4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385',
  genesisConfig: {
    accountsCluster: 'https://api.devnet.solana.com',
    slotsPerEpoch: 32,
    ticksPerSlot: 64,
  },
  computeUnitLimit: 1_400_000,
  preloadAccounts: [],
};

/**
 * Test performance metrics
 */
export interface TestMetrics {
  transactionCount: number;
  averageExecutionTime: number;
  totalTestTime: number;
  successRate: number;
  computeUnitsUsed: number;
  accountsCreated: number;
  cacheMisses: number;
}

/**
 * Bankrun Test Client for high-performance testing
 */
export class BankrunTestClient {
  private provider: BankrunProvider | null = null;
  private config: BankrunConfig;
  private metrics: TestMetrics = {
    transactionCount: 0,
    averageExecutionTime: 0,
    totalTestTime: 0,
    successRate: 0,
    computeUnitsUsed: 0,
    accountsCreated: 0,
    cacheMisses: 0,
  };
  private startTime: number = 0;
  private executionTimes: number[] = [];

  constructor(config: Partial<BankrunConfig> = {}) {
    this.config = { ...DEFAULT_BANKRUN_CONFIG, ...config };
  }

  /**
   * Initialize bankrun provider
   */
  async initialize(): Promise<void> {
    this.startTime = Date.now();

    // Load program binary if path provided
    let programBinary: Buffer | undefined;
    if (this.config.programPath) {
      try {
        programBinary = fs.readFileSync(this.config.programPath);
      } catch (error) {
        logger.general.warn(`Failed to load program binary: ${error}`);
      }
    }

    // Prepare programs array for bankrun
    const programs = programBinary
      ? [
          {
            name: 'podai_marketplace',
            programId: new PublicKey(this.config.programId),
            deployPath: this.config.programPath,
          },
        ]
      : [];

    // Prepare accounts array for bankrun
    const accounts =
      this.config.preloadAccounts?.map(acc => ({
        address: new PublicKey(acc.pubkey),
        info: {
          lamports: acc.lamports,
          data: acc.data || Buffer.alloc(0),
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
        },
      })) || [];

    // Start bankrun with correct parameter format
    this.provider = await start(
      programs,
      accounts,
      this.config.computeUnitLimit,
      undefined, // transactionAccountLockLimit
      undefined // deactivateFeatures
    );

    // Pre-fund test accounts for faster execution
    await this.preloadTestAccounts();
  }

  /**
   * Pre-load common test accounts to avoid airdrop delays
   */
  private async preloadTestAccounts(): Promise<void> {
    if (!this.provider) return;

    const testAccounts = [
      await generateKeyPairSigner(),
      await generateKeyPairSigner(),
      await generateKeyPairSigner(),
      await generateKeyPairSigner(),
      await generateKeyPairSigner(),
    ];

    // Fund all test accounts in parallel
    const fundingPromises = testAccounts.map(async account => {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.provider!.context.payer.publicKey,
          toPubkey: new PublicKey(account.address),
          lamports: 1000000000, // 1 SOL
        })
      );

      await this.provider!.sendAndConfirm(tx, [this.provider!.context.payer]);
    });

    await Promise.all(fundingPromises);
  }

  /**
   * Execute transaction with performance tracking
   */
  async executeTransaction(
    transaction: Transaction,
    signers: KeyPairSigner[] = []
  ): Promise<{
    signature: string;
    executionTime: number;
    computeUnits: number;
  }> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    const startTime = Date.now();
    this.metrics.transactionCount++;

    try {
      // Convert KeyPairSigner to legacy Keypair for bankrun compatibility
      const legacySigners = signers.map(signer => ({
        publicKey: new PublicKey(signer.address),
        secretKey: signer.keyPair.secretKey,
      }));

      // Execute transaction
      const signature = await this.provider.sendAndConfirm(
        transaction,
        legacySigners
      );

      // Track execution time
      const executionTime = Date.now() - startTime;
      this.executionTimes.push(executionTime);
      this.metrics.averageExecutionTime =
        this.executionTimes.reduce((sum, time) => sum + time, 0) /
        this.executionTimes.length;

      // Simulate compute unit tracking (bankrun doesn't provide real CU data)
      const computeUnits = this.estimateComputeUnits(transaction);
      this.metrics.computeUnitsUsed += computeUnits;

      return {
        signature,
        executionTime,
        computeUnits,
      };
    } catch (error) {
      // Track failed transactions
      this.metrics.successRate =
        (this.metrics.transactionCount - 1) / this.metrics.transactionCount;
      throw error;
    }
  }

  /**
   * Estimate compute units for transaction (since bankrun doesn't provide real data)
   */
  private estimateComputeUnits(transaction: Transaction): number {
    // Base cost per instruction
    const baseInstructionCost = 600;
    const accountReadCost = 100;
    const accountWriteCost = 200;

    let totalCost = 0;

    for (const instruction of transaction.instructions) {
      totalCost += baseInstructionCost;
      totalCost += instruction.keys.length * accountReadCost;
      totalCost +=
        instruction.keys.filter(key => key.isWritable).length *
        accountWriteCost;
    }

    return totalCost;
  }

  /**
   * Get account info with caching
   */
  async getAccountInfo(pubkey: Address | string): Promise<any> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    return this.provider.context.banksClient.getAccount(new PublicKey(pubkey));
  }

  /**
   * Request airdrop (instant in bankrun)
   */
  async requestAirdrop(
    pubkey: Address | string,
    lamports: number
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.provider.context.payer.publicKey,
        toPubkey: new PublicKey(pubkey),
        lamports,
      })
    );

    const signature = await this.provider.sendAndConfirm(tx, [
      this.provider.context.payer,
    ]);
    return signature;
  }

  /**
   * Get balance instantly
   */
  async getBalance(pubkey: Address | string): Promise<number> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    const account = await this.provider.context.banksClient.getAccount(
      new PublicKey(pubkey)
    );

    return account?.lamports || 0;
  }

  /**
   * Batch execute multiple transactions for performance testing
   */
  async batchExecute(
    transactions: Array<{
      transaction: Transaction;
      signers?: KeyPairSigner[];
    }>
  ): Promise<string[]> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    const results: string[] = [];

    // Execute in parallel for maximum performance
    const executionPromises = transactions.map(
      async ({ transaction, signers = [] }) => {
        const result = await this.executeTransaction(transaction, signers);
        return result.signature;
      }
    );

    const signatures = await Promise.all(executionPromises);
    results.push(...signatures);

    return results;
  }

  /**
   * Create test keypairs with funding
   */
  async createFundedKeypairs(
    count: number,
    lamports: number = 1000000000
  ): Promise<KeyPairSigner[]> {
    const keypairs = [];

    for (let i = 0; i < count; i++) {
      const keypair = await generateKeyPairSigner();
      await this.requestAirdrop(keypair.address, lamports);
      keypairs.push(keypair);
    }

    return keypairs;
  }

  /**
   * Set up test environment with pre-configured accounts
   */
  async setupTestEnvironment(): Promise<{
    admin: KeyPairSigner;
    users: KeyPairSigner[];
    programId: Address;
  }> {
    const admin = await generateKeyPairSigner();
    const users = await this.createFundedKeypairs(5, 2000000000); // 2 SOL each

    await this.requestAirdrop(admin.address, 5000000000); // 5 SOL for admin

    return {
      admin,
      users,
      programId: address(this.config.programId),
    };
  }

  /**
   * Fast-forward time (useful for testing time-based logic)
   */
  async advanceTime(seconds: number): Promise<void> {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }

    // In bankrun, we can advance the clock
    const slotsToAdvance = Math.ceil(seconds / 0.4); // ~400ms per slot

    for (let i = 0; i < slotsToAdvance; i++) {
      await this.provider.context.banksClient.processTransaction(
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.provider.context.payer.publicKey,
            toPubkey: this.provider.context.payer.publicKey,
            lamports: 0,
          })
        )
      );
    }
  }

  /**
   * Get detailed performance metrics
   */
  getMetrics(): TestMetrics {
    this.metrics.totalTestTime = Date.now() - this.startTime;
    this.metrics.successRate =
      this.metrics.transactionCount > 0
        ? (this.metrics.transactionCount -
            this.metrics.transactionCount * (1 - this.metrics.successRate)) /
          this.metrics.transactionCount
        : 0;

    return { ...this.metrics };
  }

  /**
   * Reset metrics for new test run
   */
  resetMetrics(): void {
    this.metrics = {
      transactionCount: 0,
      averageExecutionTime: 0,
      totalTestTime: 0,
      successRate: 0,
      computeUnitsUsed: 0,
      accountsCreated: 0,
      cacheMisses: 0,
    };
    this.executionTimes = [];
    this.startTime = Date.now();
  }

  /**
   * Get provider for advanced usage
   */
  getProvider(): BankrunProvider {
    if (!this.provider) {
      throw new Error('BankrunTestClient not initialized');
    }
    return this.provider;
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    if (this.provider) {
      // Bankrun doesn't have explicit close method, but we can clean up
      this.provider = null;
    }
  }
}

/**
 * Helper function to create optimized test client
 */
export async function createOptimizedTestClient(
  config?: Partial<BankrunConfig>
): Promise<BankrunTestClient> {
  const client = new BankrunTestClient(config);
  await client.initialize();
  return client;
}

/**
 * Performance test suite runner
 */
export class PerformanceTestRunner {
  private client: BankrunTestClient;
  private results: Array<{
    testName: string;
    metrics: TestMetrics;
    duration: number;
  }> = [];

  constructor(client: BankrunTestClient) {
    this.client = client;
  }

  /**
   * Run performance test with metrics collection
   */
  async runTest(
    testName: string,
    testFunction: (client: BankrunTestClient) => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    this.client.resetMetrics();

    try {
      await testFunction(this.client);

      const duration = Date.now() - startTime;
      const metrics = this.client.getMetrics();

      this.results.push({
        testName,
        metrics,
        duration,
      });

      logger.general.info(
        `✅ ${testName}: ${duration}ms (${metrics.transactionCount} txs)`
      );
    } catch (error) {
      logger.general.error(`❌ ${testName}: ${error}`);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalTransactions = this.results.reduce(
      (sum, r) => sum + r.metrics.transactionCount,
      0
    );

    let report = '📊 PERFORMANCE TEST REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += `Total Duration: ${totalDuration}ms\n`;
    report += `Total Transactions: ${totalTransactions}\n`;
    report += `Average TPS: ${((totalTransactions / totalDuration) * 1000).toFixed(2)}\n\n`;

    report += 'Test Results:\n';
    report += '-'.repeat(50) + '\n';

    for (const result of this.results) {
      report += `${result.testName.padEnd(30)} | ${result.duration.toString().padStart(6)}ms | ${result.metrics.transactionCount.toString().padStart(3)} txs\n`;
    }

    return report;
  }
}
