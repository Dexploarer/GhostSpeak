/*!
 * GhostSpeak Reputation Registry
 *
 * Allows clients to give feedback and agents to respond, building verifiable reputation.
 * Part of GhostSpeak's multi-source reputation aggregation system.
 */

use anchor_lang::prelude::*;
use crate::state::GhostSpeakError;

// PDA Seeds
pub const FEEDBACK_SEED: &[u8] = b"feedback";
pub const FEEDBACK_AUTH_SEED: &[u8] = b"feedback_auth";

/// Feedback entry for agent reputation
#[account]
pub struct AgentFeedback {
    /// Agent being rated
    pub agent: Pubkey,
    /// Client giving feedback
    pub client: Pubkey,
    /// Numerical score (0-100)
    /// Maps from Ghost Score (0-1000) by dividing by 10
    pub score: u8,
    /// Tags for categorizing feedback (max 5)
    pub tags: Vec<String>,
    /// External feedback URI (detailed review, if any)
    pub external_uri: Option<String>,
    /// Transaction signature or job ID this feedback is for
    pub reference_tx: Option<String>,
    /// Feedback authorization signature
    /// GhostSpeak requires pre-authorization via signed feedbackAuth
    pub auth_signature: [u8; 64],
    /// Whether this feedback has been revoked
    pub revoked: bool,
    /// Feedback timestamp
    pub timestamp: i64,
    /// Feedback response from agent (if any)
    pub agent_response: Option<String>,
    /// Response timestamp
    pub response_timestamp: Option<i64>,
    /// Feedback synced to EVM
    pub synced_to_evm: bool,
    /// PDA bump
    pub bump: u8,
}

impl AgentFeedback {
    pub const MAX_TAGS: usize = 5;
    pub const MAX_TAG_LEN: usize = 32;
    pub const MAX_URI_LEN: usize = 128;
    pub const MAX_REF_TX_LEN: usize = 88; // Solana signature length
    pub const MAX_RESPONSE_LEN: usize = 256;

    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // client
        1 + // score u8
        4 + (4 + Self::MAX_TAG_LEN) * Self::MAX_TAGS + // tags
        1 + 4 + Self::MAX_URI_LEN + // external_uri Option<String>
        1 + 4 + Self::MAX_REF_TX_LEN + // reference_tx Option<String>
        64 + // auth_signature
        1 + // revoked
        8 + // timestamp
        1 + 4 + Self::MAX_RESPONSE_LEN + // agent_response Option<String>
        1 + 8 + // response_timestamp Option<i64>
        1 + // synced_to_evm
        1; // bump

    /// Initialize feedback
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        client: Pubkey,
        score: u8,
        tags: Vec<String>,
        external_uri: Option<String>,
        reference_tx: Option<String>,
        auth_signature: [u8; 64],
        bump: u8,
    ) -> Result<()> {
        // Validate score is 0-100
        require!(score <= 100, GhostSpeakError::InvalidInput);

        // Validate tags
        require!(tags.len() <= Self::MAX_TAGS, GhostSpeakError::InvalidInput);
        for tag in &tags {
            require!(tag.len() <= Self::MAX_TAG_LEN, GhostSpeakError::InvalidInput);
        }

        // Validate URIs
        if let Some(ref uri) = external_uri {
            require!(uri.len() <= Self::MAX_URI_LEN, GhostSpeakError::InvalidMetadataUri);
        }
        if let Some(ref tx) = reference_tx {
            require!(tx.len() <= Self::MAX_REF_TX_LEN, GhostSpeakError::InvalidInput);
        }

        let clock = Clock::get()?;

        self.agent = agent;
        self.client = client;
        self.score = score;
        self.tags = tags;
        self.external_uri = external_uri;
        self.reference_tx = reference_tx;
        self.auth_signature = auth_signature;
        self.revoked = false;
        self.timestamp = clock.unix_timestamp;
        self.agent_response = None;
        self.response_timestamp = None;
        self.synced_to_evm = false;
        self.bump = bump;

        Ok(())
    }

    /// Revoke feedback (by client)
    pub fn revoke(&mut self) -> Result<()> {
        require!(!self.revoked, GhostSpeakError::AlreadyRevoked);
        self.revoked = true;
        Ok(())
    }

    /// Add agent response to feedback
    pub fn append_response(&mut self, response: String) -> Result<()> {
        require!(
            response.len() <= Self::MAX_RESPONSE_LEN,
            GhostSpeakError::InvalidInput
        );

        let clock = Clock::get()?;
        self.agent_response = Some(response);
        self.response_timestamp = Some(clock.unix_timestamp);
        Ok(())
    }

    /// Mark as synced to EVM
    pub fn mark_synced(&mut self) -> Result<()> {
        self.synced_to_evm = true;
        Ok(())
    }

    /// Convert Ghost Score (0-1000) to feedback score (0-100)
    pub fn ghost_score_to_feedback(ghost_score: u32) -> u8 {
        (ghost_score.min(1000) / 10) as u8
    }

    /// Convert feedback score (0-100) to Ghost Score (0-1000)
    pub fn feedback_to_ghost_score(feedback_score: u8) -> u32 {
        (feedback_score as u32) * 10
    }
}

