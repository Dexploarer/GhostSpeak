import { PublicKey, Connection } from '@solana/web3.js';
import { MarketplaceClient } from '../marketplace-client';
import { WorkOrderStatus } from '../types';

export interface AgentProfile {
  pubkey: PublicKey;
  owner: PublicKey;
  name: string;
  description: string;
  isActive: boolean;
  totalListings: number;
  totalOrders: number;
  totalEarnings: bigint;
  reputation: number;
  createdAt: Date;
}

export interface EarningsSummary {
  totalEarnings: bigint;
  currentPeriodEarnings: bigint;
  pendingEarnings: bigint;
  withdrawableBalance: bigint;
  earningsByPeriod: Array<{
    period: string;
    earnings: bigint;
    orderCount: number;
  }>;
}

export interface ActiveOrder {
  orderId: PublicKey;
  serviceName: string;
  buyer: PublicKey;
  status: WorkOrderStatus;
  price: bigint;
  startTime: Date;
  deadline: Date;
  progress: number;
}

export interface PerformanceMetrics {
  completionRate: number;
  averageDeliveryTime: number;
  averageRating: number;
  totalReviews: number;
  disputeRate: number;
  responseTime: number;
  orderVolume: Array<{
    date: string;
    count: number;
  }>;
}

export interface DashboardData {
  profile: AgentProfile;
  earnings: EarningsSummary;
  activeOrders: ActiveOrder[];
  metrics: PerformanceMetrics;
}

export class DashboardService {
  constructor(
    private client: MarketplaceClient,
    private connection: Connection
  ) {}

  /**
   * Get complete dashboard data for an agent
   */
  async getDashboardData(agentPubkey: PublicKey): Promise<DashboardData> {
    const [profile, earnings, activeOrders, metrics] = await Promise.all([
      this.getAgentProfile(agentPubkey),
      this.getEarningsSummary(agentPubkey),
      this.getActiveOrders(agentPubkey),
      this.getPerformanceMetrics(agentPubkey)
    ]);

    return {
      profile,
      earnings,
      activeOrders,
      metrics
    };
  }

  /**
   * Get agent profile information
   */
  async getAgentProfile(agentPubkey: PublicKey): Promise<AgentProfile> {
    const agent = await this.client.getAgent(agentPubkey);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get additional stats from program
    const [totalListings, totalOrders] = await Promise.all([
      this.getAgentListingsCount(agentPubkey),
      this.getAgentOrdersCount(agentPubkey)
    ]);

    return {
      pubkey: agentPubkey,
      owner: agent.owner,
      name: agent.metadata.name,
      description: agent.metadata.description,
      isActive: agent.isActive,
      totalListings,
      totalOrders,
      totalEarnings: agent.totalEarnings,
      reputation: this.calculateReputation(agent),
      createdAt: new Date(Number(agent.createdAt) * 1000)
    };
  }

  /**
   * Get earnings summary for an agent
   */
  async getEarningsSummary(agentPubkey: PublicKey): Promise<EarningsSummary> {
    const agent = await this.client.getAgent(agentPubkey);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get current period earnings (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentOrders = await this.getAgentOrdersSince(agentPubkey, thirtyDaysAgo);
    
    const currentPeriodEarnings = recentOrders.reduce(
      (sum, order) => sum + order.price,
      BigInt(0)
    );

    // Get pending earnings from active orders
    const activeOrders = await this.getActiveOrders(agentPubkey);
    const pendingEarnings = activeOrders.reduce(
      (sum, order) => sum + order.price,
      BigInt(0)
    );

    // Get earnings by period (last 12 months)
    const earningsByPeriod = await this.getEarningsByPeriod(agentPubkey, 12);

    return {
      totalEarnings: agent.totalEarnings,
      currentPeriodEarnings,
      pendingEarnings,
      withdrawableBalance: agent.balance,
      earningsByPeriod
    };
  }

  /**
   * Get active orders for an agent
   */
  async getActiveOrders(agentPubkey: PublicKey): Promise<ActiveOrder[]> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    
    return orders
      .filter(order => 
        order.status === WorkOrderStatus.Accepted ||
        order.status === WorkOrderStatus.InProgress
      )
      .map(order => ({
        orderId: order.pubkey,
        serviceName: order.service.name,
        buyer: order.buyer,
        status: order.status,
        price: order.price,
        startTime: new Date(Number(order.acceptedAt) * 1000),
        deadline: new Date(Number(order.deadline) * 1000),
        progress: this.calculateOrderProgress(order)
      }));
  }

  /**
   * Get performance metrics for an agent
   */
  async getPerformanceMetrics(agentPubkey: PublicKey): Promise<PerformanceMetrics> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    const reviews = await this.getAgentReviews(agentPubkey);

