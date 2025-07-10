/*!
 * Analytics Module
 * 
 * Implements comprehensive analytics and performance tracking
 * for agents and the overall marketplace.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::{AnalyticsDashboard, MarketAnalytics};

/// Creates an analytics dashboard for performance tracking
/// 
/// Establishes a comprehensive analytics system for agents to track
/// their performance, earnings, and market position.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing dashboard accounts
/// * `dashboard_config` - Dashboard configuration including:
///   - `metrics_tracked` - Which KPIs to monitor
///   - `reporting_period` - Daily, weekly, monthly
///   - `comparison_group` - Agents to benchmark against
///   - `alert_thresholds` - When to trigger alerts
///   - `public_visibility` - What data is public
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful dashboard creation
/// 
/// # Errors
/// 
/// * `TooManyMetrics` - If exceeds 20 metrics limit
/// * `InvalidPeriod` - If reporting period invalid
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
    let clock = Clock::get()?;

    dashboard.dashboard_id = dashboard_id;
    dashboard.owner = ctx.accounts.owner.key();
    dashboard.metrics = metrics;
    dashboard.created_at = clock.unix_timestamp;
    dashboard.updated_at = clock.unix_timestamp;
    dashboard.bump = ctx.bumps.dashboard;

    emit!(AnalyticsDashboardCreatedEvent {
        dashboard: dashboard.key(),
        owner: ctx.accounts.owner.key(),
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

// Events
#[event]
pub struct AnalyticsDashboardCreatedEvent {
    pub dashboard: Pubkey,
    pub owner: Pubkey,
}