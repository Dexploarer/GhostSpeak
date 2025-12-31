/*!
 * Agent Pre-Authorization Instructions
 *
 * GhostSpeak's trustless system for agents to pre-authorize facilitators
 * (e.g., PayAI) to update their reputation with built-in security limits.
 *
 * ## Instructions:
 * 1. `create_agent_authorization` - Agent creates authorization for facilitator
 * 2. `update_reputation_with_auth` - Facilitator updates reputation using authorization
 * 3. `revoke_authorization` - Agent revokes an authorization
 * 4. `verify_authorization` - View-only verification of authorization validity
 */

use anchor_lang::prelude::*;
use crate::state::{
    AgentReputationAuth,
    AuthorizationUsageRecord,
    ReputationMetrics,
    Agent,
    GhostSpeakError,
    AGENT_AUTH_SEED,
    AUTH_USAGE_SEED,
};

// ===== CREATE AUTHORIZATION =====

#[derive(Accounts)]
#[instruction(
    authorized_source: Pubkey,
    index_limit: u64,
    expires_at: i64,
    network: u8,
    nonce: Option<String>
)]
pub struct CreateAgentAuthorization<'info> {
    /// Agent granting authorization
    #[account(
        constraint = agent.owner == authority.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    /// Authorization account (PDA)
    #[account(
        init,
        payer = authority,
        space = AgentReputationAuth::LEN,
        seeds = [
            AGENT_AUTH_SEED,
            agent.key().as_ref(),
            authorized_source.as_ref(),
            nonce.as_ref().unwrap_or(&String::from("default")).as_bytes()
        ],
        bump
    )]
    pub authorization: Account<'info, AgentReputationAuth>,

    /// Authority (agent owner)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn create_agent_authorization(
    ctx: Context<CreateAgentAuthorization>,
    authorized_source: Pubkey,
    index_limit: u64,
    expires_at: i64,
    network: u8,
    signature: [u8; 64],
    nonce: Option<String>,
) -> Result<()> {
    let authorization = &mut ctx.accounts.authorization;
    let agent = &ctx.accounts.agent;

    // Initialize authorization
    authorization.initialize(
        agent.key(),
        authorized_source,
        index_limit,
        expires_at,
        network,
        signature,
        nonce,
        ctx.bumps.authorization,
    )?;

    msg!(
        "Created agent authorization: agent={}, source={}, limit={}, expires={}",
        agent.key(),
        authorized_source,
        index_limit,
        expires_at
    );

    Ok(())
}

// ===== UPDATE REPUTATION WITH AUTHORIZATION =====

#[derive(Accounts)]
#[instruction(
    reputation_change: i64,
    _nonce: Option<String>
)]
pub struct UpdateReputationWithAuth<'info> {
    /// Agent whose reputation is being updated
    pub agent: Account<'info, Agent>,

    /// Agent reputation metrics
    #[account(
        mut,
        seeds = [
            b"reputation_metrics",
            agent.key().as_ref()
        ],
        bump
    )]
    pub reputation_metrics: Account<'info, ReputationMetrics>,

    /// Authorization account (PDA)
    #[account(
        mut,
        seeds = [
            AGENT_AUTH_SEED,
            agent.key().as_ref(),
            authorized_source.key().as_ref(),
            _nonce.as_ref().unwrap_or(&String::from("default")).as_bytes()
        ],
        bump = authorization.bump,
        constraint = authorization.agent == agent.key() @ GhostSpeakError::InvalidAgentOwner,
        constraint = authorization.authorized_source == authorized_source.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authorization: Account<'info, AgentReputationAuth>,

    /// Usage record account (optional, for audit trail)
    #[account(
        init,
        payer = authorized_source,
        space = AuthorizationUsageRecord::LEN,
        seeds = [
            AUTH_USAGE_SEED,
            authorization.key().as_ref(),
            &authorization.current_index.to_le_bytes()
        ],
        bump
    )]
    pub usage_record: Account<'info, AuthorizationUsageRecord>,

    /// Authorized source (e.g., PayAI facilitator)
    #[account(mut)]
    pub authorized_source: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

