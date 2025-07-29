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
  type Channel,
  type Message,
  type ChannelType,
  type MessageType
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
        systemProgram: this.systemProgramId,
        channelName: params.name,
        description: params.description,
        channelType: params.channelType,
        isPrivate: params.isPrivate ?? false,
        maxMembers: params.maxMembers ?? 1000
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
    replyTo?: bigint
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
        content: params.content,
        messageType: params.messageType,
        attachmentUri: params.attachmentUri,
        replyTo: params.replyTo
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
        systemProgram: this.systemProgramId
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
        user: signer,
        systemProgram: this.systemProgramId
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
        systemProgram: this.systemProgramId
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
        message: messageAddress,
        reentrancyGuard: this.systemProgramId,
        user: signer,
        reactionData: emoji
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
        offset: 8, // Skip discriminator
        bytes: creator
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
        offset: 8, // Skip discriminator
        bytes: channelAddress
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

  private get systemProgramId(): Address {
    return '11111111111111111111111111111111' as Address
  }
}