//! Performance demonstration for PodAI Rust SDK
//! 
//! This script demonstrates the performance characteristics of core SDK operations.
//! Run with: cargo run --example performance_demo

use podai_sdk::{
    utils::pda::{find_agent_pda, find_channel_pda},
    types::{
        channel::{ChannelAccount, ChannelVisibility},
        agent::AgentCapabilities,
    },
};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use std::time::{Duration, Instant};

/// Performance benchmark result
struct BenchResult {
    operation: String,
    iterations: usize,
    duration: Duration,
    ops_per_sec: f64,
}

impl BenchResult {
    fn new(operation: String, iterations: usize, duration: Duration) -> Self {
        let ops_per_sec = iterations as f64 / duration.as_secs_f64();
        Self {
            operation,
            iterations,
            duration,
            ops_per_sec,
        }
    }

    fn print(&self) {
        println!("🚀 {}", self.operation);
        println!("   {} operations in {:?}", self.iterations, self.duration);
        println!("   {:.0} ops/sec", self.ops_per_sec);
        println!();
    }
}

fn main() {
    println!("⚡ PodAI Rust SDK Performance Demo");
    println!("==================================");
    println!();

    // Test data generation
    let test_wallets: Vec<Pubkey> = (0..1000)
        .map(|_| Keypair::new().pubkey())
        .collect();

    let iterations = 10_000;

    // Benchmark 1: Agent PDA Generation
    let start = Instant::now();
    for i in 0..iterations {
        let wallet = &test_wallets[i % test_wallets.len()];
        let _ = find_agent_pda(wallet);
    }
    let agent_pda_result = BenchResult::new(
        "Agent PDA Generation".to_string(),
        iterations,
        start.elapsed(),
    );
    agent_pda_result.print();

    // Benchmark 2: Channel PDA Generation
    let channel_names: Vec<String> = (0..100)
        .map(|i| format!("channel-{}", i))
        .collect();

    let start = Instant::now();
    for i in 0..iterations {
        let wallet = &test_wallets[i % test_wallets.len()];
        let name = &channel_names[i % channel_names.len()];
        let _ = find_channel_pda(wallet, name);
    }
    let channel_pda_result = BenchResult::new(
        "Channel PDA Generation".to_string(),
        iterations,
        start.elapsed(),
    );
    channel_pda_result.print();

    // Benchmark 3: ChannelAccount Creation
    let start = Instant::now();
    for i in 0..iterations {
        let creator = test_wallets[i % test_wallets.len()];
        let name = format!("channel-{}", i);
        let description = format!("Description for {}", name);
        
        let _ = ChannelAccount::new(
            creator,
            name,
            description,
            if i % 2 == 0 { ChannelVisibility::Public } else { ChannelVisibility::Private },
            1000,
            500,
            255,
        );
    }
    let channel_creation_result = BenchResult::new(
        "ChannelAccount Creation".to_string(),
        iterations,
        start.elapsed(),
    );
    channel_creation_result.print();

    // Benchmark 4: Borsh Serialization
    let test_channels: Vec<ChannelAccount> = (0..100)
        .map(|i| {
            let creator = test_wallets[i % test_wallets.len()];
            ChannelAccount::new(
                creator,
                format!("benchmark-channel-{}", i),
                format!("Benchmark description {}", i),
                ChannelVisibility::Public,
                1000,
                500,
                255,
            ).unwrap()
        })
        .collect();

    let start = Instant::now();
    for i in 0..iterations {
        let channel = &test_channels[i % test_channels.len()];
        let _ = borsh::to_vec(channel).unwrap();
    }
    let serialization_result = BenchResult::new(
        "Borsh Serialization".to_string(),
        iterations,
        start.elapsed(),
    );
    serialization_result.print();

    // Benchmark 5: Channel Validation
    let start = Instant::now();
    for i in 0..iterations {
        let channel = &test_channels[i % test_channels.len()];
        let _ = channel.validate();
    }
    let validation_result = BenchResult::new(
        "Channel Validation".to_string(),
        iterations,
        start.elapsed(),
    );
    validation_result.print();

    // Benchmark 6: Capability Operations
    let capabilities = vec![
        AgentCapabilities::Communication as u64,
        AgentCapabilities::Trading as u64,
        AgentCapabilities::Analysis as u64,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
    ];

    let start = Instant::now();
    for i in 0..iterations {
        let capability = capabilities[i % capabilities.len()];
        // Simple capability validation
        let _ = capability > 0;
    }
    let capability_result = BenchResult::new(
        "Capability Validation".to_string(),
        iterations,
        start.elapsed(),
    );
    capability_result.print();

    // Summary
    println!("📊 Performance Summary");
    println!("=====================");

    let results = vec![
        agent_pda_result,
        channel_pda_result,
        channel_creation_result,
        serialization_result,
        validation_result,
        capability_result,
    ];

    let fastest = results.iter().max_by(|a, b| a.ops_per_sec.partial_cmp(&b.ops_per_sec).unwrap()).unwrap();
    let slowest = results.iter().min_by(|a, b| a.ops_per_sec.partial_cmp(&b.ops_per_sec).unwrap()).unwrap();

    println!("⚡ Fastest: {} ({:.0} ops/sec)", fastest.operation, fastest.ops_per_sec);
    println!("🐌 Slowest: {} ({:.0} ops/sec)", slowest.operation, slowest.ops_per_sec);

    let total_ops: usize = results.iter().map(|r| r.iterations).sum();
    let total_time: Duration = results.iter().map(|r| r.duration).sum();
    let overall_throughput = total_ops as f64 / total_time.as_secs_f64();

    println!("🎯 Overall: {:.0} ops/sec", overall_throughput);
    println!("⏱️ Total time: {:?}", total_time);

    // Performance validation
    println!();
    println!("✅ Performance Validation");
    println!("=========================");

    let pda_ok = results[0].ops_per_sec > 100_000.0;
    let creation_ok = results[2].ops_per_sec > 10_000.0;
    let serialization_ok = results[3].ops_per_sec > 1_000.0;

    println!("PDA Generation (>100K ops/sec): {}", if pda_ok { "✅ PASS" } else { "❌ FAIL" });
    println!("Object Creation (>10K ops/sec): {}", if creation_ok { "✅ PASS" } else { "❌ FAIL" });
    println!("Serialization (>1K ops/sec): {}", if serialization_ok { "✅ PASS" } else { "❌ FAIL" });

    let all_pass = pda_ok && creation_ok && serialization_ok;
    println!();
    println!("🏆 Result: {}", if all_pass { "✅ EXCELLENT PERFORMANCE" } else { "⚠️ PERFORMANCE ISSUES DETECTED" });
} 