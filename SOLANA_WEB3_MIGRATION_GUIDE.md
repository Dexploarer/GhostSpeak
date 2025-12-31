# Solana Web3.js Migration Guide: v2.3.0 → v5.1.0

**Last Updated:** 2025-12-30
**Target Project:** GhostSpeak
**Migration Complexity:** ⚠️ **HIGH** (3 major version jumps)

---

## 📋 Executive Summary

This guide covers the migration of GhostSpeak's web package from Solana Kit (formerly @solana/web3.js 2.0) version **2.3.0** to **5.1.0** - spanning **3 major versions** (v3, v4, v5).

### Current State

**packages/web/package.json:**
```json
{
  "@solana/rpc": "^2.3.0",
  "@solana/rpc-subscriptions": "^2.3.0",
  "@solana/signers": "^2.3.0",
  "@solana/kit": "^5.0.0",  // ⚠️ VERSION MISMATCH
  "@solana/addresses": "^5.1.0"  // ⚠️ VERSION MISMATCH
}
```

**packages/sdk-typescript/package.json:**
```json
{
  "@solana/rpc": "^5.0.0",  // ✅ Already upgraded
  "@solana/signers": "^5.0.0",  // ✅ Already upgraded
  "@solana/kit": "^5.0.0"  // ✅ Already upgraded
}
```

### The Problem

The web package has **mixed versions** - some packages at v2.3.0, others at v5.x. This creates:
- Type incompatibilities between packages
- Runtime errors due to API mismatches
- Dependency resolution conflicts
- Potential security vulnerabilities

---

## 🔍 Version History & Breaking Changes

### Understanding the Version Numbers

The modular Solana packages (`@solana/rpc`, `@solana/signers`, etc.) use **synchronized versioning**:

- **v2.x** = Solana Kit 2.x (November 2024 initial release)
- **v3.x** = Major breaking changes (Transaction types)
- **v4.x** = Major breaking changes (Signer API, Account types)
- **v5.x** = Major breaking changes (Error handling, current stable)
- **v5.1.0** = Latest stable (December 2024)

---

## 🚨 Breaking Changes by Version

### v2.3.0 → v3.0.0 (MAJOR)

#### 1. **Transaction Type System Overhaul**

**Breaking Change:** Transactions must now satisfy the `SendableTransaction` type before being sent to the network.

**Before (v2.3.0):**
```typescript
const transaction = /* ... */;
await rpc.sendTransaction(transaction).send();  // ❌ May fail if not fully signed
```

**After (v3.0.0):**
```typescript
import type { SendableTransaction } from '@solana/transactions';

// Transactions must be fully signed AND within size limits
const sendableTransaction: SendableTransaction = /* ... */;
await rpc.sendTransaction(sendableTransaction).send();  // ✅ Type-safe
```

#### 2. **FullySignedTransaction Type Change**

**Breaking Change:** `FullySignedTransaction` no longer extends `Transaction` directly.

**Before (v2.3.0):**
```typescript
const signed: FullySignedTransaction = await signTransaction(tx);
// FullySignedTransaction IS-A Transaction
```

**After (v3.0.0):**
```typescript
// Must compose types explicitly
const signed: FullySignedTransaction & Transaction = await signTransaction(tx);
```

#### 3. **Compiled Transaction Messages**

**Breaking Change:** Lifetime tokens extracted from `CompiledTransactionMessage`.

**Before (v2.3.0):**
```typescript
const compiled: CompiledTransactionMessage = compileTransaction(tx);
await rpc.sendTransaction(compiled).send();
```

**After (v3.0.0):**
```typescript
import type { CompiledTransactionMessageWithLifetime } from '@solana/transactions';

// Explicitly compose with lifetime
const compiled: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime =
  compileTransaction(tx);
```

#### 4. **Deprecated API Removals**

**Removed:**
- ❌ `getComputeUnitEstimateForTransactionMessageFactory`
- ❌ `CompilableTransactionMessage` (use `TransactionMessage & TransactionMessageWithFeePayer`)

---

### v3.0.0 → v4.0.0 (MAJOR)

