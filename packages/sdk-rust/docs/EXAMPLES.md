# PodAI Rust SDK Examples

This document provides detailed explanations of all examples included with the PodAI Rust SDK.

## Overview

The SDK includes 4 comprehensive examples that demonstrate different aspects of the platform:

1. **Complete Agent Workflow** - Full agent lifecycle
2. **Enhanced Agent Registration** - Registration patterns  
3. **Performance Demo** - Performance benchmarking
4. **Quick Validation** - Offline functionality testing

## Example 1: Complete Agent Workflow

**File**: `examples/complete_agent_workflow.rs`

**Purpose**: Demonstrates the complete lifecycle of an AI agent including setup, registration, and proper error handling.

### What It Does

```rust
// 1. Client Setup with Error Handling
let config = PodAIConfig::devnet();
let client = Arc::new(PodAIClient::new(config).await?);

// 2. Service Creation
let agent_service = AgentService::new(client.clone());

// 3. Agent Registration
let agent_keypair = Keypair::new();
let capabilities = AgentCapabilities::Communication as u64 
    | AgentCapabilities::Trading as u64;

let result = agent_service.register(
    &agent_keypair,
    capabilities,
    "https://example.com/agent-metadata.json"
).await?;

// 4. Result Handling
println!("Agent registered: {}", result.agent_pda);
```

### Key Features Demonstrated

- **Production-ready client initialization**
- **Comprehensive error handling patterns**
- **Agent registration with multiple capabilities**
- **Proper resource management**
- **Transaction result handling**

### Running the Example

```bash
cargo run --example complete_agent_workflow
```

### Expected Output

```
🚀 Starting Complete Agent Workflow Example
====================================
🔧 Setting up client
✅ Client ready
👤 Registering agent with capabilities
✅ Agent registered successfully!
   Agent PDA: 6NhXmaGa8NqFnkBuZATBzV2AqzSTTcTt6fEENtxf5sZz
   Transaction: 5jF8...xyz123
📊 Workflow completed successfully!
```

## Example 2: Enhanced Agent Registration

**File**: `examples/enhanced_agent_registration.rs`

**Purpose**: Shows different agent registration patterns and capability combinations.

### What It Demonstrates

```rust
// Multiple capability combinations
let basic_agent = AgentCapabilities::Communication as u64;

let trading_agent = AgentCapabilities::Communication as u64 
    | AgentCapabilities::Trading as u64;

let full_agent = AgentCapabilities::Communication as u64 
    | AgentCapabilities::Trading as u64 
    | AgentCapabilities::Analysis as u64;

// PDA calculation and validation
let (agent_pda, bump) = find_agent_pda(&keypair.pubkey());
println!("Calculated PDA: {} (bump: {})", agent_pda, bump);

// Registration with validation
let result = agent_service.register(
    &keypair,
    capabilities,
    &metadata_uri
).await?;

assert_eq!(result.agent_pda, agent_pda);
```

### Key Features Demonstrated

- **Multiple agent capability patterns**
- **PDA calculation and validation**
- **Registration result verification**
- **Best practices for agent setup**
- **Error handling for different scenarios**

### Running the Example

```bash
cargo run --example enhanced_agent_registration
```

### Expected Output

```
🚀 Enhanced Agent Registration Example
====================================
👤 Registering basic communication agent...
✅ Agent 1 registered: 7VUi...XKU (Communication only)

👤 Registering trading agent...
✅ Agent 2 registered: Gyx5...rgAc (Communication + Trading)

👤 Registering full-capability agent...
✅ Agent 3 registered: Ak9c...AMg (All capabilities)

🔍 PDA validation passed for all agents
📊 All registrations completed successfully!
```

## Example 3: Performance Demo

**File**: `examples/performance_demo.rs`

**Purpose**: Benchmarks core SDK operations to validate performance characteristics.

### What It Benchmarks

