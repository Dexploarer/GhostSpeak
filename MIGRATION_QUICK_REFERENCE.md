# Solana Web3.js Migration Quick Reference

**Quick lookup table for migrating GhostSpeak from v2.3.0 → v5.1.0**

---

## 🔄 Code Pattern Changes

### Transaction Type Signatures

| Scenario | v2.3.0 | v5.1.0 |
|----------|--------|--------|
| **Fully Signed Transaction** | `FullySignedTransaction` | `Transaction & TransactionWithLifetime` |
| **Sendable Transaction** | `Transaction` | `SendableTransaction` |
| **Compiled Message** | `CompiledTransactionMessage` | `CompiledTransactionMessage & CompiledTransactionMessageWithLifetime` |

---

### Account Info Properties

| Property | v2.3.0 | v4.0.0+ / v5.1.0 | Notes |
|----------|--------|------------------|-------|
| `lamports` | ✅ Available | ✅ Available | No change |
| `owner` | ✅ Available | ✅ Available | No change |
| `executable` | ✅ Available | ✅ Available | No change |
| `rentEpoch` | ✅ Available | ❌ **REMOVED** | Deprecated on-chain |
| `data` | ✅ Available | ✅ Available | No change |

---

### Error Handling

| Error Property | v2.3.0 | v5.0.0+ | Notes |
|----------------|--------|---------|-------|
| `message` | ✅ Available | ✅ Available | No change |
| `encodedData` (BorshIoErrors) | ✅ Available | ❌ **REMOVED** | No longer exposed |

---

## 📦 Import Changes

### No Import Changes Required

All imports remain the same across versions:

```typescript
// ✅ Same in all versions
import { createSolanaRpc } from '@solana/rpc';
import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';
import { generateKeyPairSigner } from '@solana/signers';
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners
} from '@solana/transactions';
```

---

## 🛠️ Code Migration Examples

### Example 1: Transaction Building

**Before (v2.3.0):**
```typescript
const signed: FullySignedTransaction =
  await signTransactionMessageWithSigners(message);

await rpc.sendTransaction(signed).send();
```

**After (v5.1.0):**
```typescript
const signed: Transaction & TransactionWithLifetime =
  await signTransactionMessageWithSigners(message);

// Ensure it's sendable (fully signed + within size limits)
const sendable: SendableTransaction = signed;
await rpc.sendTransaction(sendable).send();
```

---

### Example 2: Account Info Access

**Before (v2.3.0):**
```typescript
const account = await rpc.getAccountInfo(address).send();

console.log({
  lamports: account.value.lamports,
  owner: account.value.owner,
  rentEpoch: account.value.rentEpoch,  // ✅ Available
  executable: account.value.executable
});
```

**After (v5.1.0):**
```typescript
const account = await rpc.getAccountInfo(address).send();

console.log({
  lamports: account.value.lamports,
  owner: account.value.owner,
  // rentEpoch: account.value.rentEpoch,  // ❌ REMOVED
  executable: account.value.executable
});
```

---

### Example 3: Error Handling

**Before (v2.3.0):**
```typescript
try {
  const encoded = codec.encode(data);
} catch (error) {
  if (error.encodedData) {  // ✅ Available
    console.log('Partial data:', error.encodedData);
  }
  console.error(error.message);
}
```

**After (v5.1.0):**
```typescript
try {
  const encoded = codec.encode(data);
} catch (error) {
  // encodedData no longer available
  console.error(error.message);
}
```

---

### Example 4: Signer Function Return Types

**Before (v2.3.0/v3.0.0):**
```typescript
async function buildAndSign(): Promise<FullySignedTransaction> {
  const message = createTransactionMessage({ version: 0 });
  // ... build message
  return await signTransactionMessageWithSigners(message);
}
```

**After (v4.0.0/v5.1.0):**
```typescript
async function buildAndSign(): Promise<Transaction & TransactionWithLifetime> {
  const message = createTransactionMessage({ version: 0 });
  // ... build message
  return await signTransactionMessageWithSigners(message);
}
```

---

### Example 5: Compiled Transaction Encoding

**Before (v2.3.0):**
```typescript
const compiled: CompiledTransactionMessage = compileMessage(message);
const encoded = encodeTransaction(compiled);
```

**After (v3.0.0+):**
```typescript
// Explicitly compose with lifetime
const compiled: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime =
  compileMessage(message);
const encoded = encodeTransaction(compiled);
```

---

## 🆕 New Features in v5.1.0

### 1. Offchain Message Signing

```typescript
import {
  getOffchainMessageEncoder,
  getOffchainMessageDecoder,
  signOffchainMessage
} from '@solana/messages';

// Encode
const encoder = getOffchainMessageEncoder();
const encoded = encoder.encode({
  format: 'utf8',
  value: 'Sign in to GhostSpeak'
});

// Sign
const signature = await signOffchainMessage(wallet, encoded);

// Verify
const decoder = getOffchainMessageDecoder();
const decoded = decoder.decode(encoded);
```

---

### 2. Transaction Plan Utilities

