/**
 * Event-driven architecture for GhostSpeak CLI
 * 
 * Provides reactive data flows, real-time updates, and decoupled
 * communication between different parts of the application.
 * 
 * @example
 * ```typescript
 * const eventBus = EventBus.getInstance()
 * 
 * // Listen to events
 * eventBus.on('agent:registered', (agent) => {
 *   console.log(`New agent registered: ${agent.name}`)
 * })
 * 
 * // Emit events
 * eventBus.emit('agent:registered', newAgent)
 * 
 * // Stream real-time data
 * const agentStream = eventBus.createStream('agent:*')
 * agentStream.subscribe(event => console.log(event))
 * ```
 */

import { EventEmitter } from 'events'
import { Subject, Observable, BehaviorSubject, merge, filter, map } from 'rxjs'

/**
 * Event interface for typed events
 */
export interface Event<T = unknown> {
  /** Event type/name */
  type: string
  /** Event payload */
  data: T
  /** Event timestamp */
  timestamp: Date
  /** Event metadata */
  metadata?: Record<string, unknown>
  /** Event source */
  source?: string
  /** Event correlation ID for tracing */
  correlationId?: string
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: Event<T>) => void | Promise<void>

/**
 * Event pattern for filtering
 */
export type EventPattern = string | RegExp | ((eventType: string) => boolean)

/**
 * Event stream subscription
 */
export interface EventSubscription {
  /** Unsubscribe from the event stream */
  unsubscribe: () => void
}

/**
 * Event bus for application-wide event communication
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null
  private eventSubjects = new Map<string, Subject<Event>>()
  private globalSubject = new Subject<Event>()
  private eventHistory: Event[] = []
  private maxHistorySize = 1000
  private correlationIdCounter = 0

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Emit an event
   */
  emit(type: string, data?: unknown, options?: {
    source?: string
    metadata?: Record<string, unknown>
    correlationId?: string
  }): boolean {
    const event: Event = {
      type,
      data,
      timestamp: new Date(),
      source: options?.source,
      metadata: options?.metadata,
      correlationId: options?.correlationId || this.generateCorrelationId()
    }

    // Add to history
    this.addToHistory(event)

    // Emit to EventEmitter (for backward compatibility)
    super.emit(type, event)

    // Emit to RxJS subjects
    this.globalSubject.next(event)
    
    const subject = this.eventSubjects.get(type)
    if (subject) {
      subject.next(event)
    }

    return true
  }

  /**
   * Listen to events (EventEmitter style)
   */
  on(eventName: string, listener: EventHandler): this {
    super.on(eventName, listener)
    return this
  }

  /**
   * Listen to events once
   */
  once(eventName: string, listener: EventHandler): this {
    super.once(eventName, listener)
    return this
  }

  /**
   * Remove event listener
   */
  off(eventName: string, listener: EventHandler): this {
    super.off(eventName, listener)
    return this
  }

  /**
   * Create an observable stream for events matching pattern
   */
  createStream(pattern: EventPattern): Observable<Event> {
    return this.globalSubject.pipe(
      filter(event => this.matchesPattern(event.type, pattern))
    )
  }

  /**
   * Create a typed observable stream
   */
  createTypedStream<T>(eventType: string): Observable<Event<T>> {
    let subject = this.eventSubjects.get(eventType)
    if (!subject) {
      subject = new Subject<Event>()
      this.eventSubjects.set(eventType, subject)
    }

    return subject.asObservable() as Observable<Event<T>>
  }

  /**
   * Subscribe to events matching pattern
   */
  subscribe(
    pattern: EventPattern,
    handler: EventHandler,
    options?: {
      once?: boolean
      priority?: number
    }
  ): EventSubscription {
    const subscription = this.createStream(pattern).subscribe(handler)

    return {
      unsubscribe: () => subscription.unsubscribe()
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    type?: EventPattern
    since?: Date
    limit?: number
  }): Event[] {
    let events = this.eventHistory

    if (filter?.type) {
      events = events.filter(event => this.matchesPattern(event.type, filter.type!))
    }

    if (filter?.since) {
      events = events.filter(event => event.timestamp >= filter.since!)
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit)
    }

    return events
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Wait for specific event
   */
  waitFor<T = unknown>(
    eventType: string,
    timeout = 30000
  ): Promise<Event<T>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`))
      }, timeout)

      this.once(eventType, (event) => {
        clearTimeout(timer)
        resolve(event as Event<T>)
      })
    })
  }

  /**
   * Batch emit multiple events
   */
  emitBatch(events: Array<{ type: string; data?: unknown }>): void {
    events.forEach(({ type, data }) => {
      this.emit(type, data)
    })
  }

  /**
   * Create event correlation for tracing
   */
  correlate(correlationId: string): EventCorrelator {
    return new EventCorrelator(this, correlationId)
  }

  /**
   * Add event to history
   */
  private addToHistory(event: Event): void {
    this.eventHistory.push(event)
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Check if event type matches pattern
   */
  private matchesPattern(eventType: string, pattern: EventPattern): boolean {
    if (typeof pattern === 'string') {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(eventType)
      }
      return eventType === pattern
    }

    if (pattern instanceof RegExp) {
      return pattern.test(eventType)
    }

    if (typeof pattern === 'function') {
      return pattern(eventType)
    }

    return false
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${++this.correlationIdCounter}`
  }
}

