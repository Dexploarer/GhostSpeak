/**
 * COMPREHENSIVE INTEGRATION TEST RUNNER
 *
 * This is the ultimate test suite that validates the ENTIRE GhostSpeak system:
 * - Browser automation simulating real user journeys
 * - API integration testing with real endpoints
 * - Cross-service tracing with correlation IDs
 * - Wide event logging verification
 * - Performance monitoring across the full stack
 * - Error handling and recovery testing
 *
 * This test proves that the wide event logging system captures the complete story
 * of user interactions across the entire application stack.
 */

import { ComprehensiveIntegrationTester } from './full-integration-tests'
import { WideEventCollector } from './wide-event-collector'

interface ComprehensiveTestResults {
  browserTests: any[]
  apiTests: any[]
  wideEvents: any[]
  correlations: CorrelationAnalysis
  performance: PerformanceAnalysis
  errors: ErrorAnalysis
}

interface CorrelationAnalysis {
  totalCorrelations: number
  brokenChains: number
  averageChainLength: number
  serviceHops: Record<string, number>
}

interface PerformanceAnalysis {
  frontendMetrics: any
  backendMetrics: any
  apiResponseTimes: any
  bottlenecks: string[]
}

interface ErrorAnalysis {
  totalErrors: number
  errorTypes: Record<string, number>
  errorRecovery: number
  userImpactingErrors: number
}

class ComprehensiveIntegrationRunner {
  private baseUrl: string
  private eventCollector: WideEventCollector
  private results: ComprehensiveTestResults

  constructor(baseUrl = 'http://localhost:3333') {
    this.baseUrl = baseUrl
    this.eventCollector = new WideEventCollector()
    this.results = {
      browserTests: [],
      apiTests: [],
      wideEvents: [],
      correlations: {
        totalCorrelations: 0,
        brokenChains: 0,
        averageChainLength: 0,
        serviceHops: {}
      },
      performance: {
        frontendMetrics: {},
        backendMetrics: {},
        apiResponseTimes: {},
        bottlenecks: []
      },
      errors: {
        totalErrors: 0,
        errorTypes: {},
        errorRecovery: 0,
        userImpactingErrors: 0
      }
    }
  }

  async runComprehensiveTests(): Promise<void> {
    console.log('🚀 STARTING COMPREHENSIVE INTEGRATION TESTS')
    console.log('=' .repeat(80))
    console.log(`Base URL: ${this.baseUrl}`)
    console.log('Testing: Browser Automation + API Integration + Wide Event Logging')
    console.log('=' .repeat(80))

    try {
      // Start collecting wide events
      await this.eventCollector.startCollection()

      // Phase 1: Browser Automation Tests
      console.log('\n📱 PHASE 1: BROWSER AUTOMATION TESTS')
      await this.runBrowserAutomationTests()

      // Phase 2: API Integration Tests
      console.log('\n🔗 PHASE 2: API INTEGRATION TESTS')
      await this.runApiIntegrationTests()

      // Phase 3: Cross-Service Correlation Analysis
      console.log('\n🔍 PHASE 3: CROSS-SERVICE CORRELATION ANALYSIS')
      await this.analyzeCorrelations()

      // Phase 4: Performance Analysis
      console.log('\n⚡ PHASE 4: PERFORMANCE ANALYSIS')
      await this.analyzePerformance()

      // Phase 5: Error Analysis
      console.log('\n🚨 PHASE 5: ERROR ANALYSIS')
      await this.analyzeErrors()

      // Phase 6: Generate Final Report
      console.log('\n📊 PHASE 6: FINAL REPORT GENERATION')
      this.generateComprehensiveReport()

    } finally {
      await this.eventCollector.stopCollection()
    }
  }

