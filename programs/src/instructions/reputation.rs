/*!
 * Reputation Instructions - x402 Payment Integration
 *
 * Instructions for recording x402 payments and updating agent reputation
 * based on payment performance, response time, and service quality.
 */

use crate::state::ReputationMetrics;
use crate::{GhostSpeakError, *};

/// Context for initializing reputation metrics
#[derive(Accounts)]
pub struct InitializeReputationMetrics<'info> {
    /// Reputation metrics account
    #[account(
        init,
        payer = authority,
        space = ReputationMetrics::LEN,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Agent account
    #[account(
        constraint = agent.owner == Some(authority.key()) @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    /// Authority (agent owner)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Context for recording an x402 payment (legacy reputation module)
#[derive(Accounts)]
pub struct RecordX402PaymentReputation<'info> {
    /// Reputation metrics account
    #[account(
        mut,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump = reputation_metrics.bump,
        constraint = reputation_metrics.agent == agent.key() @ GhostSpeakError::InvalidAgent
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Agent account
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// Authority (can be the payment verifier or agent owner)
    pub authority: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Context for submitting a rating for an x402 service (legacy reputation module)
#[derive(Accounts)]
pub struct SubmitX402RatingReputation<'info> {
    /// Reputation metrics account
    #[account(
        mut,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump = reputation_metrics.bump
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Agent account
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// Client submitting the rating
    pub client: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Context for updating reputation tags
#[derive(Accounts)]
pub struct UpdateReputationTags<'info> {
    /// Reputation metrics account
    #[account(
        mut,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump = reputation_metrics.bump,
        constraint = reputation_metrics.agent == agent.key() @ GhostSpeakError::InvalidAgent
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Agent account
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// Authority (can be the agent owner or authorized updater)
    pub authority: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Initialize reputation metrics for an agent
