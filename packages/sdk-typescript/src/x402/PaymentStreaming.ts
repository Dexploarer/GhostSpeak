/**
 * x402 Payment Streaming for Long-Running Tasks
 *
 * Enables continuous micropayment streams for long-running agent tasks,
 * supporting milestone-based payments and automatic stream management.
 */

import type { Address, Signature, Transaction } from '@solana/kit';
import { EventEmitter } from 'events';
import type { X402Client } from './X402Client';

// Web3.js v2 compatibility: Connection type stub
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Connection = any;

/**
 * Payment stream configuration
 */
export interface PaymentStreamConfig {
  /** Agent receiving payments */
  agentAddress: Address;
  /** Client making payments */
  clientAddress: Address;
  /** Token mint for payments */
  tokenMint: Address;
  /** Total stream amount */
  totalAmount: bigint;
  /** Payment interval in milliseconds */
  intervalMs: number;
  /** Amount per interval */
  amountPerInterval: bigint;
  /** Stream duration in milliseconds */
  durationMs: number;
  /** Optional milestones for conditional releases */
  milestones?: PaymentMilestone[];
  /** Auto-resume on failure */
  autoResume?: boolean;
}

/**
 * Payment milestone for conditional releases
 */
export interface PaymentMilestone {
  /** Milestone ID */
  id: string;
  /** Milestone description */
  description: string;
  /** Amount to release at this milestone */
  amount: bigint;
  /** Completion condition callback */
  condition: () => Promise<boolean>;
  /** Completed flag */
  completed: boolean;
  /** Completion timestamp */
  completedAt?: number;
}

/**
 * Payment stream state
 */
export interface PaymentStream {
  /** Stream ID */
  id: string;
  /** Configuration */
  config: PaymentStreamConfig;
  /** Current status */
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  /** Amount paid so far */
  amountPaid: bigint;
  /** Payments made */
  payments: StreamPayment[];
  /** Start timestamp */
  startedAt: number;
  /** End timestamp */
  endedAt?: number;
  /** Last payment timestamp */
  lastPaymentAt?: number;
  /** Next payment due at */
  nextPaymentAt?: number;
  /** Error if failed */
  error?: Error;
}

/**
 * Individual stream payment
 */
export interface StreamPayment {
  /** Payment timestamp */
  timestamp: number;
  /** Amount paid */
  amount: bigint;
  /** Transaction signature */
  signature: Signature;
  /** Associated milestone ID */
  milestoneId?: string;
  /** Success flag */
  success: boolean;
  /** Error if failed */
  error?: Error;
}

/**
 * Payment Streaming Manager
 *
 * Manages continuous x402 payment streams for long-running tasks
 */
export class PaymentStreamingManager extends EventEmitter {
  private streams: Map<string, PaymentStream>;
  private intervals: Map<string, NodeJS.Timeout>;
  private x402Client: X402Client;
  private connection: Connection;

  constructor(x402Client: X402Client, connection: Connection) {
    super();
    this.streams = new Map();
    this.intervals = new Map();
    this.x402Client = x402Client;
    this.connection = connection;
  }

  /**
   * Create a new payment stream
   */
  async createStream(config: PaymentStreamConfig): Promise<PaymentStream> {
    const streamId = this.generateStreamId(config);

    // Validate configuration
    this.validateStreamConfig(config);

    const stream: PaymentStream = {
      id: streamId,
      config,
      status: 'active',
      amountPaid: 0n,
      payments: [],
      startedAt: Date.now(),
      nextPaymentAt: Date.now() + config.intervalMs,
    };

    this.streams.set(streamId, stream);

    // Start the payment interval
    this.startStreamInterval(stream);

    this.emit('stream_created', stream);

    return stream;
  }

  /**
   * Pause a payment stream
   */
  pauseStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (stream.status !== 'active') {
      throw new Error(`Stream ${streamId} is not active`);
    }

    this.stopStreamInterval(streamId);
    stream.status = 'paused';

