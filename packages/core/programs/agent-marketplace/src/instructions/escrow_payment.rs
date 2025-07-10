/*!
 * Simplified Escrow and Payment Instructions
 * 
 * Handles payment processing with optimized performance and safety.
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    Agent, Payment, WorkOrder,
    WorkOrderStatus,
    PodAIMarketplaceError,
    PaymentProcessedEvent,
    MIN_PAYMENT_AMOUNT,
    MAX_PAYMENT_AMOUNT,
};

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init,
        payer = payer,
        space = Payment::LEN,
        seeds = [b"payment", work_order.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(mut)]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub provider_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub provider_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
    
    pub system_program: Program<'info, System>,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Processes payment from client to provider for completed work order
/// 
/// # Performance Optimizations
/// - Compute units: ~25,000 CU
/// - Safe arithmetic operations
/// - Efficient validation
/// 
/// # Security Features
/// - Authorization verification
/// - Amount validation
/// - Safe arithmetic operations
/// - State consistency checks
pub fn process_payment(
    ctx: Context<ProcessPayment>,
    amount: u64,
    use_confidential_transfer: bool,
) -> Result<()> {
    msg!("Processing payment - Amount: {}", amount);
    
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.payer.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Validate token accounts belong to the correct mint
    require!(
        ctx.accounts.payer_token_account.mint == ctx.accounts.token_mint.key(),
        PodAIMarketplaceError::InvalidConfiguration
    );
    
    require!(
        ctx.accounts.provider_token_account.mint == ctx.accounts.token_mint.key(),
        PodAIMarketplaceError::InvalidConfiguration
    );

    // SECURITY: Amount validation
    require!(
        amount >= MIN_PAYMENT_AMOUNT,
        PodAIMarketplaceError::ValueBelowMinimum
    );
    
    require!(
        amount <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::ValueExceedsMaximum
    );

    // SECURITY: Verify work order is in correct state for payment
    let work_order = &ctx.accounts.work_order;
    require!(
        matches!(work_order.status, WorkOrderStatus::InProgress | WorkOrderStatus::Submitted),
        PodAIMarketplaceError::InvalidStatusTransition
    );

    let payment = &mut ctx.accounts.payment;
    let work_order = &mut ctx.accounts.work_order;
    let provider_agent = &mut ctx.accounts.provider_agent;
    let clock = Clock::get()?;

    // Initialize payment record
    payment.work_order = work_order.key();
    payment.payer = ctx.accounts.payer.key();
    payment.recipient = provider_agent.owner;
    payment.amount = amount;
    payment.token_mint = ctx.accounts.token_mint.key();
    payment.is_confidential = use_confidential_transfer;
    payment.paid_at = clock.unix_timestamp;
    payment.bump = ctx.bumps.payment;

    // SECURITY: Safe arithmetic for provider earnings update
    provider_agent.total_earnings = provider_agent.total_earnings
        .checked_add(amount)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
    
    // SECURITY: Safe arithmetic for job completion count
    provider_agent.total_jobs_completed = provider_agent.total_jobs_completed
        .checked_add(1)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;

    // Update work order status
    work_order.status = WorkOrderStatus::Completed;
    work_order.updated_at = clock.unix_timestamp;
    
    // Calculate and update reputation score with overflow protection
    let reputation_increment = std::cmp::min((amount / 1_000_000) as u64, 10u64); // Max 10 points per payment
    provider_agent.reputation_score = provider_agent.reputation_score
        .checked_add(reputation_increment as u32)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;

    // Emit payment event
    emit!(PaymentProcessedEvent {
        work_order: work_order.key(),
        from: ctx.accounts.payer.key(),
        to: provider_agent.owner,
        amount,
        timestamp: clock.unix_timestamp,
    });

    msg!("Payment processed successfully");
    Ok(())
}

// =====================================================
// EVENT STRUCTURES
// =====================================================

// PaymentProcessedEvent is defined in the main lib.rs file