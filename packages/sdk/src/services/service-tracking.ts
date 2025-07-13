import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';
import { MarketplaceService } from './marketplace';
import { WorkOrderStatus } from '../types';

export enum MilestoneStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Verified = 'verified'
}

export interface Milestone {
  id: string;
  orderId: Address;
  name: string;
  description: string;
  status: MilestoneStatus;
  progress: number;
  dueDate: Date;
  completedAt?: Date;
  deliverables?: string[];
  proofOfWork?: string;
}

export interface ServiceUpdate {
  id: string;
  orderId: Address;
  timestamp: Date;
  type: 'status' | 'progress' | 'milestone' | 'message' | 'delivery';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface DeliveryConfirmation {
  orderId: Address;
  deliveredAt: Date;
  deliveryMethod: 'direct' | 'ipfs' | 'external';
  deliveryData: string;
  attachments?: string[];
  notes?: string;
  signature: string;
}

export interface TimeTracking {
  orderId: Address;
  totalTime: number; // in seconds
  sessions: Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    description?: string;
  }>;
  estimatedTimeRemaining: number;
}

export interface ServiceStatus {
  orderId: Address;
  status: WorkOrderStatus;
  progress: number;
  milestones: Milestone[];
  updates: ServiceUpdate[];
  timeTracking: TimeTracking;
  deliveryConfirmation?: DeliveryConfirmation;
}

export class ServiceTrackingService {
  private milestones: Map<string, Milestone[]> = new Map();
  private updates: Map<string, ServiceUpdate[]> = new Map();
  private timeTracking: Map<string, TimeTracking> = new Map();
  private deliveryConfirmations: Map<string, DeliveryConfirmation> = new Map();

  constructor(
    private client: MarketplaceService,
    private rpc: Rpc<SolanaRpcApi>
  ) {}

  /**
   * Get complete service status for an order
   */
  async getServiceStatus(orderId: Address): Promise<ServiceStatus> {
    const listing = await this.client.getListing(orderId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const orderIdStr = orderId.toString();
    const milestones = this.milestones.get(orderIdStr) || [];
    const updates = this.updates.get(orderIdStr) || [];
    const timeTracking = this.timeTracking.get(orderIdStr) || this.createDefaultTimeTracking(orderId);
    const deliveryConfirmation = this.deliveryConfirmations.get(orderIdStr);

    // Calculate overall progress
    const progress = this.calculateOverallProgress(listing, milestones);

    return {
      orderId,
      status: this.mapListingStatusToWorkOrderStatus(listing.status),
      progress,
      milestones,
      updates,
      timeTracking,
      deliveryConfirmation
    };
  }

  /**
   * Update order status with automatic tracking
   */
  async updateOrderStatus(
    orderId: Address,
    newStatus: WorkOrderStatus,
    signer: KeyPairSigner,
    notes?: string
  ): Promise<ServiceUpdate> {
    // Update status on-chain
    // Note: updateWorkOrderStatus not available in MarketplaceService
    // await this.client.updateWorkOrderStatus(orderId, newStatus, signer);

    // Create status update
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'status',
      title: `Status changed to ${this.getStatusLabel(newStatus)}`,
      description: notes || `Order status has been updated to ${this.getStatusLabel(newStatus)}`,
      metadata: { previousStatus: await this.getPreviousStatus(orderId), newStatus }
    };

    // Store update
    this.addUpdate(orderId, update);

    // Start time tracking if accepted
    if (newStatus === WorkOrderStatus.IN_PROGRESS) {
      this.startTimeTracking(orderId);
    }

    return update;
  }

  /**
   * Create and track milestones for an order
   */
  async createMilestones(
    orderId: Address,
    milestoneData: Array<{
      name: string;
      description: string;
      dueDate: Date;
      deliverables?: string[];
    }>
  ): Promise<Milestone[]> {
    const orderIdStr = orderId.toString();
    const milestones: Milestone[] = milestoneData.map(data => ({
      id: this.generateId(),
      orderId,
      name: data.name,
      description: data.description,
      status: MilestoneStatus.Pending,
      progress: 0,
      dueDate: data.dueDate,
      deliverables: data.deliverables
    }));

    this.milestones.set(orderIdStr, milestones);

    // Create update for milestone creation
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'milestone',
      title: `${milestones.length} milestones created`,
      description: `Service milestones have been defined for tracking progress`,
      metadata: { milestoneCount: milestones.length }
    };

