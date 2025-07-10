/*!
 * Performance Optimization Module
 * 
 * This module provides comprehensive compute unit optimization, gas efficiency improvements,
 * and performance monitoring for the GhostSpeak Protocol smart contract.
 */

use anchor_lang::prelude::*;
use solana_program::compute_budget::ComputeBudgetInstruction;

// =====================================================
// COMPUTE UNIT OPTIMIZATION
// =====================================================

/// Compute unit budget constants for different instruction types
pub mod compute_budgets {
    /// Agent registration - complex initialization
    pub const AGENT_REGISTRATION: u32 = 50_000;
    
    /// Simple agent updates
    pub const AGENT_UPDATE: u32 = 20_000;
    
    /// Payment processing with token transfers
    pub const PAYMENT_PROCESSING: u32 = 40_000;
    
    /// Auction operations
    pub const AUCTION_OPERATIONS: u32 = 30_000;
    
    /// Messaging operations
    pub const MESSAGING: u32 = 15_000;
    
    /// Work order creation
    pub const WORK_ORDER_CREATION: u32 = 35_000;
    
    /// Complex analytics operations
    pub const ANALYTICS: u32 = 60_000;
    
    /// Bulk operations
    pub const BULK_OPERATIONS: u32 = 80_000;
    
    /// Default budget for unknown operations
    pub const DEFAULT: u32 = 25_000;
    
    /// Maximum budget for emergency operations
    pub const EMERGENCY_MAX: u32 = 200_000;
}

/// Performance optimization utilities
pub struct PerformanceOptimizer;

impl PerformanceOptimizer {
    /// Calculate optimal compute unit budget based on instruction complexity
    pub fn calculate_optimal_budget(instruction_type: &str, account_count: u32) -> u32 {
        let base_budget = match instruction_type {
            "register_agent" => compute_budgets::AGENT_REGISTRATION,
            "update_agent" => compute_budgets::AGENT_UPDATE,
            "process_payment" => compute_budgets::PAYMENT_PROCESSING,
            "create_auction" | "place_bid" | "end_auction" => compute_budgets::AUCTION_OPERATIONS,
            "send_message" | "create_channel" => compute_budgets::MESSAGING,
            "create_work_order" | "submit_delivery" => compute_budgets::WORK_ORDER_CREATION,
            "create_analytics" | "update_metrics" => compute_budgets::ANALYTICS,
            "bulk_register" | "bulk_payment" => compute_budgets::BULK_OPERATIONS,
            _ => compute_budgets::DEFAULT,
        };
        
        // Adjust based on account count (each additional account adds complexity)
        let account_multiplier = 1.0 + (account_count as f32 * 0.1);
        (base_budget as f32 * account_multiplier) as u32
    }
    
    /// Check if current compute usage is within efficient range
    pub fn is_efficient_usage(used_compute: u64, allocated_compute: u32) -> bool {
        let efficiency_ratio = used_compute as f64 / allocated_compute as f64;
        efficiency_ratio >= 0.7 && efficiency_ratio <= 0.95
    }
    
    /// Generate compute budget instruction for efficient operations
    pub fn create_compute_budget_instruction(compute_units: u32) -> anchor_lang::solana_program::instruction::Instruction {
        ComputeBudgetInstruction::set_compute_unit_limit(compute_units)
    }
}

// =====================================================
// GAS EFFICIENCY OPTIMIZATIONS
// =====================================================

/// Gas optimization strategies
pub struct GasOptimizer;

impl GasOptimizer {
    /// Calculate minimal account space required for data structure
    pub fn calculate_minimal_space<T>() -> usize
    where
        T: anchor_lang::AccountSerialize + anchor_lang::AccountDeserialize,
    {
        // Account discriminator (8 bytes) + actual data size
        8 + std::mem::size_of::<T>()
    }
    
    /// Optimize string storage by using fixed-size arrays where possible
    pub fn optimize_string_storage(input: &str, max_length: usize) -> Vec<u8> {
        let mut optimized = vec![0u8; max_length];
        let bytes = input.as_bytes();
        let copy_len = std::cmp::min(bytes.len(), max_length);
        optimized[..copy_len].copy_from_slice(&bytes[..copy_len]);
        optimized
    }
    
