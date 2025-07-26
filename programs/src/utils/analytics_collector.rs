/*!
 * Analytics Collector Module
 * 
 * Provides automatic metric collection for real-time analytics tracking.
 * Integrates with marketplace operations to capture transaction volumes,
 * active agents, and performance metrics.
 */

use crate::state::analytics::{MarketAnalytics, AnalyticsDashboard};
use crate::*;

/// Analytics collector for automatic metric tracking
pub struct AnalyticsCollector;

impl AnalyticsCollector {
    /// Updates market analytics when a service is listed
    pub fn track_service_listing(
        market_analytics: &mut Account<MarketAnalytics>,
        price: u64,
    ) -> Result<()> {
        // Increment active agents if this is their first listing
        market_analytics.increment_active_agents()?;
        
        // Update market cap estimation
        let estimated_value = price.saturating_mul(100); // Assume 100x potential volume
        market_analytics.market_cap = market_analytics.market_cap.saturating_add(estimated_value);
        
        msg!("Analytics: Service listed, price: {}, market cap: {}", 
             price, market_analytics.market_cap);
        
        Ok(())
    }
    
    /// Updates market analytics when a service is purchased
    pub fn track_service_purchase(
        market_analytics: &mut Account<MarketAnalytics>,
        amount: u64,
        quantity: u64,
    ) -> Result<()> {
        // Update volume and transaction stats
        let total_value = amount.saturating_mul(quantity);
        market_analytics.update_stats(total_value, amount)?;
        
        msg!("Analytics: Service purchased, volume: {}, transactions: {}", 
             market_analytics.total_volume, market_analytics.total_transactions);
        
        Ok(())
    }
    
    /// Updates market analytics when escrow is created
    pub fn track_escrow_creation(
        market_analytics: &mut Account<MarketAnalytics>,
        amount: u64,
    ) -> Result<()> {
        // Track escrow volume separately for liquidity metrics
        market_analytics.update_stats(amount, amount)?;
        
        msg!("Analytics: Escrow created, amount: {}", amount);
        
        Ok(())
    }
    
    /// Updates market analytics when escrow is completed
    pub fn track_escrow_completion(
        market_analytics: &mut Account<MarketAnalytics>,
        amount: u64,
        success: bool,
    ) -> Result<()> {
        if success {
            // Successfully completed transactions contribute to market health
            market_analytics.update_stats(0, amount)?; // No new volume, just price update
            
            // Update demand trend positively
            market_analytics.demand_trend = market_analytics.demand_trend.saturating_add(10); // +0.1% in basis points
        } else {
            // Failed transactions indicate market issues
            market_analytics.demand_trend = market_analytics.demand_trend.saturating_sub(5); // -0.05% in basis points
        }
        
        msg!("Analytics: Escrow completed, success: {}, demand trend: {}", 
             success, market_analytics.demand_trend);
        
        Ok(())
    }
    
    /// Updates agent dashboard metrics
    pub fn update_agent_metrics(
        dashboard: &mut Account<AnalyticsDashboard>,
        metric_type: MetricType,
        value: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        // Parse existing metrics
        let mut metrics_data: serde_json::Value = serde_json::from_str(&dashboard.metrics)
            .unwrap_or(serde_json::json!({}));
        
        // Update specific metric
        match metric_type {
            MetricType::Revenue => {
                let current_revenue = metrics_data["revenue"]
                    .as_str()
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);
                metrics_data["revenue"] = (current_revenue + value).to_string().into();
            },
            MetricType::TransactionCount => {
                let current_count = metrics_data["transactionCount"]
                    .as_u64()
                    .unwrap_or(0);
                metrics_data["transactionCount"] = (current_count + value).into();
            },
            MetricType::SuccessRate => {
                // Success rate requires more complex calculation
                let success_count = metrics_data["successCount"]
                    .as_u64()
                    .unwrap_or(0) + value;
                let total_count = metrics_data["totalCount"]
                    .as_u64()
                    .unwrap_or(0) + 1;
                
                metrics_data["successCount"] = success_count.into();
                metrics_data["totalCount"] = total_count.into();
                
                let success_rate = if total_count > 0 {
                    (success_count as f64 / total_count as f64)
                } else {
                    0.0
                };
                metrics_data["successRate"] = success_rate.into();
            },
            MetricType::ResponseTime => {
                // Calculate moving average for response time
                let current_avg = metrics_data["averageResponseTime"]
                    .as_u64()
                    .unwrap_or(0);
                let count = metrics_data["responseTimeCount"]
                    .as_u64()
                    .unwrap_or(0);
                
                let new_avg = if count > 0 {
                    ((current_avg * count) + value) / (count + 1)
                } else {
                    value
                };
                
                metrics_data["averageResponseTime"] = new_avg.into();
                metrics_data["responseTimeCount"] = (count + 1).into();
            },
        }
        
