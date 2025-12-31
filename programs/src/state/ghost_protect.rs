/*!
 * Ghost Protect Escrow State Module
 *
 * Data structures for B2C escrow with dispute resolution.
 */

use anchor_lang::prelude::*;

/// Individual escrow account for agent service payments
#[account]
pub struct GhostProtectEscrow {
    /// Unique escrow ID
    pub escrow_id: u64,

    /// Client (payer)
    pub client: Pubkey,

    /// Agent (service provider)
    pub agent: Pubkey,

    /// Payment amount
    pub amount: u64,

    /// Payment token mint
    pub token_mint: Pubkey,

    /// Escrow status
    pub status: EscrowStatus,

    /// Job description (IPFS hash)
    pub job_description: String,

    /// Delivery proof (IPFS hash)
    pub delivery_proof: Option<String>,

    /// Deadline timestamp
    pub deadline: i64,

    /// Created timestamp
    pub created_at: i64,

    /// Completed/disputed timestamp
    pub completed_at: Option<i64>,

    /// Dispute reason (if disputed)
    pub dispute_reason: Option<String>,

    /// Arbitrator decision (if disputed)
    pub arbitrator_decision: Option<ArbitratorDecision>,

    pub bump: u8,
}

impl GhostProtectEscrow {
    pub const MAX_DESCRIPTION_LEN: usize = 200;
    pub const MAX_PROOF_LEN: usize = 200;
    pub const MAX_DISPUTE_REASON_LEN: usize = 500;
    pub const MAX_DECISION_REASON_LEN: usize = 200;

    pub const LEN: usize = 8 + // discriminator
        8 +  // escrow_id
        32 + // client
        32 + // agent
        8 +  // amount
        32 + // token_mint
        1 +  // status
        4 + Self::MAX_DESCRIPTION_LEN + // job_description
        1 + 4 + Self::MAX_PROOF_LEN +   // delivery_proof Option<String>
        8 +  // deadline
        8 +  // created_at
        1 + 8 + // completed_at Option<i64>
        1 + 4 + Self::MAX_DISPUTE_REASON_LEN + // dispute_reason Option<String>
        1 + (1 + 4 + Self::MAX_DECISION_REASON_LEN) + // arbitrator_decision (enum + optional reason)
        1;   // bump
}

/// Escrow lifecycle states
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EscrowStatus {
    /// Escrow created, awaiting delivery
    Active,
    /// Work delivered, payment released
    Completed,
    /// Dispute filed, awaiting arbitration
    Disputed,
    /// Escrow cancelled (refund to client)
    Cancelled,
}

/// Arbitrator's final decision on disputed escrow
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ArbitratorDecision {
    /// Full payment to client (fraud detected)
    FavorClient { reason: String },
    /// Full payment to agent (delivery confirmed)
    FavorAgent { reason: String },
    /// Split payment between client and agent
    Split { client_percentage: u8, reason: String },
}

// =====================================================
// GHOST PROTECT EVENTS
// =====================================================

#[event]
pub struct EscrowCreatedEvent {
    pub escrow_id: u64,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub deadline: i64,
}

#[event]
pub struct DeliverySubmittedEvent {
    pub escrow_id: u64,
    pub agent: Pubkey,
    pub delivery_proof: String,
}

#[event]
pub struct EscrowCompletedEvent {
    pub escrow_id: u64,
    pub agent: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DisputeFiledEvent {
    pub escrow_id: u64,
    pub client: Pubkey,
    pub reason: String,
}

#[event]
pub struct DisputeResolvedEvent {
    pub escrow_id: u64,
    pub decision: ArbitratorDecision,
    pub arbitrator: Pubkey,
}
