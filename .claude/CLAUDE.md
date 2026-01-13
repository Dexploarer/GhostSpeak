# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context System

**For autonomous operation**, this monorepo uses a hierarchical context system:

- **Rules** (`.claude/rules/`) - Automatic, path-specific rules that load based on file location
  - `apps-web.md` - Next.js + Convex patterns (auto-loads for `apps/web/**`)
  - `packages-sdk.md` - SDK development patterns (auto-loads for `packages/sdk-typescript/**`)
  - `packages-cli.md` - CLI patterns (auto-loads for `packages/cli/**`)
  - `programs.md` - Rust/Anchor patterns (auto-loads for `programs/**`)
  - `code-quality.md` - Production-ready naming and code quality standards (auto-loads for all code files)

- **Skills** (`.claude/skills/`) - Auto-discovered capabilities that activate when relevant
  - `convex/` - Convex backend expertise
  - `anchor/` - Anchor smart contract expertise
  - `elizaos/` - ElizaOS plugin development
  - `testing/` - Testing strategies
  - `monorepo/` - Turbo monorepo management
  - `solana/` - Solana blockchain development

- **Slash Commands** (`.claude/commands/`) - Manual workflows
  - `/context-load [package]` - Load deep context for specific package
  - `/test-all` - Run all tests with intelligent analysis
  - `/build-check` - Verify builds across monorepo
  - `/deploy-check` - Pre-deployment validation
  - `/cleanup-code [pattern]` - Clean up verbose naming and comments in code files
  - `/fix-issue [description]` - Research and fix issues directly without creating documentation

**Quick Start**: Rules auto-apply based on file path. For explicit context loading, use `/context-load [package-name]`.

## Project Overview

**GhostSpeak** is a trust layer for AI agent commerce built on Solana. It provides:
- **Verifiable Credentials (W3C VCs)** - On-chain credentials bridged to EVM chains via Crossmint
- **Ghost Score (0-1000)** - Credit rating system for AI agents based on transaction history
- **Identity Registry** - Compressed NFT-based agent identities (5000x cost reduction)
- **PayAI Integration** - Ingests reputation data from PayAI payment protocol

**Tech Stack**: Solana (Anchor/Rust), TypeScript, Bun, Next.js 15, React 19, Convex, TailwindCSS 4

## Architecture

### Monorepo Structure

```
apps/
  web/                      # Next.js 15 + Convex backend + React 19
packages/
  sdk-typescript/           # @ghostspeak/sdk - Core TypeScript SDK
  cli/                      # @ghostspeak/cli - Terminal UI (Ink + Commander)
  api/                      # @ghostspeak/api - REST API (Bun.serve)
  plugin-ghostspeak/        # @ghostspeak/plugin-elizaos - ElizaOS plugin
programs/                   # Anchor smart contracts (Rust)
  src/
    instructions/           # Program instructions
    state/                  # Account structures
    security/               # Security utilities
```

### Dependency Flow

```
web → sdk + plugin-ghostspeak
cli → sdk
api → sdk
plugin-ghostspeak → sdk
```

**Critical**: All packages use `workspace:*` for internal dependencies.

### Key Modules (SDK)

Located in `packages/sdk-typescript/src/modules/`:
- `AgentModule` - Agent registration & management
- `CredentialModule` - W3C Verifiable Credentials + Crossmint bridging
- `ReputationModule` - Ghost Score calculation (0-1000)
- `DidModule` - W3C Decentralized Identifiers
- `PrivacyModule` - Metrics visibility control
- `X402TransactionIndexer` - Payment stream indexing

## Build & Development Commands

### Common Commands

