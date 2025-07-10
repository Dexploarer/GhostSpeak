/**
 * GhostSpeak Runtime Inspector
 * 
 * Provides real-time monitoring and inspection of agent behavior,
 * smart contract state, and system performance.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';

export interface RuntimeInspectorConfig {
  /** Polling interval for state updates (ms) */
  pollingInterval: number;
  /** Maximum number of state snapshots to keep */
  maxSnapshots: number;
  /** Enable real-time event monitoring */
  enableEventMonitoring: boolean;
  /** Monitor specific accounts */
  watchedAccounts: string[];
  /** Monitor specific programs */
  watchedPrograms: string[];
}

export interface StateSnapshot {
  timestamp: number;
  accounts: Map<string, AccountState>;
  metrics: SystemMetrics;
  events: RuntimeEvent[];
}

export interface AccountState {
  address: string;
  lamports: number;
  owner: string;
  data: any;
  lastModified: number;
}

export interface SystemMetrics {
  /** Total compute units used in last interval */
  computeUnitsUsed: number;
  /** Number of transactions processed */
  transactionCount: number;
  /** Average transaction time */
  averageTransactionTime: number;
  /** Error rate percentage */
  errorRate: number;
  /** Network latency */
  networkLatency: number;
}

export interface RuntimeEvent {
  type: 'account_changed' | 'transaction_executed' | 'error_occurred' | 'performance_alert';
  timestamp: number;
  data: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  type: 'high_compute_usage' | 'slow_transaction' | 'memory_leak' | 'error_spike';
  message: string;
  threshold: number;
  currentValue: number;
  suggestions: string[];
}

