/**
 * Comprehensive SDK Utilities
 * Essential functions for common GhostSpeak protocol operations
 */

import type { Address } from '@solana/addresses';
import type { Rpc } from '@solana/rpc';
import type { TransactionSigner } from '@solana/signers';
import { getProgramDerivedAddress } from '@solana/addresses';
import { TimestampUtils, TokenAmountUtils, IdUtils } from './bigint-serialization';
import { ResilientTransactionSender, DEFAULT_RETRY_CONFIGS } from './enhanced-transaction-helpers';

/**
 * Program Derived Address (PDA) utilities for GhostSpeak protocol
 */
export class PDAUtils {
  /**
   * Derive agent account PDA
   */
  static async deriveAgentPDA(
    agentPubkey: Address,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'agent',
        new TextEncoder().encode(agentPubkey),
      ],
    });
    return pda;
  }

  /**
   * Derive channel account PDA
   */
  static async deriveChannelPDA(
    channelId: string,
    creator: Address,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'channel',
        new TextEncoder().encode(channelId),
        new TextEncoder().encode(creator),
      ],
    });
    return pda;
  }

  /**
   * Derive message account PDA
   */
  static async deriveMessagePDA(
    messageId: string,
    sender: Address,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'message',
        new TextEncoder().encode(messageId),
        new TextEncoder().encode(sender),
      ],
    });
    return pda;
  }

  /**
   * Derive escrow account PDA
   */
  static async deriveEscrowPDA(
    escrowId: string,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'escrow',
        new TextEncoder().encode(escrowId),
      ],
    });
    return pda;
  }

  /**
   * Derive service listing PDA
   */
  static async deriveServiceListingPDA(
    listingId: string,
    provider: Address,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'service_listing',
        new TextEncoder().encode(listingId),
        new TextEncoder().encode(provider),
      ],
    });
    return pda;
  }

  /**
   * Derive work order PDA
   */
  static async deriveWorkOrderPDA(
    orderId: string,
    client: Address,
    programId: Address
  ): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        'work_order',
        new TextEncoder().encode(orderId),
        new TextEncoder().encode(client),
      ],
    });
    return pda;
  }
}

/**
 * Account data parsing utilities
 */
export class AccountParser {
  /**
   * Parse agent account data
   */
  static parseAgentAccount(data: Uint8Array): {
    name: string;
    description: string;
    endpoint: string;
    capabilities: bigint;
    reputation: bigint;
    lastUpdated: bigint;
    isActive: boolean;
  } {
    // Implementation would depend on the actual account structure
    // This is a placeholder showing the expected interface
    throw new Error('Account parsing not implemented - requires actual account layout');
  }

  /**
   * Parse channel account data
   */
  static parseChannelAccount(data: Uint8Array): {
    name: string;
    description: string;
    creator: Address;
    participants: Address[];
    isPrivate: boolean;
    feePerMessage: bigint;
    createdAt: bigint;
  } {
    throw new Error('Account parsing not implemented - requires actual account layout');
  }

  /**
   * Parse message account data
   */
  static parseMessageAccount(data: Uint8Array): {
    sender: Address;
    receiver: Address;
    content: string;
    messageType: number;
    timestamp: bigint;
    expiresAt: bigint;
    isEncrypted: boolean;
  } {
    throw new Error('Account parsing not implemented - requires actual account layout');
  }
}

/**
 * Transaction building utilities
 */
export class TransactionBuilder {
  private rpc: Rpc<any>;
  private transactionSender: ResilientTransactionSender;

  constructor(rpc: Rpc<any>) {
    this.rpc = rpc;
    this.transactionSender = new ResilientTransactionSender(rpc);
  }

  /**
   * Create and send agent registration transaction
   */
  async registerAgent(params: {
    agent: TransactionSigner;
    name: string;
    description: string;
    endpoint: string;
    capabilities: string[];
    programId: Address;
  }): Promise<string> {
    // This would use the actual generated instruction builders
    throw new Error('Transaction building not implemented - requires generated instructions');
  }

