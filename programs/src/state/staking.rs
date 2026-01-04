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

// =====================================================
// UNIT TESTS (Fast Mollusk-style tests for state logic)
// =====================================================
// These tests verify staking state machine logic without full instruction execution.
// Run with: cargo test state::staking::tests

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to create a test staking account with default values
    fn create_test_staking_account() -> StakingAccount {
        StakingAccount {
            owner: Pubkey::new_unique(),
            amount_staked: 0,
            staked_at: 0,
            lock_duration: 0,
            unlock_at: 0,
            reputation_boost_bps: 0,
            has_verified_badge: false,
            has_premium_benefits: false,
            total_slashed: 0,
            tier: AccessTier::None,
            api_calls_remaining: 0,
            last_quota_reset: 0,
            voting_power: 0,
            bump: 0,
        }
    }

    // =====================================================
    // TIER CALCULATION TESTS
    // =====================================================

    #[test]
    fn test_tier_none_below_minimum() {
        let mut account = create_test_staking_account();

        // Below minimum stake (< 1,000 GHOST with 6 decimals = 1_000_000_000)
        account.amount_staked = 500_000_000; // 500 GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::None);
        assert_eq!(account.reputation_boost_bps, 0);
        assert!(!account.has_verified_badge);
        assert!(!account.has_premium_benefits);
        assert_eq!(account.api_calls_remaining, 0);
        assert_eq!(account.voting_power, 500_000_000);
    }

    #[test]
    fn test_tier_basic_at_minimum() {
        let mut account = create_test_staking_account();

        // Exactly at Basic minimum (1,000 GHOST with 6 decimals)
        account.amount_staked = 1_000_000_000; // 1K GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Basic);
        assert_eq!(account.reputation_boost_bps, 500); // 5% boost
        assert!(!account.has_verified_badge);
        assert!(!account.has_premium_benefits);
        assert_eq!(account.api_calls_remaining, 100); // 100 calls/day
        assert_eq!(account.voting_power, 1_000_000_000);
    }

    #[test]
    fn test_tier_verified() {
        let mut account = create_test_staking_account();

        // Verified tier (5,000+ GHOST with 6 decimals)
        account.amount_staked = 5_000_000_000; // 5K GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Verified);
        assert_eq!(account.reputation_boost_bps, 1000); // 10% boost
        assert!(account.has_verified_badge);
        assert!(!account.has_premium_benefits);
        assert_eq!(account.api_calls_remaining, 1_000); // 1K calls/day
        assert_eq!(account.voting_power, 5_000_000_000);
    }

    #[test]
    fn test_tier_pro() {
        let mut account = create_test_staking_account();

        // Pro tier (50,000+ GHOST with 6 decimals)
        account.amount_staked = 50_000_000_000; // 50K GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Pro);
        assert_eq!(account.reputation_boost_bps, 1500); // 15% boost
        assert!(account.has_verified_badge);
        assert!(account.has_premium_benefits);
        assert_eq!(account.api_calls_remaining, 10_000); // 10K calls/day
        assert_eq!(account.voting_power, 50_000_000_000);
    }

    #[test]
    fn test_tier_whale() {
        let mut account = create_test_staking_account();

        // Whale tier (500,000+ GHOST with 6 decimals)
        account.amount_staked = 500_000_000_000; // 500K GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Whale);
        assert_eq!(account.reputation_boost_bps, 2000); // 20% boost
        assert!(account.has_verified_badge);
        assert!(account.has_premium_benefits);
        assert_eq!(account.api_calls_remaining, u32::MAX); // Unlimited
        assert_eq!(account.voting_power, 500_000_000_000);
    }

    #[test]
    fn test_tier_boundary_just_below_whale() {
        let mut account = create_test_staking_account();

        // Just below Whale (should be Pro)
        account.amount_staked = 499_999_999_999; // Just under 500K GHOST
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Pro);
    }

    // =====================================================
    // API QUOTA TESTS
    // =====================================================

    #[test]
    fn test_consume_api_call_basic() {
        let mut account = create_test_staking_account();
        account.amount_staked = 1_000_000_000; // Basic tier
        account.calculate_boost();

        assert_eq!(account.api_calls_remaining, 100);

        // Consume one call
        assert!(account.consume_api_call());
        assert_eq!(account.api_calls_remaining, 99);

        // Consume all remaining
        for _ in 0..99 {
            assert!(account.consume_api_call());
        }
        assert_eq!(account.api_calls_remaining, 0);

        // Next call should fail
        assert!(!account.consume_api_call());
    }

    #[test]
    fn test_consume_api_call_whale_unlimited() {
        let mut account = create_test_staking_account();
        account.amount_staked = 500_000_000_000; // Whale tier
        account.calculate_boost();

        assert_eq!(account.api_calls_remaining, u32::MAX);

        // Consume calls - should stay at MAX (unlimited)
        for _ in 0..100 {
            assert!(account.consume_api_call());
        }
        assert_eq!(account.api_calls_remaining, u32::MAX);
    }

    #[test]
    fn test_should_reset_quota() {
        let account = create_test_staking_account();

        // Less than 24 hours - no reset needed
        let current_time = 86000; // 23.9 hours
        assert!(!account.should_reset_quota(current_time));

        // Exactly 24 hours - reset needed
        let current_time = 86400; // 24 hours
        assert!(account.should_reset_quota(current_time));

        // More than 24 hours - reset needed
        let current_time = 100000;
        assert!(account.should_reset_quota(current_time));
    }

    #[test]
    fn test_reset_daily_quota_all_tiers() {
        let test_cases = [
            (0u64, AccessTier::None, 0u32),
            (1_000_000_000u64, AccessTier::Basic, 100u32),
            (5_000_000_000u64, AccessTier::Verified, 1_000u32),
            (50_000_000_000u64, AccessTier::Pro, 10_000u32),
            (500_000_000_000u64, AccessTier::Whale, u32::MAX),
        ];

        for (stake, expected_tier, expected_quota) in test_cases {
            let mut account = create_test_staking_account();
            account.amount_staked = stake;
            account.calculate_boost();

            assert_eq!(account.tier, expected_tier, "Failed for stake {}", stake);

            // Reset and check quota
            account.api_calls_remaining = 0;
            account.reset_daily_quota(86400);
            assert_eq!(
                account.api_calls_remaining, expected_quota,
                "Quota mismatch for tier {:?}",
                expected_tier
            );
        }
    }

    // =====================================================
    // API ACCESS TESTS
    // =====================================================

    #[test]
    fn test_has_api_access() {
        let mut account = create_test_staking_account();

        // None tier - no access
        account.tier = AccessTier::None;
        assert!(!account.has_api_access());

        // All other tiers - has access
        for tier in [AccessTier::Basic, AccessTier::Verified, AccessTier::Pro, AccessTier::Whale] {
            account.tier = tier;
            assert!(account.has_api_access(), "Tier {:?} should have access", tier);
        }
    }

    #[test]
    fn test_get_daily_api_limit() {
        let mut account = create_test_staking_account();

        let test_cases = [
            (AccessTier::None, 0u32),
            (AccessTier::Basic, 100),
            (AccessTier::Verified, 1_000),
            (AccessTier::Pro, 10_000),
            (AccessTier::Whale, u32::MAX),
        ];

        for (tier, expected_limit) in test_cases {
            account.tier = tier;
            assert_eq!(
                account.get_daily_api_limit(),
                expected_limit,
                "Limit mismatch for tier {:?}",
                tier
            );
        }
    }

    // =====================================================
    // VOTING POWER TESTS
    // =====================================================

    #[test]
    fn test_voting_power_equals_stake() {
        let mut account = create_test_staking_account();

        let test_amounts = [
            0u64,
            1_000_000_000,
            5_000_000_000,
            50_000_000_000,
            500_000_000_000,
            1_000_000_000_000,
        ];

        for amount in test_amounts {
            account.amount_staked = amount;
            account.calculate_boost();
            assert_eq!(
                account.voting_power, amount,
                "Voting power should equal staked amount"
            );
        }
    }

    // =====================================================
    // ACCOUNT SIZE TESTS
    // =====================================================

    #[test]
    fn test_staking_config_len() {
        let expected_len = 8 +  // discriminator
            32 + // authority
            8 +  // min_stake
            8 +  // min_lock_duration
            2 +  // fraud_slash_bps
            2 +  // dispute_slash_bps
            32 + // treasury
            1;   // bump

        assert_eq!(StakingConfig::LEN, expected_len);
    }

    #[test]
    fn test_staking_account_len() {
        let expected_len = 8 +  // discriminator
            32 + // owner
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

        assert_eq!(StakingAccount::LEN, expected_len);
    }

    // =====================================================
    // EDGE CASE TESTS
    // =====================================================

    #[test]
    fn test_tier_transitions_on_recalculation() {
        let mut account = create_test_staking_account();

        // Start at Whale tier
        account.amount_staked = 500_000_000_000;
        account.calculate_boost();
        assert_eq!(account.tier, AccessTier::Whale);

        // Simulate slash - drop to Pro tier
        account.amount_staked = 100_000_000_000;
        account.calculate_boost();
        assert_eq!(account.tier, AccessTier::Pro);

        // Drop to Verified
        account.amount_staked = 10_000_000_000;
        account.calculate_boost();
        assert_eq!(account.tier, AccessTier::Verified);

        // Drop to Basic
        account.amount_staked = 2_000_000_000;
        account.calculate_boost();
        assert_eq!(account.tier, AccessTier::Basic);

        // Drop below minimum
        account.amount_staked = 500_000_000;
        account.calculate_boost();
        assert_eq!(account.tier, AccessTier::None);
        assert_eq!(account.reputation_boost_bps, 0);
        assert!(!account.has_verified_badge);
        assert!(!account.has_premium_benefits);
    }

    #[test]
    fn test_zero_stake_handling() {
        let mut account = create_test_staking_account();

        account.amount_staked = 0;
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::None);
        assert_eq!(account.reputation_boost_bps, 0);
        assert_eq!(account.voting_power, 0);
        assert_eq!(account.api_calls_remaining, 0);
    }

    #[test]
    fn test_max_stake_handling() {
        let mut account = create_test_staking_account();

        // Max u64 stake
        account.amount_staked = u64::MAX;
        account.calculate_boost();

        assert_eq!(account.tier, AccessTier::Whale);
        assert_eq!(account.reputation_boost_bps, 2000); // 20%
        assert_eq!(account.voting_power, u64::MAX);
    }

    #[test]
    fn test_reputation_boost_values() {
        let mut account = create_test_staking_account();

        // Test all tiers have correct boost percentages
        let test_cases = [
            (0u64, 0u16),                      // None: 0%
            (1_000_000_000u64, 500u16),        // Basic: 5%
            (5_000_000_000u64, 1000u16),       // Verified: 10%
            (50_000_000_000u64, 1500u16),      // Pro: 15%
            (500_000_000_000u64, 2000u16),     // Whale: 20%
        ];

        for (stake, expected_boost) in test_cases {
            account.amount_staked = stake;
            account.calculate_boost();
            assert_eq!(
                account.reputation_boost_bps, expected_boost,
                "Boost mismatch for stake {}",
                stake
            );
        }
    }
}
