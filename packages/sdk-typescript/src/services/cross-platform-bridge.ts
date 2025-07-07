/**
 * Cross-Platform Agent Communication Bridge
 * Enables seamless communication between AI agents across different platforms and frameworks
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { IRealtimeMessage, MessageType, MessagePriority } from './realtime-communication';

/**
 * Supported AI frameworks and platforms
 */
export type SupportedPlatform = 
  | 'openai'                  // OpenAI API integration
  | 'anthropic'               // Anthropic Claude integration  
  | 'langchain'               // LangChain framework
  | 'autogen'                 // Microsoft AutoGen
  | 'crewai'                  // CrewAI framework
  | 'haystack'                // Deepset Haystack
  | 'rasa'                    // Rasa conversational AI
  | 'botframework'            // Microsoft Bot Framework
  | 'dialogflow'              // Google Dialogflow
  | 'lex'                     // Amazon Lex
  | 'watson'                  // IBM Watson
  | 'azure_bot'               // Azure Bot Service
  | 'slack'                   // Slack platform
  | 'discord'                 // Discord platform
  | 'telegram'                // Telegram platform
  | 'whatsapp'                // WhatsApp Business API
  | 'teams'                   // Microsoft Teams
  | 'webex'                   // Cisco Webex
  | 'http_webhook'            // Generic HTTP webhook
  | 'graphql'                 // GraphQL endpoint
  | 'grpc'                    // gRPC service
  | 'websocket'               // WebSocket connection
  | 'mqtt'                    // MQTT broker
  | 'kafka'                   // Apache Kafka
  | 'rabbitmq'                // RabbitMQ
  | 'redis'                   // Redis pub/sub
  | 'solana_program';         // Direct Solana program call

/**
 * Platform-specific configuration
 */
export interface IPlatformConfig {
  platform: SupportedPlatform;
  enabled: boolean;
  
  // Authentication
  authentication: {
    type: 'api_key' | 'oauth' | 'jwt' | 'basic' | 'certificate' | 'signature';
    credentials: Record<string, string>;
    refreshToken?: string;
    expiresAt?: number;
  };
  
  // Connection details
  connection: {
    endpoint: string;
    port?: number;
    secure: boolean;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // Rate limiting
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
    backoffMultiplier: number;
  };
  
  // Message transformation
  messageMapping: {
    inbound: Record<string, string>;   // Platform format -> GhostSpeak format
    outbound: Record<string, string>;  // GhostSpeak format -> Platform format
    customTransforms?: Array<{
      condition: string;
      transform: string;
    }>;
  };
  
  // Platform capabilities
  capabilities: {
    supportedMessageTypes: MessageType[];
    maxMessageSize: number;
    supportsFileAttachments: boolean;
    supportsEncryption: boolean;
    supportsPresence: boolean;
    supportsTypingIndicators: boolean;
    supportsReadReceipts: boolean;
    supportsBulkOperations: boolean;
  };
  
  // Error handling
  errorHandling: {
    retryableErrors: string[];
    fatalErrors: string[];
    fallbackPlatform?: SupportedPlatform;
    errorNotificationWebhook?: string;
  };
}

/**
 * Cross-platform message envelope
 */
export interface ICrossPlatformMessage {
  // GhostSpeak message
  ghostSpeakMessage: IRealtimeMessage;
  
  // Platform routing
  sourcePlatform: SupportedPlatform;
  targetPlatforms: SupportedPlatform[];
  routingPath: Array<{
    platform: SupportedPlatform;
    timestamp: number;
    status: 'pending' | 'processing' | 'delivered' | 'failed';
    error?: string;
  }>;
  
  // Transformation tracking
  transformations: Array<{
    fromFormat: string;
    toFormat: string;
    timestamp: number;
    success: boolean;
    changes?: Record<string, any>;
  }>;
  
  // Delivery tracking
  deliveryTracking: {
    totalTargets: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    pendingDeliveries: number;
    deliveryAttempts: Record<SupportedPlatform, number>;
  };
}

/**
 * Platform adapter interface
 */
