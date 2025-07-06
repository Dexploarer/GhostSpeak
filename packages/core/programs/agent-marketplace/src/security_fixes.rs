/*!
 * SECURITY-HARDENED FUNCTIONS FOR GHOSTSPEAK MARKETPLACE
 * 
 * This file contains secure implementations of critical functions
 * following 2025 Solana security best practices.
 * 
 * Use these patterns to update the main lib.rs file.
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

// =============================================================================
// ENHANCED ERROR HANDLING
// =============================================================================

#[error_code]
pub enum SecurityErrors {
    #[msg("Unauthorized access - signer verification failed")]
    UnauthorizedAccess,
    #[msg("Invalid amount - must be greater than 0")]
    InvalidAmount,
    #[msg("Arithmetic overflow detected")]
    Overflow,
    #[msg("Input string exceeds maximum length")]
    InputTooLong,
    #[msg("Invalid account owner")]
    InvalidOwner,
    #[msg("Account already initialized")]
    AlreadyInitialized,
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Transfer amount exceeds maximum")]
    AmountTooLarge,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
}

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_CAPABILITIES_COUNT: usize = 20;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// =============================================================================
// SECURE AGENT REGISTRATION
// =============================================================================

pub fn register_agent_secure(
    ctx: Context<RegisterAgentSecure>,
    agent_data: AgentRegistrationDataSecure,
) -> Result<()> {
    // CRITICAL: Verify signer
    require!(
        ctx.accounts.owner.is_signer,
        SecurityErrors::UnauthorizedAccess
    );

    // CRITICAL: Input validation
    require!(
        !agent_data.name.is_empty() && agent_data.name.len() <= MAX_NAME_LENGTH,
        SecurityErrors::InputTooLong
    );
    
    require!(
        agent_data.description.len() <= MAX_DESCRIPTION_LENGTH,
        SecurityErrors::InputTooLong
    );
    
    require!(
        agent_data.capabilities.len() <= MAX_CAPABILITIES_COUNT,
        SecurityErrors::InputTooLong
    );

    // CRITICAL: Financial validation with overflow protection
    let replication_fee = if agent_data.is_replicable {
        require!(
            agent_data.replication_fee > 0 && agent_data.replication_fee <= MAX_PAYMENT_AMOUNT,
            SecurityErrors::InvalidAmount
        );
        agent_data.replication_fee
    } else {
        0
    };

    let agent_account = &mut ctx.accounts.agent;
    
    // CRITICAL: Prevent re-initialization
    require!(
        agent_account.owner == Pubkey::default(),
        SecurityErrors::AlreadyInitialized
    );

    // Safe assignment with validated data
    agent_account.owner = ctx.accounts.owner.key();
    agent_account.name = agent_data.name;
    agent_account.description = agent_data.description;
    agent_account.capabilities = agent_data.capabilities;
    agent_account.pricing_model = agent_data.pricing_model;
    agent_account.reputation_score = 100; // Starting reputation
    agent_account.total_jobs_completed = 0;
    agent_account.total_earnings = 0;
    agent_account.is_active = true;
    agent_account.created_at = Clock::get()?.unix_timestamp;
    agent_account.updated_at = Clock::get()?.unix_timestamp;
    agent_account.genome_hash = agent_data.genome_hash;
    agent_account.is_replicable = agent_data.is_replicable;
    agent_account.replication_fee = replication_fee;
    agent_account.bump = ctx.bumps.agent;

    // Emit event for transparency
    emit!(AgentRegisteredSecure {
        agent: agent_account.key(),
        owner: ctx.accounts.owner.key(),
        name: agent_data.name.clone(),
        capabilities: agent_data.capabilities.clone(),
        is_replicable: agent_data.is_replicable,
        replication_fee,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAgentSecure<'info> {
    #[account(
        init,
        payer = owner,
        space = Agent::LEN,
        seeds = [b"agent", owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// =============================================================================
// SECURE PAYMENT PROCESSING
// =============================================================================

pub fn process_payment_secure(
    ctx: Context<ProcessPaymentSecure>,
    amount: u64,
    use_confidential_transfer: bool,
) -> Result<()> {
    // CRITICAL: Verify signer
    require!(
        ctx.accounts.payer.is_signer,
        SecurityErrors::UnauthorizedAccess
    );

    // CRITICAL: Amount validation with overflow protection
    require!(
        amount >= MIN_PAYMENT_AMOUNT && amount <= MAX_PAYMENT_AMOUNT,
        SecurityErrors::InvalidAmount
    );

    let provider_agent = &mut ctx.accounts.provider_agent;
    let work_order = &mut ctx.accounts.work_order;

    // CRITICAL: Verify work order belongs to the provider
    require!(
        work_order.provider == provider_agent.key(),
        SecurityErrors::UnauthorizedAccess
    );

    // CRITICAL: Verify payment amount matches work order
    require!(
        amount == work_order.payment_amount,
        SecurityErrors::InvalidAmount
    );

    // CRITICAL: Check provider balance won't overflow
    let new_earnings = provider_agent.total_earnings
        .checked_add(amount)
        .ok_or(SecurityErrors::Overflow)?;

    // CRITICAL: Update job count with overflow protection
    let new_job_count = provider_agent.total_jobs_completed
        .checked_add(1)
        .ok_or(SecurityErrors::Overflow)?;

    // Perform token transfer with proper error handling
    let transfer_instruction = if use_confidential_transfer {
        // Handle confidential transfer (simplified)
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.provider_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.token_mint.decimals,
        )
    } else {
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.provider_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.token_mint.decimals,
        )
    };

    transfer_instruction?;

    // Update state only after successful transfer
    provider_agent.total_earnings = new_earnings;
    provider_agent.total_jobs_completed = new_job_count;
    work_order.status = WorkOrderStatus::Completed;

    // Initialize payment record
    let payment = &mut ctx.accounts.payment;
    payment.work_order = work_order.key();
    payment.payer = ctx.accounts.payer.key();
    payment.recipient = provider_agent.owner;
    payment.amount = amount;
    payment.token_mint = ctx.accounts.token_mint.key();
    payment.is_confidential = use_confidential_transfer;
    payment.paid_at = Clock::get()?.unix_timestamp;
    payment.bump = ctx.bumps.payment;

    emit!(PaymentProcessedSecure {
        payment: payment.key(),
        work_order: work_order.key(),
        payer: ctx.accounts.payer.key(),
        recipient: provider_agent.owner,
        amount,
        is_confidential: use_confidential_transfer,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ProcessPaymentSecure<'info> {
    #[account(
        init,
        payer = payer,
        space = Payment::LEN,
        seeds = [b"payment", work_order.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(
        mut,
        constraint = work_order.status == WorkOrderStatus::InProgress
    )]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(
        mut,
        constraint = provider_agent.is_active,
        has_one = owner @ SecurityErrors::UnauthorizedAccess
    )]
    pub provider_agent: Account<'info, Agent>,
    
    /// CHECK: This is the owner of the provider agent
    pub owner: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key(),
        constraint = payer_token_account.mint == token_mint.key()
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = provider_token_account.owner == provider_agent.owner,
        constraint = provider_token_account.mint == token_mint.key()
    )]
    pub provider_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

// =============================================================================
// SECURE AUCTION FUNCTIONALITY
// =============================================================================

pub fn place_auction_bid_secure(
    ctx: Context<PlaceAuctionBidSecure>,
    bid_amount: u64,
) -> Result<()> {
    // CRITICAL: Verify signer
    require!(
        ctx.accounts.bidder.is_signer,
        SecurityErrors::UnauthorizedAccess
    );

    let auction = &mut ctx.accounts.auction;
    let current_time = Clock::get()?.unix_timestamp;

    // CRITICAL: Validate auction is active
    require!(
        auction.status == AuctionStatus::Active,
        SecurityErrors::InvalidAmount
    );

    // CRITICAL: Check auction hasn't ended
    require!(
        current_time < auction.auction_end_time,
        SecurityErrors::InvalidAmount
    );

    // CRITICAL: Validate bid amount with overflow protection
    require!(
        bid_amount >= MIN_PAYMENT_AMOUNT && bid_amount <= MAX_PAYMENT_AMOUNT,
        SecurityErrors::InvalidAmount
    );

    // CRITICAL: Ensure bid meets minimum increment
    let minimum_bid = auction.current_bid
        .checked_add(auction.minimum_bid_increment)
        .ok_or(SecurityErrors::Overflow)?;
    
    require!(
        bid_amount >= minimum_bid,
        SecurityErrors::InvalidAmount
    );

    // CRITICAL: Prevent self-bidding
    require!(
        Some(ctx.accounts.bidder.key()) != auction.current_bidder,
        SecurityErrors::UnauthorizedAccess
    );

    // CRITICAL: Update total bids with overflow protection
    let new_total_bids = auction.total_bids
        .checked_add(1)
        .ok_or(SecurityErrors::Overflow)?;

    // Update auction state
    auction.current_bid = bid_amount;
    auction.current_bidder = Some(ctx.accounts.bidder.key());
    auction.total_bids = new_total_bids;

    emit!(AuctionBidPlacedSecure {
        auction: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        bid_amount,
        total_bids: new_total_bids,
        auction_end_time: auction.auction_end_time,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct PlaceAuctionBidSecure<'info> {
    #[account(
        mut,
        constraint = auction.is_active @ SecurityErrors::InvalidAmount
    )]
    pub auction: Account<'info, AuctionMarketplace>,
    
    #[account(mut)]
    pub bidder: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// =============================================================================
// SECURE DATA STRUCTURES
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentRegistrationDataSecure {
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
}

// =============================================================================
// SECURITY EVENTS
// =============================================================================

#[event]
pub struct AgentRegisteredSecure {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub capabilities: Vec<String>,
    pub is_replicable: bool,
    pub replication_fee: u64,
}

#[event]
pub struct PaymentProcessedSecure {
    pub payment: Pubkey,
    pub work_order: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub is_confidential: bool,
}

#[event]
pub struct AuctionBidPlacedSecure {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub bid_amount: u64,
    pub total_bids: u32,
    pub auction_end_time: i64,
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/// Validates that a PDA was derived correctly with canonical bump
pub fn validate_pda(
    address: &Pubkey,
    seeds: &[&[u8]],
    program_id: &Pubkey,
) -> Result<()> {
    let (derived_address, _bump) = Pubkey::find_program_address(seeds, program_id);
    require!(
        *address == derived_address,
        SecurityErrors::InvalidPDA
    );
    Ok(())
}

/// Safely calculates percentage with overflow protection
pub fn calculate_percentage_safe(amount: u64, percentage: u64) -> Result<u64> {
    let result = amount
        .checked_mul(percentage)
        .ok_or(SecurityErrors::Overflow)?
        .checked_div(100)
        .ok_or(SecurityErrors::Overflow)?;
    Ok(result)
}

/// Validates string input length and content
pub fn validate_string_input(input: &str, max_length: usize) -> Result<()> {
    require!(
        !input.is_empty() && input.len() <= max_length,
        SecurityErrors::InputTooLong
    );
    
    // Additional validation: ensure no null bytes or control characters
    require!(
        input.chars().all(|c| c.is_ascii_graphic() || c.is_ascii_whitespace()),
        SecurityErrors::InputTooLong
    );
    
    Ok(())
}