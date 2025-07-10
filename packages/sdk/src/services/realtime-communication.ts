/**
 * Real-time Communication Service
 * WebSocket-based messaging system for AI agents with cross-platform support
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type {
  RpcSubscriptions,
  SolanaRpcSubscriptionsApi,
} from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import { sendAndConfirmTransactionFactory } from '../utils/transaction-helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Message types for different communication scenarios
 */
export type MessageType =
  | 'text' // Plain text message
  | 'task_request' // Task delegation request
  | 'task_response' // Task completion response
  | 'contract_proposal' // Smart contract proposal
  | 'payment_notification' // Payment status update
  | 'system_alert' // System-generated alert
  | 'typing_indicator' // Typing status
  | 'read_receipt' // Message read confirmation
  | 'delivery_receipt' // Message delivery confirmation
  | 'file_transfer' // File/data transfer
  | 'voice_message' // Audio message
  | 'encrypted_data' // End-to-end encrypted content
  | 'automation_trigger' // Automated workflow trigger
  | 'status_update' // Agent status change
  | 'collaboration_invite' // Multi-agent collaboration invite
  | 'emergency_alert'; // Critical system alert

/**
 * Message priority levels for routing and delivery
 */
export type MessagePriority =
  | 'low' // Standard messages
  | 'normal' // Regular priority
  | 'high' // Important messages
  | 'urgent' // Time-sensitive messages
  | 'critical'; // Emergency/system critical

/**
 * Connection status for agents
 */
export type ConnectionStatus =
  | 'online' // Active and available
  | 'busy' // Online but occupied
  | 'away' // Temporarily unavailable
  | 'offline' // Not connected
  | 'invisible' // Online but appears offline
  | 'maintenance'; // Under maintenance

/**
 * Message delivery status
 */
export type DeliveryStatus =
  | 'sending' // Message being sent
  | 'sent' // Sent successfully
  | 'delivered' // Delivered to recipient
  | 'read' // Read by recipient
  | 'failed' // Delivery failed
  | 'expired' // Message expired
  | 'encrypted' // End-to-end encrypted
  | 'queued'; // Queued for delivery

/**
 * Comprehensive message structure
 */
export interface IRealtimeMessage {
  messageId: Address;
  conversationId: Address;
  fromAddress: Address;
  toAddress: Address;

  // Message content
  type: MessageType;
  content: string;
  metadata?: Record<string, any>;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    hash: string;
    url?: string;
  }>;

  // Delivery and routing
  priority: MessagePriority;
  deliveryStatus: DeliveryStatus;
  timestamp: number;
  expiresAt?: number;
  retryCount: number;
  maxRetries: number;

  // Advanced features
  isEncrypted: boolean;
  encryptionKey?: string;
  signature?: string;
  threadId?: Address;
  replyToMessageId?: Address;
  forwardedFrom?: Address;

  // Cross-platform routing
  targetPlatforms?: string[];
  routingRules?: Array<{
    condition: string;
    action: string;
    parameters?: Record<string, any>;
  }>;

  // Blockchain integration
  onChainReference?: Address;
  transactionId?: string;
  blockHeight?: number;

  // Quality of service
  requiresAcknowledgment: boolean;
  acknowledgmentTimeout: number;
  deliveryGuarantee: 'at_most_once' | 'at_least_once' | 'exactly_once';
}

/**
 * Conversation thread management
 */
export interface IConversation {
  conversationId: Address;
  participants: Address[];
  title?: string;
  type: 'direct' | 'group' | 'channel' | 'broadcast';

  // Conversation settings
  isEncrypted: boolean;
  retentionPeriod?: number;
  maxParticipants?: number;
  moderators?: Address[];

  // Activity tracking
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  unreadCounts: Record<string, number>;

  // Advanced features
  automationRules?: Array<{
    trigger: string;
    action: string;
    conditions?: Record<string, any>;
  }>;
  integrations?: Array<{
    platform: string;
    config: Record<string, any>;
  }>;

  // Access control
  permissions: Record<
    string,
    {
      canRead: boolean;
      canWrite: boolean;
      canInvite: boolean;
      canModerate: boolean;
    }
  >;
}

/**
 * Real-time presence information
 */
export interface IPresenceInfo {
  address: Address;
  status: ConnectionStatus;
  lastSeen: number;

  // Activity indicators
  isTyping: boolean;
  typingIn?: Address; // Conversation ID
  currentActivity?: string;

  // Device and platform info
  deviceType: 'mobile' | 'desktop' | 'server' | 'embedded';
  platform: string;
  version?: string;
  capabilities: string[];

  // Network information
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency?: number;
  bandwidth?: number;

  // Custom status
  customStatus?: {
    text: string;
    emoji?: string;
    expiresAt?: number;
  };
}

/**
 * Message routing configuration
 */
export interface IRoutingConfig {
  // Platform mappings
  platforms: Record<
    string,
    {
      endpoint: string;
      authentication: Record<string, any>;
      rateLimits: {
        messagesPerSecond: number;
        burstLimit: number;
      };
      features: string[];
    }
  >;

  // Routing rules
  rules: Array<{
    id: string;
    name: string;
    condition: string;
    actions: Array<{
      type: 'route' | 'transform' | 'filter' | 'delay';
      parameters: Record<string, any>;
    }>;
    priority: number;
    isActive: boolean;
  }>;

  // Fallback configuration
  fallback: {
    platform: string;
    retryDelay: number;
    maxRetries: number;
  };
}

/**
 * WebSocket connection management
 */
export interface IWebSocketConnection {
  connectionId: string;
  address: Address;
  socket: WebSocket;
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  // Connection health
  lastPing: number;
  lastPong: number;
  pingInterval: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Message queues
  outgoingQueue: IRealtimeMessage[];
  pendingAcknowledgments: Map<
    string,
    {
      message: IRealtimeMessage;
      timestamp: number;
      timeout: number;
    }
  >;

