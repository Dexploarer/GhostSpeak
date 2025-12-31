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

// RPC configuration interfaces
// Note: These may be used for future WebSocket configuration

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

      // Handle RPC data format: [base64_string, encoding_type]
      const dataArray = result.value.data as [string, string]
      const base64Data = Array.isArray(dataArray) ? dataArray[0] : dataArray as string
      
      return {
        executable: result.value.executable,
        lamports: result.value.lamports,
        owner: result.value.owner,
        rentEpoch: (result.value as { rentEpoch?: bigint }).rentEpoch ?? 0n,
        data: Buffer.from(base64Data, 'base64'),
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

return result.value.map((account: unknown) => 
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
    try {
      console.log('🔍 Debug - Sending transaction to RPC:')
      console.log(`   Transaction length: ${transaction.length}`)
      console.log(`   First 50 chars: ${transaction.substring(0, 50)}...`)
      console.log(`   Options: ${JSON.stringify(options)}`)
      
      // For Solana Web3.js v2, the sendTransaction method should work with base64
      // But we need to make sure we're calling it correctly
      
      // Try to send using the proper RPC format
      // The Solana JSON-RPC expects: sendTransaction(transaction, options)
      // where transaction is a base64-encoded string
      
      // Direct JSON-RPC call to bypass any library issues
      const requestBody = {
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 100000),
        method: 'sendTransaction',
        params: [
          transaction, // base64-encoded transaction
          {
            skipPreflight: options?.skipPreflight ?? false,
            preflightCommitment: options?.preflightCommitment ?? this.commitment,
            encoding: 'base64'
          }
        ]
      }
      
      console.log('🔍 Debug - RPC request:')
      console.log(`   Method: ${requestBody.method}`)
      console.log(`   Transaction (first 50): ${transaction.substring(0, 50)}...`)
      console.log(`   Params count: ${requestBody.params.length}`)
      
      const response = await globalThis.fetch(this.endpoint as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json() as { error?: { message: string }; result?: unknown }
      
      if (data.error) {
        console.error('🔴 RPC error response:', data.error)
        throw new Error(`RPC Error: ${data.error.message}`)
      }
      
      return data.result as string
    } catch (error) {
      console.error('🔴 RPC sendTransaction error:', error)
      throw error
    }
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
    return this.rpc.simulateTransaction(transaction as unknown as Parameters<typeof this.rpc.simulateTransaction>[0], {
      commitment: options?.commitment ?? this.commitment,
      replaceRecentBlockhash: options?.replaceRecentBlockhash ?? false,
      sigVerify: false,
      encoding: 'base64'
    }).send()
  }

  /**
   * Get fee for message
   */
  async getFeeForMessage(message: string): Promise<number> {
    const result = await this.rpc.getFeeForMessage(message as unknown as Parameters<typeof this.rpc.getFeeForMessage>[0]).send()
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
        encoding: 'base64' as const,  // Always use base64 for large data
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
      
      // Validate program ID is a valid base58 address
      const programIdStr = programId.toString()
      if (!programIdStr || programIdStr.includes('/') || programIdStr.length < 32) {
        throw new Error(`Invalid program ID format: ${programIdStr}. Expected base58 Solana address.`)
      }
      
      const requestBody: RpcRequest = {
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 100000),
        method: 'getProgramAccounts',
        params: [programIdStr, rpcOptions]
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
    
    // Handle RPC data format: [base64_string, encoding_type]
    const dataArray = account.data as [string, string]
    const base64Data = Array.isArray(dataArray) ? dataArray[0] : dataArray as string
    
    return {
      executable: account.executable as boolean,
      lamports: BigInt(account.lamports as string | number) as unknown as AccountInfo['lamports'], // Cast to Lamports branded type
      owner: account.owner as Address,
      rentEpoch: (account.rentEpoch as bigint | undefined) ?? 0n,
      data: Buffer.from(base64Data, 'base64'),
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