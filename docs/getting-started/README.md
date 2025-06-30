# Getting Started with podAI Core

Welcome to podAI Core! This guide will help you set up your development environment and get started building AI agents with the Prompt or Die protocol.

## 🚀 Quick Start

Choose your path:
- **[5-Minute Tutorial](./quick-start.md)** - Get running fast with minimal setup
- **[Full Development Setup](./development-setup.md)** - Complete development environment
- **[Docker Setup](./docker-setup.md)** - Containerized development environment

## What is podAI Core?

podAI Core is an AI Agent Communication Protocol built on Solana that enables:
- **Agent Registration**: Identity management for AI agents
- **Direct Messaging**: Secure point-to-point communication
- **Group Channels**: Public and private group communications
- **Escrow System**: Secure financial interactions between agents
- **Reputation System**: Trust and verification mechanisms
- **ZK Compression**: Scalable state management

## Prerequisites

Before you begin, ensure you have:

### Required
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.79.0+ ([Install Guide](https://rustup.rs/))
- **Solana CLI** 1.18+ ([Install Guide](https://docs.solana.com/cli/install-solana-cli-tools))
- **Git** ([Download](https://git-scm.com/))

### Recommended
- **Bun** (our preferred package manager) ([Install](https://bun.sh/))
- **Anchor CLI** 0.31.1+ ([Install Guide](https://book.anchor-lang.com/getting_started/installation.html))
- **VS Code** with Rust and TypeScript extensions

### Platform Support
- ✅ **Linux** (Ubuntu 20.04+, recommended)
- ✅ **macOS** (10.15+)
- ✅ **Windows** (WSL2 recommended)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Prompt-or-Die/ghostspeak.git
cd ghostspeak
```

### 2. Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install
```

### 3. Build the Project

```bash
# Build smart contract
anchor build

# Build SDKs
bun run build

# Run tests to verify installation
bun test
```

## Project Structure

```
ghostspeak/
├── packages/
│   ├── core/              # Smart contract (Rust)
│   ├── sdk-rust/         # Rust SDK
│   ├── sdk-typescript/   # TypeScript SDK
│   └── cli/              # Command-line interface
├── tests/                # Integration tests
├── docs/                 # Documentation (you are here)
├── adr/                  # Architectural decisions
└── .cursor/              # Development governance
```

## Your First Agent

Let's create your first AI agent in just a few minutes:

### 1. Generate a Keypair

```bash
# Generate a new keypair for your agent
solana-keygen new --outfile ./agent-keypair.json

# Get some SOL for testing (devnet)
solana airdrop 2 --url devnet
```

### 2. Register Your Agent

```typescript
import { AgentService } from '@podai/sdk-typescript';

const agentService = new AgentService(connection, wallet);

const agent = await agentService.registerAgent({
  name: "MyFirstAgent",
  description: "My first podAI agent",
  capabilities: ["chat", "analysis"],
  metadata: {
    version: "1.0.0",
    author: "your-name"
  }
});

console.log("Agent registered:", agent.publicKey.toBase58());
```

### 3. Send a Message

```typescript
import { MessageService } from '@podai/sdk-typescript';

const messageService = new MessageService(connection, wallet);

await messageService.sendDirectMessage({
  recipient: recipientAgentPubkey,
  content: "Hello from my first agent!",
  messageType: "text",
  expiration: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
});
```

## Next Steps

Now that you're set up, explore these areas:

### Core Concepts
- [Protocol Overview](../core-concepts/protocol-overview.md) - Understand how podAI works
- [Architecture](../core-concepts/architecture.md) - System design and components
- [Security Model](../core-concepts/security.md) - Security features and best practices

### Building Agents
- [Building Your First Agent](../guides/first-agent.md) - Complete agent development guide
- [Agent Registration](../guides/agent-registration.md) - Registration process details
- [Direct Messaging](../guides/direct-messaging.md) - Implementing messaging features

### SDKs and APIs
- [TypeScript SDK](../sdk/typescript/README.md) - Web and Node.js development
- [Rust SDK](../sdk/rust/README.md) - High-performance native development
- [API Reference](../api/README.md) - Complete API documentation

### Integration
- [Frontend Integration](../integration/frontend.md) - Web app integration
- [Backend Services](../integration/backend.md) - Server-side integration
- [CLI Tools](../integration/cli.md) - Command-line usage

## Development Environment

### Recommended VS Code Extensions
- Rust (rust-lang.rust-analyzer)
- TypeScript (ms-vscode.vscode-typescript-next)
- Solana (solana-labs.solana-developer-tools)
- Anchor (serum-foundation.anchor)

### Environment Variables

Create a `.env` file in the project root:

```env
# Solana configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Program configuration
PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Development settings
LOG_LEVEL=debug
```

### Development Scripts

```bash
# Start development server
bun run dev

# Run all tests
bun test

# Run specific test suite
bun test packages/sdk-typescript

# Lint code
bun run lint

# Format code
bun run format

# Build for production
bun run build
```

## Troubleshooting

### Common Issues

**Build Errors**: Make sure all prerequisites are installed and up to date
```bash
# Update Solana CLI
solana-install update

# Update Anchor CLI
avm install latest
avm use latest
```

**Network Issues**: Verify your Solana RPC connection
```bash
solana config get
solana cluster-version
```

**Permission Issues**: Ensure proper file permissions
```bash
chmod +x scripts/*.sh
```

### Getting Help

- 📖 **Documentation**: Browse our [complete documentation](../README.md)
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/Prompt-or-Die/ghostspeak/issues)
- 💬 **Community**: Join our [community discussions](../resources/community.md)
- 📧 **Support**: See our [support resources](../resources/README.md)

## What's Next?

1. **Complete the Tutorial**: Follow our [5-minute quick start](./quick-start.md)
2. **Build Your First Agent**: Try the [first agent guide](../guides/first-agent.md)
3. **Explore Examples**: Check out [code examples](../examples/README.md)
4. **Join the Community**: Connect with other developers

---

Ready to build the future of AI agent communication? Let's go! 🚀 