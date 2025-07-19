# RPC Utilities Documentation

This directory contains modern RPC utilities for the GhostSpeak SDK, built on Solana Web3.js v2.

## Files Overview

### `rpc-client.ts`
The main RPC client implementation with comprehensive Solana blockchain operations.

### `rpc.ts`
Utility functions and helper classes for RPC operations.

### `rpc-types.ts`
TypeScript type definitions for all RPC methods and responses.

## Key Classes

### `SolanaRpcClient`
The primary client for interacting with Solana RPC nodes.

```typescript
import { SolanaRpcClient } from './rpc-client.js'

const client = new SolanaRpcClient({
  endpoint: 'https://api.devnet.solana.com',
  commitment: 'confirmed'
})
```

### `AccountDecoder<T>`
Generic decoder for account data with flexible input handling.

```typescript
import { AccountDecoder } from './rpc.js'

const decoder = new AccountDecoder({
  decode: (data: Uint8Array) => parseMyData(data)
})
```

### `RpcBatchProcessor<T>`
Efficient batch processing for multiple RPC operations.

```typescript
import { RpcBatchProcessor } from './rpc.js'

const processor = new RpcBatchProcessor<AccountInfo>(100, 10)
```

### `TransactionHelpers`
Static utility methods for transaction calculations.

```typescript
import { TransactionHelpers } from './rpc.js'

const size = TransactionHelpers.calculateTransactionSize(1, 5, 100)
const fee = TransactionHelpers.estimateTransactionFee(1)
```

### `AccountUtils`
Utility functions for account operations.

```typescript
import { AccountUtils } from './rpc.js'

const isExecutable = AccountUtils.isExecutable(account)
const isOwned = AccountUtils.isOwnedBy(account, programId)
```

### `CommitmentUtils`
Utilities for working with commitment levels.

```typescript
import { CommitmentUtils } from './rpc.js'

const stronger = CommitmentUtils.stronger('processed', 'confirmed')
await CommitmentUtils.waitForCommitment(getStatus, 'finalized')
```

### `PdaUtils`
Program Derived Address (PDA) utilities.

```typescript
import { PdaUtils } from './rpc.js'

const [pda, bump] = await PdaUtils.findProgramAddress(seeds, programId)
```

### `RetryUtils`
Retry logic with exponential backoff.

```typescript
import { RetryUtils } from './rpc.js'

const result = await RetryUtils.withExponentialBackoff(
  () => riskyOperation(),
  { maxRetries: 3, baseDelayMs: 1000 }
)
```

## Usage Examples

### Basic Account Fetching

```typescript
import { SolanaRpcClient } from './rpc-client.js'

const client = new SolanaRpcClient({
  endpoint: 'https://api.devnet.solana.com'
})

const account = await client.getAccountInfo('11111111111111111111111111111111')
```

### Batch Operations

```typescript
import { RpcBatchProcessor } from './rpc.js'

const processor = new RpcBatchProcessor<string>()

const results = await Promise.all([
  processor.add(() => client.getBalance(address1)),
  processor.add(() => client.getBalance(address2)),
  processor.add(() => client.getBalance(address3))
])
```

### Account Data Decoding

```typescript
import { AccountDecoder } from './rpc.js'

const decoder = new AccountDecoder({
  decode: (data: Uint8Array) => {
    // Custom decoding logic
    return {
      field1: data.slice(0, 8),
      field2: data.slice(8, 16)
    }
  }
})

const account = await client.getAccountInfo(address)
if (account) {
  const decoded = decoder.decode(account.data)
}
```

### Transaction Helpers

```typescript
import { TransactionHelpers } from './rpc.js'

// Calculate transaction size
const size = TransactionHelpers.calculateTransactionSize(
  1, // signatures
  5, // accounts
  100 // data size
)

// Check if it fits in a single packet
const fits = TransactionHelpers.fitsInSinglePacket(size)

// Estimate fees
const fee = TransactionHelpers.estimateTransactionFee(1)
```

### Retry Logic

```typescript
import { RetryUtils } from './rpc.js'

const result = await RetryUtils.withExponentialBackoff(
  () => client.getAccountInfo(address),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    shouldRetry: (error) => RetryUtils.isRetryableError(error)
  }
)
```

### PDA Generation

```typescript
import { PdaUtils } from './rpc.js'

const seeds = [
  Buffer.from('metadata'),
  Buffer.from(publicKey.toBytes()),
  Buffer.from(mintKey.toBytes())
]

const [pda, bump] = await PdaUtils.findProgramAddress(seeds, programId)
```

## Best Practices

1. **Reuse Client Instances**: Create one client per endpoint and reuse it
2. **Use Batch Operations**: For multiple operations, use batch processing
3. **Handle Errors Gracefully**: Implement proper error handling and retries
4. **Choose Appropriate Commitment**: Use the right commitment level for your use case
5. **Cache Static Data**: Cache program accounts and other static data
6. **Monitor Performance**: Track RPC call performance and optimize as needed

## Migration from Old Patterns

### Old Pattern (deprecated)
```typescript
const rpc = createSolanaRpc(endpoint)
const result = await rpc.getAccountInfo(address).send()
const account = result.value
```

### New Pattern (recommended)
```typescript
const client = new SolanaRpcClient({ endpoint })
const account = await client.getAccountInfo(address)
```

## Type Safety

All utilities are fully typed with TypeScript:

```typescript
// Type inference works automatically
const balance: bigint = await client.getBalance(address)
const account: AccountInfo | null = await client.getAccountInfo(address)
const accounts: (AccountInfo | null)[] = await client.getMultipleAccounts(addresses)
```

## Performance Optimizations

1. **Connection Pooling**: Client instances manage connection pools automatically
2. **Batch Processing**: `RpcBatchProcessor` optimizes multiple operations
3. **Caching**: Built-in caching for frequently accessed data
4. **Compression**: Automatic compression for large payloads
5. **Retry Logic**: Intelligent retry with exponential backoff

See the [main RPC client guide](../../docs/rpc-client-guide.md) for comprehensive documentation.