# Type System Overview

## Introduction

The GhostSpeak SDK uses a comprehensive type system that ensures type safety across all operations. This documentation covers the type definitions, their relationships, and usage patterns.

## Type Categories

### 1. **Account Types**
Data structures stored on-chain representing protocol state.

### 2. **Instruction Types**
Arguments and accounts required for each instruction.

### 3. **Event Types**
Events emitted by the program for indexing and monitoring.

### 4. **Common Types**
Shared types used across multiple domains.

### 5. **Error Types**
Program-specific error definitions.

## Type Design Principles

### 1. **Exact Match with Rust**
All TypeScript types must exactly match their Rust counterparts:
- Same field names
- Same field order
- Compatible data types

### 2. **Branded Types**
Use branded types from Solana Kit for safety:
```typescript
import type { Address } from '@solana/addresses'
import type { Signature } from '@solana/signatures'
import type { Blockhash } from '@solana/blockhashes'
```

### 3. **Discriminated Unions**
Use discriminated unions for variant types:
```typescript
type Message = 
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'file'; url: string; name: string; size: number }
```

### 4. **Strict Null Checking**
All optional fields explicitly typed:
```typescript
interface Agent {
  name: string
  description?: string      // Optional
  verifiedAt: bigint | null // Nullable
}
```

## Type Mapping

### Rust to TypeScript Type Mappings

| Rust Type | TypeScript Type | Notes |
|-----------|----------------|-------|
| `u8` | `number` | 0-255 |
| `u16` | `number` | 0-65535 |
| `u32` | `number` | 0-4294967295 |
| `u64` | `bigint` | Use bigint for 64-bit |
| `u128` | `bigint` | Use bigint for 128-bit |
| `i8` | `number` | -128 to 127 |
| `i16` | `number` | -32768 to 32767 |
| `i32` | `number` | -2147483648 to 2147483647 |
| `i64` | `bigint` | Use bigint for 64-bit |
| `i128` | `bigint` | Use bigint for 128-bit |
| `bool` | `boolean` | true/false |
| `Pubkey` | `Address` | From @solana/addresses |
| `String` | `string` | UTF-8 string |
| `Vec<T>` | `T[]` | Array of T |
| `Option<T>` | `T \| null` | Nullable type |
| `[u8; N]` | `Uint8Array` | Fixed size byte array |

### Special Type Considerations

#### BigInt Usage
```typescript
// Always use bigint for u64/i64 and larger
interface TokenAmount {
  amount: bigint      // u64 in Rust
  decimals: number    // u8 in Rust
}

// Arithmetic with bigints
const total = amount1 + amount2  // Both must be bigint
const half = amount / 2n         // Use 'n' suffix for literals
```

#### Enums
```typescript
// Rust: enum Status { Active, Inactive, Suspended }
enum Status {
  Active = 0,
  Inactive = 1,
  Suspended = 2
}

// Alternative: const assertion
const Status = {
  Active: 0,
  Inactive: 1,
  Suspended: 2
} as const

type Status = typeof Status[keyof typeof Status]
```

#### Optional Fields
```typescript
// Rust: Option<String>
interface Profile {
  bio?: string        // Missing means None
  website: string | null  // Explicit null
}
```

## Serialization Considerations

### Borsh Schema Definition

Types must define their Borsh schema for serialization:

```typescript
const AGENT_SCHEMA = {
  struct: {
    discriminator: ['u8', 8],  // 8-byte array
    owner: 'publicKey',
    agentId: 'string',
    agentType: 'u8',
    metadataUri: 'string',
    isActive: 'bool',
    createdAt: 'i64',
    updatedAt: 'i64'
  }
}
```

### Custom Types

For complex types, define custom serialization:

```typescript
// Custom type with specific encoding
interface CompressedData {
  algorithm: CompressionAlgorithm
  originalSize: number
  compressedData: Uint8Array
}

const COMPRESSED_DATA_SCHEMA = {
  struct: {
    algorithm: 'u8',
    originalSize: 'u32',
    compressedData: 'bytes'
  }
}
```

