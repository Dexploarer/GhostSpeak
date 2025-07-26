/**
 * RPC Client Types for Solana Web3.js v2
 * 
 * Typed RPC client interfaces for use throughout the SDK
 */

import type { Address } from '@solana/addresses'
import type { Commitment } from './rpc-types.js'

/**
 * Account info returned by RPC
 */
export interface RpcAccountInfo {
  data: [string, string] | string | Buffer | Uint8Array
  executable: boolean
  lamports: number | bigint
  owner: Address | string
  rentEpoch?: number | bigint
  space?: number | bigint
}

/**
 * RPC response wrapper
 */
export interface RpcResponseWrapper<T> {
  value: T
}

/**
 * Get account info options
 */
export interface GetAccountInfoOptions {
  commitment?: Commitment
  encoding?: 'base64' | 'base58' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
}

/**
 * Get multiple accounts options
 */
export interface GetMultipleAccountsOptions {
  commitment?: Commitment
  encoding?: 'base64' | 'base58' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
}

/**
 * Get program accounts options
 */
export interface GetProgramAccountsOptions {
  commitment?: Commitment
  encoding?: 'base64' | 'base58' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
  filters?: {
    dataSize?: number
    memcmp?: {
      offset: number
      bytes: string | Uint8Array
    }
  }[]
}

/**
 * Program account info
 */
export interface RpcProgramAccount {
  pubkey: Address
  account: RpcAccountInfo
}

/**
 * Typed RPC client interface
 */
export interface TypedRpcClient {
  getAccountInfo(
    address: Address,
    options?: GetAccountInfoOptions
  ): Promise<RpcResponseWrapper<RpcAccountInfo | null>>

  getMultipleAccounts(
    addresses: Address[],
    options?: GetMultipleAccountsOptions
  ): Promise<RpcResponseWrapper<(RpcAccountInfo | null)[]>>

  getProgramAccounts(
    programId: Address,
    options?: GetProgramAccountsOptions
  ): Promise<RpcResponseWrapper<RpcProgramAccount[]>>

  getLatestBlockhash(
    options?: { commitment?: Commitment }
  ): Promise<{
    blockhash: string
    lastValidBlockHeight: number
  }>

  sendTransaction(
    transaction: unknown,
    options?: unknown
  ): Promise<string>

  getProgramAddress(): Address
}

/**
 * Create a typed RPC client from an untyped one
 */
export function createTypedRpcClient(rpc: unknown): TypedRpcClient {
  return rpc as TypedRpcClient
}