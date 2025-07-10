/*!
 * Analytics State Module
 * 
 * Contains all analytics-related data structures for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use super::{MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError};

// PDA Seeds
pub const MARKET_ANALYTICS_SEED: &[u8] = b"market_analytics";
pub const ANALYTICS_DASHBOARD_SEED: &[u8] = b"analytics_dashboard";

// Constants
pub const MAX_TOP_AGENTS: usize = 10;
pub const MAX_METRICS_LENGTH: usize = 256;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentAnalytics {
    pub total_revenue: u64,
    pub total_jobs: u32,
    pub success_rate: u32,         // Basis points (0-10000 for 0-100%)
    pub average_rating: u32,        // Scaled rating (0-5000 for 0-5.0)
    pub response_time_avg: u64,     // Milliseconds
    pub customer_retention: u32,    // Basis points (0-10000 for 0-100%)
    pub market_share: u32,          // Basis points (0-10000 for 0-100%)
    pub trend_direction: i32,       // Positive/negative trend in basis points
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct MarketAnalyticsData {
    pub total_volume: u64,
    pub active_agents: u32,
    pub average_price: u64,
    pub price_volatility: u32,      // Basis points for volatility percentage
    pub demand_trend: i32,          // Basis points (can be negative)
    pub supply_trend: i32,          // Basis points (can be negative)
    pub market_cap: u64,
}

#[account]
pub struct MarketAnalytics {
    pub period_start: i64,
    pub period_end: i64,
    pub total_volume: u64,
    pub total_transactions: u64,
    pub average_price: u64,
    pub top_agents: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct AnalyticsDashboard {
    pub dashboard_id: u64,
    pub owner: Pubkey,
    pub metrics: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl AnalyticsDashboard {
    pub const LEN: usize = 8 + // discriminator
        8 + // dashboard_id
        32 + // owner
        4 + MAX_METRICS_LENGTH + // metrics
        8 + // created_at
        8 + // updated_at
        1; // bump

    pub fn initialize(
        &mut self,
        dashboard_id: u64,
        owner: Pubkey,
        metrics: String,
        bump: u8,
    ) -> Result<()> {
        require!(metrics.len() <= MAX_METRICS_LENGTH, PodAIMarketplaceError::MetricsTooLong);
        
        let clock = Clock::get()?;
        
        self.dashboard_id = dashboard_id;
        self.owner = owner;
        self.metrics = metrics;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }

    pub fn update_metrics(&mut self, metrics: String) -> Result<()> {
        require!(metrics.len() <= MAX_METRICS_LENGTH, PodAIMarketplaceError::MetricsTooLong);
        
        self.metrics = metrics;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }
}

impl MarketAnalytics {
    pub const LEN: usize = 8 + // discriminator
        8 + // period_start
        8 + // period_end
        8 + // total_volume
        8 + // total_transactions
        8 + // average_price
        4 + // active_agents
        4 + // price_volatility
        4 + // demand_trend
        4 + // supply_trend
        8 + // market_cap
        4 + (MAX_TOP_AGENTS * 32) + // top_agents
        1; // bump

    pub fn initialize(
        &mut self,
        period_start: i64,
        period_end: i64,
        bump: u8,
    ) -> Result<()> {
        require!(period_end > period_start, PodAIMarketplaceError::InvalidPeriod);
        
        self.period_start = period_start;
        self.period_end = period_end;
        self.total_volume = 0;
        self.total_transactions = 0;
        self.average_price = 0;
        self.active_agents = 0;
        self.price_volatility = 0;
        self.demand_trend = 0;
        self.supply_trend = 0;
        self.market_cap = 0;
        self.top_agents = Vec::new();
        self.bump = bump;
        
        Ok(())
    }

    pub fn update_stats(
        &mut self,
        volume: u64,
        price: u64,
    ) -> Result<()> {
        self.total_volume = self.total_volume.saturating_add(volume);
        self.total_transactions = self.total_transactions.saturating_add(1);
        
        // Calculate new average price
        if self.total_transactions > 0 {
            let total_value = self.average_price
                .saturating_mul(self.total_transactions.saturating_sub(1))
                .saturating_add(price);
            self.average_price = total_value / self.total_transactions;
        }
        
        Ok(())
    }

    pub fn add_top_agent(&mut self, agent: Pubkey) -> Result<()> {
        require!(self.top_agents.len() < MAX_TOP_AGENTS, PodAIMarketplaceError::TooManyTopAgents);
        
        if !self.top_agents.contains(&agent) {
            self.top_agents.push(agent);
        }
        
        Ok(())
    }

    pub fn update_market_metrics(
        &mut self,
        active_agents: u32,
        price_volatility: u32,
        demand_trend: i32,
        supply_trend: i32,
        market_cap: u64,
    ) -> Result<()> {
        self.active_agents = active_agents;
        self.price_volatility = price_volatility;
        self.demand_trend = demand_trend;
        self.supply_trend = supply_trend;
        self.market_cap = market_cap;
        
        Ok(())
    }

    pub fn increment_active_agents(&mut self) -> Result<()> {
        self.active_agents = self.active_agents.saturating_add(1);
        Ok(())
    }

    pub fn decrement_active_agents(&mut self) -> Result<()> {
        self.active_agents = self.active_agents.saturating_sub(1);
        Ok(())
    }
}