/// Feedback authorization record
/// Clients must pre-authorize feedback before it can be submitted
#[account]
pub struct FeedbackAuth {
    /// Client authorizing feedback
    pub client: Pubkey,
    /// Agent this auth is for
    pub agent: Pubkey,
    /// Job/transaction reference
    pub reference: String,
    /// Authorization signature
    pub signature: [u8; 64],
    /// Whether this auth has been used
    pub used: bool,
    /// Expiration timestamp
    pub expires_at: i64,
    /// Created timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl FeedbackAuth {
    pub const MAX_REF_LEN: usize = 88;

    pub const LEN: usize = 8 + // discriminator
        32 + // client
        32 + // agent
        4 + Self::MAX_REF_LEN + // reference
        64 + // signature
        1 + // used
        8 + // expires_at
        8 + // created_at
        1; // bump

    /// Initialize feedback authorization
    pub fn initialize(
        &mut self,
        client: Pubkey,
        agent: Pubkey,
        reference: String,
        signature: [u8; 64],
        validity_duration: i64,
        bump: u8,
    ) -> Result<()> {
        require!(
            reference.len() <= Self::MAX_REF_LEN,
            GhostSpeakError::InvalidInput
        );

        let clock = Clock::get()?;

        self.client = client;
        self.agent = agent;
        self.reference = reference;
        self.signature = signature;
        self.used = false;
        self.expires_at = clock.unix_timestamp + validity_duration;
        self.created_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    /// Mark authorization as used
    pub fn mark_used(&mut self) -> Result<()> {
        require!(!self.used, GhostSpeakError::AuthAlreadyUsed);
        self.used = true;
        Ok(())
    }

    /// Check if authorization is valid
    pub fn is_valid(&self, current_time: i64) -> bool {
        !self.used && current_time < self.expires_at
    }
}

/// Aggregate reputation data for GhostSpeak agents
/// Provides quick access to reputation metrics
#[account]
pub struct AgentReputationSummary {
    /// Agent this summary is for
    pub agent: Pubkey,
    /// Total feedback received
    pub total_feedback: u64,
    /// Total feedback revoked
    pub revoked_feedback: u64,
    /// Sum of all scores (for average calculation)
    pub score_sum: u64,
    /// Average score (0-100)
    pub average_score: u8,
    /// Minimum score received
    pub min_score: u8,
    /// Maximum score received
    pub max_score: u8,
    /// Last feedback timestamp
    pub last_feedback_at: i64,
    /// Total agent responses
    pub total_responses: u64,
    /// Created timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl AgentReputationSummary {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 + // total_feedback
        8 + // revoked_feedback
        8 + // score_sum
        1 + // average_score
        1 + // min_score
        1 + // max_score
        8 + // last_feedback_at
        8 + // total_responses
        8 + // created_at
        1; // bump

    /// Initialize reputation summary
    pub fn initialize(&mut self, agent: Pubkey, bump: u8) -> Result<()> {
        let clock = Clock::get()?;

        self.agent = agent;
        self.total_feedback = 0;
        self.revoked_feedback = 0;
        self.score_sum = 0;
        self.average_score = 0;
        self.min_score = 100;
        self.max_score = 0;
        self.last_feedback_at = 0;
        self.total_responses = 0;
        self.created_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    /// Add feedback to summary
    pub fn add_feedback(&mut self, score: u8) -> Result<()> {
        self.total_feedback = self.total_feedback.saturating_add(1);
        self.score_sum = self.score_sum.saturating_add(score as u64);
        self.average_score = (self.score_sum / self.total_feedback) as u8;

        if score < self.min_score {
            self.min_score = score;
        }
        if score > self.max_score {
            self.max_score = score;
        }

        self.last_feedback_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Remove feedback from summary (when revoked)
    pub fn remove_feedback(&mut self, score: u8) -> Result<()> {
        self.revoked_feedback = self.revoked_feedback.saturating_add(1);
        self.total_feedback = self.total_feedback.saturating_sub(1);
        self.score_sum = self.score_sum.saturating_sub(score as u64);

        if self.total_feedback > 0 {
            self.average_score = (self.score_sum / self.total_feedback) as u8;
        } else {
            self.average_score = 0;
        }

        Ok(())
    }

    /// Record agent response
    pub fn record_response(&mut self) -> Result<()> {
        self.total_responses = self.total_responses.saturating_add(1);
        Ok(())
    }
}
