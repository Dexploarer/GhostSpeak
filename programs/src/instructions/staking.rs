/*!
 * Staking Instructions
 *
 * Implements staking functionality for GHOST token lockup and governance voting power.
 * Users can stake tokens with optional lockup periods to earn rewards and increase
 * their voting power in the x402 marketplace governance.
 *
 * Supports Token-2022 with transfer fee extensions.
 */

use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_token_2022::extension::transfer_fee::{
    instruction::transfer_checked_with_fee, TransferFeeConfig,
};
use spl_token_2022::extension::{BaseStateWithExtensions, StateWithExtensions};

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

    /// GHOST token mint (for transfer fee calculation)
    #[account(
        constraint = ghost_mint.key() == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub ghost_mint: InterfaceAccount<'info, Mint>,

    /// User's token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount,
        constraint = user_token_account.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Staking vault (holds staked tokens)
    #[account(
        mut,
        constraint = staking_vault.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub staking_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
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

    /// GHOST token mint (for transfer fee calculation)
    #[account(
        constraint = ghost_mint.key() == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub ghost_mint: InterfaceAccount<'info, Mint>,

    /// User's token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount,
        constraint = user_token_account.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Staking vault
    #[account(
        mut,
        constraint = staking_vault.mint == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub staking_vault: InterfaceAccount<'info, TokenAccount>,

    /// Vault authority PDA
    /// CHECK: PDA verified in seeds
    #[account(seeds = [b"staking_vault_authority"], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
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

    /// GHOST token mint (for transfer fee calculation)
    #[account(
        constraint = ghost_mint.key() == staking_config.ghost_token_mint @ GhostSpeakError::InvalidTokenAccount
    )]
    pub ghost_mint: InterfaceAccount<'info, Mint>,

    /// User's token account for reward payout
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ GhostSpeakError::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Rewards treasury
    #[account(
        mut,
        constraint = rewards_treasury.key() == staking_config.rewards_treasury @ GhostSpeakError::InvalidTokenAccount
    )]
    pub rewards_treasury: InterfaceAccount<'info, TokenAccount>,

    /// Treasury authority PDA
    /// CHECK: PDA verified in seeds
    #[account(seeds = [b"rewards_treasury_authority"], bump)]
    pub treasury_authority: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
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
// TOKEN-2022 HELPER FUNCTIONS
// =====================================================

/// Calculates the transfer fee for Token-2022 mints with TransferFeeConfig extension
/// Returns (amount_after_fee, fee_amount)
fn calculate_transfer_fee(mint_account: &AccountInfo, transfer_amount: u64) -> Result<(u64, u64)> {
    let mint_data = mint_account.try_borrow_data()?;

    // Check if this is a Token-2022 mint with transfer fee extension
    if let Ok(mint) = StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data) {
        if let Ok(transfer_fee_config) = mint.get_extension::<TransferFeeConfig>() {
            let epoch = Clock::get()?.epoch;
            let fee = transfer_fee_config
                .calculate_epoch_fee(epoch, transfer_amount)
                .unwrap_or(0);

            let amount_after_fee = transfer_amount.saturating_sub(fee);
            return Ok((amount_after_fee, fee));
        }
    }

    // No transfer fee - return original amount
    Ok((transfer_amount, 0))
}

