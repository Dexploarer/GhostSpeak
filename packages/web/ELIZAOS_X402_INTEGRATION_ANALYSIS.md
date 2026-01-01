# elizaOS x402 Integration Analysis

## Executive Summary

GhostSpeak currently integrates with **PayAI** as a payment facilitator for the x402 protocol. **elizaOS's x402.elizaos.ai** is an **API Gateway** implementation of x402, serving a complementary but different role. This document explores high-value integration opportunities.

---

## Current GhostSpeak x402 Architecture

### **What We Have**

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Payment Facilitator** | PayAI SDK | Process x402 payments, handle webhooks |
| **On-chain Indexer** | Custom (Convex) | Poll blockchain for payment verification |
| **External Resources** | Heurist, Firecrawl, Pinata | Aggregate 3rd-party x402 endpoints |
| **Reputation System** | Custom | Track agent performance from payments |
| **Webhook Handler** | `/api/payai/webhook` | Real-time payment notifications |

### **What We're Missing**

- **API Gateway layer** - elizaOS provides this
- **Dynamic routing** - elizaOS's data-driven endpoint system
- **Cross-network discovery** - Being listed on other x402 networks
- **Standardized 402 UI** - elizaOS's payment flow UX

---

## elizaOS x402.elizaos.ai Overview

### **Architecture**

```
┌─────────────┐
│   Browser   │
│  (Phantom)  │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────┐
│  elizaOS Gateway    │
│  (Express + Bun)    │
│                     │
│  - Dynamic Routes   │
│  - Payment UI       │
│  - Wallet Connect   │
└──────┬──────────────┘
       │ Proxy + Payment Headers
       ▼
┌─────────────────────┐
│  Upstream Services  │
│  (x402 Merchants)   │
│                     │
│  - Return 402 if    │
│    payment needed   │
│  - Validate payment │
│  - Return data      │
└─────────────────────┘
```

### **Key Features**

1. **Dynamic Routing** (`agents.js` config)
   - Data-driven endpoint generation
   - Auto-documentation
   - Content negotiation (HTML docs vs JSON data)

2. **Payment Flow**
   - Detects `402 Payment Required` from upstream
   - Shows Phantom wallet connection UI
   - User pays directly to merchant
   - Forwards request with payment proof headers

3. **Tech Stack**
   - **Runtime**: Bun
   - **Framework**: Express
   - **Blockchain**: Solana
   - **Wallet**: Phantom
   - **Process Manager**: PM2

---

## Integration Opportunities

### **Option 1: List GhostSpeak Agents on elizaOS Network** ⭐ **RECOMMENDED**

**Value Proposition**: Instant distribution to elizaOS's user base without building our own gateway.

**Implementation**:
```typescript
// Add GhostSpeak agents to elizaOS's agents.js
{
  "ghostspeak": {
    "name": "GhostSpeak Agent Marketplace",
    "base_url": "https://ghostspeak.io/api/x402",
    "endpoints": [
      {
        "path": "/agents/:agentId/interact",
        "method": "POST",
        "description": "Interact with verified AI agents",
        "price_usdc": "dynamic", // Based on agent pricing
        "facilitator": "payai"
      }
    ]
  }
}
```

**Benefits**:
- ✅ Zero infrastructure cost (elizaOS hosts the gateway)
- ✅ Reach elizaOS's user base
- ✅ Cross-network reputation building
- ✅ Payment handling abstracted away

**Requirements**:
1. Create `/api/x402/*` routes that return 402 when payment needed
2. Accept payment proof headers from elizaOS gateway
3. Integrate with their discovery API
4. Add GhostSpeak config to their `agents.js`

---

### **Option 2: Run Our Own elizaOS Gateway Instance**

**Value Proposition**: Full control over routing, branding, and payment flow.

**Implementation**:
```bash
# Fork elizaOS x402 repo
git clone https://github.com/elizaOS/x402.elizaos.ai
cd x402.elizaos.ai

# Configure for GhostSpeak
cp agents.example.js agents.js
# Edit agents.js with our agent configurations

# Deploy
bun install
bun run build
pm2 start pm2.config.json
```

**Benefits**:
- ✅ Custom branding and UX
- ✅ Full routing control
- ✅ Can white-label for enterprise clients
- ✅ Own our user data

**Costs**:
- ❌ Infrastructure hosting
- ❌ Maintenance burden
- ❌ Need to drive traffic ourselves

---

### **Option 3: Hybrid - Gateway + Facilitator Integration**

**Value Proposition**: Best of both worlds - use elizaOS for gateway, PayAI for facilitation.

**Architecture**:
```
User Request
    ↓
elizaOS Gateway (routing + UI)
    ↓
PayAI (payment processing)
    ↓
GhostSpeak API (agent execution)
    ↓
elizaOS Gateway (response delivery)
```

