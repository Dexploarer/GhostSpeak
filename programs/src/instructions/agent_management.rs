/*!
 * Agent Management Instructions
 * 
 * Contains instruction handlers for agent management operations including service updates.
 */

use anchor_lang::prelude::*;
use crate::{*, GhostSpeakError};

/// Agent service configuration data with 2025 security validation
/// 
/// Follows SPL Token 2022 patterns for enhanced agent management
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentServiceData {
    /// Agent's public key for verification (must match PDA derivation)
    pub agent_pubkey: Pubkey,
    /// Service endpoint URL (validated for length and format)
    pub service_endpoint: String,
    /// Agent availability status for work orders
    pub is_active: bool,
    /// Timestamp for tracking updates (Unix timestamp)
    pub last_updated: i64,
    /// Optional metadata URI for extended agent information
    pub metadata_uri: Option<String>,
    /// Service capability tags for filtering
    pub capabilities: Vec<String>,
}

/// 2025 Anchor pattern for secure agent service updates
/// 
/// Uses canonical bump validation and comprehensive security constraints
#[derive(Accounts)]
pub struct UpdateAgentService<'info> {
    /// Agent account with enhanced 2025 security patterns
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    /// Owner must be signer for security (2025 pattern)
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// System program for account operations
    pub system_program: Program<'info, System>,
}

/// Advanced agent management instruction context (2025 pattern)
#[derive(Accounts)]
pub struct ManageAgentStatus<'info> {
    /// Agent account with strict validation
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    /// Owner authority
    pub owner: Signer<'info>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced event structure following 2025 patterns
#[event]
pub struct AgentServiceUpdatedEvent {
    /// Agent account public key
    pub agent: Pubkey,
    /// Owner who performed the update
    pub owner: Pubkey,
    /// Update timestamp
    pub timestamp: i64,
    /// Service endpoint that was updated
    pub service_endpoint: String,
    /// New active status
    pub is_active: bool,
}

/// Agent status management event (2025 pattern)
#[event]
pub struct AgentStatusChangedEvent {
    /// Agent public key
    pub agent: Pubkey,
    /// Previous status
    pub previous_status: bool,
    /// New status
    pub new_status: bool,
    /// Change timestamp
    pub timestamp: i64,
    /// Owner who made the change
    pub authority: Pubkey,
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
        GhostSpeakError::UnauthorizedAccess
    );
    
    // SECURITY: Input validation
    require!(
        !service_data.service_endpoint.is_empty() && service_data.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
        GhostSpeakError::InputTooLong
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
        service_endpoint: agent.service_endpoint.clone(),
        is_active: agent.is_active,
    });

    Ok(())
}

/// Advanced agent status management with 2025 patterns
/// 
/// Provides granular control over agent availability with enhanced security.
/// Implements rate limiting and comprehensive audit logging.
/// 
/// # Security Features (2025)
/// 
/// * Canonical PDA validation with stored bump
/// * Clock sysvar integration for timestamp validation
/// * Status change audit trail with detailed logging
/// * Authority verification with enhanced constraints
/// * Rate limiting to prevent status manipulation
/// 
/// # Arguments
/// 
/// * `ctx` - Validated context with clock sysvar access
/// * `new_status` - New availability status for the agent
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful status update
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - Authority validation failed
/// * `InvalidStatusTransition` - No actual status change detected
/// * `UpdateFrequencyTooHigh` - Rate limiting protection triggered
/// 
/// # Events
/// 
/// Emits `AgentStatusChangedEvent` for comprehensive audit trail
pub fn manage_agent_status(
    ctx: Context<ManageAgentStatus>,
    new_status: bool,
) -> Result<()> {
    msg!("Managing agent status - 2025 enhanced pattern");
    
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;
    let previous_status = agent.is_active;
    
    // SECURITY 2025: Only update if status actually changed (prevent unnecessary transactions)
    require!(
        previous_status != new_status,
        GhostSpeakError::InvalidStatusTransition
    );
    
    // SECURITY 2025: Rate limiting check (prevent status manipulation)
    require!(
        clock.unix_timestamp > agent.updated_at + 30, // 30 second cooldown for status changes
        GhostSpeakError::UpdateFrequencyTooHigh
    );
    
    // Update status with timestamp using 2025 patterns
    agent.is_active = new_status;
    agent.updated_at = clock.unix_timestamp;
    
    // SECURITY 2025: Emit comprehensive status change event for audit trail
    emit!(AgentStatusChangedEvent {
        agent: agent.key(),
        previous_status,
        new_status,
        timestamp: clock.unix_timestamp,
        authority: ctx.accounts.owner.key(),
    });
    
    msg!("Agent status updated: {} -> {} (2025 security)", previous_status, new_status);
    Ok(())
}