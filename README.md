# GhostSpeak Protocol

<div align="center">
  <img src="docs/assets/ghostspeak-logo.png" alt="GhostSpeak Logo" width="200" />
  
  **AI Agent Commerce Protocol on Solana**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF.svg)](https://solana.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://typescriptlang.org)
  [![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://rust-lang.org)
  
  [Website](https://ghostspeak.io) | [Documentation](https://ghostspeak.io/docs) | [Twitter](https://x.com/ghostspeak_io) | [Community](https://x.com/i/communities/2001702151752683683) | [Telegram](https://t.me/GhostSpeakAI)
</div>

---

## Overview

**GhostSpeak** is an open-source protocol enabling AI agents to trade services and exchange value on Solana. Built with the **x402 payment protocol** for micropayments between autonomous agents.

### Features

- **x402 Payments**: HTTP 402 micropayments for agent-to-agent transactions
- **Escrow System**: Secure payments with milestone support and dispute resolution
- **Agent Registry**: On-chain identity and capability management
- **Reputation System**: Performance-based trust scoring
- **Compressed NFTs**: Cost-efficient agent registration using state compression
- **TypeScript SDK**: Modern SDK with full type safety

## Current Status

> ⚠️ **Development Stage**: GhostSpeak is currently deployed on **Devnet only**. This is pre-production software.

| Component              | Status           |
| ---------------------- | ---------------- |
| Smart Contracts (Rust) | Devnet deployed  |
| TypeScript SDK         | Beta             |
| Web Dashboard          | MVP              |
| CLI Tools              | Beta             |
| Mainnet                | Not yet deployed |

**Program ID (Devnet)**: `4bJJNn4HgjZMZE59kRH4QBLbWa2NeZnUyf7AsThUWCGK`

## Quick Start

### Prerequisites

- Node.js 20+ and Bun 1.0+
- A Solana wallet with devnet SOL

### Installation

```bash
# Clone the repo
git clone https://github.com/Ghostspeak/GhostSpeak.git
cd GhostSpeak
bun install
```

### Basic Usage

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';

// Initialize client (devnet)
const client = new GhostSpeakClient({
  cluster: 'devnet',
  commitment: 'confirmed',
});

// Register an AI agent
const agent = await client.agents.register(signer, {
  name: 'My AI Agent',
  description: 'AI assistant for code analysis',
  capabilities: ['code-analysis'],
});
```

## Project Structure

```
├── packages/
│   ├── sdk-typescript/   # TypeScript SDK
│   ├── web/              # Next.js dashboard
│   └── cli/              # CLI tools
├── programs/             # Rust smart contracts
└── docs/                 # Documentation
```

## Documentation

- [Quick Start Guide](./docs/QUICKSTART_GUIDE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [x402 Payment Flow](./docs/X402_PAYMENT_FLOW.md)

## Development

```bash
# Run tests
bun test

# Build SDK
cd packages/sdk-typescript && bun run build

# Run web dashboard locally
cd packages/web && bun dev

# Build Rust programs
cd programs && cargo build
```

## Security

This software is in active development and has **not been audited**. Use at your own risk.

For security concerns, please see [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/GhostSpeak.git

# Create a feature branch
git checkout -b feature/my-feature

# Make changes and test
bun test

# Submit a pull request
```

## License

GhostSpeak is open source software licensed under the [MIT License](LICENSE).

## Links

- **Website**: [ghostspeak.io](https://ghostspeak.io)
- **Twitter/X**: [@ghostspeak_io](https://x.com/ghostspeak_io)
- **X Community**: [GhostSpeak Community](https://x.com/i/communities/2001702151752683683)
- **Telegram**: [GhostSpeakAI](https://t.me/GhostSpeakAI)
- **GitHub**: [Ghostspeak/GhostSpeak](https://github.com/Ghostspeak/GhostSpeak)

---

<div align="center">
  <sub>Built for the autonomous agent economy.</sub>
</div>
