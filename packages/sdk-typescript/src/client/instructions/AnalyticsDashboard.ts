/**
 * Analytics Dashboard Module
 * 
 * Provides comprehensive real-time analytics dashboard functionality
 * with streaming data, aggregation, and visualization support.
 */

import type { Address, Commitment } from '@solana/kit'
import { Connection } from '@solana/web3.js'
import { EventEmitter } from 'events'
import { 
  AnalyticsStreamer,
  type AnalyticsStreamOptions,
  type StreamedMetrics,
  createAnalyticsStreamer,
  type AgentAnalyticsEvent,
  type TransactionAnalyticsEvent,
  type MarketplaceActivityEvent,
  type NetworkHealthEvent,
  type ServicePerformanceEvent,
  type EconomicMetricsEvent
} from '../../utils/analytics-streaming.js'
import {
  AnalyticsAggregator,
  AggregationWindow,
  type AggregatedMetrics,
  type TimeSeriesPoint
} from '../../utils/analytics-aggregation.js'

// Dashboard configuration
export interface DashboardConfig {
  programId: Address
  connection: Connection
  commitment?: Commitment
  refreshInterval?: number // milliseconds
  aggregationWindows?: AggregationWindow[]
  maxDataPoints?: number
  enableHistorical?: boolean
  autoReconnect?: boolean
}

// Dashboard widget types
export enum WidgetType {
  RealtimeMetrics = 'realtime_metrics',
  TransactionVolume = 'transaction_volume',
  AgentPerformance = 'agent_performance',
  NetworkHealth = 'network_health',
  MarketActivity = 'market_activity',
  RevenueChart = 'revenue_chart',
  SuccessRateGauge = 'success_rate_gauge',
  TopAgentsLeaderboard = 'top_agents_leaderboard',
  AlertsFeed = 'alerts_feed'
}

// Widget configuration
export interface DashboardWidget {
  id: string
  type: WidgetType
  position: { x: number; y: number; width: number; height: number }
  config: Record<string, unknown>
  refreshRate?: number
}

// Alert configuration
export interface AlertConfig {
  id: string
  name: string
  condition: AlertCondition
  threshold: number
  action: AlertAction
  cooldown?: number // seconds
}

export enum AlertCondition {
  SuccessRateBelowThreshold = 'success_rate_below',
  ErrorRateAboveThreshold = 'error_rate_above',
  LatencyAboveThreshold = 'latency_above',
  VolumeDropped = 'volume_dropped',
  AgentInactive = 'agent_inactive'
}

export enum AlertAction {
  Notify = 'notify',
  Email = 'email',
  Webhook = 'webhook',
  Log = 'log'
}

// Dashboard state
export interface DashboardState {
  connected: boolean
  lastUpdate: bigint
  currentMetrics: StreamedMetrics | null
  aggregatedMetrics: Map<AggregationWindow, AggregatedMetrics>
  alerts: Alert[]
  widgets: DashboardWidget[]
}

export interface Alert {
  id: string
  configId: string
  timestamp: bigint
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  data?: Record<string, unknown>
}

/**
 * Real-time Analytics Dashboard
 * 
 * Provides a comprehensive analytics dashboard with real-time streaming,
 * data aggregation, alerts, and customizable widgets.
 */
export class AnalyticsDashboard extends EventEmitter {
  private streamer: AnalyticsStreamer
  private aggregator: AnalyticsAggregator
  private connection: Connection
  private refreshTimer?: ReturnType<typeof setInterval>
  private alertCheckerTimer?: ReturnType<typeof setInterval>
  
  // Dashboard state
  private state: DashboardState = {
    connected: false,
    lastUpdate: 0n,
    currentMetrics: null,
    aggregatedMetrics: new Map(),
    alerts: [],
    widgets: []
  }
  
  // Alert tracking
  private alertConfigs: AlertConfig[] = []
  private lastAlertTime: Map<string, bigint> = new Map()
  
  constructor(
    private config: DashboardConfig
  ) {
    super()
    
    this.connection = config.connection
    
    // Initialize analytics streamer
    const streamOptions: AnalyticsStreamOptions = {
      programId: config.programId,
      commitment: config.commitment,
      includeHistorical: config.enableHistorical,
      metricsInterval: 5000, // 5 second metrics updates
      reconnectInterval: 5000,
      maxReconnectAttempts: config.autoReconnect ? 10 : 0
    }
    
    this.streamer = createAnalyticsStreamer(this.connection, streamOptions)
    
    // Initialize aggregator
    this.aggregator = new AnalyticsAggregator(
      config.aggregationWindows ?? [
        AggregationWindow.Minute,
        AggregationWindow.Hour,
        AggregationWindow.Day
      ]
    )
    
    // Set up event handlers
    this.setupEventHandlers()
  }

