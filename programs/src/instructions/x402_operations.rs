/*!
 * x402 Payment Protocol Instructions
 *
 * Contains instruction handlers for x402 payment protocol operations including
 * agent configuration, payment recording, and reputation updates from x402 transactions.
 */

use crate::state::Agent;
use crate::GhostSpeakError;
use crate::*;
use anchor_lang::prelude::*;

// =====================================================
// CONFIGURE X402 INSTRUCTION
// =====================================================

/// Configure x402 payment settings for an agent
///
/// Enables x402 payment protocol on an agent and sets pricing, accepted tokens,
/// and service endpoint for HTTP 402 "Payment Required" responses
#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct ConfigureX402<'info> {
    /// Agent account with canonical PDA validation
    #[account(
        mut,
        seeds = [
            b"agent",
            owner.key().as_ref(),
            agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ GhostSpeakError::InvalidAgentOwner,
        constraint = agent.is_active @ GhostSpeakError::AgentNotActive
    )]
    pub agent: Account<'info, Agent>,

    /// Agent owner who can configure x402 settings
    #[account(mut)]
    pub owner: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Configuration data for x402 payment protocol
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct X402ConfigData {
    pub enabled: bool,
    pub payment_address: Pubkey,
    pub accepted_tokens: Vec<Pubkey>,
    pub price_per_call: u64,
    pub service_endpoint: String,
}

pub fn configure_x402(
    ctx: Context<ConfigureX402>,
    _agent_id: String,
    config: X402ConfigData,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Validate inputs
    require!(
        config.accepted_tokens.len() <= 10,
        GhostSpeakError::TooManyCapabilities
    );
    require!(
        config.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
        GhostSpeakError::InvalidServiceEndpoint
    );
    require!(
        config.price_per_call >= MIN_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );
    require!(
        config.price_per_call <= MAX_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );

    // Validate payment address is not default
    require!(
        config.payment_address != Pubkey::default(),
        GhostSpeakError::InvalidTokenAccount
    );

    // Update agent x402 configuration
    agent.x402_enabled = config.enabled;
    agent.x402_payment_address = config.payment_address;
    agent.x402_accepted_tokens = config.accepted_tokens;
    agent.x402_price_per_call = config.price_per_call;
    agent.x402_service_endpoint = config.service_endpoint;
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "x402 configured for agent: enabled={}, price={}",
        agent.x402_enabled,
        agent.x402_price_per_call
    );

    Ok(())
}

// =====================================================
// RECORD X402 PAYMENT INSTRUCTION
// =====================================================

/// Record an x402 payment transaction on-chain
///
/// Updates agent's x402_total_payments and x402_total_calls counters
/// This instruction is called after off-chain x402 payment verification
#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct RecordX402Payment<'info> {
    /// Agent account receiving the payment
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.is_active @ GhostSpeakError::AgentNotActive,
        constraint = agent.x402_enabled @ GhostSpeakError::FeatureNotEnabled
    )]
    pub agent: Account<'info, Agent>,

    /// Payer who made the x402 payment (optional verification)
    pub payer: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Payment data for x402 transaction recording
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct X402PaymentData {
    pub amount: u64,
    pub token_mint: Pubkey,
    pub transaction_signature: String,
    pub response_time_ms: u64,
}