/**
 * Event correlator for tracing related events
 */
export class EventCorrelator {
  constructor(
    private eventBus: EventBus,
    private correlationId: string
  ) {}

  /**
   * Emit event with correlation ID
   */
  emit(type: string, data?: unknown, metadata?: Record<string, unknown>): void {
    this.eventBus.emit(type, data, {
      correlationId: this.correlationId,
      metadata
    })
  }

  /**
   * Get all events for this correlation
   */
  getCorrelatedEvents(): Event[] {
    return this.eventBus.getHistory({
      type: () => true
    }).filter(event => event.correlationId === this.correlationId)
  }

  /**
   * Create stream for correlated events
   */
  createStream(): Observable<Event> {
    return this.eventBus.createStream(() => true).pipe(
      filter(event => event.correlationId === this.correlationId)
    )
  }
}

/**
 * Real-time data stream manager
 */
export class StreamManager {
  private subjects = new Map<string, BehaviorSubject<unknown>>()
  private eventBus = EventBus.getInstance()

  constructor() {
    // Listen to all events and update streams
    this.eventBus.createStream('*').subscribe(event => {
      this.updateStream(event.type, event.data)
    })
  }

  /**
   * Create or get a data stream
   */
  getStream<T>(key: string, initialValue?: T): Observable<T> {
    let subject = this.subjects.get(key)
    if (!subject) {
      subject = new BehaviorSubject(initialValue)
      this.subjects.set(key, subject)
    }

    return subject.asObservable() as Observable<T>
  }

  /**
   * Update stream with new data
   */
  updateStream(key: string, data: unknown): void {
    const subject = this.subjects.get(key)
    if (subject) {
      subject.next(data)
    }
  }

  /**
   * Create combined stream from multiple sources
   */
  combineStreams<T>(...keys: string[]): Observable<T[]> {
    const streams = keys.map(key => this.getStream(key))
    return merge(...streams).pipe(
      map(() => keys.map(key => this.subjects.get(key)?.value))
    ) as Observable<T[]>
  }

  /**
   * Close stream
   */
  closeStream(key: string): void {
    const subject = this.subjects.get(key)
    if (subject) {
      subject.complete()
      this.subjects.delete(key)
    }
  }

  /**
   * Close all streams
   */
  closeAllStreams(): void {
    this.subjects.forEach(subject => subject.complete())
    this.subjects.clear()
  }
}

/**
 * Command result streaming for reactive CLI
 */
export class CommandResultStream {
  private resultSubject = new Subject<CommandResult>()
  private eventBus = EventBus.getInstance()

  constructor() {
    // Listen to command events
    this.eventBus.on('command:executed', (event) => {
      this.resultSubject.next({
        command: event.data.command,
        success: event.data.success,
        result: event.data.result,
        error: event.data.error,
        timestamp: event.timestamp
      })
    })
  }

