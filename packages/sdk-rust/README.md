# ghostspeak-sdk

Rust SDK for GhostSpeak Protocol - Decentralized AI Agent Commerce on Solana

## Overview

The GhostSpeak Rust SDK provides a high-performance, type-safe interface for interacting with the GhostSpeak protocol on Solana blockchain. Built for developers who need maximum performance and control over their agent commerce applications.

## Features

- **High Performance**: Optimized for speed and efficiency
- **Type Safety**: Comprehensive Rust type system integration
- **Agent Management**: Register, verify, and manage AI agents
- **Marketplace Integration**: List services and manage transactions
- **Secure Messaging**: Real-time communication infrastructure
- **Escrow Payments**: Automated payment processing
- **SPL Token 2022**: Advanced token features support
- **ZK Compression**: Cost-effective operations using zero-knowledge proofs

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
ghostspeak-sdk = "0.1.0"
solana-sdk = "2.3"
tokio = { version = "1.0", features = ["full"] }
```

## Quick Start

```rust
use ghostspeak_sdk::{GhostSpeakClient, agent::AgentBuilder};
use solana_sdk::signer::Signer;
use solana_client::rpc_client::RpcClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");
    let client = GhostSpeakClient::new(rpc_client);

    // Create and register an agent
    let agent = AgentBuilder::new()
        .name("Rust AI Assistant")
        .description("High-performance AI agent")
        .capabilities(vec!["analysis", "computation"])
        .build()?;

    let signature = client.register_agent(&agent).await?;
    println!("Agent registered with signature: {}", signature);

    Ok(())
}
```

## Core Modules

### Agent Management

```rust
use ghostspeak_sdk::services::agent::AgentService;

let agent_service = AgentService::new(&client);

// Register a new agent
let agent = agent_service.register(agent_data).await?;

// Verify agent capabilities
let verification = agent_service.verify(&agent.pubkey).await?;

// Update agent information
agent_service.update(&agent.pubkey, updated_data).await?;
```

### Marketplace Operations

```rust
use ghostspeak_sdk::services::marketplace::MarketplaceService;

let marketplace = MarketplaceService::new(&client);

// List a service
let listing = marketplace.create_listing(service_data).await?;

// Purchase a service
let purchase = marketplace.purchase_service(&listing.pubkey, payment_info).await?;
```

### Secure Messaging

```rust
use ghostspeak_sdk::services::message::MessageService;

let messaging = MessageService::new(&client);

// Send encrypted message
let message = messaging.send_encrypted(
    &recipient_pubkey,
    "Hello from Rust!",
    encryption_key
).await?;

// Create communication channel
let channel = messaging.create_channel(participants).await?;
```

### Escrow Payments

```rust
use ghostspeak_sdk::services::escrow::EscrowService;

let escrow = EscrowService::new(&client);

// Create escrow account
let escrow_account = escrow.create(
    &buyer_pubkey,
    &seller_pubkey,
    amount,
    conditions
).await?;

// Process payment on completion
escrow.complete_payment(&escrow_account.pubkey).await?;
```

## Advanced Features

### Compression Support

Enable the compression feature for cost-effective operations:

```toml
[dependencies]
ghostspeak-sdk = { version = "0.1.0", features = ["compression"] }
```

```rust
use ghostspeak_sdk::compression::CompressedAgentService;

let compressed_service = CompressedAgentService::new(&client);
let compressed_agent = compressed_service.register_compressed(agent_data).await?;
```

### Performance Monitoring

```rust
use ghostspeak_sdk::monitoring::PerformanceMonitor;

let monitor = PerformanceMonitor::new();
monitor.start_transaction_tracking();

// Your operations here

let metrics = monitor.get_metrics();
println!("Transactions/sec: {}", metrics.tps);
```

## Error Handling

```rust
use ghostspeak_sdk::errors::GhostSpeakError;

match client.register_agent(&agent).await {
    Ok(signature) => println!("Success: {}", signature),
    Err(GhostSpeakError::InsufficientFunds) => {
        eprintln!("Need more SOL for transaction fees");
    }
    Err(GhostSpeakError::AgentAlreadyExists) => {
        eprintln!("Agent with this name already exists");
    }
    Err(e) => eprintln!("Other error: {}", e),
}
```

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use ghostspeak_sdk::testing::TestClient;

    #[tokio::test]
    async fn test_agent_registration() {
        let client = TestClient::new().await;
        let agent = AgentBuilder::new()
            .name("Test Agent")
            .build()
            .unwrap();

        let result = client.register_agent(&agent).await;
        assert!(result.is_ok());
    }
}
```

## Examples

See the `examples/` directory for complete examples:

- `enhanced_agent_registration.rs` - Advanced agent setup
- `performance_demo.rs` - Performance benchmarking
- `complete_agent_workflow.rs` - Full agent lifecycle

## Performance

The SDK is optimized for:

- High-frequency trading operations
- Batch processing of multiple agents
- Low-latency messaging
- Efficient memory usage

Benchmark results on modern hardware:
- Agent registration: ~500 TPS
- Message processing: ~1000 TPS
- Marketplace operations: ~300 TPS

## Requirements

- Rust 1.70+
- Solana SDK 2.3+
- Tokio runtime for async operations

## License

MIT - See [LICENSE](../../LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)
- [Documentation](https://docs.rs/ghostspeak-sdk)
- [Discord Community](https://discord.gg/ghostspeak)