pub fn initialize_reputation_metrics(ctx: Context<InitializeReputationMetrics>) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let clock = &ctx.accounts.clock;

    reputation_metrics.agent = ctx.accounts.agent.key();
    reputation_metrics.successful_payments = 0;
    reputation_metrics.failed_payments = 0;
    reputation_metrics.total_response_time = 0;
    reputation_metrics.response_time_count = 0;
    reputation_metrics.total_disputes = 0;
    reputation_metrics.disputes_resolved = 0;
    reputation_metrics.total_rating = 0;
    reputation_metrics.total_ratings_count = 0;
    reputation_metrics.payment_history_7d = [0; 7];
    reputation_metrics.created_at = clock.unix_timestamp;
    reputation_metrics.updated_at = clock.unix_timestamp;

    // Initialize tag fields
    reputation_metrics.skill_tags = Vec::new();
    reputation_metrics.behavior_tags = Vec::new();
    reputation_metrics.compliance_tags = Vec::new();
    reputation_metrics.tag_scores = Vec::new();
    reputation_metrics.tag_updated_at = clock.unix_timestamp;

    // Initialize multi-source reputation fields
    reputation_metrics.source_scores = Vec::new();
    reputation_metrics.primary_source = "payai".to_string();
    reputation_metrics.last_aggregation = clock.unix_timestamp;
    reputation_metrics.conflict_flags = Vec::new();

    reputation_metrics.bump = ctx.bumps.reputation_metrics;

    emit!(ReputationMetricsInitializedEvent {
        agent: ctx.accounts.agent.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Record an x402 payment and update reputation metrics
pub fn record_x402_payment(
    ctx: Context<RecordX402PaymentReputation>,
    payment_signature: String,
    amount: u64,
    response_time_ms: u64,
    success: bool,
) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Validate payment signature length (base58 encoded should be 64-88 chars)
    require!(
        payment_signature.len() >= 64 && payment_signature.len() <= 88,
        GhostSpeakError::InvalidSignature
    );

    // Validate response time (max 1 hour = 3,600,000 ms)
    require!(
        response_time_ms <= 3_600_000,
        GhostSpeakError::InvalidResponseTime
    );

    // Update payment counters
    if success {
        reputation_metrics.successful_payments =
            reputation_metrics.successful_payments.saturating_add(1);

        // Update agent's x402 fields
        agent.x402_total_calls = agent.x402_total_calls.saturating_add(1);
        agent.x402_total_payments = agent.x402_total_payments.saturating_add(amount);

        // Update rolling payment history
        reputation_metrics.update_payment_history(amount, clock.unix_timestamp);
    } else {
        reputation_metrics.failed_payments = reputation_metrics.failed_payments.saturating_add(1);
    }

    // Update response time metrics
    reputation_metrics.total_response_time = reputation_metrics
        .total_response_time
        .saturating_add(response_time_ms);
    reputation_metrics.response_time_count =
        reputation_metrics.response_time_count.saturating_add(1);

    // Calculate and update reputation score
    let reputation_score = calculate_x402_reputation_score(reputation_metrics)?;
    agent.reputation_score = (reputation_score / 100) as u32; // Convert basis points to 0-100 scale

    reputation_metrics.updated_at = clock.unix_timestamp;

    emit!(ReputationPaymentRecordedEvent {
        agent: agent.key(),
        payment_signature,
        amount,
        response_time_ms,
        success,
        new_reputation_score: reputation_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Submit a rating for an x402 service call
pub fn submit_x402_rating(
    ctx: Context<SubmitX402RatingReputation>,
    rating: u8,
    _payment_signature: String,
) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Validate rating (1-5 scale)
    require!(rating >= 1 && rating <= 5, GhostSpeakError::InvalidRating);

    // Update rating metrics
    reputation_metrics.total_rating = reputation_metrics
        .total_rating
        .saturating_add(rating as u32);
    reputation_metrics.total_ratings_count =
        reputation_metrics.total_ratings_count.saturating_add(1);

    // Recalculate reputation score
    let reputation_score = calculate_x402_reputation_score(reputation_metrics)?;
    agent.reputation_score = (reputation_score / 100) as u32;

    reputation_metrics.updated_at = clock.unix_timestamp;

    emit!(ReputationRatingSubmittedEvent {
        agent: agent.key(),
        client: ctx.accounts.client.key(),
        rating,
        new_reputation_score: reputation_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Calculate x402-based reputation score (0-10000 basis points)
///
/// Formula: Reputation = (
///   Success Rate × 40% +
///   Service Quality × 30% +
///   Response Time × 20% +
///   Volume Consistency × 10%
/// ) × 10,000
fn calculate_x402_reputation_score(metrics: &ReputationMetrics) -> Result<u64> {
    // 1. Payment Success Rate (40% weight) - basis points
    let success_rate = metrics.success_rate();
    let success_score = (success_rate * 40) / 100;

    // 2. Service Quality Score (30% weight)
    let avg_rating = metrics.avg_rating(); // 0-100
    let dispute_rate = if metrics.total_disputes > 0 {
        ((metrics.total_disputes as u64) * 100) / (metrics.successful_payments.max(1))
    } else {
        0
    };
    let resolution_rate = metrics.dispute_resolution_rate(); // basis points

    // Quality = (avgRating × 100) - (disputeRate × 50) + (resolutionRate × 10) / 100
    let quality_base = avg_rating.saturating_mul(100);
    let dispute_penalty = dispute_rate.saturating_mul(50);
    let resolution_bonus = resolution_rate.saturating_div(10); // basis points to percentage

    let quality_score = quality_base
        .saturating_sub(dispute_penalty)
        .saturating_add(resolution_bonus)
        .min(10000); // Cap at 100%
    let weighted_quality = (quality_score * 30) / 100;

    // 3. Response Time Score (20% weight)
    let avg_response_time = metrics.avg_response_time(); // milliseconds
    let response_score = if avg_response_time == 0 {
        0
    } else if avg_response_time <= 1000 {
        10000 // 100% - excellent to good response time
    } else if avg_response_time <= 2000 {
        7500 // 75% - acceptable
    } else if avg_response_time <= 5000 {
        5000 // 50% - slow
    } else if avg_response_time <= 10000 {
        2500 // 25% - very slow
    } else {
        0 // 0% - unacceptable
    };
    let weighted_response = (response_score * 20) / 100;

    // 4. Volume Consistency Score (10% weight) - basis points
    let consistency_score = metrics.volume_consistency_score();
    let weighted_consistency = (consistency_score * 10) / 100;

    // Calculate final score
    let total_score = success_score
        .saturating_add(weighted_quality)
        .saturating_add(weighted_response)
        .saturating_add(weighted_consistency);

    Ok(total_score.min(10000)) // Cap at 100%
}

/// Update reputation tags
///
/// Adds or updates reputation tags with confidence scores.
/// This is typically called after calculating tags off-chain using the
/// ReputationTagEngine.
pub fn update_reputation_tags(
    ctx: Context<UpdateReputationTags>,
    skill_tags: Vec<String>,
    behavior_tags: Vec<String>,
    compliance_tags: Vec<String>,
    tag_scores: Vec<crate::state::TagScore>,
) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let clock = &ctx.accounts.clock;

    // Remove stale tags first
    reputation_metrics.remove_stale_tags(clock.unix_timestamp);

    // Update skill tags
    for tag in skill_tags {
        reputation_metrics.add_skill_tag(tag)?;
    }

    // Update behavior tags
    for tag in behavior_tags {
        reputation_metrics.add_behavior_tag(tag)?;
    }

    // Update compliance tags
    for tag in compliance_tags {
        reputation_metrics.add_compliance_tag(tag)?;
    }

    // Update tag confidence scores
    for tag_score in tag_scores {
        reputation_metrics.update_tag_confidence(
            tag_score.tag_name,
            tag_score.confidence,
            tag_score.evidence_count,
            clock.unix_timestamp,
        )?;
    }

    reputation_metrics.updated_at = clock.unix_timestamp;

    emit!(ReputationTagsUpdatedEvent {
        agent: ctx.accounts.agent.key(),
        total_tags: reputation_metrics.total_tag_count() as u32,
        skill_tags_count: reputation_metrics.skill_tags.len() as u32,
        behavior_tags_count: reputation_metrics.behavior_tags.len() as u32,
        compliance_tags_count: reputation_metrics.compliance_tags.len() as u32,
        tag_scores_count: reputation_metrics.tag_scores.len() as u32,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Apply tag decay to remove stale tags
///
/// This should be called periodically to clean up old tags that are
/// no longer relevant (older than 90 days).
pub fn apply_tag_decay(ctx: Context<UpdateReputationTags>) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let clock = &ctx.accounts.clock;

    let tags_before = reputation_metrics.total_tag_count();

    reputation_metrics.remove_stale_tags(clock.unix_timestamp);

    let tags_after = reputation_metrics.total_tag_count();
    let tags_removed = tags_before.saturating_sub(tags_after);

    emit!(TagDecayAppliedEvent {
        agent: ctx.accounts.agent.key(),
        tags_removed: tags_removed as u32,
        remaining_tags: tags_after as u32,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Context for updating source reputation
#[derive(Accounts)]
pub struct UpdateSourceReputation<'info> {
    /// Reputation metrics account
    #[account(
        mut,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump = reputation_metrics.bump,
        constraint = reputation_metrics.agent == agent.key() @ GhostSpeakError::InvalidAgent
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Agent account
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// Authority (can be oracle, agent owner, or authorized updater)
    pub authority: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Update reputation from a specific source
pub fn update_source_reputation(
    ctx: Context<UpdateSourceReputation>,
    source_name: String,
    score: u16,
    weight: u16,
    data_points: u32,
    reliability: u16,
) -> Result<()> {
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Update source score
    reputation_metrics.update_source_score(
        source_name.clone(),
        score,
        weight,
        data_points,
        reliability,
        clock.unix_timestamp,
    )?;

    // Detect conflicts
    let has_conflict = reputation_metrics.detect_conflicts(clock.unix_timestamp);

    // Calculate new weighted aggregate score
    let weighted_score = reputation_metrics.calculate_weighted_score();

    // Update agent's overall reputation score (convert from basis points to 0-100)
    agent.reputation_score = (weighted_score / 100) as u32;

    // Update last aggregation timestamp
    reputation_metrics.last_aggregation = clock.unix_timestamp;
    reputation_metrics.updated_at = clock.unix_timestamp;

    // Prune old conflict flags
    reputation_metrics.prune_conflict_flags();

    emit!(SourceReputationUpdatedEvent {
        agent: agent.key(),
        source_name,
        source_score: score,
        weighted_aggregate_score: weighted_score,
        has_conflict,
        total_sources: reputation_metrics.source_scores.len() as u32,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Events
#[event]
pub struct ReputationMetricsInitializedEvent {
    pub agent: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ReputationPaymentRecordedEvent {
    pub agent: Pubkey,
    pub payment_signature: String,
    pub amount: u64,
    pub response_time_ms: u64,
    pub success: bool,
    pub new_reputation_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ReputationRatingSubmittedEvent {
    pub agent: Pubkey,
    pub client: Pubkey,
    pub rating: u8,
    pub new_reputation_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ReputationTagsUpdatedEvent {
    pub agent: Pubkey,
    pub total_tags: u32,
    pub skill_tags_count: u32,
    pub behavior_tags_count: u32,
    pub compliance_tags_count: u32,
    pub tag_scores_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct TagDecayAppliedEvent {
    pub agent: Pubkey,
    pub tags_removed: u32,
    pub remaining_tags: u32,
    pub timestamp: i64,
}

#[event]
pub struct SourceReputationUpdatedEvent {
    pub agent: Pubkey,
    pub source_name: String,
    pub source_score: u16,
    pub weighted_aggregate_score: u64,
    pub has_conflict: bool,
    pub total_sources: u32,
    pub timestamp: i64,
}
