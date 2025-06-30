/**
 * Channel Service - Real on-chain channel management
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import {
  getCreateChannelInstructionAsync,
  getBroadcastMessageInstructionAsync,
  getAddParticipantInstruction
} from '../generated-v2/instructions';
import { decodeChannelAccount } from '../generated-v2/accounts';
import { sendTransaction } from '../utils/transaction-sender';
import { ChannelVisibility } from '../types';

export interface IChannelAccount {
  pubkey: Address;
  name: string;
  description: string;
  creator: Address;
  participantCount: number;
  maxParticipants: number;
  isActive: boolean;
  visibility: 'public' | 'private' | 'restricted';
  feePerMessage: number;
  createdAt: number;
  lastUpdated: number;
  bump: number;
}

export interface ICreateChannelOptions {
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'restricted';
  maxMembers: number;
  feePerMessage: number;
}

/**
 * Service for managing communication channels on the podAI Protocol
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
  ): Promise<string> {
    console.log('📢 Creating channel on-chain:', options.name);
    
    try {
      // Create the channel instruction
      const instruction = await getCreateChannelInstructionAsync({
        creator: signer,
        name: options.name,
        description: options.description,
        visibility: options.visibility,
        maxParticipants: options.maxMembers,
        feePerMessage: options.feePerMessage,
      });

      // Send transaction using real Web3.js v2 transaction sending
      const result = await sendTransaction({
        rpc: this.rpc,
        instructions: [instruction],
        signer,
        commitment: this.commitment,
      });

      const signature = result.signature;

      console.log('✅ Channel created successfully:', signature);
      return signature;
    } catch (error) {
      console.error('❌ Failed to create channel:', error);
      throw error;
    }
  }

  /**
   * Join an existing channel
   */
  async joinChannel(channelAddress: Address, signer: KeyPairSigner): Promise<void> {
    console.log('🤝 Joining channel on-chain:', channelAddress);
    
    try {
      // Create the add participant instruction
      const instruction = getAddParticipantInstruction({
        channelAccount: channelAddress,
        admin: signer, // For now, assume signer can add themselves
        newParticipant: signer.address,
      });

      // Send transaction using real Web3.js v2 transaction sending
      const result = await sendTransaction({
        rpc: this.rpc,
        instructions: [instruction],
        signer,
        commitment: this.commitment,
      });

      console.log('✅ Successfully joined channel:', result.signature);
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Broadcast a message to a channel
   */
  async broadcastMessage(
    signer: KeyPairSigner,
    options: { channelPDA: Address; content: string; messageType: string }
  ): Promise<string> {
    console.log('📨 Broadcasting message on-chain to:', options.channelPDA);
    
    try {
      // Map string message type to numeric value
      const messageTypeNum = options.messageType === 'text' ? 0 : 
                             options.messageType === 'image' ? 1 : 
                             options.messageType === 'code' ? 2 : 0;

      // Create the broadcast instruction
      const instruction = await getBroadcastMessageInstructionAsync({
        channelAccount: options.channelPDA,
        sender: signer,
        content: options.content,
        messageType: messageTypeNum,
      });

      // Send transaction using real Web3.js v2 transaction sending
      const result = await sendTransaction({
        rpc: this.rpc,
        instructions: [instruction],
        signer,
        commitment: this.commitment,
      });

      const signature = result.signature;

      console.log('✅ Message broadcasted successfully:', signature);
      return signature;
    } catch (error) {
      console.error('❌ Failed to broadcast message:', error);
      throw error;
    }
  }

  /**
   * Get all public channels
   */
  async getAllChannels(limit: number = 50): Promise<IChannelAccount[]> {
    console.log('🔍 Fetching public channels from blockchain...');
    
    try {
      // Get program accounts with channel discriminator
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          {
            dataSize: 200, // Approximate size of channel account
          },
        ],
        encoding: 'base64',
      }).send();

      const channels: IChannelAccount[] = [];
      
      for (const account of accounts.value.slice(0, limit)) {
        try {
          // Parse account data using generated decoders
          try {
            const decodedChannel = decodeChannelAccount(account);
            const channelData = {
              pubkey: account.pubkey,
              creator: decodedChannel.data.creator,
              name: decodedChannel.data.name,
              description: decodedChannel.data.description,
              visibility: decodedChannel.data.visibility === 0 ? 'public' as const : 
                         decodedChannel.data.visibility === 1 ? 'private' as const : 'restricted' as const,
              maxMembers: Number(decodedChannel.data.maxParticipants),
              memberCount: Number(decodedChannel.data.participantCount),
              currentParticipants: Number(decodedChannel.data.participantCount),
              maxParticipants: Number(decodedChannel.data.maxParticipants),
              participantCount: Number(decodedChannel.data.participantCount),
              feePerMessage: Number(decodedChannel.data.feePerMessage),
              escrowBalance: 0,
              createdAt: Number(decodedChannel.data.createdAt || Date.now()),
              lastUpdated: Date.now(),
              isActive: decodedChannel.data.isActive || true,
              bump: decodedChannel.data.bump || 0,
            };
            
            channels.push(channelData);
          } catch (decodeError) {
            console.warn('Failed to decode channel account:', decodeError);
            // Skip invalid channel accounts
          }
        } catch (parseError) {
          console.warn('Failed to parse channel account:', parseError);
        }
      }
      
      console.log(`✅ Found ${channels.length} channels`);
      return channels;
    } catch (error) {
      console.error('❌ Failed to fetch channels:', error);
      return [];
    }
  }

  /**
   * Get channels created by a specific agent
   */
  async getChannelsByCreator(creatorAddress: Address): Promise<IChannelAccount[]> {
    console.log('🔍 Fetching channels by creator from blockchain:', creatorAddress);
    
    try {
      // Get program accounts filtered by creator
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          {
            dataSize: 200, // Approximate size of channel account
          },
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: creatorAddress, // Filter by creator
            },
          },
        ],
        encoding: 'base64',
      }).send();

      const channels: IChannelAccount[] = [];
      
      for (const account of accounts.value) {
        try {
          // Parse account data using generated decoders
          try {
            const decodedChannel = decodeChannelAccount(account);
            const channelData = {
              pubkey: account.pubkey,
              creator: decodedChannel.data.creator,
              name: decodedChannel.data.name,
              description: decodedChannel.data.description,
              visibility: decodedChannel.data.visibility === 0 ? 'public' as const : 
                         decodedChannel.data.visibility === 1 ? 'private' as const : 'restricted' as const,
              maxMembers: Number(decodedChannel.data.maxParticipants),
              memberCount: Number(decodedChannel.data.participantCount),
              currentParticipants: Number(decodedChannel.data.participantCount),
              maxParticipants: Number(decodedChannel.data.maxParticipants),
              participantCount: Number(decodedChannel.data.participantCount),
              feePerMessage: Number(decodedChannel.data.feePerMessage),
              escrowBalance: 0,
              createdAt: Number(decodedChannel.data.createdAt || Date.now()),
              lastUpdated: Date.now(),
              isActive: decodedChannel.data.isActive || true,
              bump: decodedChannel.data.bump || 0,
            };
            
            channels.push(channelData);
          } catch (decodeError) {
            console.warn('Failed to decode channel account:', decodeError);
            // Skip invalid channel accounts
          }
        } catch (parseError) {
          console.warn('Failed to parse channel account:', parseError);
        }
      }
      
      console.log(`✅ Found ${channels.length} channels for creator`);
      return channels;
    } catch (error) {
      console.error('❌ Failed to fetch channels by creator:', error);
      return [];
    }
  }
} 