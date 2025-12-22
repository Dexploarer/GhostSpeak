import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { getProgramDerivedAddress, getAddressEncoder } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import { NATIVE_MINT_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS, ASSOCIATED_TOKEN_PROGRAM_ADDRESS } from '../../constants/system-addresses.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../../constants/ghostspeak.js'
import {
  getCreateEscrowInstructionAsync,
  getCreateEscrowWithSolInstructionAsync,
  getCompleteEscrowInstruction,
  getCancelEscrowInstruction,
  getDisputeEscrowInstruction,
  getProcessPartialRefundInstruction,
  type Escrow,
  type EscrowStatus
} from '../../generated/index.js'

// Regular Token program for SOL wrapping
const TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as import('@solana/addresses').Address
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112' as import('@solana/addresses').Address

/**
 * Derive escrow PDA from taskId using raw bytes (no length prefix)
 * Seeds: [b"escrow", taskId.as_bytes()]
 */
async function deriveEscrowPdaFromTaskId(programId: Address, taskId: string): Promise<Address> {
  const encoder = new TextEncoder()
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new Uint8Array([101, 115, 99, 114, 111, 119]), // "escrow"
      encoder.encode(taskId)
    ]
  })
  return pda
}

/**
 * Derive reentrancy guard PDA
 * Seeds: [b"reentrancy_guard"]
 */
async function deriveReentrancyGuardPda(programId: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new Uint8Array([114, 101, 101, 110, 116, 114, 97, 110, 99, 121, 95, 103, 117, 97, 114, 100]) // "reentrancy_guard"
    ]
  })
  return pda
}

/**
 * Derive ATA for Token2022
 */
async function deriveToken2022ATA(wallet: Address, mint: Address): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      getAddressEncoder().encode(wallet),
      getAddressEncoder().encode(TOKEN_2022_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint)
    ]
  })
  return ata
}

/**
 * Derive ATA for regular Token program (for native SOL)
 */
async function deriveTokenATA(wallet: Address, mint: Address): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      getAddressEncoder().encode(wallet),
      getAddressEncoder().encode(TOKEN_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint)
    ]
  })
  return ata
}

/**
 * Escrow management module with simplified API
 * 
 * Supports Token2022 tokens including:
 * - Token2022 Native wSOL (9pan9bMn5HatX4EJdBwg9VgCa7Uz5HL8N1m5D3NdXejP)
 * - USDC on Token2022
 * - Any other Token2022 SPL token
 */
export class EscrowModule extends BaseModule {
  /**
   * Create a new escrow
   * @param params.paymentToken - The Token2022 mint to use (defaults to Token2022 native wSOL)
   */
  async create(params: {
    signer: TransactionSigner
    amount: bigint
    buyer: Address
    seller: Address
    description: string
    paymentToken?: Address
    expiresInDays?: number
    milestones?: { amount: bigint; description: string }[]
  }): Promise<string> {
    const taskId = params.description
    const paymentToken = params.paymentToken ?? this.defaultPaymentToken
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + ((params.expiresInDays ?? 30) * 24 * 60 * 60))
    
    // Derive PDAs correctly (raw bytes, no length prefix)
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const clientTokenAccount = await deriveToken2022ATA(params.signer.address, paymentToken)
    const escrowTokenAccount = await deriveToken2022ATA(escrowAddress, paymentToken)
    