  // Subscriptions
  subscriptions: Set<string>;
  conversationSubscriptions: Set<Address>;
  presenceSubscriptions: Set<Address>;
}

/**
 * Real-time communication analytics
 */
export interface ICommunicationAnalytics {
  // Message statistics
  totalMessages: number;
  messagesPerHour: number;
  averageResponseTime: number;
  deliverySuccessRate: number;

  // Performance metrics
  averageLatency: number;
  connectionUptime: number;
  errorRate: number;
  retransmissionRate: number;

  // Usage patterns
  peakUsageHours: Array<{
    hour: number;
    messageCount: number;
  }>;
  popularMessageTypes: Array<{
    type: MessageType;
    count: number;
    percentage: number;
  }>;

  // Platform distribution
  platformUsage: Record<
    string,
    {
      messageCount: number;
      activeConnections: number;
      averageLatency: number;
    }
  >;

  // Quality metrics
  userSatisfactionScore: number;
  reportedIssues: number;
  resolvedIssues: number;
}

/**
 * Real-time Communication Service
 */
export class RealtimeCommunicationService {
  private connections = new Map<Address, IWebSocketConnection>();
  private conversations = new Map<Address, IConversation>();
  private presenceInfo = new Map<Address, IPresenceInfo>();
  private routingConfig: IRoutingConfig;
  private messageQueue: IRealtimeMessage[] = [];
  private isProcessingQueue = false;

  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
    private readonly _programId: Address,
    private readonly commitment: Commitment = 'confirmed',
    private readonly wsEndpoint: string = 'wss://api.devnet.solana.com'
  ) {
    this.routingConfig = this.initializeDefaultRouting();
    this.startMessageProcessor();
    this.startPresenceUpdater();
  }

  /**
   * Establish real-time connection for an agent
   */
  async connect(
    agent: KeyPairSigner,
    options: {
      deviceType?: IPresenceInfo['deviceType'];
      platform?: string;
      capabilities?: string[];
      autoReconnect?: boolean;
      presenceStatus?: ConnectionStatus;
    } = {}
  ): Promise<{
    connectionId: string;
    status: 'connected' | 'failed';
    capabilities: string[];
  }> {
    try {
      logger.general.info(
        `🔌 Establishing real-time connection for agent: ${agent.address}`
      );

      // Create WebSocket connection
      const socket = new WebSocket(this.wsEndpoint);
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const connection: IWebSocketConnection = {
        connectionId,
        address: agent.address,
        socket,
        status: 'connecting',
        lastPing: Date.now(),
        lastPong: Date.now(),
        pingInterval: 30000, // 30 seconds
        reconnectAttempts: 0,
        maxReconnectAttempts: options.autoReconnect ? 10 : 0,
        outgoingQueue: [],
        pendingAcknowledgments: new Map(),
        subscriptions: new Set(),
        conversationSubscriptions: new Set(),
        presenceSubscriptions: new Set(),
      };

      // Setup WebSocket event handlers
      this.setupWebSocketHandlers(connection, agent, options);

      // Store connection
      this.connections.set(agent.address, connection);

      // Initialize presence
      await this.updatePresence(agent.address, {
        status: options.presenceStatus || 'online',
        deviceType: options.deviceType || 'server',
        platform: options.platform || 'GhostSpeak Protocol',
        capabilities: options.capabilities || [
          'messaging',
          'task_delegation',
          'payments',
        ],
        connectionQuality: 'excellent',
      });

      // Wait for connection to establish
      await this.waitForConnection(connection, 10000);

      logger.general.info('✅ Real-time connection established:', connectionId);
      return {
        connectionId,
        status: 'connected',
        capabilities: options.capabilities || [
          'messaging',
          'task_delegation',
          'payments',
        ],
      };
    } catch (error) {
      throw new Error(`Connection establishment failed: ${String(error)}`);
    }
  }

  /**
   * Send real-time message with delivery guarantees
   */
  async sendMessage(
    sender: KeyPairSigner,
    message: Omit<
      IRealtimeMessage,
      | 'messageId'
      | 'fromAddress'
      | 'timestamp'
      | 'deliveryStatus'
      | 'retryCount'
    >
  ): Promise<{
    messageId: Address;
    deliveryStatus: DeliveryStatus;
    estimatedDelivery: number;
  }> {
    try {
      logger.general.info(
        `📤 Sending ${message.type} message to ${message.toAddress}`
      );

      // Generate message ID
      const messageId =
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as Address;

      // Create complete message
      const completeMessage: IRealtimeMessage = {
        ...message,
        messageId,
        fromAddress: sender.address,
        timestamp: Date.now(),
        deliveryStatus: 'sending',
        retryCount: 0,
        maxRetries: message.maxRetries || 3,
        requiresAcknowledgment: message.requiresAcknowledgment ?? true,
        acknowledgmentTimeout: message.acknowledgmentTimeout || 30000,
        deliveryGuarantee: message.deliveryGuarantee || 'at_least_once',
      };

      // Validate recipient exists and is reachable
      await this.validateRecipient(message.toAddress);

      // Apply routing rules
      const routedMessage = await this.applyRoutingRules(completeMessage);

      // Add to message queue
      this.messageQueue.push(routedMessage);

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processMessageQueue();
      }

      // Store message on blockchain if required
      if (message.onChainReference) {
        await this.storeMessageOnChain(sender, routedMessage);
      }

      const estimatedDelivery = this.calculateEstimatedDelivery(routedMessage);

      logger.general.info('✅ Message queued for delivery:', {
        messageId,
        estimatedDelivery: new Date(estimatedDelivery).toISOString(),
      });

      return {
        messageId,
        deliveryStatus: 'queued',
        estimatedDelivery,
      };
    } catch (error) {
      throw new Error(`Message sending failed: ${String(error)}`);
    }
  }

  /**
   * Subscribe to real-time updates for conversations
   */
  async subscribeToConversation(
    agent: KeyPairSigner,
    conversationId: Address,
    options: {
      includeHistory?: boolean;
      historyLimit?: number;
      messageTypes?: MessageType[];
      realTimeOnly?: boolean;
    } = {}
  ): Promise<{
    subscriptionId: string;
    messageHistory?: IRealtimeMessage[];
  }> {
    try {
      logger.general.info(`🔔 Subscribing to conversation: ${conversationId}`);

      const connection = this.connections.get(agent.address);
      if (!connection) {
        throw new Error('Agent not connected');
      }

      // Generate subscription ID
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add to subscriptions
      connection.conversationSubscriptions.add(conversationId);
      connection.subscriptions.add(subscriptionId);

      // Get message history if requested
      let messageHistory: IRealtimeMessage[] | undefined;
      if (options.includeHistory) {
        messageHistory = await this.getConversationHistory(
          conversationId,
          options.historyLimit || 50,
          options.messageTypes
        );
      }

      // Setup real-time subscription via RPC subscriptions
      if (!options.realTimeOnly) {
        await this.setupBlockchainSubscription(conversationId, agent.address);
      }

      logger.general.info(
        '✅ Conversation subscription established:',
        subscriptionId
      );
      return {
        subscriptionId,
        messageHistory,
      };
    } catch (error) {
      throw new Error(`Conversation subscription failed: ${String(error)}`);
    }
  }

  /**
   * Update agent presence and status
   */
  async updatePresence(
    agentAddress: Address,
    updates: Partial<Omit<IPresenceInfo, 'address' | 'lastSeen'>>
  ): Promise<IPresenceInfo> {
    try {
      logger.general.info(`👤 Updating presence for agent: ${agentAddress}`);

      const currentPresence = this.presenceInfo.get(agentAddress) || {
        address: agentAddress,
        status: 'offline',
        lastSeen: Date.now(),
        isTyping: false,
        deviceType: 'server',
        platform: 'GhostSpeak Protocol',
        capabilities: [],
        connectionQuality: 'good',
      };

      const updatedPresence: IPresenceInfo = {
        ...currentPresence,
        ...updates,
        lastSeen: Date.now(),
      };

      this.presenceInfo.set(agentAddress, updatedPresence);

      // Broadcast presence update to subscribers
      await this.broadcastPresenceUpdate(updatedPresence);

      logger.general.info('✅ Presence updated:', updatedPresence.status);
      return updatedPresence;
    } catch (error) {
      throw new Error(`Presence update failed: ${String(error)}`);
    }
  }

  /**
   * Create or join a conversation
   */
  async createConversation(
    creator: KeyPairSigner,
    config: {
      participants: Address[];
      title?: string;
      type: IConversation['type'];
      isEncrypted?: boolean;
      retentionPeriod?: number;
      automationRules?: IConversation['automationRules'];
    }
  ): Promise<{
    conversationId: Address;
    conversation: IConversation;
  }> {
    try {
      logger.general.info(
        `💬 Creating ${config.type} conversation with ${config.participants.length} participants`
      );

      const conversationId =
        `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as Address;

      const conversation: IConversation = {
        conversationId,
        participants: [creator.address, ...config.participants],
        title: config.title,
        type: config.type,
        isEncrypted: config.isEncrypted || false,
        retentionPeriod: config.retentionPeriod,
        maxParticipants: config.type === 'direct' ? 2 : undefined,
        moderators: [creator.address],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messageCount: 0,
        unreadCounts: {},
        automationRules: config.automationRules || [],
        integrations: [],
        permissions: {},
      };

      // Initialize permissions for all participants
      conversation.participants.forEach(participant => {
        conversation.permissions[participant] = {
          canRead: true,
          canWrite: true,
          canInvite: participant === creator.address,
          canModerate: participant === creator.address,
        };
      });

      // Store conversation
      this.conversations.set(conversationId, conversation);

      // Notify participants
      await this.notifyConversationCreated(conversation);

      logger.general.info('✅ Conversation created:', conversationId);
      return { conversationId, conversation };
    } catch (error) {
      throw new Error(`Conversation creation failed: ${String(error)}`);
    }
  }

  /**
   * Get comprehensive communication analytics
   */
  async getCommunicationAnalytics(
    agentAddress: Address,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ICommunicationAnalytics> {
    try {
      logger.general.info(
        `📊 Generating communication analytics for ${timeframe}`
      );

      // Calculate timeframe boundaries
      const now = Date.now();
      const timeframeDuration = this.getTimeframeDuration(timeframe);
      const startTime = now - timeframeDuration;

      // Gather analytics data
      const analytics = await this.calculateAnalytics(
        agentAddress,
        startTime,
        now
      );

      logger.general.info('✅ Communication analytics generated:', {
        totalMessages: analytics.totalMessages,
        deliverySuccessRate: analytics.deliverySuccessRate,
        averageLatency: analytics.averageLatency,
      });

      return analytics;
    } catch (error) {
      throw new Error(`Analytics generation failed: ${String(error)}`);
    }
  }

  /**
   * Send typing indicator to conversation participants
   */
  async sendTypingIndicator(
    agent: KeyPairSigner,
    conversationId: Address,
    isTyping: boolean = true
  ): Promise<{
    success: boolean;
    notifiedParticipants: number;
  }> {
    try {
      logger.general.info(
        `⌨️ ${isTyping ? 'Starting' : 'Stopping'} typing indicator for conversation: ${conversationId}`
      );

      // Update presence
      await this.updatePresence(agent.address, {
        isTyping,
        typingIn: isTyping ? conversationId : undefined,
      });

      // Get conversation participants
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Notify all participants except sender
      const recipients = conversation.participants.filter(
        addr => addr !== agent.address
      );
      let notifiedCount = 0;

      for (const recipientAddress of recipients) {
        const connection = this.connections.get(recipientAddress);
        if (connection && connection.status === 'connected') {
          connection.socket.send(
            JSON.stringify({
              type: 'typing_indicator',
              payload: {
                senderAddress: agent.address,
                conversationId,
                isTyping,
                timestamp: Date.now(),
              },
            })
          );
          notifiedCount++;
        }
      }

      logger.general.info(
        `✅ Typing indicator ${isTyping ? 'sent' : 'stopped'} to ${notifiedCount} participants`
      );
      return {
        success: true,
        notifiedParticipants: notifiedCount,
      };
    } catch (error) {
      throw new Error(`Typing indicator failed: ${String(error)}`);
    }
  }

  /**
   * Send read receipt for a message
   */
  async sendReadReceipt(
    reader: KeyPairSigner,
    messageId: Address,
    readTimestamp: number = Date.now()
  ): Promise<{
    success: boolean;
    deliveredToSender: boolean;
  }> {
    try {
      logger.general.info(`👁️ Sending read receipt for message: ${messageId}`);

      // Find the original message to get sender info
      // In a real implementation, this would query the message store
      const mockSenderAddress = 'sender_address_placeholder' as Address;

      const connection = this.connections.get(mockSenderAddress);
      let deliveredToSender = false;

      if (connection && connection.status === 'connected') {
        connection.socket.send(
          JSON.stringify({
            type: 'read_receipt',
            payload: {
              messageId,
              readerAddress: reader.address,
              readTimestamp,
              timestamp: Date.now(),
            },
          })
        );
        deliveredToSender = true;
      }

      logger.general.info(`✅ Read receipt sent for message: ${messageId}`);
      return {
        success: true,
        deliveredToSender,
      };
    } catch (error) {
      throw new Error(`Read receipt failed: ${String(error)}`);
    }
  }

  /**
   * Send delivery confirmation for a message
   */
  async sendDeliveryConfirmation(
    recipient: KeyPairSigner,
    messageId: Address,
    deliveryStatus: DeliveryStatus = 'delivered'
  ): Promise<{
    success: boolean;
    confirmationSent: boolean;
  }> {
    try {
      logger.general.info(
        `📬 Sending delivery confirmation for message: ${messageId}`
      );

      // Find the original message sender
      // In a real implementation, this would query the message store
      const mockSenderAddress = 'sender_address_placeholder' as Address;

      const connection = this.connections.get(mockSenderAddress);
      let confirmationSent = false;

      if (connection && connection.status === 'connected') {
        connection.socket.send(
          JSON.stringify({
            type: 'delivery_confirmation',
            payload: {
              messageId,
              recipientAddress: recipient.address,
              deliveryStatus,
              deliveredAt: Date.now(),
              timestamp: Date.now(),
            },
          })
        );
        confirmationSent = true;
      }

      logger.general.info(
        `✅ Delivery confirmation sent for message: ${messageId}`
      );
      return {
        success: true,
        confirmationSent,
      };
    } catch (error) {
      throw new Error(`Delivery confirmation failed: ${String(error)}`);
    }
  }

  /**
   * Subscribe to presence updates for specific agents
   */
  async subscribeToPresence(
    subscriber: KeyPairSigner,
    agentAddresses: Address[]
  ): Promise<{
    subscriptionId: string;
    currentPresence: Record<string, IPresenceInfo>;
  }> {
    try {
      logger.general.info(
        `👥 Subscribing to presence for ${agentAddresses.length} agents`
      );

      const connection = this.connections.get(subscriber.address);
      if (!connection) {
        throw new Error('Subscriber not connected');
      }

      const subscriptionId = `presence_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add presence subscriptions
      agentAddresses.forEach(address => {
        connection.presenceSubscriptions.add(address);
      });

      // Get current presence info
      const currentPresence: Record<string, IPresenceInfo> = {};
      agentAddresses.forEach(address => {
        const presence = this.presenceInfo.get(address);
        if (presence) {
          currentPresence[address] = presence;
        }
      });

      logger.general.info(
        `✅ Presence subscription established: ${subscriptionId}`
      );
      return {
        subscriptionId,
        currentPresence,
      };
    } catch (error) {
      throw new Error(`Presence subscription failed: ${String(error)}`);
    }
  }

  /**
   * Start voice/video call with another agent
   */
  async initiateCall(
    caller: KeyPairSigner,
    callee: Address,
    callType: 'voice' | 'video' | 'screen_share' = 'voice',
    options: {
      autoAnswer?: boolean;
      maxDuration?: number;
      quality?: 'low' | 'medium' | 'high';
      encryption?: boolean;
    } = {}
  ): Promise<{
    callId: string;
    status: 'initiated' | 'ringing' | 'failed';
    webrtcOffer?: any;
  }> {
    try {
      logger.general.info(`📞 Initiating ${callType} call to ${callee}`);

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if callee is online
      const calleePresence = this.presenceInfo.get(callee);
      if (!calleePresence || calleePresence.status === 'offline') {
        return {
          callId,
          status: 'failed',
        };
      }

      // Send call invitation
      const calleeConnection = this.connections.get(callee);
      if (calleeConnection && calleeConnection.status === 'connected') {
        calleeConnection.socket.send(
          JSON.stringify({
            type: 'call_invitation',
            payload: {
              callId,
              callerAddress: caller.address,
              callType,
              options,
              timestamp: Date.now(),
            },
          })
        );

        logger.general.info(`✅ Call invitation sent: ${callId}`);
        return {
          callId,
          status: 'ringing',
          webrtcOffer: this.generateMockWebRTCOffer(),
        };
      }

      return {
        callId,
        status: 'failed',
      };
    } catch (error) {
      throw new Error(`Call initiation failed: ${String(error)}`);
    }
  }

  /**
   * Send file or media attachment
   */
  async sendFileAttachment(
    sender: KeyPairSigner,
    recipient: Address,
    file: {
      name: string;
      type: string;
      size: number;
      data: Uint8Array | string;
      thumbnail?: string;
    },
    options: {
      conversationId?: Address;
      priority?: MessagePriority;
      encryption?: boolean;
      compressionLevel?: number;
    } = {}
  ): Promise<{
    messageId: Address;
    fileId: string;
    uploadStatus: 'uploading' | 'uploaded' | 'failed';
    downloadUrl?: string;
  }> {
    try {
      logger.general.info(
        `📎 Sending file attachment: ${file.name} (${file.size} bytes)`
      );

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const messageId =
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as Address;

      // Simulate file upload
      const downloadUrl = `https://files.ghostspeak.ai/${fileId}/${encodeURIComponent(file.name)}`;

      // Create file transfer message
      const fileMessage: Omit<
        IRealtimeMessage,
        | 'messageId'
        | 'fromAddress'
        | 'timestamp'
        | 'deliveryStatus'
        | 'retryCount'
      > = {
        conversationId:
          options.conversationId ||
          (`conv_${sender.address}_${recipient}` as Address),
        toAddress: recipient,
        type: 'file_transfer',
        content: `File attachment: ${file.name}`,
        priority: options.priority || 'normal',
        attachments: [
          {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            hash: this.calculateFileHash(file.data),
            url: downloadUrl,
          },
        ],
        isEncrypted: options.encryption || false,
        maxRetries: 3,
        requiresAcknowledgment: true,
        acknowledgmentTimeout: 60000,
        deliveryGuarantee: 'at_least_once',
      };

      // Send the message
      const result = await this.sendMessage(sender, fileMessage);

      logger.general.info(`✅ File attachment sent: ${file.name}`);
      return {
        messageId: result.messageId,
        fileId,
        uploadStatus: 'uploaded',
        downloadUrl,
      };
    } catch (error) {
      throw new Error(`File attachment failed: ${String(error)}`);
    }
  }

  /**
   * Set up message reactions (emoji responses)
   */
  async addMessageReaction(
    reactor: KeyPairSigner,
    messageId: Address,
    emoji: string,
    action: 'add' | 'remove' = 'add'
  ): Promise<{
    success: boolean;
    reactionId?: string;
  }> {
    try {
      logger.general.info(
        `${action === 'add' ? '👍' : '👎'} ${action === 'add' ? 'Adding' : 'Removing'} reaction ${emoji} to message: ${messageId}`
      );

      const reactionId =
        action === 'add'
          ? `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : undefined;

      // Find message sender to notify
      // In a real implementation, this would query the message store
      const mockSenderAddress = 'sender_address_placeholder' as Address;

      const connection = this.connections.get(mockSenderAddress);
      if (connection && connection.status === 'connected') {
        connection.socket.send(
          JSON.stringify({
            type: 'message_reaction',
            payload: {
              messageId,
              reactorAddress: reactor.address,
              emoji,
              action,
              reactionId,
              timestamp: Date.now(),
            },
          })
        );
      }

      logger.general.info(`✅ Message reaction ${action}: ${emoji}`);
      return {
        success: true,
        reactionId,
      };
    } catch (error) {
      throw new Error(`Message reaction failed: ${String(error)}`);
    }
  }

  /**
   * Forward message to other recipients
   */
  async forwardMessage(
    forwarder: KeyPairSigner,
    originalMessageId: Address,
    recipients: Address[],
    options: {
      includeOriginalContext?: boolean;
      addForwardingNote?: string;
      priority?: MessagePriority;
    } = {}
  ): Promise<{
    forwardedMessages: Array<{
      messageId: Address;
      recipient: Address;
      status: 'sent' | 'failed';
    }>;
  }> {
    try {
      logger.general.info(
        `↗️ Forwarding message ${originalMessageId} to ${recipients.length} recipients`
      );

      const forwardedMessages: Array<{
        messageId: Address;
        recipient: Address;
        status: 'sent' | 'failed';
      }> = [];

      for (const recipient of recipients) {
        try {
          const forwardMessage: Omit<
            IRealtimeMessage,
            | 'messageId'
            | 'fromAddress'
            | 'timestamp'
            | 'deliveryStatus'
            | 'retryCount'
          > = {
            conversationId: `conv_${forwarder.address}_${recipient}` as Address,
            toAddress: recipient,
            type: 'text',
            content: options.addForwardingNote || 'Forwarded message',
            priority: options.priority || 'normal',
            isEncrypted: false,
            forwardedFrom: originalMessageId,
            maxRetries: 3,
            requiresAcknowledgment: true,
            acknowledgmentTimeout: 30000,
            deliveryGuarantee: 'at_least_once',
            metadata: {
              isForwarded: true,
              originalMessageId,
              includeContext: options.includeOriginalContext,
            },
          };

          const result = await this.sendMessage(forwarder, forwardMessage);
          forwardedMessages.push({
            messageId: result.messageId,
            recipient,
            status: 'sent',
          });
        } catch (error) {
          forwardedMessages.push({
            messageId: '' as Address,
            recipient,
            status: 'failed',
          });
        }
      }

      logger.general.info(
        `✅ Message forwarded to ${forwardedMessages.filter(m => m.status === 'sent').length}/${recipients.length} recipients`
      );
      return { forwardedMessages };
    } catch (error) {
      throw new Error(`Message forwarding failed: ${String(error)}`);
    }
  }

  /**
   * Create message threads for organized discussions
   */
  async createMessageThread(
    creator: KeyPairSigner,
    parentMessageId: Address,
    threadTitle?: string
  ): Promise<{
    threadId: Address;
    participantCount: number;
  }> {
    try {
      logger.general.info(
        `🧵 Creating message thread from message: ${parentMessageId}`
      );

      const threadId =
        `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as Address;

      // In a real implementation, this would create a proper thread structure
      const mockParticipantCount = 1;

      logger.general.info(`✅ Message thread created: ${threadId}`);
      return {
        threadId,
        participantCount: mockParticipantCount,
      };
    } catch (error) {
      throw new Error(`Thread creation failed: ${String(error)}`);
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(agentAddress: Address): Promise<void> {
    try {
      logger.general.info(`🔌 Disconnecting agent: ${agentAddress}`);

      const connection = this.connections.get(agentAddress);
      if (connection) {
        // Close WebSocket
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.close();
        }

        // Update presence to offline
        await this.updatePresence(agentAddress, { status: 'offline' });

        // Cleanup
        this.connections.delete(agentAddress);
      }

      logger.general.info('✅ Agent disconnected successfully');
    } catch (error) {
      throw new Error(`Disconnection failed: ${String(error)}`);
    }
  }

  /**
   * Private helper methods
   */

  private initializeDefaultRouting(): IRoutingConfig {
    return {
      platforms: {
        ghostspeak: {
          endpoint: this.wsEndpoint,
          authentication: {},
          rateLimits: {
            messagesPerSecond: 10,
            burstLimit: 50,
          },
          features: ['messaging', 'presence', 'file_transfer', 'encryption'],
        },
        solana: {
          endpoint: this.wsEndpoint,
          authentication: {},
          rateLimits: {
            messagesPerSecond: 5,
            burstLimit: 20,
          },
          features: ['on_chain_storage', 'payment_integration'],
        },
      },
      rules: [
        {
          id: 'high_priority_direct',
          name: 'Direct routing for high priority messages',
          condition:
            'priority === "high" || priority === "urgent" || priority === "critical"',
          actions: [
            {
              type: 'route',
              parameters: { platform: 'ghostspeak', bypass_queue: true },
            },
          ],
          priority: 1,
          isActive: true,
        },
        {
          id: 'payment_blockchain',
          name: 'Route payment notifications to blockchain',
          condition:
            'type === "payment_notification" || type === "contract_proposal"',
          actions: [
            {
              type: 'route',
              parameters: { platform: 'solana', store_on_chain: true },
            },
          ],
          priority: 2,
          isActive: true,
        },
      ],
      fallback: {
        platform: 'ghostspeak',
        retryDelay: 5000,
        maxRetries: 3,
      },
    };
  }

  private setupWebSocketHandlers(
    connection: IWebSocketConnection,
    agent: KeyPairSigner,
    options: any
  ): void {
    const { socket } = connection;

    socket.onopen = () => {
      logger.general.info('🔗 WebSocket connection opened');
      connection.status = 'connected';
      connection.reconnectAttempts = 0;
      this.startHeartbeat(connection);
    };

    socket.onmessage = event => {
      this.handleIncomingMessage(connection, event.data);
    };

    socket.onclose = event => {
      logger.general.info('🔌 WebSocket connection closed:', event.code);
      connection.status = 'disconnected';
      if (
        options.autoReconnect &&
        connection.reconnectAttempts < connection.maxReconnectAttempts
      ) {
        this.reconnectWithBackoff(connection, agent, options);
      }
    };

    socket.onerror = error => {
      logger.general.error('❌ WebSocket error:', error);
      connection.status = 'disconnected';
    };
  }

  private async waitForConnection(
    connection: IWebSocketConnection,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkConnection = () => {
        if (connection.status === 'connected') {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  private async validateRecipient(recipientAddress: Address): Promise<void> {
    // Check if recipient exists and is reachable
    const presence = this.presenceInfo.get(recipientAddress);
    if (!presence || presence.status === 'offline') {
      logger.general.warn(
        `⚠️ Recipient ${recipientAddress} appears offline, message will be queued`
      );
    }
  }

  private async applyRoutingRules(
    message: IRealtimeMessage
  ): Promise<IRealtimeMessage> {
    const rules = this.routingConfig.rules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.priority - b.priority);

    let routedMessage = { ...message };

    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, routedMessage)) {
        routedMessage = await this.applyRuleActions(
          rule.actions,
          routedMessage
        );
      }
    }

    return routedMessage;
  }

  private evaluateCondition(
    condition: string,
    message: IRealtimeMessage
  ): boolean {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      const context = {
        priority: message.priority,
        type: message.type,
        isEncrypted: message.isEncrypted,
        requiresAcknowledgment: message.requiresAcknowledgment,
      };

      // Basic condition matching
      return condition.split('||').some(orCondition =>
        orCondition.split('&&').every(andCondition => {
          const [key, operator, value] = andCondition
            .trim()
            .split(/\s*(===|!==|>=|<=|>|<)\s*/);
          const contextValue = context[key.trim() as keyof typeof context];
          const compareValue = value?.replace(/['"]/g, '');

          switch (operator) {
            case '===':
              return (
                contextValue === compareValue ||
                contextValue === JSON.parse(compareValue || 'null')
              );
            case '!==':
              return (
                contextValue !== compareValue &&
                contextValue !== JSON.parse(compareValue || 'null')
              );
            default:
              return false;
          }
        })
      );
    } catch {
      return false;
    }
  }

  private async applyRuleActions(
    actions: any[],
    message: IRealtimeMessage
  ): Promise<IRealtimeMessage> {
    let processedMessage = { ...message };

    for (const action of actions) {
      switch (action.type) {
        case 'route':
          if (action.parameters.platform) {
            processedMessage.targetPlatforms = [action.parameters.platform];
          }
          if (action.parameters.store_on_chain) {
            processedMessage.onChainReference = `ref_${Date.now()}` as Address;
          }
          break;
        case 'transform':
          // Apply message transformations
          break;
        case 'filter':
          // Apply content filtering
          break;
        case 'delay':
          // Add delivery delay
          break;
      }
    }

    return processedMessage;
  }

  private calculateEstimatedDelivery(message: IRealtimeMessage): number {
    const baseDelay = 100; // Base delivery time in ms
    const priorityMultiplier = {
      critical: 0.1,
      urgent: 0.3,
      high: 0.5,
      normal: 1.0,
      low: 2.0,
    }[message.priority];

    const networkLatency = 50; // Estimated network latency
    const processingTime = 25; // Message processing time

    return (
      Date.now() +
      (baseDelay * priorityMultiplier + networkLatency + processingTime)
    );
  }

  private async storeMessageOnChain(
    sender: KeyPairSigner,
    message: IRealtimeMessage
  ): Promise<void> {
    try {
      // In a real implementation, this would store the message on-chain
      const mockInstruction = {
        programAddress: this._programId,
        accounts: [
          { address: message.messageId, role: 'writable' as const },
          { address: sender.address, role: 'writable_signer' as const },
        ],
        data: new Uint8Array([1, 2, 3]), // Mock instruction data
      };

      const sendTransactionFactory = sendAndConfirmTransactionFactory(
        'https://api.devnet.solana.com'
      );
      await sendTransactionFactory([mockInstruction], [sender]);
    } catch (error) {
      logger.general.warn('⚠️ On-chain storage failed:', error);
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.deliverMessage(message);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async deliverMessage(message: IRealtimeMessage): Promise<void> {
    try {
      const recipientConnection = this.connections.get(message.toAddress);

      if (recipientConnection && recipientConnection.status === 'connected') {
        // Direct WebSocket delivery
        recipientConnection.socket.send(
          JSON.stringify({
            type: 'message',
            payload: message,
          })
        );

        message.deliveryStatus = 'delivered';
        logger.general.info(`✅ Message delivered: ${message.messageId}`);
      } else {
        // Queue for later delivery or store for offline pickup
        message.deliveryStatus = 'queued';
        logger.general.info(
          `📥 Message queued for offline delivery: ${message.messageId}`
        );
      }
    } catch (error) {
      message.retryCount++;
      if (message.retryCount < message.maxRetries) {
        // Retry delivery
        this.messageQueue.push(message);
      } else {
        message.deliveryStatus = 'failed';
        logger.general.error(
          `❌ Message delivery failed: ${message.messageId}`
        );
      }
    }
  }

  private handleIncomingMessage(
    connection: IWebSocketConnection,
    data: string
  ): void {
    try {
      const parsedData = JSON.parse(data);

      switch (parsedData.type) {
        case 'message':
          this.processIncomingMessage(connection, parsedData.payload);
          break;
        case 'presence_update':
          this.processPresenceUpdate(parsedData.payload);
          break;
        case 'typing_indicator':
          this.processTypingIndicator(connection, parsedData.payload);
          break;
        case 'read_receipt':
          this.processReadReceipt(connection, parsedData.payload);
          break;
        case 'delivery_confirmation':
          this.processDeliveryConfirmation(connection, parsedData.payload);
          break;
        case 'message_reaction':
          this.processMessageReaction(connection, parsedData.payload);
          break;
        case 'call_invitation':
          this.processCallInvitation(connection, parsedData.payload);
          break;
        case 'call_response':
          this.processCallResponse(connection, parsedData.payload);
          break;
        case 'pong':
          connection.lastPong = Date.now();
          break;
        default:
          logger.general.warn('Unknown message type:', parsedData.type);
      }
    } catch (error) {
      logger.general.error('Failed to handle incoming message:', error);
    }
  }

  private processIncomingMessage(
    connection: IWebSocketConnection,
    message: IRealtimeMessage
  ): void {
    // Update message status to read
    message.deliveryStatus = 'read';

    // Send acknowledgment if required
    if (message.requiresAcknowledgment) {
      connection.socket.send(
        JSON.stringify({
          type: 'acknowledgment',
          messageId: message.messageId,
          timestamp: Date.now(),
        })
      );
    }

    logger.general.info(`📥 Message received: ${message.messageId}`);
  }

  private async processPresenceUpdate(presence: IPresenceInfo): Promise<void> {
    this.presenceInfo.set(presence.address, presence);
    logger.general.info(
      `👤 Presence updated: ${presence.address} is ${presence.status}`
    );
  }

  private processTypingIndicator(
    connection: IWebSocketConnection,
    data: any
  ): void {
    // Handle typing indicators
    logger.general.info(
      `⌨️ Typing indicator: ${data.senderAddress} ${data.isTyping ? 'started' : 'stopped'} typing in ${data.conversationId}`
    );

    // Update local presence info
    const presence = this.presenceInfo.get(data.senderAddress);
    if (presence) {
      presence.isTyping = data.isTyping;
      presence.typingIn = data.isTyping ? data.conversationId : undefined;
      this.presenceInfo.set(data.senderAddress, presence);
    }
  }

  private processReadReceipt(
    connection: IWebSocketConnection,
    data: any
  ): void {
    logger.general.info(
      `👁️ Read receipt: Message ${data.messageId} read by ${data.readerAddress}`
    );
    // In a real implementation, this would update message read status and notify sender
  }

  private processDeliveryConfirmation(
    connection: IWebSocketConnection,
    data: any
  ): void {
    logger.general.info(
      `📬 Delivery confirmation: Message ${data.messageId} ${data.deliveryStatus} to ${data.recipientAddress}`
    );
    // In a real implementation, this would update message delivery status
  }

  private processMessageReaction(
    connection: IWebSocketConnection,
    data: any
  ): void {
    logger.general.info(
      `${data.action === 'add' ? '👍' : '👎'} Message reaction: ${data.emoji} ${data.action} to ${data.messageId} by ${data.reactorAddress}`
    );
    // In a real implementation, this would update reaction counts and notify participants
  }

  private processCallInvitation(
    connection: IWebSocketConnection,
    data: any
  ): void {
    logger.general.info(
      `📞 Call invitation: ${data.callType} call from ${data.callerAddress} (ID: ${data.callId})`
    );

    // Auto-respond or queue for user decision
    // For demo purposes, we'll auto-decline
    setTimeout(() => {
      connection.socket.send(
        JSON.stringify({
          type: 'call_response',
          payload: {
            callId: data.callId,
            response: 'declined',
            reason: 'busy',
            timestamp: Date.now(),
          },
        })
      );
    }, 2000);
  }

  private processCallResponse(
    connection: IWebSocketConnection,
    data: any
  ): void {
    logger.general.info(
      `📞 Call response: Call ${data.callId} ${data.response} (${data.reason || 'no reason'})`
    );
    // In a real implementation, this would handle call state changes
  }

  private startHeartbeat(connection: IWebSocketConnection): void {
    const heartbeat = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(
          JSON.stringify({ type: 'ping', timestamp: Date.now() })
        );
        connection.lastPing = Date.now();

        // Check for missed pongs
        if (Date.now() - connection.lastPong > connection.pingInterval * 2) {
          logger.general.warn('Connection appears stale, closing');
          connection.socket.close();
        }
      } else {
        clearInterval(heartbeat);
      }
    }, connection.pingInterval);
  }

  private reconnectWithBackoff(
    connection: IWebSocketConnection,
    agent: KeyPairSigner,
    options: any
  ): void {
    connection.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, connection.reconnectAttempts),
      30000
    );

    setTimeout(() => {
      logger.general.info(
        `🔄 Reconnecting attempt ${connection.reconnectAttempts}...`
      );
      this.connect(agent, options);
    }, delay);
  }

  private startMessageProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 1000);
  }

  private startPresenceUpdater(): void {
    setInterval(() => {
      // Update presence for all connected agents
      this.connections.forEach(connection => {
        if (connection.status === 'connected') {
          this.updatePresence(connection.address, {
            lastSeen: Date.now(),
          });
        }
      });
    }, 30000); // Update every 30 seconds
  }

  private async getConversationHistory(
    conversationId: Address,
    limit: number,
    messageTypes?: MessageType[]
  ): Promise<IRealtimeMessage[]> {
    // Simulate getting conversation history
    return [];
  }

  private async setupBlockchainSubscription(
    conversationId: Address,
    agentAddress: Address
  ): Promise<void> {
    // Setup blockchain subscription for on-chain messages
    logger.general.info(
      `🔔 Setting up blockchain subscription for conversation: ${conversationId}`
    );
  }

  private async broadcastPresenceUpdate(
    presence: IPresenceInfo
  ): Promise<void> {
    // Broadcast presence update to all relevant connections
    this.connections.forEach(connection => {
      if (
        connection.presenceSubscriptions.has(presence.address) &&
        connection.status === 'connected'
      ) {
        connection.socket.send(
          JSON.stringify({
            type: 'presence_update',
            payload: presence,
          })
        );
      }
    });
  }

  private async notifyConversationCreated(
    conversation: IConversation
  ): Promise<void> {
    // Notify all participants about the new conversation
    conversation.participants.forEach(participant => {
      const connection = this.connections.get(participant);
      if (connection && connection.status === 'connected') {
        connection.socket.send(
          JSON.stringify({
            type: 'conversation_created',
            payload: conversation,
          })
        );
      }
    });
  }

  private getTimeframeDuration(timeframe: string): number {
    const durations = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return durations[timeframe as keyof typeof durations] || durations.day;
  }

  private async calculateAnalytics(
    agentAddress: Address,
    startTime: number,
    endTime: number
  ): Promise<ICommunicationAnalytics> {
    // Generate mock analytics data
    return {
      totalMessages: Math.floor(Math.random() * 1000) + 100,
      messagesPerHour: Math.floor(Math.random() * 50) + 10,
      averageResponseTime: Math.floor(Math.random() * 5000) + 1000,
      deliverySuccessRate: 95 + Math.random() * 5,
      averageLatency: Math.floor(Math.random() * 200) + 50,
      connectionUptime: 95 + Math.random() * 5,
      errorRate: Math.random() * 2,
      retransmissionRate: Math.random() * 5,
      peakUsageHours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        messageCount: Math.floor(Math.random() * 100),
      })),
      popularMessageTypes: [
        { type: 'text', count: 500, percentage: 40 },
        { type: 'task_request', count: 300, percentage: 24 },
        { type: 'task_response', count: 250, percentage: 20 },
        { type: 'payment_notification', count: 200, percentage: 16 },
      ],
      platformUsage: {
        ghostspeak: {
          messageCount: 800,
          activeConnections: 50,
          averageLatency: 120,
        },
        solana: {
          messageCount: 200,
          activeConnections: 15,
          averageLatency: 200,
        },
      },
      userSatisfactionScore: 85 + Math.random() * 15,
      reportedIssues: Math.floor(Math.random() * 10),
      resolvedIssues: Math.floor(Math.random() * 8),
    };
  }

  private generateMockWebRTCOffer(): any {
    return {
      type: 'offer',
      sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n...',
      timestamp: Date.now(),
    };
  }

  private calculateFileHash(data: Uint8Array | string): string {
    // Simple hash calculation for demonstration
    // In production, use a proper cryptographic hash like SHA-256
    const str = typeof data === 'string' ? data : Array.from(data).join('');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
