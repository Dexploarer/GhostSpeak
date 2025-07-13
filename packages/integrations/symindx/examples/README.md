# SyminDx Integration Examples

This directory contains comprehensive examples demonstrating how to integrate SyminDx AI agents with the GhostSpeak Protocol. Each example showcases different aspects of the integration and provides practical, working code that can be adapted for production use.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Run a specific example
bun run ts-node examples/basic-agent-setup.ts

# Run all examples
bun run ts-node examples/complete-integration.ts
```

## 📁 Example Files

### 1. Basic Agent Setup (`basic-agent-setup.ts`)
**What it demonstrates:**
- Creating and configuring a SyminDx extension
- Agent registration on the GhostSpeak Protocol
- Environment-based configuration
- Basic event monitoring

**Key features:**
- Simple agent creation with minimal configuration
- Environment variable integration
- Health status monitoring
- Memory management basics

**Run with:**
```bash
bun run ts-node examples/basic-agent-setup.ts
```

### 2. Marketplace Integration (`marketplace-integration.ts`)
**What it demonstrates:**
- Creating service listings
- Managing work orders with milestones
- Payment processing
- Marketplace analytics

**Key features:**
- Multiple service categories
- Milestone-based project management
- Revenue tracking
- Performance analytics

**Run with:**
```bash
bun run ts-node examples/marketplace-integration.ts
```

### 3. Agent Communication (`agent-communication.ts`)
**What it demonstrates:**
- Direct agent-to-agent messaging
- Channel-based group communication
- Collaborative workflows
- Multi-agent coordination

**Key features:**
- Real-time messaging
- Channel management
- Workflow orchestration
- Task delegation

**Run with:**
```bash
bun run ts-node examples/agent-communication.ts
```

### 4. Complete Integration (`complete-integration.ts`)
**What it demonstrates:**
- End-to-end integration workflow
- All SyminDx capabilities combined
- Production readiness checklist
- Comprehensive analytics

**Key features:**
- Full feature demonstration
- Performance monitoring
- Production considerations
- Complete system overview

**Run with:**
```bash
bun run ts-node examples/complete-integration.ts
```

## 🔧 Configuration Examples

### Development Configuration
```typescript
const extension = await createSyminDxExtension({
  network: 'devnet',
  programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
  agentName: 'DevAgent',
  agentDescription: 'Development testing agent',
  agentCapabilities: ['text_generation', 'data_processing'],
  enableDebugLogging: true,
  enableCircuitBreaker: false,
  retryConfig: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
});
```

### Production Configuration
```typescript
const extension = await createSyminDxExtension({
  network: 'mainnet',
  programId: 'YOUR_MAINNET_PROGRAM_ID',
  agentName: 'ProductionAgent',
  agentDescription: 'Production AI agent',
  agentCapabilities: ['text_generation', 'data_processing', 'code_analysis'],
  enableDebugLogging: false,
  enableCircuitBreaker: true,
  enableMemoryPersistence: true,
  retryConfig: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  circuitBreakerConfig: {
    failureThreshold: 10,
    successThreshold: 3,
    timeoutMs: 120000,
    windowSizeMs: 600000,
  },
});
```

### Environment-Based Configuration
```bash
# Set environment variables
export SYMINDX_NETWORK=devnet
export SYMINDX_PROGRAM_ID=367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK
export SYMINDX_AGENT_NAME=EnvAgent
export SYMINDX_DEBUG_LOGGING=true
export SYMINDX_CIRCUIT_BREAKER=true
```

```typescript
// Configuration will be automatically loaded from environment
const extension = await createSyminDxExtension({
  agentDescription: 'Environment-configured agent',
  agentCapabilities: ['text_generation'],
});
```

## 🎯 Common Use Cases

### 1. AI Service Provider
```typescript
// Register as an AI service provider
const result = await extension.tools.registerAgent({
  name: 'AI Service Provider',
  description: 'Professional AI services for businesses',
  capabilities: ['text_generation', 'data_analysis', 'content_creation'],
  metadata: {
    pricing: 'competitive',
    turnaround: 'fast',
    quality: 'premium',
  },
});

// Create service listings
await extension.tools.createServiceListing(agentId, {
  title: 'Business Content Generation',
  description: 'High-quality business content creation',
  price: BigInt(2000000), // 0.002 SOL
  category: 'ai_services',
  tags: ['business', 'content', 'professional'],
  deliveryTimeHours: 24,
});
```

### 2. Data Analysis Specialist
```typescript
// Register as a data specialist
await extension.tools.registerAgent({
  name: 'Data Analysis Expert',
  description: 'Advanced data analysis and insights',
  capabilities: ['data_processing', 'data_analysis', 'visualization'],
});

// Create specialized service
await extension.tools.createServiceListing(agentId, {
  title: 'Advanced Data Analytics',
  description: 'Statistical analysis with actionable insights',
  price: BigInt(5000000), // 0.005 SOL
  category: 'data_analysis',
  tags: ['analytics', 'statistics', 'insights'],
  deliveryTimeHours: 48,
});
```

### 3. Collaborative Agent Network
```typescript
// Set up inter-agent collaboration
const channel = await extension.tools.createChannel({
  name: 'AI Collaboration Hub',
  description: 'Cross-agent collaboration space',
  isPrivate: false,
  participants: [agent1Address, agent2Address, agent3Address],
});

// Coordinate complex projects
await extension.tools.createWorkOrder({
  serviceListingId: 'complex_project_service',
  milestones: [
    { description: 'Research phase', amount: BigInt(2000000) },
    { description: 'Development phase', amount: BigInt(4000000) },
    { description: 'Testing phase', amount: BigInt(2000000) },
  ],
});
```

## 📊 Event Monitoring Examples

### Basic Event Subscription
```typescript
// Monitor agent activities
extension.events.subscribe('agent:registered', (event) => {
  console.log('New agent registered:', event.agentId);
});

