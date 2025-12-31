/*!
 * Staking Instructions
 *
 * Handlers for GHOST token staking with reputation boost mechanics.
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::staking::*;
use crate::GhostSpeakError;

const THIRTY_DAYS: i64 = 30 * 24 * 60 * 60;

// =====================================================
// INITIALIZE STAKING CONFIG
// =====================================================

/// Initialize staking configuration (admin only)
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

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_staking_config(
    ctx: Context<InitializeStakingConfig>,
    min_stake: u64,
    treasury: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.staking_config;

    config.authority = ctx.accounts.authority.key();
    config.min_stake = min_stake;
    config.min_lock_duration = THIRTY_DAYS;
    config.fraud_slash_bps = 5000; // 50%
    config.dispute_slash_bps = 1000; // 10%
    config.treasury = treasury;
    config.bump = ctx.bumps.staking_config;

    msg!("Staking config initialized with min_stake: {}", min_stake);

    Ok(())
}

// =====================================================
// STAKE GHOST TOKENS
// =====================================================

/// Stake GHOST tokens for Sybil resistance and governance
#[derive(Accounts)]
pub struct StakeGhost<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = StakingAccount::LEN,
        seeds = [
            b"staking",
            owner.key().as_ref()  // Owner-based, not agent-based
        ],
        bump
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == ghost_mint.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// Staking vault to hold all staked GHOST tokens
    /// Automatically initialized on first stake using init_if_needed
    #[account(
        init_if_needed,
        payer = owner,
        token::mint = ghost_mint,
        token::authority = staking_config,
        seeds = [b"staking_vault", staking_config.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    pub staking_config: Account<'info, StakingConfig>,

    /// CHECK: GHOST token mint address
    pub ghost_mint: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn stake_ghost(
    ctx: Context<StakeGhost>,
    amount: u64,
    lock_duration: i64,
) -> Result<()> {
    let config = &ctx.accounts.staking_config;
    let staking = &mut ctx.accounts.staking_account;
    let clock = Clock::get()?;

    // Validate
    require!(amount >= config.min_stake, GhostSpeakError::ValueBelowMinimum);
    require!(lock_duration >= config.min_lock_duration, GhostSpeakError::InvalidInput);

    // Transfer GHOST tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.owner_token_account.to_account_info(),
        to: ctx.accounts.staking_vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    token::transfer(cpi_ctx, amount)?;

    // Track old tier for event emission
    let old_tier = staking.tier;

    // Update staking account
    staking.owner = ctx.accounts.owner.key();
    staking.amount_staked = staking.amount_staked.saturating_add(amount);
    staking.staked_at = clock.unix_timestamp;
    staking.lock_duration = lock_duration;
    staking.unlock_at = clock.unix_timestamp + lock_duration;
    staking.calculate_boost(); // Sets tier, voting_power, api_calls_remaining
    staking.last_quota_reset = clock.unix_timestamp; // Initialize quota timer
    staking.bump = ctx.bumps.staking_account;

    // Emit tier update event if tier changed
    if old_tier != staking.tier {
        emit!(TierUpdatedEvent {
            agent: ctx.accounts.owner.key(),
            old_tier,
            new_tier: staking.tier,
            total_staked: staking.amount_staked,
            daily_api_calls: staking.get_daily_api_limit(),
            voting_power: staking.voting_power,
        });
    }

    emit!(GhostStakedEvent {
        agent: ctx.accounts.owner.key(),
        amount,
        unlock_at: staking.unlock_at,
        reputation_boost_bps: staking.reputation_boost_bps,
        tier: staking.tier,
        daily_api_calls: staking.get_daily_api_limit(),
        voting_power: staking.voting_power,
    });

    msg!("Staked {} GHOST for owner: {} (tier: {:?}, boost: {}bps, API calls/day: {}, voting power: {})",
        amount, ctx.accounts.owner.key(), staking.tier,
        staking.reputation_boost_bps, staking.get_daily_api_limit(), staking.voting_power);

    Ok(())
}

// =====================================================
// UNSTAKE GHOST TOKENS
// =====================================================

/// Unstake GHOST tokens after lock period
#[derive(Accounts)]
pub struct UnstakeGhost<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == owner.key()
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        seeds = [b"staking_config"],
        bump
    )]
    pub staking_config: Account<'info, StakingConfig>,

    #[account(
        mut,
        seeds = [b"staking_vault", staking_config.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn unstake_ghost(ctx: Context<UnstakeGhost>) -> Result<()> {
    let staking = &mut ctx.accounts.staking_account;
    let clock = Clock::get()?;

    // Check lock period
    require!(
        clock.unix_timestamp >= staking.unlock_at,
        GhostSpeakError::InvalidState
    );

    let amount = staking.amount_staked;

    // Transfer tokens back
    let owner_key = ctx.accounts.owner.key();
    let seeds = &[
        b"staking",
        owner_key.as_ref(),
        &[staking.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.staking_vault.to_account_info(),
        to: ctx.accounts.owner_token_account.to_account_info(),
        authority: staking.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds
    );
    token::transfer(cpi_ctx, amount)?;

    // Reset staking
    staking.amount_staked = 0;
    staking.reputation_boost_bps = 0;
    staking.has_verified_badge = false;
    staking.has_premium_benefits = false;
    staking.tier = AccessTier::None;
    staking.api_calls_remaining = 0;
    staking.voting_power = 0;

    emit!(GhostUnstakedEvent {
        agent: owner_key,
        amount,
    });

    msg!("Unstaked {} GHOST for owner: {}", amount, owner_key);

    Ok(())
}

// =====================================================
// SLASH STAKED TOKENS
// =====================================================

/// Slash staked tokens (admin only, for fraud/disputes)
#[derive(Accounts)]
#[instruction(owner: Pubkey)]
pub struct SlashStake<'info> {
    #[account(
        mut,
        seeds = [b"staking", owner.as_ref()],
        bump = staking_account.bump
    )]
    pub staking_account: Account<'info, StakingAccount>,

    #[account(
        seeds = [b"staking_config"],
        bump,
        constraint = staking_config.authority == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub staking_config: Account<'info, StakingConfig>,

    #[account(
        mut,
        seeds = [b"staking_vault", staking_config.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn slash_stake(
    ctx: Context<SlashStake>,
    owner: Pubkey,
    reason: SlashReason,
    custom_amount: Option<u64>,
) -> Result<()> {
    let staking = &mut ctx.accounts.staking_account;
    let config = &ctx.accounts.staking_config;

    // Calculate slash amount
    let slash_bps = match reason {
        SlashReason::Fraud => config.fraud_slash_bps,
        SlashReason::DisputeLoss => config.dispute_slash_bps,
        SlashReason::Custom => {
            require!(custom_amount.is_some(), GhostSpeakError::InvalidInput);
            0 // Will use custom_amount
        }
    };

    let slash_amount = if let Some(custom) = custom_amount {
        custom
    } else {
        (staking.amount_staked as u128 * slash_bps as u128 / 10000) as u64
    };

    require!(slash_amount <= staking.amount_staked, GhostSpeakError::InvalidAmount);

    // Transfer slashed tokens to treasury
    let seeds = &[
        b"staking",
        owner.as_ref(),
        &[staking.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.staking_vault.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
        authority: staking.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds
    );
    token::transfer(cpi_ctx, slash_amount)?;

    // Track old tier for event emission
    let old_tier = staking.tier;

    // Update staking account
    staking.amount_staked = staking.amount_staked.saturating_sub(slash_amount);
    staking.total_slashed = staking.total_slashed.saturating_add(slash_amount);
    staking.calculate_boost(); // Recalculate benefits

    // Emit tier update event if tier changed due to slash
    if old_tier != staking.tier {
        emit!(TierUpdatedEvent {
            agent: owner,
            old_tier,
            new_tier: staking.tier,
            total_staked: staking.amount_staked,
            daily_api_calls: staking.get_daily_api_limit(),
            voting_power: staking.voting_power,
        });
    }

    emit!(GhostSlashedEvent {
        agent: owner,
        amount: slash_amount,
        reason,
        new_tier: staking.tier,
    });

    msg!("Slashed {} GHOST from owner: {} (reason: {:?}, new tier: {:?})",
        slash_amount, owner, reason, staking.tier);

    Ok(())
}
