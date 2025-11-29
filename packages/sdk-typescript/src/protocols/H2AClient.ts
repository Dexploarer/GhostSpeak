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
import { pipe } from '@solana/functional'
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
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

export enum ParticipantType {
  Human = 'Human',
  Agent = 'Agent'
}

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
    throw new Error(
      'H2A createSession not yet implemented. ' +
      'Requires IDL regeneration to include create_communication_session instruction. ' +
      'Run: bun run codama'
    )

    // TODO: Implementation will look like:
    // const instruction = await getCreateCommunicationSessionInstructionAsync({
    //   creator: this.wallet,
    //   sessionId: BigInt(Date.now()),
    //   initiator: this.wallet.address,
    //   initiatorType: ParticipantType.Human,
    //   responder: config.agentAddress,
    //   responderType: ParticipantType.Agent,
    //   sessionType: config.sessionType,
    //   metadata: config.metadata ?? '',
    //   expiresAt: BigInt(Math.floor(Date.now() / 1000) + (config.expiresIn ?? 3600))
    // })
    // return await this.sendTransaction([instruction])
  }

  /**
   * Send a service request to an agent
   *
   * Sends a work request to an agent with optional payment commitment.
   *
   * @param request - Service request parameters
   * @returns Transaction signature
   *
   * @throws {Error} Currently not implemented - requires IDL regeneration
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
    throw new Error(
      'H2A sendServiceRequest not yet implemented. ' +
      'Requires IDL regeneration to include send_communication_message instruction. ' +
      'Run: bun run codama'
    )

    // TODO: Implementation will look like:
    // const instruction = getSendCommunicationMessageInstruction({
    //   message: await this.deriveMessageAddress(request.sessionAddress),
    //   session: request.sessionAddress,
    //   sender: this.wallet,
    //   messageId: BigInt(Date.now()),
    //   senderType: ParticipantType.Human,
    //   content: request.content,
    //   messageType: request.messageType ?? 'service_request',
    //   attachments: request.attachments ?? []
    // })
    // return await this.sendTransaction([instruction])
  }

  /**
   * Send a message in an existing session
   *
   * Sends a message to an agent with support for file attachments.
   *
   * @param params - Message parameters
   * @returns Transaction signature
   *
   * @throws {Error} Currently not implemented - requires IDL regeneration
   */
  async sendMessage(params: H2AMessageParams): Promise<Signature> {
    throw new Error(
      'H2A sendMessage not yet implemented. ' +
      'Requires IDL regeneration to include send_communication_message instruction. ' +
      'Run: bun run codama'
    )
  }

  /**
   * Get session details
   *
   * @param sessionAddress - Session PDA address
   * @throws {Error} Currently not implemented - requires IDL regeneration
   */
  async getSession(sessionAddress: Address): Promise<unknown> {
    throw new Error(
      'H2A getSession not yet implemented. ' +
      'Requires IDL regeneration to include CommunicationSession account decoder. ' +
      'Run: bun run codama'
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