#### 1. **Signer API Return Type Change**

**Breaking Change:** Signer functions now return `Transaction & TransactionWithLifetime`.

**Before (v3.x):**
```typescript
const signed = await signTransactionMessageWithSigners(message);
// Type: FullySignedTransaction
```

**After (v4.0.0):**
```typescript
const signed = await signTransactionMessageWithSigners(message);
// Type: Transaction & TransactionWithLifetime
```

**Impact:** Any code expecting `FullySignedTransaction` will fail type checking.

#### 2. **Account Info Type Change**

**Breaking Change:** Removed `rentEpoch` from `AccountInfoBase` type.

**Before (v3.x):**
```typescript
interface AccountInfoBase {
  lamports: bigint;
  owner: Address;
  rentEpoch: bigint;  // ❌ REMOVED
  executable: boolean;
}
```

**After (v4.0.0):**
```typescript
interface AccountInfoBase {
  lamports: bigint;
  owner: Address;
  executable: boolean;
  // rentEpoch removed (deprecated on-chain)
}
```

**Migration:**
```typescript
// BEFORE
const { rentEpoch, ...rest } = accountInfo;  // ❌ rentEpoch doesn't exist

// AFTER
const accountInfo = await rpc.getAccountInfo(address).send();
// Don't access rentEpoch - it's gone
```

#### 3. **Origin Header Support**

**New Feature:** Can now set `Origin` header in React Native and Node builds.

```typescript
// NEW in v4.0.0
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com', {
  headers: {
    'Origin': 'https://ghostspeak.io'  // ✅ Now supported
  }
});
```

#### 4. **Added loadedAccountsDataSize**

**New Feature:** `simulateTransaction` response includes `loadedAccountsDataSize`.

```typescript
const simulation = await rpc.simulateTransaction(tx).send();
console.log(simulation.loadedAccountsDataSize);  // ✅ NEW
```

---

### v4.0.0 → v5.0.0 (MAJOR)

#### 1. **Error Handling Changes**

**Breaking Change:** Removed `encodedData` property from `BorshIoErrors`.

**Before (v4.x):**
```typescript
try {
  // ... borsh encoding
} catch (error) {
  if (error.encodedData) {  // ❌ No longer exists
    console.log(error.encodedData);
  }
}
```

**After (v5.0.0):**
```typescript
try {
  // ... borsh encoding
} catch (error) {
  // Handle without encodedData property
  console.error(error.message);
}
```

#### 2. **Dependency Updates**

All `@solana/*` packages synchronized to v5.0.0:
- `@solana/rpc-types@5.0.0`
- `@solana/errors@5.0.0`
- `@solana/rpc@5.0.0`
- `@solana/rpc-subscriptions@5.0.0`
- `@solana/signers@5.0.0`

---

### v5.0.0 → v5.1.0 (MINOR - Safe Upgrade)

#### 1. **Solana Offchain Messages**

**New Feature:** Codecs for encoding/decoding Solana Offchain Messages.

```typescript
import {
  getOffchainMessageEncoder,
  getOffchainMessageDecoder
} from '@solana/messages';

const encoder = getOffchainMessageEncoder();
const encoded = encoder.encode(message);
```

#### 2. **Message Signing with CryptoKey**

**New Feature:** Sign offchain messages using `CryptoKey`.

```typescript
import { signOffchainMessage } from '@solana/signers';

const signature = await signOffchainMessage(cryptoKey, message);
```

#### 3. **Transaction Plan Utilities**

**New Features:**
- `summarizeTransactionPlanResults()` - Summarize plan execution
- `flattenTransactionPlanResults()` - Flatten nested results

```typescript
import {
  summarizeTransactionPlanResults,
  flattenTransactionPlanResults
} from '@solana/transactions';

const summary = summarizeTransactionPlanResults(plan);
const flattened = flattenTransactionPlanResults(plan);
```

---

## 🔄 API Migration Reference

### RPC Client Creation

**v2.3.0:**
```typescript
import { createSolanaRpc } from '@solana/rpc';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
```

