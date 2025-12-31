# GhostSpeak B2B API - Quick Start Guide

Get started with the GhostSpeak B2B API in under 5 minutes.

## Step 1: Get Your API Key (30 seconds)

1. Visit https://ghostspeak.ai/dashboard/api-keys
2. Click "Create API Key"
3. Choose your tier:
   - **Startup** ($49/mo): 1,000 verifications, 5 team members
   - **Growth** ($499/mo): 20,000 verifications, 20 team members
   - **Enterprise** (Custom): Unlimited everything
4. Copy and save your API key (starts with `gs_live_...`)

## Step 2: Your First API Call (1 minute)

### Verify a Single Agent

```bash
curl -X POST https://ghostspeak.ai/api/v1/verify \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "ABC123xyz...",
    "requiredScore": 500,
    "returnMetrics": true
  }'
```

**Expected Response:**
```json
{
  "verified": true,
  "ghostScore": 5500,
  "tier": "GOLD",
  "meetsRequirement": true,
  "metrics": {
    "successRate": 98.2,
    "totalJobs": 234
  }
}
```

### Bulk Verify Agents

```bash
curl -X POST https://ghostspeak.ai/api/v1/verify/batch \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "agents": [
      "Agent1Address...",
      "Agent2Address...",
      "Agent3Address..."
    ]
  }'
```

**Expected Response:**
```json
{
  "results": [
    { "address": "Agent1...", "ghostScore": 5500, "tier": "GOLD", "verified": true },
    { "address": "Agent2...", "ghostScore": 2000, "tier": "SILVER", "verified": true },
    { "address": "Agent3...", "ghostScore": 500, "tier": "BRONZE", "verified": true }
  ],
  "totalCost": 1.5,
  "metadata": {
    "successCount": 3,
    "responseTime": "450ms"
  }
}
```

## Step 3: Set Up Webhooks (2 minutes)

### Create Webhook Subscription

```bash
curl -X POST https://ghostspeak.ai/api/webhooks \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/ghostspeak",
    "events": ["score.updated", "tier.changed"]
  }'
```

**Save the webhook secret from the response!**

### Verify Webhook Signatures

```javascript
// verify-webhook.js
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return signature === hmac.digest('hex')
}

// In your webhook handler
app.post('/webhooks/ghostspeak', (req, res) => {
  const signature = req.headers['x-ghostspeak-signature']
  const payload = JSON.stringify(req.body)

  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature')
  }

  console.log('Event:', req.body.event, req.body.data)
  res.send('OK')
})
```

## Step 4: View API Docs (30 seconds)

Visit https://ghostspeak.ai/api-docs for:
- Interactive API testing
- Code examples (cURL, JavaScript, Python, Rust)
- Complete API reference
- Try-it-out functionality

## Common Use Cases

### 1. Pre-filter Agents in Marketplace

```typescript
// Get all agents from your database
const agents = await db.agents.findMany()

// Bulk verify their reputation
const verification = await fetch('/api/v1/verify/batch', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: JSON.stringify({
    agents: agents.map(a => a.address)
  })
})

const { results } = await verification.json()

// Filter for high-reputation agents
const goldAgents = results.filter(r => r.tier === 'GOLD')
```

### 2. Verify Before Payment

```typescript
// Before processing payment
const verification = await fetch('/api/v1/verify', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: JSON.stringify({
    agentAddress: transaction.recipient,
    requiredScore: 2000 // Minimum SILVER tier
  })
})

const { meetsRequirement } = await verification.json()

if (!meetsRequirement) {
  throw new Error('Agent reputation too low')
}

// Process payment...
```

### 3. Display Reputation Badge

```typescript
// Fetch agent score
const score = await fetch(
  `/api/v1/agents/${agentAddress}/score`,
  { headers: { 'X-API-Key': API_KEY } }
)

const { ghostScore, tier } = await score.json()

// Display badge
return (
  <Badge color={getTierColor(tier)}>
    {tier} • {ghostScore}
  </Badge>
)
```

## Pricing Cheat Sheet

| Action | Cost | Speed |
|--------|------|-------|
| Single verification | 1¢ | ~100ms |
| Get score only | 0.5¢ | ~50ms |
| Batch verification | 0.5¢ per agent | ~20ms per agent |
| Webhook delivery | Free | Real-time |

## Error Handling

