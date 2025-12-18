---
title: x402 Ecosystem Integration
description: Complete guide to integrating with the x402 ecosystem including facilitators, resource discovery, and AI tool generation.
---

# x402 Ecosystem Integration

GhostSpeak provides comprehensive x402 ecosystem integration, enabling your AI agents to interact with the broader x402 payment network and making your services discoverable by AI models.

## Overview

The x402 ecosystem integration includes:

- **Facilitator Integration**: Connect with payment facilitators like Coinbase, ThirdWeb, and more
- **Resource Registry**: Register and discover x402-enabled API endpoints
- **AI Tool Generation**: Auto-generate tool definitions for OpenAI, Anthropic, and LangChain
- **Time-Windowed Metrics**: Track performance with comprehensive analytics
- **Wallet Management**: Simplified embedded wallet support with free-tier options

## Quick Start

```typescript
import {
  createFacilitatorRegistry,
  createFacilitatorClient,
  createResourceRegistry,
  createAIToolGenerator,
  fetchWithX402Payment
} from '@ghostspeak/sdk/x402';

// 1. Set up facilitator registry
const registry = createFacilitatorRegistry();

// 2. Create facilitator client
const client = createFacilitatorClient({
  registry,
  apiKeys: {
    coinbase: 'your-api-key'
  }
});

// 3. Discover resources
const resources = await client.discoverResourcesMerged({
  network: 'solana',
  capability: 'text-generation'
});

// 4. Generate AI tools
const generator = createAIToolGenerator();
const openaiTools = generator.generateOpenAITools(resources);
```

## Facilitator Integration

### Understanding Facilitators

Facilitators are payment processors that handle x402 transaction verification and settlement. They enable cross-chain payments and provide discovery services.

### Known Facilitators

GhostSpeak includes configurations for major x402 facilitators:

| Facilitator | Networks | Discovery | Features |
|-------------|----------|-----------|----------|
| GhostSpeak | Solana | ✅ | Native escrow, reputation |
| Coinbase | Base, Solana, Polygon | ✅ | Multi-chain, high volume |
| ThirdWeb | Base, Polygon, Arbitrum | ❌ | Web3 integration |
| PayAI | Solana, Base | ✅ | AI-focused |
| AurraCloud | Base, Solana | ✅ | Agent payments |
| x402scan Auto | All | ✅ | Load balancing |

### Facilitator Client

```typescript
import {
  createFacilitatorRegistry,
  createFacilitatorClient,
  Network
} from '@ghostspeak/sdk/x402';

const registry = createFacilitatorRegistry();
const client = createFacilitatorClient({
  registry,
  apiKeys: {
    coinbase: process.env.COINBASE_API_KEY,
    thirdweb: process.env.THIRDWEB_SECRET_KEY
  },
  timeout: 30000,
  retryAttempts: 3
});

// Verify a payment
const verification = await client.verifyPayment('coinbase', {
  paymentHeader: 'x-payment-header-value',
  paymentRequirements: {
    scheme: 'exact',
    network: 'solana',
    maxAmountRequired: '1000000',
    payTo: 'facilitator-address',
    asset: 'USDC-token-address'
  }
});

// Settle a payment
const settlement = await client.settlePayment('coinbase', {
  paymentHeader: 'x-payment-header-value',
  paymentRequirements: paymentReqs
});

// Health checks
const health = await client.checkHealthAll();
```

### Load Balancing

```typescript
// Auto-select the healthiest facilitator
const bestFacilitator = await client.loadBalance(
  ['coinbase', 'thirdweb', 'payai'],
  Network.SOLANA
);

// Execute with automatic failover
const result = await client.executeWithFailover(
  ['coinbase', 'thirdweb'],
  async (facilitatorId) => {
    return client.verifyPayment(facilitatorId, request);
  }
);
```

## Resource Registry

### Registering Resources

```typescript
import { createResourceRegistry } from '@ghostspeak/sdk/x402';

const registry = createResourceRegistry({
  pingTimeout: 10000,
  enableAILabeling: true,
  aiLabelingApiKey: process.env.OPENAI_API_KEY
});

// Register a new resource
const result = await registry.registerResource({
  url: 'https://api.example.com/v1/generate',
  tags: ['ai', 'text-generation'],
  forceRefresh: false
});

if (result.success) {
  console.log('Registered:', result.resource);
}
```

### Pinging Resources

```typescript
// Ping a resource to validate its x402 response
const pingResult = await registry.pingResource(
  'https://api.example.com/v1/generate'
);

console.log({
  success: pingResult.success,
  statusCode: pingResult.statusCode,
  latencyMs: pingResult.latencyMs,
  hasValidX402: pingResult.hasValidX402,
  x402Response: pingResult.x402Response
});
```

