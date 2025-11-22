/*!
 * Agent State Module
 *
 * Contains data structures related to AI agents and their verification.
 */

use super::{GhostSpeakError, MAX_CAPABILITIES_COUNT, MAX_GENERAL_STRING_LENGTH, MAX_NAME_LENGTH};
use anchor_lang::prelude::*;

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
    // Additional fields for GhostSpeak marketplace
    pub framework_origin: String, // e.g., "eliza", "autogen", "langchain"
    pub supported_tokens: Vec<Pubkey>, // SPL-2022 tokens accepted
    pub cnft_mint: Option<Pubkey>, // Compressed NFT for replication
    pub merkle_tree: Option<Pubkey>, // Merkle tree for verification
    pub supports_a2a: bool,       // Agent-to-agent communication
    pub transfer_hook: Option<Pubkey>, // SPL-2022 transfer hook
    pub parent_agent: Option<Pubkey>, // Parent agent for lineage tracking
    pub generation: u32,          // Generation number (0 for original, 1+ for replicas)
    // x402 Payment Protocol Support
    pub x402_enabled: bool,       // Whether agent accepts x402 payments
    pub x402_payment_address: Pubkey, // Address for receiving x402 payments
    pub x402_accepted_tokens: Vec<Pubkey>, // Tokens accepted (USDC, PYUSD, etc.)
    pub x402_price_per_call: u64, // Price per API call in token's smallest unit
    pub x402_service_endpoint: String, // HTTP endpoint for x402 payments
    pub x402_total_payments: u64, // Total x402 payments received
    pub x402_total_calls: u64,    // Total x402 API calls serviced
    pub last_payment_timestamp: i64, // Last time agent received x402 payment (proof of activity)
    // API Schema Support for Service Discovery
    pub api_spec_uri: String,     // IPFS/HTTP URL to OpenAPI 3.0 spec (JSON)
    pub api_version: String,      // Semantic version of the API (e.g., "1.0.0")
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
        4 + MAX_GENERAL_STRING_LENGTH + // framework_origin
        4 + (10 * 32) + // supported_tokens (max 10)
        1 + 32 + // cnft_mint Option
        1 + 32 + // merkle_tree Option
        1 + // supports_a2a
        1 + 32 + // transfer_hook Option
        1 + 32 + // parent_agent Option<Pubkey>
        4 + // generation u32
        // x402 fields
        1 + // x402_enabled bool
        32 + // x402_payment_address Pubkey
        4 + (10 * 32) + // x402_accepted_tokens (max 10)
        8 + // x402_price_per_call u64
        4 + MAX_GENERAL_STRING_LENGTH + // x402_service_endpoint
        8 + // x402_total_payments u64
        8 + // x402_total_calls u64
        8 + // last_payment_timestamp i64
        // API schema fields
        4 + MAX_GENERAL_STRING_LENGTH + // api_spec_uri
        4 + 32 + // api_version (max 32 chars for semver like "1.0.0")
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

    /// Check if agent is verified (has completed at least 1 paid job)
    /// Simple proof-of-agent: real agents do real work
    pub fn is_verified_agent(&self) -> bool {
        self.x402_total_calls > 0
    }

    /// Check if agent is active (received payment in last 30 days)
    pub fn is_active_agent(&self, current_time: i64) -> bool {
        if self.last_payment_timestamp == 0 {
            return false;
        }

        const SECONDS_IN_DAY: i64 = 86400;
        const INACTIVITY_THRESHOLD_DAYS: i64 = 30;

        let seconds_since_payment = current_time.saturating_sub(self.last_payment_timestamp);
        let days_since_payment = seconds_since_payment / SECONDS_IN_DAY;
        days_since_payment < INACTIVITY_THRESHOLD_DAYS
    }

    /// Check if agent is dead (no payment in 30+ days but has history)
    pub fn is_dead_agent(&self, current_time: i64) -> bool {
        self.x402_total_calls > 0 && !self.is_active_agent(current_time)
    }

    /// Update last payment timestamp (called when x402 payment received)
    pub fn record_payment_activity(&mut self, timestamp: i64) {
        self.last_payment_timestamp = timestamp;
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
        require!(name.len() <= MAX_NAME_LENGTH, GhostSpeakError::NameTooLong);
        require!(
            description.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::DescriptionTooLong
        );

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
        self.api_spec_uri = String::new();
        self.api_version = String::new();
        self.last_payment_timestamp = 0;
        self.bump = bump;

        Ok(())
    }

    /// Validate agent state
    pub fn validate(&self) -> Result<()> {
        require!(
            self.name.len() <= MAX_NAME_LENGTH,
            GhostSpeakError::NameTooLong
        );
        require!(
            self.description.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::DescriptionTooLong
        );
        require!(
            self.capabilities.len() <= MAX_CAPABILITIES_COUNT,
            GhostSpeakError::TooManyCapabilities
        );
        require!(
            self.genome_hash.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::InvalidGenomeHash
        );
        require!(
            self.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::InvalidServiceEndpoint
        );
        require!(
            self.metadata_uri.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::InvalidMetadataUri
        );

        for capability in &self.capabilities {
            require!(
                capability.len() <= MAX_GENERAL_STRING_LENGTH,
                GhostSpeakError::CapabilityTooLong
            );
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