```bash
# Install dependencies
bun install

# Development (starts web + Convex in parallel)
bun run dev                      # Web app on port 3333 + Convex
bun run dev:web                  # Web only
bun run dev:cli                  # CLI watch mode
bun run dev:sdk                  # SDK watch mode

# Build
bun run build                    # Build all + deploy Convex prod
bun run build:web                # Next.js build
bun run build:packages           # All packages (excludes web)
bun run build:sdk                # SDK only
bun run build:cli                # CLI only
bun run build:anchor             # Rust smart contracts

# Test
bun test                         # All tests
bun run test:unit                # Unit tests
bun run test:integration         # Integration tests
bun run test:e2e                 # Playwright E2E tests
bun run test:watch               # Watch mode
bun run test:coverage            # Coverage report

# Individual package tests
bun run test:web
bun run test:sdk
bun run test:cli

# Quality Assurance
bun run lint                     # Lint all packages
bun run lint:fix                 # Auto-fix lint issues
bun run type-check               # TypeScript type checking
bun run format                   # Format code
bun run format:check             # Check formatting

# Smart Contracts (Anchor)
anchor build                     # Build Rust programs
anchor test                      # Run Anchor tests
bun run deploy:anchor:devnet     # Deploy to devnet
bun run idl:upgrade              # Update IDL on-chain

# Convex
bun run convex:dev               # Convex dev mode
bun run convex:deploy            # Deploy to production
bun run convex:logs              # View prod logs

# Solana Setup
bun run setup:devnet             # Configure devnet + airdrop SOL
bun run setup:testnet            # Configure testnet + airdrop SOL
```

### Running a Single Test

```bash
# SDK test
cd packages/sdk-typescript
bun test tests/unit/reputation.test.ts

# Web test
cd apps/web
bun test -- test-name

# E2E test
cd apps/web
bun run test:e2e -- tests/e2e/wallet-auth.spec.ts

# Rust test (specific test)
cd programs
cargo test test_agent_registration -- --nocapture
```

## Critical Architecture Patterns

### Solana Web3.js v5 Migration (December 2025)

**NEVER use legacy packages** - ESLint will block them:
- ❌ `@solana/web3.js` (deprecated monolithic package)
- ❌ `@solana/spl-token` (legacy SPL client)

**Always use modern v5 packages**:
- ✅ `@solana/rpc` - RPC connections
- ✅ `@solana/addresses` - Address handling
- ✅ `@solana/signers` - Transaction signing
- ✅ `@solana/kit` - All-in-one package
- ✅ `@solana-program/token` - SPL tokens (v2+)
- ✅ `@solana-program/token-2022` - Token-2022 extensions

**Migration patterns**:

```typescript
// ❌ WRONG (legacy)
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
const connection = new Connection(url)
const pubkey = new PublicKey(addr)

// ✅ CORRECT (modern v5)
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { generateKeyPairSigner } from '@solana/signers'

const rpc = createSolanaRpc(url)
const addr = address(addressString)
const signer = await generateKeyPairSigner()
```

See existing `.claude/CLAUDE.md` for full migration patterns.

### Bun-First Development

**Default to Bun** for all operations:
- `bun <file>` instead of `node <file>`
- `bun test` instead of `jest` or `vitest`
- `bun install` instead of `npm install`
- `bunx <package>` instead of `npx <package>`

**Bun APIs**:
- `Bun.serve()` for servers (web API uses this, not Express)
- `Bun.file` for file operations
- `bun:sqlite` for SQLite
- Automatically loads `.env` (no `dotenv` needed)

### Turbo Monorepo

Build system uses Turbo (`turbo.json`):
- Parallel task execution
- Smart caching
- Task dependencies: `"dependsOn": ["^build"]` means "build dependencies first"

**Persistent tasks** (dev servers): `"cache": false, "persistent": true`
**Build tasks**: Cached with inputs/outputs defined

### Convex Backend

Web app uses Convex for backend (`apps/web/convex/`):

**Key functions**:
- `ghostDiscovery.ts` - Agent discovery system
- `ghostScoreCalculator.ts` - Reputation calculation
- `x402Indexer.ts` - Payment stream indexing
- `solanaAuth.ts` - Wallet authentication
- `crons.ts` - Scheduled tasks

**Deployments**:
- Dev: `dev:lovely-cobra-639`
- Prod: `prod:enduring-porpoise-79`

Use `CONVEX_DEPLOYMENT` env var to target specific deployment.

### Smart Contract Details

