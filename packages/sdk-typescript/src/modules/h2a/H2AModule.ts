/**
 * H2A (Human-to-Agent) Communication Module
 * 
 * Provides functionality for humans and agents to communicate directly,
 * enabling service requests, work orders, and collaborative interactions.
 */

import type { Address } from '@solana/addresses'
import type { Signature, KeyPairSigner } from '@solana/kit'
import { 
  ParticipantType,
  CommunicationSession,
  CommunicationMessage,
  ParticipantStatus,
  CreateCommunicationSessionParams,
  SendCommunicationMessageParams,
  UpdateParticipantStatusParams,
  Result,
  Transaction
} from '../../core/types.js'
import { BaseModule } from '../../core/BaseModule.js'
import { InstructionBuilder } from '../../core/InstructionBuilder.js'

/**
 * H2A Module providing human-agent communication functionality
 */
export class H2AModule extends BaseModule {
  /**
   * Create a new communication session between humans and/or agents
   */
  async createSession(params: CreateCommunicationSessionParams): Promise<Result<CommunicationSession>> {
    try {
      const instructionBuilder = new InstructionBuilder(this.client)
      
      // Build the create communication session instruction
      const instruction = await instructionBuilder.createCommunicationSession({
        sessionId: params.sessionId,
        initiator: params.initiator,
        initiatorType: params.initiatorType,
        responder: params.responder,
        responderType: params.responderType,
        sessionType: params.sessionType,
        metadata: params.metadata,
        expiresAt: params.expiresAt,
      })

      const signature = await this.client.sendTransaction(instruction)
      
      // Return the created session
      const session: CommunicationSession = {
        sessionId: params.sessionId,
        initiator: params.initiator,
        initiatorType: params.initiatorType,
        responder: params.responder,
        responderType: params.responderType,
        sessionType: params.sessionType,
        metadata: params.metadata,
        isActive: true,
        createdAt: BigInt(Date.now()),
        expiresAt: params.expiresAt
      }

      return {
        success: true,
        data: session,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_SESSION_CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create communication session',
          details: { error }
        }
      }
    }
  }

  /**
   * Send a message in a communication session
   */
  async sendMessage(
    sessionAddress: Address,
    params: SendCommunicationMessageParams
  ): Promise<Result<CommunicationMessage>> {
    try {
      const instructionBuilder = new InstructionBuilder(this.client)
      
      // Build the send communication message instruction
      const instruction = await instructionBuilder.sendCommunicationMessage(sessionAddress, {
        messageId: params.messageId,
        senderType: params.senderType,
        content: params.content,
        messageType: params.messageType,
        attachments: params.attachments || [],
      })

      const signature = await this.client.sendTransaction(instruction)
      
      // Return the sent message
      const message: CommunicationMessage = {
        messageId: params.messageId,
        session: sessionAddress,
        sender: this.client.wallet.address,
        senderType: params.senderType,
        content: params.content,
        messageType: params.messageType,
        attachments: params.attachments || [],
        sentAt: BigInt(Date.now())
      }

      return {
        success: true,
        data: message,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_MESSAGE_SEND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send communication message',
          details: { error }
        }
      }
    }
  }

  /**
   * Update participant status for service discovery
   */
  async updateStatus(params: UpdateParticipantStatusParams): Promise<Result<ParticipantStatus>> {
    try {
      const instructionBuilder = new InstructionBuilder(this.client)
      
      // Build the update participant status instruction
      const instruction = await instructionBuilder.updateParticipantStatus({
        participant: params.participant,
        participantType: params.participantType,
        servicesOffered: params.servicesOffered,
        availability: params.availability,
        reputationScore: params.reputationScore,
      })

      const signature = await this.client.sendTransaction(instruction)
      
      // Return the updated status
      const status: ParticipantStatus = {
        participant: params.participant,
        participantType: params.participantType,
        servicesOffered: params.servicesOffered,
        availability: params.availability,
        reputationScore: params.reputationScore,
        lastUpdated: BigInt(Date.now())
      }

      return {
        success: true,
        data: status,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_STATUS_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update participant status',
          details: { error }
        }
      }
    }
  }

  /**
   * Get all active communication sessions for a participant
   */
  async getSessions(participant: Address): Promise<Result<CommunicationSession[]>> {
    try {
      // Query blockchain for sessions where participant is initiator or responder
      const sessions = await this.client.rpc.getProgramAccounts(this.client.programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: participant.toString(),
            },
          },
        ],
        encoding: 'base64',
      })

      // Parse and filter active sessions
      const activeSessions: CommunicationSession[] = []
      // TODO: Parse session account data and convert to CommunicationSession objects
      
      return {
        success: true,
        data: activeSessions,
        signature: '' as Signature, // Not applicable for queries
        explorer: ''
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_SESSIONS_QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to query communication sessions',
          details: { error }
        }
      }
    }
  }

  /**
   * Get messages in a communication session
   */
  async getMessages(sessionAddress: Address): Promise<Result<CommunicationMessage[]>> {
    try {
      // Query blockchain for messages in this session
      const messages = await this.client.rpc.getProgramAccounts(this.client.programId, {
        filters: [
          {
            memcmp: {
              offset: 16, // Skip discriminator + message_id
              bytes: sessionAddress.toString(),
            },
          },
        ],
        encoding: 'base64',
      })

      // Parse messages
      const parsedMessages: CommunicationMessage[] = []
      // TODO: Parse message account data and convert to CommunicationMessage objects
      
      return {
        success: true,
        data: parsedMessages,
        signature: '' as Signature, // Not applicable for queries
        explorer: ''
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_MESSAGES_QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to query communication messages',
          details: { error }
        }
      }
    }
  }

  /**
   * Find available service providers by service type
   */
  async findProviders(serviceType: string, participantType?: ParticipantType): Promise<Result<ParticipantStatus[]>> {
    try {
      // Query blockchain for participant status accounts
      const statusAccounts = await this.client.rpc.getProgramAccounts(this.client.programId, {
        filters: [
          // Add filters for participant type if specified
          // Add filters for service type
        ],
        encoding: 'base64',
      })

      // Parse and filter providers
      const providers: ParticipantStatus[] = []
      // TODO: Parse status account data and filter by service type
      
      return {
        success: true,
        data: providers,
        signature: '' as Signature, // Not applicable for queries
        explorer: ''
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'H2A_PROVIDERS_QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to query service providers',
          details: { error }
        }
      }
    }
  }

  /**
   * Convenience method: Human hiring an agent
   */
  async humanHireAgent(
    agentAddress: Address,
    serviceType: string,
    requirements: string,
    budget?: bigint
  ): Promise<Result<CommunicationSession>> {
    const sessionId = BigInt(Date.now())
    const expiresAt = BigInt(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    return this.createSession({
      sessionId,
      initiator: this.client.wallet.address,
      initiatorType: ParticipantType.Human,
      responder: agentAddress,
      responderType: ParticipantType.Agent,
      sessionType: 'service_request',
      metadata: JSON.stringify({
        serviceType,
        requirements,
        budget: budget?.toString(),
        timestamp: Date.now()
      }),
      expiresAt
    })
  }

  /**
   * Convenience method: Agent responding to work request
   */
  async agentRespond(
    sessionAddress: Address,
    response: string,
    proposedPrice?: bigint,
    deliveryTime?: bigint
  ): Promise<Result<CommunicationMessage>> {
    const messageId = BigInt(Date.now())

    return this.sendMessage(sessionAddress, {
      messageId,
      senderType: ParticipantType.Agent,
      content: response,
      messageType: 'service_response',
      attachments: proposedPrice ? [JSON.stringify({
        proposedPrice: proposedPrice.toString(),
        deliveryTime: deliveryTime?.toString(),
        timestamp: Date.now()
      })] : []
    })
  }
}