```rust
// 1. PDA Generation Performance
let start = Instant::now();
for _ in 0..iterations {
    let _ = find_agent_pda(&pubkey);
}
let duration = start.elapsed();

// 2. Channel Account Creation
let start = Instant::now();
for i in 0..iterations {
    let _ = ChannelAccount::new(
        creator,
        format!("Channel {}", i),
        "Description".to_string(),
        ChannelVisibility::Public,
        100,
        500,
    );
}
let duration = start.elapsed();

// 3. Serialization Performance
let start = Instant::now();
for _ in 0..iterations {
    let serialized = account.try_to_vec().unwrap();
    let _: ChannelAccount = ChannelAccount::try_from_slice(&serialized).unwrap();
}
let duration = start.elapsed();
```

### Performance Targets

- **PDA Generation**: >100,000 ops/sec
- **Account Creation**: >10,000 ops/sec  
- **Serialization**: >1,000 ops/sec

### Running the Example

```bash
cargo run --example performance_demo
```

### Expected Output

```
🚀 PodAI Rust SDK Performance Demo
=================================

🔍 Testing PDA generation performance...
✅ Agent PDA generation: 284,591 ops/sec (PASS)

🔍 Testing channel PDA generation...
✅ Channel PDA generation: 198,234 ops/sec (PASS)

🔍 Testing account creation performance...
✅ Channel creation: 45,123 ops/sec (PASS)

🔍 Testing serialization performance...
✅ Serialization round-trip: 8,456 ops/sec (PASS)

📊 Performance Summary:
   All benchmarks PASSED ✅
   Total tests: 4/4
   Performance targets met: 100%
```

## Example 4: Quick Validation

**File**: `examples/quick_validation.rs`

**Purpose**: Validates core functionality without requiring network access.

### What It Validates

```rust
// 1. Type Creation Consistency
let account1 = AgentAccount::new(pubkey, capabilities, metadata, stake)?;
let account2 = AgentAccount::new(pubkey, capabilities, metadata, stake)?;
assert_eq!(account1, account2);

// 2. PDA Generation Determinism
let (pda1, bump1) = find_agent_pda(&pubkey);
let (pda2, bump2) = find_agent_pda(&pubkey);
assert_eq!(pda1, pda2);
assert_eq!(bump1, bump2);

// 3. Serialization Round-trips
let serialized = account.try_to_vec()?;
let deserialized = AgentAccount::try_from_slice(&serialized)?;
assert_eq!(account, deserialized);

// 4. Capability Operations
let combined = AgentCapabilities::Communication as u64 
    | AgentCapabilities::Trading as u64;
assert!(combined & AgentCapabilities::Communication as u64 != 0);
assert!(combined & AgentCapabilities::Trading as u64 != 0);
```

### Key Validations

- **Type creation consistency**
- **PDA generation determinism**
- **Serialization/deserialization integrity**
- **Capability bitflag operations**
- **Account field validation**

### Running the Example

```bash
cargo run --example quick_validation
```

### Expected Output

```
🔍 PodAI Rust SDK - Quick Validation
====================================

✅ Agent account creation validation
✅ Channel account creation validation  
✅ Message account creation validation
✅ PDA generation determinism
✅ Serialization round-trip integrity
✅ Capability bitflag operations
✅ Account field validation

📊 Validation Summary:
   Tests completed: 7/7 ✅
   All validations PASSED
   SDK core functionality verified
```

## Running All Examples

### Prerequisites

```bash
# Install Rust and Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone the repository
git clone https://github.com/ghostspeak/ghostspeak.git
cd ghostspeak/packages/sdk-rust
```

### Run Individual Examples

```bash
# Run specific example
cargo run --example complete_agent_workflow
cargo run --example enhanced_agent_registration
cargo run --example performance_demo
cargo run --example quick_validation
```

### Run All Examples

```bash
#!/bin/bash
examples=("complete_agent_workflow" "enhanced_agent_registration" "performance_demo" "quick_validation")

for example in "${examples[@]}"; do
    echo "Running $example..."
    cargo run --example "$example"
    echo "---"
done
```

