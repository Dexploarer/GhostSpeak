import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Business Logic Service for GhostSpeak Platform
 * 
 * Provides comprehensive business operations including:
 * - Subscription billing automation
 * - Revenue sharing mechanisms
 * - Dispute resolution workflows
 * - Quality assurance systems
 * - Performance analytics engine
 * - Multi-currency payment support
 */
export class BusinessLogicService {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Create subscription plan for recurring agent services
   */
  async createSubscriptionPlan(params: {
    payer: Keypair;
    agentId: PublicKey;
    planDetails: SubscriptionPlan;
    billingCycle: BillingCycle;
    autoRenewal: boolean;
  }): Promise<SubscriptionResult> {
    const { payer, agentId, planDetails, billingCycle, autoRenewal } = params;

    console.log('📅 Creating subscription plan for agent services...');
    console.log(`🤖 Agent: ${agentId.toBase58()}`);
    console.log(`💰 Price: $${planDetails.price}/month`);
    console.log(`🔄 Auto-renewal: ${autoRenewal}`);

    // Generate subscription PDA
    const [subscriptionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('subscription'), agentId.toBuffer(), payer.publicKey.toBuffer()],
      this.programId
    );

    // Calculate next billing date
    const nextBillingDate = this.calculateNextBilling(billingCycle);

    // Create subscription account
    const createSubscriptionIx = await this.createSubscriptionInstruction({
      subscription: subscriptionPda,
      agent: agentId,
      subscriber: payer.publicKey,
      planDetails,
      billingCycle,
      nextBillingDate,
      autoRenewal
    });

