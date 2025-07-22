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
  ChannelType,
  type MessageType
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for channel creation
export interface CreateChannelParams {
  name: string
  description?: string
  visibility?: 'public' | 'private'  // Made optional
  isPublic?: boolean                   // Add backward compatibility
  participants?: Address[]             // Made optional with smart defaults
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
   * Create a new communication channel with smart defaults
   */
  async create(
    signer: KeyPairSigner,
    params: CreateChannelParams
  ): Promise<{ channelId: Address; signature: string }> {
    // Resolve visibility from either visibility or isPublic fields
    let visibility: 'public' | 'private' = 'public' // Default to public
    if (params.visibility) {
      visibility = params.visibility
    } else if (params.isPublic !== undefined) {
      visibility = params.isPublic ? 'public' : 'private'
    }
    
    // Smart defaults for participants
    let participants: Address[] = params.participants ?? []
    
    // If no participants provided, create a channel with just the creator
    if (participants.length === 0) {
      participants = [signer.address]
    }
    
    // Validate participants array length to prevent INPUT_TOO_LONG error
    if (participants.length > 10) {
      throw new Error(`Too many participants (${participants.length}). Maximum allowed: 10`)
    }
    
    // Generate a unique channel ID as string (matching smart contract expectation)
    const channelId = `channel_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const channelAddress = await this.deriveChannelPda(signer.address, channelId)
    
    // Map visibility to channel type
    let channelType: ChannelType = visibility === 'private' ? ChannelType.Private : ChannelType.Public
    
    // Override with explicit channel type if provided
    if (params.channelType !== undefined) {
      channelType = params.channelType
    }
    
    console.log('🔍 Debug - Channel creation params:')
    console.log(`   Channel ID: ${channelId}`)
    console.log(`   Visibility: ${visibility}`)
    console.log(`   Participants: ${participants.length}`)
    console.log(`   Channel Type: ${channelType}`)
    
    const instruction = getCreateChannelInstruction({
      channel: channelAddress,
      creator: signer as unknown as TransactionSigner,
      channelId: BigInt(channelId.replace(/[^0-9]/g, '') || Date.now()), // Extract numeric part for generated instruction
      participants,
      channelType,
      isPrivate: visibility === 'private'
    })
    
    const signature = await this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
    
    return { channelId: channelAddress, signature }
  }

  /**
   * Send a message to a channel (supports both object params and string content)
   */
  async sendMessage(
    signer: KeyPairSigner,
    channelAddress: Address,
    contentOrParams: string | SendChannelMessageParams,
    _metadata?: unknown  // For backward compatibility with beta test
  ): Promise<string> {
    // For backward compatibility - metadata parameter is ignored but accepted
    void _metadata;
    
    // Handle both string content and object params
    let params: SendChannelMessageParams
    if (typeof contentOrParams === 'string') {
      params = {
        channelId: channelAddress, // Will be ignored, using channelAddress directly
        content: contentOrParams,
        messageType: 0, // Default to text message
        attachments: []
      }
    } else {
      params = contentOrParams
    }
    
    // First, fetch the channel to get current message count
    const channel = await this.getChannel(channelAddress)
    if (!channel) {
      throw new Error('Channel not found')
    }
    
    // Use the current message count as the message ID (smart contract uses this for PDA)
    const messageCount = Number(channel.messageCount ?? 0)
    const messageCountBytes = new Uint8Array(8)
    const dataView = new DataView(messageCountBytes.buffer)
    dataView.setBigUint64(0, BigInt(messageCount), true) // little-endian as per smart contract
    
    // Derive message PDA using the same seeds as the smart contract
    const messagePda = await getProgramDerivedAddress({
      programAddress: this.config.programId!,
      seeds: [
        new TextEncoder().encode('message'),
        getAddressEncoder().encode(channelAddress),
        messageCountBytes // Use message count bytes, not a string ID
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
    const { getProgramDerivedAddress, getAddressEncoder } = await import('@solana/kit')
    
    // Convert string channel ID to u64 little-endian bytes
    const channelIdNumber = BigInt(channelId.replace(/[^0-9]/g, '') || Date.now())
    const channelIdBytes = new Uint8Array(8)
    const dataView = new DataView(channelIdBytes.buffer)
    dataView.setBigUint64(0, channelIdNumber, true) // little-endian
    
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        new TextEncoder().encode('channel'),
        getAddressEncoder().encode(creator),
        channelIdBytes
      ]
    })
    
    return pda
  }
}