    // Calculate completion rate
    const completedOrders = orders.filter(o => o.status === WorkOrderStatus.Completed);
    const cancelledOrders = orders.filter(o => o.status === WorkOrderStatus.Cancelled);
    const totalFinishedOrders = completedOrders.length + cancelledOrders.length;
    const completionRate = totalFinishedOrders > 0
      ? (completedOrders.length / totalFinishedOrders) * 100
      : 0;

    // Calculate average delivery time
    const deliveryTimes = completedOrders
      .filter(o => o.completedAt && o.acceptedAt)
      .map(o => Number(o.completedAt) - Number(o.acceptedAt));
    
    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;

    // Calculate average rating
    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    // Calculate dispute rate
    const disputedOrders = orders.filter(o => o.hasDispute);
    const disputeRate = orders.length > 0
      ? (disputedOrders.length / orders.length) * 100
      : 0;

    // Calculate average response time (mock for now)
    const responseTime = 3600; // 1 hour in seconds

    // Get order volume over time
    const orderVolume = await this.getOrderVolumeHistory(agentPubkey, 30);

    return {
      completionRate,
      averageDeliveryTime,
      averageRating,
      totalReviews: reviews.length,
      disputeRate,
      responseTime,
      orderVolume
    };
  }

  /**
   * Helper methods
   */

  private async getAgentListingsCount(agentPubkey: PublicKey): Promise<number> {
    const listings = await this.client.getAgentListings(agentPubkey);
    return listings.length;
  }

  private async getAgentOrdersCount(agentPubkey: PublicKey): Promise<number> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    return orders.length;
  }

  private async getAgentOrdersSince(
    agentPubkey: PublicKey,
    timestamp: number
  ): Promise<any[]> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    return orders.filter(order => 
      order.createdAt && Number(order.createdAt) * 1000 >= timestamp
    );
  }

  private async getEarningsByPeriod(
    agentPubkey: PublicKey,
    months: number
  ): Promise<Array<{ period: string; earnings: bigint; orderCount: number }>> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    const periods: Map<string, { earnings: bigint; count: number }> = new Map();

    // Initialize periods
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.set(period, { earnings: BigInt(0), count: 0 });
    }

    // Aggregate earnings by period
    orders
      .filter(order => order.status === WorkOrderStatus.Completed)
      .forEach(order => {
        if (order.completedAt) {
          const date = new Date(Number(order.completedAt) * 1000);
          const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          const current = periods.get(period);
          if (current) {
            periods.set(period, {
              earnings: current.earnings + order.price,
              count: current.count + 1
            });
          }
        }
      });

    return Array.from(periods.entries())
      .map(([period, data]) => ({
        period,
        earnings: data.earnings,
        orderCount: data.count
      }))
      .reverse();
  }

  private async getAgentReviews(agentPubkey: PublicKey): Promise<any[]> {
    // This would fetch from the review system once implemented
    // For now, return mock data
    return [];
  }

  private async getOrderVolumeHistory(
    agentPubkey: PublicKey,
    days: number
  ): Promise<Array<{ date: string; count: number }>> {
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    const volume: Map<string, number> = new Map();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      volume.set(dateStr, 0);
    }

    // Count orders by day
    orders.forEach(order => {
      if (order.createdAt) {
        const date = new Date(Number(order.createdAt) * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const current = volume.get(dateStr);
        if (current !== undefined) {
          volume.set(dateStr, current + 1);
        }
      }
    });

    return Array.from(volume.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }

  private calculateReputation(agent: any): number {
    // Simple reputation calculation
    // Would be more complex with reviews integrated
    const baseReputation = 50;
    const orderBonus = Math.min(agent.totalOrders * 2, 30);
    const earningsBonus = Math.min(Number(agent.totalEarnings / BigInt(1e9)) / 100, 20);
    
    return Math.min(baseReputation + orderBonus + earningsBonus, 100);
  }

  private calculateOrderProgress(order: any): number {
    if (order.status === WorkOrderStatus.Completed) return 100;
    if (order.status === WorkOrderStatus.Cancelled) return 0;
    if (order.status === WorkOrderStatus.Created) return 0;
    if (order.status === WorkOrderStatus.Accepted) return 25;
    if (order.status === WorkOrderStatus.InProgress) return 50;
    
    // Calculate based on time if in progress
    if (order.acceptedAt && order.deadline) {
      const now = Date.now();
      const start = Number(order.acceptedAt) * 1000;
      const end = Number(order.deadline) * 1000;
      const progress = ((now - start) / (end - start)) * 100;
      return Math.min(Math.max(progress, 25), 90);
    }
    
    return 50;
  }
}