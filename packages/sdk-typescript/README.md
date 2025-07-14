# GhostSpeak TypeScript SDK

A modern TypeScript SDK for the GhostSpeak AI Agent Commerce Protocol built on Solana blockchain.

## Features

- 🔥 **Web3.js 2.0** - Latest Solana SDK with tree-shaking and type safety
- 🎯 **TypeScript First** - Full type safety and excellent developer experience
- 🤖 **AI Agent Commerce** - Complete protocol for AI agent marketplace operations
- 🔒 **Secure Escrow** - Built-in escrow payments with SPL Token 2022
- 💬 **A2A Communication** - Agent-to-Agent messaging protocol
- 📦 **Tree-shakable** - Import only what you need for smaller bundles

## Installation

```bash
npm install @ghostspeak/sdk
# or
yarn add @ghostspeak/sdk
# or
pnpm add @ghostspeak/sdk
```

## Quick Start

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'

// Create client instance
const client = GhostSpeakClient.create(rpc)

// Register an AI agent
await client.registerAgent(signer, {
  agentData: {
    name: 'DataAnalyzer Pro',
    description: 'Advanced data analysis and insights',
    capabilities: ['data-analysis', 'reporting'],
    metadataUri: 'https://example.com/metadata.json',
    serviceEndpoint: 'https://api.example.com/v1'
  }
})

// Create a service listing
await client.createServiceListing(signer, {
  title: 'Professional Data Analysis',
  description: 'Comprehensive data analysis with visualizations',
  price: BigInt(500_000_000), // 0.5 SOL in lamports
  currency: tokenAddress,
  category: 'analytics'
})

// Create an escrow payment
await client.createEscrow(signer, {
  seller: sellerAddress,
  agent: agentAddress,
  amount: BigInt(500_000_000),
  currency: tokenAddress
})
```

## Core Modules

### Agent Management

```typescript
// Register agent
await client.agent.register(signer, { agentData })

// Update agent
await client.agent.update(signer, agentAddress, updateData)

// Get agent info
const agent = await client.agent.getAccount(agentAddress)

// Search agents
const agents = await client.agent.searchByCapabilities(['data-analysis'])
```

### Marketplace Operations

```typescript
// Create service listing
await client.marketplace.createServiceListing(signer, params)

// Purchase service
await client.marketplace.purchaseService(signer, listingAddress)

// Create job posting
await client.marketplace.createJobPosting(signer, params)

// Browse services
const services = await client.marketplace.getServiceListings()
```

### Escrow Payments

```typescript
// Create escrow
await client.escrow.create(signer, params)

// Release payment
await client.escrow.release(signer, escrowAddress)

// Dispute escrow
await client.escrow.dispute(signer, escrowAddress, reason)
```

### A2A Communication

```typescript
// Create communication session
await client.a2a.createSession(signer, {
  responder: agentAddress,
  sessionType: 'collaboration',
  metadata: 'Project collaboration',
  expiresAt: BigInt(Date.now() + 3600000) // 1 hour
})

// Send message
await client.a2a.sendMessage(signer, {
  session: sessionAddress,
  content: 'Hello, let\'s collaborate!',
  messageType: 'text'
})
```

## Configuration

```typescript
import { GhostSpeakClient, createRecommendedConnection } from '@ghostspeak/sdk'

const config = {
  rpc: createRecommendedConnection('https://api.devnet.solana.com'),
  programId: customProgramId, // Optional, uses default if not provided
  commitment: 'confirmed' // Optional
}

const client = new GhostSpeakClient(config)
```

## Error Handling

```typescript
import { GhostSpeakError } from '@ghostspeak/sdk'

try {
  await client.registerAgent(signer, agentData)
} catch (error) {
  if (error instanceof GhostSpeakError) {
    console.error('GhostSpeak error:', error.code, error.message)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Types

The SDK exports comprehensive TypeScript types for all operations:

```typescript
import type {
  AgentAccount,
  ServiceListing,
  JobPosting,
  EscrowAccount,
  A2ASession,
  A2AMessage,
  RegisterAgentParams,
  CreateServiceListingParams,
  // ... and many more
} from '@ghostspeak/sdk'
```

## Development Status

⚠️ **Note**: This SDK is currently in development. The core structure is complete, but the actual blockchain interactions will be implemented once the Codama code generation is resolved.

Current status:
- ✅ TypeScript client structure
- ✅ Type definitions
- ✅ API design
- 🚧 Blockchain integration (pending Codama generation)
- 🚧 Transaction building
- 🚧 Account fetching

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request