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
- **Privacy Layer**: Client-side ElGamal encryption for confidential transfers and private agent communications
- **Trust Layer**: Built-in reputation, escrow, and dispute resolution for agent commerce

## Critical Awareness Directives

- **x402 Protocol Focus**: GhostSpeak implements the x402 payment standard for AI agent commerce
- Remember we are working with new technologies (November 2025) - x402 is the latest payment protocol for autonomous agents
- This project uses **@solana/kit** (formerly @solana/web3.js v2) - do NOT use old @solana/web3.js v1 patterns
- Always use Anchor 0.32.1 compatible patterns with Solana 2.3.13 (Agave)
- **Privacy Layer**: Privacy features using client-side ElGamal encryption (Solana ZK ElGamal program is post-mortem, not waiting for it)

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

### Phase 1: x402 Integration (COMPLETE ✅)
- [x] **COMPLETE**: Remove ZK proof infrastructure (archived)
- [x] **COMPLETE**: x402 payment client implementation (X402Client.ts - 596 lines)
- [x] **COMPLETE**: HTTP 402 middleware for agent services (Express + Fastify support)
- [x] **COMPLETE**: Agent registration updated with x402 pricing (7 new fields in Agent struct)
- [x] **COMPLETE**: x402 payment verification system (verifyPayment + verifyPaymentDetails)
- [x] **COMPLETE**: Agent discovery module for x402-enabled agents (AgentDiscoveryClient.ts - 598 lines)
- [x] **COMPLETE**: Real-time analytics for x402 transactions (analytics.ts - 400+ lines)

### Phase 2: Core Commerce Features (COMPLETE ✅)
- [x] **COMPLETE**: Escrow system (creation, completion, disputes, partial refunds)
- [x] **COMPLETE**: Multisig support in Rust (3 instructions)
- [x] **COMPLETE**: Multisig SDK support (full TypeScript integration)
- [x] **COMPLETE**: Work order system with milestone payments
- [x] **COMPLETE**: Reputation system (on-chain state + calculation logic)
- [x] **COMPLETE**: Real-time reputation updates from x402 transactions (submit_x402_rating instruction)
- [ ] **IN PROGRESS**: Comprehensive Rust integration tests (infrastructure exists, implementations needed)

### Phase 3: Enhanced User Experience (COMPLETE ✅)
- [x] Advanced escrow features (partial refunds COMPLETE, disputes COMPLETE)
- [x] Enhanced channel system (reactions COMPLETE, attachments COMPLETE)
- [x] **COMPLETE**: Work order verification system with payment integration
- [x] **COMPLETE**: Milestone-based escrow payments with progressive release

### Phase 4: x402 Marketplace Features (95% Complete ✅)
- [x] **COMPLETE**: x402 agent discovery API (search by capability, price, reputation)
  - Full-featured AgentDiscoveryClient with search, filter, sort, pagination
  - Caching system with configurable TTL
  - Support for multiple query types (capability, token, price range)
- [x] **COMPLETE**: x402 payment streaming for long-running tasks (PaymentStreaming.ts - 500+ lines)
  - Milestone-based payment releases
  - Auto-resume on failure
  - Event-driven architecture
- [x] **COMPLETE**: x402 analytics dashboard data (X402AnalyticsTracker with real-time metrics)
  - Payment volume tracking
  - Agent performance metrics
  - Success rate calculations
- [x] **COMPLETE**: Auction system for agent services
- [x] **COMPLETE**: Dutch auction mechanism
- [ ] **IN PROGRESS**: Governance enhancements (delegation logic TODOs remain)

### Phase 5: Advanced Agent Economy (80% Complete)
- [x] **COMPLETE**: Agent replication structure (parent_agent, generation fields)
- [x] **COMPLETE**: Compressed agent registration (cNFT support with merkle trees)
- [x] **COMPLETE**: x402-based reputation calculation (submit_x402_rating with EMA algorithm)
- [x] **COMPLETE**: Real-time performance metrics tracking (response_time_ms in payment events)
- [ ] **IN PROGRESS**: Full replication workflow integration tests
- [ ] **NEEDS**: Production deployment for real-world metrics collection

### Phase 6: Privacy Layer (IN PROGRESS 🚧)
- [x] **COMPLETE**: Client-side ElGamal encryption implementation
- [x] **COMPLETE**: Encrypted metadata storage via IPFS
- [x] **COMPLETE**: Privacy-preserving work orders
- [x] **COMPLETE**: Confidential agent communications
- [ ] **IN PROGRESS**: Production-ready privacy API integration
- [ ] **IN PROGRESS**: Privacy feature documentation and examples
- [ ] **PENDING**: Privacy layer security audit

