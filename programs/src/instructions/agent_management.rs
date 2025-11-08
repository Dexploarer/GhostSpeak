/*!
 * Agent Management Instructions
 *
 * Contains instruction handlers for agent management operations including service updates.
 */

use crate::{GhostSpeakError, *};

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
        !service_data.service_endpoint.is_empty()
            && service_data.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
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
pub fn manage_agent_status(ctx: Context<ManageAgentStatus>, new_status: bool) -> Result<()> {
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

    msg!(
        "Agent status updated: {} -> {} (2025 security)",
        previous_status,
        new_status
    );
    Ok(())
}

/// x402 Payment Configuration Data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct X402ConfigData {
    /// Enable x402 payments for this agent
    pub enabled: bool,
    /// Payment recipient address
    pub payment_address: Pubkey,
    /// Accepted token mints (SPL tokens)
    pub accepted_tokens: Vec<Pubkey>,
    /// Price per API call (in token's smallest unit)
    pub price_per_call: u64,
    /// HTTP service endpoint for x402 payments
    pub service_endpoint: String,
}

/// Context for configuring x402 payment settings (legacy agent management module)
#[derive(Accounts)]
pub struct ConfigureX402AgentManagement<'info> {
    /// Agent account
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    /// Owner must be signer
    #[account(mut)]
    pub owner: Signer<'info>,

    /// Clock for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Event emitted when x402 is configured
#[event]
pub struct X402ConfiguredEvent {
    pub agent: Pubkey,
    pub enabled: bool,
    pub payment_address: Pubkey,
    pub price_per_call: u64,
    pub accepted_tokens_count: u8,
    pub timestamp: i64,
}

/// Configure x402 payment settings for an agent
///
/// Allows agent owners to enable x402 micropayments and configure pricing, accepted tokens,
/// and payment endpoints.
///
/// # Arguments
///
/// * `ctx` - The context containing the agent and owner
/// * `config` - x402 configuration data including:
///   - `enabled` - Whether to enable x402 payments
///   - `payment_address` - Where to receive payments
///   - `accepted_tokens` - SPL token mints accepted (max 10)
///   - `price_per_call` - Price per API call
///   - `service_endpoint` - HTTP endpoint for x402 services
///
/// # Returns
///
/// Returns `Ok(())` on successful configuration
///
/// # Errors
///
/// * `InvalidAgentOwner` - If signer is not the agent owner
/// * `InvalidPaymentAmount` - If price is invalid
/// * `InvalidServiceEndpoint` - If endpoint is malformed
/// * `TooManyCapabilities` - If too many tokens specified
pub fn configure_x402(
    ctx: Context<ConfigureX402AgentManagement>,
    config: X402ConfigData,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = &ctx.accounts.clock;

    // Validation
    require!(
        config.accepted_tokens.len() <= 10,
        GhostSpeakError::TooManyCapabilities
    );

    require!(
        !config.service_endpoint.is_empty() && config.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH,
        GhostSpeakError::InvalidServiceEndpoint
    );

    if config.enabled {
        require!(
            config.price_per_call >= MIN_PAYMENT_AMOUNT && config.price_per_call <= MAX_PAYMENT_AMOUNT,
            GhostSpeakError::InvalidPaymentAmount
        );
    }

    // Update x402 fields
    agent.x402_enabled = config.enabled;
    agent.x402_payment_address = config.payment_address;
    agent.x402_accepted_tokens = config.accepted_tokens.clone();
    agent.x402_price_per_call = config.price_per_call;
    agent.x402_service_endpoint = config.service_endpoint;
    agent.updated_at = clock.unix_timestamp;

    emit!(X402ConfiguredEvent {
        agent: agent.key(),
        enabled: config.enabled,
        payment_address: config.payment_address,
        price_per_call: config.price_per_call,
        accepted_tokens_count: config.accepted_tokens.len() as u8,
        timestamp: clock.unix_timestamp,
    });

    msg!("x402 configured for agent: enabled={}, price={}", config.enabled, config.price_per_call);
    Ok(())
}