**v5.1.0:** (No change - API stable)
```typescript
import { createSolanaRpc } from '@solana/rpc';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
```

---

### RPC Subscriptions

**v2.3.0:**
```typescript
import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';

const rpcSubscriptions = createSolanaRpcSubscriptions(
  'wss://api.devnet.solana.com'
);

const notifications = await rpcSubscriptions
  .slotNotifications()
  .subscribe({ abortSignal });

for await (const notification of notifications) {
  console.log(notification.slot);
}
```

**v5.1.0:** (No change - API stable)
```typescript
// Same API
```

---

### Keypair Generation & Signing

**v2.3.0:**
```typescript
import { generateKeyPairSigner } from '@solana/signers';

const wallet = await generateKeyPairSigner();
console.log(wallet.address);  // Address type
```

**v5.1.0:** (No change - API stable)
```typescript
// Same API
```

---

### Transaction Building & Signing

**v2.3.0:**
```typescript
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners
} from '@solana/transactions';

let message = createTransactionMessage({ version: 0 });
message = setTransactionMessageFeePayerSigner(wallet, message);
message = setTransactionMessageLifetimeUsingBlockhash(
  recentBlockhash,
  message
);
message = appendTransactionMessageInstructions([instruction], message);

const signedTransaction = await signTransactionMessageWithSigners(message);
```

**v5.1.0:**
```typescript
// Same API, but return type changed in v4.0.0
const signedTransaction: Transaction & TransactionWithLifetime =
  await signTransactionMessageWithSigners(message);

// Must ensure it's SendableTransaction before sending
const sendableTransaction: SendableTransaction = signedTransaction;
```

---

### Send & Confirm Transaction

**v2.3.0:**
```typescript
import { sendAndConfirmTransactionFactory } from '@solana/transaction-confirmation';

const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions
});

const signature = await sendAndConfirmTransaction(signedTransaction, {
  commitment: 'confirmed',
  skipPreflight: true
});
```

**v5.1.0:** (No change - API stable)
```typescript
// Same API - Factory pattern still used
```

---

### Account Fetching

**v2.3.0:**
```typescript
const accountInfo = await rpc.getAccountInfo(address).send();

console.log(accountInfo.value.lamports);
console.log(accountInfo.value.rentEpoch);  // ✅ Available
```

**v4.0.0+ / v5.1.0:**
```typescript
const accountInfo = await rpc.getAccountInfo(address).send();

console.log(accountInfo.value.lamports);
// console.log(accountInfo.value.rentEpoch);  // ❌ REMOVED
```

---

## 📦 Package Dependencies

### Required Version Alignment

All `@solana/*` packages **MUST** be on the same major version to avoid type conflicts.

**Target versions for v5.1.0 migration:**

```json
{
  "@solana/kit": "^5.1.0",
  "@solana/rpc": "^5.1.0",
  "@solana/rpc-subscriptions": "^5.1.0",
  "@solana/rpc-api": "^5.1.0",
  "@solana/rpc-types": "^5.1.0",
  "@solana/signers": "^5.1.0",
  "@solana/addresses": "^5.1.0",
  "@solana/accounts": "^5.1.0",
  "@solana/transactions": "^5.1.0",
  "@solana/transaction-messages": "^5.1.0",
  "@solana/codecs-core": "^5.1.0",
  "@solana/codecs-strings": "^5.1.0",
  "@solana/codecs-numbers": "^5.1.0",
  "@solana/codecs-data-structures": "^5.1.0",
  "@solana/errors": "^5.1.0",
  "@solana/instructions": "^5.1.0",
  "@solana/programs": "^5.1.0",
  "@solana/sysvars": "^5.1.0",
  "@solana/options": "^5.1.0"
}
```

---

## 🛠️ Migration Strategy

### Option 1: Incremental Migration (RECOMMENDED)

**Pros:**
- Lower risk
- Easier to test and debug
- Can be done in stages
- Rollback is easier

**Cons:**
- Takes longer
- More commits/PRs
- May need temporary compatibility layers

**Steps:**

