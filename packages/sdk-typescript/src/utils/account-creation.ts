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
    
    const agentAddress = await deriveAgentPda(this.config.programId!, signer.address, agentId)
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
   * Helper to create a service listing account with derived PDA
   */
  async createServiceListingAccount(
    creator: TransactionSigner,
    listingId: string
  ): Promise<Address> {
    const { deriveServiceListingPda } = await import('./pda.js')
    
    return deriveServiceListingPda(this.config.programId!, creator.address, listingId)
  }

  /**
   * Helper to create a job posting account with derived PDA
   */
  async createJobPostingAccount(
    employer: TransactionSigner,
    jobId: string
  ): Promise<Address> {
    const { deriveJobPostingPda } = await import('./pda.js')
    
    return deriveJobPostingPda(this.config.programId!, employer.address, jobId)
  }

  /**
   * Helper to create a work order account with derived PDA
   */
  async createWorkOrderAccount(
    employer: TransactionSigner,
    orderId: bigint
  ): Promise<Address> {
    const { deriveWorkOrderPda } = await import('./pda.js')
    
    return deriveWorkOrderPda(this.config.programId!, employer.address, orderId)
  }

  /**
   * Helper to create an A2A session account with derived PDA
   */
  async createA2ASessionAccount(
    creator: TransactionSigner
  ): Promise<Address> {
    const { deriveA2ASessionPda } = await import('./pda.js')
    
    return deriveA2ASessionPda(this.config.programId!, creator.address)
  }

  /**
   * Helper to create service purchase account with derived PDA
   */
  async createServicePurchaseAccount(
    serviceListing: Address,
    buyer: TransactionSigner
  ): Promise<Address> {
    const { deriveServicePurchasePda } = await import('./pda.js')
    
    return deriveServicePurchasePda(this.config.programId!, serviceListing, buyer.address)
  }

  /**
   * Helper to create job application account with derived PDA
   */
  async createJobApplicationAccount(
    jobPosting: Address,
    applicant: TransactionSigner
  ): Promise<Address> {
    const { deriveJobApplicationPda } = await import('./pda.js')
    
    return deriveJobApplicationPda(this.config.programId!, jobPosting, applicant.address)
  }

  /**
   * Helper to create payment account with derived PDA
   */
  async createPaymentAccount(
    workOrder: Address,
    payer: TransactionSigner
  ): Promise<Address> {
    const { derivePaymentPda } = await import('./pda.js')
    
    return derivePaymentPda(this.config.programId!, workOrder, payer.address)
  }

  /**
   * Helper to create work delivery account with derived PDA
   */
  async createWorkDeliveryAccount(
    workOrder: Address,
    provider: TransactionSigner
  ): Promise<Address> {
    const { deriveWorkDeliveryPda } = await import('./pda.js')
    
    return deriveWorkDeliveryPda(this.config.programId!, workOrder, provider.address)
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