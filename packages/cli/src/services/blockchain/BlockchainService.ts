/**
 * Blockchain service for Solana network interactions
 */

import type { Address } from '@solana/addresses'
import type { Signature, Base64EncodedWireTransaction } from '@solana/kit'
import type { IBlockchainService } from '../../types/services.js'
import { initializeClient } from '../../utils/client.js'
import { NetworkError, ServiceError } from '../../types/services.js'
import { getErrorMessage } from '../../utils/type-guards.js'

export class BlockchainService implements IBlockchainService {
  private clients = new Map<string, unknown>()

  /**
   * Get blockchain client for specified network
   */
  async getClient(network: string): Promise<unknown> {
    // Return cached client if available
    if (this.clients.has(network)) {
      return this.clients.get(network)!
    }

    // Initialize new client
    try {
      const { client } = await initializeClient(network as 'devnet' | 'testnet' | 'mainnet-beta')
      this.clients.set(network, client)
      return client
    } catch (error) {
      throw new Error(`Failed to initialize client for network "${network}": ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send a transaction to the blockchain
   * Note: This method accepts a serialized transaction, not just a signature
   */
  async sendTransaction(serializedTransaction: string): Promise<string> {
    try {
      const { rpc } = await initializeClient()
      
      // Send the transaction with proper configuration
      // The RPC client in @solana/kit expects Base64EncodedWireTransaction
      const response = await rpc.sendTransaction(
        serializedTransaction as Base64EncodedWireTransaction,
        {
          encoding: 'base64',
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: BigInt(5)
        }
      ).send()
      
      return response
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific Solana transaction errors
        if (error.message.includes('insufficient funds')) {
          throw new ServiceError(
            'Insufficient SOL balance to complete transaction',
            'INSUFFICIENT_FUNDS',
            'Fund your wallet using: gs faucet',
            false
          )
        }
        
        if (error.message.includes('blockhash not found')) {
          throw new ServiceError(
            'Transaction expired due to stale blockhash',
            'EXPIRED_BLOCKHASH',
            'Transaction will be automatically retried with fresh blockhash',
            true
          )
        }
        
        if (error.message.includes('already in use')) {
          throw new ServiceError(
            'Account or resource already exists',
            'DUPLICATE_RESOURCE',
            'Try using a different identifier or check existing resources',
            false
          )
        }
        
        throw new NetworkError(
          `Transaction failed: ${error.message}`,
          'Check network connectivity and try again'
        )
      }
      
      throw new ServiceError(
        'Unknown transaction error occurred',
        'UNKNOWN_ERROR',
        'Contact support if this persists',
        true
      )
    }
  }

  /**
   * Confirm a transaction on the blockchain
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const { rpc } = await initializeClient()
      
      // Check transaction status with proper typing
      const response = await rpc.getSignatureStatuses(
        [signature as Signature],
        {
          searchTransactionHistory: true
        }
      ).send()
      
      if (!response || !response.value || response.value.length === 0) {
        console.warn(`No status found for transaction: ${signature}`)
        return false
      }
      
      const status = response.value[0]
      
      if (!status) {
        console.warn(`Transaction not found: ${signature}`)
        return false
      }
      
      // Check if transaction is confirmed or finalized
      if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
        if (status.err) {
          console.error(`Transaction failed with error:`, status.err)
          return false
        }
        
        console.log(`Transaction confirmed: ${signature} (${status.confirmationStatus})`)
        return true
      }
      
      // Transaction is still processing
      console.log(`Transaction still processing: ${signature} (${status.confirmationStatus || 'processed'})`)
      return false
      
    } catch (error) {
      console.error(`Failed to confirm transaction ${signature}:`, error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  /**
   * Get account information from the blockchain
   */
  async getAccountInfo(address: Address): Promise<{
    address: string;
    balance: bigint;
    owner: string;
    executable: boolean;
    rentEpoch: bigint;
    data?: Uint8Array;
  } | null> {
    try {
      const { rpc } = await initializeClient()
      
      // Fetch account information with proper configuration
      const response = await rpc.getAccountInfo(
        address,
        {
          encoding: 'base64',
          commitment: 'confirmed'
        }
      ).send()
      
      if (!response || !response.value) {
        console.log(`Account not found: ${address}`)
        return null
      }
      
      const accountInfo = response.value
      
      // Parse account data if present
      let accountData: Uint8Array | undefined
      if (accountInfo.data && Array.isArray(accountInfo.data) && accountInfo.data.length >= 1) {
        try {
          // Decode base64 data
          const base64Data = accountInfo.data[0] as string
          accountData = new Uint8Array(Buffer.from(base64Data, 'base64'))
        } catch (decodeError) {
          console.warn('Failed to decode account data:', decodeError)
        }
      }
      
      return {
        address: address.toString(),
        balance: BigInt(accountInfo.lamports),
        owner: accountInfo.owner,
        executable: accountInfo.executable,
        rentEpoch: BigInt(accountInfo.rentEpoch),
        data: accountData
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid param')) {
        throw new ServiceError(
          `Invalid address format: ${address}`,
          'INVALID_ADDRESS',
          'Ensure the address is a valid Solana public key',
          false
        )
      }
      
      throw new NetworkError(
        `Failed to get account info for ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check network connectivity and address format'
      )
    }
  }

  /**
   * Request airdrop for testing (devnet only)
   */
  async requestAirdrop(address: Address, amount: number): Promise<string> {
    try {
      // Get the client for devnet (airdrop only works on devnet)
      const { rpc } = await initializeClient('devnet')
      
      // Use the Solana RPC airdrop directly
      const lamports = BigInt(amount * 1_000_000_000)
      
      // Note: RPC types are problematic in SDK, using proper interface
      interface AirdropResponse {
        send(): Promise<string>
      }
      interface AirdropRPC {
        requestAirdrop(address: Address, lamports: bigint): Promise<AirdropResponse>
      }
      
      const typedRpc = rpc as unknown as AirdropRPC
      const airdropResponse = await typedRpc.requestAirdrop(address, lamports)
      const signature = await airdropResponse.send()
      
      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief wait for transaction to propagate
      
      return signature
    } catch (error) {
      throw new Error(`Failed to request airdrop: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get network health and status
   */
  async getNetworkStatus(_network: string): Promise<{
    healthy: boolean
    blockHeight: number
    transactionCount: number
  }> {
    // In real implementation, this would check network health
    return {
      healthy: true,
      blockHeight: 0,
      transactionCount: 0
    }
  }

  /**
   * Clear cached clients (useful for network switching)
   */
  clearClients(): void {
    this.clients.clear()
  }
}

// Factory function for dependency injection
export function createBlockchainService(): BlockchainService {
  return new BlockchainService()
}