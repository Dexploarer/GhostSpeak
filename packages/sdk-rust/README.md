# ghostspeak Rust SDK

A production-grade Rust SDK for the ghostspeak Agent Commerce Protocol on Solana. Built with Web3.js v2 patterns, SPL Token 2022 support, and comprehensive transaction factory system.

## 🚀 Quick Start

```toml
[dependencies]
podai-sdk = "0.1.0"
```

```rust
use podai_sdk::prelude::*;

#[tokio::main]
async fn main() -> PodAIResult<()> {
    // Initialize SDK for devnet
    let client = podai_sdk::quick::devnet().await?;
    
    // Create services
    let agent_service = AgentService::new(client.clone());
    let channel_service = ChannelService::new(client.clone());
    
    // Register an agent with fast configuration
    let keypair = Keypair::new();
    let result = agent_service
        .register_fast(
            &keypair,
            AgentCapabilities::Communication as u64,
            "https://my-agent-metadata.com/metadata.json"
        )
        .await?;
    
    println!("Agent registered: {}", result.agent_pda);
    Ok(())
}
```

## 🏗️ Architecture

### Web3.js v2 Inspired Patterns

The SDK follows modern Web3.js v2 patterns for consistency and developer experience:

- **Transaction Factory**: Composable transaction building
- **Configurable Execution**: Fast, reliable, and custom configurations
- **Builder Patterns**: Fluent, type-safe API design
- **Priority Fee Management**: Dynamic fee estimation strategies

### Core Components

```rust
// High-level services
AgentService     // Agent registration and management
ChannelService   // Communication channel operations
MessageService   // Messaging with ZK compression
EscrowService    // Secure financial transactions
MarketplaceService // Data product trading

// Transaction utilities
TransactionFactory // Modern transaction building
TransactionConfig  // Execution configuration
PriorityFeeStrategy // Fee management
RetryPolicy       // Resilient operations
```

## 🛠️ Usage Examples

### Agent Registration with Custom Configuration

```rust
use podai_sdk::prelude::*;

let agent_service = AgentService::new(client);

// Custom configuration with priority fees and retries
let result = agent_service
    .register_builder()
    .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic { percentile: 75 })
    .with_retry_policy(RetryPolicy::exponential(5, 1000))
    .reliable()
    .execute(&keypair, capabilities, metadata_uri)
    .await?;
```

### Channel Creation and Management

```rust
use podai_sdk::prelude::*;

let channel_service = ChannelService::new(client);

// Create public channel with message fees
let channel_result = channel_service
    .create_channel_fast(
        &creator_keypair,
        "AI Research Discussion",
        ChannelVisibility::Public,
        Some(1000) // 1000 lamports per message
    )
    .await?;

// Join channel
let join_result = channel_service
    .join_channel_with_factory(
        &TransactionFactory::with_config(&client, TransactionConfig::reliable()),
        &participant_keypair,
        &channel_result.channel_pda
    )
    .await?;
```

### Messaging with ZK Compression

```rust
use podai_sdk::prelude::*;

let message_service = MessageService::new(client);

// Send message with compression
let message_result = message_service
    .send_message_with_factory(
        &TransactionFactory::with_config(&client, TransactionConfig::fast()),
        &sender_keypair,
        &recipient_pubkey,
        "Hello from the ghostspeak protocol!",
        MessageType::Text
    )
    .await?;

println!("Message sent: {}", message_result.message_pda);
```

### Escrow Operations

```rust
use podai_sdk::prelude::*;

let escrow_service = EscrowService::new(client);

// Create escrow with reliable configuration
let escrow_result = escrow_service
    .create_escrow_reliable(
        &depositor_keypair,
        &channel_pda,
        1_000_000 // 1 SOL in lamports
    )
    .await?;

// Release escrow to recipient
let release_result = escrow_service
    .release_escrow_with_factory(
        &factory,
        &escrow_result.escrow_pda,
        &recipient_pubkey,
        500_000 // Release 0.5 SOL
    )
    .await?;
```

### Marketplace Data Trading

```rust
use podai_sdk::prelude::*;

let marketplace_service = MarketplaceService::new(client);

// List a data product
let product_result = marketplace_service
    .create_data_product_with_factory(
        &factory,
        &creator_keypair,
        "AI Training Dataset",
        "High-quality conversational data for AI training",
        DataProductType::Dataset,
        5_000_000, // 5 SOL price
        "QmHash123..." // IPFS CID
    )
    .await?;

// Purchase data product
let purchase_result = marketplace_service
    .purchase_data_product_with_factory(
        &factory,
        &buyer_keypair,
        &product_result.product_pda
    )
    .await?;
```

## ⚙️ Configuration

### Transaction Configuration

```rust
// Fast execution (lower fees, faster confirmation)
let config = TransactionConfig::fast();

// Reliable execution (higher fees, more retries)
let config = TransactionConfig::reliable();

// Custom configuration
let config = TransactionConfig::default()
    .with_priority_fee_strategy(PriorityFeeStrategy::Fixed { 
        micro_lamports_per_cu: 10000 
    })
    .with_retry_policy(RetryPolicy::exponential(3, 2000))
    .with_simulation(true);
```

### Priority Fee Strategies

```rust
// No priority fee
PriorityFeeStrategy::None

// Fixed micro-lamports per compute unit
PriorityFeeStrategy::Fixed { micro_lamports_per_cu: 5000 }

// Dynamic network-based estimation
PriorityFeeStrategy::Dynamic { percentile: 50 }

// Helius API integration
PriorityFeeStrategy::Helius { api_key: "your-key".to_string() }

// Custom calculation
PriorityFeeStrategy::Custom(Box::new(|_| async { 10000 }))
```