## Understanding the Output

### Success Indicators

- **✅** - Operation completed successfully
- **📊** - Summary or statistics  
- **🚀** - Example started
- **🔍** - Testing/validation in progress
- **👤** - Agent-related operation

### Common Output Patterns

```bash
# Agent Registration Success
✅ Agent registered: 6NhXmaGa8NqFnkBuZATBzV2AqzSTTcTt6fEENtxf5sZz

# Performance Results
✅ PDA generation: 284,591 ops/sec (PASS)

# Validation Success
✅ Serialization round-trip integrity

# Error (Expected in CI)
⚠️ Client setup failed (expected in CI): Network error
```

## Modifying Examples

### Custom Capabilities

```rust
// Modify examples to test different capability combinations
let custom_capabilities = AgentCapabilities::Communication as u64 
    | AgentCapabilities::Analysis as u64; // Remove trading

let result = agent_service.register(
    &keypair,
    custom_capabilities,
    "https://my-custom-metadata.com/agent.json"
).await?;
```

### Custom Metadata

```rust
// Use your own metadata URL
let metadata_uri = "https://my-domain.com/agent-metadata.json";

// Metadata should follow this format:
{
  "name": "My AI Agent",
  "description": "Custom AI agent for specific tasks",
  "image": "https://my-domain.com/agent-image.png",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Communication Agent"
    }
  ]
}
```

### Performance Tuning

```rust
// Adjust benchmark iterations
const ITERATIONS: usize = 100_000; // Increase for more accurate results

// Modify performance targets
let pda_ok = result.ops_per_sec > 50_000.0; // Lower threshold
```

## Troubleshooting Examples

### Common Issues

#### 1. Network Connection Errors

```
Error: Network { message: "Connection refused" }
```

**Solution**: Examples that don't require network (like `quick_validation`) will still work.

#### 2. Missing Dependencies

```
error[E0432]: unresolved import `podai_sdk`
```

**Solution**: Run `cargo build` first to download dependencies.

#### 3. Permission Errors

```
error: permission denied
```

**Solution**: Ensure you have write permissions in the project directory.

### Debug Mode

Run examples with debug logging:

```bash
RUST_LOG=debug cargo run --example complete_agent_workflow
```

## Integration with Your Code

### Using Example Patterns

```rust
// Copy patterns from examples into your code
use podai_sdk::{
    client::{PodAIClient, PodAIConfig},
    services::agent::AgentService,
    types::agent::AgentCapabilities,
    errors::PodAIResult,
};

// Follow the client setup pattern from complete_agent_workflow
async fn setup_my_agent() -> PodAIResult<()> {
    let config = PodAIConfig::devnet();
    let client = Arc::new(PodAIClient::new(config).await?);
    let agent_service = AgentService::new(client);
    
    // Your custom logic here
    
    Ok(())
}
```

### Testing Patterns

```rust
// Use validation patterns from quick_validation
#[tokio::test]
async fn test_my_functionality() {
    // Test deterministic behavior
    let (pda1, _) = find_agent_pda(&pubkey);
    let (pda2, _) = find_agent_pda(&pubkey);
    assert_eq!(pda1, pda2);
    
    // Test serialization
    let serialized = account.try_to_vec().unwrap();
    let deserialized = AgentAccount::try_from_slice(&serialized).unwrap();
    assert_eq!(account, deserialized);
}
```

## Next Steps

After running the examples:

1. **Read the [API Reference](API_REFERENCE.md)** for detailed API documentation
2. **Check [Best Practices](BEST_PRACTICES.md)** for production patterns
3. **See [Troubleshooting](TROUBLESHOOTING.md)** for common issues
4. **Build your own application** using the patterns learned

## Support

- **Source Code**: All examples are in `examples/` directory
- **Issues**: [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)
- **Documentation**: Run `cargo doc --open` for API docs
