/**
 * H2A (Human-to-Agent) Communication Client
 *
 * High-level SDK for human-to-agent communication on the GhostSpeak protocol.
 * Enables humans to hire agents, send service requests, and communicate with agents.
 *
 * @module protocols/H2AClient
 *
 * NOTE: This client currently requires IDL regeneration to include H2A instruction builders.
 * The Rust instructions exist in programs/src/instructions/h2a_protocol.rs but haven't
 * been generated to TypeScript yet. Run `bun run codama` to regenerate.
 */

import type { Address, Rpc, SolanaRpcApi, TransactionSigner, Signature } from '@solana/kit'
// Don't import conflicting local ParticipantType enum
import {
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction
} from '@solana/kit'
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../generated/programs/ghostspeakMarketplace.js'
import { getCreateCommunicationSessionInstructionAsync } from '../generated/instructions/createCommunicationSession.js'
import { getSendCommunicationMessageInstruction } from '../generated/instructions/sendCommunicationMessage.js'
import { getCommunicationSessionDataDecoder, type CommunicationSessionData } from '../generated/types/communicationSessionData.js'
import { ParticipantType } from '../generated/types/participantType.js' // Import generated Enum
import { EventEmitter } from 'node:events'
import { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder } from '@solana/kit'

// =====================================================
// TYPES
// =====================================================

export interface H2ASessionConfig {
  agentAddress: Address
  sessionType: string
  metadata?: string
  expiresIn?: number // Seconds from now (default: 3600 = 1 hour)
}

export interface H2AMessageParams {
  sessionAddress: Address
  content: string
  messageType?: string // Default: 'service_request'
  attachments?: string[] // IPFS URIs or file references
}

export interface H2AServiceRequest extends H2AMessageParams {
  paymentAmount?: bigint
  deadline?: number // Unix timestamp
}

export interface H2AClientOptions {
  rpcEndpoint: string
  programId?: Address
}

// =====================================================
// EVENTS
// =====================================================

export interface H2AEvent {
  type: 'session_created' | 'message_sent' | 'service_requested' | 'error'
  timestamp: number
  data?: unknown
  error?: string
}

// =====================================================
// H2A CLIENT
// =====================================================

/**
 * H2A Communication Client
 *
 * Provides high-level methods for human-to-agent communication:
 * - Create communication sessions with agents
 * - Send service requests to agents
 * - Send messages and receive updates
 * - Attach files and rich content
 *
 * @example
 * ```typescript
 * const h2aClient = new H2AClient({
 *   rpcEndpoint: 'https://api.devnet.solana.com'
 * }, humanWallet)
 *
 * // Create session with an agent
 * const session = await h2aClient.createSession({
 *   agentAddress: 'Agent123...',
 *   sessionType: 'data_analysis',
 *   metadata: 'Need financial data analysis'
 * })
 *
 * // Send service request
 * await h2aClient.sendServiceRequest({
 *   sessionAddress: session.address,
 *   content: 'Please analyze Q4 2024 revenue data',
 *   attachments: ['ipfs://QmDataset123'],
 *   paymentAmount: 5_000_000n, // 5 USDC
 *   deadline: Date.now() / 1000 + 86400 // 24 hours
 * })
 * ```
 */
export class H2AClient extends EventEmitter {
  private rpc: Rpc<SolanaRpcApi>
  private programId: Address
  private wallet: TransactionSigner

  constructor(options: H2AClientOptions, wallet: TransactionSigner) {
    super()
    this.rpc = createSolanaRpc(options.rpcEndpoint)
    this.programId = options.programId ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
    this.wallet = wallet
  }

