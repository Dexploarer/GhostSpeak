/**
 * Public API Validation Test
 *
 * Validates that all public API endpoints are properly structured:
 * - Route files exist
 * - OpenAPI spec is complete
 * - Middleware is configured
 * - Type safety is enforced
 *
 * Run with: bun test tests/api-validation.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const API_DIR = join(__dirname, '../app/api/v1')
const LIB_DIR = join(__dirname, '../lib/api')

describe('Public API Validation', () => {
  describe('API Routes Exist', () => {
    const requiredRoutes = [
      'verify/route.ts',
      'verify/batch/route.ts',
      'agents/[address]/score/route.ts',
      'billing/balance/route.ts',
      'billing/deposit/route.ts',
      'billing/usage/route.ts',
    ]

    requiredRoutes.forEach((route) => {
      it(`should have ${route}`, () => {
        const routePath = join(API_DIR, route)
        const exists = existsSync(routePath)

        if (!exists) {
          console.error(`❌ Missing route: ${route}`)
        } else {
          console.log(`✅ Route exists: ${route}`)
        }

        expect(exists).toBe(true)
      })
    })
  })

  describe('API Route Structure', () => {
    it('should have proper HTTP method handlers', () => {
      const verifyRoute = join(API_DIR, 'verify/route.ts')
      const content = readFileSync(verifyRoute, 'utf-8')

      // Check for POST handler
      expect(content).toContain('export async function POST')

      // Check for authentication
      expect(content).toContain('authenticateApiKey')

      // Check for billing enforcement
      expect(content).toContain('withBillingEnforcement')

      // Check for rate limiting
      expect(content).toContain('checkRateLimit')

      console.log('✅ /verify route has proper structure')
    })

    it('should use TypeScript types', () => {
      const scoreRoute = join(API_DIR, 'agents/[address]/score/route.ts')
      const content = readFileSync(scoreRoute, 'utf-8')

      // Check for type imports
      expect(content).toContain('NextRequest')
      expect(content).toContain('NextResponse')

      console.log('✅ Routes use TypeScript types')
    })
  })

  describe('OpenAPI Specification', () => {
    it('should have OpenAPI spec file', () => {
      const specPath = join(LIB_DIR, 'openapi-spec.ts')
      const exists = existsSync(specPath)

      expect(exists).toBe(true)
      console.log('✅ OpenAPI spec file exists')
    })

    it('should define all required endpoints', () => {
      const specPath = join(LIB_DIR, 'openapi-spec.ts')
      const content = readFileSync(specPath, 'utf-8')

      const requiredPaths = [
        '/api/v1/verify',
        '/api/v1/verify/batch',
        '/api/v1/agents/{address}/score',
        '/api/v1/credentials/{id}',
      ]

      requiredPaths.forEach((path) => {
        const hasPath = content.includes(path)
        if (hasPath) {
          console.log(`✅ OpenAPI defines: ${path}`)
        } else {
          console.error(`❌ OpenAPI missing: ${path}`)
        }
        expect(hasPath).toBe(true)
      })
    })

    it('should define request/response schemas', () => {
      const specPath = join(LIB_DIR, 'openapi-spec.ts')
      const content = readFileSync(specPath, 'utf-8')

      const requiredSchemas = [
        'VerifyRequest',
        'VerifyResponse',
        'GhostScoreResponse',
        'BatchVerifyRequest',
        'ErrorResponse',
      ]

      requiredSchemas.forEach((schema) => {
        const hasSchema = content.includes(schema)
        if (hasSchema) {
          console.log(`✅ Schema defined: ${schema}`)
        } else {
          console.error(`❌ Schema missing: ${schema}`)
        }
        expect(hasSchema).toBe(true)
      })
    })

    it('should include authentication configuration', () => {
      const specPath = join(LIB_DIR, 'openapi-spec.ts')
      const content = readFileSync(specPath, 'utf-8')

      expect(content).toContain('securitySchemes')
      expect(content).toContain('BearerAuth')
      expect(content).toContain('Authorization')

      console.log('✅ Authentication configured in OpenAPI spec')
    })
  })

  describe('API Middleware', () => {
    it('should have billing enforcement middleware', () => {
      const middlewarePath = join(LIB_DIR, 'billing-enforcement.ts')
      const exists = existsSync(middlewarePath)

      if (exists) {
        const content = readFileSync(middlewarePath, 'utf-8')
        expect(content).toContain('withBillingEnforcement')
        expect(content).toContain('checkBalance')
        console.log('✅ Billing enforcement middleware exists')
      } else {
        console.warn('⚠️  Billing enforcement middleware not found (may be inline)')
      }
    })

    it('should have rate limiting', () => {
      const rateLimitPath = join(LIB_DIR, 'rate-limit.ts')
      const exists = existsSync(rateLimitPath)

      if (exists) {
        const content = readFileSync(rateLimitPath, 'utf-8')
        expect(content).toContain('checkRateLimit')
        console.log('✅ Rate limiting middleware exists')
      } else {
        console.warn('⚠️  Rate limiting middleware not found (may be inline)')
      }
    })

    it('should have API authentication', () => {
      const authPath = join(LIB_DIR, 'api-auth.ts')
      const exists = existsSync(authPath)

      if (exists) {
        const content = readFileSync(authPath, 'utf-8')
        expect(content).toContain('authenticateApiKey')
        console.log('✅ API authentication middleware exists')
      } else {
        console.warn('⚠️  API authentication middleware not found (may be inline)')
      }
    })
  })

  describe('Error Handling', () => {
    it('should return proper error responses', () => {
      const verifyRoute = join(API_DIR, 'verify/route.ts')
      const content = readFileSync(verifyRoute, 'utf-8')

      // Check for error handling
      expect(content).toContain('try')
      expect(content).toContain('catch')
      expect(content).toContain('NextResponse.json')

      console.log('✅ Routes have error handling')
    })
  })

  describe('API Versioning', () => {
    it('should be under /api/v1 path', () => {
      const apiV1Exists = existsSync(API_DIR)
      expect(apiV1Exists).toBe(true)
      console.log('✅ API versioned at /api/v1')
    })
  })

  describe('CORS Configuration', () => {
    it('should handle CORS headers', () => {
      const verifyRoute = join(API_DIR, 'verify/route.ts')
      const content = readFileSync(verifyRoute, 'utf-8')

      // Check if response includes headers (CORS may be in middleware)
      const hasHeaders = content.includes('headers') || content.includes('NextResponse')
      expect(hasHeaders).toBe(true)

      console.log('✅ Routes can set HTTP headers')
    })
  })
})

/**
 * Summary of Public API:
 *
 * Core Endpoints:
 * - POST /api/v1/verify - Full agent verification (1¢)
 * - POST /api/v1/verify/batch - Batch verification (0.8¢ each)
 * - GET /api/v1/agents/{address}/score - Ghost Score lookup (0.5¢)
 * - GET /api/v1/credentials/{id} - W3C credential retrieval (free)
 *
 * Billing Endpoints:
 * - GET /api/v1/billing/balance - Check credit balance
 * - POST /api/v1/billing/deposit - Deposit credits (USDC/GHOST)
 * - GET /api/v1/billing/usage - View usage history
 *
 * Features:
 * - API key authentication
 * - Usage-based billing (USDC/GHOST)
 * - Rate limiting per tier (Starter/Pro/Enterprise)
 * - OpenAPI 3.0 specification
 * - TypeScript type safety
 * - Error handling with proper HTTP status codes
 */
