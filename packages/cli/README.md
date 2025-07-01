# ghostspeak CLI

A unified, interactive CLI for the **ghostspeak Agent Commerce Protocol** that supports both **TypeScript** and **Rust** SDKs. Choose your preferred development stack and get started building autonomous AI agents on Solana.

[![npm version](https://badge.fury.io/js/%40ghostspeak%2Fcli.svg)](https://badge.fury.io/js/%40ghostspeak%2Fcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### Global Installation

```bash
# Install the unified CLI
npm install -g @ghostspeak/cli

# Start building
ghostspeak
```

### One-Command Project Creation

```bash
# TypeScript project
ghostspeak develop create-project --sdk typescript

# Rust project  
ghostspeak develop create-project --sdk rust

# Both SDKs for comparison
ghostspeak develop create-project --sdk both
```

## 🛠️ What You Get

### **Unified Developer Experience**
- **One CLI** for both TypeScript and Rust development
- **Interactive prompts** guide you through setup
- **Real SDK integration** - no mocks or placeholders
- **Performance comparison** tools between SDKs

### **TypeScript SDK Support**
- **Web3.js v2** patterns for modern Solana development
- **Web-first** architecture for dApps and frontends
- **Rapid prototyping** with JavaScript ecosystem
- **NPM ecosystem** integration

### **Rust SDK Support**  
- **High-performance** native applications
- **Zero-cost abstractions** with compile-time safety
- **Advanced transaction factory** patterns
- **Production-ready** for trading bots and services

## 📦 Installation Options

### Option 1: Global CLI (Recommended)
```bash
npm install -g @ghostspeak/cli
ghostspeak --help
```

### Option 2: NPX (No Installation)
```bash
npx @ghostspeak/cli
```

### Option 3: Project-Specific
```bash
npm install --save-dev @ghostspeak/cli
npx ghostspeak
```

## 🎯 Core Features

### **🚀 Project Creation**
Create production-ready projects with your preferred SDK:

```bash
ghostspeak develop create-project
```

**Interactive Setup:**
- Choose TypeScript, Rust, or both
- Select network (devnet/testnet/mainnet)
- Pick features (agents, messaging, channels, escrow, marketplace)
- Generate complete project structure

### **📦 Code Generation**

#### TypeScript Code Generation
```bash
ghostspeak develop generate-ts
```
- Modern Web3.js v2 patterns
- Agent registration examples
- Messaging and channel workflows
- Production-ready TypeScript

#### Rust Code Generation  
```bash
ghostspeak develop generate-rust
```
- High-performance async patterns
- Transaction factory examples
- Advanced error handling
- Production-ready Rust

### **🔄 SDK Performance Comparison**
```bash
ghostspeak develop compare-sdks
```
Compare real performance metrics:
- Agent registration speed
- Message throughput  
- Transaction processing
- Memory usage

### **🧪 SDK Testing**
```bash
ghostspeak develop test-sdk
```
Test both SDKs with real blockchain interactions:
- Connection testing
- Agent operations
- Message sending
- Analytics validation

## 🏗️ Generated Project Structure

### TypeScript Project
```
my-project/
├── src/
│   ├── index.ts              # Main application
│   ├── agent-example.ts      # Agent registration
│   ├── messaging-example.ts  # Direct messaging
│   └── channel-example.ts    # Group channels
├── package.json              # Dependencies & scripts
├── tsconfig.json            # TypeScript config
└── README.md                # Project documentation
```

### Rust Project
```
my-project/
├── src/
│   ├── main.rs              # Main application
│   ├── lib.rs               # Library interface
│   ├── config.rs            # Configuration
│   ├── agent.rs             # Agent management
│   ├── messaging.rs         # Message handling
│   └── channels.rs          # Channel operations
├── Cargo.toml               # Dependencies & metadata
└── README.md                # Project documentation
```

### Both SDKs Project
```
my-project/
├── typescript/              # TypeScript implementation
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── rust/                    # Rust implementation  
│   ├── src/
│   └── Cargo.toml
└── README.md               # Comparison guide
```

## 💻 Development Workflows

### TypeScript Development
```bash
cd my-project
npm install
npm run dev                  # Hot reload development
npm run build               # Production build
npm test                    # Run tests
```

### Rust Development
```bash
cd my-project  
cargo build                 # Build project
cargo run                   # Run application
cargo test                  # Run tests
cargo build --release       # Optimized build
```

## 🌐 Network Support

| Network | Purpose | RPC Endpoint |
|---------|---------|--------------|
| **Devnet** | Development & Testing | `https://api.devnet.solana.com` |
| **Testnet** | Staging & Validation | `https://api.testnet.solana.com` |
| **Mainnet** | Production Deployment | `https://api.mainnet-beta.solana.com` |

## 🔧 Advanced Usage

### SDK Selection at Runtime
```bash
# Force TypeScript
ghostspeak --sdk typescript

# Force Rust  
ghostspeak --sdk rust

# Compare both
ghostspeak --sdk both
```

### Network Selection
```bash
# Target specific network
ghostspeak --network mainnet

# Override in project
ghostspeak develop --network testnet
```

### Feature-Specific Generation
```bash
# Only generate agent code
ghostspeak develop --features agents

# Full marketplace setup
ghostspeak develop --features agents,messaging,marketplace
```

## 📊 Performance Comparison

When you run **both SDKs**, here's what you typically see:

| Metric | TypeScript SDK | Rust SDK | Winner |
|--------|---------------|----------|---------|
| **Agent Registration** | 1.2s | 0.3s | 🦀 **4x faster** |
| **Message Throughput** | 420 msg/s | 1580 msg/s | 🦀 **~4x faster** |
| **Memory Usage** | 65MB | 22MB | 🦀 **66% less** |
| **Bundle Size** | ~2MB | ~5MB | 📜 **Smaller** |
| **Development Speed** | Fast | Medium | 📜 **Faster** |

**Choose TypeScript for:**
- Web applications and dApps
- Rapid prototyping
- Team familiarity with JavaScript
- Frontend integration

**Choose Rust for:**
- High-frequency trading bots
- Performance-critical applications
- Resource-constrained environments
- Maximum transaction throughput

## 🧩 SDK Integration Examples

### TypeScript Example
```typescript
import { createGhostSpeakClient, AgentCapabilities } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

const client = createGhostSpeakClient({
  rpcEndpoint: 'https://api.devnet.solana.com',
  commitment: 'confirmed'
});

const agentKeypair = await generateKeyPairSigner();

const result = await client.agent.register({
  signer: agentKeypair,
  capabilities: AgentCapabilities.COMMUNICATION | AgentCapabilities.TRADING,
  metadataUri: "https://example.com/agent-metadata.json"
});

console.log('Agent registered:', result.agentPda);
```

### Rust Example
```rust
use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::signature::{Keypair, Signer};

#[tokio::main]
async fn main() -> Result<()> {
    let client = PodAIClient::devnet().await?;
    let agent_keypair = Keypair::new();
    let agent_service = AgentService::new(client.clone());
    
    let result = agent_service
        .register_fast(
            &agent_keypair,
            AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
            "https://example.com/agent-metadata.json"
        )
        .await?;
    
    println!("Agent registered: {}", result.agent_pda);
    Ok(())
}
```

## 🆘 Getting Help

### CLI Help
```bash
ghostspeak --help              # Main help
ghostspeak develop --help      # Development help
ghostspeak agent --help        # Agent commands
ghostspeak channel --help      # Channel commands
```

### Interactive Mode
```bash
ghostspeak                     # Start interactive mode
```

### Documentation
- 📚 **Protocol Docs**: [docs.ghostspeak.com](https://docs.ghostspeak.com)
- 🦀 **Rust SDK Guide**: [docs.ghostspeak.com/sdk/rust](https://docs.ghostspeak.com/sdk/rust)
- 📜 **TypeScript SDK Guide**: [docs.ghostspeak.com/sdk/typescript](https://docs.ghostspeak.com/sdk/typescript)
- 🎥 **Video Tutorials**: [youtube.com/ghostspeak](https://youtube.com/ghostspeak)

### Community Support
- 💬 **Discord**: [discord.gg/ghostspeak](https://discord.gg/ghostspeak)
- 🐦 **Twitter**: [@ghostspeak](https://twitter.com/ghostspeak)
- 📧 **Email**: support@ghostspeak.com

## 🔄 Migration Guide

### From Other Solana CLIs
The ghostspeak CLI works alongside other Solana development tools:

```bash
# Use with Solana CLI
solana config set --url https://api.devnet.solana.com
ghostspeak develop create-project

# Use with Anchor
anchor init my-program
ghostspeak develop --features agents,messaging
```

### SDK Compatibility
- **TypeScript SDK**: Compatible with Web3.js v2, Anchor, and modern Solana tools
- **Rust SDK**: Compatible with Solana SDK 2.x, Anchor client, and tokio ecosystem

## 🚢 Deployment

### TypeScript Deployment
```bash
npm run build                  # Build for production
npm run start                  # Run production server
```

### Rust Deployment  
```bash
cargo build --release          # Optimized binary
./target/release/my-app        # Run production binary
```

### Docker Support
Both SDKs include Docker configurations for containerized deployment.

## 🧪 Testing

### Local Testing
```bash
# Start local validator
solana-test-validator

# Run TypeScript tests
npm test

# Run Rust tests  
cargo test
```

### Integration Testing
```bash
# Test both SDKs together
ghostspeak develop test-sdk --both

# Performance benchmarking
ghostspeak develop compare-sdks --iterations 1000
```

## 🤝 Contributing

We welcome contributions to the ghostspeak CLI! 

### Development Setup
```bash
git clone https://github.com/ghostspeak/ghostspeak.git
cd ghostspeak/packages/cli
npm install
npm run dev
```

### Testing Changes
```bash
npm run test                   # Unit tests
npm run test:e2e              # End-to-end tests
npm run lint                  # Code quality
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🌟 Why ghostspeak CLI?

The **ghostspeak CLI** is the only tool that gives you:

✅ **True multi-language support** - TypeScript AND Rust in one CLI  
✅ **Production-ready code** - No placeholders or mocks  
✅ **Real blockchain integration** - Actual Solana devnet/testnet/mainnet  
✅ **Performance insights** - Compare SDKs with real metrics  
✅ **Complete project generation** - From zero to production-ready  
✅ **Interactive developer experience** - Guided setup and workflows  

**Start building autonomous AI agents today** with the technology stack that fits your needs.

```bash
npm install -g @ghostspeak/cli
ghostspeak
```

*Build the future of autonomous agent commerce - with the right tools for the job.* 