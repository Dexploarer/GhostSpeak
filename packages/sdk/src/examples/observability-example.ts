/**
 * Example usage of the GhostSpeak Observability System
 * Demonstrates comprehensive monitoring, logging, and debugging capabilities
 */

import { 
  initializeObservability, 
  getObservability, 
  withObservability, 
  observed,
  type ObservabilityConfig 
} from '../observability';
import { createDashboardServer } from '../observability/dashboard';

// Example configuration for different environments
const developmentConfig: Partial<ObservabilityConfig> = {
  logLevel: 'debug',
  environment: 'development',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  enableHealthChecks: true,
  enableAlerts: true,
  retentionPeriodDays: 7,
  samplingRate: 1.0, // 100% sampling in development
};

const productionConfig: Partial<ObservabilityConfig> = {
  logLevel: 'warn',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  enableAnalytics: true,
  enableHealthChecks: true,
  enableAlerts: true,
  retentionPeriodDays: 90,
  samplingRate: 0.1, // 10% sampling in production
  endpoints: {
    metrics: 'https://metrics.ghostspeak.io',
    traces: 'https://traces.ghostspeak.io',
    logs: 'https://logs.ghostspeak.io',
    alerts: 'https://alerts.ghostspeak.io',
  },
};

// Initialize observability system
export async function setupObservability() {
  const config = process.env.NODE_ENV === 'production' 
    ? productionConfig 
    : developmentConfig;

  const observability = initializeObservability(config);

  // Setup Solana-specific monitoring
  observability.setupSolanaMonitoring(
    'https://api.devnet.solana.com',
    '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP'
  );

  // Instrument SDK operations
  observability.instrumentSDK();

  // Start background monitoring
  observability.startMonitoring();

  // Create dashboard server (development only)
  if (process.env.NODE_ENV !== 'production') {
    createDashboardServer(observability, 3001);
    console.log('📊 Observability dashboard available at http://localhost:3001');
  }

  return observability;
}

// Example service class with observability decorators
export class ExampleAgentService {
  private observability = getObservability();
  private logger = this.observability.getLogger('agent-service');

  // Method with automatic observability using decorator
  @observed('create_agent', 'agent-service')
  async createAgent(name: string, capabilities: string[]): Promise<string> {
    // Business logic here
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    
    const agentId = `agent_${Date.now()}`;
    
    // Manual logging with context
    this.logger.info(
      {
        agentId,
        name,
        capabilities,
        operation: 'create_agent',
      },
      `Agent created: ${name}`
    );

    // Track business metrics
    this.observability.getAnalytics().trackBusinessEvent(
      'agent_created',
      1,
      'count',
      { name, capabilityCount: capabilities.length }
    );

    return agentId;
  }

  // Method with manual observability instrumentation
  async processMessage(agentId: string, message: string): Promise<string> {
    return withObservability('process_message', async () => {
      const tracer = this.observability.getTracer();
      const metrics = this.observability.getMetrics();
      
      // Start a child span for detailed tracing
      const span = tracer.startSpan('message_processing', 'agent-service');
      span.tags!.agentId = agentId;
      span.tags!.messageLength = message.length.toString();

      try {
        // Simulate message processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Record metrics
        metrics.increment('ghostspeak_messages_processed_total', {
          agent_id: agentId,
          status: 'success',
        });

        tracer.finishSpan(span, 'success');
        
        return `Processed: ${message}`;
      } catch (error) {
        // Error will be automatically captured by withObservability
        tracer.finishSpan(span, 'error', error as Error);
        throw error;
      }
    }, 'agent-service');
  }

  // Method that demonstrates error tracking
  async riskyOperation(shouldFail: boolean = false): Promise<string> {
    const performance = this.observability.getPerformance();
    const errorTracker = this.observability.getErrors();

    const measurementId = performance.startMeasurement('risky_operation', 'agent-service');

    try {
      if (shouldFail) {
        throw new Error('Simulated failure for testing');
      }

      // Add debug breadcrumb
      errorTracker.addBreadcrumb(
        'operation',
        'Risky operation completed successfully',
        'info',
        { shouldFail }
      );

      performance.endMeasurement(measurementId);
      return 'Success!';
    } catch (error) {
      // Error context will include breadcrumbs automatically
      performance.endMeasurement(measurementId, { error: true });
      throw error;
    }
  }
}

