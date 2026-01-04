# GhostSpeak Public REST API

> Universal Agent Identity & Reputation Lookup for AI Agents on Solana

**Status: 🚧 Work In Progress - Deployment Coming Soon**

Free tier public API for querying Ghost identities, scores, and cross-platform reputation.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Start production server
bun start

# Build
bun build
```

## 📡 API Endpoints

### Core Endpoints

**GET /** - API documentation
```bash
curl http://localhost:3001/
```

**GET /health** - Health check
```bash
curl http://localhost:3001/health
```

**GET /stats** - API statistics
```bash
curl http://localhost:3001/stats
```

### Ghost Endpoints

**GET /ghosts/:address** - Get Ghost by Solana address
```bash
curl http://localhost:3001/ghosts/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
```

**GET /ghosts/:address/score** - Get Ghost Score
```bash
curl http://localhost:3001/ghosts/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB/score
```

**GET /ghosts/:address/reputation** - Get detailed reputation breakdown
```bash
curl http://localhost:3001/ghosts/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB/reputation
```

**GET /ghosts/external/:platform/:id** - Get Ghost by external ID
```bash
curl http://localhost:3001/ghosts/external/payai/agent-123
curl http://localhost:3001/ghosts/external/eliza/abc-xyz-789
```

## 🔒 Rate Limiting

**Free Tier:** 100 requests per minute per IP

Inspired by ZAuth's public API model for maximum network effects.

Rate limit headers included in all responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response with:
- `Retry-After` header indicating seconds until retry
- JSON error with retry information

## 🌐 Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Solana Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Convex Database
CONVEX_URL=https://lovely-cobra-639.convex.cloud

# Rate Limiting
RATE_LIMIT=100           # Requests per window
RATE_WINDOW_MS=60000     # Window duration in milliseconds
```

## 📦 Response Types

### Ghost Response
```typescript
{
  address: string;
  owner: string | null;
  status: "Unregistered" | "Registered" | "Claimed" | "Verified";

  // Discovery provenance
  firstTxSignature: string;
  firstSeenTimestamp: number;
  discoverySource: string;
  claimedAt: number | null;

  // Metadata
  agentId: string;
  name: string;
  description: string;
  metadataUri: string;
  serviceEndpoint: string;

  // Cross-platform identity
  externalIdentifiers: {
    platform: string;
    externalId: string;
    verified: boolean;
    verifiedAt: number;
  }[];

  // Reputation
  ghostScore: number;  // 0-1000
  reputationScore: number;
  reputationComponents: {
    source: string;
    score: number;
    weight: number;
    lastUpdated: number;
  }[];

  // Credentials
  didAddress: string | null;
  credentials: string[];

  // Status
  isActive: boolean;
  isVerified: boolean;
  verificationTimestamp: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}
```

### Ghost Score Response
```typescript
{
  address: string;
  score: number;        // 0-1000
  maxScore: number;     // 1000
  components: {
    source: string;
    score: number;
    weight: number;
    lastUpdated: number;
  }[];
  lastUpdated: number;
}
```

### External ID Lookup Response
```typescript
{
  mapping: {
    platform: string;
    externalId: string;
    ghostAddress: string;
    verified: boolean;
    verifiedAt: number | null;
    createdAt: number;
  };
  ghost: Ghost;  // Full Ghost data
}
```

### Error Response
```typescript
{
  error: string;        // Error type
  message: string;      // Human-readable message
  code?: string;        // Error code (e.g., "GHOST_NOT_FOUND")
  details?: unknown;    // Additional error details
}
```

## 🏗️ Architecture

```
src/
├── index.ts              # Main Bun.serve server
├── routes/
│   ├── ghosts.ts         # Ghost lookup routes
│   └── health.ts         # Health & stats routes
├── services/
│   └── ghost-service.ts  # Solana RPC interaction & Borsh decoding
└── middleware/
    └── rate-limiter.ts   # Rate limiting logic
```

**Dependencies:**
- `@ghostspeak/shared` - Shared types, Convex client, and Solana utilities
- `@solana/rpc` - Solana RPC client (v5)

## 🔧 Technology Stack

- **Runtime:** Bun (fast JavaScript runtime)
- **Server:** Bun.serve (built-in HTTP server)
- **Blockchain:** Solana Web3.js v5 (modular architecture)
- **Rate Limiting:** In-memory with cleanup
- **CORS:** Enabled for all origins

## 📊 Monitoring

The API tracks:
- Request counts per client IP
- RPC connection health and latency
- Server uptime
- Rate limit violations

Access real-time stats at `/stats` endpoint.

## 🚢 Deployment

### Railway (Recommended)

Railway provides native Bun support with zero configuration.

**1. Install Railway CLI:**
```bash
npm install -g @railway/cli
```

**2. Login and Deploy:**
```bash
railway login
railway init
railway up
```

**3. Set Environment Variables** (in Railway dashboard):
```env
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
CONVEX_URL=https://lovely-cobra-639.convex.cloud
SOLANA_NETWORK=devnet
RATE_LIMIT=100
RATE_WINDOW_MS=60000
NODE_ENV=production
```

**4. Generate Public Domain:**
```bash
railway domain
```

**Configuration:** Railway automatically detects `railway.json` and uses Railpack builder for optimal Bun performance.

---

### Docker (Fly.io, Render, etc.)

For platforms that use Docker:

**Deploy to Fly.io:**
```bash
fly launch  # Auto-detects Bun and creates Dockerfile
fly deploy
```

**Deploy to Render:**
1. Connect your GitHub repo
2. Select "Docker" as environment
3. Set environment variables in dashboard
4. Deploy automatically on push

The included `Dockerfile` uses Bun's official slim image for production.

---

### Local Production Test
```bash
# Build (optional - for testing compiled version)
bun build src/index.ts --outdir dist --target bun --minify

# Run production mode
NODE_ENV=production bun start
```

---

### Why Not Vercel?

⚠️ **Vercel does not support `Bun.serve()` applications**. Vercel's Bun runtime only works with framework adapters (Next.js, Express, Hono). This API uses pure `Bun.serve()` which requires a long-running server, incompatible with Vercel's serverless architecture.

**Recommended platforms:** Railway, Fly.io, Render, Koyeb

## 📝 Implementation Status

✅ **Completed:**
- Solana RPC integration with Web3.js v5
- Borsh deserialization for on-chain Agent accounts
- PDA derivation for Agent and ExternalIdMapping accounts
- Convex integration for discovery statistics (52 discovered ghosts)
- Real-time stats from Convex database
- Health monitoring with RPC latency tracking
- Rate limiting with per-IP tracking

🚧 **In Progress:**
- External ID mapping endpoints (waiting for on-chain ExternalIdMapping accounts)
- On-chain Agent PDA queries (discovery tracked in Convex, claiming coming soon)

💡 **Production Notes:**
- Use a load balancer for horizontal scaling
- Consider Redis for distributed rate limiting
- Monitor RPC latency and switch endpoints if needed

## 🔗 Links

- **GitHub:** https://github.com/Dexploarer/api
- **Program ID (Devnet):** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
- **Live API:** 🚧 Deployment in progress (Railway/Zeabur)
- **Website:** https://ghostspeak.ai

## 🚧 Deployment Status

The API is fully functional locally and ready for deployment. Deployment to production hosting (Railway or Zeabur) is scheduled for the coming weeks.

**To test locally:**
```bash
git clone https://github.com/Dexploarer/api.git
cd api
bun install
bun dev
# API available at http://localhost:3001
```

## 📜 License

MIT © GhostSpeak Protocol
