# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GhostSpeak** is the Solana-native AI agent commerce marketplace powered by the **x402 payment protocol**. It enables autonomous AI agents to securely trade services, complete tasks, and exchange value with instant micropayments.

### Key Characteristics

- **x402 Payment Protocol**: Native support for HTTP 402 "Payment Required" instant micropayments
- **Pure Protocol**: Decentralized blockchain protocol with smart contracts and SDKs
- **Multi-Language**: Rust smart contracts + TypeScript SDK + CLI tools
- **Web3.js v2**: Modern Solana integration with latest Web3.js v2 patterns
- **SPL Token**: Standard SPL token support with focus on USDC and stablecoins
- **Compressed NFTs**: 5000x cost reduction for agent creation using ZK compression
- **Trust Layer**: Built-in reputation, escrow, and dispute resolution for agent commerce

## Critical Awareness Directives

- **x402 Protocol Focus**: GhostSpeak implements the x402 payment standard for AI agent commerce
- Remember we are working with new technologies (November 2025) - x402 is the latest payment protocol for autonomous agents
- This project uses **@solana/kit** (formerly @solana/web3.js v2) - do NOT use old @solana/web3.js v1 patterns
- Always use Anchor 0.31.1+ compatible patterns with Solana 2.1.0 (Agave)
- **NO ZK Proofs**: We removed ZK proof infrastructure in favor of x402 micropayments

## 🔍 Mandatory kluster.ai MCP Verification Protocol

**CRITICAL REQUIREMENT**: Every code generation, file modification, and implementation MUST be verified using kluster.ai MCP tools.

### Verification Workflow (July 2025 Standards)
1. **After ANY code generation** → Immediately run kluster.ai verification
2. **Before completing tasks** → Verify all changes meet production standards
3. **For every file modification** → Use `mcp__kluster-verify-mcp__verify` tool
4. **For document-based code** → Use `mcp__kluster-verify-mcp__verify_document` tool

### Mandatory Verification Steps
```
EVERY code generation must follow this sequence:
1. Generate/modify code
2. Run: kluster.ai MCP verification
3. Address P0-P3 issues immediately
4. Re-verify until clean
5. Update memories with findings
6. Only then mark task complete
```

### Priority Response Requirements
- **P0-P1 (Intent Issues)**: STOP everything, fix immediately
  - Example: Code doesn't match user requirements, incorrect algorithm implementation
- **P2-P3 (Critical/High)**: Fix before proceeding to next task  
  - Example: Security vulnerabilities, mixed import patterns, runtime failures
- **P4-P5 (Medium/Low)**: Document for future improvement
  - Example: Code style issues, minor optimizations, missing comments

### Verification Timeout/Retry Behavior
- **Timeout**: 300 seconds per file verification
- **Retry**: Up to 3 attempts for network/temporary failures
- **Failure**: If verification fails after retries, document and proceed with manual review

### Integration Commands
- Manual verification: `bun run qa:kluster:files -- --files="path/to/file"`
- Full validation: `bun run qa:kluster:all`
- Git diff validation: `bun run qa:kluster`

## 🎯 MVP Development Goal (November 2025)

**CRITICAL**: GhostSpeak is pivoting to become the **Solana-native x402 Agent Marketplace**

### Phase 1: x402 Integration (IN PROGRESS)
- [x] **COMPLETE**: Remove ZK proof infrastructure (archived)
- [x] **COMPLETE**: x402 payment client implementation
- [x] **COMPLETE**: HTTP 402 middleware for agent services
- [x] **COMPLETE**: Agent registration updated with x402 pricing
- [ ] **IN PROGRESS**: x402 payment verification system
- [ ] **NEEDS**: Agent discovery module for x402-enabled agents
- [ ] **NEEDS**: Real-time analytics for x402 transactions

### Phase 2: Core Commerce Features (85% Complete)
- [x] **COMPLETE**: Escrow system (creation, completion, disputes)
- [x] **COMPLETE**: Multisig support in Rust
- [x] **COMPLETE**: Multisig SDK support
- [x] **COMPLETE**: Work order system with milestone payments
- [x] **COMPLETE**: Reputation system (structure ready)
- [ ] **NEEDS**: Real-time reputation updates from x402 transactions
- [ ] **NEEDS**: Unit tests for all modules

### Phase 3: Enhanced User Experience (COMPLETE ✅)
- [x] Advanced escrow features (partial refunds COMPLETE, disputes COMPLETE)
- [x] Enhanced channel system (reactions COMPLETE, attachments COMPLETE)
- [x] **COMPLETE**: Work order verification system with payment integration
- [x] **COMPLETE**: Milestone-based escrow payments with progressive release

### Phase 4: x402 Marketplace Features (NEW PRIORITY)
- [ ] **NEEDS**: x402 agent discovery API (search by capability, price, reputation)
- [ ] **NEEDS**: x402 payment streaming for long-running tasks
- [ ] **NEEDS**: x402 analytics dashboard (volume, popular agents, trends)
- [x] **COMPLETE**: Auction system for agent services
- [x] **COMPLETE**: Dutch auction mechanism
- [ ] **NEEDS**: Governance for marketplace parameters

### Phase 5: Advanced Agent Economy (40% Complete)
- [x] **COMPLETE**: Agent replication structure
- [x] **COMPLETE**: Compressed agent registration
- [ ] **NEEDS**: Full replication workflow with x402 fees
- [ ] **NEEDS**: x402-based reputation calculation
- [ ] **NEEDS**: Real-time performance metrics from x402 transactions

**FOCUS**: x402 marketplace features are now TOP PRIORITY for MVP.