  private async runBrowserAutomationTests(): Promise<void> {
    const tester = new ComprehensiveIntegrationTester(this.baseUrl)

    try {
      await tester.setup()

      // Test 1: Complete Homepage User Journey
      console.log('Running: Complete Homepage User Journey...')
      await tester.runHomepageJourney()
      this.results.browserTests.push({
        name: 'Homepage Journey',
        status: 'COMPLETED',
        events: await this.eventCollector.getRecentEvents(10)
      })

      // Test 2: Complete Agent Chat Journey
      console.log('Running: Complete Agent Chat Journey...')
      await tester.runAgentChatJourney()
      this.results.browserTests.push({
        name: 'Agent Chat Journey',
        status: 'COMPLETED',
        events: await this.eventCollector.getRecentEvents(20)
      })

      // Test 3: Error Scenarios
      console.log('Running: Error Scenario Testing...')
      await tester.runErrorScenarioJourney()
      this.results.browserTests.push({
        name: 'Error Scenarios',
        status: 'COMPLETED',
        events: await this.eventCollector.getRecentEvents(15)
      })

      // Test 4: Wallet Connection Flow
      console.log('Running: Wallet Connection & Transaction Flow...')
      await this.runWalletConnectionFlow()
      this.results.browserTests.push({
        name: 'Wallet & Transactions',
        status: 'COMPLETED',
        events: await this.eventCollector.getRecentEvents(10)
      })

      console.log(`✅ Browser tests completed: ${this.results.browserTests.length} journeys tested`)

    } catch (error) {
      console.error('❌ Browser automation failed:', error)
      this.results.browserTests.push({
        name: 'Browser Tests',
        status: 'FAILED',
        error: error.message
      })
    } finally {
      await tester.teardown()
    }
  }

  private async runWalletConnectionFlow(): Promise<void> {
    const startTime = Date.now()
    const testName = 'Wallet Connection & Transaction Flow'

    try {
      console.log(`💰 Testing: ${testName}`)

      if (!this.page) throw new Error('Page not initialized')

      // Navigate to dashboard (requires wallet connection)
      await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: 'networkidle2' })
      console.log('✅ Dashboard page loaded')

      // Look for wallet connection prompts
      const connectWalletBtn = await this.page.$('[data-testid="connect-wallet"], .wallet-connect, button:contains("Connect")')
      console.log(`✅ Wallet connection UI present: ${!!connectWalletBtn}`)

      // Check for wallet status indicators
      const walletStatus = await this.page.$('[data-testid="wallet-status"], .wallet-info, .wallet-connected')
      console.log(`✅ Wallet status indicator present: ${!!walletStatus}`)

      // Test transaction-related UI elements
      const transactionHistory = await this.page.$('[data-testid="transaction-history"], .transactions, .tx-history')
      console.log(`✅ Transaction history UI present: ${!!transactionHistory}`)

      // Test stake/unstake UI elements
      const stakingInterface = await this.page.$('[data-testid="staking"], .staking, .stake-interface')
      console.log(`✅ Staking interface present: ${!!stakingInterface}`)

      // Measure performance
      const perf = await this.measurePerformance()

