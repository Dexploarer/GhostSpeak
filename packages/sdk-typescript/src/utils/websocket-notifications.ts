/**
 * Real-time WebSocket Notifications for Solana Blockchain
 *
 * Provides live updates for:
 * - Transaction confirmations
 * - Account changes
 * - Agent registrations
 * - Escrow updates
 * - Work order status changes
 * - x402 payment events
 *
 * @module utils/websocket-notifications
 */

import type { Address, Signature, Commitment } from '@solana/kit'
import { EventEmitter } from 'events'

/**
 * WebSocket subscription types
 */
export type SubscriptionType =
  | 'accountChange'
  | 'programChange'
  | 'signatureNotification'
  | 'slotChange'
  | 'rootChange'
  | 'logsNotification'

/**
 * Account change notification
 */
export interface AccountChangeNotification {
  type: 'accountChange'
  pubkey: Address
  account: {
    lamports: bigint
    data: Uint8Array
    owner: Address
    executable: boolean
    rentEpoch: bigint
  }
  slot: bigint
}

/**
 * Signature notification
 */
export interface SignatureNotification {
  type: 'signatureNotification'
  signature: Signature
  slot: bigint
  error: Error | null
  timestamp: number
}

/**
 * Program change notification
 */
export interface ProgramChangeNotification {
  type: 'programChange'
  pubkey: Address
  account: {
    lamports: bigint
    data: Uint8Array
    owner: Address
    executable: boolean
    rentEpoch: bigint
  }
  slot: bigint
}

/**
 * Logs notification
 */
export interface LogsNotification {
  type: 'logsNotification'
  signature: Signature
  logs: string[]
  error: Error | null
}

/**
 * Slot change notification
 */
export interface SlotChangeNotification {
  type: 'slotChange'
  slot: bigint
  parent: bigint
  timestamp: number
}

/**
 * Union type for all notifications
 */
export type BlockchainNotification =
  | AccountChangeNotification
  | SignatureNotification
  | ProgramChangeNotification
  | LogsNotification
  | SlotChangeNotification

/**
 * WebSocket subscription configuration
 */
export interface SubscriptionConfig {
  type: SubscriptionType
  target: Address | Signature
  commitment?: Commitment
  encoding?: 'base64' | 'base58' | 'jsonParsed'
  filters?: Array<{
    memcmp?: { offset: number; bytes: string }
    dataSize?: number
  }>
}

/**
 * WebSocket connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

/**
 * Real-time WebSocket notification manager for Solana blockchain
 */
export class WebSocketNotificationManager extends EventEmitter {
  private ws: WebSocket | null = null
  private rpcWsEndpoint: string
  private subscriptions = new Map<number, SubscriptionConfig>()
  private subscriptionIdCounter = 0
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000 // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null

  constructor(rpcWsEndpoint: string) {
    super()
    this.rpcWsEndpoint = rpcWsEndpoint
  }

  /**
   * Connect to Solana WebSocket endpoint
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.connectionState = 'connecting'
    this.emit('stateChange', this.connectionState)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.rpcWsEndpoint)

        this.ws.onopen = () => {
          this.connectionState = 'connected'
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.emit('stateChange', this.connectionState)
          this.emit('connected')
          this.startHeartbeat()

          // Resubscribe to all active subscriptions
          this.resubscribeAll()

          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          this.connectionState = 'error'
          this.emit('stateChange', this.connectionState)
          this.emit('error', error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.connectionState = 'disconnected'
          this.emit('stateChange', this.connectionState)
          this.emit('disconnected')
          this.stopHeartbeat()
          this.attemptReconnect()
        }
      } catch (error) {
        this.connectionState = 'error'
        this.emit('stateChange', this.connectionState)
        this.emit('error', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat()
      this.ws.close()
      this.ws = null
    }
    this.connectionState = 'disconnected'
    this.emit('stateChange', this.connectionState)
    this.subscriptions.clear()
  }

  /**
   * Subscribe to account changes
   */
  async subscribeToAccount(
    address: Address,
    commitment: Commitment = 'confirmed'
  ): Promise<number> {
    const subscriptionId = this.subscriptionIdCounter++

    const config: SubscriptionConfig = {
      type: 'accountChange',
      target: address,
      commitment,
      encoding: 'base64'
    }

    this.subscriptions.set(subscriptionId, config)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'accountSubscribe',
        params: [
          address,
          {
            commitment,
            encoding: 'base64'
          }
        ]
      }