**Benefits**:
- ✅ elizaOS handles 402 flow UX
- ✅ PayAI handles payment settlement
- ✅ GhostSpeak focuses on agents
- ✅ Each layer does what it's best at

**Implementation**:
```typescript
// In our /api/x402/* routes
export async function POST(request: NextRequest) {
  const paymentProof = request.headers.get('X-Payment-Signature')

  if (!paymentProof) {
    // Return 402 for elizaOS gateway to handle
    return new NextResponse('Payment Required', {
      status: 402,
      headers: {
        'WWW-Authenticate': 'Solana realm="GhostSpeak", facilitator="payai"',
        'X-Payment-Amount': '0.01',
        'X-Payment-Currency': 'USDC',
        'X-Payment-Merchant': process.env.GHOSTSPEAK_MERCHANT_ADDRESS,
      }
    })
  }

  // Verify payment with PayAI
  const verified = await payaiClient.verifyPayment(paymentProof)

  if (!verified) {
    return new NextResponse('Invalid Payment', { status: 403 })
  }

  // Execute agent interaction
  const result = await executeAgent(...)

  return NextResponse.json(result)
}
```

---

### **Option 4: elizaOS as Discovery Layer** (Like Heurist)

**Value Proposition**: Use elizaOS to discover OTHER x402 endpoints, not just list ours.

**Implementation**:
```typescript
// lib/x402/fetchElizaOSResources.ts
export async function fetchElizaOSResources(): Promise<ExternalResource[]> {
  const response = await fetch('https://x402.elizaos.ai/api/agents')
  const agents = await response.json()

  return agents.map(agent => ({
    id: `elizaos_${agent.id}`,
    url: agent.endpoint,
    name: agent.name,
    description: agent.description,
    category: agent.category,
    tags: ['elizaos', 'x402', ...agent.tags],
    network: 'solana',
    priceUsd: agent.price,
    facilitator: 'elizaos',
    isActive: true,
    isExternal: true,
  }))
}
```

**Benefits**:
- ✅ Simple integration (just fetch their catalog)
- ✅ Expand our marketplace instantly
- ✅ No payment handling complexity
- ✅ Users discover more agents

**Add to existing aggregation**:
```typescript
// lib/x402/fetchExternalResources.ts
export async function fetchAllExternalResources(): Promise<ExternalResource[]> {
  const [heuristResources, elizaOSResources] = await Promise.all([
    fetchHeuristResources(),
    fetchElizaOSResources(), // NEW
  ])

  return [...heuristResources, ...elizaOSResources, ...STATIC_EXTERNAL_RESOURCES]
}
```

---

## Technical Integration Details

### **Payment Header Format** (elizaOS Gateway ↔ Merchant)

```typescript
// Headers sent by elizaOS gateway to our API
{
  'X-Payment-Signature': 'base58_solana_signature',
  'X-Payment-Amount': '1000000',  // 1 USDC in lamports
  'X-Payment-Currency': 'USDC',
  'X-Payment-Payer': 'solana_address',
  'X-Payment-Merchant': 'solana_address',
  'X-Payment-Timestamp': '1234567890',
}
```

### **402 Response Format** (Our API → elizaOS Gateway)

```typescript
{
  status: 402,
  headers: {
    'WWW-Authenticate': 'Solana realm="GhostSpeak", facilitator="payai"',
    'X-Payment-Amount': '1000000',
    'X-Payment-Currency': 'USDC',
    'X-Payment-Merchant': 'DYw8j...', // Our merchant address
    'X-Payment-Facilitator-URL': 'https://payai.io',
  },
  body: {
    error: 'Payment Required',
    message: 'This agent requires 1 USDC payment',
    paymentDetails: {
      amount: 1.0,
      currency: 'USDC',
      merchant: 'DYw8j...',
    }
  }
}
```

---

## Recommendation: Phased Approach

### **Phase 1: Discovery Integration** (Week 1)
- ✅ Add `fetchElizaOSResources()` to external resource fetcher
- ✅ Display elizaOS agents in our marketplace
- ✅ Test payment flow through elizaOS gateway

**Effort**: 1-2 days
**Risk**: Low
**Value**: Medium (more agents in marketplace)

### **Phase 2: List Our Agents** (Week 2-3)
- ✅ Create `/api/x402/*` routes for our agents
- ✅ Implement 402 response handling
- ✅ Submit PR to elizaOS to add GhostSpeak config
- ✅ Verify payment headers work with PayAI

**Effort**: 3-5 days
**Risk**: Medium (depends on elizaOS accepting PR)
**Value**: High (distribution to their network)

### **Phase 3: Bidirectional Integration** (Month 2)
- ✅ elizaOS users can discover GhostSpeak agents
- ✅ GhostSpeak users can discover elizaOS agents
- ✅ Shared reputation system (optional)
- ✅ Cross-network analytics

**Effort**: 1-2 weeks
**Risk**: Low
**Value**: Very High (network effects)

---

## Code Examples

