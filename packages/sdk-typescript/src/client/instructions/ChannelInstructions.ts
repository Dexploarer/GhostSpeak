import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { getProgramDerivedAddress, getAddressEncoder } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import {
  getCreateChannelInstruction,
  getSendMessageInstruction,
  type Channel,
  type ChannelType,
  type MessageType
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for channel creation
export interface CreateChannelParams {
  name: string
  description?: string
  visibility: 'public' | 'private'
  participants: Address[]
  channelType?: ChannelType
}

// Parameters for sending messages
export interface SendChannelMessageParams {
  channelId: string
  content: string
  messageType?: MessageType
  attachments?: string[]
}

// Channel with metadata
export interface ChannelWithMetadata {
  address: Address
  data: Channel
  participantCount: number
  messageCount: number
  lastActivity: bigint
}

/**
 * Instructions for channel management operations
 */
export class ChannelInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Create a new communication channel
   */
  async create(
    signer: KeyPairSigner,
    params: CreateChannelParams
  ): Promise<{ channelId: Address; signature: string }> {
    // Generate a unique channel ID
    const channelId = Math.floor(Math.random() * 1000000000).toString()
    const channelAddress = await this.deriveChannelPda(signer.address, channelId)
    
    const instruction = getCreateChannelInstruction({
      channel: channelAddress,
      creator: signer as unknown as TransactionSigner,
      channelId: BigInt(channelId),
      participants: params.participants,
      channelType: params.channelType ?? 0, // Default to basic channel
      isPrivate: params.visibility === 'private'
    })
    
    const signature = await this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
    
    return { channelId: channelAddress, signature }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    signer: KeyPairSigner,
    channelAddress: Address,
    params: SendChannelMessageParams
  ): Promise<string> {
    const messageId = Date.now().toString()
    
    // Derive message PDA
    const encoder = new TextEncoder()
    const messagePda = await getProgramDerivedAddress({
      programAddress: this.config.programId!,
      seeds: [
        encoder.encode('message'),
        getAddressEncoder().encode(channelAddress),
        encoder.encode(messageId)
      ]
    })
    
    const instruction = getSendMessageInstruction({
      channel: channelAddress,
      sender: signer as unknown as TransactionSigner,
      message: messagePda[0],
      content: params.content,
      messageType: params.messageType ?? 0, // Default to text message
      isEncrypted: false
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * List channels by participant
   */
  async listByParticipant(params: { participant: Address }): Promise<ChannelWithMetadata[]> {
    const accounts = await this.getDecodedProgramAccounts<Channel>('getChannelDecoder')
    
    // Filter channels where the participant is included
    return accounts
      .filter(({ data }) => {
        // Check if the participant is in the channel's participants list
        if (!data.participants) return false
        return data.participants.some((p: Address) => p.toString() === params.participant.toString())
      })
      .map(({ address, data }) => ({
        address,
        data,
        participantCount: data.participants?.length ?? 0,
        messageCount: Number(data.messageCount ?? 0),
        lastActivity: BigInt(data.lastActivity ?? 0)
      }))
  }

  /**
   * Get channel details
   */
  async getChannel(channelAddress: Address): Promise<Channel | null> {
    return this.getDecodedAccount<Channel>(channelAddress, 'getChannelDecoder')
  }

  /**
   * List all public channels
   */
  async listPublicChannels(limit: number = 50): Promise<ChannelWithMetadata[]> {
    const accounts = await this.getDecodedProgramAccounts<Channel>('getChannelDecoder')
    
    // Filter for public channels and apply limit
    return accounts
      .filter(({ data }) => !data.isPrivate)
      .slice(0, limit)
      .map(({ address, data }) => ({
        address,
        data,
        participantCount: data.participants?.length ?? 0,
        messageCount: Number(data.messageCount ?? 0),
        lastActivity: BigInt(data.lastActivity ?? 0)
      }))
  }

  /**
   * Get messages from a channel (paginated)
   */
  async getChannelMessages(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _channelAddress: Address,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { limit?: number; offset?: number }
  ): Promise<{ message: Address; content: string; sender: Address; timestamp: number }[]> {
    // This would need a separate message account structure
    // For now, return empty array as messages might be stored differently
    return []
  }

  /**
   * Derive channel PDA
   */
  private async deriveChannelPda(creator: Address, channelId: string): Promise<Address> {
    const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } = await import('@solana/kit')
    
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('channel')),
        getAddressEncoder().encode(creator),
        getBytesEncoder().encode(new TextEncoder().encode(channelId))
      ]
    })
    
    return pda
  }
}