/*!
 * Escrow State Module
 *
 * Contains escrow and payment related state structures.
 */

use super::GhostSpeakError;
use anchor_lang::prelude::*;

// PDA Seeds
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const TASK_ESCROW_SEED: &[u8] = b"task_escrow";

// Constants
pub const MAX_TASK_ID_LENGTH: usize = 64;
pub const MAX_DISPUTE_REASON_LENGTH: usize = 256;
pub const MAX_RESOLUTION_NOTES_LENGTH: usize = 256;
pub const MAX_COMPLETION_PROOF_LENGTH: usize = 256;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Disputed,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Disputed,
    Cancelled,
}

#[account]
pub struct Escrow {
    pub client: Pubkey,
    pub agent: Pubkey,
    pub task_id: String,
    pub amount: u64,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub expires_at: i64,
    pub dispute_reason: Option<String>,
    pub resolution_notes: Option<String>,
    pub payment_token: Pubkey,         // SPL token mint (could be SPL-2022)
    pub transfer_hook: Option<Pubkey>, // SPL-2022 transfer hook for compliance
    pub is_confidential: bool,         // For confidential transfers
}

#[account]
pub struct TaskEscrow {
    pub task_id: String,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub status: TaskStatus,
    pub created_at: i64,
    pub deadline: i64,
    pub completion_proof: Option<String>,
    pub dispute_details: Option<String>,
    pub escrow_pubkey: Pubkey,
}

impl Escrow {
    pub const LEN: usize = 8 + // discriminator
        32 + // client
        32 + // agent
        4 + MAX_TASK_ID_LENGTH + // task_id
        8 + // amount
        1 + // status
        8 + // created_at
        8 + // expires_at
        1 + 4 + MAX_DISPUTE_REASON_LENGTH + // dispute_reason
        1 + 4 + MAX_RESOLUTION_NOTES_LENGTH + // resolution_notes
        32 + // payment_token
        1 + 32 + // transfer_hook Option
        1; // is_confidential
}

impl Escrow {
    pub fn initialize(
        &mut self,
        client: Pubkey,
        agent: Pubkey,
        task_id: String,
        amount: u64,
        expires_at: i64,
        payment_token: Pubkey,
        transfer_hook: Option<Pubkey>,
        is_confidential: bool,
    ) -> Result<()> {
        require!(
            task_id.len() <= MAX_TASK_ID_LENGTH,
            GhostSpeakError::TaskIdTooLong
        );
        require!(amount > 0, GhostSpeakError::InvalidAmount);

        let clock = Clock::get()?;
        require!(
            expires_at > clock.unix_timestamp,
            GhostSpeakError::InvalidExpiration
        );

        self.client = client;
        self.agent = agent;
        self.task_id = task_id;
        self.amount = amount;
        self.status = EscrowStatus::Active;
        self.created_at = clock.unix_timestamp;
        self.expires_at = expires_at;
        self.dispute_reason = None;
        self.resolution_notes = None;
        self.payment_token = payment_token;
        self.transfer_hook = transfer_hook;
        self.is_confidential = is_confidential;

        Ok(())
    }

    pub fn complete(&mut self, resolution_notes: Option<String>) -> Result<()> {
        require!(
            self.status == EscrowStatus::Active,
            GhostSpeakError::InvalidEscrowStatus
        );

        if let Some(notes) = &resolution_notes {
            require!(
                notes.len() <= MAX_RESOLUTION_NOTES_LENGTH,
                GhostSpeakError::ResolutionNotesTooLong
            );
        }

        self.status = EscrowStatus::Completed;
        self.resolution_notes = resolution_notes;

        Ok(())
    }

    pub fn dispute(&mut self, dispute_reason: String) -> Result<()> {
        require!(
            self.status == EscrowStatus::Active,
            GhostSpeakError::InvalidEscrowStatus
        );
        require!(
            dispute_reason.len() <= MAX_DISPUTE_REASON_LENGTH,
            GhostSpeakError::DisputeReasonTooLong
        );

        self.status = EscrowStatus::Disputed;
        self.dispute_reason = Some(dispute_reason);

        Ok(())
    }

