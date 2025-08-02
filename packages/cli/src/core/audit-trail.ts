/**
 * Audit Trail System for GhostSpeak CLI
 * 
 * Provides comprehensive logging of all sensitive operations with
 * timestamps, user tracking, and compliance-ready audit reports.
 * 
 * @example
 * ```typescript
 * const auditTrail = AuditTrail.getInstance()
 * 
 * // Log transaction
 * await auditTrail.logTransaction({
 *   type: 'agent_register',
 *   user: 'user123',
 *   amount: 0.1,
 *   details: { agentName: 'MyAgent' }
 * })
 * 
 * // Generate compliance report
 * const report = await auditTrail.generateReport({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date()
 * })
 * ```
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { EventBus } from './event-system'

/**
 * Audit event types
 */
export type AuditEventType =
  | 'transaction'
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration_change'
  | 'system_event'
  | 'security_event'
  | 'error'

/**
 * Audit severity levels
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Audit event interface
 */
export interface AuditEvent {
  /** Unique event ID */
  id: string
  /** Event type */
  type: AuditEventType
  /** Event severity */
  severity: AuditSeverity
  /** Event timestamp */
  timestamp: Date
  /** User identifier */
  userId?: string
  /** User session ID */
  sessionId?: string
  /** Event description */
  description: string
  /** Event details */
  details: Record<string, unknown>
  /** Resource affected */
  resource?: string
  /** Action performed */
  action: string
  /** Result of action */
  result: 'success' | 'failure' | 'error'
  /** Error message if applicable */
  error?: string
  /** Source IP address */
  sourceIp?: string
  /** User agent */
  userAgent?: string
  /** Correlation ID for related events */
  correlationId?: string
}

/**
 * Transaction audit log entry
 */
export interface TransactionAuditLog {
  /** Transaction type */
  type: string
  /** User performing transaction */
  user: string
  /** Transaction amount */
  amount?: number
  /** Transaction fee */
  fee?: number
  /** Target address */
  target?: string
  /** Transaction details */
  details: Record<string, unknown>
  /** Transaction hash (after execution) */
  txHash?: string
  /** Block height (after confirmation) */
  blockHeight?: number
}

/**
 * Authentication audit log entry
 */
export interface AuthenticationAuditLog {
  /** Authentication method */
  method: 'password' | 'hardware_wallet' | 'keypair' | 'mnemonic'
  /** Authentication result */
  result: 'success' | 'failure'
  /** User identifier */
  userId: string
  /** Session ID */
  sessionId: string
  /** Failure reason if applicable */
  failureReason?: string
  /** Device information */
  deviceInfo?: Record<string, unknown>
}

/**
 * Transaction confirmation event data
 */
interface TransactionConfirmationEventData {
  details?: {
    type?: string
    addresses?: {
      from?: string
      to?: string
    }
    estimatedCost?: {
      sol?: number
      fees?: {
        totalFee?: number
      }
    }
    data?: Record<string, unknown>
  }
  result?: {
    confirmed?: boolean
  }
}

/**
 * Hardware wallet event data
 */
interface HardwareWalletEventData {
  derivationPath?: string
  signatureLength?: number
}

/**
 * Agent registration event data
 */
interface AgentRegistrationEventData {
  agentId?: string
  success?: boolean
}

/**
 * Agent update event data
 */
interface AgentUpdateEventData {
  agentId?: string
  fields?: string[]
  success?: boolean
}

/**
 * Cache event data
 */
interface CacheEventData {
  key?: string
  level?: string
}

/**
 * Error event data
 */
interface ErrorEventData {
  message?: string
  stack?: string
  code?: string
}

/**
 * Audit report options
 */
export interface AuditReportOptions {
  /** Start date for report */
  startDate: Date
  /** End date for report */
  endDate: Date
  /** Event types to include */
  eventTypes?: AuditEventType[]
  /** Users to include */
  userIds?: string[]
  /** Severity levels to include */
  severities?: AuditSeverity[]
  /** Maximum number of events */
  limit?: number
  /** Report format */
  format?: 'json' | 'csv' | 'html'
}

/**
 * Audit report interface
 */