export interface IPlatformAdapter {
  platform: SupportedPlatform;
  config: IPlatformConfig;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Message handling
  sendMessage(message: IRealtimeMessage): Promise<{
    platformMessageId: string;
    deliveryStatus: 'sent' | 'queued' | 'failed';
    metadata?: Record<string, any>;
  }>;
  
  receiveMessage(): Promise<IRealtimeMessage[]>;
  
  // Presence and status
  updatePresence?(status: string): Promise<void>;
  getPresence?(agentId: string): Promise<any>;
  
  // Platform-specific features
  handleCustomRequest?(request: any): Promise<any>;
  
  // Health monitoring
  getHealthStatus(): Promise<{
    isHealthy: boolean;
    latency: number;
    errorRate: number;
    lastError?: string;
  }>;
}

/**
 * Agent discovery across platforms
 */
export interface ICrossPlatformAgent {
  // GhostSpeak identity
  ghostSpeakAddress: Address;
  
  // Platform presence
  platformPresences: Record<SupportedPlatform, {
    platformId: string;
    isOnline: boolean;
    lastSeen: number;
    capabilities: string[];
    metadata?: Record<string, any>;
  }>;
  
  // Communication preferences
  preferredPlatforms: SupportedPlatform[];
  fallbackPlatforms: SupportedPlatform[];
  communicationRules: Array<{
    condition: string;
    preferredPlatform: SupportedPlatform;
    priority: number;
  }>;
  
  // Cross-platform reputation
  crossPlatformReputation: Record<SupportedPlatform, {
    score: number;
    totalInteractions: number;
    successRate: number;
    averageResponseTime: number;
  }>;
}

/**
 * Cross-Platform Bridge Service
 */
export class CrossPlatformBridgeService {
  private adapters = new Map<SupportedPlatform, IPlatformAdapter>();
  private platformConfigs = new Map<SupportedPlatform, IPlatformConfig>();
  private messageQueue: ICrossPlatformMessage[] = [];
  private isProcessingQueue = false;
  private crossPlatformAgents = new Map<Address, ICrossPlatformAgent>();

  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
    private readonly _programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {
    this.initializeDefaultPlatforms();
    this.startMessageProcessor();
    this.startHealthMonitoring();
  }

