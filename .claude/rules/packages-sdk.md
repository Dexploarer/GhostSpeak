---
globs: ["packages/sdk-typescript/**"]
description: Rules and patterns for @ghostspeak/sdk TypeScript SDK development
---

# SDK Development Rules (packages/sdk-typescript)

## Architecture Context

**Package**: @ghostspeak/sdk
**Current Version**: 2.0.10
**Build Tool**: TSUp (ESM + CJS dual output)
**Test Framework**: Bun Test
**Dependencies**: @solana/kit v2, Anchor client generators

## Module Architecture

### Core Pattern: BaseModule + GhostSpeakClient

```typescript
// All modules extend BaseModule
export class AgentModule extends BaseModule {
  constructor(client: GhostSpeakClient) {
    super(client);
  }

  async register(params: RegisterAgentParams): Promise<string> {
    // Module methods use this.rpc, this.config, this.signer
  }
}

// Client instantiates all modules
export class GhostSpeakClient {
  public agents: AgentModule;
  public credentials: CredentialModule;
  public reputation: ReputationModule;
  // ...

  constructor(config: GhostSpeakConfig) {
    this.agents = new AgentModule(this);
    this.credentials = new CredentialModule(this);
    // ...
  }
}
```

## Module List (src/modules/)

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| `AgentModule` | Agent registration & management | `register()`, `update()`, `deactivate()` |
| `CredentialModule` | W3C VCs + Crossmint bridging | `issueAgentIdentityCredential()`, `bridgeToEVM()` |
| `ReputationModule` | Ghost Score calculation | `getReputationData()`, `calculateScore()` |
| `DidModule` | Decentralized Identifiers | `createDid()`, `resolveDid()` |
| `PrivacyModule` | Metrics visibility | `setVisibility()`, `getVisibilitySettings()` |
| `X402TransactionIndexer` | Payment indexing | `indexTransaction()`, `getAgentTransactions()` |

## Build Configuration

### Entry Points (package.json exports)

```json
{
  "exports": {
    ".": "./dist/index.js",              // Main (all modules)
    "./browser": "./dist/browser.js",    // Browser-safe subset
    "./credentials": "./dist/credentials.js",  // Credentials only
    "./types": "./dist/types.js",        // Type definitions
    "./errors": "./dist/errors.js",      // Error classes
    "./crypto": "./dist/crypto.js"       // ElGamal crypto utils
  }
}
```

### TSUp Configuration (tsup.config.ts)

```typescript
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    credentials: 'src/credentials.ts',
    types: 'src/types.ts',
    errors: 'src/errors.ts',
    crypto: 'src/crypto.ts',
  },
  format: ['esm', 'cjs'],     // Dual output
  dts: true,                   // Generate .d.ts
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
```

## Solana Integration Rules

### ✅ ALWAYS Use Modern @solana/kit v2

```typescript
// ✅ CORRECT - Modern modular packages
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import { generateKeyPairSigner } from '@solana/signers';
import { getTransferSolInstruction } from '@solana-program/system';

// ❌ WRONG - Legacy monolithic package
import { Connection, PublicKey, Keypair } from '@solana/web3.js'; // ESLint will error
```

### RPC Connection Pattern

```typescript
// BaseModule.ts
export abstract class BaseModule {
  protected get rpc() {
    return createSolanaRpc(this.config.rpcUrl);
  }

  protected get commitment() {
    return this.config.commitment || 'confirmed';
  }
}
```

### Transaction Building

```typescript
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
} from '@solana/kit';

async buildTransaction(instruction: Instruction) {
  const { value: latestBlockhash } = await this.rpc
    .getLatestBlockhash()
    .send();

  return pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(this.signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstruction(instruction, m),
  );
}
```

## Anchor Program Integration

### IDL Generation

```bash
# After building Anchor program
cd packages/sdk-typescript
bun run generate  # Runs codama to generate TypeScript client
```

### Using Generated Clients

```typescript
// src/modules/AgentModule.ts
import {
  getRegisterAgentInstruction,
  fetchAgent,
  Agent,
} from '../generated/ghostspeak-marketplace';

export class AgentModule extends BaseModule {
  async register(params: RegisterAgentParams): Promise<string> {
    const instruction = getRegisterAgentInstruction({
      agent: params.agentAddress,
      authority: this.signer.address,
      systemProgram: address('11111111111111111111111111111111'),
      // ... other accounts
    });

    const tx = await this.buildTransaction(instruction);
    const signature = await this.sendAndConfirm(tx);
    return signature;
  }

  async getAgent(agentAddress: Address): Promise<Agent | null> {
    return await fetchAgent(this.rpc, agentAddress);
  }
}
```

