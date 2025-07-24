# Agent Update Guide

## Overview

The GhostSpeak SDK now provides enhanced agent update functionality that automatically detects the `agent_id` parameter, making it easier to update agents without manually tracking IDs.

## The Problem

Previously, updating an agent required users to remember and provide the original `agent_id` that was used during agent creation. This was cumbersome because:
- The `agent_id` is generated during creation but not easily retrievable later
- Users had to manually track agent IDs in their own storage
- The blockchain doesn't store the agent_id directly (it's used to derive the PDA)

## The Solution

We've implemented two approaches to solve this:

### 1. Automatic agent_id Storage in Metadata

When creating an agent, the SDK now automatically stores the `agent_id` in the agent's metadata. This allows the SDK to retrieve it later when needed for updates.

```typescript
// During creation, agent_id is automatically stored
const agentAddress = await client.agent.create(wallet, {
  name: 'My Agent',
  description: 'AI assistant',
  category: 'automation',
  capabilities: ['data-analysis'],
  serviceEndpoint: 'https://api.example.com'
})
```

### 2. New Convenience Methods

The SDK now provides convenience methods that automatically detect the `agent_id`:

#### updateAgent() - Auto-detecting update method

```typescript
// Update without providing agent_id - it will be auto-detected
await client.agent.updateAgent(wallet, agentAddress, {
  description: 'Updated description',
  capabilities: ['data-analysis', 'coding']
})

// Or provide agent_id explicitly if known
await client.agent.updateAgent(wallet, agentAddress, {
  description: 'Updated description',
  capabilities: ['data-analysis', 'coding'],
  agentId: 'agent_1234567890_123' // Optional
})
```

#### activateAgent() and deactivateAgent()

```typescript
// Activate/deactivate without agent_id
await client.agent.activateAgent(wallet, agentAddress)
await client.agent.deactivateAgent(wallet, agentAddress)

// Or with explicit agent_id
await client.agent.activateAgent(wallet, agentAddress, 'agent_1234567890_123')
```

## Backward Compatibility

The original methods are still available if you prefer to use them:

```typescript
// Original method (requires agent_id)
await client.agent.update(wallet, agentAddress, agentId, {
  description: 'Updated description'
})
```

## How It Works

1. **First attempt**: The SDK checks if the agent's metadata contains the stored `agent_id`
2. **Fallback**: If not found in metadata, the SDK attempts to derive the `agent_id` by testing common patterns
3. **Manual input**: If auto-detection fails, users can provide the `agent_id` explicitly

## Best Practices

1. **Let the SDK handle agent_id storage**: When creating agents, the SDK automatically stores the agent_id in metadata
2. **Use the new convenience methods**: `updateAgent()`, `activateAgent()`, `deactivateAgent()`
3. **Store agent_id locally as backup**: While not required, it's good practice to store the agent_id when creating agents

## CLI Usage

The CLI has been updated to use the new convenience methods:

```bash
# Update agent - will auto-detect agent_id from metadata
ghost agent update

# If auto-detection fails, CLI will prompt for agent_id
```

## Error Handling

If the SDK cannot determine the agent_id, you'll see an error message:
```
Could not determine agent_id. Please provide it explicitly in params.agentId or ensure it's stored in the agent metadata.
```

In this case, you need to:
1. Provide the agent_id explicitly in the update parameters
2. Or find the original agent_id from when the agent was created

## Testing

Run the test script to verify the functionality:

```bash
npm run test:agent-update
```

This will:
1. Create a test agent
2. Update it without providing agent_id (auto-detection)
3. Verify the update was successful