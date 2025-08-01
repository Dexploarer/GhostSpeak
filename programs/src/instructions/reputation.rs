/*!
 * Reputation Instructions
 *
 * Advanced reputation calculation system with multi-factor scoring,
 * time-weighted decay, and verifiable computation.
 */

use crate::{GhostSpeakError, *};
use anchor_lang::prelude::*;

/// Maximum categories an agent can have reputation in
pub const MAX_REPUTATION_CATEGORIES: usize = 10;

/// Reputation decay rate per day (basis points)
pub const REPUTATION_DECAY_RATE_BPS: u64 = 10; // 0.1% per day

/// Maximum reputation score (basis points)
pub const MAX_REPUTATION_SCORE: u64 = crate::BASIS_POINTS_MAX as u64; // 100.00%

/// Minimum reputation score for slashing
pub const MIN_REPUTATION_FOR_SLASH: u64 = crate::BASIS_POINTS_10_PERCENT as u64; // 10.00%

/// Reputation tier thresholds (basis points)
pub const BRONZE_TIER_THRESHOLD: u64 = 2000; // 20%
pub const SILVER_TIER_THRESHOLD: u64 = crate::BASIS_POINTS_50_PERCENT as u64; // 50%
pub const GOLD_TIER_THRESHOLD: u64 = 7500; // 75%
pub const PLATINUM_TIER_THRESHOLD: u64 = 9000; // 90%

/// Reputation calculation factors
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ReputationFactors {
    /// Completion rate weight (0-100)
    pub completion_weight: u8,
    /// Quality score weight (0-100)
    pub quality_weight: u8,
    /// Timeliness weight (0-100)
    pub timeliness_weight: u8,
    /// Client satisfaction weight (0-100)
    pub satisfaction_weight: u8,
    /// Dispute resolution weight (0-100)
    pub dispute_weight: u8,
}

impl ReputationFactors {
    pub fn validate(&self) -> Result<()> {
        let total_weight = self.completion_weight as u16
            + self.quality_weight as u16
            + self.timeliness_weight as u16
            + self.satisfaction_weight as u16
            + self.dispute_weight as u16;
        
        require!(
            total_weight == 100,
            GhostSpeakError::InvalidReputationWeights
        );
        Ok(())
    }
}

/// Category-specific reputation data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct CategoryReputation {
    /// Category identifier (e.g., "defi", "nft", "gaming")
    pub category: String,
    /// Current reputation score in this category (basis points)
    pub score: u64,
    /// Total completed jobs in this category
    pub completed_jobs: u32,
    /// Average completion time in seconds
    pub avg_completion_time: u64,
    /// Quality ratings sum
    pub quality_sum: u64,
    /// Number of quality ratings
    pub quality_count: u32,
    /// Last activity timestamp
    pub last_activity: i64,
    /// Total earnings in this category
    pub total_earnings: u64,
}

/// Reputation tier enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum ReputationTier {
    None,
    Bronze,
    Silver,
    Gold,
    Platinum,
}

impl ReputationTier {
    pub fn from_score(score: u64) -> Self {
        if score >= PLATINUM_TIER_THRESHOLD {
            ReputationTier::Platinum
        } else if score >= GOLD_TIER_THRESHOLD {
            ReputationTier::Gold
        } else if score >= SILVER_TIER_THRESHOLD {
            ReputationTier::Silver
        } else if score >= BRONZE_TIER_THRESHOLD {
            ReputationTier::Bronze
        } else {
            ReputationTier::None
        }
    }
}

/// Main reputation data account
#[account]
pub struct ReputationData {
    /// Agent public key
    pub agent: Pubkey,
    /// Overall reputation score (basis points)
    pub overall_score: u64,
    /// Current reputation tier
    pub tier: ReputationTier,
    /// Category-specific reputations
    pub category_reputations: Vec<CategoryReputation>,
    /// Total staked reputation tokens
    pub staked_amount: u64,
    /// Reputation calculation factors
    pub factors: ReputationFactors,
    /// Total completed jobs across all categories
    pub total_jobs_completed: u32,
    /// Total failed/cancelled jobs
    pub total_jobs_failed: u32,
    /// Average response time in seconds
    pub avg_response_time: u64,
    /// Number of disputes filed against agent
    pub disputes_against: u32,
    /// Number of disputes resolved favorably
    pub disputes_resolved: u32,
    /// Last reputation update timestamp
    pub last_updated: i64,
    /// Creation timestamp
    pub created_at: i64,
    /// Historical performance data (for decay calculation)
    pub performance_history: Vec<PerformanceSnapshot>,
    /// Reputation badges earned
    pub badges: Vec<ReputationBadge>,
    /// Cross-category reputation transfer enabled
    pub cross_category_enabled: bool,
    /// Bump for PDA
    pub bump: u8,
}

