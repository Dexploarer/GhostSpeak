# Instruction Implementation Guide

## Overview

This guide covers the implementation of instruction builders for the GhostSpeak SDK. Each instruction builder creates a properly formatted instruction object that can be included in a Solana transaction.

## Instruction Structure

Every Solana instruction consists of three parts:

1. **Program ID** - The address of the on-chain program
2. **Accounts** - List of accounts the instruction will read/write
3. **Data** - Serialized instruction arguments

## Implementation Pattern

### Basic Structure

```typescript
import type { IInstruction } from '@solana/kit'
import type { Address } from '@solana/addresses'

export function createInstructionNameInstruction(
  accounts: InstructionNameAccounts,
  args: InstructionNameArgs
): IInstruction {
  // 1. Validate inputs
  validateAccounts(accounts)
  validateArgs(args)
  
  // 2. Encode arguments
  const encodedArgs = encodeArgs(args)
  
  // 3. Get discriminator
  const discriminator = DISCRIMINATORS.instructionName
  
  // 4. Combine discriminator + data
  const data = Buffer.concat([discriminator, encodedArgs])
  
  // 5. Build accounts array
  const accountMetas = buildAccountMetas(accounts)
  
  // 6. Return instruction
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data
  }
}
```

## Key Components

### 1. Discriminators

Each instruction has an 8-byte discriminator that identifies it:

```typescript
// Discriminator = first 8 bytes of SHA256("global:instruction_name")
const DISCRIMINATORS = {
  registerAgent: new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]),
  createEscrow: new Uint8Array([12, 34, 56, 78, 90, 123, 145, 167]),
  // ...
}
```

### 2. Account Roles

Accounts have specific roles that determine their permissions:

```typescript
type AccountRole = 
  | 'readonly'           // Can read, cannot write, not a signer
  | 'writable'          // Can read and write, not a signer
  | 'readonlySigner'    // Can read, cannot write, must sign
  | 'writableSigner'    // Can read and write, must sign
```

### 3. Argument Encoding

Arguments are encoded using Borsh serialization:

```typescript
import { serialize } from '@coral-xyz/borsh'

const schema = {
  struct: {
    amount: 'u64',
    message: 'string',
    isActive: 'bool'
  }
}

const encoded = serialize(schema, args)
```

## Common Patterns

### Optional Accounts

Some instructions have optional accounts:

```typescript
const accountMetas = [
  { address: accounts.required, role: 'writable' },
  // Only include optional account if provided
  ...(accounts.optional ? [{ address: accounts.optional, role: 'readonly' }] : [])
]
```

### PDA Derivation

Many accounts are Program Derived Addresses (PDAs):

```typescript
import { getProgramDerivedAddress } from '@solana/addresses'

const [agentPda] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('agent'),
    Buffer.from(agentId),
    owner.toBuffer()
  ]
})
```

### System Programs

Common system programs used as accounts:

```typescript
const SYSTEM_PROGRAM = address('11111111111111111111111111111111')
const TOKEN_PROGRAM = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
```

## Validation

### Account Validation

```typescript
function validateAccounts(accounts: InstructionAccounts): void {
  if (!accounts.signer) {
    throw new Error('Signer account is required')
  }
  
  if (!isValidAddress(accounts.targetAccount)) {
    throw new Error('Invalid target account address')
  }
}
```

### Argument Validation

```typescript
function validateArgs(args: InstructionArgs): void {
  if (args.amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  
  if (args.message.length > 200) {
    throw new Error('Message too long (max 200 characters)')
  }
}
```

## Error Handling

### Clear Error Messages

```typescript
try {
  return createInstruction(accounts, args)
} catch (error) {
  throw new Error(
    `Failed to create ${instructionName} instruction: ${error.message}`
  )
}
```

### Validation Errors

```typescript
if (!accounts.mint) {
  throw new ValidationError(
    'MISSING_MINT_ACCOUNT',
    'Mint account is required for token operations'
  )
}
```

## Testing Instructions

### Unit Tests

```typescript
describe('createRegisterAgentInstruction', () => {
  it('should create valid instruction', () => {
    const instruction = createRegisterAgentInstruction(accounts, args)
    
    expect(instruction.programAddress).toBe(GHOSTSPEAK_PROGRAM_ID)
    expect(instruction.data.slice(0, 8)).toEqual(DISCRIMINATORS.registerAgent)
    expect(instruction.accounts).toHaveLength(4)
  })
  
  it('should include optional clock account when provided', () => {
    const instruction = createRegisterAgentInstruction(
      { ...accounts, clock: clockAddress },
      args
    )
    
    expect(instruction.accounts).toHaveLength(5)
  })
})
```

### Integration Tests

```typescript
it('should execute on devnet', async () => {
  const instruction = createRegisterAgentInstruction(accounts, args)
  const transaction = await buildTransaction([instruction])
  const signature = await sendTransaction(transaction)
  
  expect(signature).toBeDefined()
})
```

## Best Practices

### 1. Type Safety
- Define explicit types for accounts and arguments
- Use branded types (Address, TransactionSigner)
- Avoid `any` types

### 2. Consistency
- Follow the same pattern for all instructions
- Use consistent naming conventions
- Maintain the same validation approach

### 3. Documentation
- Document each instruction's purpose
- Include examples in comments
- Explain any non-obvious logic

### 4. Performance
- Pre-calculate discriminators
- Reuse schemas where possible
- Minimize allocations

## Instruction Categories

Instructions are organized by functional area:

### Agent Instructions
- Core agent management functionality
- Registration, updates, activation

### Escrow Instructions
- Payment escrow operations
- Dispute handling

### Channel Instructions
- Communication channels
- Message passing

### Token Instructions
- Token-2022 operations
- SPL token handling

### Governance Instructions
- Voting and proposals
- Protocol governance

See individual instruction documentation for detailed implementation:
- [Agent Instructions](./agent-instructions.md)
- [Escrow Instructions](./escrow-instructions.md)
- [Channel Instructions](./channel-instructions.md)
- [Token-2022 Instructions](./token2022-instructions.md)