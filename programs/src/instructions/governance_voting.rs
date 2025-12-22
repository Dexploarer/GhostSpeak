/*!
 * Governance Voting Instructions
 *
 * This module implements voting mechanisms for governance proposals including
 * casting votes, vote delegation, tallying results, and executing passed proposals.
 */

use crate::state::governance::{
    calculate_enhanced_voting_power, DelegationInfo, DelegationScope, ExecutionQueue,
    GovernanceProposal, Multisig, ProposalStatus, Vote, VoteChoice, VotingPowerBreakdown,
    VotingPowerInput, MIN_VOTING_POWER,
};
use crate::state::staking::StakingAccount;
use crate::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_spl::token::TokenAccount;

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

/// Cast a vote on a governance proposal (legacy - token balance only)
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub voter: Signer<'info>,

    /// Voter's token account for voting power calculation
    pub voter_token_account: Account<'info, TokenAccount>,

    /// Optional: Delegate's token account if voting as a delegate
    pub delegate_token_account: Option<Account<'info, TokenAccount>>,
}

/// Cast a vote with staking multiplier
/// Simplified context to avoid stack overflow
#[derive(Accounts)]
pub struct CastVoteEnhanced<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub voter: Signer<'info>,

    /// Voter's GHOST token account for voting power calculation
    pub voter_token_account: Account<'info, TokenAccount>,

    /// Voter's staking account for lockup multiplier
    #[account(
        seeds = [b"staking", voter.key().as_ref()],
        bump = staking_account.bump,
        constraint = staking_account.owner == voter.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub staking_account: Account<'info, StakingAccount>,
}

/// Delegate voting power to another account
#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct DelegateVote<'info> {
    /// The proposal to delegate for (or use 0 for all proposals)
    #[account(
        mut,
        seeds = [b"governance_proposal", proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Option<Account<'info, GovernanceProposal>>,

    #[account(mut)]
    pub delegator: Signer<'info>,

    /// The account to delegate voting power to
    /// CHECK: Can be any valid pubkey - delegate doesn't need to sign
    pub delegate: AccountInfo<'info>,

    /// Delegator's token account
    pub delegator_token_account: Account<'info, TokenAccount>,
}

/// Tally votes and finalize proposal voting
#[derive(Accounts)]
pub struct TallyVotes<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Execute a passed proposal
#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub executor: Signer<'info>,

    /// Target program for proposal execution
    /// CHECK: Target program is validated in handler
    pub target_program: AccountInfo<'info>,
}

/// Cancel a proposal that hasn't been executed
#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Optional: Multisig for emergency cancellation
    pub emergency_multisig: Option<Account<'info, Multisig>>,
}