## Error Handling

### Custom Error Classes (src/errors/)

```typescript
// errors/AgentError.ts
export class AgentNotFoundError extends Error {
  constructor(address: string) {
    super(`Agent not found: ${address}`);
    this.name = 'AgentNotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(required: bigint, available: bigint) {
    super(`Insufficient balance. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}
```

### Error Handling in Modules

```typescript
async register(params: RegisterAgentParams): Promise<string> {
  try {
    // Check balance
    const balance = await this.rpc.getBalance(this.signer.address).send();
    if (balance.value < MIN_BALANCE) {
      throw new InsufficientBalanceError(MIN_BALANCE, balance.value);
    }

    // Execute transaction
    const signature = await this.sendAndConfirm(tx);
    return signature;
  } catch (error) {
    if (error instanceof SendTransactionError) {
      throw new AgentRegistrationError(
        `Failed to register agent: ${error.message}`
      );
    }
    throw error;
  }
}
```

## Testing Patterns

### Unit Tests (tests/unit/)

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { GhostSpeakClient } from '../src/index';

describe('AgentModule', () => {
  let client: GhostSpeakClient;

  beforeAll(() => {
    client = new GhostSpeakClient({
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
    });
  });

  it('should register an agent', async () => {
    const signature = await client.agents.register({
      name: 'Test Agent',
      address: 'test-address',
    });

    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests (tests/integration/)

```typescript
import { describe, it, expect } from 'bun:test';
import { GhostSpeakClient } from '../src/index';

describe('Agent Lifecycle', () => {
  it('should complete full agent lifecycle', async () => {
    const client = new GhostSpeakClient({ cluster: 'devnet' });

    // Register
    const registerSig = await client.agents.register({ name: 'Test' });
    expect(registerSig).toBeDefined();

    // Fetch
    const agent = await client.agents.getAgent(agentAddress);
    expect(agent?.name).toBe('Test');

    // Update
    const updateSig = await client.agents.update({ name: 'Updated' });
    expect(updateSig).toBeDefined();

    // Deactivate
    const deactivateSig = await client.agents.deactivate();
    expect(deactivateSig).toBeDefined();
  });
});
```

## Type Safety

### Strict TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Branded Types for Addresses

```typescript
// types/address.ts
import { Address } from '@solana/addresses';

export type AgentAddress = Address & { readonly __brand: 'AgentAddress' };
export type ProgramId = Address & { readonly __brand: 'ProgramId' };

export function agentAddress(addr: string): AgentAddress {
  return address(addr) as AgentAddress;
}
```

## Development Workflow

### Building

```bash
bun run build          # Build with TSUp
bun run dev            # Watch mode (rebuilds on changes)
bun run type-check     # TypeScript type checking only
```

### Testing

```bash
bun test                           # All tests
bun test tests/unit/agent.test.ts  # Specific test file
bun test --watch                   # Watch mode
bun test --coverage                # Coverage report
```

### Generating Anchor Clients

```bash
# 1. Build Anchor program first
cd ../../programs
anchor build

# 2. Generate TypeScript clients
cd ../packages/sdk-typescript
bun run generate  # Uses codama
```

### Publishing

```bash
# Pre-publish checklist
bun run build       # Build all outputs
bun test            # All tests pass
bun run lint        # No lint errors

# Version bump (use conventional commits)
npm version patch   # 2.0.10 -> 2.0.11
npm version minor   # 2.0.10 -> 2.1.0
npm version major   # 2.0.10 -> 3.0.0

# Publish
npm publish         # Publishes to npm registry