### **1. elizaOS-compatible x402 Route**

```typescript
// app/api/x402/agents/[agentId]/interact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPayAIPayment } from '@/lib/payai/verify'

export const runtime = 'edge'

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params

  // Check for payment proof header (sent by elizaOS gateway)
  const paymentSignature = request.headers.get('X-Payment-Signature')

  if (!paymentSignature) {
    // No payment - return 402 for elizaOS to handle
    return new NextResponse(JSON.stringify({
      error: 'Payment Required',
      message: `Interaction with agent ${agentId} requires payment`,
      agent: agentId,
    }), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Solana realm="GhostSpeak", facilitator="payai"`,
        'X-Payment-Amount': '1000000', // 1 USDC
        'X-Payment-Currency': 'USDC',
        'X-Payment-Merchant': process.env.GHOSTSPEAK_MERCHANT_ADDRESS!,
        'X-Payment-Facilitator': 'https://payai.io',
      }
    })
  }

  // Verify payment via PayAI
  const verified = await verifyPayAIPayment({
    signature: paymentSignature,
    merchantAddress: process.env.GHOSTSPEAK_MERCHANT_ADDRESS!,
    expectedAmount: '1000000',
  })

  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired payment proof' },
      { status: 403 }
    )
  }

  // Execute agent interaction
  const body = await request.json()
  const result = await executeAgentInteraction(agentId, body)

  // Record to reputation system
  await recordPayment({
    agentId,
    signature: paymentSignature,
    amount: '1000000',
    success: true,
  })

  return NextResponse.json(result)
}
```

### **2. External Resource Fetcher**

```typescript
// lib/x402/fetchElizaOSResources.ts
export async function fetchElizaOSResources(): Promise<ExternalResource[]> {
  try {
    const response = await fetch('https://x402.elizaos.ai/api/agents', {
      next: { revalidate: 300 }, // 5 min cache
    })

    if (!response.ok) {
      console.error('Failed to fetch elizaOS resources:', response.status)
      return []
    }

    const data = await response.json()

    return data.agents.map((agent: any) => ({
      id: `elizaos_${agent.id}`,
      url: agent.endpoint,
      name: agent.name,
      description: agent.description,
      category: agent.category || 'other',
      tags: ['elizaos', 'x402', ...(agent.tags || [])],
      network: 'solana',
      priceUsd: agent.priceUsd || '0.01',
      facilitator: 'elizaos',
      isActive: true,
      isExternal: true,
    }))
  } catch (error) {
    console.error('Error fetching elizaOS resources:', error)
    return []
  }
}
```

---

## ROI Analysis

| Integration Type | Dev Time | Infrastructure Cost | Distribution Gain | Revenue Impact |
|-----------------|----------|-------------------|-------------------|----------------|
| **Discovery Only** | 1-2 days | $0 | Low | +5-10% |
| **List Our Agents** | 3-5 days | $0 | High | +20-40% |
| **Run Own Gateway** | 1-2 weeks | $50-200/mo | Medium | +10-20% |
| **Full Hybrid** | 2-3 weeks | $50-200/mo | Very High | +40-80% |

---

## Next Steps

### **Immediate Actions** (This Week)
1. ✅ **Reach out to elizaOS team** - Discord/Telegram to discuss integration
2. ✅ **Implement discovery integration** - Add elizaOS resource fetcher
3. ✅ **Test their gateway** - Make test payments through x402.elizaos.ai

### **Short Term** (Next 2 Weeks)
1. ✅ **Create x402 routes** - Build `/api/x402/*` endpoints
2. ✅ **Submit elizaOS PR** - Add GhostSpeak to their `agents.js`
3. ✅ **Payment verification** - Ensure PayAI headers work with elizaOS

### **Long Term** (Next Month)
1. ✅ **Bidirectional discovery** - Both networks list each other's agents
2. ✅ **Shared analytics** - Cross-network usage tracking
3. ✅ **Co-marketing** - Joint announcement of integration

---

## Questions for elizaOS Team

1. **Discovery API**: Do you have a public API for listing all registered agents?
2. **Payment Headers**: What format do you use for payment proof headers?
3. **Facilitator Support**: Do you support multiple facilitators (PayAI + others)?
4. **Contribution Process**: How do we submit new agent configurations?
5. **Revenue Sharing**: Any fees/commissions for listing on your network?
6. **SLA/Uptime**: What uptime guarantees for the gateway?

---

## Conclusion

**elizaOS x402 integration is highly complementary** to our current PayAI setup:
- **PayAI** = Payment processor
- **elizaOS** = API gateway & discovery layer
- **GhostSpeak** = Agent marketplace & reputation system

**Recommended Path**: Start with **Discovery Integration** (Phase 1) this week, then **List Our Agents** (Phase 2) next week. This gives us maximum distribution with minimal risk and cost.

**Estimated Impact**: +30-50% more agent interactions within first month of integration.