    this.emit('stream_paused', stream);
  }

  /**
   * Resume a paused payment stream
   */
  resumeStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (stream.status !== 'paused') {
      throw new Error(`Stream ${streamId} is not paused`);
    }

    stream.status = 'active';
    stream.nextPaymentAt = Date.now() + stream.config.intervalMs;
    this.startStreamInterval(stream);

    this.emit('stream_resumed', stream);
  }

  /**
   * Cancel a payment stream
   */
  cancelStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    this.stopStreamInterval(streamId);
    stream.status = 'cancelled';
    stream.endedAt = Date.now();

    this.emit('stream_cancelled', stream);
  }

  /**
   * Get stream by ID
   */
  getStream(streamId: string): PaymentStream | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all streams
   */
  getAllStreams(): PaymentStream[] {
    return Array.from(this.streams.values());
  }

  /**
   * Get active streams
   */
  getActiveStreams(): PaymentStream[] {
    return Array.from(this.streams.values()).filter((s) => s.status === 'active');
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(streamId: string, milestoneId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const milestone = stream.config.milestones?.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    if (milestone.completed) {
      throw new Error(`Milestone ${milestoneId} already completed`);
    }

    // Check milestone condition
    const conditionMet = await milestone.condition();
    if (!conditionMet) {
      throw new Error(`Milestone ${milestoneId} condition not met`);
    }

    // Make milestone payment
    try {
      const paymentSignature = await this.makePayment(stream, milestone.amount, milestoneId);

      milestone.completed = true;
      milestone.completedAt = Date.now();

      this.emit('milestone_completed', {
        streamId,
        milestoneId,
        signature: paymentSignature,
      });
    } catch (error) {
      this.emit('milestone_failed', {
        streamId,
        milestoneId,
        error,
      });
      throw error;
    }
  }

  /**
   * Cleanup: Stop all streams and clear intervals
   */
  cleanup(): void {
    for (const streamId of this.intervals.keys()) {
      this.stopStreamInterval(streamId);
    }
    this.streams.clear();
    this.intervals.clear();
  }

  // Private methods

  private generateStreamId(config: PaymentStreamConfig): string {
    const timestamp = Date.now();
    const hash = `${config.agentAddress}-${config.clientAddress}-${timestamp}`;
    return Buffer.from(hash).toString('base64').slice(0, 16);
  }

  private validateStreamConfig(config: PaymentStreamConfig): void {
    if (config.totalAmount <= 0n) {
      throw new Error('Total amount must be positive');
    }

    if (config.intervalMs <= 0) {
      throw new Error('Interval must be positive');
    }

    if (config.durationMs <= 0) {
      throw new Error('Duration must be positive');
    }

    if (config.amountPerInterval <= 0n) {
      throw new Error('Amount per interval must be positive');
    }

    const maxPayments = Math.ceil(config.durationMs / config.intervalMs);
    const totalViaInterval = config.amountPerInterval * BigInt(maxPayments);

    const milestoneTotal =
      config.milestones?.reduce((sum, m) => sum + m.amount, 0n) ?? 0n;

    if (totalViaInterval + milestoneTotal > config.totalAmount * 110n / 100n) {
      throw new Error('Payment schedule exceeds total amount (with 10% tolerance)');
    }
  }

  private startStreamInterval(stream: PaymentStream): void {
    const interval = setInterval(async () => {
      await this.processPayment(stream);
    }, stream.config.intervalMs);

    this.intervals.set(stream.id, interval);
  }

  private stopStreamInterval(streamId: string): void {
    const interval = this.intervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(streamId);
    }
  }

  private async processPayment(stream: PaymentStream): Promise<void> {
    if (stream.status !== 'active') {
      return;
    }

    // Check if stream should complete
    if (stream.amountPaid >= stream.config.totalAmount) {
      this.completeStream(stream);
      return;
    }

    if (Date.now() >= stream.startedAt + stream.config.durationMs) {
      this.completeStream(stream);
      return;
    }

    try {
      const amount = stream.config.amountPerInterval;
      const signature = await this.makePayment(stream, amount);

      stream.lastPaymentAt = Date.now();
      stream.nextPaymentAt = Date.now() + stream.config.intervalMs;

      this.emit('payment_processed', {
        streamId: stream.id,
        amount,
        signature,
      });
    } catch (error) {
      this.emit('payment_failed', {
        streamId: stream.id,
        error,
      });

      if (stream.config.autoResume !== true) {
        stream.status = 'failed';
        stream.error = error as Error;
        stream.endedAt = Date.now();
        this.stopStreamInterval(stream.id);
      }
    }
  }

  private async makePayment(
    stream: PaymentStream,
    amount: bigint,
    milestoneId?: string
  ): Promise<Signature> {
    // Create x402 payment request
    // Note: recipient is automatically set to wallet address in createPaymentRequest
    const paymentRequest = this.x402Client.createPaymentRequest({
      amount,
      token: stream.config.tokenMint,
      description: milestoneId
        ? `Stream ${stream.id} - Milestone ${milestoneId}`
        : `Stream ${stream.id} - Interval payment`,
      metadata: {
        streamId: stream.id,
        ...(milestoneId && { milestoneId }),
      },
    });

    // Execute payment using x402Client
    const receipt = await this.x402Client.pay(paymentRequest);

    // Record payment
    const payment: StreamPayment = {
      timestamp: Date.now(),
      amount,
      signature: receipt.signature,
      milestoneId,
      success: true,
    };

    stream.payments.push(payment);
    stream.amountPaid += amount;

    return receipt.signature;
  }

  private completeStream(stream: PaymentStream): void {
    this.stopStreamInterval(stream.id);
    stream.status = 'completed';
    stream.endedAt = Date.now();

    this.emit('stream_completed', stream);
  }
}
