# MCP (Model Context Protocol) Research for GhostSpeak

**Date**: January 2, 2026
**Research Focus**: Using MCP servers to expose GhostSpeak agent functionality to multiple AI agents (not just ElizaOS)

---

## Executive Summary

The Model Context Protocol (MCP) is an open standard created by Anthropic that enables AI agents to interact with external tools, data sources, and services through a standardized JSON-RPC 2.0 protocol. Using an MCP server for GhostSpeak's discovered agents functionality would:

✅ **Solve** the ElizaOS database adapter compatibility issues
✅ **Enable** any MCP-compatible agent (not just ElizaOS) to access GhostSpeak
✅ **Standardize** our agent discovery API for broader ecosystem adoption
✅ **Simplify** authentication and authorization flows
✅ **Future-proof** our architecture with industry-standard protocol

---

## What is MCP?

### Core Architecture

```
┌─────────────────┐
│   LLM Agent     │  (ElizaOS, OpenAI, Claude, etc.)
│  (MCP Client)   │
└────────┬────────┘
         │ JSON-RPC 2.0
         │
┌────────▼────────┐
│   MCP Server    │  (GhostSpeak Discovery Server)
│                 │
│  - Tools        │  (searchAgents, claimAgent, getStats)
│  - Resources    │  (discovered agents data)
│  - Prompts      │  (agent claiming workflows)
└────────┬────────┘
         │
         │
┌────────▼────────┐
│  Data Sources   │  (Convex database)
└─────────────────┘
```

### Key Components

1. **Tools**: Executable functions that agents can call (e.g., `searchDiscoveredAgents`, `claimAgent`)
2. **Resources**: Read-only contextual data (e.g., discovery stats, agent metadata)
3. **Prompts**: Templated workflows for common tasks (e.g., claim flow with ownership proof)

### Communication Protocol

- **Transport**: JSON-RPC 2.0 over stdio or HTTP
- **Stateful**: Maintains connections with capability negotiation
- **Secure**: Built-in support for OAuth-based authorization
- **Standardized**: Works with any MCP-compatible client

---

## MCP Server Implementation for GhostSpeak

### Architecture Proposal

**Package Structure:**
```
packages/
├── mcp-server-ghostspeak/      # NEW: Standalone MCP server
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── tools/               # MCP tool definitions
│   │   │   ├── searchAgents.ts
│   │   │   ├── claimAgent.ts
│   │   │   └── getGhostScore.ts
│   │   ├── resources/           # MCP resource providers
│   │   │   ├── discoveryStats.ts
│   │   │   └── agentMetadata.ts
│   │   └── auth/                # Authentication middleware
│   │       └── solanaAuth.ts
│   ├── package.json
│   └── README.md
│
├── plugin-ghostspeak/           # EXISTING: ElizaOS plugin
│   └── (uses @elizaos/plugin-mcp to connect to our MCP server)
│
└── web/                         # EXISTING: Next.js app
    └── (can expose MCP server via HTTP endpoint)
```

### TypeScript Implementation Example

```typescript
// packages/mcp-server-ghostspeak/src/index.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'

const server = new McpServer({
  name: 'ghostspeak-discovery',
  version: '1.0.0',
  description: 'GhostSpeak Agent Discovery and Claiming Tools'
})

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Tool 1: Search Discovered Agents
server.tool(
  'search_discovered_agents',
  'Search for agents discovered on-chain but not yet claimed',
  {
    status: z.enum(['discovered', 'claimed', 'verified']).optional(),
    limit: z.number().min(1).max(100).optional(),
  },
  async ({ status = 'discovered', limit = 20 }) => {
    try {
      const agents = await convex.query('ghostDiscovery:listDiscoveredAgents', {
        status,
        limit,
      })

      const stats = await convex.query('ghostDiscovery:getDiscoveryStats', {})

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              agents,
              stats,
              timestamp: Date.now(),
            }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      }
    }
  }
)

// Tool 2: Claim Agent (with ownership validation)
server.tool(
  'claim_agent',
  'Claim ownership of a discovered agent. Requires cryptographic proof of wallet ownership.',
  {
    agentAddress: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/),
    claimedBy: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/),
    sessionToken: z.string(),
  },
  async ({ agentAddress, claimedBy, sessionToken }) => {
    try {
      // CRITICAL: Ownership validation
      // The agent address MUST match the authenticated wallet
      if (agentAddress.toLowerCase() !== claimedBy.toLowerCase()) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Ownership verification failed: You can only claim agents you own',
                agentAddress,
                claimedBy,
              }),
            },
          ],
          isError: true,
        }
      }

      // Verify session token and claim agent
      const result = await convex.mutation('ghostDiscovery:claimAgent', {
        ghostAddress: agentAddress,
        claimedBy,
        sessionToken,
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              agentAddress,
              claimedBy,
              claimedAt: Date.now(),
              result,
            }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      }
    }
  }
)

// Tool 3: Get Ghost Score
server.tool(
  'get_ghost_score',
  'Get reputation score and metrics for an agent',
  {
    agentAddress: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/),
  },
  async ({ agentAddress }) => {
    try {
      // Query on-chain data for Ghost Score
      // This would integrate with your Solana program
      const ghostScore = {
        address: agentAddress,
        score: 850,
        rank: 'Silver Ghost',
        completedJobs: 42,
        totalEarnings: '15.5 SOL',
        credentials: 7,
        uptime: '99.2%',
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(ghostScore, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      }
    }
  }
)

// Resource: Discovery Stats
server.resource(
  'discovery://stats',
  'Current statistics about agent discovery',
  async () => {
    const stats = await convex.query('ghostDiscovery:getDiscoveryStats', {})

    return {
      contents: [
        {
          uri: 'discovery://stats',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    }
  }
)

// Start server
await server.connect(new StdioServerTransport())

console.log('🚀 GhostSpeak MCP Server running')
```

