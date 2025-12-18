/**
 * ResourceRegistry Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ResourceRegistry,
  createResourceRegistry
} from '../../../src/x402/ResourceRegistry.js'

describe('ResourceRegistry', () => {
  let registry: ResourceRegistry

  beforeEach(() => {
    registry = createResourceRegistry()
  })

  describe('initialization', () => {
    it('should initialize with empty registry', () => {
      const all = registry.getAll()
      expect(all.length).toBe(0)
    })

    it('should return correct stats for empty registry', () => {
      const stats = registry.getStats()
      expect(stats.totalResources).toBe(0)
      expect(stats.activeResources).toBe(0)
    })
  })

  describe('parseX402Response', () => {
    it('should parse valid x402 response', () => {
      const validResponse = JSON.stringify({
        x402Version: '1.0',
        accepts: [
          {
            scheme: 'exact',
            network: 'solana',
            maxAmountRequired: '1000000',
            payTo: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          }
        ]
      })

      const result = registry.parseX402Response(validResponse)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.response.x402Version).toBe('1.0')
        expect(result.response.accepts.length).toBe(1)
      }
    })

    it('should parse response with snake_case fields', () => {
      const snakeCaseResponse = JSON.stringify({
        x402_version: '1.0',
        payment_requirements: [
          {
            scheme: 'exact',
            network: 'solana',
            max_amount_required: '1000000',
            pay_to: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          }
        ]
      })

      const result = registry.parseX402Response(snakeCaseResponse)
      expect(result.success).toBe(true)
    })

    it('should fail for missing x402Version', () => {
      const invalidResponse = JSON.stringify({
        accepts: [{ network: 'solana', maxAmountRequired: '1000', payTo: 'addr', asset: 'token' }]
      })

      const result = registry.parseX402Response(invalidResponse)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('x402Version')
      }
    })

    it('should fail for missing accepts', () => {
      const invalidResponse = JSON.stringify({
        x402Version: '1.0'
      })

      const result = registry.parseX402Response(invalidResponse)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('accepts')
      }
    })

    it('should fail for empty accepts array', () => {
      const invalidResponse = JSON.stringify({
        x402Version: '1.0',
        accepts: []
      })

      const result = registry.parseX402Response(invalidResponse)
      expect(result.success).toBe(false)
    })

    it('should fail for invalid payment requirement', () => {
      const invalidResponse = JSON.stringify({
        x402Version: '1.0',
        accepts: [{ network: 'solana' }] // Missing required fields
      })

      const result = registry.parseX402Response(invalidResponse)
      expect(result.success).toBe(false)
    })

    it('should fail for invalid JSON', () => {
      const result = registry.parseX402Response('not valid json')
      expect(result.success).toBe(false)
    })

    it('should parse enhanced fields', () => {
      const enhancedResponse = JSON.stringify({
        x402Version: '1.0',
        accepts: [
          {
            network: 'solana',
            maxAmountRequired: '1000000',
            payTo: 'addr',
            asset: 'token'
          }
        ],
        inputSchema: { type: 'object', properties: { prompt: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { text: { type: 'string' } } },
        description: 'Test API',
        tags: ['ai', 'text'],
        name: 'Test Tool'
      })

      const result = registry.parseX402Response(enhancedResponse)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.response.inputSchema).toBeDefined()
        expect(result.response.outputSchema).toBeDefined()
        expect(result.response.description).toBe('Test API')
        expect(result.response.tags).toEqual(['ai', 'text'])
        expect(result.response.name).toBe('Test Tool')
      }
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      // Add some test resources directly to registry
      // Note: In real tests, we'd mock the ping functionality
    })

    it('should search with empty criteria', () => {
      const results = registry.search({})
      expect(results.resources).toBeDefined()
      expect(results.total).toBe(0)
      expect(results.page).toBe(1)
    })

    it('should handle pagination', () => {
      const results = registry.search({ page: 2, pageSize: 10 })
      expect(results.page).toBe(2)
      expect(results.pageSize).toBe(10)
    })
  })

  describe('clear', () => {
    it('should clear all resources', () => {
      registry.clear()
      expect(registry.getAll().length).toBe(0)
    })
  })
})

describe('ResourceRegistry options', () => {
  it('should accept custom ping timeout', () => {
    const registry = createResourceRegistry({ pingTimeout: 5000 })
    expect(registry).toBeDefined()
  })

  it('should accept custom user agent', () => {
    const registry = createResourceRegistry({ userAgent: 'CustomAgent/1.0' })
    expect(registry).toBeDefined()
  })

  it('should accept AI labeling options', () => {
    const registry = createResourceRegistry({
      enableAILabeling: true,
      aiLabelingApiKey: 'test-key',
      aiLabelingModel: 'gpt-4o-mini'
    })
    expect(registry).toBeDefined()
  })
})