**Program**: `ghostspeak-marketplace` (Rust/Anchor)
**Devnet Program ID**: `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
**Anchor Version**: 0.32.1
**Solana CLI**: 2.3.13

**Program structure** (`programs/src/`):
- `instructions/` - All program instructions (agent.rs, reputation.rs, credential.rs, etc.)
- `state/` - Account structures
- `security/` - Rate limiting, validation, circuit breaker
- `lib.rs` - Program entry point

**Testing**:
- Unit tests: `programs/tests/unit/` (uses Mollusk SVM for fast testing)
- Integration tests: `programs/tests/integration/`
- Property tests: `programs/tests/property/`

### SDK Architecture

**Entry points** (`packages/sdk-typescript/`):
- `dist/index.js` - Main export (all modules)
- `dist/browser.js` - Browser-safe subset
- `dist/credentials.js` - Credentials module only
- `dist/types.js` - Type definitions
- `dist/errors.js` - Error classes
- `dist/crypto.js` - ElGamal encryption utilities

**Module pattern**: All modules extend `BaseModule` and are instantiated by `GhostSpeakClient`:

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'

const client = new GhostSpeakClient({ cluster: 'devnet' })

// Access modules
await client.agents.register(...)
await client.credentials.issueAgentIdentityCredential(...)
await client.reputation.getReputationData(...)
```

### CLI Architecture

**Binary names**: `ghostspeak` or `ghost` (alias)
**Framework**: Commander.js + Ink (React for terminals) + Clack (prompts)
**Build**: TSUp with shebang for executable

**Command categories** (`packages/cli/src/commands/`):
- Setup: `quickstart`, `wallet`, `config`, `faucet`
- Core: `agent`, `ghost-claim`, `reputation`, `staking`, `credentials`
- UI: `dashboard`, `reputation-ui`, `staking-ui`
- Dev: `sdk`, `diagnose`, `governance`

### Web App Architecture

**Framework**: Next.js 15 (App Router) + React 19 + TailwindCSS 4
**Port**: 3333 (dev mode)
**Backend**: Convex (serverless functions + real-time)

**Pages** (`apps/web/app/`):
- `/` - Landing page
- `/dashboard` - User analytics & control center
- `/caisper` - ElizaOS agent chat (Caisper character)
- `/api/*` - Backend API routes

**State management**:
- React Query (TanStack Query) for server state
- Zustand for client state
- Convex for real-time subscriptions

**3D effects**: Three.js + React Three Fiber (R3F)
**Animations**: Framer Motion + GSAP

### Environment Variables

**Required for development**:

