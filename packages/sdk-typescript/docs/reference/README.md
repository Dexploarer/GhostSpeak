# GhostSpeak SDK Reference

This section contains detailed reference documentation for the GhostSpeak SDK.

## Reference Documentation

### Core References

- **[Type Definitions](./types.md)** - Complete type reference for all SDK types
- **[Configuration Options](./configuration.md)** - All configuration options explained
- **[Error Codes](./error-codes.md)** - Complete list of error codes and meanings
- **[Constants and Enums](./constants.md)** - All constants and enumerated types

### API References  

- **[Generated Types](./generated-types.md)** - Auto-generated types from IDL
- **[Instruction Reference](./instructions.md)** - All blockchain instructions
- **[Account Structures](./accounts.md)** - On-chain account data structures

### Utility References

- **[Token Utils](./token-utils.md)** - Token handling utilities
- **[IPFS Utils](./ipfs-utils.md)** - IPFS integration utilities
- **[PDA Derivation](./pda.md)** - Program Derived Address functions

### Integration References

- **[RPC Methods](./rpc-methods.md)** - Available RPC methods
- **[Event Types](./events.md)** - All event types and structures
- **[Capability Registry](./capabilities.md)** - Standard capability names

## Quick Links

- [API Documentation](../api/README.md)
- [Tutorials](../tutorials/README.md)
- [Examples](../../examples/README.md)

## TypeScript Support

The SDK is fully typed with TypeScript. Enable strict mode for best experience:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Version Compatibility

| SDK Version | Solana Version | Anchor Version | Node Version |
|-------------|----------------|----------------|--------------|
| 1.6.x       | 2.1.0+         | 0.31.0+        | 20.0.0+      |
| 1.5.x       | 2.0.0+         | 0.30.0+        | 18.0.0+      |

## Import Patterns

### Named Imports

```typescript
import { 
  GhostSpeakClient,
  AgentStatus,
  TokenProgram,
  ErrorCode 
} from '@ghostspeak/sdk';
```

### Type Imports

```typescript
import type {
  Agent,
  ServiceListing,
  EscrowAccount,
  GhostSpeakConfig
} from '@ghostspeak/sdk';
```

### Namespace Import

```typescript
import * as GhostSpeak from '@ghostspeak/sdk';

const client = new GhostSpeak.GhostSpeakClient(config);
```