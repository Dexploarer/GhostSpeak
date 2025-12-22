/**
 * Tests for the Dependency Injection Container
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from '../../src/core/Container'

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  describe('service registration and resolution', () => {
    it('should register and resolve a service via factory', () => {
      const mockService = { name: 'test-service' }
      
      container.register('testService', () => mockService)
      const resolved = container.resolve('testService')
      
      expect(resolved).toBe(mockService)
    })

    it('should register a factory function', () => {
      const factory = () => ({ created: true })
      
      container.register('factoryService', factory)
      const resolved = container.resolve('factoryService')
      
      expect(resolved).toEqual({ created: true })
    })

    it('should handle singleton services', () => {
      const singletonInstance = { id: 1 }
      
      container.registerSingleton('singletonService', singletonInstance)
      
      const first = container.resolve('singletonService')
      const second = container.resolve('singletonService')
      
      expect(first).toBe(second)
      expect(first.id).toBe(1)
    })

    it('should cache factory results as singletons', () => {
      let counter = 0
      const factory = () => ({ id: ++counter })
      
      container.register('cachedService', factory)
      
      const first = container.resolve('cachedService')
      const second = container.resolve('cachedService')
      
      // Factory should only be called once
      expect(first).toBe(second)
      expect(first.id).toBe(1)
    })

    it('should throw error for unregistered service', () => {
      expect(() => {
        container.resolve('nonExistentService')
      }).toThrow('Service not registered: nonExistentService')
    })
  })

  describe('service checks', () => {
    it('should check if a service is registered', () => {
      container.register('testService', () => ({}))
      
      expect(container.has('testService')).toBe(true)
      expect(container.has('unregisteredService')).toBe(false)
    })

    it('should get service using get alias', () => {
      const mockService = { name: 'test' }
      container.register('testService', () => mockService)
      
      const resolved = container.get('testService')
      expect(resolved).toBe(mockService)
    })
  })

  describe('container management', () => {
    it('should clear all services', () => {
      container.register('service1', () => ({}))
      container.register('service2', () => ({}))
      
      expect(container.has('service1')).toBe(true)
      expect(container.has('service2')).toBe(true)
      
      container.clear()
      
      expect(container.has('service1')).toBe(false)
      expect(container.has('service2')).toBe(false)
    })

    it('should get registered tokens', () => {
      container.register('service1', () => ({}))
      container.registerSingleton('service2', {})
      
      const tokens = container.getRegisteredTokens()
      
      expect(tokens).toContain('service1')
      expect(tokens).toContain('service2')
    })

    it('should warm up services', () => {
      let called = false
      container.register('warmService', () => {
        called = true
        return {}
      })
      
      container.warmUp(['warmService', 'nonExistentService'])
      
      expect(called).toBe(true)
    })
  })

  describe('performance tracking', () => {
    it('should track service creation time', () => {
      container.register('slowService', () => {
        // Simulate some work
        const start = Date.now()
        while (Date.now() - start < 5) {
          // Wait a few ms
        }
        return {}
      })
      
      container.resolve('slowService')
      
      const metrics = container.getPerformanceMetrics()
      expect(metrics).toHaveProperty('slowService')
      expect(metrics.slowService).toBeGreaterThanOrEqual(0)
    })
  })
})
