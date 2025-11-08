/**
 * A2A (Agent-to-Agent) Communication Client
 *
 * High-level SDK for agent-to-agent communication on the GhostSpeak protocol.
 * Enables agents to create sessions, send messages, and update status.
 *
 * @module protocols/A2AClient
 */

import type { Address, Rpc, SolanaRpcApi, TransactionSigner } from '@solana/kit'
import { pipe } from '@solana/functional'
import {
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  type Signature
} from '@solana/kit'
import { getCreateA2aSessionInstructionAsync } from '../generated/instructions/createA2aSession.js'
import { getSendA2aMessageInstruction } from '../generated/instructions/sendA2aMessage.js'
import { getUpdateA2aStatusInstruction } from '../generated/instructions/updateA2aStatus.js'
import { fetchA2ASession, fetchMaybeA2ASession, type A2ASession } from '../generated/accounts/a2ASession.js'
import { fetchA2AMessage, type A2AMessage } from '../generated/accounts/a2AMessage.js'
import { fetchA2AStatus, type A2AStatus } from '../generated/accounts/a2AStatus.js'
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../generated/programs/ghostspeakMarketplace.js'
import { address } from '@solana/addresses'
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

export interface A2ASessionConfig {
  responder: Address
  sessionType: string
  metadata?: string
  expiresIn?: number // Seconds from now (default: 3600 = 1 hour)
}

export interface A2AMessageParams {
  sessionAddress: Address
  content: string
  messageType?: string // Default: 'text'
}

export interface A2AStatusUpdate {
  status: string
  capabilities?: string[]
  availability?: boolean
}

export interface A2AClientOptions {
  rpcEndpoint: string
  programId?: Address
}

export interface A2ASessionDetails extends A2ASession {
  address: Address
}

// =====================================================
// EVENTS
// =====================================================

export interface A2AEvent {
  type: 'session_created' | 'message_sent' | 'status_updated' | 'error'
  timestamp: number
  data?: unknown
  error?: string
}

// =====================================================
// A2A CLIENT
// =====================================================

/**
 * A2A Communication Client
 *
 * Provides high-level methods for agent-to-agent communication:
 * - Create communication sessions
 * - Send messages between agents
 * - Update agent status
 * - Query session state
 *
 * @example
 * ```typescript
 * const a2aClient = new A2AClient({
 *   rpcEndpoint: 'https://api.devnet.solana.com',
 *   wallet
 * })
 *
 * // Create session with another agent
 * const session = await a2aClient.createSession({
 *   responder: otherAgentAddress,
 *   sessionType: 'collaboration',
 *   metadata: 'Working on data analysis task'
 * })
 *
 * // Send message
 * await a2aClient.sendMessage({
 *   sessionAddress: session.address,
 *   content: 'I have completed processing the dataset',
 *   messageType: 'update'
 * })
 *
 * // Update status
 * await a2aClient.updateStatus({
 *   status: 'available',
 *   capabilities: ['data_analysis', 'ml_inference'],
 *   availability: true
 * })
 * ```
 */
export class A2AClient extends EventEmitter {
  private rpc: Rpc<SolanaRpcApi>
  private programId: Address
  private wallet: TransactionSigner

  constructor(options: A2AClientOptions, wallet: TransactionSigner) {
    super()
    this.rpc = createSolanaRpc(options.rpcEndpoint)
    this.programId = options.programId ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
    this.wallet = wallet
  }

