/*!
 * Agent State Module
 * 
 * Contains data structures related to AI agents and their verification.
 */

use anchor_lang::prelude::*;
use super::{MAX_GENERAL_STRING_LENGTH, MAX_CAPABILITIES_COUNT, MAX_NAME_LENGTH, PodAIMarketplaceError};

// Import PricingModel from lib.rs
use crate::PricingModel;

// PDA Seeds
pub const AGENT_SEED: &[u8] = b"agent";
pub const AGENT_VERIFICATION_SEED: &[u8] = b"agent_verification";


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentVerificationData {
    pub agent_pubkey: Pubkey,
    pub service_endpoint: String,
    pub supported_capabilities: Vec<u64>,
    pub verified_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentServiceData {
    pub agent_pubkey: Pubkey,
    pub service_type: String,
    pub price_per_unit: u64,
    pub available_capacity: u64,
    pub metadata: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentCustomization {
    pub owner: Pubkey,
    pub base_agent: Pubkey,
    pub customization_data: String,
    pub performance_metrics: String,
    pub is_public: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentAnalytics {
    pub agent_pubkey: Pubkey,
    pub total_transactions: u64,
    pub success_rate: u32, // Store as basis points (0-10000) for 0-100%
    pub average_response_time: u64, // Store in milliseconds
    pub total_earnings: u64,
    pub reputation_score: u32, // Store as basis points (0-10000) for 0-100
}

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub reputation_score: u32,
    pub total_jobs_completed: u32,
    pub total_earnings: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub original_price: u64,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
    pub service_endpoint: String,
    pub is_verified: bool,
    pub verification_timestamp: i64,
    pub metadata_uri: String,
    pub bump: u8,
}

impl Agent {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        4 + MAX_NAME_LENGTH + // name
        4 + MAX_GENERAL_STRING_LENGTH + // description
        4 + (4 + MAX_GENERAL_STRING_LENGTH) * MAX_CAPABILITIES_COUNT + // capabilities
        1 + 1 + // pricing_model enum (1 byte discriminator + 1 byte for enum variant)
        4 + // reputation_score
        4 + // total_jobs_completed
        8 + // total_earnings
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        8 + // original_price
        4 + MAX_GENERAL_STRING_LENGTH + // genome_hash
        1 + // is_replicable
        8 + // replication_fee
        4 + MAX_GENERAL_STRING_LENGTH + // service_endpoint
        1 + // is_verified
        8 + // verification_timestamp
        4 + MAX_GENERAL_STRING_LENGTH + // metadata_uri
        1; // bump

    /// Deactivate the agent
    pub fn deactivate(&mut self) {
        self.is_active = false;
    }

    /// Activate the agent
    pub fn activate(&mut self) {
        self.is_active = true;
    }

    /// Update agent reputation score
    pub fn update_reputation(&mut self, reputation_score: u64) {
        // SECURITY: Safe conversion with bounds checking
        self.reputation_score = reputation_score.min(u32::MAX as u64) as u32;
        self.updated_at = Clock::get().unwrap().unix_timestamp;
    }

    /// Initialize a new agent
    pub fn initialize(
        &mut self,
        owner: Pubkey,
        name: String,
        description: String,
        pricing_model: PricingModel,
        bump: u8,
    ) -> Result<()> {
        require!(name.len() <= MAX_NAME_LENGTH, PodAIMarketplaceError::NameTooLong);
        require!(description.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::DescriptionTooLong);
        
        let clock = Clock::get()?;
        
        self.owner = owner;
        self.name = name;
        self.description = description;
        self.capabilities = Vec::new();
        self.pricing_model = pricing_model;
        self.reputation_score = 0;
        self.total_jobs_completed = 0;
        self.total_earnings = 0;
        self.is_active = true;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.original_price = 0;
        self.genome_hash = String::new();
        self.is_replicable = false;
        self.replication_fee = 0;
        self.service_endpoint = String::new();
        self.is_verified = false;
        self.verification_timestamp = 0;
        self.metadata_uri = String::new();
        self.bump = bump;
        
        Ok(())
    }

    /// Validate agent state
    pub fn validate(&self) -> Result<()> {
        require!(self.name.len() <= MAX_NAME_LENGTH, PodAIMarketplaceError::NameTooLong);
        require!(self.description.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::DescriptionTooLong);
        require!(self.capabilities.len() <= MAX_CAPABILITIES_COUNT, PodAIMarketplaceError::TooManyCapabilities);
        require!(self.genome_hash.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::InvalidGenomeHash);
        require!(self.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::InvalidServiceEndpoint);
        require!(self.metadata_uri.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::InvalidMetadataUri);
        
        for capability in &self.capabilities {
            require!(capability.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::CapabilityTooLong);
        }
        
        Ok(())
    }
}

#[account]
pub struct AgentVerification {
    pub agent: Pubkey,
    pub verifier: Pubkey,
    pub verification_data: AgentVerificationData,
    pub created_at: i64,
    pub expires_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl AgentVerification {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // verifier
        (32 + 4 + MAX_GENERAL_STRING_LENGTH + 4 + (8 * MAX_CAPABILITIES_COUNT) + 8) + // verification_data
        8 + // created_at
        8 + // expires_at
        1 + // is_active
        1; // bump

    pub fn is_valid(&self, current_time: i64) -> bool {
        self.is_active && current_time < self.expires_at
    }

    pub fn revoke(&mut self) {
        self.is_active = false;
    }

    /// Initialize a new agent verification
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        verifier: Pubkey,
        verification_data: AgentVerificationData,
        expires_at: i64,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        self.agent = agent;
        self.verifier = verifier;
        self.verification_data = verification_data;
        self.created_at = clock.unix_timestamp;
        self.expires_at = expires_at;
        self.is_active = true;
        self.bump = bump;
        
        Ok(())
    }
}