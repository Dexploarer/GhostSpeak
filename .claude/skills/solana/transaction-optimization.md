# Transaction Optimization Reference

Complete guide for optimizing Solana transactions: priority fees, Jito bundles, and MEV protection (December 2025).

## Transaction Costs

### Cost Components

| Component | Description | How to Optimize |
|-----------|-------------|-----------------|
| Base Fee | 5,000 lamports (0.000005 SOL) | Fixed, cannot change |
| Priority Fee | Variable, per compute unit | Set strategically |
| Rent | Account storage cost | Minimize account size |
| Compute Units | Execution cost (max 1.4M) | Optimize program code |

### Priority Fee Formula

```
Total Priority Fee = Compute Unit Limit × Compute Unit Price (microlamports)

Example:
- CU Limit: 200,000
- CU Price: 1,000 microlamports
- Priority Fee: 200,000 × 1,000 = 200,000,000 microlamports = 0.0002 SOL
```

---

## Compute Budget

### Setting Compute Units

```typescript
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget';

// Estimate compute units needed (simulation or known amount)
const estimatedCU = 200_000;

// Set compute unit limit
const cuLimitIx = getSetComputeUnitLimitInstruction({
  units: estimatedCU,
});

// Set priority fee (microlamports per CU)
const cuPriceIx = getSetComputeUnitPriceInstruction({
  microLamports: 1_000n,  // 0.001 lamports per CU
});

// Add as FIRST instructions
const transaction = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(signer, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => prependTransactionMessageInstruction(cuPriceIx, m),
  (m) => prependTransactionMessageInstruction(cuLimitIx, m),
  (m) => appendTransactionMessageInstruction(mainInstruction, m),
);
```

### Compute Unit Estimation

```typescript
// Method 1: Simulation
const simulation = await rpc.simulateTransaction(transaction).send();
const estimatedCU = simulation.value.unitsConsumed;
const safeLimit = Math.ceil(estimatedCU * 1.1); // 10% buffer

// Method 2: Known limits for common operations
const KNOWN_LIMITS = {
  SOL_TRANSFER: 300,
  TOKEN_TRANSFER: 6_000,
  JUPITER_SWAP: 300_000,
  NFT_MINT: 200_000,
  ANCHOR_INIT: 50_000,
};

// Method 3: Helius simulation API
const simulation = await helius.simulateTransaction({
  transaction: serializedTx,
  includeComputeUnits: true,
});
```

---

## Priority Fee Strategies

### Dynamic Fee Estimation

```typescript
// Helius Priority Fee API
async function getPriorityFee(accountKeys: string[]): Promise<number> {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'priority-fee',
      method: 'getPriorityFeeEstimate',
      params: [{
        accountKeys,
        options: {
          includeAllPriorityFeeLevels: true,
        },
      }],
    }),
  });
  
  const { result } = await response.json();
  return result;
  
  // Returns: { min, low, medium, high, veryHigh, unsafeMax }
}

// Usage
const fees = await getPriorityFee([
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter
]);

// Select appropriate level
const priorityFee = fees.medium;  // or fees.high for critical txs
```

### Fee Level Guidelines

| Level | When to Use | Typical Range |
|-------|-------------|---------------|
| Min | Low priority, can wait | 1-100 microlamports |
| Low | Normal operations | 100-1,000 |
| Medium | Standard DeFi | 1,000-10,000 |
| High | Time-sensitive | 10,000-100,000 |
| VeryHigh | Critical/MEV | 100,000-1,000,000 |

### Account-Based Fee Estimation

```typescript
// Fees vary by account (hot accounts = higher fees)
const hotAccounts = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',  // Orca
  'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr',  // Raydium
];

// Get fees for your specific accounts
const txAccounts = getAccountsFromTransaction(transaction);
const fees = await getPriorityFee(txAccounts);
```

---

## Jito Bundles

### Overview

Jito bundles provide:
- **Atomic execution**: All-or-nothing for up to 5 transactions
- **Sequential ordering**: Guaranteed order within bundle
- **MEV protection**: Private transaction flow
- **Revert protection**: No partial failures

### When to Use Bundles

