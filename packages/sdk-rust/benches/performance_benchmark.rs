//! Performance benchmarks for PodAI Rust SDK
//! 
//! These benchmarks measure the performance of core SDK operations
//! including PDA generation, transaction building, and data processing.

use podai_sdk::{
    utils::pda::{find_agent_pda, find_channel_pda, find_channel_message_pda},
    types::{
        channel::{ChannelAccount, ChannelVisibility},
        agent::AgentCapabilities,
    },
};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    instruction::Instruction,
};
use std::time::{Duration, Instant};
use chrono::Utc;

/// Benchmark configuration
struct BenchmarkConfig {
    pub iterations: usize,
    pub verbose: bool,
}

impl Default for BenchmarkConfig {
    fn default() -> Self {
        Self {
            iterations: 10_000,
            verbose: true,
        }
    }
}

/// Benchmark results
#[derive(Debug)]
struct BenchmarkResult {
    pub operation: String,
    pub iterations: usize,
    pub total_duration: Duration,
    pub avg_duration_ns: u128,
    pub operations_per_second: f64,
}

impl BenchmarkResult {
    fn new(operation: String, iterations: usize, total_duration: Duration) -> Self {
        let avg_duration_ns = total_duration.as_nanos() / iterations as u128;
        let operations_per_second = 1_000_000_000.0 / avg_duration_ns as f64;
        
        Self {
            operation,
            iterations,
            total_duration,
            avg_duration_ns,
            operations_per_second,
        }
    }
    
    fn print_result(&self) {
        println!("📊 {}", self.operation);
        println!("   Iterations: {}", self.iterations);
        println!("   Total time: {:?}", self.total_duration);
        println!("   Average: {}ns per operation", self.avg_duration_ns);
        println!("   Throughput: {:.0} ops/sec", self.operations_per_second);
        println!();
    }
}

/// Benchmark PDA generation performance
fn benchmark_pda_generation(config: &BenchmarkConfig) -> Vec<BenchmarkResult> {
    let mut results = Vec::new();
    
    // Benchmark agent PDA generation
    let test_wallets: Vec<Pubkey> = (0..1000)
        .map(|_| Keypair::new().pubkey())
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let wallet = &test_wallets[fastrand::usize(..test_wallets.len())];
        let _ = find_agent_pda(wallet);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Agent PDA Generation".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark channel PDA generation
    let channel_names: Vec<String> = (0..100)
        .map(|i| format!("channel-{}", i))
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let wallet = &test_wallets[fastrand::usize(..test_wallets.len())];
        let name = &channel_names[fastrand::usize(..channel_names.len())];
        let _ = find_channel_pda(wallet, name);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Channel PDA Generation".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark channel message PDA generation
    let start = Instant::now();
    for _ in 0..config.iterations {
        let channel = &test_wallets[fastrand::usize(..test_wallets.len())];
        let sender = &test_wallets[fastrand::usize(..test_wallets.len())];
        let nonce = fastrand::u64(..);
        let _ = find_channel_message_pda(channel, sender, nonce);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Channel Message PDA Generation".to_string(),
        config.iterations,
        duration,
    ));
    
    results
}

/// Benchmark data structure operations
fn benchmark_data_structures(config: &BenchmarkConfig) -> Vec<BenchmarkResult> {
    let mut results = Vec::new();
    
    // Benchmark ChannelAccount creation
    let test_pubkeys: Vec<Pubkey> = (0..1000)
        .map(|_| Keypair::new().pubkey())
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let creator = test_pubkeys[fastrand::usize(..test_pubkeys.len())];
        let name = format!("channel-{}", fastrand::u32(..));
        let description = format!("Description for {}", name);
        
        let _ = ChannelAccount::new(
            creator,
            name,
            description,
            ChannelVisibility::Public,
            1000,
            500,
            255,
        );
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "ChannelAccount Creation".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark channel validation
    let channels: Vec<ChannelAccount> = (0..100)
        .map(|i| {
            ChannelAccount::new(
                test_pubkeys[i % test_pubkeys.len()],
                format!("test-channel-{}", i),
                format!("Test description {}", i),
                if i % 2 == 0 { ChannelVisibility::Public } else { ChannelVisibility::Private },
                1000,
                500,
                255,
            ).unwrap()
        })
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let channel = &channels[fastrand::usize(..channels.len())];
        let _ = channel.validate();
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Channel Validation".to_string(),
        config.iterations,
        duration,
    ));
    
    results
}