  /**
   * Start the analytics dashboard
   */
  async start(): Promise<void> {
    console.log('🚀 Starting analytics dashboard...')
    
    // Start streaming
    await this.streamer.start()
    
    // Start refresh timer
    if (this.config.refreshInterval) {
      this.refreshTimer = setInterval(() => {
        this.refreshDashboard()
      }, this.config.refreshInterval)
    }
    
    // Start alert checker
    this.alertCheckerTimer = setInterval(() => {
      this.checkAlerts()
    }, 5000) // Check alerts every 5 seconds
    
    this.emit('started')
  }

  /**
   * Stop the dashboard
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping analytics dashboard...')
    
    // Stop streaming
    await this.streamer.stop()
    
    // Clear timers
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    
    if (this.alertCheckerTimer) {
      clearInterval(this.alertCheckerTimer)
      this.alertCheckerTimer = undefined
    }
    
    this.state.connected = false
    this.emit('stopped')
  }

  /**
   * Add a widget to the dashboard
   */
  addWidget(widget: DashboardWidget): void {
    this.state.widgets.push(widget)
    this.emit('widgetAdded', widget)
    
    // Initialize widget data
    this.initializeWidget(widget)
  }

  /**
   * Remove a widget from the dashboard
   */
  removeWidget(widgetId: string): void {
    const index = this.state.widgets.findIndex(w => w.id === widgetId)
    if (index !== -1) {
      const widget = this.state.widgets[index]
      this.state.widgets.splice(index, 1)
      this.emit('widgetRemoved', widget)
    }
  }

  /**
   * Configure an alert
   */
  addAlert(config: AlertConfig): void {
    this.alertConfigs.push(config)
    this.emit('alertConfigured', config)
  }

  /**
   * Remove an alert configuration
   */
  removeAlert(configId: string): void {
    const index = this.alertConfigs.findIndex(c => c.id === configId)
    if (index !== -1) {
      const config = this.alertConfigs[index]
      this.alertConfigs.splice(index, 1)
      this.emit('alertRemoved', config)
    }
  }

  /**
   * Get current dashboard state
   */
  getState(): DashboardState {
    return { ...this.state }
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    metric: string,
    window: AggregationWindow,
    limit?: number
  ): TimeSeriesPoint[] {
    const now = BigInt(Date.now() / 1000)
    const startTime = now - BigInt(window)
    
    const data = this.aggregator.getTimeSeries(metric, startTime, now, limit)
    return data
  }

  /**
   * Get aggregated metrics for a window
   */
  getAggregatedMetrics(window: AggregationWindow): AggregatedMetrics | null {
    return this.state.aggregatedMetrics.get(window) ?? null
  }