1. **Phase 1: Upgrade to v3.0.0**
   ```bash
   cd packages/web
   bun add @solana/rpc@^3.0.0 @solana/rpc-subscriptions@^3.0.0 @solana/signers@^3.0.0
   ```
   - Fix transaction type issues
   - Update to `SendableTransaction`
   - Test thoroughly

2. **Phase 2: Upgrade to v4.0.0**
   ```bash
   bun add @solana/rpc@^4.0.0 @solana/rpc-subscriptions@^4.0.0 @solana/signers@^4.0.0
   ```
   - Remove `rentEpoch` references
   - Update signer return type expectations
   - Test thoroughly

3. **Phase 3: Upgrade to v5.1.0**
   ```bash
   bun add @solana/rpc@^5.1.0 @solana/rpc-subscriptions@^5.1.0 @solana/signers@^5.1.0
   ```
   - Remove `encodedData` error handling
   - Test thoroughly
   - Adopt v5.1.0 features (optional)

---

### Option 2: Full Upgrade (FASTER BUT RISKY)

**Pros:**
- Done in one go
- Cleaner git history
- Get all features immediately

**Cons:**
- Higher risk of issues
- Harder to debug what broke
- Difficult to rollback

**Steps:**

1. **Upgrade All Packages**
   ```bash
   cd packages/web
   bun add \
     @solana/kit@^5.1.0 \
     @solana/rpc@^5.1.0 \
     @solana/rpc-subscriptions@^5.1.0 \
     @solana/signers@^5.1.0 \
     @solana/addresses@^5.1.0
   ```

2. **Fix All Breaking Changes At Once**
   - Transaction types
   - Signer return types
   - Account info changes
   - Error handling

3. **Comprehensive Testing**
   - Run full E2E test suite
   - Manual testing of critical flows
   - Check for type errors

---

## 🧪 Testing Checklist

After migration, verify the following:

### Unit Tests
- [ ] All TypeScript compilation errors resolved
- [ ] No type assertion workarounds (`as any`)
- [ ] Transaction building works
- [ ] Signing works
- [ ] Account fetching works

### Integration Tests
- [ ] RPC connection succeeds
- [ ] WebSocket subscriptions work
- [ ] Transactions send successfully
- [ ] Confirmations received
- [ ] Error handling works

### E2E Tests
- [ ] Wallet connection
- [ ] Agent registration
- [ ] Token transfers
- [ ] Staking operations
- [ ] All critical user flows

---

## 🔍 Common Issues & Solutions

### Issue 1: Type Mismatch Errors

**Error:**
```
Type 'FullySignedTransaction' is not assignable to type 'Transaction & TransactionWithLifetime'
```

**Solution:**
```typescript
// Update function signatures
function sendTransaction(
  tx: Transaction & TransactionWithLifetime  // v4.0.0+
  // tx: FullySignedTransaction  // ❌ Old v2/v3
) {
  // ...
}
```

---

### Issue 2: rentEpoch Property Missing

**Error:**
```
Property 'rentEpoch' does not exist on type 'AccountInfoBase'
```

**Solution:**
```typescript
// REMOVE any code accessing rentEpoch
const { lamports, owner, executable } = accountInfo;
// Don't use rentEpoch - it's deprecated on Solana network
```

---

### Issue 3: SendableTransaction Error

**Error:**
```
Argument of type 'Transaction' is not assignable to parameter of type 'SendableTransaction'
```

**Solution:**
```typescript
import type { SendableTransaction } from '@solana/transactions';

// Ensure transaction is fully signed AND within size limits
const sendable: SendableTransaction = fullySignedTransaction;
await rpc.sendTransaction(sendable).send();
```

---

### Issue 4: Mixed Version Dependencies

**Error:**
```
Error: Conflicting versions of @solana/addresses
```

**Solution:**
```bash
# Remove node_modules and lock file
rm -rf node_modules bun.lockb

# Reinstall with consistent versions
bun install
```

---

## 📊 Risk Assessment

