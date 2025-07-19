/**
 * Test helpers for RPC utilities
 * These provide backward compatibility for tests while using the new RPC client
 */

import { createSolanaRpc } from '@solana/kit'
import type { 
  Address, 
  Rpc, 
  Commitment,
  SignedTransaction,
  TransactionMessage,
  CompilableTransactionMessage,
  Base64EncodedWireTransaction
} from '@solana/kit'
import { SolanaRpcClient } from '../../src/utils/rpc-client'
import type { AccountInfo, TransactionStatus } from '../../src/types/rpc-types'

/**
 * Create a GhostSpeak RPC client (test helper)
 */
export function createGhostSpeakRpc(endpoint: string = 'https://api.devnet.solana.com'): Rpc<any> {
  return createSolanaRpc(endpoint) as any
}

/**
 * Get account data (test helper)
 */
export async function getAccountData(
  rpc: any,
  address: Address,
  commitment?: Commitment
): Promise<AccountInfo | null> {
  const response = await rpc.getAccountInfo(address, {
    encoding: 'base64',
    ...(commitment && { commitment })
  })
  
  if (!response.value) return null
  
  return {
    executable: response.value.executable,
    lamports: response.value.lamports,
    owner: response.value.owner,
    rentEpoch: response.value.rentEpoch,
    data: response.value.data,
    space: response.value.space
  }
}

/**
 * Get multiple accounts data (test helper)
 */
export async function getMultipleAccountsData(
  rpc: any,
  addresses: Address[],
  commitment?: Commitment
): Promise<(AccountInfo | null)[]> {
  if (addresses.length === 0) return []
  
  // Batch in chunks of 100
  const chunks: Address[][] = []
  for (let i = 0; i < addresses.length; i += 100) {
    chunks.push(addresses.slice(i, i + 100))
  }
  
  const results: (AccountInfo | null)[] = []
  
  for (const chunk of chunks) {
    const response = await rpc.getMultipleAccounts(chunk, {
      encoding: 'base64',
      ...(commitment && { commitment })
    })
    
    const accounts = (response.value || []).map((account: any) => {
      if (!account) return null
      
      return {
        executable: account.executable,
        lamports: account.lamports,
        owner: account.owner,
        rentEpoch: account.rentEpoch,
        data: account.data,
        space: account.space
      }
    })
    
    results.push(...accounts)
  }
  
  return results
}

/**
 * Send and confirm transaction (test helper)
 */
export async function sendAndConfirmTransaction(
  rpc: any,
  transaction: SignedTransaction | any,
  options?: {
    skipPreflight?: boolean
    preflightCommitment?: Commitment
    commitment?: Commitment
    maxRetries?: number
  }
): Promise<string> {
  return await rpc.sendTransaction(transaction, {
    skipPreflight: options?.skipPreflight ?? false,
    preflightCommitment: options?.preflightCommitment ?? 'confirmed',
    maxRetries: options?.maxRetries,
    encoding: 'base64'
  })
}

/**
 * Simulate transaction with retry (test helper)
 */
export async function simulateTransactionWithRetry(
  rpc: any,
  message: TransactionMessage | CompilableTransactionMessage | any,
  maxRetries: number = 3
): Promise<{
  err: any
  logs: string[] | null
  unitsConsumed?: bigint
  returnData?: any
}> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await rpc.simulateTransaction(message, {
        sigVerify: false,
        commitment: 'confirmed'
      })
      
      return {
        err: response.value.err || null,
        logs: response.value.logs || null,
        unitsConsumed: response.value.unitsConsumed,
        returnData: response.value.returnData
      }
    } catch (error) {
      lastError = error
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  
  throw lastError
}

/**
 * Wait for transaction confirmation (test helper)
 */
export async function waitForTransactionConfirmation(
  rpc: any,
  signature: string,
  commitment: Commitment = 'confirmed',
  timeoutMs: number = 30000
): Promise<TransactionStatus | null> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await rpc.getSignatureStatuses([signature])
    const status = response.value?.[0]
    
    if (status) {
      if (status.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
      }
      
      if (status.confirmationStatus === commitment || 
          (commitment === 'confirmed' && status.confirmationStatus === 'finalized')) {
        return status
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`)
}