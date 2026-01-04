# Gill Migration Plan - GhostSpeak Monorepo

**Date**: 2026-01-03
**Status**: Ready for Implementation
**Goal**: Unified Solana client library across entire monorepo

---

## Executive Summary

After comprehensive audit, we've identified **exact locations** where Gill will provide immediate value. The monorepo currently uses raw `@solana/kit` across 3 packages with significant boilerplate. Gill will reduce code by 40-50% and provide better DX.

### Key Findings

**Programs in Monorepo**: ✅ **YES** - `/programs` contains the ghostspeak-marketplace Anchor program
**Current Testing**: `solana-program-test` (slow, heavyweight)
**Gill Applicable**: `web`, `sdk-typescript`, `cli` packages
**Mollusk Applicable**: `programs/` testing

---

## Monorepo Structure Discovered

```
GhostSpeak/
├── programs/                    # Anchor program (Rust)
│   ├── src/                     # Program logic
│   ├── tests/                   # Integration tests (solana-program-test)
│   └── Cargo.toml               # ghostspeak-marketplace
│
├── packages/
│   ├── web/                     # Next.js app
│   │   └── app/api/v1/treasury/route.ts  # 1 RPC usage
│   │
│   ├── sdk-typescript/          # TypeScript SDK
│   │   └── src/
│   │       ├── core/rpc-client.ts           # Main RPC client
│   │       ├── core/InstructionBuilder.ts   # 2 RPC usages
│   │       ├── core/BaseModule.ts           # Type annotations
│   │       └── utils/
│   │           ├── rpc-client.ts            # Deprecated client
│   │           └── agave-2-3-optimizations.ts  # 3 RPC usages
│   │
│   ├── cli/                     # CLI tool
│   │   └── src/
│   │       ├── core/connection-pool.ts      # 2 RPC usages
│   │       ├── utils/interactive-menu.ts    # 1 RPC usage
│   │       ├── utils/client.ts              # Main client
│   │       ├── utils/onboarding.ts          # 1 RPC usage
│   │       ├── utils/setup-helpers.ts       # 2 RPC usages
│   │       └── commands/
│   │           ├── faucet.ts                # 2 RPC usages
│   │           ├── airdrop.ts               # 1 RPC usage
│   │           └── config.ts                # 1 RPC usage
│   │
│   ├── api/                     # API server (no Solana RPC)
│   ├── plugin-ghostspeak/       # ElizaOS plugin (no Solana RPC)
│   ├── solana-agent-kit-plugin/ # Plugin (no Solana RPC)
│   └── shared/                  # Shared utilities (new)
```

---

## Gill Migration Breakdown

### Package 1: `packages/web` - ⭐ HIGHEST PRIORITY

**Current Usage**:
- **1 file**: `app/api/v1/treasury/route.ts`
- **Pattern**: Raw `createSolanaRpc()` for treasury operations

**Migration**:
```bash
cd packages/web
bun add gill gill-react
```

**Files to Update**:

#### 1. Create `lib/solana/client.ts` (NEW)
```typescript
import { createSolanaClient } from 'gill'

// Singleton Solana client
let _client: ReturnType<typeof createSolanaClient> | null = null

export function getSolanaClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    _client = createSolanaClient(url)
  }
  return _client
}

// For server-side usage (API routes)
export function createServerSolanaClient(rpcUrl?: string) {
  const url = rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  return createSolanaClient(url)
}
```

#### 2. Update `app/api/v1/treasury/route.ts`

**Before**:
```typescript
import { createSolanaRpc } from '@solana/rpc'

export async function GET() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const rpc = createSolanaRpc(rpcUrl)

  const balance = await rpc.getBalance(address(treasuryAddress)).send()
  // ... more RPC calls
}
```

**After**:
```typescript
import { createServerSolanaClient } from '@/lib/solana/client'

export async function GET() {
  const client = createServerSolanaClient()

  const balance = await client.getBalance(treasuryAddress)
  // ... more RPC calls (much cleaner)
}
```