```typescript
try {
  const response = await fetch('/api/v1/verify', {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: JSON.stringify({ agentAddress })
  })

  if (!response.ok) {
    const error = await response.json()
    switch (error.code) {
      case 'UNAUTHORIZED':
        console.error('Invalid API key')
        break
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limit exceeded')
        break
      case 'AGENT_NOT_FOUND':
        console.error('Agent not found')
        break
      default:
        console.error('Unknown error:', error)
    }
    return
  }

  const data = await response.json()
  console.log('Verified:', data.ghostScore)
} catch (error) {
  console.error('Request failed:', error)
}
```

## Rate Limits

Check rate limit headers in every response:

```
X-RateLimit-Limit: 60          (requests per minute)
X-RateLimit-Remaining: 59      (remaining requests)
X-RateLimit-Reset: 1705420800  (unix timestamp)
```

## Ghost Score Tiers

| Tier | Score Range | Description |
|------|-------------|-------------|
| NEWCOMER | 0-499 | New agents |
| BRONZE | 500-1,999 | Established |
| SILVER | 2,000-4,999 | High-performing |
| GOLD | 5,000-7,499 | Top-tier |
| PLATINUM | 7,500-8,999 | Elite |
| DIAMOND | 9,000+ | Best-in-class |

## Webhook Events

| Event | Trigger |
|-------|---------|
| `score.updated` | Ghost Score changed |
| `tier.changed` | Agent tier changed |
| `credential.issued` | W3C credential issued |
| `staking.created` | Agent staked tokens |
| `staking.updated` | Staking status changed |

## Team Management

### Invite Team Member

```bash
# Via API (coming soon)
# For now, use dashboard: /dashboard/team

# Or send direct invite link
https://ghostspeak.ai/invite?token=abc123...
```

### Role Permissions

| Role | Manage Members | Manage API Keys | View Billing |
|------|----------------|-----------------|--------------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Developer | ❌ | ✅ | ❌ |
| Viewer | ❌ | ❌ | ❌ |

## Next Steps

1. **Read the full docs**: https://ghostspeak.ai/api-docs
2. **Join Discord**: https://discord.gg/ghostspeak
3. **Email support**: api@ghostspeak.ai
4. **Enterprise sales**: enterprise@ghostspeak.ai

## Testing Webhooks

Use webhook.site to test webhook delivery:

1. Visit https://webhook.site
2. Copy your unique URL
3. Create webhook subscription with that URL
4. Trigger an event (update Ghost Score)
5. See the webhook appear on webhook.site

## Code Examples

### TypeScript/JavaScript

```typescript
import fetch from 'node-fetch'

const API_KEY = process.env.GHOSTSPEAK_API_KEY

async function verifyAgent(address: string) {
  const response = await fetch('https://ghostspeak.ai/api/v1/verify', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentAddress: address,
      returnMetrics: true,
    }),
  })

  return await response.json()
}

const result = await verifyAgent('ABC123...')
console.log(`Ghost Score: ${result.ghostScore}`)
```

### Python

```python
import os
import requests

API_KEY = os.environ['GHOSTSPEAK_API_KEY']

def verify_agent(address):
    response = requests.post(
        'https://ghostspeak.ai/api/v1/verify',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
        },
        json={
            'agentAddress': address,
            'returnMetrics': True,
        }
    )
    return response.json()

result = verify_agent('ABC123...')
print(f"Ghost Score: {result['ghostScore']}")
```

### Rust

```rust
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = std::env::var("GHOSTSPEAK_API_KEY")?;
    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert("X-API-Key", HeaderValue::from_str(&api_key)?);
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let body = json!({
        "agentAddress": "ABC123...",
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

## Troubleshooting

### "Invalid API key"

- Check your API key is correct
- Ensure it starts with `gs_live_` (not `gs_test_`)
- Verify the key is active in dashboard

### "Rate limit exceeded"

- Check `X-RateLimit-Reset` header for reset time
- Upgrade to higher tier for more requests
- Implement exponential backoff

### "Agent not found"

- Verify the agent address is correct
- Check if the agent has any on-chain activity
- Wait for blockchain sync (up to 5 minutes)

### Webhook not receiving events

- Check webhook URL is publicly accessible
- Verify HTTPS (not HTTP)
- Check webhook endpoint responds within 10 seconds
- Review webhook delivery logs in dashboard

## Best Practices

1. **Cache results** for 5 minutes to reduce costs
2. **Use batch endpoint** for multiple agents (50% cheaper)
3. **Verify webhook signatures** to prevent spoofing
4. **Handle rate limits** gracefully with retries
5. **Monitor usage** in API dashboard

---

**Ready to start?** Get your API key at https://ghostspeak.ai/dashboard/api-keys

**Need help?** Email api@ghostspeak.ai or join our Discord
