import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'
import type { KeyPairSigner } from '../GhostSpeakClient.js'
import type { 
  GhostSpeakConfig
} from '../../types/index.js'
import {
  getCreateA2aSessionInstruction,
  getSendA2aMessageInstruction,
  getUpdateA2aStatusInstruction,
  type A2ASession,
  type A2AMessage
} from '../../generated/index.js'
import { deriveA2AMessagePda } from '../../utils/pda.js'
import { BaseInstructions } from './BaseInstructions.js'
import type {
  BaseInstructionParams,
  BaseTimeParams
} from './BaseInterfaces.js'

// Parameters for A2A session creation
export interface CreateA2ASessionParams extends BaseInstructionParams, BaseTimeParams {
  sessionId: bigint
  initiator: Address
  responder: Address
  sessionType: string
  metadata: string
  expiresAt: bigint
}

// Parameters for A2A message sending
export interface SendA2AMessageParams extends BaseInstructionParams {
  messageId: bigint
  sessionId: bigint
  sender: Address
  content: string
  messageType: string
  timestamp: bigint
}

// Parameters for A2A status update
export interface UpdateA2AStatusParams extends BaseInstructionParams {
  sessionAddress: Address
  statusId: bigint
  agent: Address
  status: string
  capabilities: string[]
  availability: boolean
  lastUpdated: bigint
}

/**
 * Instructions for Agent-to-Agent (A2A) communication
 */
export class A2AInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  /**
   * Create a new A2A communication session
   */
  async createSession(
    sessionAddress: Address,
    params: CreateA2ASessionParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getCreateA2aSessionInstruction({
        session: sessionAddress,
        creator: params.signer as unknown as TransactionSigner,
        sessionId: params.sessionId,
        initiator: params.initiator,
        responder: params.responder,
        sessionType: params.sessionType,
        metadata: params.metadata,
        expiresAt: params.expiresAt
      }),
      params.signer as unknown as TransactionSigner,
      'A2A session creation'
    )
  }

  /**
   * Send a message in an A2A session
   */
  async sendMessage(
    sessionAddress: Address,
    params: SendA2AMessageParams
  ): Promise<string> {
    try {
      // Get session account data directly (bypassing decoder which is broken)
      const accountInfo = await this.rpc.getAccountInfo(sessionAddress, {
        commitment: 'confirmed',
        encoding: 'base64'
      }).send()
      
      if (!accountInfo.value) {
        throw new Error('Session account not found')
      }
      
      // Parse created_at timestamp from session account data (at offset 8)
      const sessionBuffer = Buffer.from(accountInfo.value.data[0], 'base64')
      const sessionCreatedAt = sessionBuffer.readBigInt64LE(8)

      // Derive the message address using the session's createdAt timestamp
      const messageAddress = await deriveA2AMessagePda(
        this.programId,
        sessionAddress,
        sessionCreatedAt
      )

      return this.executeInstruction(
        () => getSendA2aMessageInstruction({
          message: messageAddress,
          session: sessionAddress,
          sender: params.signer as unknown as TransactionSigner,
          messageId: params.messageId,
          sessionId: params.sessionId,
          senderArg: params.sender, // Renamed to avoid conflict
          content: params.content,
          messageType: params.messageType,
          timestamp: params.timestamp
        }),
        params.signer as unknown as TransactionSigner,
        'A2A message sending'
      )
    } catch (error) {
      console.error('❌ Failed to send A2A message:', error)
      throw error
    }
  }

  /**
   * Update A2A status
   */
  async updateStatus(
    statusAddress: Address,
    params: UpdateA2AStatusParams
  ): Promise<string> {
    return this.executeInstruction(
      () => getUpdateA2aStatusInstruction({
        status: statusAddress,
        session: params.sessionAddress,
        updater: params.signer as unknown as TransactionSigner,
        statusId: params.statusId,
        agent: params.agent,
        statusArg: params.status, // Renamed to avoid conflict
        capabilities: params.capabilities,
        availability: params.availability,
        lastUpdated: params.lastUpdated
      }),
      params.signer as unknown as TransactionSigner,
      'A2A status update'
    )
  }

  /**
   * Close an A2A session
   */
  async closeSession(
    signer: KeyPairSigner,
    sessionAddress: Address
  ): Promise<string> {
    // Since there's no specific close instruction in the contract,
    // we can update the session status to mark it as inactive
    const session = await this.getSession(sessionAddress)
    if (!session) {
      throw new Error('Session not found')
    }
    
    // Update status to mark session as inactive
    return this.updateStatus(
      sessionAddress, // Using session address as status address for simplicity
      {
        signer,
        sessionAddress,
        statusId: session.sessionId,
        agent: signer.address as Address,
        status: 'closed',
        capabilities: [],
        availability: false, // Set availability to false
        lastUpdated: BigInt(Math.floor(Date.now() / 1000))
      }
    )
  }

  /**
   * Get A2A session information
   */
  async getSession(sessionAddress: Address): Promise<A2ASession | null> {
    return this.getDecodedAccount<A2ASession>(sessionAddress, 'getA2ASessionDecoder')
  }

  /**
   * Get all messages in an A2A session
   */
  async getMessages(sessionAddress: Address): Promise<A2AMessage[]> {
    const accounts = await this.getDecodedProgramAccounts<A2AMessage>('getA2AMessageDecoder')
    
    // Filter messages for this specific session
    return accounts
      .map(({ data }) => data)
      .filter(message => message.session === sessionAddress)
      .sort((a, b) => Number(a.sentAt - b.sentAt)) // Sort by timestamp
  }

  /**
   * Get all active sessions for an agent
   */
  async getActiveSessions(agentAddress: Address): Promise<A2ASession[]> {
    const accounts = await this.getDecodedProgramAccounts<A2ASession>('getA2ASessionDecoder')
    
    // Filter sessions where agent is either initiator or responder and session is active
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    return accounts
      .map(({ data }) => data)
      .filter(session => 
        (session.initiator === agentAddress || session.responder === agentAddress) &&
        session.isActive &&
        (session.expiresAt === 0n || session.expiresAt > currentTimestamp)
      )
  }

  /**
   * Subscribe to new messages in a session (real-time)
   */
  async subscribeToMessages(
    sessionAddress: Address,
    callback: (message: A2AMessage) => void
  ): Promise<() => void> {
    // WebSocket subscriptions would require additional setup
    // For now, implement polling as a fallback
    let isSubscribed = true
    let lastMessageCount = 0
    
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) {
        clearInterval(pollInterval)
        return
      }
      
      try {
        const messages = await this.getMessages(sessionAddress)
        
        // Check if new messages were added
        if (messages.length > lastMessageCount) {
          // Get only the new messages
          const newMessages = messages.slice(lastMessageCount)
          
          // Call the callback for each new message
          newMessages.forEach(message => callback(message))
          
          // Update the last message count
          lastMessageCount = messages.length
        }
      } catch (error) {
        console.warn('Error polling for A2A messages:', error)
      }
    }, 5000) // Poll every 5 seconds
    
    // Return unsubscribe function
    return () => {
      isSubscribed = false
      clearInterval(pollInterval)
    }
  }
}