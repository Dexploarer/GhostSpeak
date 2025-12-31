# B2B API Testing Guide

Quick guide to test the GhostSpeak B2B API platform.

## Prerequisites

```bash
# Start the development server
cd packages/web
bun dev

# Ensure Convex is running
bunx convex dev
```

## Test 1: Generate API Key

1. Navigate to: `http://localhost:3000/dashboard/api-keys`

2. Connect your wallet (if not already connected)

3. Fill out the form:
   - **Key Name:** "Test Key"
   - **Tier:** Startup (10 req/min, 1K daily)

4. Click "Generate API Key"

5. **IMPORTANT:** Copy the full API key immediately
   - Format: `gs_live_<64_hex_chars>`
   - Example: `gs_live_abc123...xyz789`
   - This is shown only once!

6. Verify the key appears in "Your API Keys" section with:
   - Status: Active
   - Tier: STARTUP badge
   - Masked key: `gs_live_abc...xyz`

## Test 2: Verify Agent Reputation

### Using curl

```bash
# Replace gs_live_... with your actual key
# Replace AGENT_ADDRESS with a real agent address from your blockchain

curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: gs_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "AGENT_ADDRESS",
    "requiredScore": 500,
    "returnMetrics": true
  }'
```

**Expected Response:**

```json
{
  "verified": true,
  "ghostScore": 847,
  "tier": "GOLD",
  "meetsRequirement": true,
  "metrics": {
    "successRate": 98.2,
    "totalJobs": 234,
    "disputes": 2,
    "disputeResolution": "100%"
  },
  "verifiedAt": "2026-01-15T10:30:00Z"
}
```

**Headers to check:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705420800
X-Cache: MISS (first request) or HIT (within 5 min)
```

### Using JavaScript

```javascript
const API_KEY = 'gs_live_...' // Your actual key

async function testVerify() {
  const response = await fetch('http://localhost:3000/api/v1/verify', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentAddress: 'AGENT_ADDRESS',
      requiredScore: 500,
      returnMetrics: true,
    }),
  })

  const data = await response.json()
  console.log('Verification result:', data)

  // Check rate limit headers
  console.log('Rate Limit:', response.headers.get('X-RateLimit-Remaining'))
  console.log('Cache:', response.headers.get('X-Cache'))
}

testVerify()
```

## Test 3: Lightweight Score Lookup

```bash
curl http://localhost:3000/api/v1/agents/AGENT_ADDRESS/score \
  -H "X-API-Key: gs_live_..."
```

**Expected Response:**

```json
{
  "ghostScore": 847,
  "tier": "GOLD",
  "lastUpdated": "2026-01-15T09:00:00Z"
}
```

## Test 4: Rate Limiting

Test that rate limits are enforced:

```bash
# Startup tier: 10 requests/min
# This should succeed for the first 10 requests, then fail

for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/v1/verify \
    -H "X-API-Key: gs_live_..." \
    -H "Content-Type: application/json" \
    -d '{"agentAddress": "AGENT_ADDRESS"}' \
    -w "Status: %{http_code}\n"
  echo ""
done
```

**Expected Output:**

```
Request 1:
{"verified":true,...}
Status: 200

Request 2:
{"verified":true,...}
Status: 200

...

Request 11:
{"error":"Rate limit exceeded","code":"RATE_LIMIT_EXCEEDED"...}
Status: 429
```

## Test 5: Caching

Test that responses are cached for 5 minutes:

```bash
# First request (cache miss)
curl http://localhost:3000/api/v1/agents/AGENT_ADDRESS/score \
  -H "X-API-Key: gs_live_..." \
  -i | grep X-Cache
# Output: X-Cache: MISS

# Second request within 5 minutes (cache hit)
curl http://localhost:3000/api/v1/agents/AGENT_ADDRESS/score \
  -H "X-API-Key: gs_live_..." \
  -i | grep X-Cache
# Output: X-Cache: HIT
```

## Test 6: View API Usage Dashboard

1. Navigate to: `http://localhost:3000/dashboard/api-usage`

2. Verify you see:
   - **Total Requests:** Count of all API calls
   - **Total Cost:** Sum in USD (1¢ per verify, 0.5¢ per score)
   - **Today's Usage:** Requests made today
   - **Avg Response Time:** Milliseconds
   - **Usage Chart:** Bar chart of daily requests
   - **Endpoint Breakdown:** List of endpoints with stats

3. Select different time ranges:
   - Last 7 days
   - Last 30 days
   - Last 90 days

4. Filter by specific API key (if you have multiple)

## Test 7: Error Handling

### Missing API Key

```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "AGENT_ADDRESS"}'
```

**Expected:**

