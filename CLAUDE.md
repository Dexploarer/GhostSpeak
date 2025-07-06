# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GhostSpeak** is a production-ready AI agent commerce protocol built on Solana blockchain. It enables autonomous AI agents to securely trade services, complete tasks, and exchange value with each other and humans through a decentralized protocol.

### Key Characteristics
- **Pure Protocol**: Not a platform - a decentralized blockchain protocol with smart contracts and SDKs
- **Multi-Language**: Rust smart contracts + TypeScript/Rust SDKs + CLI tools
- **Web3.js v2**: Modern Solana integration with latest Web3.js v2 patterns
- **SPL Token 2022**: Advanced token features including confidential transfers
- **Compressed NFTs**: 5000x cost reduction for agent creation using ZK compression

## Common Development Commands

### Build Commands
```bash
# Build all packages (recommended)
bun run build

# Build specific components
bun run build:rust          # Build Rust components
bun run build:typescript    # Build TypeScript components
bun run build:production    # Production build with tests
```

### Test Commands
```bash
# Run all tests
bun run test

# Run specific test suites
bun run test:rust           # Rust tests (smart contracts + SDK)
bun run test:typescript     # TypeScript tests
bun run test:integration    # Integration tests
bun run test:e2e            # End-to-end tests
bun run test:security       # Security audit tests
```

### Development Commands
```bash
# Start development
bun run dev                 # Start TypeScript SDK dev mode
bun run dev:cli            # Start CLI dev mode

# Code quality
bun run lint               # Run all linters
bun run format             # Format all code
bun run audit              # Security audit
```

### Smart Contract Development
```bash
# Build and deploy contracts
anchor build
anchor deploy --provider.cluster devnet
anchor test

# From packages/core directory
cargo build --release
cargo test
```

## Architecture Overview

GhostSpeak follows a **five-layer modular architecture**:

1. **Infrastructure Layer**: Solana blockchain, RPC endpoints, wallet integration
2. **Protocol Layer**: Smart contracts (`packages/core/`) - Agent marketplace, escrow, messaging
3. **Service Layer**: Business logic in both SDKs - Agent registration, task delegation, payments
4. **SDK Layer**: Client libraries (`packages/sdk-typescript/`, `packages/sdk-rust/`)
5. **Application Layer**: CLI tools (`packages/cli/`), frontend integrations

### Package Structure
```
packages/
├── core/              # Rust smart contracts (Anchor framework)
│   └── programs/
│       └── agent-marketplace/  # Main protocol program
├── sdk-typescript/    # TypeScript SDK (Web3.js v2)
├── sdk-rust/         # Rust SDK (high-performance)
└── cli/              # Interactive CLI tools
```

## Current Deployment Status

### ✅ **Program Built and IDL Generated**
- Smart contract successfully compiled with Anchor 0.31.1
- Real IDL file generated at `target/idl/podai_marketplace.json`
- Program artifacts available in `target/deploy/`

### ✅ **Program ID Consistency**
- **Canonical Program ID**: `4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP`
- All TypeScript SDK files updated with correct program ID
- IDL metadata contains correct program address

### ✅ **TypeScript SDK Integration**
- **Real IDL Integration**: Generated code from actual smart contract IDL
- **Web3.js v2 Native**: All instruction builders use modern patterns
- **No Mock Data**: SDK connects to real program interface
- **Generated Files**: Complete instruction builders in `src/generated-v2/`

### ⚠️ **Deployment Status**
- **Program Compiled**: Successfully built for Solana blockchain
- **Devnet Deployment**: Ready but requires sufficient SOL for deployment
- **Program Artifacts**: Available and valid for deployment

### **Next Steps for Complete Deployment**
1. **Fund Deployment**: Obtain sufficient devnet SOL for program deployment
2. **Deploy Program**: Run `anchor deploy --provider.cluster devnet`
3. **Verify Integration**: Test SDK against deployed program on devnet
4. **Production Testing**: Run comprehensive integration tests

## Key Technical Patterns

### Web3.js v2 Integration
- **Modern Patterns**: Uses latest Web3.js v2 with tree-shakable modules
- **No Legacy Code**: Completely avoids Web3.js v1 patterns
- **Type Safety**: Comprehensive TypeScript types throughout
- **Performance**: Optimized for bundle size and runtime performance

### Smart Contract Architecture
- **Anchor Framework**: All smart contracts use Anchor 0.31.1+
- **SPL Token 2022**: Advanced token features for payments and royalties
- **Compressed NFTs**: ZK compression for cost-effective agent creation
- **PDA Patterns**: Proper Program Derived Address usage throughout

