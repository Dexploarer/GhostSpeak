/*!
 * Analytics State Module
 *
 * Contains all analytics-related data structures for the GhostSpeak Protocol.
 */

use super::GhostSpeakError;
use anchor_lang::prelude::*;

// Additional data structures for enhanced analytics
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct NetworkHealthMetrics {
    pub active_agents: u32,
    pub total_transactions: u64,
    pub transaction_throughput: u64,
    pub average_latency: u64,
    pub error_rate: u32,
    pub success_rate: u32,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct MarketplaceMetrics {
    pub total_listings: u32,
    pub active_listings: u32,
    pub total_sales: u64,
    pub daily_volume: u64,
    pub average_sale_price: u64,
    pub top_categories: Vec<String>,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct EconomicMetrics {
    pub total_value_locked: u64,
    pub daily_volume: u64,
    pub total_fee_revenue: u64,
    pub unique_active_users: u32,
    pub average_transaction_size: u64,
    pub token_circulation: u64,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct MetricSample {
    pub timestamp: i64,
    pub value: u64,
    pub metric_type: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct AgentPerformanceEntry {
    pub agent: Pubkey,
    pub revenue: u64,
    pub transaction_count: u32,
    pub success_rate: u32,
    pub average_rating: u32,
    pub response_time: u64,
    pub last_updated: i64,
}

// Constants for enhanced analytics
pub const MAX_METRIC_SAMPLES: usize = 1000;
pub const MAX_AGENT_PERFORMANCE_ENTRIES: usize = 500;

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
    pub success_rate: u32,       // Basis points (0-10000 for 0-100%)
    pub average_rating: u32,     // Scaled rating (0-5000 for 0-5.0)
    pub response_time_avg: u64,  // Milliseconds
    pub customer_retention: u32, // Basis points (0-10000 for 0-100%)
    pub market_share: u32,       // Basis points (0-10000 for 0-100%)
    pub trend_direction: i32,    // Positive/negative trend in basis points
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct MarketAnalyticsData {
    pub total_volume: u64,
    pub active_agents: u32,
    pub average_price: u64,
    pub price_volatility: u32, // Basis points for volatility percentage
    pub demand_trend: i32,     // Basis points (can be negative)
    pub supply_trend: i32,     // Basis points (can be negative)
    pub market_cap: u64,
}

#[account]
pub struct MarketAnalytics {
    pub period_start: i64,
    pub period_end: i64,
    pub total_volume: u64,
    pub total_transactions: u64,
    pub average_price: u64,
    pub active_agents: u32,
    pub price_volatility: u32,
    pub demand_trend: i32,
    pub supply_trend: i32,
    pub market_cap: u64,
    pub top_agents: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct AnalyticsDashboard {
    pub dashboard_id: u64,
    pub owner: Pubkey,
    pub authority: Pubkey,
    pub program_id: Pubkey,
    pub metrics: String,
    pub network_metrics: NetworkHealthMetrics,
    pub marketplace_metrics: MarketplaceMetrics,
    pub economic_metrics: EconomicMetrics,
    pub metric_samples: Vec<MetricSample>,
    pub agent_performance: Vec<AgentPerformanceEntry>,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl AnalyticsDashboard {
    pub const LEN: usize = 8 + // discriminator
        8 + // dashboard_id
        32 + // owner
        32 + // authority
        32 + // program_id
        4 + MAX_METRICS_LENGTH + // metrics
        (4 + 8 + 8 + 8 + 4 + 4 + 8) + // network_metrics
        (4 + 4 + 8 + 8 + 8 + (4 + 10 * (4 + 32)) + 8) + // marketplace_metrics
        (8 + 8 + 8 + 4 + 8 + 8 + 8) + // economic_metrics
        4 + (MAX_METRIC_SAMPLES * (8 + 8 + (4 + 32))) + // metric_samples
        4 + (MAX_AGENT_PERFORMANCE_ENTRIES * (32 + 8 + 4 + 4 + 4 + 8 + 8)) + // agent_performance
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
        require!(
            metrics.len() <= MAX_METRICS_LENGTH,
            GhostSpeakError::MetricsTooLong
        );

        let clock = Clock::get()?;

        self.dashboard_id = dashboard_id;
        self.owner = owner;
        self.authority = owner; // Set authority to owner by default
        self.program_id = crate::ID;
        self.metrics = metrics;
        
        // Initialize with empty metrics
        self.network_metrics = NetworkHealthMetrics {
            active_agents: 0,
            total_transactions: 0,
            transaction_throughput: 0,
            average_latency: 0,
            error_rate: 0,
            success_rate: 10000, // 100% baseline
            last_updated: clock.unix_timestamp,
        };
        
        self.marketplace_metrics = MarketplaceMetrics {
            total_listings: 0,
            active_listings: 0,
            total_sales: 0,
            daily_volume: 0,
            average_sale_price: 0,
            top_categories: Vec::new(),
            last_updated: clock.unix_timestamp,
        };
        
        self.economic_metrics = EconomicMetrics {
            total_value_locked: 0,
            daily_volume: 0,
            total_fee_revenue: 0,
            unique_active_users: 0,
            average_transaction_size: 0,
            token_circulation: 0,
            last_updated: clock.unix_timestamp,
        };
        
        self.metric_samples = Vec::new();
        self.agent_performance = Vec::new();
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    pub fn update_metrics(&mut self, metrics: String) -> Result<()> {
        require!(
            metrics.len() <= MAX_METRICS_LENGTH,
            GhostSpeakError::MetricsTooLong
        );

        self.metrics = metrics;
        self.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn update_network_metrics(
        &mut self,
        active_agents: u32,
        transaction_throughput: u64,
        average_latency: u64,
        error_rate: u32,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.network_metrics.active_agents = active_agents;
        self.network_metrics.transaction_throughput = transaction_throughput;
        self.network_metrics.average_latency = average_latency;
        self.network_metrics.error_rate = error_rate;
        self.network_metrics.success_rate = 10000_u32.saturating_sub(error_rate);
        self.network_metrics.last_updated = clock.unix_timestamp;

        self.add_metric_sample("network_health", active_agents as u64)?;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_marketplace_metrics(
        &mut self,
        total_listings: u32,
        active_listings: u32,
        daily_volume: u64,
        average_sale_price: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.marketplace_metrics.total_listings = total_listings;
        self.marketplace_metrics.active_listings = active_listings;
        self.marketplace_metrics.daily_volume = daily_volume;
        self.marketplace_metrics.average_sale_price = average_sale_price;
        self.marketplace_metrics.last_updated = clock.unix_timestamp;

        self.add_metric_sample("marketplace_volume", daily_volume)?;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_economic_metrics(
        &mut self,
        total_value_locked: u64,
        daily_volume: u64,
        fee_revenue: u64,
        unique_users: u32,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.economic_metrics.total_value_locked = total_value_locked;
        self.economic_metrics.daily_volume = daily_volume;
        self.economic_metrics.total_fee_revenue = fee_revenue;
        self.economic_metrics.unique_active_users = unique_users;
        
        if self.network_metrics.total_transactions > 0 {
            self.economic_metrics.average_transaction_size = 
                daily_volume / self.network_metrics.total_transactions;
        }
        
        self.economic_metrics.last_updated = clock.unix_timestamp;

        self.add_metric_sample("total_value_locked", total_value_locked)?;
        self.add_metric_sample("fee_revenue", fee_revenue)?;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_agent_performance(
        &mut self,
        agent: Pubkey,
        revenue: u64,
        transaction_count: u32,
        success_rate: u32,
        average_rating: u32,
        response_time: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        if let Some(entry) = self.agent_performance.iter_mut().find(|e| e.agent == agent) {
            entry.revenue = entry.revenue.saturating_add(revenue);
            entry.transaction_count = entry.transaction_count.saturating_add(transaction_count);
            entry.success_rate = (entry.success_rate + success_rate) / 2;
            entry.average_rating = (entry.average_rating + average_rating) / 2;
            entry.response_time = (entry.response_time + response_time) / 2;
            entry.last_updated = clock.unix_timestamp;
        } else if self.agent_performance.len() < MAX_AGENT_PERFORMANCE_ENTRIES {
            self.agent_performance.push(AgentPerformanceEntry {
                agent,
                revenue,
                transaction_count,
                success_rate,
                average_rating,
                response_time,
                last_updated: clock.unix_timestamp,
            });
        } else {
            self.agent_performance.sort_by_key(|e| e.last_updated);
            if let Some(oldest) = self.agent_performance.first_mut() {
                *oldest = AgentPerformanceEntry {
                    agent,
                    revenue,
                    transaction_count,
                    success_rate,
                    average_rating,
                    response_time,
                    last_updated: clock.unix_timestamp,
                };
            }
        }

        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    pub fn add_metric_sample(&mut self, metric_type: &str, value: u64) -> Result<()> {
        let clock = Clock::get()?;

        let sample = MetricSample {
            timestamp: clock.unix_timestamp,
            value,
            metric_type: metric_type.to_string(),
        };

        if self.metric_samples.len() >= MAX_METRIC_SAMPLES {
            self.metric_samples.remove(0);
        }

        self.metric_samples.push(sample);
        Ok(())
    }

    pub fn prune_old_data(&mut self, retention_seconds: i64) -> Result<()> {
        let clock = Clock::get()?;
        let cutoff_time = clock.unix_timestamp - retention_seconds;

        self.metric_samples.retain(|sample| sample.timestamp > cutoff_time);
        self.agent_performance.retain(|entry| entry.last_updated > cutoff_time);

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

    pub fn initialize(&mut self, period_start: i64, period_end: i64, bump: u8) -> Result<()> {
        require!(period_end > period_start, GhostSpeakError::InvalidPeriod);

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

    pub fn update_stats(&mut self, volume: u64, price: u64) -> Result<()> {
        self.total_volume = self.total_volume.saturating_add(volume);
        self.total_transactions = self.total_transactions.saturating_add(1);

        // Calculate new average price
        if self.total_transactions > 0 {
            let total_value = self
                .average_price
                .saturating_mul(self.total_transactions.saturating_sub(1))
                .saturating_add(price);
            self.average_price = total_value / self.total_transactions;
        }

        Ok(())
    }

    pub fn add_top_agent(&mut self, agent: Pubkey) -> Result<()> {
        require!(
            self.top_agents.len() < MAX_TOP_AGENTS,
            GhostSpeakError::TooManyTopAgents
        );

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