  /**
   * Export dashboard data
   */
  exportData(format: 'json' | 'csv'): string {
    const exportData = {
      timestamp: Date.now(),
      state: this.state,
      aggregations: Object.fromEntries(this.state.aggregatedMetrics),
      alerts: this.state.alerts
    }
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2)
    } else {
      // CSV export - simplified version
      const rows: string[] = ['Timestamp,Metric,Value']
      
      if (this.state.currentMetrics) {
        rows.push(`${exportData.timestamp},Active Agents,${this.state.currentMetrics.agents.active}`)
        rows.push(`${exportData.timestamp},Transaction Count,${this.state.currentMetrics.transactions.count}`)
        rows.push(`${exportData.timestamp},Success Rate,${this.state.currentMetrics.transactions.successRate}`)
      }
      
      return rows.join('\n')
    }
  }

  // Private methods

  private setupEventHandlers(): void {
    // Streamer events
    this.streamer.on('connected', () => {
      this.state.connected = true
      this.emit('connected')
    })
    
    this.streamer.on('disconnected', () => {
      this.state.connected = false
      this.emit('disconnected')
    })
    
    this.streamer.on('metrics', (metrics: StreamedMetrics) => {
      this.state.currentMetrics = metrics
      this.state.lastUpdate = BigInt(Date.now())
      this.emit('metricsUpdated', metrics)
    })
    
    // Analytics events for aggregation
    this.streamer.on('agentAnalytics', (event: unknown) => {
      this.aggregator.processAgentEvent(event as AgentAnalyticsEvent)
    })
    
    this.streamer.on('transactionAnalytics', (event: unknown) => {
      this.aggregator.processTransactionEvent(event as TransactionAnalyticsEvent)
    })
    
    this.streamer.on('marketplaceActivity', (event: unknown) => {
      this.aggregator.processMarketplaceEvent(event as MarketplaceActivityEvent)
    })
    
    this.streamer.on('networkHealth', (event: unknown) => {
      this.aggregator.processNetworkHealthEvent(event as NetworkHealthEvent)
    })
    
    this.streamer.on('servicePerformance', (event: unknown) => {
      this.aggregator.processServicePerformanceEvent(event as ServicePerformanceEvent)
    })
    
    this.streamer.on('economicMetrics', (event: unknown) => {
      this.aggregator.processEconomicMetricsEvent(event as EconomicMetricsEvent)
    })
    
    this.streamer.on('error', (error) => {
      this.emit('error', error)
    })
  }

  private refreshDashboard(): void {
    // Update aggregated metrics for each window
    for (const window of this.config.aggregationWindows ?? []) {
      const metrics = this.aggregator.getAggregatedMetrics(window)
      this.state.aggregatedMetrics.set(window, metrics)
    }
    
    // Update widgets
    for (const widget of this.state.widgets) {
      this.updateWidget(widget)
    }
    
    // Prune old data
    this.aggregator.pruneOldData(86400 * 7) // Keep 7 days of data
    
    this.emit('dashboardRefreshed')
  }

  private initializeWidget(widget: DashboardWidget): void {
    // Initialize widget based on type
    switch (widget.type) {
      case WidgetType.RealtimeMetrics:
        this.emit('widgetData', {
          widgetId: widget.id,
          data: this.state.currentMetrics
        })
        break
        
      case WidgetType.TransactionVolume: {
        const volumeData = this.getTimeSeries('transaction_volume', AggregationWindow.Hour)
        this.emit('widgetData', {
          widgetId: widget.id,
          data: volumeData
        })
        break
      }
        
      case WidgetType.TopAgentsLeaderboard: {
        const topAgents = this.aggregator.getTopAgents(10)
        this.emit('widgetData', {
          widgetId: widget.id,
          data: topAgents
        })
        break
      }
        
      // ... other widget types
    }
  }

  private updateWidget(widget: DashboardWidget): void {
    // Update widget data based on type
    this.initializeWidget(widget) // Reuse initialization logic
  }

  private checkAlerts(): void {
    if (!this.state.currentMetrics) return
    
    const now = BigInt(Date.now() / 1000)
    
    for (const config of this.alertConfigs) {
      // Check cooldown
      const lastAlert = this.lastAlertTime.get(config.id) ?? 0n
      if (now - lastAlert < BigInt(config.cooldown ?? 300)) {
        continue // Still in cooldown
      }
      
      let triggered = false
      let value = 0
      
      switch (config.condition) {
        case AlertCondition.SuccessRateBelowThreshold:
          value = this.state.currentMetrics.transactions.successRate
          triggered = value < config.threshold
          break
          
        case AlertCondition.ErrorRateAboveThreshold:
          value = this.state.currentMetrics.performance.errorRate
          triggered = value > config.threshold
          break
          
        case AlertCondition.LatencyAboveThreshold:
          value = Number(this.state.currentMetrics.performance.avgResponseTime)
          triggered = value > config.threshold
          break
          
        // ... other conditions
      }
      
      if (triggered) {
        this.triggerAlert(config, value)
      }
    }
  }

  private triggerAlert(config: AlertConfig, value: number): void {
    const alert: Alert = {
      id: `${config.id}-${Date.now()}`,
      configId: config.id,
      timestamp: BigInt(Date.now() / 1000),
      severity: this.getAlertSeverity(config, value),
      message: `${config.name}: ${config.condition} triggered (value: ${value}, threshold: ${config.threshold})`,
      data: {
        value,
        threshold: config.threshold,
        condition: config.condition
      }
    }
    
    // Add to alerts
    this.state.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.state.alerts.length > 100) {
      this.state.alerts = this.state.alerts.slice(-100)
    }
    
    // Update last alert time
    this.lastAlertTime.set(config.id, alert.timestamp)
    
    // Execute alert action
    this.executeAlertAction(config, alert)
    
    // Emit alert event
    this.emit('alert', alert)
  }

  private getAlertSeverity(config: AlertConfig, value: number): Alert['severity'] {
    const ratio = value / config.threshold
    
    if (config.condition === AlertCondition.SuccessRateBelowThreshold) {
      if (ratio < 0.5) return 'critical'
      if (ratio < 0.8) return 'error'
      return 'warning'
    } else {
      if (ratio > 2) return 'critical'
      if (ratio > 1.5) return 'error'
      return 'warning'
    }
  }

  private executeAlertAction(config: AlertConfig, alert: Alert): void {
    switch (config.action) {
      case AlertAction.Notify:
        // Browser notification or in-app notification
        this.emit('notification', {
          title: config.name,
          message: alert.message,
          severity: alert.severity
        })
        break
        
      case AlertAction.Log:
        console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`)
        break
        
      case AlertAction.Webhook:
        // Would send to configured webhook
        this.emit('webhookAlert', { config, alert })
        break
        
      case AlertAction.Email:
        // Would send email notification
        this.emit('emailAlert', { config, alert })
        break
    }
  }
}

/**
 * Create analytics dashboard instance
 */
export function createAnalyticsDashboard(config: DashboardConfig): AnalyticsDashboard {
  return new AnalyticsDashboard(config)
}