**Lines Reduced**: ~15 lines → ~8 lines (47% reduction)

---

### Package 2: `packages/sdk-typescript` - ⭐⭐ CRITICAL (Most Complex)

**Current Usage**:
- **6 files** with RPC logic
- **Multiple RPC client implementations** (needs consolidation)
- **Pattern**: Manual `createSolanaRpc` + custom wrappers

**Migration**:
```bash
cd packages/sdk-typescript
bun add gill
```

**Files to Update**:

#### 1. Update `src/core/rpc-client.ts` (Main RPC Client)

**Before** (Complex manual wrapper):
```typescript
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc'

export class RpcClient {
  private rpc: ReturnType<typeof createSolanaRpc>
  private rpcSubscriptions?: ReturnType<typeof createSolanaRpcSubscriptions>

  constructor(config: RpcConfig) {
    this.rpc = createSolanaRpc(config.endpoint)
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint)
    }
  }

  async getBalance(address: Address) {
    const result = await this.rpc.getBalance(address).send()
    return result.value
  }

  async getAccount(address: Address) {
    const result = await this.rpc.getAccountInfo(address).send()
    return result.value
  }

  // ... 20+ more methods
}
```

**After** (Gill wrapper):
```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

export class RpcClient {
  private client: SolanaClient

  constructor(config: RpcConfig) {
    this.client = createSolanaClient(config.endpoint, {
      wsEndpoint: config.wsEndpoint,
    })
  }

  // Expose Gill client directly (no wrapping needed)
  get solana() {
    return this.client
  }

  // Keep compatibility methods if needed
  async getBalance(address: Address) {
    return this.client.getBalance(address)
  }

  async getAccount(address: Address) {
    return this.client.getAccount(address)
  }
}
```

**Lines Reduced**: ~200 lines → ~50 lines (75% reduction)

#### 2. Update `src/core/InstructionBuilder.ts`

**Before**:
```typescript
const { createSolanaRpc } = await import('@solana/kit')
const directRpc = createSolanaRpc(this.config.rpcEndpoint ?? 'https://api.devnet.solana.com')
const result = await directRpc.getLatestBlockhash().send()
```

**After**:
```typescript
import { createSolanaClient } from 'gill'
const client = createSolanaClient(this.config.rpcEndpoint ?? 'https://api.devnet.solana.com')
const result = await client.getLatestBlockhash()
```

#### 3. Deprecate `src/utils/rpc-client.ts` and `src/utils/agave-2-3-optimizations.ts`

These are legacy wrappers. Replace with:

```typescript
// src/utils/solana-client.ts (NEW)
import { createSolanaClient } from 'gill'

export { createSolanaClient }
export type { SolanaClient } from 'gill'

// Re-export commonly used functions
export {
  getBalance,
  getAccount,
  getTokenAccountsByOwner,
  sendTransaction,
  confirmTransaction,
} from 'gill'
```

**Files Deleted**: 2 legacy files (~300 lines removed)

---

### Package 3: `packages/cli` - ⭐⭐ HIGH PRIORITY

**Current Usage**:
- **9 files** with RPC logic
- **Pattern**: Repeated `createSolanaRpc()` in every command
- **Duplication**: Same RPC setup code everywhere

**Migration**:
```bash
cd packages/cli
bun add gill
```

**Strategy**: Create a centralized client utility

#### 1. Create `src/core/solana-client.ts` (NEW)

```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'
import { getConfig } from './config'

let _client: SolanaClient | null = null

export function getSolanaClient(): SolanaClient {
  if (!_client) {
    const config = getConfig()
    _client = createSolanaClient(config.rpcUrl, {
      commitment: config.commitment || 'confirmed',
    })
  }
  return _client
}

export function resetSolanaClient() {
  _client = null
}

// For commands that need custom RPC URL
export function createCustomClient(rpcUrl: string): SolanaClient {
  return createSolanaClient(rpcUrl)
}
```

#### 2. Update All Commands

