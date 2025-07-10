/**
 * GhostSpeak Protocol Webhook System
 * 
 * Provides real-time event notifications via webhooks for protocol events
 * such as agent actions, messages, escrow updates, and marketplace activities.
 */

import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';

export interface WebhookConfig {
  /** Webhook endpoint URL */
  url: string;
  /** Events to subscribe to */
  events: WebhookEvent[];
  /** Authentication headers */
  headers?: Record<string, string>;
  /** Secret for signature verification */
  secret?: string;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Filter configuration */
  filters?: WebhookFilters;
}

export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
}

export interface WebhookFilters {
  /** Filter by agent IDs */
  agentIds?: string[];
  /** Filter by user addresses */
  userAddresses?: string[];
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Custom filter function */
  customFilter?: (event: ProtocolEvent) => boolean;
}

export type WebhookEvent = 
  | 'agent.created'
  | 'agent.updated'
  | 'agent.verified'
  | 'agent.deleted'
  | 'message.sent'
  | 'message.received'
  | 'message.broadcast'
  | 'channel.created'
  | 'channel.joined'
  | 'channel.left'
  | 'escrow.created'
  | 'escrow.funded'
  | 'escrow.released'
  | 'escrow.disputed'
  | 'escrow.resolved'
  | 'marketplace.service_listed'
  | 'marketplace.service_purchased'
  | 'marketplace.service_completed'
  | 'reputation.updated'
  | 'payment.received'
  | 'payment.sent'
  | 'contract.deployed'
  | 'contract.upgraded';

export interface ProtocolEvent {
  /** Event type */
  type: WebhookEvent;
  /** Event ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Transaction signature if applicable */
  signature?: string;
  /** Event data */
  data: any;
  /** Source of the event */
  source: {
    program: string;
    instruction?: string;
    account?: string;
  };
  /** Network information */
  network: {
    cluster: string;
    slot: number;
    blockHash: string;
  };
}

export interface WebhookDelivery {
  /** Delivery ID */
  id: string;
  /** Event that was delivered */
  event: ProtocolEvent;
  /** Webhook configuration used */
  webhook: WebhookConfig;
  /** HTTP status code */
  statusCode?: number;
  /** Response body */
  response?: string;
  /** Delivery timestamp */
  deliveredAt?: number;
  /** Error if delivery failed */
  error?: string;
  /** Number of retry attempts */
  attempts: number;
  /** Next retry timestamp if applicable */
  nextRetry?: number;
}

