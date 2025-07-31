/**
 * Blockchain service for Solana network interactions
 */

import type { Address } from '@solana/addresses'
import type { IBlockchainService } from '../../types/services.js'
import { initializeClient } from '../../utils/client.js'

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
   */
  async sendTransaction(signature: string): Promise<string> {
    try {
      // In real implementation, this would send the actual transaction
      // For now, return the signature as confirmation
      console.log(`Sending transaction: ${signature}`)
      return signature
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Confirm a transaction on the blockchain
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      // In real implementation, this would check transaction status
      // For now, simulate confirmation after a delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`Transaction confirmed: ${signature}`)
      return true
    } catch (error) {
      console.error(`Failed to confirm transaction ${signature}:`, error)
      return false
    }
  }

  /**
   * Get account information from the blockchain
   */
  async getAccountInfo(address: Address): Promise<unknown> {
    try {
      // In real implementation, this would fetch account data
      console.log(`Getting account info for: ${address}`)
      return {
        address: address.toString(),
        balance: 0,
        owner: 'SystemProgram',
        executable: false,
        rentEpoch: 0
      }
    } catch (error) {
      throw new Error(`Failed to get account info for ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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