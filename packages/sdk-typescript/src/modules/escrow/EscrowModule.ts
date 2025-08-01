import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import { NATIVE_MINT_ADDRESS } from '../../constants/system-addresses.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../../constants/ghostspeak.js'
import { 
  deriveEscrowPda, 
  deriveTokenAccountPda 
} from '../../utils/pda.js'
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
    const escrowAddress = await this.deriveEscrowPda(params.buyer, params.seller, Date.now())
    const clientTokenAccount = await this.deriveTokenAccount(params.buyer)
    const escrowTokenAccount = await this.deriveTokenAccount(escrowAddress)
    
    return this.execute(
      'createEscrow',
      () => getCreateEscrowInstructionAsync({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        client: params.signer,
        agent: params.seller,
        paymentToken: this.nativeMint,
        clientTokenAccount,
        escrowTokenAccount,
        tokenProgram: this.tokenProgramId,
        associatedTokenProgram: this.associatedTokenProgramId,
        systemProgram: this.systemProgramId,
        taskId: params.description,
        amount: params.amount,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        transferHook: null,
        isConfidential: false
      }),
      [params.signer]
    )
  }

  /**
   * Complete an escrow
   */
  async complete(signer: TransactionSigner, escrowAddress: Address): Promise<string> {
    const escrowTokenAccount = await this.deriveTokenAccount(escrowAddress)
    const agentTokenAccount = await this.deriveTokenAccount(signer.address)
    
    return this.execute(
      'completeEscrow',
      () => getCompleteEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        agent: signer.address,
        escrowTokenAccount,
        agentTokenAccount,
        authority: signer,
        tokenProgram: this.tokenProgramId,
        resolutionNotes: 'Work completed successfully'
      }),
      [signer]
    )
  }

  /**
   * Cancel an escrow
   */
  async cancel(signer: TransactionSigner, escrowAddress: Address, params: { buyer: Address }): Promise<string> {
    const clientRefundAccount = await this.deriveTokenAccount(params.buyer)
    const escrowTokenAccount = await this.deriveTokenAccount(escrowAddress)
    
    return this.execute(
      'cancelEscrow',
      () => getCancelEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        authority: signer,
        clientRefundAccount,
        paymentToken: this.nativeMint,
        cancellationReason: 'User cancelled',
        escrowTokenAccount,
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
        authority: signer,
        disputeReason: reason
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
    refundAmount: bigint,
    totalAmount: bigint
  ): Promise<string> {
    const escrowTokenAccount = await this.deriveTokenAccount(escrowAddress)
    const clientRefundAccount = await this.deriveTokenAccount(escrowAddress)
    const agentPaymentAccount = await this.deriveTokenAccount(signer.address)
    
    return this.execute(
      'processPartialRefund',
      () => getProcessPartialRefundInstruction({
        escrow: escrowAddress,
        reentrancyGuard: this.systemProgramId,
        escrowTokenAccount,
        clientRefundAccount,
        agentPaymentAccount,
        paymentToken: this.nativeMint,
        authority: signer,
        tokenProgram: this.tokenProgramId,
        clientRefundPercentage: Math.min(100, Math.max(0, Number((refundAmount * BigInt(100) / totalAmount).toString())))
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
        offset: BigInt(8), // Skip discriminator
        bytes: buyer as string,
        encoding: 'base58' as const
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
        offset: BigInt(40), // Skip discriminator + buyer
        bytes: seller as string,
        encoding: 'base58' as const
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

  private async deriveEscrowPda(buyer: Address, seller: Address, nonce: number): Promise<Address> {
    return await deriveEscrowPda(GHOSTSPEAK_PROGRAM_ID, buyer, seller, nonce)
  }

  private async deriveTokenAccount(owner: Address): Promise<Address> {
    return await deriveTokenAccountPda(owner, this.nativeMint)
  }

  private get nativeMint(): Address {
    return NATIVE_MINT_ADDRESS
  }

  private get tokenProgramId(): Address {
    return 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
  }

  private get associatedTokenProgramId(): Address {
    return 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address
  }

  private get systemProgramId(): Address {
    return '11111111111111111111111111111111' as Address
  }
}