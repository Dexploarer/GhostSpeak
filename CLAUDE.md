# CLAUDE.md - Memory & Rules for Ghostspeak/PodAI Development

## 🚨 CRITICAL RULE: SOLANA WEB3.JS V2 ONLY

**ABSOLUTE REQUIREMENT: This codebase exclusively uses Solana Web3.js v2. NO v1 code is permitted under any circumstances.**

### Web3.js Version Enforcement Rules

1. **NEVER use v1 imports**:
   ```typescript
   // ❌ FORBIDDEN - Will cause immediate rejection
   import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
   ```

2. **ALWAYS use v2 modular imports**:
   ```typescript
   // ✅ REQUIRED - Only acceptable pattern
   import { createSolanaRpc } from '@solana/rpc';
   import { generateKeyPairSigner } from '@solana/signers';
   import { address } from '@solana/addresses';
   import { createTransaction } from '@solana/transactions';
   ```

3. **Required Patterns**:
   - Keypairs: `generateKeyPairSigner()` (not `Keypair.generate()`)
   - Addresses: `address()` function (not `new PublicKey()`)
   - RPC: `createSolanaRpc()` (not `new Connection()`)
   - Amounts: BigInt with `n` suffix (not regular numbers)
   - Transactions: `createTransaction()` with factory pattern

### Code Review Red Flags

If you see ANY of these patterns in code, it's a v1 violation:
- `new Connection()`
- `new PublicKey()`
- `Keypair.generate()`
- `transaction.add()`
- `.secretKey`
- `new Transaction()`
- `sendTransaction()` without factory

### Project Structure Context

This is a multi-package monorepo with:
- `packages/sdk-typescript/` - Main TypeScript SDK (v2 only)
- `packages/sdk-rust/` - Rust SDK
- `packages/cli/` - Command line interface
- `packages/cursor-extension/` - VS Code extension

### Package Dependencies

Current correct v2 dependencies:
```json
{
  "@solana/web3.js": "2.1.1",
  "@solana/kit": "2.1.1",
  "@solana/rpc": "2.1.1",
  "@solana/signers": "2.1.1",
  "@solana/addresses": "2.1.1",
  "@solana/transactions": "2.1.1"
}
```

### Performance Requirements

- Bundle size must be optimized (tree-shaking enabled)
- Use factory patterns for configurable operations
- Prefer async/await over promises
- Use BigInt for all Solana amounts
- Implement proper error handling with v2 error types

### Testing Standards

- All tests must use v2 patterns
- Mock RPC using v2 factory functions
- Use proper v2 address generation for tests
- Test bundle size and tree-shaking effectiveness

### Documentation Requirements

- All examples must show v2 patterns only
- Include migration notes if interfacing with legacy systems
- Document performance benefits of v2 approach
- Emphasize type safety improvements

### Development Tools

- Use Bun as primary package manager
- TypeScript 5.8.3 with strict mode
- Codama for program client generation
- ESLint with v2-specific rules

### Deployment Context

- Supports both devnet and mainnet-beta
- Uses Anchor framework for Solana programs
- Integrates with Jupiter for token swaps
- Supports SPL Token 2022 and confidential transfers

---

## Additional Development Rules

### Code Style
- Use camelCase for variables (e.g., `keyPair` not `keypair`)
- Prefer explicit typing over `any`
- Use meaningful variable names
- Follow existing architectural patterns

### Error Handling
- Use Result types for operations that can fail
- Provide meaningful error messages
- Log errors appropriately without exposing sensitive data
- Handle network timeouts gracefully

### Security
- Never log private keys or sensitive data
- Validate all inputs from external sources
- Use secure random number generation
- Implement proper access controls

### Performance
- Use connection pooling for RPC calls
- Implement caching where appropriate
- Optimize bundle size through tree-shaking
- Profile critical code paths

---

**REMEMBER: Web3.js v2 is not just preferred - it's mandatory. Any v1 code is a critical bug that must be fixed immediately.**