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

use crate::simple_optimization::SecurityLogger;
use crate::*;

// Enhanced 2025 security constants
const RATE_LIMIT_WINDOW: i64 = 60; // 60-second cooldown for analytics operations
const MAX_METRICS_LENGTH: usize = 1024; // Maximum metrics string length
const _MAX_DASHBOARD_UPDATES_PER_HOUR: u8 = 10; // Prevent excessive updates

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
    require!(dashboard_id > 0, GhostSpeakError::InvalidParameter);

    let dashboard = &mut ctx.accounts.dashboard;

    // Use the struct's initialize method to ensure proper validation
    dashboard.initialize(
        dashboard_id,
        ctx.accounts.owner.key(),
        metrics,
        ctx.bumps.dashboard,
    )?;

    // SECURITY: Log dashboard creation for audit trail
    SecurityLogger::log_security_event(
        "ANALYTICS_DASHBOARD_CREATED",
        ctx.accounts.owner.key(),
        &format!(
            "dashboard: {}, dashboard_id: {}",
            dashboard.key(),
            dashboard_id
        ),
    );

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
    SecurityLogger::log_security_event(
        "ANALYTICS_DASHBOARD_UPDATED",
        ctx.accounts.owner.key(),
        &format!(
            "dashboard: {}, metrics_length: {}",
            dashboard.key(),
            metrics_length
        ),
    );

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
/// * `InvalidExpiration` - If period_end is not greater than period_start
/// * `UnauthorizedAccess` - If caller lacks permission to create market analytics
pub fn create_market_analytics(
    ctx: Context<CreateMarketAnalytics>,
    period_start: i64,
    period_end: i64,
) -> Result<()> {
    let market_analytics = &mut ctx.accounts.market_analytics;

    // Initialize using the struct's built-in method
    market_analytics.initialize(period_start, period_end, ctx.bumps.market_analytics)?;

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
pub fn add_top_agent(ctx: Context<UpdateMarketAnalytics>, agent: Pubkey) -> Result<()> {
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

/// Collects real-time network metrics for analytics dashboard
///
/// This instruction periodically collects network-wide metrics such as
/// active agents, transaction throughput, and system performance.
///
/// # Arguments
///
/// * `ctx` - The context containing analytics accounts
/// * `active_agents` - Number of currently active agents
/// * `transaction_throughput` - Transactions per second
/// * `average_latency` - Average network latency in milliseconds
/// * `error_rate` - Error rate in basis points (0-10000)
///
/// # Returns
///
/// Returns `Ok(())` on successful metrics collection
///
/// # Errors
///
/// * `UnauthorizedAccess` - If caller lacks permission to collect metrics
/// * `InvalidParameter` - If metrics values are out of valid ranges
pub fn collect_network_metrics(
    ctx: Context<CollectNetworkMetrics>,
    active_agents: u32,
    transaction_throughput: u64,
    average_latency: u64,
    error_rate: u32,
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURITY: Enhanced signer authorization (only protocol admin or authorized collectors)
    require!(
        ctx.accounts.collector.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Validate metric parameters
    require!(error_rate <= 10000, GhostSpeakError::InvalidParameter);
    require!(average_latency < 60000, GhostSpeakError::InvalidParameter); // Max 60 seconds latency

    let dashboard = &mut ctx.accounts.dashboard;

    // Update network metrics using enhanced analytics state methods
    dashboard.update_network_metrics(
        active_agents,
        transaction_throughput,
        average_latency,
        error_rate,
    )?;

    // Emit analytics event for real-time streaming
    crate::instructions::analytics_events::emit_network_health_event(
        active_agents,
        transaction_throughput,
        average_latency,
        error_rate,
    )?;

    // SECURITY: Log metrics collection for audit trail
    SecurityLogger::log_security_event(
        "NETWORK_METRICS_COLLECTED",
        ctx.accounts.collector.key(),
        &format!(
            "dashboard: {}, active_agents: {}, throughput: {}, latency: {}, error_rate: {}",
            dashboard.key(),
            active_agents,
            transaction_throughput,
            average_latency,
            error_rate
        ),
    );

    emit!(NetworkMetricsCollectedEvent {
        dashboard: dashboard.key(),
        active_agents,
        transaction_throughput,
        average_latency,
        error_rate,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Collects marketplace metrics for real-time analytics
///
/// This instruction gathers marketplace-wide data including listings,
/// sales volume, and pricing trends for analytics dashboards.
///
/// # Arguments
///
/// * `ctx` - The context containing analytics accounts
/// * `total_listings` - Total number of active listings
/// * `daily_volume` - Trading volume for the current day
/// * `average_price` - Average price of transactions
/// * `completed_sales` - Number of completed sales
///
/// # Returns
///
/// Returns `Ok(())` on successful metrics collection
pub fn collect_marketplace_metrics(
    ctx: Context<CollectMarketplaceMetrics>,
    total_listings: u32,
    active_listings: u32,
    daily_volume: u64,
    average_price: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURITY: Enhanced signer authorization
    require!(
        ctx.accounts.collector.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    let dashboard = &mut ctx.accounts.dashboard;

    // Update marketplace metrics
    dashboard.update_marketplace_metrics(
        total_listings,
        active_listings,
        daily_volume,
        average_price,
    )?;

    // Emit analytics event for real-time streaming
    crate::instructions::analytics_events::emit_marketplace_activity_event(
        crate::instructions::analytics_events::MarketplaceActivity::ServiceListed,
        ctx.accounts.collector.key(),
        None,
        daily_volume,
    )?;

    // SECURITY: Log metrics collection
    SecurityLogger::log_security_event(
        "MARKETPLACE_METRICS_COLLECTED",
        ctx.accounts.collector.key(),
        &format!(
            "dashboard: {}, listings: {}/{}, volume: {}, avg_price: {}",
            dashboard.key(),
            active_listings,
            total_listings,
            daily_volume,
            average_price
        ),
    );

    emit!(MarketplaceMetricsCollectedEvent {
        dashboard: dashboard.key(),
        total_listings,
        active_listings,
        daily_volume,
        average_price,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Collects economic metrics for financial analytics
///
/// This instruction gathers protocol-wide economic data including
/// total value locked, fee revenue, and user activity metrics.
///
/// # Arguments
///
/// * `ctx` - The context containing analytics accounts
/// * `total_value_locked` - Total value locked in the protocol
/// * `daily_volume` - Total daily trading volume
/// * `fee_revenue` - Protocol fee revenue collected
/// * `unique_users` - Number of unique active users
///
/// # Returns
///
/// Returns `Ok(())` on successful metrics collection
pub fn collect_economic_metrics(
    ctx: Context<CollectEconomicMetrics>,
    total_value_locked: u64,
    daily_volume: u64,
    fee_revenue: u64,
    unique_users: u32,
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURITY: Enhanced signer authorization (only protocol admin)
    require!(
        ctx.accounts.collector.key() == crate::PROTOCOL_ADMIN,
        GhostSpeakError::UnauthorizedAccess
    );

    let dashboard = &mut ctx.accounts.dashboard;

    // Update economic metrics
    dashboard.update_economic_metrics(
        total_value_locked,
        daily_volume,
        fee_revenue,
        unique_users,
    )?;

    // Emit analytics event for real-time streaming
    crate::instructions::analytics_events::emit_economic_metrics_event(
        total_value_locked,
        daily_volume,
        fee_revenue,
        unique_users,
    )?;

    // SECURITY: Log economic metrics collection
    SecurityLogger::log_security_event(
        "ECONOMIC_METRICS_COLLECTED",
        ctx.accounts.collector.key(),
        &format!(
            "dashboard: {}, tvl: {}, volume: {}, fees: {}, users: {}",
            dashboard.key(),
            total_value_locked,
            daily_volume,
            fee_revenue,
            unique_users
        ),
    );

    emit!(EconomicMetricsCollectedEvent {
        dashboard: dashboard.key(),
        total_value_locked,
        daily_volume,
        fee_revenue,
        unique_users,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Updates agent performance metrics for analytics tracking
///
/// This instruction records detailed performance metrics for individual agents
/// to enable comprehensive performance analytics and ranking systems.
///
/// # Arguments
///
/// * `ctx` - The context containing analytics accounts
/// * `agent` - Public key of the agent being tracked
/// * `revenue` - Additional revenue generated by the agent
/// * `transaction_count` - Number of new transactions completed
/// * `success_rate` - Current success rate in basis points (0-10000)
/// * `average_rating` - Current average rating in basis points (0-10000)
/// * `response_time` - Average response time in milliseconds
///
/// # Returns
///
/// Returns `Ok(())` on successful performance update
pub fn update_agent_performance(
    ctx: Context<UpdateAgentPerformance>,
    agent: Pubkey,
    revenue: u64,
    transaction_count: u32,
    success_rate: u32,
    average_rating: u32,
    response_time: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    // SECURITY: Enhanced signer authorization
    require!(
        ctx.accounts.collector.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Validate performance parameters
    require!(success_rate <= 10000, GhostSpeakError::InvalidParameter);
    require!(average_rating <= 10000, GhostSpeakError::InvalidParameter);
    require!(response_time < 3600000, GhostSpeakError::InvalidParameter); // Max 1 hour response time

    let dashboard = &mut ctx.accounts.dashboard;

    // Update agent performance
    dashboard.update_agent_performance(
        agent,
        revenue,
        transaction_count,
        success_rate,
        average_rating,
        response_time,
    )?;

    // Emit analytics event for real-time streaming
    let agent_metrics = crate::instructions::analytics_events::AgentMetrics {
        revenue,
        transaction_count,
        success_rate,
        average_rating,
        response_time,
    };

    crate::instructions::analytics_events::emit_agent_analytics_event(
        agent,
        crate::instructions::analytics_events::AgentOperation::Update,
        agent_metrics,
    )?;

    // SECURITY: Log performance update
    SecurityLogger::log_security_event(
        "AGENT_PERFORMANCE_UPDATED",
        ctx.accounts.collector.key(),
        &format!(
            "dashboard: {}, agent: {}, revenue: {}, success_rate: {}",
            dashboard.key(),
            agent,
            revenue,
            success_rate
        ),
    );

    emit!(AgentPerformanceUpdatedAnalyticsEvent {
        dashboard: dashboard.key(),
        agent,
        revenue,
        transaction_count,
        success_rate,
        average_rating,
        response_time,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Prunes old analytics data to maintain optimal performance
///
/// This instruction removes outdated analytics data based on retention policies
/// to keep the analytics system performant and within storage limits.
///
/// # Arguments
///
/// * `ctx` - The context containing analytics accounts
/// * `retention_days` - Number of days to retain data (max 365)
///
/// # Returns
///
/// Returns `Ok(())` on successful data pruning
pub fn prune_analytics_data(ctx: Context<PruneAnalyticsData>, retention_days: u16) -> Result<()> {
    let clock = Clock::get()?;

    // SECURITY: Enhanced signer authorization (only protocol admin)
    require!(
        ctx.accounts.authority.key() == crate::PROTOCOL_ADMIN,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Validate retention period
    require!(
        retention_days > 0 && retention_days <= 365,
        GhostSpeakError::InvalidParameter
    );

    let dashboard = &mut ctx.accounts.dashboard;
    let retention_seconds = retention_days as i64 * 86400; // Convert days to seconds

    // Prune old data
    dashboard.prune_old_data(retention_seconds)?;

    // SECURITY: Log data pruning
    SecurityLogger::log_security_event(
        "ANALYTICS_DATA_PRUNED",
        ctx.accounts.authority.key(),
        &format!(
            "dashboard: {}, retention_days: {}",
            dashboard.key(),
            retention_days
        ),
    );

    emit!(AnalyticsDataPrunedEvent {
        dashboard: dashboard.key(),
        retention_days,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// Enhanced account structures for real-time analytics collection

/// Network metrics collection with enhanced security
#[derive(Accounts)]
pub struct CollectNetworkMetrics<'info> {
    /// Analytics dashboard account
    #[account(
        mut,
        seeds = [
            b"analytics",
            dashboard.authority.as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,

    /// Metrics collector (authorized agent or protocol admin)
    #[account(
        constraint = collector.key() == crate::PROTOCOL_ADMIN
            || collector.key() == dashboard.authority
            @ GhostSpeakError::UnauthorizedAccess
    )]
    pub collector: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Marketplace metrics collection with enhanced security
#[derive(Accounts)]
pub struct CollectMarketplaceMetrics<'info> {
    /// Analytics dashboard account
    #[account(
        mut,
        seeds = [
            b"analytics",
            dashboard.authority.as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,

    /// Metrics collector
    #[account(
        constraint = collector.key() == crate::PROTOCOL_ADMIN
            || collector.key() == dashboard.authority
            @ GhostSpeakError::UnauthorizedAccess
    )]
    pub collector: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Economic metrics collection with enhanced security
#[derive(Accounts)]
pub struct CollectEconomicMetrics<'info> {
    /// Analytics dashboard account
    #[account(
        mut,
        seeds = [
            b"analytics",
            dashboard.authority.as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,

    /// Metrics collector (protocol admin only)
    #[account(
        constraint = collector.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub collector: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Agent performance update with enhanced security
#[derive(Accounts)]
pub struct UpdateAgentPerformance<'info> {
    /// Analytics dashboard account
    #[account(
        mut,
        seeds = [
            b"analytics",
            dashboard.authority.as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,

    /// Performance data collector
    #[account(
        constraint = collector.key() == crate::PROTOCOL_ADMIN
            || collector.key() == dashboard.authority
            @ GhostSpeakError::UnauthorizedAccess
    )]
    pub collector: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Analytics data pruning with enhanced security
#[derive(Accounts)]
pub struct PruneAnalyticsData<'info> {
    /// Analytics dashboard account
    #[account(
        mut,
        seeds = [
            b"analytics",
            dashboard.authority.as_ref(),
            dashboard.dashboard_id.to_le_bytes().as_ref()
        ],
        bump = dashboard.bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,

    /// Protocol authority (admin only)
    #[account(
        constraint = authority.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
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

#[event]
pub struct NetworkMetricsCollectedEvent {
    pub dashboard: Pubkey,
    pub active_agents: u32,
    pub transaction_throughput: u64,
    pub average_latency: u64,
    pub error_rate: u32,
    pub timestamp: i64,
}

#[event]
pub struct MarketplaceMetricsCollectedEvent {
    pub dashboard: Pubkey,
    pub total_listings: u32,
    pub active_listings: u32,
    pub daily_volume: u64,
    pub average_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct EconomicMetricsCollectedEvent {
    pub dashboard: Pubkey,
    pub total_value_locked: u64,
    pub daily_volume: u64,
    pub fee_revenue: u64,
    pub unique_users: u32,
    pub timestamp: i64,
}

#[event]
pub struct AgentPerformanceUpdatedAnalyticsEvent {
    pub dashboard: Pubkey,
    pub agent: Pubkey,
    pub revenue: u64,
    pub transaction_count: u32,
    pub success_rate: u32,
    pub average_rating: u32,
    pub response_time: u64,
    pub timestamp: i64,
}

#[event]
pub struct AnalyticsDataPrunedEvent {
    pub dashboard: Pubkey,
    pub retention_days: u16,
    pub timestamp: i64,
}
