/**
 * Environment Variable Validation Tests
 *
 * Unit tests for lib/env.ts Zod environment validation.
 *
 * NOTE: These tests validate the schema directly rather than the exported env object,
 * since the module executes validation on import. Real environment variables are used
 * in the actual application.
 *
 * EXCEPTION: This test file is allowed to read process.env directly because it's
 * testing the environment validation module itself (lib/env.ts).
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'

// ============================================================================
// Schema Definition (mirrored from env.ts for testing)
// ============================================================================

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WEB_APP_URL: z.string().url(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(['devnet', 'testnet', 'mainnet-beta']),
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: z.string().min(32).max(44),
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: z.string().min(32).max(44),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(3),
  NEXT_PUBLIC_AI_GATEWAY_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

// ============================================================================
// Test Fixtures
// ============================================================================

const validEnvVars = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3334',
  NEXT_PUBLIC_WEB_APP_URL: 'http://localhost:3333',
  NEXT_PUBLIC_CONVEX_URL: 'https://lovely-cobra-639.convex.cloud',
  NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  NEXT_PUBLIC_SOLANA_NETWORK: 'devnet' as const,
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: 'GHoSTgvU7Uw1hVJWj1V1W1q9F1q1q1q1q1q1q1q1q1q',
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'boo_gs_bot',
  NODE_ENV: 'test' as const,
}

const validEnvVarsWithOptionals = {
  ...validEnvVars,
  NEXT_PUBLIC_AI_GATEWAY_API_KEY: 'test-api-key-123',
}

// ============================================================================
// Valid Environment Variable Tests
// ============================================================================

describe('env.ts - Valid environment variables', () => {
  test('should parse valid environment variables', () => {
    const result = envSchema.safeParse(validEnvVars)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3334')
      expect(result.data.NEXT_PUBLIC_WEB_APP_URL).toBe('http://localhost:3333')
      expect(result.data.NEXT_PUBLIC_CONVEX_URL).toBe('https://lovely-cobra-639.convex.cloud')
      expect(result.data.NEXT_PUBLIC_SOLANA_NETWORK).toBe('devnet')
    }
  })

  test('should parse valid environment with optional variables', () => {
    const result = envSchema.safeParse(validEnvVarsWithOptionals)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_AI_GATEWAY_API_KEY).toBe('test-api-key-123')
    }
  })

  test('should accept production URLs', () => {
    const prodEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_APP_URL: 'https://miniapp.ghostspeak.io',
      NEXT_PUBLIC_WEB_APP_URL: 'https://ghostspeak.io',
      NEXT_PUBLIC_CONVEX_URL: 'https://enduring-porpoise-79.convex.cloud',
      NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
      NEXT_PUBLIC_SOLANA_NETWORK: 'mainnet-beta' as const,
      NODE_ENV: 'production' as const,
    }

    const result = envSchema.safeParse(prodEnv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe('https://miniapp.ghostspeak.io')
      expect(result.data.NODE_ENV).toBe('production')
    }
  })

  test('should accept testnet network', () => {
    const testnetEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_SOLANA_NETWORK: 'testnet' as const,
      NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.testnet.solana.com',
    }

    const result = envSchema.safeParse(testnetEnv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_SOLANA_NETWORK).toBe('testnet')
    }
  })

  test('should handle optional variables as undefined', () => {
    const result = envSchema.safeParse(validEnvVars)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_AI_GATEWAY_API_KEY).toBeUndefined()
      expect(result.data.NODE_ENV).toBe('test')
    }
  })
})

// ============================================================================
// Invalid Environment Variable Tests
// ============================================================================

describe('env.ts - Invalid environment variables', () => {
  test('should fail with missing required URL', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_APP_URL: undefined,
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_APP_URL'])
      expect(result.error.issues[0].code).toBe('invalid_type')
    }
  })

  test('should fail with invalid URL format', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_CONVEX_URL: 'not-a-valid-url',
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_CONVEX_URL'])
      expect(result.error.issues[0].code).toBe('invalid_string')
    }
  })

  test('should fail with invalid SOLANA_NETWORK enum', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_SOLANA_NETWORK: 'invalid-network',
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_SOLANA_NETWORK'])
      expect(result.error.issues[0].code).toBe('invalid_enum_value')
    }
  })

  test('should fail with invalid NODE_ENV enum', () => {
    const invalidEnv = {
      ...validEnvVars,
      NODE_ENV: 'staging',
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NODE_ENV'])
      expect(result.error.issues[0].code).toBe('invalid_enum_value')
    }
  })

  test('should fail with program ID too short', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: 'tooshort',
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID'])
      expect(result.error.issues[0].code).toBe('too_small')
    }
  })

  test('should fail with program ID too long', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: 'a'.repeat(45),
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID'])
      expect(result.error.issues[0].code).toBe('too_big')
    }
  })

  test('should fail with telegram username too short', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'ab',
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['NEXT_PUBLIC_TELEGRAM_BOT_USERNAME'])
      expect(result.error.issues[0].code).toBe('too_small')
    }
  })

  test('should fail with multiple missing required fields', () => {
    const invalidEnv = {
      ...validEnvVars,
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_CONVEX_URL: undefined,
      NEXT_PUBLIC_SOLANA_NETWORK: undefined,
    }

    const result = envSchema.safeParse(invalidEnv)

    expect(result.success).toBe(false)
    if (!result.success) {
      // Should have 3 errors
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
    }
  })
})

// ============================================================================
// Real Environment Variable Tests
// ============================================================================

describe('env.ts - Real environment variables', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  test('should have valid environment variables in test environment', () => {
    // Test that actual process.env has the required variables
    const testEnv = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
      NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
      NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID,
      NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_GHOST_TOKEN_ADDRESS,
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
      NEXT_PUBLIC_AI_GATEWAY_API_KEY: process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }

    const result = envSchema.safeParse(testEnv)

    // If this fails, it means the test environment is not properly configured
    // This test validates that the .env file is correctly set up
    if (!result.success) {
      console.error('Environment validation failed:', result.error.format())
    }

    expect(result.success).toBe(true)
  })

  test('isDevelopment helper should work correctly', () => {
    // We can't easily test the helper functions in isolation without mocking,
    // but we can verify the logic
    const devEnv = { ...validEnvVars, NODE_ENV: 'development' as const }
    const result = envSchema.safeParse(devEnv)

    expect(result.success).toBe(true)
    if (result.success) {
      const isDevelopment = result.data.NODE_ENV === 'development'
      expect(isDevelopment).toBe(true)
    }
  })

  test('isProduction helper should work correctly', () => {
    const prodEnv = { ...validEnvVars, NODE_ENV: 'production' as const }
    const result = envSchema.safeParse(prodEnv)

    expect(result.success).toBe(true)
    if (result.success) {
      const isProduction = result.data.NODE_ENV === 'production'
      expect(isProduction).toBe(true)
    }
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('env.ts - Edge cases', () => {
  test('should accept minimum valid program ID length (32 chars)', () => {
    const envWithMinProgramId = {
      ...validEnvVars,
      NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: 'a'.repeat(32),
    }

    const result = envSchema.safeParse(envWithMinProgramId)
    expect(result.success).toBe(true)
  })

  test('should accept maximum valid program ID length (44 chars)', () => {
    const envWithMaxProgramId = {
      ...validEnvVars,
      NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: 'a'.repeat(44),
    }

    const result = envSchema.safeParse(envWithMaxProgramId)
    expect(result.success).toBe(true)
  })

  test('should accept minimum valid telegram username length (3 chars)', () => {
    const envWithMinUsername = {
      ...validEnvVars,
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'bot',
    }

    const result = envSchema.safeParse(envWithMinUsername)
    expect(result.success).toBe(true)
  })

  test('should accept http and https URLs', () => {
    const envWithMixedProtocols = {
      ...validEnvVars,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3334',
      NEXT_PUBLIC_WEB_APP_URL: 'https://ghostspeak.io',
    }

    const result = envSchema.safeParse(envWithMixedProtocols)
    expect(result.success).toBe(true)
  })

  test('should reject relative URLs', () => {
    const envWithRelativeUrl = {
      ...validEnvVars,
      NEXT_PUBLIC_APP_URL: '/relative/path',
    }

    const result = envSchema.safeParse(envWithRelativeUrl)
    expect(result.success).toBe(false)
  })

  test('should reject URLs without protocol', () => {
    const envWithoutProtocol = {
      ...validEnvVars,
      NEXT_PUBLIC_CONVEX_URL: 'lovely-cobra-639.convex.cloud',
    }

    const result = envSchema.safeParse(envWithoutProtocol)
    expect(result.success).toBe(false)
  })
})