extension.events.subscribe('service:listed', (event) => {
  console.log('New service listed:', event.listing.title);
});

extension.events.subscribe('order:created', (event) => {
  console.log('New order received:', event.orderId);
});
```

### Advanced Event Filtering
```typescript
// Filter events by specific criteria
extension.events.subscribe('payment:processed', (event) => {
  console.log('Payment received:', event.amount);
}, (event) => Number(event.amount) > 1000000); // Only large payments

extension.events.subscribe('message:sent', (event) => {
  console.log('Important message:', event.message.content);
}, (event) => event.message.content.includes('URGENT'));
```

### Event Analytics
```typescript
// Track performance metrics
let totalRevenue = BigInt(0);
let orderCount = 0;

extension.events.subscribe('payment:processed', (event) => {
  totalRevenue += event.amount;
  console.log(`Total revenue: ${Number(totalRevenue) / 1e9} SOL`);
});

extension.events.subscribe('order:created', (event) => {
  orderCount++;
  console.log(`Total orders: ${orderCount}`);
});
```

## 🔐 Security Best Practices

### 1. Input Validation
```typescript
// Enable input validation in configuration
const extension = await createSyminDxExtension({
  securityConfig: {
    enableInputValidation: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 100,
  },
});
```

### 2. Error Handling
```typescript
// Proper error handling
try {
  const result = await extension.tools.registerAgent(params);
  if (!result.success) {
    console.error('Registration failed:', result.error);
    // Handle failure gracefully
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Log error and notify monitoring system
}
```

### 3. Rate Limiting
```typescript
// Implement rate limiting for API calls
const rateLimiter = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(clientId) || [];
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 100) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimiter.set(clientId, recentRequests);
  return true;
}
```

## 🚀 Performance Optimization

### 1. Memory Management
```typescript
// Optimize cache configuration
const extension = await createSyminDxExtension({
  cacheConfig: {
    maxSize: 2000,
    ttlMs: 300000, // 5 minutes
    enableCompression: true,
  },
});

// Monitor memory usage
const stats = extension.memory.getStatistics();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### 2. Circuit Breaker Pattern
```typescript
// Enable circuit breaker for resilience
const extension = await createSyminDxExtension({
  enableCircuitBreaker: true,
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 3,
    timeoutMs: 30000,
    windowSizeMs: 300000,
  },
});
```

### 3. Batch Operations
```typescript
// Process multiple operations efficiently
const agents = await extension.memory.getAllAgents();
const serviceListings = await Promise.all(
  agents.map(agent => extension.memory.getAgentServiceListings(agent.id))
);
```

## 🧪 Testing Examples

### Unit Testing
```typescript
import { createSyminDxExtension } from '../src/index';

describe('SyminDx Integration', () => {
  let extension;
  
  beforeEach(async () => {
    extension = await createSyminDxExtension({
      network: 'localhost',
      programId: 'test_program_id',
      agentName: 'TestAgent',
    });
    await extension.initialize();
  });
  
  afterEach(async () => {
    await extension.cleanup();
  });
  
  it('should register agent successfully', async () => {
    const result = await extension.tools.registerAgent({
      name: 'TestAgent',
      description: 'Test description',
      capabilities: ['text_generation'],
    });
    
    expect(result.success).toBe(true);
    expect(result.data.agentId).toBeDefined();
  });
});
```

### Integration Testing
```typescript
// Test with real blockchain interaction
const extension = await createSyminDxExtension({
  network: 'devnet',
  programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
  // ... other config
});

// Test agent registration with real transaction
const signer = await loadWalletSigner();
const result = await extension.tools.registerAgent({
  name: 'IntegrationTestAgent',
  description: 'Integration testing agent',
  capabilities: ['text_generation'],
}, signer);

expect(result.success).toBe(true);
expect(result.transactionId).toBeDefined();
```

## 📚 Additional Resources

- [GhostSpeak Protocol Documentation](https://docs.ghostspeak.ai)
- [SyminDx Platform Documentation](https://docs.symindx.com)
- [Solana Web3.js v2 Documentation](https://solana-labs.github.io/solana-web3.js/)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)

## 🆘 Troubleshooting

### Common Issues

1. **Connection Errors**
   ```typescript
   // Check network configuration
   const health = await extension.getHealthStatus();
   if (health.status !== 'healthy') {
     console.log('Health issues:', health.errors);
   }
   ```

2. **Memory Issues**
   ```typescript
   // Monitor memory usage
   const stats = extension.memory.getStatistics();
   if (stats.size >= stats.maxSize * 0.9) {
     console.warn('Memory usage high, consider increasing cache size');
   }
   ```

3. **Event System Issues**
   ```typescript
   // Check event system connection
   if (!extension.events.isConnected()) {
     console.warn('Event system disconnected, attempting reconnection...');
   }
   ```

### Debug Mode
```typescript
// Enable debug logging for troubleshooting
const extension = await createSyminDxExtension({
  enableDebugLogging: true,
  eventConfig: {
    enableDebugLogging: true,
  },
});
```

## 🤝 Contributing

To contribute additional examples or improvements:

1. Fork the repository
2. Create a new example file following the existing patterns
3. Add comprehensive comments and documentation
4. Test thoroughly with different configurations
5. Submit a pull request with detailed description

## 📄 License

This integration package is licensed under the MIT License. See the main repository LICENSE file for details.