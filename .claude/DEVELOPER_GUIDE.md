# GhostSpeak Developer Guide

**Welcome to the GhostSpeak monorepo!** This guide will help you understand the architecture, setup your development environment, and contribute effectively.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Package Structure](#package-structure)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Build & Test](#build--test)
6. [Deployment](#deployment)
7. [Contributing](#contributing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         GhostSpeak Platform                       │
│                    Trust Layer for AI Agents                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │   Frontend    │ │  Backend   │ │   CLI/SDK   │
        │  (Next.js)    │ │  (API)     │ │  (Tools)    │
        └───────┬──────┘ └─────┬─────┘ └──────┬──────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                ┌───────────────▼────────────────┐
                │   Solana Blockchain Layer      │
                │  (Smart Contracts - Rust)      │
                └────────────────────────────────┘
```

### Technology Stack

- **Runtime**: Bun v1.3.4 (primary), Node 24+ (compatibility)
- **Languages**: TypeScript 5.9+, Rust 1.75+
- **Blockchain**: Solana (Anchor v0.32.1)
- **Frontend**: Next.js 15, React 19, Convex
- **Build System**: Turbo v2.7.2, tsup, esbuild
- **Testing**: Vitest, Playwright
- **Package Manager**: Bun workspaces

---

## Package Structure

### Monorepo Layout

```
GhostSpeak/
├── programs/                      # Rust smart contracts (Anchor)
│   └── ghostspeak_marketplace/    # Main program
│
├── packages/
│   ├── api/                       # @ghostspeak/api
│   │   ├── Runtime: Bun.serve
│   │   ├── Purpose: Public REST API for ghost/reputation lookups
│   │   └── Deploy: Railway (production)
│   │
│   ├── cli/                       # @ghostspeak/cli
│   │   ├── Runtime: Node 20+
│   │   ├── Purpose: Command-line interface for agents
│   │   ├── Features: Registration, credentials, reputation
│   │   └── Published: npm (v2.0.0-beta.21)
│   │
│   ├── plugin-ghostspeak/         # @ghostspeak/plugin-elizaos
│   │   ├── Runtime: ElizaOS 1.7.0
│   │   ├── Purpose: ElizaOS plugin for reputation & credentials
│   │   ├── Name: Caisper (Agent bouncer/concierge)
│   │   └── Published: npm (v0.1.1)
│   │
│   ├── sdk-typescript/            # @ghostspeak/sdk
│   │   ├── Runtime: Node 24+
│   │   ├── Purpose: TypeScript SDK for all GhostSpeak features
│   │   ├── Features: Credentials, reputation, X402, agents
│   │   └── Published: npm (v2.0.8)
│   │
│   ├── shared/                    # @ghostspeak/shared
│   │   ├── Runtime: Universal
│   │   ├── Purpose: Shared types, utilities, Convex helpers
│   │   └── Status: Workspace-only (not published)
│   │
│   └── web/                       # GhostSpeak Web App
│       ├── Runtime: Next.js 15 + Convex
│       ├── Purpose: Ghost Score dashboard, agent registry
│       ├── Features: Wallet auth, Caisper chat, reputation
│       └── Deploy: Vercel (production)
│
├── docs/                          # Mintlify documentation
└── scripts/                       # Deployment & utility scripts
```

### Package Dependency Graph

```
web ──────┬───────> shared
          ├───────> plugin-ghostspeak ──> sdk
          └───────> sdk

cli ─────────────> sdk

api ─────────────> shared

plugin-ghostspeak ─> sdk
```

**Key Points**:
- `sdk` is the foundation - all packages depend on it
- `shared` provides utilities for web/api/Convex
- Packages use `workspace:*` protocol for internal deps

---

## Development Setup

### Prerequisites

1. **Bun** (required)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Rust & Solana CLI** (for smart contracts)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Install Solana CLI
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

   # Install Anchor
   cargo install --git https://github.com/coral-xyz/anchor avm --force
   avm install 0.32.1
   avm use 0.32.1
   ```

3. **Node 24+** (optional, for compatibility testing)
   ```bash
   # Using fnm
   fnm install 24
   fnm use 24
   ```

### Clone & Install

```bash
# Clone repository
git clone https://github.com/Ghostspeak/GhostSpeak.git
cd GhostSpeak

# Install all dependencies (uses Bun workspaces)
bun install

# Build Rust programs
cd programs && cargo check && cd ..

# Build TypeScript packages
bun run build:packages
```

### Environment Setup

#### 1. Root `.env` (for smart contract deployment)

```bash
# Solana Configuration
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/path/to/your/wallet.json
```

#### 2. `packages/web/.env.local`

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
CONVEX_DEPLOYMENT=dev:YOUR_DEPLOYMENT_NAME

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Crossmint (optional)
CROSSMINT_SECRET_KEY=sk_...
NEXT_PUBLIC_CROSSMINT_PROJECT_ID=...

# Sentry (optional)
SENTRY_AUTH_TOKEN=...
```

#### 3. `packages/api/.env`

```bash
PORT=3000
SOLANA_RPC_URL=https://api.devnet.solana.com
NODE_ENV=development
```

---

## Development Workflow

### Starting Development Servers

#### All Services (Parallel)

```bash
# Starts web, API, and Convex dev servers
bun run dev
```

This uses Turbo to run:
- `packages/web` → http://localhost:3000
- `packages/api` → http://localhost:3001
- Convex functions (live reload)

#### Individual Packages

```bash
# Web app only
cd packages/web && bun run dev

# API only
cd packages/api && bun run dev

# SDK (watch mode for changes)
cd packages/sdk-typescript && bun run dev

# CLI (watch mode)
cd packages/cli && bun run dev
```

### Making Changes

#### 1. SDK Changes (Most Common)

```bash
# Navigate to SDK
cd packages/sdk-typescript

# Make your changes in src/

# Build (watch mode)
bun run dev

# In another terminal, test changes
bun test --watch
```

**Hot Reload**: CLI has watch mode for SDK dist changes:
```bash
cd packages/cli
bun run dev  # Watches ../sdk-typescript/dist
```

#### 2. Smart Contract Changes

```bash
# Edit Rust code in programs/ghostspeak_marketplace/src/

# Build
anchor build

# Generate TypeScript bindings
cd packages/sdk-typescript
bun run generate  # Runs Codama IDL → TS generation

# Test on devnet
anchor test --provider.cluster devnet
```

#### 3. Web App Changes

```bash
cd packages/web

# Edit files in app/, components/, lib/

# Dev server auto-reloads
bun run dev

# Run Convex functions locally
bunx convex dev
```

---

## Build & Test

### Build Commands

```bash
# Build everything (Rust + TS)
bun run build:all

# Rust smart contracts only
bun run build          # or: anchor build

# TypeScript packages only
bun run build:packages

# Individual packages
cd packages/sdk-typescript && bun run build
cd packages/cli && bun run build
cd packages/web && bun run build
```

### Test Commands

```bash
# Run all tests (unit + integration + e2e)
bun test

# Unit tests only
bun run test:unit

# Integration tests
bun run test:integration

# E2E tests (Playwright)
bun run test:e2e

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

### Quality Assurance

```bash
# Full QA pipeline (lint, type-check, format, audit)
bun run qa:all

# Individual checks
bun run qa:lint         # ESLint + Clippy
bun run qa:type-check   # TypeScript type checking
bun run qa:format-check # Rust formatting
bun run qa:audit        # Security audit
```

### Linting & Formatting

```bash
# Lint TypeScript
bun run lint:ts

# Lint Rust
bun run lint:rust

# Fix all issues
bun run lint:fix

# Format Rust code
bun run format
```

---

## Deployment

### Smart Contracts

```bash
# Deploy to devnet
bun run deploy:devnet

# Deploy to mainnet (requires approval)
bun run deploy:mainnet

# Upload/update IDL
bun run idl:upgrade
```

### Web App (Vercel)

```bash
cd packages/web

# Deploy Convex functions (production)
bun run deploy:convex:prod

# Deploy Next.js (handled by Vercel auto-deploy)
git push origin main  # Auto-deploys to production
```

### API (Railway)

```bash
cd packages/api

# Deploy via Railway CLI
railway up

# Or push to trigger auto-deploy
git push origin main
```

### Packages (npm)

```bash
# SDK
cd packages/sdk-typescript
bun run build
npm publish

# CLI
cd packages/cli
bun run build
npm publish

# ElizaOS Plugin
cd packages/plugin-ghostspeak
bun run build
npm publish
```

---

## Contributing

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(sdk): add X402 payment verification
fix(web): resolve wallet connection timeout
docs(cli): update credential issuance guide
chore(deps): upgrade Solana packages to v5
test(api): add integration tests for ghost lookup
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes and test: `bun test && bun run qa:all`
3. Commit with conventional format
4. Push and create PR
5. Wait for CI checks to pass
6. Request review from maintainers

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No legacy Solana packages (`@solana/web3.js`, `@solana/spl-token`)
- [ ] TypeScript strict mode compliant
- [ ] ESLint warnings resolved
- [ ] Bun compatibility verified

---

## Troubleshooting

### Common Issues

#### "Module not found: @ghostspeak/sdk"

**Solution**: Build the SDK first
```bash
cd packages/sdk-typescript
bun run build
```

#### "anchor: command not found"

**Solution**: Install Anchor via avm
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.1
avm use 0.32.1
```

#### Web app: "Invalid Convex URL"

**Solution**: Check `packages/web/.env.local`:
```bash
NEXT_PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
```

Run `bunx convex dev` to get the URL.

#### Legacy Solana package warnings

**Solution**: These may come from third-party deps (Crossmint, wallet adapters). Check that YOUR code uses modern packages:
```bash
bun pm ls --all | grep "@solana/web3.js"
```

Only transitive dependencies should show legacy versions.

#### Bun install fails

**Solution**: Clear cache and reinstall
```bash
rm -rf node_modules packages/*/node_modules bun.lock
bun install
```

### Getting Help

- **Discord**: [Join community](https://discord.gg/ghostspeak)
- **GitHub Issues**: [Report bugs](https://github.com/Ghostspeak/GhostSpeak/issues)
- **Documentation**: [docs.ghostspeak.io](https://docs.ghostspeak.io)
- **Email**: dev@ghostspeak.io

---

## Performance Tips

### Build Optimization

```bash
# Use Turbo cache
bun run build  # Second runs use cache

# Parallel builds
turbo build --parallel

# Watch multiple packages
turbo dev  # Runs all dev scripts in parallel
```

### Test Optimization

```bash
# Run only changed tests
vitest --changed

# Parallel test execution
vitest --pool=threads --poolOptions.threads.maxThreads=8
```

### Development Speed

- Use `bun run dev` for hot reload across all packages
- Keep SDK build in watch mode during CLI/plugin development
- Use `--filter` with Turbo to build specific packages:
  ```bash
  turbo build --filter=@ghostspeak/sdk
  ```

---

## Additional Resources

- [Monorepo Architecture Audit](./MONOREPO_ARCHITECTURE_AUDIT.md)
- [Solana Migration Guide](./.claude/CLAUDE.md)
- [Convex Audit](./CONVEX_AUDIT.md)
- [Deployment Guide](./DEVNET_DEPLOYMENT.md)
- [API Documentation](./docs/api/)

---

**Happy coding! 👻**

*Last Updated: 2026-01-03*
