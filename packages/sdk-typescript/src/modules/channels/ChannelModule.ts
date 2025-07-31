import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateEnhancedChannelInstructionAsync,
  getSendEnhancedMessageInstructionAsync,
  getJoinChannelInstruction,
  getLeaveChannelInstruction,
  getUpdateChannelSettingsInstruction,
  getAddMessageReactionInstruction,
  MessageType,
  type Channel,
  type Message,
  type ChannelType
} from '../../generated/index.js'

/**
 * Channel and messaging module with simplified API
 */
export class ChannelModule extends BaseModule {
  /**
   * Create a new channel
   */
  async create(params: {
    signer: TransactionSigner
    name: string
    description: string
    channelType: ChannelType
    isPrivate?: boolean
    maxMembers?: number
  }): Promise<string> {
    const channelAddress = this.deriveChannelPda(params.name)
    
    return this.execute(
      'createEnhancedChannel',
      () => getCreateEnhancedChannelInstructionAsync({
        channel: channelAddress,
        reentrancyGuard: this.systemProgramId,
        creator: params.signer,
        creatorAgent: params.signer.address,
        systemProgram: this.systemProgramId,
        channelId: params.name,
        participants: [params.signer.address],
        channelType: params.channelType,
        metadata: {
          name: params.name,
          description: params.description,
          avatarUrl: null,
          tags: [],
          settings: {
            allowFileSharing: true,
            allowExternalInvites: !params.isPrivate,
            messageRetentionDays: 30,
            maxMessageSize: 4096,
            requireEncryption: params.isPrivate ?? false,
            autoArchiveAfterDays: 365
          }
        }
      }),
      [params.signer]
    )
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(params: {
    signer: TransactionSigner
    channelAddress: Address
    content: string
    messageType?: MessageType
    attachmentUri?: string
    replyTo?: Address
  }): Promise<string> {
    const messageAddress = this.deriveMessagePda(params.channelAddress, Date.now())
    
    return this.execute(
      'sendEnhancedMessage',
      () => getSendEnhancedMessageInstructionAsync({
        channel: params.channelAddress,
        message: messageAddress,
        reentrancyGuard: this.systemProgramId,
        sender: params.signer,
        systemProgram: this.systemProgramId,
        messageId: `msg_${Date.now()}`,
        content: params.content,
        messageType: params.messageType ?? MessageType.Text,
        metadata: {
          replyTo: params.replyTo ?? null,
          threadId: null,
          attachments: params.attachmentUri ? [{ fileType: 'application/octet-stream', fileSize: 0, fileHash: '', storageUrl: params.attachmentUri }] : [],
          mentions: [],
          reactions: []
        },
        isEncrypted: false
      }),
      [params.signer]
    )
  }

  /**
   * Join a channel
   */
  async join(signer: TransactionSigner, channelAddress: Address): Promise<string> {
    return this.execute(
      'joinChannel',
      () => getJoinChannelInstruction({
        channel: channelAddress,
        reentrancyGuard: this.systemProgramId,
        user: signer,
        userAgent: signer.address
      }),
      [signer]
    )
  }

  /**
   * Leave a channel
   */
  async leave(signer: TransactionSigner, channelAddress: Address): Promise<string> {
    return this.execute(
      'leaveChannel',
      () => getLeaveChannelInstruction({
        channel: channelAddress,
        reentrancyGuard: this.systemProgramId,
        user: signer
      }),
      [signer]
    )
  }

  /**
   * Update channel settings
   */
  async updateSettings(
    signer: TransactionSigner,
    channelAddress: Address,
    settings: {
      name?: string
      description?: string
      isPrivate?: boolean
      maxMembers?: number
    }
  ): Promise<string> {
    return this.execute(
      'updateChannelSettings',
      () => getUpdateChannelSettingsInstruction({
        channel: channelAddress,
        reentrancyGuard: this.systemProgramId,
        authority: signer,
        newMetadata: {
          name: settings.name ?? null,
          description: settings.description ?? null,
          avatarUrl: null,
          tags: [],
          settings: {
            allowFileSharing: true,
            allowExternalInvites: !settings.isPrivate,
            messageRetentionDays: 30,
            maxMessageSize: settings.maxMembers ? Number(settings.maxMembers) : 4096,
            requireEncryption: settings.isPrivate ?? false,
            autoArchiveAfterDays: 365
          }
        }
      }),
      [signer]
    )
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    signer: TransactionSigner,
    messageAddress: Address,
    emoji: string
  ): Promise<string> {
    return this.execute(
      'addMessageReaction',
      () => getAddMessageReactionInstruction({
        channel: this.deriveChannelFromMessage(messageAddress),
        message: messageAddress,
        reentrancyGuard: this.systemProgramId,
        user: signer,
        reaction: emoji
      }),
      [signer]
    )
  }

  /**
   * Get channel account
   */
  async getChannelAccount(address: Address): Promise<Channel | null> {
    return super.getAccount<Channel>(address, 'getChannelDecoder')
  }

  /**
   * Get message account
   */
  async getMessageAccount(address: Address): Promise<Message | null> {
    return super.getAccount<Message>(address, 'getMessageDecoder')
  }

  /**
   * Get all channels
   */
  async getAllChannels(): Promise<{ address: Address; data: Channel }[]> {
    return this.getProgramAccounts<Channel>('getChannelDecoder')
  }

  /**
   * Get public channels
   */
  async getPublicChannels(): Promise<{ address: Address; data: Channel }[]> {
    const channels = await this.getAllChannels()
    return channels.filter(({ data }) => !data.isPrivate)
  }

  /**
   * Get channels by creator
   */
  async getChannelsByCreator(creator: Address): Promise<{ address: Address; data: Channel }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: creator as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<Channel>('getChannelDecoder', filters)
  }

  /**
   * Get messages in channel
   */
  async getChannelMessages(channelAddress: Address): Promise<{ address: Address; data: Message }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: channelAddress as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<Message>('getMessageDecoder', filters)
  }

  // Helper methods

  private deriveChannelPda(name: string): Address {
    // Implementation would derive PDA
    return `channel_${name}` as Address
  }

  private deriveMessagePda(channel: Address, nonce: number): Address {
    // Implementation would derive PDA
    return `message_${channel}_${nonce}` as Address
  }

  private deriveChannelFromMessage(messageAddress: Address): Address {
    // Implementation would derive channel from message
    return `channel_from_${messageAddress}` as Address
  }

  private get systemProgramId(): Address {
    return '11111111111111111111111111111111' as Address
  }
}