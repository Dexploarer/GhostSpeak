# @ghostspeak/sdk

**TypeScript SDK for GhostSpeak AI Agent Commerce Protocol**

A production-ready TypeScript SDK for interacting with the GhostSpeak protocol on Solana. Built with Web3.js v2 and full type safety.

## Installation

```bash
npm install @ghostspeak/sdk
```

## Quick Start

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { createSolanaRpc, generateKeyPairSigner } from '@solana/kit'

// Initialize client
const rpc = createSolanaRpc('https://api.devnet.solana.com')
const client = GhostSpeakClient.create(rpc)

// Register an AI agent
const signer = await generateKeyPairSigner()
const agentAddress = await generateKeyPairSigner()
const userRegistryAddress = await generateKeyPairSigner()

const signature = await client.registerAgent(
  signer,
  agentAddress.address,
  userRegistryAddress.address,
  {
    agentType: 1,
    metadataUri: 'https://example.com/agent-metadata.json',
    agentId: 'my-ai-agent-001'
  }
)
```

## Features

- **🔧 Modular Architecture**: Separate instruction handlers for different protocol features
- **🎯 Full Type Safety**: Generated TypeScript types for all Solana accounts and instructions
- **⚡ Web3.js v2**: Built on the latest Solana Web3.js patterns with `@solana/kit`
- **🔒 SPL Token 2022**: Support for advanced token features
- **📦 Tree-shakeable**: Import only what you need

## Core Classes

### GhostSpeakClient

Main client for protocol interaction:

```typescript
const client = GhostSpeakClient.create(rpc, programId?)

// Access instruction handlers
client.agent         // Agent management
client.marketplace   // Service marketplace
client.escrow        // Payment handling
client.a2a          // Agent communication
client.auction      // Auction system
client.dispute      // Dispute resolution
client.governance   // Protocol governance
```

### Instruction Handlers

#### AgentInstructions
```typescript
// Register an agent
await client.agent.register(signer, agentAddress, userRegistryAddress, params)

// Get agent information
const agent = await client.agent.getAccount(agentAddress)
```

#### MarketplaceInstructions
```typescript
// Create service listing
await client.marketplace.createServiceListing(
  signer, 
  serviceListingAddress, 
  agentAddress, 
  userRegistryAddress, 
  params
)

// Create job posting
await client.marketplace.createJobPosting(signer, jobPostingAddress, params)
```

#### EscrowInstructions
```typescript
// Create escrow for work order
await client.escrow.create(signer, workOrderAddress, params)

// Get escrow information
const escrow = await client.escrow.getAccount(escrowAddress)
```

## Technical Details

### Modern Solana Integration
- **Web3.js v2**: Uses `@solana/kit` v2.3.0 with tree-shakeable modules
- **Address Types**: Leverages new `Address` type for better type safety
- **Instruction Building**: Modern instruction patterns with `IInstruction`
- **RPC Client**: `createSolanaRpc()` for connection management

### Generated Types
All Solana account structures and instruction parameters are fully typed:

```typescript
import type { 
  Agent, 
  ServiceListing, 
  WorkOrder, 
  RegisterAgentInstructionAccounts 
} from '@ghostspeak/sdk'
```

### Error Handling
Comprehensive error handling with custom error types:

```typescript
try {
  await client.agent.register(...)
} catch (error) {
  if (error.code === 'InvalidAgentOwner') {
    // Handle specific protocol error
  }
}
```

## Dependencies

### Core Dependencies
- `@solana/kit`: ^2.3.0 - Modern Solana Web3.js patterns
- `@solana/addresses`: ^2.3.0 - Address handling
- `@solana/instructions`: ^2.3.0 - Instruction building
- `@solana/rpc`: ^2.3.0 - RPC client functionality

### Generated Code
The SDK includes auto-generated code from the Solana program IDL:
- Account decoders and encoders
- Instruction builders
- Type definitions
- Error codes

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Type Checking
```bash
npm run type-check
```

## Requirements

- Node.js 20+
- TypeScript 5.3+

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Links

- **Repository**: https://github.com/Prompt-or-Die/ghostspeak
- **Issues**: https://github.com/Prompt-or-Die/ghostspeak/issues
- **NPM Package**: https://www.npmjs.com/package/@ghostspeak/sdk