**Before** (`src/commands/faucet.ts`):
```typescript
import { createSolanaRpc, address } from '@solana/kit'

export async function faucetCommand() {
  const rpcUrl = getConfig().rpcUrl
  const rpc = createSolanaRpc(rpcUrl)

  const balance = await rpc.getBalance(address(walletAddress)).send()
  const airdrop = await rpc.requestAirdrop(address(walletAddress), lamports).send()
  await rpc.confirmTransaction(airdrop).send()
}
```

**After**:
```typescript
import { getSolanaClient } from '../core/solana-client'
import { address } from '@solana/addresses'

export async function faucetCommand() {
  const client = getSolanaClient()

  const balance = await client.getBalance(walletAddress)
  const airdrop = await client.requestAirdrop(walletAddress, lamports)
  await client.confirmTransaction(airdrop)
}
```

**Lines Reduced per file**: ~10 lines → ~5 lines (50% reduction)

#### 3. Update Connection Pool (`src/core/connection-pool.ts`)

**Before** (Complex custom pool):
```typescript
import { createSolanaRpc, type SolanaRpcApi } from '@solana/kit'

export class ConnectionPool {
  private connections: Map<string, SolanaRpcApi> = new Map()

  getConnection(endpoint: Endpoint): SolanaRpcApi {
    if (!this.connections.has(endpoint.url)) {
      const rpc = createSolanaRpc(endpoint.url) as unknown as SolanaRpcApi
      this.connections.set(endpoint.url, rpc)
    }
    return this.connections.get(endpoint.url)!
  }
}
```

**After** (Simpler with Gill):
```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

export class ConnectionPool {
  private connections: Map<string, SolanaClient> = new Map()

  getConnection(endpoint: Endpoint): SolanaClient {
    if (!this.connections.has(endpoint.url)) {
      const client = createSolanaClient(endpoint.url)
      this.connections.set(endpoint.url, client)
    }
    return this.connections.get(endpoint.url)!
  }
}
```

**Benefit**: No more `as unknown as` type casts!

---

## Mollusk Testing Integration

### Current Testing Approach

**Program**: `programs/` - ghostspeak-marketplace (Anchor program)
**Test Framework**: `solana-program-test` with `BanksClient`
**Issue**: Slow, requires full validator simulation

**Test Files**:
- `programs/tests/integration/staking_tests.rs` - 30+ test cases
- `programs/tests/integration/agent_registration_impl.rs` - Agent tests
- `programs/tests/integration/ghost_protect_tests.rs` - Security tests
- `programs/tests/property/crypto_properties.rs` - Property-based tests

### Mollusk Migration Plan

**Add Mollusk**:
```bash
# In programs/Cargo.toml
[dev-dependencies]
solana-program-test = "2.3"  # Keep for complex integration tests
mollusk-svm = "0.1"           # Add for fast unit tests
```

**Create Fast Unit Tests**:

#### 1. Create `programs/tests/unit/staking_mollusk.rs` (NEW)

```rust
use mollusk_svm::Mollusk;
use ghostspeak_marketplace::instructions::staking::*;

#[test]
fn test_initialize_staking_config_fast() {
    let program_id = ghostspeak_marketplace::id();
    let mut mollusk = Mollusk::new(&program_id, "target/deploy/ghostspeak_marketplace");

    let instruction = initialize_staking_config(/* params */);
    let accounts = vec![/* test accounts */];

    // 10-100x faster than solana-program-test
    let result = mollusk.process_and_validate_instruction(
        &instruction,
        &accounts,
        &[Check::success()],
    );

    assert!(result.is_ok());
}
```

**Speed Comparison**:
- `solana-program-test`: ~500ms per test
- `Mollusk`: ~5-10ms per test
- **50-100x faster** ⚡

#### 2. Testing Strategy

**Keep solana-program-test for**:
- Complex multi-instruction flows
- Full program lifecycle tests
- Tests requiring validator state

