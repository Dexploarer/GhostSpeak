# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GhostSpeak** is a production-ready AI agent commerce protocol built on Solana blockchain. It enables autonomous AI agents to securely trade services, complete tasks, and exchange value with each other and humans through a decentralized protocol.

### Key Characteristics

- **Pure Protocol**: Not a platform - a decentralized blockchain protocol with smart contracts and SDKs
- **Multi-Language**: Rust smart contracts + TypeScript SDK + CLI tools
- **Web3.js v2**: Modern Solana integration with latest Web3.js v2 patterns
- **SPL Token 2022**: Advanced token features including confidential transfers
- **Compressed NFTs**: 5000x cost reduction for agent creation using ZK compression

## Critical Awareness Directives

- Remember we are working with new technologies (July 2025) so you can't revert back to old methods that you have been trained on, constantly search context7 mcp server and the web
- When generating the IDL make sure to use the 2025 methods especially for the SPL-2022 and new Solana features
- This project uses **@solana/kit** (formerly @solana/web3.js v2) - do NOT use old @solana/web3.js v1 patterns
- Always use Anchor 0.31.1+ compatible patterns with Solana 2.1.0 (Agave)

## Development Memories

- Let's focus on the Codama generation on the highest priority, and replace all placeholder code with real implementation only from here on out

## Common Development Commands

### Build Commands
```bash
# Build smart contracts (Rust)
anchor build
anchor build --release  # Production build

# Build TypeScript packages
npm run build:sdk       # Build SDK only
npm run build:cli       # Build CLI only
npm run build:packages  # Build all TypeScript packages

# Build everything
npm run build
```

### Test Commands
```bash
# Run all tests
anchor test

# Quick Rust tests (recommended for development)
cd programs && cargo test

# TypeScript SDK tests
cd packages/sdk-typescript && npm test

# CLI tests
cd packages/cli && npm test

# Run specific test file
cd packages/sdk-typescript && npm test -- path/to/test.ts
```

### Lint and Format
```bash
# Rust linting
npm run lint  # or: cd programs && cargo clippy -- -D warnings

# Rust formatting
npm run format  # or: cd programs && cargo fmt

# TypeScript linting
cd packages/sdk-typescript && npm run lint
cd packages/cli && npm run lint
```

### Development Workflow
```bash
# Start SDK in watch mode
npm run dev:sdk

# Start CLI in watch mode
npm run dev:cli

# Generate IDL after smart contract changes
anchor idl build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get SOL for development testing
npx ghostspeak faucet --save
npx ghostspeak faucet --network devnet --amount 2

# CLI Development Commands
npx ghostspeak --help                    # Show all commands
npx ghostspeak agent register --help     # Register AI agents
npx ghostspeak marketplace list          # Browse marketplace
npx ghostspeak faucet status            # Check faucet limits
```

## High-Level Architecture

### Smart Contract Structure (`programs/src/`)

The main program is organized into modular instruction handlers and state accounts:

**Key Instruction Modules:**
- `instructions/agent.rs` - Agent registration, verification, and management
- `instructions/marketplace.rs` - Service listings and marketplace operations
- `instructions/escrow_payment.rs` - Secure payment handling with escrow
- `instructions/messaging.rs` - On-chain messaging between agents
- `instructions/a2a_protocol.rs` - Agent-to-Agent communication protocol
- `instructions/work_orders.rs` - Work order creation and fulfillment

**State Architecture:**
- Each entity (Agent, Listing, WorkOrder, etc.) has its own state account
- Uses Program Derived Addresses (PDAs) for deterministic account addresses
- Implements account versioning for future upgrades
- All monetary values use u64 with 6 decimal places (USDC standard)

**Security Patterns:**
- Every instruction validates authority and ownership
- Uses `require!` macros for input validation
- Implements reentrancy guards on payment operations
- All arithmetic operations use checked math

### SDK Architecture (`packages/sdk-typescript/`)

The SDK provides a modular client interface built on Web3.js v2:

**Core Components:**
- `client/GhostSpeakClient.ts` - Main client class with modular instruction handlers
- `instructions/` - Separate modules for each protocol feature (agent, marketplace, escrow, etc.)
- `types/` - TypeScript types matching on-chain structures
- `utils/` - Transaction builders and helper functions

**Key Design Patterns:**
- Uses dependency injection for Connection and Signer
- Instruction builders return transaction instructions (not full transactions)
- Client methods handle transaction building and sending
- All methods are async and return proper TypeScript types

### CLI Architecture (`packages/cli/`)

Interactive CLI built with Clack prompts for beautiful terminal UI:

**Command Structure:**
- `agent` - Agent management (register, list, search, status, update)
- `marketplace` - Service marketplace (list, create, purchase, search, jobs)
- `escrow` - Payment management (create, list, release, dispute)
- `channel` - A2A communication (create, list, send)
- `faucet` - Development SOL faucet (Solana, Alchemy, RPC with rate limiting)
- `config` - CLI configuration (setup, show, reset)

**Key Features:**
- Uses Clack for interactive prompts with validation
- Implements proper error handling and user feedback
- **Production-ready faucet system** with rate limiting and multiple sources
- Real Web3.js v2 transaction execution with verification URLs
- Beautiful ASCII art banner and colored output

**Faucet System Features:**
- **Multiple Sources**: Solana Official, Alchemy, RPC Airdrop
- **Rate Limiting**: 1 hour between requests per source
- **Daily Limits**: Max 10 requests per wallet per day
- **Request Tracking**: Persistent history and statistics
- **Wallet Management**: Generate, save, and reuse development wallets
- **Status Monitoring**: Check limits and request history
- **Network Support**: devnet and testnet
- **Command Examples**:
  ```bash
  npx ghostspeak faucet --save              # Get SOL + save wallet
  npx ghostspeak faucet status              # Check rate limits
  npx ghostspeak faucet generate --save     # New dev wallet
  npx ghostspeak faucet sources             # List all sources
  ```

## Program ID and Deployment

- **Program ID**: `5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK`
- **Current Network**: Devnet
- **Anchor Version**: 0.31.1
- **Solana Version**: 2.1.0 (Agave)

## Important Implementation Notes

### Web3.js v2 Migration
The project uses the new @solana/kit package (Web3.js v2). Key differences:
- Use `@solana/kit` imports, not `@solana/web3.js`
- Transactions use the new builder pattern
- RPC methods return typed responses
- Tree-shakeable modules for smaller bundle sizes

### SPL Token 2022 Support
The protocol supports SPL Token 2022 features:
- Confidential transfers for privacy
- Transfer fees for marketplace revenue
- Interest-bearing tokens for yield generation
- Programmable transfer hooks

### Compressed NFTs Integration
Work deliverables can be stored as compressed NFTs:
- 5000x cost reduction vs regular NFTs
- Uses Merkle tree for verification
- Integrates with Metaplex Bubblegum

### Error Handling
The project uses a comprehensive error system:
- Custom error codes in `ErrorCode` enum
- Descriptive error messages for debugging
- Proper error propagation in SDK
- User-friendly error messages in CLI

## Testing Strategy

### Smart Contract Tests
- Unit tests for each instruction handler
- Integration tests for complex workflows
- Security tests for edge cases and attacks
- Performance benchmarks for gas optimization

### SDK Tests
- Unit tests for instruction builders
- Integration tests with local validator
- Mock tests for client methods
- End-to-end tests for full workflows

### CLI Tests
- Unit tests for command handlers
- Mock tests for user interactions
- Integration tests with SDK
- Snapshot tests for output formatting