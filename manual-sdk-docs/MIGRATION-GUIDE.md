# Migration Guide: Codama to Manual SDK

## Overview

This guide provides a step-by-step process for migrating from the Codama-generated SDK to a manually-implemented SDK. The migration is designed to be incremental, allowing you to migrate one component at a time while maintaining functionality.

## Pre-Migration Checklist

- [ ] Current SDK builds without errors
- [ ] All tests are passing
- [ ] Git repository is clean (no uncommitted changes)
- [ ] Created a new branch for migration
- [ ] Backed up current generated code
- [ ] Reviewed this entire guide

## Migration Phases

### Phase 1: Setup and Preparation

#### Step 1: Create New Branch
```bash
git checkout -b manual-sdk-implementation
git push -u origin manual-sdk-implementation
```

#### Step 2: Archive Generated Code
```bash
# Move generated code for reference
mv packages/sdk-typescript/src/generated packages/sdk-typescript/src/generated.old

# Create new directory structure
mkdir -p packages/sdk-typescript/src/{instructions,accounts,types,codecs,errors,constants}
```

#### Step 3: Update Dependencies
```json
// Remove from package.json:
{
  "devDependencies": {
    // Remove these:
    "@codama/cli": "^1.2.1",
    "@codama/nodes": "^1.3.1",
    "@codama/nodes-from-anchor": "^1.2.3",
    "@codama/renderers-js": "^1.3.2",
    "@codama/visitors": "^1.3.1"
  }
}

// Keep these for Borsh serialization:
{
  "dependencies": {
    "@coral-xyz/borsh": "^0.28.0",
    "bs58": "^6.0.0"
  }
}
```

### Phase 2: Core Infrastructure

#### Step 1: Create Constants
```typescript
// src/constants/program.ts
import { address } from '@solana/addresses'

export const GHOSTSPEAK_PROGRAM_ID = address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG')

// System programs
export const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111')
export const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const TOKEN_2022_PROGRAM_ID = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
```

#### Step 2: Create Base Types
```typescript
// src/types/common.ts
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

export type AccountDiscriminator = Uint8Array

export interface AccountMeta {
  address: Address
  role: 'readonly' | 'writable' | 'readonlySigner' | 'writableSigner'
}

export enum AgentType {
  AI = 0,
  Human = 1,
  Hybrid = 2
}
```

#### Step 3: Setup Borsh Utilities
```typescript
// src/codecs/borsh/encoder.ts
import { serialize } from '@coral-xyz/borsh'

export function encodeData<T>(data: T, schema: any): Uint8Array {
  return serialize(schema, data)
}

// src/codecs/borsh/decoder.ts
import { deserialize } from '@coral-xyz/borsh'

export function decodeData<T>(data: Uint8Array, schema: any): T {
  return deserialize(schema, data) as T
}
```

### Phase 3: Implement First Instruction

#### Step 1: Define Types
```typescript
// src/types/instructions.ts
export interface RegisterAgentArgs {
  agentType: number
  metadataUri: string
  agentId: string
}

export interface RegisterAgentAccounts {
  agentAccount: Address
  userRegistry: Address
  signer: TransactionSigner
  systemProgram?: Address
  clock?: Address
}
```

#### Step 2: Create Discriminator
```typescript
// src/constants/discriminators.ts
import { createHash } from 'crypto'

export function getDiscriminator(name: string): Uint8Array {
  const hash = createHash('sha256')
    .update(`global:${name}`)
    .digest()
  return hash.slice(0, 8)
}

// Pre-calculated discriminators
export const DISCRIMINATORS = {
  registerAgent: new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30])
}
```

#### Step 3: Build Instruction
```typescript
// src/instructions/agent/register-agent.ts
import type { IInstruction } from '@solana/kit'
import { GHOSTSPEAK_PROGRAM_ID, SYSTEM_PROGRAM_ID } from '../../constants/program'
import { DISCRIMINATORS } from '../../constants/discriminators'
import { encodeData } from '../../codecs/borsh/encoder'
import type { RegisterAgentArgs, RegisterAgentAccounts } from '../../types/instructions'

const SCHEMA = {
  struct: {
    agentType: 'u8',
    metadataUri: 'string',
    agentId: 'string'
  }
}

export function createRegisterAgentInstruction(
  accounts: RegisterAgentAccounts,
  args: RegisterAgentArgs
): IInstruction {
  // Encode arguments
  const data = encodeData(args, SCHEMA)
  
  // Combine discriminator and data
  const instructionData = Buffer.concat([
    DISCRIMINATORS.registerAgent,
    data
  ])
  
  // Build accounts array
  const accountMetas = [
    { address: accounts.agentAccount, role: 'writable' as const },
    { address: accounts.userRegistry, role: 'writable' as const },
    { address: accounts.signer.address, role: 'writableSigner' as const },
    { address: accounts.systemProgram ?? SYSTEM_PROGRAM_ID, role: 'readonly' as const }
  ]
  
  if (accounts.clock) {
    accountMetas.push({ address: accounts.clock, role: 'readonly' as const })
  }
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data: instructionData
  }
}
```

### Phase 4: Update Module

#### Before (Using Generated Code):
```typescript
import { getRegisterAgentInstructionAsync } from '../../generated/index.js'

const instruction = await getRegisterAgentInstructionAsync({
  agentAccount,
  userRegistry,
  signer,
  // ...
})
```

