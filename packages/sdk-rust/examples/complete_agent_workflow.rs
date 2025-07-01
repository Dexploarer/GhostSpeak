//! Complete Agent Workflow Example
//! 
//! This example demonstrates the full lifecycle of an AI agent using the enhanced
//! ghostspeak SDK with modern patterns, security, monitoring, and compression.

use std::sync::Arc;
use std::time::Duration;

use ghostspeak_sdk::{
    client::{PodAIClient, transaction_factory::{TransactionFactory, PriorityFeeStrategy, RetryPolicy}},
    compression::{CompressionManager, CompressionConfig, CompressedData, CompressionType},
    instructions::agent::{AgentRegistrationBuilder, AgentUpdateBuilder},
    monitoring::{PerformanceMonitor, MonitoringConfig},
    security::{SecurityManager, SecurityConfig},
    services::agent::AgentService,
    spl_token_2022::{Token2022Factory, Token2022Config},
    testing::{TestEnvironment, TestConfig, TestAccountRole},
    types::agent::{AgentCapabilities, AgentAccount},
    errors::PodAIResult,
};
use solana_sdk::{signature::Keypair, signer::Signer};
use tracing::{info, error};

#[tokio::main]
async fn main() -> PodAIResult<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    info!("🚀 Starting Complete Agent Workflow Example");

    // Set up test environment
    let mut test_env = setup_test_environment().await?;
    
    // Initialize enhanced systems
    let systems = initialize_enhanced_systems(&test_env).await?;
    
    // Run the complete workflow
    run_complete_workflow(&test_env, &systems).await?;
    
    // Clean up
    test_env.cleanup().await?;
    
    info!("✅ Complete Agent Workflow Example completed successfully!");
    Ok(())
}

/// Enhanced systems container
struct EnhancedSystems {
    client: Arc<PodAIClient>,
    agent_service: AgentService,
    transaction_factory: TransactionFactory,
    performance_monitor: Arc<PerformanceMonitor>,
    security_manager: SecurityManager,
    compression_manager: CompressionManager,
    token_factory: Token2022Factory,
}

/// Setup test environment with proper configuration
async fn setup_test_environment() -> PodAIResult<TestEnvironment> {
    info!("🔧 Setting up test environment");
    
    let test_config = TestConfig {
        use_test_validator: true,
        verbose_logging: true,
        test_accounts: 5,
        initial_balance_sol: 100.0,
        enable_benchmarks: true,
        timeout_secs: 60,
    };
    
    let mut env = TestEnvironment::new(Some(test_config)).await?;
    env.initialize().await?;
    env.create_fixtures().await?;
    
    info!("✅ Test environment ready");
    Ok(env)
}

/// Initialize all enhanced systems
async fn initialize_enhanced_systems(test_env: &TestEnvironment) -> PodAIResult<EnhancedSystems> {
    info!("🔧 Initializing enhanced systems");
    
    let client = test_env.client();
    
    // Initialize performance monitoring
    let monitoring_config = MonitoringConfig {
        enable_metrics: true,
        enable_dashboard: true,
        enable_alerts: true,
        retention_hours: 1, // Short for testing
        sampling_rate: 1.0,
        dashboard_update_interval_secs: 10,
        ..Default::default()
    };
    
    let mut performance_monitor = PerformanceMonitor::new(client.clone(), Some(monitoring_config));
    performance_monitor.start().await?;
    let performance_monitor = Arc::new(performance_monitor);
    
    // Initialize security manager
    let security_config = SecurityConfig {
        enable_input_validation: true,
        enable_rate_limiting: true,
        enable_signature_verification: true,
        enable_account_validation: true,
        rate_limit_per_minute: 60,
        security_check_timeout_ms: 5000,
        enable_security_logging: true,
    };
    let security_manager = SecurityManager::new(client.clone(), Some(security_config));
    
    // Initialize compression manager
    let compression_config = CompressionConfig {
        max_depth: 15, // Smaller for testing
        max_buffer_size: 32,
        enable_large_data_compression: true,
        compression_level: 6,
        enable_parallel_proofs: true,
        max_concurrent_operations: 5,
    };
    let compression_manager = CompressionManager::new(
        client.clone(),
        Some(compression_config),
        Some(performance_monitor.clone()),
    );
    
    // Initialize transaction factory with advanced configuration
    let transaction_factory = TransactionFactory::new(client.clone())
        .with_priority_fee_strategy(PriorityFeeStrategy::Auto)
        .with_retry_policy(RetryPolicy::Exponential {
            max_attempts: 3,
            base_delay_ms: 1000,
            max_delay_ms: 10000,
            jitter: true,
        })
        .with_simulation(true)
        .with_compute_unit_limit(200_000);
    
    // Initialize agent service
    let agent_service = AgentService::new(client.clone());
    
    // Initialize SPL Token 2022 factory
    let token_config = Token2022Config {
        default_extensions: vec![
            spl_token_2022::extension::ExtensionType::TransferFeeConfig,
            spl_token_2022::extension::ExtensionType::MetadataPointer,
        ],
        use_compression: true,
        max_transfer_fee_basis_points: 100, // 1%
        auto_handle_transfer_fees: true,
    };
    let token_factory = Token2022Factory::with_config(client.clone(), token_config);
    
    info!("✅ Enhanced systems initialized");
    
    Ok(EnhancedSystems {
        client,
        agent_service,
        transaction_factory,
        performance_monitor,
        security_manager,
        compression_manager,
        token_factory,
    })
}

