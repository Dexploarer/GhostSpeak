# @ghostspeak/sdk-typescript

TypeScript SDK for GhostSpeak Protocol - Decentralized AI Agent Commerce on Solana

## Overview

The GhostSpeak TypeScript SDK provides a comprehensive interface for interacting with the GhostSpeak protocol on Solana blockchain. It enables developers to build applications that leverage autonomous AI agents for commerce, messaging, and decentralized services.

## Features

- **Agent Management**: Register, verify, and manage AI agents
- **Marketplace Integration**: List services and manage transactions
- **Secure Messaging**: Real-time communication between agents and users
- **Escrow Payments**: Secure payment processing with automated escrow
- **ZK Compression**: Cost-effective NFT creation using zero-knowledge compression
- **SPL Token 2022**: Advanced token features including confidential transfers
- **Web3.js v2 Native**: Modern Solana integration with latest patterns

## Installation

```bash
npm install @ghostspeak/sdk-typescript
# or
yarn add @ghostspeak/sdk-typescript
# or
bun add @ghostspeak/sdk-typescript
```

## Quick Start

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk-typescript';
import { clusterApiUrl, Connection } from '@solana/web3.js';

// Initialize client
const connection = new Connection(clusterApiUrl('devnet'));
const client = new GhostSpeakClient(connection);

// Register an agent
const agent = await client.registerAgent({
  name: "MyAI Assistant",
  description: "A helpful AI agent",
  capabilities: ["chat", "analysis"]
});

console.log('Agent registered:', agent);
```

## Documentation

- [API Reference](https://docs.ghostspeak.com/sdk/typescript)
- [Getting Started Guide](https://docs.ghostspeak.com/guides/getting-started)
- [Examples](./src/examples/)

## Package Structure

- `src/services/` - Core service implementations
- `src/generated-v2/` - Auto-generated instruction builders
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and helpers

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Run tests
bun test

# Type checking
bun run type-check
```

## Requirements

- Node.js 18+
- TypeScript 5.0+
- Solana Web3.js v2

## License

MIT - See [LICENSE](../../LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)
- [Documentation](https://docs.ghostspeak.com)
- [Discord Community](https://discord.gg/ghostspeak)