      this.ws.send(JSON.stringify(request))
    }

    return subscriptionId
  }

  /**
   * Subscribe to program account changes
   */
  async subscribeToProgramAccounts(
    programId: Address,
    commitment: Commitment = 'confirmed',
    filters?: Array<{ memcmp?: { offset: number; bytes: string }; dataSize?: number }>
  ): Promise<number> {
    const subscriptionId = this.subscriptionIdCounter++

    const config: SubscriptionConfig = {
      type: 'programChange',
      target: programId,
      commitment,
      encoding: 'base64',
      filters
    }

    this.subscriptions.set(subscriptionId, config)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'programSubscribe',
        params: [
          programId,
          {
            commitment,
            encoding: 'base64',
            filters: filters ?? []
          }
        ]
      }

      this.ws.send(JSON.stringify(request))
    }

    return subscriptionId
  }

  /**
   * Subscribe to signature notifications
   */
  async subscribeToSignature(
    signature: Signature,
    commitment: Commitment = 'confirmed'
  ): Promise<number> {
    const subscriptionId = this.subscriptionIdCounter++

    const config: SubscriptionConfig = {
      type: 'signatureNotification',
      target: signature,
      commitment
    }

    this.subscriptions.set(subscriptionId, config)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'signatureSubscribe',
        params: [signature, { commitment }]
      }

      this.ws.send(JSON.stringify(request))
    }

    return subscriptionId
  }

  /**
   * Subscribe to transaction logs
   */
  async subscribeToLogs(
    filter: 'all' | 'allWithVotes' | { mentions: Address[] },
    commitment: Commitment = 'confirmed'
  ): Promise<number> {
    const subscriptionId = this.subscriptionIdCounter++

    const config: SubscriptionConfig = {
      type: 'logsNotification',
      target: typeof filter === 'string' ? filter as Address : filter.mentions[0],
      commitment
    }

    this.subscriptions.set(subscriptionId, config)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'logsSubscribe',
        params: [filter, { commitment }]
      }

      this.ws.send(JSON.stringify(request))
    }

    return subscriptionId
  }

  /**
   * Subscribe to slot changes
   */
  async subscribeToSlots(): Promise<number> {
    const subscriptionId = this.subscriptionIdCounter++

    const config: SubscriptionConfig = {
      type: 'slotChange',
      target: 'slot' as Address // Placeholder
    }

    this.subscriptions.set(subscriptionId, config)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'slotSubscribe',
        params: []
      }

      this.ws.send(JSON.stringify(request))
    }

    return subscriptionId
  }

  /**
   * Unsubscribe from a subscription
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    const config = this.subscriptions.get(subscriptionId)
    if (!config) return

    this.subscriptions.delete(subscriptionId)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const methodMap: Record<SubscriptionType, string> = {
        accountChange: 'accountUnsubscribe',
        programChange: 'programUnsubscribe',
        signatureNotification: 'signatureUnsubscribe',
        logsNotification: 'logsUnsubscribe',
        slotChange: 'slotUnsubscribe',
        rootChange: 'rootUnsubscribe'
      }

      const request = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: methodMap[config.type],
        params: [subscriptionId]
      }

      this.ws.send(JSON.stringify(request))
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      // Handle subscription notifications
      if (message.method === 'accountNotification') {
        const notification: AccountChangeNotification = {
          type: 'accountChange',
          pubkey: message.params.result.value.pubkey,
          account: {
            lamports: BigInt(message.params.result.value.lamports),
            data: Buffer.from(message.params.result.value.data[0], 'base64'),
            owner: message.params.result.value.owner,
            executable: message.params.result.value.executable,
            rentEpoch: BigInt(message.params.result.value.rentEpoch)
          },
          slot: BigInt(message.params.result.context.slot)
        }

        this.emit('notification', notification)
        this.emit('accountChange', notification)
      } else if (message.method === 'programNotification') {
        const notification: ProgramChangeNotification = {
          type: 'programChange',
          pubkey: message.params.result.value.pubkey,
          account: {
            lamports: BigInt(message.params.result.value.account.lamports),
            data: Buffer.from(message.params.result.value.account.data[0], 'base64'),
            owner: message.params.result.value.account.owner,
            executable: message.params.result.value.account.executable,
            rentEpoch: BigInt(message.params.result.value.account.rentEpoch)
          },
          slot: BigInt(message.params.result.context.slot)
        }

        this.emit('notification', notification)
        this.emit('programChange', notification)
      } else if (message.method === 'signatureNotification') {
        const notification: SignatureNotification = {
          type: 'signatureNotification',
          signature: message.params.result.value.signature,
          slot: BigInt(message.params.result.context.slot),
          error: message.params.result.value.err ? new Error(JSON.stringify(message.params.result.value.err)) : null,
          timestamp: Date.now()
        }

        this.emit('notification', notification)
        this.emit('signatureNotification', notification)
      } else if (message.method === 'logsNotification') {
        const notification: LogsNotification = {
          type: 'logsNotification',
          signature: message.params.result.value.signature,
          logs: message.params.result.value.logs,
          error: message.params.result.value.err ? new Error(JSON.stringify(message.params.result.value.err)) : null
        }

        this.emit('notification', notification)
        this.emit('logsNotification', notification)
      } else if (message.method === 'slotNotification') {
        const notification: SlotChangeNotification = {
          type: 'slotChange',
          slot: BigInt(message.params.result.slot),
          parent: BigInt(message.params.result.parent),
          timestamp: Date.now()
        }

        this.emit('notification', notification)
        this.emit('slotChange', notification)
      }

      // Handle subscription responses
      if (message.result !== undefined && message.id !== undefined) {
        this.emit('subscriptionResponse', { id: message.id, result: message.result })
      }
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * Resubscribe to all active subscriptions
   */
  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.entries())

    for (const [id, config] of subscriptions) {
      // Remove old subscription and create new one
      this.subscriptions.delete(id)

      switch (config.type) {
        case 'accountChange':
          await this.subscribeToAccount(config.target, config.commitment)
          break
        case 'programChange':
          await this.subscribeToProgramAccounts(config.target, config.commitment, config.filters)
          break
        case 'signatureNotification':
          await this.subscribeToSignature(config.target as Signature, config.commitment)
          break
        case 'slotChange':
          await this.subscribeToSlots()
          break
      }
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.reconnectAttempts++
    this.connectionState = 'reconnecting'
    this.emit('stateChange', this.connectionState)
    this.emit('reconnecting', this.reconnectAttempts)

    // Exponential backoff
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        this.emit('reconnectError', error)
      }
    }, delay)
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping
        const ping = {
          jsonrpc: '2.0',
          id: 'heartbeat',
          method: 'getHealth',
          params: []
        }
        this.ws.send(JSON.stringify(ping))

        // Set timeout for pong
        this.heartbeatTimeout = setTimeout(() => {
          // No pong received, close connection
          this.ws?.close()
        }, 10000) // 10 seconds timeout
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }
}