    /// Batch operations helper for reducing transaction costs
    pub fn should_batch_operation(operation_count: u32) -> bool {
        operation_count >= 3 && operation_count <= 20
    }
    
    /// Calculate optimal batch size based on compute constraints
    pub fn calculate_optimal_batch_size(single_operation_cost: u32, max_budget: u32) -> u32 {
        std::cmp::min(max_budget / single_operation_cost, 20)
    }
}

// =====================================================
// MEMORY OPTIMIZATION
// =====================================================

/// Memory optimization utilities
pub struct MemoryOptimizer;

impl MemoryOptimizer {
    /// Pack boolean fields into bit flags for space efficiency
    pub fn pack_boolean_flags(flags: &[bool]) -> u64 {
        let mut packed = 0u64;
        for (i, &flag) in flags.iter().enumerate() {
            if flag {
                packed |= 1 << i;
            }
        }
        packed
    }
    
    /// Unpack boolean flags from bit field
    pub fn unpack_boolean_flags(packed: u64, count: usize) -> Vec<bool> {
        (0..count).map(|i| (packed & (1 << i)) != 0).collect()
    }
    
    /// Optimize vector capacity to reduce memory overhead
    pub fn optimize_vector_capacity<T>(vec: &mut Vec<T>, expected_size: usize) {
        if vec.capacity() > expected_size * 2 {
            vec.shrink_to(expected_size);
        }
    }
    
    /// Calculate aligned size for optimal memory layout
    pub fn calculate_aligned_size(size: usize, alignment: usize) -> usize {
        (size + alignment - 1) & !(alignment - 1)
    }
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

/// Performance metrics collection
#[derive(Debug, Clone)]
pub struct InstructionMetrics {
    pub name: String,
    pub compute_units_used: u64,
    pub compute_units_allocated: u32,
    pub execution_time_us: u64,
    pub accounts_loaded: u32,
    pub transaction_size: usize,
    pub efficiency_score: f64,
}

impl InstructionMetrics {
    pub fn new(name: String) -> Self {
        Self {
            name,
            compute_units_used: 0,
            compute_units_allocated: 0,
            execution_time_us: 0,
            accounts_loaded: 0,
            transaction_size: 0,
            efficiency_score: 0.0,
        }
    }
    
    pub fn calculate_efficiency(&mut self) {
        if self.compute_units_allocated > 0 {
            self.efficiency_score = (self.compute_units_used as f64 / self.compute_units_allocated as f64) * 100.0;
        }
    }
    
    pub fn is_optimized(&self) -> bool {
        self.efficiency_score >= 70.0 && self.efficiency_score <= 95.0
    }
}

/// Performance monitoring system
pub struct PerformanceMonitor {
    pub metrics: Vec<InstructionMetrics>,
    pub alert_threshold: f64,
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self {
            metrics: Vec::new(),
            alert_threshold: 50.0, // Alert if efficiency drops below 50%
        }
    }
    
    pub fn record_instruction(&mut self, metrics: InstructionMetrics) {
        if metrics.efficiency_score < self.alert_threshold {
            msg!("PERFORMANCE ALERT: Instruction {} efficiency: {:.2}%", 
                 metrics.name, metrics.efficiency_score);
        }
        self.metrics.push(metrics);
    }
    
    pub fn get_average_efficiency(&self) -> f64 {
        if self.metrics.is_empty() {
            return 0.0;
        }
        
        let total: f64 = self.metrics.iter().map(|m| m.efficiency_score).sum();
        total / self.metrics.len() as f64
    }
    
    pub fn get_worst_performing_instructions(&self, count: usize) -> Vec<&InstructionMetrics> {
        let mut sorted_metrics: Vec<&InstructionMetrics> = self.metrics.iter().collect();
        sorted_metrics.sort_by(|a, b| a.efficiency_score.partial_cmp(&b.efficiency_score).unwrap());
        sorted_metrics.into_iter().take(count).collect()
    }
}

// =====================================================
// OPTIMIZATION MACROS
// =====================================================