    pub fn resolve(&mut self, resolution_notes: String) -> Result<()> {
        require!(
            self.status == EscrowStatus::Disputed,
            GhostSpeakError::InvalidEscrowStatus
        );
        require!(
            resolution_notes.len() <= MAX_RESOLUTION_NOTES_LENGTH,
            GhostSpeakError::ResolutionNotesTooLong
        );

        self.status = EscrowStatus::Resolved;
        self.resolution_notes = Some(resolution_notes);

        Ok(())
    }

    pub fn cancel(&mut self) -> Result<()> {
        require!(
            matches!(self.status, EscrowStatus::Active | EscrowStatus::Disputed),
            GhostSpeakError::InvalidEscrowStatus
        );

        self.status = EscrowStatus::Cancelled;

        Ok(())
    }
}

impl TaskEscrow {
    pub const LEN: usize = 8 + // discriminator
        4 + MAX_TASK_ID_LENGTH + // task_id
        32 + // client
        32 + // agent
        8 + // amount
        1 + // status
        8 + // created_at
        8 + // deadline
        1 + 4 + MAX_COMPLETION_PROOF_LENGTH + // completion_proof
        1 + 4 + MAX_DISPUTE_REASON_LENGTH + // dispute_details
        32; // escrow_pubkey

    pub fn initialize(
        &mut self,
        task_id: String,
        client: Pubkey,
        agent: Pubkey,
        amount: u64,
        deadline: i64,
        escrow_pubkey: Pubkey,
    ) -> Result<()> {
        require!(
            task_id.len() <= MAX_TASK_ID_LENGTH,
            GhostSpeakError::TaskIdTooLong
        );
        require!(amount > 0, GhostSpeakError::InvalidAmount);

        let clock = Clock::get()?;
        require!(
            deadline > clock.unix_timestamp,
            GhostSpeakError::InvalidDeadline
        );

        self.task_id = task_id;
        self.client = client;
        self.agent = agent;
        self.amount = amount;
        self.status = TaskStatus::Pending;
        self.created_at = clock.unix_timestamp;
        self.deadline = deadline;
        self.completion_proof = None;
        self.dispute_details = None;
        self.escrow_pubkey = escrow_pubkey;

        Ok(())
    }

    pub fn start_task(&mut self) -> Result<()> {
        require!(
            self.status == TaskStatus::Pending,
            GhostSpeakError::InvalidTaskStatus
        );

        self.status = TaskStatus::InProgress;

        Ok(())
    }

    pub fn complete_task(&mut self, completion_proof: String) -> Result<()> {
        require!(
            self.status == TaskStatus::InProgress,
            GhostSpeakError::InvalidTaskStatus
        );
        require!(
            completion_proof.len() <= MAX_COMPLETION_PROOF_LENGTH,
            GhostSpeakError::CompletionProofTooLong
        );

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp <= self.deadline,
            GhostSpeakError::TaskDeadlineExceeded
        );

        self.status = TaskStatus::Completed;
        self.completion_proof = Some(completion_proof);

        Ok(())
    }

    pub fn dispute_task(&mut self, dispute_details: String) -> Result<()> {
        require!(
            matches!(self.status, TaskStatus::InProgress | TaskStatus::Completed),
            GhostSpeakError::InvalidTaskStatus
        );
        require!(
            dispute_details.len() <= MAX_DISPUTE_REASON_LENGTH,
            GhostSpeakError::DisputeDetailsTooLong
        );

        self.status = TaskStatus::Disputed;
        self.dispute_details = Some(dispute_details);

        Ok(())
    }

    pub fn cancel_task(&mut self) -> Result<()> {
        require!(
            matches!(self.status, TaskStatus::Pending | TaskStatus::InProgress),
            GhostSpeakError::InvalidTaskStatus
        );

        self.status = TaskStatus::Cancelled;

        Ok(())
    }
}

#[account]
pub struct Payment {
    pub work_order: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub is_confidential: bool,
    pub paid_at: i64,
    pub transfer_hook: Option<Pubkey>, // SPL-2022 transfer hook
    pub transfer_fee_applied: bool,    // Track if SPL-2022 transfer fee was applied
    pub bump: u8,
}

impl Payment {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // payer
        32 + // recipient
        8 + // amount
        32 + // token_mint
        1 + // is_confidential
        8 + // paid_at
        1 + 32 + // transfer_hook Option
        1 + // transfer_fee_applied
        1; // bump
}
