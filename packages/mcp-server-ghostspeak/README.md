# GhostSpeak MCP Server

**Model Context Protocol (MCP) server for GhostSpeak agent discovery and claiming**

This standalone MCP server exposes GhostSpeak's agent discovery functionality to any MCP-compatible client, including ElizaOS, Claude Desktop, OpenAI Assistants, and custom LangChain agents.

## Features

- **search_discovered_agents**: Search for agents discovered on-chain but not yet claimed
- **claim_agent**: Claim ownership of a discovered agent (with cryptographic ownership validation)
- **get_discovery_stats**: Get current statistics about agent discovery
- **Resource**: `discovery://stats` for real-time discovery statistics

## Installation

```bash
bun install
```

## Usage

### Running Locally

```bash
# Development mode
bun run dev

# Production mode
bun run build
bun run start
```

### Environment Variables

Required:
- `NEXT_PUBLIC_CONVEX_URL`: Convex backend URL (e.g., `https://lovely-cobra-639.convex.cloud`)

Example `.env`:
```bash
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
```

## MCP Protocol

This server implements the Model Context Protocol specification (2025-11-25).

### Tools

#### `search_discovered_agents`

Search for agents discovered on-chain.

**Input:**
```json
{
  "status": "discovered",  // optional: "discovered" | "claimed" | "verified"
  "limit": 20              // optional: 1-100
}
```

**Output:**
```json
{
  "agents": [
    {
      "ghostAddress": "5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2",
      "status": "discovered",
      "discoverySource": "x402_payment",
      "firstSeenTimestamp": 1735862400000,
      "slot": 12345678
    }
  ],
  "stats": {
    "total": 52,
    "totalDiscovered": 52,
    "totalClaimed": 0,
    "totalVerified": 0
  },
  "count": 52,
  "timestamp": 1735862400000
}
```

#### `claim_agent`

Claim ownership of a discovered agent.

**Security**: The `agentAddress` MUST match `claimedBy` wallet address. Users can only claim agents they own.

**Input:**
```json
{
  "agentAddress": "5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2",
  "claimedBy": "5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2"
}
```

**Output (success):**
```json
{
  "success": true,
  "message": "Successfully claimed agent 5eLbn3wj...",
  "agentAddress": "5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2",
  "claimedBy": "5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2",
  "discoverySource": "x402_payment",
  "firstSeen": 1735862400000,
  "claimedAt": 1735862500000,
  "nextSteps": [
    "Register your agent on-chain",
    "Start building Ghost Score",
    "Enable x402 payments",
    "Earn verifiable credentials"
  ]
}
```

**Output (ownership failure):**
```json
{
  "success": false,
  "error": "Ownership verification failed",
  "message": "You can only claim agents you own...",
  "agentAddress": "5eLbn3wj...",
  "claimedBy": "7xKXtYZ3..."
}
```

#### `get_discovery_stats`

Get current discovery statistics.

**Input:** `{}` (no parameters)

**Output:**
```json
{
  "stats": {
    "total": 52,
    "totalDiscovered": 52,
    "totalClaimed": 0,
    "totalVerified": 0
  },
  "timestamp": 1735862400000
}
```

### Resources

#### `discovery://stats`

Real-time discovery statistics (read-only resource).

**Format:** `application/json`

**Content:**
```json
{
  "total": 52,
  "totalDiscovered": 52,
  "totalClaimed": 0,
  "totalVerified": 0
}
```

## Integration Examples

### ElizaOS Agent

Use with `@elizaos/plugin-mcp`:

```typescript
import mcpPlugin from '@elizaos/plugin-mcp'

export const ghostspeakPlugin: Plugin = {
  name: 'ghostspeak-plugin',
  plugins: [mcpPlugin],

  settings: {
    mcp: {
      servers: {
        ghostspeak: {
          command: 'bunx',
          args: ['@ghostspeak/mcp-server'],
          env: {
            NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
          }
        }
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ghostspeak": {
      "command": "bunx",
      "args": ["@ghostspeak/mcp-server"],
      "env": {
        "NEXT_PUBLIC_CONVEX_URL": "https://lovely-cobra-639.convex.cloud"
      }
    }
  }
}
```

### Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const client = new Client({
  name: 'my-agent',
  version: '1.0.0'
})

const transport = new StdioClientTransport({
  command: 'bunx',
  args: ['@ghostspeak/mcp-server'],
  env: {
    NEXT_PUBLIC_CONVEX_URL: 'https://lovely-cobra-639.convex.cloud'
  }
})

await client.connect(transport)

// Call tools
const result = await client.callTool({
  name: 'search_discovered_agents',
  arguments: { status: 'discovered', limit: 10 }
})

console.log(result)
```

## Testing

### Using MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run server with inspector
bunx @modelcontextprotocol/inspector bunx @ghostspeak/mcp-server
```

Open the inspector UI to interactively test tools and resources.

### Manual Testing

```bash
# Start server
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud bun run dev

# Server will output to stderr:
# 🚀 GhostSpeak MCP Server running
# 📡 Convex URL: https://lovely-cobra-639.convex.cloud
# 🔧 Available tools: search_discovered_agents, claim_agent, get_discovery_stats
```

## Security Model

### Ownership Validation

The `claim_agent` tool enforces strict ownership validation:

1. **Agent address MUST equal claimed-by address**: Users can only claim agents matching their authenticated wallet
2. **No cross-wallet claiming**: Cannot claim agents owned by other wallets
3. **Cryptographic proof**: Frontend authentication uses Ed25519 signature verification (via Convex `signInWithSolana`)
4. **Session-based auth**: Session tokens issued only after signature verification

### Future Enhancements

- OAuth-based authorization flow
- Rate limiting for tool calls
- Audit logging for claim operations
- Multi-signature support for enterprise agents

## Architecture

```
MCP Client (ElizaOS/Claude/etc.)
         │
         │ JSON-RPC 2.0
         │
         ▼
  MCP Server (stdio)
         │
         │ ConvexHttpClient
         │
         ▼
  Convex Database
    (ghostDiscovery)
```

## Development

```bash
# Install dependencies
bun install

# Type check
bun run type-check

# Build
bun run build

# Run locally
bun run dev
```

## Contributing

This MCP server is part of the GhostSpeak monorepo. See the main repository for contribution guidelines.

## License

MIT

## Links

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [GhostSpeak Documentation](https://ghostspeak.ai/docs)
