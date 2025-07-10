/**
 * Horizontal Scaling and Load Balancing System
 * 
 * Comprehensive scaling solution with load balancing, auto-scaling,
 * health monitoring, and intelligent resource allocation.
 */

import { getGlobalMonitor } from './monitoring.js';

/**
 * Load balancing strategies
 */
export type LoadBalancingStrategy = 
  | 'round-robin'
  | 'weighted-round-robin'
  | 'least-connections'
  | 'least-response-time'
  | 'ip-hash'
  | 'random'
  | 'adaptive';

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  retries: number;
  endpoints: string[];
  customCheck?: (endpoint: string) => Promise<boolean>;
}

/**
 * Auto-scaling configuration
 */
export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetCpuPercent: number;
  targetMemoryPercent: number;
  targetResponseTimeMs: number;
  scaleUpCooldownMs: number;
  scaleDownCooldownMs: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  metricsWindowMs: number;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheck: HealthCheckConfig;
  autoScaling: AutoScalingConfig;
  stickySessions: boolean;
  sessionTimeout: number;
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
}

/**
 * Service instance with health and performance metrics
 */
export interface ServiceInstance {
  id: string;
  endpoint: string;
  weight: number;
  isHealthy: boolean;
  lastHealthCheck: number;
  connections: number;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  metadata: Record<string, any>;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  circuitBreakerFailures: number;
  circuitBreakerLastFailure: number;
}

/**
 * Load balancing metrics
 */
export interface LoadBalancingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  instanceDistribution: Map<string, number>;
  healthyInstances: number;
  totalInstances: number;
  autoScalingEvents: number;
  lastScalingAction: number;
}

/**
 * Default load balancer configuration
 */
export const DEFAULT_LOAD_BALANCER_CONFIG: LoadBalancerConfig = {
  strategy: 'adaptive',
  healthCheck: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    timeoutMs: 5000,   // 5 seconds
    retries: 3,
    endpoints: ['/health', '/ping'],
  },
  autoScaling: {
    enabled: true,
    minInstances: 2,
    maxInstances: 10,
    targetCpuPercent: 70,
    targetMemoryPercent: 80,
    targetResponseTimeMs: 500,
    scaleUpCooldownMs: 300000,   // 5 minutes
    scaleDownCooldownMs: 600000, // 10 minutes
    scaleUpThreshold: 0.8,       // 80%
    scaleDownThreshold: 0.3,     // 30%
    metricsWindowMs: 300000,     // 5 minutes
  },
  stickySessions: false,
  sessionTimeout: 1800000, // 30 minutes
  maxConnections: 1000,
  connectionTimeout: 30000,
  retryAttempts: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeoutMs: 60000, // 1 minute
};

/**
 * High-Performance Load Balancer
 */
