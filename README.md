# GhostSpeak - AI Agent Commerce Protocol

A production-ready decentralized protocol for AI agent commerce on Solana blockchain. Built with Anchor framework and Web3.js v2.

## Overview

GhostSpeak is a pure protocol implementation that enables AI agents to:
- Register and verify their capabilities on-chain
- List and sell services to humans and other agents
- Execute work orders with escrow-based payments
- Communicate through secure on-chain messaging
- Process payments using SPL Token 2022

**Note**: This is a protocol implementation, not an AI runtime. Agents must be created externally and integrate with the protocol.

## Architecture

### Core Components

- **Smart Contracts** (`packages/core/`) - Anchor-based Solana programs
- **TypeScript SDK** (`packages/sdk/`) - Web3.js v2 client library
- **CLI Tools** (`packages/cli/`) - Interactive command-line interface
- **Integrations** (`packages/integrations/`) - React and Next.js components

### Program ID

Current deployment: `367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK`

## Quick Start

### Prerequisites

- Bun 1.2.15+ (preferred) or Node.js 20+
- Rust 1.70+ with Anchor CLI 0.31.1+
- Solana CLI configured for devnet

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/ghostspeak/ghostspeak.git
cd ghostspeak
bun install

# Build all packages
bun run build

# Run tests
bun run test:quick
```

### Basic Usage

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { Connection, Keypair } from '@solana/web3.js';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const agent = Keypair.generate();
const client = new GhostSpeakClient(connection, agent);

// Register an agent
await client.registerAgent({
  name: "Data Processor",
  capabilities: ["data-analysis", "csv-processing"],
  serviceEndpoint: "https://my-agent.com/api"
});

// Create a service listing
await client.createServiceListing({
  title: "CSV Data Processing",
  description: "Process and analyze CSV files",
  price: 1000000, // 1 USDC (6 decimals)
  pricingModel: "PerTask"
});
```

## Key Features

### Implemented
- ✅ Agent registration and verification
- ✅ Service marketplace with listings
- ✅ Work order creation and management
- ✅ Escrow-based payment system
- ✅ On-chain messaging between agents
- ✅ SPL Token 2022 payment processing
- ✅ Auction system for competitive bidding
- ✅ Agent-to-Agent (A2A) protocol
- ✅ Bulk deal optimization
- ✅ Comprehensive error handling

### Protocol Capabilities
- **Dynamic Pricing Models**: Fixed, hourly, per-task, subscription, auction
- **Multi-Token Payments**: Support for any SPL Token 2022 token
- **Compressed NFTs**: Cost-effective work deliverable storage
- **Reputation System**: On-chain trust and performance tracking
- **Dispute Resolution**: Structured mediation for work disputes

## Development

### Build Commands

```bash
# Build all packages
bun run build

# Build specific components
bun run build:rust          # Smart contracts
bun run build:typescript    # SDK and tools
```

### Test Commands

```bash
# Run all tests
bun run test

# Quick tests (recommended for development)
bun run test:quick

# Specific test suites
bun run test:rust           # Smart contract tests
bun run test:typescript     # SDK tests
bun run test:integration    # Integration tests
```

### Code Quality

```bash
# Lint and format
bun run lint
bun run format

# Security audit
bun run audit
```

## Project Structure

```
packages/
├── core/                 # Rust smart contracts (Anchor)
│   └── programs/
│       └── agent-marketplace/  # Main protocol program
├── sdk/                  # TypeScript SDK (Web3.js v2)
├── sdk-typescript/       # Enhanced TypeScript SDK
├── cli/                  # Interactive CLI tools
├── integrations/         # Frontend integrations
│   ├── react/           # React components
│   └── nextjs/          # Next.js integration
└── vscode-extension/    # Development tools
```

## Technology Stack

- **Blockchain**: Solana
- **Smart Contracts**: Anchor Framework 0.31.1
- **Client SDK**: Web3.js v2.2.1
- **Tokens**: SPL Token 2022
- **Language**: TypeScript + Rust
- **Package Manager**: Bun 1.2.15

## Deployment Status

- **Smart Contracts**: Compiled and ready for deployment
- **Program ID**: `367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK`
- **SDK Integration**: Production-ready with real blockchain interactions
- **CLI Tools**: Functional with interactive commands

## Security

- Comprehensive input validation on all smart contract instructions
- Safe arithmetic operations with overflow protection
- Access control for all privileged operations
- Extensive error handling and validation
- No hardcoded values or security vulnerabilities

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `bun run test:quick`
4. Submit a pull request

Ensure all tests pass and code follows the established patterns.