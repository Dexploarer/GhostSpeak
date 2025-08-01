# Borsh Serialization Implementation

## Overview

Borsh (Binary Object Representation Serializer for Hashing) is the serialization format used by Solana programs. This guide covers implementing Borsh serialization for the GhostSpeak SDK.

## Core Concepts

### What is Borsh?

Borsh is a binary serialization format that:
- Is deterministic (same data always produces same bytes)
- Has a compact representation
- Supports fixed and variable-length data
- Is language-agnostic

### Why Borsh?

1. **Efficiency** - Minimal overhead compared to JSON
2. **Determinism** - Critical for blockchain consensus
3. **Type Safety** - Schema-based serialization
4. **Performance** - Fast encoding/decoding

## Implementation

### Basic Setup

```typescript
import { serialize, deserialize, Schema } from '@coral-xyz/borsh'

// For custom implementations
export class BorshEncoder {
  private buffer: Buffer
  private offset: number
  
  constructor(size: number = 1024) {
    this.buffer = Buffer.alloc(size)
    this.offset = 0
  }
  
  // Encoding methods...
}

export class BorshDecoder {
  private buffer: Buffer
  private offset: number
  
  constructor(data: Uint8Array) {
    this.buffer = Buffer.from(data)
    this.offset = 0
  }
  
  // Decoding methods...
}
```

### Type Encoders

#### Primitive Types

```typescript
export class BorshEncoder {
  // Unsigned integers
  writeU8(value: number): void {
    this.ensureCapacity(1)
    this.buffer.writeUInt8(value, this.offset)
    this.offset += 1
  }
  
  writeU16(value: number): void {
    this.ensureCapacity(2)
    this.buffer.writeUInt16LE(value, this.offset)
    this.offset += 2
  }
  
  writeU32(value: number): void {
    this.ensureCapacity(4)
    this.buffer.writeUInt32LE(value, this.offset)
    this.offset += 4
  }
  
  writeU64(value: bigint): void {
    this.ensureCapacity(8)
    this.buffer.writeBigUInt64LE(value, this.offset)
    this.offset += 8
  }
  
  // Signed integers
  writeI8(value: number): void {
    this.ensureCapacity(1)
    this.buffer.writeInt8(value, this.offset)
    this.offset += 1
  }
  
  writeI64(value: bigint): void {
    this.ensureCapacity(8)
    this.buffer.writeBigInt64LE(value, this.offset)
    this.offset += 8
  }
  
  // Boolean
  writeBool(value: boolean): void {
    this.writeU8(value ? 1 : 0)
  }
  
  // Public key (32 bytes)
  writePublicKey(value: Address): void {
    const bytes = bs58.decode(value.toString())
    this.writeFixedArray(bytes)
  }
}
```

#### Variable Length Types

```typescript
export class BorshEncoder {
  // String (length-prefixed)
  writeString(value: string): void {
    const bytes = Buffer.from(value, 'utf8')
    this.writeU32(bytes.length)
    this.writeFixedArray(bytes)
  }
  
  // Dynamic array
  writeArray<T>(
    array: T[],
    encoder: (item: T) => void
  ): void {
    this.writeU32(array.length)
    for (const item of array) {
      encoder.call(this, item)
    }
  }
  
  // Option type
  writeOption<T>(
    value: T | null,
    encoder: (item: T) => void
  ): void {
    if (value === null) {
      this.writeU8(0)
    } else {
      this.writeU8(1)
      encoder.call(this, value)
    }
  }
  
  // Fixed array
  writeFixedArray(bytes: Uint8Array): void {
    this.ensureCapacity(bytes.length)
    bytes.forEach((byte, i) => {
      this.buffer[this.offset + i] = byte
    })
    this.offset += bytes.length
  }
}
```

### Type Decoders