    return this.execute(
      'createEscrow',
      () => getCreateEscrowInstructionAsync({
        escrow: escrowAddress,
        // reentrancyGuard auto-derived by generated instruction
        client: params.signer,
        agent: params.seller,
        paymentToken,
        clientTokenAccount,
        escrowTokenAccount,
        taskId,
        amount: params.amount,
        expiresAt,
        transferHook: null,
        isConfidential: false
      }),
      [params.signer]
    )
  }

  /**
   * Create an escrow with native SOL (auto-wraps to wSOL)
   * This is the easiest way to create an escrow - just send SOL!
   */
  async createWithSol(params: {
    signer: TransactionSigner
    amount: bigint
    seller: Address
    description: string
    expiresInDays?: number
  }): Promise<string> {
    const taskId = params.description
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + ((params.expiresInDays ?? 30) * 24 * 60 * 60))
    
    // Derive PDAs for native SOL (regular Token program)
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const clientWsolAccount = await deriveTokenATA(params.signer.address, NATIVE_SOL_MINT)
    const escrowWsolAccount = await deriveTokenATA(escrowAddress, NATIVE_SOL_MINT)
    
    return this.execute(
      'createEscrowWithSol',
      () => getCreateEscrowWithSolInstructionAsync({
        escrow: escrowAddress,
        client: params.signer,
        agent: params.seller,
        clientWsolAccount,
        escrowWsolAccount,
        taskId,
        amount: params.amount,
        expiresAt,
        transferHook: null,
        isConfidential: false
      }),
      [params.signer]
    )
  }

  /**
   * Complete an escrow - releases funds to the agent
   * @param taskId - The original task description used to derive the escrow PDA
   */
  async complete(signer: TransactionSigner, taskId: string, paymentToken?: Address): Promise<string> {
    const mint = paymentToken ?? this.defaultPaymentToken
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const reentrancyGuard = await deriveReentrancyGuardPda(GHOSTSPEAK_PROGRAM_ID)
    const escrowTokenAccount = await deriveToken2022ATA(escrowAddress, mint)
    const agentTokenAccount = await deriveToken2022ATA(signer.address, mint)
    
    return this.execute(
      'completeEscrow',
      () => getCompleteEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard,
        agent: signer.address,
        escrowTokenAccount,
        agentTokenAccount,
        authority: signer,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
        resolutionNotes: 'Work completed successfully'
      }),
      [signer]
    )
  }

  /**
   * Cancel an escrow - refunds the client
   */
  async cancel(signer: TransactionSigner, taskId: string, params: { 
    buyer: Address
    paymentToken?: Address
    reason?: string
  }): Promise<string> {
    const mint = params.paymentToken ?? this.defaultPaymentToken
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const reentrancyGuard = await deriveReentrancyGuardPda(GHOSTSPEAK_PROGRAM_ID)
    const escrowTokenAccount = await deriveToken2022ATA(escrowAddress, mint)
    const clientRefundAccount = await deriveToken2022ATA(params.buyer, mint)
    
    return this.execute(
      'cancelEscrow',
      () => getCancelEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard,
        authority: signer,
        clientRefundAccount,
        paymentToken: mint,
        cancellationReason: params.reason ?? 'User cancelled',
        escrowTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
      }),
      [signer]
    )
  }

  /**
   * Dispute an escrow
   */
  async dispute(signer: TransactionSigner, taskId: string, reason: string): Promise<string> {
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const reentrancyGuard = await deriveReentrancyGuardPda(GHOSTSPEAK_PROGRAM_ID)
    
    return this.execute(
      'disputeEscrow',
      () => getDisputeEscrowInstruction({
        escrow: escrowAddress,
        reentrancyGuard,
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
    taskId: string,
    refundAmount: bigint,
    totalAmount: bigint,
    clientAddress: Address,
    agentAddress: Address,
    paymentToken?: Address
  ): Promise<string> {
    const mint = paymentToken ?? this.defaultPaymentToken
    const escrowAddress = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    const reentrancyGuard = await deriveReentrancyGuardPda(GHOSTSPEAK_PROGRAM_ID)
    const escrowTokenAccount = await deriveToken2022ATA(escrowAddress, mint)
    const clientRefundAccount = await deriveToken2022ATA(clientAddress, mint)
    const agentPaymentAccount = await deriveToken2022ATA(agentAddress, mint)
    
    return this.execute(
      'processPartialRefund',
      () => getProcessPartialRefundInstruction({
        escrow: escrowAddress,
        reentrancyGuard,
        escrowTokenAccount,
        clientRefundAccount,
        agentPaymentAccount,
        paymentToken: mint,
        authority: signer,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
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
   * Get escrow by taskId
   */
  async getEscrowByTaskId(taskId: string): Promise<Escrow | null> {
    const address = await deriveEscrowPdaFromTaskId(GHOSTSPEAK_PROGRAM_ID, taskId)
    return this.getEscrowAccount(address)
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

  /**
   * Default payment token - Token2022 native wSOL equivalent
   */
  private get defaultPaymentToken(): Address {
    return NATIVE_MINT_ADDRESS
  }
}