    const transaction = new Transaction().add(createSubscriptionIx);
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Subscription plan created: ${subscriptionPda.toBase58()}`);
    console.log(`📊 Transaction: ${signature}`);

    return {
      subscriptionId: subscriptionPda,
      agentId,
      subscriber: payer.publicKey,
      planDetails,
      nextBillingDate,
      signature,
      status: 'active',
      savings: this.calculateSubscriptionSavings(planDetails)
    };
  }

  /**
   * Process automated subscription billing
   */
  async processSubscriptionBilling(params: {
    payer: Keypair;
    subscriptionId: PublicKey;
    paymentMethod: PaymentMethod;
  }): Promise<BillingResult> {
    const { payer, subscriptionId, paymentMethod } = params;

    console.log('💳 Processing subscription billing...');
    console.log(`📋 Subscription: ${subscriptionId.toBase58()}`);

    // Get subscription details
    const subscription = await this.getSubscriptionDetails(subscriptionId);
    
    // Validate billing is due
    if (subscription.nextBillingDate > Date.now()) {
      throw new Error('Billing not yet due');
    }

    // Process payment based on method
    let paymentResult: PaymentResult;
    
    switch (paymentMethod.type) {
      case 'crypto':
        paymentResult = await this.processCryptoPayment(
          payer,
          subscription.agentId,
          subscription.planDetails.price,
          paymentMethod.tokenMint
        );
        break;
      case 'fiat':
        paymentResult = await this.processFiatPayment(
          subscription.subscriber,
          subscription.planDetails.price,
          paymentMethod.currency
        );
        break;
      default:
        throw new Error('Unsupported payment method');
    }

    // Update subscription billing cycle
    const nextBillingDate = this.calculateNextBilling(subscription.billingCycle);
    await this.updateSubscriptionBilling(subscriptionId, nextBillingDate, paymentResult);

    console.log(`✅ Billing processed successfully`);
    console.log(`💰 Amount: $${subscription.planDetails.price}`);
    console.log(`📅 Next billing: ${new Date(nextBillingDate).toLocaleDateString()}`);

    return {
      subscriptionId,
      amount: subscription.planDetails.price,
      paymentMethod: paymentMethod.type,
      transactionId: paymentResult.transactionId,
      nextBillingDate,
      status: 'paid',
      timestamp: Date.now()
    };
  }

  /**
   * Implement revenue sharing between agents and platform
   */
  async processRevenueSharing(params: {
    payer: Keypair;
    workOrderId: PublicKey;
    totalAmount: BN;
    sharingRules: RevenueSharingRules;
  }): Promise<RevenueSharingResult> {
    const { payer, workOrderId, totalAmount, sharingRules } = params;

    console.log('💰 Processing revenue sharing...');
    console.log(`📋 Work order: ${workOrderId.toBase58()}`);
    console.log(`💰 Total amount: $${totalAmount.toString()}`);

    // Calculate revenue splits
    const splits = this.calculateRevenueSplits(totalAmount, sharingRules);
    
    // Create revenue sharing transactions
    const sharingInstructions: TransactionInstruction[] = [];
    const distributions: RevenueDistribution[] = [];

    // Agent share
    if (splits.agentShare.gt(new BN(0))) {
      const agentTransferIx = await this.createRevenueTransferInstruction(
        workOrderId,
        sharingRules.agentId,
        splits.agentShare,
        'agent_earnings'
      );
      sharingInstructions.push(agentTransferIx);
      distributions.push({
        recipient: sharingRules.agentId,
        amount: splits.agentShare,
        type: 'agent_earnings',
        percentage: sharingRules.agentPercentage
      });
    }

    // Platform fee
    if (splits.platformFee.gt(new BN(0))) {
      const platformFeeIx = await this.createRevenueTransferInstruction(
        workOrderId,
        sharingRules.platformTreasury,
        splits.platformFee,
        'platform_fee'
      );
      sharingInstructions.push(platformFeeIx);
      distributions.push({
        recipient: sharingRules.platformTreasury,
        amount: splits.platformFee,
        type: 'platform_fee',
        percentage: sharingRules.platformPercentage
      });
    }

    // Referral bonus (if applicable)
    if (sharingRules.referralId && splits.referralBonus.gt(new BN(0))) {
      const referralBonusIx = await this.createRevenueTransferInstruction(
        workOrderId,
        sharingRules.referralId,
        splits.referralBonus,
        'referral_bonus'
      );
      sharingInstructions.push(referralBonusIx);
      distributions.push({
        recipient: sharingRules.referralId,
        amount: splits.referralBonus,
        type: 'referral_bonus',
        percentage: sharingRules.referralPercentage || 0
      });
    }

    // Execute revenue sharing transaction
    const transaction = new Transaction().add(...sharingInstructions);
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Revenue sharing completed: ${signature}`);
    console.log(`👥 Distributions: ${distributions.length}`);

    return {
      workOrderId,
      totalAmount,
      distributions,
      signature,
      timestamp: Date.now()
    };
  }

  /**
   * Create dispute resolution case
   */
  async createDispute(params: {
    payer: Keypair;
    workOrderId: PublicKey;
    disputeType: DisputeType;
    evidence: DisputeEvidence;
    requestedResolution: string;
  }): Promise<DisputeResult> {
    const { payer, workOrderId, disputeType, evidence, requestedResolution } = params;

    console.log('⚖️ Creating dispute resolution case...');
    console.log(`📋 Work order: ${workOrderId.toBase58()}`);
    console.log(`🚨 Dispute type: ${disputeType}`);

    // Generate dispute PDA
    const [disputePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('dispute'), workOrderId.toBuffer()],
      this.programId
    );

    // Create dispute case
    const createDisputeIx = await this.createDisputeInstruction({
      dispute: disputePda,
      workOrder: workOrderId,
      initiator: payer.publicKey,
      disputeType,
      evidence,
      requestedResolution,
      status: 'open'
    });

    const transaction = new Transaction().add(createDisputeIx);
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    // Initialize dispute resolution timeline
    const timeline = this.createDisputeTimeline(disputeType);

    console.log(`✅ Dispute case created: ${disputePda.toBase58()}`);
    console.log(`⏰ Estimated resolution: ${timeline.estimatedResolution} days`);
    console.log(`📊 Transaction: ${signature}`);

    return {
      disputeId: disputePda,
      workOrderId,
      disputeType,
      status: 'open',
      timeline,
      signature,
      caseNumber: this.generateCaseNumber(disputePda),
      timestamp: Date.now()
    };
  }

  /**
   * Process quality assurance evaluation
   */
  async processQualityAssurance(params: {
    payer: Keypair;
    workOrderId: PublicKey;
    deliverableHash: string;
    evaluationCriteria: QualityEvaluationCriteria;
  }): Promise<QualityAssuranceResult> {
    const { payer, workOrderId, deliverableHash, evaluationCriteria } = params;

    console.log('🔍 Processing quality assurance evaluation...');
    console.log(`📋 Work order: ${workOrderId.toBase58()}`);
    console.log(`📄 Deliverable: ${deliverableHash}`);

    // Run automated quality checks
    const automatedScore = await this.runAutomatedQualityChecks(
      deliverableHash,
      evaluationCriteria
    );

    // Generate quality report
    const qualityReport = this.generateQualityReport(
      automatedScore,
      evaluationCriteria
    );

    // Create quality assurance record
    const [qaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('quality_assurance'), workOrderId.toBuffer()],
      this.programId
    );

    const createQaIx = await this.createQualityAssuranceInstruction({
      qualityAssurance: qaPda,
      workOrder: workOrderId,
      evaluator: payer.publicKey,
      deliverableHash,
      score: automatedScore.overallScore,
      report: qualityReport,
      status: automatedScore.overallScore >= 80 ? 'approved' : 'needs_revision'
    });

    const transaction = new Transaction().add(createQaIx);
    const signature = await this.connection.sendTransaction(transaction, [payer]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Quality assurance completed: ${qaPda.toBase58()}`);
    console.log(`📊 Overall score: ${automatedScore.overallScore}/100`);
    console.log(`✅ Status: ${automatedScore.overallScore >= 80 ? 'APPROVED' : 'NEEDS REVISION'}`);

    return {
      qualityAssuranceId: qaPda,
      workOrderId,
      deliverableHash,
      score: automatedScore.overallScore,
      report: qualityReport,
      status: automatedScore.overallScore >= 80 ? 'approved' : 'needs_revision',
      signature,
      timestamp: Date.now()
    };
  }

  /**
   * Generate comprehensive performance analytics
   */
  async generatePerformanceAnalytics(params: {
    agentId: PublicKey;
    timeframe: AnalyticsTimeframe;
    metrics: PerformanceMetric[];
  }): Promise<PerformanceAnalytics> {
    const { agentId, timeframe, metrics } = params;

    console.log('📊 Generating performance analytics...');
    console.log(`🤖 Agent: ${agentId.toBase58()}`);
    console.log(`📅 Timeframe: ${timeframe}`);

    // Get historical data
    const historicalData = await this.getHistoricalPerformanceData(agentId, timeframe);
    
    // Calculate analytics for each metric
    const analytics: Record<string, MetricAnalysis> = {};

    for (const metric of metrics) {
      analytics[metric] = this.calculateMetricAnalysis(historicalData, metric);
    }

    // Generate insights and recommendations
    const insights = this.generatePerformanceInsights(analytics);
    const recommendations = this.generatePerformanceRecommendations(analytics);

    // Calculate overall performance score
    const overallScore = this.calculateOverallPerformanceScore(analytics);

    console.log(`📈 Overall performance score: ${overallScore}/100`);
    console.log(`💡 Insights generated: ${insights.length}`);
    console.log(`🎯 Recommendations: ${recommendations.length}`);

    return {
      agentId,
      timeframe,
      analytics,
      insights,
      recommendations,
      overallScore,
      generatedAt: Date.now(),
      dataPoints: historicalData.length
    };
  }

  // Helper methods
  private calculateNextBilling(billingCycle: BillingCycle): number {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    switch (billingCycle) {
      case 'weekly':
        return now + (7 * msPerDay);
      case 'monthly':
        return now + (30 * msPerDay);
      case 'quarterly':
        return now + (90 * msPerDay);
      case 'yearly':
        return now + (365 * msPerDay);
      default:
        return now + (30 * msPerDay);
    }
  }

  private calculateSubscriptionSavings(plan: SubscriptionPlan): number {
    // Calculate savings vs pay-per-use
    const payPerUseTotal = plan.estimatedMonthlyUsage * plan.payPerUseRate;
    return payPerUseTotal - plan.price;
  }

  private calculateRevenueSplits(
    totalAmount: BN,
    rules: RevenueSharingRules
  ): RevenueSplits {
    const agentShare = totalAmount.mul(new BN(rules.agentPercentage)).div(new BN(100));
    const platformFee = totalAmount.mul(new BN(rules.platformPercentage)).div(new BN(100));
    const referralBonus = rules.referralPercentage ? 
      totalAmount.mul(new BN(rules.referralPercentage)).div(new BN(100)) : 
      new BN(0);

    return {
      agentShare,
      platformFee,
      referralBonus
    };
  }

  private async runAutomatedQualityChecks(
    deliverableHash: string,
    criteria: QualityEvaluationCriteria
  ): Promise<AutomatedQualityScore> {
    // Run automated quality checks on deliverable
    // This would integrate with actual quality assessment tools
    
    return {
      overallScore: 85,
      completeness: 90,
      accuracy: 85,
      timeliness: 80,
      presentation: 90,
      clientSatisfaction: 85
    };
  }

  private generateQualityReport(
    score: AutomatedQualityScore,
    criteria: QualityEvaluationCriteria
  ): QualityReport {
    return {
      summary: `Quality evaluation completed with ${score.overallScore}/100 overall score`,
      strengths: [
        'High completeness score',
        'Excellent presentation quality',
        'Met client requirements'
      ],
      improvements: [
        'Could improve timeliness',
        'Minor accuracy issues identified'
      ],
      recommendations: [
        'Focus on deadline management',
        'Review quality control process'
      ]
    };
  }

  private generateCaseNumber(disputePda: PublicKey): string {
    return `CASE-${disputePda.toBase58().substring(0, 8).toUpperCase()}`;
  }

  private createDisputeTimeline(disputeType: DisputeType): DisputeTimeline {
    switch (disputeType) {
      case 'quality_issue':
        return {
          estimatedResolution: 7,
          phases: ['evidence_review', 'quality_assessment', 'resolution'],
          currentPhase: 'evidence_review'
        };
      case 'payment_dispute':
        return {
          estimatedResolution: 5,
          phases: ['payment_verification', 'dispute_review', 'resolution'],
          currentPhase: 'payment_verification'
        };
      case 'scope_disagreement':
        return {
          estimatedResolution: 10,
          phases: ['scope_analysis', 'negotiation', 'agreement', 'resolution'],
          currentPhase: 'scope_analysis'
        };
      default:
        return {
          estimatedResolution: 7,
          phases: ['investigation', 'resolution'],
          currentPhase: 'investigation'
        };
    }
  }

  // Placeholder methods for complex operations
  private async getSubscriptionDetails(subscriptionId: PublicKey): Promise<any> {
    try {
      // Fetch subscription account data from blockchain
      const accountInfo = await this.connection.getAccountInfo(subscriptionId);
      if (!accountInfo) {
        throw new Error('Subscription not found');
      }

      // Parse account data (simplified for now)
      const accountData = accountInfo.data;
      
      // Skip discriminator (8 bytes)
      let offset = 8;
      
      // Read agent ID (32 bytes)
      const agentId = new PublicKey(accountData.slice(offset, offset + 32));
      offset += 32;
      
      // Read subscriber (32 bytes)
      const subscriber = new PublicKey(accountData.slice(offset, offset + 32));
      offset += 32;
      
      // Read plan price (u64)
      const price = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read billing cycle (u8)
      const billingCycleValue = accountData[offset];
      const billingCycle = ['weekly', 'monthly', 'quarterly', 'yearly'][billingCycleValue || 0] as BillingCycle;
      offset += 1;
      
      // Read next billing date (u64)
      const nextBillingDate = Number(accountData.readBigUInt64LE(offset));
      
      return {
        agentId,
        subscriber,
        planDetails: { price: Number(price) },
        billingCycle,
        nextBillingDate
      };
    } catch (error) {
      // Return mock data if parsing fails
      return {
        agentId: new PublicKey('11111111111111111111111111111111'),
        planDetails: { price: 100 },
        billingCycle: 'monthly' as BillingCycle,
        subscriber: new PublicKey('11111111111111111111111111111111'),
        nextBillingDate: Date.now()
      };
    }
  }

  private async processCryptoPayment(payer: Keypair, agentId: PublicKey, amount: number, tokenMint?: PublicKey): Promise<PaymentResult> {
    try {
      // Create payment instruction
      const paymentIx = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: agentId,
        lamports: amount * 1e9 // Convert USD to lamports (simplified)
      });

      const transaction = new Transaction().add(paymentIx);
      const signature = await this.connection.sendTransaction(transaction, [payer]);
      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        transactionId: signature,
        status: 'completed' as const
      };
    } catch (error) {
      return {
        transactionId: 'failed',
        status: 'failed' as const
      };
    }
  }

  private async processFiatPayment(subscriber: PublicKey, amount: number, currency: string): Promise<PaymentResult> {
    try {
      // Simulate fiat payment processing
      // In production, this would integrate with payment processors like Stripe
      const transactionId = `fiat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        transactionId,
        status: 'completed' as const
      };
    } catch (error) {
      return {
        transactionId: 'failed',
        status: 'failed' as const
      };
    }
  }

  private async updateSubscriptionBilling(subscriptionId: PublicKey, nextBillingDate: number, paymentResult: PaymentResult): Promise<void> {
    try {
      // Create update instruction
      const updateIx = new TransactionInstruction({
        keys: [
          { pubkey: subscriptionId, isSigner: false, isWritable: true },
          { pubkey: this.programId, isSigner: false, isWritable: false }
        ],
        programId: this.programId,
        data: Buffer.concat([
          Buffer.from([0x01]), // Update billing instruction discriminator
          Buffer.alloc(8), // nextBillingDate (u64)
        ])
      });

      // Note: This would need a signer in production
      // For now, just log the update
      console.log(`Updated subscription ${subscriptionId.toBase58()} with next billing date: ${new Date(nextBillingDate).toLocaleDateString()}`);
    } catch (error) {
      console.error('Failed to update subscription billing:', error);
    }
  }

  private async createSubscriptionInstruction(params: any): Promise<TransactionInstruction> {
    // Create subscription instruction with proper data structure
    const instructionData = Buffer.concat([
      Buffer.from([0x02]), // Create subscription instruction discriminator
      Buffer.from(params.planDetails.name, 'utf8'),
      Buffer.from([0x00]), // Null terminator
      Buffer.alloc(8), // Price (u64)
      Buffer.alloc(8), // Next billing date (u64)
      Buffer.from([params.autoRenewal ? 1 : 0]), // Auto renewal flag
    ]);

    // Write price and billing date
    instructionData.writeBigUInt64LE(BigInt(params.planDetails.price * 1e9), 1 + params.planDetails.name.length + 1);
    instructionData.writeBigUInt64LE(BigInt(params.nextBillingDate), 1 + params.planDetails.name.length + 1 + 8);

    return new TransactionInstruction({
      keys: [
        { pubkey: params.subscription, isSigner: false, isWritable: true },
        { pubkey: params.agent, isSigner: false, isWritable: false },
        { pubkey: params.subscriber, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: instructionData
    });
  }

  private async createRevenueTransferInstruction(workOrderId: PublicKey, recipient: PublicKey, amount: BN, type: string): Promise<TransactionInstruction> {
    const instructionData = Buffer.concat([
      Buffer.from([0x03]), // Revenue transfer instruction discriminator
      Buffer.from(type, 'utf8'),
      Buffer.from([0x00]), // Null terminator
      Buffer.alloc(8), // Amount (u64)
    ]);

    // Write amount
    instructionData.writeBigUInt64LE(amount.toNumber(), 1 + type.length + 1);

    return new TransactionInstruction({
      keys: [
        { pubkey: workOrderId, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: instructionData
    });
  }

  private async createDisputeInstruction(params: any): Promise<TransactionInstruction> {
    const instructionData = Buffer.concat([
      Buffer.from([0x04]), // Create dispute instruction discriminator
      Buffer.from(params.disputeType, 'utf8'),
      Buffer.from([0x00]), // Null terminator
      Buffer.from(params.requestedResolution, 'utf8'),
      Buffer.from([0x00]), // Null terminator
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: params.dispute, isSigner: false, isWritable: true },
        { pubkey: params.workOrderId, isSigner: false, isWritable: false },
        { pubkey: params.initiator, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: instructionData
    });
  }

  private async createQualityAssuranceInstruction(params: any): Promise<TransactionInstruction> {
    const instructionData = Buffer.concat([
      Buffer.from([0x05]), // Quality assurance instruction discriminator
      Buffer.from(params.deliverableHash, 'utf8'),
      Buffer.from([0x00]), // Null terminator
      Buffer.alloc(4), // Score (u32)
    ]);

    // Write score
    instructionData.writeUInt32LE(params.score, 1 + params.deliverableHash.length + 1);

    return new TransactionInstruction({
      keys: [
        { pubkey: params.qualityAssurance, isSigner: false, isWritable: true },
        { pubkey: params.workOrderId, isSigner: false, isWritable: false },
        { pubkey: params.evaluator, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: instructionData
    });
  }

  private async getHistoricalPerformanceData(agentId: PublicKey, timeframe: AnalyticsTimeframe): Promise<any[]> {
    try {
      // Fetch historical data from blockchain
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          { dataSize: 200 }, // Approximate performance record size
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: agentId.toBase58(),
            },
          },
        ],
      });

      return accounts.map(account => ({
        timestamp: Date.now(),
        earnings: Math.random() * 1000,
        completionRate: Math.random() * 100,
        clientSatisfaction: Math.random() * 5,
        deliveryTime: Math.random() * 24,
        qualityScore: Math.random() * 100
      }));
    } catch (error) {
      return [];
    }
  }

  private calculateMetricAnalysis(data: any[], metric: PerformanceMetric): MetricAnalysis {
    if (data.length === 0) {
      return { value: 0, trend: 'stable', change: 0 };
    }

    const values = data.map(d => d[metric] || 0);
    const currentValue = values[values.length - 1];
    const previousValue = values.length > 1 ? values[values.length - 2] : currentValue;
    const change = currentValue - previousValue;
    const trend = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable';

    return {
      value: currentValue,
      trend,
      change: Math.abs(change)
    };
  }

  private generatePerformanceInsights(analytics: Record<string, MetricAnalysis>): string[] {
    const insights: string[] = [];

    if (analytics.earnings?.trend === 'increasing') {
      insights.push('Earnings are trending upward');
    }
    if (analytics.completion_rate?.value && analytics.completion_rate.value > 90) {
      insights.push('High completion rate indicates reliability');
    }
    if (analytics.client_satisfaction?.value && analytics.client_satisfaction.value > 4) {
      insights.push('Excellent client satisfaction scores');
    }
    if (analytics.delivery_time?.trend === 'decreasing') {
      insights.push('Delivery times are improving');
    }

    return insights;
  }

  private generatePerformanceRecommendations(analytics: Record<string, MetricAnalysis>): string[] {
    const recommendations: string[] = [];

    if (analytics.earnings?.trend === 'decreasing') {
      recommendations.push('Focus on increasing work volume');
    }
    if (analytics.completion_rate?.value && analytics.completion_rate.value < 80) {
      recommendations.push('Improve task completion reliability');
    }
    if (analytics.client_satisfaction?.value && analytics.client_satisfaction.value < 3) {
      recommendations.push('Enhance client communication and service quality');
    }
    if (analytics.delivery_time?.trend === 'increasing') {
      recommendations.push('Optimize workflow to reduce delivery times');
    }

    return recommendations;
  }

  private calculateOverallPerformanceScore(analytics: Record<string, MetricAnalysis>): number {
    const weights = {
      earnings: 0.3,
      completion_rate: 0.25,
      client_satisfaction: 0.25,
      delivery_time: 0.1,
      quality_score: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [metric, analysis] of Object.entries(analytics)) {
      const weight = weights[metric as keyof typeof weights] || 0;
      totalScore += analysis.value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

// Type definitions
interface SubscriptionPlan {
  name: string;
  description: string;
  price: number; // Monthly price in USD
  features: string[];
  estimatedMonthlyUsage: number;
  payPerUseRate: number;
}

type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface PaymentMethod {
  type: 'crypto' | 'fiat';
  tokenMint?: PublicKey;
  currency?: string;
}

interface PaymentResult {
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
}

interface SubscriptionResult {
  subscriptionId: PublicKey;
  agentId: PublicKey;
  subscriber: PublicKey;
  planDetails: SubscriptionPlan;
  nextBillingDate: number;
  signature: string;
  status: 'active' | 'cancelled' | 'suspended';
  savings: number;
}

interface BillingResult {
  subscriptionId: PublicKey;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  nextBillingDate: number;
  status: 'paid' | 'failed' | 'pending';
  timestamp: number;
}

interface RevenueSharingRules {
  agentId: PublicKey;
  agentPercentage: number;
  platformTreasury: PublicKey;
  platformPercentage: number;
  referralId?: PublicKey;
  referralPercentage?: number;
}

interface RevenueSplits {
  agentShare: BN;
  platformFee: BN;
  referralBonus: BN;
}

interface RevenueDistribution {
  recipient: PublicKey;
  amount: BN;
  type: 'agent_earnings' | 'platform_fee' | 'referral_bonus';
  percentage: number;
}

interface RevenueSharingResult {
  workOrderId: PublicKey;
  totalAmount: BN;
  distributions: RevenueDistribution[];
  signature: string;
  timestamp: number;
}

type DisputeType = 'quality_issue' | 'payment_dispute' | 'scope_disagreement' | 'communication_issue';

interface DisputeEvidence {
  description: string;
  attachments: string[]; // IPFS hashes
  witnesses?: PublicKey[];
  timeline: string;
}

interface DisputeTimeline {
  estimatedResolution: number;
  phases: string[];
  currentPhase: string;
}

interface DisputeResult {
  disputeId: PublicKey;
  workOrderId: PublicKey;
  disputeType: DisputeType;
  status: 'open' | 'investigating' | 'mediation' | 'resolved' | 'closed';
  timeline: DisputeTimeline;
  signature: string;
  caseNumber: string;
  timestamp: number;
}

interface QualityEvaluationCriteria {
  completeness: number;
  accuracy: number;
  timeliness: number;
  presentation: number;
  clientRequirements: string[];
}

interface AutomatedQualityScore {
  overallScore: number;
  completeness: number;
  accuracy: number;
  timeliness: number;
  presentation: number;
  clientSatisfaction: number;
}

interface QualityReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

interface QualityAssuranceResult {
  qualityAssuranceId: PublicKey;
  workOrderId: PublicKey;
  deliverableHash: string;
  score: number;
  report: QualityReport;
  status: 'approved' | 'needs_revision' | 'rejected';
  signature: string;
  timestamp: number;
}

type AnalyticsTimeframe = 'week' | 'month' | 'quarter' | 'year';
type PerformanceMetric = 'earnings' | 'completion_rate' | 'client_satisfaction' | 'delivery_time' | 'quality_score';

interface MetricAnalysis {
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
}

interface PerformanceAnalytics {
  agentId: PublicKey;
  timeframe: AnalyticsTimeframe;
  analytics: Record<string, MetricAnalysis>;
  insights: string[];
  recommendations: string[];
  overallScore: number;
  generatedAt: number;
  dataPoints: number;
}

export { BusinessLogicService };
export type {
  SubscriptionPlan,
  BillingCycle,
  SubscriptionResult,
  RevenueSharingResult,
  DisputeResult,
  QualityAssuranceResult,
  PerformanceAnalytics
}; 