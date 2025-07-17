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
  fetchA2ASession,
  fetchA2AMessage,
  type A2ASession,
  type A2AMessage
} from '../../generated/index.js'
import { deriveA2AMessagePda } from '../../utils/pda.js'
import { BaseInstructions } from './BaseInstructions.js'

// Parameters for A2A session creation
export interface CreateA2ASessionParams {
  sessionId: bigint
  initiator: Address
  responder: Address
  sessionType: string
  metadata: string
  expiresAt: bigint
}

// Parameters for A2A message sending
export interface SendA2AMessageParams {
  messageId: bigint
  sessionId: bigint
  sender: Address
  content: string
  messageType: string
  timestamp: bigint
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
    signer: KeyPairSigner,
    sessionAddress: Address,
    params: CreateA2ASessionParams
  ): Promise<string> {
    const instruction = getCreateA2aSessionInstruction({
      session: sessionAddress,
      creator: signer as unknown as TransactionSigner,
      sessionId: params.sessionId,
      initiator: params.initiator,
      responder: params.responder,
      sessionType: params.sessionType,
      metadata: params.metadata,
      expiresAt: params.expiresAt
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Send a message in an A2A session
   */
  async sendMessage(
    signer: KeyPairSigner,
    sessionAddress: Address,
    params: SendA2AMessageParams
  ): Promise<string> {
    // Fetch the session to get the createdAt timestamp for PDA derivation
    const session = await this.getSession(sessionAddress)
    if (!session) {
      throw new Error('Session not found')
    }

    // Derive the message address using the session's createdAt timestamp
    const messageAddress = await deriveA2AMessagePda(
      this.programId,
      sessionAddress,
      session.createdAt
    )

    const instruction = getSendA2aMessageInstruction({
      message: messageAddress,
      session: sessionAddress,
      sender: signer as unknown as TransactionSigner,
      messageId: params.messageId,
      sessionId: params.sessionId,
      senderArg: params.sender, // Renamed to avoid conflict
      content: params.content,
      messageType: params.messageType,
      timestamp: params.timestamp
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
  }

  /**
   * Update A2A status
   */
  async updateStatus(
    signer: KeyPairSigner,
    statusAddress: Address,
    sessionAddress: Address,
    statusId: bigint,
    agent: Address,
    status: string,
    capabilities: string[],
    availability: boolean,
    lastUpdated: bigint
  ): Promise<string> {
    const instruction = getUpdateA2aStatusInstruction({
      status: statusAddress,
      session: sessionAddress,
      updater: signer as unknown as TransactionSigner,
      statusId,
      agent,
      statusArg: status, // Renamed to avoid conflict
      capabilities,
      availability,
      lastUpdated
    })
    
    return this.sendTransaction([instruction as unknown as IInstruction], [signer as unknown as TransactionSigner])
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
      signer,
      sessionAddress, // Using session address as status address for simplicity
      sessionAddress,
      session.sessionId,
      signer.address as Address,
      'closed',
      [],
      false, // Set availability to false
      BigInt(Math.floor(Date.now() / 1000))
    )
  }

  /**
   * Get A2A session information
   */
  async getSession(sessionAddress: Address): Promise<A2ASession | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getA2ASessionDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      const session = await rpcClient.getAndDecodeAccount(
        sessionAddress,
        getA2ASessionDecoder(),
        this.commitment
      )
      
      return session
    } catch (error) {
      console.warn('Failed to fetch A2A session:', error)
      return null
    }
  }

  /**
   * Get all messages in an A2A session
   */
  async getMessages(sessionAddress: Address): Promise<A2AMessage[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getA2AMessageDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all A2A message accounts filtering by session
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getA2AMessageDecoder(),
        [], // No RPC filters - filtering client-side for session
        this.commitment
      )
      
      // Filter messages for this specific session
      const sessionMessages = accounts
        .map(({ data }) => data)
        .filter(message => message.session === sessionAddress)
        .sort((a, b) => Number(a.sentAt - b.sentAt)) // Sort by timestamp
      
      return sessionMessages
    } catch (error) {
      console.warn('Failed to fetch A2A messages:', error)
      return []
    }
  }

  /**
   * Get all active sessions for an agent
   */
  async getActiveSessions(agentAddress: Address): Promise<A2ASession[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const { getA2ASessionDecoder } = await import('../../generated/index.js')
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      
      // Get all A2A session accounts
      const accounts = await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        getA2ASessionDecoder(),
        [], // No RPC filters - filtering client-side
        this.commitment
      )
      
      // Filter sessions where agent is either initiator or responder and session is active
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const activeSessions = accounts
        .map(({ data }) => data)
        .filter(session => 
          (session.initiator === agentAddress || session.responder === agentAddress) &&
          session.isActive &&
          (session.expiresAt === 0n || session.expiresAt > currentTimestamp)
        )
      
      return activeSessions
    } catch (error) {
      console.warn('Failed to fetch active A2A sessions:', error)
      return []
    }
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