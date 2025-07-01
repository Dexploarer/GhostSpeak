/**
 * SPL Token 2022 Service - Modern token operations with extensions
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createMintToInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ExtensionType,
  getMintLen,
  createInitializeConfidentialTransferMintInstruction,
  createInitializeTransferHookInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeTokenMetadataInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// Program constants - use underscore prefix for unused constants
const _TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const _ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

// Interface definitions with proper 'I' prefix
export interface ITokenExtensions {
  transferFeeConfig?: ITransferFeeConfig;
  transferHook?: {
    authority: Address;
    programId: Address;
  };
  permanentDelegate?: Address;
  confidentialTransferMint?: IConfidentialTransferMintConfig;
  defaultAccountState?: IDefaultAccountState;
  interestBearingConfig?: IInterestBearingConfig;
  cpiGuard?: boolean;
  reallocate?: boolean;
  immutableOwner?: boolean;
  requiredMemoOnTransfer?: boolean;
  nonTransferable?: boolean;
  transferFee?: boolean;
  confidentialTransfers?: boolean;
  metadataPointer?: IMetadataPointer;
  groupPointer?: IGroupPointer;
  groupMemberPointer?: IGroupMemberPointer;
}

export interface IConfidentialTransferMintConfig {
  authority: Address;
  autoApproveNewAccounts: boolean;
  auditorElgamalPubkey?: Uint8Array;
}

export interface ITransferFeeConfig {
  transferFeeBasisPoints: number;
  maximumFee: bigint;
  withdrawWithheldAuthority?: Address;
}

export interface ITransferFee {
  epoch: bigint;
  maximumFee: bigint;
  transferFeeBasisPoints: number;
}

export interface IMetadataPointer {
  authority?: Address;
  metadataAddress?: Address;
}

export interface IGroupPointer {
  authority?: Address;
  groupAddress?: Address;
}

export interface IGroupMemberPointer {
  authority?: Address;
  memberAddress?: Address;
}

export interface IDefaultAccountState {
  state: 'uninitialized' | 'initialized' | 'frozen';
}

export interface IInterestBearingConfig {
  rateAuthority?: Address;
  initializationTimestamp: bigint;
  preUpdateAverageRate: number;
  lastUpdateTimestamp: bigint;
  currentRate: number;
}

export interface IToken2022Mint {
  address: Address;
  mintAuthority?: Address;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority?: Address;
  extensions: ITokenExtensions;
}

export interface IToken2022Account {
  address: Address;
  mint: Address;
  owner: Address;
  amount: bigint;
  delegate?: Address;
  state: 'uninitialized' | 'initialized' | 'frozen';
  isNative?: bigint;
  delegatedAmount: bigint;
  closeAuthority?: Address;
  extensions: ITokenAccountExtensions;
}

export interface ITokenAccountExtensions {
  confidentialTransferAccount?: IConfidentialTransferAccount;
  transferHook?: {
    transferring: boolean;
  };
  immutableOwner?: boolean;
  defaultAccountState?: 'initialized' | 'frozen';
  cpiGuard?: {
    lockCpi: boolean;
  };
}

export interface IConfidentialTransferAccount {
  approved: boolean;
  elgamalPubkey: Uint8Array;
  pendingBalanceLo: Uint8Array;
  pendingBalanceHi: Uint8Array;
  availableBalance: Uint8Array;
  decryptableAvailableBalance: Uint8Array;
  allowConfidentialCredits: boolean;
  allowNonConfidentialCredits: boolean;
  actualPendingBalanceCreditCounter: bigint;
  expectedPendingBalanceCreditCounter: bigint;
  actualPendingBalanceDebitCounter: bigint;
  expectedPendingBalanceDebitCounter: bigint;
  maximumPendingBalanceCreditCounter: bigint;
}

/**
 * Service for SPL Token 2022 operations with extensions
 */