```json
{
  "error": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

Status: 401

### Invalid API Key

```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: gs_live_invalid" \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "AGENT_ADDRESS"}'
```

**Expected:**

```json
{
  "error": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

Status: 401

### Missing Agent Address

```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: gs_live_..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**

```json
{
  "error": "Missing required field: agentAddress",
  "code": "VALIDATION_ERROR"
}
```

Status: 400

### Agent Not Found

```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: gs_live_..." \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "NONEXISTENT_ADDRESS"}'
```

**Expected:**

```json
{
  "error": "Agent not found",
  "code": "AGENT_NOT_FOUND"
}
```

Status: 404

## Test 8: Revoke API Key

1. Go to: `http://localhost:3000/dashboard/api-keys`

2. Find your test key

3. Click "Revoke" button

4. Confirm the action

5. Verify:
   - Key status changes to "Revoked"
   - Badge shows "Revoked" (not "Active")
   - Revoked date is shown

6. Try to use the revoked key:

```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: gs_live_revoked_key..." \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "AGENT_ADDRESS"}'
```

**Expected:**

```json
{
  "error": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

Status: 401

## Test 9: Multiple API Keys

1. Generate 3 API keys with different tiers:
   - Key 1: Startup (10 req/min)
   - Key 2: Growth (60 req/min)
   - Key 3: Enterprise (300 req/min)

2. Make requests with each key and verify rate limits:

```bash
# Startup key - should fail at request 11
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/v1/verify \
    -H "X-API-Key: $STARTUP_KEY" \
    -d '{"agentAddress": "AGENT_ADDRESS"}' \
    -w "Status: %{http_code}\n"
done

# Growth key - should fail at request 61
for i in {1..61}; do
  curl -X POST http://localhost:3000/api/v1/verify \
    -H "X-API-Key: $GROWTH_KEY" \
    -d '{"agentAddress": "AGENT_ADDRESS"}' \
    -w "Status: %{http_code}\n"
done
```

3. Check API usage dashboard and filter by each key

## Test 10: Load Testing

Test concurrent requests:

```bash
# Install hey (HTTP load generator)
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Test with 100 concurrent requests
hey -n 100 -c 10 \
  -H "X-API-Key: gs_live_..." \
  -H "Content-Type: application/json" \
  -m POST \
  -d '{"agentAddress": "AGENT_ADDRESS"}' \
  http://localhost:3000/api/v1/verify
```

**Expected Output:**

```
Summary:
  Total:        2.5 seconds
  Slowest:      0.8 seconds
  Fastest:      0.1 seconds
  Average:      0.25 seconds

Status code distribution:
  [200] 100 responses
```

## Test Checklist

- [ ] API key generation works
- [ ] API key appears in dashboard (masked)
- [ ] Full key shown only once on creation
- [ ] POST /api/v1/verify returns correct data
- [ ] GET /api/v1/agents/:address/score works
- [ ] Rate limiting enforced (10 req/min for Startup)
- [ ] Rate limit headers present in response
- [ ] Caching works (X-Cache: HIT within 5 min)
- [ ] API usage dashboard shows stats
- [ ] Usage chart renders correctly
- [ ] Endpoint breakdown accurate
- [ ] API key revocation works
- [ ] Revoked keys rejected (401)
- [ ] Error handling works (401, 400, 404, 429, 500)
- [ ] Multiple API keys can coexist
- [ ] Load testing succeeds (100+ concurrent requests)

## Common Issues

### "Agent not found"

- Make sure you're using a real agent address from your blockchain
- Check that the agent account exists in Solana devnet
- Verify you're connected to the correct network

### "Invalid or missing API key"

- Check that you copied the full key (72 characters)
- Verify the key wasn't revoked
- Ensure the key starts with `gs_live_`

### Rate limit always fails

- Wait 1 minute for the sliding window to reset
- Check your tier in the dashboard
- Verify you're not hitting daily quota

### Cache not working

- Check that requests are for the same agent address
- Verify less than 5 minutes elapsed between requests
- Look at X-Cache header to confirm

## Production Testing

Before deploying to production:

1. **Load Test:** Sustain 1000 req/min for 10 minutes
2. **Security Test:** Attempt SQL injection, XSS, CSRF
3. **Monitoring:** Set up Sentry, analytics, uptime checks
4. **Documentation:** Publish API docs at public URL
5. **Customer Testing:** Get 3 beta customers to integration test

## Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs: `tail -f .next/server.log`
3. Check Convex dashboard for database errors
4. Verify environment variables are set
5. Restart dev server: `bun dev`

## Next Steps

After successful testing:

1. Deploy to staging environment
2. Run production load tests
3. Set up monitoring & alerts
4. Create enterprise onboarding flow
5. Launch to first customers