class RuntimeInspector extends EventEmitter {
  private connection: Connection;
  private config: RuntimeInspectorConfig;
  private snapshots: StateSnapshot[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private watchedAccountsInfo = new Map<string, AccountState>();
  private performanceBaseline: SystemMetrics | null = null;

  constructor(connection: Connection, config: Partial<RuntimeInspectorConfig> = {}) {
    super();
    this.connection = connection;
    this.config = {
      pollingInterval: 5000,
      maxSnapshots: 100,
      enableEventMonitoring: true,
      watchedAccounts: [],
      watchedPrograms: [],
      ...config
    };
  }

  /**
   * Start real-time monitoring
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('Inspector is already running');
    }

    this.isRunning = true;
    this.emit('started');

    // Start periodic state capture
    this.intervalId = setInterval(async () => {
      try {
        await this.captureSnapshot();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.pollingInterval);

    // Set up account monitoring
    if (this.config.enableEventMonitoring) {
      this.setupAccountMonitoring();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Add account to watch list
   */
  watchAccount(address: string): void {
    if (!this.config.watchedAccounts.includes(address)) {
      this.config.watchedAccounts.push(address);
    }
  }

  /**
   * Remove account from watch list
   */
  unwatchAccount(address: string): void {
    const index = this.config.watchedAccounts.indexOf(address);
    if (index > -1) {
      this.config.watchedAccounts.splice(index, 1);
    }
  }

  /**
   * Get current state snapshot
   */
  getCurrentSnapshot(): StateSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get historical snapshots
   */
  getSnapshots(count?: number): StateSnapshot[] {
    if (count) {
      return this.snapshots.slice(-count);
    }
    return [...this.snapshots];
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(timeRange: number = 300000): PerformanceTrend[] {
    const cutoffTime = Date.now() - timeRange;
    const relevantSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime);

    if (relevantSnapshots.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];
    
    // Compute units trend
    const computeValues = relevantSnapshots.map(s => s.metrics.computeUnitsUsed);
    trends.push({
      metric: 'compute_units',
      direction: this.calculateTrend(computeValues),
      changeRate: this.calculateChangeRate(computeValues),
      current: computeValues[computeValues.length - 1],
      average: computeValues.reduce((a, b) => a + b, 0) / computeValues.length
    });

    // Transaction time trend
    const txTimeValues = relevantSnapshots.map(s => s.metrics.averageTransactionTime);
    trends.push({
      metric: 'transaction_time',
      direction: this.calculateTrend(txTimeValues),
      changeRate: this.calculateChangeRate(txTimeValues),
      current: txTimeValues[txTimeValues.length - 1],
      average: txTimeValues.reduce((a, b) => a + b, 0) / txTimeValues.length
    });

    // Error rate trend
    const errorRateValues = relevantSnapshots.map(s => s.metrics.errorRate);
    trends.push({
      metric: 'error_rate',
      direction: this.calculateTrend(errorRateValues),
      changeRate: this.calculateChangeRate(errorRateValues),
      current: errorRateValues[errorRateValues.length - 1],
      average: errorRateValues.reduce((a, b) => a + b, 0) / errorRateValues.length
    });

    return trends;
  }

  /**
   * Analyze account changes
   */
  analyzeAccountChanges(address: string, timeRange: number = 300000): AccountAnalysis {
    const cutoffTime = Date.now() - timeRange;
    const relevantSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime);

    const accountStates = relevantSnapshots
      .map(s => s.accounts.get(address))
      .filter(state => state !== undefined) as AccountState[];

    if (accountStates.length === 0) {
      return {
        address,
        changeCount: 0,
        lastChange: null,
        patterns: [],
        anomalies: []
      };
    }

    const changes: AccountChange[] = [];
    for (let i = 1; i < accountStates.length; i++) {
      const prev = accountStates[i - 1];
      const curr = accountStates[i];

      if (prev.lamports !== curr.lamports || prev.data !== curr.data) {
        changes.push({
          timestamp: curr.lastModified,
          lamportChange: curr.lamports - prev.lamports,
          dataChanged: prev.data !== curr.data,
          previousState: prev,
          newState: curr
        });
      }
    }

    return {
      address,
      changeCount: changes.length,
      lastChange: changes.length > 0 ? changes[changes.length - 1] : null,
      patterns: this.detectPatterns(changes),
      anomalies: this.detectAnomalies(changes)
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const currentSnapshot = this.getCurrentSnapshot();
    if (!currentSnapshot) {
      return {
        status: 'unknown',
        score: 0,
        issues: ['No data available'],
        recommendations: ['Start monitoring to get health status']
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check compute unit usage
    if (currentSnapshot.metrics.computeUnitsUsed > 150000) {
      issues.push('High compute unit usage detected');
      recommendations.push('Optimize smart contract instructions');
      score -= 20;
    }

    // Check error rate
    if (currentSnapshot.metrics.errorRate > 5) {
      issues.push(`High error rate: ${currentSnapshot.metrics.errorRate}%`);
      recommendations.push('Investigate and fix recurring errors');
      score -= 30;
    }

    // Check transaction performance
    if (currentSnapshot.metrics.averageTransactionTime > 10000) {
      issues.push('Slow transaction processing');
      recommendations.push('Review network conditions and optimize transaction size');
      score -= 15;
    }

    // Check network latency
    if (currentSnapshot.metrics.networkLatency > 1000) {
      issues.push('High network latency');
      recommendations.push('Consider using a different RPC endpoint');
      score -= 10;
    }

    const status: SystemHealth['status'] = 
      score >= 90 ? 'healthy' :
      score >= 70 ? 'warning' :
      score >= 50 ? 'degraded' : 'critical';

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  private async captureSnapshot(): Promise<void> {
    const timestamp = Date.now();
    const accounts = new Map<string, AccountState>();
    const events: RuntimeEvent[] = [];

    // Capture watched account states
    if (this.config.watchedAccounts.length > 0) {
      try {
        const accountInfos = await this.connection.getMultipleAccountsInfo(
          this.config.watchedAccounts.map(addr => new PublicKey(addr))
        );

        accountInfos.forEach((info, index) => {
          const address = this.config.watchedAccounts[index];
          if (info) {
            const accountState: AccountState = {
              address,
              lamports: info.lamports,
              owner: info.owner.toBase58(),
              data: info.data,
              lastModified: timestamp
            };

            accounts.set(address, accountState);

            // Check for changes
            const previousState = this.watchedAccountsInfo.get(address);
            if (previousState && (
              previousState.lamports !== accountState.lamports ||
              !previousState.data.equals(accountState.data)
            )) {
              events.push({
                type: 'account_changed',
                timestamp,
                data: { address, previous: previousState, current: accountState },
                severity: 'low'
              });
            }

            this.watchedAccountsInfo.set(address, accountState);
          }
        });
      } catch (error) {
        events.push({
          type: 'error_occurred',
          timestamp,
          data: { error: error instanceof Error ? error.message : String(error) },
          severity: 'medium'
        });
      }
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics();

    // Check for performance alerts
    const alerts = this.checkPerformanceAlerts(metrics);
    alerts.forEach(alert => {
      events.push({
        type: 'performance_alert',
        timestamp,
        data: alert,
        severity: alert.type === 'error_spike' ? 'high' : 'medium'
      });
    });

    const snapshot: StateSnapshot = {
      timestamp,
      accounts,
      metrics,
      events
    };

    this.snapshots.push(snapshot);

    // Trim snapshots if necessary
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.config.maxSnapshots);
    }

    // Emit events
    events.forEach(event => this.emit('event', event));
    this.emit('snapshot', snapshot);
  }

  private async calculateMetrics(): Promise<SystemMetrics> {
    // This is a simplified implementation
    // In a real implementation, you would collect these metrics from various sources
    
    const recentSnapshots = this.snapshots.slice(-10);
    const txCount = recentSnapshots.reduce((sum, s) => sum + s.metrics.transactionCount, 0);
    const avgTxTime = recentSnapshots.length > 0 
      ? recentSnapshots.reduce((sum, s) => sum + s.metrics.averageTransactionTime, 0) / recentSnapshots.length
      : 0;

    return {
      computeUnitsUsed: Math.floor(Math.random() * 200000), // Mock data
      transactionCount: txCount + Math.floor(Math.random() * 10),
      averageTransactionTime: avgTxTime + Math.random() * 1000,
      errorRate: Math.random() * 10,
      networkLatency: 200 + Math.random() * 800
    };
  }

  private checkPerformanceAlerts(metrics: SystemMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (metrics.computeUnitsUsed > 150000) {
      alerts.push({
        type: 'high_compute_usage',
        message: 'Compute unit usage is above recommended threshold',
        threshold: 150000,
        currentValue: metrics.computeUnitsUsed,
        suggestions: [
          'Optimize smart contract instructions',
          'Consider batching operations',
          'Review account access patterns'
        ]
      });
    }

    if (metrics.averageTransactionTime > 10000) {
      alerts.push({
        type: 'slow_transaction',
        message: 'Transaction processing time is above normal',
        threshold: 10000,
        currentValue: metrics.averageTransactionTime,
        suggestions: [
          'Check network conditions',
          'Optimize transaction size',
          'Consider using priority fees'
        ]
      });
    }

    if (metrics.errorRate > 5) {
      alerts.push({
        type: 'error_spike',
        message: 'Error rate is higher than normal',
        threshold: 5,
        currentValue: metrics.errorRate,
        suggestions: [
          'Review recent code changes',
          'Check smart contract logic',
          'Verify network connectivity'
        ]
      });
    }

    return alerts;
  }

  private setupAccountMonitoring(): void {
    // Set up WebSocket connections for real-time account monitoring
    // This would require implementing WebSocket subscriptions
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-5);
    const earlier = values.slice(-10, -5);
    
    if (recent.length === 0 || earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    const threshold = earlierAvg * 0.05; // 5% threshold
    
    if (recentAvg > earlierAvg + threshold) return 'up';
    if (recentAvg < earlierAvg - threshold) return 'down';
    return 'stable';
  }

  private calculateChangeRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    if (first === 0) return last === 0 ? 0 : 100;
    
    return ((last - first) / first) * 100;
  }

  private detectPatterns(changes: AccountChange[]): string[] {
    const patterns: string[] = [];
    
    // Detect regular intervals
    if (changes.length >= 3) {
      const intervals = [];
      for (let i = 1; i < changes.length; i++) {
        intervals.push(changes[i].timestamp - changes[i - 1].timestamp);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      if (variance < avgInterval * 0.1) {
        patterns.push(`Regular updates every ${Math.round(avgInterval / 1000)} seconds`);
      }
    }
    
    return patterns;
  }

  private detectAnomalies(changes: AccountChange[]): string[] {
    const anomalies: string[] = [];
    
    // Detect large lamport changes
    const lamportChanges = changes.map(c => Math.abs(c.lamportChange));
    if (lamportChanges.length > 0) {
      const avgChange = lamportChanges.reduce((a, b) => a + b, 0) / lamportChanges.length;
      const largeChanges = lamportChanges.filter(c => c > avgChange * 5);
      
      if (largeChanges.length > 0) {
        anomalies.push(`${largeChanges.length} unusually large balance change(s) detected`);
      }
    }
    
    return anomalies;
  }
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changeRate: number;
  current: number;
  average: number;
}

export interface AccountAnalysis {
  address: string;
  changeCount: number;
  lastChange: AccountChange | null;
  patterns: string[];
  anomalies: string[];
}

export interface AccountChange {
  timestamp: number;
  lamportChange: number;
  dataChanged: boolean;
  previousState: AccountState;
  newState: AccountState;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'degraded' | 'critical' | 'unknown';
  score: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Create a runtime inspector instance
 */
export function createRuntimeInspector(
  connection: Connection, 
  config?: Partial<RuntimeInspectorConfig>
): RuntimeInspector {
  return new RuntimeInspector(connection, config);
}

export { RuntimeInspector };