  /**
   * Create a new communication session with an agent
   *
   * Establishes a communication channel between a human and an agent.
   *
   * @param config - Session configuration
   * @returns Session details including address
   *
   * @throws {Error} Currently not implemented - requires IDL regeneration
   *
   * @example
   * ```typescript
   * const session = await h2aClient.createSession({
   *   agentAddress: 'Agent123...',
   *   sessionType: 'content_writing',
   *   metadata: 'Blog post about AI agents',
   *   expiresIn: 7200 // 2 hours
   * })
   * ```
   */
  async createSession(config: H2ASessionConfig): Promise<{ address: Address; signature: Signature }> {
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + (config.expiresIn ?? 3600))
    const sessionId = BigInt(Date.now())
    
    // Explicitly cast to unknown first to avoid type overlap issues
    const initiator = this.wallet.address

    // Derive session PDA
    // Pattern: ['comm_session', creator]
    // We'll compute this inside getCreateCommunicationSessionInstructionAsync's default resolution
    // but the return type gives us the resolved account addresses.
    
    // We can also pre-calculate it if needed for the return value
    const [sessionAddress] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([99, 111, 109, 109, 95, 115, 101, 115, 115, 105, 111, 110])), // 'comm_session'
        getAddressEncoder().encode(initiator)
      ]
    })

    const instruction = await getCreateCommunicationSessionInstructionAsync({
      session: sessionAddress,
      creator: this.wallet,
      sessionId,
      initiator: initiator,
      initiatorType: ParticipantType.Human,
      responder: config.agentAddress,
      responderType: ParticipantType.Agent,
      sessionType: config.sessionType,
      metadata: config.metadata ?? '',
      expiresAt: expiresAt
    }, { programAddress: this.programId })

    const signature = await this.sendTransaction([instruction])

    // Emit event
    this.emit('session_created', {
      type: 'session_created',
      timestamp: Date.now(),
      data: {
        address: sessionAddress,
        signature,
        agent: config.agentAddress
      }
    } as H2AEvent)

    return { address: sessionAddress, signature }
  }

  /**
   * Send a service request to an agent
   *
   * Sends a work request to an agent with optional payment commitment.
   *
   * @param request - Service request parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * await h2aClient.sendServiceRequest({
   *   sessionAddress: session.address,
   *   content: 'Generate 10 social media posts about web3',
   *   messageType: 'service_request',
   *   attachments: ['ipfs://QmBrandGuidelines'],
   *   paymentAmount: 10_000_000n, // 10 USDC
   *   deadline: Date.now() / 1000 + 172800 // 48 hours
   * })
   * ```
   */
  async sendServiceRequest(request: H2AServiceRequest): Promise<Signature> {
    const messageId = BigInt(Date.now())
    
    // Derive message PDA
    // Pattern: ['communication_message', session, messageId]
    const messageIdBytes = new Uint8Array(8)
    const view = new DataView(messageIdBytes.buffer)
    view.setBigUint64(0, messageId, true) // Little-endian

    const [messageAddress] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([99, 111, 109, 109, 95, 109, 101, 115, 115, 97, 103, 101])), // 'comm_message'
        getAddressEncoder().encode(request.sessionAddress),
        getBytesEncoder().encode(messageIdBytes)
      ]
    })

    const instruction = getSendCommunicationMessageInstruction({
      message: messageAddress,
      session: request.sessionAddress,
      sender: this.wallet,
      messageId: messageId,
      senderType: ParticipantType.Human,
      content: request.content,
      messageType: request.messageType ?? 'service_request',
      attachments: request.attachments ?? []
    }, { programAddress: this.programId })

    const signature = await this.sendTransaction([instruction])

    this.emit('service_requested', {
      type: 'service_requested',
      timestamp: Date.now(),
      data: {
        messageAddress,
        sessionAddress: request.sessionAddress,
        signature
      }
    } as H2AEvent)

    return signature
  }

  /**
   * Send a message in an existing session
   *
   * Sends a message to an agent with support for file attachments.
   *
   * @param params - Message parameters
   * @returns Transaction signature
   */
  async sendMessage(params: H2AMessageParams): Promise<Signature> {
    const messageId = BigInt(Date.now())
    
    // Derive message PDA
    // Pattern: ['communication_message', session, messageId]
    const messageIdBytes = new Uint8Array(8)
    const view = new DataView(messageIdBytes.buffer)
    view.setBigUint64(0, messageId, true) // Little-endian

    const [messageAddress] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([99, 111, 109, 109, 95, 109, 101, 115, 115, 97, 103, 101])), // 'comm_message'
        getAddressEncoder().encode(params.sessionAddress),
        getBytesEncoder().encode(messageIdBytes)
      ]
    })

    const instruction = getSendCommunicationMessageInstruction({
      message: messageAddress,
      session: params.sessionAddress,
      sender: this.wallet,
      messageId: messageId,
      senderType: ParticipantType.Human,
      content: params.content,
      messageType: params.messageType ?? 'text',
      attachments: params.attachments ?? []
    }, { programAddress: this.programId })

    const signature = await this.sendTransaction([instruction])

    this.emit('message_sent', {
      type: 'message_sent',
      timestamp: Date.now(),
      data: {
        messageAddress,
        sessionAddress: params.sessionAddress,
        signature
      }
    } as H2AEvent)

    return signature
  }

  /**
   * Get session details
   *
   * @param sessionAddress - Session PDA address
   */
  async getSession(sessionAddress: Address): Promise<CommunicationSessionData> {
    const accountInfo = await this.rpc.getAccountInfo(sessionAddress, { encoding: 'base64' }).send()
    
    if (!accountInfo.value) {
      throw new Error(`Session account not found: ${sessionAddress}`)
    }

    const data = accountInfo.value.data
    // Decode data - assuming generated getCommunicationSessionDataDecoder exists
    // If not, we'd need to manually decode or use the generated decoder
    
    // For now, we'll return the decoded data using the generated decoder
    return getCommunicationSessionDataDecoder().decode(
      typeof data === 'string' 
        ? Uint8Array.from(Buffer.from(data, 'base64'))
        : new Uint8Array(data as unknown as ArrayBuffer)
    )
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async sendTransaction(instructions: readonly unknown[]): Promise<Signature> {
    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()

      // Build transaction message with proper type inference
      let message: unknown = createTransactionMessage({ version: 0 })
      message = setTransactionMessageFeePayer(this.wallet.address, message as ReturnType<typeof createTransactionMessage>)
      message = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[1])

      for (const ix of instructions) {
        message = appendTransactionMessageInstruction(ix as Parameters<typeof appendTransactionMessageInstruction>[0], message as Parameters<typeof appendTransactionMessageInstruction>[1])
      }

      const signedTransaction = await signTransactionMessageWithSigners(message as Parameters<typeof signTransactionMessageWithSigners>[0])

      const signatures = Object.values(signedTransaction.signatures)
      if (signatures.length === 0) {
        throw new Error('Transaction has no signatures')
      }

      const signature = signatures[0] as unknown as Signature

      const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
      await this.rpc.sendTransaction(wireTransaction).send()

      await this.confirmTransaction(signature)

      return signature
    } catch (error) {
      throw new Error(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async confirmTransaction(signature: Signature): Promise<void> {
    for (let i = 0; i < 30; i++) {
      const status = await this.rpc.getSignatureStatuses([signature]).send()
      if (
        status.value[0]?.confirmationStatus === 'confirmed' ||
        status.value[0]?.confirmationStatus === 'finalized'
      ) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new Error('Transaction confirmation timeout')
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create an H2A Client instance
 *
 * @param options - Client configuration
 * @param wallet - Transaction signer (human wallet)
 * @returns H2AClient instance
 */
export function createH2AClient(
  options: H2AClientOptions,
  wallet: TransactionSigner
): H2AClient {
  return new H2AClient(options, wallet)
}

// =====================================================
// EXPORTS
// =====================================================

export default H2AClient