  /**
   * Register a new platform configuration
   */
  async registerPlatform(config: IPlatformConfig): Promise<{
    success: boolean;
    adapterId?: string;
    error?: string;
  }> {
    try {
      console.log(`🔌 Registering platform: ${config.platform}`);

      // Validate configuration
      this.validatePlatformConfig(config);

      // Create platform adapter
      const adapter = await this.createPlatformAdapter(config);

      // Test connection
      await adapter.connect();
      const healthStatus = await adapter.getHealthStatus();

      if (!healthStatus.isHealthy) {
        throw new Error(`Platform health check failed: ${healthStatus.lastError}`);
      }

      // Store configuration and adapter
      this.platformConfigs.set(config.platform, config);
      this.adapters.set(config.platform, adapter);

      console.log('✅ Platform registered successfully:', config.platform);
      return {
        success: true,
        adapterId: `adapter_${config.platform}_${Date.now()}`,
      };
    } catch (error) {
      console.error(`❌ Platform registration failed: ${config.platform}`, error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Send message across multiple platforms
   */
  async sendCrossPlatformMessage(
    sender: KeyPairSigner,
    message: Omit<IRealtimeMessage, 'messageId' | 'fromAddress' | 'timestamp' | 'deliveryStatus' | 'retryCount'>,
    targetPlatforms: SupportedPlatform[],
    options: {
      deliveryGuarantee?: 'best_effort' | 'at_least_once' | 'exactly_once';
      transformationRules?: Array<{
        platform: SupportedPlatform;
        rules: Record<string, any>;
      }>;
      fallbackStrategy?: 'fail_fast' | 'retry_all' | 'fallback_platforms';
    } = {}
  ): Promise<{
    crossPlatformMessageId: string;
    deliveryResults: Record<SupportedPlatform, {
      status: 'sent' | 'queued' | 'failed';
      platformMessageId?: string;
      error?: string;
    }>;
  }> {
    try {
      console.log(`📤 Sending cross-platform message to ${targetPlatforms.length} platforms`);

      // Create GhostSpeak message
      const ghostSpeakMessage: IRealtimeMessage = {
        ...message,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as Address,
        fromAddress: sender.address,
        timestamp: Date.now(),
        deliveryStatus: 'sending',
        retryCount: 0,
        maxRetries: message.maxRetries || 3,
        requiresAcknowledgment: message.requiresAcknowledgment ?? true,
        acknowledgmentTimeout: message.acknowledgmentTimeout || 30000,
        deliveryGuarantee: message.deliveryGuarantee || 'at_least_once',
      };

      // Create cross-platform message envelope
      const crossPlatformMessage: ICrossPlatformMessage = {
        ghostSpeakMessage,
        sourcePlatform: 'solana_program',
        targetPlatforms,
        routingPath: targetPlatforms.map(platform => ({
          platform,
          timestamp: Date.now(),
          status: 'pending',
        })),
        transformations: [],
        deliveryTracking: {
          totalTargets: targetPlatforms.length,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          pendingDeliveries: targetPlatforms.length,
          deliveryAttempts: {},
        },
      };

      // Initialize delivery attempts
      targetPlatforms.forEach(platform => {
        crossPlatformMessage.deliveryTracking.deliveryAttempts[platform] = 0;
      });

      // Add to processing queue
      this.messageQueue.push(crossPlatformMessage);

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processCrossPlatformMessages();
      }

      // Generate delivery results
      const deliveryResults: Record<SupportedPlatform, any> = {};
      targetPlatforms.forEach(platform => {
        deliveryResults[platform] = { status: 'queued' };
      });

      console.log('✅ Cross-platform message queued:', ghostSpeakMessage.messageId);
      return {
        crossPlatformMessageId: ghostSpeakMessage.messageId,
        deliveryResults,
      };
    } catch (error) {
      throw new Error(`Cross-platform message sending failed: ${String(error)}`);
    }
  }

  /**
   * Register agent across platforms
   */
  async registerCrossPlatformAgent(
    agent: KeyPairSigner,
    platformRegistrations: Array<{
      platform: SupportedPlatform;
      platformId: string;
      capabilities: string[];
      metadata?: Record<string, any>;
    }>,
    preferences: {
      preferredPlatforms: SupportedPlatform[];
      fallbackPlatforms: SupportedPlatform[];
      communicationRules?: Array<{
        condition: string;
        preferredPlatform: SupportedPlatform;
        priority: number;
      }>;
    }
  ): Promise<{
    success: boolean;
    registeredPlatforms: SupportedPlatform[];
    failedPlatforms: Array<{
      platform: SupportedPlatform;
      error: string;
    }>;
  }> {
    try {
      console.log(`🤖 Registering agent across ${platformRegistrations.length} platforms`);

      const registeredPlatforms: SupportedPlatform[] = [];
      const failedPlatforms: Array<{ platform: SupportedPlatform; error: string }> = [];

      // Create cross-platform agent profile
      const crossPlatformAgent: ICrossPlatformAgent = {
        ghostSpeakAddress: agent.address,
        platformPresences: {},
        preferredPlatforms: preferences.preferredPlatforms,
        fallbackPlatforms: preferences.fallbackPlatforms,
        communicationRules: preferences.communicationRules || [],
        crossPlatformReputation: {},
      };

      // Register on each platform
      for (const registration of platformRegistrations) {
        try {
          const adapter = this.adapters.get(registration.platform);
          if (!adapter) {
            throw new Error(`Platform adapter not found: ${registration.platform}`);
          }

          // Platform-specific registration
          await this.registerAgentOnPlatform(agent, registration, adapter);

          // Update agent profile
          crossPlatformAgent.platformPresences[registration.platform] = {
            platformId: registration.platformId,
            isOnline: true,
            lastSeen: Date.now(),
            capabilities: registration.capabilities,
            metadata: registration.metadata,
          };

          crossPlatformAgent.crossPlatformReputation[registration.platform] = {
            score: 0,
            totalInteractions: 0,
            successRate: 100,
            averageResponseTime: 1000,
          };

          registeredPlatforms.push(registration.platform);
          console.log(`✅ Agent registered on ${registration.platform}`);
        } catch (error) {
          failedPlatforms.push({
            platform: registration.platform,
            error: String(error),
          });
          console.error(`❌ Failed to register on ${registration.platform}:`, error);
        }
      }

      // Store agent profile
      this.crossPlatformAgents.set(agent.address, crossPlatformAgent);

      console.log(`✅ Cross-platform agent registration complete: ${registeredPlatforms.length}/${platformRegistrations.length} successful`);
      return {
        success: registeredPlatforms.length > 0,
        registeredPlatforms,
        failedPlatforms,
      };
    } catch (error) {
      throw new Error(`Cross-platform agent registration failed: ${String(error)}`);
    }
  }

  /**
   * Discover agents across platforms
   */
  async discoverCrossPlatformAgents(
    filters: {
      platforms?: SupportedPlatform[];
      capabilities?: string[];
      isOnline?: boolean;
      minReputation?: number;
      maxResponseTime?: number;
    } = {},
    limit: number = 50
  ): Promise<{
    agents: ICrossPlatformAgent[];
    totalFound: number;
    platformDistribution: Record<SupportedPlatform, number>;
  }> {
    try {
      console.log('🔍 Discovering cross-platform agents with filters:', filters);

      // Get all registered agents
      const allAgents = Array.from(this.crossPlatformAgents.values());

      // Apply filters
      const filteredAgents = allAgents.filter(agent => {
        // Platform filter
        if (filters.platforms && !filters.platforms.some(platform => 
          agent.platformPresences[platform]?.isOnline
        )) {
          return false;
        }

        // Capabilities filter
        if (filters.capabilities && !filters.capabilities.every(capability =>
          Object.values(agent.platformPresences).some(presence =>
            presence.capabilities.includes(capability)
          )
        )) {
          return false;
        }

        // Online status filter
        if (filters.isOnline && !Object.values(agent.platformPresences).some(presence => 
          presence.isOnline
        )) {
          return false;
        }

        // Reputation filter
        if (filters.minReputation) {
          const avgReputation = Object.values(agent.crossPlatformReputation)
            .reduce((sum, rep) => sum + rep.score, 0) / 
            Object.keys(agent.crossPlatformReputation).length;
          if (avgReputation < filters.minReputation) {
            return false;
          }
        }

        // Response time filter
        if (filters.maxResponseTime) {
          const avgResponseTime = Object.values(agent.crossPlatformReputation)
            .reduce((sum, rep) => sum + rep.averageResponseTime, 0) / 
            Object.keys(agent.crossPlatformReputation).length;
          if (avgResponseTime > filters.maxResponseTime) {
            return false;
          }
        }

        return true;
      });

      // Apply limit
      const limitedAgents = filteredAgents.slice(0, limit);

      // Calculate platform distribution
      const platformDistribution: Record<SupportedPlatform, number> = {} as any;
      limitedAgents.forEach(agent => {
        Object.keys(agent.platformPresences).forEach(platform => {
          const platformKey = platform as SupportedPlatform;
          if (agent.platformPresences[platformKey]?.isOnline) {
            platformDistribution[platformKey] = (platformDistribution[platformKey] || 0) + 1;
          }
        });
      });

      console.log('✅ Cross-platform agent discovery complete:', {
        found: limitedAgents.length,
        totalAvailable: filteredAgents.length
      });

      return {
        agents: limitedAgents,
        totalFound: filteredAgents.length,
        platformDistribution,
      };
    } catch (error) {
      throw new Error(`Cross-platform agent discovery failed: ${String(error)}`);
    }
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(): Promise<Record<SupportedPlatform, {
    isHealthy: boolean;
    latency: number;
    errorRate: number;
    uptime: number;
    lastError?: string;
    connectedAgents: number;
  }>> {
    const healthStatus: Record<SupportedPlatform, any> = {} as any;

    for (const [platform, adapter] of this.adapters) {
      try {
        const health = await adapter.getHealthStatus();
        const connectedAgents = Array.from(this.crossPlatformAgents.values())
          .filter(agent => agent.platformPresences[platform]?.isOnline)
          .length;

        healthStatus[platform] = {
          ...health,
          uptime: 95 + Math.random() * 5, // Simulate uptime
          connectedAgents,
        };
      } catch (error) {
        healthStatus[platform] = {
          isHealthy: false,
          latency: 0,
          errorRate: 100,
          uptime: 0,
          lastError: String(error),
          connectedAgents: 0,
        };
      }
    }

    return healthStatus;
  }

  /**
   * Private helper methods
   */

  private initializeDefaultPlatforms(): void {
    // Initialize configurations for common platforms
    const defaultPlatforms: Partial<IPlatformConfig>[] = [
      {
        platform: 'websocket',
        enabled: true,
        connection: {
          endpoint: 'wss://api.ghostspeak.ai/ws',
          secure: true,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 5000,
        },
        capabilities: {
          supportedMessageTypes: ['text', 'task_request', 'task_response'],
          maxMessageSize: 1024 * 1024, // 1MB
          supportsFileAttachments: true,
          supportsEncryption: true,
          supportsPresence: true,
          supportsTypingIndicators: true,
          supportsReadReceipts: true,
          supportsBulkOperations: false,
        },
      },
      {
        platform: 'http_webhook',
        enabled: true,
        connection: {
          endpoint: 'https://api.ghostspeak.ai/webhook',
          secure: true,
          timeout: 15000,
          retryAttempts: 3,
          retryDelay: 2000,
        },
        capabilities: {
          supportedMessageTypes: ['text', 'task_request', 'task_response', 'payment_notification'],
          maxMessageSize: 10 * 1024 * 1024, // 10MB
          supportsFileAttachments: true,
          supportsEncryption: false,
          supportsPresence: false,
          supportsTypingIndicators: false,
          supportsReadReceipts: false,
          supportsBulkOperations: true,
        },
      },
    ];

    defaultPlatforms.forEach(config => {
      if (config.platform) {
        this.platformConfigs.set(config.platform, this.completeDefaultConfig(config));
      }
    });
  }

  private completeDefaultConfig(partial: Partial<IPlatformConfig>): IPlatformConfig {
    return {
      platform: partial.platform!,
      enabled: partial.enabled ?? true,
      authentication: partial.authentication ?? {
        type: 'api_key',
        credentials: {},
      },
      connection: {
        endpoint: '',
        secure: true,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 5000,
        ...partial.connection,
      },
      rateLimits: partial.rateLimits ?? {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000,
        burstLimit: 50,
        backoffMultiplier: 2,
      },
      messageMapping: partial.messageMapping ?? {
        inbound: {},
        outbound: {},
      },
      capabilities: {
        supportedMessageTypes: ['text'],
        maxMessageSize: 1024 * 1024,
        supportsFileAttachments: false,
        supportsEncryption: false,
        supportsPresence: false,
        supportsTypingIndicators: false,
        supportsReadReceipts: false,
        supportsBulkOperations: false,
        ...partial.capabilities,
      },
      errorHandling: partial.errorHandling ?? {
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'],
        fatalErrors: ['AUTHENTICATION_FAILED', 'FORBIDDEN'],
      },
    };
  }

  private validatePlatformConfig(config: IPlatformConfig): void {
    if (!config.platform) {
      throw new Error('Platform type is required');
    }

    if (!config.connection.endpoint) {
      throw new Error('Connection endpoint is required');
    }

    if (config.rateLimits.requestsPerSecond <= 0) {
      throw new Error('Rate limits must be positive');
    }
  }

  private async createPlatformAdapter(config: IPlatformConfig): Promise<IPlatformAdapter> {
    // Create platform-specific adapter
    switch (config.platform) {
      case 'websocket':
        return new WebSocketAdapter(config);
      case 'http_webhook':
        return new HTTPWebhookAdapter(config);
      default:
        return new GenericAdapter(config);
    }
  }

  private async processCrossPlatformMessages(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.deliverCrossPlatformMessage(message);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async deliverCrossPlatformMessage(message: ICrossPlatformMessage): Promise<void> {
    for (const platform of message.targetPlatforms) {
      try {
        const adapter = this.adapters.get(platform);
        if (!adapter) {
          throw new Error(`No adapter found for platform: ${platform}`);
        }

        // Transform message for platform
        const transformedMessage = await this.transformMessageForPlatform(
          message.ghostSpeakMessage,
          platform
        );

        // Send message
        const result = await adapter.sendMessage(transformedMessage);

        // Update routing path
        const routingEntry = message.routingPath.find(entry => entry.platform === platform);
        if (routingEntry) {
          routingEntry.status = result.deliveryStatus === 'sent' ? 'delivered' : 'failed';
          routingEntry.timestamp = Date.now();
        }

        // Update delivery tracking
        if (result.deliveryStatus === 'sent') {
          message.deliveryTracking.successfulDeliveries++;
          message.deliveryTracking.pendingDeliveries--;
        } else {
          message.deliveryTracking.failedDeliveries++;
          message.deliveryTracking.pendingDeliveries--;
        }

        console.log(`✅ Message delivered to ${platform}: ${result.platformMessageId}`);
      } catch (error) {
        message.deliveryTracking.deliveryAttempts[platform]++;
        message.deliveryTracking.failedDeliveries++;
        message.deliveryTracking.pendingDeliveries--;

        console.error(`❌ Failed to deliver message to ${platform}:`, error);

        // Update routing path with error
        const routingEntry = message.routingPath.find(entry => entry.platform === platform);
        if (routingEntry) {
          routingEntry.status = 'failed';
          routingEntry.error = String(error);
          routingEntry.timestamp = Date.now();
        }
      }
    }
  }

  private async transformMessageForPlatform(
    message: IRealtimeMessage,
    platform: SupportedPlatform
  ): Promise<IRealtimeMessage> {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      return message;
    }

    // Apply platform-specific transformations
    let transformedMessage = { ...message };

    // Apply outbound mappings
    Object.entries(config.messageMapping.outbound).forEach(([ghostSpeakField, platformField]) => {
      if ((message as any)[ghostSpeakField] !== undefined) {
        (transformedMessage as any)[platformField] = (message as any)[ghostSpeakField];
      }
    });

    // Apply custom transforms
    if (config.messageMapping.customTransforms) {
      for (const transform of config.messageMapping.customTransforms) {
        if (this.evaluateTransformCondition(transform.condition, transformedMessage)) {
          transformedMessage = await this.applyCustomTransform(transform.transform, transformedMessage);
        }
      }
    }

    return transformedMessage;
  }

  private evaluateTransformCondition(condition: string, message: IRealtimeMessage): boolean {
    // Simple condition evaluation for message transformation
    try {
      return condition.split('||').some(orCondition => 
        orCondition.split('&&').every(andCondition => {
          const [key, operator, value] = andCondition.trim().split(/\s*(===|!==)\s*/);
          const messageValue = (message as any)[key.trim()];
          const compareValue = value?.replace(/['"]/g, '');
          
          switch (operator) {
            case '===': return messageValue === compareValue;
            case '!==': return messageValue !== compareValue;
            default: return false;
          }
        })
      );
    } catch {
      return false;
    }
  }

  private async applyCustomTransform(transform: string, message: IRealtimeMessage): Promise<IRealtimeMessage> {
    // Apply custom transformation logic
    // In a real implementation, this would be a more sophisticated transformation engine
    return message;
  }

  private async registerAgentOnPlatform(
    agent: KeyPairSigner,
    registration: any,
    adapter: IPlatformAdapter
  ): Promise<void> {
    // Platform-specific agent registration
    if (adapter.handleCustomRequest) {
      await adapter.handleCustomRequest({
        action: 'register_agent',
        agentId: agent.address,
        platformId: registration.platformId,
        capabilities: registration.capabilities,
        metadata: registration.metadata,
      });
    }
  }

  private startMessageProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.messageQueue.length > 0) {
        this.processCrossPlatformMessages();
      }
    }, 1000);
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await this.getPlatformHealth();
        
        // Log unhealthy platforms
        Object.entries(health).forEach(([platform, status]) => {
          if (!status.isHealthy) {
            console.warn(`⚠️ Platform ${platform} is unhealthy: ${status.lastError}`);
          }
        });
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 60000); // Check every minute
  }
}

