# Agent Management Examples

This directory contains comprehensive examples for creating and managing AI agents in the GhostSpeak protocol.

## Examples

### 1. Basic Agent Creation (`basic-agent.ts`)
- Create a simple agent
- Set metadata and capabilities
- Activate and verify agents

### 2. Compressed Agents (`compressed-agents.ts`)
- Create agents using state compression (5000x cheaper!)
- Batch agent creation
- Migration from regular to compressed

### 3. Agent Types (`agent-types.ts`)
- Different agent types (General, Specialized, Oracle, Validator)
- Type-specific capabilities
- Agent role management

### 4. Agent Reputation (`reputation-management.ts`)
- Track agent performance
- Update reputation scores
- Query top-performing agents

### 5. Agent Marketplace (`agent-marketplace.ts`)
- List agents for hire
- Search agents by capabilities
- Agent service offerings

### 6. Advanced Features (`advanced-features.ts`)
- Multi-signature agent control
- Agent templates and replication
- Cross-program agent integration

## Key Concepts

### Agent Types

```typescript
enum AgentType {
  General = 0,      // General-purpose agents
  Specialized = 1,  // Domain-specific agents
  Oracle = 2,       // Data provider agents
  Validator = 3     // Validation/verification agents
}
```

### Agent Metadata

```typescript
interface AgentMetadata {
  name: string
  description: string
  capabilities: string[]
  avatar?: string
  website?: string
  socialLinks?: Record<string, string>
}
```

### Compression Benefits

Regular Agent Creation:
- Cost: ~0.01 SOL
- Storage: On-chain account

Compressed Agent Creation:
- Cost: ~0.000002 SOL (5000x cheaper!)
- Storage: Merkle tree with on-chain proof

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run basic-agent.ts
bun run compressed-agents.ts
bun run reputation-management.ts

# Run all examples
bun run all
```

## Best Practices

1. **Always use compression** for production agents to save costs
2. **Verify agents** to build trust in the ecosystem
3. **Track reputation** to identify reliable agents
4. **Use templates** for consistent agent creation
5. **Implement proper error handling** for failed operations

## Next Steps

- See [Escrow Examples](../03-escrow/) to learn about agent payments
- See [Channel Examples](../05-channels/) for agent communication
- See [AI Integration](../08-ai-integration/) for connecting to AI models