/**
 * Modern Channel Service for Web3.js v2 (2025)
 * Follows Rust SDK architecture patterns
 */

import { address } from '@solana/addresses';

import {
  createInstruction,
  findProgramAddress,
  sendAndConfirmTransactionFactory,
  addressToMemcmpBytes,
} from '../utils/transaction-helpers';

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Channel visibility options
 */
export enum ChannelVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED',
}

/**
 * Channel creation options
 */
export interface ICreateChannelOptions {
  name: string;
  description: string;
  visibility: ChannelVisibility;
  maxParticipants?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Channel creation result
 */
export interface IChannelCreationResult {
  signature: string;
  channelPda: Address;
  channelId: string;
}

/**
 * Channel account data
 */
export interface IChannelAccount {
  creator: Address;
  name: string;
  description: string;
  visibility: ChannelVisibility;
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Modern Channel Service using Web3.js v2 patterns
 */
export class ChannelService {
  private readonly sendAndConfirmTransaction: ReturnType<
    typeof sendAndConfirmTransactionFactory
  >;

  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {
    this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory(this.rpc);
  }

  /**
   * Create a new channel on-chain
   */
  async createChannel(
    signer: KeyPairSigner,
    options: ICreateChannelOptions
  ): Promise<IChannelCreationResult> {
    try {
      console.log('📢 Creating channel on-chain:', options.name);

      // Generate unique channel ID
      const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // Calculate channel PDA
      const channelPda = await this.findChannelPda(signer.address, channelId);

      // Build create channel instruction
      const instruction = this.createChannelInstruction(
        signer,
        channelPda,
        options
      );

      // Sign and send transaction
      const result = await this.sendAndConfirmTransaction([instruction]);

      console.log('✅ Channel created successfully:', result.signature);

      return {
        signature: result.signature,
        channelPda,
        channelId,
      };
    } catch (error) {
      console.error('❌ Failed to create channel:', error);
      throw new Error(
        `Channel creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get channel account data
   */
  async getChannel(channelPda: Address): Promise<IChannelAccount | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(channelPda, {
          commitment: this.commitment,
          encoding: 'base64',
        })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      // Handle Web3.js v2 account data format - we requested base64 encoding
      let data: Uint8Array;
      const accountData = accountInfo.value.data;

      if (Array.isArray(accountData)) {
        // Web3.js v2 returns [data, encoding] tuple
        const [dataString] = accountData;
        if (typeof dataString === 'string') {
          data = Buffer.from(dataString, 'base64');
        } else {
          throw new Error('Invalid data format in account info');
        }
      } else if (this.isUint8Array(accountData)) {
        data = accountData;
      } else {
        throw new Error('Unknown account data format');
      }

      // Parse channel account data
      return this.parseChannelAccount(data);
    } catch (error) {
      console.error('❌ Failed to get channel:', error);
      return null;
    }
  }

  /**
   * List all channels for a creator using proper Web3.js v2 patterns
   */
  async listUserChannels(creator: Address): Promise<IChannelAccount[]> {
    try {
      const accountsResult = await this.rpc
        .getProgramAccounts(this.programId, {
          commitment: this.commitment,
          filters: [
            {
              memcmp: {
                offset: 8n, // Skip discriminator
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                bytes: addressToMemcmpBytes(creator) as any, // Web3.js v2 branded type compatibility
                encoding: 'base58' as const,
              },
            },
          ],
        })
        .send();

      // Web3.js v2 getProgramAccounts result structure
      const accounts = Array.isArray(accountsResult) ? accountsResult : [];

      const channelAccounts: IChannelAccount[] = [];

      for (const accountData of accounts) {
        // Type-safe checking for Web3.js v2 response structure
        if (this.isValidAccountData(accountData)) {
          const data = accountData.account.data;
          if (this.isUint8Array(data)) {
            const parsed = this.deserializeChannelData(data);
            if (parsed) {
              channelAccounts.push(parsed);
            }
          }
        }
      }

      return channelAccounts;
    } catch (error) {
      console.error('Error listing user channels:', error);
      return [];
    }
  }

  /**
   * Type guard for checking if data is Uint8Array
   */
  private isUint8Array(value: unknown): value is Uint8Array {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      value.constructor === Uint8Array
    );
  }

  /**
   * Type guard for validating account data structure
   */
  private isValidAccountData(
    accountData: unknown
  ): accountData is { account: { data: unknown } } {
    return (
      typeof accountData === 'object' &&
      accountData !== null &&
      'account' in accountData &&
      typeof (accountData as Record<string, unknown>).account === 'object' &&
      (accountData as Record<string, unknown>).account !== null &&
      'data' in
        ((accountData as Record<string, unknown>).account as Record<
          string,
          unknown
        >)
    );
  }

  /**
   * Join a channel
   */
  async joinChannel(
    signer: KeyPairSigner,
    channelPda: Address
  ): Promise<string> {
    try {
      console.log('🚪 Joining channel:', channelPda);

      const instruction = this.createJoinChannelInstruction(signer, channelPda);

      const result = await this.sendAndConfirmTransaction([instruction]);

      console.log('✅ Successfully joined channel:', result.signature);
      return result.signature;
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      throw new Error(
        `Join channel failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(
    signer: KeyPairSigner,
    channelPda: Address
  ): Promise<string> {
    try {
      console.log('🚪 Leaving channel:', channelPda);

      const instruction = this.createLeaveChannelInstruction(
        signer,
        channelPda
      );

      const result = await this.sendAndConfirmTransaction([instruction]);

      console.log('✅ Successfully left channel:', result.signature);
      return result.signature;
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      throw new Error(
        `Leave channel failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse channel account data
   */
  private parseChannelAccount(data: Uint8Array): IChannelAccount {
    // Simple parsing for demonstration - in production use proper Borsh parsing
    const decoder = new TextDecoder();

    // Parse channel data - replace with actual Borsh parsing in production
    return {
      creator: address('11111111111111111111111111111112'), // System program as placeholder
      name: decoder.decode(data.slice(8, 40)).trim(),
      description: decoder.decode(data.slice(40, 296)).trim(),
      visibility: ChannelVisibility.PUBLIC,
      maxParticipants: 100,
      currentParticipants: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Deserialize channel account data
   */
  private deserializeChannelData(data: Uint8Array): IChannelAccount | null {
    try {
      return this.parseChannelAccount(data);
    } catch (error) {
      console.error('Error deserializing channel data:', error);
      return null;
    }
  }

  /**
   * Calculate channel PDA (Program Derived Address)
   */
  private async findChannelPda(
    creator: Address,
    channelId: string
  ): Promise<Address> {
    // Convert Address to bytes for PDA calculation using toString() and Buffer.from
    const creatorBuffer = Buffer.from(creator.toString().slice(0, 32), 'utf8');

    const [pda] = await findProgramAddress(
      [Buffer.from('channel'), creatorBuffer, Buffer.from(channelId)],
      this.programId
    );
    if (!pda) {
      throw new Error('Failed to derive channel PDA');
    }
    return address(pda); // Convert string to Address type
  }

  /**
   * Create channel instruction
   */
  private createChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address,
    options: ICreateChannelOptions
  ) {
    return createInstruction({
      programAddress: this.programId,
      accounts: [
        { address: signer.address, role: 'writable-signer' },
        { address: channelPda, role: 'writable' },
      ],
      data: this.encodeCreateChannelData(options),
    });
  }

  /**
   * Create join channel instruction
   */
  private createJoinChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address
  ) {
    return createInstruction({
      programAddress: this.programId,
      accounts: [
        { address: signer.address, role: 'readonly-signer' },
        { address: channelPda, role: 'writable' },
      ],
      data: this.encodeJoinChannelData(),
    });
  }

  /**
   * Create leave channel instruction
   */
  private createLeaveChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address
  ) {
    return createInstruction({
      programAddress: this.programId,
      accounts: [
        { address: signer.address, role: 'readonly-signer' },
        { address: channelPda, role: 'writable' },
      ],
      data: this.encodeLeaveChannelData(),
    });
  }

  /**
   * Encode create channel instruction data
   */
  private encodeCreateChannelData(options: ICreateChannelOptions): Uint8Array {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(options.name.padEnd(32, ' '));
    const descBytes = encoder.encode(options.description.padEnd(256, ' '));
    const visibilityBytes = encoder.encode(options.visibility.padEnd(16, ' '));

    const data = new Uint8Array(8 + 32 + 256 + 16 + 4);
    let offset = 0;

    // Instruction discriminator (8 bytes)
    data.set([3, 0, 0, 0, 0, 0, 0, 0], offset);
    offset += 8;

    // Name (32 bytes)
    data.set(nameBytes.slice(0, 32), offset);
    offset += 32;

    // Description (256 bytes)
    data.set(descBytes.slice(0, 256), offset);
    offset += 256;

    // Visibility (16 bytes)
    data.set(visibilityBytes.slice(0, 16), offset);
    offset += 16;

    // Max participants (4 bytes) - use nullish coalescing
    const maxParticipants = options.maxParticipants ?? 100;
    const maxParticipantsArray = new Uint32Array([maxParticipants]);
    data.set(new Uint8Array(maxParticipantsArray.buffer), offset);

    return data;
  }

  /**
   * Encode join channel instruction data
   */
  private encodeJoinChannelData(): Uint8Array {
    const data = new Uint8Array(8);
    // Instruction discriminator for join (8 bytes)
    data.set([4, 0, 0, 0, 0, 0, 0, 0], 0);
    return data;
  }

  /**
   * Encode leave channel instruction data
   */
  private encodeLeaveChannelData(): Uint8Array {
    const data = new Uint8Array(8);
    // Instruction discriminator for leave (8 bytes)
    data.set([5, 0, 0, 0, 0, 0, 0, 0], 0);
    return data;
  }
}

// New builder class for channel creation
export class ChannelCreationBuilder {
  private readonly options: Partial<ICreateChannelOptions> = {};
  private commitment: Commitment = 'confirmed';
  private maxRetries = 3;
  private preflight = true;

  constructor(private readonly channelService: ChannelService) {}

  withName(name: string): this {
    this.options.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.options.description = description;
    return this;
  }

  withVisibility(visibility: ChannelVisibility): this {
    this.options.visibility = visibility;
    return this;
  }

  withMaxParticipants(maxParticipants: number): this {
    this.options.maxParticipants = maxParticipants;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.options.metadata = metadata;
    return this;
  }

  withCommitment(commitment: Commitment): this {
    this.commitment = commitment;
    return this;
  }

  withMaxRetries(maxRetries: number): this {
    this.maxRetries = maxRetries;
    return this;
  }

  withPreflight(preflight: boolean): this {
    this.preflight = preflight;
    return this;
  }

  async execute(signer: KeyPairSigner): Promise<IChannelCreationResult> {
    // Handle optional properties validation (Partial<ICreateChannelOptions> means undefined, not null)
    if (this.options.name === undefined || this.options.name.trim() === '') {
      throw new Error('Name is required');
    }

    if (
      this.options.description === undefined ||
      this.options.description.trim() === ''
    ) {
      throw new Error('Description is required');
    }

    if (this.options.visibility === undefined) {
      throw new Error('Visibility is required');
    }

    // Here you would use the builder options to configure the transaction
    // For now, we just pass the options to the existing createChannel method
    return this.channelService.createChannel(
      signer,
      this.options as ICreateChannelOptions
    );
  }
}
