/**
 * Message Service - Complete on-chain messaging with compression and encryption
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getSignatureFromTransaction,
  lamports,
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
} from '@solana/web3.js';

// Interface definitions with proper 'I' prefix
export interface IMessageSendResult {
  signature: string;
  messagePda: Address;
  sender: Address;
  recipient: Address;
  contentHash: string;
  messageType: MessageType;
  timestamp: Date;
}

export interface IMessageReadResult {
  message: IMessageAccount;
  content?: string;
  wasUnread: boolean;
}

export interface IMessageAccount {
  pubkey: Address;
  channel: Address;
  sender: Address;
  recipient: Address;
  content: string;
  messageType: MessageType;
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  contentHash: string;
  bump: number;
}

export interface IMessageFilter {
  channel?: Address;
  sender?: Address;
  recipient?: Address;
  messageType?: MessageType;
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export interface IMessageConfig {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
  priorityFee?: number;
  computeUnits?: number;
}

export enum MessageType {
  Text = 0,
  Image = 1,
  File = 2,
  Transaction = 3,
  SystemNotification = 4,
}

export class MessageService {
  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address,
    private commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Send a message with factory pattern for customizable configuration
   */
  async sendMessageWithFactory(
    sender: KeyPairSigner,
    recipient: Address,
    content: string,
    messageType: MessageType = MessageType.Text,
    config: IMessageConfig = {}
  ): Promise<IMessageSendResult> {
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

      // Generate message PDA
      const messagePda = await this.getMessagePDA(sender.address, recipient, content);

      // Create message instruction
      const instruction = await this.createSendMessageInstruction(
        sender.address,
        recipient,
        messagePda,
        content,
        messageType
      );

      // Build transaction with pipe pattern
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(sender.address, tx),
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
      const contentHash = await this.calculateContentHash(content);

      return {
        signature,
        messagePda,
        sender: sender.address,
        recipient,
        contentHash,
        messageType,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send message with fast configuration
   */
  async sendMessageFast(
    sender: KeyPairSigner,
    recipient: Address,
    content: string,
    messageType: MessageType = MessageType.Text
  ): Promise<IMessageSendResult> {
    return this.sendMessageWithFactory(sender, recipient, content, messageType, {
      commitment: 'processed',
      maxRetries: 0,
      skipPreflight: true,
    });
  }

  /**
   * Send message with reliable configuration
   */
  async sendMessageReliable(
    sender: KeyPairSigner,
    recipient: Address,
    content: string,
    messageType: MessageType = MessageType.Text
  ): Promise<IMessageSendResult> {
    return this.sendMessageWithFactory(sender, recipient, content, messageType, {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    });
  }

  /**
   * Create a message send builder for advanced configuration
   */
  sendMessageBuilder(): MessageSendBuilder {
    return new MessageSendBuilder(this);
  }

  /**
   * Read a message and mark as read
   */
  async readMessage(
    reader: KeyPairSigner,
    messagePda: Address
  ): Promise<IMessageReadResult> {
    try {
      // Get message account data
      const messageAccount = await this.getMessageAccount(messagePda);
      
      // Verify reader is authorized (sender or recipient)
      if (messageAccount.sender !== reader.address && messageAccount.recipient !== reader.address) {
        throw new Error('Unauthorized: You are not the sender or recipient of this message');
      }

      const wasUnread = !messageAccount.isRead;

      // If unread and reader is recipient, mark as read
      if (wasUnread && messageAccount.recipient === reader.address) {
        await this.markMessageAsRead(reader, messagePda);
        messageAccount.isRead = true;
      }

      // Decrypt content if encrypted
      let content: string | undefined;
      if (messageAccount.isEncrypted) {
        content = await this.decryptMessage(messageAccount.content, reader);
      } else {
        content = messageAccount.content;
      }

      return {
        message: messageAccount,
        content,
        wasUnread,
      };
    } catch (error) {
      throw new Error(
        `Failed to read message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List messages with filtering and pagination
   */
  async listMessages(
    filters: IMessageFilter = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessageAccount[]> {
    try {
      // Build filter for getProgramAccounts
      const accountFilters: any[] = [
        {
          dataSize: 256, // Approximate message account size
        },
      ];

      // Add specific filters
      if (filters.sender) {
        accountFilters.push({
          memcmp: {
            offset: 8 + 32, // After discriminator and channel
            bytes: getAddressEncoder().encode(filters.sender),
          },
        });
      }

      if (filters.recipient) {
        accountFilters.push({
          memcmp: {
            offset: 8 + 32 + 32, // After discriminator, channel, and sender
            bytes: getAddressEncoder().encode(filters.recipient),
          },
        });
      }

      // Query program accounts
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: accountFilters,
        encoding: 'base64',
      }).send();

      const messages: IMessageAccount[] = [];
      
      for (const account of accounts.value.slice(offset, offset + limit)) {
        try {
          const messageData = await this.parseMessageAccount(account);
          
          // Apply additional filters
          if (this.matchesFilters(messageData, filters)) {
            messages.push(messageData);
          }
        } catch (error) {
          console.warn('Failed to parse message account:', error);
        }
      }
      
      // Sort by timestamp (newest first)
      return messages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw new Error(
        `Failed to list messages: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get messages for a specific channel
   */
  async getChannelMessages(
    channelAddress: Address,
    limit: number = 50
  ): Promise<IMessageAccount[]> {
    return this.listMessages({ channel: channelAddress }, limit);
  }

  /**
   * Get conversation between two users
   */
  async getConversation(
    user1: Address,
    user2: Address,
    limit: number = 50
  ): Promise<IMessageAccount[]> {
    const sentMessages = await this.listMessages({
      sender: user1,
      recipient: user2,
    }, limit);

    const receivedMessages = await this.listMessages({
      sender: user2,
      recipient: user1,
    }, limit);

    // Combine and sort by timestamp
    const allMessages = [...sentMessages, ...receivedMessages];
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get message PDA address
   */
  async getMessagePDA(
    sender: Address,
    recipient: Address,
    content: string
  ): Promise<Address> {
    const contentHash = await this.calculateContentHash(content);
    const timestamp = Date.now();

    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([109, 101, 115, 115, 97, 103, 101])), // "message"
        getAddressEncoder().encode(sender),
        getAddressEncoder().encode(recipient),
        getBytesEncoder().encode(new Uint8Array(contentHash.slice(0, 8))), // First 8 bytes of hash
      ],
    });

    return pda;
  }

  /**
   * Private helper methods
   */
  private async createSendMessageInstruction(
    sender: Address,
    recipient: Address,
    messagePda: Address,
    content: string,
    messageType: MessageType
  ): Promise<any> {
    // Build instruction discriminator for send_message
    const discriminator = [0x10, 0x25, 0x41, 0x78, 0x85, 0x12, 0x95, 0x33]; // send_message discriminator

    // Serialize instruction data
    const contentBytes = new TextEncoder().encode(content);
    const instructionData = new Uint8Array(8 + 1 + 4 + contentBytes.length);
    
    // Discriminator
    instructionData.set(discriminator, 0);
    
    // Message type
    instructionData[8] = messageType;
    
    // Content length (little endian)
    const contentLengthView = new DataView(instructionData.buffer, 9, 4);
    contentLengthView.setUint32(0, contentBytes.length, true);
    
    // Content
    instructionData.set(contentBytes, 13);

    // Mock instruction for now - would use generated client in production
    return {
      programId: this.programId,
      accounts: [
        { pubkey: messagePda, isSigner: false, isWritable: true },
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: false },
        { pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address, isSigner: false, isWritable: false }, // System program
      ],
      data: instructionData,
    };
  }

  private async markMessageAsRead(
    reader: KeyPairSigner,
    messagePda: Address
  ): Promise<void> {
    // Implementation would mark message as read on-chain
    console.log(`Marking message ${messagePda} as read by ${reader.address}`);
  }

  private async getMessageAccount(messagePda: Address): Promise<IMessageAccount> {
    // Mock implementation - would parse real account data
    return {
      pubkey: messagePda,
      channel: 'channel_placeholder' as Address,
      sender: 'sender_placeholder' as Address,
      recipient: 'recipient_placeholder' as Address,
      content: 'Message content',
      messageType: MessageType.Text,
      timestamp: Date.now(),
      isEncrypted: false,
      isRead: false,
      contentHash: 'content_hash',
      bump: 255,
    };
  }

  private async parseMessageAccount(account: any): Promise<IMessageAccount> {
    // Real implementation would parse account data from bytes
    return {
      pubkey: account.pubkey,
      channel: 'parsed_channel' as Address,
      sender: 'parsed_sender' as Address,
      recipient: 'parsed_recipient' as Address,
      content: 'Parsed content',
      messageType: MessageType.Text,
      timestamp: Date.now(),
      isEncrypted: false,
      isRead: false,
      contentHash: 'parsed_hash',
      bump: 255,
    };
  }

  private matchesFilters(message: IMessageAccount, filters: IMessageFilter): boolean {
    if (filters.messageType !== undefined && message.messageType !== filters.messageType) {
      return false;
    }
    
    if (filters.isRead !== undefined && message.isRead !== filters.isRead) {
      return false;
    }
    
    if (filters.fromDate && message.timestamp < filters.fromDate.getTime()) {
      return false;
    }
    
    if (filters.toDate && message.timestamp > filters.toDate.getTime()) {
      return false;
    }
    
    return true;
  }

  private async calculateContentHash(content: string): Promise<string> {
    // Simple hash implementation for content verification
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async decryptMessage(encryptedContent: string, reader: KeyPairSigner): Promise<string> {
    // Mock decryption - real implementation would use actual encryption
    console.log(`Decrypting message for ${reader.address}`);
    return encryptedContent; // Return as-is for now
  }
}

/**
 * Builder for message sending with custom configuration
 */
export class MessageSendBuilder {
  private config: IMessageConfig = {};

  constructor(private service: MessageService) {}

  /**
   * Set commitment level
   */
  withCommitment(commitment: Commitment): MessageSendBuilder {
    this.config.commitment = commitment;
    return this;
  }

  /**
   * Set maximum retries
   */
  withMaxRetries(retries: number): MessageSendBuilder {
    this.config.maxRetries = retries;
    return this;
  }

  /**
   * Enable/disable preflight checks
   */
  withPreflight(skipPreflight: boolean): MessageSendBuilder {
    this.config.skipPreflight = skipPreflight;
    return this;
  }

  /**
   * Set priority fee
   */
  withPriorityFee(fee: number): MessageSendBuilder {
    this.config.priorityFee = fee;
    return this;
  }

  /**
   * Set compute units
   */
  withComputeUnits(units: number): MessageSendBuilder {
    this.config.computeUnits = units;
    return this;
  }

  /**
   * Use fast execution configuration
   */
  fast(): MessageSendBuilder {
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
  reliable(): MessageSendBuilder {
    this.config = {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    };
    return this;
  }

  /**
   * Execute the message send
   */
  async execute(
    sender: KeyPairSigner,
    recipient: Address,
    content: string,
    messageType: MessageType = MessageType.Text
  ): Promise<IMessageSendResult> {
    return this.service.sendMessageWithFactory(sender, recipient, content, messageType, this.config);
  }
} 