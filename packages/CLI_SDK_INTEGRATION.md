# CLI and SDK Integration Guide

## Overview

The GhostSpeak CLI and SDK now share a unified configuration and state management system, enabling seamless integration between command-line operations and programmatic SDK usage.

## Key Components

### 1. Shared Configuration System (`SharedConfig`)

A unified configuration system that both CLI and SDK use to maintain consistent settings across the entire system.

**Location**: `~/.ghostspeak/shared-config.json`

**Features**:
- Network configuration (RPC endpoints, commitment levels)
- Wallet/keypair management
- Agent and channel registry
- Feature flags and performance settings
- Security preferences

### 2. Shared State Manager (`SharedStateManager`)

Real-time state synchronization between CLI and SDK operations.

**Location**: `~/.ghostspeak/runtime-state.json`

**Features**:
- Session management with unique session IDs
- Transaction tracking (pending/completed)
- Active agent/channel tracking
- Global statistics
- Cross-process synchronization via file watching

### 3. Unified Client (`UnifiedClient`)

A high-level client that combines configuration, state, and SDK operations.

```typescript
import { UnifiedClient } from '@ghostspeak/sdk/integration';

// Create client with auto session start
const client = await UnifiedClient.create({
  autoStartSession: true,
  network: 'devnet',
});

// Register an agent
const result = await client.registerAgent(
  'MyAgent',
  'analytics',
  'An analytics agent'
);
```

## Migration from Old System

### Automatic Migration

When users run any CLI command, the system automatically checks for legacy configurations and offers to migrate them:

```bash
$ ghostspeak
⚠️  Configuration update required
Your configuration needs to be migrated to the new shared system.

? Migrate configuration now? (Y/n)
```

### Manual Migration

Users can also manually trigger migration:

```typescript
import { migrateConfiguration } from '@ghostspeak/cli/utils/config-migration';

if (await needsMigration()) {
  await migrateConfiguration();
}
```

## Benefits of Integration

### 1. Shared State

- CLI operations are immediately visible to SDK instances
- SDK operations update CLI state in real-time
- Transaction history is shared across all interfaces

### 2. Consistent Configuration

- Network settings are shared
- Wallet configuration is unified
- No duplicate agent/channel definitions

### 3. Better Developer Experience

- Use CLI for quick operations
- Use SDK for programmatic access
- Both share the same underlying data

### 4. Cross-Process Communication

- Multiple CLI instances can coordinate
- SDK applications can monitor CLI operations
- Real-time updates via file system events

## Usage Examples

### CLI Usage (Updated)

```bash
# Register an agent - now uses SDK internally
ghostspeak agent register "DataAnalyzer" --type analytics

# List agents - shows both local and on-chain status
ghostspeak agent list

# Send message - uses shared channel registry
ghostspeak message send "general" "Hello world"
```

### SDK Usage with Shared Config

```typescript
import { UnifiedClient } from '@ghostspeak/sdk/integration';

async function main() {
  // Create client - automatically uses shared config
  const client = await UnifiedClient.create();
  
  // List agents - includes those created via CLI
  const agents = await client.listAgents();
  console.log('Agents:', agents);
  
  // Subscribe to state changes from CLI
  client.onStateChange((event) => {
    console.log('State changed:', event);
  });
}
```

### Direct Configuration Access

```typescript
import { SharedConfig } from '@ghostspeak/sdk/config';

// Load shared configuration
const config = await SharedConfig.load();

// Update network settings
await config.setNetwork({
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
});

// Add an agent
await config.addAgent({
  name: 'MyAgent',
  address: agentAddress,
  type: 'general',
  createdAt: new Date(),
  lastUsed: new Date(),
});
```

### State Management

```typescript
import { SharedStateManager } from '@ghostspeak/sdk/state';

// Get state manager instance
const stateManager = await SharedStateManager.getInstance();

// Start a new session
const sessionId = await stateManager.startSession();

// Track a transaction
await stateManager.addPendingTransaction({
  signature: txSignature,
  type: 'agent_registration',
  timestamp: new Date(),
});

// Update transaction status
await stateManager.updateTransactionStatus(txSignature, 'confirmed');
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│       CLI       │     │       SDK       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────┬───────────────┘
                 │
         ┌───────▼────────┐
         │ UnifiedClient  │
         └───────┬────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼──────┐    ┌────────▼────────┐
│SharedConfig│    │SharedStateManager│
└─────┬──────┘    └────────┬────────┘
      │                     │
      └──────────┬──────────┘
                 │
         ┌───────▼────────┐
         │  File System   │
         │ ~/.ghostspeak/ │
         └────────────────┘
```

## File Structure

```
~/.ghostspeak/
├── shared-config.json      # Unified configuration
├── runtime-state.json      # Real-time state
├── config.json.backup.*    # Legacy config backups
└── logs/                   # Shared logs
```

## Best Practices

1. **Always use UnifiedClient** for CLI commands that interact with the blockchain
2. **Subscribe to state changes** when building interactive applications
3. **Check wallet configuration** before attempting transactions
4. **Handle offline scenarios** gracefully
5. **Clean up old sessions** periodically

## Troubleshooting

### Configuration Not Syncing

1. Check file permissions in `~/.ghostspeak/`
2. Ensure no file locks are preventing writes
3. Verify JSON syntax in configuration files

### State Updates Not Appearing

1. Check if file watching is supported on your system
2. Verify the state file isn't corrupted
3. Try restarting both CLI and SDK applications

### Migration Issues

1. Backup your old configuration before migration
2. Check for custom fields that might not migrate automatically
3. Manually edit the new configuration if needed

## Future Enhancements

- [ ] WebSocket-based real-time sync
- [ ] Encrypted configuration storage
- [ ] Multi-profile support
- [ ] Remote configuration sync
- [ ] Configuration versioning

## Conclusion

The unified CLI/SDK integration provides a seamless experience for both command-line users and developers building applications with the GhostSpeak protocol. By sharing configuration and state, we ensure consistency and improve the overall developer experience.