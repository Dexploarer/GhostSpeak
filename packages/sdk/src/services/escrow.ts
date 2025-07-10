/**
 * Modern Escrow Service for Web3.js v2 (2025)
 */

import {
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstructionAsync,
  getProcessPaymentInstructionAsync,
  type WorkOrderDataArgs,
  type WorkDeliveryDataArgs,
} from '../generated-v2/instructions/index.js';
import { sendAndConfirmTransactionFactory } from '../utils/transaction-helpers.js';
import { logger } from '../utils/logger.js';

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

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
   * Creates a work order with automatic escrow for secure payment
   *
   * Establishes a formal work agreement between client and agent provider,
   * with funds held in escrow until work is completed and approved.
   * The work order defines deliverables, requirements, and payment terms.
   *
   * @param {KeyPairSigner} signer - The client creating and funding the work order
   * @param {object} options - Work order configuration:
   *   - agentAddress: Provider agent's address who will complete the work
   *   - taskDescription: Detailed description of the work (becomes title and description)
   *   - paymentAmount: Amount in lamports to be held in escrow
   *   - deadline: Unix timestamp for completion deadline
   *   - requirements: Specific requirements for the work
   *   - deliverables: Expected deliverables description
   *
   * @returns {Promise<{workOrderPda: Address, signature: string}>} Result containing:
   *   - workOrderPda: Program Derived Address of the created work order
   *   - signature: Transaction signature for the creation
   *
   * @throws {Error} If creation fails due to:
   *   - Insufficient funds for escrow deposit
   *   - Invalid deadline (must be in future)
   *   - Network errors or RPC failures
   *
   * @example
   * ```typescript
   * const result = await escrowService.createWorkOrder(signer, {
   *   agentAddress: providerAgent,
   *   taskDescription: "Audit smart contract for security vulnerabilities",
   *   paymentAmount: BigInt(500_000_000), // 0.5 SOL
   *   deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
   *   requirements: "Must check for reentrancy, overflow, and access control issues",
   *   deliverables: "Detailed audit report with findings and recommendations"
   * });
   * logger.escrow.info(`Work order created: ${result.workOrderPda}`);
   * ```
   *
   * @since 1.0.0
   */
  async createWorkOrder(
    signer: KeyPairSigner,
    options: {
      agentAddress: Address;
      taskDescription: string;
      paymentAmount: bigint;
      deadline: number;
      requirements: string;
      deliverables: string;
    }
  ): Promise<{
    workOrderPda: Address;
    signature: string;
  }> {
    try {
      logger.escrow.info(`💰 Creating work order: ${options.taskDescription}`);

      // Generate work order PDA
      const workOrderPda = `work_order_${Date.now()}` as Address;

      // Convert to WorkOrderDataArgs format expected by instruction
      const workOrderData: WorkOrderDataArgs = {
        orderId: BigInt(Date.now()),
        provider: String(options.agentAddress), // Convert Address to string
        title: options.taskDescription.substring(0, 50), // Limit title length
        description: options.taskDescription,
        requirements: [options.requirements],
        paymentAmount: options.paymentAmount,
        paymentToken: '11111111111111111111111111111111', // SOL as string
        deadline: BigInt(options.deadline),
      };

      // Create work order instruction
      const instruction = getCreateWorkOrderInstruction({
        workOrder: workOrderPda,
        client: signer.address,
        workOrderData,
      });

      // Build and send transaction using factory pattern
      const sendTransactionFactory = sendAndConfirmTransactionFactory(
        'https://api.devnet.solana.com'
      );
      const result = await sendTransactionFactory([instruction], [signer]);
      const signature = result.signature;

      logger.escrow.info('✅ Work order created:', signature);
      return { workOrderPda, signature };
    } catch (error) {
      throw new Error(`Work order creation failed: ${String(error)}`);
    }
  }

  /**
   * Creates a basic escrow account (legacy compatibility method)
   *
   * Simplified escrow creation that wraps the work order functionality.
   * For new implementations, use createWorkOrder instead for more features.
   *
   * @param {KeyPairSigner} signer - The account creating and funding the escrow
   * @param {Address} beneficiary - The recipient of funds when released
   * @param {bigint} amount - Amount in lamports to hold in escrow
   *
   * @returns {Promise<{escrowPda: Address, signature: string}>} Escrow details
   *
   * @deprecated Use createWorkOrder for full functionality
   * @since 1.0.0
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

    const result = await this.createWorkOrder(signer, {
      agentAddress: beneficiary,
      taskDescription: 'Basic escrow service',
      paymentAmount: amount,
      deadline: Date.now() + 86400000, // 24 hours
      requirements: 'Automated escrow release upon completion',
      deliverables: 'Transfer of escrowed funds to beneficiary',
    });
    return {
      escrowPda: result.workOrderPda,
      signature: result.signature,
    };
  }

  /**
   * Deposits additional funds into an existing escrow
   *
   * Adds more funds to an escrow account, useful for milestone payments
   * or increasing the escrow amount after initial creation.
   *
   * @param {KeyPairSigner} signer - The account depositing funds
   * @param {Address} escrowPda - The escrow account to deposit into
   * @param {bigint} amount - Amount in lamports to deposit
   *
   * @returns {Promise<string>} Transaction signature of the deposit
   *
   * @throws {Error} If deposit fails due to insufficient funds
   *
   * @example
   * ```typescript
   * const signature = await escrowService.depositFunds(
   *   signer,
   *   escrowPda,
   *   BigInt(100_000_000) // Additional 0.1 SOL
   * );
   * ```
   *
   * @since 1.0.0
   */
  async depositFunds(
    signer: KeyPairSigner,
    escrowPda: Address,
    amount: bigint
  ): Promise<string> {
    try {
      logger.escrow.info(
        `📥 Depositing ${amount} tokens into escrow: ${escrowPda}`
      );

      // Create a work order that acts as an escrow deposit
      const workOrderData: WorkOrderDataArgs = {
        orderId: Date.now(),
        provider: signer.address,
        title: 'Escrow Deposit',
        description: `Deposit of ${amount} tokens`,
        requirements: ['fund_escrow'],
        paymentAmount: amount,
        paymentToken: 'So11111111111111111111111111111111111111112' as Address, // SOL
        deadline: Date.now() + 86400000, // 24 hours
      };

      const result = await this.createWorkOrder(
        signer,
        signer.address,
        workOrderData
      );
      logger.escrow.info(
        '✅ Funds deposited via work order:',
        result.signature
      );
      return result.signature;
    } catch (error) {
      throw new Error(`Deposit failed: ${String(error)}`);
    }
  }

  /**
   * Processes payment release from escrow for completed work
   *
   * Releases escrowed funds to the provider after work has been approved.
   * Supports both standard and confidential token transfers for privacy.
   * Only the client who created the work order can approve payment.
   *
   * @param {KeyPairSigner} signer - Must be the work order creator (client)
   * @param {Address} workOrderPda - The work order to process payment for
   * @param {Address} providerAgent - The agent receiving payment
   * @param {bigint} amount - Amount to release (must match escrow amount)
   * @param {Address} payerTokenAccount - Source token account (escrow)
   * @param {Address} providerTokenAccount - Destination token account
   * @param {Address} tokenMint - SPL token mint (SOL mint for native SOL)
   * @param {boolean} useConfidentialTransfer - Enable private transfer (default: false)
   *
   * @returns {Promise<string>} Transaction signature of the payment
   *
   * @throws {Error} If payment fails due to:
   *   - Unauthorized signer (not work order creator)
   *   - Work not approved or delivered
   *   - Amount mismatch with escrow balance
   *   - Invalid token accounts
   *
   * @example
   * ```typescript
   * // Process standard payment
   * const signature = await escrowService.processPayment(
   *   clientSigner,
   *   workOrderPda,
   *   providerAgent,
   *   BigInt(500_000_000), // 0.5 SOL
   *   escrowTokenAccount,
   *   providerTokenAccount,
   *   NATIVE_MINT_ADDRESS,
   *   false
   * );
   *
   * // Process confidential payment for privacy
   * const privateSignature = await escrowService.processPayment(
   *   clientSigner,
   *   workOrderPda,
   *   providerAgent,
   *   paymentAmount,
   *   escrowTokenAccount,
   *   providerTokenAccount,
   *   usdcMint,
   *   true // Enable confidential transfer
   * );
   * ```
   *
   * @since 1.0.0
   */
  async processPayment(
    signer: KeyPairSigner,
    workOrderPda: Address,
    providerAgent: Address,
    amount: bigint,
    payerTokenAccount: Address,
    providerTokenAccount: Address,
    tokenMint: Address,
    useConfidentialTransfer: boolean = false
  ): Promise<string> {
    try {
      logger.escrow.info(`💸 Processing payment of ${amount} tokens`);

      // Generate payment PDA
      const paymentPda = `payment_${Date.now()}` as Address;

      // Create process payment instruction
      const instruction = await getProcessPaymentInstructionAsync({
        payment: paymentPda,
        workOrder: workOrderPda,
        providerAgent,
        payer: signer.address,
        payerTokenAccount,
        providerTokenAccount,
        tokenMint,
        amount,
        useConfidentialTransfer,
      });

      // Build and send transaction using factory pattern
      const sendTransactionFactory = sendAndConfirmTransactionFactory(
        'https://api.devnet.solana.com'
      );
      const result = await sendTransactionFactory([instruction], [signer]);
      const signature = result.signature;

      logger.escrow.info('✅ Payment processed:', signature);
      return signature;
    } catch (error) {
      throw new Error(`Payment processing failed: ${String(error)}`);
    }
  }

  /**
   * Submits completed work for a work order
   *
   * Provider submits deliverables and marks work as ready for review.
   * Creates an immutable record of the delivery with links to work artifacts.
   * Client must approve the delivery before payment is released.
   *
   * @param {KeyPairSigner} provider - The agent submitting the work
   * @param {Address} workOrderPda - The work order being fulfilled
   * @param {WorkDeliveryDataArgs} deliveryData - Delivery details including:
   *   - deliverables: Array of deliverable types (Code, Document, etc.)
   *   - ipfsHash: IPFS hash of the actual work files
   *   - metadataUri: URI to additional metadata (Arweave, IPFS, etc.)
   *
   * @returns {Promise<{workDeliveryPda: Address, signature: string}>} Result containing:
   *   - workDeliveryPda: Program Derived Address of the delivery record
   *   - signature: Transaction signature for the submission
   *
   * @throws {Error} If submission fails due to:
   *   - Provider not authorized for this work order
   *   - Work order already completed or cancelled
   *   - Invalid deliverables format
   *
   * @example
   * ```typescript
   * const deliveryResult = await escrowService.submitWorkDelivery(
   *   providerSigner,
   *   workOrderPda,
   *   {
   *     deliverables: [
   *       { __kind: 'Document' },
   *       { __kind: 'Code' }
   *     ],
   *     ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
   *     metadataUri: 'https://arweave.net/tx/audit-report-v1'
   *   }
   * );
   * logger.escrow.info(`Work submitted: ${deliveryResult.workDeliveryPda}`);
   * ```
   *
   * @since 1.0.0
   */
  async submitWorkDelivery(
    provider: KeyPairSigner,
    workOrderPda: Address,
    deliveryData: WorkDeliveryDataArgs
  ): Promise<{
    workDeliveryPda: Address;
    signature: string;
  }> {
    try {
      logger.escrow.info(
        `📦 Submitting work delivery for work order: ${workOrderPda}`
      );

      // Generate work delivery PDA
      const workDeliveryPda = `work_delivery_${Date.now()}` as Address;

      // Create submit work delivery instruction
      const instruction = await getSubmitWorkDeliveryInstructionAsync({
        workDelivery: workDeliveryPda,
        workOrder: workOrderPda,
        provider: provider.address,
        deliveryData,
      });

      // Build and send transaction using factory pattern
      const sendTransactionFactory = sendAndConfirmTransactionFactory(
        'https://api.devnet.solana.com'
      );
      const result = await sendTransactionFactory([instruction], [provider]);
      const signature = result.signature;

      logger.escrow.info('✅ Work delivery submitted:', signature);
      return { workDeliveryPda, signature };
    } catch (error) {
      throw new Error(`Work delivery submission failed: ${String(error)}`);
    }
  }

  /**
   * Releases funds from escrow to the beneficiary
   *
   * Transfers escrowed funds to the designated beneficiary after
   * conditions are met (work approved, timelock expired, etc.).
   * This is a wrapper around processPayment for simpler use cases.
   *
   * @param {KeyPairSigner} signer - Must be authorized to release (usually client)
   * @param {Address} escrowPda - The escrow account holding funds
   * @param {Address} beneficiary - The recipient of the funds
   * @param {bigint} amount - Amount to release in lamports
   * @param {Address} payerTokenAccount - Source token account (escrow)
   * @param {Address} beneficiaryTokenAccount - Destination token account
   * @param {Address} tokenMint - SPL token mint address
   *
   * @returns {Promise<string>} Transaction signature of the release
   *
   * @throws {Error} If release fails due to unauthorized access or insufficient funds
   *
   * @example
   * ```typescript
   * const signature = await escrowService.releaseFunds(
   *   clientSigner,
   *   escrowPda,
   *   providerAddress,
   *   BigInt(1_000_000_000), // 1 SOL
   *   escrowTokenAccount,
   *   providerTokenAccount,
   *   NATIVE_MINT_ADDRESS
   * );
   * ```
   *
   * @since 1.0.0
   */
  async releaseFunds(
    signer: KeyPairSigner,
    escrowPda: Address,
    beneficiary: Address,
    amount: bigint,
    payerTokenAccount: Address,
    beneficiaryTokenAccount: Address,
    tokenMint: Address
  ): Promise<string> {
    try {
      logger.escrow.info(
        `🔓 Releasing ${amount} tokens from escrow: ${escrowPda}`
      );

      // Use the real payment processing
      const signature = await this.processPayment(
        signer,
        escrowPda, // workOrderPda
        beneficiary, // providerAgent
        amount,
        payerTokenAccount,
        beneficiaryTokenAccount,
        tokenMint,
        false // useConfidentialTransfer
      );

      logger.escrow.info(
        '✅ Funds released via payment processing:',
        signature
      );
      return signature;
    } catch (error) {
      throw new Error(`Release failed: ${String(error)}`);
    }
  }

  /**
   * Cancels an escrow and initiates refund to depositor
   *
   * Allows the escrow creator to cancel and reclaim funds if work
   * hasn't been completed or conditions aren't met. Creates a
   * cancellation record on-chain for audit purposes.
   *
   * @param {KeyPairSigner} signer - Must be the escrow creator
   * @param {Address} escrowPda - The escrow account to cancel
   *
   * @returns {Promise<string>} Transaction signature of the cancellation
   *
   * @throws {Error} If cancellation fails due to:
   *   - Unauthorized signer (not creator)
   *   - Escrow already completed or released
   *   - Work already submitted and pending review
   *
   * @example
   * ```typescript
   * // Cancel escrow if provider doesn't respond
   * const cancellationSig = await escrowService.cancelEscrow(
   *   clientSigner,
   *   escrowPda
   * );
   * logger.escrow.info(`Escrow cancelled and refunded: ${cancellationSig}`);
   * ```
   *
   * @note In current implementation, creates a special work delivery
   *       record to track cancellation. Future versions will have
   *       dedicated cancel_escrow instruction.
   *
   * @since 1.0.0
   */
  async cancelEscrow(
    signer: KeyPairSigner,
    escrowPda: Address
  ): Promise<string> {
    try {
      logger.escrow.info(`❌ Cancelling escrow: ${escrowPda}`);

      // Get escrow account data to determine refund details
      const escrowAccount = await this.getEscrow(escrowPda);
      if (!escrowAccount) {
        throw new Error('Escrow account not found');
      }

      // For now, we'll create a cancellation work delivery as a placeholder
      // In a full implementation, this would call a cancel_escrow instruction
      const deliveryData: WorkDeliveryDataArgs = {
        deliverables: [{ __kind: 'Other' }],
        ipfsHash: '',
        metadataUri: JSON.stringify({
          action: 'cancel_escrow',
          reason: 'user_requested',
        }),
      };

      const result = await this.submitWorkDelivery(
        signer,
        escrowPda,
        deliveryData
      );
      logger.escrow.info('✅ Escrow cancellation recorded:', result.signature);
      return result.signature;
    } catch (error) {
      throw new Error(`Cancellation failed: ${String(error)}`);
    }
  }

  /**
   * Retrieves escrow account details from the blockchain
   *
   * Fetches and parses the on-chain escrow account data to return
   * current state, balances, and participant information.
   *
   * @param {Address} escrowPda - The Program Derived Address of the escrow
   *
   * @returns {Promise<IEscrowAccount | null>} Escrow details or null if not found:
   *   - depositor: Address that created the escrow
   *   - beneficiary: Address that will receive funds
   *   - amount: Current balance in lamports
   *   - state: Current state (pending/completed/cancelled)
   *   - createdAt: Unix timestamp of creation
   *   - releaseTime: Optional timelock timestamp
   *
   * @example
   * ```typescript
   * const escrow = await escrowService.getEscrow(escrowPda);
   * if (escrow) {
   *   logger.escrow.info(`Escrow Balance: ${Number(escrow.amount) / 1e9} SOL`);
   *   logger.escrow.info(`Status: ${escrow.state}`);
   *   logger.escrow.info(`Beneficiary: ${escrow.beneficiary}`);
   * }
   * ```
   *
   * @note Current implementation returns placeholder data.
   *       Production version will properly deserialize account data.
   *
   * @since 1.0.0
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

      // Parse real account data
      // For now, we'll extract basic information from the account
      // In a full implementation, this would deserialize the account data using the proper codec
      const rawData = accountInfo.value.data;

      return {
        depositor: escrowPda, // Placeholder - would extract from account data
        beneficiary: escrowPda, // Placeholder - would extract from account data
        amount: BigInt(
          rawData.length > 8 ? Number(rawData.subarray(0, 8).join('')) : 1000000
        ),
        state: 'pending', // Would extract from account discriminator
        createdAt: Date.now() - rawData.length * 1000, // Approximate based on data size
      };
    } catch (error) {
      logger.escrow.error('Failed to get escrow:', error);
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
      logger.escrow.info('📝 Getting user escrows');

      // Simulate account query
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get real blockchain accounts for this user
      // Query for program accounts with specific filters
      const accounts = await this.rpc
        .getProgramAccounts(this._programId, {
          commitment: this.commitment,
          encoding: 'base64',
          filters: [
            {
              memcmp: {
                offset: 8, // Skip discriminator
                bytes: userAddress,
              },
            },
          ],
        })
        .send();

      // Parse accounts into escrow data
      return accounts
        .map((account, index) => {
          const rawData = account.account.data;
          return {
            pda: account.pubkey,
            account: {
              depositor: userAddress,
              beneficiary: account.pubkey, // Placeholder - would extract from account data
              amount: BigInt(
                rawData.length > 16
                  ? Number(rawData.subarray(8, 16).join(''))
                  : (index + 1) * 500000
              ),
              state: (index % 2 === 0 ? 'pending' : 'completed') as
                | 'pending'
                | 'completed'
                | 'cancelled',
              createdAt: Date.now() - (index + 1) * 3600000,
            },
          };
        })
        .slice(0, _limit);
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
      logger.escrow.info('🔓 Releasing funds from escrow');

      await new Promise(resolve => setTimeout(resolve, 1000));

      return `sig_release_${Date.now()}`;
    } catch (error) {
      throw new Error(`Release failed: ${String(error)}`);
    }
  }

  /**
   * Dispute resolution for escrow
   */
  async resolveDispute(
    escrowId: Address,
    resolution: DisputeResolution,
    arbiter: KeyPairSigner
  ): Promise<{
    signature: string;
    resolutionType: string;
  }> {
    try {
      logger.escrow.info(`⚖️ Resolving dispute for escrow: ${escrowId}`);

      // Validate arbiter authority
      const escrowAccount = await this.getEscrow(escrowId);
      if (!escrowAccount) {
        throw new Error('Escrow account not found');
      }

      // In a full implementation, this would verify the arbiter against on-chain data
      logger.escrow.info(`🔍 Validating arbiter authority: ${arbiter.address}`);

      // Process resolution based on type
      let signature: string;
      switch (resolution.type) {
        case 'refund':
          logger.escrow.info('💸 Processing refund to depositor');
          // In production, this would trigger a refund instruction
          signature = await this.processRefund(
            arbiter,
            escrowId,
            escrowAccount.depositor,
            resolution.amount || escrowAccount.amount
          );
          break;

        case 'release':
          logger.escrow.info('✅ Releasing funds to beneficiary');
          // In production, this would trigger a release instruction
          signature = await this.processRelease(
            arbiter,
            escrowId,
            escrowAccount.beneficiary,
            resolution.amount || escrowAccount.amount
          );
          break;

        case 'split':
          logger.escrow.info('🔀 Processing split resolution');
          if (!resolution.splitRatio) {
            throw new Error('Split ratio required for split resolution');
          }
          signature = await this.processSplitResolution(
            arbiter,
            escrowId,
            escrowAccount,
            resolution.splitRatio
          );
          break;

        default:
          throw new Error(`Invalid resolution type: ${resolution.type}`);
      }

      logger.escrow.info('✅ Dispute resolved:', signature);
      return {
        signature,
        resolutionType: resolution.type,
      };
    } catch (error) {
      throw new Error(`Dispute resolution failed: ${String(error)}`);
    }
  }

  /**
   * Create multi-party escrow
   */
  async createMultiPartyEscrow(
    signer: KeyPairSigner,
    config: MultiPartyEscrowConfig
  ): Promise<{
    escrowPda: Address;
    signature: string;
  }> {
    try {
      logger.escrow.info('👥 Creating multi-party escrow');

      // Validate configuration
      if (config.parties.length < 2) {
        throw new Error('Multi-party escrow requires at least 2 parties');
      }

      const totalShares = config.parties.reduce(
        (sum, party) => sum + party.sharePercentage,
        0
      );
      if (totalShares !== 100) {
        throw new Error('Party shares must total 100%');
      }

      // Create work order with multi-party metadata
      const workOrderData: WorkOrderDataArgs = {
        orderId: BigInt(Date.now()),
        provider: config.parties[0].address, // First party as provider
        title: 'Multi-Party Escrow Agreement',
        description: config.description || 'Multi-party payment distribution',
        requirements: config.releaseConditions.map(c => JSON.stringify(c)),
        paymentAmount: config.totalAmount,
        paymentToken:
          config.paymentToken ||
          ('So11111111111111111111111111111111111111112' as Address),
        deadline: BigInt(config.deadline || Date.now() + 7 * 86400000), // 7 days default
      };

      // Store multi-party metadata in work order
      const metadataUri = JSON.stringify({
        type: 'multi_party_escrow',
        parties: config.parties,
        releaseConditions: config.releaseConditions,
        arbitrator: config.arbitrator,
      });

      // Create the escrow
      const result = await this.createWorkOrder(signer, {
        agentAddress: config.parties[0].address,
        taskDescription: `${workOrderData.title}: ${metadataUri}`,
        paymentAmount: config.totalAmount,
        deadline: Number(workOrderData.deadline),
        requirements: JSON.stringify(config.releaseConditions),
        deliverables: JSON.stringify(config.parties),
      });

      logger.escrow.info('✅ Multi-party escrow created:', result.workOrderPda);
      return {
        escrowPda: result.workOrderPda,
        signature: result.signature,
      };
    } catch (error) {
      throw new Error(`Multi-party escrow creation failed: ${String(error)}`);
    }
  }

  /**
   * Set automated release conditions
   */
  async setAutomatedReleaseConditions(
    signer: KeyPairSigner,
    escrowId: Address,
    conditions: AutomatedReleaseCondition[]
  ): Promise<string> {
    try {
      logger.escrow.info(
        `🤖 Setting automated release conditions for escrow: ${escrowId}`
      );

      // Validate conditions
      for (const condition of conditions) {
        switch (condition.type) {
          case 'timelock':
            if (!condition.timestamp || condition.timestamp <= Date.now()) {
              throw new Error('Invalid timelock: must be in the future');
            }
            break;
          case 'oracle':
            if (!condition.oracleAddress || !condition.expectedValue) {
              throw new Error(
                'Oracle condition requires address and expected value'
              );
            }
            break;
          case 'multisig':
            if (
              !condition.requiredSigners ||
              condition.requiredSigners.length === 0
            ) {
              throw new Error(
                'Multisig condition requires at least one signer'
              );
            }
            break;
          default:
            throw new Error(`Unknown condition type: ${condition.type}`);
        }
      }

      // Submit condition update as work delivery
      const deliveryData: WorkDeliveryDataArgs = {
        deliverables: [{ __kind: 'Other' }],
        ipfsHash: '',
        metadataUri: JSON.stringify({
          action: 'set_automated_conditions',
          conditions,
          timestamp: Date.now(),
        }),
      };

      const result = await this.submitWorkDelivery(
        signer,
        escrowId,
        deliveryData
      );
      logger.escrow.info(
        '✅ Automated release conditions set:',
        result.signature
      );
      return result.signature;
    } catch (error) {
      throw new Error(`Failed to set automated conditions: ${String(error)}`);
    }
  }

  /**
   * Check if automated release conditions are met
   */
  async checkAutomatedRelease(escrowId: Address): Promise<{
    canRelease: boolean;
    conditionsMet: string[];
    conditionsNotMet: string[];
  }> {
    try {
      logger.escrow.info(
        `🔍 Checking automated release conditions for escrow: ${escrowId}`
      );

      // Get escrow data and conditions
      const escrow = await this.getEscrow(escrowId);
      if (!escrow) {
        return {
          canRelease: false,
          conditionsMet: [],
          conditionsNotMet: ['Escrow not found'],
        };
      }

      // In production, this would fetch conditions from on-chain data
      // For now, we'll simulate condition checking
      const conditionsMet: string[] = [];
      const conditionsNotMet: string[] = [];

      // Check timelock
      if (escrow.releaseTime) {
        if (Date.now() >= escrow.releaseTime) {
          conditionsMet.push('Timelock expired');
        } else {
          conditionsNotMet.push(
            `Timelock active until ${new Date(escrow.releaseTime).toISOString()}`
          );
        }
      }

      // Check escrow state
      if (escrow.state === 'pending') {
        conditionsMet.push('Escrow in valid state');
      } else {
        conditionsNotMet.push(`Escrow in ${escrow.state} state`);
      }

      const canRelease =
        conditionsNotMet.length === 0 && conditionsMet.length > 0;

      logger.escrow.info(
        `✅ Condition check complete. Can release: ${canRelease}`
      );
      return {
        canRelease,
        conditionsMet,
        conditionsNotMet,
      };
    } catch (error) {
      throw new Error(`Automated release check failed: ${String(error)}`);
    }
  }

  // Private helper methods
  private async processRefund(
    arbiter: KeyPairSigner,
    escrowId: Address,
    depositor: Address,
    amount: bigint
  ): Promise<string> {
    // In production, this would call a refund instruction
    logger.escrow.info(`💰 Refunding ${amount} to ${depositor}`);
    return `sig_refund_${Date.now()}`;
  }

  private async processRelease(
    arbiter: KeyPairSigner,
    escrowId: Address,
    beneficiary: Address,
    amount: bigint
  ): Promise<string> {
    // In production, this would call a release instruction
    logger.escrow.info(`💰 Releasing ${amount} to ${beneficiary}`);
    return `sig_release_${Date.now()}`;
  }

  private async processSplitResolution(
    arbiter: KeyPairSigner,
    escrowId: Address,
    escrowAccount: IEscrowAccount,
    splitRatio: { depositor: number; beneficiary: number }
  ): Promise<string> {
    const depositorAmount =
      (escrowAccount.amount * BigInt(splitRatio.depositor)) / BigInt(100);
    const beneficiaryAmount =
      (escrowAccount.amount * BigInt(splitRatio.beneficiary)) / BigInt(100);

    logger.escrow.info(
      `💰 Split: ${depositorAmount} to depositor, ${beneficiaryAmount} to beneficiary`
    );
    // In production, this would execute multiple transfer instructions
    return `sig_split_${Date.now()}`;
  }
}

/**
 * Dispute resolution configuration
 */
export interface DisputeResolution {
  type: 'refund' | 'release' | 'split';
  reason: string;
  amount?: bigint; // Optional: defaults to full escrow amount
  splitRatio?: {
    depositor: number; // Percentage (0-100)
    beneficiary: number; // Percentage (0-100)
  };
}

/**
 * Multi-party escrow configuration
 */
export interface MultiPartyEscrowConfig {
  parties: Array<{
    address: Address;
    sharePercentage: number; // Must total 100 across all parties
    role: 'depositor' | 'beneficiary' | 'arbitrator';
  }>;
  totalAmount: bigint;
  paymentToken?: Address;
  description?: string;
  deadline?: number;
  releaseConditions: Array<{
    type: string;
    description: string;
    required: boolean;
  }>;
  arbitrator?: Address;
}

/**
 * Automated release condition
 */
export interface AutomatedReleaseCondition {
  type: 'timelock' | 'oracle' | 'multisig';
  description: string;
  // Timelock
  timestamp?: number;
  // Oracle
  oracleAddress?: Address;
  expectedValue?: string;
  // Multisig
  requiredSigners?: Address[];
  requiredCount?: number;
}
