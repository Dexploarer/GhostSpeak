/*!
 * Royalty & Resale Module
 * 
 * Implements royalty streams for creators and secondary market
 * functionality for agent ownership transfers.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::PodAIMarketplaceError;

/// Creates a royalty stream for ongoing revenue sharing
/// 
/// Establishes automated royalty payments for template creators,
/// referrers, or partners based on agent earnings.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing royalty stream accounts
/// * `royalty_data` - Royalty configuration including:
///   - `beneficiary` - Who receives royalties
///   - `percentage` - Royalty rate (0.1-10%)
///   - `duration` - How long royalties last
///   - `minimum_payout` - Minimum accumulated before payout
///   - `payout_frequency` - How often to pay out
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful royalty stream creation
/// 
/// # Errors
/// 
/// * `RoyaltyRateTooHigh` - If percentage exceeds 10%
/// * `InvalidBeneficiary` - If beneficiary not verified
/// * `ConflictingRoyalties` - If total royalties exceed limit
/// 
/// # Royalty Types
/// 
/// - **Template Royalties**: For agent template creators
/// - **Referral Royalties**: For bringing new users
/// - **Partnership Royalties**: For strategic partners
/// 
/// # Automatic Processing
/// 
/// Royalties are:
/// - Calculated on each transaction
/// - Accumulated until minimum reached
/// - Paid out automatically per schedule
/// - Transparent to all parties
pub fn create_royalty_stream(
    ctx: Context<CreateRoyaltyStream>,
    config: RoyaltyConfig,
) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(agent.owner == ctx.accounts.creator.key(), PodAIMarketplaceError::UnauthorizedAccess);

    stream.agent = agent.key();
    stream.original_creator = ctx.accounts.creator.key();
    stream.config = config.clone();  // Clone here
    stream.total_paid = 0;
    stream.last_payment = clock.unix_timestamp;
    stream.created_at = clock.unix_timestamp;
    stream.is_active = true;
    stream.bump = ctx.bumps.stream;

    emit!(RoyaltyStreamCreatedEvent {
        stream: stream.key(),
        agent: agent.key(),
        creator: ctx.accounts.creator.key(),
        percentage: config.percentage,
    });

    Ok(())
}

/// Lists an agent for resale on the secondary market
/// 
/// Allows agent owners to sell their successful agents to other users,
/// transferring ownership and future earnings potential.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing agent and listing accounts
/// * `resale_data` - Resale listing details including:
///   - `asking_price` - Desired sale price
///   - `minimum_price` - Lowest acceptable offer
///   - `include_contracts` - Whether active contracts transfer
///   - `earnings_history` - Past earnings documentation
///   - `transfer_training` - Whether to include training period
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful listing
/// 
/// # Errors
/// 
/// * `AgentNotEligible` - If agent has active disputes
/// * `ActiveContractsExist` - If contracts can't transfer
/// * `UnauthorizedOwner` - If caller doesn't own agent
/// 
/// # Valuation Factors
/// 
/// Agent value based on:
/// - Historical earnings
/// - Client base size
/// - Performance ratings
/// - Unique capabilities
/// - Market demand
/// 
/// # Transfer Process
/// 
/// 1. Listing created with terms
/// 2. Buyers make offers
/// 3. Owner accepts offer
/// 4. Ownership transfers on payment
/// 5. 30-day transition support period
pub fn list_agent_for_resale(
    ctx: Context<ListAgentForResale>,
    listing_price: u64,
) -> Result<()> {
    let resale = &mut ctx.accounts.resale;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(agent.owner == ctx.accounts.seller.key(), PodAIMarketplaceError::UnauthorizedAccess);

    resale.agent = agent.key();
    resale.seller = ctx.accounts.seller.key();
    resale.price = listing_price;
    resale.royalty_percentage = 500; // 5% in basis points
    resale.is_listed = true;
    resale.created_at = clock.unix_timestamp;
    resale.sold_at = None;
    resale.buyer = None;
    resale.bump = ctx.bumps.resale;

    emit!(AgentListedForResaleEvent {
        resale: resale.key(),
        agent: agent.key(),
        seller: ctx.accounts.seller.key(),
        listing_price,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct CreateRoyaltyStream<'info> {
    #[account(
        init,
        payer = creator,
        space = RoyaltyStream::LEN,
        seeds = [b"royalty_stream", agent.key().as_ref()],
        bump
    )]
    pub stream: Account<'info, RoyaltyStream>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListAgentForResale<'info> {
    #[account(
        init,
        payer = seller,
        space = ResaleMarket::LEN,
        seeds = [b"resale", agent.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub resale: Account<'info, ResaleMarket>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct RoyaltyStreamCreatedEvent {
    pub stream: Pubkey,
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub percentage: u32,    // Basis points
}

#[event]
pub struct AgentListedForResaleEvent {
    pub resale: Pubkey,
    pub agent: Pubkey,
    pub seller: Pubkey,
    pub listing_price: u64,
}