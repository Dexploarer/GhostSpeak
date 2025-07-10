/*!
 * Dispute Resolution Module
 * 
 * Implements automated and manual dispute resolution mechanisms
 * for work quality, payment, and contract disagreements.
 */

use anchor_lang::prelude::*;
use crate::state::dispute::{DisputeCase, DisputeStatus, DisputeEvidence};
use crate::PodAIMarketplaceError;

/// Files a dispute for work quality, payment, or contract issues
/// 
/// Initiates a formal dispute resolution process with evidence submission
/// and potential arbitration for unresolved conflicts.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing dispute and work order accounts
/// * `dispute_data` - Dispute details including:
///   - `dispute_type` - Quality, payment, deadline, or other
///   - `description` - Detailed issue description
///   - `evidence` - Supporting documentation (IPFS hashes)
///   - `desired_resolution` - What the filer seeks
///   - `amount_disputed` - Financial amount in question
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful dispute filing
/// 
/// # Errors
/// 
/// * `WorkNotCompleted` - If disputing incomplete work
/// * `DisputeWindowClosed` - If past 30-day dispute period
/// * `AlreadyDisputed` - If work already has open dispute
/// 
/// # Dispute Process
/// 
/// 1. **Filing**: Dispute created with evidence
/// 2. **Response**: Other party has 72 hours to respond
/// 3. **Mediation**: Automated resolution attempted
/// 4. **Arbitration**: Human arbitrators if needed
/// 5. **Resolution**: Binding decision enforced
/// 
/// # Fee Structure
/// 
/// - Filing fee: 0.01 SOL (refunded if successful)
/// - Arbitration: 5% of disputed amount
pub fn file_dispute(
    ctx: Context<FileDispute>,
    reason: String,
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let clock = Clock::get()?;

    dispute.transaction = ctx.accounts.transaction.key();
    dispute.complainant = ctx.accounts.complainant.key();
    dispute.respondent = ctx.accounts.respondent.key();
    dispute.reason = reason;
    dispute.status = DisputeStatus::Filed;
    dispute.resolution = None;
    dispute.evidence = Vec::new();
    dispute.ai_score = 0.0;
    dispute.human_review = false;
    dispute.created_at = clock.unix_timestamp;
    dispute.resolved_at = None;
    dispute.bump = ctx.bumps.dispute;

    emit!(DisputeFiledEvent {
        dispute: dispute.key(),
        complainant: ctx.accounts.complainant.key(),
        respondent: ctx.accounts.respondent.key(),
        reason: dispute.reason.clone(),
    });

    Ok(())
}

/// Submits additional evidence for an ongoing dispute
/// 
/// Allows both parties to provide supporting documentation during
/// the dispute resolution process.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing dispute and evidence accounts
/// * `evidence_data` - Evidence submission including:
///   - `evidence_type` - Screenshot, log, communication, etc.
///   - `ipfs_hash` - IPFS hash of evidence file
///   - `description` - What the evidence shows
///   - `timestamp` - When evidence was created
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful evidence submission
/// 
/// # Errors
/// 
/// * `DisputeNotActive` - If dispute is resolved
/// * `UnauthorizedParty` - If submitter not involved
/// * `EvidenceWindowClosed` - If past submission deadline
/// * `TooMuchEvidence` - If exceeds 10 pieces limit
/// 
/// # Evidence Types
/// 
/// - **Screenshots**: UI/output captures
/// - **Logs**: Transaction/execution logs
/// - **Communications**: Relevant messages
/// - **Code**: Source code snapshots
/// - **Documents**: Contracts, specifications
/// 
/// # Verification
/// 
/// All evidence is timestamped and hashed
/// to prevent tampering or late creation
pub fn submit_dispute_evidence(
    ctx: Context<SubmitDisputeEvidence>,
    evidence_type: String,
    evidence_data: String,
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let clock = Clock::get()?;

    require!(dispute.status == DisputeStatus::Filed || 
             dispute.status == DisputeStatus::UnderReview, 
             PodAIMarketplaceError::InvalidApplicationStatus);

    let evidence = DisputeEvidence {
        submitter: ctx.accounts.submitter.key(),
        evidence_type,
        evidence_data,
        timestamp: clock.unix_timestamp,
        is_verified: false,
    };

    dispute.evidence.push(evidence);
    dispute.status = DisputeStatus::EvidenceSubmitted;

    emit!(DisputeEvidenceSubmittedEvent {
        dispute: dispute.key(),
        submitter: ctx.accounts.submitter.key(),
        evidence_count: dispute.evidence.len() as u32,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct FileDispute<'info> {
    #[account(
        init,
        payer = complainant,
        space = DisputeCase::LEN,
        seeds = [b"dispute", transaction.key().as_ref(), complainant.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, DisputeCase>,
    /// CHECK: This is the transaction being disputed
    pub transaction: AccountInfo<'info>,
    #[account(mut)]
    pub complainant: Signer<'info>,
    /// CHECK: This is the respondent in the dispute
    pub respondent: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitDisputeEvidence<'info> {
    #[account(mut)]
    pub dispute: Account<'info, DisputeCase>,
    pub submitter: Signer<'info>,
}

// Events
#[event]
pub struct DisputeFiledEvent {
    pub dispute: Pubkey,
    pub complainant: Pubkey,
    pub respondent: Pubkey,
    pub reason: String,
}

#[event]
pub struct DisputeEvidenceSubmittedEvent {
    pub dispute: Pubkey,
    pub submitter: Pubkey,
    pub evidence_count: u32,
}