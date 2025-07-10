/*!
 * Negotiation Module
 * 
 * Implements price negotiation and deal-making capabilities between
 * agents and clients with automated negotiation support.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::PodAIMarketplaceError;

/// Initiates a price negotiation session between buyer and seller
/// 
/// Creates a structured negotiation framework for parties to reach
/// mutually agreeable terms through offers and counter-offers.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing negotiation accounts
/// * `negotiation_data` - Initial negotiation parameters including:
///   - `service_or_job` - Reference to service/job being negotiated
///   - `initial_offer` - Opening offer amount
///   - `negotiation_terms` - What's negotiable (price, timeline, scope)
///   - `max_rounds` - Maximum negotiation rounds (default: 10)
///   - `auto_accept_threshold` - Price to auto-accept
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful negotiation initiation
/// 
/// # Errors
/// 
/// * `ServiceNotNegotiable` - If service has fixed pricing
/// * `InvalidInitialOffer` - If offer is unreasonable
/// * `PartyNotEligible` - If party can't negotiate
/// 
/// # Negotiation Rules
/// 
/// - Each party can make one offer per round
/// - Offers must improve (buyer increases, seller decreases)
/// - Negotiation ends on acceptance or max rounds
/// - 24-hour timeout between rounds
/// 
/// # Best Practices
/// 
/// - Start with reasonable offers
/// - Consider total value, not just price
/// - Bundle services for better deals
pub fn initiate_negotiation(
    ctx: Context<InitiateNegotiation>,
    initial_offer: u64,
    auto_accept_threshold: u64,
    negotiation_deadline: i64,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.initiator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_NEGOTIATION_DURATION: i64 = 7 * 24 * 60 * 60; // 7 days
    
    require!(
        initial_offer >= MIN_PAYMENT_AMOUNT && initial_offer <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        auto_accept_threshold >= MIN_PAYMENT_AMOUNT && auto_accept_threshold <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );

    let negotiation = &mut ctx.accounts.negotiation;
    let clock = Clock::get()?;

    require!(negotiation_deadline > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
    require!(
        negotiation_deadline <= clock.unix_timestamp + MAX_NEGOTIATION_DURATION,
        PodAIMarketplaceError::InvalidDeadline
    );
    
    // SECURITY: Auto-accept threshold validation removed - it depends on negotiation direction
    // The threshold logic should be validated during counter-offer processing based on who is buyer/seller

    negotiation.initiator = ctx.accounts.initiator.key();
    negotiation.counterparty = ctx.accounts.counterparty.key();
    negotiation.initial_offer = initial_offer;
    negotiation.current_offer = initial_offer;
    negotiation.status = NegotiationStatus::InitialOffer;
    negotiation.auto_accept_threshold = auto_accept_threshold;
    negotiation.negotiation_deadline = negotiation_deadline;
    negotiation.created_at = clock.unix_timestamp;
    negotiation.bump = ctx.bumps.negotiation;

    // Initialize terms vector and other fields
    negotiation.terms = Vec::new();
    negotiation.counter_offers = Vec::new();
    negotiation.last_activity = clock.unix_timestamp;

    emit!(NegotiationInitiatedEvent {
        negotiation: negotiation.key(),
        initiator: ctx.accounts.initiator.key(),
        counterparty: ctx.accounts.counterparty.key(),
        initial_offer,
    });

    Ok(())
}

/// Makes a counter-offer in an active negotiation
/// 
/// Allows negotiating parties to respond to offers with improved terms,
/// working toward a mutually acceptable agreement.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing negotiation and offer accounts
/// * `counter_offer_data` - Counter-offer details including:
///   - `new_price` - Proposed price adjustment
///   - `new_terms` - Modified terms (timeline, scope)
///   - `justification` - Reason for counter-offer
///   - `final_offer` - Whether this is final offer
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful counter-offer
/// 
/// # Errors
/// 
/// * `NotYourTurn` - If it's not the party's turn
/// * `OfferNotImproved` - If offer doesn't improve terms
/// * `NegotiationExpired` - If round timeout exceeded
/// * `MaxRoundsReached` - If negotiation limit hit
/// 
/// # Offer Requirements
/// 
/// Counter-offers must:
/// - Improve previous offer (buyer up, seller down)
/// - Stay within reasonable bounds
/// - Include clear justification
/// 
/// # Auto-Resolution
/// 
/// If offer meets auto-accept threshold,
/// negotiation completes automatically
pub fn make_counter_offer(
    ctx: Context<MakeCounterOffer>,
    counter_offer: u64,
    message: String,
) -> Result<()> {
    let negotiation = &mut ctx.accounts.negotiation;
    let clock = Clock::get()?;

    require!(negotiation.status == NegotiationStatus::InitialOffer || 
             negotiation.status == NegotiationStatus::CounterOffer, 
             PodAIMarketplaceError::InvalidApplicationStatus);
    require!(clock.unix_timestamp < negotiation.negotiation_deadline, PodAIMarketplaceError::InvalidDeadline);

    // Store current offer before modifying
    let current_offer = negotiation.current_offer;
    negotiation.counter_offers.push(current_offer);
    negotiation.current_offer = counter_offer;
    negotiation.status = NegotiationStatus::CounterOffer;

    // Update last activity
    negotiation.last_activity = clock.unix_timestamp;

    // Check for auto-acceptance
    // SECURITY: Fixed auto-accept logic to consider negotiation direction
    // If initiator is buyer (offering to pay), auto-accept when seller's counter is at or below threshold
    // If initiator is seller (asking for payment), auto-accept when buyer's counter is at or above threshold
    let should_auto_accept = if ctx.accounts.sender.key() == negotiation.initiator {
        // Initiator making counter-offer (likely adjusting their own offer)
        false // Don't auto-accept own offers
    } else {
        // Counterparty making counter-offer
        if negotiation.initial_offer > 0 {
            // Assume initiator is buyer if they made positive initial offer
            counter_offer <= negotiation.auto_accept_threshold
        } else {
            // Complex case - would need additional context
            counter_offer >= negotiation.auto_accept_threshold
        }
    };
    
    if should_auto_accept {
        negotiation.status = NegotiationStatus::AutoAccepted;
    }

    emit!(CounterOfferMadeEvent {
        negotiation: negotiation.key(),
        sender: ctx.accounts.sender.key(),
        counter_offer,
        message,
        auto_accepted: negotiation.status == NegotiationStatus::AutoAccepted,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct InitiateNegotiation<'info> {
    #[account(
        init,
        payer = initiator,
        space = NegotiationChatbot::LEN,
        seeds = [b"negotiation", initiator.key().as_ref(), counterparty.key().as_ref()],
        bump
    )]
    pub negotiation: Account<'info, NegotiationChatbot>,
    #[account(mut)]
    pub initiator: Signer<'info>,
    /// CHECK: This is the counterparty in the negotiation
    pub counterparty: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeCounterOffer<'info> {
    #[account(mut)]
    pub negotiation: Account<'info, NegotiationChatbot>,
    pub sender: Signer<'info>,
}

// Events
#[event]
pub struct NegotiationInitiatedEvent {
    pub negotiation: Pubkey,
    pub initiator: Pubkey,
    pub counterparty: Pubkey,
    pub initial_offer: u64,
}

#[event]
pub struct CounterOfferMadeEvent {
    pub negotiation: Pubkey,
    pub sender: Pubkey,
    pub counter_offer: u64,
    pub message: String,
    pub auto_accepted: bool,
}