/*!
 * Stub Definitions
 * 
 * Temporary stub definitions for features under development.
 * These will be properly implemented in their respective modules.
 */

use anchor_lang::prelude::*;
use super::MAX_GENERAL_STRING_LENGTH;

// Analytics stubs moved to analytics.rs to avoid ambiguity

// A2A Protocol stubs  
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2ASessionData {
    pub session_id: u64,
    pub initiator: Pubkey,
    pub responder: Pubkey,
    pub session_type: String,
    pub metadata: String,
    pub expires_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2AMessageData {
    pub message_id: u64,
    pub session_id: u64,
    pub sender: Pubkey,
    pub content: String,
    pub message_type: String,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2AStatusData {
    pub status_id: u64,
    pub agent: Pubkey,
    pub status: String,
    pub capabilities: Vec<String>,
    pub availability: bool,
    pub last_updated: i64,
}

#[account]
pub struct A2ASession {
    pub session_id: u64,
    pub initiator: Pubkey,
    pub responder: Pubkey,
    pub session_type: String,
    pub metadata: String,
    pub is_active: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

#[account]
pub struct A2AMessage {
    pub message_id: u64,
    pub session: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub message_type: String,
    pub sent_at: i64,
    pub bump: u8,
}

#[account]
pub struct A2AStatus {
    pub agent: Pubkey,
    pub status: String,
    pub capabilities: Vec<String>,
    pub availability: bool,
    pub last_updated: i64,
    pub bump: u8,
}

// A2A Event definitions moved to lib.rs with proper #[event] attribute

// Bulk deals stubs - moved to bulk_deals.rs to avoid ambiguity

// Dispute resolution stubs - moved to dispute.rs to avoid ambiguity

// Extension stubs - moved to extensions.rs to avoid ambiguity

// Incentive stubs
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IncentiveConfig {
    pub reward_per_transaction: u64,
    pub min_transactions: u32,
    pub max_rewards_per_period: u64,
    pub period_duration: i64,
}

#[account]
pub struct IncentiveProgram {
    pub program_id: u64,
    pub name: String,
    pub description: String,
    pub config: IncentiveConfig,
    pub total_rewards_distributed: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

#[account]
pub struct AgentIncentives {
    pub agent: Pubkey,
    pub program: Pubkey,
    pub total_earned: u64,
    pub transactions_completed: u32,
    pub last_claim_at: i64,
    pub bump: u8,
}

// Negotiation stubs - moved to negotiation.rs to avoid ambiguity

// Royalty stubs - moved to royalty.rs to avoid ambiguity

// Note: ReplicationTemplate and ReplicationRecord are defined in replication.rs
// Note: Pricing structures (PricingAlgorithm, DynamicPricingConfig, DemandMetrics, DynamicPricingEngine) are defined in pricing.rs

// LEN implementations for all account structs

impl A2ASession {
    pub const LEN: usize = 8 + // discriminator
        8 + // session_id
        32 + // initiator
        32 + // responder
        4 + MAX_GENERAL_STRING_LENGTH + // session_type
        4 + MAX_GENERAL_STRING_LENGTH + // metadata
        1 + // is_active
        8 + // created_at
        8 + // expires_at
        1; // bump
}

impl A2AMessage {
    pub const LEN: usize = 8 + // discriminator
        8 + // message_id
        32 + // session
        32 + // sender
        4 + MAX_GENERAL_STRING_LENGTH + // content
        4 + MAX_GENERAL_STRING_LENGTH + // message_type
        8 + // sent_at
        1; // bump
}

impl A2AStatus {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        4 + MAX_GENERAL_STRING_LENGTH + // status
        4 + (10 * (4 + MAX_GENERAL_STRING_LENGTH)) + // capabilities (max 10)
        1 + // availability
        8 + // last_updated
        1; // bump
}

// Extension LEN implementation moved to extensions.rs

impl IncentiveProgram {
    pub const LEN: usize = 8 + // discriminator
        8 + // program_id
        4 + MAX_GENERAL_STRING_LENGTH + // name
        4 + MAX_GENERAL_STRING_LENGTH + // description
        (8 + 4 + 8 + 8) + // config
        8 + // total_rewards_distributed
        1 + // is_active
        8 + // created_at
        8 + // expires_at
        1; // bump
}

impl AgentIncentives {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // program
        8 + // total_earned
        4 + // transactions_completed
        8 + // last_claim_at
        1; // bump
}

// NegotiationChatbot LEN implementation moved to negotiation.rs

// RoyaltyStream and ResaleMarket LEN implementations moved to royalty.rs



// ReplicationRecord LEN is implemented in replication.rs