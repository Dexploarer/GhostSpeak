# ElizaOS Agent - MCP Integration

**Status**: ✅ Configured and Ready to Test
**Date**: January 2, 2026

---

## Overview

The ElizaOS agent (Casper) is now configured to use the GhostSpeak MCP server for agent discovery and claiming operations. This integration allows the agent to access real Convex database data through the MCP protocol.

---

## Architecture

```
User Chat Message
       │
       ▼
/api/agent/chat (Next.js API Route)
       │
       ▼
processAgentMessage() (ElizaOS Runtime)
       │
       ├─► @elizaos/plugin-mcp
       │          │
       │          ▼
       │   HTTP POST to /api/mcp
       │          │
       │          ▼
       │   MCP Server (JSON-RPC 2.0)
       │          │
       │          ▼
       │   Convex Database
       │
       ├─► @ghostspeak/plugin-elizaos (custom actions)
       │
       └─► @ghostspeak/plugin-gateway-ghost (AI inference)
```

---

## Configuration

### Runtime Setup

File: `server/elizaos/runtime.ts`

```typescript
import mcpPlugin from '@elizaos/plugin-mcp'

const runtime = new AgentRuntime({
  character: CaisperCharacter,
  plugins: [
    ghostspeakPlugin,    // Custom GhostSpeak actions
    aiGatewayPlugin,     // AI inference via Vercel AI Gateway
    mcpPlugin,           // MCP protocol support
  ],
  databaseAdapter,

  // MCP Configuration
  settings: {
    mcp: {
      servers: {
        ghostspeak: {
          transport: 'http',
          url: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`
            : 'http://localhost:3000/api/mcp',
        }
      }
    }
  }
})
```

---

## MCP Tools Available to Agent

The agent can now call these MCP tools:

### 1. **search_discovered_agents**

Search for agents discovered on-chain.

```typescript
// Agent can ask:
"Show me discovered agents"
"Find unclaimed agents"
"List 10 discovered agents"
```

**MCP Tool Call**:
```json
{
  "name": "search_discovered_agents",
  "arguments": {
    "status": "discovered",
    "limit": 10
  }
}
```

**Response**:
```json
{
  "agents": [
    {
      "ghostAddress": "EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa",
      "status": "discovered",
      "discoverySource": "x402_payment",
      "firstSeenTimestamp": 1764819664000,
      "slot": 425897496,
      "facilitatorAddress": "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4"
    }
  ],
  "stats": {
    "total": 52,
    "totalDiscovered": 50,
    "totalClaimed": 2
  }
}
```

### 2. **claim_agent**

Claim ownership of a discovered agent (requires matching wallet).

```typescript
// Agent can ask:
"Claim agent EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa"
"I want to claim my agent"
```

**MCP Tool Call**:
```json
{
  "name": "claim_agent",
  "arguments": {
    "agentAddress": "EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa",
    "claimedBy": "EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa"
  }
}
```

**Response**:
```json
{
  "success": true,
  "agentAddress": "EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa",
  "claimedBy": "EzCxJ63RGDjosjsvu4q5FpAsDPfawS6mubdUPXM3cbsa",
  "claimedAt": 1767409000000,
  "nextSteps": [
    "Register your agent on-chain",
    "Start building Ghost Score",
    "Enable x402 payments"
  ]
}
```

### 3. **get_discovery_stats**

Get current discovery statistics.

```typescript
// Agent can ask:
"What are the discovery stats?"
"How many agents have been discovered?"
"Show me platform statistics"
```

**MCP Tool Call**:
```json
{
  "name": "get_discovery_stats",
  "arguments": {}
}
```

**Response**:
```json
{
  "stats": {
    "total": 52,
    "totalDiscovered": 50,
    "totalClaimed": 2,
    "totalVerified": 0
  },
  "timestamp": 1767409000000
}
```

---

## MCP Resources Available

### 1. **discovery://stats**

Real-time discovery statistics (read-only resource).

The agent can access this resource to get live stats:

```json
{
  "total": 52,
  "totalDiscovered": 50,
  "totalClaimed": 2,
  "totalVerified": 0
}
```

---

## How It Works

### 1. User Sends Message

User sends a message through the chat interface:

```typescript
POST /api/agent/chat
{
  "message": "Show me discovered agents",
  "walletAddress": "...",
  "sessionToken": "..."
}
```

### 2. ElizaOS Processes Message

The `processAgentMessage()` function evaluates all actions:

```typescript
// Direct action evaluation (existing approach)
for (const action of runtime.actions) {
  const isValid = await action.validate(runtime, memory, undefined)

  if (isValid) {
    // Execute custom action (e.g., searchAgentsAction)
    await action.handler(...)
  }
}

