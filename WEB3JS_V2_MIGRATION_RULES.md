# Solana Web3.js v2 Migration Rules & Guidelines

## CRITICAL RULE: NO v1 CODE ALLOWED

**🚨 ABSOLUTE REQUIREMENT: This codebase ONLY uses Solana Web3.js v2. NO v1 code is permitted.**

## Current Project Status

✅ **GOOD NEWS**: Analysis shows this project is already using Web3.js v2:
- SDK package.json specifies `@solana/web3.js: 2.1.1` as peer dependency
- Root package.json has `@solana/web3.js: ^1.98.2` but this is overridden by workspace packages
- All new code uses v2 modular packages: `@solana/kit`, `@solana/rpc`, `@solana/signers`, etc.
- Generated code uses v2 patterns exclusively

## Breaking Changes from v1 to v2

### 1. Keypair → KeyPairSigner
```typescript
// ❌ v1 Pattern - NEVER USE
import { Keypair } from '@solana/web3.js';
const keypair = Keypair.generate();
const secretKey = keypair.secretKey;

// ✅ v2 Pattern - ALWAYS USE
import { generateKeyPairSigner } from '@solana/signers';
const keyPairSigner = await generateKeyPairSigner();
const privateKey = keyPairSigner.privateKey;
```

### 2. PublicKey → Address
```typescript
// ❌ v1 Pattern - NEVER USE
import { PublicKey } from '@solana/web3.js';
const pubkey = new PublicKey('...');

// ✅ v2 Pattern - ALWAYS USE
import { address } from '@solana/addresses';
const addr = address('...');
const signerAddress = keyPairSigner.address;
```

### 3. Connection → RPC Factory
```typescript
// ❌ v1 Pattern - NEVER USE
import { Connection } from '@solana/web3.js';
const connection = new Connection('https://api.devnet.solana.com');

// ✅ v2 Pattern - ALWAYS USE
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc';
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com');
```

### 4. Transaction Building
```typescript
// ❌ v1 Pattern - NEVER USE
import { Transaction, SystemProgram } from '@solana/web3.js';
const transaction = new Transaction();
transaction.add(SystemProgram.transfer({...}));

// ✅ v2 Pattern - ALWAYS USE
import { createTransaction } from '@solana/transactions';
import { getTransferSolInstruction } from '@solana/system-program';
const transaction = pipe(
  createTransaction({ version: 0 }),
  (tx) => appendTransactionMessageInstruction(
    getTransferSolInstruction({...}),
    tx
  )
);
```

### 5. Amount Handling
```typescript
// ❌ v1 Pattern - NEVER USE
const amount = 1000000; // Regular number

// ✅ v2 Pattern - ALWAYS USE
const amount = 1000000n; // BigInt with 'n' suffix
```

### 6. Transaction Sending
```typescript
// ❌ v1 Pattern - NEVER USE
const signature = await connection.sendTransaction(transaction, [signer]);
await connection.confirmTransaction(signature);

// ✅ v2 Pattern - ALWAYS USE
import { sendAndConfirmTransactionFactory } from '@solana/web3.js';
const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});
const signature = await sendAndConfirmTransaction(signedTransaction);
```

## Package Structure Rules

### Required v2 Packages
```json
{
  "dependencies": {
    "@solana/addresses": "2.1.1",
    "@solana/codecs": "2.1.1", 
    "@solana/kit": "2.1.1",
    "@solana/rpc": "2.1.1",
    "@solana/rpc-types": "2.1.1",
    "@solana/signers": "2.1.1",
    "@solana/transactions": "2.1.1"
  },
  "peerDependencies": {
    "@solana/web3.js": "2.1.1"
  }
}
```

### Import Patterns
```typescript
// ✅ ALWAYS use modular imports
import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { createTransaction } from '@solana/transactions';

// ❌ NEVER import from legacy v1 patterns
import { Connection, Keypair, PublicKey } from '@solana/web3.js'; // FORBIDDEN
```

## Code Review Checklist

When reviewing/writing code, ensure:

- [ ] No `import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'`
- [ ] All keypairs use `generateKeyPairSigner()` 
- [ ] All addresses use `address()` function
- [ ] All RPC calls use `createSolanaRpc()`
- [ ] All amounts use BigInt with `n` suffix
- [ ] All transactions use v2 transaction builders
- [ ] Factory pattern used for configurable operations

## Performance Benefits of v2

- **~200ms faster** transaction confirmation
- **26% smaller** bundle size (311KB → 226KB)
- **10x faster** cryptographic operations
- **Tree-shakeable** - only import what you use
- **Zero external dependencies**
- **Native BigInt** support for accurate large numbers

## Migration Commands

```bash
# Remove any v1 dependencies
bun remove @solana/web3.js@1.x

# Add v2 packages
bun add @solana/web3.js@2.1.1
bun add @solana/kit@2.1.1 
bun add @solana/rpc@2.1.1
bun add @solana/signers@2.1.1
bun add @solana/addresses@2.1.1
bun add @solana/transactions@2.1.1
```

## Error Prevention

### Common v1 Patterns to Avoid
```typescript
// ❌ These patterns indicate v1 usage - NEVER USE
new Connection()
new PublicKey()
Keypair.generate()
transaction.add()
sendTransaction()
.secretKey
new Transaction()
```

### Required v2 Patterns
```typescript
// ✅ These patterns indicate proper v2 usage
createSolanaRpc()
address()
generateKeyPairSigner()
appendTransactionMessageInstruction()
sendAndConfirmTransactionFactory()
.privateKey
createTransaction()
```

## Testing Strategy

- All tests use v2 patterns exclusively  
- Mock RPC calls using v2 factory functions
- Use `@solana/addresses` for test addresses
- Use BigInt for all numerical values
- Test bundle size to ensure tree-shaking works

## Documentation Requirements

- All code examples must use v2 patterns
- Include performance comparisons when relevant
- Document migration path for any legacy integrations
- Emphasize type safety improvements

---

**REMEMBER: This is a v2-ONLY codebase. Any v1 code is a bug that must be fixed immediately.**