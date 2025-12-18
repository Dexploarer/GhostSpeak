/**
 * FacilitatorRegistry Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  FacilitatorRegistry,
  createFacilitatorRegistry,
  Network,
  FacilitatorStatus,
  KNOWN_FACILITATORS,
  USDC_TOKENS,
  getUsdcToken,
  isNetworkSupported,
  parseNetwork
} from '../../../src/x402/FacilitatorRegistry.js'
import type { FacilitatorConfig } from '../../../src/x402/FacilitatorRegistry.js'

describe('FacilitatorRegistry', () => {
  let registry: FacilitatorRegistry

  beforeEach(() => {
    registry = createFacilitatorRegistry()
  })

  describe('initialization', () => {
    it('should initialize with known facilitators', () => {
      const all = registry.getAll()
      expect(all.length).toBeGreaterThan(0)
      expect(all.length).toBe(KNOWN_FACILITATORS.length)
    })

    it('should have GhostSpeak as a known facilitator', () => {
      const ghostspeak = registry.get('ghostspeak')
      expect(ghostspeak).toBeDefined()
      expect(ghostspeak?.name).toBe('GhostSpeak')
      expect(ghostspeak?.networks).toContain(Network.SOLANA)
    })
  })

  describe('getters', () => {
    it('should get facilitator by ID', () => {
      const coinbase = registry.get('coinbase')
      expect(coinbase).toBeDefined()
      expect(coinbase?.id).toBe('coinbase')
    })

    it('should return undefined for non-existent facilitator', () => {
      const nonExistent = registry.get('non-existent')
      expect(nonExistent).toBeUndefined()
    })

    it('should get enabled facilitators only', () => {
      const enabled = registry.getEnabled()
      expect(enabled.every(f => f.enabled)).toBe(true)
    })

    it('should get facilitators by network', () => {
      const solanaFacilitators = registry.getByNetwork(Network.SOLANA)
      expect(solanaFacilitators.length).toBeGreaterThan(0)
      expect(solanaFacilitators.every(f => f.networks.includes(Network.SOLANA))).toBe(true)
    })

    it('should get facilitators with discovery support', () => {
      const withDiscovery = registry.getWithDiscovery()
      expect(withDiscovery.every(f => f.discoveryUrl != null)).toBe(true)
    })
  })

  describe('registration', () => {
    it('should register a new facilitator', () => {
      const newFacilitator: FacilitatorConfig = {
        id: 'test-facilitator',
        name: 'Test Facilitator',
        networks: [Network.SOLANA],
        addresses: {},
        settleUrl: 'https://test.com/settle',
        verifyUrl: 'https://test.com/verify',
        enabled: true
      }

      registry.register(newFacilitator)
      
      const retrieved = registry.get('test-facilitator')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Facilitator')
    })

    it('should update an existing facilitator', () => {
      const updated = registry.update('ghostspeak', { description: 'Updated description' })
      expect(updated).toBe(true)

      const ghostspeak = registry.get('ghostspeak')
      expect(ghostspeak?.description).toBe('Updated description')
    })

    it('should return false when updating non-existent facilitator', () => {
      const updated = registry.update('non-existent', { description: 'Test' })
      expect(updated).toBe(false)
    })

    it('should remove a facilitator', () => {
      registry.register({
        id: 'to-remove',
        name: 'To Remove',
        networks: [Network.BASE],
        addresses: {},
        settleUrl: 'https://test.com/settle',
        verifyUrl: 'https://test.com/verify',
        enabled: true
      })

      expect(registry.get('to-remove')).toBeDefined()
      
      const removed = registry.remove('to-remove')
      expect(removed).toBe(true)
      expect(registry.get('to-remove')).toBeUndefined()
    })

    it('should enable/disable a facilitator', () => {
      registry.setEnabled('ghostspeak', false)
      expect(registry.get('ghostspeak')?.enabled).toBe(false)

      registry.setEnabled('ghostspeak', true)
      expect(registry.get('ghostspeak')?.enabled).toBe(true)
    })
  })

  describe('token lookups', () => {
    it('should get token config for a facilitator', () => {
      const token = registry.getTokenConfig('ghostspeak', Network.SOLANA, 'USDC')
      expect(token).toBeDefined()
      expect(token?.symbol).toBe('USDC')
    })

    it('should return null for non-existent token', () => {
      const token = registry.getTokenConfig('ghostspeak', Network.SOLANA, 'NONEXISTENT')
      expect(token).toBeNull()
    })
  })

  describe('network support', () => {
    it('should check if facilitator supports a network', () => {
      expect(registry.supportsNetwork('ghostspeak', Network.SOLANA)).toBe(true)
      expect(registry.supportsNetwork('ghostspeak', Network.ETHEREUM)).toBe(false)
    })

    it('should return false for non-existent facilitator', () => {
      expect(registry.supportsNetwork('non-existent', Network.SOLANA)).toBe(false)
    })
  })

  describe('export/import', () => {
    it('should export all facilitators', () => {
      const exported = registry.export()
      expect(exported.length).toBe(KNOWN_FACILITATORS.length)
    })

    it('should import facilitators', () => {
      const newRegistry = createFacilitatorRegistry()
      newRegistry.import([
        {
          id: 'imported',
          name: 'Imported Facilitator',
          networks: [Network.BASE],
          addresses: {},
          settleUrl: 'https://test.com/settle',
          verifyUrl: 'https://test.com/verify',
          enabled: true
        }
      ])

      expect(newRegistry.get('imported')).toBeDefined()
    })
  })

  describe('reset', () => {
    it('should reset to default facilitators', () => {
      registry.register({
        id: 'custom',
        name: 'Custom',
        networks: [Network.SOLANA],
        addresses: {},
        settleUrl: 'https://test.com/settle',
        verifyUrl: 'https://test.com/verify',
        enabled: true
      })

      expect(registry.get('custom')).toBeDefined()

      registry.reset()

      expect(registry.get('custom')).toBeUndefined()
      expect(registry.getAll().length).toBe(KNOWN_FACILITATORS.length)
    })
  })
})

describe('Token utilities', () => {
  it('should get USDC token for each network', () => {
    expect(getUsdcToken(Network.SOLANA).symbol).toBe('USDC')
    expect(getUsdcToken(Network.BASE).symbol).toBe('USDC')
    expect(getUsdcToken(Network.POLYGON).symbol).toBe('USDC')
  })

  it('should have correct decimals for USDC', () => {
    expect(USDC_TOKENS[Network.SOLANA].decimals).toBe(6)
    expect(USDC_TOKENS[Network.BASE].decimals).toBe(6)
  })
})

describe('Network utilities', () => {
  it('should validate supported networks', () => {
    expect(isNetworkSupported('solana')).toBe(true)
    expect(isNetworkSupported('base')).toBe(true)
    expect(isNetworkSupported('polygon')).toBe(true)
    expect(isNetworkSupported('invalid')).toBe(false)
  })

  it('should parse network from string', () => {
    expect(parseNetwork('solana')).toBe(Network.SOLANA)
    expect(parseNetwork('SOLANA')).toBe(Network.SOLANA)
    expect(parseNetwork('invalid')).toBeNull()
  })
})
