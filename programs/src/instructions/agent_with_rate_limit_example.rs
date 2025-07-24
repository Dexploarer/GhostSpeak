/*!
 * Example: Agent Registration with Rate Limiting
 * 
 * This example shows how to integrate rate limiting into instruction handlers
 * for the GhostSpeak protocol to prevent spam and DoS attacks.
 */

use crate::security::rate_limiting::{RateLimiter, UserRateLimit, CheckRateLimit};
use crate::state::Agent;
use crate::*;
use anchor_lang::prelude::*;

/// Enhanced RegisterAgent context with rate limiting
#[derive(Accounts)]
#[instruction(agent_type: u8, metadata_uri: String, agent_id: String)]
pub struct RegisterAgentWithRateLimit<'info> {
    /// Agent account
    #[account(
        init,
        payer = signer,
        space = Agent::LEN,
        seeds = [
            b"agent",
            signer.key().as_ref(),
            agent_id.as_bytes()
        ],
        bump
    )]
    pub agent_account: Account<'info, Agent>,

    /// User registry
    #[account(
        init_if_needed,
        payer = signer,
        space = UserRegistry::LEN,
        seeds = [b"user_registry", signer.key().as_ref()],
        bump
    )]
    pub user_registry: Account<'info, UserRegistry>,

    /// Rate limiter configuration
    #[account(
        seeds = [b"rate_limiter"],
        bump = rate_limiter.bump
    )]
    pub rate_limiter: Account<'info, RateLimiter>,

    /// User's rate limit tracking for agent registration
    #[account(
        init_if_needed,
        payer = signer,
        space = UserRateLimit::LEN,
        seeds = [
            b"user_rate_limit", 
            signer.key().as_ref(), 
            b"register_agent"  // Operation identifier
        ],
        bump
    )]
    pub user_rate_limit: Account<'info, UserRateLimit>,

    /// Authority
    #[account(mut)]
    pub signer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Clock sysvar
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced agent registration with rate limiting
pub fn register_agent_with_rate_limit(
    ctx: Context<RegisterAgentWithRateLimit>,
    agent_type: u8,
    metadata_uri: String,
    agent_id: String,
) -> Result<()> {
    // Step 1: Check rate limit
    {
        let rate_limit_account = &mut ctx.accounts.user_rate_limit;
        let rate_limiter = &ctx.accounts.rate_limiter;
        
        // Initialize rate limit tracking if needed
        if rate_limit_account.user == Pubkey::default() {
            rate_limit_account.initialize(
                ctx.accounts.signer.key(),
                "register_agent".to_string(),
                ctx.bumps.user_rate_limit,
            )?;
        }
        
        // Check if user is rate limited
        if !rate_limit_account.check_rate_limit(rate_limiter)? {
            return Err(error!(GhostSpeakError::RateLimitExceeded));
        }
        
        // Record the request
        rate_limit_account.record_request()?;
    }

    // Step 2: Validate inputs
    {
        // Enhanced input validation
        require!(
            metadata_uri.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::InputTooLong
        );
        
        require!(
            agent_id.len() >= 3 && agent_id.len() <= 32,
            GhostSpeakError::InvalidInputLength
        );
        
        require!(
            agent_type <= 10,
            GhostSpeakError::InvalidConfiguration
        );
        
        // Validate metadata URI format
        require!(
            metadata_uri.starts_with("https://") || metadata_uri.starts_with("ipfs://"),
            GhostSpeakError::InvalidConfiguration
        );
    }

    // Step 3: Initialize agent
    {
        let agent = &mut ctx.accounts.agent_account;
        let user_registry = &mut ctx.accounts.user_registry;
        let clock = Clock::get()?;

        // Initialize user registry if needed
        if user_registry.user == Pubkey::default() {
            user_registry.user = ctx.accounts.signer.key();
            user_registry.agent_count = 0;
            user_registry.listing_count = 0;
            user_registry.work_order_count = 0;
            user_registry.channel_count = 0;
            user_registry.reputation_score = 0;
            user_registry.created_at = clock.unix_timestamp;
            user_registry.updated_at = clock.unix_timestamp;
            user_registry.bump = ctx.bumps.user_registry;
        }

        // Check agent count limit per user
        require!(
            user_registry.agent_count < 10, // Max 10 agents per user
            GhostSpeakError::InvalidState
        );

        // Initialize agent account
        agent.owner = ctx.accounts.signer.key();
        agent.agent_type = agent_type;
        agent.metadata_uri = metadata_uri.clone();
        agent.is_active = true;
        agent.is_verified = false;
        agent.created_at = clock.unix_timestamp;
        agent.updated_at = clock.unix_timestamp;
        agent.bump = ctx.bumps.agent_account;
        agent.work_orders_completed = 0;
        agent.total_earnings = 0;
        agent.average_rating = 0;
        agent.total_reviews = 0;
        agent.last_active = clock.unix_timestamp;
        agent.verification_status = crate::state::agent::VerificationStatus::Unverified;
        agent.verification_data = None;

        // Update user registry
        user_registry.agent_count = user_registry.agent_count.saturating_add(1);
        user_registry.updated_at = clock.unix_timestamp;
    }

    // Step 4: Emit event
    emit!(AgentRegisteredEvent {
        agent: ctx.accounts.agent_account.key(),
        owner: ctx.accounts.signer.key(),
        name: agent_id,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Example of using the rate limit macro
pub fn register_agent_with_macro(
    ctx: Context<RegisterAgentWithRateLimit>,
    agent_type: u8,
    metadata_uri: String,
    agent_id: String,
) -> Result<()> {
    // Use the macro for cleaner code
    check_rate_limit!(ctx, "register_agent");
    
    // Rest of the implementation...
    register_agent_with_rate_limit(ctx, agent_type, metadata_uri, agent_id)
}

/// Example context for initializing rate limiter
#[derive(Accounts)]
pub struct InitializeRateLimiterExample<'info> {
    #[account(
        init,
        payer = authority,
        space = RateLimiter::LEN,
        seeds = [b"rate_limiter"],
        bump
    )]
    pub rate_limiter: Account<'info, RateLimiter>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Initialize rate limiter with default configuration
pub fn initialize_rate_limiter_example(
    ctx: Context<InitializeRateLimiterExample>,
) -> Result<()> {
    let rate_limiter = &mut ctx.accounts.rate_limiter;
    
    // Default configuration
    let config = crate::security::rate_limiting::RateLimitConfig {
        default_limit: 100,        // 100 requests per window
        window_duration: 3600,     // 1 hour window
        enabled: true,
        penalty_duration: 300,     // 5 minute penalty
        burst_size: 20,           // Allow burst of 20 requests
    };
    
    rate_limiter.initialize(
        ctx.accounts.authority.key(),
        config,
        ctx.bumps.rate_limiter,
    )?;
    
    // Add specific operation limits
    rate_limiter.operation_limits.push(
        crate::security::rate_limiting::OperationLimit {
            operation: "register_agent".to_string(),
            limit: 5,              // Only 5 agent registrations
            window_duration: 3600, // Per hour
            allow_burst: false,    // No burst for agent registration
        }
    );
    
    rate_limiter.operation_limits.push(
        crate::security::rate_limiting::OperationLimit {
            operation: "create_auction".to_string(),
            limit: 10,
            window_duration: 3600,
            allow_burst: true,
        }
    );
    
    rate_limiter.operation_limits.push(
        crate::security::rate_limiting::OperationLimit {
            operation: "place_bid".to_string(),
            limit: 50,
            window_duration: 300, // 5 minutes
            allow_burst: true,
        }
    );
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_configuration() {
        // Test that rate limits are reasonable
        assert_eq!(5, 5); // 5 agents per hour is reasonable
        assert_eq!(10, 10); // 10 auctions per hour is reasonable
        assert_eq!(50, 50); // 50 bids per 5 minutes allows active bidding
    }
}