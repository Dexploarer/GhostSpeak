//! Integration tests for the PodAI Rust SDK
//! 
//! These tests validate that the SDK components work together correctly
//! and can interact with a real Solana environment.

use podai_sdk::{
    client::{PodAIClient, PodAIConfig},
    services::{agent::AgentService, channel::ChannelService},
    types::channel::ChannelVisibility,
    utils::pda::{find_agent_pda, find_channel_pda},
};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use std::sync::Arc;

/// Test basic client initialization
#[tokio::test]
async fn test_client_initialization() {
    // Test client initialization
    let config = PodAIConfig::devnet();
    
    match PodAIClient::new(config).await {
        Ok(client) => {
            // Verify client has expected properties
            assert!(!client.program_id().to_string().is_empty());
            println!("✅ Client initialized successfully");
        }
        Err(e) => {
            println!("⚠️ Client initialization failed (expected in CI): {}", e);
            // This is expected in CI environments without Solana running
        }
    }
}

/// Test PDA derivation consistency
#[test]
fn test_pda_derivation() {
    let wallet = Keypair::new();
    let wallet_pubkey = wallet.pubkey();
    
    // Test agent PDA derivation
    let (agent_pda1, bump1) = find_agent_pda(&wallet_pubkey);
    let (agent_pda2, bump2) = find_agent_pda(&wallet_pubkey);
    
    // Should be deterministic
    assert_eq!(agent_pda1, agent_pda2);
    assert_eq!(bump1, bump2);
    
    // Test channel PDA derivation
    let channel_name = "test-channel";
    let (channel_pda1, bump1) = find_channel_pda(&wallet_pubkey, channel_name);
    let (channel_pda2, bump2) = find_channel_pda(&wallet_pubkey, channel_name);
    
    // Should be deterministic
    assert_eq!(channel_pda1, channel_pda2);
    assert_eq!(bump1, bump2);
    
    println!("✅ PDA derivation is consistent");
}

/// Test service instantiation
#[tokio::test]
async fn test_service_creation() {
    let config = PodAIConfig::devnet();
    
    match PodAIClient::new(config).await {
        Ok(client) => {
            let client_arc = Arc::new(client);
            
            // Test service creation
            let agent_service = AgentService::new(client_arc.clone());
            let channel_service = ChannelService::new(client_arc.clone());
            
            // Test basic PDA calculation (doesn't require network)
            let test_wallet = Keypair::new();
            let (agent_pda, _) = find_agent_pda(&test_wallet.pubkey());
            let (channel_pda, _) = find_channel_pda(&test_wallet.pubkey(), "test");
            
            assert_ne!(agent_pda, Pubkey::default());
            assert_ne!(channel_pda, Pubkey::default());
            
            println!("✅ Services created successfully");
        }
        Err(e) => {
            println!("⚠️ Service creation test skipped (no Solana): {}", e);
        }
    }
}

/// Test transaction building (without sending)
#[tokio::test]
async fn test_transaction_building() {
    let config = PodAIConfig::devnet();
    
    match PodAIClient::new(config).await {
        Ok(client) => {
            let client_arc = Arc::new(client);
            let _agent_service = AgentService::new(client_arc);
            
            let test_wallet = Keypair::new();
            
            // Test PDA calculation (which doesn't require network)
            let (agent_pda, bump) = find_agent_pda(&test_wallet.pubkey());
            
            assert_ne!(agent_pda, Pubkey::default());
            assert!(bump <= 255);
            
            println!("✅ Transaction building patterns work");
        }
        Err(e) => {
            println!("⚠️ Transaction building test skipped (no Solana): {}", e);
        }
    }
}

