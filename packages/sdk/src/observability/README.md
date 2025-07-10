# GhostSpeak Observability System

A comprehensive observability platform providing logging, monitoring, tracing, metrics, analytics, and debugging capabilities for the GhostSpeak protocol.

## 🌟 Features

### 📊 **Comprehensive Metrics Collection**
- Counter, gauge, histogram, and summary metrics
- Business metrics tracking (revenue, transactions, user engagement)
- Performance metrics (duration, throughput, error rates)
- System metrics (memory, CPU, event loop lag)
- Prometheus-compatible export format

### 🔍 **Distributed Tracing**
- Request flow tracking across components
- Parent-child span relationships
- Performance bottleneck identification
- Jaeger-compatible trace export
- Automatic trace correlation

### 📝 **Structured Logging**
- Component-based logger factory
- Correlation ID tracking
- Log aggregation and retention
- Environment-specific configuration
- Sensitive data redaction

### 🏥 **Health Monitoring**
- System health checks (memory, CPU, event loop)
- Solana blockchain health monitoring
- GhostSpeak protocol-specific checks
- Custom health check registration
- Health status endpoints for load balancers

### 🚨 **Alerting System**
- Rule-based alert triggers
- Multiple notification channels (email, webhook, Slack, PagerDuty)
- Alert cooldown and deduplication
- Severity-based escalation
- Alert resolution tracking

### 📈 **Analytics & Business Intelligence**
- User behavior tracking
- Conversion funnel analysis
- Business metrics dashboard
- User journey mapping
- Feature adoption tracking

### 🐛 **Error Tracking & Debugging**
- Automatic error capture and grouping
- Error breadcrumb trail
- Remote debugging capabilities
- Error impact analysis
- Resolution tracking

### 🚀 **Performance Monitoring**
- Operation timing and profiling
- Memory usage tracking
- CPU utilization monitoring
- Performance threshold alerts
- Optimization recommendations

### 📊 **Real-time Dashboard**
- Web-based monitoring dashboard
- Real-time metrics visualization
- Health status overview
- Performance analytics
- Mobile-responsive design

## 🚀 Quick Start

### Installation

The observability system is included with the GhostSpeak SDK and uses tree-shakeable exports:

```typescript
import { 
  initializeObservability, 
  getObservability, 
  withObservability 
} from '@ghostspeak/sdk';
```

### Basic Setup

```typescript
import { initializeObservability } from '@ghostspeak/sdk';

// Initialize with default configuration
const observability = initializeObservability();

// Setup Solana monitoring
observability.setupSolanaMonitoring(
  'https://api.devnet.solana.com',
  '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP'
);

// Start monitoring
observability.startMonitoring();
```

### Environment-Specific Configuration

```typescript
// Development configuration
const devConfig = {
  logLevel: 'debug',
  environment: 'development',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  retentionPeriodDays: 7,
  samplingRate: 1.0, // 100% sampling
};

// Production configuration
const prodConfig = {
  logLevel: 'warn',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  retentionPeriodDays: 90,
  samplingRate: 0.1, // 10% sampling
  endpoints: {
    metrics: 'https://metrics.your-domain.com',
    traces: 'https://traces.your-domain.com',
    logs: 'https://logs.your-domain.com',
  },
};

const observability = initializeObservability(
  process.env.NODE_ENV === 'production' ? prodConfig : devConfig
);
```

## 📚 Usage Examples

### Automatic Instrumentation with Decorators

```typescript
import { observed } from '@ghostspeak/sdk';

class AgentService {
  @observed('create_agent', 'agent-service')
  async createAgent(name: string, capabilities: string[]): Promise<string> {
    // Method is automatically traced, timed, and logged
    const agentId = `agent_${Date.now()}`;
    
    // Business logic here
    await this.performAgentCreation(name, capabilities);
    
    return agentId;
  }
}
```

### Manual Instrumentation

```typescript
import { withObservability, getObservability } from '@ghostspeak/sdk';

async function processTransaction(transactionData: any) {
  return withObservability('process_transaction', async () => {
    const obs = getObservability();
    
    // Add custom metrics
    obs.getMetrics().increment('transactions_processed_total', {
      type: transactionData.type,
      status: 'started',
    });
    
    // Add tracing context
    const tracer = obs.getTracer();
    const span = tracer.getActiveSpan();
    if (span) {
      span.tags!.transactionId = transactionData.id;
      span.tags!.amount = transactionData.amount.toString();
    }
    
    // Process transaction
    const result = await executeTransaction(transactionData);
    
    // Track business metrics
    obs.getAnalytics().trackTransaction(
      'payment',
      transactionData.amount,
      'SOL',
      'completed',
      { transactionId: transactionData.id }
    );
    
    return result;
  }, 'transaction-service');
}
```

### Structured Logging

