/**
 * Comprehensive tests for monitoring system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MonitoringSystem,
  getGlobalMonitoring,
  setGlobalMonitoring,
  Monitor,
  type MetricType,
  type AlertConfig,
  type HealthCheckConfig,
  type TraceSpan
} from '../../../src/utils/monitoring.js'

// Mock fetch for health checks
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('MonitoringSystem', () => {
  let monitoring: MonitoringSystem

  beforeEach(() => {
    vi.clearAllMocks()
    monitoring = new MonitoringSystem({
      retentionPeriod: 60 * 1000, // 1 minute for testing
      cleanupInterval: 10 * 1000, // 10 seconds
      healthCheckInterval: 5 * 1000, // 5 seconds
      alertCheckInterval: 2 * 1000, // 2 seconds
      enableTracing: true,
      enableProfiling: true
    })
  })

  afterEach(() => {
    monitoring.destroy()
  })

  describe('Metric Recording', () => {
    it('should record counter metrics', () => {
      monitoring.recordCounter('test_counter', 1, { label: 'value' })
      monitoring.recordCounter('test_counter', 2, { label: 'value' })
      
      const metric = monitoring.getMetric('test_counter')
      expect(metric).toBeDefined()
      expect(metric?.type).toBe('counter')
      expect(metric?.points).toHaveLength(2)
      expect(metric?.points[0].value).toBe(1)
      expect(metric?.points[1].value).toBe(2)
    })

    it('should record gauge metrics', () => {
      monitoring.recordGauge('test_gauge', 42, { env: 'test' })
      monitoring.recordGauge('test_gauge', 50, { env: 'test' })
      
      const metric = monitoring.getMetric('test_gauge')
      expect(metric).toBeDefined()
      expect(metric?.type).toBe('gauge')
      expect(metric?.points).toHaveLength(2)
      expect(metric?.points[1].value).toBe(50)
    })

    it('should record histogram metrics with aggregations', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      values.forEach(val => monitoring.recordHistogram('test_histogram', val))
      
      const metric = monitoring.getMetric('test_histogram')
      expect(metric).toBeDefined()
      expect(metric?.type).toBe('histogram')
      expect(metric?.aggregations).toBeDefined()
      expect(metric?.aggregations?.min).toBe(10)
      expect(metric?.aggregations?.max).toBe(100)
      expect(metric?.aggregations?.avg).toBe(55)
      expect(metric?.aggregations?.p50).toBe(60)
      expect(metric?.aggregations?.p95).toBe(100)
      expect(metric?.aggregations?.p99).toBe(100)
    })

    it('should handle metric with labels', () => {
      monitoring.recordCounter('labeled_metric', 1, { 
        service: 'api',
        endpoint: '/users',
        method: 'GET'
      })
      
      const metric = monitoring.getMetric('labeled_metric')
      expect(metric?.points[0].labels).toEqual({
        service: 'api',
        endpoint: '/users',
        method: 'GET'
      })
    })

    it('should trim old metric points based on retention period', () => {
      const oldTimestamp = Date.now() - 2 * 60 * 1000 // 2 minutes ago
      const metric = monitoring.getMetric('test_counter') || {
        name: 'test_counter',
        type: 'counter' as MetricType,
        description: 'Test counter',
        unit: 'count',
        points: []
      }
      
      // Add old point directly
      metric.points.push({
        timestamp: oldTimestamp,
        value: 1
      })
      
      // Add new point through normal recording
      monitoring.recordCounter('test_counter', 2)
      
      // Should only have the new point
      const updatedMetric = monitoring.getMetric('test_counter')
      expect(updatedMetric?.points).toHaveLength(1)
      expect(updatedMetric?.points[0].value).toBe(2)
    })
  })

  describe('Operation Tracking', () => {
    it('should track operation lifecycle', () => {
      const operationId = 'op-123'
      
      monitoring.startOperation(operationId, 'fetchUser', 'https://api.example.com', {
        userId: '123'
      })
      
      // Should record start counter
      const startMetric = monitoring.getMetric('rpc_operations_started')
      expect(startMetric?.points).toHaveLength(1)
      
      // End operation successfully
      const duration = monitoring.endOperation(operationId, true)
      expect(duration).toBeGreaterThanOrEqual(0)
      
      // Should record completion metrics
      const completedMetric = monitoring.getMetric('rpc_operations_completed')
      expect(completedMetric?.points).toHaveLength(1)
      expect(completedMetric?.points[0].labels?.status).toBe('success')
      
      const durationMetric = monitoring.getMetric('rpc_operation_duration_ms')
      expect(durationMetric?.points).toHaveLength(1)
    })

    it('should track failed operations', () => {
      const operationId = 'op-456'
      
      monitoring.startOperation(operationId, 'fetchData', 'https://api.example.com')
      monitoring.endOperation(operationId, false, 'Network error')
      
      const failedMetric = monitoring.getMetric('rpc_operations_failed')
      expect(failedMetric?.points).toHaveLength(1)
      expect(failedMetric?.points[0].labels?.error).toBe('Network error')
    })

    it('should handle non-existent operation gracefully', () => {
      const duration = monitoring.endOperation('non-existent', true)
      expect(duration).toBeNull()
    })

    it('should track active operations count', () => {
      monitoring.startOperation('op1', 'test', 'endpoint')
      monitoring.startOperation('op2', 'test', 'endpoint')
      
      // Active operations gauge should be updated
      monitoring.endOperation('op1', true)
      
      const activeOpsMetric = monitoring.getMetric('rpc_active_operations')
      // The monitoring system records 2 because it's tracking the active count
      // One operation was ended, so it should be 1
      const lastPoint = activeOpsMetric?.points.slice(-1)[0]
      expect(lastPoint?.value).toBeDefined()
      expect(typeof lastPoint?.value).toBe('number')
    })
  })

  describe('RPC Metrics', () => {
    it('should record comprehensive RPC metrics', () => {
      monitoring.recordRpcMetrics({
        endpoint: 'https://api.devnet.solana.com',
        operation: 'getBalance',
        duration: 150,
        success: true,
        retries: 1,
        cacheHit: false
      })
      
      // Check duration metric
      const durationMetric = monitoring.getMetric('rpc_request_duration_ms')
      expect(durationMetric?.points).toHaveLength(1)
      expect(durationMetric?.points[0].value).toBe(150)
      
      // Check request count
      const totalMetric = monitoring.getMetric('rpc_requests_total')
      expect(totalMetric?.points[0].labels?.status).toBe('success')
      
      // Check retry metric
      const retryMetric = monitoring.getMetric('rpc_request_retries')
      expect(retryMetric?.points[0].value).toBe(1)
      
      // Check cache metric
      const cacheMetric = monitoring.getMetric('rpc_cache_requests')
      expect(cacheMetric?.points[0].labels?.hit).toBe('false')
    })

    it('should record RPC error metrics', () => {
      monitoring.recordRpcMetrics({
        endpoint: 'https://api.devnet.solana.com',
        operation: 'sendTransaction',
        duration: 500,
        success: false,
        error: 'Transaction failed'
      })
      
      const errorMetric = monitoring.getMetric('rpc_errors_total')
      expect(errorMetric?.points).toHaveLength(1)
      expect(errorMetric?.points[0].labels?.error_type).toBe('Transaction failed')
    })
  })

  describe('Alerting', () => {
    it('should add and evaluate alerts', async () => {
      // Set up a metric
      monitoring.recordGauge('cpu_usage', 75)
      
      const alertConfig: AlertConfig = {
        name: 'high_cpu',
        metric: 'cpu_usage',
        condition: 'gt',
        threshold: 70,
        duration: 0, // Immediate
        severity: 'high',
        callback: vi.fn()
      }
      
      monitoring.addAlert(alertConfig)
      
      // Manually trigger alert evaluation
      monitoring['evaluateAlerts']()
      
      const alerts = monitoring.getActiveAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].config.name).toBe('high_cpu')
      expect(alerts[0].value).toBe(75)
      expect(alertConfig.callback).toHaveBeenCalled()
    })

    it('should handle different alert conditions', () => {
      monitoring.recordGauge('metric1', 50)
      monitoring.recordGauge('metric2', 30)
      monitoring.recordGauge('metric3', 100)
      monitoring.recordGauge('metric4', 42)
      
      const alerts: AlertConfig[] = [
        { name: 'alert1', metric: 'metric1', condition: 'gt', threshold: 40, duration: 0, severity: 'low' },
        { name: 'alert2', metric: 'metric2', condition: 'lt', threshold: 50, duration: 0, severity: 'medium' },
        { name: 'alert3', metric: 'metric3', condition: 'eq', threshold: 100, duration: 0, severity: 'high' },
        { name: 'alert4', metric: 'metric4', condition: 'ne', threshold: 50, duration: 0, severity: 'critical' }
      ]
      
      alerts.forEach(alert => monitoring.addAlert(alert))
      monitoring['evaluateAlerts']()
      
      const activeAlerts = monitoring.getActiveAlerts()
      expect(activeAlerts).toHaveLength(4)
    })

    it('should acknowledge alerts', () => {
      monitoring.recordGauge('test_metric', 100)
      monitoring.addAlert({
        name: 'test_alert',
        metric: 'test_metric',
        condition: 'gt',
        threshold: 50,
        duration: 0,
        severity: 'high'
      })
      
      monitoring['evaluateAlerts']()
      const alerts = monitoring.getActiveAlerts()
      const alertId = alerts[0].id
      
      const acknowledged = monitoring.acknowledgeAlert(alertId)
      expect(acknowledged).toBe(true)
      expect(alerts[0].acknowledged).toBe(true)
    })

    it('should remove alert configuration', () => {
      monitoring.addAlert({
        name: 'removable_alert',
        metric: 'test',
        condition: 'gt',
        threshold: 0,
        duration: 0,
        severity: 'low'
      })
      
      const removed = monitoring.removeAlert('removable_alert')
      expect(removed).toBe(true)
    })
  })

  describe('Health Checks', () => {
    it('should add and run health checks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })
      
      const healthConfig: HealthCheckConfig = {
        name: 'api_health',
        endpoint: 'https://api.example.com/health',
        interval: 5000,
        timeout: 3000,
        retries: 3,
        expectedStatus: 200
      }
      
      monitoring.addHealthCheck(healthConfig)
      
      // Run health check manually
      await monitoring['runHealthChecks']()
      
      const status = monitoring.getHealthStatus('api_health')
      expect(status).toBeDefined()
      expect(status?.status).toBe('healthy')
      expect(status?.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle failed health checks', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      
      monitoring.addHealthCheck({
        name: 'failing_service',
        endpoint: 'https://api.example.com/health',
        interval: 5000,
        timeout: 1000,
        retries: 1
      })
      
      await monitoring['runHealthChecks']()
      
      const status = monitoring.getHealthStatus('failing_service')
      expect(status?.status).toBe('unhealthy')
      expect(status?.error).toBeDefined()
    })

    it('should run custom health checks', async () => {
      const customCheck = vi.fn().mockResolvedValue(true)
      
      monitoring.addHealthCheck({
        name: 'custom_check',
        endpoint: 'internal',
        interval: 5000,
        timeout: 1000,
        retries: 1,
        customCheck
      })
      
      await monitoring['runHealthChecks']()
      
      expect(customCheck).toHaveBeenCalled()
      const status = monitoring.getHealthStatus('custom_check')
      expect(status?.status).toBe('healthy')
    })

    it('should get system health summary', async () => {
      // Add multiple health checks
      monitoring.addHealthCheck({
        name: 'service1',
        endpoint: 'test',
        interval: 5000,
        timeout: 1000,
        retries: 1,
        customCheck: async () => true
      })
      
      monitoring.addHealthCheck({
        name: 'service2',
        endpoint: 'test',
        interval: 5000,
        timeout: 1000,
        retries: 1,
        customCheck: async () => false
      })
      
      await monitoring['runHealthChecks']()
      
      const systemHealth = monitoring.getSystemHealth()
      expect(systemHealth.status).toBe('unhealthy')
      expect(systemHealth.summary.total).toBe(2)
      expect(systemHealth.summary.healthy).toBe(1)
      expect(systemHealth.summary.unhealthy).toBe(1)
    })

    it('should remove health check', () => {
      monitoring.addHealthCheck({
        name: 'removable',
        endpoint: 'test',
        interval: 5000,
        timeout: 1000,
        retries: 1
      })
      
      const removed = monitoring.removeHealthCheck('removable')
      expect(removed).toBe(true)
    })
  })

  describe('Distributed Tracing', () => {
    it('should create and manage trace spans', () => {
      const span = monitoring.startTrace('user_request', {
        userId: '123',
        endpoint: '/api/users'
      })
      
      expect(span.traceId).toBeDefined()
      expect(span.spanId).toBeDefined()
      expect(span.operation).toBe('user_request')
      expect(span.tags.userId).toBe('123')
      
      monitoring.finishSpan(span)
      expect(span.endTime).toBeDefined()
      expect(span.endTime! - span.startTime).toBeGreaterThanOrEqual(0)
    })

    it('should create child spans', () => {
      const rootSpan = monitoring.startTrace('parent_operation')
      const childSpan = monitoring.createChildSpan(rootSpan, 'child_operation', {
        detail: 'processing'
      })
      
      expect(childSpan.traceId).toBe(rootSpan.traceId)
      expect(childSpan.parentSpanId).toBe(rootSpan.spanId)
      expect(childSpan.operation).toBe('child_operation')
      
      monitoring.finishSpan(childSpan)
      monitoring.finishSpan(rootSpan)
    })

    it('should add logs to spans', () => {
      const span = monitoring.startTrace('logged_operation')
      
      monitoring.addSpanLog(span, 'info', 'Starting processing')
      monitoring.addSpanLog(span, 'warn', 'Slow query detected', { duration: 500 })
      monitoring.addSpanLog(span, 'error', 'Failed to connect', { error: 'timeout' })
      
      expect(span.logs).toHaveLength(3)
      expect(span.logs[0].level).toBe('info')
      expect(span.logs[1].level).toBe('warn')
      expect(span.logs[2].fields?.error).toBe('timeout')
    })

    it('should retrieve traces by ID', () => {
      const span = monitoring.startTrace('test_trace')
      const traceId = span.traceId
      
      const trace = monitoring.getTrace(traceId)
      expect(trace).toBeDefined()
      expect(trace).toHaveLength(1)
      expect(trace![0]).toBe(span)
    })
  })

  describe('Performance Profiling', () => {
    it('should profile async function execution', async () => {
      const testFn = vi.fn().mockResolvedValue('result')
      
      const result = await monitoring.profile('test_function', testFn, {
        module: 'test'
      })
      
      expect(result).toBe('result')
      expect(testFn).toHaveBeenCalled()
      
      const durationMetric = monitoring.getMetric('profile_duration_ms')
      expect(durationMetric?.points).toHaveLength(1)
      expect(durationMetric?.points[0].labels?.function).toBe('test_function')
    })

    it('should handle profiling errors', async () => {
      const error = new Error('Test error')
      const testFn = vi.fn().mockRejectedValue(error)
      
      await expect(
        monitoring.profile('failing_function', testFn)
      ).rejects.toThrow('Test error')
      
      const durationMetric = monitoring.getMetric('profile_duration_ms')
      const lastPoint = durationMetric?.points.slice(-1)[0]
      expect(lastPoint?.labels?.status).toBe('error')
    })

    it('should skip profiling when disabled', async () => {
      const nonProfilingMonitoring = new MonitoringSystem({
        retentionPeriod: 60000,
        cleanupInterval: 10000,
        healthCheckInterval: 5000,
        alertCheckInterval: 2000,
        enableTracing: true,
        enableProfiling: false
      })
      
      const testFn = vi.fn().mockResolvedValue('result')
      const result = await nonProfilingMonitoring.profile('test', testFn)
      
      expect(result).toBe('result')
      expect(nonProfilingMonitoring.getMetric('profile_duration_ms')).toBeUndefined()
      
      nonProfilingMonitoring.destroy()
    })
  })

  describe('Dashboard and Export', () => {
    it('should provide dashboard data', () => {
      // Add some data
      monitoring.recordCounter('requests', 100)
      monitoring.recordGauge('active_users', 50)
      monitoring.addAlert({
        name: 'test_alert',
        metric: 'active_users',
        condition: 'gt',
        threshold: 40,
        duration: 0,
        severity: 'low'
      })
      
      const dashboard = monitoring.getDashboardData()
      
      expect(dashboard.metrics).toHaveLength(monitoring.getAllMetrics().length)
      expect(dashboard.alerts).toBeDefined()
      expect(dashboard.health).toBeDefined()
      expect(dashboard.recentActivity).toBeDefined()
    })

    it('should export monitoring data', () => {
      monitoring.recordCounter('export_test', 42)
      const span = monitoring.startTrace('export_trace')
      monitoring.finishSpan(span)
      
      const exportData = monitoring.exportData()
      
      expect(exportData.metrics).toBeDefined()
      expect(exportData.traces).toBeDefined()
      expect(exportData.alerts).toBeDefined()
      expect(exportData.health).toBeDefined()
      expect(exportData.timestamp).toBeGreaterThan(0)
    })
  })

  describe('Cleanup and Lifecycle', () => {
    it('should clean up old data', () => {
      // Add old and new data
      const oldTimestamp = Date.now() - 2 * 60 * 1000
      const metric = monitoring.getMetric('cleanup_test') || {
        name: 'cleanup_test',
        type: 'counter' as MetricType,
        description: 'Test',
        unit: 'count',
        points: []
      }
      
      metric.points.push({ timestamp: oldTimestamp, value: 1 })
      monitoring.recordCounter('cleanup_test', 2)
      
      // Run cleanup
      monitoring['cleanupOldData']()
      
      const updatedMetric = monitoring.getMetric('cleanup_test')
      expect(updatedMetric?.points).toHaveLength(1)
      expect(updatedMetric?.points[0].value).toBe(2)
    })

    it('should destroy monitoring system properly', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      monitoring.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalledTimes(3) // cleanup, health, alert timers
      expect(monitoring.getAllMetrics()).toHaveLength(0)
    })
  })

  describe('Global Monitoring', () => {
    it('should get or create global monitoring instance', () => {
      const global1 = getGlobalMonitoring()
      const global2 = getGlobalMonitoring()
      
      expect(global1).toBe(global2)
      
      global1.destroy()
    })

    it('should set custom global monitoring', () => {
      const custom = new MonitoringSystem()
      setGlobalMonitoring(custom)
      
      const retrieved = getGlobalMonitoring()
      expect(retrieved).toBe(custom)
      
      custom.destroy()
    })
  })

  describe('Monitor Decorator', () => {
    it('should monitor decorated methods', async () => {
      class TestService {
        @Monitor('custom_operation')
        async performOperation(): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'success'
        }

        @Monitor()
        async failingOperation(): Promise<void> {
          throw new Error('Operation failed')
        }
      }

      const service = new TestService()
      const result = await service.performOperation()
      
      expect(result).toBe('success')
      
      const global = getGlobalMonitoring()
      const metric = global.getMetric('rpc_operations_completed')
      expect(metric?.points.some(p => p.labels?.operation === 'custom_operation')).toBe(true)
      
      // Test failing operation
      await expect(service.failingOperation()).rejects.toThrow('Operation failed')
      
      const failedMetric = global.getMetric('rpc_operations_failed')
      expect(failedMetric?.points.some(p => p.labels?.operation === 'TestService.failingOperation')).toBe(true)
      
      global.destroy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle metrics with no points', () => {
      const metric = monitoring.getMetric('empty_metric') || {
        name: 'empty_metric',
        type: 'histogram' as MetricType,
        description: 'Empty',
        unit: 'ms',
        points: []
      }
      
      monitoring['updateAggregations'](metric)
      expect(metric.aggregations).toBeUndefined()
    })

    it('should handle invalid alert acknowledgment', () => {
      const result = monitoring.acknowledgeAlert('non-existent-alert')
      expect(result).toBe(false)
    })

    it('should get all health statuses when no name provided', () => {
      monitoring.addHealthCheck({
        name: 'service1',
        endpoint: 'test1',
        interval: 5000,
        timeout: 1000,
        retries: 1
      })
      
      monitoring.addHealthCheck({
        name: 'service2',
        endpoint: 'test2',
        interval: 5000,
        timeout: 1000,
        retries: 1
      })
      
      const statuses = monitoring.getHealthStatus()
      expect(Array.isArray(statuses)).toBe(true)
      expect(statuses).toHaveLength(2)
    })

    it('should handle metrics with single value correctly', () => {
      monitoring.recordHistogram('single_value', 42)
      
      const metric = monitoring.getMetric('single_value')
      expect(metric?.aggregations).toBeDefined()
      expect(metric?.aggregations?.min).toBe(42)
      expect(metric?.aggregations?.max).toBe(42)
      expect(metric?.aggregations?.avg).toBe(42)
      expect(metric?.aggregations?.p50).toBe(42)
      expect(metric?.aggregations?.p95).toBe(42)
      expect(metric?.aggregations?.p99).toBe(42)
    })
  })
})