/*!
 * Escrow Operations Instructions - Enhanced with Reentrancy Protection
 *
 * Implements secure escrow operations for GhostSpeak protocol with comprehensive
 * reentrancy protection following July 2025 security standards.
 */

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_pack::Pack;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_2022::{spl_token_2022, Token2022};
use spl_token_2022::extension::transfer_fee::TransferFeeConfig;
use spl_token_2022::extension::{BaseStateWithExtensions, StateWithExtensions};

use crate::security::ReentrancyGuard;
use crate::state::{
    escrow::{Escrow, EscrowStatus, Payment},
    Agent, MAX_PAYMENT_AMOUNT, MIN_PAYMENT_AMOUNT,
};
use crate::{GhostSpeakError, PaymentProcessedEvent};

// =====================================================
// INSTRUCTION CONTEXTS - WITH REENTRANCY PROTECTION
// =====================================================

#[derive(Accounts)]
#[instruction(task_id: String, amount: u64)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = Escrow::LEN,
        seeds = [b"escrow", task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub client: Signer<'info>,

    /// CHECK: Agent account will be verified in instruction logic
    pub agent: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = payment_token,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = client,
        associated_token::mint = payment_token,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub payment_token: Account<'info, Mint>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidEscrowStatus,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        mut,
        constraint = agent.key() == escrow.agent @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        associated_token::mint = escrow_token_account.mint,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = escrow_token_account.mint,
        associated_token::authority = agent,
    )]
    pub agent_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct DisputeEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidEscrowStatus,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        constraint = authority.key() == escrow.client || authority.key() == escrow.agent
        @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(work_order: Pubkey)]
pub struct ProcessEscrowPayment<'info> {
    #[account(
        init,
        payer = authority,
        space = Payment::LEN,
        seeds = [b"payment", escrow.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,

    #[account(
        mut,
        constraint = escrow.status == EscrowStatus::Completed @ GhostSpeakError::InvalidEscrowStatus,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        mut,
        associated_token::mint = payment_token,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = payment_token,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// CHECK: Recipient will be verified against escrow.agent
    pub recipient: UncheckedAccount<'info>,

    pub payment_token: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidEscrowStatus,
        constraint = authority.key() == escrow.client || Clock::get()?.unix_timestamp > escrow.expires_at @ GhostSpeakError::UnauthorizedAccess
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow.client,
    )]
    pub client_refund_account: Account<'info, TokenAccount>,

    /// The token mint used for payments
    pub payment_token: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct RefundExpiredEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidEscrowStatus,
        constraint = Clock::get()?.unix_timestamp > escrow.expires_at @ GhostSpeakError::EscrowNotExpired
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow.client,
    )]
    pub client_refund_account: Account<'info, TokenAccount>,

    /// The token mint used for payments
    pub payment_token: Account<'info, Mint>,

    /// Can be called by anyone for expired escrows
    #[account(mut)]
    pub caller: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ProcessPartialRefund<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        constraint = escrow.status == EscrowStatus::Disputed @ GhostSpeakError::InvalidEscrowStatus
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow.client,
    )]
    pub client_refund_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = escrow.payment_token,
        associated_token::authority = escrow.agent,
    )]
    pub agent_payment_account: Account<'info, TokenAccount>,

    /// The token mint used for payments
    pub payment_token: Account<'info, Mint>,

    /// Authority to approve partial refunds (dispute resolver/admin)
    #[account(
        constraint = authority.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

// =====================================================
// INSTRUCTION HANDLERS - WITH REENTRANCY PROTECTION
// =====================================================

