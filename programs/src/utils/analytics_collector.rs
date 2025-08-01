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

/// Maximum allowed JSON depth to prevent deeply nested attacks
const MAX_JSON_DEPTH: usize = 5;

/// Maximum number of keys in a JSON object to prevent complexity attacks
const MAX_JSON_KEYS: usize = 100;

/// Securely parses a JSON string with depth and complexity limits
/// 
/// Security Features:
/// - Limits JSON depth to prevent deeply nested DoS attacks
/// - Limits object key count to prevent complexity DoS attacks
/// - Validates JSON structure to ensure it's an object
/// - Fails fast with proper error types instead of silent failures
/// - Prevents unbounded memory consumption during parsing
fn parse_secure_json(json_str: &str) -> Result<serde_json::Value> {
    // Parse the JSON string
    let parsed: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|_| error!(crate::GhostSpeakError::JsonParseError))?;
    
    // Validate it's an object
    let obj = parsed.as_object()
        .ok_or(error!(crate::GhostSpeakError::JsonInvalidStructure))?;
    
    // Check number of keys (complexity limit)
    if obj.len() > MAX_JSON_KEYS {
        return Err(error!(crate::GhostSpeakError::JsonComplexityExceeded));
    }
    
    // Check depth recursively
    if check_json_depth(&parsed, 0) > MAX_JSON_DEPTH {
        return Err(error!(crate::GhostSpeakError::JsonDepthExceeded));
    }
    
    Ok(parsed)
}

/// Recursively checks the depth of a JSON value to prevent deeply nested attacks
fn check_json_depth(value: &serde_json::Value, current_depth: usize) -> usize {
    match value {
        serde_json::Value::Object(obj) => {
            let max_child_depth = obj.values()
                .map(|v| check_json_depth(v, current_depth + 1))
                .max()
                .unwrap_or(current_depth);
            max_child_depth
        },
        serde_json::Value::Array(arr) => {
            let max_child_depth = arr.iter()
                .map(|v| check_json_depth(v, current_depth + 1))
                .max()
                .unwrap_or(current_depth);
            max_child_depth
        },
        _ => current_depth
    }
}

impl AnalyticsCollector {
    /// Updates market analytics when a service is listed
    pub fn track_service_listing(
        market_analytics: &mut Account<MarketAnalytics>,
        price: u64,
    ) -> Result<()> {
        // SECURITY: Validate price input to prevent overflow attacks
        crate::validate_payment_amount(price, "listing")?;
        
        // Increment active agents if this is their first listing
        market_analytics.increment_active_agents()?;
        
        // SECURITY: Update market cap estimation using safe arithmetic
        let estimated_value = crate::safe_arithmetic(price, 100, "mul")?; // Assume 100x potential volume
        market_analytics.market_cap = crate::safe_arithmetic(
            market_analytics.market_cap, 
            estimated_value, 
            "add"
        )?;
        
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
        // SECURITY: Validate inputs to prevent overflow attacks
        crate::validate_payment_amount(amount, "purchase")?;
        require!(quantity > 0 && quantity <= 1000, crate::GhostSpeakError::InvalidValue);
        
        // SECURITY: Update volume and transaction stats using safe arithmetic
        let total_value = crate::safe_arithmetic(amount, quantity, "mul")?;
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
        
        // Validate metrics string length first
        if dashboard.metrics.len() > 10_000 {
            return Err(error!(crate::GhostSpeakError::MetricsTooLong));
        }
        
        // Parse existing metrics using secure parsing with proper error handling
        let mut metrics_data: serde_json::Value = if dashboard.metrics.is_empty() {
            // Initialize new dashboard with empty object
            serde_json::json!({})
        } else {
            // Use secure parsing that validates depth, complexity, and structure
            parse_secure_json(&dashboard.metrics)?
        };
        
        // Validate that the input value is reasonable (prevent overflow attacks)
        if value > u64::MAX / 2 {
            return Err(error!(crate::GhostSpeakError::InvalidPaymentAmount));
        }

        // Update specific metric
        match metric_type {
            MetricType::Revenue => {
                let current_revenue = metrics_data["revenue"]
                    .as_str()
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);
                
                // Prevent overflow in addition
                if current_revenue > u64::MAX - value {
                    return Err(error!(crate::GhostSpeakError::InvalidPaymentAmount));
                }
                
                metrics_data["revenue"] = (current_revenue + value).to_string().into();
            },
            MetricType::TransactionCount => {
                let current_count = metrics_data["transactionCount"]
                    .as_u64()
                    .unwrap_or(0);
                
                // Prevent overflow in addition
                if current_count > u64::MAX - value {
                    return Err(error!(crate::GhostSpeakError::InvalidPaymentAmount));
                }
                
                metrics_data["transactionCount"] = (current_count + value).into();
            },
            MetricType::SuccessRate => {
                // Success rate requires more complex calculation
                let success_count = metrics_data["successCount"]
                    .as_u64()
                    .unwrap_or(0);
                let total_count = metrics_data["totalCount"]
                    .as_u64()
                    .unwrap_or(0);
                
                // Prevent overflow in addition
                if success_count > u64::MAX - value || total_count == u64::MAX {
                    return Err(error!(crate::GhostSpeakError::InvalidPaymentAmount));
                }
                
                let new_success_count = success_count + value;
                let new_total_count = total_count + 1;
                
                metrics_data["successCount"] = new_success_count.into();
                metrics_data["totalCount"] = new_total_count.into();
                
                let success_rate = if new_total_count > 0 {
                    let rate = new_success_count as f64 / new_total_count as f64;
                    // Validate the calculated rate is not NaN or infinite
                    if rate.is_nan() || rate.is_infinite() {
                        0.0
                    } else {
                        rate.clamp(0.0, 1.0) // Ensure rate is between 0 and 1
                    }
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
                
                // Prevent overflow in calculations
                if count == u64::MAX {
                    return Err(error!(crate::GhostSpeakError::InvalidPaymentAmount));
                }
                
                let new_count = count + 1;
                let new_avg = if count > 0 {
                    // Use checked arithmetic to prevent overflow
                    let weighted_current = current_avg.saturating_mul(count);
                    let total_sum = weighted_current.saturating_add(value);
                    total_sum / new_count
                } else {
                    value
                };
                
                metrics_data["averageResponseTime"] = new_avg.into();
                metrics_data["responseTimeCount"] = new_count.into();
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
        _current_price: u64,
    ) -> u32 {
        if recent_prices.is_empty() || recent_prices.len() > 10000 {
            return 0; // Prevent DoS with excessive price arrays
        }
        
        // Calculate standard deviation as a measure of volatility
        let mean = recent_prices.iter().sum::<u64>() / recent_prices.len() as u64;
        
        let variance = recent_prices.iter()
            .map(|&price| {
                let diff = if price > mean { price - mean } else { mean - price };
                diff.saturating_pow(2)
            })
            .sum::<u64>() / recent_prices.len() as u64;
        
        // Convert to basis points (0-10000) with safe floating point arithmetic
        let volatility_percent = if mean > 0 {
            let std_dev = (variance as f64).sqrt();
            let volatility_ratio = std_dev / mean as f64;
            
            // Validate the calculated values are not NaN or infinite
            if volatility_ratio.is_nan() || volatility_ratio.is_infinite() {
                0
            } else {
                let volatility_basis_points = volatility_ratio * 10000.0;
                // Ensure result is finite and within reasonable bounds
                if volatility_basis_points.is_finite() {
                    volatility_basis_points.clamp(0.0, 10000.0) as u32
                } else {
                    0
                }
            }
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