```bash
# Root .env (for Anchor)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/path/to/wallet.json

# apps/web/.env.local
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
CONVEX_DEPLOYMENT=dev:lovely-cobra-639
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Optional (Crossmint for credential bridging)
CROSSMINT_SECRET_KEY=sk_...
CROSSMINT_REPUTATION_TEMPLATE_ID=...

# Optional (Telegram bot)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_SECRET=your-64-char-hex-string
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Convex deployments**:
- Set `CONVEX_DEPLOYMENT=dev:lovely-cobra-639` for dev
- Set `CONVEX_DEPLOYMENT=prod:enduring-porpoise-79` for production

**Telegram bot** (optional):
- See `apps/web/TELEGRAM_BOT_SETUP.md` for complete setup guide
- Caisper available on Telegram via webhook integration
- Uses same ElizaOS runtime and message quota system as web chat

## Common Development Tasks

### Adding a new SDK module

1. Create module in `packages/sdk-typescript/src/modules/YourModule.ts`
2. Extend `BaseModule` class
3. Add module to `GhostSpeakClient` in `src/core/client.ts`
4. Export from `src/modules/index.ts`
5. Add tests in `tests/unit/your-module.test.ts`
6. Build: `bun run build`

### Adding a new CLI command

1. Create command in `packages/cli/src/commands/your-command.ts`
2. Register in `src/index.ts` (Commander program)
3. Add Ink UI component if interactive
4. Test: `./dist/index.js your-command --help`

### Adding a new Anchor instruction

1. Add instruction in `programs/src/instructions/your_instruction.rs`
2. Export from `programs/src/instructions/mod.rs`
3. Add to program in `programs/src/lib.rs`
4. Build: `anchor build`
5. Generate TypeScript bindings: `cd packages/sdk-typescript && bun run generate`
6. Add SDK method in appropriate module

### Updating smart contract

1. Edit Rust code in `programs/src/`
2. Build: `anchor build`
3. Regenerate TypeScript: `cd packages/sdk-typescript && bun run generate`
4. Update SDK module methods if needed
5. Test locally: `anchor test`
6. Deploy to devnet: `bun run deploy:anchor:devnet`
7. Update IDL: `bun run idl:upgrade`

### Adding a Convex function

1. Create function in `apps/web/convex/yourFunction.ts`
2. Use Convex patterns (queries, mutations, actions)
3. Test in Convex dashboard: `bunx convex dev`
4. Import in frontend: `const data = useQuery(api.yourFunction.get)`
5. Deploy: `bun run convex:deploy`

### Setting up Telegram bot

1. Create bot with @BotFather on Telegram
2. Generate webhook secret: `openssl rand -hex 32`
3. Add env vars to Vercel: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
4. Deploy to Vercel
5. Run setup script: `bun run telegram:setup`
6. Test by messaging your bot on Telegram

See `apps/web/TELEGRAM_BOT_SETUP.md` for detailed instructions.

## Important Notes

### Package Publishing

Packages are published to npm:
- `@ghostspeak/sdk` - v2.0.10
- `@ghostspeak/cli` - v2.0.0-beta.22
- `@ghostspeak/plugin-elizaos` - Latest

**Before publishing**:
1. Build: `bun run build`
2. Test: `bun test`
3. Update version in `package.json`
4. Publish: `npm publish`

### Git Workflow

- **Main branch**: `main` (production-ready)
- Create feature branches: `feature/your-feature`
- Test before committing: `bun test && bun run lint`
- Use conventional commits: `feat(sdk): add new module`

### Performance Considerations

- **Turbo caching**: Second builds are fast (~90% cache hit rate)
- **Parallel dev**: `bun run dev` runs web + Convex simultaneously
- **SDK watch mode**: CLI auto-reloads when SDK changes (via tsup watch)
- **Solana v5**: Tree-shakeable, smaller bundles vs legacy v1.x

### Security

- Smart contracts use rate limiting, reentrancy protection, circuit breakers
- Wallet operations use `@solana/signers` (secure key handling)
- Environment variables never committed (`.gitignore` includes `.env*`)
- Crossmint for EVM bridging (handles cross-chain security)

### Known Limitations

- Legacy Solana packages may exist in transitive dependencies (Crossmint, wallet adapters)
- Only YOUR code should use modern v5 packages
- Convex functions run in serverless environment (no file system access)
- Bun compatibility: Some packages still require Node.js (documented in package.json engines)

## Troubleshooting

**"Module not found: @ghostspeak/sdk"**
→ Build SDK first: `cd packages/sdk-typescript && bun run build`

**"anchor: command not found"**
→ Install Anchor: `cargo install --git https://github.com/coral-xyz/anchor avm --force && avm install 0.32.1`

**Web app: "Invalid Convex URL"**
→ Check `apps/web/.env.local` has `NEXT_PUBLIC_CONVEX_URL` set
→ Run `bunx convex dev` to get URL

**CLI: "Command not found"**
→ Build CLI: `cd packages/cli && bun run build`
→ Run from repo: `./packages/cli/dist/index.js`
→ Or install globally: `bun add -g @ghostspeak/cli`

**Turbo cache issues**
→ Clear cache: `rm -rf .turbo`
→ Clean all: `bun run clean:all`

**Legacy Solana warnings**
→ Check if YOUR code uses legacy imports (not transitive deps)
→ ESLint will error on direct imports of `@solana/web3.js` or `@solana/spl-token`

## Resources

- **Documentation**: See `docs/` directory (Mintlify)
- **Architecture**: `ARCHITECTURE.md` at root
- **Developer Guide**: `.claude/DEVELOPER_GUIDE.md`
- **Deployment**: `.claude/DEVNET_DEPLOYMENT.md` (coming soon based on git status)
- **Convex Audit**: `CONVEX_AUDIT_REPORT.md` and `CONVEX_FIX_COMPLETE.md`
- **Program ID**: Devnet `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`

## Quick Start for New Contributors

```bash
# 1. Clone and install
git clone https://github.com/Ghostspeak/GhostSpeak.git
cd GhostSpeak
bun install

# 2. Build everything
bun run build:packages

# 3. Start development
bun run dev  # Web app + Convex on localhost:3333

# 4. Make changes to SDK
cd packages/sdk-typescript
bun run dev  # Watch mode

# 5. Test changes
bun test

# 6. Lint and format
bun run lint:fix
```

That's it! You're ready to contribute to GhostSpeak. 👻
