/*!
 * ERC-8004 Validation Registry (Solana Adapter)
 *
 * Implements the ERC-8004 Validation Registry interface on Solana.
 * Enables independent validators to verify agent work quality.
 */

use anchor_lang::prelude::*;
use crate::state::GhostSpeakError;

// PDA Seeds
pub const ERC8004_VALIDATION_SEED: &[u8] = b"erc8004_validation";
pub const VALIDATOR_REGISTRY_SEED: &[u8] = b"validator_registry";

/// Validation method type
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ValidationType {
    /// Staking-based validation (validator stakes tokens)
    Stake,
    /// Zero-knowledge machine learning verification
    ZkML,
    /// Trusted Execution Environment (TEE) verification
    TEE,
    /// Human judge/arbitrator
    HumanJudge,
    /// Custom validation method
    Custom,
}

/// Validation request from an agent
#[account]
pub struct ValidationRequest {
    /// Agent requesting validation
    pub agent: Pubkey,
    /// Job/work to be validated
    pub job_reference: String,
    /// Work output hash or URI
    pub work_output: String,
    /// Expected validation type
    pub validation_type: ValidationType,
    /// Bounty for validator (in lamports or GHOST tokens)
    pub bounty_amount: u64,
    /// Bounty token mint (None for SOL)
    pub bounty_mint: Option<Pubkey>,
    /// Whether request has been fulfilled
    pub fulfilled: bool,
    /// Validator assigned (if any)
    pub validator: Option<Pubkey>,
    /// Request created timestamp
    pub created_at: i64,
    /// Request expires at
    pub expires_at: i64,
    /// Additional metadata URI
    pub metadata_uri: Option<String>,
    /// PDA bump
    pub bump: u8,
}

impl ValidationRequest {
    pub const MAX_JOB_REF_LEN: usize = 88;
    pub const MAX_OUTPUT_LEN: usize = 128;
    pub const MAX_URI_LEN: usize = 128;

    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        4 + Self::MAX_JOB_REF_LEN + // job_reference
        4 + Self::MAX_OUTPUT_LEN + // work_output
        1 + // validation_type enum
        8 + // bounty_amount
        1 + 32 + // bounty_mint Option<Pubkey>
        1 + // fulfilled
        1 + 32 + // validator Option<Pubkey>
        8 + // created_at
        8 + // expires_at
        1 + 4 + Self::MAX_URI_LEN + // metadata_uri Option<String>
        1; // bump

    /// Initialize validation request
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        job_reference: String,
        work_output: String,
        validation_type: ValidationType,
        bounty_amount: u64,
        bounty_mint: Option<Pubkey>,
        validity_duration: i64,
        metadata_uri: Option<String>,
        bump: u8,
    ) -> Result<()> {
        require!(
            job_reference.len() <= Self::MAX_JOB_REF_LEN,
            GhostSpeakError::InvalidInput
        );
        require!(
            work_output.len() <= Self::MAX_OUTPUT_LEN,
            GhostSpeakError::InvalidInput
        );
        if let Some(ref uri) = metadata_uri {
            require!(uri.len() <= Self::MAX_URI_LEN, GhostSpeakError::InvalidMetadataUri);
        }

        let clock = Clock::get()?;

        self.agent = agent;
        self.job_reference = job_reference;
        self.work_output = work_output;
        self.validation_type = validation_type;
        self.bounty_amount = bounty_amount;
        self.bounty_mint = bounty_mint;
        self.fulfilled = false;
        self.validator = None;
        self.created_at = clock.unix_timestamp;
        self.expires_at = clock.unix_timestamp + validity_duration;
        self.metadata_uri = metadata_uri;
        self.bump = bump;

        Ok(())
    }

    /// Assign validator to request
    pub fn assign_validator(&mut self, validator: Pubkey) -> Result<()> {
        require!(!self.fulfilled, GhostSpeakError::AlreadyFulfilled);
        self.validator = Some(validator);
        Ok(())
    }

    /// Mark request as fulfilled
    pub fn mark_fulfilled(&mut self) -> Result<()> {
        require!(self.validator.is_some(), GhostSpeakError::NoValidatorAssigned);
        self.fulfilled = true;
        Ok(())
    }

    /// Check if request is valid
    pub fn is_valid(&self, current_time: i64) -> bool {
        !self.fulfilled && current_time < self.expires_at
    }
}

/// Validation response from a validator
#[account]
pub struct ValidationResponse {
    /// Validation request this is responding to
    pub request: Pubkey,
    /// Validator providing the response
    pub validator: Pubkey,
    /// Validation outcome (0-100, as per ERC-8004 spec)
    /// 0 = failed validation, 100 = perfect validation
    pub outcome_score: u8,
    /// Detailed response URI (IPFS/Arweave)
    pub response_uri: Option<String>,
    /// Validation metadata (JSON string)
    pub metadata: String,
    /// Proof of validation (signature, stake proof, TEE attestation, etc.)
    pub proof: Vec<u8>,
    /// Whether this response is verified
    pub verified: bool,
    /// Response timestamp
    pub created_at: i64,
    /// Whether bounty has been paid
    pub bounty_paid: bool,
    /// PDA bump
    pub bump: u8,
}

