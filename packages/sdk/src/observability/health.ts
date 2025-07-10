/**
 * Health check endpoints and status monitoring
 */

import { getHealthMonitor, getResourceMonitor, getApplicationMonitor } from './monitoring';
import { getMetricsCollector } from './metrics';
import type { HealthStatus, SystemHealth } from './types';

// Health check service for external monitoring
export class HealthService {
  private healthMonitor = getHealthMonitor();
  private resourceMonitor = getResourceMonitor();
  private applicationMonitor = getApplicationMonitor();
  private metricsCollector = getMetricsCollector();

  // Get comprehensive health status
  async getHealthStatus(): Promise<SystemHealth> {
    return await this.healthMonitor.runHealthChecks();
  }

  // Get simple health check (for load balancers)
  async getSimpleHealth(): Promise<{ status: HealthStatus; message: string }> {
    const health = await this.healthMonitor.runHealthChecks();
    return {
      status: health.status,
      message: health.status === 'healthy' ? 'OK' : 'Service degraded',
    };
  }

  // Get readiness check (for Kubernetes)
  async getReadiness(): Promise<{ ready: boolean; checks: string[] }> {
    const health = await this.healthMonitor.runHealthChecks();
    const criticalChecks = health.checks
      .filter(check => check.status === 'critical')
      .map(check => check.name);

    return {
      ready: health.status !== 'critical',
      checks: criticalChecks,
    };
  }

  // Get liveness check (for Kubernetes)
  async getLiveness(): Promise<{ alive: boolean; uptime: number }> {
    const health = await this.healthMonitor.runHealthChecks();
    
    return {
      alive: true, // If we can respond, we're alive
      uptime: health.uptime,
    };
  }

  // Get detailed health report
  async getDetailedHealth(): Promise<{
    health: SystemHealth;
    resources: any[];
    application: Record<string, any>;
    metrics: any;
  }> {
    const [health, resources, application] = await Promise.all([
      this.getHealthStatus(),
      this.getResourceStatuses(),
      this.getApplicationState(),
    ]);

    const metrics = this.getHealthMetrics();

    return {
      health,
      resources,
      application,
      metrics,
    };
  }

  // Get resource statuses
  private getResourceStatuses(): any[] {
    return this.resourceMonitor.getAllStatuses();
  }

  // Get application state
  private getApplicationState(): Record<string, any> {
    const state = this.applicationMonitor.getAllState();
    return Object.fromEntries(state.entries());
  }

  // Get health-related metrics
  private getHealthMetrics(): any {
    const metrics = this.metricsCollector.getAllMetrics();
    const healthMetrics: any = {};

    // Extract health-related metrics
    for (const [name, values] of metrics.entries()) {
      if (name.includes('health') || name.includes('uptime') || name.includes('memory') || name.includes('cpu')) {
        const latest = values[values.length - 1];
        if (latest) {
          healthMetrics[name] = latest.value;
        }
      }
    }

    return healthMetrics;
  }
}

// Solana-specific health checks
export class SolanaHealthChecks {
  private rpcEndpoint: string;

  constructor(rpcEndpoint: string) {
    this.rpcEndpoint = rpcEndpoint;
  }

  // Register Solana-specific health checks
  registerSolanaChecks(): void {
    const healthMonitor = getHealthMonitor();

    // RPC connection health check
    healthMonitor.registerCheck('solana_rpc', async () => {
      try {
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth',
          }),
        });

        if (!response.ok) {
          throw new Error(`RPC request failed: ${response.status}`);
        }

        const data = await response.json();
        
