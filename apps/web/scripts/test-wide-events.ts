/**
 * Wide Event Logging System Test
 *
 * Demonstrates the comprehensive request-level logging system.
 * Run this script to see wide events in action.
 */

import { createRequestEvent, emitWideEvent, getWideEventLogger } from '../lib/logging/wide-event'

async function testWideEventSystem() {
  console.log('🔮 Testing Wide Event Logging System...\n')

  // Test 1: Basic request event creation
  console.log('📝 Test 1: Creating a basic request event')
  const event1 = createRequestEvent({
    method: 'GET',
    path: '/api/ghost-score',
    userId: 'user_123',
    walletAddress: '5DHhYFTCwYcoUK9nh4omrcm6htGPThcnMHWcK4mCTtPz',
  })

  // Enrich with user context
  getWideEventLogger().enrichWithUser(event1, {
    subscription_tier: 'premium',
    account_age_days: 365,
    lifetime_value_cents: 50000,
  })

  // Enrich with business context
  getWideEventLogger().enrichWithBusiness(event1, {
    agent: {
      address: '5DHhYFTCwYcoUK9nh4omrcm6htGPThcnMHWcK4mCTtPz',
      reputation_score: 7850,
      tier: 'Gold',
    },
    feature_flags: {
      new_dashboard: true,
      beta_features: false,
    },
  })

  // Complete and emit
  emitWideEvent({
    ...event1,
    status_code: 200,
    duration_ms: 145,
    outcome: 'success',
  })

  console.log('✅ Basic event emitted\n')

  // Test 2: Error event
  console.log('🚨 Test 2: Creating an error event')
  const event2 = createRequestEvent({
    method: 'POST',
    path: '/api/agent/chat',
    userId: 'user_456',
    walletAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  })

  getWideEventLogger().enrichWithBusiness(event2, {
    metadata: {
      agent_interaction: true,
      message_length: 150,
    },
  })

  emitWideEvent({
    ...event2,
    status_code: 500,
    duration_ms: 2340,
    outcome: 'error',
    error: {
      type: 'LLMGenerationError',
      code: 'OPENAI_API_ERROR',
      message: 'OpenAI API rate limit exceeded',
      retriable: true,
    },
  })

  console.log('✅ Error event emitted\n')

  // Test 3: Agent action event
  console.log('🤖 Test 3: Creating an agent action event')
  const event3 = createRequestEvent({
    method: 'POST',
    path: '/api/agent/chat',
    userId: 'user_789',
    walletAddress: '11111111111111111111111111111112', // System program
  })

  getWideEventLogger().enrichWithBusiness(event3, {
    agent: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    metadata: {
      triggered_action: 'GENERATE_OUIJA_REPORT',
      action_duration_ms: 1250,
      actions_evaluated: 5,
    },
  })

  emitWideEvent({
    ...event3,
    status_code: 200,
    duration_ms: 1450,
    outcome: 'success',
  })

  console.log('✅ Agent action event emitted\n')

  // Test 4: Sampling demonstration
  console.log('🎯 Test 4: Demonstrating sampling (should see fewer events)')
  for (let i = 0; i < 20; i++) {
    const event = createRequestEvent({
      method: 'GET',
      path: '/api/health',
    })

    emitWideEvent({
      ...event,
      status_code: 200,
      duration_ms: 50 + Math.random() * 100,
      outcome: 'success',
    })
  }

  console.log('✅ Sampling test completed\n')

  console.log('🎉 Wide Event System Test Complete!')
  console.log('Check your console output above for JSON-formatted wide events.')
  console.log('In production, these would be sent to your logging service (DataDog, CloudWatch, etc.)')
}

// Run the test
testWideEventSystem().catch(console.error)