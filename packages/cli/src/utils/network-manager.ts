/**
 * Network Manager - Web3.js v2.0 Implementation
 * Manages Solana RPC connections using modern Web3.js v2 APIs
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import { createSolanaRpc } from '@solana/rpc';
import { ConfigManager } from './config-manager.js';

export interface NetworkStats {
  slot: bigint;
  blockHeight: bigint;
  transactionCount: bigint;
  epochInfo: {
    epoch: bigint;
    slotIndex: bigint;
    slotsInEpoch: bigint;
  };
  version: {
    'solana-core': string;
  };
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  slot?: bigint;
}

export class NetworkManager {
  private rpc: Rpc<SolanaRpcApi> | null = null;
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * Get or create Solana RPC connection using Web3.js v2
   */
  async getRpc(): Promise<Rpc<SolanaRpcApi>> {
    if (!this.rpc) {
      const rpcUrl = await this.configManager.getRpcUrl();
      this.rpc = createSolanaRpc(rpcUrl);
    }
    return this.rpc;
  }

  /**
   * Check network connection status using Web3.js v2
   */
  async checkConnection(_network?: string): Promise<boolean> {
    try {
      const rpc = await this.getRpc();
      await rpc.getSlot().send();
      return true;
    } catch (error) {
      console.warn(`Network connection failed:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get network statistics using Web3.js v2
   */
  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const rpc = await this.getRpc();
      
      const [slotResponse, blockHeightResponse, transactionCountResponse, epochInfoResponse, versionResponse] = await Promise.all([
        rpc.getSlot().send(),
        rpc.getBlockHeight().send(),
        rpc.getTransactionCount().send(),
        rpc.getEpochInfo().send(),
        rpc.getVersion().send()
      ]);

      return {
        slot: slotResponse,
        blockHeight: blockHeightResponse,
        transactionCount: transactionCountResponse,
        epochInfo: epochInfoResponse,
        version: versionResponse
      };
    } catch (error) {
      throw new Error(`Failed to get network stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account info using Web3.js v2
   */
  async getAccountInfo(address: Address): Promise<any> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getAccountInfo(address).send();
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account balance using Web3.js v2
   */
  async getBalance(address: Address): Promise<bigint> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getBalance(address).send();
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get transaction status using Web3.js v2
   */
  async getTransactionStatus(signature: string): Promise<any> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getSignatureStatuses([signature]).send();
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for transaction confirmation using Web3.js v2
   */
  async waitForConfirmation(
    signature: string,
    commitment: Commitment = 'confirmed',
    timeout: number = 30000
  ): Promise<boolean> {
    try {
      const rpc = await this.getRpc();
      const start = Date.now();
      
      while (Date.now() - start < timeout) {
        const statusResponse = await rpc.getSignatureStatuses([signature]).send();
        const status = statusResponse.value[0];
        
        if (status) {
          const { confirmationStatus, err } = status;
          
          if (err) {
            throw new Error(`Transaction failed: ${err}`);
          }
          
          if (confirmationStatus === commitment || 
              (commitment === 'confirmed' && confirmationStatus === 'finalized')) {
            return true;
          }
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error('Transaction confirmation timeout');
    } catch (error) {
      throw new Error(`Failed to wait for confirmation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get recent blockhash using Web3.js v2
   */
  async getRecentBlockhash(): Promise<any> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getLatestBlockhash().send();
    } catch (error) {
      throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get minimum rent exemption amount using Web3.js v2
   */
  async getMinimumBalanceForRentExemption(dataLength: number): Promise<bigint> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getMinimumBalanceForRentExemption(BigInt(dataLength)).send();
    } catch (error) {
      throw new Error(`Failed to get rent exemption: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current network name
   */
  async getCurrentNetwork(): Promise<string> {
    const config = await this.configManager.load();
    return config.network;
  }

  /**
   * Get RPC endpoint URL
   */
  async getRpcEndpoint(): Promise<string> {
    return await this.configManager.getRpcUrl();
  }

  /**
   * Switch to different network
   */
  async switchNetwork(network: 'devnet' | 'testnet' | 'mainnet-beta', rpcUrl?: string): Promise<void> {
    await this.configManager.save({ network, rpcUrl });
    this.rpc = null; // Reset connection to use new network
  }

  /**
   * Test network latency
   */
  async testLatency(): Promise<number> {
    try {
      const start = Date.now();
      await this.checkConnection();
      return Date.now() - start;
    } catch (error) {
      throw new Error(`Failed to test latency: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get health status of the RPC endpoint
   */
  async getHealth(): Promise<string> {
    try {
      const rpc = await this.getRpc();
      return await rpc.getHealth().send();
    } catch (error) {
      throw new Error(`Failed to get health: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 