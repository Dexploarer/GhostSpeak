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

## 🎯 MVP Development Goal (July 24, 2025)

**CRITICAL**: This is our **FINAL IMPLEMENTATION TARGET** for GhostSpeak Protocol MVP beta testing readiness.

### Phase 1: Core Stability (80% Complete)
- [x] ElGamal encryption structure with full bulletproofs (COMPLETE)
- [x] Token-2022 RPC infrastructure  
- [x] ESLint/TypeScript compliance (0 errors)
- [x] Multisig support in Rust (COMPLETE)
- [x] Multisig SDK support (COMPLETE)
- [ ] **NEEDS**: ElGamal ZK proof integration with Solana's proof program
- [ ] **NEEDS**: Unit tests for all modules

### Phase 2: Token-2022 Integration (60% Complete)
- [x] **COMPLETE**: Token-2022 mint creation with atomic extension initialization
- [x] **COMPLETE**: Transfer fee handling in escrow operations
- [ ] **NEEDS**: Complete confidential transfer helpers (replace mock signatures)
- [ ] **NEEDS**: Real ElGamal proof generation integration

### Phase 3: Enhanced User Experience (COMPLETE ✅)
- [x] Advanced escrow features (partial refunds COMPLETE, disputes COMPLETE)
- [x] Enhanced channel system (reactions COMPLETE, attachments COMPLETE)
- [x] **COMPLETE**: Work order verification system with payment integration
- [x] **COMPLETE**: Milestone-based escrow payments with progressive release

### Phase 4: Market Features (Partially Complete)
- [x] Basic auction system (bid placement, finalization)
- [x] **COMPLETE**: Dutch auction mechanism with time-based price decay
- [x] **COMPLETE**: Reserve price implementation with automatic extension
- [ ] **NEEDS**: Real-time analytics collection
- [ ] **NEEDS**: Governance voting mechanism
- [ ] **NEEDS**: Proposal execution system

### Phase 5: Advanced Agent Economy (Structure Ready)
- [x] Basic agent replication (template system exists)
- [x] Compressed agent registration (instruction exists)
- [ ] **NEEDS**: Full replication workflow
- [ ] **NEEDS**: Advanced reputation calculation
- [ ] **NEEDS**: Performance-based reputation updates

**NO ADDITIONAL FEATURES** beyond this scope. This is our complete MVP.

## Development Memories & Context

### Current Status (July 24, 2025)
- **Rust Program**: ✅ Production-ready with 200+ error types, full validation, security
- **TypeScript SDK**: 🟡 All instruction builders complete, but has placeholder code
- **ElGamal**: ✅ Full bulletproof implementation, 🟡 needs ZK proof program integration
- **Token-2022**: ✅ Mint creation with extensions, ✅ Transfer fee support
- **ESLint/TypeScript**: ✅ 0 errors maintained
- **Package Manager**: ✅ Using bun for fast installs and modern workspace support
- **Next Priority**: Replace mock implementations with real SPL calls, complete testing

### Technology Stack Specifics
- **Anchor Framework**: v0.31.1+ (July 2025 features)
- **Solana**: v2.1.0 (Agave client)
- **Web3.js**: v2+ (@solana/kit patterns only)
- **SPL Token 2022**: Latest with confidential transfers
- **Cryptography**: @noble/curves for ElGamal/ed25519
- **ZK Proofs**: Solana's ZK ElGamal Proof Program integration

### Architecture Patterns
- **Pure Protocol Design**: Smart contracts + SDKs, not a platform
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
- **Account Validation**: Always use instruction-account-mapper for detailed errors  
- **RPC Calls**: Use TypedRpcClient interface, never raw `any` types
- **Token Operations**: Support both legacy Token and Token-2022 programs
- **Error Handling**: Use enhanced-client-errors for user-friendly messages
- **Crypto Operations**: Use @noble/curves, never custom implementations

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