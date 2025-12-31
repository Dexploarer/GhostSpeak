/**
 * Account Utilities for Safe RPC Operations
 * Prevents base58 encoding errors with large account data
 */

import type { Address } from '@solana/addresses'
import type { Rpc, GetAccountInfoApi } from '@solana/kit'
import type { AccountInfo, GetAccountInfoOptions } from '../types/rpc-types.js'

/**
 * Safe account info fetching with proper encoding
 * Automatically uses base64 encoding to prevent base58 errors with large accounts
 */
export async function safeGetAccountInfo(
  rpc: Rpc<GetAccountInfoApi>,
  address: Address,
  options?: GetAccountInfoOptions & { forceBase64?: boolean }
): Promise<AccountInfo | null> {
  const rpcOptions = {
    commitment: options?.commitment ?? 'confirmed',
    encoding: options?.forceBase64 !== false ? 'base64' : (options.encoding ?? 'base64'),
    ...(options?.dataSlice && { dataSlice: options.dataSlice }),
    ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
  } as const

  try {
    const result = await rpc.getAccountInfo(address, rpcOptions).send()
    
    if (!result.value) return null

    // For base64 encoding, calculate actual data size
    let dataSize = 0
    if (Array.isArray(result.value.data) && result.value.data[0]) {
      dataSize = Buffer.from(result.value.data[0] as string, 'base64').length
    }

    // Handle base64 encoded data - convert to Buffer
    let accountData: Buffer
    if (Array.isArray(result.value.data)) {
      // Base64 encoded data comes as [data, encoding]
      accountData = Buffer.from(result.value.data[0] as string, 'base64')
    } else {
      // Handle raw base64 string
      accountData = Buffer.from(result.value.data as string, 'base64')
    }
    
    // Create account info with proper typing
    const accountInfo: AccountInfo & { calculatedSize?: number } = {
      owner: result.value.owner,
      lamports: result.value.lamports,
      data: accountData,
      executable: result.value.executable,
      rentEpoch: (result.value as { rentEpoch?: bigint }).rentEpoch ?? 0n,
    }
    
    // Add calculated size for convenience if available
    if (dataSize > 0) {
      accountInfo.calculatedSize = dataSize
    }
    
    return accountInfo
  } catch (error) {
    // Log the error for debugging but don't throw
    console.warn(`Failed to fetch account ${address}:`, error)
    return null
  }
}

/**
 * Batch account info fetching with error handling
 * Uses base64 encoding for all accounts to prevent encoding issues
 */
export async function safeBatchGetAccountInfo(
  rpc: Rpc<GetAccountInfoApi>,
  addresses: Address[],
  options?: GetAccountInfoOptions
): Promise<(AccountInfo | null)[]> {
  const results = await Promise.allSettled(
    addresses.map(address => safeGetAccountInfo(rpc, address, options))
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.warn(`Failed to fetch account ${addresses[index]}:`, result.reason)
      return null
    }
  })
}

/**
 * Get program account data size safely
 * Specifically designed for large program accounts that cause base58 errors
 */
export async function getProgramDataSize(
  rpc: Rpc<GetAccountInfoApi>,
  programId: Address
): Promise<number | null> {
  const accountInfo = await safeGetAccountInfo(rpc, programId, {
    forceBase64: true,
    commitment: 'confirmed'
  })

  if (!accountInfo) return null

  // Return calculated size if available, otherwise estimate from data
  if ('calculatedSize' in accountInfo && typeof accountInfo.calculatedSize === 'number') {
    return accountInfo.calculatedSize
  }

  // Fallback: try to calculate from data array
  if (Array.isArray(accountInfo.data) && accountInfo.data[0]) {
    return Buffer.from(accountInfo.data[0] as string, 'base64').length
  }

  return 0
}