# GhostSpeak Manual SDK Architecture

## Overview

This document describes the architecture of the manually-implemented GhostSpeak SDK, designed to replace the Codama-generated code while maintaining full compatibility with the Solana blockchain and the existing Rust program.

## Design Principles

### 1. Modularity
- Clear separation of concerns
- Each module handles a specific domain
- Minimal interdependencies

### 2. Type Safety
- Comprehensive TypeScript types
- Runtime validation where needed
- No `any` types

### 3. Performance
- Tree-shakeable exports
- Minimal dependencies
- Efficient serialization

### 4. Developer Experience
- Clear error messages
- Intuitive API
- Comprehensive documentation

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (User's Application Code)                   │
├─────────────────────────────────────────────────────────┤
│                     Module Layer                         │
│        (AgentModule, EscrowModule, etc.)               │
├─────────────────────────────────────────────────────────┤
│                 Instruction Layer                        │
│          (Instruction Builders & Types)                  │
├─────────────────────────────────────────────────────────┤
│                    Codec Layer                          │
│           (Borsh Serialization/Deserialization)         │
├─────────────────────────────────────────────────────────┤
│                  Transport Layer                         │
│              (RPC Client & Solana Kit)                  │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── index.ts                 # Main exports
├── constants/              # Program constants
│   ├── program.ts          # Program ID and addresses
│   ├── discriminators.ts   # Instruction discriminators
│   └── seeds.ts            # PDA seeds
│
├── types/                  # TypeScript type definitions
│   ├── common.ts           # Shared types
│   ├── accounts.ts         # Account structures
│   ├── instructions.ts     # Instruction arguments
│   ├── events.ts           # Event types
│   └── errors.ts           # Error types
│
├── codecs/                 # Serialization layer
│   ├── borsh/              # Borsh implementation
│   │   ├── schema.ts       # Schema definitions
│   │   ├── encoder.ts      # Encoding utilities
│   │   └── decoder.ts      # Decoding utilities
│   ├── instruction.ts      # Instruction codec
│   └── account.ts          # Account codec
│
├── instructions/           # Instruction builders
│   ├── base.ts             # Base instruction builder
│   ├── agent/              # Agent instructions
│   ├── escrow/             # Escrow instructions
│   ├── channel/            # Channel instructions
│   ├── marketplace/        # Marketplace instructions
│   └── token2022/          # Token-2022 instructions
│
├── accounts/               # Account decoders
│   ├── base.ts             # Base account decoder
│   ├── agent.ts            # Agent account
│   ├── escrow.ts           # Escrow account
│   ├── channel.ts          # Channel account
│   └── ...                 # Other accounts
│
├── errors/                 # Error handling
│   ├── base.ts             # Base error class
│   ├── program-errors.ts   # Program error codes
│   └── sdk-errors.ts       # SDK-specific errors
│
├── utils/                  # Utility functions
│   ├── discriminator.ts    # Discriminator calculation
│   ├── pda.ts              # PDA derivation
│   ├── validation.ts       # Input validation
│   └── buffer.ts           # Buffer utilities
│
└── modules/                # High-level modules
    ├── agent.ts            # Agent management
    ├── escrow.ts           # Escrow operations
    ├── channel.ts          # Channel communication
    └── ...                 # Other modules
```

## Core Components

### 1. Instruction Builder

```typescript
// Base instruction builder pattern
export abstract class InstructionBuilder {
  protected constructor(
    protected readonly programId: Address,
    protected readonly discriminator: Uint8Array
  ) {}

  protected buildInstruction(
    accounts: AccountMeta[],
    data: Uint8Array
  ): IInstruction {
    return {
      programAddress: this.programId,
      accounts,
      data: Buffer.concat([this.discriminator, data])
    }
  }
}
```

### 2. Account Codec

```typescript
// Generic account codec pattern
export abstract class AccountCodec<T> {
  constructor(
    protected readonly schema: BorshSchema,
    protected readonly discriminator?: Uint8Array
  ) {}

  abstract decode(data: Uint8Array): T
  abstract encode(account: T): Uint8Array
  
  protected validateDiscriminator(data: Uint8Array): void {
    if (this.discriminator) {
      const disc = data.slice(0, 8)
      if (!disc.equals(this.discriminator)) {
        throw new InvalidAccountError()
      }
    }
  }
}
```

### 3. Type System

```typescript
// Comprehensive type definitions
export interface Agent {
  discriminator: AccountDiscriminator.Agent
  owner: Address
  agentId: string
  agentType: AgentType
  metadataUri: string
  isActive: boolean
  createdAt: bigint
  // ... other fields
}

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

### 4. Error Handling

```typescript
// Structured error system
export class GhostSpeakProgramError extends Error {
  constructor(
    public readonly code: number,
    public readonly name: string,
    message: string,
    public readonly logs?: string[]
  ) {
    super(message)
    this.name = 'GhostSpeakProgramError'
  }

  static fromErrorCode(code: number): GhostSpeakProgramError {
    const error = PROGRAM_ERROR_CODES[code]
    if (!error) {
      return new GhostSpeakProgramError(
        code,
        'UnknownError',
        `Unknown error code: ${code}`
      )
    }
    return new GhostSpeakProgramError(
      code,
      error.name,
      error.message
    )
  }
}
```

## Data Flow

### Instruction Creation Flow

```
User Input
    ↓
Validation Layer (type checking, input validation)
    ↓
Instruction Builder (creates instruction object)
    ↓
Borsh Serialization (encode arguments)
    ↓
Discriminator Addition (prepend 8-byte discriminator)
    ↓
Account Resolution (convert addresses to AccountMeta)
    ↓
IInstruction Object (ready for transaction)
```

### Account Decoding Flow

```
Raw Account Data (Uint8Array)
    ↓
Discriminator Check (verify account type)
    ↓
Borsh Deserialization (decode using schema)
    ↓
Type Mapping (map to TypeScript interface)
    ↓
Validation (ensure data integrity)
    ↓
Typed Account Object
```

## Key Design Decisions

### 1. No Code Generation
- All code is manually written
- Better debugging and maintenance
- Full control over implementation

### 2. Borsh for Serialization
- Matches Rust program exactly
- Efficient binary format
- Well-documented specification

### 3. Modular Architecture
- Each instruction in its own file
- Shared utilities and base classes
- Easy to add new features

### 4. Type-First Development
- Define types before implementation
- Use TypeScript's type system fully
- Runtime validation where needed

### 5. Error Context
- Rich error messages
- Include transaction context
- Help developers debug issues

## Integration Points

### Solana Kit (@solana/kit)
- Use native types (Address, TransactionSigner)
- Compatible instruction format
- Leverage transaction building utilities

### RPC Communication
- Typed RPC client wrapper
- Efficient batching
- Proper error handling

### External Services
- IPFS for metadata storage
- External APIs for additional data
- Wallet adapters for signing

## Performance Considerations

### Bundle Size
- Tree-shakeable exports
- Minimal dependencies
- Code splitting support

### Runtime Performance
- Efficient serialization
- Minimal allocations
- Caching where appropriate

### Network Efficiency
- Batch RPC calls
- Implement retry logic
- Connection pooling

## Security Considerations

### Input Validation
- Validate all user inputs
- Prevent injection attacks
- Sanitize metadata URIs

### Key Management
- Never store private keys
- Use TransactionSigner interface
- Support hardware wallets

### Program Security
- Validate all accounts
- Check signers properly
- Prevent reentrancy

## Future Extensibility

### Adding New Instructions
1. Define types in `types/instructions.ts`
2. Create builder in `instructions/[module]/`
3. Add to module in `modules/[module].ts`
4. Update documentation

### Supporting New Features
- Modular design allows easy additions
- Backward compatibility maintained
- Version management strategy

### Protocol Upgrades
- Versioned instruction builders
- Feature detection
- Graceful degradation