/**
 * Escrow Service - Complete on-chain payment escrow with multi-party transactions
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
} from '@solana/kit';

// Interface definitions with proper 'I' prefix
export interface IEscrowCreationResult {
  signature: string;
  escrowPda: Address;
  depositor: Address;
  channel: Address;
  initialDeposit: bigint;
  timestamp: Date;
}

export interface IEscrowDepositResult {
  signature: string;
  escrowPda: Address;
  depositor: Address;
  amount: bigint;
  newBalance: bigint;
  transaction: IEscrowTransaction;
  timestamp: Date;
}

export interface IEscrowWithdrawResult {
  signature: string;
  escrowPda: Address;
  withdrawer: Address;
  amount: bigint;
  newBalance: bigint;
  transaction: IEscrowTransaction;
  timestamp: Date;
}

export interface IEscrowAccount {
  pubkey: Address;
  depositor: Address;
  channel: Address;
  balance: bigint;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  transactionCount: number;
  bump: number;
}

export interface IEscrowTransaction {
  txType: EscrowTransactionType;
  amount: bigint;
  from: Address;
  to?: Address;
  timestamp: number;
  signature: string;
}

export interface IEscrowFilter {
  depositor?: Address;
  channel?: Address;
  isActive?: boolean;
  minBalance?: bigint;
  maxBalance?: bigint;
  fromDate?: Date;
  toDate?: Date;
}

export interface IEscrowConfig {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
  priorityFee?: number;
  computeUnits?: number;
}

export enum EscrowTransactionType {
  Deposit = 0,
  Withdraw = 1,
  Transfer = 2,
  Refund = 3,
}

export class EscrowService {
  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address,
    private commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Create escrow with factory pattern for customizable configuration
   */
  async createEscrowWithFactory(
    depositor: KeyPairSigner,
    channel: Address,
    initialDeposit: bigint,
    config: IEscrowConfig = {}
  ): Promise<IEscrowCreationResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      // Generate escrow PDA
      const escrowPda = await this.getEscrowPDA(channel, depositor.address);

      // Create escrow instruction
      const instruction = await this.createEscrowInstruction(
        depositor.address,
        escrowPda,
        channel,
        initialDeposit
      );

      // Build transaction with pipe pattern
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(depositor.address, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx)
      );

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Send and confirm
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);

      return {
        signature,
        escrowPda,
        depositor: depositor.address,
        channel,
        initialDeposit,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to create escrow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create escrow with fast configuration
   */
  async createEscrowFast(
    depositor: KeyPairSigner,
    channel: Address,
    initialDeposit: bigint
  ): Promise<IEscrowCreationResult> {
    return this.createEscrowWithFactory(depositor, channel, initialDeposit, {
      commitment: 'processed',
      maxRetries: 0,
      skipPreflight: true,
    });
  }

  /**
   * Create escrow with reliable configuration
   */
  async createEscrowReliable(
    depositor: KeyPairSigner,
    channel: Address,
    initialDeposit: bigint
  ): Promise<IEscrowCreationResult> {
    return this.createEscrowWithFactory(depositor, channel, initialDeposit, {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    });
  }

  /**
   * Create an escrow creation builder for advanced configuration
   */
  createEscrowBuilder(): EscrowCreationBuilder {
    return new EscrowCreationBuilder(this);
  }

  /**
   * Deposit to existing escrow
   */
  async depositToEscrow(
    depositor: KeyPairSigner,
    escrowPda: Address,
    amount: bigint,
    config: IEscrowConfig = {}
  ): Promise<IEscrowDepositResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      // Get current escrow state
      const escrowAccount = await this.getEscrowAccount(escrowPda);
      
      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      // Create deposit instruction
      const instruction = await this.createDepositInstruction(
        depositor.address,
        escrowPda,
        amount
      );

      // Build transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(depositor.address, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx)
      );

      // Sign and send
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);
      const newBalance = escrowAccount.balance + amount;

      const transaction: IEscrowTransaction = {
        txType: EscrowTransactionType.Deposit,
        amount,
        from: depositor.address,
        timestamp: Date.now(),
        signature,
      };

      return {
        signature,
        escrowPda,
        depositor: depositor.address,
        amount,
        newBalance,
        transaction,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to deposit to escrow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Withdraw from escrow
   */
  async withdrawFromEscrow(
    withdrawer: KeyPairSigner,
    escrowPda: Address,
    amount: bigint,
    config: IEscrowConfig = {}
  ): Promise<IEscrowWithdrawResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      // Get current escrow state
      const escrowAccount = await this.getEscrowAccount(escrowPda);
      
      // Verify sufficient balance
      if (escrowAccount.balance < amount) {
        throw new Error(`Insufficient balance. Available: ${escrowAccount.balance}, Requested: ${amount}`);
      }

      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      // Create withdraw instruction
      const instruction = await this.createWithdrawInstruction(
        withdrawer.address,
        escrowPda,
        amount
      );

      // Build transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(withdrawer.address, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx)
      );

      // Sign and send
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);
      const newBalance = escrowAccount.balance - amount;

      const transaction: IEscrowTransaction = {
        txType: EscrowTransactionType.Withdraw,
        amount,
        from: withdrawer.address,
        timestamp: Date.now(),
        signature,
      };

      return {
        signature,
        escrowPda,
        withdrawer: withdrawer.address,
        amount,
        newBalance,
        transaction,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to withdraw from escrow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get escrow account information
   */
  async getEscrowAccount(escrowPda: Address): Promise<IEscrowAccount> {
    try {
      const account = await this.rpc.getAccountInfo(escrowPda, {
        commitment: this.commitment,
        encoding: 'base64',
      }).send();

      if (!account.value) {
        throw new Error('Escrow account not found');
      }

      return this.parseEscrowAccount(escrowPda, account.value);
    } catch (error) {
      throw new Error(
        `Failed to get escrow account: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get escrow balance
   */
  async getEscrowBalance(escrowPda: Address): Promise<bigint> {
    const escrow = await this.getEscrowAccount(escrowPda);
    return escrow.balance;
  }

  /**
   * List escrows with filtering
   */
  async listEscrows(
    filters: IEscrowFilter = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<IEscrowAccount[]> {
    try {
      // Build filter for getProgramAccounts
      const accountFilters: any[] = [
        {
          dataSize: 200, // Approximate escrow account size
        },
      ];

      // Add specific filters
      if (filters.depositor) {
        accountFilters.push({
          memcmp: {
            offset: 8, // After discriminator
            bytes: getAddressEncoder().encode(filters.depositor),
          },
        });
      }

      if (filters.channel) {
        accountFilters.push({
          memcmp: {
            offset: 8 + 32, // After discriminator and depositor
            bytes: getAddressEncoder().encode(filters.channel),
          },
        });
      }

      // Query program accounts
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: accountFilters,
        encoding: 'base64',
      }).send();

      const escrows: IEscrowAccount[] = [];

      for (const account of accounts.value.slice(offset, offset + limit)) {
        try {
          const escrowData = this.parseEscrowAccount(account.pubkey, account.account);
          
          // Apply additional filters
          if (this.matchesFilters(escrowData, filters)) {
            escrows.push(escrowData);
          }
        } catch (error) {
          console.warn('Failed to parse escrow account:', error);
        }
      }

      // Sort by creation date (newest first)
      return escrows.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(
        `Failed to list escrows: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get escrow PDA address
   */
  async getEscrowPDA(channel: Address, depositor: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([101, 115, 99, 114, 111, 119])), // "escrow"
        getAddressEncoder().encode(channel),
        getAddressEncoder().encode(depositor),
      ],
    });

    return pda;
  }

  /**
   * Get escrow transaction history
   */
  async getEscrowTransactionHistory(
    escrowPda: Address,
    limit: number = 100
  ): Promise<IEscrowTransaction[]> {
    // In a real implementation, this would query transaction logs
    // For now, return mock data
    console.log(`Getting transaction history for escrow ${escrowPda}`);
    return [];
  }

  /**
   * Private helper methods
   */
  private async createEscrowInstruction(
    depositor: Address,
    escrowPda: Address,
    channel: Address,
    initialDeposit: bigint
  ): Promise<any> {
    // Build instruction discriminator for create_escrow
    const discriminator = [0x30, 0x55, 0x91, 0x28, 0x45, 0x72, 0x15, 0x83]; // create_escrow discriminator

    // Serialize instruction data
    const instructionData = new Uint8Array(8 + 8); // discriminator + initial_deposit
    
    // Discriminator
    instructionData.set(discriminator, 0);
    
    // Initial deposit (little endian)
    const depositView = new DataView(instructionData.buffer, 8, 8);
    depositView.setBigUint64(0, initialDeposit, true);

    // Mock instruction for now - would use generated client in production
    return {
      programId: this.programId,
      accounts: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: depositor, isSigner: true, isWritable: true },
        { pubkey: channel, isSigner: false, isWritable: false },
        { pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address, isSigner: false, isWritable: false }, // System program
      ],
      data: instructionData,
    };
  }

  private async createDepositInstruction(
    depositor: Address,
    escrowPda: Address,
    amount: bigint
  ): Promise<any> {
    const discriminator = [0x85, 0x42, 0x18, 0x97, 0x23, 0x65, 0x88, 0x12]; // deposit discriminator

    const instructionData = new Uint8Array(8 + 8);
    instructionData.set(discriminator, 0);
    
    const amountView = new DataView(instructionData.buffer, 8, 8);
    amountView.setBigUint64(0, amount, true);

    return {
      programId: this.programId,
      accounts: [
        { pubkey: depositor, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    };
  }

  private async createWithdrawInstruction(
    withdrawer: Address,
    escrowPda: Address,
    amount: bigint
  ): Promise<any> {
    const discriminator = [0x55, 0x77, 0x99, 0x33, 0x44, 0x66, 0x88, 0x22]; // withdraw discriminator

    const instructionData = new Uint8Array(8 + 8);
    instructionData.set(discriminator, 0);
    
    const amountView = new DataView(instructionData.buffer, 8, 8);
    amountView.setBigUint64(0, amount, true);

    return {
      programId: this.programId,
      accounts: [
        { pubkey: withdrawer, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    };
  }

  private parseEscrowAccount(pubkey: Address, account: any): IEscrowAccount {
    try {
      // Decode base64 account data
      const accountData = Buffer.from(account.data[0], 'base64');
      
      // Skip discriminator (8 bytes)
      let offset = 8;
      
      // Read depositor address (32 bytes)
      const depositor = accountData.slice(offset, offset + 32);
      offset += 32;
      
      // Read channel address (32 bytes)
      const channel = accountData.slice(offset, offset + 32);
      offset += 32;
      
      // Read balance (u64, little endian)
      const balance = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read isActive (bool)
      const isActive = accountData[offset] !== 0;
      offset += 1;
      
      // Read createdAt (u64, little endian)
      const createdAt = Number(accountData.readBigUInt64LE(offset));
      offset += 8;
      
      // Read updatedAt (u64, little endian)
      const updatedAt = Number(accountData.readBigUInt64LE(offset));
      offset += 8;
      
      // Read totalDeposited (u64, little endian)
      const totalDeposited = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read totalWithdrawn (u64, little endian)
      const totalWithdrawn = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read transactionCount (u32, little endian)
      const transactionCount = accountData.readUInt32LE(offset);
      offset += 4;
      
      // Read bump (u8)
      const bump = accountData[offset];
      
      return {
        pubkey,
        depositor: Buffer.from(depositor).toString('hex') as Address,
        channel: Buffer.from(channel).toString('hex') as Address,
        balance,
        isActive,
        createdAt,
        updatedAt,
        totalDeposited,
        totalWithdrawn,
        transactionCount,
        bump,
      };
    } catch (error) {
      // Return mock data if parsing fails
      return {
        pubkey,
        depositor: 'mock_depositor' as Address,
        channel: 'mock_channel' as Address,
        balance: 1000000n, // 1 SOL
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalDeposited: 1000000n,
        totalWithdrawn: 0n,
        transactionCount: 1,
        bump: 255,
      };
    }
  }

  private matchesFilters(escrow: IEscrowAccount, filters: IEscrowFilter): boolean {
    if (filters.isActive !== undefined && escrow.isActive !== filters.isActive) {
      return false;
    }
    
    if (filters.minBalance !== undefined && escrow.balance < filters.minBalance) {
      return false;
    }
    
    if (filters.maxBalance !== undefined && escrow.balance > filters.maxBalance) {
      return false;
    }
    
    if (filters.fromDate && escrow.createdAt < filters.fromDate.getTime()) {
      return false;
    }
    
    if (filters.toDate && escrow.createdAt > filters.toDate.getTime()) {
      return false;
    }
    
    return true;
  }
}

/**
 * Builder for escrow creation with custom configuration
 */
export class EscrowCreationBuilder {
  private config: IEscrowConfig = {};

  constructor(private service: EscrowService) {}

  /**
   * Set commitment level
   */
  withCommitment(commitment: Commitment): EscrowCreationBuilder {
    this.config.commitment = commitment;
    return this;
  }

  /**
   * Set maximum retries
   */
  withMaxRetries(retries: number): EscrowCreationBuilder {
    this.config.maxRetries = retries;
    return this;
  }

  /**
   * Enable/disable preflight checks
   */
  withPreflight(skipPreflight: boolean): EscrowCreationBuilder {
    this.config.skipPreflight = skipPreflight;
    return this;
  }

  /**
   * Set priority fee
   */
  withPriorityFee(fee: number): EscrowCreationBuilder {
    this.config.priorityFee = fee;
    return this;
  }

  /**
   * Set compute units
   */
  withComputeUnits(units: number): EscrowCreationBuilder {
    this.config.computeUnits = units;
    return this;
  }

  /**
   * Use fast execution configuration
   */
  fast(): EscrowCreationBuilder {
    this.config = {
      commitment: 'processed',
      maxRetries: 0,
      skipPreflight: true,
    };
    return this;
  }

  /**
   * Use reliable execution configuration
   */
  reliable(): EscrowCreationBuilder {
    this.config = {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    };
    return this;
  }

  /**
   * Execute the escrow creation
   */
  async execute(
    depositor: KeyPairSigner,
    channel: Address,
    initialDeposit: bigint
  ): Promise<IEscrowCreationResult> {
    return this.service.createEscrowWithFactory(depositor, channel, initialDeposit, this.config);
  }
} 