```typescript
export class BorshDecoder {
  // Unsigned integers
  readU8(): number {
    const value = this.buffer.readUInt8(this.offset)
    this.offset += 1
    return value
  }
  
  readU32(): number {
    const value = this.buffer.readUInt32LE(this.offset)
    this.offset += 4
    return value
  }
  
  readU64(): bigint {
    const value = this.buffer.readBigUInt64LE(this.offset)
    this.offset += 8
    return value
  }
  
  // Boolean
  readBool(): boolean {
    return this.readU8() !== 0
  }
  
  // Public key
  readPublicKey(): Address {
    const bytes = this.readFixedArray(32)
    return address(bs58.encode(bytes))
  }
  
  // String
  readString(): string {
    const length = this.readU32()
    const bytes = this.readFixedArray(length)
    return Buffer.from(bytes).toString('utf8')
  }
  
  // Dynamic array
  readArray<T>(decoder: () => T): T[] {
    const length = this.readU32()
    const result: T[] = []
    for (let i = 0; i < length; i++) {
      result.push(decoder.call(this))
    }
    return result
  }
  
  // Option type
  readOption<T>(decoder: () => T): T | null {
    const hasValue = this.readU8()
    return hasValue ? decoder.call(this) : null
  }
  
  // Fixed array
  readFixedArray(length: number): Uint8Array {
    const bytes = this.buffer.slice(
      this.offset,
      this.offset + length
    )
    this.offset += length
    return new Uint8Array(bytes)
  }
}
```

## Schema Definitions

### Basic Schema Format

```typescript
// Simple struct
const AGENT_SCHEMA: Schema = {
  struct: {
    owner: 'publicKey',
    agentId: 'string',
    agentType: 'u8',
    metadataUri: 'string',
    isActive: 'bool',
    createdAt: 'i64',
    updatedAt: 'i64'
  }
}

// With arrays
const USER_REGISTRY_SCHEMA: Schema = {
  struct: {
    owner: 'publicKey',
    agents: ['publicKey'],  // Array of public keys
    maxAgents: 'u8',
    createdAt: 'i64'
  }
}

// With options
const ESCROW_SCHEMA: Schema = {
  struct: {
    payer: 'publicKey',
    recipient: 'publicKey',
    amount: 'u64',
    workOrder: { option: 'publicKey' },  // Optional
    completedAt: { option: 'i64' }       // Optional
  }
}
```

### Custom Type Schema

```typescript
// Enum types
const MESSAGE_TYPE_SCHEMA: Schema = {
  enum: [
    { struct: { Text: {} } },
    { struct: { Image: { struct: { uri: 'string' } } } },
    { struct: { File: { struct: { uri: 'string', size: 'u32' } } } }
  ]
}

// Nested structs
const CHANNEL_SCHEMA: Schema = {
  struct: {
    channelId: 'string',
    channelType: 'u8',
    settings: {
      struct: {
        slowMode: 'u32',
        adminOnly: 'bool',
        requireApproval: 'bool'
      }
    },
    members: ['publicKey']
  }
}

// Fixed-size arrays
const DISCRIMINATOR_SCHEMA: Schema = {
  struct: {
    discriminator: ['u8', 8]  // 8-byte array
  }
}
```

## Instruction Serialization

### Complete Example

```typescript
export function serializeRegisterAgentInstruction(
  args: RegisterAgentArgs
): Uint8Array {
  // Define schema
  const schema: Schema = {
    struct: {
      discriminator: ['u8', 8],
      agentType: 'u8',
      metadataUri: 'string',
      agentId: 'string'
    }
  }
  
  // Prepare data with discriminator
  const data = {
    discriminator: DISCRIMINATORS.registerAgent,
    ...args
  }
  
  // Serialize
  return serialize(schema, data)
}

// Manual implementation for more control
export function serializeRegisterAgentManual(
  args: RegisterAgentArgs
): Uint8Array {
  const encoder = new BorshEncoder()
  
  // Write discriminator
  encoder.writeFixedArray(DISCRIMINATORS.registerAgent)
  
  // Write args
  encoder.writeU8(args.agentType)
  encoder.writeString(args.metadataUri)
  encoder.writeString(args.agentId)
  
  return encoder.toBuffer()
}
```

## Account Deserialization

### Complete Example