  /**
   * Create a new A2A communication session
   *
   * Establishes a secure communication channel between two agents.
   *
   * @param config - Session configuration
   * @returns Session details including address
   *
   * @example
   * ```typescript
   * const session = await a2aClient.createSession({
   *   responder: 'AgentBpubkey...',
   *   sessionType: 'data_processing',
   *   metadata: 'Processing financial data',
   *   expiresIn: 7200 // 2 hours
   * })
   * console.log('Session created:', session.address)
   * ```
   */
  async createSession(config: A2ASessionConfig): Promise<A2ASessionDetails> {
    try {
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = now + (config.expiresIn ?? 3600) // Default 1 hour

      // Generate unique session ID
      const sessionId = BigInt(Date.now())

      // Build instruction
      const instruction = await getCreateA2aSessionInstructionAsync({
        creator: this.wallet,
        sessionId,
        initiator: this.wallet.address,
        responder: config.responder,
        sessionType: config.sessionType,
        metadata: config.metadata ?? '',
        expiresAt: BigInt(expiresAt)
      }, { programAddress: this.programId })

      // Send transaction
      const signature = await this.sendTransaction([instruction])

      // Derive session address from PDA
      // Seeds: [b"a2a_session", creator.key()]
      const sessionAddress = instruction.accounts[0].address

      // Emit event
      this.emit('session_created', {
        type: 'session_created',
        timestamp: Date.now(),
        data: { sessionAddress, signature }
      } as A2AEvent)

      // Fetch and return session details
      const session = await fetchA2ASession(this.rpc, sessionAddress)

      return {
        ...session.data,
        address: sessionAddress
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: errorMessage
      } as A2AEvent)
      throw new Error(`Failed to create A2A session: ${errorMessage}`)
    }
  }

  /**
   * Send a message in an A2A session
   *
   * Sends structured messages between agents with automatic context management.
   *
   * @param params - Message parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * await a2aClient.sendMessage({
   *   sessionAddress: session.address,
   *   content: 'Processing complete. Results: {...}',
   *   messageType: 'result'
   * })
   * ```
   */
  async sendMessage(params: A2AMessageParams): Promise<Signature> {
    try {
      const messageId = BigInt(Date.now())
      const sessionId = BigInt(Date.now()) // This should ideally come from session
      const timestamp = BigInt(Math.floor(Date.now() / 1000))

      // Derive message address from PDA
      // Seeds: [b"a2a_message", session.key(), session.created_at.to_le_bytes()]
      // For now, we'll let the instruction builder derive it

      // Build instruction
      const instruction = getSendA2aMessageInstruction({
        message: await this.deriveMessageAddress(params.sessionAddress),
        session: params.sessionAddress,
        sender: this.wallet,
        messageId,
        sessionId,
        senderArg: this.wallet.address,
        content: params.content,
        messageType: params.messageType ?? 'text',
        timestamp
      }, { programAddress: this.programId })

      // Send transaction
      const signature = await this.sendTransaction([instruction])

      // Emit event
      this.emit('message_sent', {
        type: 'message_sent',
        timestamp: Date.now(),
        data: { signature, content: params.content }
      } as A2AEvent)

      return signature
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: errorMessage
      } as A2AEvent)
      throw new Error(`Failed to send A2A message: ${errorMessage}`)
    }
  }

  /**
   * Update agent status
   *
   * Updates agent availability, capabilities, and status for discovery.
   *
   * @param update - Status update
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * await a2aClient.updateStatus({
   *   status: 'busy',
   *   capabilities: ['nlp', 'translation'],
   *   availability: false
   * })
   * ```
   */
  async updateStatus(update: A2AStatusUpdate): Promise<Signature> {
    try {
      // Derive status address from PDA
      // Seeds: [b"a2a_status", session.key()]
      // For agent status, it might be [b"a2a_status", agent.key()]

      const statusAddress = await this.deriveStatusAddress()

      // Build instruction
      const instruction = getUpdateA2aStatusInstruction({
        status: statusAddress,
        session: address('11111111111111111111111111111111'), // Placeholder - need actual session
        updater: this.wallet,
        statusId: BigInt(Date.now()),
        agent: this.wallet.address,
        statusArg: update.status,
        capabilities: update.capabilities ?? [],
        availability: update.availability ?? true,
        lastUpdated: BigInt(Math.floor(Date.now() / 1000))
      }, { programAddress: this.programId })

      // Send transaction
      const signature = await this.sendTransaction([instruction])

      // Emit event
      this.emit('status_updated', {
        type: 'status_updated',
        timestamp: Date.now(),
        data: { signature, status: update.status }
      } as A2AEvent)

      return signature
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: errorMessage
      } as A2AEvent)
      throw new Error(`Failed to update A2A status: ${errorMessage}`)
    }
  }

  /**
   * Get session details
   *
   * Fetches current session state from on-chain.
   *
   * @param sessionAddress - Session PDA address
   * @returns Session details
   */
  async getSession(sessionAddress: Address): Promise<A2ASessionDetails | null> {
    try {
      const maybeSession = await fetchMaybeA2ASession(this.rpc, sessionAddress)

      if (!maybeSession.exists) {
        return null
      }

      return {
        ...maybeSession.data,
        address: sessionAddress
      }
    } catch (error) {
      console.error('Failed to fetch A2A session:', error)
      return null
    }
  }

  /**
   * Get message by address
   *
   * @param messageAddress - Message PDA address
   * @returns Message data
   */
  async getMessage(messageAddress: Address): Promise<A2AMessage | null> {
    try {
      const message = await fetchA2AMessage(this.rpc, messageAddress)
      return message.data
    } catch (error) {
      console.error('Failed to fetch A2A message:', error)
      return null
    }
  }

  /**
   * Get agent status
   *
   * @param statusAddress - Status PDA address
   * @returns Status data
   */
  async getStatus(statusAddress: Address): Promise<A2AStatus | null> {
    try {
      const status = await fetchA2AStatus(this.rpc, statusAddress)
      return status.data
    } catch (error) {
      console.error('Failed to fetch A2A status:', error)
      return null
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async sendTransaction(instructions: readonly unknown[]): Promise<Signature> {
    try {
      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()

      // Build transaction message
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(this.wallet.address, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        ...instructions.map((ix) => (m: any) => appendTransactionMessageInstruction(ix as any, m))
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(message)

      // Extract signature
      const signatures = Object.values(signedTransaction.signatures)
      if (signatures.length === 0) {
        throw new Error('Transaction has no signatures')
      }

      const signature = signatures[0] as unknown as Signature

      // Send transaction
      const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
      await this.rpc.sendTransaction(wireTransaction).send()

      // Wait for confirmation
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

  private async deriveMessageAddress(sessionAddress: Address): Promise<Address> {
    // This is a simplified implementation
    // In reality, we need to derive the PDA properly using:
    // seeds: [b"a2a_message", session.key(), session.created_at.to_le_bytes()]
    // For now, we'll use a placeholder
    // The actual implementation should use getProgramDerivedAddress
    return address('11111111111111111111111111111111')
  }

  private async deriveStatusAddress(): Promise<Address> {
    // This is a simplified implementation
    // In reality, we need to derive the PDA properly
    return address('11111111111111111111111111111111')
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create an A2A Client instance
 *
 * @param options - Client configuration
 * @param wallet - Transaction signer (agent wallet)
 * @returns A2AClient instance
 */
export function createA2AClient(
  options: A2AClientOptions,
  wallet: TransactionSigner
): A2AClient {
  return new A2AClient(options, wallet)
}

// =====================================================
// EXPORTS
// =====================================================

export default A2AClient
