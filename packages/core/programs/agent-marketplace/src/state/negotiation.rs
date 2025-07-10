/*!
 * Negotiation State Module
 * 
 * Contains negotiation-related state structures.
 */

use anchor_lang::prelude::*;
use crate::PodAIMarketplaceError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NegotiationMessage {
    pub sender: Pubkey,
    pub content: String,
    pub offer_amount: Option<u64>,
    pub timestamp: i64,
}

#[account]
pub struct NegotiationChatbot {
    pub initiator: Pubkey,
    pub counterparty: Pubkey,
    pub initial_offer: u64,
    pub current_offer: u64,
    pub status: super::auction::NegotiationStatus,
    pub negotiation_deadline: i64,
    pub terms: Vec<String>,
    pub counter_offers: Vec<u64>,
    pub auto_accept_threshold: u64,
    pub created_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

impl NegotiationChatbot {
    pub const LEN: usize = 8 + // discriminator
        32 + // initiator
        32 + // counterparty
        8 + // initial_offer
        8 + // current_offer
        1 + // status
        8 + // negotiation_deadline
        4 + (super::auction::MAX_TERMS_COUNT * (4 + super::auction::MAX_TERM_LENGTH)) + // terms
        4 + (super::auction::MAX_COUNTER_OFFERS * 8) + // counter_offers
        8 + // auto_accept_threshold
        8 + // created_at
        8 + // last_activity
        1; // bump

    pub fn initialize(
        &mut self,
        initiator: Pubkey,
        counterparty: Pubkey,
        initial_offer: u64,
        auto_accept_threshold: u64,
        negotiation_deadline: i64,
        terms: Vec<String>,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(negotiation_deadline > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
        require!(terms.len() <= super::auction::MAX_TERMS_COUNT, PodAIMarketplaceError::TooManyTerms);
        
        for term in &terms {
            require!(term.len() <= super::auction::MAX_TERM_LENGTH, PodAIMarketplaceError::TermTooLong);
        }
        
        self.initiator = initiator;
        self.counterparty = counterparty;
        self.initial_offer = initial_offer;
        self.current_offer = initial_offer;
        self.status = super::auction::NegotiationStatus::InitialOffer;
        self.negotiation_deadline = negotiation_deadline;
        self.terms = terms;
        self.counter_offers = Vec::new();
        self.auto_accept_threshold = auto_accept_threshold;
        self.created_at = clock.unix_timestamp;
        self.last_activity = clock.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }

    pub fn make_counter_offer(&mut self, offer: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp < self.negotiation_deadline, PodAIMarketplaceError::NegotiationExpired);
        require!(
            matches!(self.status, super::auction::NegotiationStatus::InitialOffer | super::auction::NegotiationStatus::CounterOffer),
            PodAIMarketplaceError::InvalidNegotiationStatus
        );
        require!(self.counter_offers.len() < super::auction::MAX_COUNTER_OFFERS, PodAIMarketplaceError::TooManyCounterOffers);
        
        self.counter_offers.push(offer);
        self.current_offer = offer;
        self.status = super::auction::NegotiationStatus::CounterOffer;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn accept_offer(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp < self.negotiation_deadline, PodAIMarketplaceError::NegotiationExpired);
        require!(
            matches!(self.status, super::auction::NegotiationStatus::InitialOffer | super::auction::NegotiationStatus::CounterOffer),
            PodAIMarketplaceError::InvalidNegotiationStatus
        );
        
        self.status = super::auction::NegotiationStatus::Accepted;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn reject_offer(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        self.status = super::auction::NegotiationStatus::Rejected;
        self.last_activity = clock.unix_timestamp;
        
        Ok(())
    }

    pub fn check_expiry(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        if clock.unix_timestamp >= self.negotiation_deadline && 
           matches!(self.status, super::auction::NegotiationStatus::InitialOffer | super::auction::NegotiationStatus::CounterOffer) {
            self.status = super::auction::NegotiationStatus::Expired;
        }
        
        Ok(())
    }
}