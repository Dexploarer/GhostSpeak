import '../../utils/text-encoder-polyfill.js'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { getProgramDerivedAddress, getAddressEncoder } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { 
  GhostSpeakConfig,
  ResolvedMessageContent,
  AttachmentUploadResult
} from '../../types/index.js'
import { isIPFSReference } from '../../types/index.js'
import type { IPFSConfig } from '../../types/ipfs-types.js'
import {
  getCreateChannelInstruction,
  getSendMessageInstruction,
  type Channel,
  ChannelType,
  type MessageType
} from '../../generated/index.js'
import { BaseInstructions } from './BaseInstructions.js'
import { createIPFSUtils } from '../../utils/ipfs-utils.js'

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
  /** IPFS configuration for large message content */
  ipfsConfig?: IPFSConfig
  /** Force IPFS storage even for small messages */
  forceIPFS?: boolean
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
  private ipfsUtils: ReturnType<typeof createIPFSUtils> | null = null

  constructor(config: GhostSpeakConfig & { ipfsConfig?: IPFSConfig }) {
    super(config)
    
    // Initialize IPFS utils if configuration is provided
    if (config.ipfsConfig) {
      this.ipfsUtils = createIPFSUtils(config.ipfsConfig)
    }
  }

  /**
   * Configure IPFS for large message content storage
   */
  configureIPFS(ipfsConfig: IPFSConfig): void {
    this.ipfsUtils = createIPFSUtils(ipfsConfig)
  }

  /**
   * Create a new communication channel with smart defaults
   */
  async create(
    signer: TransactionSigner,
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
      channelId: BigInt(channelId.replace(/[^0-9]/g, '') ?? Date.now()), // Extract numeric part for generated instruction
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
    signer: TransactionSigner,
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

    // Handle large message content with IPFS
    let finalContent = params.content
    const ipfsUtils = params.ipfsConfig ? createIPFSUtils(params.ipfsConfig) : this.ipfsUtils
    
    try {
      // Check if content should be stored on IPFS
      const contentSize = new TextEncoder().encode(params.content).length
      const shouldUseIpfs = params.forceIPFS ?? contentSize > 500 // Lower threshold for messages
      
      if (shouldUseIpfs && ipfsUtils) {
        console.log(`📤 Storing large message content (${contentSize} bytes) on IPFS...`)
        
        const messageData = {
          content: params.content,
          messageType: params.messageType ?? 0,
          attachments: params.attachments ?? [],
          channelId: channelAddress,
          sender: signer.address,
          timestamp: new Date().toISOString()
        }

        const storageResult = await ipfsUtils.storeChannelMessage(messageData, {
          filename: `message-${Date.now()}.json`
        })

        if (storageResult.useIpfs && storageResult.ipfsMetadata) {
          // Replace content with IPFS reference
          finalContent = JSON.stringify({
            type: 'ipfs_reference',
            ipfsHash: storageResult.ipfsMetadata.ipfsHash,
            ipfsUri: storageResult.uri,
            originalSize: storageResult.size,
            contentPreview: params.content.substring(0, 100) + (params.content.length > 100 ? '...' : ''),
            uploadedAt: storageResult.ipfsMetadata.uploadedAt
          })
          
          console.log(`🌐 Message content stored on IPFS: ${storageResult.ipfsMetadata.ipfsHash}`)
        }
      }
    } catch (ipfsError) {
      console.warn(`⚠️ IPFS storage failed for message, using original content:`, ipfsError instanceof Error ? ipfsError.message : String(ipfsError))
      // Continue with original content
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
      content: finalContent, // Use processed content (may include IPFS reference)
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
   * Resolve message content from IPFS if needed
   */
  async resolveMessageContent(content: string): Promise<ResolvedMessageContent> {
    try {
      // Check if content is an IPFS reference
      const parsedContent: unknown = JSON.parse(content)
      
      if (isIPFSReference(parsedContent)) {
        if (!this.ipfsUtils) {
          throw new Error('IPFS utils not configured but message requires IPFS retrieval')
        }

        console.log(`📥 Retrieving message content from IPFS: ${parsedContent.ipfsHash}`)
        
        const messageData = await this.ipfsUtils.retrieveChannelMessage(parsedContent.ipfsUri)
        
        return {
          resolvedContent: messageData.content,
          isIPFS: true,
          metadata: {
            ipfsHash: parsedContent.ipfsHash,
            originalSize: parsedContent.originalSize,
            contentPreview: parsedContent.contentPreview,
            uploadedAt: parsedContent.uploadedAt
          }
        }
      }
    } catch (error) {
      // Content is not JSON or not an IPFS reference, treat as regular content
      void error;
    }

    return {
      resolvedContent: content,
      isIPFS: false
    }
  }

  /**
   * Send a message with file attachments via IPFS
   */
  async sendMessageWithAttachments(
    signer: TransactionSigner,
    channelAddress: Address,
    content: string,
    attachments: {
      filename: string
      content: Uint8Array | string
      contentType: string
    }[],
    options?: {
      messageType?: MessageType
      ipfsConfig?: IPFSConfig
    }
  ): Promise<string> {
    const ipfsUtils = options?.ipfsConfig ? createIPFSUtils(options.ipfsConfig) : this.ipfsUtils
    
    if (!ipfsUtils) {
      throw new Error('IPFS configuration required for file attachments')
    }

    console.log(`📎 Uploading ${attachments.length} attachments to IPFS...`)

    // Upload attachments to IPFS
    const attachmentResults = await Promise.allSettled(
      attachments.map(async (attachment) => {
        const result = await ipfsUtils.storeFileAttachment(
          attachment.content,
          attachment.filename,
          attachment.contentType
        )
        return {
          filename: attachment.filename,
          contentType: attachment.contentType,
          ipfsHash: result.ipfsMetadata?.ipfsHash ?? '',
          ipfsUri: result.uri,
          size: result.size
        }
      })
    )

    const successfulAttachments = attachmentResults
      .filter((result): result is PromiseFulfilledResult<AttachmentUploadResult> => result.status === 'fulfilled')
      .map(result => result.value)

    const failedCount = attachmentResults.length - successfulAttachments.length
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} attachments failed to upload`)
    }

    // Send message with attachment references
    return this.sendMessage(signer, channelAddress, {
      channelId: channelAddress,
      content,
      messageType: options?.messageType ?? 0,
      attachments: successfulAttachments.map(att => att.ipfsUri),
      ipfsConfig: options?.ipfsConfig,
      forceIPFS: true // Force IPFS for messages with attachments
    })
  }

  /**
   * Derive channel PDA
   */
  private async deriveChannelPda(creator: Address, channelId: string): Promise<Address> {
    const { getProgramDerivedAddress, getAddressEncoder } = await import('@solana/kit')
    
    // Convert string channel ID to u64 little-endian bytes
    const channelIdNumber = BigInt(channelId.replace(/[^0-9]/g, '') ?? Date.now())
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