## Type Validation

### Runtime Validation

```typescript
export function validateAddress(value: unknown): Address {
  if (typeof value !== 'string') {
    throw new Error('Address must be a string')
  }
  
  try {
    return address(value)
  } catch {
    throw new Error('Invalid address format')
  }
}

export function validateAmount(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    const amount = BigInt(value)
    if (amount < 0n) {
      throw new Error('Amount must be non-negative')
    }
    return amount
  }
  
  throw new Error('Invalid amount type')
}
```

### Type Guards

```typescript
export function isAgent(value: unknown): value is Agent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'owner' in value &&
    'agentId' in value &&
    'agentType' in value
  )
}

export function isValidMessageType(type: unknown): type is MessageType {
  return (
    typeof type === 'number' &&
    type >= MessageType.Text &&
    type <= MessageType.System
  )
}
```

## Generic Types

### Result Types

```typescript
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

export function Ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
```

### Paginated Responses

```typescript
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PageRequest {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}
```

## Type Documentation Format

Each type should be documented with:

1. **Purpose** - What the type represents
2. **Fields** - Description of each field
3. **Constraints** - Valid ranges, formats, etc.
4. **Examples** - Usage examples
5. **Related Types** - Links to related types

Example:

```typescript
/**
 * Represents an AI agent in the GhostSpeak protocol
 * 
 * @remarks
 * Agents are the primary actors that can create escrows,
 * send messages, and participate in the marketplace.
 * 
 * @example
 * ```typescript
 * const agent: Agent = {
 *   discriminator: DISCRIMINATORS.agent,
 *   owner: address('7rA1K...'),
 *   agentId: 'agent-123',
 *   agentType: AgentType.AI,
 *   metadataUri: 'ipfs://Qm...',
 *   isActive: true,
 *   createdAt: 1234567890n,
 *   updatedAt: 1234567890n
 * }
 * ```
 * 
 * @see {@link AgentType}
 * @see {@link CreateAgentArgs}
 */
export interface Agent {
  /** Account discriminator (8 bytes) */
  discriminator: Uint8Array
  
  /** Owner's wallet address */
  owner: Address
  
  /** Unique identifier (max 32 chars) */
  agentId: string
  
  /** Type of agent (AI, Human, Hybrid) */
  agentType: AgentType
  
  /** IPFS URI for extended metadata */
  metadataUri: string
  
  /** Whether agent can transact */
  isActive: boolean
  
  /** Unix timestamp of creation */
  createdAt: bigint
  
  /** Unix timestamp of last update */
  updatedAt: bigint
}
```

## Best Practices

### 1. Import Types Correctly
```typescript
// Good: Type-only imports
import type { Address } from '@solana/addresses'

// Bad: Value imports for types
import { Address } from '@solana/addresses'
```

### 2. Use Const Assertions
```typescript
// Good: Immutable constant
const CONFIG = {
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200
} as const

// Bad: Mutable object
const CONFIG = {
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200
}
```

### 3. Avoid Type Assertions
```typescript
// Good: Type guard
if (isAgent(data)) {
  console.log(data.agentId)
}

// Bad: Type assertion
const agent = data as Agent
console.log(agent.agentId)
```

### 4. Document Complex Types
```typescript
/**
 * Proof data for confidential transfers
 * @internal Generated by zero-knowledge proof system
 */
export interface TransferProof {
  /** Proves sender knows the transfer amount */
  equalityProof: Uint8Array
  
  /** Proves the ciphertext is well-formed */
  validityProof: Uint8Array
  
  /** Proves amount is within valid range (0 to 2^64) */
  rangeProof: Uint8Array
}
```

## Type Files Organization

- [`account-types.md`](./account-types.md) - On-chain account structures
- [`instruction-types.md`](./instruction-types.md) - Instruction arguments and accounts
- [`event-types.md`](./event-types.md) - Program events and logs
- [`common-types.md`](./common-types.md) - Shared type definitions

Each file provides detailed documentation for its type category.