impl ValidationResponse {
    pub const MAX_URI_LEN: usize = 128;
    pub const MAX_METADATA_LEN: usize = 256;
    pub const MAX_PROOF_LEN: usize = 128;

    pub const LEN: usize = 8 + // discriminator
        32 + // request
        32 + // validator
        1 + // outcome_score
        1 + 4 + Self::MAX_URI_LEN + // response_uri Option<String>
        4 + Self::MAX_METADATA_LEN + // metadata
        4 + Self::MAX_PROOF_LEN + // proof
        1 + // verified
        8 + // created_at
        1 + // bounty_paid
        1; // bump

    /// Initialize validation response
    pub fn initialize(
        &mut self,
        request: Pubkey,
        validator: Pubkey,
        outcome_score: u8,
        response_uri: Option<String>,
        metadata: String,
        proof: Vec<u8>,
        bump: u8,
    ) -> Result<()> {
        require!(outcome_score <= 100, GhostSpeakError::InvalidInput);
        if let Some(ref uri) = response_uri {
            require!(uri.len() <= Self::MAX_URI_LEN, GhostSpeakError::InvalidMetadataUri);
        }
        require!(
            metadata.len() <= Self::MAX_METADATA_LEN,
            GhostSpeakError::InvalidInput
        );
        require!(
            proof.len() <= Self::MAX_PROOF_LEN,
            GhostSpeakError::InvalidInput
        );

        let clock = Clock::get()?;

        self.request = request;
        self.validator = validator;
        self.outcome_score = outcome_score;
        self.response_uri = response_uri;
        self.metadata = metadata;
        self.proof = proof;
        self.verified = false;
        self.created_at = clock.unix_timestamp;
        self.bounty_paid = false;
        self.bump = bump;

        Ok(())
    }

    /// Mark response as verified
    pub fn mark_verified(&mut self) -> Result<()> {
        self.verified = true;
        Ok(())
    }

    /// Mark bounty as paid
    pub fn mark_bounty_paid(&mut self) -> Result<()> {
        self.bounty_paid = true;
        Ok(())
    }
}

/// Validator registry entry
/// Tracks validators and their capabilities
#[account]
pub struct ValidatorRegistry {
    /// Validator public key
    pub validator: Pubkey,
    /// Validation types this validator supports
    pub supported_types: Vec<ValidationType>,
    /// Stake amount (for stake-based validation)
    pub stake_amount: u64,
    /// Stake mint
    pub stake_mint: Option<Pubkey>,
    /// Total validations performed
    pub total_validations: u64,
    /// Total validations verified
    pub verified_validations: u64,
    /// Average outcome score given
    pub average_outcome: u8,
    /// Validator reputation score (0-1000)
    pub reputation_score: u32,
    /// Is validator active
    pub is_active: bool,
    /// Registered timestamp
    pub registered_at: i64,
    /// Last validation timestamp
    pub last_validation_at: i64,
    /// TEE attestation (if applicable)
    pub tee_attestation: Option<[u8; 64]>,
    /// PDA bump
    pub bump: u8,
}

impl ValidatorRegistry {
    pub const MAX_SUPPORTED_TYPES: usize = 5;

    pub const LEN: usize = 8 + // discriminator
        32 + // validator
        4 + (1 * Self::MAX_SUPPORTED_TYPES) + // supported_types
        8 + // stake_amount
        1 + 32 + // stake_mint Option<Pubkey>
        8 + // total_validations
        8 + // verified_validations
        1 + // average_outcome
        4 + // reputation_score
        1 + // is_active
        8 + // registered_at
        8 + // last_validation_at
        1 + 64 + // tee_attestation Option<[u8; 64]>
        1; // bump

    /// Initialize validator registry
    pub fn initialize(
        &mut self,
        validator: Pubkey,
        supported_types: Vec<ValidationType>,
        stake_amount: u64,
        stake_mint: Option<Pubkey>,
        bump: u8,
    ) -> Result<()> {
        require!(
            supported_types.len() <= Self::MAX_SUPPORTED_TYPES,
            GhostSpeakError::InvalidInput
        );

        let clock = Clock::get()?;

        self.validator = validator;
        self.supported_types = supported_types;
        self.stake_amount = stake_amount;
        self.stake_mint = stake_mint;
        self.total_validations = 0;
        self.verified_validations = 0;
        self.average_outcome = 0;
        self.reputation_score = 5000; // Start at 50%
        self.is_active = true;
        self.registered_at = clock.unix_timestamp;
        self.last_validation_at = 0;
        self.tee_attestation = None;
        self.bump = bump;

        Ok(())
    }

    /// Record a validation
    pub fn record_validation(&mut self, outcome_score: u8, verified: bool) -> Result<()> {
        self.total_validations = self.total_validations.saturating_add(1);
        if verified {
            self.verified_validations = self.verified_validations.saturating_add(1);
        }

        // Update average outcome
        let total_outcome = (self.average_outcome as u64) * (self.total_validations - 1);
        let new_total = total_outcome + outcome_score as u64;
        self.average_outcome = (new_total / self.total_validations) as u8;

        // Update reputation based on verification rate
        let verification_rate = (self.verified_validations * 10000) / self.total_validations;
        self.reputation_score = (verification_rate / 10) as u32; // Convert to 0-1000 scale

        self.last_validation_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Deactivate validator
    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        Ok(())
    }
}