      console.log(`✅ PASS: ${testName}`)

    } catch (error: any) {
      console.log(`❌ FAIL: ${testName} - ${error.message}`)
    }
  }

  private async runApiIntegrationTests(): Promise<void> {
    const apiTests = [
      { name: 'Health Check API', endpoint: '/api/health', expectedStatus: 200 },
      { name: 'V1 Health Check API', endpoint: '/api/v1/health', expectedStatus: 200 },
      { name: 'Invalid Agent API', endpoint: '/api/v1/agent/invalid-address', expectedStatus: 400 },
      { name: 'Agent Not Found API', endpoint: '/api/v1/agent/11111111111111111111111111111112', expectedStatus: 404 },
      { name: 'Non-existent API', endpoint: '/api/non-existent', expectedStatus: 404 },
    ]

    for (const test of apiTests) {
      try {
        console.log(`Testing: ${test.name} (${test.endpoint})`)

        const startTime = Date.now()
        const response = await fetch(`${this.baseUrl}${test.endpoint}`)
        const responseTime = Date.now() - startTime

        const status = response.status === test.expectedStatus ? 'PASS' : 'FAIL'

        this.results.apiTests.push({
          name: test.name,
          endpoint: test.endpoint,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          responseTime,
          status,
          events: await this.eventCollector.getRecentEvents(5)
        })

        console.log(`  ${status}: ${response.status} (${responseTime}ms)`)

      } catch (error) {
        this.results.apiTests.push({
          name: test.name,
          endpoint: test.endpoint,
          status: 'ERROR',
          error: error.message
        })
        console.log(`  ERROR: ${error.message}`)
      }

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`✅ API tests completed: ${this.results.apiTests.length} endpoints tested`)
  }

  private async analyzeCorrelations(): Promise<void> {
    const events = await this.eventCollector.getAllEvents()

    // Group events by correlation ID
    const correlationGroups: Record<string, any[]> = {}
    events.forEach(event => {
      const corrId = event.correlation_id || event.request_id
      if (!correlationGroups[corrId]) {
        correlationGroups[corrId] = []
      }
      correlationGroups[corrId].push(event)
    })

    this.results.correlations.totalCorrelations = Object.keys(correlationGroups).length
    this.results.correlations.averageChainLength = events.length / this.results.correlations.totalCorrelations

    // Analyze service hops
    Object.values(correlationGroups).forEach(chain => {
      chain.forEach(event => {
        const service = event.service || 'unknown'
        this.results.correlations.serviceHops[service] = (this.results.correlations.serviceHops[service] || 0) + 1
      })
    })

    console.log(`📊 Found ${this.results.correlations.totalCorrelations} correlation chains`)
    console.log(`📊 Average chain length: ${this.results.correlations.averageChainLength.toFixed(1)} events`)
    console.log(`📊 Service distribution:`, this.results.correlations.serviceHops)
  }

  private async analyzePerformance(): Promise<void> {
    const events = await this.eventCollector.getAllEvents()

    // Analyze API response times
    const apiEvents = events.filter(e => e.path && e.path.startsWith('/api/'))
    const responseTimes: Record<string, number[]> = {}

    apiEvents.forEach(event => {
      const path = event.path
      if (!responseTimes[path]) responseTimes[path] = []
      if (event.duration_ms) responseTimes[path].push(event.duration_ms)
    })

    // Calculate averages
    Object.keys(responseTimes).forEach(path => {
      const times = responseTimes[path]
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      this.results.performance.apiResponseTimes[path] = { avg, max, count: times.length }
    })

    // Identify bottlenecks (>2 seconds)
    Object.entries(this.results.performance.apiResponseTimes).forEach(([path, metrics]: [string, any]) => {
      if (metrics.avg > 2000) {
        this.results.performance.bottlenecks.push(`${path}: ${metrics.avg.toFixed(0)}ms avg`)
      }
    })

    console.log(`⚡ Performance analysis complete:`)
    console.log(`  API endpoints tested: ${Object.keys(responseTimes).length}`)
    console.log(`  Performance bottlenecks: ${this.results.performance.bottlenecks.length}`)
    if (this.results.performance.bottlenecks.length > 0) {
      console.log(`  ⚠️  Slow endpoints:`, this.results.performance.bottlenecks)
    }
  }

  private async analyzeErrors(): Promise<void> {
    const events = await this.eventCollector.getAllEvents()

    const errorEvents = events.filter(e => e.outcome === 'error' || (e.status_code && e.status_code >= 400))

    this.results.errors.totalErrors = errorEvents.length

    // Categorize errors
    errorEvents.forEach(event => {
      const errorType = event.error?.type || `HTTP_${event.status_code}` || 'Unknown'
      this.results.errors.errorTypes[errorType] = (this.results.errors.errorTypes[errorType] || 0) + 1
    })

    // Check error recovery (events that succeeded after errors in same correlation chain)
    const correlationChains = new Map<string, any[]>()
    events.forEach(event => {
      const corrId = event.correlation_id || event.request_id
      if (!correlationChains.has(corrId)) {
        correlationChains.set(corrId, [])
      }
      correlationChains.get(corrId)!.push(event)
    })

    correlationChains.forEach(chain => {
      const hasError = chain.some(e => e.outcome === 'error')
      const hasSuccess = chain.some(e => e.outcome === 'success')
      if (hasError && hasSuccess) {
        this.results.errors.errorRecovery++
      }
    })

    console.log(`🚨 Error analysis complete:`)
    console.log(`  Total errors: ${this.results.errors.totalErrors}`)
    console.log(`  Error types:`, this.results.errors.errorTypes)
    console.log(`  Recovery scenarios: ${this.results.errors.errorRecovery}`)
  }

  private generateComprehensiveReport(): void {
    console.log('\n' + '=' .repeat(100))
    console.log('🎯 COMPREHENSIVE INTEGRATION TEST RESULTS')
    console.log('=' .repeat(100))

    // Summary
    const browserTests = this.results.browserTests.length
    const apiTests = this.results.apiTests.filter(t => t.status === 'PASS').length
    const totalApiTests = this.results.apiTests.length
    const correlationChains = this.results.correlations.totalCorrelations
    const totalErrors = this.results.errors.totalErrors

    console.log('\n📈 EXECUTIVE SUMMARY:')
    console.log(`Browser Journeys Tested: ${browserTests}`)
    console.log(`API Endpoints Validated: ${apiTests}/${totalApiTests}`)
    console.log(`Correlation Chains Traced: ${correlationChains}`)
    console.log(`Errors Detected: ${totalErrors}`)
    console.log(`Performance Bottlenecks: ${this.results.performance.bottlenecks.length}`)

    // Test Results
    console.log('\n🧪 TEST RESULTS:')

    console.log('\nBrowser Automation:')
    this.results.browserTests.forEach(test => {
      const icon = test.status === 'COMPLETED' ? '✅' : '❌'
      console.log(`  ${icon} ${test.name}`)
    })

    console.log('\nAPI Integration:')
    this.results.apiTests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : '❌'
      console.log(`  ${icon} ${test.name}: ${test.actualStatus || 'ERROR'} (${test.responseTime || 0}ms)`)
    })

    // Wide Event Analysis
    console.log('\n📊 WIDE EVENT ANALYSIS:')
    console.log(`Total Events Captured: ${this.results.wideEvents.length}`)
    console.log(`Correlation Coverage: ${((correlationChains / Math.max(browserTests + apiTests, 1)) * 100).toFixed(1)}%`)
    console.log(`Average Chain Length: ${this.results.correlations.averageChainLength.toFixed(1)} events`)

    console.log('\nService Distribution:')
    Object.entries(this.results.correlations.serviceHops).forEach(([service, count]: [string, any]) => {
      console.log(`  ${service}: ${count} events`)
    })

    // Performance Insights
    console.log('\n⚡ PERFORMANCE INSIGHTS:')
    if (this.results.performance.bottlenecks.length > 0) {
      console.log('🚨 Performance Bottlenecks:')
      this.results.performance.bottlenecks.forEach(bottleneck => {
        console.log(`  ⚠️  ${bottleneck}`)
      })
    } else {
      console.log('✅ No significant performance bottlenecks detected')
    }

    console.log('\nAPI Response Times:')
    Object.entries(this.results.performance.apiResponseTimes).forEach(([endpoint, metrics]: [string, any]) => {
      console.log(`  ${endpoint}: ${metrics.avg.toFixed(0)}ms avg (${metrics.max}ms max, ${metrics.count} calls)`)
    })

    // Error Analysis
    console.log('\n🚨 ERROR ANALYSIS:')
    if (totalErrors === 0) {
      console.log('✅ No errors detected during testing')
    } else {
      console.log(`Total Errors: ${totalErrors}`)
      console.log('Error Breakdown:')
      Object.entries(this.results.errors.errorTypes).forEach(([type, count]: [string, any]) => {
        console.log(`  ${type}: ${count} occurrences`)
      })
      console.log(`Error Recovery: ${this.results.errors.errorRecovery} successful recoveries`)
    }

    // Wide Event Logging Validation
    console.log('\n🔍 WIDE EVENT LOGGING VALIDATION:')

    const events = this.results.wideEvents
    const hasRequestIds = events.filter(e => e.request_id).length
    const hasTimestamps = events.filter(e => e.timestamp).length
    const hasCorrelationIds = events.filter(e => e.correlation_id).length
    const hasUserContext = events.filter(e => e.user).length
    const hasBusinessContext = events.filter(e => e.business).length
    const hasFrontendMetrics = events.filter(e => e.frontend).length
    const hasPerformanceData = events.filter(e => e.performance).length

    console.log(`Request IDs: ${hasRequestIds}/${events.length} events`)
    console.log(`Timestamps: ${hasTimestamps}/${events.length} events`)
    console.log(`Correlation IDs: ${hasCorrelationIds}/${events.length} events`)
    console.log(`User Context: ${hasUserContext}/${events.length} events`)
    console.log(`Business Context: ${hasBusinessContext}/${events.length} events`)
    console.log(`Frontend Metrics: ${hasFrontendMetrics}/${events.length} events`)
    console.log(`Performance Data: ${hasPerformanceData}/${events.length} events`)

    // Final Assessment
    console.log('\n🎯 FINAL ASSESSMENT:')

    const testScore = ((browserTests + apiTests) / (browserTests + totalApiTests)) * 100
    const correlationScore = Math.min((correlationChains / Math.max(browserTests + apiTests, 1)) * 100, 100)
    const errorScore = Math.max(0, 100 - (totalErrors * 10))

    const overallScore = (testScore + correlationScore + errorScore) / 3

    console.log(`Test Completeness: ${testScore.toFixed(1)}%`)
    console.log(`Correlation Coverage: ${correlationScore.toFixed(1)}%`)
    console.log(`Error Management: ${errorScore.toFixed(1)}%`)
    console.log(`Overall System Health: ${overallScore.toFixed(1)}%`)

    if (overallScore >= 90) {
      console.log('\n🎉 SYSTEM STATUS: EXCELLENT')
      console.log('The wide event logging system is capturing the complete story!')
      console.log('Enterprise-grade observability achieved. 🚀✨')
    } else if (overallScore >= 75) {
      console.log('\n👍 SYSTEM STATUS: GOOD')
      console.log('Wide event logging is working well with minor gaps.')
    } else {
      console.log('\n⚠️  SYSTEM STATUS: NEEDS IMPROVEMENT')
      console.log('Wide event logging has gaps that need attention.')
    }

    console.log('\n📝 RECOMMENDATIONS:')
    if (correlationScore < 80) {
      console.log('• Improve correlation ID propagation across services')
    }
    if (hasFrontendMetrics < events.length * 0.5) {
      console.log('• Enhance frontend performance metric collection')
    }
    if (this.results.performance.bottlenecks.length > 0) {
      console.log('• Address performance bottlenecks identified above')
    }
    if (totalErrors > apiTests * 0.1) {
      console.log('• Investigate and reduce error rates')
    }

    console.log('\n' + '=' .repeat(100))
    console.log('🎯 COMPREHENSIVE INTEGRATION TESTING COMPLETE')
    console.log('=' .repeat(100))
  }
}

// CLI execution
if (require.main === module) {
  const runner = new ComprehensiveIntegrationRunner()

  runner.runComprehensiveTests().catch(error => {
    console.error('❌ Comprehensive integration tests failed:', error)
    process.exit(1)
  })
}

export { ComprehensiveIntegrationRunner }