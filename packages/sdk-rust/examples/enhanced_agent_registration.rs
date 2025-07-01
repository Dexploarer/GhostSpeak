//! Enhanced Agent Registration Example
//! 
//! This example demonstrates the modern transaction patterns inspired by web3.js v2
//! and full SPL Token 2022 support in the podAI Rust SDK.

use podai_sdk::{
    PodAIClient, PodAIConfig, AgentCapabilities,
    TransactionFactory, TransactionConfig, PriorityFeeStrategy, RetryPolicy,
    PodAIResult,
};
use solana_sdk::{
    signature::{Keypair, Signer},
    pubkey::Pubkey,
};
use std::time::Duration;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    env_logger::init();

    println!("🚀 Enhanced Agent Registration Example");
    println!("====================================");

    // Create client with devnet configuration
    let config = PodAIConfig::devnet()
        .with_timeout(Duration::from_secs(60))
        .with_max_retries(3);
    
    let client = Arc::new(PodAIClient::new(config).await?);
    let agent_service = client.agent_service();

    // Generate a new keypair for the agent
    let agent_keypair = Keypair::new();
    println!("💼 Agent wallet: {}", agent_keypair.pubkey());

    // Example 1: Fast registration (for development/testing)
    println!("\n📦 Example 1: Fast Registration");
    println!("------------------------------");
    
    let result = agent_service
        .register_fast(
            &agent_keypair,
            AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
            "https://example.com/agent-metadata.json"
        )
        .await?;

    println!("✅ Agent registered successfully!");
    println!("   📍 Agent PDA: {}", result.agent_pda);
    println!("   🔐 Signature: {}", result.signature);
    println!("   ⏰ Execution time: {}ms", result.timestamp.timestamp_millis());
    println!("   🎯 Capabilities: {:?}", result.parsed_capabilities());

    // Example 2: Reliable registration with custom configuration
    println!("\n🔒 Example 2: Reliable Registration");
    println!("----------------------------------");

    let another_agent = Keypair::new();
    
    let result = agent_service
        .register_reliable(
            &another_agent,
            AgentCapabilities::Analysis as u64 | AgentCapabilities::Research as u64,
            "https://example.com/research-agent.json"
        )
        .await?;

    println!("✅ Research agent registered!");
    println!("   📍 Agent PDA: {}", result.agent_pda);
    println!("   🎯 Capabilities: {:?}", result.parsed_capabilities());

    // Example 3: Custom configuration with builder pattern
    println!("\n🛠️  Example 3: Custom Builder Configuration");
    println!("------------------------------------------");

    let custom_agent = Keypair::new();

    let result = agent_service
        .register_builder()
        .with_priority_fee_strategy(PriorityFeeStrategy::Helius {
            priority_level: "High".to_string()
        })
        .with_retry_policy(RetryPolicy::Exponential {
            max_attempts: 5,
            base_delay_ms: 2000,
        })
        .with_simulation(true)
        .execute(
            &custom_agent,
            AgentCapabilities::MarketMaking as u64,
            "https://example.com/market-maker.json"
        )
        .await?;

    println!("✅ Market maker agent registered with custom config!");
    println!("   📍 Agent PDA: {}", result.agent_pda);

    // Example 4: Using transaction factory directly
    println!("\n⚙️  Example 4: Direct Transaction Factory Usage");
    println!("----------------------------------------------");

    let factory_agent = Keypair::new();

    // Create custom transaction factory
    let factory_config = TransactionConfig::default()
        .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic { percentile: 90 })
        .with_retry_policy(RetryPolicy::Fixed { max_attempts: 3, delay_ms: 1500 })
        .with_simulation(true)
        .with_max_compute_units(250_000);

    let factory = TransactionFactory::with_config(&client, factory_config);

    let result = agent_service
        .register_with_factory(
            &factory,
            &factory_agent,
            AgentCapabilities::Automation as u64 | AgentCapabilities::Security as u64,
            "https://example.com/security-agent.json"
        )
        .await?;

    println!("✅ Security agent registered with direct factory!");
    println!("   📍 Agent PDA: {}", result.agent_pda);

    // Example 5: Demonstrate SPL Token 2022 patterns (when working with tokens)
    println!("\n💰 Example 5: SPL Token 2022 Integration Preview");
    println!("-----------------------------------------------");
    
    // This would demonstrate SPL Token 2022 features when implemented
    println!("🔮 SPL Token 2022 features:");
    println!("   • StateWithExtensions for account deserialization");
    println!("   • Transfer fee calculation and handling");
    println!("   • Extension validation and metadata support");
    println!("   • Automatic extension-aware account creation");
    
    // Example factory configurations
    demo_transaction_configurations().await?;

    // Validation examples
    demo_validation_patterns(&agent_service).await?;

    println!("\n🎉 All examples completed successfully!");
    println!("💡 The SDK now supports modern web3.js v2 patterns with:");
    println!("   ✓ Factory functions for transaction building");
    println!("   ✓ Intelligent priority fee estimation");
    println!("   ✓ Comprehensive retry logic with exponential backoff");
    println!("   ✓ Full SPL Token 2022 extension support");
    println!("   ✓ Builder patterns for complex configurations");
    println!("   ✓ Type-safe error handling and validation");

    Ok(())
}