```typescript
import { getObservability } from '@ghostspeak/sdk';

const logger = getObservability().getLogger('my-component');

// Structured logging with context
logger.info(
  {
    userId: 'user123',
    operation: 'agent_interaction',
    agentId: 'agent456',
    duration: 150,
  },
  'User interaction with agent completed'
);

// Error logging with context
logger.error(
  {
    operation: 'create_agent',
    error: error.message,
    requestId: 'req789',
  },
  'Failed to create agent'
);

// Performance logging
logger.logPerformance('database_query', 250, {
  query: 'SELECT * FROM agents',
  rows: 50,
});

// Security event logging
logger.logSecurity('unauthorized_access', 'high', {
  userId: 'user123',
  endpoint: '/admin/agents',
  ipAddress: '192.168.1.100',
});
```

### Custom Health Checks

```typescript
import { getObservability } from '@ghostspeak/sdk';

const health = getObservability().getHealth();

// Register custom health check
health.registerCheck('database', async () => {
  try {
    await testDatabaseConnection();
    return {
      name: 'database',
      status: 'healthy',
      message: 'Database connection OK',
      timestamp: Date.now(),
      metadata: {
        connectionPool: 'available',
        latency: 25,
      },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'critical',
      message: `Database connection failed: ${error.message}`,
      timestamp: Date.now(),
    };
  }
});
```

### Custom Alerts

```typescript
import { getObservability } from '@ghostspeak/sdk';

const alerts = getObservability().getAlerts();

// Register alert rule
alerts.addRule({
  id: 'high_error_rate',
  name: 'High Error Rate',
  condition: 'error_rate > 0.05', // 5% error rate
  level: 'critical',
  enabled: true,
  cooldownMs: 5 * 60 * 1000, // 5 minutes
  actions: [
    {
      type: 'webhook',
      config: {
        url: 'https://hooks.slack.com/your-webhook-url',
      },
    },
    {
      type: 'pagerduty',
      config: {
        integrationKey: 'your-pagerduty-key',
      },
    },
  ],
});
```

### Analytics Tracking

```typescript
import { getObservability } from '@ghostspeak/sdk';

const analytics = getObservability().getAnalytics();

// Track user actions
analytics.trackUserAction('button_click', 'create_agent_button', 1, {
  page: 'dashboard',
  userType: 'premium',
});

// Track business events
analytics.trackBusinessEvent('subscription_purchase', 29.99, 'USD', {
  plan: 'premium',
  duration: 'monthly',
});

// Track agent interactions
analytics.trackAgentInteraction('chat', 'agent123', 'success', 1500, {
  messageCount: 5,
  sessionId: 'session456',
});

// Define conversion funnels
analytics.defineFunnel('agent_creation', [
  { type: 'page_view', action: 'view' },
  { type: 'user_action', action: 'start_creation' },
  { type: 'user_action', action: 'configure_agent' },
  { type: 'business', action: 'agent_created' },
]);
```

### Dashboard Setup

```typescript
import { createDashboardServer } from '@ghostspeak/sdk';

// Create dashboard server (development only)
if (process.env.NODE_ENV !== 'production') {
  const observability = getObservability();
  createDashboardServer(observability, 3001);
  console.log('Dashboard available at http://localhost:3001');
}
```

## 🏗 Architecture

### Core Components

1. **ObservabilitySystem** - Central coordinator and configuration manager
2. **StructuredLogger** - Component-based logging with correlation tracking
3. **MetricsCollector** - Multi-type metrics collection and aggregation
4. **TracingSystem** - Distributed tracing with span management
5. **HealthMonitor** - System and custom health check execution
6. **ErrorTracker** - Error capture, grouping, and analysis
7. **AnalyticsTracker** - Business metrics and user behavior tracking
8. **AlertingSystem** - Rule-based alerting with multiple channels
9. **PerformanceMonitor** - Operation timing and optimization
10. **MonitoringDashboard** - Real-time visualization interface

### Data Flow

```
Application Code
       ↓
Observability Decorators/Wrappers
       ↓
[Logger] [Metrics] [Tracer] [Analytics] [Errors]
       ↓
Aggregation & Storage
       ↓
[Dashboard] [Alerts] [Health Checks] [Reports]
       ↓
External Systems (Prometheus, Jaeger, etc.)
```

### Integration Points

- **Prometheus** - Metrics scraping endpoint
- **Jaeger** - Distributed tracing visualization
- **Elasticsearch** - Log aggregation and search
- **Grafana** - Advanced metrics dashboards
- **PagerDuty** - Incident management
- **Slack** - Real-time notifications

## 📊 Metrics Reference

### System Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|---------|
| `ghostspeak_uptime_seconds` | counter | Application uptime | - |
| `ghostspeak_memory_usage_bytes` | gauge | Memory usage | `type` |
| `ghostspeak_cpu_usage_percent` | gauge | CPU usage | - |
| `ghostspeak_eventloop_lag_milliseconds` | gauge | Event loop lag | - |

### Business Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|---------|
| `ghostspeak_agents_total` | gauge | Total agents | `status` |
| `ghostspeak_transactions_total` | counter | Total transactions | `type`, `status` |
| `ghostspeak_messages_total` | counter | Total messages | `type`, `status` |
| `ghostspeak_revenue` | counter | Revenue tracking | `currency`, `source` |

