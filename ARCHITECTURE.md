# GhostSpeak Monorepo Architecture

> Trust layer for AI agent commerce on Solana

## Quick Reference

| Package | Purpose | Location |
|---------|---------|----------|
| **@ghostspeak/sdk** | Core TypeScript SDK | `packages/sdk-typescript/` |
| **@ghostspeak/cli** | Terminal interface | `packages/cli/` |
| **web** | Next.js frontend | `packages/web/` |
| **@ghostspeak/api** | REST API | `packages/api/` |
| **@ghostspeak/plugin-elizaos** | ElizaOS integration | `packages/plugin-ghostspeak/` |
| **@ghostspeak/shared** | Shared types & utilities | `packages/shared/` |
| **ghostspeak-marketplace** | Anchor program (Rust) | `programs/ghostspeak-marketplace/` |

---

## Package Dependency Graph

```
                    ┌─────────────────────────────────┐
                    │      @ghostspeak/sdk            │
                    │   (core protocol operations)    │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ @ghostspeak/cli │       │ @ghostspeak/api │       │ plugin-elizaos  │
│   (terminal)    │       │    (REST)       │       │   (agents)      │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │                         ▼                         │
         │                ┌─────────────────┐                │
         │                │ @ghostspeak/    │                │
         │                │    shared       │◄───────────────┘
         │                │  (types/utils)  │
         │                └────────┬────────┘
         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │      web        │
                          │  (Next.js +     │
                          │   Convex)       │
                          └─────────────────┘
```

---

## Packages In-Depth

### 1. @ghostspeak/sdk (`packages/sdk-typescript/`)

**Core TypeScript SDK for all GhostSpeak protocol operations.**

#### Entry Points (Tree-Shakeable)
```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'           // Main client
import { ... } from '@ghostspeak/sdk/browser'                // Browser-safe
import { ... } from '@ghostspeak/sdk/credentials'            // Credentials module
import { ... } from '@ghostspeak/sdk/types'                  // Type definitions
import { ... } from '@ghostspeak/sdk/errors'                 // Error classes
import { ... } from '@ghostspeak/sdk/crypto'                 // ElGamal encryption
import { ... } from '@ghostspeak/sdk/x402'                   // Payment protocol
```

#### Modules (`src/modules/`)
| Module | Purpose |
|--------|---------|
| `AgentModule` | Register & manage agents on-chain |
| `GhostModule` | Claim external agents (attestation) |
| `CredentialModule` | W3C Verifiable Credentials + Crossmint bridging |
| `DidModule` | W3C Decentralized Identifiers |
| `ReputationModule` | Ghost Score (0-1000 credit rating) |
| `PrivacyModule` | Control metrics visibility |
| `AuthorizationModule` | Pre-authorization system |
| `GovernanceModule` | Protocol governance & voting |
| `MultisigModule` | Multi-signature operations |
| `SASModule` | Solana Attestation Service integration |
| `X402TransactionIndexer` | Payment stream indexing |

#### Core Classes (`src/core/`)
- `GhostSpeakClient` - Main entry point, connects to Solana RPC
- `BaseModule` - Base class all modules extend
- `RpcClient` - Solana RPC wrapper
- `CacheManager` - LRU caching
- `InstructionBuilder` - Transaction construction

---

### 2. @ghostspeak/cli (`packages/cli/`)

**Beautiful terminal UI for GhostSpeak operations.**

#### Binary Commands
```bash
ghostspeak [command]    # Full command
ghost [command]         # Alias
```

#### Command Categories (`src/commands/`)

**Setup**
- `quickstart` - Onboarding flow
- `wallet` - Wallet management
- `config` - Configuration
- `faucet` / `airdrop` - Get test tokens

**Core Features**
- `agent` - Agent registration
- `ghost` / `ghost-claim` - External agent claiming
- `reputation` - Ghost Score operations
- `staking` - GHOST token staking
- `privacy` - Privacy controls
- `did` - DID management
- `escrow` - Escrow operations
- `multisig` - Multi-sig wallets
- `credentials` - Credential management

**UI Dashboards**
- `dashboard` - Main analytics
- `reputation-ui` / `staking-ui` / `ghost-ui` - Feature dashboards

**Dev Tools**
- `sdk` - SDK utilities
- `diagnose` - Debugging tools
- `governance` - Protocol governance

#### Tech Stack
- **Commander.js** - CLI parsing
- **Ink** - React for terminals
- **Clack** - Interactive prompts
- **TSUp** - Bundling

---

### 3. web (`packages/web/`)

**Next.js web application with Convex backend.**