/**
 * Create WebSocket notification manager
 */
export function createWebSocketNotificationManager(
  rpcWsEndpoint: string
): WebSocketNotificationManager {
  return new WebSocketNotificationManager(rpcWsEndpoint)
}

/**
 * High-level notification manager for GhostSpeak-specific events
 */
export class GhostSpeakNotificationManager {
  private wsManager: WebSocketNotificationManager
  private subscriptions = new Map<string, number>()

  constructor(rpcWsEndpoint: string, private programId: Address) {
    this.wsManager = new WebSocketNotificationManager(rpcWsEndpoint)

    // Forward events
    this.wsManager.on('notification', (notification) => {
      this.handleGhostSpeakNotification(notification)
    })
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    await this.wsManager.connect()
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.wsManager.disconnect()
  }

  /**
   * Subscribe to agent registration events
   */
  async subscribeToAgentRegistrations(): Promise<number> {
    const subId = await this.wsManager.subscribeToProgramAccounts(this.programId, 'confirmed', [
      { dataSize: 359 } // Agent account size
    ])

    this.subscriptions.set('agentRegistrations', subId)
    return subId
  }

  /**
   * Subscribe to x402 payment events
   */
  async subscribeToX402Payments(agentAddress: Address): Promise<number> {
    const subId = await this.wsManager.subscribeToAccount(agentAddress, 'confirmed')
    this.subscriptions.set(`x402Payments:${agentAddress}`, subId)
    return subId
  }

