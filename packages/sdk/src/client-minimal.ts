/**
 * Minimal PodAI Client for Ultra-Light Bundle Size
 *
 * This client provides only the most essential functionality
 * without the heavy generated instruction builders.
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import { createSolanaRpc } from '@solana/rpc';

export interface IMinimalClientConfig {
  readonly rpcEndpoint?: string;
  readonly programId?: string;
  readonly commitment?: Commitment;
}

export class MinimalPodAIClient {
  private readonly rpc: Rpc<SolanaRpcApi>;
  readonly programId: Address;
  readonly commitment: Commitment;

  constructor(config: IMinimalClientConfig = {}) {
    this.rpc = createSolanaRpc(
      config.rpcEndpoint ?? 'https://api.devnet.solana.com'
    );
    this.programId = (config.programId ??
      '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP') as Address;
    this.commitment = config.commitment ?? 'confirmed';
  }

  // Basic account fetching without heavy parsing
  async getAccount(address: Address) {
    return await this.rpc
      .getAccountInfo(address, { commitment: this.commitment })
      .send();
  }

  // Basic transaction sending without generated instruction builders
  async sendTransaction(transaction: Uint8Array) {
    return await this.rpc
      .sendTransaction(transaction, { encoding: 'base64' })
      .send();
  }

  // Connection health check
  async getHealth() {
    return await this.rpc.getHealth().send();
  }

  // Get latest blockhash
  async getLatestBlockhash() {
    return await this.rpc
      .getLatestBlockhash({ commitment: this.commitment })
      .send();
  }

  // Get account balance in SOL
  async getBalance(address: Address): Promise<number> {
    const balanceResult = await this.rpc
      .getBalance(address, { commitment: this.commitment })
      .send();
    
    // Convert lamports to SOL
    return Number(balanceResult.value) / 1_000_000_000;
  }
}

export const createMinimalClient = (config?: IMinimalClientConfig) => {
  return new MinimalPodAIClient(config);
};