class WebhookManager extends EventEmitter {
  private connection: Connection;
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private eventListeners: Map<string, (event: ProtocolEvent) => void> = new Map();
  private retryQueue: WebhookDelivery[] = [];
  private retryTimer?: NodeJS.Timeout;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    this.startRetryProcessor();
  }

  /**
   * Register a webhook
   */
  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      ...config
    });

    // Set up event listeners for this webhook
    this.setupEventListeners(id, config);

    this.emit('webhook_registered', { id, config });
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id: string): void {
    const config = this.webhooks.get(id);
    if (!config) return;

    // Remove event listeners
    this.removeEventListeners(id);
    
    this.webhooks.delete(id);
    this.emit('webhook_unregistered', { id });
  }

  /**
   * Get webhook configuration
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  /**
   * List all webhooks
   */
  listWebhooks(): Array<{ id: string; config: WebhookConfig }> {
    return Array.from(this.webhooks.entries()).map(([id, config]) => ({ id, config }));
  }

  /**
   * Trigger an event manually (for testing)
   */
  triggerEvent(event: ProtocolEvent): void {
    this.processEvent(event);
  }

  /**
   * Get delivery status
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * Get deliveries for a webhook
   */
  getWebhookDeliveries(webhookId: string, limit = 50): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .filter(delivery => delivery.webhook === this.webhooks.get(webhookId))
      .sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0))
      .slice(0, limit);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.statusCode && delivery.statusCode >= 200 && delivery.statusCode < 300) {
      throw new Error('Delivery already succeeded');
    }

    return this.deliverWebhook(delivery.webhook, delivery.event, delivery);
  }

  /**
   * Start monitoring protocol events
   */
  startMonitoring(): void {
    // Set up Solana account and log monitoring
    this.setupSolanaMonitoring();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    // Clean up listeners and timers
    this.removeAllListeners();
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }

  private setupEventListeners(webhookId: string, config: WebhookConfig): void {
    config.events.forEach(eventType => {
      const listenerKey = `${webhookId}:${eventType}`;
      
      const listener = (event: ProtocolEvent) => {
        if (this.shouldDeliverEvent(config, event)) {
          this.deliverWebhook(config, event);
        }
      };

      this.eventListeners.set(listenerKey, listener);
      this.on(eventType, listener);
    });
  }

  private removeEventListeners(webhookId: string): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return;

    webhook.events.forEach(eventType => {
      const listenerKey = `${webhookId}:${eventType}`;
      const listener = this.eventListeners.get(listenerKey);
      
      if (listener) {
        this.off(eventType, listener);
        this.eventListeners.delete(listenerKey);
      }
    });
  }

  private shouldDeliverEvent(config: WebhookConfig, event: ProtocolEvent): boolean {
    if (!config.filters) return true;

    const { filters } = config;

    // Agent ID filter
    if (filters.agentIds && event.data.agentId) {
      if (!filters.agentIds.includes(event.data.agentId)) {
        return false;
      }
    }

    // User address filter
    if (filters.userAddresses && event.data.userAddress) {
      if (!filters.userAddresses.includes(event.data.userAddress)) {
        return false;
      }
    }

    // Channel ID filter
    if (filters.channelIds && event.data.channelId) {
      if (!filters.channelIds.includes(event.data.channelId)) {
        return false;
      }
    }

    // Custom filter
    if (filters.customFilter) {
      if (!filters.customFilter(event)) {
        return false;
      }
    }

    return true;
  }

  private async deliverWebhook(
    config: WebhookConfig, 
    event: ProtocolEvent, 
    existingDelivery?: WebhookDelivery
  ): Promise<boolean> {
    const deliveryId = existingDelivery?.id || this.generateDeliveryId();
    
    const delivery: WebhookDelivery = existingDelivery || {
      id: deliveryId,
      event,
      webhook: config,
      attempts: 0
    };

    delivery.attempts++;

    try {
      const payload = {
        event,
        delivery: {
          id: deliveryId,
          attempt: delivery.attempts,
          timestamp: Date.now()
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'GhostSpeak-Webhook/1.0',
        ...config.headers
      };

      // Add signature if secret is provided
      if (config.secret) {
        const signature = this.generateSignature(payload, config.secret);
        headers['X-GhostSpeak-Signature'] = signature;
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      delivery.statusCode = response.status;
      delivery.response = await response.text();
      delivery.deliveredAt = Date.now();

      if (response.ok) {
        this.deliveries.set(deliveryId, delivery);
        this.emit('webhook_delivered', delivery);
        return true;
      } else {
        delivery.error = `HTTP ${response.status}: ${delivery.response}`;
        this.handleDeliveryFailure(delivery);
        return false;
      }

    } catch (error) {
      delivery.error = error instanceof Error ? error.message : String(error);
      this.handleDeliveryFailure(delivery);
      return false;
    }
  }

  private handleDeliveryFailure(delivery: WebhookDelivery): void {
    this.deliveries.set(delivery.id, delivery);
    this.emit('webhook_failed', delivery);

    const config = delivery.webhook;
    if (delivery.attempts < (config.retry?.maxAttempts || 3)) {
      this.scheduleRetry(delivery);
    } else {
      this.emit('webhook_exhausted', delivery);
    }
  }

  private scheduleRetry(delivery: WebhookDelivery): void {
    const config = delivery.webhook.retry!;
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, delivery.attempts - 1),
      config.maxDelay
    );

    delivery.nextRetry = Date.now() + delay;
    this.retryQueue.push(delivery);
  }

  private startRetryProcessor(): void {
    this.retryTimer = setInterval(() => {
      const now = Date.now();
      const readyRetries = this.retryQueue.filter(delivery => 
        delivery.nextRetry && delivery.nextRetry <= now
      );

      readyRetries.forEach(delivery => {
        this.retryQueue = this.retryQueue.filter(d => d.id !== delivery.id);
        this.deliverWebhook(delivery.webhook, delivery.event, delivery);
      });
    }, 1000);
  }

  private generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    return `sha256=${crypto.createHmac('sha256', secret).update(payloadString).digest('hex')}`;
  }

  private setupSolanaMonitoring(): void {
    // Monitor program logs
    this.connection.onLogs('all', (logs, context) => {
      this.parseProgramLogs(logs, context);
    });

    // Monitor account changes for specific accounts
    // This would be implemented based on the specific accounts to monitor
  }

  private parseProgramLogs(logs: any, context: any): void {
    // Parse Solana logs to extract GhostSpeak events
    // This would be implemented based on the program's log format
    
    try {
      logs.logs.forEach((log: string) => {
        if (log.includes('GhostSpeak:')) {
          const event = this.parseLogEntry(log, context);
          if (event) {
            this.processEvent(event);
          }
        }
      });
    } catch (error) {
      console.error('Error parsing program logs:', error);
    }
  }

  private parseLogEntry(log: string, context: any): ProtocolEvent | null {
    try {
      // Extract event data from log entry
      // This is a simplified implementation
      const match = log.match(/GhostSpeak: (\w+) (.+)/);
      if (!match) return null;

      const [, eventType, eventData] = match;
      
      return {
        type: eventType as WebhookEvent,
        id: this.generateEventId(),
        timestamp: Date.now(),
        signature: context.signature,
        data: JSON.parse(eventData),
        source: {
          program: 'ghostspeak'
        },
        network: {
          cluster: 'devnet', // This should be determined from connection
          slot: context.slot,
          blockHash: 'unknown' // Would need to fetch this
        }
      };
    } catch (error) {
      console.error('Error parsing log entry:', error);
      return null;
    }
  }

  private processEvent(event: ProtocolEvent): void {
    this.emit(event.type, event);
    this.emit('any_event', event);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Create a webhook manager instance
 */
export function createWebhookManager(connection: Connection): WebhookManager {
  return new WebhookManager(connection);
}

/**
 * Utility to verify webhook signatures
 */
export function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export { WebhookManager };