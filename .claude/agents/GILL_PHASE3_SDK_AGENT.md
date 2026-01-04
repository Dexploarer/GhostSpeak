# Gill Migration - Phase 3: SDK Package Agent

**Use with**: `Task` tool, `subagent_type: "general-purpose"`
**Estimated time**: 6 hours
**Complexity**: High (critical package)

---

## Prompt

```
You are migrating the GhostSpeak SDK package to use Gill for Solana RPC operations.

## Context

This is Phase 3 of the Gill migration - the most complex phase.

**Completed Phases**:
- Phase 1: web package ✅
- Phase 2: CLI package (should be done before this)

**Pattern established**:
- Gill requires `createSolanaClient({ urlOrMoniker: url })`
- Type: `SolanaClient<any>` for flexibility
- Singleton pattern for reusable clients

## Your Task

Migrate `packages/sdk-typescript` to use Gill. This is the CRITICAL package - it's the core SDK used by all other packages.

### Step 1: Install Gill
```bash
cd packages/sdk-typescript
bun add gill
```

### Step 2: Update Core RPC Client

**File**: `src/core/rpc-client.ts`

This is the main RPC client class used throughout the SDK.

**Current Pattern** (complex manual wrapper):
```typescript
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc'

export class RpcClient {
  private rpc: ReturnType<typeof createSolanaRpc>
  private rpcSubscriptions?: ReturnType<typeof createSolanaRpcSubscriptions>

  constructor(config: RpcConfig) {
    this.rpc = createSolanaRpc(config.endpoint)
    // ... lots of wrapper methods
  }

  async getBalance(address: Address) {
    const result = await this.rpc.getBalance(address).send()
    return result.value
  }
  // ... 20+ more methods
}
```

**New Pattern** (Gill wrapper):
```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

export class RpcClient {
  private client: SolanaClient<any>

  constructor(config: RpcConfig) {
    this.client = createSolanaClient({
      urlOrMoniker: config.endpoint
    })
  }

  // Expose Gill client for direct access
  get solana() {
    return this.client
  }

  // Keep compatibility methods
  async getBalance(address: Address) {
    return this.client.rpc.getBalance(address).send()
  }

  async getAccount(address: Address) {
    return this.client.rpc.getAccountInfo(address).send()
  }
}
```

### Step 3: Update InstructionBuilder

**File**: `src/core/InstructionBuilder.ts`

Find and replace RPC usage:

**Before**:
```typescript
const { createSolanaRpc } = await import('@solana/kit')
const directRpc = createSolanaRpc(this.config.rpcEndpoint ?? 'https://api.devnet.solana.com')
const result = await directRpc.getLatestBlockhash().send()
```

**After**:
```typescript
import { createSolanaClient } from 'gill'
const client = createSolanaClient({
  urlOrMoniker: this.config.rpcEndpoint ?? 'https://api.devnet.solana.com'
})
const result = await client.rpc.getLatestBlockhash().send()
```

### Step 4: Create New Utility File

**Create**: `src/utils/solana-client.ts`

```typescript
/**
 * Solana Client Utilities using Gill
 *
 * Centralized Solana client management for the SDK
 */

import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

// Re-export Gill utilities
export { createSolanaClient }
export type { SolanaClient }

// Singleton for default client
let _defaultClient: SolanaClient<any> | null = null

export function getDefaultSolanaClient(endpoint?: string): SolanaClient<any> {
  if (!_defaultClient || endpoint) {
    const url = endpoint || 'https://api.devnet.solana.com'
    _defaultClient = createSolanaClient({ urlOrMoniker: url })
  }
  return _defaultClient
}