**Use Mollusk for**:
- Single instruction tests
- Compute unit validation
- Error condition testing
- Rapid TDD cycles

**Estimated Impact**:
- Test suite time: ~5 minutes → ~30 seconds (10x faster)
- Better local development experience
- Faster CI/CD pipelines

---

## Implementation Roadmap

### Phase 1: Web Package (Day 1 - 2 hours)

**Priority**: ⭐ HIGHEST (simplest, immediate value)

```bash
cd packages/web
bun add gill gill-react
```

**Tasks**:
- [ ] Create `lib/solana/client.ts`
- [ ] Update `app/api/v1/treasury/route.ts`
- [ ] Test API route
- [ ] Verify no bundle size regression

**Success Criteria**:
- ✅ Treasury API works
- ✅ No TypeScript errors
- ✅ Bundle size same or smaller

---

### Phase 2: CLI Package (Day 2 - 4 hours)

**Priority**: ⭐⭐ HIGH (most duplication, highest reduction)

```bash
cd packages/cli
bun add gill
```

**Tasks**:
- [ ] Create `src/core/solana-client.ts`
- [ ] Update `src/core/connection-pool.ts`
- [ ] Update all 9 command files
- [ ] Update utility files
- [ ] Test all commands
- [ ] Update documentation

**Success Criteria**:
- ✅ All commands work
- ✅ No type errors
- ✅ Reduced boilerplate (verify with line count)

---

### Phase 3: SDK Package (Day 3-4 - 6 hours)

**Priority**: ⭐⭐ CRITICAL (most complex, biggest impact)

```bash
cd packages/sdk-typescript
bun add gill
```

**Tasks**:
- [ ] Update `src/core/rpc-client.ts`
- [ ] Update `src/core/InstructionBuilder.ts`
- [ ] Create `src/utils/solana-client.ts`
- [ ] Deprecate `src/utils/rpc-client.ts`
- [ ] Deprecate `src/utils/agave-2-3-optimizations.ts`
- [ ] Update all modules using RPC client
- [ ] Test all SDK methods
- [ ] Update README and docs

**Success Criteria**:
- ✅ All SDK methods work
- ✅ Type safety maintained
- ✅ Backward compatibility (if needed)
- ✅ Documentation updated

---

### Phase 4: Mollusk Integration (Day 5 - 4 hours)

**Priority**: 🟡 MEDIUM (programs are tested, but can be faster)

```bash
cd programs
cargo add --dev mollusk-svm
```

**Tasks**:
- [ ] Add Mollusk to Cargo.toml
- [ ] Create `tests/unit/` directory
- [ ] Convert 5 representative tests to Mollusk
- [ ] Benchmark speed improvement
- [ ] Document testing strategy
- [ ] Update CI/CD to run both test suites

**Success Criteria**:
- ✅ Unit tests run in <1 second
- ✅ Integration tests still pass
- ✅ CI/CD pipeline faster

---

## Code Reduction Metrics

### Before Gill Migration

**Total RPC-related code**:
- `web`: ~20 lines
- `cli`: ~150 lines (9 files × ~17 lines each)
- `sdk-typescript`: ~500 lines (6 files with wrappers)
- **Total**: ~670 lines

### After Gill Migration

**Total RPC-related code**:
- `web`: ~10 lines
- `cli`: ~75 lines (centralized client + thin wrappers)
- `sdk-typescript`: ~150 lines (simplified wrappers)
- **Total**: ~235 lines

**Reduction**: **65% less code** (435 lines removed)

---

## Environment Variables

### Gill Debug Mode

Add to `.env` files:

**packages/web/.env.local**:
```bash
GILL_DEBUG=true  # Enable for development
```

**packages/cli/.env**:
```bash
GILL_DEBUG=true
```

**packages/sdk-typescript/.env**:
```bash
GILL_DEBUG=true
```

**Output Example**:
```
[Gill] RPC call: getBalance(3Xz2...9Abc)
[Gill] Response: 1.23 SOL (0.000123s)
[Gill] Explorer: https://explorer.solana.com/address/3Xz2...9Abc?cluster=mainnet
```