/// Macro for automatic compute budget optimization
#[macro_export]
macro_rules! optimize_compute_budget {
    ($instruction:expr, $accounts:expr) => {
        {
            let optimal_budget = crate::optimization::PerformanceOptimizer::calculate_optimal_budget(
                $instruction, 
                $accounts
            );
            msg!("Optimized compute budget for {}: {} CU", $instruction, optimal_budget);
            optimal_budget
        }
    };
}

/// Macro for performance measurement
#[macro_export]
macro_rules! measure_performance {
    ($name:expr, $block:block) => {
        {
            let start = anchor_lang::solana_program::clock::Clock::get()?.unix_timestamp;
            let result = $block;
            let end = anchor_lang::solana_program::clock::Clock::get()?.unix_timestamp;
            let duration = (end - start) as u64;
            
            msg!("Performance - {}: {}us", $name, duration);
            result
        }
    };
}

/// Macro for memory-efficient vector initialization
#[macro_export]
macro_rules! efficient_vec {
    ($capacity:expr) => {
        {
            let mut vec = Vec::new();
            vec.reserve_exact($capacity);
            vec
        }
    };
    ($elem:expr; $count:expr) => {
        {
            let mut vec = Vec::with_capacity($count);
            vec.resize($count, $elem);
            vec
        }
    };
}

// =====================================================
// BATCH OPERATION HELPERS
// =====================================================

/// Batch operation configuration
pub struct BatchConfig {
    pub max_operations_per_batch: u32,
    pub max_compute_per_batch: u32,
    pub max_accounts_per_batch: u32,
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            max_operations_per_batch: 10,
            max_compute_per_batch: 200_000,
            max_accounts_per_batch: 30,
        }
    }
}

/// Batch operation utilities
pub struct BatchOperations;

impl BatchOperations {
    /// Calculate optimal batch configuration based on constraints
    pub fn calculate_batch_config(
        operation_compute_cost: u32,
        operation_account_count: u32,
        total_operations: u32,
    ) -> BatchConfig {
        let max_operations = std::cmp::min(
            200_000 / operation_compute_cost,
            30 / operation_account_count,
        );
        
        BatchConfig {
            max_operations_per_batch: std::cmp::min(max_operations, 20),
            max_compute_per_batch: max_operations * operation_compute_cost,
            max_accounts_per_batch: max_operations * operation_account_count,
        }
    }
    
    /// Validate batch operation is within limits
    pub fn validate_batch_operation(
        config: &BatchConfig,
        operation_count: u32,
        total_compute: u32,
        total_accounts: u32,
    ) -> Result<()> {
        require!(
            operation_count <= config.max_operations_per_batch,
            crate::PodAIMarketplaceError::ValueExceedsMaximum
        );
        
        require!(
            total_compute <= config.max_compute_per_batch,
            crate::PodAIMarketplaceError::ComputeBudgetExceeded
        );
        
        require!(
            total_accounts <= config.max_accounts_per_batch,
            crate::PodAIMarketplaceError::ValueExceedsMaximum
        );
        
        Ok(())
    }
}

// =====================================================
// ACCOUNT SIZE OPTIMIZATION
// =====================================================

/// Account size calculator with optimization
pub struct AccountSizeOptimizer;

impl AccountSizeOptimizer {
    /// Calculate exact size needed for account data
    pub fn calculate_exact_size<T>(data: &T) -> usize 
    where 
        T: anchor_lang::AccountSerialize 
    {
        let mut size_buffer = Vec::new();
        data.try_serialize(&mut size_buffer).unwrap();
        8 + size_buffer.len() // 8 bytes for discriminator + actual data
    }
    
    /// Optimize account allocation with minimal padding
    pub fn optimize_allocation_size(required_size: usize) -> usize {
        // Round up to next 8-byte boundary for alignment
        (required_size + 7) & !7
    }
    
    /// Calculate space savings from optimization
    pub fn calculate_space_savings(old_size: usize, new_size: usize) -> (usize, f64) {
        let savings = old_size.saturating_sub(new_size);
        let percentage = (savings as f64 / old_size as f64) * 100.0;
        (savings, percentage)
    }
}