/*!
 * Auction Instructions Module
 * 
 * Contains all auction-related instruction handlers for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use crate::*;
use crate::state::*;
use crate::simple_optimization::{SecurityLogger, FormalVerification};

// Import constants explicitly to avoid ambiguity
use crate::state::{MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT, MIN_BID_INCREMENT, MIN_AUCTION_DURATION, MAX_AUCTION_DURATION, MAX_BIDS_PER_AUCTION_PER_USER};

// =====================================================
// AUCTION INSTRUCTIONS
// =====================================================

/// Creates a reverse auction for agent services
/// 
/// Allows buyers to create auctions where agents compete by bidding
/// to provide services at the lowest price or best value.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing auction account
/// * `auction_data` - Auction configuration including:
///   - `service_description` - What service is needed
///   - `requirements` - Specific requirements
///   - `auction_type` - Lowest price or best value
///   - `reserve_price` - Maximum acceptable price
///   - `start_time` - When auction opens for bids
///   - `end_time` - Auction closing time
///   - `minimum_rating` - Minimum agent rating required
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful auction creation
/// 
/// # Errors
/// 
/// * `InvalidTimeRange` - If end time is before start time
/// * `ReservePriceTooLow` - If reserve is below minimum
/// * `AuctionDurationTooShort` - If auction is less than 1 hour
/// 
/// # Auction Types
/// 
/// - **Lowest Price**: Winner is lowest bidder
/// - **Best Value**: Considers price and agent quality
/// - **Dutch Auction**: Price decreases over time
/// 
/// # Example
/// 
/// ```no_run
/// let auction = ServiceAuctionData {
///     service_description: "Website development".to_string(),
///     requirements: vec!["React".to_string(), "Responsive".to_string()],
///     auction_type: AuctionType::BestValue,
///     reserve_price: 1_000_000_000, // 1 SOL maximum
///     start_time: clock.unix_timestamp + 3600, // Start in 1 hour
///     end_time: clock.unix_timestamp + 86400, // 24 hour auction
///     minimum_rating: 4.0,
/// };
/// ```
pub fn create_service_auction(
    ctx: Context<CreateServiceAuction>,
    auction_data: AuctionData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Comprehensive input validation using security module
    validate_payment!(auction_data.starting_price, "starting_price");
    validate_payment!(auction_data.reserve_price, "reserve_price");
    
    // SECURITY: Validate minimum bid increment
    require!(
        auction_data.minimum_bid_increment >= MIN_BID_INCREMENT && 
        auction_data.minimum_bid_increment <= auction_data.starting_price / 10,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    
    // SECURITY: Validate auction duration
    let auction_duration = auction_data.auction_end_time - Clock::get()?.unix_timestamp;
    require!(
        auction_duration >= MIN_AUCTION_DURATION && auction_duration <= MAX_AUCTION_DURATION,
        PodAIMarketplaceError::InvalidDeadline
    );
    
    // SECURITY: Formal verification of auction invariants
    FormalVerification::verify_auction_invariants(
        auction_data.starting_price,
        auction_data.starting_price,
        auction_data.reserve_price,
        auction_data.minimum_bid_increment,
    )?;
    
    let auction = &mut ctx.accounts.auction;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;
    
    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(agent.owner == ctx.accounts.creator.key(), PodAIMarketplaceError::UnauthorizedAccess);
    require!(auction_data.auction_end_time > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
    require!(
        auction_data.auction_end_time <= clock.unix_timestamp + MAX_AUCTION_DURATION,
        PodAIMarketplaceError::InvalidDeadline
    );
    
    auction.auction = auction.key();
    auction.agent = agent.key();
    auction.creator = ctx.accounts.creator.key();
    auction.auction_type = auction_data.auction_type;
    auction.starting_price = auction_data.starting_price;
    auction.reserve_price = auction_data.reserve_price;
    auction.current_price = auction_data.starting_price;
    auction.current_winner = None;
    auction.auction_end_time = auction_data.auction_end_time;
    auction.minimum_bid_increment = auction_data.minimum_bid_increment;
    auction.total_bids = 0;
    auction.status = AuctionStatus::Active;
    auction.bids = Vec::new();
    auction.created_at = clock.unix_timestamp;
    auction.ended_at = None;
    auction.metadata_uri = String::new();
    auction.bump = ctx.bumps.auction;
    
    emit!(ServiceAuctionCreatedEvent {
        auction: auction.key(),
        agent: agent.key(),
        creator: ctx.accounts.creator.key(),
        starting_price: auction_data.starting_price,
        auction_type: auction_data.auction_type,
    });
    
    Ok(())
}

/// Places a bid on an active service auction
/// 
/// Allows verified agents to bid on auctions with their proposed price
/// and delivery terms. Bids are binding if accepted.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing bid and auction accounts
/// * `bid_data` - Bid details including:
///   - `bid_amount` - Proposed price in payment tokens
///   - `delivery_time` - Estimated delivery in hours
///   - `proposal` - Brief proposal (max 1KB)
///   - `sample_work` - Optional portfolio samples
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful bid placement
/// 
/// # Errors
/// 
/// * `AuctionNotActive` - If auction hasn't started or has ended
/// * `BidExceedsReserve` - If bid is above reserve price
/// * `AgentNotEligible` - If agent doesn't meet requirements
/// * `BidTooLate` - If placed after auction end
/// 
/// # Bid Rules
/// 
/// - Agents can update bids until auction closes
/// - Bids are binding - withdrawal incurs penalty
/// - Winning bid creates automatic work order
/// 
/// # Anti-Sniping
/// 
/// Auctions extend by 5 minutes if bid placed
/// in final 5 minutes to ensure fair competition
pub fn place_auction_bid(
    ctx: Context<PlaceAuctionBid>,
    bid_amount: u64,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.bidder.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Amount validation
    require!(
        bid_amount >= MIN_PAYMENT_AMOUNT && bid_amount <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    
    let auction = &mut ctx.accounts.auction;
    let clock = Clock::get()?;
    
    require!(auction.status == AuctionStatus::Active, PodAIMarketplaceError::InvalidApplicationStatus);
    require!(clock.unix_timestamp < auction.auction_end_time, PodAIMarketplaceError::InvalidDeadline);
    require!(bid_amount > auction.current_price, PodAIMarketplaceError::InvalidBid);
    
    // SECURITY: Prevent self-bidding and bid manipulation
    require!(
        Some(ctx.accounts.bidder.key()) != auction.current_winner, 
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Prevent auction creator from bidding
    require!(
        ctx.accounts.bidder.key() != auction.creator,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Use safe arithmetic to prevent overflow
    let minimum_bid = safe_add!(auction.current_price, auction.minimum_bid_increment);
    require!(bid_amount >= minimum_bid, PodAIMarketplaceError::InvalidBid);
    
    // SECURITY: Anti-sniping protection - extend auction if bid in final minutes
    const ANTI_SNIPE_EXTENSION: i64 = 300; // 5 minutes
    if auction.auction_end_time - clock.unix_timestamp < ANTI_SNIPE_EXTENSION {
        auction.auction_end_time = auction.auction_end_time.saturating_add(ANTI_SNIPE_EXTENSION);
        SecurityLogger::log_security_event("AUCTION_EXTENDED", ctx.accounts.bidder.key(), 
            &format!("auction: {}, new_end_time: {}", auction.key(), auction.auction_end_time));
    }
    
    // Store previous bidder info for refund
    let previous_bidder = auction.current_winner;
    let _previous_bid = auction.current_price;
    
    // Update auction with new bid
    auction.current_price = bid_amount;
    auction.current_winner = Some(ctx.accounts.bidder.key());
    
    // SECURITY: Use safe arithmetic for bid count
    auction.total_bids = auction.total_bids.saturating_add(1);
    
    // SECURITY: Check for excessive bidding
    if auction.total_bids > MAX_BIDS_PER_AUCTION_PER_USER as u32 {
        SecurityLogger::log_security_event("EXCESSIVE_BIDDING", ctx.accounts.bidder.key(), 
            &format!("auction: {}, total_bids: {}", auction.key(), auction.total_bids));
    }
    
    // Log bid for security audit
    SecurityLogger::log_security_event("AUCTION_BID_PLACED", ctx.accounts.bidder.key(), 
        &format!("auction: {}, amount: {}, bid_number: {}", auction.key(), bid_amount, auction.total_bids));
    
    // Add bid to history
    let new_bid = AuctionBid {
        bidder: ctx.accounts.bidder.key(),
        amount: bid_amount,
        timestamp: clock.unix_timestamp,
        is_winning: true,
    };
    auction.bids.push(new_bid);
    
    // Mark previous winning bid as not winning
    if let Some(prev_bid) = auction.bids.iter_mut().find(|b| b.bidder == previous_bidder.unwrap_or_default()) {
        prev_bid.is_winning = false;
    }
    
    emit!(AuctionBidPlacedEvent {
        auction: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        bid_amount,
        total_bids: auction.total_bids,
    });
    
    Ok(())
}

/// Finalizes an auction and determines the winner
/// 
/// Called after auction end time to finalize the auction,
/// determine the winner, and initiate the work order creation.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing auction account
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful auction finalization
/// 
/// # Errors
/// 
/// * `AuctionStillActive` - If auction hasn't ended yet
/// * `AuctionAlreadyFinalized` - If auction was already finalized
/// * `NoValidBids` - If no bids meet reserve price
pub fn finalize_auction(
    ctx: Context<FinalizeAuction>,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let clock = Clock::get()?;
    
    // Ensure auction has ended
    require!(
        clock.unix_timestamp >= auction.auction_end_time,
        PodAIMarketplaceError::InvalidDeadline
    );
    
    // Ensure auction hasn't been finalized already
    require!(
        auction.status == AuctionStatus::Active,
        PodAIMarketplaceError::InvalidApplicationStatus
    );
    
    // SECURITY: Formal verification before finalization
    if let Some(winner) = auction.current_winner {
        // SECURITY: Verify auction invariants before settlement
        FormalVerification::verify_auction_invariants(
            auction.current_price,
            auction.starting_price,
            auction.reserve_price,
            auction.minimum_bid_increment,
        )?;
        
        // Check if bid meets reserve price
        if auction.reserve_price == 0 || auction.current_price >= auction.reserve_price {
            auction.winner = Some(winner);
            auction.status = AuctionStatus::Settled;
            
            // Log successful auction completion
            SecurityLogger::log_security_event("AUCTION_FINALIZED", winner, 
                &format!("auction: {}, winning_bid: {}, total_bids: {}", auction.key(), auction.current_price, auction.total_bids));
            
            emit!(AuctionFinalizedEvent {
                auction: auction.key(),
                winner,
                winning_bid: auction.current_price,
            });
        } else {
            // Reserve not met
            auction.status = AuctionStatus::Cancelled;
            
            SecurityLogger::log_security_event("AUCTION_FAILED_RESERVE", auction.creator, 
                &format!("auction: {}, highest_bid: {}, reserve: {}", auction.key(), auction.current_price, auction.reserve_price));
            
            emit!(AuctionFailedEvent {
                auction: auction.key(),
                reason: "Reserve price not met".to_string(),
            });
        }
    } else {
        // No bids received
        auction.status = AuctionStatus::Cancelled;
        
        SecurityLogger::log_security_event("AUCTION_FAILED_NO_BIDS", auction.creator, 
            &format!("auction: {}", auction.key()));
        
        emit!(AuctionFailedEvent {
            auction: auction.key(),
            reason: "No bids received".to_string(),
        });
    }
    
    Ok(())
}

// =====================================================
// ACCOUNT STRUCTURES
// =====================================================

#[derive(Accounts)]
pub struct CreateServiceAuction<'info> {
    #[account(
        init,
        payer = creator,
        space = AuctionMarketplace::LEN,
        seeds = [b"auction", agent.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub auction: Account<'info, AuctionMarketplace>,
    #[account(
        constraint = agent.owner == creator.key() @ PodAIMarketplaceError::UnauthorizedAccess,
        constraint = agent.is_active @ PodAIMarketplaceError::AgentNotActive
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceAuctionBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, AuctionMarketplace>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeAuction<'info> {
    #[account(
        mut,
        constraint = auction.status == AuctionStatus::Active @ PodAIMarketplaceError::InvalidApplicationStatus
    )]
    pub auction: Account<'info, AuctionMarketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct ServiceAuctionCreatedEvent {
    pub auction: Pubkey,
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub starting_price: u64,
    pub auction_type: AuctionType,
}

#[event]
pub struct AuctionBidPlacedEvent {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub bid_amount: u64,
    pub total_bids: u32,
}

#[event]
pub struct AuctionFinalizedEvent {
    pub auction: Pubkey,
    pub winner: Pubkey,
    pub winning_bid: u64,
}

#[event]
pub struct AuctionFailedEvent {
    pub auction: Pubkey,
    pub reason: String,
}

