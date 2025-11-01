# x402 Reputation Integration Technical Specification

## Overview

This document specifies how x402 payment transactions integrate with GhostSpeak's on-chain reputation system. Every x402 payment automatically updates agent reputation scores based on payment success, response times, and service quality.

**Goal**: Create transparent, automated reputation tracking for AI agent commerce
**Data Source**: On-chain x402 payment transactions + service performance metrics
**Update Frequency**: Real-time after each transaction
**Reputation Range**: 0-10,000 basis points (0-100%)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          x402 Reputation Integration Architecture           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client Makes Payment    Agent Provides Service            │
│  ────────────────────    ───────────────────               │
│                                                             │
│  1. x402 Payment    ──►  2. Transaction      ──►  3. Agent │
│     SPL Token Transfer    Confirmed on-chain     Processes  │
│     With memo metadata    200-400ms settlement   Request    │
│                                                             │
│  4. Service Complete ──►  5. Record Metrics  ──►  6. Update│
│     Response returned     Response time          Reputation │
│     Quality assessed      Success/failure        On-chain   │
│                                                             │
│  7. Reputation Event ──►  8. Listeners/Indexers            │
│     Emitted on-chain      Update off-chain cache           │
│     ReputationUpdated     Trigger notifications            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Reputation Calculation

### Base Formula

```
Reputation Score = (
  Payment Success Rate × 40% +
  Service Quality Score × 30% +
  Response Time Score × 20% +
  Volume Consistency × 10%
) × 10,000
```

Where:
- **Payment Success Rate**: Percentage of successful x402 transactions (0-100%)
- **Service Quality Score**: Computed from dispute rate and client feedback (0-100%)
- **Response Time Score**: Performance relative to SLA (0-100%)
- **Volume Consistency**: Trading volume stability over time (0-100%)

### Component Details

#### 1. Payment Success Rate (40% weight)

```typescript
function calculatePaymentSuccessRate(agent: Agent): number {
  const totalPayments = agent.x402_total_calls
  const successfulPayments = totalPayments - agent.failed_payments

  // Prevent division by zero
  if (totalPayments === 0) return 0

  return (successfulPayments / totalPayments) * 100
}
```

**Factors**:
- ✅ Successful x402 payment → +1 to success count
- ❌ Failed transaction → -1 to success rate
- ❌ Refund/dispute → -2 to success rate
- ❌ Service not provided → -5 to success rate

#### 2. Service Quality Score (30% weight)

```typescript
function calculateServiceQualityScore(agent: Agent): number {
  // Prevent division by zero
  const disputeRate = agent.x402_total_calls > 0
    ? agent.total_disputes / agent.x402_total_calls
    : 0

  const resolutionRate = agent.total_disputes > 0
    ? agent.disputes_resolved / agent.total_disputes
    : 1.0 // Assume 100% resolution if no disputes

  const averageRating = agent.total_ratings_count > 0
    ? agent.total_rating / agent.total_ratings_count
    : 3.0 // Neutral rating for new agents

  // Base quality from ratings (0-100)
  const ratingScore = (averageRating / 5) * 100

  // Penalty for disputes
  const disputePenalty = disputeRate * 50 // Up to -50%

  // Bonus for good resolution
  const resolutionBonus = resolutionRate * 10 // Up to +10%

  return Math.max(0, Math.min(100, ratingScore - disputePenalty + resolutionBonus))
}
```

**Factors**:
- ✅ 5-star rating → +100 quality
- ✅ 4-star rating → +80 quality
- ⚠️ 3-star rating → +60 quality
- ❌ 2-star rating → +40 quality
- ❌ 1-star rating → +20 quality
- ❌ Dispute filed → -10 quality
- ✅ Dispute resolved favorably → +5 quality

#### 3. Response Time Score (20% weight)

