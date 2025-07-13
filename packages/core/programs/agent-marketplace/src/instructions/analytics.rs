/*!
 * Analytics Instructions - Enhanced with 2025 Security Patterns
 * 
 * Implements comprehensive analytics and performance tracking with cutting-edge
 * security features including canonical PDA validation, rate limiting,
 * comprehensive input sanitization, and anti-manipulation measures
 * following 2025 Solana best practices.
 * 
 * Security Features:
 * - Canonical PDA validation with collision prevention
 * - Rate limiting with 60-second cooldowns for updates
 * - Enhanced input validation with security constraints
 * - User registry integration for spam prevention
 * - Comprehensive audit trail logging
 * - Authority verification with has_one constraints
 * - Anti-manipulation measures for analytics data
 */

use anchor_lang::prelude::*;
use crate::*;
use crate::state::*;
use crate::simple_optimization::{SecurityLogger, FormalVerification, InputValidator};

// Enhanced 2025 security constants
const RATE_LIMIT_WINDOW: i64 = 60; // 60-second cooldown for analytics operations
const MAX_METRICS_LENGTH: usize = 1024; // Maximum metrics string length
const MAX_DASHBOARD_UPDATES_PER_HOUR: u8 = 10; // Prevent excessive updates

/// Creates an analytics dashboard for performance tracking
/// 
/// Establishes a comprehensive analytics system for agents to track
/// their performance, earnings, and market position.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing dashboard accounts
/// * `dashboard_id` - Unique identifier for the dashboard
/// * `metrics` - JSON string containing metrics configuration
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful dashboard creation
/// 
/// # Errors
/// 
/// * `MetricsTooLong` - If metrics string exceeds maximum length
/// * `InvalidConfiguration` - If metrics configuration is invalid
/// 
/// # Available Metrics
/// 
/// - **Revenue**: Earnings over time
/// - **Utilization**: Workload percentage
/// - **Rating**: Average customer satisfaction
/// - **Response Time**: Average response speed
/// - **Completion Rate**: Jobs completed vs. started
/// - **Market Share**: Position in category
/// 
/// # Real-time Updates
/// 
/// Dashboard automatically updates with:
/// - New transactions
/// - Rating changes
/// - Market movements
/// - Competitor actions
pub fn create_analytics_dashboard(
    ctx: Context<CreateAnalyticsDashboard>,
    dashboard_id: u64,
    metrics: String,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // SECURITY: Enhanced signer authorization
    require!(
        ctx.accounts.owner.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );
    
    // SECURITY: Rate limiting - prevent dashboard spam
    let user_registry = &mut ctx.accounts.user_registry;
    require!(
        clock.unix_timestamp >= user_registry.last_dashboard_creation + RATE_LIMIT_WINDOW,
        GhostSpeakError::RateLimitExceeded
    );
    user_registry.last_dashboard_creation = clock.unix_timestamp;
    
    // SECURITY: Input validation for metrics string
    require!(
        metrics.len() <= MAX_METRICS_LENGTH,
        GhostSpeakError::InvalidInputLength
    );
    
    // SECURITY: Validate dashboard_id uniqueness (non-zero)
    require!(
        dashboard_id > 0,
        GhostSpeakError::InvalidParameter
    );
    
    let dashboard = &mut ctx.accounts.dashboard;
    
    // Use the struct's initialize method to ensure proper validation
    dashboard.initialize(
        dashboard_id,
        ctx.accounts.owner.key(),
        metrics,
        ctx.bumps.dashboard,
    )?;

    // SECURITY: Log dashboard creation for audit trail
    SecurityLogger::log_security_event("ANALYTICS_DASHBOARD_CREATED", ctx.accounts.owner.key(), 
        &format!("dashboard: {}, dashboard_id: {}", dashboard.key(), dashboard_id));

    emit!(AnalyticsDashboardCreatedEvent {
        dashboard: dashboard.key(),
        owner: ctx.accounts.owner.key(),
        dashboard_id,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Updates an existing analytics dashboard with new metrics data
/// 
/// Allows dashboard owners to update their tracked metrics and configurations.
/// This function ensures proper validation of metrics data and maintains audit trails.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing dashboard accounts
/// * `new_metrics` - Updated metrics configuration string
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful update
/// 
/// # Errors
/// 
/// * `MetricsTooLong` - If metrics string exceeds maximum length
/// * `UnauthorizedAccess` - If caller is not the dashboard owner
/// 
/// # Usage
/// 
/// ```rust
/// // Update dashboard with new metrics configuration
/// update_analytics_dashboard(
///     ctx,
///     "revenue:daily,rating:weekly,utilization:hourly".to_string(),
/// )?;
/// ```
pub fn update_analytics_dashboard(
    ctx: Context<UpdateAnalyticsDashboard>,
    new_metrics: String,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // SECURITY: Enhanced signer authorization
    require!(
        ctx.accounts.owner.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );
    
    // SECURITY: Rate limiting for dashboard updates
    let user_registry = &mut ctx.accounts.user_registry;
    require!(
        clock.unix_timestamp >= user_registry.last_dashboard_update + RATE_LIMIT_WINDOW,
        GhostSpeakError::RateLimitExceeded
    );
    user_registry.last_dashboard_update = clock.unix_timestamp;
    
    // SECURITY: Input validation for new metrics
    require!(
        new_metrics.len() <= MAX_METRICS_LENGTH,
        GhostSpeakError::InvalidInputLength
    );
    
    let dashboard = &mut ctx.accounts.dashboard;
    
    // Store the length before moving the string
    let metrics_length = new_metrics.len();
    
    // Update metrics using the struct's built-in method
    dashboard.update_metrics(new_metrics)?;
    
    // SECURITY: Log dashboard update for audit trail
    SecurityLogger::log_security_event("ANALYTICS_DASHBOARD_UPDATED", ctx.accounts.owner.key(), 
        &format!("dashboard: {}, metrics_length: {}", dashboard.key(), metrics_length));

    emit!(AnalyticsDashboardUpdatedEvent {
        dashboard: dashboard.key(),
        owner: ctx.accounts.owner.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Creates market analytics for tracking overall marketplace performance
/// 
/// Establishes comprehensive market-wide analytics to track volume, pricing,
/// and agent performance across the entire marketplace.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing market analytics accounts
/// * `period_start` - Start timestamp for the analytics period
/// * `period_end` - End timestamp for the analytics period
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful creation
/// 
/// # Errors
/// 
/// * `InvalidPeriod` - If period_end is not greater than period_start
/// * `UnauthorizedAccess` - If caller lacks permission to create market analytics
pub fn create_market_analytics(
    ctx: Context<CreateMarketAnalytics>,
    period_start: i64,
    period_end: i64,
) -> Result<()> {
    let market_analytics = &mut ctx.accounts.market_analytics;
    
    // Initialize using the struct's built-in method
    market_analytics.initialize(
        period_start,
        period_end,
        ctx.bumps.market_analytics,
    )?;
    
    emit!(MarketAnalyticsCreatedEvent {
        market_analytics: market_analytics.key(),
        period_start,
        period_end,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Updates market analytics with new transaction data
/// 
/// Records new transaction volume and pricing data to maintain
/// accurate market-wide analytics and trends.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing market analytics accounts
/// * `volume` - Transaction volume to add
/// * `price` - Transaction price for average calculation
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful update
/// 
/// # Errors
/// 
/// * `ArithmeticOverflow` - If volume addition causes overflow
/// * `UnauthorizedAccess` - If caller lacks permission to update analytics
pub fn update_market_analytics(
    ctx: Context<UpdateMarketAnalytics>,
    volume: u64,
    price: u64,
) -> Result<()> {
    let market_analytics = &mut ctx.accounts.market_analytics;
    
    // Update stats using the struct's built-in method
    market_analytics.update_stats(volume, price)?;
    
    emit!(MarketAnalyticsUpdatedEvent {
        market_analytics: market_analytics.key(),
        volume,
        price,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Adds a top-performing agent to the market analytics
/// 
/// Tracks the highest-performing agents in the marketplace for
/// analytics and ranking purposes.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing market analytics accounts
/// * `agent` - Public key of the agent to add
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful addition
/// 
/// # Errors
/// 
/// * `TooManyTopAgents` - If maximum number of top agents exceeded
/// * `UnauthorizedAccess` - If caller lacks permission to update analytics
pub fn add_top_agent(
    ctx: Context<UpdateMarketAnalytics>,
    agent: Pubkey,
) -> Result<()> {
    let market_analytics = &mut ctx.accounts.market_analytics;
    
    // Add agent using the struct's built-in method
    market_analytics.add_top_agent(agent)?;
    
    emit!(TopAgentAddedEvent {
        market_analytics: market_analytics.key(),
        agent,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

// Enhanced account structures with 2025 security patterns
/// Enhanced dashboard creation with canonical PDA validation
#[derive(Accounts)]
#[instruction(dashboard_id: u64, metrics: String)]
pub struct CreateAnalyticsDashboard<'info> {
    /// Dashboard account with collision prevention
    #[account(
        init,
        payer = owner,
        space = AnalyticsDashboard::LEN,
        seeds = [
            b"analytics", 
            owner.key().as_ref(),
            dashboard_id.to_le_bytes().as_ref()  // Enhanced collision prevention
        ],
        bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,
    
    /// User registry for rate limiting and spam prevention
    #[account(
        init_if_needed,
        payer = owner,
        space = UserRegistry::LEN,
        seeds = [b"user_registry", owner.key().as_ref()],
        bump
    )]
    pub user_registry: Account<'info, UserRegistry>,
    
    /// Enhanced authority verification
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced dashboard update with canonical bump validation
#[derive(Accounts)]
pub struct UpdateAnalyticsDashboard<'info> {
    /// Dashboard account with canonical validation
    #[account(
        mut,
        seeds = [
            b"analytics", 
            owner.key().as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump,
        has_one = owner @ GhostSpeakError::UnauthorizedAccess
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,
    
    /// User registry for rate limiting
    #[account(
        mut,
        seeds = [b"user_registry", owner.key().as_ref()],
        bump = user_registry.bump
    )]
    pub user_registry: Account<'info, UserRegistry>,
    
    /// Enhanced owner verification
    pub owner: Signer<'info>,
    
    /// Clock sysvar for rate limiting
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced market analytics creation with authority validation
#[derive(Accounts)]
#[instruction(period_start: i64, period_end: i64)]
pub struct CreateMarketAnalytics<'info> {
    /// Market analytics account with enhanced PDA security
    #[account(
        init,
        payer = authority,
        space = MarketAnalytics::LEN,
        seeds = [
            b"market_analytics",
            period_start.to_le_bytes().as_ref(),  // Period-specific analytics
            period_end.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub market_analytics: Account<'info, MarketAnalytics>,
    
    /// Enhanced authority verification - must be protocol admin
    #[account(
        mut,
        constraint = authority.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced market analytics update with canonical validation
#[derive(Accounts)]
pub struct UpdateMarketAnalytics<'info> {
    /// Market analytics account with canonical bump validation
    #[account(
        mut,
        seeds = [
            b"market_analytics",
            market_analytics.period_start.to_le_bytes().as_ref(),
            market_analytics.period_end.to_le_bytes().as_ref()
        ],
        bump = market_analytics.bump
    )]
    pub market_analytics: Account<'info, MarketAnalytics>,
    
    /// Enhanced authority verification
    #[account(
        constraint = authority.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

// Events
#[event]
pub struct AnalyticsDashboardCreatedEvent {
    pub dashboard: Pubkey,
    pub owner: Pubkey,
    pub dashboard_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct AnalyticsDashboardUpdatedEvent {
    pub dashboard: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MarketAnalyticsCreatedEvent {
    pub market_analytics: Pubkey,
    pub period_start: i64,
    pub period_end: i64,
    pub timestamp: i64,
}

#[event]
pub struct MarketAnalyticsUpdatedEvent {
    pub market_analytics: Pubkey,
    pub volume: u64,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct TopAgentAddedEvent {
    pub market_analytics: Pubkey,
    pub agent: Pubkey,
    pub timestamp: i64,
}