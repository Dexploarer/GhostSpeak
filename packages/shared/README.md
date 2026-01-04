# @ghostspeak/shared

Shared utilities, types, and clients for the GhostSpeak platform.

## Overview

This package provides common functionality used across multiple GhostSpeak packages:
- **Web App** (`packages/web`)
- **Public API** (`packages/api`)
- **CLI** (`packages/cli`)
- **SDK** (`packages/sdk-typescript`)

## Features

### 📦 Types
- Ghost/Agent type definitions
- API response types
- Convex database types
- Solana program account types

### 🔗 Convex Client
- Typed Convex client for querying discovered agents
- Ghost score calculations
- External ID resolution
- Discovery stats

### ⛓️ Solana Utilities
- PDA derivation functions
- Borsh codecs for on-chain data
- Program constants

## Installation

```bash
# In a workspace package
bun add @ghostspeak/shared@workspace:*

# Or for external use (when published)
bun add @ghostspeak/shared
```

## Usage

### Types

```typescript
import { Ghost, AgentStatus, DiscoveredAgent } from '@ghostspeak/shared';

const ghost: Ghost = {
  address: '5eLbn3wj...',
  status: AgentStatus.Claimed,
  ghostScore: 750,
  // ...
};
```

### Convex Client

```typescript
import { createConvexClient } from '@ghostspeak/shared/convex';

const convex = createConvexClient(process.env.CONVEX_URL);

// List discovered agents
const agents = await convex.listDiscoveredAgents({ limit: 10 });

// Get ghost score
const score = await convex.calculateGhostScore('5eLbn3wj...');

// Resolve external ID
const mapping = await convex.resolveExternalId('payai', 'agent-123');
```

### Solana Utilities

```typescript
import { deriveAgentAddress, deriveExternalIdMappingAddress, PROGRAM_ID } from '@ghostspeak/shared/solana';

// Derive Agent PDA
const agentPda = await deriveAgentAddress(ownerAddress, agentId);

// Derive External ID Mapping PDA
const mappingPda = await deriveExternalIdMappingAddress('payai', 'agent-123');
```

### Borsh Codecs

```typescript
import { agentCodec, externalIdMappingCodec } from '@ghostspeak/shared/solana';

// Decode on-chain Agent account
const agentData = agentCodec.decode(accountData);

// Decode External ID Mapping
const mapping = externalIdMappingCodec.decode(mappingData);
```

## Package Structure

```
src/
├── types/          # Shared TypeScript types
├── convex/         # Convex client utilities
├── solana/         # Solana utilities
│   ├── pda.ts      # PDA derivation
│   └── codecs/     # Borsh codecs
└── index.ts        # Main exports
```

## Development

```bash
# Build
bun run build

# Watch mode
bun run dev

# Type check
bun run type-check
```

## License

MIT
