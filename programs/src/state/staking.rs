/*!
 * Staking State Module
 *
 * Data structures for GHOST token staking with reputation boost mechanics.
 */

use anchor_lang::prelude::*;

/// Individual owner staking account tracking their staked GHOST tokens
/// Used for Sybil resistance (1K GHOST minimum), API quotas, and governance
#[account]
pub struct StakingAccount {
    /// Owner of this staking account (can register multiple agents)
    pub owner: Pubkey,

    /// Amount of GHOST tokens staked
    pub amount_staked: u64,

    /// Timestamp when staking started
    pub staked_at: i64,

    /// Lock duration in seconds (minimum 30 days)
    pub lock_duration: i64,

    /// Timestamp when unlock is available
    pub unlock_at: i64,

    /// Reputation boost percentage (in basis points, e.g., 500 = 5%)
    pub reputation_boost_bps: u16,

    /// Whether agent has "Verified" badge
    pub has_verified_badge: bool,

    /// Whether agent has premium listing benefits
    pub has_premium_benefits: bool,

    /// Total slashed amount (never recoverable)
    pub total_slashed: u64,

    /// Current access tier based on stake amount
    pub tier: AccessTier,

    /// Daily API calls remaining (resets every 24h)
    pub api_calls_remaining: u32,

    /// Last API quota reset timestamp
    pub last_quota_reset: i64,

    /// Voting power for governance (equals amount_staked)
    pub voting_power: u64,

    /// Bump for PDA
    pub bump: u8,
}

impl StakingAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 +  // amount_staked
        8 +  // staked_at
        8 +  // lock_duration
        8 +  // unlock_at
        2 +  // reputation_boost_bps
        1 +  // has_verified_badge
        1 +  // has_premium_benefits
        8 +  // total_slashed
        1 +  // tier (enum)
        4 +  // api_calls_remaining
        8 +  // last_quota_reset
        8 +  // voting_power
        1;   // bump

    /// Calculate reputation boost, tier, and API quota based on stake amount
    ///
    /// Tiers (GHOST token has 6 decimals, not 9!):
    /// - 1,000 GHOST (1_000_000_000) → Basic: +5% boost, 100 API calls/day, Sybil-resistant
    /// - 5,000 GHOST (5_000_000_000) → Verified: +10% boost, 1,000 API calls/day
    /// - 50,000 GHOST (50_000_000_000) → Pro: +15% boost, 10,000 API calls/day
    /// - 500,000 GHOST (500_000_000_000) → Whale: +20% boost, unlimited API calls
    pub fn calculate_boost(&mut self) {
        // Update voting power (1 GHOST staked = 1 vote)
        self.voting_power = self.amount_staked;

        // Set tier and quotas (GHOST has 6 decimals!)
        if self.amount_staked >= 500_000_000_000 { // 500K GHOST (6 decimals) - Whale
            self.reputation_boost_bps = 2000; // 20%
            self.has_verified_badge = true;
            self.has_premium_benefits = true;
            self.tier = AccessTier::Whale;
            self.api_calls_remaining = u32::MAX; // Unlimited
        } else if self.amount_staked >= 50_000_000_000 { // 50K GHOST - Pro
            self.reputation_boost_bps = 1500; // 15%
            self.has_verified_badge = true;
            self.has_premium_benefits = true;
            self.tier = AccessTier::Pro;
            self.api_calls_remaining = 10_000; // 10K calls/day
        } else if self.amount_staked >= 5_000_000_000 { // 5K GHOST - Verified
            self.reputation_boost_bps = 1000; // 10%
            self.has_verified_badge = true;
            self.has_premium_benefits = false;
            self.tier = AccessTier::Verified;
            self.api_calls_remaining = 1_000; // 1K calls/day
        } else if self.amount_staked >= 1_000_000_000 { // 1K GHOST - Basic (Sybil minimum)
            self.reputation_boost_bps = 500; // 5%
            self.has_verified_badge = false;
            self.has_premium_benefits = false;
            self.tier = AccessTier::Basic;
            self.api_calls_remaining = 100; // 100 calls/day
        } else {
            // Below minimum stake - no access
            self.reputation_boost_bps = 0;
            self.has_verified_badge = false;
            self.has_premium_benefits = false;
            self.tier = AccessTier::None;
            self.api_calls_remaining = 0; // No API access
        }
    }

    /// Check if API quota needs reset (every 24 hours)
    pub fn should_reset_quota(&self, current_time: i64) -> bool {
        let time_since_reset = current_time - self.last_quota_reset;
        time_since_reset >= 86400 // 24 hours in seconds
    }

    /// Reset daily API quota based on tier
    pub fn reset_daily_quota(&mut self, current_time: i64) {
        self.last_quota_reset = current_time;

        self.api_calls_remaining = match self.tier {
            AccessTier::Basic => 100,
            AccessTier::Verified => 1_000,
            AccessTier::Pro => 10_000,
            AccessTier::Whale => u32::MAX, // Unlimited
            AccessTier::None => 0,
        };
    }

    /// Consume 1 API call (returns false if quota exceeded)
    pub fn consume_api_call(&mut self) -> bool {
        if self.api_calls_remaining == 0 {
            return false; // Quota exhausted
        }

        if self.api_calls_remaining != u32::MAX { // Don't decrement unlimited
            self.api_calls_remaining -= 1;
        }

        true
    }

    /// Check if this account has API access (any tier with quota)
    pub fn has_api_access(&self) -> bool {
        !matches!(self.tier, AccessTier::None)
    }

    /// Get daily API call limit for this tier
    pub fn get_daily_api_limit(&self) -> u32 {
        match self.tier {
            AccessTier::Basic => 100,
            AccessTier::Verified => 1_000,
            AccessTier::Pro => 10_000,
            AccessTier::Whale => u32::MAX, // Unlimited
            AccessTier::None => 0,
        }
    }
}

