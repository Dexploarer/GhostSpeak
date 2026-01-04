# Gill Migration - Phase 2: CLI Package Agent

**Use with**: `Task` tool, `subagent_type: "general-purpose"`
**Estimated time**: 4 hours
**Complexity**: Medium

---

## Prompt

```
You are migrating the GhostSpeak CLI package to use Gill for Solana RPC operations.

## Context

This is Phase 2 of the Gill migration. Phase 1 (web package) is complete and established the pattern:

**Pattern from Phase 1** (packages/web/lib/solana/client.ts):
- Singleton pattern for client-side usage
- Server-side factory function
- Gill requires `createSolanaClient({ urlOrMoniker: url })` (NOT string directly)
- Type: `SolanaClient<any>` for flexibility

## Your Task

Migrate `packages/cli` to use Gill for all Solana RPC operations.

### Step 1: Install Gill
```bash
cd packages/cli
bun add gill
```

### Step 2: Create Centralized Client
Create `packages/cli/src/core/solana-client.ts`:

```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'
import { getConfig } from './config'

let _client: SolanaClient<any> | null = null

export function getSolanaClient(): SolanaClient<any> {
  if (!_client) {
    const config = getConfig()
    _client = createSolanaClient({
      urlOrMoniker: config.rpcUrl || 'https://api.devnet.solana.com'
    })
  }
  return _client
}

export function resetSolanaClient() {
  _client = null
}

export function createCustomClient(rpcUrl: string): SolanaClient<any> {
  return createSolanaClient({ urlOrMoniker: rpcUrl })
}

export { createSolanaClient, type SolanaClient } from 'gill'
```

### Step 3: Update Files (9 files total)

**Files to update**:
1. `src/core/connection-pool.ts` - Replace createSolanaRpc with Gill
2. `src/utils/interactive-menu.ts` - Use getSolanaClient()
3. `src/utils/client.ts` - Update main client utility
4. `src/utils/onboarding.ts` - Use getSolanaClient()
5. `src/utils/setup-helpers.ts` - Use getSolanaClient()
6. `src/commands/faucet.ts` - Use getSolanaClient()
7. `src/commands/airdrop.ts` - Use getSolanaClient()
8. `src/commands/config.ts` - Use getSolanaClient()
9. Any other files with `createSolanaRpc` imports

### Transformation Pattern

**Before**:
```typescript
import { createSolanaRpc, address } from '@solana/kit'

const rpcUrl = getConfig().rpcUrl
const rpc = createSolanaRpc(rpcUrl)
const balance = await rpc.getBalance(address(walletAddress)).send()
```

**After**:
```typescript
import { getSolanaClient } from '../core/solana-client'
import { address } from '@solana/addresses'

const client = getSolanaClient()
const balance = await client.rpc.getBalance(address(walletAddress)).send()
```

**IMPORTANT**: Gill's client exposes `.rpc` for raw RPC access. The client itself may not have all methods directly - check the Gill API via deepwiki.

### Step 4: Update Connection Pool

`src/core/connection-pool.ts` should use:
```typescript
import { createSolanaClient } from 'gill'
import type { SolanaClient } from 'gill'

export class ConnectionPool {
  private connections: Map<string, SolanaClient<any>> = new Map()

  getConnection(endpoint: Endpoint): SolanaClient<any> {
    if (!this.connections.has(endpoint.url)) {
      const client = createSolanaClient({ urlOrMoniker: endpoint.url })
      this.connections.set(endpoint.url, client)
    }
    return this.connections.get(endpoint.url)!
  }
}
```

### Step 5: Test

```bash
cd packages/cli
bun run build
bun test

# Manual tests
./dist/index.js --help
./dist/index.js config show
./dist/index.js faucet --help
```

### Success Criteria

- [ ] All 9+ files updated
- [ ] `bun run build` succeeds
- [ ] `bun test` passes
- [ ] Commands work: config, faucet, airdrop
- [ ] No TypeScript errors in Gill-related code
- [ ] ~50% reduction in RPC boilerplate

### Known Issues to Handle

1. **Type casts**: Remove any `as unknown as` casts - Gill has proper types
2. **Import paths**: Update all `@solana/rpc` or `@solana/kit` imports for RPC
3. **Config access**: May need to update how config is loaded for singleton

### Deliverables

1. Updated files listed above
2. New `src/core/solana-client.ts`
3. Brief completion report

DO NOT modify files outside packages/cli.
DO NOT change non-RPC related code.
```

---

## Pre-Flight Checklist

Before spawning this agent:

- [ ] Phase 1 (web) is complete
- [ ] Verify `packages/web/lib/solana/client.ts` exists as reference
- [ ] Check current Gill version: `bun pm ls | grep gill`

## Deepwiki Queries to Include

The agent should run these deepwiki queries:
1. `repo: "solana-developers/gill" question: "What is the correct API for createSolanaClient and how do I access RPC methods?"`
2. `repo: "solana-developers/gill" question: "Show TypeScript examples of getBalance, getAccount, and sendTransaction with Gill"`

## Expected Output

1. **Files Created**:
   - `packages/cli/src/core/solana-client.ts`

2. **Files Modified**:
   - `packages/cli/src/core/connection-pool.ts`
   - `packages/cli/src/utils/interactive-menu.ts`
   - `packages/cli/src/utils/client.ts`
   - `packages/cli/src/utils/onboarding.ts`
   - `packages/cli/src/utils/setup-helpers.ts`
   - `packages/cli/src/commands/faucet.ts`
   - `packages/cli/src/commands/airdrop.ts`
   - `packages/cli/src/commands/config.ts`
   - `packages/cli/package.json`

3. **Completion Report**: `GILL_PHASE2_COMPLETE.md`
