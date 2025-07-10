/*!
 * Analytics Module
 * 
 * Implements comprehensive analytics and performance tracking
 * for agents and the overall marketplace.
 */

use anchor_lang::prelude::*;
use crate::state::*;

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
    let dashboard = &mut ctx.accounts.dashboard;
    
    // Use the struct's initialize method to ensure proper validation
    dashboard.initialize(
        dashboard_id,
        ctx.accounts.owner.key(),
        metrics,
        ctx.bumps.dashboard,
    )?;

    emit!(AnalyticsDashboardCreatedEvent {
        dashboard: dashboard.key(),
        owner: ctx.accounts.owner.key(),
        dashboard_id,
        timestamp: Clock::get()?.unix_timestamp,
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
    let dashboard = &mut ctx.accounts.dashboard;
    
    // Update metrics using the struct's built-in method
    dashboard.update_metrics(new_metrics)?;
    
    emit!(AnalyticsDashboardUpdatedEvent {
        dashboard: dashboard.key(),
        owner: ctx.accounts.owner.key(),
        timestamp: Clock::get()?.unix_timestamp,
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

// Context structures
#[derive(Accounts)]
pub struct CreateAnalyticsDashboard<'info> {
    #[account(
        init,
        payer = owner,
        space = AnalyticsDashboard::LEN,
        seeds = [b"analytics", owner.key().as_ref()],
        bump
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAnalyticsDashboard<'info> {
    #[account(
        mut,
        seeds = [b"analytics", owner.key().as_ref()],
        bump = dashboard.bump,
        has_one = owner
    )]
    pub dashboard: Account<'info, AnalyticsDashboard>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateMarketAnalytics<'info> {
    #[account(
        init,
        payer = authority,
        space = MarketAnalytics::LEN,
        seeds = [b"market_analytics"],
        bump
    )]
    pub market_analytics: Account<'info, MarketAnalytics>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMarketAnalytics<'info> {
    #[account(
        mut,
        seeds = [b"market_analytics"],
        bump = market_analytics.bump
    )]
    pub market_analytics: Account<'info, MarketAnalytics>,
    pub authority: Signer<'info>,
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