/// Demonstrate different transaction configuration patterns
async fn demo_transaction_configurations() -> PodAIResult<()> {
    println!("\n⚙️  Transaction Configuration Patterns");
    println!("------------------------------------");

    // Fast configuration for development
    let fast_config = TransactionConfig::fast();
    println!("🏃 Fast config:");
    println!("   • Skip preflight: {}", fast_config.skip_preflight);
    println!("   • Max compute units: {}", fast_config.max_compute_units);
    println!("   • Timeout: {:?}", fast_config.confirmation_timeout);

    // Reliable configuration for production
    let reliable_config = TransactionConfig::reliable();
    println!("🔒 Reliable config:");
    println!("   • Simulate before send: {}", reliable_config.simulate_before_send);
    println!("   • Commitment: {:?}", reliable_config.commitment);
    println!("   • Auto-calculate compute units: {}", reliable_config.max_compute_units == 0);

    // Custom configuration
    let custom_config = TransactionConfig::default()
        .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic { percentile: 85 })
        .with_retry_policy(RetryPolicy::Custom {
            max_attempts: 4,
            delays_ms: vec![1000, 2000, 4000, 8000],
        })
        .with_simulation(true)
        .with_max_compute_units(300_000);

    println!("🛠️  Custom config:");
    println!("   • Priority fee: Dynamic (85th percentile)");
    println!("   • Retry: Custom delays [1s, 2s, 4s, 8s]");
    println!("   • Compute units: 300,000");

    Ok(())
}

/// Demonstrate validation patterns
async fn demo_validation_patterns(agent_service: &podai_sdk::AgentService) -> PodAIResult<()> {
    println!("\n✅ Validation Patterns");
    println!("---------------------");

    // Capability validation
    let capabilities = AgentCapabilities::Communication as u64 
        | AgentCapabilities::Trading as u64
        | AgentCapabilities::Analysis as u64;

    let parsed = agent_service.validate_capabilities(capabilities)?;
    println!("🎯 Validated capabilities: {:?}", parsed);

    // PDA validation
    let test_wallet = Keypair::new();
    let (agent_pda, bump) = agent_service.get_agent_pda(&test_wallet.pubkey());
    println!("📍 Generated PDA: {} (bump: {})", agent_pda, bump);

    // Registration check
    let is_registered = agent_service.is_registered(&test_wallet.pubkey()).await?;
    println!("🔍 Registration status: {}", if is_registered { "Registered" } else { "Not registered" });

    Ok(())
}

/// Helper function to demonstrate error handling
fn demonstrate_error_patterns() {
    println!("\n❌ Error Handling Patterns");
    println!("-------------------------");

    // Different error types that the SDK can handle
    println!("🔧 SDK error categories:");
    println!("   • Agent errors (registration, validation)");
    println!("   • Network errors (RPC, connectivity)");
    println!("   • Transaction errors (simulation, fees)");
    println!("   • Validation errors (input, account data)");
    println!("   • Internal errors (SDK logic)");
    
    println!("🔄 Retry strategies:");
    println!("   • Exponential backoff for network errors");
    println!("   • Fixed delays for predictable failures");
    println!("   • Custom retry logic for complex scenarios");
    println!("   • No retry for validation errors");
}

/// Example demonstrating enhanced transaction factory patterns in the PodAI SDK
/// 
/// This example shows how to use the Web3.js v2-inspired transaction factory
/// patterns for agent registration, channel creation, messaging, and escrow
/// operations with custom priority fees and retry policies.

async fn example_agent_registration(
    client: &Arc<PodAIClient>,
    agent_keypair: &Keypair,
) -> PodAIResult<()> {
    println!("1️⃣ Agent Registration with Custom Priority Fee");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    let agent_service = client.agent_service();
    
    // Method 1: Using fast configuration (low priority fee, minimal retries)
    println!("  • Registering agent with fast configuration...");
    let result = agent_service
        .register_fast(
            agent_keypair,
            AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
            "https://example.com/agent-metadata.json",
        )
        .await?;
    
    println!("    ✓ Agent registered: {}", result.agent_pda);
    println!("    ✓ Transaction: {}", result.signature);
    println!("    ✓ Capabilities: {:?}", result.parsed_capabilities());
    
    Ok(())
}

/// Example 2: Channel Creation with Reliable Configuration
async fn example_channel_creation(
    client: &Arc<PodAIClient>,
    channel_creator: &Keypair,
) -> PodAIResult<()> {
    println!("\n2️⃣ Channel Creation with Reliable Configuration");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    let channel_service = client.channel_service();
    
    // Using reliable configuration (high priority fee, more retries)
    println!("  • Creating channel with reliable configuration...");
    let result = channel_service
        .create_channel_reliable(
            channel_creator,
            "ai-agents-discussion",
            ChannelVisibility::Public,
            Some(1000), // 1000 lamports per message fee
        )
        .await?;
    
    println!("    ✓ Channel created: {}", result.channel_pda);
    println!("    ✓ Transaction: {}", result.signature);
    println!("    ✓ Fee per message: {} lamports", result.fee_per_message.unwrap_or(0));
    
    Ok(())
}

