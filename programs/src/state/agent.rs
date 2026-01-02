/*!
 * Agent State Module
 *
 * Contains data structures related to AI agents and their verification.
 */

use super::{GhostSpeakError, MAX_CAPABILITIES_COUNT, MAX_GENERAL_STRING_LENGTH, MAX_NAME_LENGTH};
use anchor_lang::prelude::*;

// Import PricingModel from lib.rs
use crate::PricingModel;

// ========== GHOST IDENTITY ENHANCEMENTS ==========

/// Agent lifecycle status (Ghost Identity)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AgentStatus {
    /// Auto-created from x402 transaction, minimal data
    Unregistered,
    /// Agent added metadata (name, desc, endpoint)
    Registered,
    /// Ownership proven via signature
    Claimed,
    /// DID + VCs issued
    Verified,
}

/// Cross-platform identity mapping
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ExternalIdentifier {
    pub platform: String,           // "payai", "eliza", "crossmint", etc.
    pub external_id: String,        // Platform-specific agent ID
    pub verified: bool,             // Ownership verified?
    pub verified_at: i64,           // When verified
}

/// Reputation component for multi-source Ghost Score
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ReputationComponent {
    pub source_type: ReputationSourceType,
    pub score: u64,                 // Raw score (0-100)
    pub weight: u32,                // Weight in basis points (0-10000)
    pub last_updated: i64,
    pub data_points: u64,           // Sample size
}

/// Multi-source reputation types for Ghost Score
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReputationSourceType {
    // Activity Sources (60% total)
    AccountAge,                     // 30%
    X402Transactions,               // 30%

    // Platform Sources (30% total)
    UserReviews,                    // 10% - User ratings/reviews from service usage
    ElizaOSReputation,              // 10%
    CrossmintVerification,          // 5%
    EndpointReliability,            // 5%

    // Achievement Sources (10% total)
    JobCompletions,                 // 5%
    SkillEndorsements,              // 5%
}

// PDA Seeds (exported for instruction use)
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
    // ========== GHOST IDENTITY CORE ==========
    pub owner: Option<Pubkey>,    // None until claimed (CHANGED FOR GHOST)
    pub status: AgentStatus,      // Lifecycle state (NEW FOR GHOST)
    pub agent_id: String,         // Backward compatibility

    // === DISCOVERY PROVENANCE (NEW FOR GHOST) ===
    pub first_tx_signature: String, // How we discovered this Ghost
    pub first_seen_timestamp: i64,  // When auto-created
    pub discovery_source: String,   // "http:payai", "blockchain:direct"
    pub claimed_at: Option<i64>,    // When ownership proven

    // === BASIC METADATA ===
    pub agent_type: u8,           // Agent type (0=general, 1=trading, 2=content, 3=automation, etc.)
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,

    // === LEGACY REPUTATION (KEPT FOR COMPAT) ===
    pub reputation_score: u32,
    pub total_jobs_completed: u32,
    pub total_earnings: u64,

    // === TIMESTAMPS ===
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
    pub last_payment_timestamp: i64, // Timestamp of last x402 payment (for proof-of-agent)

    // === CROSS-PLATFORM IDENTITY (NEW FOR GHOST) ===
    pub external_identifiers: Vec<ExternalIdentifier>, // Platform ID mappings

    // === MULTI-SOURCE REPUTATION (NEW FOR GHOST) ===
    pub ghost_score: u64,                              // 0-1000 weighted score
    pub reputation_components: Vec<ReputationComponent>, // Source breakdown

    // === CREDENTIALS (NEW FOR GHOST) ===
    pub did_address: Option<Pubkey>,  // W3C DID document PDA
    pub credentials: Vec<Pubkey>,     // VC references

    // API Schema Support for Service Discovery
    pub api_spec_uri: String,     // IPFS/HTTP URL to OpenAPI 3.0 spec (JSON)
    pub api_version: String,      // Semantic version of the API (e.g., "1.0.0")
    pub bump: u8,
}

impl Agent {
    // Reduced sizes to prevent memory allocation failures
    pub const MAX_DESC_LEN: usize = 64;    // Reduced from 128
    pub const MAX_ENDPOINT_LEN: usize = 64; // Reduced for endpoints
    pub const MAX_URI_LEN: usize = 64;      // Reduced for URIs
    pub const MAX_TOKENS: usize = 5;        // Reduced from 10
    pub const MAX_CAP_LEN: usize = 32;      // Reduced capability string length
    pub const MAX_EXTERNAL_IDS: usize = 10; // Max external identifiers
    pub const MAX_REPUTATION_COMPONENTS: usize = 8; // Max reputation sources
    pub const MAX_CREDENTIALS: usize = 20;  // Max VCs
    pub const MAX_EXTERNAL_ID_LEN: usize = 64; // Max external ID string

