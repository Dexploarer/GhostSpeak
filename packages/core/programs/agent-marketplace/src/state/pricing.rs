/*!
 * Pricing State Module
 * 
 * Contains pricing related state structures.
 */

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PricingModel {
    Fixed,
    Hourly,
    PerTask,
    Subscription,
    Auction,
    Dynamic,
    RevenueShare,
    Tiered,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PricingAlgorithm {
    Linear,
    Exponential,
    Logarithmic,
    Sigmoid,
    MarketBased,
    MLOptimized,
    DemandBased,
    ReputationBased,
    SurgePricing,
    MarketAverage,
    PerformanceBased,
    Seasonal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DynamicPricingData {
    pub base_price: u64,
    pub current_price: u64,
    pub demand_multiplier: u32,    // Basis points (0-10000 for 0-100%)
    pub supply_multiplier: u32,    // Basis points (0-10000 for 0-100%)
    pub last_updated: i64,
    pub algorithm: PricingAlgorithm,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DynamicPricingConfig {
    pub algorithm: PricingAlgorithm,
    pub base_price: u64,
    pub min_price: u64,
    pub max_price: u64,
    pub price_range: (u64, u64), // (min, max)
    pub adjustment_frequency: i64,
    pub update_frequency: i64, // seconds
    pub volatility_threshold: u32,    // Basis points (0-10000 for 0-100%)
    pub demand_elasticity: u32,        // Basis points (0-10000 for 0-100%)
    pub supply_elasticity: u32,        // Basis points (0-10000 for 0-100%)
    pub demand_multiplier: u32,        // Basis points (0-10000 for 0-100%)
    pub reputation_multiplier: u32,    // Basis points (0-10000 for 0-100%)
    pub surge_multiplier: u32,         // Basis points (0-10000 for 0-100%)
    pub last_update: i64,
    pub enabled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DemandMetrics {
    pub current_demand: u64,
    pub peak_demand: u64,
    pub average_demand: u64,
    pub demand_trend: i32,         // Basis points (can be negative)
    pub demand_volatility: u32,    // Basis points (0-10000 for 0-100%)
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SupplyMetrics {
    pub current_supply: u64,
    pub peak_supply: u64,
    pub average_supply: u64,
    pub supply_trend: i32,         // Basis points (can be negative)
    pub supply_volatility: u32,    // Basis points (0-10000 for 0-100%)
    pub last_updated: i64,
}

#[account]
pub struct DynamicPricingEngine {
    pub engine_id: u64,
    pub agent: Pubkey,
    pub algorithm: PricingAlgorithm,
    pub config: DynamicPricingConfig,
    pub current_price: u64,
    pub last_updated: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TieredPricingData {
    pub tiers: Vec<PricingTier>,
    pub current_tier: u8,
    pub tier_benefits: Vec<String>,
    pub tier_requirements: Vec<String>,
    pub upgrade_cost: u64,
    pub downgrade_penalty: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PricingTier {
    pub name: String,
    pub price: u64,
    pub features: Vec<String>,
    pub limits: Vec<(String, u64)>, // (feature, limit)
    pub discount_percentage: u32,  // Basis points (0-10000 for 0-100%)
}

#[account]
pub struct DynamicPricing {
    pub service_id: Pubkey,
    pub agent: Pubkey,
    pub pricing_data: DynamicPricingData,
    pub demand_metrics: DemandMetrics,
    pub supply_metrics: SupplyMetrics,
    pub created_at: i64,
    pub last_updated: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl DynamicPricing {
    pub const LEN: usize = 8 + // discriminator
        32 + // service_id
        32 + // agent
        200 + // pricing_data (estimated)
        100 + // demand_metrics (estimated)
        100 + // supply_metrics (estimated)
        8 + // created_at
        8 + // last_updated
        1 + // is_active
        1; // bump

    pub fn calculate_price(&self, demand: u64, supply: u64) -> u64 {
        let base_price = self.pricing_data.base_price;
        
        // Convert to basis points calculations
        let demand_factor = if self.demand_metrics.average_demand > 0 {
            (demand * 10000) / self.demand_metrics.average_demand
        } else {
            10000 // 100% in basis points
        };
        
        let supply_factor = if supply > 0 {
            (self.supply_metrics.average_supply * 10000) / supply
        } else {
            10000 // 100% in basis points
        };
        
        // Simple linear adjustment using basis points
        let adjustment = match self.pricing_data.algorithm {
            PricingAlgorithm::Linear => {
                let demand_adj = (demand_factor * self.pricing_data.demand_multiplier as u64) / 10000;
                let supply_adj = (supply_factor * self.pricing_data.supply_multiplier as u64) / 10000;
                (demand_adj + supply_adj) / 2
            },
            PricingAlgorithm::MarketBased => {
                let market_ratio = if supply_factor > 0 {
                    (demand_factor * 10000) / supply_factor
                } else {
                    demand_factor
                };
                let multiplier = (self.pricing_data.demand_multiplier as u64 + self.pricing_data.supply_multiplier as u64) / 2;
                (market_ratio * multiplier) / 10000
            },
            _ => {
                // Default simple adjustment
                (demand_factor + supply_factor) / 2
            }
        };

        // Apply adjustment (in basis points) to base price
        let new_price = (base_price * adjustment) / 10000;
        new_price.max(base_price / 2).min(base_price * 3) // Default to 50% - 300% range
    }

    pub fn update_demand(&mut self, demand: u64, timestamp: i64) {
        self.demand_metrics.current_demand = demand;
        self.demand_metrics.last_updated = timestamp;
        
        if demand > self.demand_metrics.peak_demand {
            self.demand_metrics.peak_demand = demand;
        }
        
        self.demand_metrics.average_demand = 
            (self.demand_metrics.average_demand * 9 + demand) / 10;
    }

    pub fn update_supply(&mut self, supply: u64, timestamp: i64) {
        self.supply_metrics.current_supply = supply;
        self.supply_metrics.last_updated = timestamp;
        
        if supply > self.supply_metrics.peak_supply {
            self.supply_metrics.peak_supply = supply;
        }
        
        self.supply_metrics.average_supply = 
            (self.supply_metrics.average_supply * 9 + supply) / 10;
    }

    pub fn should_update_price(&self, current_time: i64) -> bool {
        self.is_active && 
        (current_time - self.pricing_data.last_updated) >= 3600 // Default to 1 hour
    }
}

impl DynamicPricingEngine {
    pub const LEN: usize = 8 + // discriminator
        8 + // engine_id
        32 + // agent
        1 + // algorithm (enum)
        1 + 8 + 8 + 8 + (8 + 8) + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + // config
        8 + // current_price
        8 + // last_updated
        1 + // is_active
        1; // bump

    pub fn initialize(
        &mut self,
        engine_id: u64,
        agent: Pubkey,
        config: DynamicPricingConfig,
        current_time: i64,
        bump: u8,
    ) {
        self.engine_id = engine_id;
        self.agent = agent;
        self.algorithm = config.algorithm;
        self.config = config;
        self.current_price = self.config.base_price;
        self.last_updated = current_time;
        self.is_active = true;
        self.bump = bump;
    }

    pub fn update_price(&mut self, new_price: u64, current_time: i64) {
        self.current_price = new_price.max(self.config.min_price).min(self.config.max_price);
        self.last_updated = current_time;
    }

    pub fn calculate_dynamic_price(&self, demand: u64, supply: u64) -> u64 {
        let base_price = self.config.base_price;
        
        // Calculate demand/supply ratio in basis points
        let demand_ratio = if supply > 0 { 
            (demand * 10000) / supply
        } else { 
            10000 // 100% in basis points
        };
        
        let price_adjustment = match self.algorithm {
            PricingAlgorithm::DemandBased => {
                let ratio_diff = if demand_ratio > 10000 {
                    demand_ratio - 10000
                } else {
                    0
                };
                10000 + (ratio_diff * self.config.demand_multiplier as u64) / 10000
            },
            PricingAlgorithm::SurgePricing => {
                if demand_ratio > 15000 { // 150% in basis points
                    let ratio_diff = demand_ratio - 10000;
                    10000 + (ratio_diff * self.config.surge_multiplier as u64) / 10000
                } else {
                    10000
                }
            },
            PricingAlgorithm::MarketBased => {
                demand_ratio
            },
            _ => 10000 // 100% in basis points
        };

        let new_price = (base_price * price_adjustment) / 10000;
        new_price.max(self.config.min_price).min(self.config.max_price)
    }

    pub fn should_update(&self, current_time: i64) -> bool {
        self.is_active && 
        (current_time - self.last_updated) >= self.config.update_frequency
    }
}

impl PricingTier {
    pub const MAX_NAME_LENGTH: usize = 32;
    pub const MAX_FEATURES: usize = 10;
    pub const MAX_FEATURE_LENGTH: usize = 64;
    pub const MAX_LIMITS: usize = 10;
    pub const MAX_LIMIT_NAME_LENGTH: usize = 32;
}

impl TieredPricingData {
    pub const MAX_TIERS: usize = 5;
    pub const MAX_TIER_BENEFITS: usize = 10;
    pub const MAX_TIER_REQUIREMENTS: usize = 10;
    pub const MAX_STRING_LENGTH: usize = 128;
}

impl Default for DynamicPricingConfig {
    fn default() -> Self {
        Self {
            algorithm: PricingAlgorithm::MarketBased,
            base_price: 1_000_000, // 0.001 SOL
            min_price: 100_000,    // 0.0001 SOL
            max_price: 10_000_000, // 0.01 SOL
            price_range: (100_000, 10_000_000),
            adjustment_frequency: 3600, // 1 hour
            update_frequency: 3600,     // 1 hour
            volatility_threshold: 2000,    // 20% in basis points
            demand_elasticity: 10000,      // 100% in basis points
            supply_elasticity: 10000,      // 100% in basis points
            demand_multiplier: 10000,      // 100% in basis points
            reputation_multiplier: 10000,  // 100% in basis points
            surge_multiplier: 15000,       // 150% in basis points
            last_update: 0,
            enabled: true,
        }
    }
}

impl Default for DemandMetrics {
    fn default() -> Self {
        Self {
            current_demand: 0,
            peak_demand: 0,
            average_demand: 1, // Avoid division by zero
            demand_trend: 0,    // 0% in basis points
            demand_volatility: 0,   // 0% in basis points
            last_updated: 0,
        }
    }
}

impl Default for SupplyMetrics {
    fn default() -> Self {
        Self {
            current_supply: 0,
            peak_supply: 0,
            average_supply: 1, // Avoid division by zero
            supply_trend: 0,    // 0% in basis points
            supply_volatility: 0,   // 0% in basis points
            last_updated: 0,
        }
    }
}

impl Default for DynamicPricingData {
    fn default() -> Self {
        Self {
            base_price: 1_000_000,
            current_price: 1_000_000,
            demand_multiplier: 10000,  // 100% in basis points
            supply_multiplier: 10000,  // 100% in basis points
            last_updated: 0,
            algorithm: PricingAlgorithm::MarketBased,
        }
    }
}