# GhostSpeak B2B API Examples

This directory contains examples and test utilities for the GhostSpeak B2B API.

## Files

### 1. `verify-webhook-signature.ts`

Demonstrates how to verify webhook signatures using HMAC-SHA256.

**Features:**
- Signature verification function
- Express.js webhook handler example
- Next.js API route webhook handler example
- Event processing examples
- Local testing utility

**Usage:**

```typescript
import { verifyWebhookSignature } from './verify-webhook-signature'

// In your webhook handler
const signature = req.headers['x-ghostspeak-signature']
const payload = JSON.stringify(req.body)
const secret = process.env.GHOSTSPEAK_WEBHOOK_SECRET

if (!verifyWebhookSignature(payload, signature, secret)) {
  return res.status(401).send('Invalid signature')
}

// Process webhook...
```

**Run test:**

```bash
bun run examples/verify-webhook-signature.ts
```

### 2. `test-batch-verification.ts`

Test utility for bulk agent verification endpoint.

**Features:**
- Batch verification testing
- Performance benchmarking
- Cost comparison (batch vs individual)
- Deduplication testing
- Tier distribution analysis

**Usage:**

```bash
# Set your API key
export GHOSTSPEAK_API_KEY="gs_live_..."

# Run all tests
bun run examples/test-batch-verification.ts

# Or use programmatically
import { testBatchVerification, generateTestAgents } from './test-batch-verification'

const agents = generateTestAgents(50)
await testBatchVerification(apiKey, agents)
```

**Test Suite:**

1. **Small Batch (10 agents)** - Quick verification test
2. **Medium Batch (50 agents)** - Typical use case
3. **Large Batch (100 agents)** - Maximum batch size
4. **Deduplication Test** - Verify duplicate removal
5. **Cost Comparison** - Batch vs individual pricing

**Expected Output:**

```
🧪 Testing batch verification with 50 agents...

✅ Batch verification completed!

📊 Summary:
   Total agents: 50
   Unique agents: 50
   Verified: 48
   Failed: 2
   Total cost: $0.25
   Response time: 950ms
   Avg per agent: 19ms
   Client duration: 1020ms

🏆 Tier Distribution:
   GOLD: 15 agents
   SILVER: 20 agents
   BRONZE: 10 agents
   NEWCOMER: 3 agents

⚡ Performance:
   ✅ Excellent (<50ms per agent)
```

## API Examples

### Batch Verification

```typescript
const response = await fetch('https://ghostspeak.ai/api/v1/verify/batch', {
  method: 'POST',
  headers: {
    'X-API-Key': 'gs_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agents: [
      'AgentAddress1...',
      'AgentAddress2...',
      'AgentAddress3...',
    ],
  }),
})

const data = await response.json()
console.log(`Verified ${data.metadata.successCount} agents`)
console.log(`Total cost: $${data.totalCost / 100}`)
```

### Create Webhook Subscription

```typescript
const response = await fetch('https://ghostspeak.ai/api/webhooks', {
  method: 'POST',
  headers: {
    'X-API-Key': 'gs_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/ghostspeak',
    events: ['score.updated', 'tier.changed', 'credential.issued'],
    agentAddresses: [], // Optional: filter by specific agents
  }),
})

const { id, secret } = await response.json()
console.log('Webhook created:', id)
console.log('Save this secret:', secret)
```

### List Webhooks

```typescript
const response = await fetch('https://ghostspeak.ai/api/webhooks', {
  headers: {
    'X-API-Key': 'gs_live_...',
  },
})

const { webhooks } = await response.json()
webhooks.forEach((webhook) => {
  console.log(`${webhook.url}: ${webhook.totalDeliveries} deliveries`)
})
```

### Single Agent Verification

```typescript
const response = await fetch('https://ghostspeak.ai/api/v1/verify', {
  method: 'POST',
  headers: {
    'X-API-Key': 'gs_live_...',
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
}
```

## Performance Benchmarks

Based on testing with production data:

### Batch Verification

