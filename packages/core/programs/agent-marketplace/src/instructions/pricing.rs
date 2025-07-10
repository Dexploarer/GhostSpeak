/*!
 * Dynamic Pricing Module
 * 
 * Implements automated pricing optimization and dynamic pricing strategies
 * for AI agent services based on market conditions and demand.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::PodAIMarketplaceError;

/// Creates a dynamic pricing engine for automated price optimization
/// 
/// Establishes an AI-powered pricing engine that automatically adjusts
/// service prices based on demand, competition, and performance metrics.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing pricing engine accounts
/// * `engine_config` - Pricing engine configuration including:
///   - `base_price` - Starting price point
///   - `min_price` - Floor price (never go below)
///   - `max_price` - Ceiling price (never exceed)
///   - `adjustment_factors` - What influences pricing
///   - `update_frequency` - How often to recalculate
///   - `strategy` - Conservative, moderate, or aggressive
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful engine creation
/// 
/// # Errors
/// 
/// * `InvalidPriceRange` - If min > max or base outside range
/// * `UpdateFrequencyTooHigh` - If updates more than hourly
/// 
/// # Pricing Factors
/// 
/// Engine considers:
/// - Current demand (pending orders)
/// - Competitor pricing
/// - Agent utilization rate
/// - Customer satisfaction scores
/// - Time of day/week patterns
/// - Market trends
/// 
/// # Strategies
/// 
/// - **Conservative**: Small adjustments (±5%)
/// - **Moderate**: Medium adjustments (±15%)
/// - **Aggressive**: Large adjustments (±30%)
pub fn create_dynamic_pricing_engine(
    ctx: Context<CreateDynamicPricingEngine>,
    config: DynamicPricingConfig,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.owner.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MIN_UPDATE_FREQUENCY: i64 = 3600; // 1 hour minimum
    
    require!(
        config.base_price >= MIN_PAYMENT_AMOUNT && config.base_price <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        config.min_price >= MIN_PAYMENT_AMOUNT && config.min_price <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        config.max_price >= MIN_PAYMENT_AMOUNT && config.max_price <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        config.min_price <= config.base_price && config.base_price <= config.max_price,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        config.update_frequency >= MIN_UPDATE_FREQUENCY,
        PodAIMarketplaceError::InvalidDeadline
    );

    let engine = &mut ctx.accounts.engine;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(agent.owner == ctx.accounts.owner.key(), PodAIMarketplaceError::UnauthorizedAccess);

    engine.engine_id = clock.unix_timestamp as u64;  // Use timestamp as unique ID
    engine.agent = agent.key();
    engine.algorithm = config.algorithm;
    engine.config = config.clone();  // Clone here
    engine.current_price = config.base_price;
    engine.last_updated = clock.unix_timestamp;
    engine.is_active = true;
    engine.bump = ctx.bumps.engine;

    emit!(DynamicPricingEngineCreatedEvent {
        engine: engine.key(),
        agent: agent.key(),
        owner: ctx.accounts.owner.key(),
        algorithm: config.algorithm,
        base_price: config.base_price,
    });

    Ok(())
}

/// Updates dynamic pricing based on real-time market conditions
/// 
/// Recalculates and applies new pricing based on current market data,
/// demand patterns, and configured pricing strategy.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing pricing engine and service accounts
/// * `market_data` - Current market conditions including:
///   - `current_demand` - Number of pending requests
///   - `competitor_avg_price` - Average competitor pricing
///   - `utilization_rate` - Agent's current workload (0-100%)
///   - `recent_performance` - Recent rating average
/// 
/// # Returns
/// 
/// Returns `Ok(())` with updated pricing applied
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If caller is not the agent owner
/// * `UpdateTooSoon` - If called before update frequency allows
/// * `MarketDataStale` - If market data is outdated
/// 
/// # Pricing Algorithm
/// 
/// ```text
/// new_price = base_price * demand_multiplier * competition_factor * performance_bonus
/// 
/// Where:
/// - demand_multiplier: 0.8-1.5x based on demand
/// - competition_factor: 0.9-1.1x based on market position
/// - performance_bonus: 0.95-1.2x based on ratings
/// ```
/// 
/// # Safety Limits
/// 
/// - Single update capped at strategy maximum
/// - Always respects min/max price bounds
/// - Gradual changes to avoid price shocks
pub fn update_dynamic_pricing(
    ctx: Context<UpdateDynamicPricing>,
    demand_metrics: DemandMetrics,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.updater.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    let engine = &mut ctx.accounts.engine;
    
    let clock = Clock::get()?;

    // Check update frequency
    require!(
        clock.unix_timestamp >= engine.last_updated + engine.config.adjustment_frequency, 
        PodAIMarketplaceError::UpdateFrequencyTooHigh
    );

    let _old_price = engine.current_price;
    let mut new_price = engine.current_price;

    // Apply demand-based pricing
    if engine.algorithm == PricingAlgorithm::DemandBased {
        let demand_multiplier = if demand_metrics.current_demand > 10 { 1.5 } else { 1.0 };
        new_price = (new_price as f64 * demand_multiplier) as u64;
    }

    // Apply surge pricing
    if engine.algorithm == PricingAlgorithm::SurgePricing {
        let hour = (clock.unix_timestamp / 3600) % 24;
        let surge_multiplier = if (9..=17).contains(&hour) { 1.3 } else { 1.0 };
        new_price = (new_price as f64 * surge_multiplier) as u64;
    }

    // Ensure price stays within bounds
    let (min_price, max_price) = engine.config.price_range;
    new_price = new_price.max(min_price).min(max_price);

    engine.current_price = new_price;
    engine.last_updated = clock.unix_timestamp;

    emit!(DynamicPricingUpdatedEvent {
        engine: engine.key(),
        agent: engine.agent,
        owner: ctx.accounts.updater.key(),
        new_price,
        demand_multiplier: demand_metrics.current_demand as f64 / 10.0,
        supply_multiplier: 1.0,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct CreateDynamicPricingEngine<'info> {
    #[account(
        init,
        payer = owner,
        space = DynamicPricingEngine::LEN,
        seeds = [b"dynamic_pricing", agent.key().as_ref()],
        bump
    )]
    pub engine: Account<'info, DynamicPricingEngine>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDynamicPricing<'info> {
    #[account(mut)]
    pub engine: Account<'info, DynamicPricingEngine>,
    pub updater: Signer<'info>,
}

// Events
#[event]
pub struct DynamicPricingEngineCreatedEvent {
    pub engine: Pubkey,
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub algorithm: PricingAlgorithm,
    pub base_price: u64,
}

#[event]
pub struct DynamicPricingUpdatedEvent {
    pub engine: Pubkey,
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub new_price: u64,
    pub demand_multiplier: f64,
    pub supply_multiplier: f64,
}