```typescript
export function deserializeAgent(data: Uint8Array): Agent {
  const schema: Schema = {
    struct: {
      discriminator: ['u8', 8],
      owner: 'publicKey',
      agentId: 'string',
      agentType: 'u8',
      metadataUri: 'string',
      isActive: 'bool',
      createdAt: 'i64',
      updatedAt: 'i64',
      reputation: 'u16',
      transactionCount: 'u32',
      totalVolume: 'u64',
      stakedAmount: { option: 'u64' },
      verificationStatus: 'u8',
      customData: 'string'
    }
  }
  
  const decoded = deserialize(schema, data)
  
  // Validate discriminator
  if (!decoded.discriminator.equals(DISCRIMINATORS.agent)) {
    throw new Error('Invalid agent account discriminator')
  }
  
  return decoded as Agent
}

// Manual implementation
export function deserializeAgentManual(data: Uint8Array): Agent {
  const decoder = new BorshDecoder(data)
  
  // Read and validate discriminator
  const discriminator = decoder.readFixedArray(8)
  if (!discriminator.equals(DISCRIMINATORS.agent)) {
    throw new Error('Invalid agent account discriminator')
  }
  
  return {
    discriminator,
    owner: decoder.readPublicKey(),
    agentId: decoder.readString(),
    agentType: decoder.readU8(),
    metadataUri: decoder.readString(),
    isActive: decoder.readBool(),
    createdAt: decoder.readI64(),
    updatedAt: decoder.readI64(),
    reputation: decoder.readU16(),
    transactionCount: decoder.readU32(),
    totalVolume: decoder.readU64(),
    stakedAmount: decoder.readOption(() => decoder.readU64()),
    verificationStatus: decoder.readU8(),
    customData: decoder.readString()
  }
}
```

## Advanced Patterns

### Generic Codec

```typescript
export class BorshCodec<T> {
  constructor(
    private schema: Schema,
    private discriminator?: Uint8Array
  ) {}
  
  encode(data: T): Uint8Array {
    if (this.discriminator) {
      return serialize(this.schema, {
        discriminator: this.discriminator,
        ...data
      })
    }
    return serialize(this.schema, data)
  }
  
  decode(data: Uint8Array): T {
    const decoded = deserialize(this.schema, data)
    
    if (this.discriminator) {
      const disc = decoded.discriminator as Uint8Array
      if (!disc.equals(this.discriminator)) {
        throw new Error('Invalid discriminator')
      }
    }
    
    return decoded as T
  }
}

// Usage
const agentCodec = new BorshCodec<Agent>(
  AGENT_SCHEMA,
  DISCRIMINATORS.agent
)

const encoded = agentCodec.encode(agentData)
const decoded = agentCodec.decode(accountData)
```

### Schema Validation

```typescript
export class SchemaValidator {
  static validateSchema(schema: Schema): void {
    // Validate schema structure
    this.validateNode(schema)
  }
  
  private static validateNode(node: any): void {
    if (typeof node === 'string') {
      // Primitive type
      const validTypes = [
        'bool', 'u8', 'u16', 'u32', 'u64', 'u128',
        'i8', 'i16', 'i32', 'i64', 'i128',
        'f32', 'f64', 'string', 'publicKey', 'bytes'
      ]
      if (!validTypes.includes(node)) {
        throw new Error(`Invalid type: ${node}`)
      }
    } else if (Array.isArray(node)) {
      // Array type
      if (node.length === 1) {
        // Dynamic array
        this.validateNode(node[0])
      } else if (node.length === 2 && node[0] === 'u8') {
        // Fixed array
        if (typeof node[1] !== 'number') {
          throw new Error('Fixed array size must be number')
        }
      }
    } else if (typeof node === 'object') {
      // Complex type
      if ('struct' in node) {
        // Struct
        for (const value of Object.values(node.struct)) {
          this.validateNode(value)
        }
      } else if ('option' in node) {
        // Option
        this.validateNode(node.option)
      } else if ('enum' in node) {
        // Enum
        for (const variant of node.enum) {
          this.validateNode(variant)
        }
      }
    }
  }
}
```