### Searching Resources

```typescript
const searchResults = registry.search({
  query: 'text generation',
  category: 'text-generation',
  network: 'solana',
  maxPrice: 1000000n, // 1 USDC
  isActive: true,
  sortBy: 'price',
  sortOrder: 'asc',
  page: 1,
  pageSize: 20
});

console.log(`Found ${searchResults.total} resources`);
```

## AI Tool Generation

### OpenAI Integration

```typescript
import { createAIToolGenerator } from '@ghostspeak/sdk/x402';
import OpenAI from 'openai';

const generator = createAIToolGenerator();
const resources = registry.getAll();

// Generate OpenAI function calling tools
const tools = generator.generateOpenAITools(resources);

const openai = new OpenAI();
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Generate a haiku about AI' }],
  tools,
  tool_choice: 'auto'
});

// Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls ?? []) {
  const args = JSON.parse(toolCall.function.arguments);
  const resource = resources.find(r => 
    generator.generateOpenAITool(r).function.name === toolCall.function.name
  );
  
  if (resource) {
    const result = await fetchWithX402Payment(
      resource.url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      },
      wallet,
      createPaymentHeader
    );
    console.log(await result.json());
  }
}
```

### Anthropic Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropicTools = generator.generateAnthropicTools(resources);

const anthropic = new Anthropic();
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Your prompt' }],
  tools: anthropicTools
});
```

### LangChain Integration

```typescript
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';

const langchainTools = generator.generateLangChainTools(resources);

// Each tool needs a func property for execution
const executableTools = langchainTools.map(tool => ({
  ...tool,
  func: async (args) => {
    const resource = resources.find(r => 
      generator.sanitizeName(r.name) === tool.name
    );
    const response = await fetchWithX402Payment(resource.url, {
      method: 'POST',
      body: JSON.stringify(args)
    }, wallet, createPaymentHeader);
    return response.json();
  }
}));
```

### Integration Snippets

```typescript
// Generate copy-paste ready code
const openaiSnippet = generator.generateIntegrationSnippet(resource, 'openai');
const anthropicSnippet = generator.generateIntegrationSnippet(resource, 'anthropic');
const langchainSnippet = generator.generateIntegrationSnippet(resource, 'langchain');
```

## Fetch with Payment

### Basic Usage

```typescript
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const response = await fetchWithX402Payment(
  'https://api.example.com/generate',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Hello' })
  },
  wallet,
  createPaymentHeader,
  {
    maxPayment: 1000000n, // 1 USDC max
    preferredNetwork: 'solana',
    timeout: 30000
  }
);

// Access payment info
console.log('Payment made:', response.paymentInfo);
const data = await response.json();
```

### Wrapped Fetch

```typescript
import { wrapFetchWithPayment } from '@ghostspeak/sdk/x402';

// Create a wrapped fetch that auto-handles payments
const x402Fetch = wrapFetchWithPayment(wallet, createPaymentHeader, {
  maxPayment: 5000000n, // 5 USDC default max
  preferredNetwork: 'solana'
});

// Use like regular fetch
const response = await x402Fetch('https://api.example.com/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Hello' })
});
```

## Wallet Management

### Basic Wallet Manager

```typescript
import { createWalletManager, WalletType } from '@ghostspeak/sdk/x402';

const walletManager = createWalletManager({
  freeTierConfig: {
    sharedWalletAddress: 'SHARED_WALLET_ADDRESS',
    maxAmountPerRequest: 100000n, // 0.1 USDC
    dailyLimit: 1000000n // 1 USDC per user per day
  },
  enableUsageTracking: true
});

// Get or create wallet for user
const wallet = await walletManager.getOrCreateWallet('user-123');

// Check free tier eligibility
const isEligible = await walletManager.isFreeTierEligible('user-123');

// Get best signer for payment
const { signer, type } = await walletManager.getBestSigner('user-123', 500000n);
console.log(`Using ${type} wallet`);
```

### Usage Tracking

```typescript
// Record usage
await walletManager.recordUsage('user-123', 500000n);

// Check remaining limit
const remaining = await walletManager.getRemainingLimit('user-123');
console.log(`Remaining: ${remaining} (${Number(remaining) / 1_000_000} USDC)`);
```

## Time-Windowed Metrics

### Tracking Metrics

```typescript
import { createTimeWindowedMetricsAggregator } from '@ghostspeak/sdk/x402';

const metricsAggregator = createTimeWindowedMetricsAggregator({
  maxEventsPerWindow: 10000,
  cleanupIntervalMs: 60000
});

