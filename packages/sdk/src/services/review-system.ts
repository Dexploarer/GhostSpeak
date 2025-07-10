import { PublicKey, Connection, Keypair, Transaction } from '@solana/web3.js';
import { MarketplaceClient } from '../marketplace-client';
import { WorkOrderStatus } from '../types';

export interface Review {
  id: string;
  orderId: PublicKey;
  reviewer: PublicKey;
  reviewee: PublicKey;
  rating: number; // 1-5 stars
  title: string;
  comment: string;
  tags?: string[];
  helpfulVotes: number;
  unhelpfulVotes: number;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt?: Date;
  response?: ReviewResponse;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  responder: PublicKey;
  comment: string;
  createdAt: Date;
}

export interface Dispute {
  id: string;
  orderId: PublicKey;
  initiator: PublicKey;
  respondent: PublicKey;
  type: DisputeType;
  status: DisputeStatus;
  reason: string;
  description: string;
  evidence: Evidence[];
  resolution?: DisputeResolution;
  createdAt: Date;
  updatedAt: Date;
}

export enum DisputeType {
  NonDelivery = 'non_delivery',
  QualityIssue = 'quality_issue',
  NotAsDescribed = 'not_as_described',
  Communication = 'communication',
  Timeline = 'timeline',
  Other = 'other'
}

export enum DisputeStatus {
  Open = 'open',
  UnderReview = 'under_review',
  AwaitingResponse = 'awaiting_response',
  Resolved = 'resolved',
  Escalated = 'escalated',
  Closed = 'closed'
}

export interface Evidence {
  id: string;
  disputeId: string;
  submittedBy: PublicKey;
  type: 'text' | 'image' | 'document' | 'link';
  content: string;
  description?: string;
  submittedAt: Date;
}

export interface DisputeResolution {
  id: string;
  disputeId: string;
  decision: 'favor_buyer' | 'favor_seller' | 'split' | 'no_action';
  explanation: string;
  refundAmount?: bigint;
  penaltyAmount?: bigint;
  resolvedBy: PublicKey;
  resolvedAt: Date;
}

export interface ReputationScore {
  agentPubkey: PublicKey;
  overallScore: number; // 0-100
  totalReviews: number;
  averageRating: number;
  completionRate: number;
  disputeRate: number;
  responseRate: number;
  breakdown: {
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  };
  badges: Badge[];
  trustLevel: TrustLevel;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export enum TrustLevel {
  New = 'new',
  Basic = 'basic',
  Verified = 'verified',
  Trusted = 'trusted',
  Premium = 'premium'
}

export class ReviewSystem {
  private reviews: Map<string, Review[]> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private reputationCache: Map<string, ReputationScore> = new Map();

  constructor(
    private client: MarketplaceClient,
    private connection: Connection
  ) {}

  /**
   * Submit a review for a completed order
   */
  async submitReview(
    orderId: PublicKey,
    rating: number,
    title: string,
    comment: string,
    reviewer: Keypair,
    tags?: string[]
  ): Promise<Review> {
    // Validate order and completion
    const order = await this.client.getWorkOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== WorkOrderStatus.Completed) {
      throw new Error('Can only review completed orders');
    }

    // Validate reviewer is part of the order
    const isValidReviewer = order.buyer.equals(reviewer.publicKey) || 
                           order.seller.equals(reviewer.publicKey);
    if (!isValidReviewer) {
      throw new Error('Only order participants can leave reviews');
    }

    // Determine reviewee
    const reviewee = order.buyer.equals(reviewer.publicKey) ? order.seller : order.buyer;

    // Create review
    const review: Review = {
      id: this.generateId(),
      orderId,
      reviewer: reviewer.publicKey,
      reviewee,
      rating: Math.min(Math.max(rating, 1), 5), // Ensure 1-5 range
      title,
      comment,
      tags,
      helpfulVotes: 0,
      unhelpfulVotes: 0,
      isVerifiedPurchase: true,
      createdAt: new Date()
    };

    // Store review
    this.addReview(orderId, review);

    // Update reputation scores
    await this.updateReputationScore(reviewee);

    return review;
  }

