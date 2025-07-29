import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateEscrowInstructionAsync,
  getCompleteEscrowInstruction,
  getCancelEscrowInstruction,
  getDisputeEscrowInstruction,
  getProcessPartialRefundInstruction,
  type Escrow,
  type EscrowStatus
} from '../../generated/index.js'

/**
 * Escrow management module with simplified API
 */
export class EscrowModule extends BaseModule {
  /**
   * Create a new escrow
   */
  async create(params: {
    signer: TransactionSigner
    amount: bigint
    buyer: Address
    seller: Address
    description: string
    milestones?: { amount: bigint; description: string }[]
  }): Promise<string> {
    const escrowAddress = this.deriveEscrowPda(params.buyer, params.seller, Date.now())
    
    return this.execute(
      'createEscrow',
      () => getCreateEscrowInstructionAsync({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        payer: params.buyer,
        seller: params.seller,
        escrowTokenAccount: this.deriveTokenAccount(escrowAddress),
        buyerTokenAccount: this.deriveTokenAccount(params.buyer),
        sellerTokenAccount: this.deriveTokenAccount(params.seller),
        tokenProgram: this.tokenProgramId,
        systemProgram: this.systemProgramId,
        amount: params.amount,
        description: params.description
      }),
      [params.signer]
    )
  }

  /**
   * Complete an escrow
   */
  async complete(signer: TransactionSigner, escrowAddress: Address): Promise<string> {
    return this.execute(
      'completeEscrow',
      () => getCompleteEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        agent: signer.address,
        escrowTokenAccount: this.deriveTokenAccount(escrowAddress),
        agentTokenAccount: this.deriveTokenAccount(signer.address),
        completor: signer,
        tokenProgram: this.tokenProgramId
      }),
      [signer]
    )
  }

  /**
   * Cancel an escrow
   */
  async cancel(signer: TransactionSigner, escrowAddress: Address): Promise<string> {
    return this.execute(
      'cancelEscrow',
      () => getCancelEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        authority: signer,
        escrowTokenAccount: this.deriveTokenAccount(escrowAddress),
        tokenProgram: this.tokenProgramId
      }),
      [signer]
    )
  }

  /**
   * Dispute an escrow
   */
  async dispute(signer: TransactionSigner, escrowAddress: Address, reason: string): Promise<string> {
    return this.execute(
      'disputeEscrow',
      () => getDisputeEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        disputer: signer
      }),
      [signer]
    )
  }

  /**
   * Process partial refund
   */
  async processPartialRefund(
    signer: TransactionSigner,
    escrowAddress: Address,
    refundAmount: bigint
  ): Promise<string> {
    return this.execute(
      'processPartialRefund',
      () => getProcessPartialRefundInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        authority: signer,
        escrowTokenAccount: this.deriveTokenAccount(escrowAddress),
        tokenProgram: this.tokenProgramId,
        refundAmount
      }),
      [signer]
    )
  }

  /**
   * Get escrow account
   */
  async getEscrowAccount(address: Address): Promise<Escrow | null> {
    return super.getAccount<Escrow>(address, 'getEscrowDecoder')
  }

  /**
   * Get all escrows
   */
  async getAllEscrows(): Promise<{ address: Address; data: Escrow }[]> {
    return this.getProgramAccounts<Escrow>('getEscrowDecoder')
  }

  /**
   * Get escrows by buyer
   */
  async getEscrowsByBuyer(buyer: Address): Promise<{ address: Address; data: Escrow }[]> {
    const filters = [{
      memcmp: {
        offset: 8, // Skip discriminator
        bytes: buyer
      }
    }]
    
    return this.getProgramAccounts<Escrow>('getEscrowDecoder', filters)
  }

  /**
   * Get escrows by seller
   */
  async getEscrowsBySeller(seller: Address): Promise<{ address: Address; data: Escrow }[]> {
    const filters = [{
      memcmp: {
        offset: 40, // Skip discriminator + buyer
        bytes: seller
      }
    }]
    
    return this.getProgramAccounts<Escrow>('getEscrowDecoder', filters)
  }

  /**
   * Get escrows by status
   */
  async getEscrowsByStatus(status: EscrowStatus): Promise<{ address: Address; data: Escrow }[]> {
    const escrows = await this.getAllEscrows()
    return escrows.filter(({ data }) => data.status === status)
  }

  // Helper methods

  private deriveEscrowPda(buyer: Address, seller: Address, nonce: number): Address {
    // Implementation would derive PDA
    return `escrow_${buyer}_${seller}_${nonce}` as Address
  }

  private deriveTokenAccount(owner: Address): Address {
    // Implementation would derive associated token account
    return `token_${owner}` as Address
  }

  private get nativeMint(): Address {
    return 'So11111111111111111111111111111111111111112' as Address
  }

  private get tokenProgramId(): Address {
    return 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
  }

  private get systemProgramId(): Address {
    return '11111111111111111111111111111111' as Address
  }
}