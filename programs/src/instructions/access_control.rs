/*!
 * Access Control Instructions
 *
 * Tier-based access control guards for staking tiers.
 * Enforces access restrictions based on GHOST token stake amounts.
 */

use anchor_lang::prelude::*;
use crate::state::staking::{StakingAccount, AccessTier};
use crate::GhostSpeakError;

// =====================================================
// ACCESS CONTROL GUARDS
// =====================================================

/// Require Verified tier or higher (5,000+ GHOST staked)
/// Use this to gate unlimited verification features
pub fn require_verified_tier(staking_account: &Account<StakingAccount>) -> Result<()> {
    require!(
        staking_account.has_unlimited_verifications(),
        GhostSpeakError::InsufficientReputation
    );

    msg!(
        "Access granted: Verified tier (tier: {:?}, stake: {})",
        staking_account.tier,
        staking_account.amount_staked
    );

    Ok(())
}

/// Require Pro tier or higher (50,000+ GHOST staked)
/// Use this to gate API access features
pub fn require_pro_tier(staking_account: &Account<StakingAccount>) -> Result<()> {
    require!(
        staking_account.has_api_access(),
        GhostSpeakError::InsufficientReputation
    );

    msg!(
        "Access granted: Pro tier (tier: {:?}, stake: {}, API limit: {:?})",
        staking_account.tier,
        staking_account.amount_staked,
        staking_account.get_api_request_limit()
    );

    Ok(())
}

/// Require Whale tier (500,000+ GHOST staked)
/// Use this to gate unlimited API access features
pub fn require_whale_tier(staking_account: &Account<StakingAccount>) -> Result<()> {
    require!(
        staking_account.has_unlimited_api(),
        GhostSpeakError::InsufficientReputation
    );

    msg!(
        "Access granted: Whale tier (tier: {:?}, stake: {}, unlimited API)",
        staking_account.tier,
        staking_account.amount_staked
    );

    Ok(())
}

/// Get revenue share multiplier for a staking account
/// Returns the multiplier as a float (1.0, 1.5, 2.0, 3.0)
pub fn get_revenue_multiplier(staking_account: &Account<StakingAccount>) -> f64 {
    staking_account.get_revenue_multiplier_f64()
}

/// Get access tier for a staking account
pub fn get_access_tier(staking_account: &Account<StakingAccount>) -> AccessTier {
    staking_account.tier
}

/// Check if account has unlimited verifications without requiring
/// Returns true for Verified, Pro, or Whale tiers
pub fn check_verification_access(staking_account: &Account<StakingAccount>) -> bool {
    staking_account.has_unlimited_verifications()
}

/// Check if account has API access without requiring
/// Returns true for Pro or Whale tiers
pub fn check_api_access(staking_account: &Account<StakingAccount>) -> bool {
    staking_account.has_api_access()
}

/// Get API request limit for an account
/// Returns Some(limit) for Pro tier, None for Whale (unlimited), Some(0) for others
pub fn get_api_request_limit(staking_account: &Account<StakingAccount>) -> Option<u64> {
    staking_account.get_api_request_limit()
}

// =====================================================
// HELPER FUNCTIONS FOR TIER VALIDATION
// =====================================================

/// Calculate what tier a given stake amount would qualify for
/// Useful for preview/estimation on frontend
pub fn calculate_tier_for_amount(amount: u64) -> AccessTier {
    if amount >= 500_000_000_000_000 {
        AccessTier::Whale
    } else if amount >= 50_000_000_000_000 {
        AccessTier::Pro
    } else if amount >= 5_000_000_000_000 {
        AccessTier::Verified
    } else if amount >= 1_000_000_000_000 {
        AccessTier::Basic
    } else {
        AccessTier::None
    }
}

/// Get revenue multiplier for a given tier
pub fn get_multiplier_for_tier(tier: AccessTier) -> u16 {
    match tier {
        AccessTier::None => 0,
        AccessTier::Basic => 100,    // 1.0x
        AccessTier::Verified => 150, // 1.5x
        AccessTier::Pro => 200,      // 2.0x
        AccessTier::Whale => 300,    // 3.0x
    }
}

/// Get minimum stake amount required for a tier
pub fn get_min_stake_for_tier(tier: AccessTier) -> u64 {
    match tier {
        AccessTier::None => 0,
        AccessTier::Basic => 1_000_000_000_000,     // 1,000 GHOST (9 decimals)
        AccessTier::Verified => 5_000_000_000_000,  // 5,000 GHOST
        AccessTier::Pro => 50_000_000_000_000,      // 50,000 GHOST
        AccessTier::Whale => 500_000_000_000_000,   // 500,000 GHOST
    }
}

// =====================================================
// EXAMPLE USAGE IN INSTRUCTIONS
// =====================================================

/*
EXAMPLE: Gating unlimited verifications

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    #[account(
        seeds = [b"staking", agent.key().as_ref()],
        bump = staking_account.bump
    )]
    pub staking_account: Account<'info, StakingAccount>,

    pub agent: Account<'info, Agent>,
    // ... other accounts
}

pub fn verify_agent(ctx: Context<VerifyAgent>) -> Result<()> {
    // Require Verified tier or higher for unlimited verifications
    require_verified_tier(&ctx.accounts.staking_account)?;

    // Proceed with verification logic...
    Ok(())
}

---

EXAMPLE: Gating API access

#[derive(Accounts)]
pub struct CallApi<'info> {
    #[account(
        seeds = [b"staking", agent.key().as_ref()],
        bump = staking_account.bump
    )]
    pub staking_account: Account<'info, StakingAccount>,

    pub agent: Account<'info, Agent>,
    // ... other accounts
}

pub fn call_api(ctx: Context<CallApi>) -> Result<()> {
    // Require Pro tier or higher for API access
    require_pro_tier(&ctx.accounts.staking_account)?;

    // Check if they have unlimited or need to track usage
    let api_limit = get_api_request_limit(&ctx.accounts.staking_account);
    match api_limit {
        None => msg!("Unlimited API access"),
        Some(limit) => msg!("API limit: {} requests/month", limit),
    }

    // Proceed with API call logic...
    Ok(())
}

---

EXAMPLE: Calculating revenue share

pub fn distribute_revenue(ctx: Context<DistributeRevenue>) -> Result<()> {
    let staking_account = &ctx.accounts.staking_account;

    // Get user's revenue multiplier
    let multiplier = get_revenue_multiplier(staking_account);

    // Calculate weighted stake
    let weighted_stake = staking_account.amount_staked as f64 * multiplier;

    // Calculate user's share of revenue pool
    let user_share = (weighted_stake / total_weighted_stake) * revenue_pool_amount;

    // Transfer USDC rewards to user...
    Ok(())
}
*/