// MCP plugin automatically makes tools available
// The agent can call MCP tools when needed
```

### 3. MCP Plugin Calls HTTP Endpoint

When the agent decides to use an MCP tool, the `@elizaos/plugin-mcp` makes an HTTP request:

```typescript
POST http://localhost:3000/api/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_discovered_agents",
    "arguments": {
      "status": "discovered",
      "limit": 10
    }
  }
}
```

### 4. MCP Server Queries Convex

The MCP server (`/api/mcp`) handles the JSON-RPC request:

```typescript
// packages/web/app/api/mcp/route.ts
case 'search_discovered_agents':
  const agents = await convex.query(api.ghostDiscovery.listDiscoveredAgents, {
    status: args.status,
    limit: args.limit
  })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ agents, stats, count, timestamp })
    }]
  }
```

### 5. Response Flows Back to User

MCP Server → MCP Plugin → ElizaOS Runtime → API Route → User

---

## Benefits of MCP Integration

### ✅ **Real Data**

- Agent accesses actual Convex database
- No hallucinated responses
- Real Solana addresses and blockchain data

### ✅ **Standardized Protocol**

- MCP is an industry standard (Anthropic)
- Works with any MCP-compatible client
- Easy to extend with new tools

### ✅ **Separation of Concerns**

- MCP server handles data access
- ElizaOS handles conversation flow
- Clean separation between data and AI

### ✅ **Reusable Tools**

- Same MCP server can be used by:
  - ElizaOS agents
  - Claude Desktop
  - Custom MCP clients
  - Other AI frameworks

---

## Testing the Integration

### Manual Test via Chat API

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me discovered agents",
    "walletAddress": "test-wallet-123",
    "sessionToken": "session_test_123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "response": "I found 50 discovered agents. Here are the first few: ...",
  "actionTriggered": "SEARCH_AGENTS",
  "metadata": {
    "triggeredAction": "SEARCH_AGENTS",
    "agentsFound": 50
  }
}
```

### Automated Test

```bash
cd packages/web
bun run server/elizaos/test-mcp-integration.ts
```

**Expected Output**:
```
🧪 Testing ElizaOS Agent MCP Integration
============================================================

📝 Test 1: Ask about discovered agents
Input: "Show me discovered agents"
✅ Response: I found 50 discovered agents...
🎯 Action triggered: SEARCH_AGENTS

📝 Test 2: Ask about discovery stats
Input: "What are the discovery statistics?"
✅ Response: Currently there are 52 total agents...
🎯 Action triggered: GET_STATS

✅ All MCP integration tests passed!
```

---

## Troubleshooting

### Issue: MCP Plugin Not Connecting

**Symptoms**: Agent doesn't access real data, falls back to default responses

**Check**:
1. MCP server is running at `/api/mcp`
   ```bash
   curl http://localhost:3000/api/mcp | jq .
   ```
2. MCP plugin is in the plugins array
3. Settings object is correctly formatted

**Fix**:
```typescript
// Verify this exists in runtime.ts
plugins: [ghostspeakPlugin, aiGatewayPlugin, mcpPlugin],
settings: {
  mcp: {
    servers: {
      ghostspeak: {
        transport: 'http',
        url: 'http://localhost:3000/api/mcp'
      }
    }
  }
}
```

### Issue: CORS Errors

**Symptoms**: HTTP requests blocked by browser

**Fix**: MCP server already has CORS enabled in `/api/mcp/route.ts`:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Issue: Tools Not Triggering

**Symptoms**: Agent doesn't recognize MCP tools

**Check**:
1. MCP plugin is loaded correctly
2. Tools are listed at `/api/mcp` (method: `tools/list`)
3. Agent character configuration allows tool usage

**Debug**:
```bash
# Check available tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

---

## Next Steps

1. **Test the Integration**: Run the MCP integration test
2. **Verify Tool Calls**: Check that agent actually calls MCP tools
3. **Monitor Logs**: Watch for HTTP requests to `/api/mcp`
4. **User Testing**: Test with real user conversations

---

## Environment Variables

Required for MCP integration:

```bash
# App URL for MCP endpoint
NEXT_PUBLIC_APP_URL=http://localhost:3000  # dev
NEXT_PUBLIC_APP_URL=https://ghostspeak.ai  # production

# Convex database
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud

# AI Gateway (for inference)
AI_GATEWAY_API_KEY=vck_xxx...
```

---

**Integration Status**: ✅ Ready for Testing
**Last Updated**: January 2, 2026
