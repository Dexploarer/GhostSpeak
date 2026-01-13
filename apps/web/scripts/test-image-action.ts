#!/usr/bin/env bun
/**
 * Test GENERATE_IMAGE Action Validation
 */

import { generateImageAction } from '../server/elizaos/actions/generateImage'
import type { Memory } from '@elizaos/core'

console.log('🧪 Testing GENERATE_IMAGE Action Validation\n')
console.log('━'.repeat(80))

const testCases = [
  {
    name: 'Direct /media command format',
    text: 'Generate an image: A friendly ghost floating in a digital void',
    shouldMatch: true,
  },
  {
    name: 'Natural language request',
    text: 'Can you create a picture of a ghost?',
    shouldMatch: true,
  },
  {
    name: 'Just description (no keywords)',
    text: 'A friendly ghost floating',
    shouldMatch: false,
  },
  {
    name: 'Generate + media keyword',
    text: 'Generate media about AI agents',
    shouldMatch: true,
  },
]

console.log('Testing validation function...\n')

for (const testCase of testCases) {
  const memory: Memory = {
    userId: 'test-user',
    agentId: 'test-agent',
    roomId: 'test-room',
    content: {
      text: testCase.text,
    },
    createdAt: Date.now(),
  }

  const result = await generateImageAction.validate(null as any, memory, undefined)

  const status = result === testCase.shouldMatch ? '✅ PASS' : '❌ FAIL'
  const expected = testCase.shouldMatch ? 'should match' : 'should NOT match'

  console.log(`${status} ${testCase.name}`)
  console.log(`  Text: "${testCase.text}"`)
  console.log(`  Expected: ${expected}`)
  console.log(`  Result: ${result ? 'MATCHED' : 'NOT MATCHED'}`)
  console.log('')
}

console.log('━'.repeat(80))
console.log('\n✅ Validation test complete!')