```typescript
function calculateResponseTimeScore(agent: Agent): number {
  // Prevent division by zero
  if (agent.x402_total_calls === 0) {
    return 100 // Assume perfect score for new agents
  }

  const avgResponseTime = agent.total_response_time / agent.x402_total_calls
  const slaTarget = 1000 // 1 second target

  if (avgResponseTime <= slaTarget) {
    return 100 // Perfect score
  }

  // Decay score based on how much slower than SLA
  const slowdownFactor = avgResponseTime / slaTarget
  const score = Math.max(0, 100 - (slowdownFactor - 1) * 50)

  return score
}
```

**Performance Tiers**:
- ⚡ <500ms → 100 points
- ✅ 500-1000ms → 100 points
- ⚠️ 1-2s → 75 points
- ⚠️ 2-5s → 50 points
- ❌ 5-10s → 25 points
- ❌ >10s → 0 points

#### 4. Volume Consistency (10% weight)

```typescript
function calculateVolumeConsistency(agent: Agent): number {
  // Get payment volume for last 7 days
  const dailyVolumes = agent.payment_history_7d

  if (dailyVolumes.length < 7) {
    return 50 // Neutral score for new agents
  }

  // Calculate coefficient of variation (lower is better)
  const mean = dailyVolumes.reduce((a, b) => a + b, 0) / dailyVolumes.length
  const variance = dailyVolumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyVolumes.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / mean

  // Convert to score (0-100)
  const score = Math.max(0, 100 - cv * 100)

  return score
}
```

**Factors**:
- ✅ Consistent daily volume → 100 points
- ⚠️ Variable volume → 50-75 points
- ❌ Highly erratic volume → 0-25 points

---

## On-Chain Reputation Updates

### Rust Instruction: `record_x402_payment`

```rust
// programs/src/instructions/reputation/record_x402_payment.rs

use anchor_lang::prelude::*;
use crate::state::{Agent, ReputationMetrics};
use crate::errors::GhostSpeakError;

#[derive(Accounts)]
pub struct RecordX402Payment<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.owner.as_ref()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + ReputationMetrics::LEN,
        seeds = [b"reputation", agent.key().as_ref()],
        bump
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<RecordX402Payment>,
    payment_signature: String,
    amount: u64,
    response_time_ms: u64,
    success: bool,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let metrics = &mut ctx.accounts.reputation_metrics;
    let clock = &ctx.accounts.clock;

    // Verify agent has x402 enabled
    require!(agent.x402_enabled, GhostSpeakError::X402NotEnabled);

    // Update payment counters
    agent.x402_total_calls += 1;
    if success {
        agent.x402_total_payments += amount;
    } else {
        metrics.failed_payments += 1;
    }

    // Update response time metrics
    metrics.total_response_time += response_time_ms;
    metrics.response_time_count += 1;

    // Update payment history (rolling 7-day window)
    let day_index = (clock.unix_timestamp / 86400) % 7;
    metrics.payment_history_7d[day_index as usize] += 1;

    // Recalculate reputation score
    let new_reputation = calculate_reputation_score(agent, metrics)?;
    agent.reputation_score = new_reputation;
    agent.updated_at = clock.unix_timestamp;

    // Emit reputation update event
    emit!(ReputationUpdated {
        agent: agent.key(),
        old_score: agent.reputation_score,
        new_score: new_reputation,
        payment_signature,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn calculate_reputation_score(
    agent: &Agent,
    metrics: &ReputationMetrics,
) -> Result<u32> {
    // Payment success rate (40%)
    let total_payments = agent.x402_total_calls;
    let successful_payments = total_payments.saturating_sub(metrics.failed_payments);
    let payment_success_rate = if total_payments > 0 {
        (successful_payments as f64 / total_payments as f64) * 100.0
    } else {
        0.0
    };

    // Service quality (30%)
    let dispute_rate = metrics.total_disputes as f64 / total_payments as f64;
    let resolution_rate = if metrics.total_disputes > 0 {
        metrics.disputes_resolved as f64 / metrics.total_disputes as f64
    } else {
        1.0
    };
    let avg_rating = if metrics.total_ratings_count > 0 {
        metrics.total_rating as f64 / metrics.total_ratings_count as f64
    } else {
        3.0 // Neutral rating for new agents
    };

    let rating_score = (avg_rating / 5.0) * 100.0;
    let dispute_penalty = dispute_rate * 50.0;
    let resolution_bonus = resolution_rate * 10.0;
    let service_quality = (rating_score - dispute_penalty + resolution_bonus).max(0.0).min(100.0);

    // Response time (20%)
    let avg_response_time = if metrics.response_time_count > 0 {
        metrics.total_response_time / metrics.response_time_count
    } else {
        1000 // Assume 1s for new agents
    };
    let sla_target = 1000u64; // 1 second
    let response_time_score = if avg_response_time <= sla_target {
        100.0
    } else {
        let slowdown_factor = avg_response_time as f64 / sla_target as f64;
        (100.0 - (slowdown_factor - 1.0) * 50.0).max(0.0)
    };

    // Volume consistency (10%)
    let daily_volumes = &metrics.payment_history_7d;
    let volume_consistency = if daily_volumes.iter().sum::<u64>() > 0 {
        let mean = daily_volumes.iter().sum::<u64>() as f64 / 7.0;
        let variance = daily_volumes.iter()
            .map(|&v| (v as f64 - mean).powi(2))
            .sum::<f64>() / 7.0;
        let std_dev = variance.sqrt();
        let cv = if mean > 0.0 { std_dev / mean } else { 0.0 };
        (100.0 - cv * 100.0).max(0.0)
    } else {
        50.0 // Neutral for new agents
    };

    // Final weighted score
    let final_score = (
        payment_success_rate * 0.4 +
        service_quality * 0.3 +
        response_time_score * 0.2 +
        volume_consistency * 0.1
    ) * 100.0; // Convert to basis points

    // Clamp to valid range
    let score = final_score.max(0.0).min(10000.0) as u32;

    Ok(score)
}
```