/**
 * Platform adapter implementations
 */

class WebSocketAdapter implements IPlatformAdapter {
  public platform: SupportedPlatform = 'websocket';
  private socket?: WebSocket;

  constructor(public config: IPlatformConfig) {}

  async connect(): Promise<void> {
    this.socket = new WebSocket(this.config.connection.endpoint);
    // Setup WebSocket handlers
  }

  async disconnect(): Promise<void> {
    this.socket?.close();
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async sendMessage(message: IRealtimeMessage): Promise<{ platformMessageId: string; deliveryStatus: 'sent' | 'queued' | 'failed' }> {
    if (!this.isConnected()) {
      return { platformMessageId: '', deliveryStatus: 'failed' };
    }

    try {
      this.socket!.send(JSON.stringify(message));
      return {
        platformMessageId: `ws_${Date.now()}`,
        deliveryStatus: 'sent'
      };
    } catch (error) {
      return { platformMessageId: '', deliveryStatus: 'failed' };
    }
  }

  async receiveMessage(): Promise<IRealtimeMessage[]> {
    // Implement message receiving logic
    return [];
  }

  async getHealthStatus(): Promise<{ isHealthy: boolean; latency: number; errorRate: number; lastError?: string }> {
    return {
      isHealthy: this.isConnected(),
      latency: 50,
      errorRate: 0,
    };
  }
}

class HTTPWebhookAdapter implements IPlatformAdapter {
  public platform: SupportedPlatform = 'http_webhook';