| Risk Factor | Level | Mitigation |
|-------------|-------|------------|
| **Breaking Changes** | 🔴 HIGH | Incremental migration, comprehensive testing |
| **Type Safety Issues** | 🟡 MEDIUM | Strict TypeScript checks, no `any` usage |
| **Runtime Errors** | 🟡 MEDIUM | Extensive E2E testing before production |
| **Dependency Conflicts** | 🟡 MEDIUM | Lock all @solana/* to same version |
| **Rollback Difficulty** | 🔴 HIGH | Feature flags, staged rollout |
| **User Impact** | 🟡 MEDIUM | Test in staging, monitor production closely |

---

## ✅ Recommended Approach

**For GhostSpeak Web Package:**

1. **Use Incremental Migration (Option 1)**
   - Too risky to jump 3 major versions at once
   - Web package is user-facing (high stakes)
   - Easier to test and debug incrementally

2. **Timeline:**
   - **Week 1:** Upgrade to v3.0.0, test, deploy to staging
   - **Week 2:** Upgrade to v4.0.0, test, deploy to staging
   - **Week 3:** Upgrade to v5.1.0, test, deploy to staging
   - **Week 4:** Production deployment with monitoring

3. **Testing Strategy:**
   - Run E2E tests after each version upgrade
   - Manual QA on staging environment
   - Monitor error rates in production
   - Have rollback plan ready

4. **Success Criteria:**
   - ✅ Zero TypeScript errors
   - ✅ All E2E tests passing
   - ✅ No runtime errors in staging
   - ✅ Performance metrics unchanged
   - ✅ User flows work as expected

---

## 🚀 New Features Worth Adopting (v5.1.0)

Once migration is complete, consider adopting these new features:

### 1. Offchain Messages
```typescript
import {
  getOffchainMessageEncoder,
  signOffchainMessage
} from '@solana/messages';

// Sign messages for authentication without blockchain transactions
const encoder = getOffchainMessageEncoder();
const message = encoder.encode({
  type: 'auth',
  timestamp: Date.now(),
  domain: 'ghostspeak.io'
});

const signature = await signOffchainMessage(wallet, message);
```

### 2. Transaction Plan Utilities
```typescript
import {
  summarizeTransactionPlanResults,
  flattenTransactionPlanResults
} from '@solana/transactions';

// Better debugging and monitoring of complex transaction flows
const summary = summarizeTransactionPlanResults(plan);
console.log(`Success: ${summary.successful}, Failed: ${summary.failed}`);
```

### 3. Origin Header Support
```typescript
// Better CORS handling for browser clients
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com', {
  headers: {
    'Origin': 'https://ghostspeak.io'
  }
});
```

---

## 📚 Additional Resources

- **Solana Kit Docs:** https://www.solanakit.com/docs
- **GitHub Repository:** https://github.com/anza-xyz/kit
- **Release Notes:** https://github.com/anza-xyz/kit/releases
- **Migration Examples:** https://www.helius.dev/blog/how-to-start-building-with-the-solana-web3-js-2-0-sdk
- **API Reference:** https://www.solanakit.com/api

---

## 🆘 Support

If you encounter issues during migration:

1. **Check TypeScript Errors First**
   - Run `bun run type-check` to see all type errors
   - Fix type errors before testing runtime behavior

2. **Review Breaking Changes**
   - Re-read the breaking changes section for your target version
   - Ensure all deprecated APIs are updated

3. **Test Incrementally**
   - Test after each version upgrade
   - Don't wait until the end to discover issues

4. **Ask for Help**
   - Solana Discord: https://discord.gg/solana
   - Anza GitHub Issues: https://github.com/anza-xyz/kit/issues
   - Stack Exchange: https://solana.stackexchange.com/

---

## 📝 Post-Migration Checklist

After completing the migration:

- [ ] Update all `@solana/*` packages to v5.1.0
- [ ] Remove all deprecated API usage
- [ ] Update TypeScript types (no `any` or `@ts-ignore`)
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] No console errors in browser
- [ ] No runtime errors in logs
- [ ] Performance metrics unchanged or improved
- [ ] Documentation updated
- [ ] Team trained on new APIs
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

**Good luck with your migration! 🚀**

*This guide will be updated as new issues are discovered during the migration process.*