### New State: `ReputationMetrics`

```rust
// programs/src/state/reputation.rs

#[account]
pub struct ReputationMetrics {
    pub agent: Pubkey,

    // Payment metrics
    pub failed_payments: u64,
    pub total_response_time: u64,
    pub response_time_count: u64,

    // Service quality metrics
    pub total_disputes: u32,
    pub disputes_resolved: u32,
    pub total_rating: u32,        // Sum of all ratings (1-5 stars)
    pub total_ratings_count: u32, // Count of ratings

    // Volume tracking (rolling 7-day window)
    pub payment_history_7d: [u64; 7],

    // Timestamps
    pub created_at: i64,
    pub updated_at: i64,

    pub bump: u8,
}

impl ReputationMetrics {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 + // failed_payments
        8 + // total_response_time
        8 + // response_time_count
        4 + // total_disputes
        4 + // disputes_resolved
        4 + // total_rating
        4 + // total_ratings_count
        (8 * 7) + // payment_history_7d
        8 + // created_at
        8 + // updated_at
        1; // bump
}
```

### Event: `ReputationUpdated`

```rust
#[event]
pub struct ReputationUpdated {
    pub agent: Pubkey,
    pub old_score: u32,
    pub new_score: u32,
    pub payment_signature: String,
    pub timestamp: i64,
}
```

---

## TypeScript SDK Integration

### Client-Side Reputation Recording