// Record events
metricsAggregator.recordEvent({
  resourceId: 'res-123',
  timestamp: Date.now(),
  latencyMs: 150,
  statusCode: 200,
  success: true,
  paymentAmount: 1000000n,
  payerAddress: 'user-wallet-address'
});

// Get metrics for a specific window
const metrics = metricsAggregator.getWindowMetrics('res-123', '24h');
console.log({
  requests: metrics.requests,
  latency: metrics.latency,
  payments: metrics.payments
});
```

### Available Time Windows

- `1h` - Last hour
- `6h` - Last 6 hours
- `24h` - Last 24 hours
- `3d` - Last 3 days
- `7d` - Last 7 days
- `15d` - Last 15 days
- `30d` - Last 30 days
- `all` - All time

### Global Metrics

```typescript
const globalMetrics = metricsAggregator.getGlobalMetrics('24h');
console.log({
  totalResources: globalMetrics.totalResources,
  activeResources: globalMetrics.activeResources,
  totalRequests: globalMetrics.requests.total,
  paymentVolume: globalMetrics.payments.volume
});

// Get top resources
const topByVolume = metricsAggregator.getTopResources('24h', 'volume', 10);
const topByRequests = metricsAggregator.getTopResources('24h', 'requests', 10);
```

## Enhanced x402 Schema

### Extending Standard x402

```typescript
import { createInputSchema, createOutputSchema } from '@ghostspeak/sdk/x402';

// Create AI-friendly input schema
const inputSchema = createInputSchema({
  type: 'text',
  fields: {
    prompt: { type: 'string', description: 'Input prompt', required: true },
    style: { type: 'string', description: 'Output style' }
  }
});

// Create output schema
const outputSchema = createOutputSchema({
  type: 'text',
  fields: {
    confidence: { type: 'number', description: 'Confidence score' }
  }
});
```

### Validation

```typescript
import { validateX402Response, parseX402Response } from '@ghostspeak/sdk/x402';

// Validate response object
const validation = validateX402Response(responseObject);
if (validation.valid) {
  console.log('Valid x402 response:', validation.response);
} else {
  console.error('Validation errors:', validation.errors);
}

// Parse from string
const parseResult = parseX402Response(jsonString);
if (parseResult.valid) {
  const enhanced = parseResult.response;
  console.log('Input schema:', enhanced.inputSchema);
  console.log('Output schema:', enhanced.outputSchema);
}
```

## API Reference

### Facilitator Registry

| Method | Description |
|--------|-------------|
| `getAll()` | Get all registered facilitators |
| `getEnabled()` | Get only enabled facilitators |
| `get(id)` | Get facilitator by ID |
| `register(config)` | Register a new facilitator |
| `update(id, updates)` | Update facilitator config |
| `remove(id)` | Remove a facilitator |
| `getByNetwork(network)` | Get facilitators supporting a network |
| `getWithDiscovery()` | Get facilitators with discovery support |
| `selectBest(criteria)` | Select best facilitator based on criteria |

### Facilitator Client

| Method | Description |
|--------|-------------|
| `verifyPayment(id, request)` | Verify payment through facilitator |
| `settlePayment(id, request)` | Settle payment through facilitator |
| `discoverResources(id, options)` | Discover resources from facilitator |
| `discoverResourcesAll(options)` | Discover from all facilitators |
| `checkHealth(id)` | Check facilitator health |
| `loadBalance(ids, network)` | Select healthiest facilitator |

### Resource Registry

| Method | Description |
|--------|-------------|
| `registerResource(request)` | Register a new resource |
| `pingResource(url)` | Ping and validate resource |
| `parseX402Response(body)` | Parse x402 response |
| `scrapeOriginMetadata(origin)` | Scrape origin metadata |
| `search(options)` | Search resources |
| `labelWithAI(resourceId)` | Auto-tag with AI |

### AI Tool Generator

| Method | Description |
|--------|-------------|
| `generateOpenAITool(resource)` | Generate OpenAI tool |
| `generateAnthropicTool(resource)` | Generate Anthropic tool |
| `generateLangChainTool(resource)` | Generate LangChain tool |
| `generateMCPTool(resource)` | Generate MCP tool |
| `generateIntegrationSnippet(resource, platform)` | Generate integration code |

## Best Practices

1. **Cache facilitator health checks** to avoid excessive network calls
2. **Use load balancing** for production reliability
3. **Set appropriate maxPayment limits** to prevent overspending
4. **Enable AI labeling** for better resource discoverability
5. **Track metrics** to monitor performance and costs
6. **Use free-tier wallets** for onboarding new users

## See Also

- [x402 Payment Flow](/docs/core/x402-payment-flow)
- [x402 API Examples](/docs/api/x402-api-examples)
- [x402 Migration Guide](/docs/guides/x402-migration-guide)
