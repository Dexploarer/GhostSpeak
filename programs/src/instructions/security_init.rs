/*!
 * Security Initialization Instructions
 * 
 * Provides instructions for initializing security infrastructure
 * including the global reentrancy guard.
 */

use anchor_lang::prelude::*;
use crate::security::{ReentrancyGuard, ReentrancyState};

/// Account context for initializing the reentrancy guard
#[derive(Accounts)]
pub struct InitReentrancyGuard<'info> {
    #[account(
        init,
        payer = authority,
        space = ReentrancyGuard::LEN,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Initialize the global reentrancy guard PDA
/// 
/// This must be called once by a program admin before any 
/// reentrancy-protected instructions can be used.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the reentrancy guard account
/// 
/// # Returns
/// 
/// * `Ok(())` on successful initialization
pub fn init_reentrancy_guard(ctx: Context<InitReentrancyGuard>) -> Result<()> {
    let guard = &mut ctx.accounts.reentrancy_guard;
    let clock = Clock::get()?;
    
    guard.state = ReentrancyState::Unlocked;
    guard.nonce = 0;
    guard.last_interaction = clock.unix_timestamp;
    guard.authority = ctx.accounts.authority.key();
    guard.bump = ctx.bumps.reentrancy_guard;
    
    msg!("Reentrancy guard initialized successfully");
    msg!("Authority: {}", ctx.accounts.authority.key());
    msg!("Bump: {}", ctx.bumps.reentrancy_guard);
    
    Ok(())
}

/// Account context for resetting a stuck reentrancy guard
#[derive(Accounts)]
pub struct ResetReentrancyGuard<'info> {
    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump,
        constraint = reentrancy_guard.authority == authority.key() @ crate::GhostSpeakError::UnauthorizedAccess
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Reset a stuck reentrancy guard
/// 
/// This can only be called by the original authority that initialized the guard.
/// Use this to recover from stuck states after failed transactions.
/// 
/// # Security
/// 
/// - Only the original authority can reset the guard
/// - This should only be used for recovery, not normal operations
pub fn reset_reentrancy_guard(ctx: Context<ResetReentrancyGuard>) -> Result<()> {
    let guard = &mut ctx.accounts.reentrancy_guard;
    let clock = Clock::get()?;
    
    // Log the reset for audit purposes
    msg!("Resetting reentrancy guard");
    msg!("Previous state: {:?}", guard.state);
    msg!("Reset by authority: {}", ctx.accounts.authority.key());
    
    guard.state = ReentrancyState::Unlocked;
    guard.last_interaction = clock.unix_timestamp;
    guard.nonce = guard.nonce.saturating_add(1); // Increment nonce to invalidate any pending operations
    
    msg!("Reentrancy guard reset successfully");
    
    Ok(())
}