/// Creates a new escrow account with reentrancy protection
///
/// This instruction establishes an escrow for task completion with funds held
/// securely until work is verified and completed. Includes comprehensive
/// reentrancy protection to prevent double-spending and manipulation attacks.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow and token accounts
/// * `task_id` - Unique identifier for the task (max 64 chars)
/// * `amount` - Payment amount in tokens
/// * `expires_at` - Unix timestamp when escrow expires
/// * `transfer_hook` - Optional SPL-2022 transfer hook address
/// * `is_confidential` - Enable confidential transfers if supported
///
/// # Security Features
///
/// - Reentrancy protection using global guard
/// - Amount validation within protocol limits
/// - Expiration time validation
/// - SPL Token 2022 compliance
/// - PDA canonical bump validation
///
/// # Returns
///
/// Returns `Ok(())` on successful escrow creation
///
/// # Events
///
/// Emits `EscrowCreatedEvent` with escrow details
pub fn create_escrow(
    ctx: Context<CreateEscrow>,
    task_id: String,
    amount: u64,
    expires_at: i64,
    transfer_hook: Option<Pubkey>,
    is_confidential: bool,
) -> Result<()> {
    msg!("Creating escrow - Task: {}, Amount: {}", task_id, amount);

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // SECURITY: Validate input parameters
    require!(
        task_id.len() <= 64 && !task_id.is_empty(),
        GhostSpeakError::InvalidTaskId
    );

    require!(
        amount >= MIN_PAYMENT_AMOUNT && amount <= MAX_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidAmount
    );

    let clock = Clock::get()?;
    require!(
        expires_at > clock.unix_timestamp + 3600, // At least 1 hour in future
        GhostSpeakError::InvalidExpiration
    );

    // Initialize escrow account
    let escrow = &mut ctx.accounts.escrow;
    escrow.initialize(
        ctx.accounts.client.key(),
        ctx.accounts.agent.key(),
        task_id.clone(),
        amount,
        expires_at,
        ctx.accounts.payment_token.key(),
        transfer_hook,
        is_confidential,
        ctx.bumps.escrow,
    )?;

    // SECURITY: Transfer tokens to escrow using SPL Token 2022
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_2022::Transfer {
            from: ctx.accounts.client_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.client.to_account_info(),
        },
    );

    anchor_spl::token_2022::transfer(transfer_ctx, amount)?;

    // Emit escrow creation event
    emit!(crate::EscrowCreatedEvent {
        escrow: ctx.accounts.escrow.key(),
        client: ctx.accounts.client.key(),
        agent: ctx.accounts.agent.key(),
        amount,
        task_id,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    msg!("Escrow created successfully");
    Ok(())
}

/// Completes an escrow and releases funds with reentrancy protection
///
/// Marks the escrow as completed and prepares it for payment processing.
/// Only the agent can complete their assigned tasks.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow account and authority
/// * `resolution_notes` - Optional completion notes
///
/// # Security Features
///
/// - Reentrancy protection
/// - Agent authorization verification
/// - Escrow status validation
/// - Input length validation
///
/// # Returns
///
/// Returns `Ok(())` on successful completion
pub fn complete_escrow(
    ctx: Context<CompleteEscrow>,
    resolution_notes: Option<String>,
) -> Result<()> {
    msg!("Completing escrow: {}", ctx.accounts.escrow.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // SECURITY: Verify agent authority
    require!(
        ctx.accounts.authority.key() == ctx.accounts.agent.key(),
        GhostSpeakError::UnauthorizedAccess
    );

    // Complete the escrow
    let escrow = &mut ctx.accounts.escrow;
    let escrow_key = escrow.key();
    let client = escrow.client;
    let agent = escrow.agent;
    let amount = escrow.amount;
    escrow.complete(resolution_notes.clone())?;

    // Emit escrow completion event
    let clock = Clock::get()?;
    emit!(crate::EscrowCompletedEvent {
        escrow: escrow_key,
        client,
        agent,
        amount,
        resolution_notes,
        timestamp: clock.unix_timestamp,
    });

    msg!("Escrow completed successfully");
    Ok(())
}

/// Initiates a dispute for an active escrow with reentrancy protection
///
/// Allows either client or agent to dispute an escrow, freezing it
/// until resolution through governance or manual intervention.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow account
/// * `dispute_reason` - Reason for the dispute (max 256 chars)
///
/// # Security Features
///
/// - Reentrancy protection
/// - Authority verification (client or agent only)
/// - Input validation
/// - Status transition validation
///
/// # Returns
///
/// Returns `Ok(())` on successful dispute initiation
pub fn dispute_escrow(ctx: Context<DisputeEscrow>, dispute_reason: String) -> Result<()> {
    msg!("Disputing escrow: {}", ctx.accounts.escrow.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // Validate dispute reason length
    require!(
        !dispute_reason.is_empty() && dispute_reason.len() <= 256,
        GhostSpeakError::InvalidInput
    );

    // Dispute the escrow
    let escrow = &mut ctx.accounts.escrow;
    escrow.dispute(dispute_reason)?;

    msg!("Escrow disputed successfully");
    Ok(())
}

/// Processes payment from completed escrow with reentrancy protection
///
/// Transfers tokens from escrow to agent after successful completion.
/// This is the final step that releases funds to the service provider.
///
/// # Arguments
///
/// * `ctx` - The context containing payment and token accounts
/// * `work_order` - Related work order key for tracking
///
/// # Security Features
///
/// - Reentrancy protection using global guard
/// - Escrow completion status validation
/// - Token account ownership verification
/// - Safe token transfer with SPL Token 2022
/// - Payment record creation
///
/// # Returns
///
/// Returns `Ok(())` on successful payment processing
pub fn process_escrow_payment(
    ctx: Context<ProcessEscrowPayment>,
    work_order: Pubkey,
) -> Result<()> {
    msg!("Processing escrow payment: {}", ctx.accounts.escrow.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    let escrow = &ctx.accounts.escrow;

    // SECURITY: Verify recipient is the agent from escrow
    require!(
        ctx.accounts.recipient.key() == escrow.agent,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Verify token accounts match escrow payment token
    require!(
        ctx.accounts.escrow_token_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    // Transfer tokens from escrow to agent
    let _escrow_key = ctx.accounts.escrow.key();
    let signer_seeds = &[b"escrow", escrow.task_id.as_bytes(), &[escrow.bump]];
    let signer = &[&signer_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_2022::Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        },
        signer,
    );

    anchor_spl::token_2022::transfer(transfer_ctx, escrow.amount)?;

    // Create payment record
    let payment = &mut ctx.accounts.payment;
    let clock = Clock::get()?;

    payment.work_order = work_order;
    payment.payer = escrow.client;
    payment.recipient = escrow.agent;
    payment.amount = escrow.amount;
    payment.token_mint = escrow.payment_token;
    payment.is_confidential = escrow.is_confidential;
    payment.paid_at = clock.unix_timestamp;
    payment.transfer_hook = escrow.transfer_hook;
    // Detect if SPL-2022 transfer fee was applied
    payment.transfer_fee_applied = detect_transfer_fee(&ctx.accounts.payment_token)?;
    payment.bump = ctx.bumps.payment;

    // Emit payment processed event
    emit!(PaymentProcessedEvent {
        work_order,
        from: payment.payer,
        to: payment.recipient,
        amount: payment.amount,
        timestamp: payment.paid_at,
    });

    msg!("Escrow payment processed successfully");
    Ok(())
}

/// Detects if a mint has the SPL-2022 transfer fee extension enabled
///
/// This function checks if the provided mint account has the transfer fee
/// extension enabled by examining the account data structure.
///
/// # Arguments
///
/// * `mint_account` - The mint account to check for transfer fee extension
///
/// # Returns
///
/// Returns `Ok(true)` if transfer fee is enabled, `Ok(false)` otherwise
fn detect_transfer_fee(mint_account: &Account<Mint>) -> Result<bool> {
    // Get the mint account info
    let mint_info = mint_account.to_account_info();

    // Check if this is a Token-2022 mint by examining the owner
    if mint_info.owner != &spl_token_2022::ID {
        // This is a regular SPL token, no transfer fee
        return Ok(false);
    }

    // For Token-2022 mints, we need to check for extensions
    let mint_data = mint_info.try_borrow_data()?;

    // Check if the account size indicates possible extensions
    if mint_data.len() <= spl_token_2022::state::Mint::LEN {
        // No extensions present
        return Ok(false);
    }

    // Try to unpack the mint with extensions
    match StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data) {
        Ok(mint_with_extensions) => {
            // Check if transfer fee extension exists
            match mint_with_extensions.get_extension::<TransferFeeConfig>() {
                Ok(_transfer_fee_config) => {
                    msg!("Transfer fee extension detected on mint");
                    Ok(true)
                }
                Err(_) => Ok(false),
            }
        }
        Err(_) => {
            // Failed to unpack, assume no extensions
            Ok(false)
        }
    }
}

/// Cancels an active escrow and refunds tokens to the client
///
/// This instruction allows the client to cancel an escrow, or anyone to cancel
/// an expired escrow. It transfers the full amount back to the client and
/// updates the escrow status to Cancelled.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow and token accounts
/// * `cancellation_reason` - Reason for cancellation
///
/// # Security Features
///
/// - Reentrancy protection
/// - Authority validation (client or expired escrow)
/// - SPL Token 2022 refund transfer
/// - Status validation and update
///
/// # Returns
///
/// Returns `Ok(())` on successful cancellation and refund
pub fn cancel_escrow(ctx: Context<CancelEscrow>, cancellation_reason: String) -> Result<()> {
    msg!("Cancelling escrow: {}", ctx.accounts.escrow.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // Get escrow account info before mutable borrow
    let escrow_account_info = ctx.accounts.escrow.to_account_info();

    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Validate cancellation reason length
    require!(
        !cancellation_reason.is_empty() && cancellation_reason.len() <= 256,
        GhostSpeakError::InvalidInput
    );

    // Verify token accounts match escrow payment token
    require!(
        ctx.accounts.escrow_token_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    require!(
        ctx.accounts.client_refund_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    // Store values we need
    let escrow_amount = escrow.amount;
    let escrow_key = escrow.key();
    let client_key = escrow.client;
    let agent_key = escrow.agent;

    // Transfer tokens from escrow back to client
    let signer_seeds = &[b"escrow", escrow.task_id.as_bytes(), &[escrow.bump]];
    let signer = &[&signer_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_2022::Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.client_refund_account.to_account_info(),
            authority: escrow_account_info,
        },
        signer,
    );

    anchor_spl::token_2022::transfer(transfer_ctx, escrow_amount)?;

    // Update escrow status
    escrow.status = EscrowStatus::Cancelled;
    escrow.dispute_reason = Some(cancellation_reason.clone());

    // Emit cancellation event
    emit!(crate::EscrowCancelledEvent {
        escrow: escrow_key,
        client: client_key,
        agent: agent_key,
        amount_refunded: escrow_amount,
        cancellation_reason,
        timestamp: clock.unix_timestamp,
    });

    msg!("Escrow cancelled and refund processed successfully");
    Ok(())
}

/// Refunds an expired escrow back to the client
///
/// This instruction can be called by anyone to process refunds for escrows
/// that have passed their expiration time. It ensures expired funds don't
/// remain locked indefinitely.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow and token accounts
///
/// # Security Features
///
/// - Reentrancy protection
/// - Expiration time validation
/// - SPL Token 2022 refund transfer
/// - Can be called by anyone for expired escrows
///
/// # Returns
///
/// Returns `Ok(())` on successful refund processing
pub fn refund_expired_escrow(ctx: Context<RefundExpiredEscrow>) -> Result<()> {
    msg!(
        "Processing expired escrow refund: {}",
        ctx.accounts.escrow.key()
    );

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // Get escrow account info before mutable borrow
    let escrow_account_info = ctx.accounts.escrow.to_account_info();

    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Verify token accounts match escrow payment token
    require!(
        ctx.accounts.escrow_token_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    require!(
        ctx.accounts.client_refund_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    // Store values we need
    let escrow_amount = escrow.amount;
    let escrow_key = escrow.key();
    let client_key = escrow.client;
    let agent_key = escrow.agent;
    let expires_at = escrow.expires_at;

    // Transfer tokens from escrow back to client
    let signer_seeds = &[b"escrow", escrow.task_id.as_bytes(), &[escrow.bump]];
    let signer = &[&signer_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_2022::Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.client_refund_account.to_account_info(),
            authority: escrow_account_info,
        },
        signer,
    );

    anchor_spl::token_2022::transfer(transfer_ctx, escrow_amount)?;

    // Update escrow status
    escrow.status = EscrowStatus::Cancelled;
    escrow.dispute_reason = Some("Escrow expired".to_string());

    // Emit expired refund event
    emit!(crate::EscrowExpiredEvent {
        escrow: escrow_key,
        client: client_key,
        agent: agent_key,
        amount_refunded: escrow_amount,
        expired_at: expires_at,
        refunded_at: clock.unix_timestamp,
    });

    msg!("Expired escrow refund processed successfully");
    Ok(())
}

/// Processes a partial refund for disputed escrows
///
/// This instruction is used by authorized dispute resolvers to split escrowed
/// funds between client and agent based on dispute resolution outcome.
///
/// # Arguments
///
/// * `ctx` - The context containing escrow and token accounts  
/// * `client_refund_percentage` - Percentage (0-100) to refund to client
///
/// # Security Features
///
/// - Reentrancy protection
/// - Admin/dispute resolver authorization
/// - Percentage validation
/// - Dual SPL Token 2022 transfers
///
/// # Returns
///
/// Returns `Ok(())` on successful partial refund processing
pub fn process_partial_refund(
    ctx: Context<ProcessPartialRefund>,
    client_refund_percentage: u8,
) -> Result<()> {
    msg!(
        "Processing partial refund for escrow: {}",
        ctx.accounts.escrow.key()
    );

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // Get escrow account info before mutable borrow
    let escrow_account_info = ctx.accounts.escrow.to_account_info();

    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Validate percentage
    require!(
        client_refund_percentage <= 100,
        GhostSpeakError::InvalidInput
    );

    // Verify token accounts match escrow payment token
    require!(
        ctx.accounts.escrow_token_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    require!(
        ctx.accounts.client_refund_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    require!(
        ctx.accounts.agent_payment_account.mint == escrow.payment_token,
        GhostSpeakError::InvalidConfiguration
    );

    // Store values we need
    let escrow_key = escrow.key();
    let client_key = escrow.client;
    let agent_key = escrow.agent;

    // Calculate refund amounts
    let client_refund = (escrow.amount as u128 * client_refund_percentage as u128 / 100) as u64;
    let agent_payment = escrow.amount - client_refund;

    // Set up signer for escrow account
    let signer_seeds = &[b"escrow", escrow.task_id.as_bytes(), &[escrow.bump]];
    let signer = &[&signer_seeds[..]];

    // Transfer refund to client if amount > 0
    if client_refund > 0 {
        let client_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.client_refund_account.to_account_info(),
                authority: escrow_account_info.clone(),
            },
            signer,
        );

        anchor_spl::token_2022::transfer(client_transfer_ctx, client_refund)?;
        msg!("Transferred {} tokens to client", client_refund);
    }

    // Transfer payment to agent if amount > 0
    if agent_payment > 0 {
        let agent_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.agent_payment_account.to_account_info(),
                authority: escrow_account_info.clone(),
            },
            signer,
        );

        anchor_spl::token_2022::transfer(agent_transfer_ctx, agent_payment)?;
        msg!("Transferred {} tokens to agent", agent_payment);
    }

    // Update escrow status
    escrow.status = EscrowStatus::Resolved;
    escrow.resolution_notes = Some(format!(
        "Partial refund: {}% to client, {}% to agent",
        client_refund_percentage,
        100 - client_refund_percentage
    ));

    // Emit partial refund event
    emit!(crate::EscrowPartialRefundEvent {
        escrow: escrow_key,
        client: client_key,
        agent: agent_key,
        client_refund,
        agent_payment,
        refund_percentage: client_refund_percentage,
        timestamp: clock.unix_timestamp,
    });

    msg!("Partial refund processed successfully");
    Ok(())
}