```typescript
// packages/sdk-typescript/src/reputation/ReputationClient.ts

import type { Address, Signature, TransactionSigner } from '@solana/kit'
import type { X402Client } from '../x402/X402Client.js'

export class ReputationClient {
  constructor(
    private x402Client: X402Client,
    private wallet: TransactionSigner
  ) {}

  /**
   * Record x402 payment for reputation tracking
   */
  async recordPayment(params: {
    agentAddress: Address
    paymentSignature: Signature
    responseTimeMs: number
    success: boolean
  }): Promise<Signature> {
    // Verify payment on-chain first
    const verification = await this.x402Client.verifyPayment(params.paymentSignature)

    if (!verification.valid || !verification.receipt) {
      throw new Error('Invalid payment signature')
    }

    // Build record_x402_payment instruction
    const instruction = await this.buildRecordPaymentInstruction({
      agentAddress: params.agentAddress,
      paymentSignature: params.paymentSignature,
      amount: verification.receipt.amount,
      responseTimeMs: params.responseTimeMs,
      success: params.success
    })

    // Send transaction
    const signature = await this.sendTransaction([instruction])

    return signature
  }

  /**
   * Submit rating for agent
   */
  async submitRating(params: {
    agentAddress: Address
    paymentSignature: Signature
    rating: 1 | 2 | 3 | 4 | 5
    comment?: string
  }): Promise<Signature> {
    // Verify user actually made the payment
    const verification = await this.x402Client.verifyPayment(params.paymentSignature)

    if (!verification.valid) {
      throw new Error('Invalid payment signature')
    }

    // Build submit_rating instruction
    const instruction = await this.buildSubmitRatingInstruction(params)

    // Send transaction
    const signature = await this.sendTransaction([instruction])

    return signature
  }

  /**
   * Get agent reputation details
   */
  async getReputationDetails(agentAddress: Address): Promise<ReputationDetails> {
    // Fetch agent account
    const agent = await this.fetchAgentAccount(agentAddress)

    // Fetch reputation metrics account
    const metrics = await this.fetchReputationMetrics(agentAddress)

    // Calculate component scores
    const paymentSuccessRate = this.calculatePaymentSuccessRate(agent, metrics)
    const serviceQuality = this.calculateServiceQuality(agent, metrics)
    const responseTimeScore = this.calculateResponseTimeScore(metrics)
    const volumeConsistency = this.calculateVolumeConsistency(metrics)

    return {
      agentAddress,
      overallScore: agent.reputation_score,
      components: {
        paymentSuccessRate,
        serviceQuality,
        responseTimeScore,
        volumeConsistency
      },
      metrics: {
        totalPayments: agent.x402_total_calls,
        successfulPayments: agent.x402_total_calls - metrics.failed_payments,
        averageResponseTime: metrics.total_response_time / metrics.response_time_count,
        totalDisputes: metrics.total_disputes,
        averageRating: metrics.total_rating / metrics.total_ratings_count
      }
    }
  }

  /**
   * Subscribe to reputation updates
   */
  subscribeToReputationUpdates(
    agentAddress: Address,
    callback: (event: ReputationUpdatedEvent) => void
  ): () => void {
    // Subscribe to program logs
    const subscription = this.program.addEventListener(
      'ReputationUpdated',
      (event, slot) => {
        if (event.agent === agentAddress) {
          callback({
            agent: event.agent,
            oldScore: event.oldScore,
            newScore: event.newScore,
            paymentSignature: event.paymentSignature,
            timestamp: new Date(event.timestamp * 1000),
            slot
          })
        }
      }
    )

    return () => subscription()
  }

  // Private helper methods...
  private calculatePaymentSuccessRate(agent: any, metrics: any): number {
    const total = agent.x402_total_calls
    const successful = total - metrics.failed_payments
    return total > 0 ? (successful / total) * 100 : 0
  }

  private calculateServiceQuality(agent: any, metrics: any): number {
    const disputeRate = metrics.total_disputes / agent.x402_total_calls
    const resolutionRate = metrics.total_disputes > 0
      ? metrics.disputes_resolved / metrics.total_disputes
      : 1.0
    const avgRating = metrics.total_ratings_count > 0
      ? metrics.total_rating / metrics.total_ratings_count
      : 3.0

    const ratingScore = (avgRating / 5) * 100
    const disputePenalty = disputeRate * 50
    const resolutionBonus = resolutionRate * 10

    return Math.max(0, Math.min(100, ratingScore - disputePenalty + resolutionBonus))
  }

  private calculateResponseTimeScore(metrics: any): number {
    const avgResponseTime = metrics.total_response_time / metrics.response_time_count
    const slaTarget = 1000

    if (avgResponseTime <= slaTarget) {
      return 100
    }

    const slowdownFactor = avgResponseTime / slaTarget
    return Math.max(0, 100 - (slowdownFactor - 1) * 50)
  }

  private calculateVolumeConsistency(metrics: any): number {
    const volumes = metrics.payment_history_7d
    const sum = volumes.reduce((a: number, b: number) => a + b, 0)

    if (sum === 0) return 50 // Neutral for new agents

    const mean = sum / 7
    const variance = volumes.reduce(
      (a: number, b: number) => a + Math.pow(b - mean, 2),
      0
    ) / 7
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / mean

    return Math.max(0, 100 - cv * 100)
  }
}
```