/// Benchmark serialization operations
fn benchmark_serialization(config: &BenchmarkConfig) -> Vec<BenchmarkResult> {
    let mut results = Vec::new();
    
    // Create test data
    let test_channels: Vec<ChannelAccount> = (0..100)
        .map(|i| {
            let creator = Keypair::new().pubkey();
            ChannelAccount::new(
                creator,
                format!("benchmark-channel-{}", i),
                format!("Benchmark description for channel {}", i),
                if i % 3 == 0 { ChannelVisibility::Private } else { ChannelVisibility::Public },
                1000 + (i as u32 * 10),
                100 + (i as u64 * 5),
                255,
            ).unwrap()
        })
        .collect();
    
    // Benchmark Borsh serialization
    let start = Instant::now();
    for _ in 0..config.iterations {
        let channel = &test_channels[fastrand::usize(..test_channels.len())];
        let _ = borsh::to_vec(channel).unwrap();
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Borsh Serialization".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark JSON serialization
    let start = Instant::now();
    for _ in 0..config.iterations {
        let channel = &test_channels[fastrand::usize(..test_channels.len())];
        let _ = serde_json::to_string(channel).unwrap();
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "JSON Serialization".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark deserialization
    let serialized_channels: Vec<Vec<u8>> = test_channels
        .iter()
        .map(|channel| borsh::to_vec(channel).unwrap())
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let data = &serialized_channels[fastrand::usize(..serialized_channels.len())];
        let _: ChannelAccount = borsh::from_slice(data).unwrap();
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Borsh Deserialization".to_string(),
        config.iterations,
        duration,
    ));
    
    results
}

/// Benchmark capability operations
fn benchmark_capabilities(config: &BenchmarkConfig) -> Vec<BenchmarkResult> {
    let mut results = Vec::new();
    
    // Generate test capability bitmasks
    let test_capabilities: Vec<u64> = vec![
        AgentCapabilities::Communication as u64,
        AgentCapabilities::Trading as u64,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
        AgentCapabilities::DataAnalysis as u64,
        AgentCapabilities::Communication as u64 | AgentCapabilities::DataAnalysis as u64,
        AgentCapabilities::Trading as u64 | AgentCapabilities::DataAnalysis as u64,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64 | AgentCapabilities::DataAnalysis as u64,
    ];
    
    // Benchmark capability parsing
    let start = Instant::now();
    for _ in 0..config.iterations {
        let capabilities = test_capabilities[fastrand::usize(..test_capabilities.len())];
        let _ = AgentCapabilities::from_bitmask(capabilities);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Capability Parsing".to_string(),
        config.iterations,
        duration,
    ));
    
    results
}

/// Benchmark string operations
fn benchmark_string_operations(config: &BenchmarkConfig) -> Vec<BenchmarkResult> {
    let mut results = Vec::new();
    
    // Benchmark name validation
    let test_names: Vec<String> = (0..1000)
        .map(|i| format!("test-channel-name-{}", i))
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let name = &test_names[fastrand::usize(..test_names.len())];
        let _ = ChannelAccount::validate_name(name);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Name Validation".to_string(),
        config.iterations,
        duration,
    ));
    
    // Benchmark description validation
    let test_descriptions: Vec<String> = (0..100)
        .map(|i| format!("Test description for channel {} - this is a longer text to test validation performance", i))
        .collect();
    
    let start = Instant::now();
    for _ in 0..config.iterations {
        let description = &test_descriptions[fastrand::usize(..test_descriptions.len())];
        let _ = ChannelAccount::validate_description(description);
    }
    let duration = start.elapsed();
    
    results.push(BenchmarkResult::new(
        "Description Validation".to_string(),
        config.iterations,
        duration,
    ));
    
    results
}

/// Memory usage benchmark
fn benchmark_memory_usage(config: &BenchmarkConfig) -> BenchmarkResult {
    let iterations = std::cmp::min(config.iterations, 1000); // Limit to prevent OOM
    
    let start = Instant::now();
    let mut channels = Vec::with_capacity(iterations);
    
    for i in 0..iterations {
        let creator = Keypair::new().pubkey();
        let channel = ChannelAccount::new(
            creator,
            format!("memory-test-{}", i),
            format!("Memory test description {}", i),
            ChannelVisibility::Public,
            1000,
            500,
            255,
        ).unwrap();
        channels.push(channel);
    }
    
    // Simulate some operations
    for channel in &mut channels {
        let _ = channel.validate();
        let _ = channel.add_participant();
        let _ = channel.add_escrow(1000);
    }
    
    let duration = start.elapsed();
    
    // Force cleanup
    drop(channels);
    
    BenchmarkResult::new(
        "Memory Allocation & Operations".to_string(),
        iterations,
        duration,
    )
}

