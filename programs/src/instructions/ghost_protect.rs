/*!
 * Ghost Protect Escrow Instructions
 *
 * Handlers for B2C escrow with dispute resolution.
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::ghost_protect::*;
use crate::state::Agent;
use crate::state::staking::StakingAccount;
use crate::GhostSpeakError;

// =====================================================
// CREATE ESCROW
// =====================================================

/// Create a new escrow for agent service payment
#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = GhostProtectEscrow::LEN,
        seeds = [
            b"ghost_protect",
            client.key().as_ref(),
            &escrow_id.to_le_bytes()
        ],
        bump
    )]
    pub escrow: Account<'info, GhostProtectEscrow>,

    #[account(
        constraint = agent.is_active @ GhostSpeakError::AgentNotActive
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        constraint = client_token_account.owner == client.key()
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: Token mint for payment
    pub token_mint: AccountInfo<'info>,

    #[account(mut)]
    pub client: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn create_escrow(
    ctx: Context<CreateEscrow>,
    escrow_id: u64,
    amount: u64,
    job_description: String,
    deadline: i64,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Validate inputs
    require!(
        job_description.len() <= GhostProtectEscrow::MAX_DESCRIPTION_LEN,
        GhostSpeakError::DescriptionTooLong
    );
    require!(deadline > clock.unix_timestamp, GhostSpeakError::InvalidDeadline);
    require!(amount > 0, GhostSpeakError::InvalidAmount);

    // Transfer payment to escrow vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.client_token_account.to_account_info(),
        to: ctx.accounts.escrow_vault.to_account_info(),
        authority: ctx.accounts.client.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    token::transfer(cpi_ctx, amount)?;

    // Initialize escrow
    escrow.escrow_id = escrow_id;
    escrow.client = ctx.accounts.client.key();
    escrow.agent = ctx.accounts.agent.key();
    escrow.amount = amount;
    escrow.token_mint = ctx.accounts.token_mint.key();
    escrow.status = EscrowStatus::Active;
    escrow.job_description = job_description.clone();
    escrow.delivery_proof = None;
    escrow.deadline = deadline;
    escrow.created_at = clock.unix_timestamp;
    escrow.completed_at = None;
    escrow.dispute_reason = None;
    escrow.arbitrator_decision = None;
    escrow.bump = ctx.bumps.escrow;

    emit!(EscrowCreatedEvent {
        escrow_id,
        client: ctx.accounts.client.key(),
        agent: ctx.accounts.agent.key(),
        amount,
        deadline,
    });

    msg!("Escrow created: {} for agent: {}", escrow_id, ctx.accounts.agent.key());

    Ok(())
}

// =====================================================
// SUBMIT DELIVERY
// =====================================================

/// Agent submits work delivery proof
#[derive(Accounts)]
pub struct SubmitDelivery<'info> {
    #[account(
        mut,
        seeds = [
            b"ghost_protect",
            escrow.client.as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidState
    )]
    pub escrow: Account<'info, GhostProtectEscrow>,

    #[account(
        constraint = agent.key() == escrow.agent @ GhostSpeakError::InvalidAgent,
        constraint = agent.owner == agent_owner.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    pub agent_owner: Signer<'info>,
}

pub fn submit_delivery(
    ctx: Context<SubmitDelivery>,
    delivery_proof: String,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(
        delivery_proof.len() <= GhostProtectEscrow::MAX_PROOF_LEN,
        GhostSpeakError::InputTooLong
    );

    escrow.delivery_proof = Some(delivery_proof.clone());

    emit!(DeliverySubmittedEvent {
        escrow_id: escrow.escrow_id,
        agent: ctx.accounts.agent.key(),
        delivery_proof,
    });

    msg!("Delivery submitted for escrow: {}", escrow.escrow_id);

    Ok(())
}

// =====================================================
// APPROVE DELIVERY
// =====================================================

/// Client approves delivery and releases payment
#[derive(Accounts)]
pub struct ApproveDelivery<'info> {
    #[account(
        mut,
        seeds = [
            b"ghost_protect",
            escrow.client.as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidState
    )]
    pub escrow: Account<'info, GhostProtectEscrow>,

    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub agent_token_account: Account<'info, TokenAccount>,

    #[account(
        constraint = client.key() == escrow.client @ GhostSpeakError::UnauthorizedAccess
    )]
    pub client: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn approve_delivery(ctx: Context<ApproveDelivery>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    require!(escrow.delivery_proof.is_some(), GhostSpeakError::InvalidWorkDelivery);

    // Transfer payment to agent
    let client_key = escrow.client;
    let escrow_id_bytes = escrow.escrow_id.to_le_bytes();
    let seeds = &[
        b"ghost_protect",
        client_key.as_ref(),
        escrow_id_bytes.as_ref(),
        &[escrow.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_vault.to_account_info(),
        to: ctx.accounts.agent_token_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds
    );
    token::transfer(cpi_ctx, escrow.amount)?;

    // Update escrow
    escrow.status = EscrowStatus::Completed;
    escrow.completed_at = Some(clock.unix_timestamp);

    emit!(EscrowCompletedEvent {
        escrow_id: escrow.escrow_id,
        agent: escrow.agent,
        amount: escrow.amount,
    });

    msg!("Escrow completed: {}", escrow.escrow_id);

    Ok(())
}

// =====================================================
// FILE DISPUTE
// =====================================================

/// Client files a dispute on escrow
#[derive(Accounts)]
pub struct FileDispute<'info> {
    #[account(
        mut,
        seeds = [
            b"ghost_protect",
            escrow.client.as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Active @ GhostSpeakError::InvalidState
    )]
    pub escrow: Account<'info, GhostProtectEscrow>,

    #[account(
        constraint = client.key() == escrow.client @ GhostSpeakError::UnauthorizedAccess
    )]
    pub client: Signer<'info>,
}

pub fn file_dispute(
    ctx: Context<FileDispute>,
    reason: String,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(
        reason.len() <= GhostProtectEscrow::MAX_DISPUTE_REASON_LEN,
        GhostSpeakError::InputTooLong
    );

    escrow.status = EscrowStatus::Disputed;
    escrow.dispute_reason = Some(reason.clone());

    emit!(DisputeFiledEvent {
        escrow_id: escrow.escrow_id,
        client: ctx.accounts.client.key(),
        reason,
    });

    msg!("Dispute filed for escrow: {}", escrow.escrow_id);

    Ok(())
}

// =====================================================
// ARBITRATE DISPUTE
// =====================================================

/// Arbitrator resolves dispute (admin only with priority for premium stakers)
#[derive(Accounts)]
pub struct ArbitrateDispute<'info> {
    #[account(
        mut,
        seeds = [
            b"ghost_protect",
            escrow.client.as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Disputed @ GhostSpeakError::InvalidState
    )]
    pub escrow: Account<'info, GhostProtectEscrow>,

    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub agent_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub client_token_account: Account<'info, TokenAccount>,

    /// Agent's staking account (for potential slashing)
    #[account(
        mut,
        seeds = [b"staking", escrow.agent.as_ref()],
        bump = agent_staking.bump,
    )]
    pub agent_staking: Account<'info, StakingAccount>,

    /// CHECK: Arbitrator authority (validated by protocol)
    pub arbitrator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn arbitrate_dispute(
    ctx: Context<ArbitrateDispute>,
    decision: ArbitratorDecision,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Calculate payment distribution
    let (client_amount, agent_amount) = match &decision {
        ArbitratorDecision::FavorClient { .. } => (escrow.amount, 0u64),
        ArbitratorDecision::FavorAgent { .. } => (0u64, escrow.amount),
        ArbitratorDecision::Split { client_percentage, .. } => {
            let client_amt = (escrow.amount as u128 * *client_percentage as u128 / 100) as u64;
            let agent_amt = escrow.amount - client_amt;
            (client_amt, agent_amt)
        }
    };

    // Transfer funds
    let client_key = escrow.client;
    let escrow_id_bytes = escrow.escrow_id.to_le_bytes();
    let seeds = &[
        b"ghost_protect",
        client_key.as_ref(),
        escrow_id_bytes.as_ref(),
        &[escrow.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    // Send to client if any
    if client_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.client_token_account.to_account_info(),
            authority: escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds
        );
        token::transfer(cpi_ctx, client_amount)?;
    }

    // Send to agent if any
    if agent_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.agent_token_account.to_account_info(),
            authority: escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds
        );
        token::transfer(cpi_ctx, agent_amount)?;
    }

    // Update escrow
    escrow.status = EscrowStatus::Completed;
    escrow.completed_at = Some(clock.unix_timestamp);
    escrow.arbitrator_decision = Some(decision.clone());

    emit!(DisputeResolvedEvent {
        escrow_id: escrow.escrow_id,
        decision: decision.clone(),
        arbitrator: ctx.accounts.arbitrator.key(),
    });

    msg!("Dispute resolved for escrow: {} - Decision: {:?}", escrow.escrow_id, decision);

    Ok(())
}