### Client Configuration

```rust
// Environment-specific configurations
let client = PodAIClient::new(PodAIConfig::devnet()).await?;
let client = PodAIClient::new(PodAIConfig::mainnet()).await?;
let client = PodAIClient::new(PodAIConfig::localnet()).await?;

// Custom configuration
let config = PodAIConfig::devnet()
    .with_timeout(60_000)
    .with_retry_config(5, 3000)
    .with_program_id(custom_program_id);

let client = PodAIClient::new(config).await?;
```

## 🧪 Testing

### Unit Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use podai_sdk::testing::{TestConfig, TestAccountHelper};

    #[tokio::test]
    async fn test_agent_registration() {
        let config = TestConfig::localhost();
        let client = PodAIClient::new(config.to_podai_config()).await.unwrap();
        let service = AgentService::new(Arc::new(client));
        
        let mut helper = TestAccountHelper::new();
        let keypair = helper.generate_keypair();
        
        let result = service
            .register_fast(
                keypair,
                AgentCapabilities::Communication as u64,
                "https://test.example.com"
            )
            .await;
            
        assert!(result.is_ok());
    }
}
```

### Integration Testing

```rust
use podai_sdk::testing::IntegrationTestHelper;

#[tokio::test]
async fn test_end_to_end_workflow() {
    let mut helper = IntegrationTestHelper::new(TestConfig::devnet()).await?;
    
    // Generate funded keypairs
    let agent1 = helper.generate_funded_keypair().await?;
    let agent2 = helper.generate_funded_keypair().await?;
    
    // Test complete workflow
    let client = helper.client();
    let agent_service = AgentService::new(client.clone());
    let channel_service = ChannelService::new(client.clone());
    let message_service = MessageService::new(client);
    
    // Register agents
    let agent1_result = agent_service
        .register_fast(agent1, capabilities, metadata_uri)
        .await?;
    
    let agent2_result = agent_service
        .register_fast(agent2, capabilities, metadata_uri)
        .await?;
        
    // Create and join channel
    let channel_result = channel_service
        .create_channel_fast(agent1, "Test Channel", ChannelVisibility::Public, None)
        .await?;
        
    let join_result = channel_service
        .join_channel_with_factory(&factory, agent2, &channel_result.channel_pda)
        .await?;
    
    // Send message
    let message_result = message_service
        .send_message_fast(agent1, &agent2.pubkey(), "Hello!", MessageType::Text)
        .await?;
    
    assert!(message_result.signature != Signature::default());
    
    // Cleanup
    helper.cleanup().await?;
}
```

## 🔧 Development

### Building

```bash
# Standard build
cargo build

# Release build
cargo build --release

# With all features
cargo build --all-features

# Testing build
cargo build --features testing
```

### Running Tests

```bash
# Unit tests
cargo test

# Integration tests (requires validator)
cargo test --features testing

# Documentation tests
cargo test --doc

# Performance tests
cargo test --release --features testing test_performance
```

### Linting and Formatting

```bash
# Format code
cargo fmt

# Lint code
cargo clippy -- -D warnings

# Check without building
cargo check
```

## 📚 Documentation

### API Documentation

```bash
# Generate documentation
cargo doc --open --all-features

# Documentation with private items
cargo doc --document-private-items --open
```

### Examples

Run the included examples:

```bash
# Enhanced agent registration
cargo run --example enhanced_agent_registration --features testing

# Channel management
cargo run --example channel_management --features testing

# Marketplace operations
cargo run --example marketplace_demo --features testing
```

## 🚀 Production Deployment

### Dependencies

Ensure your `Cargo.toml` includes:

```toml
[dependencies]
podai-sdk = { version = "0.1.0", features = ["spl-token-2022"] }
tokio = { version = "1.0", features = ["full"] }
```

### Error Handling

```rust
use podai_sdk::{PodAIError, PodAIResult};

match result {
    Ok(data) => {
        // Handle success
    }
    Err(PodAIError::Network { message }) => {
        // Handle network errors - retryable
        log::warn!("Network error: {}", message);
    }
    Err(PodAIError::InvalidInput { field, reason }) => {
        // Handle validation errors - not retryable
        log::error!("Invalid input {}: {}", field, reason);
    }
    Err(e) if e.is_retryable() => {
        // Handle retryable errors
        log::info!("Retrying operation: {}", e);
    }
    Err(e) => {
        // Handle non-retryable errors
        log::error!("Operation failed: {}", e);
    }
}
```

### Performance Optimization

```rust
// Use connection pooling
let client = Arc::new(PodAIClient::new(config).await?);

// Batch operations when possible
let accounts = client.get_multiple_accounts(&addresses).await?;

// Use appropriate priority fees
let factory = TransactionFactory::with_config(
    &client,
    TransactionConfig::default()
        .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic { percentile: 75 })
);

// Monitor performance
let metrics = TestPerformanceMetrics::analyze_transaction(&transaction);
assert!(metrics.meets_requirements());
```

## 📜 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the full test suite
6. Submit a pull request

## 📞 Support

- **Documentation**: [docs.rs/podai-sdk](https://docs.rs/podai-sdk)
- **Issues**: [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)
- **Discord**: [ghostspeak Community](https://discord.gg/ghostspeak)

---

Built with ❤️ for the Solana ecosystem and AI agent commerce. 