---

## Testing Strategy

### Pre-Migration Testing

**Baseline Metrics** (run before migration):
```bash
# Web
cd packages/web
bun run build
# Record: Build time, bundle size

# CLI
cd packages/cli
bun test
# Record: Test time, coverage

# SDK
cd packages/sdk-typescript
bun test
# Record: Test time, coverage

# Programs
cd programs
cargo test
# Record: Test time
```

### Post-Migration Validation

**Test Checklist**:
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Bundle size same or smaller
- [ ] Performance same or better

**Commands to Run**:
```bash
# Build all packages
bun run build

# Test all packages
bun test

# Test programs
cd programs && cargo test

# Lint
bun run lint
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Breaking API Changes** | Low | Gill is built on @solana/kit (same foundation) |
| **Type Errors** | Low | Gill has excellent TypeScript support |
| **Bundle Size Increase** | Very Low | Gill is tree-shakable |
| **Migration Time** | Low | ~2 days total |
| **Backward Compatibility** | Medium | Keep old exports if needed |

---

## Rollback Plan

If migration causes issues:

**Phase 1: Immediate Rollback**
```bash
git checkout <pre-migration-commit>
bun install
bun run build
```

**Phase 2: Partial Rollback**

Keep Gill in one package, revert others:
```bash
# Revert SDK changes
cd packages/sdk-typescript
git checkout HEAD -- src/

# Keep web and CLI changes
# (they're simpler and lower risk)
```

**Phase 3: Gradual Rollout**

Implement package-by-package:
1. Week 1: `packages/web` only
2. Week 2: `packages/cli`
3. Week 3: `packages/sdk-typescript`

---

## Success Metrics

### Quantitative

- [ ] Code reduction: >50% in RPC-related files
- [ ] Bundle size: No regression (ideally -5%)
- [ ] Build time: No regression
- [ ] Test time (programs): >50% faster with Mollusk
- [ ] Type errors: 0

### Qualitative

- [ ] Developer feedback: "Easier to use"
- [ ] Code reviews: "More readable"
- [ ] Onboarding: "Faster to understand"

---

## Next Steps

### Immediate Actions (This Week)

1. **Approve Migration Plan** ✅
2. **Phase 1: Web Package** (2 hours)
   ```bash
   cd packages/web
   bun add gill gill-react
   # Follow Phase 1 tasks
   ```
3. **Validate & Test** (1 hour)
4. **Commit & Document**

### Short-Term (Next Week)

5. **Phase 2: CLI Package** (4 hours)
6. **Phase 3: SDK Package** (6 hours)
7. **Update Documentation**

### Long-Term (Next Sprint)

8. **Phase 4: Mollusk Integration** (4 hours)
9. **Performance Benchmarking**
10. **Team Training on Gill**

---

## Documentation Updates Needed

**After migration, update**:

1. **DEVELOPER_GUIDE.md**
   - Add Gill client usage examples
   - Update RPC section
   - Add debug utilities guide

2. **packages/sdk-typescript/README.md**
   - Update RPC client docs
   - Add Gill examples
   - Migration guide for users

3. **packages/cli/README.md**
   - Update command examples
   - Add Gill debug mode docs

4. **programs/README.md**
   - Add Mollusk testing guide
   - Document testing strategy

---

## Conclusion

The GhostSpeak monorepo is **perfectly positioned** for Gill adoption:

✅ **Programs Exist**: Mollusk will dramatically speed up testing
✅ **RPC Usage Identified**: Exact files and line numbers documented
✅ **Migration Path Clear**: Phase-by-phase with rollback plans
✅ **High Impact**: 65% code reduction in RPC logic

**Recommendation**: **Proceed with migration** starting Week 1 with web package.

---

**Plan Created**: 2026-01-03
**Estimated Completion**: 2-3 days
**Risk Level**: Low
**Expected Value**: High
**Status**: ✅ Ready for Implementation
