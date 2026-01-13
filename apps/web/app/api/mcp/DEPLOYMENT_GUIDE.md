# GhostSpeak MCP Server - Deployment Guide

**Status**: ✅ PRODUCTION READY
**Last Updated**: January 2, 2026
**Endpoint**: `/api/mcp`

---

## Overview

The GhostSpeak MCP server is deployed as a Next.js API route at `/api/mcp`. It provides JSON-RPC 2.0 compatible endpoints for AI agents to discover and claim Ghost agents on-chain.

### Key Features

- ✅ **Lightweight**: No MCP SDK dependency in web package
- ✅ **JSON-RPC 2.0**: Standard protocol, works with any MCP client
- ✅ **Same Domain**: Deployed at `/api/mcp` alongside web app
- ✅ **Real Data**: Direct Convex database queries (52 discovered agents)
- ✅ **Secure**: Ownership validation prevents cross-wallet claiming
- ✅ **CORS Enabled**: Accessible from external clients

---

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│          Production Domain                   │
│        https://ghostspeak.ai                 │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│   Web App    │      │  MCP API Route   │
│   (Next.js)  │      │   /api/mcp       │
└──────────────┘      └──────────────────┘
                              │
                              │ ConvexHttpClient
                              ▼
                    ┌──────────────────┐
                    │ Convex Database  │
                    │  ghostDiscovery  │
                    └──────────────────┘
```

---

## File Structure

```
packages/web/app/api/mcp/
├── route.ts                    # Main HTTP endpoint (243 lines)
├── HTTP_TEST_RESULTS.md        # Test documentation
└── DEPLOYMENT_GUIDE.md         # This file
```

---

## Environment Variables

### Required

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Optional (Production)

```bash
# API token for authenticated access (future enhancement)
MCP_API_TOKEN=your-secret-token

# Rate limiting (future enhancement)
MCP_RATE_LIMIT_PER_MINUTE=60
```

---

## Deployment to Vercel (Current Setup)

The MCP endpoint deploys automatically with the Next.js web app.

### Steps

1. **Push to GitHub**:

   ```bash
   git add packages/web/app/api/mcp/route.ts
   git commit -m "Add MCP HTTP endpoint"
   git push origin main
   ```

2. **Vercel Auto-Deploy**:
   - Vercel detects changes in `packages/web/`
   - Builds and deploys Next.js app
   - API route available at `https://ghostspeak.ai/api/mcp`

3. **Verify Deployment**:

   ```bash
   curl https://ghostspeak.ai/api/mcp | jq .
   ```

   Expected response:

   ```json
   {
     "name": "ghostspeak-discovery",
     "version": "1.0.0",
     "protocol": "MCP-compatible",
     "transport": "HTTP/JSON-RPC",
     "endpoint": "/api/mcp",
     "capabilities": {
       "tools": ["search_discovered_agents", "claim_agent", "get_discovery_stats"],
       "resources": ["discovery://stats"]
     }
   }
   ```

---

## Testing After Deployment

### 1. Service Discovery

```bash
curl https://ghostspeak.ai/api/mcp | jq .
```

### 2. List Tools

```bash
curl -X POST https://ghostspeak.ai/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

### 3. Get Discovery Stats

```bash
curl -X POST https://ghostspeak.ai/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_discovery_stats",
      "arguments": {}
    }
  }' | jq .
```

### 4. Search Discovered Agents

```bash
curl -X POST https://ghostspeak.ai/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_discovered_agents",
      "arguments": {
        "status": "discovered",
        "limit": 5
      }
    }
  }' | jq .
```

---

## Integration with ElizaOS

Once deployed, update your ElizaOS agent to use the HTTP endpoint:

### Option 1: Using @elizaos/plugin-mcp (Recommended)

```typescript
// packages/plugin-ghostspeak/src/index.ts
import mcpPlugin from '@elizaos/plugin-mcp'

export const ghostspeakPlugin: Plugin = {
  name: 'ghostspeak-plugin',
  plugins: [mcpPlugin],

  settings: {
    mcp: {
      servers: {
        ghostspeak: {
          transport: 'http',
          url: 'https://ghostspeak.ai/api/mcp',
          // Optional: Add authentication
          headers: {
            Authorization: `Bearer ${process.env.GHOSTSPEAK_API_TOKEN}`,
          },
        },
      },
    },
  },
}
```

### Option 2: Direct JSON-RPC Calls

```typescript
// packages/plugin-ghostspeak/src/actions/searchAgents.ts
import { Action } from '@elizaos/core'

export const searchAgentsAction: Action = {
  name: 'SEARCH_AGENTS',
  description: 'Search for discovered Ghost agents',

  handler: async (runtime, message, state, options, callback) => {
    try {
      const response = await fetch('https://ghostspeak.ai/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'search_discovered_agents',
            arguments: { status: 'discovered', limit: 10 },
          },
        }),
      })

      const result = await response.json()
      const data = JSON.parse(result.result.content[0].text)

      await callback({
        text: `Found ${data.count} discovered agents. Total in database: ${data.stats.total}`,
      })

      return { success: true, data }
    } catch (error) {
      await callback({
        text: 'Failed to search agents',
        error: true,
      })
      return { success: false, error }
    }
  },
}
```

---

## Monitoring & Debugging

### View Logs (Vercel)

```bash
vercel logs https://ghostspeak.ai --follow
```

### Add Custom Logging

Edit `packages/web/app/api/mcp/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Log incoming requests
  console.log('[MCP] Incoming request:', {
    method: body.method,
    timestamp: new Date().toISOString(),
  })

  // ... rest of handler
}
```

### Monitor Tool Usage

```typescript
// Track tool calls
const toolCallMetrics = {
  search_discovered_agents: 0,
  claim_agent: 0,
  get_discovery_stats: 0,
}