## Development Memories & Context

### Current Status (November 2025) - x402 Pivot

**Strategic Pivot**: Removed ZK proof infrastructure, focusing on x402 payment protocol

- **Rust Program**: ✅ Production-ready with 200+ error types, x402 fields added to Agent struct
- **TypeScript SDK**: ✅ x402 payment client complete, HTTP 402 middleware ready
- **x402 Integration**: ✅ Basic client, ✅ Middleware, 🟡 Discovery layer in progress
- **SPL Token**: ✅ Standard token support, USDC focus for x402 payments
- **ESLint/TypeScript**: ✅ 0 errors maintained
- **Package Manager**: ✅ Using bun for fast installs and modern workspace support
- **Next Priority**: Build x402 agent discovery, complete analytics, deploy beta marketplace

### Technology Stack Specifics
- **Anchor Framework**: v0.31.1+ (November 2025 features)
- **Solana**: v2.1.0 (Agave client)
- **Web3.js**: v2+ (@solana/kit patterns only)
- **x402 Protocol**: Native implementation for AI agent micropayments
- **SPL Token**: Standard SPL token support (USDC, PYUSD primary)
- **Payment Protocol**: HTTP 402 "Payment Required" with instant settlement

### Architecture Patterns
- **Pure Protocol Design**: Smart contracts + SDKs, not a platform
- **x402 Payment Layer**: HTTP 402 middleware for pay-per-call agent services
- **Trust Layer**: Reputation + Escrow + Dispute resolution for agent commerce
- **Agent Discovery**: On-chain registry with x402 pricing and capabilities
- **Compressed NFTs**: 5000x cost reduction using ZK compression
- **IPFS Integration**: Large content storage with automatic detection
- **Rate Limiting**: Built-in anti-spam protection
- **Error Enhancement**: Detailed instruction-specific error messages

## Code Quality and Development Guidelines

### Absolute Requirements
- ✅ **0 ESLint errors** maintained at all times
- ✅ **100% TypeScript type safety** - NO `any` types except when absolutely required
- ✅ **All imports kept** unless proven unnecessary
- ⚠️ **Real implementation priority** - Replace existing placeholders and mocks
- ✅ **ESLint + TypeScript checks** run after every task

### GhostSpeak-Specific Standards
- **Instruction Naming**: Use snake_case for Rust, camelCase for TypeScript
- **x402 Integration**: All agent services MUST support HTTP 402 payment headers
- **Account Validation**: Always use instruction-account-mapper for detailed errors
- **RPC Calls**: Use TypedRpcClient interface, never raw `any` types
- **Token Operations**: Focus on SPL Token with USDC/stablecoins for x402 payments
- **Error Handling**: Use enhanced-client-errors for user-friendly messages
- **Payment Verification**: Always verify x402 payments before providing service

### Testing Philosophy
- **Unit Tests**: Required for all crypto operations (ElGamal, proofs)
- **Integration Tests**: Required for all RPC queries and instruction builders
- **Property Tests**: Required for Token-2022 extension parsing
- **Error Tests**: Required for all error enhancement paths

### Security Standards
- **No Secret Exposure**: Never log or expose private keys, seeds, or sensitive data
- **Rate Limiting**: All public instructions must include rate limiting
- **Input Validation**: All user inputs validated at instruction level
- **PDA Security**: All PDAs use canonical derivation patterns
- **Reentrancy Protection**: All state-changing instructions protected

## Context7 Library Dependencies

When implementing features, always check these libraries for latest patterns:
- `/solana/web3js` - v2+ patterns and best practices
- `/anchor-lang/anchor` - Modern Anchor patterns for 2025
- `/solana/spl-token` - Token-2022 integration patterns
- `/noble/curves` - Cryptographic operations and ElGamal

## Known Issues & Technical Debt

### High Priority
1. **ElGamal ZK Proofs**: Currently using real bulletproofs but need integration with Solana's ZK proof program
2. **Confidential Transfers**: Helper functions return mock signatures instead of real SPL calls
3. **Test Coverage**: Minimal unit tests despite complex implementations
4. **Work Order Status Updates**: No Rust instruction for status updates (handled through other instructions)

### Medium Priority
1. **Reputation System**: Many fields return default values (failed jobs, response time, disputes)
2. **Analytics Collection**: AnalyticsCollector has TODOs for tracking actual metrics
3. **Integration Tests**: Currently rely on mocks instead of real Solana interaction

### Low Priority
1. **Staking Implementation**: Reputation staking not yet implemented
2. **Badge System**: Badge calculations not implemented
3. **Cross-Category Support**: Not yet implemented for reputation

## MCP Integration Notes

- **Web Search**: Use for latest Solana/Anchor documentation (July 2025)
- **Context7**: Use for up-to-date library patterns and examples
- **IPFS**: Use for large content storage implementation patterns

### Development Memories & Guidelines

- never use "any" types unless unavoidable
- make sure when generating new code or making edits your always mindful of (prefer-nullish-coalescing)
- When generating code or making edits, always strive to pass the strictest type checks and eslint checks
- Treat warnings the same as errors
- Approach code generation with OCD-like precision to prevent even warnings from appearing when running checks

### OCD-Level TypeScript Coding Standards
- All future code must follow these OCD-level standards:
  1. ?? not || - Always use nullish coalescing for null/undefined checks
  2. ??= not if (!x) x = - Use assignment expressions for singletons
  3. No any types - Unless hardware/external APIs with ESLint suppressions
  4. Type everything - Proper interfaces and type safety
  5. Zero warnings - ESLint warnings treated as errors