impl ReputationData {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 + // overall_score
        1 + // tier
        4 + (MAX_REPUTATION_CATEGORIES * 200) + // category_reputations
        8 + // staked_amount
        5 + // factors (5 u8 fields)
        4 + // total_jobs_completed
        4 + // total_jobs_failed
        8 + // avg_response_time
        4 + // disputes_against
        4 + // disputes_resolved
        8 + // last_updated
        8 + // created_at
        4 + (365 * 32) + // performance_history (1 year of daily snapshots)
        4 + (20 * 64) + // badges
        1 + // cross_category_enabled
        1; // bump

    /// Calculate time-weighted reputation decay
    pub fn apply_time_decay(&mut self, current_time: i64) -> Result<()> {
        let days_inactive = (current_time - self.last_updated) / 86400; // seconds to days
        
        if days_inactive > 0 {
            let decay_factor = REPUTATION_DECAY_RATE_BPS * days_inactive as u64;
            let decay_multiplier = (crate::BASIS_POINTS_MAX as u64).saturating_sub(decay_factor);
            
            // Apply decay to overall score
            self.overall_score = (self.overall_score * decay_multiplier) / (crate::BASIS_POINTS_MAX as u64);
            
            // Apply decay to category scores
            for category in &mut self.category_reputations {
                let category_days_inactive = (current_time - category.last_activity) / 86400;
                let category_decay = REPUTATION_DECAY_RATE_BPS * category_days_inactive as u64;
                let category_multiplier = (crate::BASIS_POINTS_MAX as u64).saturating_sub(category_decay);
                category.score = (category.score * category_multiplier) / (crate::BASIS_POINTS_MAX as u64);
            }
        }
        
        Ok(())
    }

    /// Calculate weighted reputation score
    pub fn calculate_weighted_score(&self, job_performance: &JobPerformance) -> Result<u64> {
        self.factors.validate()?;
        
        let completion_score = if job_performance.completed {
            MAX_REPUTATION_SCORE
        } else {
            0
        };
        
        let quality_score = (job_performance.quality_rating * MAX_REPUTATION_SCORE) / 100;
        let timeliness_score = calculate_timeliness_score(
            job_performance.expected_duration,
            job_performance.actual_duration
        );
        let satisfaction_score = (job_performance.client_satisfaction * MAX_REPUTATION_SCORE) / 100;
        let dispute_score = if job_performance.had_dispute {
            if job_performance.dispute_resolved_favorably {
                MAX_REPUTATION_SCORE / 2 // 50% score if resolved favorably
            } else {
                0
            }
        } else {
            MAX_REPUTATION_SCORE
        };
        
        let weighted_score = (
            completion_score * self.factors.completion_weight as u64 +
            quality_score * self.factors.quality_weight as u64 +
            timeliness_score * self.factors.timeliness_weight as u64 +
            satisfaction_score * self.factors.satisfaction_weight as u64 +
            dispute_score * self.factors.dispute_weight as u64
        ) / 100;
        
        Ok(weighted_score.min(MAX_REPUTATION_SCORE))
    }

    /// Update reputation tier based on score
    pub fn update_tier(&mut self) {
        self.tier = ReputationTier::from_score(self.overall_score);
    }

    /// Add performance snapshot for historical tracking
    pub fn add_performance_snapshot(&mut self, snapshot: PerformanceSnapshot) -> Result<()> {
        // Keep only last 365 days of snapshots
        if self.performance_history.len() >= 365 {
            self.performance_history.remove(0);
        }
        self.performance_history.push(snapshot);
        Ok(())
    }
}

/// Performance snapshot for historical tracking
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PerformanceSnapshot {
    /// Timestamp of snapshot
    pub timestamp: i64,
    /// Reputation score at this time
    pub score: u64,
    /// Jobs completed in this period
    pub jobs_completed: u32,
    /// Average quality rating
    pub avg_quality: u64,
}

/// Job performance data for reputation calculation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobPerformance {
    /// Whether job was completed successfully
    pub completed: bool,
    /// Quality rating (0-100)
    pub quality_rating: u64,
    /// Expected duration in seconds
    pub expected_duration: u64,
    /// Actual duration in seconds
    pub actual_duration: u64,
    /// Client satisfaction (0-100)
    pub client_satisfaction: u64,
    /// Whether there was a dispute
    pub had_dispute: bool,
    /// Whether dispute was resolved favorably for agent
    pub dispute_resolved_favorably: bool,
    /// Job category
    pub category: String,
    /// Payment amount
    pub payment_amount: u64,
}