#### After (Using Manual Implementation):
```typescript
import { createRegisterAgentInstruction } from '../../instructions/agent/register-agent.js'

const instruction = createRegisterAgentInstruction({
  agentAccount,
  userRegistry,
  signer,
  // ...
}, {
  agentType,
  metadataUri,
  agentId
})
```

### Phase 5: Implement Account Decoders

#### Step 1: Define Account Type
```typescript
// src/types/accounts.ts
export interface Agent {
  discriminator: Uint8Array
  owner: Address
  agentId: string
  agentType: number
  metadataUri: string
  isActive: boolean
  createdAt: bigint
  updatedAt: bigint
  // ... other fields
}
```

#### Step 2: Create Decoder
```typescript
// src/accounts/agent.ts
import { decodeData } from '../codecs/borsh/decoder'
import type { Agent } from '../types/accounts'
import { DISCRIMINATORS } from '../constants/discriminators'

const AGENT_SCHEMA = {
  struct: {
    discriminator: ['u8', 8],
    owner: 'publicKey',
    agentId: 'string',
    agentType: 'u8',
    metadataUri: 'string',
    isActive: 'bool',
    createdAt: 'i64',
    updatedAt: 'i64',
    // ... other fields
  }
}

export function decodeAgent(data: Uint8Array): Agent {
  // Verify discriminator
  const discriminator = data.slice(0, 8)
  if (!discriminator.equals(DISCRIMINATORS.agent)) {
    throw new Error('Invalid agent account discriminator')
  }
  
  return decodeData<Agent>(data, AGENT_SCHEMA)
}
```

### Phase 6: Testing Migration

#### Step 1: Create Comparison Tests
```typescript
// tests/migration/register-agent.test.ts
import { createRegisterAgentInstruction } from '../../src/instructions/agent/register-agent'
import { getRegisterAgentInstructionAsync } from '../../src/generated.old'

test('manual implementation matches generated', async () => {
  const accounts = { /* ... */ }
  const args = { /* ... */ }
  
  // Get both instructions
  const manual = createRegisterAgentInstruction(accounts, args)
  const generated = await getRegisterAgentInstructionAsync({ ...accounts, ...args })
  
  // Compare
  expect(manual.programAddress).toEqual(generated.programAddress)
  expect(manual.data).toEqual(generated.data)
  expect(manual.accounts).toEqual(generated.accounts)
})
```

#### Step 2: Integration Tests
```typescript
test('register agent on devnet', async () => {
  const instruction = createRegisterAgentInstruction(accounts, args)
  const signature = await sendTransaction([instruction])
  
  // Verify on-chain
  const agent = await getAccount(agentAddress, decodeAgent)
  expect(agent.agentId).toBe(args.agentId)
})
```

## Migration Checklist by Component

### Instructions (Priority Order)

#### Agent Management
- [ ] registerAgent
- [ ] registerAgentCompressed
- [ ] updateAgent
- [ ] activateAgent
- [ ] deactivateAgent
- [ ] verifyAgent

#### Escrow Operations
- [ ] createEscrow
- [ ] completeEscrow
- [ ] cancelEscrow
- [ ] disputeEscrow
- [ ] processEscrowPayment
- [ ] processPartialRefund

#### Channel Communication
- [ ] createChannel
- [ ] joinChannel
- [ ] leaveChannel
- [ ] sendMessage
- [ ] addMessageReaction

### Account Types
- [ ] Agent
- [ ] UserRegistry
- [ ] Escrow
- [ ] Channel
- [ ] Message
- [ ] ServiceListing
- [ ] WorkOrder

### Error Handling
- [ ] Program error codes
- [ ] Error messages
- [ ] Error context

## Common Migration Issues

### Issue 1: Discriminator Mismatch
**Problem**: Instruction fails with "Invalid instruction discriminator"
**Solution**: Ensure discriminator calculation matches Anchor's method

### Issue 2: Serialization Differences
**Problem**: Data doesn't match expected format
**Solution**: Check schema matches Rust struct exactly, including field order

### Issue 3: Account Order
**Problem**: "Account not found" errors
**Solution**: Verify account order matches IDL exactly

### Issue 4: Optional Accounts
**Problem**: Transaction fails when optional account is null
**Solution**: Only include optional accounts when provided

## Verification Steps

1. **Unit Tests**: Each instruction should have comparison tests
2. **Integration Tests**: Test against local validator
3. **Devnet Testing**: Deploy and test on devnet
4. **Bundle Size**: Check that bundle size is reduced
5. **Performance**: Benchmark serialization performance

## Rollback Plan

If issues arise:
1. Keep the `generated.old` directory
2. Revert imports back to generated code
3. Remove manual implementations
4. Re-run Codama if needed

## Post-Migration Cleanup

Once all components are migrated and tested:
1. Remove `generated.old` directory
2. Remove Codama configuration files
3. Update documentation
4. Update CI/CD pipelines
5. Tag release as "v2.0.0-manual"

## Support Resources

- [Borsh Specification](https://borsh.io/)
- [Solana Kit Documentation](https://github.com/anza-xyz/kit)
- [Anchor Discriminator Calculation](https://github.com/coral-xyz/anchor/blob/master/lang/syn/src/parser/context.rs)
- [Example Manual SDK](https://github.com/metaplex-foundation/js)