import { PublicKey, Connection } from '@solana/web3.js';
import { MarketplaceClient } from '../marketplace-client';
import { WorkOrderStatus } from '../types';

export enum NotificationType {
  OrderReceived = 'order_received',
  OrderAccepted = 'order_accepted',
  OrderCompleted = 'order_completed',
  OrderCancelled = 'order_cancelled',
  PaymentReceived = 'payment_received',
  PaymentSent = 'payment_sent',
  MessageReceived = 'message_received',
  ReviewReceived = 'review_received',
  DisputeCreated = 'dispute_created',
  DisputeResolved = 'dispute_resolved',
  MilestoneCompleted = 'milestone_completed',
  DeadlineApproaching = 'deadline_approaching',
  SystemAlert = 'system_alert'
}

export enum NotificationPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export interface Notification {
  id: string;
  recipient: PublicKey;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  metadata?: {
    orderId?: PublicKey;
    senderId?: PublicKey;
    amount?: bigint;
    category?: string;
  };
}

export interface NotificationPreferences {
  userId: PublicKey;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  preferences: {
    [K in NotificationType]: {
      enabled: boolean;
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;
    timezone: string;
  };
}

export interface NotificationChannel {
  type: 'email' | 'push' | 'webhook' | 'inapp';
  enabled: boolean;
  config: Record<string, any>;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
  channels: ('email' | 'push' | 'inapp')[];
}

export class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private channels: Map<string, NotificationChannel[]> = new Map();
  private templates: Map<NotificationType, NotificationTemplate> = new Map();