**FOCUS**: Privacy layer and x402 marketplace features are TOP PRIORITY for MVP.

## Development Memories & Context

### Current Status (November 2025) - x402 Production Ready

**Strategic Achievement**: Complete x402 payment protocol implementation with 92,300+ lines of production code

- **Privacy Layer**: ✅ Client-side encryption (ElGamal) ✅ IPFS metadata storage 🟡 Production integration in progress
- **Rust Program**: ✅ Production-ready with 200+ error types, 29 instructions, comprehensive security
- **TypeScript SDK**: ✅ Complete x402 implementation (Client, Middleware, Discovery, Streaming, Analytics)
- **x402 Integration**: ✅ Full stack - Client ✅ Middleware ✅ Discovery ✅ Streaming ✅ Analytics
- **SPL Token**: ✅ Token-2022 with transfer fee support, USDC/PYUSD focused
- **Code Quality**: ✅ 0 ESLint errors, 0 `any` types, strict TypeScript
- **Test Coverage**: ✅ 88 TypeScript test files, 🟡 Rust integration tests in progress
- **Documentation**: ✅ 9 comprehensive guides (10,071 lines)
- **Security**: ✅ Reentrancy guards, rate limiting, input validation, safe arithmetic
- **Next Priority**: Complete Rust integration tests, security audit, deploy to devnet

### Technology Stack Specifics
- **Anchor Framework**: v0.32.1 (November 2025 features)
- **Solana**: v2.3.13 (Agave client)
- **Web3.js**: v2+ (@solana/kit patterns only)
- **x402 Protocol**: Native implementation for AI agent micropayments
- **SPL Token**: Standard SPL token support (USDC, PYUSD primary)
- **Payment Protocol**: HTTP 402 "Payment Required" with instant settlement

### Architecture Patterns
- **Pure Protocol Design**: Smart contracts + SDKs, not a platform
- **x402 Payment Layer**: HTTP 402 middleware for pay-per-call agent services
- **Privacy Layer**: Client-side ElGamal encryption for confidential transfers and private communications
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

### Critical Priority (Blockers to Mainnet)
1. **Rust Integration Tests**: Test infrastructure exists, implementations needed (2-3 days)
   - Remove `#[ignore]` from placeholder tests
   - Add actual Solana program interaction tests
   - Focus: escrow, x402 operations, governance
2. **Security Audit**: Professional audit required before mainnet (4-6 weeks)
   - Recommend: Trail of Bits, Halborn, or OtterSec
   - Focus areas: escrow, multisig, x402 instructions
   - Budget: $50k-$100k
3. **Circuit Breaker**: Emergency pause mechanism not implemented (1 day)
   - Admin-controlled emergency pause for critical bugs
   - Gradual resume with safeguards

### High Priority (Pre-Mainnet)
4. **Property-Based Testing**: Crypto operations need property tests (2-3 days)
   - Token-2022 extension parsing
   - ElGamal operations
   - Reputation score calculations
5. **Fuzzing Tests**: Instruction parser fuzzing not implemented (2-3 days)
   - Use cargo-fuzz for instruction deserialization
   - Test boundary conditions and malformed inputs
6. **Governance Enhancements**: Delegation logic TODOs (1-2 days)
   - Enhanced delegation in governance module
   - Proxy voting capabilities
7. **Load Testing**: Performance benchmarks needed (1-2 days)
   - x402 payment throughput testing
   - Discovery client query optimization
   - Connection pool tuning

### Medium Priority (Post-Launch)
8. **Privacy Layer Enhancements**: Additional privacy features and optimizations (future)
9. **Reputation Analytics**: Real-time metrics collection in production
10. **WebSocket Notifications**: Real-time event streaming (1 week)

### Low Priority
11. **Staking Implementation**: Reputation staking (future enhancement)
12. **Badge System**: Badge calculations (future enhancement)
13. **Cross-Category Support**: Multi-category reputation (future enhancement)

### Recently Resolved ✅
1. **x402 Protocol Integration**: Complete implementation across all layers (November 2025)
2. **Agent Discovery**: Full-featured discovery client with caching (November 2025)
3. **Payment Streaming**: Milestone-based streaming for long-running tasks (November 2025)
4. **Analytics System**: Real-time x402 transaction metrics (November 2025)
5. **Confidential Transfer Mocks**: Removed placeholder functions (November 2025)
6. **Documentation**: 9 comprehensive guides totaling 10,071 lines (November 2025)

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