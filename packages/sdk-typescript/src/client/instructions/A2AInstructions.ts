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
    messageAddress: Address,
    sessionAddress: Address,
    params: SendA2AMessageParams
  ): Promise<string> {
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
    console.log('Closing A2A session:', sessionAddress)
    throw new Error('A2A session closing not yet implemented - waiting for Codama generation')
  }

  /**
   * Get A2A session information
   */
  async getSession(sessionAddress: Address): Promise<A2ASession | null> {
    // TODO: Implement proper RPC integration
    return null
  }

  /**
   * Get all messages in an A2A session
   */
  async getMessages(sessionAddress: Address): Promise<A2AMessage[]> {
    console.log('Fetching A2A messages:', sessionAddress)
    throw new Error('A2A message fetching not yet implemented - waiting for Codama generation')
  }

  /**
   * Get all active sessions for an agent
   */
  async getActiveSessions(agentAddress: Address): Promise<A2ASession[]> {
    console.log('Fetching active A2A sessions for agent:', agentAddress)
    throw new Error('Active A2A session fetching not yet implemented - waiting for Codama generation')
  }

  /**
   * Subscribe to new messages in a session (real-time)
   */
  async subscribeToMessages(
    sessionAddress: Address,
    callback: (message: A2AMessage) => void
  ): Promise<() => void> {
    console.log('Subscribing to A2A messages:', sessionAddress)
    throw new Error('A2A message subscription not yet implemented - waiting for Codama generation')
  }
}