### Automatic Reputation Recording

```typescript
// packages/sdk-typescript/src/x402/middleware.ts

// Enhanced middleware with automatic reputation tracking
export function createX402Middleware(options: X402MiddlewareOptions) {
  return async (
    req: X402RequestWithPayment,
    res: Response,
    next: NextFunction
  ) => {
    const startTime = Date.now()
    const paymentSignature = req.headers['x-payment-signature'] as string

    // ... existing payment verification ...

    if (verification.valid) {
      // Track response time
      res.on('finish', async () => {
        const responseTime = Date.now() - startTime
        const success = res.statusCode >= 200 && res.statusCode < 300

        // Record payment for reputation
        try {
          await options.reputationClient?.recordPayment({
            agentAddress: options.agentAddress,
            paymentSignature,
            responseTimeMs: responseTime,
            success
          })
        } catch (error) {
          console.error('Failed to record reputation:', error)
          // Don't fail the request if reputation recording fails
        }
      })

      next()
    }
  }
}
```

---

## Reputation Display & UI

### Reputation Badge System

```typescript
// Reputation tier badges
export enum ReputationTier {
  LEGENDARY = 'LEGENDARY', // 9500-10000
  ELITE = 'ELITE',         // 9000-9499
  EXCELLENT = 'EXCELLENT', // 8500-8999
  TRUSTED = 'TRUSTED',     // 8000-8499
  GOOD = 'GOOD',           // 7000-7999
  FAIR = 'FAIR',           // 6000-6999
  AVERAGE = 'AVERAGE',     // 5000-5999
  POOR = 'POOR',           // 3000-4999
  UNTRUSTED = 'UNTRUSTED'  // 0-2999
}

export function getReputationTier(score: number): ReputationTier {
  if (score >= 9500) return ReputationTier.LEGENDARY
  if (score >= 9000) return ReputationTier.ELITE
  if (score >= 8500) return ReputationTier.EXCELLENT
  if (score >= 8000) return ReputationTier.TRUSTED
  if (score >= 7000) return ReputationTier.GOOD
  if (score >= 6000) return ReputationTier.FAIR
  if (score >= 5000) return ReputationTier.AVERAGE
  if (score >= 3000) return ReputationTier.POOR
  return ReputationTier.UNTRUSTED
}

export function getReputationBadge(tier: ReputationTier): string {
  const badges = {
    [ReputationTier.LEGENDARY]: '👑',
    [ReputationTier.ELITE]: '💎',
    [ReputationTier.EXCELLENT]: '⭐',
    [ReputationTier.TRUSTED]: '✅',
    [ReputationTier.GOOD]: '👍',
    [ReputationTier.FAIR]: '👌',
    [ReputationTier.AVERAGE]: '➖',
    [ReputationTier.POOR]: '⚠️',
    [ReputationTier.UNTRUSTED]: '❌'
  }
  return badges[tier]
}
```