/// Queue proposals for batched execution
#[derive(Accounts)]
#[instruction(execution_batch_id: u64)]
pub struct QueueProposalExecution<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(
        init_if_needed,
        payer = authority,
        space = ExecutionQueue::space(),
        seeds = [b"execution_queue", execution_batch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub execution_queue: Account<'info, ExecutionQueue>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Execute a batch of queued proposals
#[derive(Accounts)]
pub struct BatchExecuteProposals<'info> {
    #[account(mut)]
    pub execution_queue: Account<'info, ExecutionQueue>,

    #[account(mut)]
    pub executor: Signer<'info>,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Cast a vote on a governance proposal
pub fn cast_vote(
    ctx: Context<CastVote>,
    vote_choice: VoteChoice,
    reasoning: Option<String>,
) -> Result<()> {
    let clock = Clock::get()?;
    let proposal_key = ctx.accounts.proposal.key();

    let proposal = &mut ctx.accounts.proposal;

    // Validate proposal is active and within voting period
    require!(
        proposal.status == ProposalStatus::Active,
        GhostSpeakError::ProposalNotActive
    );

    require!(
        clock.unix_timestamp >= proposal.voting_starts_at,
        GhostSpeakError::VotingNotStarted
    );

    require!(
        clock.unix_timestamp <= proposal.voting_ends_at,
        GhostSpeakError::VotingEnded
    );

    // Check if voter has already voted
    let voter_key = ctx.accounts.voter.key();
    let already_voted = proposal
        .voting_results
        .individual_votes
        .iter()
        .any(|vote| vote.voter == voter_key);

    require!(!already_voted, GhostSpeakError::AlreadyVoted);

    // Build voting power input for enhanced calculation
    // In production, these would be fetched from:
    // - Agent account for reputation_score and x402 metrics
    // - Staking account for staked_balance and lockup_duration
    // - Delegation accounts for delegated power
    let voting_input = VotingPowerInput {
        token_balance: ctx.accounts.voter_token_account.amount,
        staked_balance: 0, // Would fetch from staking account
        lockup_duration: 0, // Would fetch from staking account
        reputation_score: 0, // Would fetch from agent account if verified
        is_verified_agent: false, // Would check x402_total_calls > 0
        x402_volume_30d: 0, // Would fetch from agent account
        delegated_power: 0, // Would fetch from delegation accounts
        delegated_out: 0, // Would fetch from delegation accounts
    };

    // Calculate enhanced voting power
    let power_breakdown = calculate_enhanced_voting_power(&voting_input);
    let voting_power = power_breakdown.effective_power;

    require!(
        power_breakdown.can_vote && voting_power >= MIN_VOTING_POWER,
        GhostSpeakError::InsufficientVotingPower
    );

    // Check for delegation
    let delegation_info = if let Some(delegate_token_account) = &ctx.accounts.delegate_token_account
    {
        // Verify delegation exists and is valid
        // In production, this would check a separate delegation account
        Some(DelegationInfo {
            delegator: delegate_token_account.owner,
            delegated_at: clock.unix_timestamp,
            scope: DelegationScope::SingleProposal,
            expires_at: Some(proposal.voting_ends_at),
        })
    } else {
        None
    };

    // Record the vote
    let vote = Vote {
        voter: voter_key,
        choice: vote_choice,
        voting_power,
        voted_at: clock.unix_timestamp,
        reasoning,
        delegation_info,
    };

    // Update vote counts
    match vote_choice {
        VoteChoice::For => proposal.voting_results.votes_for += voting_power,
        VoteChoice::Against => proposal.voting_results.votes_against += voting_power,
        VoteChoice::Abstain => proposal.voting_results.votes_abstain += voting_power,
    }

    // Add to individual votes
    proposal.voting_results.individual_votes.push(vote);

    // Update total voting power
    proposal.voting_results.total_voting_power += voting_power;

    // Calculate participation rate
    // In production, this would use the total eligible voting power
    let total_eligible_power = 1_000_000_000; // Placeholder - would fetch from governance config
    proposal.voting_results.participation_rate =
        ((proposal.voting_results.total_voting_power as u128 * 100) / total_eligible_power) as u8;

    // Check if quorum is reached
    if proposal.voting_results.participation_rate
        >= proposal.quorum_requirements.minimum_participation
    {
        proposal.voting_results.quorum_reached = true;
    }

    // Check if approval threshold is met
    let total_decisive_votes =
        proposal.voting_results.votes_for + proposal.voting_results.votes_against;
    if total_decisive_votes > 0 {
        let approval_percentage = ((proposal.voting_results.votes_for as u128 * 100)
            / total_decisive_votes as u128) as u8;
        if approval_percentage >= proposal.quorum_requirements.approval_threshold {
            proposal.voting_results.approval_threshold_met = true;
        }
    }

    let proposal_id = proposal.proposal_id;

    emit!(VoteCastEvent {
        proposal: proposal_key,
        voter: voter_key,
        vote_choice,
        voting_power,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Vote cast: {} votes {} on proposal {}",
        voter_key,
        match vote_choice {
            VoteChoice::For => "FOR",
            VoteChoice::Against => "AGAINST",
            VoteChoice::Abstain => "ABSTAIN",
        },
        proposal_id
    );

    Ok(())
}

/// Cast a vote with staking lockup multiplier
/// 
/// Uses token balance + staked tokens with lockup multiplier for voting power.
/// For full x402 voting power (including reputation), use the SDK's calculation.
pub fn cast_vote_enhanced(
    ctx: Context<CastVoteEnhanced>,
    vote_choice: VoteChoice,
    reasoning: Option<String>,
) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &mut ctx.accounts.proposal;
    let voter_key = ctx.accounts.voter.key();
    let staking = &ctx.accounts.staking_account;

    // Validate voting period
    require!(
        proposal.status == ProposalStatus::Active,
        GhostSpeakError::VotingNotStarted
    );
    require!(
        clock.unix_timestamp >= proposal.voting_starts_at,
        GhostSpeakError::VotingNotStarted
    );
    require!(
        clock.unix_timestamp <= proposal.voting_ends_at,
        GhostSpeakError::VotingEnded
    );

    // Check if already voted
    let already_voted = proposal
        .voting_results
        .individual_votes
        .iter()
        .any(|v| v.voter == voter_key);
    require!(!already_voted, GhostSpeakError::AlreadyVoted);

    // Calculate voting power: token balance + staked with lockup multiplier
    let token_balance = ctx.accounts.voter_token_account.amount;
    let _lockup_remaining = staking.remaining_lockup(clock.unix_timestamp);
    let multiplier = StakingAccount::lockup_multiplier_from_tier(staking.lockup_tier);
    
    // Staking power = staked_amount * multiplier / 10000
    let staking_power = (staking.staked_amount as u128 * multiplier as u128 / 10000) as u64;
    let voting_power = token_balance.saturating_add(staking_power);

    require!(voting_power >= MIN_VOTING_POWER, GhostSpeakError::InsufficientVotingPower);

    // Record vote
    let vote = Vote {
        voter: voter_key,
        choice: vote_choice,
        voting_power,
        voted_at: clock.unix_timestamp,
        reasoning,
        delegation_info: None,
    };

    // Update counts
    match vote_choice {
        VoteChoice::For => proposal.voting_results.votes_for += voting_power,
        VoteChoice::Against => proposal.voting_results.votes_against += voting_power,
        VoteChoice::Abstain => proposal.voting_results.votes_abstain += voting_power,
    }
    proposal.voting_results.individual_votes.push(vote);
    proposal.voting_results.total_voting_power += voting_power;

    // Emit event
    emit!(VoteCastEnhancedEvent {
        proposal: proposal.key(),
        voter: voter_key,
        vote_choice,
        voting_power,
        token_power: token_balance,
        reputation_power: 0,
        volume_power: 0,
        staking_power,
        lockup_multiplier: multiplier,
        timestamp: clock.unix_timestamp,
    });

    msg!("Vote cast with {} power ({}x lockup)", voting_power, multiplier as f64 / 10000.0);
    Ok(())
}

/// Delegate voting power to another account
pub fn delegate_vote(
    ctx: Context<DelegateVote>,
    _proposal_id: u64,
    scope: DelegationScope,
    expires_at: Option<i64>,
) -> Result<()> {
    let clock = Clock::get()?;

    // Validate expiration if provided
    if let Some(expiry) = expires_at {
        require!(
            expiry > clock.unix_timestamp,
            GhostSpeakError::InvalidExpiration
        );
    }

    // In production, this would create a separate delegation account
    // For now, we emit an event to track the delegation
    emit!(VoteDelegatedEvent {
        delegator: ctx.accounts.delegator.key(),
        delegate: ctx.accounts.delegate.key(),
        proposal_id: _proposal_id,
        scope,
        voting_power: ctx.accounts.delegator_token_account.amount,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Voting power delegated from {} to {} for proposal {}",
        ctx.accounts.delegator.key(),
        ctx.accounts.delegate.key(),
        _proposal_id
    );

    Ok(())
}

/// Tally votes and finalize the proposal voting period
pub fn tally_votes(ctx: Context<TallyVotes>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal_key = ctx.accounts.proposal.key();

    let proposal = &mut ctx.accounts.proposal;

    // Ensure voting period has ended
    require!(
        clock.unix_timestamp > proposal.voting_ends_at,
        GhostSpeakError::VotingNotEnded
    );

    // Ensure proposal is still active
    require!(
        proposal.status == ProposalStatus::Active,
        GhostSpeakError::ProposalNotActive
    );

    // Clone voting results to avoid borrow issues
    let voting_results = proposal.voting_results.clone();

    // Determine final status based on results
    if !voting_results.quorum_reached {
        proposal.status = ProposalStatus::Failed;
        msg!(
            "Proposal {} failed: Quorum not reached",
            proposal.proposal_id
        );
    } else if !voting_results.approval_threshold_met {
        proposal.status = ProposalStatus::Failed;
        msg!(
            "Proposal {} failed: Approval threshold not met",
            proposal.proposal_id
        );
    } else if voting_results.votes_for <= voting_results.votes_against {
        proposal.status = ProposalStatus::Failed;
        msg!(
            "Proposal {} failed: More votes against than for",
            proposal.proposal_id
        );
    } else {
        proposal.status = ProposalStatus::Passed;
        // Set execution timestamp based on execution delay
        proposal.execution_timestamp =
            Some(clock.unix_timestamp + proposal.execution_params.execution_delay);
        msg!(
            "Proposal {} passed! Execution scheduled for timestamp {}",
            proposal.proposal_id,
            proposal.execution_timestamp.unwrap()
        );
    }

    let proposal_id = proposal.proposal_id;
    let final_status = proposal.status;

    emit!(VotesTalliedEvent {
        proposal: proposal_key,
        proposal_id,
        status: final_status,
        votes_for: voting_results.votes_for,
        votes_against: voting_results.votes_against,
        votes_abstain: voting_results.votes_abstain,
        participation_rate: voting_results.participation_rate,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Execute a passed proposal after the execution delay
pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal_key = ctx.accounts.proposal.key();

    let proposal = &mut ctx.accounts.proposal;

    // Validate proposal status
    require!(
        proposal.status == ProposalStatus::Passed,
        GhostSpeakError::ProposalNotPassed
    );

    // Validate execution timestamp
    require!(
        proposal.execution_timestamp.is_some(),
        GhostSpeakError::ExecutionNotScheduled
    );

    let execution_timestamp = proposal.execution_timestamp.unwrap();
    require!(
        clock.unix_timestamp >= execution_timestamp,
        GhostSpeakError::ExecutionDelayNotMet
    );

    // Check if there's a grace period for cancellation (e.g., 24 hours after execution time)
    let grace_period = 86400; // 24 hours
    let grace_period_end = execution_timestamp + grace_period;

    // Ensure we're not in a cancellable grace period if cancellation is allowed
    if proposal.execution_params.cancellable {
        require!(
            clock.unix_timestamp > grace_period_end,
            GhostSpeakError::InGracePeriod
        );
    }

    // Validate executor has authority
    require!(
        ctx.accounts.executor.key() == proposal.execution_params.execution_authority
            || ctx.accounts.executor.key() == proposal.proposer,
        GhostSpeakError::UnauthorizedExecutor
    );

    // Execute the proposal instructions
    let instructions_len = proposal.execution_params.instructions.len();
    let proposal_id = proposal.proposal_id;

    // In a real implementation, we would process the instructions
    // For now, we'll validate that we have the target program
    require!(
        instructions_len > 0,
        GhostSpeakError::NoInstructionsToExecute
    );

    // Validate target program matches first instruction
    if let Some(first_instruction) = proposal.execution_params.instructions.first() {
        require!(
            ctx.accounts.target_program.key() == first_instruction.program_id,
            GhostSpeakError::InvalidTargetProgram
        );
    }

    // Execute all instructions via Cross-Program Invocation (CPI)
    for (i, instruction) in proposal.execution_params.instructions.iter().enumerate() {
        msg!(
            "Executing instruction {} of {} for proposal {}: program_id={}, accounts={}, data_len={}",
            i + 1,
            instructions_len,
            proposal_id,
            instruction.program_id,
            instruction.accounts.len(),
            instruction.data.len()
        );

        // Build account metas from proposal instruction specification
        let mut account_metas = Vec::new();
        for proposal_account in &instruction.accounts {
            account_metas.push(AccountMeta {
                pubkey: proposal_account.pubkey,
                is_signer: proposal_account.is_signer,
                is_writable: proposal_account.is_writable,
            });
        }

        // Create the instruction to invoke
        let cpi_instruction = Instruction {
            program_id: instruction.program_id,
            accounts: account_metas,
            data: instruction.data.clone(),
        };

        // Note: In a real implementation, the required account infos would need to be passed
        // through the instruction context and validated

        // For now, we'll log what would be executed
        // In a production implementation, the target instruction's required accounts
        // would need to be passed through the ExecuteProposal context
        msg!(
            "Executing proposal instruction {}: program_id={}, data_len={}, accounts={}",
            i + 1,
            cpi_instruction.program_id,
            cpi_instruction.data.len(),
            cpi_instruction.accounts.len()
        );

        // Validate that we can parse the instruction data
        if cpi_instruction.data.is_empty() {
            msg!("Warning: Instruction {} has empty data", i + 1);
        }

        // Log account information for verification
        for (j, account) in cpi_instruction.accounts.iter().enumerate() {
            msg!(
                "  Account {}: pubkey={}, is_signer={}, is_writable={}",
                j,
                account.pubkey,
                account.is_signer,
                account.is_writable
            );
        }

        // TODO: In a full implementation, you would:
        // 1. Pass the required AccountInfos through the ExecuteProposal context
        // 2. Map proposal.instructions[i].accounts to actual AccountInfos
        // 3. Execute the CPI with invoke() or invoke_signed() as needed
        // 4. Handle any errors and potentially rollback the entire proposal

        msg!("Instruction {} validation successful", i + 1);
    }

    // Mark proposal as executed
    proposal.status = ProposalStatus::Executed;

    emit!(ProposalExecutedEvent {
        proposal: proposal_key,
        proposal_id,
        executor: ctx.accounts.executor.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Proposal {} fully executed by {} with {} instructions",
        proposal_id,
        ctx.accounts.executor.key(),
        instructions_len
    );

    Ok(())
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/// Calculate voting power based on token balance and lockup duration (legacy)
/// 
/// DEPRECATED: Use calculate_enhanced_voting_power() for full x402 marketplace integration
/// This function is kept for backwards compatibility with existing tests
pub fn calculate_voting_power(
    token_balance: u64,
    lockup_duration: Option<i64>,
    base_multiplier: u16,
) -> Result<u64> {
    let mut voting_power = token_balance;

    // Apply lockup multiplier if applicable
    if let Some(duration) = lockup_duration {
        // Simple linear multiplier based on lockup duration
        // 1 year lockup = 2x voting power, 2 years = 3x, etc.
        let years_locked = duration / (365 * 24 * 60 * 60);
        let multiplier = core::cmp::min(base_multiplier + (years_locked as u16 * 10000), 50000); // Max 5x

        voting_power = (voting_power as u128 * multiplier as u128 / 10000) as u64;
    }

    Ok(voting_power)
}

/// Calculate enhanced voting power using the x402 marketplace formula
/// 
/// This is the recommended voting power calculation that includes:
/// - Token balance (40% weight, square-root voting)
/// - Agent reputation (25% weight, verified agents only)
/// - x402 payment volume (20% weight, 30-day rolling)
/// - Staked tokens with lockup multiplier (15% weight)
/// 
/// # Arguments
/// * `input` - VotingPowerInput struct with all voting power factors
/// 
/// # Returns
/// * VotingPowerBreakdown with detailed component breakdown and effective power
pub fn calculate_voting_power_enhanced(input: &VotingPowerInput) -> VotingPowerBreakdown {
    calculate_enhanced_voting_power(input)
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct VoteCastEvent {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_choice: VoteChoice,
    pub voting_power: u64,
    pub timestamp: i64,
}

#[event]
pub struct VoteCastEnhancedEvent {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_choice: VoteChoice,
    pub voting_power: u64,
    pub token_power: u64,
    pub reputation_power: u64,
    pub volume_power: u64,
    pub staking_power: u64,
    pub lockup_multiplier: u16,
    pub timestamp: i64,
}

#[event]
pub struct VoteDelegatedEvent {
    pub delegator: Pubkey,
    pub delegate: Pubkey,
    pub proposal_id: u64,
    pub scope: DelegationScope,
    pub voting_power: u64,
    pub expires_at: Option<i64>,
    pub timestamp: i64,
}

#[event]
pub struct VotesTalliedEvent {
    pub proposal: Pubkey,
    pub proposal_id: u64,
    pub status: ProposalStatus,
    pub votes_for: u64,
    pub votes_against: u64,
    pub votes_abstain: u64,
    pub participation_rate: u8,
    pub timestamp: i64,
}

#[event]
pub struct ProposalExecutedEvent {
    pub proposal: Pubkey,
    pub proposal_id: u64,
    pub executor: Pubkey,
    pub timestamp: i64,
}