## Performance Optimization

### Buffer Pooling

```typescript
export class BufferPool {
  private pools: Map<number, Buffer[]> = new Map()
  
  acquire(size: number): Buffer {
    const roundedSize = Math.pow(2, Math.ceil(Math.log2(size)))
    const pool = this.pools.get(roundedSize) || []
    
    if (pool.length > 0) {
      return pool.pop()!
    }
    
    return Buffer.alloc(roundedSize)
  }
  
  release(buffer: Buffer): void {
    const size = buffer.length
    if (!this.pools.has(size)) {
      this.pools.set(size, [])
    }
    
    buffer.fill(0) // Clear buffer
    this.pools.get(size)!.push(buffer)
  }
}

// Usage
const pool = new BufferPool()
const buffer = pool.acquire(1024)
// Use buffer...
pool.release(buffer)
```

### Lazy Decoding

```typescript
export class LazyDecoder {
  private cache: Map<string, any> = new Map()
  
  constructor(
    private data: Uint8Array,
    private schema: Schema
  ) {}
  
  get<K extends keyof T>(key: K): T[K] {
    if (this.cache.has(key as string)) {
      return this.cache.get(key as string)
    }
    
    // Decode only requested field
    const value = this.decodeField(key as string)
    this.cache.set(key as string, value)
    return value
  }
  
  private decodeField(field: string): any {
    // Implementation depends on schema structure
    // This is simplified example
    const offset = this.getFieldOffset(field)
    const decoder = new BorshDecoder(
      this.data.slice(offset)
    )
    
    // Decode based on field type from schema
    // ...
  }
}
```

## Error Handling

```typescript
export class BorshError extends Error {
  constructor(
    message: string,
    public code: BorshErrorCode,
    public context?: any
  ) {
    super(message)
    this.name = 'BorshError'
  }
}

export enum BorshErrorCode {
  InvalidSchema = 'INVALID_SCHEMA',
  EncodingFailed = 'ENCODING_FAILED',
  DecodingFailed = 'DECODING_FAILED',
  BufferOverflow = 'BUFFER_OVERFLOW',
  InvalidDiscriminator = 'INVALID_DISCRIMINATOR',
  UnexpectedEOF = 'UNEXPECTED_EOF'
}

// Usage in encoder/decoder
export class SafeBorshEncoder extends BorshEncoder {
  writeString(value: string): void {
    try {
      const bytes = Buffer.from(value, 'utf8')
      if (bytes.length > 65535) {
        throw new BorshError(
          'String too long',
          BorshErrorCode.EncodingFailed,
          { value, length: bytes.length }
        )
      }
      super.writeString(value)
    } catch (error) {
      if (error instanceof BorshError) throw error
      throw new BorshError(
        'Failed to encode string',
        BorshErrorCode.EncodingFailed,
        { value, error }
      )
    }
  }
}
```

## Testing

```typescript
describe('Borsh Serialization', () => {
  it('should serialize and deserialize agent', () => {
    const agent: Agent = {
      discriminator: DISCRIMINATORS.agent,
      owner: address('11111111111111111111111111111111'),
      agentId: 'test-agent',
      agentType: 0,
      metadataUri: 'ipfs://test',
      isActive: true,
      createdAt: 1234567890n,
      updatedAt: 1234567890n,
      reputation: 5000,
      transactionCount: 10,
      totalVolume: 1000000000n,
      stakedAmount: null,
      verificationStatus: 0,
      customData: '{}'
    }
    
    const encoded = serializeAgent(agent)
    const decoded = deserializeAgent(encoded)
    
    expect(decoded).toEqual(agent)
  })
  
  it('should handle edge cases', () => {
    // Empty string
    const encoder = new BorshEncoder()
    encoder.writeString('')
    expect(encoder.toBuffer()).toEqual(
      Buffer.from([0, 0, 0, 0])
    )
    
    // Max values
    encoder.writeU64(BigInt('18446744073709551615'))
    encoder.writeU32(4294967295)
    
    // Null option
    encoder.writeOption(null, encoder.writeString)
  })
})
```