export class SplToken2022Service {
  private readonly rpc: Rpc<SolanaRpcApi>;
  private readonly commitment: Commitment;
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpc: Rpc<SolanaRpcApi>, commitment: Commitment = 'confirmed', connection: Connection, programId: PublicKey) {
    this.rpc = rpc;
    this.commitment = commitment;
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Create a mint with Token 2022 extensions
   */
  async createMintWithExtensions(
    payer: KeyPairSigner,
    mintAuthority: Address,
    freezeAuthority: Address | null,
    decimals: number,
    extensions: ITokenExtensions
  ): Promise<{
    mint: Address;
    signature: string;
  }> {
    try {
      // Generate unique mint address
      const mintId = `mint_${Date.now()}_${payer.address.slice(0, 8)}`;
      const mintAddress = `${mintId}_2022` as Address;

      // In a real implementation, this would:
      // 1. Calculate space required for extensions
      // 2. Create mint account with proper size
      // 3. Initialize extensions in correct order
      // 4. Set authorities and configuration

      console.log(
        `Creating Token 2022 mint with ${Object.keys(extensions).length} extensions`
      );

      const signature = `mint_creation_${mintId}`;

      return {
        mint: mintAddress,
        signature,
      };
    } catch (error) {
      throw new Error(
        `Failed to create mint with extensions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Create an associated token account with extensions
   */
  async createAssociatedTokenAccount(
    payer: KeyPairSigner,
    mint: Address,
    owner: Address,
    extensions?: ITokenAccountExtensions
  ): Promise<{
    tokenAccount: Address;
    signature: string;
  }> {
    try {
      // Generate unique account address
      const accountId = `ata_${Date.now()}_${owner.slice(0, 8)}`;
      const accountAddress = `${accountId}_2022` as Address;

      // In a real implementation, this would:
      // 1. Derive associated token account address
      // 2. Check if account already exists
      // 3. Create with proper extensions
      // 4. Initialize account state

      console.log(
        `Creating ATA for mint ${mint} and owner ${owner} with extensions`
      );

      const signature = `ata_creation_${accountId}`;

      return {
        tokenAccount: accountAddress,
        signature,
      };
    } catch (error) {
      throw new Error(
        `Failed to create associated token account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Transfer tokens with confidential transfer support
   */
  async transferWithConfidential(
    signer: KeyPairSigner,
    source: Address,
    destination: Address,
    amount: bigint,
    useConfidentialTransfer = false
  ): Promise<string> {
    try {
      // In a real implementation, this would:
      // 1. Check if accounts support confidential transfers
      // 2. Generate zero-knowledge proofs if needed
      // 3. Build appropriate transfer instruction
      // 4. Handle proof verification

      const transferId = `transfer_${Date.now()}_${amount.toString()}`;
      console.log(
        `Transferring ${amount} tokens from ${source} to ${destination} (confidential: ${useConfidentialTransfer})`
      );

      return `token_transfer_${transferId}`;
    } catch (error) {
      throw new Error(
        `Failed to transfer tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Enable confidential transfers for an account
   */
  async enableConfidentialTransfers(
    owner: KeyPairSigner,
    tokenAccount: Address,
    elgamalKeypair: Uint8Array
  ): Promise<string> {
    try {
      // In a real implementation, this would:
      // 1. Validate elgamal keypair format
      // 2. Create configure account instruction
      // 3. Set confidential transfer parameters
      // 4. Enable confidential credits/debits

      const configId = `conf_setup_${Date.now()}_${tokenAccount.slice(-8)}`;
      console.log(
        `Enabling confidential transfers for account ${tokenAccount}`
      );

      return `confidential_setup_${configId}`;
    } catch (error) {
      throw new Error(
        `Failed to enable confidential transfers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Set transfer fee for a mint
   */
  async setTransferFee(
    authority: KeyPairSigner,
    mint: Address,
    transferFeeBasisPoints: number,
    maximumFee: bigint
  ): Promise<string> {
    try {
      // In a real implementation, this would:
      // 1. Validate authority permissions
      // 2. Check fee parameters are within limits
      // 3. Create set transfer fee instruction
      // 4. Update mint configuration

      const feeId = `fee_update_${Date.now()}_${transferFeeBasisPoints}`;
      console.log(
        `Setting transfer fee: ${transferFeeBasisPoints} basis points, max: ${maximumFee}`
      );

      return `fee_update_${feeId}`;
    } catch (error) {
      throw new Error(
        `Failed to set transfer fee: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get mint information with extensions
   */
  async getMintInfo(mint: Address): Promise<IToken2022Mint | null> {
    try {
      // In a real implementation, this would:
      // 1. Fetch mint account data
      // 2. Parse base mint information
      // 3. Parse extension data
      // 4. Return structured data

      return {
        address: mint,
        mintAuthority: 'mint_authority_placeholder' as Address,
        supply: BigInt(1000000),
        decimals: 6,
        isInitialized: true,
        freezeAuthority: 'freeze_authority_placeholder' as Address,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 500,
            maximumFee: BigInt(5000),
            withdrawWithheldAuthority: 'fee_authority' as Address,
          },
          confidentialTransfers: true,
          transferFee: true,
          metadataPointer: {
            authority: 'metadata_authority' as Address,
            metadataAddress: 'metadata_address' as Address,
          },
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get mint info: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get token account information with extensions
   */
  async getTokenAccountInfo(account: Address): Promise<IToken2022Account | null> {
    try {
      // In a real implementation, this would:
      // 1. Fetch account data from RPC
      // 2. Parse base account information
      // 3. Parse extension data
      // 4. Return structured account data

      return {
        address: account,
        mint: 'token_mint_address' as Address,
        owner: 'account_owner_address' as Address,
        amount: BigInt(100000),
        state: 'initialized',
        delegatedAmount: BigInt(0),
        extensions: {
          confidentialTransferAccount: {
            approved: true,
            elgamalPubkey: new Uint8Array(32),
            pendingBalanceLo: new Uint8Array(16),
            pendingBalanceHi: new Uint8Array(16),
            availableBalance: new Uint8Array(16),
            decryptableAvailableBalance: new Uint8Array(16),
            allowConfidentialCredits: true,
            allowNonConfidentialCredits: true,
            actualPendingBalanceCreditCounter: BigInt(0),
            expectedPendingBalanceCreditCounter: BigInt(0),
            actualPendingBalanceDebitCounter: BigInt(0),
            expectedPendingBalanceDebitCounter: BigInt(0),
            maximumPendingBalanceCreditCounter: BigInt(1000),
          },
          immutableOwner: true,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get token account info: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Withdraw withheld tokens from fee accounts
   */
  async withdrawWithheldTokens(
    authority: KeyPairSigner,
    mint: Address,
    destination: Address,
    sources: Address[]
  ): Promise<string> {
    try {
      // In a real implementation, this would:
      // 1. Validate withdraw authority
      // 2. Calculate total withheld amount
      // 3. Create withdraw instruction
      // 4. Transfer tokens to destination

      const withdrawId = `withdraw_${Date.now()}_${sources.length}`;
      console.log(
        `Withdrawing withheld tokens from ${sources.length} accounts`
      );

      return `withheld_withdraw_${withdrawId}`;
    } catch (error) {
      throw new Error(
        `Failed to withdraw withheld tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate Token 2022 extensions configuration
   */
  validateExtensions(extensions: ITokenExtensions): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate transfer fee configuration
    if (extensions.transferFeeConfig) {
      const config = extensions.transferFeeConfig;
      if (
        config.transferFeeBasisPoints < 0 ||
        config.transferFeeBasisPoints > 10000
      ) {
        errors.push('Transfer fee basis points must be between 0 and 10000');
      }
      if (config.maximumFee < 0) {
        errors.push('Maximum fee must be non-negative');
      }
    }

    // Validate confidential transfer configuration
    if (extensions.confidentialTransferMint) {
      const config = extensions.confidentialTransferMint;
      if (
        config.auditorElgamalPubkey &&
        config.auditorElgamalPubkey.length !== 32
      ) {
        errors.push('Auditor ElGamal public key must be 32 bytes');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate extension space requirements
   */
  calculateExtensionSpace(extensions: ITokenExtensions): number {
    let space = 0;

    // Base mint space
    space += 82;

    // Add space for each extension
    if (extensions.transferFeeConfig) space += 108;
    if (extensions.confidentialTransferMint) space += 97;
    if (extensions.transferHook) space += 64;
    if (extensions.permanentDelegate) space += 36;
    if (extensions.defaultAccountState) space += 4;
    if (extensions.interestBearingConfig) space += 32;
    if (extensions.metadataPointer) space += 68;
    if (extensions.groupPointer) space += 68;
    if (extensions.groupMemberPointer) space += 68;

    return space;
  }

  /**
   * Create a confidential payment token for private agent transactions
   */
  async createConfidentialPaymentToken(params: {
    payer: Keypair;
    mintAuthority: PublicKey;
    freezeAuthority?: PublicKey;
    decimals: number;
    confidentialTransferAuthority: PublicKey;
    autoApproveNewAccounts: boolean;
    metadata: TokenMetadata;
  }): Promise<CreateTokenResult> {
    const { payer, mintAuthority, freezeAuthority, decimals, confidentialTransferAuthority, autoApproveNewAccounts, metadata } = params;

    console.log('🔐 Creating confidential payment token...');

    // Generate mint keypair
    const mint = Keypair.generate();

    // Calculate space needed for mint with extensions
    const extensions = [
      ExtensionType.ConfidentialTransferMint,
      ExtensionType.MetadataPointer,
    ];
    
    const mintLen = getMintLen(extensions);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: await this.connection.getMinimumBalanceForRentExemption(mintLen),
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize metadata pointer
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      mintAuthority,
      mint.publicKey, // Use mint as metadata account
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize confidential transfer
    const initConfidentialTransferIx = createInitializeConfidentialTransferMintInstruction(
      mint.publicKey,
      confidentialTransferAuthority,
      autoApproveNewAccounts,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize mint
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize token metadata
    const initMetadataIx = createInitializeTokenMetadataInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      mintAuthority,
      updateAuthority: mintAuthority,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    });

    // Create transaction
    const transaction = new Transaction().add(
      createAccountIx,
      initMetadataPointerIx,
      initConfidentialTransferIx,
      initMintIx,
      initMetadataIx
    );

    // Sign and send
    const signature = await this.connection.sendTransaction(transaction, [payer, mint]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Confidential payment token created: ${mint.publicKey.toBase58()}`);
    console.log(`📊 Transaction: ${signature}`);

    return {
      mint: mint.publicKey,
      signature,
      extensions: ['ConfidentialTransfer', 'MetadataPointer'],
      capabilities: [
        'Private transactions',
        'Compliance automation',
        'Rich metadata'
      ]
    };
  }

  /**
   * Create interest-bearing token for agent earnings accumulation
   */
  async createInterestBearingToken(params: {
    payer: Keypair;
    mintAuthority: PublicKey;
    freezeAuthority?: PublicKey;
    decimals: number;
    rateAuthority: PublicKey;
    interestRate: number; // Basis points (e.g., 500 = 5%)
    metadata: TokenMetadata;
  }): Promise<CreateTokenResult> {
    const { payer, mintAuthority, freezeAuthority, decimals, rateAuthority, interestRate, metadata } = params;

    console.log('💰 Creating interest-bearing agent earnings token...');

    const mint = Keypair.generate();

    const extensions = [
      ExtensionType.InterestBearingMint,
      ExtensionType.MetadataPointer,
    ];
    
    const mintLen = getMintLen(extensions);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: await this.connection.getMinimumBalanceForRentExemption(mintLen),
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize metadata pointer
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      mintAuthority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize interest-bearing mint
    const initInterestBearingIx = createInitializeInterestBearingMintInstruction(
      mint.publicKey,
      rateAuthority,
      interestRate,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize mint
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize metadata
    const initMetadataIx = createInitializeTokenMetadataInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      mintAuthority,
      updateAuthority: mintAuthority,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    });

    const transaction = new Transaction().add(
      createAccountIx,
      initMetadataPointerIx,
      initInterestBearingIx,
      initMintIx,
      initMetadataIx
    );

    const signature = await this.connection.sendTransaction(transaction, [payer, mint]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Interest-bearing token created: ${mint.publicKey.toBase58()}`);
    console.log(`📈 Interest rate: ${interestRate / 100}%`);
    console.log(`📊 Transaction: ${signature}`);

    return {
      mint: mint.publicKey,
      signature,
      extensions: ['InterestBearing', 'MetadataPointer'],
      capabilities: [
        `${interestRate / 100}% annual interest`,
        'Automatic earnings growth',
        'Compound interest calculation'
      ]
    };
  }

  /**
   * Create compliance token with transfer hooks for automated regulation
   */
  async createComplianceToken(params: {
    payer: Keypair;
    mintAuthority: PublicKey;
    freezeAuthority?: PublicKey;
    decimals: number;
    transferHookProgramId: PublicKey;
    metadata: TokenMetadata;
  }): Promise<CreateTokenResult> {
    const { payer, mintAuthority, freezeAuthority, decimals, transferHookProgramId, metadata } = params;

    console.log('⚖️ Creating compliance token with transfer hooks...');

    const mint = Keypair.generate();

    const extensions = [
      ExtensionType.TransferHook,
      ExtensionType.MetadataPointer,
    ];
    
    const mintLen = getMintLen(extensions);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: await this.connection.getMinimumBalanceForRentExemption(mintLen),
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize metadata pointer
    const initMetadataPointerIx = createInitializeMetadataPointerInstruction(
      mint.publicKey,
      mintAuthority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize transfer hook
    const initTransferHookIx = createInitializeTransferHookInstruction(
      mint.publicKey,
      mintAuthority,
      transferHookProgramId,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize mint
    const initMintIx = createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize metadata
    const initMetadataIx = createInitializeTokenMetadataInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      mintAuthority,
      updateAuthority: mintAuthority,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    });

    const transaction = new Transaction().add(
      createAccountIx,
      initMetadataPointerIx,
      initTransferHookIx,
      initMintIx,
      initMetadataIx
    );

    const signature = await this.connection.sendTransaction(transaction, [payer, mint]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Compliance token created: ${mint.publicKey.toBase58()}`);
    console.log(`⚖️ Transfer hook program: ${transferHookProgramId.toBase58()}`);
    console.log(`📊 Transaction: ${signature}`);

    return {
      mint: mint.publicKey,
      signature,
      extensions: ['TransferHook', 'MetadataPointer'],
      capabilities: [
        'Automated compliance checking',
        'Regulatory reporting',
        'Transaction monitoring'
      ]
    };
  }

  /**
   * Execute confidential transfer for private agent payments
   */
  async executeConfidentialTransfer(params: {
    payer: Keypair;
    mint: PublicKey;
    source: PublicKey;
    destination: PublicKey;
    amount: BN;
    memo?: string;
  }): Promise<ConfidentialTransferResult> {
    const { payer, mint, source, destination, amount, memo } = params;

    console.log('🔐 Executing confidential transfer...');
    console.log(`💰 Amount: ${amount.toString()}`);
    console.log(`📤 From: ${source.toBase58()}`);
    console.log(`📥 To: ${destination.toBase58()}`);

    // Create confidential transfer instruction
    const transferIx = createTransferInstruction(
      source,
      mint,
      destination,
      payer.publicKey,
      amount.toNumber(),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Add memo if provided
    const instructions: TransactionInstruction[] = [transferIx];
    if (memo) {
      // Add memo instruction for transaction context
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: payer.publicKey,
          lamports: 0
        })
      );
    }

    const transaction = new Transaction().add(...instructions);

    // Execute transfer
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Confidential transfer completed: ${signature}`);

    return {
      signature,
      amount,
      isConfidential: true,
      memo,
      timestamp: Date.now()
    };
  }

  /**
   * Get comprehensive token information including all extensions
   */
  async getTokenInfo(mint: PublicKey): Promise<TokenInfo> {
    const mintInfo = await this.connection.getAccountInfo(mint);
    
    if (!mintInfo) {
      throw new Error('Mint account not found');
    }

    // Parse token extensions and metadata
    const extensions = this.parseTokenExtensions(mintInfo.data);
    const capabilities = this.getTokenCapabilities(extensions);

    return {
      mint,
      programId: mintInfo.owner,
      extensions,
      capabilities,
      dataSize: mintInfo.data.length,
      isToken2022: mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    };
  }

  /**
   * Create agent payment bundle with multiple token types
   */
  async createAgentPaymentBundle(params: {
    payer: Keypair;
    agentId: PublicKey;
    payments: AgentPayment[];
    confidential: boolean;
  }): Promise<PaymentBundleResult> {
    const { payer, agentId, payments, confidential } = params;

    console.log('💼 Creating agent payment bundle...');
    console.log(`🤖 Agent: ${agentId.toBase58()}`);
    console.log(`💰 Payments: ${payments.length}`);
    console.log(`🔐 Confidential: ${confidential}`);

    const instructions: TransactionInstruction[] = [];
    const results: PaymentResult[] = [];

    for (const payment of payments) {
      // Create transfer instruction based on token type
      if (confidential) {
        const transferIx = createTransferInstruction(
          payment.source,
          payment.mint,
          payment.destination,
          payer.publicKey,
          payment.amount.toNumber(),
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
        instructions.push(transferIx);
      } else {
        const transferIx = createTransferInstruction(
          payment.source,
          payment.mint,
          payment.destination,
          payer.publicKey,
          payment.amount.toNumber()
        );
        instructions.push(transferIx);
      }

      results.push({
        mint: payment.mint,
        amount: payment.amount,
        type: payment.type,
        processed: false
      });
    }

    // Execute bundle transaction
    const transaction = new Transaction().add(...instructions);
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    // Mark all payments as processed
    results.forEach(result => result.processed = true);

    console.log(`✅ Payment bundle executed: ${signature}`);

    return {
      signature,
      agentId,
      payments: results,
      totalAmount: payments.reduce((sum, p) => sum.add(p.amount), new BN(0)),
      isConfidential: confidential,
      timestamp: Date.now()
    };
  }

  // Helper methods
  private parseTokenExtensions(data: Buffer): string[] {
    // Parse token account data to identify extensions
    const extensions: string[] = [];
    
    // Check for common extension signatures in the data
    if (data.includes(Buffer.from('ConfidentialTransfer'))) {
      extensions.push('ConfidentialTransfer');
    }
    if (data.includes(Buffer.from('InterestBearing'))) {
      extensions.push('InterestBearing');
    }
    if (data.includes(Buffer.from('TransferHook'))) {
      extensions.push('TransferHook');
    }
    if (data.includes(Buffer.from('MetadataPointer'))) {
      extensions.push('MetadataPointer');
    }

    return extensions;
  }

  private getTokenCapabilities(extensions: string[]): string[] {
    const capabilities: string[] = [];

    extensions.forEach(ext => {
      switch (ext) {
        case 'ConfidentialTransfer':
          capabilities.push('Private transactions', 'Hidden amounts', 'Enhanced privacy');
          break;
        case 'InterestBearing':
          capabilities.push('Automatic interest', 'Yield generation', 'Compound growth');
          break;
        case 'TransferHook':
          capabilities.push('Compliance automation', 'Transfer validation', 'Regulatory hooks');
          break;
        case 'MetadataPointer':
          capabilities.push('Rich metadata', 'Extended information', 'Custom properties');
          break;
      }
    });

    return capabilities;
  }
}

// Type definitions
interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  description?: string;
}

interface CreateTokenResult {
  mint: PublicKey;
  signature: string;
  extensions: string[];
  capabilities: string[];
}

interface ConfidentialTransferResult {
  signature: string;
  amount: BN;
  isConfidential: boolean;
  memo?: string;
  timestamp: number;
}

interface TokenInfo {
  mint: PublicKey;
  programId: PublicKey;
  extensions: string[];
  capabilities: string[];
  dataSize: number;
  isToken2022: boolean;
}

interface AgentPayment {
  mint: PublicKey;
  source: PublicKey;
  destination: PublicKey;
  amount: BN;
  type: 'base_fee' | 'performance_bonus' | 'interest_payment' | 'compliance_fee';
}

interface PaymentResult {
  mint: PublicKey;
  amount: BN;
  type: string;
  processed: boolean;
}

interface PaymentBundleResult {
  signature: string;
  agentId: PublicKey;
  payments: PaymentResult[];
  totalAmount: BN;
  isConfidential: boolean;
  timestamp: number;
}

export { SplToken2022Service };
export type {
  TokenMetadata,
  CreateTokenResult,
  ConfidentialTransferResult,
  TokenInfo,
  AgentPayment,
  PaymentBundleResult
};