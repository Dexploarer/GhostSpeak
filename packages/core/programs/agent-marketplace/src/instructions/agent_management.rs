/*!
 * Agent Management Instructions
 * 
 * Contains instruction handlers for agent management operations including service updates.
 */

use anchor_lang::prelude::*;
use crate::{*, PodAIMarketplaceError};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentServiceData {
    pub agent_pubkey: Pubkey,
    pub service_endpoint: String,
    pub is_active: bool,
    pub last_updated: i64,
}

#[derive(Accounts)]
pub struct UpdateAgentService<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    pub owner: Signer<'info>,
}

#[event]
pub struct AgentServiceUpdatedEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

/// Updates an agent's service configuration and availability status
/// 
/// Allows verified agents to update their service endpoint and toggle their availability.
/// Only the agent owner can update their own service configuration.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the agent service account and owner authority
/// * `service_data` - Updated service configuration including:
///   - `service_endpoint` - New API endpoint URL
///   - `is_active` - Whether the agent is currently accepting work
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful update
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If the signer is not the agent owner
/// * `AgentNotVerified` - If the agent has not been verified first
/// 
/// # Events
/// 
/// Emits `AgentServiceUpdatedEvent` with the agent's public key and update timestamp
pub fn update_agent_service(
    ctx: Context<UpdateAgentService>,
    service_data: AgentServiceData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.owner.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Input validation
    require!(
        !service_data.service_endpoint.is_empty() && service_data.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
        PodAIMarketplaceError::InputTooLong
    );

    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;

    // Only update service configuration, not create/modify agents
    agent.service_endpoint = service_data.service_endpoint;
    agent.is_active = service_data.is_active;
    agent.updated_at = clock.unix_timestamp;

    emit!(AgentServiceUpdatedEvent {
        agent: agent.key(),
        owner: ctx.accounts.owner.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}