/// Reputation badge structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ReputationBadge {
    /// Badge identifier
    pub badge_type: BadgeType,
    /// Timestamp when earned
    pub earned_at: i64,
    /// Associated achievement value
    pub achievement_value: u64,
}

/// Badge types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum BadgeType {
    FirstJob,
    TenJobs,
    HundredJobs,
    ThousandJobs,
    PerfectRating,
    QuickResponder,
    HighEarner,
    DisputeResolver,
    CategoryExpert,
    CrossCategoryMaster,
}

/// Context for initializing reputation data
#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct InitializeReputation<'info> {
    /// Reputation data account
    #[account(
        init,
        payer = authority,
        space = ReputationData::LEN,
        seeds = [
            b"reputation",
            agent.key().as_ref()
        ],
        bump
    )]
    pub reputation_data: Account<'info, ReputationData>,

    /// Agent account
    #[account(
        mut,
        seeds = [
            b"agent",
            authority.key().as_ref(),
            agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::InvalidAgentOwner
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

/// Context for updating reputation after job completion
#[derive(Accounts)]
pub struct UpdateJobReputation<'info> {
    /// Reputation data account
    #[account(
        mut,
        seeds = [
            b"reputation",
            agent.key().as_ref()
        ],
        bump = reputation_data.bump
    )]
    pub reputation_data: Account<'info, ReputationData>,

    /// Agent account
    #[account(
        mut,
        constraint = agent.key() == reputation_data.agent @ GhostSpeakError::InvalidAgent
    )]
    pub agent: Account<'info, Agent>,

    /// Work order or escrow account (validates job completion)
    /// This would be validated based on the specific job type
    pub job_account: UncheckedAccount<'info>,

    /// Authority (platform admin or job verifier)
    pub authority: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Context for staking reputation
#[derive(Accounts)]
pub struct StakeReputation<'info> {
    /// Reputation data account
    #[account(
        mut,
        seeds = [
            b"reputation",
            agent.key().as_ref()
        ],
        bump = reputation_data.bump,
        constraint = reputation_data.agent == agent.key() @ GhostSpeakError::InvalidAgent
    )]
    pub reputation_data: Account<'info, ReputationData>,

    /// Agent account
    #[account(
        constraint = agent.owner == authority.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    /// Token account for staking (could be reputation tokens)
    #[account(mut)]
    pub stake_token_account: UncheckedAccount<'info>,

    /// Authority (agent owner)
    pub authority: Signer<'info>,

    /// Token program
    pub token_program: UncheckedAccount<'info>,
}

/// Context for slashing reputation
#[derive(Accounts)]
pub struct SlashReputation<'info> {
    /// Reputation data account
    #[account(
        mut,
        seeds = [
            b"reputation",
            agent.key().as_ref()
        ],
        bump = reputation_data.bump
    )]
    pub reputation_data: Account<'info, ReputationData>,

    /// Agent account
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// Dispute or violation account that justifies slashing
    pub violation_account: UncheckedAccount<'info>,

    /// Authority (platform admin or arbitrator)
    pub authority: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Initialize reputation data for an agent