### Error Handling Strategy
- **Comprehensive**: Every error condition handled in both Rust and TypeScript
- **Type Safety**: Strongly typed errors with detailed context
- **Recovery**: Graceful degradation and retry mechanisms
- **Logging**: Structured logging for debugging and monitoring

## Development Workflows

### Feature Development Process
1. **Research Phase**: Always research current best practices and validate assumptions
2. **Smart Contract First**: Implement blockchain logic before SDK integration
3. **Test-Driven**: Write tests alongside implementation
4. **Documentation**: Complete API documentation with working examples
5. **Integration**: Test with real blockchain data, no mocks in production paths

### Code Quality Standards
- **Production-Ready**: No stubs, mocks, or placeholders in production code
- **Security-First**: All inputs validated, proper access control
- **Performance**: Optimized for Solana's compute unit constraints
- **Documentation**: Complete JSDoc/rustdoc for all public APIs

## Key Configuration Files

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Required environment variables
SOLANA_NETWORK=devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

### Package Manager
- **Primary**: Bun 1.2.15+ (preferred for speed)
- **Fallback**: Node.js 20+ with npm/yarn
- **Rust**: Cargo with workspace dependencies

## Important Implementation Notes

### Absolute Prohibitions
- **No Mock Data**: All production code must use real blockchain interactions
- **No Stubs**: Complete implementations only
- **No Hardcoded Values**: Use configuration and constants
- **No Web3.js v1**: Only use Web3.js v2 patterns

### Required Before Commits
```bash
# Quality gates that must pass
bun run lint                # Zero warnings allowed
bun run test:critical       # Critical tests must pass
bun run audit:all          # Security audit clean
```

### Testing Strategy
- **Unit Tests**: For individual functions and components
- **Integration Tests**: With real Solana RPC calls (using solana-bankrun)
- **E2E Tests**: Complete user workflows
- **Security Tests**: Vulnerability and penetration testing

## Performance Considerations

### Smart Contract Optimization
- **Compute Units**: Target <200,000 CU per instruction
- **Account Allocation**: Minimize on-chain storage
- **Batch Operations**: Use when possible for efficiency

### SDK Performance
- **Bundle Size**: <50KB for TypeScript SDK, <100KB for CLI
- **Tree Shaking**: Ensure unused code is eliminated
- **Connection Pooling**: Efficient RPC usage
- **Caching**: Strategic caching of blockchain data

## Security Requirements

### Smart Contract Security
- **Input Validation**: All instruction inputs validated
- **Access Control**: Proper permission checks
- **PDA Security**: Correct derivation and ownership
- **Overflow Protection**: Safe arithmetic operations

### SDK Security
- **Input Sanitization**: All user inputs sanitized
- **Key Management**: Secure keypair handling
- **Network Validation**: Environment-specific RPC endpoints
- **Error Disclosure**: No sensitive information in errors

## Development Tools Integration

### Cursor IDE Rules
- Follows `.cursor/rules/` for coding standards
- Uses `.cursor/memory/` for project context
- Implements `.cursor/workflows/` for development processes

### Pre-commit Hooks
```bash
# Automatically runs on commit
bun run pre-commit    # Lint + critical tests
```

### CI/CD Integration
- **GitHub Actions**: Automated testing and deployment
- **Security Scanning**: Dependency and code security checks
- **Performance Testing**: Benchmark regression detection

## Common Troubleshooting

### Build Issues
- Ensure Bun 1.2.15+ is installed
- Check Rust toolchain version (1.70+)
- Verify Anchor CLI installation (0.31.1+)

### Test Failures
- Check Solana test validator is running
- Verify devnet RPC endpoint availability
- Ensure proper keypair configuration

### Performance Issues
- Check compute unit usage in smart contracts
- Verify bundle size limits not exceeded
- Monitor RPC call frequency and patterns

## Documentation Standards

### Code Documentation
- **Rust**: Complete rustdoc with examples
- **TypeScript**: JSDoc with type annotations
- **Examples**: Working code examples for all public APIs

### Architecture Documentation
- **ADRs**: All major decisions in `adr/` directory
- **API Docs**: Generated from source comments
- **Integration Guides**: Complete setup and usage guides

## Current Integration Status

The system is **deployment-ready** with:
- ✅ **Real Smart Contract**: Compiled Anchor program with IDL
- ✅ **Real SDK Integration**: TypeScript SDK using actual program interface
- ✅ **Program ID Consistency**: All components use `4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP`
- ✅ **Web3.js v2 Native**: Modern Solana integration patterns
- ✅ **No Mock Data**: Production-ready blockchain integration

This repository represents a production-ready implementation of an AI agent commerce protocol. All code meets enterprise-grade quality standards with comprehensive testing, security measures, and documentation.