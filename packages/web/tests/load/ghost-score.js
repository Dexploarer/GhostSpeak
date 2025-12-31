/**
 * K6 Load Test for GhostSpeak B2C Ghost Score App
 *
 * This test simulates real users browsing the Ghost Score app.
 *
 * Installation:
 *   macOS: brew install k6
 *   Linux: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   k6 run tests/load/ghost-score.js
 *
 * Environment Variables:
 *   APP_BASE_URL - Base URL for the app (default: http://localhost:3000)
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const pageLoadTime = new Trend('page_load_time')
const apiResponseTime = new Trend('api_response_time')

// Test configuration - Simulates 50 concurrent users
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.05'], // Error rate below 5%
    errors: ['rate<0.05'],
    page_load_time: ['p(95)<1000'],
    api_response_time: ['p(95)<500'],
  },
}

// Configuration
const APP_BASE_URL = __ENV.APP_BASE_URL || 'http://localhost:3000'

/**
 * User scenarios - simulate different user behaviors
 */
const scenarios = [
  browseHomePage,
  searchAndViewAgent,
  verifyAgentFreemium,
  viewDashboard,
]

/**
 * Main test function
 */
export default function () {
  // Randomly select a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  scenario()

  // Random think time between actions
  sleep(Math.random() * 3 + 2) // 2-5 seconds
}

/**
 * Scenario 1: Browse home page
 */
function browseHomePage() {
  const startTime = Date.now()
  const response = http.get(`${APP_BASE_URL}/`)
  const duration = Date.now() - startTime

  pageLoadTime.add(duration)

  const success = check(response, {
    'homepage: status is 200': (r) => r.status === 200,
    'homepage: contains title': (r) => r.body.includes('GhostSpeak'),
  })

  if (!success) {
    errorRate.add(1)
  } else {
    errorRate.add(0)
  }
}

/**
 * Scenario 2: Search for agents and view details
 */
function searchAndViewAgent() {
  // 1. Load agents page
  let response = http.get(`${APP_BASE_URL}/dashboard/agents`)

  check(response, {
    'agents page: status is 200': (r) => r.status === 200,
  })

  sleep(1) // User looks at the list

  // 2. Fetch agents via API
  const startTime = Date.now()
  response = http.get(`${APP_BASE_URL}/api/ghost-score/agents?limit=20`)
  const duration = Date.now() - startTime

  apiResponseTime.add(duration)

  const success = check(response, {
    'agents api: status is 200': (r) => r.status === 200,
    'agents api: has data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body.agents) || Array.isArray(body)
      } catch {
        return false
      }
    },
  })

  if (!success) {
    errorRate.add(1)
  } else {
    errorRate.add(0)
  }

  sleep(2) // User reviews results
}

/**
 * Scenario 3: Freemium user verifies an agent
 */
function verifyAgentFreemium() {
  const testAgentAddress = '11111111111111111111111111111111'

  // 1. View agent details
  let response = http.get(`${APP_BASE_URL}/agents/${testAgentAddress}`)

  check(response, {
    'agent details: status is 200 or 404': (r) =>
      r.status === 200 || r.status === 404,
  })

  sleep(2) // User reads details

  // 2. Attempt verification (freemium limit check)
  const startTime = Date.now()
  response = http.post(
    `${APP_BASE_URL}/api/ghost-score/verify`,
    JSON.stringify({
      agentAddress: testAgentAddress,
      verificationLevel: 'basic',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
  const duration = Date.now() - startTime

  apiResponseTime.add(duration)

  const success = check(response, {
    'verify: status is 200, 201, 402, or 429': (r) =>
      r.status === 200 ||
      r.status === 201 ||
      r.status === 402 || // Payment required (freemium limit)
      r.status === 429, // Rate limit
  })

  if (!success) {
    errorRate.add(1)
    console.error(`Verify failed unexpectedly: ${response.status}`)
  } else {
    errorRate.add(0)
  }
}

/**
 * Scenario 4: View dashboard
 */
function viewDashboard() {
  // 1. Load dashboard page
  const startTime = Date.now()
  const response = http.get(`${APP_BASE_URL}/dashboard`)
  const duration = Date.now() - startTime

  pageLoadTime.add(duration)

  const success = check(response, {
    'dashboard: status is 200': (r) => r.status === 200,
  })

  if (!success) {
    errorRate.add(1)
  } else {
    errorRate.add(0)
  }

  sleep(3) // User reviews dashboard
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Ghost Score app load test...')
  console.log(`Target: ${APP_BASE_URL}`)

  // Health check
  const response = http.get(`${APP_BASE_URL}/api/health`)
  if (response.status !== 200) {
    console.warn('Warning: Health check failed')
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Ghost Score load test completed!')
}
