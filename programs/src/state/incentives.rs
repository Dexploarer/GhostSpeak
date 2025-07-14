/*!
 * Incentives State Module
 * 
 * Contains incentive-related state structures.
 */

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IncentiveConfig {
    pub referral_bonus: f64,
    pub performance_bonus: f64,
    pub loyalty_multiplier: f64,
    pub early_bird_discount: f64,
}

#[account]
pub struct IncentiveProgram {
    pub owner: Pubkey,
    pub config: IncentiveConfig,
    pub total_rewards_distributed: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct AgentIncentives {
    pub agent: Pubkey,
    pub referrals_count: u32,
    pub referral_earnings: u64,
    pub performance_score: f64,
    pub performance_earnings: u64,
    pub loyalty_points: u64,
    pub total_earnings: u64,
    pub last_activity: i64,
    pub bump: u8,
}

impl IncentiveProgram {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // config (4 * f64)
        8 + // total_rewards_distributed
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl AgentIncentives {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        4 + // referrals_count
        8 + // referral_earnings
        8 + // performance_score
        8 + // performance_earnings
        8 + // loyalty_points
        8 + // total_earnings
        8 + // last_activity
        1; // bump
}