# GhostSpeak Manual SDK Implementation

## Overview

This documentation outlines the approach for replacing the Codama-generated SDK with a manually-written implementation that provides better control, clearer error messages, and more flexibility while maintaining full compatibility with Solana Kit (@solana/kit).

## Why Manual SDK?

### Current Issues with Codama
- Generated code causing errors that are difficult to debug
- Limited control over serialization logic
- Unclear error messages from generated code
- Overhead from unused generated code
- Difficulty customizing specific behaviors

### Benefits of Manual Implementation
1. **Full Control** - Direct control over all serialization and deserialization
2. **Better Debugging** - Clear stack traces and custom error messages
3. **Optimization** - Include only what's needed, reduce bundle size
4. **Flexibility** - Easy to add custom validation and business logic
5. **Maintainability** - Clearer code structure, easier to understand

## Project Structure

```
manual-sdk-docs/
├── README.md                          # This file
├── ARCHITECTURE.md                    # Detailed architecture design
├── MIGRATION-GUIDE.md                 # Migration from Codama
├── instructions/                      # Instruction implementation guides
├── types/                            # Type system documentation
├── implementation/                    # Technical implementation details
└── examples/                         # Complete implementation examples
```

## Quick Start

1. **Review Documentation** - Start with ARCHITECTURE.md for the overall design
2. **Understand Types** - Review the type system in types/
3. **Learn Patterns** - Study examples/ for implementation patterns
4. **Follow Migration** - Use MIGRATION-GUIDE.md for step-by-step process

## Core Components

### 1. Instruction Builders
Manual functions that create instruction objects compatible with Solana Kit:
```typescript
export function createRegisterAgentInstruction(
  accounts: RegisterAgentAccounts,
  args: RegisterAgentArgs
): IInstruction
```

### 2. Account Codecs
Borsh serialization/deserialization for account data:
```typescript
export class AgentAccountCodec extends AccountCodec<Agent> {
  decode(data: Uint8Array): Agent
  encode(agent: Agent): Uint8Array
}
```

### 3. Type Definitions
Comprehensive TypeScript types matching the Rust program:
```typescript
export interface Agent {
  owner: Address
  agentId: string
  agentType: number
  metadataUri: string
  isActive: boolean
  createdAt: bigint
}
```

### 4. Error Handling
Custom error classes with helpful messages:
```typescript
export class GhostSpeakError extends Error {
  constructor(
    public code: number,
    public instructionName: string,
    message: string
  ) {
    super(message)
  }
}
```

## Implementation Priorities

### Phase 1: Core Infrastructure
- Borsh serialization utilities
- Base instruction builder
- Account decoder framework
- Error handling system

### Phase 2: Essential Instructions
- Agent management (register, update, activate)
- Escrow operations (create, complete, cancel)
- Channel communication (create, send message)

### Phase 3: Extended Features
- Token-2022 operations
- Marketplace functionality
- Governance features

### Phase 4: Advanced Features
- Compressed NFTs
- Analytics
- Bulk operations

## Development Workflow

1. **Documentation First** - Document the approach before implementing
2. **Test Driven** - Write tests based on expected behavior
3. **Incremental Migration** - Migrate one instruction at a time
4. **Continuous Validation** - Test against the Rust program frequently

## Key Principles

1. **Maintain Compatibility** - Must work with existing Rust program
2. **Type Safety** - Full TypeScript type coverage
3. **Clear Errors** - Helpful error messages for debugging
4. **Performance** - Optimize for bundle size and runtime performance
5. **Documentation** - Keep documentation in sync with implementation

## Getting Started

Begin by reading [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the overall design, then review the [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for the step-by-step process.

For specific implementation details, see:
- [Instruction Implementation Guide](./instructions/README.md)
- [Type System Overview](./types/README.md)
- [Borsh Serialization](./implementation/borsh-serialization.md)
- [Example: Register Agent](./examples/register-agent.md)

## Resources

- [Solana Kit Documentation](https://github.com/anza-xyz/kit)
- [Borsh Specification](https://borsh.io/)
- [Anchor Framework](https://github.com/coral-xyz/anchor)
- [GhostSpeak Rust Program](../programs/src/)