/// Global staking configuration
#[account]
pub struct StakingConfig {
    /// Authority who can update staking parameters
    pub authority: Pubkey,

    /// Minimum stake amount (1,000 GHOST)
    pub min_stake: u64,

    /// Minimum lock duration (30 days in seconds)
    pub min_lock_duration: i64,

    /// Slash percentage for fraud (50% = 5000 bps)
    pub fraud_slash_bps: u16,

    /// Slash percentage for dispute loss (10% = 1000 bps)
    pub dispute_slash_bps: u16,

    /// Treasury account for slashed tokens
    pub treasury: Pubkey,

    pub bump: u8,
}

impl StakingConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 +  // min_stake
        8 +  // min_lock_duration
        2 +  // fraud_slash_bps
        2 +  // dispute_slash_bps
        32 + // treasury
        1;   // bump
}

/// Access tiers based on GHOST token stake amount
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum AccessTier {
    /// No stake or below minimum (< 1,000 GHOST) - No API access
    #[default]
    None,
    /// Basic tier: 1,000+ GHOST → 100 API calls/day, Sybil-resistant registration
    Basic,
    /// Verified tier: 5,000+ GHOST → 1,000 API calls/day, verified badge
    Verified,
    /// Pro tier: 50,000+ GHOST → 10,000 API calls/day, premium features
    Pro,
    /// Whale tier: 500,000+ GHOST → Unlimited API calls, max governance power
    Whale,
}

/// Reasons for slashing staked tokens
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum SlashReason {
    /// Proven fraud (50% slash)
    Fraud,
    /// Lost dispute (10% slash)
    DisputeLoss,
    /// Custom slash amount
    Custom,
}

// =====================================================
// STAKING EVENTS
// =====================================================

#[event]
pub struct GhostStakedEvent {
    pub agent: Pubkey,
    pub amount: u64,
    pub unlock_at: i64,
    pub reputation_boost_bps: u16,
    pub tier: AccessTier,
    pub daily_api_calls: u32,
    pub voting_power: u64,
}

#[event]
pub struct GhostUnstakedEvent {
    pub agent: Pubkey,
    pub amount: u64,
}

#[event]
pub struct GhostSlashedEvent {
    pub agent: Pubkey,
    pub amount: u64,
    pub reason: SlashReason,
    pub new_tier: AccessTier,
}

#[event]
pub struct TierUpdatedEvent {
    pub agent: Pubkey,
    pub old_tier: AccessTier,
    pub new_tier: AccessTier,
    pub total_staked: u64,
    pub daily_api_calls: u32,
    pub voting_power: u64,
}
