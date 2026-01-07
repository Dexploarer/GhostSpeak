# Wide Event Logging System

A comprehensive request-level logging system that emits structured "wide events" containing all relevant context for debugging and analytics.

## Overview

Instead of scattered logs throughout your application, the wide event system creates **one comprehensive event per request** with complete context. This transforms debugging from archaeology to analytics.

## Key Benefits

- **Complete Request Context**: Every event contains user, business, performance, and error context
- **Smart Sampling**: Automatically keeps all errors/slow requests while sampling normal traffic
- **Queryable Analytics**: Structured data enables complex queries instead of text searches
- **Production Debugging**: No more "what happened to user X's request?" mysteries

## Architecture

```
Request → Middleware → Wide Event Creation → Enrichment → Emission
     ↓
Response ← Sampling Decision ← Logger ← Structured Storage
```

## Core Components

### 1. Wide Event Logger (`wide-event.ts`)
```typescript
import { createRequestEvent, emitWideEvent } from '@/lib/logging/wide-event'

const event = createRequestEvent({
  method: 'POST',
  path: '/api/checkout',
  userId: 'user_123',
  walletAddress: 'abc...',
})

// Enrich with context
event.user = { subscription_tier: 'premium' }
event.cart = { total_cents: 9999 }

// Emit when complete
emitWideEvent(event)
```

### 2. React Hooks (`hooks.ts`)
```typescript
import { useWideEventUserEnrichment, useWideEventFeatureEnrichment } from '@/lib/logging/hooks'

function MyComponent() {
  // Automatically enriches current request with user data
  useWideEventUserEnrichment()

  // Add feature flags to events
  useWideEventFeatureEnrichment({
    new_checkout_flow: true,
    beta_features: false,
  })

  return <div>My Component</div>
}
```

### 3. Convex Integration (`convex-integration.ts`)
```typescript
import { useConvexQueryEnrichment } from '@/lib/logging/convex-integration'

// Automatically tracks query performance
const data = useConvexQueryEnrichment(
  useQuery(api.ghostScore.get, { agentAddress }),
  'ghostScore.get',
  { agentAddress }
)
```

## Event Structure

Every wide event contains:

```json
{
  "request_id": "req_8bf7ec2d",
  "trace_id": "abc123def456",
  "timestamp": "2025-01-15T10:23:45.612Z",
  "method": "POST",
  "path": "/api/checkout",
  "status_code": 200,
  "duration_ms": 145,
  "outcome": "success",

  "service": "ghostspeak-web",
  "version": "1.0.0",
  "deployment_id": "deploy_789",
  "region": "us-east-1",
  "environment": "production",

  "user": {
    "id": "user_456",
    "subscription_tier": "premium",
    "account_age_days": 847,
    "lifetime_value_cents": 284700
  },

  "agent": {
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "reputation_score": 7850,
    "tier": "Gold"
  },

  "feature_flags": {
    "new_checkout_flow": true,
    "express_payment": false
  },

  "performance": {
    "database_queries": 3,
    "external_api_calls": 1,
    "cache_hits": 2
  },

  "error": {
    "type": "PaymentError",
    "code": "card_declined",
    "message": "Card declined by issuer",
    "retriable": false
  }
}
```

## Sampling Strategy

The system automatically samples events to control costs while preserving debugging capability:

- **100% of errors** (status >= 400)
- **100% of slow requests** (> 2 seconds)
- **100% of VIP users/wallets**
- **5% of successful requests** (configurable)

```typescript
// Configure sampling
const logger = new WideEventLogger({
  sampling: {
    error_rate: 1.0,        // 100% of errors
    slow_request_threshold_ms: 2000,
    success_rate: 0.05,     // 5% of successes
    vip_users: ['user_123'],
    debug_features: ['debug_logging'],
  }
})
```

## Query Examples

With wide events, complex debugging becomes simple queries:

```sql
-- Why did premium user checkouts fail?
SELECT * FROM events
WHERE user.subscription_tier = 'premium'
  AND path = '/api/checkout'
  AND status_code >= 400
  AND timestamp > '2025-01-15'

-- Which deployment caused latency regression?
SELECT deployment_id, AVG(duration_ms) as avg_duration
FROM events
WHERE path = '/api/agent/chat'
  AND timestamp BETWEEN '2025-01-15' AND '2025-01-16'
GROUP BY deployment_id
ORDER BY avg_duration DESC

-- Error rate by agent tier
SELECT agent.tier, COUNT(*) as total_requests,
       COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
       errors * 100.0 / total_requests as error_rate
FROM events
WHERE path LIKE '/api/agent/%'
GROUP BY agent.tier
```

## Integration Points

### Next.js API Routes
```typescript
// app/api/example/route.ts
import { completeWideEvent } from '@/lib/logging/wide-event'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  // ... your logic ...

  completeWideEvent(request.wideEvent!, {
    statusCode: 200,
    durationMs: Date.now() - startTime,
  })

  return Response.json(result)
}
```

### Convex Mutations
```typescript
// convex/example.ts
import { enrichWithAgentContext } from '@/lib/logging/convex-integration'

export const myMutation = mutation({
  handler: async (ctx, args) => {
    // Enrich current event
    enrichWithAgentContext(ctx.wideEvent, args.agentAddress, 'reputation_calculation')

    // ... your logic ...
  }
})
```

### Error Boundaries
```typescript
import { WideEventErrorBoundary } from '@/lib/logging/hooks'

export function MyComponent() {
  return (
    <WideEventErrorBoundary>
      <MyContent />
    </WideEventErrorBoundary>
  )
}
```

## Environment Variables

```env
# Logging Configuration
LOG_SUCCESS_RATE=0.05          # Sample 5% of successful requests
LOG_LEVEL=info                 # debug|info|warn|error
VIP_USERS=user_123,user_456    # Always log these users
VIP_WALLETS=abc...,def...      # Always log these wallets

# Sampling
LOG_ERROR_RATE=1.0             # 100% of errors
LOG_SLOW_THRESHOLD_MS=2000     # Slow request threshold

# Service Context
SERVICE_NAME=ghostspeak-web
SERVICE_VERSION=1.0.0
DEPLOYMENT_ID=deploy_789
REGION=us-east-1
```

## Testing

Run the test script to see wide events in action:

```bash
cd apps/web
bun run test:wide-events
```

## Production Setup

1. **Choose a logging backend**: DataDog, CloudWatch, BigQuery, ClickHouse
2. **Configure sampling**: Adjust rates based on traffic and budget
3. **Set up alerts**: Monitor error rates, latency percentiles
4. **Create dashboards**: Build analytics from your event data

## Best Practices

1. **Enrich Early**: Add context as soon as you have it
2. **Use Structured Data**: Avoid free-form strings in events
3. **Test Sampling**: Ensure critical events aren't dropped
4. **Monitor Costs**: Watch your logging bill as you scale
5. **Query-Driven Debugging**: Think in terms of analytics queries, not grep searches

## Migration from Traditional Logging

### Before (Traditional)
```typescript
console.log('Processing checkout for user', userId)
console.log('Cart total:', cart.total)
// ... 20 more logs ...
console.error('Payment failed:', error.message)
```

### After (Wide Events)
```typescript
const event = createRequestEvent({ method: 'POST', path: '/api/checkout', userId })
event.user = { subscription_tier: user.subscriptionTier }
event.cart = { total_cents: cart.total, items: cart.items.length }
event.payment = { method: 'card', provider: 'stripe' }

// Later, if payment fails:
event.error = { type: 'PaymentError', code: error.code, message: error.message }
emitWideEvent(event)
```

**Result**: One queryable event instead of 20+ scattered logs. Complete debugging context in a single structured record.