### Performance Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|---------|
| `ghostspeak_operation_duration` | histogram | Operation duration | `operation`, `component` |
| `ghostspeak_rpc_calls_total` | counter | RPC calls | `method`, `status` |
| `ghostspeak_error_rate` | gauge | Error rate | `component` |

## 🔧 Configuration Options

### ObservabilityConfig

```typescript
interface ObservabilityConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  environment: 'development' | 'staging' | 'production';
  enableTracing: boolean;
  enableMetrics: boolean;
  enableAnalytics: boolean;
  enableHealthChecks: boolean;
  enableAlerts: boolean;
  retentionPeriodDays: number;
  samplingRate: number; // 0.0 - 1.0
  endpoints?: {
    metrics?: string;
    traces?: string;
    logs?: string;
    health?: string;
    alerts?: string;
  };
}
```

### Environment Variables

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=development

# External Services
PROMETHEUS_ENDPOINT=http://localhost:9090
JAEGER_ENDPOINT=http://localhost:14268
ELASTICSEARCH_URL=http://localhost:9200

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_INTEGRATION_KEY=your-key
ALERT_WEBHOOK_URL=https://your-domain.com/alerts

# Dashboard
DASHBOARD_PORT=3001
DASHBOARD_ENABLED=true
```

## 🛠 Advanced Features

### Custom Metrics

```typescript
const metrics = getObservability().getMetrics();

// Register custom metric
metrics.registerMetric({
  name: 'custom_business_metric',
  type: 'counter',
  description: 'Custom business metric',
  labels: ['category', 'status'],
});

// Record values
metrics.increment('custom_business_metric', {
  category: 'agents',
  status: 'active',
});
```

### Performance Profiling

```typescript
const performance = getObservability().getPerformance();

// Profile function execution
const { result, measurement } = await performance.measureFunction(
  'expensive_operation',
  async () => {
    // Expensive operation here
    return performComplexCalculation();
  },
  'computation'
);

// Set performance thresholds
performance.setThreshold('database_query', {
  maxDuration: 1000, // 1 second
  maxMemory: 50 * 1024 * 1024, // 50MB
});
```

### Error Analysis

```typescript
const errors = getObservability().getErrors();

// Get error statistics
const stats = errors.getErrorStats();
console.log('Error rate:', stats.errorRate);
console.log('Top components with errors:', stats.topComponents);

// Get debug information for specific error
const debugInfo = errors.getDebugInfo('error-fingerprint');
console.log('Related breadcrumbs:', debugInfo.relatedBreadcrumbs);
```

### Data Export

```typescript
const observability = getObservability();

// Export for Prometheus
const prometheusMetrics = observability.exportData('prometheus');

// Export for Jaeger
const jaegerTraces = observability.exportData('jaeger');

// Export as JSON
const jsonData = observability.exportData('json');
```

## 🔒 Security & Privacy

### Data Redaction

Sensitive data is automatically redacted from logs:

- Passwords and secrets
- API keys and tokens
- Private keys and credentials
- Personal identifiable information (when configured)

### Secure Transmission

- HTTPS endpoints for external data transmission
- API key authentication for external services
- Data encryption in transit

### Access Control

- Role-based access to dashboard
- API key protection for metrics endpoints
- Audit logging for administrative actions

## 🚀 Performance Considerations

### Resource Usage

- **Memory**: ~10-50MB depending on retention settings
- **CPU**: <1% overhead for instrumented operations
- **Storage**: Configurable retention periods
- **Network**: Minimal for local collection, configurable for external exports

### Optimization

- Tree-shakeable exports minimize bundle size
- Sampling rates reduce overhead in production
- Async processing prevents blocking operations
- Efficient data structures for metric storage

## 🧪 Testing

### Unit Tests

```bash
# Run observability tests
npm test src/observability

# Run with coverage
npm run test:coverage src/observability
```

### Integration Tests

```bash
# Test with real Solana RPC
npm run test:integration observability

# Test dashboard functionality
npm run test:e2e dashboard
```

### Load Testing

```bash
# Stress test metrics collection
npm run test:load metrics

# Test tracing overhead
npm run test:performance tracing
```

## 📋 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce retention period
   - Lower sampling rate
   - Enable metric cleanup

2. **Missing Traces**
   - Check sampling rate
   - Verify tracer initialization
   - Ensure span finishing

3. **Dashboard Not Loading**
   - Check port availability
   - Verify observability initialization
   - Review browser console for errors

4. **Alerts Not Firing**
   - Verify rule conditions
   - Check cooldown periods
   - Validate webhook URLs

### Debug Mode

```typescript
// Enable debug logging
const observability = initializeObservability({
  logLevel: 'debug',
  environment: 'development',
});

// Get system status
const status = await observability.generateStatusReport();
console.log('System status:', status);
```

## 🤝 Contributing

See the main project [CONTRIBUTING.md](../../../CONTRIBUTING.md) for contribution guidelines.

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

This observability system is part of the GhostSpeak Protocol and is licensed under the same terms as the main project.

---

For more examples and advanced usage, see the [examples directory](../examples/) and the [API documentation](./docs/).