// Example health check registration
export function registerCustomHealthChecks() {
  const health = getObservability().getHealth();

  // Custom business logic health check
  health.registerCheck('agent_service', async () => {
    try {
      // Check if agent service is responsive
      const testService = new ExampleAgentService();
      await testService.createAgent('health-check', ['test']);

      return {
        name: 'agent_service',
        status: 'healthy',
        message: 'Agent service is responsive',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'agent_service',
        status: 'critical',
        message: `Agent service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
    }
  });

  // Database connection health check (example)
  health.registerCheck('database', async () => {
    // Simulate database health check
    const isHealthy = Math.random() > 0.1; // 90% success rate
    
    return {
      name: 'database',
      status: isHealthy ? 'healthy' : 'warning',
      message: isHealthy ? 'Database connection OK' : 'Database connection slow',
      timestamp: Date.now(),
      metadata: {
        connectionPool: isHealthy ? 'available' : 'limited',
        latency: Math.round(Math.random() * 100),
      },
    };
  });
}

// Example alert configuration
export function setupCustomAlerts() {
  const alerts = getObservability().getAlerts();

  // High agent creation rate alert
  alerts.addRule({
    id: 'high_agent_creation_rate',
    name: 'High Agent Creation Rate',
    condition: 'agents_created_total > 100', // Custom condition
    level: 'warning',
    enabled: true,
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    actions: [
      {
        type: 'log',
        config: {},
      },
      {
        type: 'webhook',
        config: {
          url: process.env.SLACK_WEBHOOK_URL || '',
        },
      },
    ],
  });

  // Service failure alert
  alerts.addRule({
    id: 'service_failure',
    name: 'Service Failure Detected',
    condition: 'error_rate > 0.1', // 10% error rate
    level: 'critical',
    enabled: true,
    cooldownMs: 2 * 60 * 1000, // 2 minutes
    actions: [
      {
        type: 'log',
        config: {},
      },
      {
        type: 'pagerduty',
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
        },
      },
    ],
  });
}

// Example analytics tracking
export function setupAnalyticsTracking() {
  const analytics = getObservability().getAnalytics();

  // Define user journey funnel
  analytics.defineFunnel('agent_creation_funnel', [
    { type: 'page_view', action: 'view' },
    { type: 'user_action', action: 'start_agent_creation' },
    { type: 'user_action', action: 'configure_agent' },
    { type: 'business', action: 'agent_created' },
  ]);

  // Track user actions
  analytics.trackUserAction('page_visit', 'dashboard', undefined, {
    source: 'direct',
    campaign: 'organic',
  });

  console.log('Analytics funnel configured for agent creation tracking');
}

// Example usage and demo
export async function runObservabilityDemo() {
  console.log('🔍 Starting GhostSpeak Observability Demo...');

  // Initialize observability
  const observability = await setupObservability();
  
  // Register custom health checks
  registerCustomHealthChecks();
  
  // Setup alerts
  setupCustomAlerts();
  
  // Setup analytics
  setupAnalyticsTracking();

  // Create example service
  const agentService = new ExampleAgentService();

  console.log('📊 Running example operations with observability...');

  try {
    // Test successful operations
    for (let i = 0; i < 5; i++) {
      const agentId = await agentService.createAgent(`Agent-${i}`, ['chat', 'analysis']);
      await agentService.processMessage(agentId, `Hello from agent ${i}`);
      await agentService.riskyOperation(false);
    }

    // Test error handling
    try {
      await agentService.riskyOperation(true);
    } catch (error) {
      console.log('✅ Error captured and tracked successfully');
    }

    // Generate comprehensive status report
    const report = await observability.generateStatusReport();
    console.log('📈 System Status Report:');
    console.log(JSON.stringify(report, null, 2));

    // Export data in different formats
    console.log('\n📤 Exporting observability data...');
    
    // Export as Prometheus metrics
    const prometheusData = observability.exportData('prometheus');
    console.log('✅ Prometheus metrics exported');
    
    // Export as JSON
    const jsonData = observability.exportData('json');
    console.log('✅ JSON data exported');

    console.log('\n🎉 Observability demo completed successfully!');
    console.log('🔗 Dashboard: http://localhost:3001');
    console.log('📊 Metrics: Available via getObservability().getMetrics()');
    console.log('🔍 Traces: Available via getObservability().getTracer()');
    console.log('🚨 Alerts: Available via getObservability().getAlerts()');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Auto-run demo if this file is executed directly
if (require.main === module) {
  runObservabilityDemo().catch(console.error);
}

// Export for use in other files
export {
  ExampleAgentService,
  setupObservability,
  registerCustomHealthChecks,
  setupCustomAlerts,
  setupAnalyticsTracking,
};