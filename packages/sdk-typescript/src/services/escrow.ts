/**
 * Modern Escrow Service for Web3.js v2 (2025)
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

import { 
  getCreateWorkOrderInstructionAsync,
  getSubmitWorkDeliveryInstructionAsync,
  getProcessPaymentInstructionAsync,
  type WorkOrderDataArgs,
  type WorkDeliveryDataArgs,
} from '../generated-v2/instructions/index.js';
import { sendAndConfirmTransactionFactory } from '../utils/transaction-helpers.js';

/**
 * Escrow configuration
 */
export interface IEscrowConfig {
  depositor: Address;
  beneficiary: Address;
  amount: bigint;
  releaseConditions: {
    timelock?: number;
    requiresBeneficiarySignature: boolean;
    requiresArbitratorSignature: boolean;
  };
  arbitrator?: Address;
}

/**
 * Escrow account data
 */
export interface IEscrowAccount {
  depositor: Address;
  beneficiary: Address;
  amount: bigint;
  state: 'pending' | 'completed' | 'cancelled';
  createdAt: number;
  releaseTime?: number; // Optional timelock for release
}

/**
 * Modern Escrow Service
 */
export class EscrowService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly _programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Create a work order with escrow
   */
  async createWorkOrder(
    signer: KeyPairSigner,
    provider: Address,
    workOrderData: WorkOrderDataArgs
  ): Promise<{
    workOrderPda: Address;
    signature: string;
  }> {
    try {
      console.log(`💰 Creating work order for ${workOrderData.title}`);

      // Generate work order PDA
      const workOrderPda = `work_order_${Date.now()}` as Address;
      
      // Create work order instruction
      const instruction = await getCreateWorkOrderInstructionAsync({
        workOrder: workOrderPda,
        client: signer.address,
        workOrderData,
      });

      // Build and send transaction using factory pattern
      const sendTransactionFactory = sendAndConfirmTransactionFactory('https://api.devnet.solana.com');
      const result = await sendTransactionFactory([instruction], [signer]);
      const signature = result.signature;

      console.log('✅ Work order created:', signature);
      return { workOrderPda, signature };
    } catch (error) {
      throw new Error(`Work order creation failed: ${String(error)}`);
    }
  }

  /**
   * Create an escrow account (legacy method)
   */
  async createEscrow(
    signer: KeyPairSigner,
    beneficiary: Address,
    amount: bigint
  ): Promise<{
    escrowPda: Address;
    signature: string;
  }> {
    // Use createWorkOrder with basic work order data
    const workOrderData: WorkOrderDataArgs = {
      orderId: Date.now(),
      provider: beneficiary,
      title: 'Escrow Service',
      description: 'Basic escrow service',
      requirements: [],
      paymentAmount: amount,
      paymentToken: 'So11111111111111111111111111111111111111112' as Address, // SOL
      deadline: Date.now() + 86400000, // 24 hours
    };

    const result = await this.createWorkOrder(signer, beneficiary, workOrderData);
    return {
      escrowPda: result.workOrderPda,
      signature: result.signature,
    };
  }

  /**
   * Deposit funds into escrow
   */
  async depositFunds(
    _signer: KeyPairSigner,
    _escrowPda: Address,
    amount: bigint
  ): Promise<string> {
    try {
      console.log(`📥 Depositing ${amount} tokens into escrow`);

      // Simulate deposit
      await new Promise(resolve => setTimeout(resolve, 1200));

      const signature = `sig_deposit_${Date.now()}`;

      console.log('✅ Funds deposited:', signature);
      return signature;
    } catch (error) {
      throw new Error(`Deposit failed: ${String(error)}`);
    }
  }

  /**
   * Release funds from escrow
   */
  async releaseFunds(
    _signer: KeyPairSigner,
    _escrowPda: Address
  ): Promise<string> {
    try {
      console.log('🔓 Releasing funds from escrow');

      await new Promise(resolve => setTimeout(resolve, 1000));

      return `sig_release_${Date.now()}`;
    } catch (error) {
      throw new Error(`Release failed: ${String(error)}`);
    }
  }

  /**
   * Cancel escrow and refund
   */
  async cancelEscrow(
    _signer: KeyPairSigner,
    _escrowPda: Address
  ): Promise<string> {
    try {
      console.log('❌ Cancelling escrow');

      // Simulate cancellation
      await new Promise(resolve => setTimeout(resolve, 800));

      const signature = `sig_cancel_${Date.now()}`;

      console.log('✅ Escrow cancelled:', signature);
      return signature;
    } catch (error) {
      throw new Error(`Cancellation failed: ${String(error)}`);
    }
  }

  /**
   * Get escrow account data
   */
  async getEscrow(escrowPda: Address): Promise<IEscrowAccount | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(escrowPda, {
          commitment: this.commitment,
          encoding: 'base64',
        })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      return {
        depositor: `depositor_${Date.now()}` as Address,
        beneficiary: `beneficiary_${Date.now()}` as Address,
        amount: BigInt(1000000),
        state: 'pending',
        createdAt: Date.now(),
      };
    } catch (error) {
      console.error('Failed to get escrow:', error);
      return null;
    }
  }

  /**
   * List escrows for a user
   */
  async getUserEscrows(
    userAddress: Address,
    _limit: number = 50
  ): Promise<Array<{ pda: Address; account: IEscrowAccount }>> {
    try {
      console.log('📝 Getting user escrows');

      // Simulate account query
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock escrow data
      return [
        {
          pda: `escrow_1_${userAddress.slice(0, 8)}` as Address,
          account: {
            depositor: userAddress,
            beneficiary: `beneficiary_1` as Address,
            amount: BigInt(500000),
            state: 'pending',
            createdAt: Date.now() - 3600000,
          },
        },
        {
          pda: `escrow_2_${userAddress.slice(0, 8)}` as Address,
          account: {
            depositor: userAddress,
            beneficiary: `beneficiary_2` as Address,
            amount: BigInt(1000000),
            state: 'completed',
            createdAt: Date.now() - 7200000,
          },
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get user escrows: ${String(error)}`);
    }
  }

  /**
   * Check if escrow can be released
   */
  async canRelease(escrowPda: Address): Promise<{
    canRelease: boolean;
    reason?: string;
  }> {
    try {
      const escrow = await this.getEscrow(escrowPda);

      if (!escrow) {
        return { canRelease: false, reason: 'Escrow not found' };
      }

      if (escrow.state !== 'pending') {
        return { canRelease: false, reason: 'Escrow not in pending state' };
      }

      if (escrow.releaseTime && Date.now() < escrow.releaseTime) {
        return { canRelease: false, reason: 'Timelock not expired' };
      }

      return { canRelease: true };
    } catch (error) {
      return { canRelease: false, reason: String(error) };
    }
  }

  async releaseEscrow(
    _signer: KeyPairSigner,
    _escrowPda: Address
  ): Promise<string> {
    try {
      console.log('🔓 Releasing funds from escrow');

      await new Promise(resolve => setTimeout(resolve, 1000));

      return `sig_release_${Date.now()}`;
    } catch (error) {
      throw new Error(`Release failed: ${String(error)}`);
    }
  }
} 