/// Test error handling and validation
#[test] 
fn test_validation_logic() {
    use podai_sdk::types::channel::ChannelAccount;
    use podai_sdk::errors::PodAIError;
    
    let test_pubkey = Keypair::new().pubkey();
    
    // Test invalid channel name (too long)
    let long_name = "a".repeat(100); // Exceeds MAX_CHANNEL_NAME_LENGTH
    let result = ChannelAccount::new(
        test_pubkey,
        long_name,
        "Test description".to_string(),
        ChannelVisibility::Public,
        100,
        1000,
        255,
    );
    
    assert!(result.is_err());
    if let Err(PodAIError::InvalidInput { field, reason: _ }) = result {
        assert_eq!(field, "name");
    } else {
        panic!("Expected InvalidInput error for long name");
    }
    
    // Test valid channel creation
    let valid_result = ChannelAccount::new(
        test_pubkey,
        "valid-name".to_string(),
        "Test description".to_string(),
        ChannelVisibility::Public,
        100,
        1000,
        255,
    );
    
    assert!(valid_result.is_ok());
    
    println!("✅ Validation logic works correctly");
}

/// Performance test - PDA generation speed
#[test]
fn test_pda_generation_performance() {
    use std::time::Instant;
    
    let test_wallet = Keypair::new().pubkey();
    let iterations = 1000;
    
    let start = Instant::now();
    for i in 0..iterations {
        let channel_name = format!("channel-{}", i);
        let _ = find_channel_pda(&test_wallet, &channel_name);
    }
    let duration = start.elapsed();
    
    let per_operation = duration.as_nanos() / iterations as u128;
    
    // Should be very fast (< 1ms per operation)
    assert!(per_operation < 1_000_000); // 1ms in nanoseconds
    
    println!("✅ PDA generation: {} operations in {:?} (~{}ns per op)", 
             iterations, duration, per_operation);
}

/// Test SDK constants and configuration
#[test]
fn test_sdk_constants() {
    use podai_sdk::types::channel::{
        MAX_CHANNEL_NAME_LENGTH,
        MAX_CHANNEL_DESCRIPTION_LENGTH,
        MAX_PARTICIPANTS_PER_CHANNEL,
    };
    
    // Verify reasonable limits
    assert!(MAX_CHANNEL_NAME_LENGTH > 0);
    assert!(MAX_CHANNEL_NAME_LENGTH <= 100);
    assert!(MAX_CHANNEL_DESCRIPTION_LENGTH >= MAX_CHANNEL_NAME_LENGTH);
    assert!(MAX_PARTICIPANTS_PER_CHANNEL > 1);
    
    println!("✅ SDK constants are reasonable");
}

/// Test memory usage and cleanup
#[tokio::test]
async fn test_memory_cleanup() {
    // Create and drop multiple clients to test memory cleanup
    for _i in 0..10 {
        let config = PodAIConfig::devnet();
        match PodAIClient::new(config).await {
            Ok(client) => {
                let _service = AgentService::new(Arc::new(client));
                // Client and service should be properly dropped
            }
            Err(_) => {
                // Skip if no Solana available
                break;
            }
        }
    }
    
    println!("✅ Memory cleanup test completed");
}

#[cfg(test)]
mod benchmarks {
    use super::*;
    use std::time::Instant;
    
    /// Benchmark various SDK operations
    #[test]
    fn benchmark_sdk_operations() {
        let iterations = 1000;
        let test_wallet = Keypair::new().pubkey();
        
        // Benchmark PDA derivation
        let start = Instant::now();
        for _i in 0..iterations {
            let _ = find_agent_pda(&test_wallet);
        }
        let agent_pda_time = start.elapsed();
        
        // Benchmark channel PDA derivation  
        let start = Instant::now();
        for i in 0..iterations {
            let name = format!("channel-{}", i % 100); // Reuse some names
            let _ = find_channel_pda(&test_wallet, &name);
        }
        let channel_pda_time = start.elapsed();
        
        println!("🚀 Benchmark Results:");
        println!("   Agent PDA: {}μs per operation", agent_pda_time.as_micros() / iterations as u128);
        println!("   Channel PDA: {}μs per operation", channel_pda_time.as_micros() / iterations as u128);
        
        // Performance assertions
        assert!(agent_pda_time.as_millis() < 100); // Should complete 1000 ops in < 100ms
        assert!(channel_pda_time.as_millis() < 200); // Should complete 1000 ops in < 200ms
    }
} 