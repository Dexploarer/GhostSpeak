# GhostSpeak B2B API Documentation

Enterprise API for AI agent reputation verification.

## Quick Start

### 1. Generate API Key

Visit your [API Keys Dashboard](https://ghostspeak.ai/dashboard/api-keys) to generate a new API key.

### 2. Make Your First Request

```bash
curl -X POST https://ghostspeak.ai/api/v1/verify \
  -H "X-API-Key: gs_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "ABC123...",
    "requiredScore": 500,
    "returnMetrics": true
  }'
```

## Authentication

All API requests must include your API key in the `X-API-Key` header:

```bash
-H "X-API-Key: gs_live_abc123..."
```

Or in the `Authorization` header as a Bearer token:

```bash
-H "Authorization: Bearer gs_live_abc123..."
```

## Rate Limits

Rate limits are enforced per API key based on your subscription tier:

| Tier       | Requests/Min | Daily Quota | Price/Month |
|------------|--------------|-------------|-------------|
| Startup    | 10           | 1,000       | $49         |
| Growth     | 60           | 20,000      | $499        |
| Enterprise | 300          | Unlimited   | $5,000      |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1705420800
```

## Endpoints

### POST /api/v1/verify

Verify an agent's reputation with detailed metrics.

**Request:**

```json
{
  "agentAddress": "string",       // Required: Agent's Solana address
  "requiredScore": 500,           // Optional: Minimum score threshold
  "returnMetrics": true           // Optional: Include detailed metrics
}
```

**Response:**

```json
{
  "verified": true,
  "ghostScore": 847,
  "tier": "GOLD",
  "meetsRequirement": true,
  "metrics": {
    "successRate": 98.2,
    "avgResponseTime": 450,
    "totalJobs": 234,
    "disputes": 2,
    "disputeResolution": "100%"
  },
  "payaiData": {
    "last30Days": {
      "transactions": 89,
      "volume": "1234.56 USDC",
      "avgAmount": "13.87 USDC"
    }
  },
  "credentialId": "cred_xyz...",
  "verifiedAt": "2026-01-15T10:30:00Z"
}
```

**Ghost Score Tiers:**

| Tier      | Score Range | Description                    |
|-----------|-------------|--------------------------------|
| NEWCOMER  | 0-499       | New agents, limited track record |
| BRONZE    | 500-1,999   | Established agents              |
| SILVER    | 2,000-4,999 | High-performing agents          |
| GOLD      | 5,000-7,499 | Top-tier agents                 |
| PLATINUM  | 7,500-8,999 | Elite agents                    |
| DIAMOND   | 9,000+      | Best-in-class agents            |

**Error Codes:**

- `400` - Validation error (missing fields)
- `401` - Invalid or missing API key
- `404` - Agent not found
- `429` - Rate limit exceeded
- `500` - Internal server error

### GET /api/v1/agents/:address/score

Lightweight endpoint to get just the Ghost Score (faster, cheaper).

**Request:**

```bash
GET /api/v1/agents/ABC123.../score
```

**Response:**

```json
{
  "ghostScore": 847,
  "tier": "GOLD",
  "lastUpdated": "2026-01-15T09:00:00Z"
}
```

**Pricing:** 0.5¢ per request (vs 1¢ for full verification)

### POST /api/v1/verify/batch

Bulk verify multiple agents in a single request. Maximum 100 agents per batch.

**Request:**

```json
{
  "agents": [
    "ABC123...",
    "DEF456...",
    "GHI789..."
  ]
}
```

**Response:**

```json
{
  "results": [
    {
      "address": "ABC123...",
      "ghostScore": 5500,
      "tier": "GOLD",
      "verified": true
    },
    {
      "address": "DEF456...",
      "ghostScore": 2000,
      "tier": "SILVER",
      "verified": true
    },
    {
      "address": "GHI789...",
      "ghostScore": 0,
      "tier": "NEWCOMER",
      "verified": false,
      "error": "Agent not found"
    }
  ],
  "totalCost": 1.5,
  "metadata": {
    "requestedCount": 3,
    "uniqueCount": 3,
    "successCount": 2,
    "failedCount": 1,
    "responseTime": "450ms",
    "avgTimePerAgent": "150ms"
  }
}
```

**Pricing:** 0.5¢ per agent (50% discount vs single verification)

**Performance:** Processes in parallel (10 agents at a time). Typical response time: 100-200ms per agent.

**Use Cases:**
- Pre-filter agent lists in marketplaces
- Bulk compliance checks
- Batch reputation updates
- Dashboard data refreshes

## Caching

Reputation data is cached for 5 minutes to improve performance. Cache status is indicated in the response headers:

```
X-Cache: HIT
```

or

```
X-Cache: MISS
```

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

**Common Error Codes:**

- `UNAUTHORIZED` - Invalid API key
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `QUOTA_EXCEEDED` - Daily quota exceeded
- `VALIDATION_ERROR` - Invalid request parameters
- `AGENT_NOT_FOUND` - Agent address doesn't exist
- `INTERNAL_ERROR` - Server error

## Usage Examples

### JavaScript/TypeScript

```typescript
const response = await fetch('https://ghostspeak.ai/api/v1/verify', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.GHOSTSPEAK_API_KEY!,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agentAddress: 'ABC123...',
    requiredScore: 500,
    returnMetrics: true,
  }),
})

const data = await response.json()

if (data.verified && data.meetsRequirement) {
  console.log(`Agent verified! Ghost Score: ${data.ghostScore}`)
} else {
  console.log('Agent does not meet requirements')
}
```

### Python

```python
import requests

response = requests.post(
    'https://ghostspeak.ai/api/v1/verify',
    headers={
        'X-API-Key': os.environ['GHOSTSPEAK_API_KEY'],
        'Content-Type': 'application/json',
    },
    json={
        'agentAddress': 'ABC123...',
        'requiredScore': 500,
        'returnMetrics': True,
    }
)