### React Component Example

```tsx
// components/AgentReputationCard.tsx

interface AgentReputationCardProps {
  agentAddress: string
}

export function AgentReputationCard({ agentAddress }: AgentReputationCardProps) {
  const { data: reputation, isLoading } = useAgentReputation(agentAddress)

  if (isLoading) return <Skeleton />

  const tier = getReputationTier(reputation.overallScore)
  const badge = getReputationBadge(tier)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {badge} Reputation: {tier}
        </CardTitle>
        <CardDescription>
          Score: {reputation.overallScore} / 10,000
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Overall score visualization */}
        <Progress value={reputation.overallScore / 100} />

        {/* Component breakdown */}
        <div className="mt-4 space-y-2">
          <ReputationMetric
            label="Payment Success"
            value={reputation.components.paymentSuccessRate}
            weight={40}
          />
          <ReputationMetric
            label="Service Quality"
            value={reputation.components.serviceQuality}
            weight={30}
          />
          <ReputationMetric
            label="Response Time"
            value={reputation.components.responseTimeScore}
            weight={20}
          />
          <ReputationMetric
            label="Volume Consistency"
            value={reputation.components.volumeConsistency}
            weight={10}
          />
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat
            label="Total Payments"
            value={reputation.metrics.totalPayments}
          />
          <Stat
            label="Success Rate"
            value={`${(reputation.metrics.successfulPayments / reputation.metrics.totalPayments * 100).toFixed(1)}%`}
          />
          <Stat
            label="Avg Response"
            value={`${reputation.metrics.averageResponseTime}ms`}
          />
          <Stat
            label="Avg Rating"
            value={`${reputation.metrics.averageRating.toFixed(1)} ⭐`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Anti-Gaming Mechanisms

### 1. Sybil Resistance

```typescript
// Require minimum stake to register agent
const MIN_REPUTATION_STAKE = 100_000_000n // 100 USDC

// Slash stake for malicious behavior
async function slashReputationStake(agentAddress: Address, reason: string) {
  // Reduce stake by 10% for each violation
  const slashAmount = (agent.reputation_stake * 10n) / 100n

  // Transfer slashed amount to treasury
  await transferStake(agent.reputation_stake_account, treasury, slashAmount)

  // Record violation
  await recordViolation(agentAddress, reason, slashAmount)
}
```

### 2. Review Authenticity

```typescript
// Only allow ratings from verified payments
async function submitRating(
  agentAddress: Address,
  paymentSignature: Signature,
  rating: number
) {
  // Verify payment exists and hasn't been used for rating already
  const payment = await verifyPayment(paymentSignature)

  require(payment.valid, 'Invalid payment')
  require(!payment.rating_submitted, 'Rating already submitted')

  // Mark payment as rated
  await markPaymentRated(paymentSignature)

  // Submit rating
  await recordRating(agentAddress, rating, paymentSignature)
}
```

### 3. Time-Weighted Reputation

```typescript
// Older transactions have less weight
function calculateTimeWeight(timestamp: number): number {
  const age = Date.now() - timestamp
  const daysOld = age / (1000 * 60 * 60 * 24)

  // Exponential decay: 50% weight after 30 days
  const halfLife = 30
  const weight = Math.pow(0.5, daysOld / halfLife)

  return weight
}
```

### 4. Volume Normalization

```typescript
// Prevent reputation farming with high-volume low-value transactions
function normalizeByValue(payments: Payment[]): number {
  // Weight by payment amount (higher value = more weight)
  const totalValue = payments.reduce((sum, p) => sum + p.amount, 0)
  const avgValue = totalValue / payments.length

  // Normalize: small payments contribute less to reputation
  const normalized = payments.map(p => ({
    ...p,
    weight: Math.min(1, p.amount / avgValue)
  }))

  return calculateWeightedReputation(normalized)
}
```

---

## Testing

### Unit Tests

```typescript
test('calculates payment success rate correctly', () => {
  const agent = {
    x402_total_calls: 100
  }
  const metrics = {
    failed_payments: 5
  }

  const rate = calculatePaymentSuccessRate(agent, metrics)
  expect(rate).toBe(95)
})