    this.addUpdate(orderId, update);

    return milestones;
  }

  /**
   * Update milestone progress
   */
  async updateMilestoneProgress(
    orderId: Address,
    milestoneId: string,
    progress: number,
    proofOfWork?: string
  ): Promise<Milestone> {
    const orderIdStr = orderId.toString();
    const milestones = this.milestones.get(orderIdStr) || [];
    const milestone = milestones.find(m => m.id === milestoneId);

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Update milestone
    milestone.progress = Math.min(Math.max(progress, 0), 100);
    milestone.status = progress === 100 ? MilestoneStatus.Completed : MilestoneStatus.InProgress;
    
    if (progress === 100) {
      milestone.completedAt = new Date();
    }

    if (proofOfWork) {
      milestone.proofOfWork = proofOfWork;
    }

    // Create update
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'milestone',
      title: `Milestone "${milestone.name}" ${progress}% complete`,
      description: progress === 100 
        ? `Milestone "${milestone.name}" has been completed`
        : `Progress update for milestone "${milestone.name}"`,
      metadata: { milestoneId, progress, proofOfWork }
    };

    this.addUpdate(orderId, update);

    return milestone;
  }

  /**
   * Track time spent on an order
   */
  startTimeTracking(orderId: Address): void {
    const orderIdStr = orderId.toString();
    let tracking = this.timeTracking.get(orderIdStr);

    if (!tracking) {
      tracking = this.createDefaultTimeTracking(orderId);
      this.timeTracking.set(orderIdStr, tracking);
    }

    // Start new session
    const session = {
      startTime: new Date(),
      endTime: new Date(), // Will be updated
      duration: 0,
      description: 'Active work session'
    };

    tracking.sessions.push(session);
  }

  /**
   * Stop time tracking for current session
   */
  stopTimeTracking(orderId: Address, description?: string): TimeTracking {
    const orderIdStr = orderId.toString();
    const tracking = this.timeTracking.get(orderIdStr);

    if (!tracking || tracking.sessions.length === 0) {
      throw new Error('No active time tracking session');
    }

    // Update last session
    const lastSession = tracking.sessions[tracking.sessions.length - 1];
    lastSession.endTime = new Date();
    lastSession.duration = Math.floor(
      (lastSession.endTime.getTime() - lastSession.startTime.getTime()) / 1000
    );
    
    if (description) {
      lastSession.description = description;
    }

    // Update total time
    tracking.totalTime = tracking.sessions.reduce((sum, s) => sum + s.duration, 0);

    return tracking;
  }

  /**
   * Add progress update
   */
  async addProgressUpdate(
    orderId: Address,
    progress: number,
    description: string
  ): Promise<ServiceUpdate> {
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'progress',
      title: `Progress: ${progress}%`,
      description,
      metadata: { progress }
    };

    this.addUpdate(orderId, update);
    return update;
  }

  /**
   * Add message update
   */
  async addMessageUpdate(
    orderId: Address,
    message: string,
    sender: Address
  ): Promise<ServiceUpdate> {
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'message',
      title: 'New message',
      description: message,
      metadata: { sender: sender.toString() }
    };

    this.addUpdate(orderId, update);
    return update;
  }

  /**
   * Confirm delivery of service
   */
  async confirmDelivery(
    orderId: Address,
    deliveryData: string,
    attachments?: string[],
    notes?: string,
    signer?: KeyPairSigner
  ): Promise<DeliveryConfirmation> {
    const orderIdStr = orderId.toString();

    // Create delivery confirmation
    const confirmation: DeliveryConfirmation = {
      orderId,
      deliveredAt: new Date(),
      deliveryMethod: attachments && attachments.length > 0 ? 'ipfs' : 'direct',
      deliveryData,
      attachments,
      notes,
      signature: this.generateSignature(orderId, deliveryData)
    };

    this.deliveryConfirmations.set(orderIdStr, confirmation);

    // Create delivery update
    const update: ServiceUpdate = {
      id: this.generateId(),
      orderId,
      timestamp: new Date(),
      type: 'delivery',
      title: 'Service delivered',
      description: 'The service has been delivered successfully',
      metadata: {
        deliveryMethod: confirmation.deliveryMethod,
        hasAttachments: !!attachments && attachments.length > 0
      }
    };

    this.addUpdate(orderId, update);

    // Update order status if signer provided
    if (signer) {
      await this.updateOrderStatus(orderId, WorkOrderStatus.COMPLETED, signer, 'Service delivered');
    }

    return confirmation;
  }

  /**
   * Get time tracking summary
   */
  getTimeTrackingSummary(orderId: Address): TimeTracking | null {
    const orderIdStr = orderId.toString();
    return this.timeTracking.get(orderIdStr) || null;
  }

  /**
   * Get all updates for an order
   */
  getOrderUpdates(orderId: Address): ServiceUpdate[] {
    const orderIdStr = orderId.toString();
    return this.updates.get(orderIdStr) || [];
  }

  /**
   * Calculate estimated time remaining
   */
  async calculateEstimatedTimeRemaining(orderId: Address): Promise<number> {
    const listing = await this.client.getListing(orderId);
    if (!listing) {
      return 0;
    }

    // Note: Listing doesn't have deadline field, so we'll return a default estimate
    const now = Date.now();
    const defaultDeadlineMs = listing.listedAt + (7 * 24 * 60 * 60 * 1000); // 7 days from listing
    const deadline = defaultDeadlineMs;
    const remaining = Math.max(0, deadline - now);

    return Math.floor(remaining / 1000); // Return in seconds
  }

  /**
   * Helper methods
   */

  private createDefaultTimeTracking(orderId: Address): TimeTracking {
    return {
      orderId,
      totalTime: 0,
      sessions: [],
      estimatedTimeRemaining: 0
    };
  }

  private addUpdate(orderId: Address, update: ServiceUpdate): void {
    const orderIdStr = orderId.toString();
    const updates = this.updates.get(orderIdStr) || [];
    updates.push(update);
    this.updates.set(orderIdStr, updates);
  }

  private calculateOverallProgress(order: any, milestones: Milestone[]): number {
    if (order.status === WorkOrderStatus.COMPLETED) return 100;
    if (order.status === WorkOrderStatus.CANCELLED) return 0;
    if (order.status === WorkOrderStatus.PENDING) return 0;

    // If milestones exist, calculate based on milestone progress
    if (milestones.length > 0) {
      const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0);
      return Math.floor(totalProgress / milestones.length);
    }

    // Default progress based on status
    switch (order.status) {
      case WorkOrderStatus.IN_PROGRESS: return 10;
      case WorkOrderStatus.IN_PROGRESS: return 50;
      default: return 0;
    }
  }

  private getStatusLabel(status: WorkOrderStatus): string {
    const labels: Record<WorkOrderStatus, string> = {
      [WorkOrderStatus.PENDING]: 'Pending',
      [WorkOrderStatus.IN_PROGRESS]: 'In Progress',
      [WorkOrderStatus.COMPLETED]: 'Completed',
      [WorkOrderStatus.CANCELLED]: 'Cancelled',
      [WorkOrderStatus.DISPUTED]: 'Disputed'
    };
    return labels[status] || 'Unknown';
  }

  private async getPreviousStatus(orderId: Address): Promise<WorkOrderStatus | null> {
    const listing = await this.client.getListing(orderId);
    return listing ? this.mapListingStatusToWorkOrderStatus(listing.status) : null;
  }

  private generateId(): string {
    return `${Date.now()}-${0.5.toString(36).substr(2, 9)}`;
  }

  private generateSignature(orderId: Address, data: string): string {
    // Simple signature generation (would use proper crypto in production)
    return Buffer.from(`${orderId.toString()}-${data}-${Date.now()}`).toString('base64');
  }

  private mapListingStatusToWorkOrderStatus(listingStatus: 'active' | 'sold' | 'cancelled'): WorkOrderStatus {
    switch (listingStatus) {
      case 'active':
        return WorkOrderStatus.IN_PROGRESS;
      case 'sold':
        return WorkOrderStatus.COMPLETED;
      case 'cancelled':
        return WorkOrderStatus.CANCELLED;
      default:
        return WorkOrderStatus.PENDING;
    }
  }
}