pub fn update_reputation_with_auth(
    ctx: Context<UpdateReputationWithAuth>,
    reputation_change: i64,
    transaction_signature: String,
    metadata: Option<String>,
    _nonce: Option<String>,
) -> Result<()> {
    let authorization = &mut ctx.accounts.authorization;
    let reputation_metrics = &mut ctx.accounts.reputation_metrics;
    let usage_record = &mut ctx.accounts.usage_record;
    let clock = &ctx.accounts.clock;

    // Verify authorization is valid
    require!(
        authorization.is_valid(clock.unix_timestamp)?,
        GhostSpeakError::UnauthorizedAccess
    );

    // Update reputation metrics using multi-source reputation system
    // Get current PayAI source score or default to 500 (middle of 0-1000 range)
    let current_source = reputation_metrics.get_source_score("payai");
    let current_score = current_source.map(|s| s.score as i64).unwrap_or(500);
    let current_data_points = current_source.map(|s| s.data_points).unwrap_or(0);

    // Apply reputation change (clamped to 0-1000 range)
    let new_score = (current_score + reputation_change)
        .max(0)
        .min(1000) as u16;

    // Update PayAI source score
    reputation_metrics.update_source_score(
        "payai".to_string(),
        new_score,
        10000, // 100% weight (basis points)
        current_data_points + 1,
        10000, // 100% reliability (basis points)
        clock.unix_timestamp,
    )?;

    // Update last aggregation timestamp
    reputation_metrics.last_aggregation = clock.unix_timestamp;

    // Record authorization usage
    authorization.record_usage(reputation_change)?;

    // Initialize usage record for audit trail
    usage_record.initialize(
        authorization.key(),
        authorization.agent,
        authorization.authorized_source,
        authorization.current_index,
        reputation_change,
        transaction_signature,
        metadata,
        ctx.bumps.usage_record,
    )?;

    msg!(
        "Updated reputation with authorization: agent={}, change={}, new_index={}/{}",
        authorization.agent,
        reputation_change,
        authorization.current_index,
        authorization.index_limit
    );

    Ok(())
}

// ===== REVOKE AUTHORIZATION =====

#[derive(Accounts)]
#[instruction(_nonce: Option<String>)]
pub struct RevokeAuthorization<'info> {
    /// Agent revoking authorization
    #[account(
        constraint = agent.owner == authority.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    /// Authorization account (PDA)
    #[account(
        mut,
        seeds = [
            AGENT_AUTH_SEED,
            agent.key().as_ref(),
            authorization.authorized_source.as_ref(),
            _nonce.as_ref().unwrap_or(&String::from("default")).as_bytes()
        ],
        bump = authorization.bump,
        constraint = authorization.agent == agent.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub authorization: Account<'info, AgentReputationAuth>,

    /// Authority (agent owner)
    pub authority: Signer<'info>,
}

pub fn revoke_authorization(
    ctx: Context<RevokeAuthorization>,
    _nonce: Option<String>,
) -> Result<()> {
    let authorization = &mut ctx.accounts.authorization;

    // Revoke authorization
    authorization.revoke()?;

    msg!(
        "Revoked authorization: agent={}, source={}",
        authorization.agent,
        authorization.authorized_source
    );

    Ok(())
}

// ===== VERIFY AUTHORIZATION (View-Only) =====

#[derive(Accounts)]
#[instruction(_nonce: Option<String>)]
pub struct VerifyAuthorization<'info> {
    /// Agent account
    pub agent: Account<'info, Agent>,

    /// Authorization account (PDA)
    #[account(
        seeds = [
            AGENT_AUTH_SEED,
            agent.key().as_ref(),
            authorization.authorized_source.as_ref(),
            _nonce.as_ref().unwrap_or(&String::from("default")).as_bytes()
        ],
        bump = authorization.bump,
        constraint = authorization.agent == agent.key() @ GhostSpeakError::InvalidAgentOwner
    )]
    pub authorization: Account<'info, AgentReputationAuth>,

    /// Clock for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

pub fn verify_authorization(
    ctx: Context<VerifyAuthorization>,
    _nonce: Option<String>,
) -> Result<bool> {
    let authorization = &ctx.accounts.authorization;
    let clock = &ctx.accounts.clock;

    // Verify authorization is valid
    let is_valid = authorization.is_valid(clock.unix_timestamp)?;

    msg!(
        "Authorization verification: agent={}, source={}, valid={}, remaining={}/{}",
        authorization.agent,
        authorization.authorized_source,
        is_valid,
        authorization.remaining_uses(),
        authorization.index_limit
    );

    Ok(is_valid)
}

// ===== HELPER FUNCTIONS =====

/// Get authorization status without modifying state
pub fn get_authorization_status(
    authorization: &AgentReputationAuth,
    current_time: i64,
) -> String {
    match authorization.get_status(current_time) {
        crate::state::AuthorizationStatus::Active => "active".to_string(),
        crate::state::AuthorizationStatus::Expired => "expired".to_string(),
        crate::state::AuthorizationStatus::Exhausted => "exhausted".to_string(),
        crate::state::AuthorizationStatus::Revoked => "revoked".to_string(),
    }
}