  /**
   * Get reviews for an agent
   */
  async getAgentReviews(
    agentPubkey: PublicKey,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'recent' | 'rating' | 'helpful';
      filterByRating?: number;
    }
  ): Promise<{ reviews: Review[]; total: number; average: number }> {
    const allReviews: Review[] = [];
    
    // Collect all reviews where agent is reviewee
    for (const [_, orderReviews] of this.reviews) {
      const agentReviews = orderReviews.filter(r => 
        r.reviewee.equals(agentPubkey)
      );
      allReviews.push(...agentReviews);
    }

    // Apply filters
    let filteredReviews = allReviews;
    if (options?.filterByRating) {
      filteredReviews = filteredReviews.filter(r => r.rating === options.filterByRating);
    }

    // Sort reviews
    if (options?.sortBy === 'rating') {
      filteredReviews.sort((a, b) => b.rating - a.rating);
    } else if (options?.sortBy === 'helpful') {
      filteredReviews.sort((a, b) => 
        (b.helpfulVotes - b.unhelpfulVotes) - (a.helpfulVotes - a.unhelpfulVotes)
      );
    } else {
      // Default to recent
      filteredReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 10;
    const paginatedReviews = filteredReviews.slice(offset, offset + limit);

    // Calculate average
    const average = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    return {
      reviews: paginatedReviews,
      total: allReviews.length,
      average
    };
  }

  /**
   * Vote on review helpfulness
   */
  async voteReviewHelpfulness(
    reviewId: string,
    isHelpful: boolean,
    voter: PublicKey
  ): Promise<Review> {
    const review = this.findReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Update vote counts (in production, would track individual voters)
    if (isHelpful) {
      review.helpfulVotes++;
    } else {
      review.unhelpfulVotes++;
    }

    review.updatedAt = new Date();
    return review;
  }

  /**
   * Respond to a review
   */
  async respondToReview(
    reviewId: string,
    comment: string,
    responder: Keypair
  ): Promise<ReviewResponse> {
    const review = this.findReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Validate responder is the reviewee
    if (!review.reviewee.equals(responder.publicKey)) {
      throw new Error('Only the reviewee can respond to reviews');
    }

    const response: ReviewResponse = {
      id: this.generateId(),
      reviewId,
      responder: responder.publicKey,
      comment,
      createdAt: new Date()
    };

    review.response = response;
    review.updatedAt = new Date();

    return response;
  }

  /**
   * Initiate a dispute
   */
  async initiateDispute(
    orderId: PublicKey,
    type: DisputeType,
    reason: string,
    description: string,
    initiator: Keypair
  ): Promise<Dispute> {
    const order = await this.client.getWorkOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate initiator is part of the order
    const isValidInitiator = order.buyer.equals(initiator.publicKey) || 
                            order.seller.equals(initiator.publicKey);
    if (!isValidInitiator) {
      throw new Error('Only order participants can initiate disputes');
    }

    const respondent = order.buyer.equals(initiator.publicKey) ? order.seller : order.buyer;

    const dispute: Dispute = {
      id: this.generateId(),
      orderId,
      initiator: initiator.publicKey,
      respondent,
      type,
      status: DisputeStatus.Open,
      reason,
      description,
      evidence: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.disputes.set(dispute.id, dispute);

    // Update order status to disputed
    await this.client.updateWorkOrderStatus(orderId, WorkOrderStatus.Disputed, initiator);

    return dispute;
  }

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(
    disputeId: string,
    type: 'text' | 'image' | 'document' | 'link',
    content: string,
    description: string,
    submitter: Keypair
  ): Promise<Evidence> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Validate submitter is part of the dispute
    const isValidSubmitter = dispute.initiator.equals(submitter.publicKey) || 
                            dispute.respondent.equals(submitter.publicKey);
    if (!isValidSubmitter) {
      throw new Error('Only dispute participants can submit evidence');
    }

    const evidence: Evidence = {
      id: this.generateId(),
      disputeId,
      submittedBy: submitter.publicKey,
      type,
      content,
      description,
      submittedAt: new Date()
    };

    dispute.evidence.push(evidence);
    dispute.updatedAt = new Date();
    dispute.status = DisputeStatus.UnderReview;

    return evidence;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    decision: 'favor_buyer' | 'favor_seller' | 'split' | 'no_action',
    explanation: string,
    resolver: Keypair,
    refundAmount?: bigint,
    penaltyAmount?: bigint
  ): Promise<DisputeResolution> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const resolution: DisputeResolution = {
      id: this.generateId(),
      disputeId,
      decision,
      explanation,
      refundAmount,
      penaltyAmount,
      resolvedBy: resolver.publicKey,
      resolvedAt: new Date()
    };

    dispute.resolution = resolution;
    dispute.status = DisputeStatus.Resolved;
    dispute.updatedAt = new Date();

    // Update reputation scores for both parties
    await this.updateReputationScore(dispute.initiator);
    await this.updateReputationScore(dispute.respondent);

    return resolution;
  }

  /**
   * Calculate reputation score for an agent
   */
  async calculateReputationScore(agentPubkey: PublicKey): Promise<ReputationScore> {
    const agent = await this.client.getAgent(agentPubkey);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get reviews
    const { reviews, total, average } = await this.getAgentReviews(agentPubkey);

    // Get orders for completion rate
    const orders = await this.client.getAgentWorkOrders(agentPubkey);
    const completedOrders = orders.filter(o => o.status === WorkOrderStatus.Completed);
    const completionRate = orders.length > 0 
      ? (completedOrders.length / orders.length) * 100 
      : 0;

    // Calculate dispute rate
    const disputedOrders = orders.filter(o => o.hasDispute);
    const disputeRate = orders.length > 0
      ? (disputedOrders.length / orders.length) * 100
      : 0;

    // Calculate response rate (mock for now)
    const responseRate = 85; // Would calculate from actual response times

    // Calculate breakdown scores
    const breakdown = this.calculateReviewBreakdown(reviews);

    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      averageRating: average,
      completionRate,
      disputeRate,
      responseRate,
      totalReviews: total
    });

    // Determine trust level
    const trustLevel = this.determineTrustLevel(overallScore, total, agent);

    // Get badges
    const badges = this.calculateBadges(agent, orders, reviews);

    const score: ReputationScore = {
      agentPubkey,
      overallScore,
      totalReviews: total,
      averageRating: average,
      completionRate,
      disputeRate,
      responseRate,
      breakdown,
      badges,
      trustLevel
    };

    // Cache the score
    this.reputationCache.set(agentPubkey.toString(), score);

    return score;
  }

  /**
   * Get cached reputation score
   */
  getReputationScore(agentPubkey: PublicKey): ReputationScore | null {
    return this.reputationCache.get(agentPubkey.toString()) || null;
  }

  /**
   * Helper methods
   */

  private addReview(orderId: PublicKey, review: Review): void {
    const orderIdStr = orderId.toString();
    const reviews = this.reviews.get(orderIdStr) || [];
    reviews.push(review);
    this.reviews.set(orderIdStr, reviews);
  }

  private findReviewById(reviewId: string): Review | null {
    for (const [_, reviews] of this.reviews) {
      const review = reviews.find(r => r.id === reviewId);
      if (review) return review;
    }
    return null;
  }

  private async updateReputationScore(agentPubkey: PublicKey): Promise<void> {
    await this.calculateReputationScore(agentPubkey);
  }

  private calculateReviewBreakdown(reviews: Review[]): {
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  } {
    // Mock calculation - would analyze review content and tags
    return {
      quality: reviews.length > 0 ? 4.2 : 0,
      communication: reviews.length > 0 ? 4.5 : 0,
      timeliness: reviews.length > 0 ? 4.0 : 0,
      value: reviews.length > 0 ? 4.3 : 0
    };
  }

  private calculateOverallScore(metrics: {
    averageRating: number;
    completionRate: number;
    disputeRate: number;
    responseRate: number;
    totalReviews: number;
  }): number {
    // Weighted calculation
    const ratingWeight = 0.4;
    const completionWeight = 0.3;
    const disputeWeight = 0.2;
    const responseWeight = 0.1;

    const ratingScore = (metrics.averageRating / 5) * 100 * ratingWeight;
    const completionScore = metrics.completionRate * completionWeight;
    const disputeScore = (100 - metrics.disputeRate) * disputeWeight;
    const responseScore = metrics.responseRate * responseWeight;

    const baseScore = ratingScore + completionScore + disputeScore + responseScore;

    // Apply review count modifier
    const reviewModifier = Math.min(metrics.totalReviews / 10, 1);
    
    return Math.round(baseScore * (0.7 + 0.3 * reviewModifier));
  }

  private determineTrustLevel(score: number, totalReviews: number, agent: any): TrustLevel {
    if (totalReviews < 5) return TrustLevel.New;
    if (score >= 90 && totalReviews >= 50) return TrustLevel.Premium;
    if (score >= 80 && totalReviews >= 20) return TrustLevel.Trusted;
    if (score >= 70 && totalReviews >= 10) return TrustLevel.Verified;
    return TrustLevel.Basic;
  }

  private calculateBadges(agent: any, orders: any[], reviews: Review[]): Badge[] {
    const badges: Badge[] = [];

    // First order badge
    if (orders.length >= 1) {
      badges.push({
        id: 'first-order',
        name: 'First Order',
        description: 'Completed first order',
        icon: '🎯',
        earnedAt: new Date()
      });
    }

    // High rating badge
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    if (avgRating >= 4.5 && reviews.length >= 10) {
      badges.push({
        id: 'top-rated',
        name: 'Top Rated',
        description: 'Maintains 4.5+ star rating',
        icon: '⭐',
        earnedAt: new Date()
      });
    }

    // Fast responder badge
    if (orders.length >= 10) {
      badges.push({
        id: 'fast-responder',
        name: 'Fast Responder',
        description: 'Quick response times',
        icon: '⚡',
        earnedAt: new Date()
      });
    }

    return badges;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}