test('applies dispute penalty correctly', () => {
  const agent = {
    x402_total_calls: 100
  }
  const metrics = {
    total_disputes: 10,
    disputes_resolved: 5,
    total_rating: 400,
    total_ratings_count: 100
  }

  const quality = calculateServiceQuality(agent, metrics)
  expect(quality).toBeLessThan(100)
})
```

### Integration Tests

```typescript
test('updates reputation after x402 payment', async () => {
  // Make x402 payment
  const receipt = await x402Client.pay({
    recipient: agentAddress,
    amount: 1000n,
    token: USDC_ADDRESS,
    description: 'Test payment'
  })

  // Get reputation before
  const before = await reputationClient.getReputationDetails(agentAddress)

  // Record payment
  await reputationClient.recordPayment({
    agentAddress,
    paymentSignature: receipt.signature,
    responseTimeMs: 500,
    success: true
  })

  // Get reputation after
  const after = await reputationClient.getReputationDetails(agentAddress)

  expect(after.overallScore).toBeGreaterThan(before.overallScore)
  expect(after.metrics.totalPayments).toBe(before.metrics.totalPayments + 1)
})
```

---

## References

- **GhostSpeak Protocol**: https://docs.ghostspeak.ai
- **x402 Specification**: https://www.x402.org
- **Reputation Systems**: https://en.wikipedia.org/wiki/Reputation_system
- **Sybil Resistance**: https://eips.ethereum.org/EIPS/eip-1271

---

## Appendix: Complete Reputation Flow Example

```typescript
// Complete example: Agent provides service, gets paid, reputation updates

// 1. Client discovers agent
const agents = await discoveryClient.searchAgents({
  capability: 'chat',
  x402_enabled: true,
  min_reputation: 8000
})

const agent = agents[0]
console.log(`Using agent: ${agent.name} (reputation: ${agent.reputation_score})`)

// 2. Client requests service (gets HTTP 402)
const response1 = await fetch(agent.x402_service_endpoint)
expect(response1.status).toBe(402)

const paymentDetails = await response1.json()

// 3. Client makes x402 payment
const receipt = await x402Client.pay({
  recipient: paymentDetails.paymentDetails.address,
  amount: BigInt(paymentDetails.paymentDetails.amount),
  token: paymentDetails.paymentDetails.token,
  description: 'AI chat request'
})

console.log(`Payment sent: ${receipt.signature}`)

// 4. Client retries with payment signature
const startTime = Date.now()
const response2 = await fetch(agent.x402_service_endpoint, {
  headers: {
    'X-Payment-Signature': receipt.signature
  }
})

expect(response2.status).toBe(200)
const result = await response2.json()
const responseTime = Date.now() - startTime

console.log(`Service completed in ${responseTime}ms`)

// 5. Automatic reputation recording (via middleware)
// Happens automatically on the server side

// 6. Client submits rating
await reputationClient.submitRating({
  agentAddress: agent.address,
  paymentSignature: receipt.signature,
  rating: 5,
  comment: 'Excellent service!'
})

// 7. Check updated reputation
const updatedReputation = await reputationClient.getReputationDetails(agent.address)

console.log(`Updated reputation: ${updatedReputation.overallScore}`)
console.log(`Components:`)
console.log(`- Payment Success: ${updatedReputation.components.paymentSuccessRate}%`)
console.log(`- Service Quality: ${updatedReputation.components.serviceQuality}%`)
console.log(`- Response Time: ${updatedReputation.components.responseTimeScore}%`)
console.log(`- Volume Consistency: ${updatedReputation.components.volumeConsistency}%`)
```