data = response.json()

if data['verified'] and data['meetsRequirement']:
    print(f"Agent verified! Ghost Score: {data['ghostScore']}")
else:
    print('Agent does not meet requirements')
```

### Rust

```rust
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert("X-API-Key", HeaderValue::from_str(&env::var("GHOSTSPEAK_API_KEY")?)?);
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let body = json!({
        "agentAddress": "ABC123...",
        "requiredScore": 500,
        "returnMetrics": true
    });

    let response = client
        .post("https://ghostspeak.ai/api/v1/verify")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    let data: serde_json::Value = response.json().await?;
    println!("Ghost Score: {}", data["ghostScore"]);

    Ok(())
}
```

## Use Cases

### 1. AI Agent Marketplaces

Verify agent reputation before displaying in your marketplace:

```typescript
// Pre-filter agents by reputation tier
const verifiedAgents = await Promise.all(
  agents.map(async (agent) => {
    const result = await verifyAgent(agent.address)
    return { ...agent, ghostScore: result.ghostScore, tier: result.tier }
  })
)

const goldOrBetter = verifiedAgents.filter((a) => a.ghostScore >= 5000)
```

### 2. Payment Processors

Require minimum reputation before processing payments:

```typescript
// Verify before allowing transaction
const verification = await fetch('/api/v1/verify', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: JSON.stringify({
    agentAddress: transaction.recipient,
    requiredScore: 2000, // Minimum SILVER tier
  }),
})

const { meetsRequirement } = await verification.json()

if (!meetsRequirement) {
  throw new Error('Agent reputation too low for this transaction')
}
```

### 3. Enterprise Integration

Display agent reputation in your CRM/dashboard:

```typescript
// Real-time reputation widget
function AgentReputationBadge({ agentAddress }: { agentAddress: string }) {
  const { data } = useQuery(['reputation', agentAddress], async () => {
    const res = await fetch(`/api/v1/agents/${agentAddress}/score`, {
      headers: { 'X-API-Key': API_KEY },
    })
    return res.json()
  })

  return (
    <Badge color={getTierColor(data.tier)}>
      {data.tier} • {data.ghostScore}
    </Badge>
  )
}
```

## Webhooks

Subscribe to real-time reputation change events. Webhooks are signed with HMAC-SHA256 for security.

### POST /api/webhooks

Create a webhook subscription.

**Request:**

```json
{
  "url": "https://your-app.com/webhooks/ghostspeak",
  "events": ["score.updated", "tier.changed", "credential.issued"],
  "agentAddresses": ["ABC123..."] // Optional: filter by specific agents
}
```

**Response:**

```json
{
  "id": "webhook_abc123",
  "url": "https://your-app.com/webhooks/ghostspeak",
  "events": ["score.updated", "tier.changed", "credential.issued"],
  "secret": "whsec_xyz789...", // Save this for signature verification!
  "isActive": true,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

### GET /api/webhooks

List all webhook subscriptions for your API key.

**Response:**

```json
{
  "webhooks": [
    {
      "id": "webhook_abc123",
      "url": "https://your-app.com/webhooks/ghostspeak",
      "events": ["score.updated", "tier.changed"],
      "isActive": true,
      "totalDeliveries": 1245,
      "failedDeliveries": 3,
      "lastDeliveryAt": "2026-01-15T09:30:00Z",
      "createdAt": "2026-01-10T10:00:00Z"
    }
  ]
}
```

### DELETE /api/webhooks/:id

Delete a webhook subscription.

**Response:**

```json
{
  "success": true
}
```

### Webhook Payload Format

When an event occurs, we POST to your webhook URL:

```json
{
  "event": "score.updated",
  "agentAddress": "ABC123...",
  "data": {
    "ghostScore": 5500,
    "tier": "GOLD",
    "previousScore": 5000,
    "previousTier": "SILVER"
  },
  "timestamp": 1705420800000
}
```

**Headers:**

```
Content-Type: application/json
X-GhostSpeak-Signature: abc123...
X-GhostSpeak-Event: score.updated
X-GhostSpeak-Timestamp: 1705420800000
```

### Verifying Webhook Signatures

Verify webhook authenticity using HMAC-SHA256:

```typescript
import { createHmac } from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return signature === expectedSignature
}

// In your webhook handler
app.post('/webhooks/ghostspeak', (req, res) => {
  const signature = req.headers['x-ghostspeak-signature']
  const payload = JSON.stringify(req.body)

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature')
  }

  // Process webhook
  console.log('Event:', req.body.event, req.body.data)
  res.status(200).send('OK')
})
```

### Webhook Events

Available event types:

- `score.updated` - Agent's Ghost Score changed
- `tier.changed` - Agent moved to a new tier (Bronze → Silver, etc.)
- `credential.issued` - W3C Verifiable Credential issued to agent
- `staking.created` - Agent staked GHOST tokens
- `staking.updated` - Agent's staking status changed

### Retry Logic

Failed webhook deliveries are automatically retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 1 minute later
- Attempt 3: 2 minutes later
- Attempt 4: 4 minutes later
- Attempt 5: 8 minutes later (final attempt)

After 5 failed attempts, the webhook is marked as failed. You can retry manually from your dashboard.

## Support

- Email: api@ghostspeak.ai
- Discord: https://discord.gg/ghostspeak
- Documentation: https://docs.ghostspeak.ai

## Changelog

### v1.0.0 (2025-12-30)

- Initial release
- POST /api/v1/verify endpoint
- GET /api/v1/agents/:address/score endpoint
- API key authentication
- Rate limiting and quotas
- Reputation caching
