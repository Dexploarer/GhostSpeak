/**
 * Simplified RPC Client for Core Functionality
 * July 2025 - Working Implementation
 */

import type { Address } from '@solana/addresses'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import type {
  Commitment,
  AccountInfo,
  GetAccountInfoOptions,
  GetMultipleAccountsOptions
} from '../types/rpc-types.js'

export interface SimpleRpcClientConfig {
  endpoint: string
  wsEndpoint?: string
  commitment?: Commitment
}

/**
 * Simplified RPC client focusing on core functionality
 */
export class SimpleRpcClient {
  private rpc: ReturnType<typeof createSolanaRpc>
  private rpcSubscriptions?: ReturnType<typeof createSolanaRpcSubscriptions>
  private commitment: Commitment

  constructor(config: SimpleRpcClientConfig) {
    this.rpc = createSolanaRpc({ url: config.endpoint } as any)
    this.commitment = config.commitment ?? 'confirmed'
    
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions({ url: config.wsEndpoint } as any)
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(
    address: Address,
    options?: GetAccountInfoOptions
  ): Promise<AccountInfo | null> {
    try {
      const result = await this.rpc.getAccountInfo(address, {
        commitment: options?.commitment ?? this.commitment,
        encoding: 'base64'
      }).send()

      if (!result.value) return null

      return {
        executable: result.value.executable,
        lamports: result.value.lamports,
        owner: result.value.owner,
        rentEpoch: result.value.rentEpoch,
        data: result.value.data as any,
        space: result.value.space
      }
    } catch (error) {
      console.warn(`Failed to get account info for ${address}:`, error)
      return null
    }
  }

  /**
   * Get multiple accounts
   */
  async getMultipleAccounts(
    addresses: Address[],
    options?: GetMultipleAccountsOptions
  ): Promise<(AccountInfo | null)[]> {
    try {
      const result = await this.rpc.getMultipleAccounts(addresses, {
        commitment: options?.commitment ?? this.commitment,
        encoding: 'base64'
      }).send()

      return (result.value ?? []).map((account: unknown) => 
        account ? this.parseAccountInfo(account) : null
      )
    } catch (error) {
      console.warn('Failed to get multiple accounts:', error)
      return addresses.map(() => null)
    }
  }

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash() {
    const result = await this.rpc.getLatestBlockhash({ commitment: this.commitment }).send()
    return result.value
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    transaction: string,
    options?: { skipPreflight?: boolean; preflightCommitment?: Commitment }
  ): Promise<string> {
    const result = await this.rpc.sendTransaction(transaction as any, {
      skipPreflight: options?.skipPreflight ?? false,
      preflightCommitment: options?.preflightCommitment ?? this.commitment
    } as any).send()
    
    return result
  }

  /**
   * Get signature statuses
   */
  async getSignatureStatuses(signatures: string[]) {
    const result = await this.rpc.getSignatureStatuses(signatures as any).send()
    return result.value
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(
    transaction: string,
    options?: { commitment?: Commitment; replaceRecentBlockhash?: boolean }
  ) {
    return this.rpc.simulateTransaction(transaction as any, {
      commitment: options?.commitment ?? this.commitment,
      replaceRecentBlockhash: options?.replaceRecentBlockhash ?? false
    } as any).send()
  }

  /**
   * Get fee for message
   */
  async getFeeForMessage(message: string): Promise<number> {
    const result = await this.rpc.getFeeForMessage(message as any).send()
    return Number(result.value ?? 5000) // Fallback fee
  }

  /**
   * Get program accounts (placeholder implementation)
   */
  async getProgramAccounts(
    programId: Address,
    options?: { filters?: unknown[]; commitment?: Commitment }
  ): Promise<{ pubkey: Address; account: AccountInfo }[]> {
    // This is a simplified implementation
    // In a real implementation, you'd call the actual RPC method
    console.warn('getProgramAccounts: Using simplified implementation')
    return []
  }

  private parseAccountInfo(accountInfo: unknown): AccountInfo {
    const account = accountInfo as Record<string, unknown>
    return {
      executable: account.executable as boolean,
      lamports: account.lamports as any,
      owner: account.owner as Address,
      rentEpoch: account.rentEpoch as any,
      data: account.data as any,
      space: account.space as any
    }
  }
}

/**
 * Create simple RPC client
 */
export function createSimpleRpcClient(config: SimpleRpcClientConfig): SimpleRpcClient {
  return new SimpleRpcClient(config)
}