pub fn initialize_reputation(
    ctx: Context<InitializeReputation>,
    _agent_id: String,
    factors: ReputationFactors,
) -> Result<()> {
    factors.validate()?;
    
    let reputation_data = &mut ctx.accounts.reputation_data;
    let clock = &ctx.accounts.clock;
    
    reputation_data.agent = ctx.accounts.agent.key();
    reputation_data.overall_score = 5000; // Start at 50%
    reputation_data.tier = ReputationTier::None;
    reputation_data.category_reputations = Vec::with_capacity(MAX_REPUTATION_CATEGORIES);
    reputation_data.staked_amount = 0;
    reputation_data.factors = factors;
    reputation_data.total_jobs_completed = 0;
    reputation_data.total_jobs_failed = 0;
    reputation_data.avg_response_time = 0;
    reputation_data.disputes_against = 0;
    reputation_data.disputes_resolved = 0;
    reputation_data.last_updated = clock.unix_timestamp;
    reputation_data.created_at = clock.unix_timestamp;
    reputation_data.performance_history = Vec::with_capacity(365);
    reputation_data.badges = Vec::with_capacity(20);
    reputation_data.cross_category_enabled = false;
    reputation_data.bump = ctx.bumps.reputation_data;
    
    emit!(ReputationInitializedEvent {
        agent: ctx.accounts.agent.key(),
        initial_score: reputation_data.overall_score,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Update reputation after job completion
pub fn update_job_reputation(
    ctx: Context<UpdateJobReputation>,
    job_performance: JobPerformance,
) -> Result<()> {
    let reputation_data = &mut ctx.accounts.reputation_data;
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;
    
    // Apply time decay first
    reputation_data.apply_time_decay(clock.unix_timestamp)?;
    
    // Calculate new score based on job performance
    let job_score = reputation_data.calculate_weighted_score(&job_performance)?;
    
    // Find or create category reputation
    let category_index = reputation_data.category_reputations
        .iter()
        .position(|c| c.category == job_performance.category);
    
    if let Some(index) = category_index {
        let category = &mut reputation_data.category_reputations[index];
        
        // Update category-specific metrics
        category.completed_jobs += 1;
        category.quality_sum += job_performance.quality_rating;
        category.quality_count += 1;
        category.total_earnings += job_performance.payment_amount;
        category.last_activity = clock.unix_timestamp;
        
        // Update category score (weighted average with existing)
        category.score = (category.score * 7 + job_score * 3) / 10; // 70% existing, 30% new
        
        // Update average completion time
        category.avg_completion_time = (
            category.avg_completion_time * (category.completed_jobs - 1) as u64 +
            job_performance.actual_duration
        ) / category.completed_jobs as u64;
    } else {
        // Create new category reputation
        require!(
            reputation_data.category_reputations.len() < MAX_REPUTATION_CATEGORIES,
            GhostSpeakError::TooManyCategories
        );
        
        reputation_data.category_reputations.push(CategoryReputation {
            category: job_performance.category.clone(),
            score: job_score,
            completed_jobs: 1,
            avg_completion_time: job_performance.actual_duration,
            quality_sum: job_performance.quality_rating,
            quality_count: 1,
            last_activity: clock.unix_timestamp,
            total_earnings: job_performance.payment_amount,
        });
    }
    
    // Update overall metrics
    if job_performance.completed {
        reputation_data.total_jobs_completed += 1;
        agent.total_jobs_completed += 1;
    } else {
        reputation_data.total_jobs_failed += 1;
    }
    
    if job_performance.had_dispute {
        reputation_data.disputes_against += 1;
        if job_performance.dispute_resolved_favorably {
            reputation_data.disputes_resolved += 1;
        }
    }
    
    // Recalculate overall score (weighted by category activity)
    let mut weighted_sum = 0u64;
    let mut total_weight = 0u64;
    
    for category in &reputation_data.category_reputations {
        let weight = category.completed_jobs as u64;
        weighted_sum += category.score * weight;
        total_weight += weight;
    }
    
    if total_weight > 0 {
        reputation_data.overall_score = weighted_sum / total_weight;
    }
    
    // Update tier
    reputation_data.update_tier();
    
    // Update agent's reputation score
    agent.reputation_score = (reputation_data.overall_score / 100) as u32; // Convert to 0-100 scale
    
    // Add performance snapshot
    reputation_data.add_performance_snapshot(PerformanceSnapshot {
        timestamp: clock.unix_timestamp,
        score: reputation_data.overall_score,
        jobs_completed: reputation_data.total_jobs_completed,
        avg_quality: if reputation_data.total_jobs_completed > 0 {
            reputation_data.category_reputations.iter()
                .map(|c| if c.quality_count > 0 { c.quality_sum / c.quality_count as u64 } else { 0 })
                .sum::<u64>() / reputation_data.category_reputations.len() as u64
        } else {
            0
        },
    })?;
    
    // Check for badge achievements
    check_and_award_badges(reputation_data, clock.unix_timestamp)?;
    
    reputation_data.last_updated = clock.unix_timestamp;
    
    emit!(ReputationUpdatedEvent {
        agent: agent.key(),
        previous_score: agent.reputation_score as u64 * 100, // Convert back to basis points
        new_score: reputation_data.overall_score,
        category: job_performance.category,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Stake reputation tokens
pub fn stake_reputation(
    ctx: Context<StakeReputation>,
    amount: u64,
) -> Result<()> {
    let reputation_data = &mut ctx.accounts.reputation_data;
    
    require!(
        amount > 0,
        GhostSpeakError::InvalidAmount
    );
    
    // TODO: Implement actual token transfer logic
    // This would involve SPL token transfers
    
    reputation_data.staked_amount += amount;
    
    // Staking provides a small reputation boost
    let stake_bonus = (amount / 1000).min(500); // Max 5% bonus
    reputation_data.overall_score = reputation_data.overall_score
        .saturating_add(stake_bonus)
        .min(MAX_REPUTATION_SCORE);
    
    reputation_data.update_tier();
    
    emit!(ReputationStakedEvent {
        agent: reputation_data.agent,
        amount,
        new_staked_total: reputation_data.staked_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Slash reputation for violations
pub fn slash_reputation(
    ctx: Context<SlashReputation>,
    slash_percentage: u64,
    reason: String,
) -> Result<()> {
    let reputation_data = &mut ctx.accounts.reputation_data;
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;
    
    require!(
        slash_percentage <= 5000, // Max 50% slash
        GhostSpeakError::SlashPercentageTooHigh
    );
    
    require!(
        reputation_data.overall_score >= MIN_REPUTATION_FOR_SLASH,
        GhostSpeakError::ReputationTooLowToSlash
    );
    
    let previous_score = reputation_data.overall_score;
    let slash_amount = (reputation_data.overall_score * slash_percentage) / (crate::BASIS_POINTS_MAX as u64);
    
    reputation_data.overall_score = reputation_data.overall_score.saturating_sub(slash_amount);
    reputation_data.update_tier();
    
    // Update agent's reputation
    agent.reputation_score = (reputation_data.overall_score / 100) as u32;
    
    // Also slash staked amount proportionally
    if reputation_data.staked_amount > 0 {
        let staked_slash = (reputation_data.staked_amount * slash_percentage) / (crate::BASIS_POINTS_MAX as u64);
        reputation_data.staked_amount = reputation_data.staked_amount.saturating_sub(staked_slash);
    }
    
    reputation_data.last_updated = clock.unix_timestamp;
    
    emit!(ReputationSlashedEvent {
        agent: agent.key(),
        previous_score,
        new_score: reputation_data.overall_score,
        slash_percentage,
        reason,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Helper function to calculate timeliness score
fn calculate_timeliness_score(expected_duration: u64, actual_duration: u64) -> u64 {
    if actual_duration <= expected_duration {
        MAX_REPUTATION_SCORE
    } else {
        let delay_ratio = ((actual_duration - expected_duration) * 10000) / expected_duration;
        if delay_ratio > 5000 { // More than 50% delay
            0
        } else {
            MAX_REPUTATION_SCORE - (MAX_REPUTATION_SCORE * delay_ratio / 10000)
        }
    }
}

/// Check and award badges based on achievements
fn check_and_award_badges(
    reputation_data: &mut ReputationData,
    timestamp: i64,
) -> Result<()> {
    let badges_to_check = vec![
        (BadgeType::FirstJob, reputation_data.total_jobs_completed >= 1, 1),
        (BadgeType::TenJobs, reputation_data.total_jobs_completed >= 10, 10),
        (BadgeType::HundredJobs, reputation_data.total_jobs_completed >= 100, 100),
        (BadgeType::ThousandJobs, reputation_data.total_jobs_completed >= 1000, 1000),
        (BadgeType::PerfectRating, reputation_data.overall_score >= 9500, reputation_data.overall_score),
        (BadgeType::QuickResponder, reputation_data.avg_response_time > 0 && reputation_data.avg_response_time < 3600, reputation_data.avg_response_time),
        (BadgeType::DisputeResolver, reputation_data.disputes_resolved >= 5, reputation_data.disputes_resolved as u64),
        (BadgeType::CategoryExpert, reputation_data.category_reputations.iter().any(|c| c.score >= 9000), 9000),
        (BadgeType::CrossCategoryMaster, reputation_data.category_reputations.len() >= 5, reputation_data.category_reputations.len() as u64),
    ];
    
    for (badge_type, condition, value) in badges_to_check {
        if condition && !reputation_data.badges.iter().any(|b| b.badge_type == badge_type) {
            reputation_data.badges.push(ReputationBadge {
                badge_type,
                earned_at: timestamp,
                achievement_value: value,
            });
        }
    }
    
    Ok(())
}

/// Events
#[event]
pub struct ReputationInitializedEvent {
    pub agent: Pubkey,
    pub initial_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ReputationUpdatedEvent {
    pub agent: Pubkey,
    pub previous_score: u64,
    pub new_score: u64,
    pub category: String,
    pub timestamp: i64,
}

#[event]
pub struct ReputationStakedEvent {
    pub agent: Pubkey,
    pub amount: u64,
    pub new_staked_total: u64,
    pub timestamp: i64,
}

#[event]
pub struct ReputationSlashedEvent {
    pub agent: Pubkey,
    pub previous_score: u64,
    pub new_score: u64,
    pub slash_percentage: u64,
    pub reason: String,
    pub timestamp: i64,
}