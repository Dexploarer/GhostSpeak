/**
 * K6 Load Test for GhostSpeak B2B API
 *
 * This test simulates production load on the B2B API endpoints.
 *
 * Installation:
 *   macOS: brew install k6
 *   Linux: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   k6 run tests/load/b2b-api.js
 *
 * Environment Variables:
 *   API_BASE_URL - Base URL for the API (default: http://localhost:3000)
 *   API_KEY - Your API key for authentication
 *   TEST_AGENT_ADDRESS - A valid agent address for testing
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const verifyLatency = new Trend('verify_latency')
const scoreLatency = new Trend('score_latency')

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp up to 20 users
    { duration: '3m', target: 100 }, // Stay at 100 users for 3 minutes
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'], // Error rate should be below 5%
    errors: ['rate<0.05'],
    verify_latency: ['p(95)<500'],
    score_latency: ['p(95)<500'],
  },
}

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000'
const API_KEY = __ENV.API_KEY || 'test_key_123'
const TEST_AGENT_ADDRESS =
  __ENV.TEST_AGENT_ADDRESS || '11111111111111111111111111111111'

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
}

/**
 * Main test function - runs for each virtual user
 */
export default function () {
  // Test 1: Verify agent endpoint
  testVerifyAgent()

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1)

  // Test 2: Get agent score
  testGetAgentScore()

  // Random sleep
  sleep(Math.random() * 2 + 1)

  // Test 3: List agents (pagination)
  testListAgents()

  // Random sleep
  sleep(Math.random() * 2 + 1)
}

/**
 * Test /api/v1/verify endpoint
 */
function testVerifyAgent() {
  const payload = JSON.stringify({
    agentAddress: TEST_AGENT_ADDRESS,
    verificationLevel: 'basic',
  })

  const startTime = Date.now()
  const response = http.post(`${API_BASE_URL}/api/v1/verify`, payload, {
    headers,
  })
  const duration = Date.now() - startTime

  verifyLatency.add(duration)

  const success = check(response, {
    'verify: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'verify: has transactionHash': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.transactionHash !== undefined
      } catch {
        return false
      }
    },
  })

  if (!success) {
    errorRate.add(1)
    console.error(`Verify failed: ${response.status} - ${response.body}`)
  } else {
    errorRate.add(0)
  }
}

/**
 * Test /api/v1/agents/:address/score endpoint
 */
function testGetAgentScore() {
  const startTime = Date.now()
  const response = http.get(
    `${API_BASE_URL}/api/v1/agents/${TEST_AGENT_ADDRESS}/score`,
    { headers }
  )
  const duration = Date.now() - startTime

  scoreLatency.add(duration)

  const success = check(response, {
    'score: status is 200': (r) => r.status === 200,
    'score: has ghostScore': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.ghostScore !== undefined
      } catch {
        return false
      }
    },
    'score: has components': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.components !== undefined
      } catch {
        return false
      }
    },
  })

  if (!success) {
    errorRate.add(1)
    console.error(`Get score failed: ${response.status} - ${response.body}`)
  } else {
    errorRate.add(0)
  }
}

/**
 * Test /api/v1/agents endpoint (pagination)
 */
function testListAgents() {
  const page = Math.floor(Math.random() * 5) + 1 // Random page 1-5

  const response = http.get(`${API_BASE_URL}/api/v1/agents?page=${page}&limit=10`, {
    headers,
  })

  const success = check(response, {
    'list: status is 200': (r) => r.status === 200,
    'list: has agents array': (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body.agents)
      } catch {
        return false
      }
    },
    'list: has pagination': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.pagination !== undefined
      } catch {
        return false
      }
    },
  })

  if (!success) {
    errorRate.add(1)
    console.error(`List agents failed: ${response.status} - ${response.body}`)
  } else {
    errorRate.add(0)
  }
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log('Starting B2B API load test...')
  console.log(`Target: ${API_BASE_URL}`)
  console.log(`Test agent: ${TEST_AGENT_ADDRESS}`)

  // Warmup request
  const response = http.get(`${API_BASE_URL}/api/health`)
  if (response.status !== 200) {
    console.warn('Warning: Health check failed - service may be down')
  }
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log('Load test completed!')
}