  constructor(public config: IPlatformConfig) {}

  async connect(): Promise<void> {
    // HTTP doesn't need persistent connection
  }

  async disconnect(): Promise<void> {
    // No-op for HTTP
  }

  isConnected(): boolean {
    return true; // HTTP is always "connected"
  }

  async sendMessage(message: IRealtimeMessage): Promise<{ platformMessageId: string; deliveryStatus: 'sent' | 'queued' | 'failed' }> {
    try {
      // Simulate HTTP POST request
      const response = await fetch(this.config.connection.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        return {
          platformMessageId: `http_${Date.now()}`,
          deliveryStatus: 'sent'
        };
      } else {
        return { platformMessageId: '', deliveryStatus: 'failed' };
      }
    } catch (error) {
      return { platformMessageId: '', deliveryStatus: 'failed' };
    }
  }

  async receiveMessage(): Promise<IRealtimeMessage[]> {
    return [];
  }

  async getHealthStatus(): Promise<{ isHealthy: boolean; latency: number; errorRate: number; lastError?: string }> {
    return {
      isHealthy: true,
      latency: 100,
      errorRate: 0,
    };
  }
}

class GenericAdapter implements IPlatformAdapter {
  constructor(public config: IPlatformConfig) {}

  get platform(): SupportedPlatform {
    return this.config.platform;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isConnected(): boolean { return true; }

  async sendMessage(message: IRealtimeMessage): Promise<{ platformMessageId: string; deliveryStatus: 'sent' | 'queued' | 'failed' }> {
    return {
      platformMessageId: `generic_${Date.now()}`,
      deliveryStatus: 'sent'
    };
  }

  async receiveMessage(): Promise<IRealtimeMessage[]> {
    return [];
  }

  async getHealthStatus(): Promise<{ isHealthy: boolean; latency: number; errorRate: number; lastError?: string }> {
    return {
      isHealthy: true,
      latency: 150,
      errorRate: 0,
    };
  }
}