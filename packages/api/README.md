# GhostSpeak Public REST API

> Universal Agent Identity & Reputation Lookup for AI Agents on Solana

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
│   └── ghost-service.ts  # Solana RPC interaction
├── middleware/
│   └── rate-limiter.ts   # Rate limiting logic
└── types/
    └── ghost.ts          # TypeScript definitions
```

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

### Local Development
```bash
bun dev
```

### Production (Railway, Fly.io, etc.)
```bash
# Set environment variables
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export SOLANA_NETWORK=mainnet
export PORT=3001

# Start server
bun start
```

### Docker
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY src ./src
CMD ["bun", "src/index.ts"]
```

## 📝 Notes

- The API currently returns mock data from `GhostService` (Borsh deserialization not yet implemented)
- PDA derivation functions need implementation for cross-platform lookups
- Stats endpoint counts need implementation via program account queries
- Production deployment should use a load balancer for horizontal scaling

## 🔗 Links

- **Program ID (Devnet):** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
- **Documentation:** https://docs.ghostspeak.ai/api
- **GitHub:** https://github.com/ghostspeak-ai/ghostspeak
- **Website:** https://ghostspeak.ai

## 📜 License

MIT © GhostSpeak Protocol