#### Pages (`app/`)
| Route | Purpose |
|-------|---------|
| `/` | Landing page (Hero, Features, Architecture) |
| `/dashboard` | User analytics & control center |
| `/caisper` | ElizaOS agent chat interface |
| `/terms`, `/privacy` | Legal pages |
| `/api/*` | Backend API routes |

#### Convex Backend (`convex/`)
| Function | Purpose |
|----------|---------|
| `ghostDiscovery.ts` | Agent discovery system |
| `ghostScoreCalculator.ts` | Reputation calculation engine |
| `x402Indexer.ts` | Payment stream indexing |
| `agent.ts` | Agent data management |
| `dashboard.ts` | Analytics queries |
| `solanaAuth.ts` | Wallet authentication |
| `crons.ts` | Scheduled tasks |

#### Tech Stack
- **Next.js** 15 with Turbopack
- **React** 19
- **TailwindCSS** 4
- **Radix UI** - Components
- **Framer Motion** + **GSAP** - Animations
- **Three.js** + **R3F** - 3D effects

---

### 4. @ghostspeak/api (`packages/api/`)

**Public REST API for agent identity & reputation lookup.**

#### Endpoints (`src/routes/`)
```
GET  /health                        # Health check
GET  /stats                         # API statistics
GET  /ghosts/:address               # Get ghost by Solana address
GET  /ghosts/:address/score         # Get Ghost Score
GET  /ghosts/:address/reputation    # Get reputation breakdown
GET  /ghosts/external/:platform/:id # Get ghost by external ID
```

#### Architecture
- Built with `Bun.serve()` (no Express)
- Rate limiting (100 req/min default)
- CORS-enabled
- Convex integration for data

---

### 5. @ghostspeak/plugin-elizaos (`packages/plugin-ghostspeak/`)

**ElizaOS plugin for AI agent integration.**

#### Agent: Caisper
> "Bouncer & Concierge of the Solana Agents Club"

#### Actions (`src/actions/`)
| Action | Purpose |
|--------|---------|
| `checkGhostScore` | Check agent reputation |
| `registerAgent` | On-chain registration |
| `issueCredential` | Issue W3C credentials |
| `acceptPayment` | Handle x402 payments |
| `createDid` / `resolveDid` / `updateDid` | DID operations |
| `stakeGhost` | Staking operations |
| `setPrivacyMode` | Privacy controls |
| `createEscrow` | Escrow management |

#### Providers (`src/providers/`)
- `ghostScoreProvider` - Reputation data
- `agentContextProvider` - Agent context

#### Configuration
```env
AGENT_WALLET_PRIVATE_KEY=      # Agent signer key
SOLANA_CLUSTER=devnet          # Network
SOLANA_RPC_URL=                # RPC endpoint
CROSSMINT_SECRET_KEY=          # EVM credential bridging
```

---

### 6. @ghostspeak/shared (`packages/shared/`)

**Shared types, utilities, and clients.**

#### Exports
```typescript
import { ... } from '@ghostspeak/shared'           // Main index
import { ... } from '@ghostspeak/shared/convex'    // Convex client
import { ... } from '@ghostspeak/shared/types'     // Type definitions
import { ... } from '@ghostspeak/shared/solana'    // Solana utilities
```

#### Types (`src/types/`)
```typescript
AgentStatus        // Unregistered | Registered | Claimed | Verified
Ghost              // Core ghost data structure
GhostScore         // Reputation score (0-1000)
GhostReputation    // Detailed reputation breakdown
ExternalIdMapping  // Cross-platform identity links
```

#### Convex Client (`src/convex/`)
```typescript
class GhostSpeakConvexClient {
  listDiscoveredAgents()
  getDiscoveredAgent(address)
  getDiscoveryStats()
  resolveExternalId(platform, externalId)
  getExternalIdMappings(agentAddress)
  calculateGhostScore(address)
}
```

---

### 7. ghostspeak-marketplace (`programs/ghostspeak-marketplace/`)

**Anchor smart contract (Rust).**

#### Instructions (`src/instructions/`)
| Category | Files |
|----------|-------|
| Agent | `agent.rs`, `agent_management.rs`, `agent_compressed.rs` |
| Ghost | `ghost.rs` (external agent claiming) |
| Identity | `did.rs` (W3C DIDs) |
| Reputation | `reputation.rs` (Ghost Score) |
| Staking | `staking.rs` (GHOST token) |
| Credentials | `credential.rs` (W3C VCs) |
| Privacy | `privacy.rs` |
| Escrow | `ghost_protect.rs` |
| Governance | `compliance_governance.rs`, `protocol_config.rs` |

#### Security (`src/security/`)
- Rate limiting
- Reentrancy protection
- Agent validation
- Circuit breaker pattern

