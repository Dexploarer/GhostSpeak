/*!
 * Marketplace State Module
 * 
 * Contains marketplace related state structures including service listings,
 * job postings, applications, and contracts.
 */

use anchor_lang::prelude::*;
use crate::{ApplicationStatus, ContractStatus, Deliverable};

// =====================================================
// MARKETPLACE ENUMS
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PurchaseStatus {
    Pending,
    Confirmed,
    Completed,
    Cancelled,
    Paid,
}

// =====================================================
// SERVICE LISTING STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServiceListingData {
    pub title: String,
    pub description: String,
    pub price: u64,
    pub token_mint: Pubkey,
    pub service_type: String,
    pub payment_token: Pubkey,
    pub estimated_delivery: i64,
    pub tags: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobApplicationData {
    pub cover_letter: String,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<String>,
}

#[account]
pub struct ServiceListing {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub title: String,
    pub description: String,
    pub price: u64,
    pub token_mint: Pubkey,
    pub service_type: String,
    pub payment_token: Pubkey,
    pub estimated_delivery: i64,
    pub tags: Vec<String>,
    pub is_active: bool,
    pub total_orders: u32,
    pub rating: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct ServicePurchase {
    pub customer: Pubkey,
    pub agent: Pubkey,
    pub listing: Pubkey,
    pub listing_id: u64,
    pub quantity: u32,
    pub requirements: Vec<String>,
    pub custom_instructions: String,
    pub deadline: i64,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub status: PurchaseStatus,
    pub purchased_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

// =====================================================
// JOB POSTING STRUCTURES
// =====================================================

#[account]
pub struct JobPosting {
    pub employer: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub budget: u64,
    pub deadline: i64,
    pub skills_needed: Vec<String>,
    pub budget_min: u64,
    pub budget_max: u64,
    pub payment_token: Pubkey,
    pub job_type: String,
    pub experience_level: String,
    pub is_active: bool,
    pub applications_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobApplication {
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub agent_owner: Pubkey,
    pub cover_letter: String,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<String>,
    pub status: ApplicationStatus,
    pub applied_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobContract {
    pub job_posting: Pubkey,
    pub application: Pubkey,
    pub employer: Pubkey,
    pub agent: Pubkey,
    pub agreed_rate: u64,
    pub deadline: i64,
    pub payment_token: Pubkey,
    pub status: ContractStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobCompletion {
    pub contract: Pubkey,
    pub agent: Pubkey,
    pub employer: Pubkey,
    pub deliverables: Vec<Deliverable>,
    pub work_summary: String,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub completed_at: i64,
    pub is_approved: bool,
    pub bump: u8,
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct ServiceListingCreatedEvent {
    pub listing: Pubkey,
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub title: String,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct ServicePurchasedEvent {
    pub purchase: Pubkey,
    pub customer: Pubkey,
    pub agent: Pubkey,
    pub listing: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct JobPostingCreatedEvent {
    pub job_posting: Pubkey,
    pub employer: Pubkey,
    pub title: String,
    pub budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct JobApplicationSubmittedEvent {
    pub application: Pubkey,
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub proposed_rate: u64,
    pub timestamp: i64,
}

#[event]
pub struct JobApplicationAcceptedEvent {
    pub application: Pubkey,
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub employer: Pubkey,
    pub timestamp: i64,
}

// =====================================================
// SIZE CONSTANTS
// =====================================================

impl ServiceListing {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // owner
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        8 + // price
        32 + // token_mint
        4 + 50 + // service_type (max 50 chars)
        32 + // payment_token
        8 + // estimated_delivery
        4 + (10 * (4 + 20)) + // tags (max 10 tags, 20 chars each)
        1 + // is_active
        4 + // total_orders
        8 + // rating
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl ServicePurchase {
    pub const LEN: usize = 8 + // discriminator
        32 + // customer
        32 + // agent
        32 + // listing
        8 + // listing_id
        4 + // quantity
        4 + (10 * (4 + 100)) + // requirements (max 10 reqs, 100 chars each)
        4 + 500 + // custom_instructions (max 500 chars)
        8 + // deadline
        8 + // payment_amount
        32 + // payment_token
        1 + // status
        8 + // purchased_at
        8 + // updated_at
        1; // bump
}

impl JobPosting {
    pub const LEN: usize = 8 + // discriminator
        32 + // employer
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        4 + (10 * (4 + 100)) + // requirements (max 10 reqs, 100 chars each)
        8 + // budget
        8 + // deadline
        4 + (20 * (4 + 20)) + // skills_needed (max 20 skills, 20 chars each)
        8 + // budget_min
        8 + // budget_max
        32 + // payment_token
        4 + 50 + // job_type (max 50 chars)
        4 + 50 + // experience_level (max 50 chars)
        1 + // is_active
        4 + // applications_count
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl JobApplication {
    pub const LEN: usize = 8 + // discriminator
        32 + // job_posting
        32 + // agent
        32 + // agent_owner
        4 + 1000 + // cover_letter (max 1000 chars)
        8 + // proposed_rate
        8 + // estimated_delivery
        4 + (10 * (4 + 100)) + // portfolio_items (max 10 items, 100 chars each)
        1 + // status
        8 + // applied_at
        1; // bump
}

impl JobContract {
    pub const LEN: usize = 8 + // discriminator
        32 + // job_posting
        32 + // application
        32 + // employer
        32 + // agent
        8 + // agreed_rate
        8 + // deadline
        32 + // payment_token
        1 + // status
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl JobCompletion {
    pub const LEN: usize = 8 + // discriminator
        32 + // contract
        32 + // agent
        32 + // employer
        4 + (5 * 1) + // deliverables (max 5 deliverables)
        4 + 1000 + // work_summary (max 1000 chars)
        4 + 64 + // ipfs_hash (max 64 chars)
        4 + 200 + // metadata_uri (max 200 chars)
        8 + // completed_at
        1 + // is_approved
        1; // bump
}