| Use Case | Benefit |
|----------|---------|
| Large swaps | Avoid sandwich attacks |
| Multi-step operations | Atomic execution |
| Arbitrage | Guaranteed ordering |
| Liquidations | Speed and atomicity |
| Operations > 1.4M CU | Split across transactions |

### Bundle Structure

```typescript
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';

// Maximum 5 transactions per bundle
const bundle = [
  setupTransaction,      // Transaction 1: Setup
  mainTransaction,       // Transaction 2: Main operation  
  cleanupTransaction,    // Transaction 3: Cleanup + tip
];

// Tips MUST be in bundle (usually last transaction)
const tipIx = SystemProgram.transfer({
  fromPubkey: payer,
  toPubkey: JITO_TIP_ACCOUNT,
  lamports: 10_000,  // Minimum 1,000 lamports
});
```

### Jito Tip Accounts

```typescript
// Tip accounts (use any one)
const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// Pick randomly for load distribution
const tipAccount = JITO_TIP_ACCOUNTS[
  Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)
];
```

### Sending Bundles

```typescript
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';

async function sendBundle(transactions: VersionedTransaction[]) {
  const client = searcherClient(
    'https://mainnet.block-engine.jito.wtf',
    JITO_AUTH_KEYPAIR
  );
  
  // Serialize transactions
  const serializedTxs = transactions.map(tx => 
    bs58.encode(tx.serialize())
  );
  
  // Create bundle
  const bundle: Bundle = {
    transactions: serializedTxs,
  };
  
  // Send
  const bundleId = await client.sendBundle(bundle);
  
  // Check status
  const status = await client.getBundleStatus(bundleId);
  return { bundleId, status };
}
```

### QuickNode Lil' JIT Add-on

```typescript
// Simplified bundle sending via QuickNode
const response = await fetch(`${QUICKNODE_RPC}/bundle`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'sendBundle',
    params: [
      {
        transactions: serializedTransactions,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      }
    ],
  }),
});
```

### Bundle Best Practices

1. **Include tip in main transaction** - Avoid paying if tx fails
2. **Use appropriate tip amount** - Higher = faster inclusion
3. **Verify bundle simulation** - Test before sending
4. **Handle uncled blocks** - Retry on failure
5. **Monitor bundle status** - Track inclusion

```typescript
// Safe tip pattern: Include assertions
const tipTransaction = new Transaction();
tipTransaction.add(
  // Check expected state before paying tip
  createAssertInstruction({
    account: expectedAccount,
    expectedBalance: expectedValue,
  }),
  // Only pay tip if assertion passes
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: tipAccount,
    lamports: tipAmount,
  }),
);
```

---

## MEV Protection

### Types of MEV

| Type | Description | Protection |
|------|-------------|------------|
| Sandwich | Front-run + back-run | Bundles, private relay |
| Front-running | Execute before target | Private relay |
| Back-running | Execute after target | Time-sensitive bundles |
| Arbitrage | Price differences | Usually benign |

### Protection Strategies

#### 1. Use Jito Bundles

```typescript
// Bundle transactions for atomic execution
// MEV searchers can't insert between bundled txs
```

#### 2. Private Transaction Relay

```typescript
// Helius private transactions
const response = await fetch(`${HELIUS_RPC}/v0/transactions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transaction: serializedTx,
    skipPreflight: true,
    // Routes through private relay
  }),
});
```

#### 3. Slippage Protection

```typescript
// Jupiter swap with slippage
const quote = await getQuote({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: '1000000000',
  slippageBps: 50,  // 0.5% max slippage
});

// Check price impact
if (parseFloat(quote.priceImpactPct) > 1) {
  console.warn('High price impact, consider splitting');
}
```

#### 4. Time-Sensitive Execution

```typescript
// Set tight blockhash validity
const { value: blockhash } = await rpc.getLatestBlockhash({
  commitment: 'confirmed',
});

