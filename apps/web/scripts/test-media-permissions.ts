#!/usr/bin/env bun
/**
 * Test Media Permission System
 * Tests allowlist, blocklist, and rate limiting for /media command
 */

import { checkMediaPermission, incrementMediaCount } from '../lib/telegram/mediaPermissions'

console.log('🧪 Testing Media Permission System\n')
console.log('━'.repeat(80))

// Mock wallet address for testing
const mockWalletAllowlist = 'telegram_allowlist_user_12345'
const mockWalletNonAllowlist = 'telegram_normal_user_67890'

// Test 1: Allowlist user (should have unlimited access)
console.log('\n📋 Test 1: Allowlist User (@the_dexploarer)')
console.log('━'.repeat(80))

const allowlistResult = await checkMediaPermission({
  username: 'the_dexploarer',
  userId: 12345,
  walletAddress: mockWalletAllowlist,
  isGroupAdmin: false,
  isGroup: false,
})

console.log('Result:', JSON.stringify(allowlistResult, null, 2))
console.log(allowlistResult.allowed ? '✅ PASS - Allowed' : '❌ FAIL - Denied')

// Test 2: Non-allowlist user (should be denied in allowlist mode)
console.log('\n📋 Test 2: Non-Allowlist User (@alice)')
console.log('━'.repeat(80))

const nonAllowlistResult = await checkMediaPermission({
  username: 'alice',
  userId: 67890,
  walletAddress: mockWalletNonAllowlist,
  isGroupAdmin: false,
  isGroup: false,
})

console.log('Result:', JSON.stringify(nonAllowlistResult, null, 2))
console.log(!nonAllowlistResult.allowed ? '✅ PASS - Denied (allowlist mode)' : '❌ FAIL - Should be denied')

// Test 3: Rate limit tracking for allowlist user
console.log('\n📋 Test 3: Rate Limit Tracking for Allowlist User')
console.log('━'.repeat(80))

// Simulate 5 image generations
for (let i = 1; i <= 5; i++) {
  incrementMediaCount(mockWalletAllowlist)
  const result = await checkMediaPermission({
    username: 'the_dexploarer',
    userId: 12345,
    walletAddress: mockWalletAllowlist,
    isGroupAdmin: false,
    isGroup: false,
  })

  console.log(`Generation ${i}: ${result.allowed ? '✅ Allowed' : '❌ Denied'}`)

  if (result.rateLimitInfo) {
    console.log(`  Rate limit: ${result.rateLimitInfo.used}/${result.rateLimitInfo.limit === Infinity ? '∞' : result.rateLimitInfo.limit}`)
  }
}

// Test 4: Group admin mode (if configured)
console.log('\n📋 Test 4: Group Admin Check')
console.log('━'.repeat(80))

const groupAdminResult = await checkMediaPermission({
  username: 'alice',
  userId: 67890,
  walletAddress: mockWalletNonAllowlist,
  isGroupAdmin: true,
  isGroup: true,
})

console.log('Result:', JSON.stringify(groupAdminResult, null, 2))

// Test 5: Non-admin in group (should depend on mode)
const groupNonAdminResult = await checkMediaPermission({
  username: 'bob',
  userId: 99999,
  walletAddress: 'telegram_bob_99999',
  isGroupAdmin: false,
  isGroup: true,
})

console.log('\nNon-admin in group:', JSON.stringify(groupNonAdminResult, null, 2))

// Summary
console.log('\n📊 Test Summary')
console.log('━'.repeat(80))
console.log('Environment Configuration:')
console.log(`  Mode: ${process.env.TELEGRAM_MEDIA_MODE || 'open (default)'}`)
console.log(`  Allowlist: ${process.env.TELEGRAM_MEDIA_ALLOWLIST || 'none'}`)
console.log(`  Blocklist: ${process.env.TELEGRAM_MEDIA_BLOCKLIST || 'none'}`)
console.log(`  Default Rate Limit: ${process.env.TELEGRAM_MEDIA_RATE_LIMIT || '10 (default)'}`)
console.log('━'.repeat(80))
console.log('\n✅ Tests complete!')