# Tag release
git tag v2.0.11
git push --tags
```

## File Structure

```
packages/sdk-typescript/
├── src/
│   ├── index.ts                 # Main entry (exports all modules)
│   ├── browser.ts               # Browser-safe entry
│   ├── credentials.ts           # Credentials-only entry
│   ├── types.ts                 # Type definitions entry
│   ├── errors.ts                # Error classes entry
│   ├── crypto.ts                # Crypto utilities entry
│   ├── core/
│   │   ├── client.ts           # GhostSpeakClient
│   │   └── BaseModule.ts       # Base class for modules
│   ├── modules/
│   │   ├── AgentModule.ts
│   │   ├── CredentialModule.ts
│   │   ├── ReputationModule.ts
│   │   ├── DidModule.ts
│   │   ├── PrivacyModule.ts
│   │   └── X402TransactionIndexer.ts
│   ├── generated/              # Auto-generated from Anchor
│   │   └── ghostspeak-marketplace/
│   ├── types/                  # Type definitions
│   └── utils/                  # Utility functions
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── dist/                       # Build output (gitignored)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Common Pitfalls

### ❌ Don't: Mix Legacy and Modern Solana Packages

```typescript
// BAD: Mixing versions
import { Connection } from '@solana/web3.js';           // v1 legacy
import { address } from '@solana/addresses';            // v2 modern
```

### ✅ Do: Use Only Modern Packages

```typescript
// GOOD: All v2
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
```

### ❌ Don't: Hardcode Program IDs

```typescript
// BAD: Hardcoded
const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB';
```

### ✅ Do: Use Configuration

```typescript
// GOOD: From config
const programId = this.config.programId;
```

### ❌ Don't: Ignore Transaction Errors

```typescript
// BAD: Silent failure
try {
  await this.sendTransaction(tx);
} catch (e) {
  // Ignored
}
```

### ✅ Do: Handle and Propagate Errors

```typescript
// GOOD: Proper error handling
try {
  return await this.sendTransaction(tx);
} catch (error) {
  if (error instanceof SendTransactionError) {
    throw new AgentRegistrationError(`Registration failed: ${error.message}`);
  }
  throw error;
}
```

## Performance Best Practices

1. **Use workspace deps**: All internal deps use `workspace:*`
2. **Tree-shakeable exports**: Separate entry points for different use cases
3. **Lazy loading**: Heavy modules (crypto) have separate entry points
4. **Minimal dependencies**: Only include what's needed in each entry
5. **Type-only imports**: Use `import type` when possible
6. **Batch RPC calls**: Use `getMultipleAccounts` instead of individual calls

## Security Checklist

- [ ] Never expose private keys or mnemonics
- [ ] Validate all addresses before use
- [ ] Use branded types to prevent address misuse
- [ ] Check transaction simulation before sending
- [ ] Implement proper error messages (no sensitive data)
- [ ] Sanitize user input before passing to on-chain programs
- [ ] Use checked arithmetic for token amounts
- [ ] Verify program IDs before CPI calls

## Dependencies Management

### Core Dependencies

```json
{
  "@solana/kit": "^2.0.0",                    // Modern Solana SDK
  "@solana/addresses": "workspace:*",         // Address utilities
  "@solana/rpc": "workspace:*",               // RPC client
  "@solana/signers": "workspace:*",           // Transaction signing
  "@solana-program/token": "^0.2.0",          // SPL tokens
  "@solana-program/token-2022": "^0.2.0"      // Token-2022 extensions
}
```

### Dev Dependencies

```json
{
  "tsup": "^8.0.0",                           // Build tool
  "@types/bun": "latest",                     // Bun types
  "typescript": "^5.7.0"                      // TypeScript
}
```

## Documentation Standards

### JSDoc for Public APIs

```typescript
/**
 * Registers a new agent on-chain.
 *
 * @param params - Agent registration parameters
 * @param params.name - Human-readable agent name
 * @param params.address - Unique agent address
 * @param params.metadata - Optional metadata URI
 *
 * @returns Transaction signature
 *
 * @throws {InsufficientBalanceError} If signer lacks SOL for transaction
 * @throws {AgentRegistrationError} If registration fails
 *
 * @example
 * ```typescript
 * const signature = await client.agents.register({
 *   name: 'My Agent',
 *   address: 'unique-id-123',
 * });
 * ```
 */
async register(params: RegisterAgentParams): Promise<string> {
  // Implementation
}
```

## Additional Resources

- Solana @solana/kit Docs: https://github.com/solana-labs/solana-web3.js/tree/v2
- Anchor Docs: https://anchor-lang.com/docs
- TSUp Docs: https://tsup.egoist.dev
- Bun Test Docs: https://bun.sh/docs/cli/test
