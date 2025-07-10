/*!
 * Dispute State Module
 * 
 * Contains dispute-related state structures.
 */

use anchor_lang::prelude::*;
use crate::{MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeStatus {
    Filed,
    UnderReview,
    EvidenceSubmitted,
    Resolved,
    Escalated,
    Closed,
}

impl Default for DisputeStatus {
    fn default() -> Self {
        DisputeStatus::Filed
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DisputeEvidence {
    pub submitter: Pubkey,
    pub evidence_type: String,
    pub evidence_data: String,
    pub timestamp: i64,
    pub is_verified: bool,
}

impl DisputeEvidence {
    pub fn new(
        submitter: Pubkey,
        evidence_type: String,
        evidence_data: String,
        timestamp: i64,
    ) -> Self {
        Self {
            submitter,
            evidence_type,
            evidence_data,
            timestamp,
            is_verified: false,
        }
    }

    pub fn verify(&mut self) {
        self.is_verified = true;
    }
}

#[account]
pub struct DisputeCase {
    pub transaction: Pubkey,
    pub complainant: Pubkey,
    pub respondent: Pubkey,
    pub moderator: Option<Pubkey>,
    pub reason: String,
    pub status: DisputeStatus,
    pub evidence: Vec<DisputeEvidence>,
    pub resolution: Option<String>,
    pub ai_score: f32,
    pub human_review: bool,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

impl DisputeCase {
    pub const LEN: usize = 8 + // discriminator
        32 + // transaction
        32 + // complainant
        32 + // respondent
        1 + 32 + // moderator (Option<Pubkey>)
        4 + MAX_GENERAL_STRING_LENGTH + // reason
        1 + // status (enum)
        4 + (10 * (32 + 4 + MAX_GENERAL_STRING_LENGTH + 4 + MAX_GENERAL_STRING_LENGTH + 8 + 1)) + // evidence (max 10)
        1 + 4 + MAX_GENERAL_STRING_LENGTH + // resolution (Option<String>)
        4 + // ai_score (f32)
        1 + // human_review (bool)
        8 + // created_at
        1 + 8 + // resolved_at (Option<i64>)
        1 + // bump
        256; // padding for future fields

    pub fn init(
        &mut self,
        transaction: Pubkey,
        complainant: Pubkey,
        respondent: Pubkey,
        reason: String,
        bump: u8,
    ) -> Result<()> {
        self.transaction = transaction;
        self.complainant = complainant;
        self.respondent = respondent;
        self.moderator = None;
        self.reason = reason;
        self.status = DisputeStatus::Filed;
        self.evidence = Vec::new();
        self.resolution = None;
        self.ai_score = 0.0;
        self.human_review = false;
        self.created_at = Clock::get()?.unix_timestamp;
        self.resolved_at = None;
        self.bump = bump;
        Ok(())
    }

    pub fn add_evidence(&mut self, evidence: DisputeEvidence) -> Result<()> {
        require!(self.evidence.len() < 10, PodAIMarketplaceError::TooManyEvidenceItems);
        self.evidence.push(evidence);
        Ok(())
    }

    pub fn resolve(&mut self, resolution: String) -> Result<()> {
        self.status = DisputeStatus::Resolved;
        self.resolution = Some(resolution);
        self.resolved_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    pub fn assign_moderator(&mut self, moderator: Pubkey) -> Result<()> {
        self.moderator = Some(moderator);
        self.status = DisputeStatus::UnderReview;
        Ok(())
    }

    pub fn escalate(&mut self) -> Result<()> {
        self.status = DisputeStatus::Escalated;
        self.human_review = true;
        Ok(())
    }
}