  constructor(
    private client: MarketplaceClient,
    private connection: Connection
  ) {
    this.initializeTemplates();
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    recipient: PublicKey,
    type: NotificationType,
    data: {
      title?: string;
      message?: string;
      priority?: NotificationPriority;
      metadata?: Notification['metadata'];
      actionUrl?: string;
      expiresIn?: number; // seconds
    }
  ): Promise<Notification> {
    const template = this.templates.get(type);
    const preferences = await this.getUserPreferences(recipient);

    // Check if user has this notification type enabled
    if (!preferences.preferences[type]?.enabled) {
      throw new Error('Notification type disabled for user');
    }

    // Create notification
    const notification: Notification = {
      id: this.generateId(),
      recipient,
      type,
      priority: data.priority || NotificationPriority.Medium,
      title: data.title || template?.title || 'Notification',
      message: data.message || template?.message || 'You have a new notification',
      data: data.metadata,
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
      actionUrl: data.actionUrl,
      metadata: data.metadata
    };

    if (data.expiresIn) {
      notification.expiresAt = new Date(Date.now() + data.expiresIn * 1000);
    }

    // Store notification
    this.addNotification(recipient, notification);

    // Send through enabled channels
    await this.deliverNotification(notification, preferences);

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: PublicKey,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
      priority?: NotificationPriority;
    }
  ): Promise<{ notifications: Notification[]; unreadCount: number; total: number }> {
    const userKey = userId.toString();
    let userNotifications = this.notifications.get(userKey) || [];

    // Apply filters
    if (options?.unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.isRead);
    }

    if (options?.type) {
      userNotifications = userNotifications.filter(n => n.type === options.type);
    }

    if (options?.priority) {
      userNotifications = userNotifications.filter(n => n.priority === options.priority);
    }

    // Filter out expired notifications
    const now = new Date();
    userNotifications = userNotifications.filter(n => 
      !n.expiresAt || n.expiresAt > now
    );

    // Sort by creation date (newest first)
    userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = userNotifications.length;
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    const paginatedNotifications = userNotifications.slice(offset, offset + limit);

    return {
      notifications: paginatedNotifications,
      unreadCount,
      total
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: PublicKey): Promise<void> {
    const userKey = userId.toString();
    const userNotifications = this.notifications.get(userKey) || [];
    
    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: PublicKey): Promise<void> {
    const userKey = userId.toString();
    const userNotifications = this.notifications.get(userKey) || [];
    
    userNotifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
      }
    });
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: PublicKey): Promise<void> {
    const userKey = userId.toString();
    const userNotifications = this.notifications.get(userKey) || [];
    
    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isArchived = true;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: PublicKey): Promise<NotificationPreferences> {
    const userKey = userId.toString();
    
    if (this.preferences.has(userKey)) {
      return this.preferences.get(userKey)!;
    }

    // Create default preferences
    const defaultPreferences = this.createDefaultPreferences(userId);
    this.preferences.set(userKey, defaultPreferences);
    
    return defaultPreferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: PublicKey,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...updates };
    
    this.preferences.set(userId.toString(), updated);
    
    return updated;
  }

  /**
   * Send order notifications automatically
   */
  async sendOrderNotification(
    orderId: PublicKey,
    status: WorkOrderStatus,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const order = await this.client.getWorkOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const notifications: Array<{
      recipient: PublicKey;
      type: NotificationType;
      data: any;
    }> = [];

    switch (status) {
      case WorkOrderStatus.Created:
        notifications.push({
          recipient: order.seller,
          type: NotificationType.OrderReceived,
          data: {
            title: 'New Order Received',
            message: `You have a new order for ${order.service.name}`,
            priority: NotificationPriority.High,
            metadata: { orderId, senderId: order.buyer, amount: order.price },
            actionUrl: `/orders/${orderId.toString()}`
          }
        });
        break;

      case WorkOrderStatus.Accepted:
        notifications.push({
          recipient: order.buyer,
          type: NotificationType.OrderAccepted,
          data: {
            title: 'Order Accepted',
            message: `Your order for ${order.service.name} has been accepted`,
            priority: NotificationPriority.Medium,
            metadata: { orderId, senderId: order.seller },
            actionUrl: `/orders/${orderId.toString()}`
          }
        });
        break;

      case WorkOrderStatus.Completed:
        notifications.push(
          {
            recipient: order.buyer,
            type: NotificationType.OrderCompleted,
            data: {
              title: 'Order Completed',
              message: `Your order for ${order.service.name} has been completed`,
              priority: NotificationPriority.High,
              metadata: { orderId, senderId: order.seller },
              actionUrl: `/orders/${orderId.toString()}/review`
            }
          },
          {
            recipient: order.seller,
            type: NotificationType.PaymentReceived,
            data: {
              title: 'Payment Received',
              message: `Payment of ${order.price} lamports received for completed order`,
              priority: NotificationPriority.Medium,
              metadata: { orderId, amount: order.price },
              actionUrl: `/dashboard/earnings`
            }
          }
        );
        break;

      case WorkOrderStatus.Cancelled:
        const recipient = order.status === WorkOrderStatus.Created ? order.seller : order.buyer;
        notifications.push({
          recipient,
          type: NotificationType.OrderCancelled,
          data: {
            title: 'Order Cancelled',
            message: `Order for ${order.service.name} has been cancelled`,
            priority: NotificationPriority.Medium,
            metadata: { orderId }
          }
        });
        break;
    }

    // Send all notifications
    for (const notificationData of notifications) {
      await this.sendNotification(
        notificationData.recipient,
        notificationData.type,
        notificationData.data
      );
    }
  }

  /**
   * Send deadline reminder notifications
   */
  async sendDeadlineReminders(): Promise<void> {
    // Get all active orders
    const allAgents = await this.client.getAllAgents();
    
    for (const agent of allAgents) {
      const orders = await this.client.getAgentWorkOrders(agent.pubkey);
      const activeOrders = orders.filter(o => 
        o.status === WorkOrderStatus.Accepted || 
        o.status === WorkOrderStatus.InProgress
      );

      for (const order of activeOrders) {
        if (order.deadline) {
          const deadline = new Date(Number(order.deadline) * 1000);
          const now = new Date();
          const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Send reminder 24 hours before deadline
          if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 23) {
            await this.sendNotification(order.seller, NotificationType.DeadlineApproaching, {
              title: 'Deadline Approaching',
              message: `Order deadline in 24 hours: ${order.service.name}`,
              priority: NotificationPriority.High,
              metadata: { orderId: order.pubkey },
              actionUrl: `/orders/${order.pubkey.toString()}`
            });
          }

          // Send critical reminder 2 hours before deadline
          if (hoursUntilDeadline <= 2 && hoursUntilDeadline > 1) {
            await this.sendNotification(order.seller, NotificationType.DeadlineApproaching, {
              title: 'Urgent: Deadline in 2 Hours',
              message: `Critical deadline approaching for ${order.service.name}`,
              priority: NotificationPriority.Critical,
              metadata: { orderId: order.pubkey },
              actionUrl: `/orders/${order.pubkey.toString()}`
            });
          }
        }
      }
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    for (const [userKey, userNotifications] of this.notifications) {
      const validNotifications = userNotifications.filter(n => {
        if (n.expiresAt && n.expiresAt <= now) {
          cleanedCount++;
          return false;
        }
        return true;
      });

      this.notifications.set(userKey, validNotifications);
    }

    return cleanedCount;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: PublicKey): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const { notifications } = await this.getUserNotifications(userId);
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
    });

    return stats;
  }

  /**
   * Helper methods
   */

  private addNotification(userId: PublicKey, notification: Notification): void {
    const userKey = userId.toString();
    const userNotifications = this.notifications.get(userKey) || [];
    userNotifications.push(notification);
    this.notifications.set(userKey, userNotifications);
  }

  private async deliverNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const typePrefs = preferences.preferences[notification.type];
    
    if (!typePrefs) return;

    // Check quiet hours
    if (this.isInQuietHours(preferences.quietHours)) {
      return;
    }

    // Deliver through enabled channels
    if (typePrefs.inApp && preferences.inAppEnabled) {
      // In-app notification already stored
    }

    if (typePrefs.email && preferences.emailEnabled) {
      await this.sendEmailNotification(notification);
    }

    if (typePrefs.push && preferences.pushEnabled) {
      await this.sendPushNotification(notification);
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    // Mock email sending
    console.log(`📧 Email sent: ${notification.title} to ${notification.recipient.toString()}`);
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // Mock push notification
    console.log(`📱 Push sent: ${notification.title} to ${notification.recipient.toString()}`);
  }

  private isInQuietHours(quietHours?: NotificationPreferences['quietHours']): boolean {
    if (!quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  private createDefaultPreferences(userId: PublicKey): NotificationPreferences {
    const defaultTypePrefs = {
      enabled: true,
      email: true,
      push: true,
      inApp: true
    };

    const preferences = {} as NotificationPreferences['preferences'];
    
    // Set defaults for all notification types
    Object.values(NotificationType).forEach(type => {
      preferences[type] = { ...defaultTypePrefs };
    });

    // Disable low priority notifications for email/push by default
    preferences[NotificationType.SystemAlert] = {
      enabled: true,
      email: false,
      push: false,
      inApp: true
    };

    return {
      userId,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      preferences,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      }
    };
  }

  private initializeTemplates(): void {
    const templates: Array<[NotificationType, NotificationTemplate]> = [
      [NotificationType.OrderReceived, {
        type: NotificationType.OrderReceived,
        title: 'New Order Received',
        message: 'You have received a new order',
        variables: ['serviceName', 'buyerName', 'amount'],
        channels: ['email', 'push', 'inapp']
      }],
      [NotificationType.OrderAccepted, {
        type: NotificationType.OrderAccepted,
        title: 'Order Accepted',
        message: 'Your order has been accepted',
        variables: ['serviceName', 'sellerName'],
        channels: ['email', 'push', 'inapp']
      }],
      [NotificationType.OrderCompleted, {
        type: NotificationType.OrderCompleted,
        title: 'Order Completed',
        message: 'Your order has been completed',
        variables: ['serviceName', 'sellerName'],
        channels: ['email', 'push', 'inapp']
      }],
      [NotificationType.PaymentReceived, {
        type: NotificationType.PaymentReceived,
        title: 'Payment Received',
        message: 'You have received a payment',
        variables: ['amount', 'serviceName'],
        channels: ['email', 'push', 'inapp']
      }],
      [NotificationType.MessageReceived, {
        type: NotificationType.MessageReceived,
        title: 'New Message',
        message: 'You have received a new message',
        variables: ['senderName', 'preview'],
        channels: ['push', 'inapp']
      }],
      [NotificationType.DeadlineApproaching, {
        type: NotificationType.DeadlineApproaching,
        title: 'Deadline Approaching',
        message: 'An order deadline is approaching',
        variables: ['serviceName', 'timeRemaining'],
        channels: ['email', 'push', 'inapp']
      }]
    ];

    templates.forEach(([type, template]) => {
      this.templates.set(type, template);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}