/// Performs a Token-2022 transfer with proper fee handling
fn transfer_with_fee_support<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
    signers_seeds: &[&[&[u8]]],
) -> Result<()> {
    let (_amount_after_fee, fee) = calculate_transfer_fee(&mint, amount)?;

    if fee > 0 {
        msg!("Token-2022 transfer fee: {} tokens", fee);

        // Get decimals for transfer_checked
        let decimals = {
            let mint_data = mint.try_borrow_data()?;
            let mint_state =
                StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;
            mint_state.base.decimals
        };

        let ix = transfer_checked_with_fee(
            &spl_token_2022::id(),
            &from.key(),
            &mint.key(),
            &to.key(),
            &authority.key(),
            &[],
            amount,
            decimals,
            fee,
        )?;

        if signers_seeds.is_empty() {
            anchor_lang::solana_program::program::invoke(&ix, &[from, mint, to, authority])?;
        } else {
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[from, mint, to, authority],
                signers_seeds,
            )?;
        }
    } else {
        // Use regular transfer for non-fee tokens
        let cpi_accounts = anchor_spl::token_2022::Transfer {
            from,
            to,
            authority,
        };

        if signers_seeds.is_empty() {
            let cpi_ctx = CpiContext::new(token_program, cpi_accounts);
            anchor_spl::token_2022::transfer(cpi_ctx, amount)?;
        } else {
            let cpi_ctx = CpiContext::new_with_signer(token_program, cpi_accounts, signers_seeds);
            anchor_spl::token_2022::transfer(cpi_ctx, amount)?;
        }
    }

    Ok(())
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

    // Calculate transfer fee to determine net staked amount
    let (amount_after_fee, fee) =
        calculate_transfer_fee(&ctx.accounts.ghost_mint.to_account_info(), amount)?;

    if fee > 0 {
        msg!(
            "Staking {} tokens (fee: {} tokens, net: {} tokens)",
            amount,
            fee,
            amount_after_fee
        );
    }

    // Transfer tokens to vault using Token-2022 with fee support
    transfer_with_fee_support(
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.staking_vault.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.ghost_mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
        &[],
    )?;

    // Update staking account with NET amount (after fees)
    staking_account.staked_amount = staking_account
        .staked_amount
        .saturating_add(amount_after_fee);
    staking_account.staked_at = clock.unix_timestamp;
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;

    // Set lockup if specified and not already locked
    if lockup_tier > 0 && lockup_tier > staking_account.lockup_tier {
        let lockup_duration = StakingAccount::lockup_duration_from_tier(lockup_tier);
        staking_account.lockup_tier = lockup_tier;
        staking_account.lockup_ends_at = clock.unix_timestamp + lockup_duration;
    }

    // Update global stats with net amount
    staking_config.total_staked = staking_config.total_staked.saturating_add(amount_after_fee);
    staking_config.updated_at = clock.unix_timestamp;

    msg!(
        "Staked {} tokens (net) with tier {} lockup, ends at {}",
        amount_after_fee,
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

    // Calculate transfer fee for user awareness
    let (amount_after_fee, fee) =
        calculate_transfer_fee(&ctx.accounts.ghost_mint.to_account_info(), amount)?;

    if fee > 0 {
        msg!(
            "Unstaking {} tokens (fee: {} tokens, user receives: {} tokens)",
            amount,
            fee,
            amount_after_fee
        );
    }

    // Transfer tokens back to user using Token-2022 with fee support
    let seeds = &[
        b"staking_vault_authority".as_ref(),
        &[ctx.bumps.vault_authority],
    ];
    let signer_seeds = &[&seeds[..]];

    transfer_with_fee_support(
        ctx.accounts.staking_vault.to_account_info(),
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.ghost_mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
        signer_seeds,
    )?;

    // Update staking account (debit full amount, user receives net)
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
        "Unstaked {} tokens (user receives {}), remaining: {}",
        amount,
        amount_after_fee,
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

    // Calculate transfer fee for user awareness
    let (amount_after_fee, fee) =
        calculate_transfer_fee(&ctx.accounts.ghost_mint.to_account_info(), total_rewards)?;

    if fee > 0 {
        msg!(
            "Claiming {} rewards (fee: {} tokens, user receives: {} tokens)",
            total_rewards,
            fee,
            amount_after_fee
        );
    }

    // Transfer rewards from treasury using Token-2022 with fee support
    let seeds = &[
        b"rewards_treasury_authority".as_ref(),
        &[ctx.bumps.treasury_authority],
    ];
    let signer_seeds = &[&seeds[..]];

    transfer_with_fee_support(
        ctx.accounts.rewards_treasury.to_account_info(),
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.treasury_authority.to_account_info(),
        ctx.accounts.ghost_mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        total_rewards,
        signer_seeds,
    )?;

    // Update staking account
    staking_account.pending_rewards = 0;
    staking_account.rewards_claimed = staking_account
        .rewards_claimed
        .saturating_add(total_rewards);
    staking_account.last_claim_at = clock.unix_timestamp;
    staking_account.updated_at = clock.unix_timestamp;

    msg!(
        "Claimed {} rewards (user receives {}), total claimed: {}",
        total_rewards,
        amount_after_fee,
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