        // Update timestamp
        metrics_data["lastUpdated"] = clock.unix_timestamp.into();
        
        // Save updated metrics
        dashboard.update_metrics(metrics_data.to_string())?;
        
        msg!("Analytics: Agent metrics updated, type: {:?}", metric_type);
        
        Ok(())
    }
    
    /// Calculates market volatility based on recent price changes
    pub fn calculate_volatility(
        recent_prices: &[u64],
        current_price: u64,
    ) -> u32 {
        if recent_prices.is_empty() {
            return 0;
        }
        
        // Calculate standard deviation as a measure of volatility
        let mean = recent_prices.iter().sum::<u64>() / recent_prices.len() as u64;
        
        let variance = recent_prices.iter()
            .map(|&price| {
                let diff = if price > mean { price - mean } else { mean - price };
                diff.saturating_pow(2)
            })
            .sum::<u64>() / recent_prices.len() as u64;
        
        // Convert to basis points (0-10000)
        let volatility_percent = if mean > 0 {
            ((variance as f64).sqrt() / mean as f64 * 10000.0) as u32
        } else {
            0
        };
        
        // Cap at 10000 basis points (100%)
        volatility_percent.min(10000)
    }
    
    /// Updates market trends based on supply and demand
    pub fn update_market_trends(
        market_analytics: &mut Account<MarketAnalytics>,
        new_listings: u32,
        new_purchases: u32,
    ) -> Result<()> {
        // Supply trend based on new listings
        let supply_change = (new_listings as i32 * 100) / market_analytics.active_agents.max(1) as i32;
        market_analytics.supply_trend = market_analytics.supply_trend
            .saturating_add(supply_change)
            .max(-10000)
            .min(10000); // Cap at ±100%
        
        // Demand trend based on purchases vs listings ratio
        if new_listings > 0 {
            let demand_ratio = (new_purchases as i32 * 100) / new_listings as i32;
            market_analytics.demand_trend = market_analytics.demand_trend
                .saturating_add(demand_ratio - 100) // Adjust relative to equilibrium
                .max(-10000)
                .min(10000);
        }
        
        msg!("Analytics: Market trends updated, supply: {}, demand: {}", 
             market_analytics.supply_trend, market_analytics.demand_trend);
        
        Ok(())
    }
}

/// Metric types for agent dashboard updates
#[derive(Debug, Clone, Copy)]
pub enum MetricType {
    Revenue,
    TransactionCount,
    SuccessRate,
    ResponseTime,
}

/// Analytics events for real-time tracking
#[event]
pub struct AnalyticsMetricUpdatedEvent {
    pub metric_type: String,
    pub value: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketTrendUpdatedEvent {
    pub supply_trend: i32,
    pub demand_trend: i32,
    pub volatility: u32,
    pub timestamp: i64,
}

#[event]
pub struct AgentPerformanceUpdatedEvent {
    pub agent: Pubkey,
    pub revenue: u64,
    pub success_rate: u32,
    pub response_time: u64,
    pub timestamp: i64,
}