  /**
   * Subscribe to escrow updates
   */
  async subscribeToEscrowUpdates(escrowAddress: Address): Promise<number> {
    const subId = await this.wsManager.subscribeToAccount(escrowAddress, 'confirmed')
    this.subscriptions.set(`escrow:${escrowAddress}`, subId)
    return subId
  }

  /**
   * Subscribe to work order status changes
   */
  async subscribeToWorkOrderUpdates(workOrderAddress: Address): Promise<number> {
    const subId = await this.wsManager.subscribeToAccount(workOrderAddress, 'confirmed')
    this.subscriptions.set(`workOrder:${workOrderAddress}`, subId)
    return subId
  }

  /**
   * Subscribe to transaction confirmation
   */
  async subscribeToTransaction(signature: Signature): Promise<number> {
    return this.wsManager.subscribeToSignature(signature, 'confirmed')
  }

  /**
   * Get underlying WebSocket manager
   */
  getWebSocketManager(): WebSocketNotificationManager {
    return this.wsManager
  }

  /**
   * Handle GhostSpeak-specific notifications
   */
  private handleGhostSpeakNotification(notification: BlockchainNotification): void {
    switch (notification.type) {
      case 'accountChange':
        this.handleAccountChange(notification)
        break
      case 'programChange':
        this.handleProgramChange(notification)
        break
      case 'signatureNotification':
        this.handleSignatureNotification(notification)
        break
    }
  }

  /**
   * Handle account change notifications
   */
  private handleAccountChange(notification: AccountChangeNotification): void {
    // Parse account data to determine type
    const discriminator = notification.account.data.slice(0, 8)

    // Emit typed events based on account discriminator
    this.wsManager.emit('ghostspeakAccountChange', {
      address: notification.pubkey,
      data: notification.account.data,
      slot: notification.slot,
      discriminator
    })
  }

  /**
   * Handle program change notifications
   */
  private handleProgramChange(notification: ProgramChangeNotification): void {
    this.wsManager.emit('ghostspeakProgramChange', {
      address: notification.pubkey,
      data: notification.account.data,
      slot: notification.slot
    })
  }

  /**
   * Handle signature notifications
   */
  private handleSignatureNotification(notification: SignatureNotification): void {
    this.wsManager.emit('ghostspeakTransactionConfirmed', {
      signature: notification.signature,
      slot: notification.slot,
      error: notification.error,
      timestamp: notification.timestamp
    })
  }
}

/**
 * Create GhostSpeak notification manager
 */
export function createGhostSpeakNotificationManager(
  rpcWsEndpoint: string,
  programId: Address
): GhostSpeakNotificationManager {
  return new GhostSpeakNotificationManager(rpcWsEndpoint, programId)
}
