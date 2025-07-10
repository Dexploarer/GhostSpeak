/*!
 * State Module - Data Structures and Account Definitions
 * 
 * This module contains all the data structures and account definitions
 * used by the GhostSpeak Protocol smart contract.
 */

// Core modules (working)
pub mod agent;

// Additional modules
pub mod analytics;
pub mod auction;
pub mod audit;
pub mod bulk_deals;
pub mod channel;
pub mod commerce;
pub mod compliance;
pub mod dispute;
pub mod escrow;
pub mod extensions;
pub mod governance;
pub mod incentives;
pub mod marketplace;
pub mod message;
pub mod negotiation;
pub mod pricing;
pub mod replication;
pub mod reputation;
pub mod risk_management;
pub mod royalty;
pub mod security_governance;
pub mod stubs;
pub mod work_order;
pub mod user_registry;

// Re-export all types
pub use agent::*;
pub use analytics::*;
pub use auction::*;
pub use audit::*;
pub use bulk_deals::*;
pub use channel::*;
pub use commerce::*;
pub use compliance::*;
pub use dispute::*;
pub use escrow::*;
pub use extensions::*;
pub use governance::*;
pub use incentives::*;
pub use marketplace::*;
pub use message::*;
pub use negotiation::*;
pub use pricing::*;
pub use replication::*;
pub use reputation::*;
pub use risk_management::*;
pub use royalty::*;
pub use security_governance::*;
pub use stubs::*;
pub use work_order::*;
pub use user_registry::*;

// Re-export error types from main lib
pub use crate::PodAIMarketplaceError;

use anchor_lang::prelude::*;

// Security constants
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_GENERAL_STRING_LENGTH: usize = 256;
pub const MAX_CAPABILITIES_COUNT: usize = 20;
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// Additional constants for various operations
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_REQUIREMENTS_ITEMS: usize = 10;
pub const MAX_MESSAGE_LENGTH: usize = 1024;
pub const MAX_TAGS_COUNT: usize = 10;
pub const MAX_TAG_LENGTH: usize = 20;
pub const MAX_SKILLS_COUNT: usize = 20;
pub const MAX_SKILL_LENGTH: usize = 50;
pub const MAX_COVER_LETTER_LENGTH: usize = 1000;
pub const MAX_PORTFOLIO_ITEMS: usize = 10;
pub const MAX_URL_LENGTH: usize = 256;
pub const MIN_BID_INCREMENT: u64 = 100;
pub const MIN_AUCTION_DURATION: i64 = 3600; // 1 hour
pub const MAX_AUCTION_DURATION: i64 = 2592000; // 30 days
pub const MAX_BIDS_PER_AUCTION_PER_USER: usize = 50;

// Common enums used across modules
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChannelType {
    Direct,
    Group,
    Public,
    Private,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Text,
    File,
    Image,
    Audio,
    System,
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ApplicationStatus {
    Submitted,
    Accepted,
    Rejected,
    Withdrawn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ContractStatus {
    Active,
    Completed,
    Cancelled,
    Disputed,
}