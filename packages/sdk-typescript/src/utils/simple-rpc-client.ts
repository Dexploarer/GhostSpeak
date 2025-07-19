/**
 * Simplified RPC Client for Core Functionality
 * July 2025 - Working Implementation
 */

import type { Address } from '@solana/addresses'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import type { Signature } from '@solana/kit'
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

interface SolanaRpcConfig {
  url: string
}

interface SolanaRpcSubscriptionsConfig {
  url: string
}

/**
 * Simplified RPC client focusing on core functionality
 */
export class SimpleRpcClient {
  private rpc: ReturnType<typeof createSolanaRpc>
  private rpcSubscriptions?: ReturnType<typeof createSolanaRpcSubscriptions>
  private commitment: Commitment
  private endpoint: string

  constructor(config: SimpleRpcClientConfig) {
    this.endpoint = config.endpoint
    this.rpc = createSolanaRpc(config.endpoint)
    this.commitment = config.commitment ?? 'confirmed'
    
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint)
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
        data: result.value.data as unknown as Buffer,
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
    }).send()
    
    return result
  }

  /**
   * Get signature statuses
   */
  async getSignatureStatuses(signatures: Signature[]) {
    const result = await this.rpc.getSignatureStatuses(signatures).send()
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
    }).send()
  }

  /**
   * Get fee for message
   */
  async getFeeForMessage(message: string): Promise<number> {
    const result = await this.rpc.getFeeForMessage(message as any).send()
    return Number(result.value ?? 5000) // Fallback fee
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(
    programId: Address,
    options?: { filters?: unknown[]; commitment?: Commitment }
  ): Promise<{ pubkey: Address; account: AccountInfo }[]> {
    try {
      console.log(`Getting program accounts for program: ${programId}`)
      console.log(`Options: ${JSON.stringify(options)}`)
      
      const rpcOptions = {
        commitment: options?.commitment ?? this.commitment,
        ...(options?.filters && { filters: options.filters })
      }
      
      // Type-safe RPC request
      interface RpcRequest {
        jsonrpc: '2.0'
        id: number
        method: 'getProgramAccounts'
        params: [string, Record<string, unknown>]
      }
      
      interface RpcError {
        code: number
        message: string
      }
      
      interface RpcResponse {
        jsonrpc: '2.0'
        id: number
        result?: { pubkey: string; account: unknown }[]
        error?: RpcError
      }
      
      const requestBody: RpcRequest = {
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 100000),
        method: 'getProgramAccounts',
        params: [programId, rpcOptions]
      }
      
      const response = await globalThis.fetch(this.endpoint as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as RpcResponse
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`)
      }
      
      const accounts = data.result ?? []
      console.log(`Found ${accounts.length} program accounts`)
      
      return accounts.map((item) => {
        return {
          pubkey: item.pubkey as Address,
          account: this.parseAccountInfo(item.account)
        }
      })
    } catch (error) {
      console.error(`Failed to get program accounts:`, error)
      throw new Error(`Failed to get program accounts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private parseAccountInfo(accountInfo: unknown): AccountInfo {
    const account = accountInfo as Record<string, unknown>
    return {
      executable: account.executable as boolean,
      lamports: account.lamports as any, // Cast to Lamports branded type
      owner: account.owner as Address,
      rentEpoch: account.rentEpoch as bigint,
      data: account.data as Buffer,
      space: account.space as bigint
    }
  }
}

/**
 * Create simple RPC client
 */
export function createSimpleRpcClient(config: SimpleRpcClientConfig): SimpleRpcClient {
  return new SimpleRpcClient(config)
}