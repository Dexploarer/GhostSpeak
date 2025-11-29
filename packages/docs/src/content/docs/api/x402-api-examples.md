---
title: x402 Payment Protocol API - Complete Examples
description: x402 Payment Protocol API - Complete Examples
---

# x402 Payment Protocol API - Complete Examples

> **Comprehensive Guide to Using x402 for AI Agent Payments**
> Last Updated: November 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [x402 Client API](#x402-client-api)
3. [HTTP 402 Middleware](#http-402-middleware)
4. [Agent Discovery](#agent-discovery)
5. [Payment Streaming](#payment-streaming)
6. [Analytics Integration](#analytics-integration)
7. [Complete Examples](#complete-examples)

---

## Quick Start

### Install Dependencies

```bash
npm install @ghostspeak/sdk
# or
bun add @ghostspeak/sdk
```

### Basic Payment Flow

```typescript
import { createX402Client } from '@ghostspeak/sdk/x402';
import { address, createKeyPairSignerFromBytes } from '@solana/kit';

// Create x402 client
const x402Client = createX402Client(
  'https://api.devnet.solana.com',
  wallet // Your TransactionSigner
);

// Make payment
const receipt = await x402Client.pay({
  recipient: address('AgentPaymentAddress...'),
  amount: 1_000_000n, // 1 USDC (6 decimals)
  token: address('USDC_MINT_ADDRESS'),
  description: 'AI agent query',
  metadata: {
    query_id: '12345',
    model: 'gpt-4'
  }
});

console.log('Payment successful:', receipt.signature);
```

---

## x402 Client API

### Creating a Client

```typescript
import { X402Client } from '@ghostspeak/sdk/x402';
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const client = new X402Client(rpc, wallet);
```

### Creating Payment Requests

```typescript
// Server-side: Create payment request
const paymentRequest = client.createPaymentRequest({
  amount: 500_000n, // 0.5 USDC
  token: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
  description: 'Premium API access',
  expiresAt: Date.now() + 300000, // 5 minutes
  metadata: {
    tier: 'premium',
    requests_included: '1000'
  }
});

// Generate HTTP 402 headers
const headers = client.createPaymentHeaders(paymentRequest);

// HTTP Response
response.status(402).set(headers).json({
  error: 'Payment Required',
  paymentDetails: {
    address: paymentRequest.recipient,
    amount: paymentRequest.amount.toString(),
    token: paymentRequest.token,
    description: paymentRequest.description
  }
});
```

### Making Payments

```typescript
// Client-side: Make payment
const receipt = await client.pay({
  recipient: address('AgentAddress...'),
  amount: 500_000n,
  token: address('USDC_ADDRESS'),
  description: 'API access payment'
});

// Send payment signature with request
fetch('https://api.agent.com/query', {
  headers: {
    'X-Payment-Signature': receipt.signature,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'Analyze data' })
});
```

### Verifying Payments

```typescript
// Server-side: Verify payment
const paymentSig = request.headers['x-payment-signature'];

const verification = await client.verifyPaymentDetails({
  signature: paymentSig,
  expectedRecipient: agentPaymentAddress,
  expectedAmount: 500_000n,
  expectedToken: USDC_ADDRESS
});

if (verification.valid) {
  // Payment verified, provide service
  return processQuery(request.body.query);
} else {
  return response.status(402).json({
    error: 'Invalid payment',
    details: verification.error
  });
}
```

### Payment Status Tracking

```typescript
// Check payment status
const status = await client.getPaymentStatus(receipt.signature);

switch (status.status) {
  case 'confirmed':
    console.log('Payment confirmed with', status.confirmations, 'confirmations');
    break;
  case 'pending':
    console.log('Payment pending...');
    break;
  case 'failed':
    console.error('Payment failed');
    break;
}
```

### Event Listeners

```typescript
// Listen to payment events
client.on('payment_created', (event) => {
  console.log('Payment created:', event.request);
});

client.on('payment_sent', (event) => {
  console.log('Transaction sent:', event.signature);
});

client.on('payment_confirmed', (event) => {
  console.log('Payment confirmed!', event.receipt);
});

client.on('payment_failed', (event) => {
  console.error('Payment failed:', event.error);
});
```

---

## HTTP 402 Middleware

### Express Integration

```typescript
import express from 'express';
import { createX402Middleware } from '@ghostspeak/sdk/x402';

const app = express();

// Create x402 middleware
const x402 = createX402Middleware({
  x402Client: client,
  requiredPayment: 1_000_000n, // 1 USDC
  token: USDC_ADDRESS,
  description: 'AI agent API access',
  agentId: 'my_agent_123',
  recordPaymentOnChain: true, // Record to Solana

  // Callbacks
  onPaymentVerified: async (signature, req) => {
    console.log('Payment verified:', signature);
    // Update analytics, log, etc.
  },

  onPaymentFailed: async (error, req) => {
    console.error('Payment failed:', error);
    // Log failure, alert, etc.
  }
});

// Apply to routes
app.get('/api/agent/query', x402, async (req, res) => {
  // Payment already verified by middleware
  const result = await processQuery(req.query);
  res.json(result);
});

app.listen(3000);
```

### Fastify Integration

```typescript
import Fastify from 'fastify';
import { x402FastifyPlugin } from '@ghostspeak/sdk/x402';

const fastify = Fastify();

// Register plugin
fastify.register(x402FastifyPlugin, {
  x402Client: client,
  routes: {
    '/api/query': {
      payment: 500_000n, // 0.5 USDC
      token: USDC_ADDRESS,
      description: 'Query API'
    },
    '/api/advanced': {
      payment: 2_000_000n, // 2 USDC
      token: USDC_ADDRESS,
      description: 'Advanced API'
    }
  }
});

// Route handlers
fastify.get('/api/query', async (request, reply) => {
  // x402Payment is available on request
  const paymentInfo = request.x402Payment;

  const result = await processQuery(request.query);
  return result;
});

fastify.listen({ port: 3000 });
```

### Rate Limiting with x402

```typescript
import { withX402RateLimit } from '@ghostspeak/sdk/x402';

class AgentAPI {
  @withX402RateLimit({
    maxRequestsPerMinute: 60,
    paymentRequired: 100_000n // 0.1 USDC
  })
  async handleQuery(req, res) {
    // Rate limited by payment signature
    // Paid users get higher limits
    return processQuery(req.body);
  }
}
```

---

## Agent Discovery

### Finding x402-Enabled Agents

```typescript
import { createAgentDiscoveryClient } from '@ghostspeak/sdk/x402';

const discovery = createAgentDiscoveryClient({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  programId: GHOSTSPEAK_PROGRAM_ID,
  cacheEnabled: true,
  cacheTTL: 300 // 5 minutes
});

// Search for agents
const results = await discovery.searchAgents({
  capability: 'data-analysis',
  x402_enabled: true,
  accepted_tokens: [USDC_ADDRESS],
  max_price: 5_000_000n, // Max 5 USDC per call
  min_reputation: 8000, // Min 80% reputation
  sort_by: 'reputation',
  sort_order: 'desc',
  limit: 10
});

console.log(`Found ${results.agents.length} agents`);

for (const agent of results.agents) {
  console.log(`
    Name: ${agent.name}
    Price: ${agent.x402_price_per_call} (per call)
    Reputation: ${agent.reputation_score / 100}%
    Endpoint: ${agent.x402_service_endpoint}
  `);
}
```

### Get Agent Pricing

```typescript
// Get detailed pricing for an agent
const pricing = await discovery.getAgentPricing(agentAddress);

console.log(`
  Price per call: ${pricing.price_per_call}
  Payment address: ${pricing.payment_address}
  Accepted tokens: ${pricing.accepted_tokens.map(t => t.symbol).join(', ')}
  Service endpoint: ${pricing.service_endpoint}
`);
```

### Recommended Agents

```typescript
// Get recommended agents for a capability
const recommended = await discovery.getRecommendedAgents(
  'image-generation',
  5 // Limit to top 5
);

// Returns highly-rated agents sorted by reputation
```

### Filter by Price Range

```typescript
// Find affordable agents
const affordable = await discovery.getAgentsByPriceRange(
  1_000_000n, // Max 1 USDC
  'translation'
);
```

### Filter by Token

```typescript
// Find agents accepting USDC
const usdcAgents = await discovery.getAgentsByToken(USDC_ADDRESS);
```

---

## Payment Streaming

### Creating a Payment Stream

```typescript
import { PaymentStreamManager } from '@ghostspeak/sdk/x402';

const streamManager = new PaymentStreamManager(x402Client);

// Create streaming payment for long-running task
const stream = await streamManager.createStream({
  agentAddress: address('AgentAddress...'),
  clientAddress: wallet.address,
  tokenMint: USDC_ADDRESS,
  totalAmount: 10_000_000n, // 10 USDC total
  intervalMs: 10000, // Payment every 10 seconds
  amountPerInterval: 1_000_000n, // 1 USDC per interval
  durationMs: 100000, // 100 seconds total
  autoResume: true
});

console.log('Stream created:', stream.id);
```

### Milestone-Based Streaming

```typescript
// Create stream with milestones
const stream = await streamManager.createStream({
  agentAddress: agentAddr,
  clientAddress: clientAddr,
  tokenMint: USDC_ADDRESS,
  totalAmount: 20_000_000n, // 20 USDC
  intervalMs: 0, // No time-based intervals
  amountPerInterval: 0n,
  durationMs: 0,

  // Milestone-based releases
  milestones: [
    {
      id: 'milestone_1',
      description: 'Initial setup complete',
      amount: 5_000_000n, // 5 USDC
      condition: async () => {
        // Check if setup is complete
        const status = await checkSetupStatus();
        return status.completed;
      },
      completed: false
    },
    {
      id: 'milestone_2',
      description: 'Processing 50% complete',
      amount: 7_500_000n, // 7.5 USDC
      condition: async () => {
        const progress = await checkProgress();
        return progress >= 50;
      },
      completed: false
    },
    {
      id: 'milestone_3',
      description: 'Task complete',
      amount: 7_500_000n, // 7.5 USDC
      condition: async () => {
        const result = await checkCompletion();
        return result.success;
      },
      completed: false
    }
  ]
});
```

### Managing Streams

```typescript
// Pause stream
await streamManager.pauseStream(stream.id);

// Resume stream
await streamManager.resumeStream(stream.id);

// Cancel stream (refund remaining)
await streamManager.cancelStream(stream.id);

// Get stream status
const status = streamManager.getStreamStatus(stream.id);
console.log(`
  Status: ${status.status}
  Amount paid: ${status.amountPaid}
  Payments made: ${status.payments.length}
  Next payment: ${new Date(status.nextPaymentAt)}
`);
```

### Stream Events

```typescript
streamManager.on('payment', (streamId, payment) => {
  console.log(`Stream ${streamId} payment:`, payment);
});

streamManager.on('milestone_completed', (streamId, milestone) => {
  console.log(`Milestone completed: ${milestone.description}`);
});

streamManager.on('stream_completed', (streamId) => {
  console.log(`Stream ${streamId} completed`);
});

streamManager.on('stream_failed', (streamId, error) => {
  console.error(`Stream ${streamId} failed:`, error);
});
```

---

## Analytics Integration

### Tracking x402 Metrics

```typescript
import { X402AnalyticsTracker } from '@ghostspeak/sdk/x402';

const analytics = new X402AnalyticsTracker({
  enableRealtime: true,
  metricsInterval: 60000, // 1 minute
  retentionPeriod: 86400, // 24 hours

  onPayment: (event) => {
    console.log('Payment recorded:', event);
  },

  onMetrics: (metrics) => {
    console.log('Metrics update:', metrics);
  }
});

// Start tracking
analytics.start();

// Record payment
analytics.recordPayment({
  signature: paymentSig,
  timestamp: BigInt(Date.now()),
  payer: payerAddress,
  recipient: agentAddress,
  amount: 1_000_000n,
  token: USDC_ADDRESS,
  agent: agentAddress,
  status: 'confirmed',
  metadata: {
    response_time_ms: 150
  }
});
```

### Querying Metrics

```typescript
// Get current metrics
const metrics = analytics.getMetrics();

console.log(`
  Total payments: ${metrics.payments.total}
  Successful: ${metrics.payments.successful}
  Failed: ${metrics.payments.failed}

  Total volume: ${metrics.volume.total}
  Average payment: ${metrics.volume.average}

  Active agents: ${metrics.agents.totalActive}
  Success rate: ${metrics.performance.successRate}%
  Avg confirmation time: ${metrics.performance.averageConfirmationTime}ms
`);

// Top earning agents
for (const topAgent of metrics.agents.topEarners) {
  console.log(`
    Agent: ${topAgent.agent}
    Earnings: ${topAgent.earnings}
    Calls: ${topAgent.callCount}
  `);
}
```

### Real-time Dashboard Data

```typescript
// Stream metrics to dashboard
analytics.on('metrics', (metrics) => {
  // Update dashboard
  dashboard.update({
    payments: metrics.payments,
    volume: metrics.volume,
    agents: metrics.agents,
    performance: metrics.performance
  });
});

// Get historical data
const history = analytics.getHistory({
  startTime: Date.now() - 3600000, // Last hour
  endTime: Date.now(),
  granularity: 'minute' // minute, hour, day
});
```

---

## Complete Examples

### Example 1: Agent Registration with x402

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { address } from '@solana/kit';

const client = new GhostSpeakClient({
  rpcUrl: 'https://api.mainnet-beta.solana.com'
});

// Register agent
const agent = await client.agent.register({
  name: 'DataAnalysisAgent',
  description: 'AI agent for advanced data analysis',
  serviceMint: USDC_ADDRESS,
  pricePerCall: 2_000_000n, // 2 USDC
  owner: wallet
});

// Configure x402
await client.x402.configure({
  agentId: agent.agentId,
  config: {
    enabled: true,
    payment_address: wallet.address,
    accepted_tokens: [USDC_ADDRESS, PYUSD_ADDRESS],
    price_per_call: 2_000_000n,
    service_endpoint: 'https://api.myagent.com/v1/x402'
  },
  owner: wallet
});

console.log('Agent configured for x402 payments');
```

### Example 2: Complete Payment Flow

```typescript
// Server: Agent API with x402
import express from 'express';
import { createX402Middleware, createX402Client } from '@ghostspeak/sdk/x402';

const app = express();
const x402Client = createX402Client(RPC_URL, serverWallet);

app.get('/api/analyze',
  createX402Middleware({
    x402Client,
    requiredPayment: 2_000_000n,
    token: USDC_ADDRESS,
    description: 'Data analysis service',
    agentId: 'my_agent',
    recordPaymentOnChain: true
  }),
  async (req, res) => {
    // Payment verified, provide service
    const result = await analyzeData(req.query.data);

    res.json({
      success: true,
      result,
      payment_signature: req.x402Payment.signature
    });
  }
);

app.listen(3000);

// Client: Making request with payment
const clientX402 = createX402Client(RPC_URL, clientWallet);

// First request - returns 402
try {
  const response = await fetch('https://api.agent.com/api/analyze?data=sample');

  if (response.status === 402) {
    const paymentDetails = await response.json();

    // Make payment
    const receipt = await clientX402.pay({
      recipient: address(paymentDetails.paymentDetails.address),
      amount: BigInt(paymentDetails.paymentDetails.amount),
      token: address(paymentDetails.paymentDetails.token),
      description: paymentDetails.paymentDetails.description
    });

    // Retry with payment signature
    const paidResponse = await fetch('https://api.agent.com/api/analyze?data=sample', {
      headers: {
        'X-Payment-Signature': receipt.signature
      }
    });

    const result = await paidResponse.json();
    console.log('Analysis result:', result);
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

### Example 3: Long-Running Task with Streaming

```typescript
import { PaymentStreamManager } from '@ghostspeak/sdk/x402';

const streamManager = new PaymentStreamManager(x402Client);

// Create task with milestone payments
const stream = await streamManager.createStream({
  agentAddress,
  clientAddress: wallet.address,
  tokenMint: USDC_ADDRESS,
  totalAmount: 50_000_000n, // 50 USDC for entire task

  milestones: [
    {
      id: 'start',
      description: 'Task started',
      amount: 10_000_000n,
      condition: async () => true, // Immediate
      completed: false
    },
    {
      id: 'data_collected',
      description: 'Data collection complete',
      amount: 15_000_000n,
      condition: async () => {
        const status = await fetch('https://api.agent.com/status');
        const data = await status.json();
        return data.dataCollectionComplete;
      },
      completed: false
    },
    {
      id: 'processing_done',
      description: 'Processing complete',
      amount: 15_000_000n,
      condition: async () => {
        const status = await fetch('https://api.agent.com/status');
        const data = await status.json();
        return data.processingComplete;
      },
      completed: false
    },
    {
      id: 'delivered',
      description: 'Results delivered',
      amount: 10_000_000n,
      condition: async () => {
        const status = await fetch('https://api.agent.com/status');
        const data = await status.json();
        return data.resultsDelivered;
      },
      completed: false
    }
  ]
});

console.log('Streaming payment created:', stream.id);

// Monitor stream progress
streamManager.on('milestone_completed', (streamId, milestone) => {
  console.log(`✓ ${milestone.description} - ${milestone.amount} paid`);
});

streamManager.on('stream_completed', (streamId) => {
  console.log('Task completed, all payments processed');
});
```

---

## Error Handling

### Common x402 Errors

```typescript
try {
  const receipt = await x402Client.pay(paymentRequest);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Not enough tokens for payment');
  } else if (error.message.includes('Transaction expired')) {
    console.error('Payment timeout - please retry');
  } else if (error.message.includes('Associated Token Account not found')) {
    console.error('Token account not initialized');
    // Create ATA first
  }
}
```

### Payment Verification Errors

```typescript
const verification = await x402Client.verifyPaymentDetails({
  signature,
  expectedRecipient,
  expectedAmount,
  expectedToken
});

if (!verification.valid) {
  switch (verification.error) {
    case 'Transaction not found':
      // Payment not yet confirmed
      break;
    case 'Transaction failed':
      // Payment failed on-chain
      break;
    case 'Recipient mismatch':
      // Payment sent to wrong address
      break;
    case 'Amount mismatch':
      // Incorrect payment amount
      break;
    case 'Token mismatch':
      // Wrong token used
      break;
  }
}
```

---

## Best Practices

### 1. Always Verify Payments Server-Side

```typescript
// ❌ Don't trust client-provided signatures
app.get('/api/service', (req, res) => {
  const sig = req.headers['x-payment-signature'];
  // Just trust it - BAD!
  return processRequest();
});

// ✅ Always verify on-chain
app.get('/api/service', async (req, res) => {
  const sig = req.headers['x-payment-signature'];

  const verification = await x402Client.verifyPaymentDetails({
    signature: sig,
    expectedRecipient: MY_ADDRESS,
    expectedAmount: REQUIRED_AMOUNT,
    expectedToken: USDC_ADDRESS
  });

  if (!verification.valid) {
    return res.status(402).json({ error: 'Invalid payment' });
  }

  return processRequest();
});
```

### 2. Handle Payment Expiration

```typescript
const paymentRequest = x402Client.createPaymentRequest({
  amount: 1_000_000n,
  token: USDC_ADDRESS,
  description: 'Service',
  expiresAt: Date.now() + 300000 // 5 minutes
});

// Check expiration before processing
if (Date.now() > paymentRequest.expiresAt) {
  return res.status(402).json({
    error: 'Payment request expired',
    message: 'Please request a new payment'
  });
}
```

### 3. Use Connection Pooling

```typescript
import { createConnectionPool } from '@ghostspeak/sdk/utils';

const pool = createConnectionPool({
  rpcUrl: RPC_URL,
  poolSize: 10,
  maxRetries: 3
});

const x402Client = new X402Client(pool, wallet);
```

### 4. Implement Retry Logic

```typescript
async function payWithRetry(request, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await x402Client.pay(request);
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      );
    }
  }
}
```

### 5. Monitor Payment Performance

```typescript
const analytics = new X402AnalyticsTracker({
  enableRealtime: true,
  onMetrics: (metrics) => {
    // Alert if success rate drops
    if (metrics.performance.successRate < 95) {
      alertOps('Payment success rate dropped to ' + metrics.performance.successRate + '%');
    }

    // Alert if confirmation time increases
    if (metrics.performance.averageConfirmationTime > 5000) {
      alertOps('Slow confirmations: ' + metrics.performance.averageConfirmationTime + 'ms');
    }
  }
});
```

---

## Support

- **Documentation**: https://docs.ghostspeak.ai
- **GitHub**: https://github.com/ghostspeak/ghostspeak
- **Discord**: https://discord.gg/ghostspeak
- **Email**: support@ghostspeak.ai

---

*Last updated: November 2025*
