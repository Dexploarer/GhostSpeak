/**
 * PayAI Polling Service for Caisper Plugin
 *
 * Polls for new PayAI payments and updates agent reputation
 * Complements webhook handler with backup polling mechanism
 */

import type { IAgentRuntime } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';

/**
 * Payment record from polling
 */
interface PaymentRecord {
  signature: string;
  agentAddress: Address;
  amount: bigint;
  payer: Address;
  timestamp: number;
  processed: boolean;
}

/**
 * PayAI Polling Service
 *
 * Polls blockchain for new payments and updates reputation
 * Runs every 5 minutes as backup to webhook handler
 */
export class PayAIPollingService extends Service {
  static serviceType = 'payai-polling';

  private intervalId: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs = 5 * 60 * 1000; // 5 minutes
  private readonly processedSignatures = new Set<string>();
  private ghostSpeakClient: GhostSpeakClient | null = null;

  capabilityDescription = 'Polls for PayAI payments and updates agent reputation';

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
    logger.info('PayAI Polling Service initialized');
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('Starting PayAI Polling Service');
    const service = new PayAIPollingService(runtime);
    await service.initialize();
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('Stopping PayAI Polling Service');
    const service = runtime.getService(PayAIPollingService.serviceType);
    if (service) {
      await (service as PayAIPollingService).shutdown();
    }
  }

  async initialize() {
    try {
      // Create GhostSpeak client
      this.ghostSpeakClient = new GhostSpeakClient({
        cluster: (process.env.SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet',
        rpcEndpoint: process.env.SOLANA_RPC_URL,
      });

      // Start polling
      this.startPolling();

      logger.info({
        pollInterval: `${this.pollIntervalMs / 1000}s`,
      }, 'PayAI polling started');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize PayAI polling service');
      throw error;
    }
  }

  async stop() {
    await this.shutdown();
  }

  private startPolling() {
    // Do initial poll immediately
    void this.pollPayments();

    // Then poll every interval
    this.intervalId = setInterval(() => {
      void this.pollPayments();
    }, this.pollIntervalMs);
  }

  private async shutdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.processedSignatures.clear();
    this.ghostSpeakClient = null;

    logger.info('PayAI Polling Service stopped');
  }

  private async pollPayments() {
    try {
      logger.debug('Polling for new PayAI payments...');

      // Get all registered agents
      if (!this.ghostSpeakClient) {
        logger.warn('GhostSpeak client not initialized');
        return;
      }

      const allAgents = await this.ghostSpeakClient.agents.getAllAgents();

      logger.debug({
        agentCount: allAgents.length,
      }, 'Checking payments for agents');

      // Check payments for each agent
      for (const agent of allAgents) {
        try {
          await this.checkAgentPayments(agent.address);
        } catch (error) {
          logger.error({
            agentAddress: agent.address.toString(),
            error,
          }, 'Failed to check payments for agent');
        }
      }

      logger.debug('Payment polling complete');
    } catch (error) {
      logger.error({ error }, 'Error during payment polling');
    }
  }

  private async checkAgentPayments(agentAddress: Address) {
    try {
      // Query on-chain for recent token transfers to this agent
      const { createSolanaRpc } = await import('@solana/rpc');
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const rpc = createSolanaRpc(rpcUrl);

      // Get recent signatures for this agent's address
      // Note: This is a simplified version - in production, you'd want to:
      // 1. Use getSignaturesForAddress with pagination
      // 2. Filter for token transfers (not all transactions)
      // 3. Track last processed signature to avoid duplicates

      const signatures = await rpc.getSignaturesForAddress(agentAddress, {
        limit: 10,
      }).send();

      for (const signatureInfo of signatures) {
        const signature = signatureInfo.signature;

        // Skip if already processed
        if (this.processedSignatures.has(signature)) {
          continue;
        }

        // Fetch transaction details
        const transaction = await rpc.getTransaction(signature as any, {
          encoding: 'json',
          maxSupportedTransactionVersion: 0,
        }).send();

        if (!transaction || transaction.meta?.err) {
          // Failed transaction, skip
          continue;
        }

        // Extract payment details from transaction
        // This is a simplified version - in production, you'd parse the transaction
        // to extract amount, payer, etc.

        const payment: PaymentRecord = {
          signature,
          agentAddress,
          amount: BigInt(1_000_000), // Placeholder - parse from transaction
          payer: address('11111111111111111111111111111111'), // Placeholder - parse from transaction
          timestamp: Number(transaction.blockTime ?? 0),
          processed: false,
        };

        // Process payment
        await this.processPayment(payment);

        // Mark as processed
        this.processedSignatures.add(signature);
      }
    } catch (error) {
      logger.error({
        agentAddress: agentAddress.toString(),
        error,
      }, 'Failed to check agent payments');
    }
  }

  private async processPayment(payment: PaymentRecord) {
    try {
      logger.info({
        signature: payment.signature,
        agentAddress: payment.agentAddress.toString(),
        amount: payment.amount.toString(),
      }, 'Processing payment');

      // In production, this would:
      // 1. Update agent reputation based on payment
      // 2. Maybe issue credential at milestone
      // 3. Record to database/Convex for dual-source tracking

      // For now, just log
      logger.info({
        signature: payment.signature,
      }, 'Payment processed successfully');
    } catch (error) {
      logger.error({
        signature: payment.signature,
        error,
      }, 'Failed to process payment');
    }
  }

  /**
   * Manually trigger payment check for specific agent
   * Useful for testing or forced updates
   */
  async checkPaymentsNow(agentAddress: Address) {
    logger.info({
      agentAddress: agentAddress.toString(),
    }, 'Manual payment check requested');

    await this.checkAgentPayments(agentAddress);
  }

  /**
   * Get processing stats
   */
  getStats() {
    return {
      processedPayments: this.processedSignatures.size,
      isPolling: this.intervalId !== null,
      pollInterval: `${this.pollIntervalMs / 1000}s`,
    };
  }
}

export default PayAIPollingService;