/// Run the complete agent workflow
async fn run_complete_workflow(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
) -> PodAIResult<()> {
    info!("🎯 Starting complete agent workflow");
    
    // Step 1: Agent Registration with Enhanced Patterns
    let agent_registration_result = demonstrate_agent_registration(test_env, systems).await?;
    
    // Step 2: Security Validation
    demonstrate_security_validation(test_env, systems).await?;
    
    // Step 3: Compression Operations
    demonstrate_compression_operations(systems).await?;
    
    // Step 4: SPL Token 2022 Integration
    demonstrate_token_operations(test_env, systems).await?;
    
    // Step 5: Performance Monitoring
    demonstrate_performance_monitoring(systems).await?;
    
    // Step 6: Agent Update Operations
    demonstrate_agent_updates(test_env, systems, &agent_registration_result).await?;
    
    info!("✅ Complete workflow finished successfully");
    Ok(())
}

/// Demonstrate enhanced agent registration
async fn demonstrate_agent_registration(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
) -> PodAIResult<ghostspeak_sdk::instructions::agent::AgentRegistrationResult> {
    info!("👤 Demonstrating agent registration with modern patterns");
    
    let agent_account = test_env.get_account_by_role(TestAccountRole::Agent)
        .ok_or_else(|| ghostspeak_sdk::errors::PodAIError::Custom {
            message: "No agent test account available".to_string(),
        })?;
    
    // Method 1: Using the builder pattern with custom configuration
    info!("🔧 Registering agent using builder pattern");
    let result = systems.agent_service
        .register()
        .signer(agent_account.keypair.clone())
        .capabilities(AgentCapabilities::Communication | AgentCapabilities::Trading)
        .metadata_uri("https://example.com/agent-metadata.json")
        .transaction_factory(systems.transaction_factory.clone())
        .execute()
        .await?;
    
    info!("✅ Agent registered successfully:");
    info!("   - Agent PDA: {}", result.agent_pda);
    info!("   - Signature: {}", result.signature);
    info!("   - Capabilities: {}", result.capabilities);
    info!("   - Transaction attempts: {}", result.transaction_result.attempts);
    info!("   - Compute units used: {:?}", result.transaction_result.compute_units_consumed);
    info!("   - Fee paid: {} lamports", result.transaction_result.fee_paid);
    
    Ok(result)
}