pub fn record_x402_payment(
    ctx: Context<RecordX402Payment>,
    _agent_id: String,
    payment_data: X402PaymentData,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;

    // Validate payment amount
    require!(
        payment_data.amount >= MIN_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );
    require!(
        payment_data.amount <= MAX_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );

    // Validate token is accepted
    require!(
        agent
            .x402_accepted_tokens
            .contains(&payment_data.token_mint),
        GhostSpeakError::UnsupportedToken
    );

    // Validate transaction signature format
    require!(
        payment_data.transaction_signature.len() >= 64
            && payment_data.transaction_signature.len() <= 128,
        GhostSpeakError::InvalidInputLength
    );

    // Update x402 payment counters with overflow protection
    agent.x402_total_payments = agent
        .x402_total_payments
        .checked_add(payment_data.amount)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

    agent.x402_total_calls = agent
        .x402_total_calls
        .checked_add(1)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

    // Update agent's total earnings (for overall reputation)
    agent.total_earnings = agent
        .total_earnings
        .checked_add(payment_data.amount)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

    // Update last payment timestamp for proof-of-agent activity tracking
    agent.last_payment_timestamp = ctx.accounts.clock.unix_timestamp;

    msg!(
        "x402 payment recorded: amount={}, total_payments={}, total_calls={}",
        payment_data.amount,
        agent.x402_total_payments,
        agent.x402_total_calls
    );

    // Emit event for analytics
    emit!(X402PaymentRecordedEvent {
        agent: agent.key(),
        payer: ctx.accounts.payer.key(),
        amount: payment_data.amount,
        token_mint: payment_data.token_mint,
        transaction_signature: payment_data.transaction_signature,
        response_time_ms: payment_data.response_time_ms,
        total_payments: agent.x402_total_payments,
        total_calls: agent.x402_total_calls,
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// SUBMIT X402 RATING INSTRUCTION
// =====================================================

/// Submit a reputation rating from an x402 transaction
///
/// Updates agent reputation based on x402 service quality
#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct SubmitX402Rating<'info> {
    /// Agent account receiving the rating
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.is_active @ GhostSpeakError::AgentNotActive,
        constraint = agent.x402_enabled @ GhostSpeakError::FeatureNotEnabled
    )]
    pub agent: Account<'info, Agent>,

    /// User submitting the rating (must have paid via x402)
    pub rater: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Rating data for x402 transaction
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct X402RatingData {
    pub rating: u8, // 1-5 stars
    pub transaction_signature: String,
    pub feedback: Option<String>,
}

pub fn submit_x402_rating(
    ctx: Context<SubmitX402Rating>,
    _agent_id: String,
    rating_data: X402RatingData,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Validate rating range (1-5 stars)
    require!(
        rating_data.rating >= 1 && rating_data.rating <= 5,
        GhostSpeakError::InvalidRating
    );

    // Validate transaction signature format
    require!(
        rating_data.transaction_signature.len() >= 64
            && rating_data.transaction_signature.len() <= 128,
        GhostSpeakError::InvalidInputLength
    );

    // Validate feedback length if provided
    if let Some(ref feedback) = rating_data.feedback {
        require!(
            feedback.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::MessageTooLong
        );
    }

    // Update reputation score using exponential moving average
    // New reputation = 0.9 * old_reputation + 0.1 * new_rating
    // Rating scale: 1-5 stars mapped to 0-10000 basis points (0-100%)
    let rating_basis_points = ((rating_data.rating as u32) * 2000) as u32; // 1 star = 2000 bp, 5 stars = 10000 bp

    let current_reputation = agent.reputation_score;
    let new_reputation = if current_reputation == 0 {
        // First rating - use it directly
        rating_basis_points
    } else {
        // Exponential moving average: 90% old + 10% new
        let weighted_old = (current_reputation as u64)
            .checked_mul(9000)
            .ok_or(GhostSpeakError::ArithmeticOverflow)?
            / 10000;
        let weighted_new = (rating_basis_points as u64)
            .checked_mul(1000)
            .ok_or(GhostSpeakError::ArithmeticOverflow)?
            / 10000;
        weighted_old
            .checked_add(weighted_new)
            .ok_or(GhostSpeakError::ArithmeticOverflow)?
            .min(BASIS_POINTS_MAX as u64) as u32
    };

    agent.reputation_score = new_reputation;
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "x402 rating submitted: rating={}/5, new_reputation={}",
        rating_data.rating,
        agent.reputation_score
    );

    // Emit event for analytics
    emit!(X402RatingSubmittedEvent {
        agent: agent.key(),
        rater: ctx.accounts.rater.key(),
        rating: rating_data.rating,
        transaction_signature: rating_data.transaction_signature,
        feedback: rating_data.feedback,
        new_reputation_score: agent.reputation_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct X402PaymentRecordedEvent {
    pub agent: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub transaction_signature: String,
    pub response_time_ms: u64,
    pub total_payments: u64,
    pub total_calls: u64,
    pub timestamp: i64,
}

#[event]
pub struct X402RatingSubmittedEvent {
    pub agent: Pubkey,
    pub rater: Pubkey,
    pub rating: u8,
    pub transaction_signature: String,
    pub feedback: Option<String>,
    pub new_reputation_score: u32,
    pub timestamp: i64,
}
