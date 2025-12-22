/*!
 * Staking State Module
 *
 * Contains staking related state structures for governance voting power
 * and lockup incentives in the x402 marketplace.
 */

use anchor_lang::prelude::*;

/// PDA seeds for staking accounts
pub const STAKING_ACCOUNT_SEED: &[u8] = b"staking";
pub const STAKING_CONFIG_SEED: &[u8] = b"staking_config";

/// Individual user staking account
#[account]
pub struct StakingAccount {
    /// Owner of this staking account
    pub owner: Pubkey,

    /// Token mint being staked (GHOST token)
    pub token_mint: Pubkey,

    /// Amount of tokens currently staked
    pub staked_amount: u64,

    /// Timestamp when tokens were staked
    pub staked_at: i64,

    /// Lockup end timestamp (0 if no lockup)
    pub lockup_ends_at: i64,

    /// Lockup tier (0=none, 1=1month, 2=3months, 3=6months, 4=1year, 5=2years)
    pub lockup_tier: u8,

    /// Total rewards claimed
    pub rewards_claimed: u64,

    /// Last reward claim timestamp
    pub last_claim_at: i64,

    /// Pending rewards (not yet claimed)
    pub pending_rewards: u64,

    /// Whether auto-compound is enabled
    pub auto_compound: bool,

    /// Account creation timestamp
    pub created_at: i64,

    /// Last update timestamp
    pub updated_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl StakingAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // token_mint
        8 +  // staked_amount
        8 +  // staked_at
        8 +  // lockup_ends_at
        1 +  // lockup_tier
        8 +  // rewards_claimed
        8 +  // last_claim_at
        8 +  // pending_rewards
        1 +  // auto_compound
        8 +  // created_at
        8 +  // updated_at
        1;   // bump

    /// Check if tokens are currently locked
    pub fn is_locked(&self, current_timestamp: i64) -> bool {
        self.lockup_ends_at > current_timestamp
    }

    /// Get remaining lockup duration in seconds
    pub fn remaining_lockup(&self, current_timestamp: i64) -> i64 {
        if self.lockup_ends_at > current_timestamp {
            self.lockup_ends_at - current_timestamp
        } else {
            0
        }
    }

    /// Get lockup duration from tier
    pub fn lockup_duration_from_tier(tier: u8) -> i64 {
        match tier {
            1 => 30 * 24 * 60 * 60,      // 1 month
            2 => 90 * 24 * 60 * 60,      // 3 months
            3 => 180 * 24 * 60 * 60,     // 6 months
            4 => 365 * 24 * 60 * 60,     // 1 year
            5 => 730 * 24 * 60 * 60,     // 2 years
            _ => 0,                       // No lockup
        }
    }

    /// Get voting power multiplier for lockup tier (basis points)
    pub fn lockup_multiplier_from_tier(tier: u8) -> u16 {
        match tier {
            1 => 11000,  // 1.1x
            2 => 12500,  // 1.25x
            3 => 15000,  // 1.5x
            4 => 20000,  // 2.0x
            5 => 30000,  // 3.0x
            _ => 10000,  // 1.0x
        }
    }
}

/// Global staking configuration
#[account]
pub struct StakingConfig {
    /// Authority that can update config
    pub authority: Pubkey,

    /// GHOST token mint address
    pub ghost_token_mint: Pubkey,

    /// Treasury account for reward distribution
    pub rewards_treasury: Pubkey,

    /// Base APY in basis points (e.g., 500 = 5%)
    pub base_apy: u16,

    /// Bonus APY per lockup tier (basis points)
    pub tier_bonus_apy: [u16; 6],

    /// Minimum stake amount
    pub min_stake_amount: u64,

    /// Maximum stake amount per account (0 = no limit)
    pub max_stake_amount: u64,

    /// Total tokens staked across all accounts
    pub total_staked: u64,

    /// Total rewards distributed
    pub total_rewards_distributed: u64,

    /// Whether staking is currently enabled
    pub is_enabled: bool,

    /// Emergency pause flag
    pub is_paused: bool,

    /// Creation timestamp
    pub created_at: i64,

    /// Last update timestamp
    pub updated_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl StakingConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // ghost_token_mint
        32 + // rewards_treasury
        2 +  // base_apy
        12 + // tier_bonus_apy (6 * 2)
        8 +  // min_stake_amount
        8 +  // max_stake_amount
        8 +  // total_staked
        8 +  // total_rewards_distributed
        1 +  // is_enabled
        1 +  // is_paused
        8 +  // created_at
        8 +  // updated_at
        1;   // bump

    /// Calculate APY for a given lockup tier
    pub fn calculate_apy(&self, tier: u8) -> u16 {
        let tier_index = if tier < 6 { tier as usize } else { 0 };
        self.base_apy + self.tier_bonus_apy[tier_index]
    }

    /// Calculate pending rewards for a staking account
    pub fn calculate_rewards(&self, staking_account: &StakingAccount, current_timestamp: i64) -> u64 {
        if staking_account.staked_amount == 0 {
            return 0;
        }

        let duration = current_timestamp.saturating_sub(staking_account.last_claim_at);
        if duration <= 0 {
            return 0;
        }

        let apy = self.calculate_apy(staking_account.lockup_tier);
        
        // Calculate rewards: amount * apy * duration / (365 days * 10000 basis points)
        let annual_reward = (staking_account.staked_amount as u128 * apy as u128) / 10000;
        let duration_seconds = duration as u128;
        let seconds_per_year = 365u128 * 24 * 60 * 60;
        
        ((annual_reward * duration_seconds) / seconds_per_year) as u64
    }
}

/// Staking events
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TokensStakedEvent {
    pub owner: Pubkey,
    pub amount: u64,
    pub lockup_tier: u8,
    pub lockup_ends_at: i64,
    pub total_staked: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TokensUnstakedEvent {
    pub owner: Pubkey,
    pub amount: u64,
    pub rewards_claimed: u64,
    pub remaining_staked: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RewardsClaimedEvent {
    pub owner: Pubkey,
    pub amount: u64,
    pub total_claimed: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LockupExtendedEvent {
    pub owner: Pubkey,
    pub old_tier: u8,
    pub new_tier: u8,
    pub new_lockup_ends_at: i64,
    pub bonus_rewards: u64,
    pub timestamp: i64,
}
