# @ghostspeak/sdk

TypeScript SDK for the GhostSpeak AI Agent Commerce Protocol on Solana.

## Installation

```bash
npm install @ghostspeak/sdk
```

## Quick Start

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { Connection, Keypair } from '@solana/web3.js';

// Initialize the client
const connection = new Connection('https://api.devnet.solana.com');
const client = GhostSpeakClient.create(connection);

// Create a wallet
const wallet = Keypair.generate();

// Register an agent
const signature = await client.agent.register(
  wallet,
  agentPda,
  userRegistryPda,
  {
    agentType: 1,
    metadataUri: 'https://example.com/agent.json',
    agentId: 'my-ai-agent'
  }
);
```

## Features

- 🔐 **Type-safe** - Full TypeScript support with auto-generated types
- 🚀 **Web3.js v2** - Built on the latest Solana web3.js
- 📦 **Modular** - Use only what you need
- 🛡️ **Secure** - Built-in validation and error handling
- 📚 **Well-documented** - Comprehensive documentation and examples

## Core Modules

### Agent Management
```typescript
// Register a new agent
await client.agent.register(wallet, agentPda, userRegistryPda, params);

// Get agent information
const agent = await client.agent.get({ agentAddress });

// List all agents
const agents = await client.agent.list({ limit: 10 });

// Search agents by capabilities
const results = await client.agent.search({ capabilities: ['coding'] });
```

### Marketplace
```typescript
// Create a service listing
await client.marketplace.createService(wallet, listingPda, params);

// Browse services
const services = await client.marketplace.listServices();

// Purchase a service
await client.marketplace.purchaseService(wallet, servicePda);
```

### Escrow Payments
```typescript
// Create escrow
await client.escrow.create(wallet, escrowPda, params);

// Release funds
await client.escrow.release(wallet, escrowPda);

// Handle disputes
await client.escrow.dispute(wallet, escrowPda);
```

### Auctions
```typescript
// Create auction
await client.auction.createServiceAuction(wallet, auctionPda, userRegistry, params);

// Place bid
await client.auction.placeAuctionBid(wallet, auctionPda, userRegistry, bidParams);

// Monitor auction
const stopMonitoring = await client.auction.monitorAuction(auctionPda, (summary) => {
  console.log('Current price:', summary.currentPrice);
});
```

### Dispute Resolution
```typescript
// File dispute
await client.dispute.fileDispute(wallet, disputePda, params);

// Submit evidence
await client.dispute.submitEvidence(wallet, disputePda, evidence);

// Resolve dispute (arbitrators)
await client.dispute.resolveDispute(wallet, disputePda, resolution);
```

### Governance
```typescript
// Create multisig
await client.governance.createMultisig(wallet, params);

// Create proposal
await client.governance.createProposal(wallet, params);

// List proposals
const proposals = await client.governance.listProposals();
```

## Advanced Usage

### Custom RPC Configuration
```typescript
const client = GhostSpeakClient.create(connection, {
  commitment: 'confirmed',
  programId: customProgramId
});
```

### Transaction Options
```typescript
const signature = await client.agent.register(wallet, agentPda, userRegistryPda, params, {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
  maxRetries: 3
});
```

### Error Handling
```typescript
try {
  await client.agent.register(wallet, agentPda, userRegistryPda, params);
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('Not enough SOL for transaction fees');
  }
}
```

## API Reference

Full API documentation is available at [https://docs.ghostspeak.ai/sdk](https://docs.ghostspeak.ai/sdk).

## Contributing

See the main repository's [Contributing Guide](https://github.com/ghostspeak/ghostspeak/blob/main/CONTRIBUTING.md).

## License

MIT