  /**
   * Create and send channel creation transaction
   */
  async createChannel(params: {
    creator: TransactionSigner;
    channelId: string;
    name: string;
    description: string;
    isPrivate: boolean;
    feePerMessage: bigint;
    programId: Address;
  }): Promise<string> {
    throw new Error('Transaction building not implemented - requires generated instructions');
  }

  /**
   * Create and send message transaction
   */
  async sendMessage(params: {
    sender: TransactionSigner;
    receiver: Address;
    content: string;
    messageType: number;
    expiresAt?: bigint;
    programId: Address;
  }): Promise<string> {
    throw new Error('Transaction building not implemented - requires generated instructions');
  }

  /**
   * Create and send escrow transaction
   */
  async createEscrow(params: {
    payer: TransactionSigner;
    beneficiary: Address;
    amount: bigint;
    deadline: bigint;
    programId: Address;
  }): Promise<string> {
    throw new Error('Transaction building not implemented - requires generated instructions');
  }
}

/**
 * Query utilities for reading blockchain state
 */
export class QueryUtils {
  private transactionSender: ResilientTransactionSender;

  constructor(rpc: Rpc<any>) {
    this.transactionSender = new ResilientTransactionSender(rpc);
  }

  /**
   * Get agent account data
   */
  async getAgent(agentPubkey: Address, programId: Address): Promise<any> {
    const agentPDA = await PDAUtils.deriveAgentPDA(agentPubkey, programId);
    const accountInfo = await this.transactionSender.getAccountInfo(
      agentPDA,
      DEFAULT_RETRY_CONFIGS.READ_ONLY
    );

    if (!accountInfo) {
      throw new Error(`Agent account not found for pubkey: ${agentPubkey}`);
    }

    return AccountParser.parseAgentAccount(accountInfo.data);
  }

  /**
   * Get all agents (with pagination)
   */
  async getAllAgents(
    programId: Address,
    offset = 0,
    limit = 100
  ): Promise<any[]> {
    // Implementation would use getProgramAccounts with filters
    throw new Error('Query not implemented - requires program account filtering');
  }

  /**
   * Get channel data
   */
  async getChannel(
    channelId: string,
    creator: Address,
    programId: Address
  ): Promise<any> {
    const channelPDA = await PDAUtils.deriveChannelPDA(channelId, creator, programId);
    const accountInfo = await this.transactionSender.getAccountInfo(
      channelPDA,
      DEFAULT_RETRY_CONFIGS.READ_ONLY
    );

    if (!accountInfo) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    return AccountParser.parseChannelAccount(accountInfo.data);
  }

  /**
   * Get messages for a channel
   */
  async getChannelMessages(
    channelId: string,
    creator: Address,
    programId: Address,
    limit = 50
  ): Promise<any[]> {
    // Implementation would filter message accounts by channel
    throw new Error('Query not implemented - requires message filtering');
  }

  /**
   * Get user's messages
   */
  async getUserMessages(
    user: Address,
    programId: Address,
    limit = 50
  ): Promise<any[]> {
    // Implementation would filter message accounts by user
    throw new Error('Query not implemented - requires message filtering');
  }
}

/**
 * Validation utilities for protocol-specific data
 */
export class ProtocolValidator {
  /**
   * Validate agent name
   */
  static validateAgentName(name: string): void {
    if (!name || name.length < 3 || name.length > 32) {
      throw new Error('Agent name must be between 3 and 32 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Agent name can only contain letters, numbers, underscores, and hyphens');
    }
  }

  /**
   * Validate agent description
   */
  static validateAgentDescription(description: string): void {
    if (!description || description.length < 10 || description.length > 500) {
      throw new Error('Agent description must be between 10 and 500 characters');
    }
  }

  /**
   * Validate service endpoint URL
   */
  static validateEndpoint(endpoint: string): void {
    try {
      const url = new URL(endpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Endpoint must use HTTP or HTTPS protocol');
      }
    } catch {
      throw new Error('Invalid endpoint URL format');
    }
  }