// Transaction valid for ~60 seconds
// Reduces window for MEV attacks
```

---

## Transaction Retry Strategies

### Exponential Backoff

```typescript
async function sendWithRetry(
  transaction: VersionedTransaction,
  maxRetries = 5
): Promise<string> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: true,
        maxRetries: 0,  // We handle retries
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        signature,
        'confirmed'
      );
      
      if (!confirmation.value.err) {
        return signature;
      }
      
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    } catch (error) {
      lastError = error;
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await sleep(delay);
      
      // Refresh blockhash on retry
      const { value: newBlockhash } = await rpc.getLatestBlockhash();
      transaction.message.recentBlockhash = newBlockhash.blockhash;
      transaction.sign([signer]);
    }
  }
  
  throw lastError;
}
```

### Parallel Submission

```typescript
// Send to multiple RPCs simultaneously
async function sendToMultipleRPCs(transaction: VersionedTransaction) {
  const rpcs = [
    'https://mainnet.helius-rpc.com/?api-key=KEY1',
    'https://solana-mainnet.quiknode.pro/KEY2',
    'https://api.mainnet-beta.solana.com',
  ];
  
  const results = await Promise.allSettled(
    rpcs.map(rpc => {
      const conn = new Connection(rpc);
      return conn.sendTransaction(transaction, { skipPreflight: true });
    })
  );
  
  // Return first successful signature
  const success = results.find(r => r.status === 'fulfilled');
  if (success) {
    return success.value;
  }
  
  throw new Error('All RPCs failed');
}
```

---

## Versioned Transactions

### When to Use V0 (Versioned)

- Transactions with 20+ accounts
- Complex DeFi operations
- Any transaction approaching size limit

### Address Lookup Tables

```typescript
import { AddressLookupTableProgram } from '@solana/web3.js';

// Create lookup table
const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
  authority: payer.publicKey,
  payer: payer.publicKey,
  recentSlot: slot,
});

// Extend with addresses
const extendIx = AddressLookupTableProgram.extendLookupTable({
  payer: payer.publicKey,
  authority: payer.publicKey,
  lookupTable: lookupTableAddress,
  addresses: [
    // Common program IDs and accounts
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    ...frequentlyUsedAccounts,
  ],
});

// Use in transaction
const lookupTable = await connection.getAddressLookupTable(lookupTableAddress);

const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash: blockhash,
  instructions: [/* ... */],
}).compileToV0Message([lookupTable.value]);

const transaction = new VersionedTransaction(messageV0);
```

### Jupiter ALTs

Jupiter provides pre-populated lookup tables:

```typescript
// Jupiter returns ALTs in swap response
const swapResponse = await getSwapTransaction({
  quoteResponse: quote,
  userPublicKey: wallet.publicKey.toString(),
});

// Deserialize includes ALT references
const transaction = VersionedTransaction.deserialize(
  Buffer.from(swapResponse.swapTransaction, 'base64')
);
```

---

## Performance Benchmarks

### Typical Transaction Times

| Scenario | Time to Confirmation |
|----------|---------------------|
| Base tx, no congestion | 400-600ms |
| With priority fee (medium) | 400-800ms |
| Jito bundle | 400-1000ms |
| Congested network | 1-10s |

### Cost Optimization

```typescript
// Calculate total cost
function estimateTxCost(params: {
  computeUnits: number;
  priorityFee: number;  // microlamports per CU
  accountsCreated: number;
  accountSizes: number[];
}): number {
  const baseFee = 5000; // lamports
  const priorityFee = params.computeUnits * params.priorityFee / 1_000_000;
  const rentCost = params.accountSizes.reduce((sum, size) => {
    return sum + (size + 128) * 6960; // Rent per byte per year
  }, 0);
  
  return baseFee + priorityFee + rentCost;
}
```

---

## Monitoring & Debugging

### Transaction Inspection

```typescript
// Parse transaction logs
const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

console.log('Compute units used:', tx.meta?.computeUnitsConsumed);
console.log('Fee:', tx.meta?.fee);
console.log('Logs:', tx.meta?.logMessages);

// Check for errors
if (tx.meta?.err) {
  console.error('Error:', tx.meta.err);
}
```

### Helius Enhanced Transactions

```typescript
const parsed = await helius.enhanced.getTransactions({
  signatures: [signature],
});

// Human-readable transaction info
console.log('Type:', parsed[0].type);
console.log('Description:', parsed[0].description);
console.log('Token transfers:', parsed[0].tokenTransfers);
```
