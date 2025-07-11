# Web3.js v2 Implementation Rules

This document establishes the implementation rules and patterns for Web3.js v2 integration in the GhostSpeak platform, based on Jupiter Swap API patterns and Solana Web3.js v2 best practices.

## Core Architecture Patterns

### 1. Package Management and Dependencies

**Rule**: Use Bun as the primary package manager for optimal performance
```json
{
  "preferredPackageManager": "bun",
  "packageManager": "bun@1.2.15"
}
```

**Required Core Packages**:
- `@solana/addresses` - Address handling and validation
- `@solana/rpc` - RPC client creation and management
- `@solana/signers` - Keypair and signing operations
- `@solana/rpc-types` - Type definitions for RPC operations
- `@solana/codecs` - Data encoding/decoding
- `@solana/kit` - High-level utilities

**Recommended Program-Specific Packages**:
- `@solana-program/compute-budget` - Compute unit management
- `@solana-program/system` - System program interactions

### 2. RPC Connection Management

**Rule**: Always use `createSolanaRpc()` for establishing RPC connections
```typescript
import { createSolanaRpc } from '@solana/rpc';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
```

**Best Practices**:
- Specify network explicitly (devnet, mainnet-beta)
- Use commitment levels appropriately ('processed', 'confirmed', 'finalized')
- Implement connection health checks
- Cache RPC instances for performance

### 3. Transaction Construction Patterns

**Rule**: Use the `pipe()` function for composing transaction steps
```typescript
import { pipe } from '@solana/functional';

const transaction = pipe(
  createTransaction({ version: 0 }),
  tx => appendTransactionMessageInstructions([instruction], tx),
  tx => setTransactionMessageFeePayer(feePayer, tx),
  tx => setTransactionMessageLifetime(
    { blockhash: latestBlockhash.value, lastValidBlockHeight: latestBlockhash.context.slot + 150 },
    tx
  )
);
```

**Transaction Requirements**:
- Always use versioned transactions (version 0)
- Fetch the latest blockhash before transaction creation
- Set proper transaction lifetime with blockhash
- Handle fee payer assignment explicitly

### 4. Keypair and Wallet Management

**Rule**: Use modern keypair generation and loading functions
```typescript
import { generateKeyPairSigner } from '@solana/signers';
import { createKeyPairSignerFromBytes } from '@solana/signers';

// New keypair generation
const newKeypair = await generateKeyPairSigner();

// Loading from bytes
const keypair = await createKeyPairSignerFromBytes(secretKeyBytes);
```

**Security Requirements**:
- Never expose private keys in logs or client code
- Use secure storage for keypair persistence
- Validate keypair signatures before use

### 5. Error Handling and Resilience

**Rule**: Implement comprehensive error handling with proper types
```typescript
try {
  const result = await rpc.sendTransaction(signedTransaction).send();
  return result;
} catch (error) {
  if (error instanceof Error) {
    console.error('Transaction failed:', error.message);
    throw new TransactionError(error.message, error);
  }
  throw error;
}
```

**Error Handling Requirements**:
- Use try/catch blocks for all async operations
- Log detailed error messages for debugging
- Implement retry logic for transient failures
- Use `skipPreflight: true` only when necessary

### 6. Performance Optimization

**Rule**: Batch multiple operations when possible
```typescript
// Batch multiple RPC calls
const batchResults = await Promise.allSettled([
  rpc.getAccountInfo(address1).send(),
  rpc.getAccountInfo(address2).send(),
  rpc.getSlot().send()
]);
```

**Performance Guidelines**:
- Use connection pooling for high-frequency operations
- Implement caching for frequently accessed data
- Monitor transaction costs and optimize compute units
- Use appropriate commitment levels for speed vs. finality trade-offs

### 7. Type Safety and Code Generation

**Rule**: Use Codama for type-safe program interactions
```typescript
import { fetchMaybeAgentAccount } from './generated/accounts/agentAccount';

const maybeAccount = await fetchMaybeAgentAccount(rpc, agentAddress);
if (maybeAccount.exists) {
  // Type-safe access to account data
  const agentData = maybeAccount.data;
}
```

**Type Safety Requirements**:
- Generate types from IDL using Codama
- Use strict TypeScript configuration
- Validate all external data inputs
- Implement runtime type checking for critical paths

### 8. Service Architecture Pattern

**Rule**: Organize functionality into dedicated service classes
```typescript
export class AgentService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment
  ) {}

  async registerAgent(wallet: KeyPairSigner, options: ICreateAgentOptions): Promise<string> {
    // Implementation
  }
}
```

**Service Design Principles**:
- Single responsibility per service
- Dependency injection for testability
- Consistent error handling across services
- Async/await for all blockchain operations

### 9. Address Validation and Handling

**Rule**: Use the `@solana/addresses` package for all address operations
```typescript
import { address } from '@solana/addresses';

function validateAddress(addr: string): boolean {
  try {
    address(addr);
    return true;
  } catch {
    return false;
  }
}
```

### 10. Testing and Development Patterns

**Rule**: Use local test validators and bankrun for testing
```typescript
import { startAnchor } from 'solana-bankrun';

// Test setup
const context = await startAnchor('', [{ name: 'program', programId }], []);
const rpc = createSolanaRpc(context.banksClient.rpcEndpoint);
```

**Testing Requirements**:
- Use Solana test validator for integration tests
- Mock external dependencies in unit tests
- Test error conditions and edge cases
- Verify transaction signatures and accounts

## Implementation Checklist

### Initial Setup
- [ ] Configure Bun as package manager
- [ ] Install required Web3.js v2 packages
- [ ] Set up TypeScript with strict configuration
- [ ] Configure Codama for type generation

### RPC and Connection
- [ ] Implement RPC client factory functions
- [ ] Add connection health checking
- [ ] Configure appropriate commitment levels
- [ ] Implement connection retry logic

### Transaction Handling
- [ ] Use versioned transactions (v0)
- [ ] Implement proper transaction construction pipeline
- [ ] Add comprehensive error handling
- [ ] Include transaction simulation before sending

### Service Architecture
- [ ] Create dedicated service classes
- [ ] Implement dependency injection
- [ ] Add proper TypeScript types
- [ ] Include comprehensive error handling

### Security and Validation
- [ ] Validate all input addresses
- [ ] Implement secure keypair handling
- [ ] Add transaction verification
- [ ] Implement proper error logging

## Migration from Legacy Code

### Deprecated Patterns to Avoid
- Direct `Connection` class usage (use `createSolanaRpc` instead)
- Synchronous operations where async is available
- Manual transaction construction without proper typing
- Inconsistent error handling patterns

### Migration Steps
1. Update package dependencies to Web3.js v2
2. Replace `Connection` with `createSolanaRpc`
3. Update transaction construction to use `pipe()` pattern
4. Migrate keypair handling to new signer functions
5. Update error handling to use proper types
6. Implement service-based architecture
7. Add comprehensive testing

## Performance Monitoring

### Key Metrics to Track
- RPC response times
- Transaction success rates
- Network commitment confirmation times
- Service availability and error rates

### Optimization Strategies
- Connection pooling
- Request batching
- Intelligent caching
- Graceful degradation

## Security Considerations

### Critical Security Rules
- Never log private keys or sensitive data
- Validate all blockchain data before processing
- Use secure random number generation
- Implement proper signature verification
- Sanitize all user inputs

This document serves as the authoritative guide for Web3.js v2 implementation in the GhostSpeak platform. All new code should follow these patterns, and existing code should be migrated according to these rules.