export interface AuditReport {
  /** Report metadata */
  metadata: {
    generatedAt: Date
    startDate: Date
    endDate: Date
    totalEvents: number
    reportId: string
  }
  /** Summary statistics */
  summary: {
    eventsByType: Record<AuditEventType, number>
    eventsBySeverity: Record<AuditSeverity, number>
    uniqueUsers: number
    successRate: number
    errorRate: number
  }
  /** Audit events */
  events: AuditEvent[]
  /** Recommendations */
  recommendations?: string[]
}

/**
 * Audit trail configuration
 */
export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean
  /** Log file path */
  logPath?: string
  /** Maximum log file size (MB) */
  maxFileSize?: number
  /** Maximum number of log files to keep */
  maxFiles?: number
  /** Events to log */
  eventTypes?: AuditEventType[]
  /** Minimum severity to log */
  minSeverity?: AuditSeverity
  /** Real-time streaming enabled */
  streaming?: boolean
}

/**
 * Audit trail system
 */
export class AuditTrail extends EventEmitter {
  private static instance: AuditTrail | null = null
  private config: AuditConfig
  private eventBuffer: AuditEvent[] = []
  private eventBus = EventBus.getInstance()
  private logPath: string
  private eventIdCounter = 0
  private sessionId: string

  constructor(config?: Partial<AuditConfig>) {
    super()

    this.config = {
      enabled: true,
      logPath: join(process.cwd(), 'logs', 'audit.log'),
      maxFileSize: 100, // 100MB
      maxFiles: 10,
      eventTypes: ['transaction', 'authentication', 'security_event', 'error'],
      minSeverity: 'low',
      streaming: true,
      ...config
    }

    this.logPath = this.config.logPath!
    this.sessionId = this.generateSessionId()
    this.setupEventHandlers()
    this.startPeriodicFlush()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<AuditConfig>): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail(config)
    }
    return AuditTrail.instance
  }

  /**
   * Log audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    // Check if event type should be logged
    if (this.config.eventTypes && !this.config.eventTypes.includes(event.type)) {
      return
    }

    // Check severity threshold
    if (!this.meetsMinimumSeverity(event.severity)) {
      return
    }

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      ...event
    }

    // Add to buffer
    this.eventBuffer.push(auditEvent)

    // Emit event for real-time streaming
    if (this.config.streaming) {
      this.eventBus.emit('audit:event', auditEvent)
      this.emit('event', auditEvent)
    }

    // Write high-severity events immediately
    if (event.severity === 'critical' || event.severity === 'high') {
      await this.flushBuffer()
    }
  }

  /**
   * Log transaction
   */
  async logTransaction(transaction: TransactionAuditLog & {
    result?: 'success' | 'failure' | 'error'
    error?: string
    correlationId?: string
  }): Promise<void> {
    await this.logEvent({
      type: 'transaction',
      severity: transaction.amount && transaction.amount > 1 ? 'high' : 'medium',
      userId: transaction.user,
      description: `Transaction: ${transaction.type}`,
      details: {
        transactionType: transaction.type,
        amount: transaction.amount,
        fee: transaction.fee,
        target: transaction.target,
        txHash: transaction.txHash,
        blockHeight: transaction.blockHeight,
        ...transaction.details
      },
      resource: transaction.target,
      action: transaction.type,
      result: transaction.result ?? 'success',
      error: transaction.error,
      correlationId: transaction.correlationId
    })
  }

  /**
   * Log authentication event
   */
  async logAuthentication(auth: AuthenticationAuditLog): Promise<void> {
    await this.logEvent({
      type: 'authentication',
      severity: auth.result === 'failure' ? 'medium' : 'low',
      userId: auth.userId,
      description: `Authentication attempt: ${auth.method}`,
      details: {
        method: auth.method,
        failureReason: auth.failureReason,
        deviceInfo: auth.deviceInfo
      },
      action: 'authenticate',
      result: auth.result,
      error: auth.failureReason
    })
  }

  /**
   * Log security event
   */
  async logSecurity(event: {
    description: string
    details: Record<string, unknown>
    severity?: AuditSeverity
    userId?: string
    correlationId?: string
  }): Promise<void> {
    await this.logEvent({
      type: 'security_event',
      severity: event.severity || 'high',
      userId: event.userId,
      description: event.description,
      details: event.details,
      action: 'security_check',
      result: 'success',
      correlationId: event.correlationId
    })
  }

  /**
   * Log error event
   */
  async logError(error: {
    message: string
    stack?: string
    code?: string
    userId?: string
    action?: string
    correlationId?: string
  }): Promise<void> {
    await this.logEvent({
      type: 'error',
      severity: 'medium',
      userId: error.userId,
      description: `Error: ${error.message}`,
      details: {
        stack: error.stack,
        code: error.code
      },
      action: error.action || 'unknown',
      result: 'error',
      error: error.message,
      correlationId: error.correlationId
    })
  }

  /**
   * Generate audit report
   */
  async generateReport(options: AuditReportOptions): Promise<AuditReport> {
    // Ensure buffer is flushed
    await this.flushBuffer()

    // Load events from log files
    const events = await this.loadEvents(options)

    // Generate summary statistics
    const summary = this.generateSummary(events)

    // Generate recommendations
    const recommendations = this.generateRecommendations(events, summary)

    const report: AuditReport = {
      metadata: {
        generatedAt: new Date(),
        startDate: options.startDate,
        endDate: options.endDate,
        totalEvents: events.length,
        reportId: this.generateReportId()
      },
      summary,
      events: options.limit ? events.slice(0, options.limit) : events,
      recommendations
    }

    // Emit report generated event
    this.eventBus.emit('audit:report_generated', {
      reportId: report.metadata.reportId,
      eventCount: events.length
    })

    return report
  }

  /**
   * Export report to file
   */
  async exportReport(report: AuditReport, filepath: string, format: 'json' | 'csv' | 'html' = 'json'): Promise<void> {
    await this.ensureDirectoryExists(dirname(filepath))

    switch (format) {
      case 'json':
        await fs.writeFile(filepath, JSON.stringify(report, null, 2))
        break
      case 'csv':
        await fs.writeFile(filepath, this.formatReportAsCSV(report))
        break
      case 'html':
        await fs.writeFile(filepath, this.formatReportAsHTML(report))
        break
    }

    this.eventBus.emit('audit:report_exported', {
      reportId: report.metadata.reportId,
      filepath,
      format
    })
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit = 100): Promise<AuditEvent[]> {
    await this.flushBuffer()
    const events = await this.loadEvents({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: new Date(),
      limit
    })
    return events
  }

  /**
   * Search events
   */
  async searchEvents(query: {
    text?: string
    userId?: string
    type?: AuditEventType
    severity?: AuditSeverity
    startDate?: Date
    endDate?: Date
  }): Promise<AuditEvent[]> {
    await this.flushBuffer()
    
    const options: AuditReportOptions = {
      startDate: query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: query.endDate || new Date(),
      eventTypes: query.type ? [query.type] : undefined,
      userIds: query.userId ? [query.userId] : undefined,
      severities: query.severity ? [query.severity] : undefined
    }

    let events = await this.loadEvents(options)

    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase()
      events = events.filter(event => 
        event.description.toLowerCase().includes(searchText) ||
        event.action.toLowerCase().includes(searchText) ||
        JSON.stringify(event.details).toLowerCase().includes(searchText)
      )
    }

    return events
  }

  /**
   * Clear audit logs (use with caution)
   */
  async clearLogs(): Promise<void> {
    this.eventBuffer = []
    
    try {
      await fs.unlink(this.logPath)
    } catch {
      // File may not exist, ignore
    }

    this.eventBus.emit('audit:logs_cleared')
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to transaction confirmation events
    this.eventBus.on('transaction:confirmation_completed', async (event) => {
      const eventData = event.data as TransactionConfirmationEventData
      await this.logTransaction({
        type: eventData.details?.type ?? 'unknown',
        user: eventData.details?.addresses?.from ?? 'unknown',
        amount: eventData.details?.estimatedCost?.sol ?? 0,
        fee: eventData.details?.estimatedCost?.fees?.totalFee,
        target: eventData.details?.addresses?.to,
        details: eventData.details?.data ?? {},
        result: eventData.result?.confirmed ? 'success' : 'failure',
        correlationId: event.correlationId
      })
    })

    // Listen to hardware wallet events
    this.eventBus.on('hardware_wallet:transaction_signed', async (event) => {
      const eventData = event.data as HardwareWalletEventData
      await this.logSecurity({
        description: 'Hardware wallet transaction signed',
        details: {
          derivationPath: eventData.derivationPath,
          signatureLength: eventData.signatureLength
        },
        severity: 'medium',
        correlationId: event.correlationId
      })
    })

    // Listen to cache events for data access logging
    this.eventBus.on('cache:hit', async (event) => {
      const eventData = event.data as CacheEventData
      await this.logEvent({
        type: 'data_access',
        severity: 'low',
        description: 'Cache hit',
        details: {
          key: eventData.key,
          level: eventData.level
        },
        action: 'cache_access',
        result: 'success'
      })
    })

    // Listen to error events
    this.eventBus.on('error', async (event) => {
      const eventData = event.data as ErrorEventData
      await this.logError({
        message: eventData.message ?? 'Unknown error',
        stack: eventData.stack,
        code: eventData.code,
        correlationId: event.correlationId
      })
    })
  }

  /**
   * Flush event buffer to disk
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return
    }

    try {
      await this.ensureDirectoryExists(dirname(this.logPath))
      
      const logLines = this.eventBuffer.map(event => JSON.stringify(event)).join('\n') + '\n'
      await fs.appendFile(this.logPath, logLines)
      
      this.eventBuffer = []
      this.emit('buffer_flushed')

    } catch {
      this.emit('error', error)
    }
  }

  /**
   * Load events from log files
   */
  private async loadEvents(options: AuditReportOptions): Promise<AuditEvent[]> {
    const events: AuditEvent[] = []

    try {
      const logContent = await fs.readFile(this.logPath, 'utf-8')
      const lines = logContent.trim().split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const event: AuditEvent = JSON.parse(line)
          
          // Apply filters
          const eventDate = new Date(event.timestamp)
          if (eventDate < options.startDate || eventDate > options.endDate) {
            continue
          }

          if (options.eventTypes && !options.eventTypes.includes(event.type)) {
            continue
          }

          if (options.userIds && event.userId && !options.userIds.includes(event.userId)) {
            continue
          }

          if (options.severities && !options.severities.includes(event.severity)) {
            continue
          }

          events.push(event)

        } catch (_parseError) {
          // Skip malformed lines
          continue
        }
      }

    } catch {
      // Log file may not exist yet
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return events
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(events: AuditEvent[]): AuditReport['summary'] {
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const uniqueUsers = new Set<string>()
    let successCount = 0
    let errorCount = 0

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      
      if (event.userId) {
        uniqueUsers.add(event.userId)
      }

      if (event.result === 'success') {
        successCount++
      } else if (event.result === 'error' || event.result === 'failure') {
        errorCount++
      }
    }

    const total = events.length
    return {
      eventsByType: eventsByType as Record<AuditEventType, number>,
      eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
      uniqueUsers: uniqueUsers.size,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
      errorRate: total > 0 ? (errorCount / total) * 100 : 0
    }
  }

  /**
   * Generate recommendations based on audit data
   */
  private generateRecommendations(events: AuditEvent[], summary: AuditReport['summary']): string[] {
    const recommendations: string[] = []

    // High error rate
    if (summary.errorRate > 10) {
      recommendations.push(`High error rate detected (${summary.errorRate.toFixed(1)}%). Consider investigating frequent failure patterns.`)
    }

    // Security events
    const securityEvents = summary.eventsByType.security_event || 0
    if (securityEvents > 0) {
      recommendations.push(`${securityEvents} security events detected. Review security logs for potential threats.`)
    }

    // Failed authentication attempts
    const authEvents = events.filter(e => e.type === 'authentication' && e.result === 'failure')
    if (authEvents.length > 5) {
      recommendations.push(`${authEvents.length} failed authentication attempts detected. Consider implementing additional security measures.`)
    }

    // High-value transactions
    const highValueTxs = events.filter(e => 
      e.type === 'transaction' && 
      e.details.amount && 
      typeof e.details.amount === 'number' && 
      e.details.amount > 5
    )
    if (highValueTxs.length > 0) {
      recommendations.push(`${highValueTxs.length} high-value transactions detected. Ensure additional verification for large amounts.`)
    }

    // Unusual activity patterns
    const recentEvents = events.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    )
    if (recentEvents.length > 100) {
      recommendations.push('High activity volume in the last 24 hours. Monitor for unusual patterns.')
    }

    return recommendations
  }

  /**
   * Format report as CSV
   */
  private formatReportAsCSV(report: AuditReport): string {
    const headers = [
      'ID', 'Type', 'Severity', 'Timestamp', 'User ID', 'Description',
      'Action', 'Result', 'Resource', 'Error'
    ]

    const rows = report.events.map(event => [
      event.id,
      event.type,
      event.severity,
      event.timestamp.toISOString(),
      event.userId || '',
      event.description,
      event.action,
      event.result,
      event.resource || '',
      event.error || ''
    ])

    return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  }

  /**
   * Format report as HTML
   */
  private formatReportAsHTML(report: AuditReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Audit Report - ${report.metadata.reportId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; margin-bottom: 30px; border-radius: 5px; }
        .events { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
        .severity-high { background-color: #ffebee; }
        .severity-critical { background-color: #ffcdd2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>GhostSpeak CLI Audit Report</h1>
        <p><strong>Report ID:</strong> ${report.metadata.reportId}</p>
        <p><strong>Generated:</strong> ${report.metadata.generatedAt.toISOString()}</p>
        <p><strong>Period:</strong> ${report.metadata.startDate.toISOString()} to ${report.metadata.endDate.toISOString()}</p>
        <p><strong>Total Events:</strong> ${report.metadata.totalEvents}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Unique Users:</strong> ${report.summary.uniqueUsers}</p>
        <p><strong>Success Rate:</strong> ${report.summary.successRate.toFixed(1)}%</p>
        <p><strong>Error Rate:</strong> ${report.summary.errorRate.toFixed(1)}%</p>
    </div>

    ${report.recommendations && report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="events">
        <h2>Audit Events</h2>
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>User</th>
                    <th>Description</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                ${report.events.map(event => `
                    <tr class="severity-${event.severity}">
                        <td>${new Date(event.timestamp).toLocaleString()}</td>
                        <td>${event.type}</td>
                        <td>${event.severity}</td>
                        <td>${event.userId || 'N/A'}</td>
                        <td>${event.description}</td>
                        <td>${event.result}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `
  }

  /**
   * Check if event meets minimum severity
   */
  private meetsMinimumSeverity(severity: AuditSeverity): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const minLevel = severityLevels[this.config.minSeverity!]
    const eventLevel = severityLevels[severity]
    return eventLevel >= minLevel
  }

  /**
   * Start periodic buffer flush
   */
  private startPeriodicFlush(): void {
    // Flush buffer every 30 seconds
    setInterval(() => {
      this.flushBuffer().catch(error => {
        this.emit('error', error)
      })
    }, 30000)
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${++this.eventIdCounter}`
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }
}

/**
 * Audit trail decorator for automatic logging
 */
export function AuditLog(options: {
  type: AuditEventType
  severity?: AuditSeverity
  description?: string
  action?: string
}) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const auditTrail = AuditTrail.getInstance()
      const startTime = Date.now()

      try {
        const result = await method.apply(this, args)
        
        await auditTrail.logEvent({
          type: options.type,
          severity: options.severity || 'low',
          description: options.description || `${propertyName} executed`,
          details: {
            method: propertyName,
            args: args.length > 0 ? 'present' : 'none',
            duration: Date.now() - startTime
          },
          action: options.action || propertyName,
          result: 'success'
        })

        return result

      } catch {
        await auditTrail.logEvent({
          type: options.type,
          severity: 'medium',
          description: `${propertyName} failed`,
          details: {
            method: propertyName,
            args: args.length > 0 ? 'present' : 'none',
            duration: Date.now() - startTime
          },
          action: options.action || propertyName,
          result: 'error',
          error: error instanceof Error ? error.message : String(error)
        })

        throw error
      }
    }
  }
}

// Export singleton instance
export const auditTrail = AuditTrail.getInstance()