export class LoadBalancer {
  private instances = new Map<string, ServiceInstance>();
  private sessionMap = new Map<string, string>(); // sessionId -> instanceId
  private currentIndex = 0; // For round-robin
  private metrics: LoadBalancingMetrics;
  private healthCheckInterval?: number;
  private autoScalingInterval?: number;
  private readonly config: LoadBalancerConfig;
  private lastScalingAction = 0;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...DEFAULT_LOAD_BALANCER_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startHealthChecks();
    this.startAutoScaling();
  }

  /**
   * Add service instance to load balancer
   */
  addInstance(instance: Omit<ServiceInstance, 'isHealthy' | 'lastHealthCheck' | 'connections' | 'totalRequests' | 'failedRequests' | 'averageResponseTime' | 'circuitBreakerState' | 'circuitBreakerFailures' | 'circuitBreakerLastFailure'>): void {
    const fullInstance: ServiceInstance = {
      ...instance,
      isHealthy: true,
      lastHealthCheck: Date.now(),
      connections: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      circuitBreakerState: 'closed',
      circuitBreakerFailures: 0,
      circuitBreakerLastFailure: 0,
    };

    this.instances.set(instance.id, fullInstance);
    this.metrics.totalInstances = this.instances.size;
    this.updateHealthyInstancesCount();

    console.log(`🔄 Added instance ${instance.id} to load balancer`);
  }

  /**
   * Remove service instance from load balancer
   */
  removeInstance(instanceId: string): void {
    if (this.instances.delete(instanceId)) {
      this.metrics.totalInstances = this.instances.size;
      this.updateHealthyInstancesCount();
      
      // Clean up session mappings
      for (const [sessionId, mappedInstanceId] of this.sessionMap.entries()) {
        if (mappedInstanceId === instanceId) {
          this.sessionMap.delete(sessionId);
        }
      }

      console.log(`🗑️ Removed instance ${instanceId} from load balancer`);
    }
  }

  /**
   * Get next available instance based on load balancing strategy
   */
  async getNextInstance(sessionId?: string): Promise<ServiceInstance | null> {
    const healthyInstances = this.getHealthyInstances();
    
    if (healthyInstances.length === 0) {
      console.error('🚨 No healthy instances available');
      return null;
    }

    // Handle sticky sessions
    if (sessionId && this.config.stickySessions) {
      const stickyInstance = this.getStickyInstance(sessionId, healthyInstances);
      if (stickyInstance) {
        return stickyInstance;
      }
    }

    let selectedInstance: ServiceInstance | null = null;

    switch (this.config.strategy) {
      case 'round-robin':
        selectedInstance = this.roundRobinSelection(healthyInstances);
        break;
      case 'weighted-round-robin':
        selectedInstance = this.weightedRoundRobinSelection(healthyInstances);
        break;
      case 'least-connections':
        selectedInstance = this.leastConnectionsSelection(healthyInstances);
        break;
      case 'least-response-time':
        selectedInstance = this.leastResponseTimeSelection(healthyInstances);
        break;
      case 'ip-hash':
        selectedInstance = this.ipHashSelection(healthyInstances, sessionId || '');
        break;
      case 'random':
        selectedInstance = this.randomSelection(healthyInstances);
        break;
      case 'adaptive':
        selectedInstance = this.adaptiveSelection(healthyInstances);
        break;
      default:
        selectedInstance = this.roundRobinSelection(healthyInstances);
    }

    if (selectedInstance && sessionId && this.config.stickySessions) {
      this.sessionMap.set(sessionId, selectedInstance.id);
    }

    return selectedInstance;
  }

  /**
   * Execute request with load balancing and retry logic
   */
  async executeRequest<T>(
    requestFn: (instance: ServiceInstance) => Promise<T>,
    sessionId?: string,
    retryCount = 0
  ): Promise<T> {
    const instance = await this.getNextInstance(sessionId);
    
    if (!instance) {
      throw new Error('No healthy instances available');
    }

    const startTime = performance.now();
    instance.connections++;
    instance.totalRequests++;
    this.metrics.totalRequests++;

    try {
      const result = await Promise.race([
        requestFn(instance),
        this.createTimeoutPromise(this.config.connectionTimeout),
      ]);

      // Record success
      const responseTime = performance.now() - startTime;
      this.updateInstanceMetrics(instance, responseTime, true);
      this.metrics.successfulRequests++;
      
      // Reset circuit breaker on success
      if (instance.circuitBreakerState !== 'closed') {
        instance.circuitBreakerState = 'closed';
        instance.circuitBreakerFailures = 0;
      }

      return result;
    } catch (error) {
      // Record failure
      const responseTime = performance.now() - startTime;
      this.updateInstanceMetrics(instance, responseTime, false);
      this.metrics.failedRequests++;
      instance.failedRequests++;

      // Update circuit breaker
      this.updateCircuitBreaker(instance);

      // Retry with different instance if attempts remaining
      if (retryCount < this.config.retryAttempts) {
        console.warn(`🔄 Retrying request (attempt ${retryCount + 1}/${this.config.retryAttempts})`);
        return this.executeRequest(requestFn, sessionId, retryCount + 1);
      }

      throw error;
    } finally {
      instance.connections--;
    }
  }

  /**
   * Get current load balancing metrics
   */
  getMetrics(): LoadBalancingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get all instances with their current status
   */
  getInstances(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get healthy instances only
   */
  getHealthyInstances(): ServiceInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.isHealthy && instance.circuitBreakerState !== 'open'
    );
  }

  /**
   * Force health check for all instances
   */
  async checkAllInstancesHealth(): Promise<void> {
    const checks = Array.from(this.instances.values()).map(instance =>
      this.checkInstanceHealth(instance)
    );
    
    await Promise.all(checks);
    this.updateHealthyInstancesCount();
  }

  /**
   * Manually trigger scaling action
   */
  async triggerScaling(action: 'scale-up' | 'scale-down', reason?: string): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastScaling = currentTime - this.lastScalingAction;
    const cooldown = action === 'scale-up' 
      ? this.config.autoScaling.scaleUpCooldownMs
      : this.config.autoScaling.scaleDownCooldownMs;

    if (timeSinceLastScaling < cooldown) {
      console.warn(`⏰ Scaling cooldown active, ignoring ${action} request`);
      return;
    }

    if (action === 'scale-up') {
      await this.scaleUp(reason || 'Manual trigger');
    } else {
      await this.scaleDown(reason || 'Manual trigger');
    }
  }

  /**
   * Shutdown load balancer
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.autoScalingInterval) {
      clearInterval(this.autoScalingInterval);
    }

    this.instances.clear();
    this.sessionMap.clear();
    
    console.log('🛑 Load balancer shut down');
  }

  // Private helper methods

  private initializeMetrics(): LoadBalancingMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceDistribution: new Map(),
      healthyInstances: 0,
      totalInstances: 0,
      autoScalingEvents: 0,
      lastScalingAction: 0,
    };
  }

  private startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) return;

    this.healthCheckInterval = setInterval(() => {
      this.checkAllInstancesHealth().catch(console.error);
    }, this.config.healthCheck.intervalMs);
  }

  private startAutoScaling(): void {
    if (!this.config.autoScaling.enabled) return;

    this.autoScalingInterval = setInterval(() => {
      this.evaluateAutoScaling().catch(console.error);
    }, 60000); // Check every minute
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    if (instance.circuitBreakerState === 'open') {
      // Check if circuit breaker should move to half-open
      const timeSinceLastFailure = Date.now() - instance.circuitBreakerLastFailure;
      if (timeSinceLastFailure >= this.config.circuitBreakerTimeoutMs) {
        instance.circuitBreakerState = 'half-open';
        console.log(`🔄 Circuit breaker for ${instance.id} moved to half-open`);
      } else {
        return; // Skip health check for open circuit breaker
      }
    }

    try {
      let healthy = false;

      if (this.config.healthCheck.customCheck) {
        healthy = await this.config.healthCheck.customCheck(instance.endpoint);
      } else {
        // Default health check (simple HTTP ping)
        healthy = await this.performDefaultHealthCheck(instance);
      }

      instance.isHealthy = healthy;
      instance.lastHealthCheck = Date.now();

      if (healthy && instance.circuitBreakerState === 'half-open') {
        instance.circuitBreakerState = 'closed';
        instance.circuitBreakerFailures = 0;
      }
    } catch (error) {
      instance.isHealthy = false;
      instance.lastHealthCheck = Date.now();
      console.warn(`❌ Health check failed for ${instance.id}:`, error);
    }
  }

  private async performDefaultHealthCheck(instance: ServiceInstance): Promise<boolean> {
    // Simple ping to check if endpoint is responsive
    // In a real implementation, this would make an HTTP request
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), this.config.healthCheck.timeoutMs);
      
      // Simulate health check
      setTimeout(() => {
        clearTimeout(timeout);
        resolve(true);
      }, Math.random() * 100);
    });
  }

  private updateHealthyInstancesCount(): void {
    this.metrics.healthyInstances = this.getHealthyInstances().length;
  }

  private getStickyInstance(sessionId: string, healthyInstances: ServiceInstance[]): ServiceInstance | null {
    const instanceId = this.sessionMap.get(sessionId);
    if (!instanceId) return null;

    const instance = healthyInstances.find(inst => inst.id === instanceId);
    return instance || null;
  }

  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex = (this.currentIndex + 1) % instances.length;
    return instance;
  }

  private weightedRoundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, inst) => sum + inst.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, current) => 
      current.connections < min.connections ? current : min
    );
  }

  private leastResponseTimeSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, current) => 
      current.averageResponseTime < min.averageResponseTime ? current : min
    );
  }

  private ipHashSelection(instances: ServiceInstance[], ip: string): ServiceInstance {
    const hash = this.simpleHash(ip);
    return instances[hash % instances.length];
  }

  private randomSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances[Math.floor(Math.random() * instances.length)];
  }

  private adaptiveSelection(instances: ServiceInstance[]): ServiceInstance {
    // Composite score based on multiple factors
    return instances.reduce((best, current) => {
      const currentScore = this.calculateAdaptiveScore(current);
      const bestScore = this.calculateAdaptiveScore(best);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateAdaptiveScore(instance: ServiceInstance): number {
    // Higher score = better instance
    const connectionWeight = 0.3;
    const responseTimeWeight = 0.4;
    const resourceWeight = 0.3;

    const connectionScore = Math.max(0, 1 - (instance.connections / this.config.maxConnections));
    const responseTimeScore = Math.max(0, 1 - (instance.averageResponseTime / 1000)); // Normalize to seconds
    const resourceScore = Math.max(0, 1 - ((instance.cpuUsage + instance.memoryUsage) / 200));

    return (connectionScore * connectionWeight) + 
           (responseTimeScore * responseTimeWeight) + 
           (resourceScore * resourceWeight);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private updateInstanceMetrics(instance: ServiceInstance, responseTime: number, success: boolean): void {
    // Update average response time with exponential moving average
    const alpha = 0.1; // Smoothing factor
    instance.averageResponseTime = instance.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Update instance distribution metrics
    const currentCount = this.metrics.instanceDistribution.get(instance.id) || 0;
    this.metrics.instanceDistribution.set(instance.id, currentCount + 1);
  }

  private updateCircuitBreaker(instance: ServiceInstance): void {
    instance.circuitBreakerFailures++;
    instance.circuitBreakerLastFailure = Date.now();

    if (instance.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      instance.circuitBreakerState = 'open';
      instance.isHealthy = false;
      console.warn(`🔌 Circuit breaker opened for instance ${instance.id}`);
    }
  }

  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
  }

  private updateMetrics(): void {
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    
    if (totalRequests > 0) {
      this.metrics.averageResponseTime = Array.from(this.instances.values())
        .reduce((sum, instance) => sum + instance.averageResponseTime, 0) / this.instances.size;
    }

    this.metrics.lastScalingAction = this.lastScalingAction;
  }

  private async evaluateAutoScaling(): Promise<void> {
    const config = this.config.autoScaling;
    const currentTime = Date.now();
    const timeSinceLastScaling = currentTime - this.lastScalingAction;

    // Collect metrics for scaling decision
    const metrics = this.collectScalingMetrics();
    
    // Check if we need to scale up
    if (this.shouldScaleUp(metrics) && timeSinceLastScaling >= config.scaleUpCooldownMs) {
      await this.scaleUp('High resource utilization detected');
    }
    
    // Check if we need to scale down
    else if (this.shouldScaleDown(metrics) && timeSinceLastScaling >= config.scaleDownCooldownMs) {
      await this.scaleDown('Low resource utilization detected');
    }
  }

  private collectScalingMetrics(): {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgResponseTime: number;
    healthyInstances: number;
  } {
    const healthyInstances = this.getHealthyInstances();
    
    if (healthyInstances.length === 0) {
      return {
        avgCpuUsage: 100,
        avgMemoryUsage: 100,
        avgResponseTime: 10000,
        healthyInstances: 0,
      };
    }

    const avgCpuUsage = healthyInstances.reduce((sum, inst) => sum + inst.cpuUsage, 0) / healthyInstances.length;
    const avgMemoryUsage = healthyInstances.reduce((sum, inst) => sum + inst.memoryUsage, 0) / healthyInstances.length;
    const avgResponseTime = healthyInstances.reduce((sum, inst) => sum + inst.averageResponseTime, 0) / healthyInstances.length;

    return {
      avgCpuUsage,
      avgMemoryUsage,
      avgResponseTime,
      healthyInstances: healthyInstances.length,
    };
  }

  private shouldScaleUp(metrics: ReturnType<typeof this.collectScalingMetrics>): boolean {
    const config = this.config.autoScaling;
    
    return (
      metrics.healthyInstances < config.maxInstances &&
      (
        metrics.avgCpuUsage > config.targetCpuPercent ||
        metrics.avgMemoryUsage > config.targetMemoryPercent ||
        metrics.avgResponseTime > config.targetResponseTimeMs
      )
    );
  }

  private shouldScaleDown(metrics: ReturnType<typeof this.collectScalingMetrics>): boolean {
    const config = this.config.autoScaling;
    
    return (
      metrics.healthyInstances > config.minInstances &&
      metrics.avgCpuUsage < config.targetCpuPercent * config.scaleDownThreshold &&
      metrics.avgMemoryUsage < config.targetMemoryPercent * config.scaleDownThreshold &&
      metrics.avgResponseTime < config.targetResponseTimeMs * config.scaleDownThreshold
    );
  }

  private async scaleUp(reason: string): Promise<void> {
    const config = this.config.autoScaling;
    const currentInstances = this.metrics.totalInstances;
    
    if (currentInstances >= config.maxInstances) {
      console.warn('⚠️ Cannot scale up: already at maximum instances');
      return;
    }

    console.log(`📈 Scaling up: ${reason}`);
    
    // In a real implementation, this would provision new instances
    const newInstanceId = `instance-${Date.now()}`;
    this.addInstance({
      id: newInstanceId,
      endpoint: `http://new-instance-${currentInstances + 1}.local`,
      weight: 1,
      cpuUsage: 10,
      memoryUsage: 20,
      metadata: { provisioned: Date.now(), reason },
    });

    this.lastScalingAction = Date.now();
    this.metrics.autoScalingEvents++;
    
    // Notify monitoring system
    const monitor = getGlobalMonitor();
    monitor.recordSuccess('auto-scaling', { action: 'scale-up', reason });
  }

  private async scaleDown(reason: string): Promise<void> {
    const config = this.config.autoScaling;
    const healthyInstances = this.getHealthyInstances();
    
    if (healthyInstances.length <= config.minInstances) {
      console.warn('⚠️ Cannot scale down: already at minimum instances');
      return;
    }

    console.log(`📉 Scaling down: ${reason}`);
    
    // Find least utilized instance to remove
    const instanceToRemove = healthyInstances.reduce((min, current) => {
      const minUtilization = min.cpuUsage + min.memoryUsage + min.connections;
      const currentUtilization = current.cpuUsage + current.memoryUsage + current.connections;
      return currentUtilization < minUtilization ? current : min;
    });

    this.removeInstance(instanceToRemove.id);
    
    this.lastScalingAction = Date.now();
    this.metrics.autoScalingEvents++;
    
    // Notify monitoring system
    const monitor = getGlobalMonitor();
    monitor.recordSuccess('auto-scaling', { action: 'scale-down', reason });
  }
}

/**
 * Service Discovery and Registration
 */