```typescript
import {
  summarizeTransactionPlanResults,
  flattenTransactionPlanResults
} from '@solana/transactions';

const plan = executePlan(instructions);

// Get summary
const summary = summarizeTransactionPlanResults(plan);
console.log(`Successful: ${summary.successful}`);
console.log(`Failed: ${summary.failed}`);

// Flatten results
const flattened = flattenTransactionPlanResults(plan);
```

---

### 3. Origin Header Support (v4.0.0+)

```typescript
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com', {
  headers: {
    'Origin': 'https://ghostspeak.io'
  }
});
```

---

## 📋 Removed APIs

### Removed in v3.0.0

| API | Replacement |
|-----|-------------|
| `getComputeUnitEstimateForTransactionMessageFactory` | Use `simulateTransaction` with `replaceRecentBlockhash: true` |
| `CompilableTransactionMessage` | Use `TransactionMessage & TransactionMessageWithFeePayer` |

---

## 🔍 Find & Replace Patterns

### Pattern 1: Replace Type Annotations

```bash
# Find
: FullySignedTransaction

# Replace with
: Transaction & TransactionWithLifetime
```

---

### Pattern 2: Remove rentEpoch Access

```bash
# Find
.rentEpoch

# Action: DELETE or comment out
```

---

### Pattern 3: Remove encodedData Access

```bash
# Find
.encodedData

# Action: DELETE or comment out
```

---

## 🧪 Testing Commands

```bash
# Type checking
bun run type-check

# Unit tests
bun test

# E2E tests
bun run test:e2e

# Build (will fail if type errors exist)
bun run build
```

---

## 🚨 Red Flags During Migration

Watch out for these issues:

1. **Using `any` or `@ts-ignore`**
   ```typescript
   // ❌ BAD - Hides type errors
   const tx: any = await signTransaction(message);

   // ✅ GOOD - Fix the type properly
   const tx: Transaction & TransactionWithLifetime = await signTransaction(message);
   ```

2. **Mixed Versions in package.json**
   ```json
   {
     "@solana/rpc": "^2.3.0",        // ❌ BAD
     "@solana/signers": "^5.1.0"     // ❌ Different major version
   }
   ```

3. **Accessing Removed Properties**
   ```typescript
   // ❌ BAD - Will fail at runtime
   const epoch = account.rentEpoch;

   // ✅ GOOD - Don't access it
   const { lamports, owner } = account;
   ```

---

## 📊 Version Compatibility Matrix

| Package | v2.3.0 | v3.0.0 | v4.0.0 | v5.0.0 | v5.1.0 |
|---------|--------|--------|--------|--------|--------|
| `@solana/rpc` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@solana/rpc-subscriptions` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@solana/signers` | ✅ | ✅ | ⚠️ API changed | ⚠️ API changed | ✅ |
| `@solana/transactions` | ✅ | ⚠️ Types changed | ⚠️ Types changed | ✅ | ✅ |
| `@solana/accounts` | ✅ | ✅ | ⚠️ rentEpoch removed | ✅ | ✅ |
| `@solana/errors` | ✅ | ✅ | ✅ | ⚠️ encodedData removed | ✅ |

Legend:
- ✅ = Stable API
- ⚠️ = Breaking change in this version

---

## 🔗 Related Files to Update

After updating `package.json`, check these files for breaking changes:

### packages/web
```
app/
├── agents/[id]/interact/page.tsx       # Transaction signing
├── agents/[id]/page.tsx                # Account fetching
├── dashboard/agents/page.tsx           # Agent listing
├── dashboard/staking/page.tsx          # Staking operations
└── tokenomics/page.tsx                 # Token info

components/
├── agents/AgentCard.tsx                # Agent metadata
├── wallet/WalletConnectButton.tsx      # Wallet connection
└── convex/UserStatsCard.tsx            # Account stats

lib/ or utils/
└── Any RPC helper functions            # Core SDK usage
```

---

## ✅ Migration Checklist

Use this checklist to track your progress:

- [ ] Update `package.json` with v5.1.0 versions
- [ ] Run `bun install` to update dependencies
- [ ] Fix TypeScript errors (`bun run type-check`)
- [ ] Update `FullySignedTransaction` → `Transaction & TransactionWithLifetime`
- [ ] Remove `rentEpoch` property access
- [ ] Remove `encodedData` error handling
- [ ] Update transaction type guards
- [ ] Run unit tests (`bun test`)
- [ ] Run E2E tests (`bun run test:e2e`)
- [ ] Manual testing in development
- [ ] Deploy to staging
- [ ] Monitor for runtime errors
- [ ] Production deployment

---

## 🆘 Troubleshooting

### Issue: "Type X is not assignable to type Y"

**Solution:**
1. Check the version compatibility matrix above
2. Ensure ALL `@solana/*` packages are on the same major version
3. Clear `node_modules` and reinstall: `rm -rf node_modules bun.lockb && bun install`

---

### Issue: "Property 'rentEpoch' does not exist"

**Solution:**
Remove all references to `rentEpoch` - it's been removed from the type system to match the deprecation on-chain.

---

### Issue: Runtime error but TypeScript compiles

**Solution:**
1. Check for `any` types masking issues
2. Look for runtime type guards that need updating
3. Enable strict mode in `tsconfig.json`

---

**Keep this reference handy during migration!** 📌