/// Demonstrate security validation
async fn demonstrate_security_validation(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
) -> PodAIResult<()> {
    info!("🔒 Demonstrating security validation");
    
    // Test URI validation
    let test_uris = vec![
        "https://valid-example.com/metadata.json",
        "http://invalid-protocol.com/metadata.json", // Should fail
        "https://example.com/<script>alert('xss')</script>", // Should fail
    ];
    
    for uri in test_uris {
        match systems.security_manager.validate_metadata_uri(uri) {
            Ok(()) => info!("✅ URI validated: {}", uri),
            Err(e) => info!("❌ URI rejected: {} - {}", uri, e),
        }
    }
    
    // Test capabilities validation
    let test_capabilities = vec![
        0b1111,        // Valid
        u64::MAX,      // Should fail - too large
        0b10101010,    // Valid
    ];
    
    for caps in test_capabilities {
        match systems.security_manager.validate_agent_capabilities(caps) {
            Ok(()) => info!("✅ Capabilities validated: {}", caps),
            Err(e) => info!("❌ Capabilities rejected: {} - {}", caps, e),
        }
    }
    
    // Test rate limiting (simulate multiple rapid requests)
    info!("🚦 Testing rate limiting");
    for i in 0..5 {
        let operation = ghostspeak_sdk::security::SecurityOperation {
            operation_id: format!("test_op_{}", i),
            operation_type: "test".to_string(),
            client_id: "test_client".to_string(),
            signer_pubkey: test_env.get_account(0).unwrap().pubkey(),
            signature: None,
            message: vec![1, 2, 3, 4],
            inputs: std::collections::HashMap::new(),
            accounts: vec![],
        };
        
        match systems.security_manager.validate_operation(&operation).await {
            Ok(result) => info!("✅ Operation {} passed security validation in {}ms", 
                i, result.execution_time_ms),
            Err(e) => info!("❌ Operation {} failed security validation: {}", i, e),
        }
        
        // Small delay to avoid overwhelming rate limiter
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    
    Ok(())
}

/// Demonstrate compression operations
async fn demonstrate_compression_operations(systems: &EnhancedSystems) -> PodAIResult<()> {
    info!("🗜️ Demonstrating compression operations");
    
    // Test basic data compression
    let test_data = b"This is a test message that should compress well when repeated. ".repeat(100);
    info!("📊 Original data size: {} bytes", test_data.len());
    
    let compressed = systems.compression_manager.compress_data(&test_data)?;
    info!("📊 Compressed size: {} bytes", compressed.len());
    info!("📊 Compression ratio: {:.2}%", 
        (compressed.len() as f64 / test_data.len() as f64) * 100.0);
    
    let decompressed = systems.compression_manager.decompress_data(&compressed)?;
    assert_eq!(test_data, decompressed);
    info!("✅ Compression/decompression cycle successful");
    
    // Create a compressed merkle tree for large data operations
    info!("🌳 Creating compressed merkle tree");
    let authority = Keypair::new();
    
    // Note: This would need proper funding in a real scenario
    // For demonstration, we'll show the pattern
    match systems.compression_manager.create_tree(&authority, 15, 32).await {
        Ok(tree_result) => {
            info!("✅ Compressed tree created: {}", tree_result.tree_pubkey);
            
            // Demonstrate appending compressed data
            let compressed_data = vec![
                CompressedData {
                    data: vec![1, 2, 3, 4, 5],
                    metadata: Some([("type".to_string(), "test".to_string())].iter().cloned().collect()),
                    compression_type: CompressionType::Gzip,
                },
                CompressedData {
                    data: vec![6, 7, 8, 9, 10],
                    metadata: None,
                    compression_type: CompressionType::None,
                },
            ];
            
            match systems.compression_manager.append_data(
                &tree_result.tree_pubkey,
                &authority,
                compressed_data,
            ).await {
                Ok(append_result) => {
                    info!("✅ Appended {} leaves to tree in {:?}", 
                        append_result.leaves_added, 
                        append_result.total_duration);
                }
                Err(e) => info!("⚠️ Append operation failed (expected in test): {}", e),
            }
        }
        Err(e) => info!("⚠️ Tree creation failed (expected in test environment): {}", e),
    }
    
    Ok(())
}

/// Demonstrate SPL Token 2022 operations
async fn demonstrate_token_operations(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
) -> PodAIResult<()> {
    info!("🪙 Demonstrating SPL Token 2022 operations");
    
    let authority = test_env.get_account_by_role(TestAccountRole::Authority)
        .ok_or_else(|| ghostspeak_sdk::errors::PodAIError::Custom {
            message: "No authority test account available".to_string(),
        })?;
    
    // For demonstration purposes, we'll show the pattern
    // In a real scenario, you'd need an actual mint
    let mock_mint = Keypair::new().pubkey();
    
    info!("🏭 Creating Token 2022 handler for mint: {}", mock_mint);
    
    match systems.token_factory.for_mint(mock_mint).await {
        Ok(handler) => {
            info!("✅ Token handler created successfully");
            
            // Show extension detection
            let extensions = handler.get_extensions();
            info!("📋 Detected extensions: {:?}", extensions);
            
            // Demonstrate transfer fee calculation
            let test_amount = 1_000_000; // 1 token with 6 decimals
            match handler.calculate_transfer_fee(test_amount).await {
                Ok((actual_amount, fee)) => {
                    info!("💰 Transfer calculation:");
                    info!("   - Requested: {} tokens", test_amount);
                    info!("   - Actual transfer: {} tokens", actual_amount);
                    info!("   - Fee: {} tokens", fee);
                }
                Err(e) => info!("⚠️ Transfer fee calculation failed: {}", e),
            }
        }
        Err(e) => info!("⚠️ Token handler creation failed (expected): {}", e),
    }
    
    Ok(())
}

/// Demonstrate performance monitoring
async fn demonstrate_performance_monitoring(systems: &EnhancedSystems) -> PodAIResult<()> {
    info!("📊 Demonstrating performance monitoring");
    
    // Record some sample metrics
    for i in 0..10 {
        let duration = Duration::from_millis(50 + (i * 10));
        let success = i % 7 != 0; // Simulate some failures
        
        systems.performance_monitor.record_transaction(
            "test_operation",
            duration,
            success,
            Some(50_000 + (i * 1000)),
            Some(5000),
        ).await;
        
        systems.performance_monitor.record_rpc_call(
            "get_account",
            Duration::from_millis(20 + (i * 2)),
            success,
            Some(1024),
        ).await;
    }
    
    // Get performance summary
    let summary = systems.performance_monitor.get_performance_summary().await;
    
    info!("📈 Performance Summary:");
    info!("   - Total transactions: {}", summary.total_transactions);
    info!("   - Success rate: {:.2}%", (1.0 - summary.error_rate) * 100.0);
    info!("   - Average transaction time: {}ms", summary.avg_transaction_time_ms);
    info!("   - Transactions per minute: {:.1}", summary.transactions_per_minute);
    info!("   - Total compute units: {}", summary.total_compute_units);
    info!("   - Total fees paid: {} lamports", summary.total_fees_paid);
    info!("   - RPC failure rate: {:.2}%", summary.rpc_failure_rate * 100.0);
    
    // Check system health
    let health = systems.performance_monitor.health_check().await;
    info!("🏥 System Health: {:?}", health.status);
    if !health.issues.is_empty() {
        info!("⚠️ Health Issues:");
        for issue in &health.issues {
            info!("   - {}", issue);
        }
    }
    
    Ok(())
}

/// Demonstrate agent update operations
async fn demonstrate_agent_updates(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
    registration_result: &ghostspeak_sdk::instructions::agent::AgentRegistrationResult,
) -> PodAIResult<()> {
    info!("🔄 Demonstrating agent updates");
    
    let agent_account = test_env.get_account_by_role(TestAccountRole::Agent)
        .ok_or_else(|| ghostspeak_sdk::errors::PodAIError::Custom {
            message: "No agent test account available".to_string(),
        })?;
    
    // Update agent with new capabilities
    let new_capabilities = AgentCapabilities::Communication | 
                          AgentCapabilities::Trading | 
                          AgentCapabilities::DataAnalysis;
    
    info!("🔧 Updating agent capabilities");
    match systems.agent_service
        .update()
        .signer(agent_account.keypair.clone())
        .capabilities(new_capabilities)
        .metadata_uri("https://example.com/updated-agent-metadata.json")
        .transaction_factory(systems.transaction_factory.clone())
        .execute()
        .await
    {
        Ok(update_result) => {
            info!("✅ Agent updated successfully:");
            info!("   - Signature: {}", update_result.signature);
            info!("   - Attempts: {}", update_result.attempts);
            info!("   - Fee paid: {} lamports", update_result.fee_paid);
        }
        Err(e) => info!("⚠️ Agent update failed (expected in test): {}", e),
    }
    
    Ok(())
}

/// Additional utility functions for demonstration

/// Demonstrate batch operations
async fn demonstrate_batch_operations(
    test_env: &TestEnvironment,
    systems: &EnhancedSystems,
) -> PodAIResult<()> {
    info!("📦 Demonstrating batch operations");
    
    // This would demonstrate batching multiple operations together
    // for improved efficiency
    
    Ok(())
}

/// Demonstrate error handling patterns
fn demonstrate_error_handling() {
    info!("🚨 Demonstrating error handling patterns");
    
    // Show different error types and how to handle them
    let errors = vec![
        ghostspeak_sdk::errors::PodAIError::RateLimitExceeded {
            operation: "test".to_string(),
        },
        ghostspeak_sdk::errors::PodAIError::ValidationFailed {
            field: "metadata_uri".to_string(),
            reason: "Invalid format".to_string(),
        },
        ghostspeak_sdk::errors::PodAIError::TransactionFailed {
            reason: "Insufficient funds".to_string(),
            signature: None,
            retryable: true,
            error_code: Some(1),
        },
    ];
    
    for error in errors {
        info!("🔍 Error type: {}", error);
        info!("   - Retryable: {}", error.is_retryable());
        info!("   - Severity: {:?}", error.severity());
    }
} 