export class ServiceRegistry {
  private services = new Map<string, Set<ServiceInstance>>();
  private watchers = new Map<string, Array<(instances: ServiceInstance[]) => void>>();

  /**
   * Register service instance
   */
  register(serviceName: string, instance: ServiceInstance): void {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, new Set());
    }
    
    this.services.get(serviceName)!.add(instance);
    this.notifyWatchers(serviceName);
    
    console.log(`📋 Registered ${instance.id} for service ${serviceName}`);
  }

  /**
   * Deregister service instance
   */
  deregister(serviceName: string, instanceId: string): void {
    const instances = this.services.get(serviceName);
    if (!instances) return;

    for (const instance of instances) {
      if (instance.id === instanceId) {
        instances.delete(instance);
        break;
      }
    }

    this.notifyWatchers(serviceName);
    console.log(`📋 Deregistered ${instanceId} from service ${serviceName}`);
  }

  /**
   * Discover service instances
   */
  discover(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName);
    return instances ? Array.from(instances) : [];
  }

  /**
   * Watch for service changes
   */
  watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): () => void {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    
    this.watchers.get(serviceName)!.push(callback);
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(serviceName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyWatchers(serviceName: string): void {
    const watchers = this.watchers.get(serviceName);
    if (!watchers) return;

    const instances = this.discover(serviceName);
    watchers.forEach(callback => {
      try {
        callback(instances);
      } catch (error) {
        console.error('Error in service watcher:', error);
      }
    });
  }
}

/**
 * Cluster Manager for coordinating multiple load balancers
 */
export class ClusterManager {
  private loadBalancers = new Map<string, LoadBalancer>();
  private serviceRegistry = new ServiceRegistry();
  private clusterHealth = {
    totalRequests: 0,
    totalInstances: 0,
    healthyInstances: 0,
    averageResponseTime: 0,
    lastUpdated: Date.now(),
  };

  /**
   * Add load balancer to cluster
   */
  addLoadBalancer(id: string, loadBalancer: LoadBalancer): void {
    this.loadBalancers.set(id, loadBalancer);
    console.log(`🏗️ Added load balancer ${id} to cluster`);
  }

  /**
   * Remove load balancer from cluster
   */
  removeLoadBalancer(id: string): void {
    const lb = this.loadBalancers.get(id);
    if (lb) {
      lb.shutdown();
      this.loadBalancers.delete(id);
      console.log(`🗑️ Removed load balancer ${id} from cluster`);
    }
  }

  /**
   * Get cluster-wide metrics
   */
  getClusterMetrics(): {
    loadBalancers: number;
    totalInstances: number;
    healthyInstances: number;
    totalRequests: number;
    averageResponseTime: number;
    requestDistribution: Map<string, number>;
  } {
    let totalInstances = 0;
    let healthyInstances = 0;
    let totalRequests = 0;
    let totalResponseTime = 0;
    const requestDistribution = new Map<string, number>();

    for (const [id, lb] of this.loadBalancers) {
      const metrics = lb.getMetrics();
      totalInstances += metrics.totalInstances;
      healthyInstances += metrics.healthyInstances;
      totalRequests += metrics.totalRequests;
      totalResponseTime += metrics.averageResponseTime;
      requestDistribution.set(id, metrics.totalRequests);
    }

    return {
      loadBalancers: this.loadBalancers.size,
      totalInstances,
      healthyInstances,
      totalRequests,
      averageResponseTime: totalResponseTime / Math.max(this.loadBalancers.size, 1),
      requestDistribution,
    };
  }

  /**
   * Execute request across cluster with intelligent routing
   */
  async executeClusterRequest<T>(
    serviceName: string,
    requestFn: (instance: ServiceInstance) => Promise<T>,
    sessionId?: string
  ): Promise<T> {
    // Find load balancer with healthiest instances for the service
    let bestLoadBalancer: LoadBalancer | null = null;
    let bestScore = -1;

    for (const lb of this.loadBalancers.values()) {
      const instances = lb.getHealthyInstances();
      if (instances.length === 0) continue;

      const score = this.calculateLoadBalancerScore(lb);
      if (score > bestScore) {
        bestScore = score;
        bestLoadBalancer = lb;
      }
    }

    if (!bestLoadBalancer) {
      throw new Error('No healthy load balancers available');
    }

    return bestLoadBalancer.executeRequest(requestFn, sessionId);
  }

  /**
   * Shutdown entire cluster
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.loadBalancers.values()).map(lb => lb.shutdown());
    await Promise.all(shutdownPromises);
    
    this.loadBalancers.clear();
    console.log('🛑 Cluster shut down');
  }

  private calculateLoadBalancerScore(lb: LoadBalancer): number {
    const metrics = lb.getMetrics();
    const instances = lb.getHealthyInstances();
    
    if (instances.length === 0) return 0;

    // Score based on health ratio, response time, and available capacity
    const healthRatio = metrics.healthyInstances / Math.max(metrics.totalInstances, 1);
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 1000));
    const capacityScore = instances.reduce((sum, inst) => 
      sum + (1 - (inst.connections / 100)), 0) / instances.length;

    return (healthRatio * 0.4) + (responseTimeScore * 0.3) + (capacityScore * 0.3);
  }
}

// Export global instances
export const globalServiceRegistry = new ServiceRegistry();
export const globalClusterManager = new ClusterManager();