**Program ID**: `GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9`

---

## Development

### Prerequisites
- Bun 1.3.4+
- Node.js 24+
- Rust + Anchor 0.32.1 (for programs)

### Commands

```bash
# Install dependencies
bun install

# Development
bun run dev                # Start all packages in dev mode

# Build
bun run build              # Build Anchor programs
bun run build:packages     # Build SDK + CLI
bun run build:all          # Build everything

# Test
bun run test:all           # Full test suite
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests

# Quality
bun run qa:all             # Lint + type-check + format + audit
bun run lint:ts            # TypeScript linting
bun run lint:rust          # Rust linting

# Deploy
bun run deploy:devnet      # Deploy Anchor programs to devnet
```

### Workspace Dependencies

Use `workspace:*` for internal dependencies:
```json
{
  "dependencies": {
    "@ghostspeak/sdk": "workspace:*",
    "@ghostspeak/shared": "workspace:*"
  }
}
```

---

## Environment Variables

### Required
```env
SOLANA_RPC_URL=             # Solana RPC endpoint
SOLANA_CLUSTER=devnet       # Network (devnet/testnet/mainnet-beta)
```

### Web/API
```env
CONVEX_URL=                 # Convex backend URL
NEXT_PUBLIC_CONVEX_URL=     # Public Convex URL (Next.js)
```

### Agents
```env
AGENT_WALLET_PRIVATE_KEY=   # Agent signer key (base58)
```

### Crossmint (Credentials)
```env
CROSSMINT_SECRET_KEY=
CROSSMINT_REPUTATION_TEMPLATE_ID=
CROSSMINT_ENV=staging       # staging/production
```

---

## Solana SDK Migration

**This codebase uses Solana Web3.js v5 (modern modular architecture).**

### Banned (Legacy)
```typescript
// DO NOT USE
import { Connection, PublicKey } from '@solana/web3.js'
import { getAccount } from '@solana/spl-token'
```

### Use Instead (Modern)
```typescript
// CORRECT
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { generateKeyPairSigner } from '@solana/signers'
import { getAccount } from '@solana-program/token'
```

See [CLAUDE.md](/.claude/CLAUDE.md) for full migration patterns.

---

## File Structure

```
GhostSpeak/
├── packages/
│   ├── sdk-typescript/       # Core SDK
│   │   ├── src/
│   │   │   ├── core/         # Base classes
│   │   │   ├── modules/      # Feature modules
│   │   │   └── utils/        # Utilities
│   │   └── dist/             # Build output
│   │
│   ├── cli/                  # Terminal UI
│   │   ├── src/
│   │   │   ├── commands/     # CLI commands
│   │   │   └── components/   # Ink components
│   │   └── dist/
│   │
│   ├── web/                  # Next.js app
│   │   ├── app/              # Pages & routes
│   │   ├── components/       # React components
│   │   ├── convex/           # Backend functions
│   │   └── server/           # Server-side code
│   │
│   ├── api/                  # REST API
│   │   └── src/
│   │       ├── routes/       # Endpoints
│   │       └── services/     # Business logic
│   │
│   ├── plugin-ghostspeak/    # ElizaOS plugin
│   │   └── src/
│   │       ├── actions/      # Agent actions
│   │       ├── providers/    # Data providers
│   │       └── character/    # Agent persona
│   │
│   └── shared/               # Shared utilities
│       └── src/
│           ├── types/        # Type definitions
│           ├── convex/       # Convex client
│           └── solana/       # Solana helpers
│
├── programs/
│   └── ghostspeak-marketplace/  # Anchor program
│       └── src/
│           ├── instructions/ # Program instructions
│           ├── state/        # Account structures
│           └── security/     # Security utilities
│
├── scripts/                  # Build & deploy scripts
├── turbo.json               # Turbo config
└── package.json             # Root workspace config
```

---

## Key Concepts

### Ghost Score
A reputation score (0-1000) calculated from:
- Transaction history
- Credential verification
- Staking amount
- Community attestations

### External Agent Claiming (Ghost)
Allows claiming ownership of agents on external platforms (Twitter, Discord, etc.) and linking them to on-chain identity.

### W3C Verifiable Credentials
Standards-compliant credentials that can be:
- Issued on-chain
- Bridged to EVM via Crossmint
- Verified cryptographically

### x402 Payment Protocol
HTTP-native payment protocol for AI agent commerce, indexed by the SDK.

---

## Contributing

1. Use Bun for all operations
2. Follow the Solana v5 SDK patterns (no legacy imports)
3. Run `bun run qa:all` before commits
4. Use workspace dependencies for internal packages
