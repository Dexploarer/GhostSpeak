import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { GhostSpeakConfig } from '../types/index.js'

/**
 * Utility functions for creating accounts and PDAs
 */
export class AccountCreationHelper {
  constructor(private config: GhostSpeakConfig) {}

  /**
   * Helper to create an agent account with derived PDA
   */
  async createAgentAccount(
    signer: TransactionSigner,
    agentId: string,
    agentType: number,
    metadataUri: string
  ): Promise<{ agentAddress: Address; userRegistryAddress: Address; agentType: number; metadataUri: string }> {
    const { deriveAgentPda, deriveUserRegistryPda } = await import('./pda.js')
    
    const [agentAddress] = await deriveAgentPda({
      programAddress: this.config.programId!,
      owner: signer.address,
      agentId
    })
    const userRegistryAddress = await deriveUserRegistryPda(this.config.programId!, signer.address)
    
    // Validate agent type
    if (agentType < 0 || agentType > 10) {
      throw new Error(`Invalid agent type: ${agentType}. Must be between 0 and 10.`)
    }
    
    // Validate metadata URI
    if (!metadataUri || metadataUri.length === 0) {
      throw new Error('Metadata URI is required')
    }
    
    try {
      new URL(metadataUri)
    } catch {
      throw new Error(`Invalid metadata URI format: ${metadataUri}`)
    }
    
    return {
      agentAddress,
      userRegistryAddress,
      agentType,
      metadataUri
    }
  }





  /**
   * Helper to create an A2A session account with derived PDA
   */
  async createA2ASessionAccount(
    creator: TransactionSigner
  ): Promise<Address> {
    const { deriveA2ASessionPdaOriginal } = await import('./pda.js')
    
    return await deriveA2ASessionPdaOriginal(this.config.programId!, creator.address)
  }





  /**
   * Helper to create agent verification account with derived PDA
   */
  async createAgentVerificationAccount(
    agent: Address,
    verifier: TransactionSigner
  ): Promise<Address> {
    const { deriveAgentVerificationPda } = await import('./pda.js')
    
    return deriveAgentVerificationPda(this.config.programId!, agent, verifier.address)
  }

  /**
   * Generate a unique string ID for accounts (useful for listings, jobs, etc.)
   */
  static generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Generate a unique bigint ID for work orders
   */
  static generateUniqueBigIntId(): bigint {
    return BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))
  }
}

/**
 * Convenience functions for account creation
 */
export function createAccountCreationHelper(config: GhostSpeakConfig): AccountCreationHelper {
  return new AccountCreationHelper(config)
}