### Package.json

```json
{
  "name": "@ghostspeak/mcp-server",
  "version": "1.0.0",
  "description": "MCP server for GhostSpeak agent discovery and claiming",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "ghostspeak-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node",
    "dev": "bun run src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.1",
    "convex": "^1.31.2",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

---

## ElizaOS Integration with MCP Server

### Using @elizaos/plugin-mcp

Once the MCP server is running, the ElizaOS agent can connect to it using the official MCP plugin:

```typescript
// packages/plugin-ghostspeak/src/index.ts

import { Plugin } from '@elizaos/core'
import mcpPlugin from '@elizaos/plugin-mcp'

export const ghostspeakPlugin: Plugin = {
  name: 'ghostspeak-plugin',
  description: 'GhostSpeak integration via MCP server',

  // Use MCP plugin to connect to our GhostSpeak MCP server
  plugins: [mcpPlugin],

  // Configuration for MCP server connection
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

**How it works:**

1. ElizaOS agent loads `@elizaos/plugin-mcp`
2. MCP plugin spawns the GhostSpeak MCP server as a subprocess
3. Agent can now use `CALL_MCP_TOOL` action to invoke server tools
4. MCP server executes tools and returns results via JSON-RPC
5. Agent receives results and formulates responses

---

## Comparison: Current Approach vs MCP Approach

| Aspect | Current (Direct Actions) | MCP Server Approach |
|--------|-------------------------|---------------------|
| **Database Adapter** | Required custom ConvexDatabaseAdapter, conflicts with SQL plugin | Not needed - MCP server handles data access |
| **Multi-Agent Support** | ElizaOS only | Any MCP-compatible agent (OpenAI, Claude Desktop, ElizaOS, etc.) |
| **Authentication** | Custom session token validation | Built-in OAuth support + custom auth middleware |
| **Deployment** | Bundled with ElizaOS agent | Standalone service (can run separately) |
| **Testing** | Requires running full ElizaOS runtime | Can test MCP server independently |
| **Maintenance** | Tied to ElizaOS framework changes | Independent versioning |
| **Ecosystem** | GhostSpeak-specific | Industry standard protocol |
| **Complexity** | Medium (action validation, providers, services) | Low (simple tool definitions) |
| **Error Handling** | Manual try/catch in every action | Standardized error responses |

---

## Benefits of MCP Approach

### 1. Solves ElizaOS Database Adapter Issues

**Problem**: ElizaOS appears to hardcode SQL plugin requirement, won't accept custom database adapters even when fully implementing IDatabaseAdapter interface.

**Solution**: MCP server operates independently of ElizaOS's database layer. The server handles all Convex queries internally, returning only the results via JSON-RPC.

### 2. Multi-Agent Ecosystem

Any agent framework that supports MCP can now interact with GhostSpeak:

- **ElizaOS agents** (via `@elizaos/plugin-mcp`)
- **OpenAI Assistants** (native MCP support)
- **Claude Desktop** (native MCP support)
- **Custom LangChain agents** (via MCP client SDK)
- **AutoGPT** (via MCP integration)

### 3. Simplified Authentication

MCP protocol has built-in support for:

- OAuth-based authorization
- Token-based authentication
- Session management
- User consent flows

We can leverage this instead of building custom auth for every action.

### 4. Better Testing and Development

```bash
# Test MCP server independently
bun run dev  # Start server

# Use MCP Inspector to test tools
npx @modelcontextprotocol/inspector bunx @ghostspeak/mcp-server

# Test from Claude Desktop
# Add server to claude_desktop_config.json
```

### 5. HTTP Transport Option

MCP supports both stdio (for local processes) and HTTP (for remote services):

```typescript
// Can expose MCP server via HTTP for web-based agents
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js'

await server.connect(new HttpServerTransport({
  port: 3001,
  path: '/mcp',
}))
```

This enables web-based agents to access GhostSpeak without spawning processes.

---

## Implementation Roadmap

### Phase 1: MCP Server Setup (1-2 days)

- [ ] Create `packages/mcp-server-ghostspeak/` package
- [ ] Install MCP SDK dependencies
- [ ] Implement core tools (search, claim, stats)
- [ ] Add Convex integration
- [ ] Write tests using MCP Inspector

### Phase 2: Authentication Layer (1 day)

- [ ] Implement session token validation
- [ ] Add Solana signature verification
- [ ] Create auth middleware for tools
- [ ] Document security model

### Phase 3: ElizaOS Integration (1 day)

- [ ] Update `plugin-ghostspeak` to use `@elizaos/plugin-mcp`
- [ ] Configure MCP server connection
- [ ] Remove direct action implementations
- [ ] Test agent can call MCP tools

### Phase 4: HTTP Transport (1 day)

- [ ] Add HTTP transport option
- [ ] Expose MCP server via Next.js API route
- [ ] Enable CORS for web-based agents
- [ ] Add rate limiting

### Phase 5: Documentation (1 day)

- [ ] Write MCP server usage guide
- [ ] Document tool schemas
- [ ] Create integration examples
- [ ] Publish to npm

---

## Potential Challenges and Solutions

### Challenge 1: Session Token Validation

**Issue**: MCP tools need to validate user sessions for claiming agents

**Solution**:
```typescript
// Add auth middleware to MCP server
async function validateSession(sessionToken: string): Promise<{ userId: string } | null> {
  const session = await convex.query('auth:validateSession', { sessionToken })
  return session
}

// Use in tool handler
server.tool('claim_agent', ..., async ({ sessionToken, ...params }) => {
  const session = await validateSession(sessionToken)
  if (!session) {
    return { content: [{ type: 'text', text: 'Unauthorized' }], isError: true }
  }
  // ... rest of claim logic
})
```

### Challenge 2: Process Management for ElizaOS

**Issue**: ElizaOS spawns MCP server as subprocess - needs proper lifecycle management

**Solution**: Use MCP plugin's built-in process management:
```json
{
  "mcp": {
    "servers": {
      "ghostspeak": {
        "command": "bunx",
        "args": ["@ghostspeak/mcp-server"],
        "restart": true,
        "timeout": 30000
      }
    }
  }
}
```

### Challenge 3: Real-time Updates

**Issue**: MCP is request/response, no native pub/sub for real-time agent discovery

**Solution**:
- Polling: Agents can periodically call `search_discovered_agents`
- WebSocket extension: MCP supports custom extensions for advanced features
- Server-Sent Events: Use HTTP transport with SSE for notifications

---

## Recommendation

**YES, implement GhostSpeak as an MCP server.**

### Why:

1. **Solves immediate problem**: No more ElizaOS database adapter conflicts
2. **Future-proof**: Industry standard protocol with growing adoption
3. **Broader reach**: Any AI agent can integrate, not just ElizaOS
4. **Simpler architecture**: Less coupling between components
5. **Better DX**: Independent testing, clearer separation of concerns
6. **Ecosystem alignment**: Anthropic (Claude), OpenAI, and major AI platforms support MCP

### Migration Path:

**Week 1:**
- Build standalone MCP server with core tools
- Test independently with MCP Inspector

**Week 2:**
- Integrate with ElizaOS via `@elizaos/plugin-mcp`
- Remove direct action implementations
- Validate against real Convex database

**Week 3:**
- Add HTTP transport for web-based agents
- Document and publish to npm
- Market as "MCP-compatible agent discovery"

### Success Metrics:

- ElizaOS agent can successfully search and claim agents via MCP
- MCP server can be tested independently without ElizaOS
- Other MCP clients (Claude Desktop) can interact with GhostSpeak
- Authentication and authorization work correctly
- Response times < 500ms for all tools

---

## Next Steps

1. **Create MCP server package structure**
2. **Implement first tool** (`search_discovered_agents`) and test with Inspector
3. **Add authentication middleware** for session validation
4. **Integrate with ElizaOS** using `@elizaos/plugin-mcp`
5. **Test end-to-end** with real Convex database and agent claiming flow

---

## References

- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [ElizaOS Plugin Architecture](https://github.com/elizaOS/eliza)
- [Building MCP Servers with TypeScript](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)

---

**Prepared by**: Claude Code
**For**: GhostSpeak Agent Discovery Platform
**Date**: January 2, 2026
