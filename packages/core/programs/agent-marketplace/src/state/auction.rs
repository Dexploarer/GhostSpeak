/*!
 * Auction State Module
 * 
 * Contains auction related state structures.
 */

use anchor_lang::prelude::*;
use super::{MAX_GENERAL_STRING_LENGTH, MIN_BID_INCREMENT, MIN_AUCTION_DURATION, MAX_AUCTION_DURATION, PodAIMarketplaceError};

// PDA Seeds
pub const SERVICE_AUCTION_SEED: &[u8] = b"service_auction";
pub const AUCTION_MARKETPLACE_SEED: &[u8] = b"auction_marketplace";
pub const NEGOTIATION_SEED: &[u8] = b"negotiation";

// Constants
pub const MAX_BIDS_COUNT: usize = 100;
pub const MAX_COUNTER_OFFERS: usize = 10;
pub const MAX_TERMS_COUNT: usize = 5;
pub const MAX_TERM_LENGTH: usize = 100;
pub const MAX_FEATURES_COUNT: usize = 10;
pub const MAX_FEATURE_LENGTH: usize = 100;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuctionType {
    English,           // Ascending price auction
    Dutch,             // Descending price auction
    SealedBid,         // Blind bidding
    Vickrey,           // Second-price sealed bid
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuctionStatus {
    Active,
    Ended,
    Cancelled,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum NegotiationStatus {
    InitialOffer,
    CounterOffer,
    Accepted,
    Rejected,
    Expired,
    AutoAccepted,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AuctionData {
    pub auction_type: AuctionType,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_bid: u64,
    pub current_bidder: Option<Pubkey>,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AuctionBid {
    pub bidder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub is_winning: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct NegotiationData {
    pub initial_offer: u64,
    pub current_offer: u64,
    pub counter_offers: Vec<u64>,
    pub negotiation_deadline: i64,
    pub status: NegotiationStatus,
    pub terms: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AuctionTieredPricingData {
    pub basic_price: u64,
    pub standard_price: u64,
    pub premium_price: u64,
    pub basic_features: Vec<String>,
    pub standard_features: Vec<String>,
    pub premium_features: Vec<String>,
}

#[account]
pub struct ServiceAuction {
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub auction_type: AuctionType,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_bid: u64,
    pub current_bidder: Option<Pubkey>,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct AuctionMarketplace {
    pub auction: Pubkey,
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub auction_type: AuctionType,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_price: u64,
    pub current_winner: Option<Pubkey>,
    pub winner: Option<Pubkey>,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
    pub status: AuctionStatus,
    pub bids: Vec<AuctionBid>,
    pub created_at: i64,
    pub ended_at: Option<i64>,
    pub metadata_uri: String,
    pub bump: u8,
}

#[account]
pub struct Negotiation {
    pub initiator: Pubkey,
    pub counterparty: Pubkey,
    pub initial_offer: u64,
    pub current_offer: u64,
    pub counter_offers: Vec<u64>,
    pub negotiation_deadline: i64,
    pub status: NegotiationStatus,
    pub terms: Vec<String>,
    pub created_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

impl ServiceAuction {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // creator
        1 + // auction_type
        8 + // starting_price
        8 + // reserve_price
        8 + // current_bid
        1 + 32 + // current_bidder (Option<Pubkey>)
        8 + // auction_end_time
        8 + // minimum_bid_increment
        4 + // total_bids
        1 + // is_active
        8 + // created_at
        1; // bump

    pub fn initialize(
        &mut self,
        agent: Pubkey,
        creator: Pubkey,
        auction_type: AuctionType,
        starting_price: u64,
        reserve_price: u64,
        auction_end_time: i64,
        minimum_bid_increment: u64,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let duration = auction_end_time - clock.unix_timestamp;
        
        require!(duration >= MIN_AUCTION_DURATION, PodAIMarketplaceError::AuctionDurationTooShort);
        require!(duration <= MAX_AUCTION_DURATION, PodAIMarketplaceError::AuctionDurationTooLong);
        require!(minimum_bid_increment >= MIN_BID_INCREMENT, PodAIMarketplaceError::BidIncrementTooLow);
        require!(starting_price > 0, PodAIMarketplaceError::InvalidStartingPrice);
        
        self.agent = agent;
        self.creator = creator;
        self.auction_type = auction_type;
        self.starting_price = starting_price;
        self.reserve_price = reserve_price;
        self.current_bid = 0;
        self.current_bidder = None;
        self.auction_end_time = auction_end_time;
        self.minimum_bid_increment = minimum_bid_increment;
        self.total_bids = 0;
        self.is_active = true;
        self.created_at = clock.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }

    pub fn place_bid(&mut self, bidder: Pubkey, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(self.is_active, PodAIMarketplaceError::AuctionNotActive);
        require!(clock.unix_timestamp < self.auction_end_time, PodAIMarketplaceError::AuctionEnded);
        
        let minimum_bid = if self.current_bid == 0 {
            self.starting_price
        } else {
            self.current_bid.saturating_add(self.minimum_bid_increment)
        };
        
        require!(amount >= minimum_bid, PodAIMarketplaceError::BidTooLow);
        
        self.current_bid = amount;
        self.current_bidder = Some(bidder);
        self.total_bids = self.total_bids.saturating_add(1);
        
        Ok(())
    }

    pub fn end_auction(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(self.is_active, PodAIMarketplaceError::AuctionNotActive);
        require!(clock.unix_timestamp >= self.auction_end_time, PodAIMarketplaceError::AuctionNotEnded);
        
        self.is_active = false;
        
        Ok(())
    }

    pub fn cancel_auction(&mut self) -> Result<()> {
        require!(self.is_active, PodAIMarketplaceError::AuctionNotActive);
        require!(self.total_bids == 0, PodAIMarketplaceError::CannotCancelAuctionWithBids);
        
        self.is_active = false;
        
        Ok(())
    }
}

impl Negotiation {
    pub const LEN: usize = 8 + // discriminator
        32 + // initiator
        32 + // counterparty
        8 + // initial_offer
        8 + // current_offer
        4 + (MAX_COUNTER_OFFERS * 8) + // counter_offers
        8 + // negotiation_deadline
        1 + // status
        4 + (MAX_TERMS_COUNT * (4 + MAX_TERM_LENGTH)) + // terms
        8 + // created_at
        8 + // last_activity
        1; // bump

    pub fn initialize(
        &mut self,
        initiator: Pubkey,
        counterparty: Pubkey,
        initial_offer: u64,
        negotiation_deadline: i64,
        terms: Vec<String>,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(negotiation_deadline > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
        require!(terms.len() <= MAX_TERMS_COUNT, PodAIMarketplaceError::TooManyTerms);
        
        for term in &terms {
            require!(term.len() <= MAX_TERM_LENGTH, PodAIMarketplaceError::TermTooLong);
        }
        
        self.initiator = initiator;
        self.counterparty = counterparty;
        self.initial_offer = initial_offer;
        self.current_offer = initial_offer;
        self.counter_offers = Vec::new();
        self.negotiation_deadline = negotiation_deadline;
        self.status = NegotiationStatus::InitialOffer;
        self.terms = terms;
        self.created_at = clock.unix_timestamp;
        self.last_activity = clock.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }

    pub fn make_counter_offer(&mut self, offer: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp < self.negotiation_deadline, PodAIMarketplaceError::NegotiationExpired);
        require!(
            matches!(self.status, NegotiationStatus::InitialOffer | NegotiationStatus::CounterOffer),
            PodAIMarketplaceError::InvalidNegotiationStatus
        );
        require!(self.counter_offers.len() < MAX_COUNTER_OFFERS, PodAIMarketplaceError::TooManyCounterOffers);
        
        self.counter_offers.push(offer);
        self.current_offer = offer;
        self.status = NegotiationStatus::CounterOffer;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn accept_offer(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp < self.negotiation_deadline, PodAIMarketplaceError::NegotiationExpired);
        require!(
            matches!(self.status, NegotiationStatus::InitialOffer | NegotiationStatus::CounterOffer),
            PodAIMarketplaceError::InvalidNegotiationStatus
        );
        
        self.status = NegotiationStatus::Accepted;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn reject_offer(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        self.status = NegotiationStatus::Rejected;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn check_expiry(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        if clock.unix_timestamp >= self.negotiation_deadline && 
           matches!(self.status, NegotiationStatus::InitialOffer | NegotiationStatus::CounterOffer) {
            self.status = NegotiationStatus::Expired;
        }
        
        Ok(())
    }
}

impl AuctionMarketplace {
    pub const LEN: usize = 8 + // discriminator
        32 + // auction
        32 + // agent
        32 + // creator
        1 + // auction_type
        8 + // starting_price
        8 + // reserve_price
        8 + // current_price
        1 + 32 + // current_winner (Option<Pubkey>)
        1 + 32 + // winner (Option<Pubkey>)
        8 + // auction_end_time
        8 + // minimum_bid_increment
        4 + // total_bids
        1 + // status
        4 + (MAX_BIDS_COUNT * (32 + 8 + 8 + 1)) + // bids (bidder + amount + timestamp + is_winning)
        8 + // created_at
        1 + 8 + // ended_at (Option<i64>)
        4 + MAX_GENERAL_STRING_LENGTH + // metadata_uri
        1; // bump

    pub fn initialize(
        &mut self,
        auction: Pubkey,
        agent: Pubkey,
        creator: Pubkey,
        auction_type: AuctionType,
        starting_price: u64,
        reserve_price: u64,
        auction_end_time: i64,
        minimum_bid_increment: u64,
        metadata_uri: String,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(metadata_uri.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::MetadataUriTooLong);
        
        self.auction = auction;
        self.agent = agent;
        self.creator = creator;
        self.auction_type = auction_type;
        self.starting_price = starting_price;
        self.reserve_price = reserve_price;
        self.current_price = starting_price;
        self.current_winner = None;
        self.winner = None;
        self.auction_end_time = auction_end_time;
        self.minimum_bid_increment = minimum_bid_increment;
        self.total_bids = 0;
        self.status = AuctionStatus::Active;
        self.bids = Vec::new();
        self.created_at = clock.unix_timestamp;
        self.ended_at = None;
        self.metadata_uri = metadata_uri;
        self.bump = bump;
        
        Ok(())
    }

    pub fn place_bid(&mut self, bidder: Pubkey, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(self.status == AuctionStatus::Active, PodAIMarketplaceError::AuctionNotActive);
        require!(clock.unix_timestamp < self.auction_end_time, PodAIMarketplaceError::AuctionEnded);
        require!(self.bids.len() < MAX_BIDS_COUNT, PodAIMarketplaceError::TooManyBids);
        
        let minimum_bid = if self.current_winner.is_none() {
            self.starting_price
        } else {
            self.current_price.saturating_add(self.minimum_bid_increment)
        };
        
        require!(amount >= minimum_bid, PodAIMarketplaceError::BidTooLow);
        
        // Mark previous winning bid as not winning
        if let Some(last_bid) = self.bids.last_mut() {
            last_bid.is_winning = false;
        }
        
        // Add new bid
        self.bids.push(AuctionBid {
            bidder,
            amount,
            timestamp: clock.unix_timestamp,
            is_winning: true,
        });
        
        self.current_price = amount;
        self.current_winner = Some(bidder);
        self.total_bids = self.total_bids.saturating_add(1);
        
        Ok(())
    }

    pub fn end_auction(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(self.status == AuctionStatus::Active, PodAIMarketplaceError::AuctionNotActive);
        require!(clock.unix_timestamp >= self.auction_end_time, PodAIMarketplaceError::AuctionNotEnded);
        
        self.status = AuctionStatus::Ended;
        self.ended_at = Some(clock.unix_timestamp);
        
        Ok(())
    }

    pub fn settle_auction(&mut self) -> Result<()> {
        require!(self.status == AuctionStatus::Ended, PodAIMarketplaceError::AuctionNotEnded);
        
        // Check if reserve price was met
        if self.current_price >= self.reserve_price {
            self.status = AuctionStatus::Settled;
        } else {
            self.status = AuctionStatus::Cancelled;
        }
        
        Ok(())
    }
}