        return {
          name: 'solana_rpc',
          status: data.result === 'ok' ? 'healthy' : 'warning',
          message: `Solana RPC health: ${data.result}`,
          timestamp: Date.now(),
          metadata: { endpoint: this.rpcEndpoint, result: data.result },
        };
      } catch (error) {
        return {
          name: 'solana_rpc',
          status: 'critical',
          message: `Solana RPC connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { endpoint: this.rpcEndpoint },
        };
      }
    });

    // Slot health check
    healthMonitor.registerCheck('solana_slot', async () => {
      try {
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot',
          }),
        });

        if (!response.ok) {
          throw new Error(`Slot request failed: ${response.status}`);
        }

        const data = await response.json();
        const slot = data.result;
        
        return {
          name: 'solana_slot',
          status: 'healthy',
          message: `Current slot: ${slot}`,
          timestamp: Date.now(),
          metadata: { slot, endpoint: this.rpcEndpoint },
        };
      } catch (error) {
        return {
          name: 'solana_slot',
          status: 'critical',
          message: `Failed to get slot: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { endpoint: this.rpcEndpoint },
        };
      }
    });

    // Block height check
    healthMonitor.registerCheck('solana_block_height', async () => {
      try {
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBlockHeight',
          }),
        });

        if (!response.ok) {
          throw new Error(`Block height request failed: ${response.status}`);
        }

        const data = await response.json();
        const blockHeight = data.result;
        
        return {
          name: 'solana_block_height',
          status: 'healthy',
          message: `Current block height: ${blockHeight}`,
          timestamp: Date.now(),
          metadata: { blockHeight, endpoint: this.rpcEndpoint },
        };
      } catch (error) {
        return {
          name: 'solana_block_height',
          status: 'critical',
          message: `Failed to get block height: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { endpoint: this.rpcEndpoint },
        };
      }
    });

    // Performance check
    healthMonitor.registerCheck('solana_performance', async () => {
      try {
        const start = Date.now();
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth',
          }),
        });

        const duration = Date.now() - start;
        
        if (!response.ok) {
          throw new Error(`Performance check failed: ${response.status}`);
        }

        let status: HealthStatus = 'healthy';
        let message = `RPC response time: ${duration}ms`;

        if (duration > 5000) {
          status = 'critical';
          message += ' - Critical latency';
        } else if (duration > 2000) {
          status = 'warning';
          message += ' - High latency';
        }

        return {
          name: 'solana_performance',
          status,
          message,
          timestamp: Date.now(),
          duration,
          metadata: { endpoint: this.rpcEndpoint, latency: duration },
        };
      } catch (error) {
        return {
          name: 'solana_performance',
          status: 'critical',
          message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { endpoint: this.rpcEndpoint },
        };
      }
    });
  }
}

// GhostSpeak protocol-specific health checks
export class GhostSpeakHealthChecks {
  private programId: string;
  private rpcEndpoint: string;

  constructor(programId: string, rpcEndpoint: string) {
    this.programId = programId;
    this.rpcEndpoint = rpcEndpoint;
  }

  // Register GhostSpeak-specific health checks
  registerProtocolChecks(): void {
    const healthMonitor = getHealthMonitor();

    // Program account health check
    healthMonitor.registerCheck('ghostspeak_program', async () => {
      try {
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [this.programId],
          }),
        });

        if (!response.ok) {
          throw new Error(`Program check failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.result?.value) {
          throw new Error('Program account not found');
        }

        return {
          name: 'ghostspeak_program',
          status: 'healthy',
          message: `GhostSpeak program is deployed and accessible`,
          timestamp: Date.now(),
          metadata: { 
            programId: this.programId,
            executable: data.result.value.executable,
            owner: data.result.value.owner,
          },
        };
      } catch (error) {
        return {
          name: 'ghostspeak_program',
          status: 'critical',
          message: `GhostSpeak program check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { programId: this.programId },
        };
      }
    });

    // Agent marketplace health check
    healthMonitor.registerCheck('ghostspeak_marketplace', async () => {
      // This would check if the marketplace is functioning
      // For now, just verify we can query program accounts
      try {
        const response = await fetch(this.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getProgramAccounts',
            params: [
              this.programId,
              {
                filters: [],
                encoding: 'base64',
                dataSlice: { offset: 0, length: 8 },
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Marketplace check failed: ${response.status}`);
        }

        const data = await response.json();
        const accountCount = data.result?.length || 0;

        return {
          name: 'ghostspeak_marketplace',
          status: 'healthy',
          message: `Marketplace accessible with ${accountCount} accounts`,
          timestamp: Date.now(),
          metadata: { 
            programId: this.programId,
            accountCount,
          },
        };
      } catch (error) {
        return {
          name: 'ghostspeak_marketplace',
          status: 'warning',
          message: `Marketplace check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          metadata: { programId: this.programId },
        };
      }
    });
  }
}

// Health check endpoints for HTTP servers
export class HealthEndpoints {
  private healthService = new HealthService();

  // Express.js middleware for health endpoints
  getExpressMiddleware() {
    return {
      // GET /health - Comprehensive health check
      health: async (req: any, res: any) => {
        try {
          const health = await this.healthService.getHealthStatus();
          const statusCode = health.status === 'healthy' ? 200 : 
                           health.status === 'warning' ? 200 : 503;
          res.status(statusCode).json(health);
        } catch (error) {
          res.status(500).json({
            status: 'critical',
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      // GET /health/simple - Simple health check
      simple: async (req: any, res: any) => {
        try {
          const health = await this.healthService.getSimpleHealth();
          const statusCode = health.status === 'healthy' ? 200 : 503;
          res.status(statusCode).json(health);
        } catch (error) {
          res.status(500).json({
            status: 'critical',
            message: 'Health check failed',
          });
        }
      },

      // GET /health/ready - Readiness check
      ready: async (req: any, res: any) => {
        try {
          const readiness = await this.healthService.getReadiness();
          const statusCode = readiness.ready ? 200 : 503;
          res.status(statusCode).json(readiness);
        } catch (error) {
          res.status(500).json({
            ready: false,
            error: 'Readiness check failed',
          });
        }
      },

      // GET /health/live - Liveness check
      live: async (req: any, res: any) => {
        try {
          const liveness = await this.healthService.getLiveness();
          res.status(200).json(liveness);
        } catch (error) {
          res.status(500).json({
            alive: false,
            error: 'Liveness check failed',
          });
        }
      },

      // GET /health/detailed - Detailed health report
      detailed: async (req: any, res: any) => {
        try {
          const detailed = await this.healthService.getDetailedHealth();
          res.status(200).json(detailed);
        } catch (error) {
          res.status(500).json({
            error: 'Detailed health check failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    };
  }

  // Fastify plugin for health endpoints
  getFastifyPlugin() {
    return async (fastify: any) => {
      fastify.get('/health', async (request: any, reply: any) => {
        try {
          const health = await this.healthService.getHealthStatus();
          const statusCode = health.status === 'healthy' ? 200 : 
                           health.status === 'warning' ? 200 : 503;
          reply.code(statusCode).send(health);
        } catch (error) {
          reply.code(500).send({
            status: 'critical',
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.get('/health/simple', async (request: any, reply: any) => {
        try {
          const health = await this.healthService.getSimpleHealth();
          const statusCode = health.status === 'healthy' ? 200 : 503;
          reply.code(statusCode).send(health);
        } catch (error) {
          reply.code(500).send({
            status: 'critical',
            message: 'Health check failed',
          });
        }
      });

      // Add other endpoints...
    };
  }
}

// Singleton health service instance
let healthServiceInstance: HealthService | null = null;

export const getHealthService = (): HealthService => {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
};