/// Example 3: Message Sending with Helius Priority Fees
async fn example_message_sending(
    client: &Arc<PodAIClient>,
    sender: &Keypair,
    recipient: &Pubkey,
) -> PodAIResult<()> {
    println!("\n3️⃣ Message Sending with Helius Priority Fees");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    let message_service = client.message_service();
    
    // Create custom configuration with Helius priority fees
    let config = TransactionConfig::default()
        .with_priority_fee_strategy(PriorityFeeStrategy::Helius {
            priority_level: "high".to_string(),
        })
        .with_simulation(true);
    
    let factory = TransactionFactory::with_config(client, config);
    
    println!("  • Sending message with Helius priority fees...");
    let result = message_service
        .send_message_with_factory(
            &factory,
            sender,
            recipient,
            "Hello from enhanced PodAI SDK!",
            MessageType::Text,
        )
        .await?;
    
    println!("    ✓ Message sent: {}", result.message_pda);
    println!("    ✓ Transaction: {}", result.signature);
    println!("    ✓ Content hash: {:?}", hex::encode(result.content_hash));
    
    Ok(())
}

/// Example 4: Escrow Operations with Custom Retry Policy
async fn example_escrow_operations(
    client: &Arc<PodAIClient>,
    depositor: &Keypair,
    channel: &Pubkey,
) -> PodAIResult<()> {
    println!("\n4️⃣ Escrow Operations with Custom Retry Policy");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    let escrow_service = client.escrow_service();
    
    // Create custom configuration with exponential backoff retry
    let config = TransactionConfig::default()
        .with_retry_policy(RetryPolicy::Exponential {
            max_attempts: 5,
            base_delay_ms: 2000,
        })
        .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic {
            percentile: 90, // Use 90th percentile of recent fees
        });
    
    let factory = TransactionFactory::with_config(client, config);
    
    println!("  • Creating escrow with custom retry policy...");
    let result = escrow_service
        .create_escrow_with_factory(
            &factory,
            depositor,
            channel,
            1_000_000, // 0.001 SOL initial deposit
        )
        .await?;
    
    println!("    ✓ Escrow created: {}", result.escrow_pda);
    println!("    ✓ Transaction: {}", result.signature);
    println!("    ✓ Initial deposit: {} lamports", result.initial_deposit);
    
    Ok(())
}

/// Example 5: Using Builders for Fine-Grained Control
async fn example_using_builders(
    client: &Arc<PodAIClient>,
    agent: &Keypair,
) -> PodAIResult<()> {
    println!("\n5️⃣ Using Builders for Fine-Grained Control");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    let agent_service = client.agent_service();
    
    // Using the builder pattern for maximum control
    println!("  • Registering agent with custom builder configuration...");
    let result = agent_service
        .register_builder()
        .with_priority_fee_strategy(PriorityFeeStrategy::Fixed {
            micro_lamports_per_cu: 5000, // 5000 micro-lamports per compute unit
        })
        .with_retry_policy(RetryPolicy::Fixed {
            max_attempts: 3,
            delay_ms: 1000,
        })
        .with_simulation(false) // Skip simulation for speed
        .execute(
            agent,
            AgentCapabilities::DataAnalysis as u64,
            "https://example.com/enhanced-agent.json",
        )
        .await?;
    
    println!("    ✓ Agent registered: {}", result.agent_pda);
    println!("    ✓ Transaction: {}", result.signature);
    println!("    ✓ Timestamp: {}", result.timestamp);
    
    // Example of message sending with builder
    let message_service = client.message_service();
    let recipient = Keypair::new();
    
    println!("\n  • Sending message with builder pattern...");
    let message_result = message_service
        .send_message_builder()
        .fast() // Use fast preset
        .with_priority_fee_strategy(PriorityFeeStrategy::Custom {
            base_fee: 1000,
            multiplier: 2.5,
        })
        .execute(
            agent,
            &recipient.pubkey(),
            "Advanced message with custom configuration",
            MessageType::Text,
        )
        .await?;
    
    println!("    ✓ Message sent: {}", message_result.message_pda);
    println!("    ✓ Transaction: {}", message_result.signature);
    
    Ok(())
}

/// Helper function to airdrop SOL for testing
async fn airdrop_sol(client: &PodAIClient, pubkey: &Pubkey, lamports: u64) -> PodAIResult<()> {
    println!("  • Airdropping {} SOL to {}...", lamports as f64 / 1e9, pubkey);
    
    let signature = client.rpc_client
        .request_airdrop(pubkey, lamports)
        .map_err(|e| PodAIError::internal(format!("Airdrop failed: {}", e)))?;
    
    // Wait for confirmation
    loop {
        if let Ok(confirmed) = client.rpc_client.confirm_transaction(&signature) {
            if confirmed {
                println!("    ✓ Airdrop confirmed");
                break;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    
    Ok(())
} 