| Agents | Avg Time/Agent | Total Time | Cost    |
|--------|----------------|------------|---------|
| 10     | 18ms           | 180ms      | $0.05   |
| 50     | 19ms           | 950ms      | $0.25   |
| 100    | 20ms           | 2000ms     | $0.50   |

### Webhook Delivery

- **Processing:** 50 webhooks per minute
- **Timeout:** 10 seconds per webhook
- **Retry Attempts:** 5 (with exponential backoff)
- **Success Rate:** >99.5% (with retries)

## Error Handling

### Batch Verification Errors

```typescript
const response = await fetch('/api/v1/verify/batch', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey },
  body: JSON.stringify({ agents }),
})

if (!response.ok) {
  const error = await response.json()
  switch (error.code) {
    case 'VALIDATION_ERROR':
      console.error('Invalid request:', error.error)
      break
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Rate limit exceeded, retry after:', response.headers.get('X-RateLimit-Reset'))
      break
    case 'UNAUTHORIZED':
      console.error('Invalid API key')
      break
    default:
      console.error('Unknown error:', error)
  }
}
```

### Webhook Signature Verification

```typescript
try {
  const signature = req.headers['x-ghostspeak-signature']
  const payload = JSON.stringify(req.body)

  if (!verifyWebhookSignature(payload, signature, secret)) {
    throw new Error('Invalid signature')
  }

  // Process webhook...
} catch (error) {
  console.error('Webhook verification failed:', error)
  return res.status(401).send('Unauthorized')
}
```

## Best Practices

### Batch Verification

1. **Batch Size:** Use batches of 50-100 agents for optimal performance
2. **Deduplication:** The API automatically removes duplicates
3. **Error Handling:** Check individual results for failures
4. **Rate Limits:** Respect your API key's rate limit
5. **Caching:** Cache results for 5 minutes to reduce costs

### Webhooks

1. **Signature Verification:** Always verify HMAC signatures
2. **Idempotency:** Handle duplicate webhook deliveries gracefully
3. **Response Time:** Respond with 200 within 10 seconds
4. **Retry Logic:** Be prepared for retries (same event, different timestamp)
5. **Error Handling:** Log errors but still return 200 to prevent retries

### Security

1. **API Keys:** Store in environment variables, never commit to git
2. **Webhook Secrets:** Rotate periodically
3. **HTTPS Only:** Always use HTTPS for webhook endpoints
4. **Rate Limiting:** Implement rate limiting on your webhook endpoint
5. **Logging:** Log all webhook events for audit trail

## Testing Webhooks

### Using webhook.site

1. Visit https://webhook.site and get your unique URL
2. Create webhook subscription with that URL
3. Trigger an event (update Ghost Score)
4. View the webhook payload on webhook.site
5. Verify the signature matches

### Using ngrok

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL for webhook subscription
https://abc123.ngrok.io/webhooks/ghostspeak
```

### Local Testing

```bash
# Start your webhook server
bun run your-webhook-server.ts

# In another terminal, trigger test webhook
curl -X POST http://localhost:3000/webhooks/ghostspeak \
  -H "Content-Type: application/json" \
  -H "X-GhostSpeak-Signature: YOUR_SIGNATURE" \
  -H "X-GhostSpeak-Event: score.updated" \
  -d '{
    "event": "score.updated",
    "agentAddress": "TestAgent123",
    "data": {
      "ghostScore": 5500,
      "tier": "GOLD"
    }
  }'
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook subscription is active
3. Check server logs for delivery attempts
4. Ensure webhook endpoint responds within 10 seconds
5. Check firewall/security group settings

### Batch Verification Slow

1. Reduce batch size (try 50 instead of 100)
2. Check network latency
3. Verify API key has sufficient rate limit
4. Check if agents exist (404s slow down batch)

### Signature Verification Failing

1. Use raw request body (before JSON parsing)
2. Verify webhook secret is correct
3. Check HMAC algorithm is SHA-256
4. Ensure payload string matches exactly
5. Check for whitespace/encoding issues

## Support

- API Documentation: https://ghostspeak.ai/api-docs
- Email: api@ghostspeak.ai
- Discord: https://discord.gg/ghostspeak