switch (name) {
  case 'search_discovered_agents':
    toolCallMetrics.search_discovered_agents++
    console.log('[MCP] Tool usage:', toolCallMetrics)
  // ...
}
```

---

## Security Considerations

### Current Security Model

1. **Ownership Validation**: Users can only claim agents matching their wallet address
2. **CORS**: Open to all origins (suitable for public API)
3. **No Authentication**: Currently open endpoint

### Production Security (Future Enhancements)

#### 1. Add API Token Authentication

```typescript
// packages/web/app/api/mcp/route.ts
export async function POST(request: NextRequest) {
  // Validate API token
  const authHeader = request.headers.get('Authorization')
  const expectedToken = process.env.MCP_API_TOKEN

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return Response.json(jsonRpcError(null, -32001, 'Unauthorized'), { status: 401 })
  }

  // ... rest of handler
}
```

#### 2. Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return Response.json(jsonRpcError(null, -32003, 'Rate limit exceeded'), { status: 429 })
  }

  // ... rest of handler
}
```

#### 3. Session-based Authentication

```typescript
// Use existing Convex authentication
import { getAuthToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = await getAuthToken(request)

  if (!token) {
    return Response.json(jsonRpcError(null, -32001, 'Unauthorized'), { status: 401 })
  }

  // Pass token to Convex queries for authenticated access
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
    auth: token,
  })

  // ... rest of handler
}
```

---

## Performance Optimization

### Current Performance

- Service discovery: ~20ms
- Stats query: ~100ms
- Agent search: ~150ms

### Caching Strategy (Future)

```typescript
import { unstable_cache } from 'next/cache'

// Cache stats for 60 seconds
const getCachedStats = unstable_cache(
  async () => {
    return await convex.query(api.ghostDiscovery.getDiscoveryStats, {})
  },
  ['discovery-stats'],
  { revalidate: 60 }
)

// Use cached version
case 'get_discovery_stats':
  result = {
    content: [{
      type: 'text',
      text: JSON.stringify({
        stats: await getCachedStats(),
        timestamp: Date.now()
      })
    }]
  }
  break
```

---

## Troubleshooting

### Issue: "Failed to connect to Convex"

**Cause**: `NEXT_PUBLIC_CONVEX_URL` not set

**Fix**:

```bash
# Add to Vercel environment variables
vercel env add NEXT_PUBLIC_CONVEX_URL
# Enter: https://your-deployment.convex.cloud
```

### Issue: "CORS errors when calling from external domain"

**Cause**: Browser blocking cross-origin requests

**Fix**: CORS headers already configured in route.ts:

```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Issue: "Tool not triggering in ElizaOS"

**Cause**: MCP plugin not configured correctly

**Fix**: Verify plugin settings:

```typescript
settings: {
  mcp: {
    servers: {
      ghostspeak: {
        transport: 'http', // NOT 'stdio'
        url: 'https://ghostspeak.ai/api/mcp'
      }
    }
  }
}
```

---

## Rollback Plan

If deployment issues occur:

1. **Revert API Route**:

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Use Standalone MCP Server** (fallback):

   ```bash
   # Run standalone server locally
   cd packages/mcp-server-ghostspeak
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud bun run dev
   ```

3. **Update ElizaOS to use stdio transport**:
   ```typescript
   settings: {
     mcp: {
       servers: {
         ghostspeak: {
           command: 'bunx',
           args: ['@ghostspeak/mcp-server'],
           env: { NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL }
         }
       }
     }
   }
   ```

---

## Next Steps

### Immediate (Production Deployment)

- [ ] Deploy to Vercel (automatic on push to main)
- [ ] Verify endpoint at `https://ghostspeak.ai/api/mcp`
- [ ] Update ElizaOS plugin to use HTTP transport
- [ ] Test end-to-end with ElizaOS agent

### Short-term Enhancements

- [ ] Add API token authentication
- [ ] Implement rate limiting (60 req/min)
- [ ] Add request logging/analytics
- [ ] Cache stats queries (60s TTL)

### Long-term Roadmap

- [ ] OAuth integration for user authentication
- [ ] Webhook notifications for agent claims
- [ ] WebSocket support for real-time updates
- [ ] GraphQL endpoint for advanced queries
- [ ] Multi-signature support for enterprise agents

---

## Support

For issues or questions:

1. **Check logs**: `vercel logs https://ghostspeak.ai --follow`
2. **Test locally**: `bun run dev` and test at `http://localhost:3000/api/mcp`
3. **Review test results**: See `HTTP_TEST_RESULTS.md`
4. **GitHub Issues**: https://github.com/ghostspeak/ghostspeak/issues

---

**Deployment Status**: ✅ READY FOR PRODUCTION
**Last Tested**: January 2, 2026
**Test Results**: All 7 tests passing (see HTTP_TEST_RESULTS.md)