/// Run all benchmarks
fn run_all_benchmarks(config: &BenchmarkConfig) {
    println!("🚀 PodAI Rust SDK Performance Benchmarks");
    println!("==========================================");
    println!("Iterations per test: {}", config.iterations);
    println!("Timestamp: {}", Utc::now().format("%Y-%m-%d %H:%M:%S UTC"));
    println!();
    
    // PDA Generation Benchmarks
    println!("🔑 PDA Generation Benchmarks");
    println!("----------------------------");
    let pda_results = benchmark_pda_generation(config);
    for result in &pda_results {
        if config.verbose {
            result.print_result();
        }
    }
    
    // Data Structure Benchmarks
    println!("📊 Data Structure Benchmarks");
    println!("-----------------------------");
    let data_results = benchmark_data_structures(config);
    for result in &data_results {
        if config.verbose {
            result.print_result();
        }
    }
    
    // Serialization Benchmarks
    println!("💾 Serialization Benchmarks");
    println!("---------------------------");
    let serialization_results = benchmark_serialization(config);
    for result in &serialization_results {
        if config.verbose {
            result.print_result();
        }
    }
    
    // Capability Benchmarks
    println!("⚙️ Capability Benchmarks");
    println!("------------------------");
    let capability_results = benchmark_capabilities(config);
    for result in &capability_results {
        if config.verbose {
            result.print_result();
        }
    }
    
    // String Operation Benchmarks
    println!("📝 String Operation Benchmarks");
    println!("------------------------------");
    let string_results = benchmark_string_operations(config);
    for result in &string_results {
        if config.verbose {
            result.print_result();
        }
    }
    
    // Memory Usage Benchmark
    println!("🧠 Memory Usage Benchmark");
    println!("-------------------------");
    let memory_result = benchmark_memory_usage(config);
    if config.verbose {
        memory_result.print_result();
    }
    
    // Summary
    println!("📈 Performance Summary");
    println!("=====================");
    
    let all_results = [
        pda_results,
        data_results,
        serialization_results,
        capability_results,
        string_results,
        vec![memory_result],
    ].concat();
    
    // Find fastest and slowest operations
    let fastest = all_results
        .iter()
        .min_by_key(|r| r.avg_duration_ns)
        .unwrap();
    let slowest = all_results
        .iter()
        .max_by_key(|r| r.avg_duration_ns)
        .unwrap();
    
    println!("⚡ Fastest operation: {} ({}ns avg)", fastest.operation, fastest.avg_duration_ns);
    println!("🐌 Slowest operation: {} ({}ns avg)", slowest.operation, slowest.avg_duration_ns);
    
    let total_ops: usize = all_results.iter().map(|r| r.iterations).sum();
    let total_time: Duration = all_results.iter().map(|r| r.total_duration).sum();
    let overall_ops_per_sec = total_ops as f64 / total_time.as_secs_f64();
    
    println!("🎯 Overall throughput: {:.0} operations/sec", overall_ops_per_sec);
    println!("⏱️ Total benchmark time: {:?}", total_time);
    println!();
    
    // Performance thresholds
    println!("✅ Performance Validation");
    println!("========================");
    
    let pda_threshold = 1_000; // 1μs
    let serialization_threshold = 50_000; // 50μs
    let validation_threshold = 100; // 100ns
    
    let pda_pass = pda_results.iter().all(|r| r.avg_duration_ns < pda_threshold);
    let serialization_pass = serialization_results.iter().all(|r| r.avg_duration_ns < serialization_threshold);
    let validation_pass = string_results.iter().all(|r| r.avg_duration_ns < validation_threshold);
    
    println!("PDA Generation (< {}ns): {}", pda_threshold, if pda_pass { "✅ PASS" } else { "❌ FAIL" });
    println!("Serialization (< {}ns): {}", serialization_threshold, if serialization_pass { "✅ PASS" } else { "❌ FAIL" });
    println!("Validation (< {}ns): {}", validation_threshold, if validation_pass { "✅ PASS" } else { "❌ FAIL" });
    
    let all_pass = pda_pass && serialization_pass && validation_pass;
    println!();
    println!("🏆 Overall Performance: {}", if all_pass { "✅ EXCELLENT" } else { "⚠️ NEEDS OPTIMIZATION" });
}

fn main() {
    let config = BenchmarkConfig::default();
    run_all_benchmarks(&config);
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_benchmark_pda_generation() {
        let config = BenchmarkConfig { iterations: 100, verbose: false };
        let results = benchmark_pda_generation(&config);
        
        assert!(!results.is_empty());
        assert!(results.iter().all(|r| r.iterations == 100));
        assert!(results.iter().all(|r| r.avg_duration_ns > 0));
    }
    
    #[test]
    fn test_benchmark_data_structures() {
        let config = BenchmarkConfig { iterations: 100, verbose: false };
        let results = benchmark_data_structures(&config);
        
        assert!(!results.is_empty());
        assert!(results.iter().all(|r| r.operations_per_second > 0.0));
    }
} 