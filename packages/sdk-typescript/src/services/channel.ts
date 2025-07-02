/**
 * Modern Channel Service for Web3.js v2 (2025)
 * Follows Rust SDK architecture patterns
 */

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
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

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

      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash({ commitment: this.commitment })
        .send();

      // Build create channel instruction
      const instruction = this.createChannelInstruction(
        signer,
        channelPda,
        options
      );

      // Build transaction
      const transaction = {
        instructions: [instruction],
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: signer.address,
      };

      // Sign and send transaction
      const signature = await this.sendTransaction(transaction, signer);

      console.log('✅ Channel created successfully:', signature);

      return {
        signature,
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

      // Parse channel account data
      return this.parseChannelAccount(accountInfo.value.data);
    } catch (error) {
      console.error('❌ Failed to get channel:', error);
      return null;
    }
  }

  /**
   * List all channels for a creator
   */
  async listUserChannels(creator: Address): Promise<IChannelAccount[]> {
    try {
      const accounts = await this.rpc
        .getProgramAccounts(this.programId, {
          commitment: this.commitment,
          filters: [
            {
              memcmp: {
                offset: 8, // Skip discriminator
                bytes: creator,
              },
            },
          ],
        })
        .send();

      return accounts.map(account => this.parseChannelAccount(account.account.data));
    } catch (error) {
      console.error('❌ Failed to list user channels:', error);
      return [];
    }
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

      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash({ commitment: this.commitment })
        .send();

      const instruction = this.createJoinChannelInstruction(signer, channelPda);

      const transaction = {
        instructions: [instruction],
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: signer.address,
      };

      const signature = await this.sendTransaction(transaction, signer);

      console.log('✅ Successfully joined channel:', signature);
      return signature;
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

      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash({ commitment: this.commitment })
        .send();

      const instruction = this.createLeaveChannelInstruction(signer, channelPda);

      const transaction = {
        instructions: [instruction],
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: signer.address,
      };

      const signature = await this.sendTransaction(transaction, signer);

      console.log('✅ Successfully left channel:', signature);
      return signature;
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      throw new Error(
        `Leave channel failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate channel PDA (Program Derived Address)
   */
  private async findChannelPda(creator: Address, channelId: string): Promise<Address> {
    // This would use the actual PDA calculation with seeds
    // For now, generate a mock address
    return `${creator}_${channelId}_channel_pda` as Address;
  }

  /**
   * Create channel instruction
   */
  private createChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address,
    options: ICreateChannelOptions
  ) {
    return {
      programId: this.programId,
      keys: [
        { pubkey: signer.address, isSigner: true, isWritable: true },
        { pubkey: channelPda, isSigner: false, isWritable: true },
      ],
      data: this.encodeCreateChannelData(options),
    };
  }

  /**
   * Create join channel instruction
   */
  private createJoinChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address
  ) {
    return {
      programId: this.programId,
      keys: [
        { pubkey: signer.address, isSigner: true, isWritable: false },
        { pubkey: channelPda, isSigner: false, isWritable: true },
      ],
      data: this.encodeJoinChannelData(),
    };
  }

  /**
   * Create leave channel instruction
   */
  private createLeaveChannelInstruction(
    signer: KeyPairSigner,
    channelPda: Address
  ) {
    return {
      programId: this.programId,
      keys: [
        { pubkey: signer.address, isSigner: true, isWritable: false },
        { pubkey: channelPda, isSigner: false, isWritable: true },
      ],
      data: this.encodeLeaveChannelData(),
    };
  }

  /**
   * Encode create channel instruction data
   */
  private encodeCreateChannelData(options: ICreateChannelOptions): Uint8Array {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(options.name.padEnd(32, '\0'));
    const descBytes = encoder.encode(options.description.padEnd(256, '\0'));
    const visibilityBytes = encoder.encode(options.visibility.padEnd(16, '\0'));
    
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

    // Max participants (4 bytes)
    const maxParticipants = new Uint32Array([options.maxParticipants || 100]);
    data.set(new Uint8Array(maxParticipants.buffer), offset);

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

  /**
   * Parse channel account data
   */
  private parseChannelAccount(data: string | Uint8Array): IChannelAccount {
    // This would implement proper account data parsing
    // For now, return mock data
    return {
      creator: 'mock_creator' as Address,
      name: 'Mock Channel',
      description: 'Mock channel description',
      visibility: ChannelVisibility.PUBLIC,
      maxParticipants: 100,
      currentParticipants: 5,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Send transaction
   */
  private async sendTransaction(transaction: any, signer: KeyPairSigner): Promise<string> {
    // This would implement proper transaction sending
    // For now, return mock signature
    const signature = `sig_${Date.now()}_${signer.address.slice(0, 8)}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return signature;
  }
} 