  /**
   * Validate channel name
   */
  static validateChannelName(name: string): void {
    if (!name || name.length < 3 || name.length > 50) {
      throw new Error('Channel name must be between 3 and 50 characters');
    }
  }

  /**
   * Validate message content
   */
  static validateMessageContent(content: string): void {
    if (!content || content.length === 0) {
      throw new Error('Message content cannot be empty');
    }
    if (content.length > 2000) {
      throw new Error('Message content cannot exceed 2000 characters');
    }
  }

  /**
   * Validate capabilities array
   */
  static validateCapabilities(capabilities: string[]): void {
    if (!Array.isArray(capabilities)) {
      throw new Error('Capabilities must be an array');
    }
    if (capabilities.length === 0) {
      throw new Error('At least one capability must be specified');
    }
    if (capabilities.length > 20) {
      throw new Error('Cannot specify more than 20 capabilities');
    }
    
    const validCapabilities = [
      'text_generation',
      'code_analysis',
      'data_processing',
      'image_generation',
      'translation',
      'sentiment_analysis',
      'summarization',
      'question_answering',
      'content_moderation',
      'recommendation'
    ];
    
    for (const capability of capabilities) {
      if (!validCapabilities.includes(capability)) {
        throw new Error(`Invalid capability: ${capability}`);
      }
    }
  }
}

/**
 * Helper utilities for common operations
 */
export class SDKHelpers {
  /**
   * Generate unique identifiers
   */
  static generateId(): string {
    return IdUtils.generateRandomId().toString();
  }

  /**
   * Format token amounts for display
   */
  static formatTokenAmount(
    amount: bigint,
    decimals = 9,
    displayDecimals = 6
  ): string {
    return TokenAmountUtils.formatAmount(amount, decimals, displayDecimals);
  }

  /**
   * Parse token amount from string
   */
  static parseTokenAmount(amount: string, decimals = 9): bigint {
    return TokenAmountUtils.parseAmount(amount, decimals);
  }

  /**
   * Get current timestamp
   */
  static getCurrentTimestamp(): bigint {
    return TimestampUtils.now();
  }

  /**
   * Add time duration to timestamp
   */
  static addTimeToTimestamp(timestamp: bigint, seconds: number): bigint {
    return TimestampUtils.addDuration(timestamp, seconds);
  }

  /**
   * Check if timestamp is expired
   */
  static isTimestampExpired(timestamp: bigint): boolean {
    return TimestampUtils.isExpired(timestamp);
  }

  /**
   * Convert timestamp to human-readable date
   */
  static timestampToDate(timestamp: bigint): Date {
    return TimestampUtils.timestampToDate(timestamp);
  }

  /**
   * Convert date to blockchain timestamp
   */
  static dateToTimestamp(date: Date): bigint {
    return TimestampUtils.dateToTimestamp(date);
  }

  /**
   * Sleep for specified milliseconds (useful for testing)
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
}

/**
 * Constants for the GhostSpeak protocol
 */
export const PROTOCOL_CONSTANTS = {
  /** Default token decimals */
  TOKEN_DECIMALS: 9,
  
  /** Maximum message length */
  MAX_MESSAGE_LENGTH: 2000,
  
  /** Maximum agent name length */
  MAX_AGENT_NAME_LENGTH: 32,
  
  /** Maximum channel name length */
  MAX_CHANNEL_NAME_LENGTH: 50,
  
  /** Default message expiry (24 hours) */
  DEFAULT_MESSAGE_EXPIRY_SECONDS: 24 * 60 * 60,
  
  /** Minimum escrow amount (in lamports) */
  MIN_ESCROW_AMOUNT: 1000n,
  
  /** Default fee per message (in lamports) */
  DEFAULT_FEE_PER_MESSAGE: 1000n,
  
  /** Account size constants */
  ACCOUNT_SIZES: {
    AGENT: 256,
    CHANNEL: 512,
    MESSAGE: 2048,
    ESCROW: 128,
    SERVICE_LISTING: 1024,
    WORK_ORDER: 512,
  },
} as const;

// All exports are already handled by individual class/const exports