export function resetDefaultClient() {
  _defaultClient = null
}
```

### Step 5: Deprecate Legacy Files

**Files to deprecate/remove**:
1. `src/utils/rpc-client.ts` - Replace with new solana-client.ts
2. `src/utils/agave-2-3-optimizations.ts` - Remove if only RPC wrappers

For each:
1. Check what's exported
2. Move needed exports to new location
3. Add deprecation notice or delete

### Step 6: Update All Modules Using RPC

**Check these directories for RPC usage**:
- `src/modules/*` - All feature modules may use RpcClient
- `src/core/*` - Core classes
- `src/utils/*` - Utility functions

**Pattern for modules**:
```typescript
// If module uses RpcClient directly, no change needed
// If module imports from @solana/rpc, update to use Gill or RpcClient
```

### Step 7: Update Exports

**File**: `src/index.ts` or main entry

Ensure Gill types are exported if needed:
```typescript
// Re-export Gill types for consumers
export type { SolanaClient } from 'gill'
```

### Step 8: Test

```bash
cd packages/sdk-typescript
bun run build
bun test

# Check exports
bun run build && ls -la dist/
```

### Success Criteria

- [ ] Core RpcClient updated
- [ ] InstructionBuilder updated
- [ ] New solana-client.ts utility created
- [ ] Legacy files deprecated/removed
- [ ] All modules still work
- [ ] `bun run build` succeeds
- [ ] `bun test` passes
- [ ] ~75% reduction in RPC wrapper code
- [ ] Backward compatibility maintained

### Critical Considerations

1. **Backward Compatibility**: The SDK is used by external consumers. Keep method signatures the same where possible.

2. **Type Exports**: Ensure types are properly exported for consumers.

3. **Module Updates**: Each module (AgentModule, CredentialModule, etc.) may need updates if they directly use @solana/rpc.

4. **Testing**: Run full test suite - SDK is critical infrastructure.

### Deliverables

1. Updated core files (rpc-client.ts, InstructionBuilder.ts)
2. New solana-client.ts utility
3. Deprecated/removed legacy files
4. Updated module files as needed
5. Completion report with line count comparison

DO NOT modify files outside packages/sdk-typescript.
DO NOT break backward compatibility without documenting.
```

---

## Pre-Flight Checklist

Before spawning this agent:

- [ ] Phase 1 (web) is complete
- [ ] Phase 2 (CLI) is complete
- [ ] Review `packages/sdk-typescript/src/core/rpc-client.ts` structure
- [ ] Check what modules depend on RpcClient

## Deepwiki Queries to Include

The agent should run these deepwiki queries:
1. `repo: "solana-developers/gill" question: "How do I create a wrapper class around Gill for SDK development?"`
2. `repo: "solana-developers/gill" question: "What methods does the Gill SolanaClient expose? List all RPC methods."`

## Critical Files

These files are the most important to update correctly:

1. **`src/core/rpc-client.ts`** - Main RPC abstraction (~200 lines)
2. **`src/core/InstructionBuilder.ts`** - Transaction building
3. **`src/core/GhostSpeakClient.ts`** - Main SDK entry point

## Expected Output

1. **Files Created**:
   - `packages/sdk-typescript/src/utils/solana-client.ts`

2. **Files Modified**:
   - `packages/sdk-typescript/src/core/rpc-client.ts` (major update)
   - `packages/sdk-typescript/src/core/InstructionBuilder.ts`
   - `packages/sdk-typescript/src/core/GhostSpeakClient.ts`
   - Various modules in `src/modules/`
   - `packages/sdk-typescript/package.json`

3. **Files Deprecated/Removed**:
   - `packages/sdk-typescript/src/utils/rpc-client.ts`
   - `packages/sdk-typescript/src/utils/agave-2-3-optimizations.ts`

4. **Completion Report**: `GILL_PHASE3_COMPLETE.md`

## Risk Mitigation

This is the highest-risk phase. Mitigations:

1. **Keep method signatures** - Don't change public API
2. **Run full tests** - Before and after
3. **Check exports** - Ensure nothing breaks for consumers
4. **Incremental commits** - Commit after each file
