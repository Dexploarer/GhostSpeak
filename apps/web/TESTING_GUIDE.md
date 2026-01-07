# GhostSpeak Web App Testing Guide

This guide provides comprehensive instructions for testing the GhostSpeak web application with real user journeys and wide event logging verification.

## Prerequisites

1. **Development Environment**: Ensure you have the development servers running
2. **Node.js/Bun**: Make sure you have Node.js 24+ or Bun 1.3.4+
3. **Environment Variables**: Set up your `.env.local` file with required variables

## Starting the Development Environment

### Option 1: Using the Root Script (Recommended)
```bash
# From the project root
cd /Users/home/projects/GhostSpeak
bun run dev:web
```

### Option 2: Manual Server Startup
```bash
# Terminal 1: Start Next.js dev server
cd apps/web
bun run dev:next

# Terminal 2: Start Convex dev server
cd apps/web
bun run dev:convex
```

## Required Environment Variables

Create `.env.local` in `apps/web/` with:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# AI Gateway (for ElizaOS)
AI_GATEWAY_API_KEY=your_ai_gateway_key

# Logging Configuration (Optional - defaults provided)
LOG_SUCCESS_RATE=0.05
LOG_LEVEL=info
VIP_USERS=user1,user2
VIP_WALLETS=wallet1,wallet2
```

## Testing Dashboard

Once servers are running, open the comprehensive testing dashboard:

```
http://localhost:3333/test-dashboard.html
```

This dashboard provides:

### 🧪 Test Controls
- **Homepage Load**: Tests basic page loading
- **Dashboard Access**: Tests authenticated routes
- **Caisper Chat**: Tests AI agent interaction
- **Agent API**: Tests backend API endpoints
- **Error Scenarios**: Tests error handling
- **Performance**: Tests response times
- **Run All Tests**: Executes complete test suite

### 📊 Real-Time Monitoring
- **Test Results**: Live status of each test
- **Wide Event Logs**: Real-time display of all logged events
- **Event Details**: Full JSON view of any logged event
- **Filtering**: Filter logs by type (Success, Errors, API calls)

### 📤 Export Features
- **Clear Logs**: Reset the log display
- **Export Logs**: Download complete log data as JSON

## Running Integration Tests

### Automated Testing
```bash
cd apps/web
bun run test:integration
```

This runs 10 comprehensive tests:
1. **Homepage Load** - Basic page loading
2. **API Health Check** - Backend health verification
3. **Agent API** - Valid agent lookup requests
4. **Invalid Address Handling** - Error response validation
5. **Agent Chat API** - AI interaction testing
6. **404 Error Handling** - Error page responses
7. **Performance Testing** - Concurrent request handling
8. **Wide Event Verification** - Logging system validation
9. **Caisper Page Load** - AI chat interface loading
10. **Dashboard Access** - Authentication flow testing

### Manual Testing Steps

#### 1. Homepage Test
```
GET http://localhost:3333/
Expected: 200 OK with "GhostSpeak" in response
```

#### 2. API Health Check
```
GET http://localhost:3333/api/health
Expected: 200 OK with { "status": "ok" }
```

#### 3. Agent API Test
```
GET http://localhost:3333/api/v1/agent/11111111111111111111111111111112
Expected: 404 Not Found (agent doesn't exist - correct behavior)
```

#### 4. Invalid Address Test
```
GET http://localhost:3333/api/v1/agent/invalid-address
Expected: 400 Bad Request with error message
```

#### 5. Agent Chat Test
```
POST http://localhost:3333/api/agent/chat
Content-Type: application/json

{
  "message": "Hello, what agents are available?",
  "walletAddress": "11111111111111111111111111111112",
  "sessionToken": "test_session_123"
}
Expected: 200 OK with AI response
```

## Wide Event Log Verification

### What to Look For

Each request should generate a wide event with this structure:

```json
{
  "request_id": "req_8bf7ec2d",
  "timestamp": "2025-01-15T10:23:45.612Z",
  "method": "GET|POST",
  "path": "/api/...",
  "status_code": 200,
  "duration_ms": 145,
  "outcome": "success",

  "service": "ghostspeak-web",
  "version": "1.0.0",
  "environment": "development",

  "user": {
    "id": "user_456",
    "wallet_address": "...",
    "subscription_tier": "premium"
  },

  "metadata": {
    "agent_interaction": true,
    "message_length": 150
  },

  "performance": {
    "database_queries": 3
  }
}
```

### Key Verification Points

#### ✅ Homepage Loads
- Event logged with `path: "/"`
- `outcome: "success"`
- Reasonable `duration_ms`

#### ✅ API Calls Generate Events
- All `/api/*` requests logged
- Proper HTTP status codes
- Request/response timing captured

#### ✅ Agent Interactions Tracked
- Chat API calls include `agent_interaction: true`
- Action metadata captured
- LLM performance metrics

#### ✅ Error Handling Verified
- 4xx/5xx responses logged as `outcome: "error"`
- Error details captured
- Stack traces in development mode

#### ✅ User Context Enrichment
- User IDs and wallet addresses captured
- Subscription tiers tracked
- Session information preserved

## Troubleshooting

### Server Won't Start
```
Error: EPERM: operation not permitted
```
**Solution**: Check file permissions or try running with sudo (not recommended for development)

### Tests Fail with Network Errors
```
Error: getaddrinfo ENOTFOUND
```
**Solution**: Check internet connection and Convex deployment status

### Wide Events Not Appearing
**Check**:
1. Console logs for middleware execution
2. Network tab for trace-id headers
3. Server logs for wide event emissions

### API Returns 500 Errors
**Check**:
1. Convex deployment is running
2. Environment variables are set
3. Database schema is up to date

## Performance Benchmarks

Expected response times:
- **Homepage**: < 500ms
- **API Health**: < 100ms
- **Agent Lookup**: < 200ms
- **Agent Chat**: < 2000ms (includes AI processing)

## Wide Event Analytics

Once you have events flowing, you can query for insights:

### Error Rate Analysis
```sql
SELECT error.code, COUNT(*) as occurrences
FROM wide_events
WHERE status_code >= 400
GROUP BY error.code
ORDER BY occurrences DESC
```

### Performance Monitoring
```sql
SELECT path, AVG(duration_ms) as avg_response
FROM wide_events
WHERE outcome = 'success'
GROUP BY path
ORDER BY avg_response DESC
```

### User Behavior Insights
```sql
SELECT user.subscription_tier, COUNT(*) as requests
FROM wide_events
WHERE user.id IS NOT NULL
GROUP BY user.subscription_tier
```

## Next Steps

1. **Run the test dashboard** and verify all tests pass
2. **Check wide event logs** for comprehensive coverage
3. **Monitor performance metrics** in production
4. **Set up alerting** on error rates and slow requests
5. **Implement retention policies** for log data

## Production Deployment Testing

Before deploying to production:

1. **Run full integration test suite**
2. **Verify sampling rates** (reduce success logging in prod)
3. **Test error scenarios** thoroughly
4. **Monitor resource usage** during load testing
5. **Validate log shipping** to your logging backend

---

**🎯 The wide event logging system is now fully operational and ready for comprehensive testing and production deployment.**