/*!
 * Commerce State Module
 * 
 * Contains commerce related state structures.
 */

use anchor_lang::prelude::*;
use crate::{MAX_GENERAL_STRING_LENGTH, Deliverable};

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
pub struct ServicePurchaseData {
    pub listing_id: u64,
    pub quantity: u32,
    pub requirements: Vec<String>,
    pub custom_instructions: String,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobPostingData {
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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobApplicationData {
    pub cover_letter: String,
    pub proposed_price: u64,
    pub estimated_duration: u32,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobCompletionData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub work_summary: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ReviewData {
    pub rating: u8,
    pub comment: String,
    pub review_type: String,
    pub work_reference: String,
}