  /**
   * Get stream of command results
   */
  getResultStream(): Observable<CommandResult> {
    return this.resultSubject.asObservable()
  }

  /**
   * Get stream for specific command
   */
  getCommandStream(command: string): Observable<CommandResult> {
    return this.resultSubject.pipe(
      filter(result => result.command === command)
    )
  }

  /**
   * Subscribe to command results
   */
  subscribe(handler: (result: CommandResult) => void): EventSubscription {
    const subscription = this.resultSubject.subscribe(handler)
    return {
      unsubscribe: () => subscription.unsubscribe()
    }
  }
}

/**
 * Command result interface
 */
export interface CommandResult {
  command: string
  success: boolean
  result?: unknown
  error?: Error
  timestamp: Date
}

/**
 * Blockchain event listener for real-time updates
 */
export class BlockchainEventListener {
  private eventBus = EventBus.getInstance()
  private isListening = false
  private subscriptions: EventSubscription[] = []

  /**
   * Start listening to blockchain events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      return
    }

    this.isListening = true

    // Simulate blockchain event listening
    // In real implementation, this would connect to Solana WebSocket
    this.simulateBlockchainEvents()

    this.eventBus.emit('blockchain:listener:started')
  }

  /**
   * Stop listening to blockchain events
   */
  stopListening(): void {
    if (!this.isListening) {
      return
    }

    this.isListening = false
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.subscriptions = []

    this.eventBus.emit('blockchain:listener:stopped')
  }

  /**
   * Simulate blockchain events (replace with real implementation)
   */
  private simulateBlockchainEvents(): void {
    // This would be replaced with real Solana WebSocket connection
    const events = [
      'transaction:confirmed',
      'agent:registered',
      'escrow:created',
      'auction:bid_placed'
    ]

    const emitRandomEvent = () => {
      if (!this.isListening) return

      const eventType = events[Math.floor(Math.random() * events.length)]
      this.eventBus.emit(`blockchain:${eventType}`, {
        blockHash: 'block_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date()
      })

      setTimeout(emitRandomEvent, 5000 + Math.random() * 10000) // 5-15 seconds
    }

    setTimeout(emitRandomEvent, 1000)
  }
}

/**
 * Event-driven CLI state manager
 */
export class CLIStateManager {
  private state = new BehaviorSubject<CLIState>({
    activeCommand: null,
    user: null,
    network: 'devnet',
    wallet: null,
    isOnline: true
  })

  private eventBus = EventBus.getInstance()

  constructor() {
    this.setupEventHandlers()
  }

  /**
   * Get current state
   */
  getState(): Observable<CLIState> {
    return this.state.asObservable()
  }

  /**
   * Update state
   */
  updateState(updates: Partial<CLIState>): void {
    const currentState = this.state.value
    const newState = { ...currentState, ...updates }
    this.state.next(newState)

    this.eventBus.emit('cli:state:updated', newState)
  }

  /**
   * Setup event handlers for state management
   */
  private setupEventHandlers(): void {
    this.eventBus.on('command:started', (event) => {
      this.updateState({ activeCommand: event.data.command })
    })

    this.eventBus.on('command:completed', () => {
      this.updateState({ activeCommand: null })
    })

    this.eventBus.on('wallet:connected', (event) => {
      this.updateState({ wallet: event.data })
    })

    this.eventBus.on('network:changed', (event) => {
      this.updateState({ network: event.data.network })
    })
  }
}

/**
 * CLI state interface
 */
export interface CLIState {
  activeCommand: string | null
  user: {
    address: string
    preferences: Record<string, unknown>
  } | null
  network: string
  wallet: {
    address: string
    balance: number
  } | null
  isOnline: boolean
}

// Export singleton instances
export const eventBus = EventBus.getInstance()
export const streamManager = new StreamManager()
export const commandResultStream = new CommandResultStream()
export const blockchainEventListener = new BlockchainEventListener()
export const cliStateManager = new CLIStateManager()