    pub const LEN: usize = 8 + // discriminator
        // === GHOST IDENTITY CORE ===
        1 + 32 + // owner: Option<Pubkey> (CHANGED)
        1 + // status: AgentStatus enum
        4 + 32 + // agent_id (max 32 chars)
        // === DISCOVERY PROVENANCE ===
        4 + 88 + // first_tx_signature (Solana signature)
        8 + // first_seen_timestamp i64
        4 + 32 + // discovery_source
        1 + 8 + // claimed_at: Option<i64>
        // === BASIC METADATA ===
        1 + // agent_type u8
        4 + MAX_NAME_LENGTH + // name
        4 + Self::MAX_DESC_LEN + // description (reduced)
        4 + (4 + Self::MAX_CAP_LEN) * MAX_CAPABILITIES_COUNT + // capabilities (reduced)
        1 + 1 + // pricing_model enum
        // === LEGACY REPUTATION ===
        4 + // reputation_score
        4 + // total_jobs_completed
        8 + // total_earnings
        // === TIMESTAMPS ===
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        8 + // original_price
        4 + Self::MAX_DESC_LEN + // genome_hash (reduced)
        1 + // is_replicable
        8 + // replication_fee
        4 + Self::MAX_ENDPOINT_LEN + // service_endpoint (reduced)
        1 + // is_verified
        8 + // verification_timestamp
        4 + Self::MAX_URI_LEN + // metadata_uri (reduced)
        4 + 32 + // framework_origin (reduced)
        4 + (Self::MAX_TOKENS * 32) + // supported_tokens (reduced)
        1 + 32 + // cnft_mint Option
        1 + 32 + // merkle_tree Option
        1 + // supports_a2a
        1 + 32 + // transfer_hook Option
        1 + 32 + // parent_agent Option<Pubkey>
        4 + // generation u32
        // x402 fields
        1 + // x402_enabled bool
        32 + // x402_payment_address Pubkey
        4 + (Self::MAX_TOKENS * 32) + // x402_accepted_tokens (reduced)
        8 + // x402_price_per_call u64
        4 + Self::MAX_ENDPOINT_LEN + // x402_service_endpoint (reduced)
        8 + // x402_total_payments u64
        8 + // x402_total_calls u64
        8 + // last_payment_timestamp i64
        // === CROSS-PLATFORM IDENTITY (NEW FOR GHOST) ===
        4 + (Self::MAX_EXTERNAL_IDS * (4 + 32 + 4 + Self::MAX_EXTERNAL_ID_LEN + 1 + 8)) + // external_identifiers
        // === MULTI-SOURCE REPUTATION (NEW FOR GHOST) ===
        8 + // ghost_score u64
        4 + (Self::MAX_REPUTATION_COMPONENTS * (1 + 8 + 4 + 8 + 8)) + // reputation_components
        // === CREDENTIALS (NEW FOR GHOST) ===
        1 + 32 + // did_address: Option<Pubkey>
        4 + (Self::MAX_CREDENTIALS * 32) + // credentials Vec<Pubkey>
        // API schema fields
        4 + Self::MAX_URI_LEN + // api_spec_uri (reduced)
        4 + 16 + // api_version (reduced for semver)
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

    /// Initialize a new agent (for backward compatibility - creates Registered status)
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

        // Ghost Identity fields
        self.owner = Some(owner); // Set owner immediately (backward compat)
        self.status = AgentStatus::Registered; // Start as Registered (manual registration)
        self.agent_id = String::new();
        self.first_tx_signature = String::new();
        self.first_seen_timestamp = clock.unix_timestamp;
        self.discovery_source = String::from("manual");
        self.claimed_at = Some(clock.unix_timestamp); // Auto-claim for manual registration

        // Metadata
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

        // Ghost reputation fields
        self.external_identifiers = Vec::new();
        self.ghost_score = 0;
        self.reputation_components = Vec::new();
        self.did_address = None;
        self.credentials = Vec::new();

        self.bump = bump;

        Ok(())
    }

    /// Initialize an auto-discovered Ghost (from x402 monitoring)
    pub fn initialize_ghost(
        &mut self,
        payment_address: Pubkey,
        first_tx_signature: String,
        discovery_source: String,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Ghost Identity - owner is None until claimed
        self.owner = None;
        self.status = AgentStatus::Unregistered;
        self.agent_id = String::new();
        self.first_tx_signature = first_tx_signature;
        self.first_seen_timestamp = clock.unix_timestamp;
        self.discovery_source = discovery_source;
        self.claimed_at = None;

        // Minimal metadata for Unregistered Ghost
        self.name = String::new();
        self.description = String::new();
        self.capabilities = Vec::new();
        self.pricing_model = PricingModel::Fixed;
        self.reputation_score = 0;
        self.total_jobs_completed = 0;
        self.total_earnings = 0;
        self.is_active = true;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;

        // x402 fields
        self.x402_enabled = true;
        self.x402_payment_address = payment_address;
        self.x402_total_payments = 0;
        self.x402_total_calls = 0;
        self.last_payment_timestamp = 0;

        // Ghost reputation
        self.external_identifiers = Vec::new();
        self.ghost_score = 0;
        self.reputation_components = Vec::new();
        self.did_address = None;
        self.credentials = Vec::new();

        self.bump = bump;

        Ok(())
    }

    // ========== Proof-of-Agent Methods ==========

    /// Constants for proof-of-agent verification
    const ACTIVITY_THRESHOLD_SECONDS: i64 = 30 * 24 * 60 * 60; // 30 days

    /// Check if agent is verified (has completed at least 1 paid x402 transaction)
    pub fn is_verified_agent(&self) -> bool {
        self.x402_total_calls > 0
    }

    /// Check if agent is active (received payment in last 30 days)
    pub fn is_active_agent(&self, current_timestamp: i64) -> bool {
        if !self.is_verified_agent() {
            return false;
        }
        let time_since_last_payment = current_timestamp - self.last_payment_timestamp;
        time_since_last_payment <= Self::ACTIVITY_THRESHOLD_SECONDS
    }

    /// Check if agent is dead (has payment history but inactive for 30+ days)
    pub fn is_dead_agent(&self, current_timestamp: i64) -> bool {
        if !self.is_verified_agent() {
            return false; // Unverified agents are not "dead", just unverified
        }
        let time_since_last_payment = current_timestamp - self.last_payment_timestamp;
        time_since_last_payment > Self::ACTIVITY_THRESHOLD_SECONDS
    }

    /// Record a payment activity (call this when x402 payment is received)
    pub fn record_payment_activity(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.last_payment_timestamp = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
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
            GhostSpeakError::InvalidInput
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
