/*!
 * Staking Instructions
 *
 * Implements staking functionality for GHOST token lockup and governance voting power.
 * Users can stake tokens with optional lockup periods to earn rewards and increase
 * their voting power in the x402 marketplace governance.
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::staking::{StakingAccount, StakingConfig};
use crate::GhostSpeakError;

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

/// Initialize the global staking configuration
#[derive(Accounts)]
pub struct InitializeStakingConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = StakingConfig::LEN,
        seeds = [b"staking_config"],
        bump
    )]
    pub staking_config: Account<'info, StakingConfig>,

    /// GHOST token mint
    /// CHECK: Validated as SPL token mint
    pub ghost_token_mint: AccountInfo<'info>,

    /// Treasury for rewards distribution
    /// CHECK: Validated in instruction
    pub rewards_treasury: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Create a new staking account for a user
#[derive(Accounts)]
pub struct CreateStakingAccount<'info> {
    #[account(
        init,
        payer = owner,
        space = StakingAccount::LEN,
        seeds = [b"staking", owner.key().as_ref()],
        bump
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        seeds = [b"staking_config"],
        bump = staking_config.bump,
        constraint = staking_config.is_enabled @ GhostSpeakError::ServiceNotActive
    )]
    pub staking_config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Stake tokens with optional lockup
#[derive(Accounts)]
#[instruction(amount: u64, lockup_tier: u8)]
pub struct StakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == owner.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump = staking_config.bump,
        constraint = staking_config.is_enabled @ GhostSpeakError::ServiceNotActive,
        constraint = !staking_config.is_paused @ GhostSpeakError::ServiceNotActive
    )]
    pub staking_config: Account<'info, StakingConfig>,

    /// User's token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount,
        constraint = user_token_account.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Staking vault (holds staked tokens)
    #[account(
        mut,
        constraint = staking_vault.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Unstake tokens (if not locked)
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == owner.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump = staking_config.bump
    )]
    pub staking_config: Account<'info, StakingConfig>,

    /// User's token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount,
        constraint = user_token_account.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Staking vault
    #[account(
        mut,
        constraint = staking_vault.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    /// Vault authority PDA
    /// CHECK: PDA verified in seeds
    #[account(seeds = [b"staking_vault_authority"], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Claim staking rewards
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == owner.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        seeds = [b"staking_config"],
        bump = staking_config.bump
    )]
    pub staking_config: Account<'info, StakingConfig>,

    /// User's token account for reward payout
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Rewards treasury
    #[account(
        mut,
        constraint = rewards_treasury.key() == staking_config.rewards_treasury @ GhostSpeakError::InvalidTokenAccount
    )]
    pub rewards_treasury: Account<'info, TokenAccount>,

    /// Treasury authority PDA
    /// CHECK: PDA verified in seeds
    #[account(seeds = [b"rewards_treasury_authority"], bump)]
    pub treasury_authority: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Extend lockup period
#[derive(Accounts)]
#[instruction(new_tier: u8)]
pub struct ExtendLockup<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == owner.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        seeds = [b"staking_config"],
        bump = staking_config.bump
    )]
    pub staking_config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Initialize the global staking configuration
pub fn initialize_staking_config(
    ctx: Context<InitializeStakingConfig>,
    base_apy: u16,
    min_stake_amount: u64,
    max_stake_amount: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.staking_config;
    let clock = Clock::get()?;

    config.authority = ctx.accounts.authority.key();
    config.ghost_token_mint = ctx.accounts.ghost_token_mint.key();
    config.rewards_treasury = ctx.accounts.rewards_treasury.key();
    config.base_apy = base_apy;
    // Tier bonus APY: [none, 1mo, 3mo, 6mo, 1yr, 2yr]
    config.tier_bonus_apy = [0, 100, 250, 500, 1000, 2000]; // 0%, 1%, 2.5%, 5%, 10%, 20%
    config.min_stake_amount = min_stake_amount;
    config.max_stake_amount = max_stake_amount;
    config.total_staked = 0;
    config.total_rewards_distributed = 0;
    config.is_enabled = true;
    config.is_paused = false;
    config.created_at = clock.unix_timestamp;
    config.updated_at = clock.unix_timestamp;
    config.bump = ctx.bumps.staking_config;

    msg!("Staking config initialized");
    msg!("Base APY: {}%", base_apy as f64 / 100.0);
    msg!("Min stake: {}", min_stake_amount);

    Ok(())
}

/// Create a staking account for a user
pub fn create_staking_account(ctx: Context<CreateStakingAccount>) -> Result<()> {
    let staking_account = &mut ctx.accounts.staking_account;
    let clock = Clock::get()?;

    staking_account.owner = ctx.accounts.owner.key();
    staking_account.token_mint = ctx.accounts.staking_config.ghost_token_mint;
    staking_account.staked_amount = 0;
    staking_account.staked_at = 0;
    staking_account.lockup_ends_at = 0;
    staking_account.lockup_tier = 0;
    staking_account.rewards_claimed = 0;
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.pending_rewards = 0;
    staking_account.auto_compound = false;
    staking_account.created_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;
    staking_account.bump = ctx.bumps.staking_account;

    msg!("Staking account created for {}", ctx.accounts.owner.key());

    Ok(())
}

/// Stake tokens with optional lockup
pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64, lockup_tier: u8) -> Result<()> {
    let staking_config = &mut ctx.accounts.staking_config;
    let staking_account = &mut ctx.accounts.staking_account;
    let clock = Clock::get()?;

    // Validate amount
    require!(
        amount >= staking_config.min_stake_amount,
        GhostSpeakError::InvalidPaymentAmount
    );

    if staking_config.max_stake_amount > 0 {
        let new_total = staking_account.staked_amount.saturating_add(amount);
        require!(
            new_total <= staking_config.max_stake_amount,
            GhostSpeakError::InvalidPaymentAmount
        );
    }

    // Validate lockup tier
    require!(lockup_tier <= 5, GhostSpeakError::InvalidConfiguration);

    // Calculate and store pending rewards before changing stake
    if staking_account.staked_amount > 0 {
        let pending = staking_config.calculate_rewards(staking_account, clock.unix_timestamp);
        staking_account.pending_rewards = staking_account.pending_rewards.saturating_add(pending);
    }

    // Transfer tokens to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Update staking account
    staking_account.staked_amount = staking_account.staked_amount.saturating_add(amount);
    staking_account.staked_at = clock.unix_timestamp;
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;

    // Set lockup if specified and not already locked
    if lockup_tier > 0 && lockup_tier > staking_account.lockup_tier {
        let lockup_duration = StakingAccount::lockup_duration_from_tier(lockup_tier);
        staking_account.lockup_tier = lockup_tier;
        staking_account.lockup_ends_at = clock.unix_timestamp + lockup_duration;
    }

    // Update global stats
    staking_config.total_staked = staking_config.total_staked.saturating_add(amount);
    staking_config.updated_at = clock.unix_timestamp;

    msg!(
        "Staked {} tokens with tier {} lockup, ends at {}",
        amount,
        lockup_tier,
        staking_account.lockup_ends_at
    );

    Ok(())
}

/// Unstake tokens (if not locked)
pub fn unstake_tokens(ctx: Context<UnstakeTokens>, amount: u64) -> Result<()> {
    let staking_account = &mut ctx.accounts.staking_account;
    let staking_config = &mut ctx.accounts.staking_config;
    let clock = Clock::get()?;

    // Check if locked
    require!(
        !staking_account.is_locked(clock.unix_timestamp),
        GhostSpeakError::MultisigTimelockActive
    );

    // Validate amount
    require!(
        amount <= staking_account.staked_amount,
        GhostSpeakError::InsufficientBalance
    );

    // Calculate pending rewards
    let pending = staking_config.calculate_rewards(staking_account, clock.unix_timestamp);
    staking_account.pending_rewards = staking_account.pending_rewards.saturating_add(pending);

    // Transfer tokens back to user
    let seeds = &[b"staking_vault_authority".as_ref(), &[ctx.bumps.vault_authority]];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, amount)?;

    // Update staking account
    staking_account.staked_amount = staking_account.staked_amount.saturating_sub(amount);
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;

    // Reset lockup if fully unstaked
    if staking_account.staked_amount == 0 {
        staking_account.lockup_tier = 0;
        staking_account.lockup_ends_at = 0;
    }

    // Update global stats
    staking_config.total_staked = staking_config.total_staked.saturating_sub(amount);
    staking_config.updated_at = clock.unix_timestamp;

    msg!(
        "Unstaked {} tokens, remaining: {}",
        amount,
        staking_account.staked_amount
    );

    Ok(())
}

/// Claim staking rewards
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let staking_account = &mut ctx.accounts.staking_account;
    let staking_config = &ctx.accounts.staking_config;
    let clock = Clock::get()?;

    // Calculate total rewards
    let new_rewards = staking_config.calculate_rewards(staking_account, clock.unix_timestamp);
    let total_rewards = staking_account.pending_rewards.saturating_add(new_rewards);

    require!(total_rewards > 0, GhostSpeakError::InsufficientBalance);

    // Transfer rewards from treasury
    let seeds = &[b"rewards_treasury_authority".as_ref(), &[ctx.bumps.treasury_authority]];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.rewards_treasury.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.treasury_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, total_rewards)?;

    // Update staking account
    staking_account.pending_rewards = 0;
    staking_account.rewards_claimed = staking_account.rewards_claimed.saturating_add(total_rewards);
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;

    msg!(
        "Claimed {} rewards, total claimed: {}",
        total_rewards,
        staking_account.rewards_claimed
    );

    Ok(())
}

/// Extend lockup period for bonus rewards
pub fn extend_lockup(ctx: Context<ExtendLockup>, new_tier: u8) -> Result<()> {
    let staking_account = &mut ctx.accounts.staking_account;
    let clock = Clock::get()?;

    // Validate new tier is higher than current
    require!(
        new_tier > staking_account.lockup_tier,
        GhostSpeakError::InvalidConfiguration
    );
    require!(new_tier <= 5, GhostSpeakError::InvalidConfiguration);

    let old_tier = staking_account.lockup_tier;
    let new_duration = StakingAccount::lockup_duration_from_tier(new_tier);

    // Set new lockup from current time
    staking_account.lockup_tier = new_tier;
    staking_account.lockup_ends_at = clock.unix_timestamp + new_duration;
    staking_account.updated_at = clock.unix_timestamp;

    msg!(
        "Extended lockup from tier {} to tier {}, new end: {}",
        old_tier,
        new_tier,
        staking_account.lockup_ends_at
    );

    Ok(())
}
