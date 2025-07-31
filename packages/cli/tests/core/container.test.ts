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
    it('should register and resolve a service', () => {
      const mockService = { name: 'test-service' }
      
      container.register('testService', mockService)
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
      let counter = 0
      const factory = () => ({ id: ++counter })
      
      container.registerSingleton('singletonService', factory)
      
      const first = container.resolve('singletonService')
      const second = container.resolve('singletonService')
      
      expect(first).toBe(second)
      expect(first.id).toBe(1)
    })

    it('should throw error for unregistered service', () => {
      expect(() => {
        container.resolve('nonExistentService')
      }).toThrow('Service nonExistentService not found')
    })
  })

  describe('dependency injection', () => {
    it('should inject dependencies automatically', () => {
      const dependency = { value: 42 }
      const serviceFactory = (dep: any) => ({ dependency: dep })
      
      container.register('dependency', dependency)
      container.register('service', serviceFactory, ['dependency'])
      
      const resolved = container.resolve('service')
      expect(resolved.dependency).toBe(dependency)
    })

    it('should handle complex dependency chains', () => {
      container.register('config', { apiUrl: 'test-url' })
      container.register('httpClient', (config: any) => ({ config }), ['config'])
      container.register('apiService', (client: any) => ({ client }), ['httpClient'])
      
      const apiService = container.resolve('apiService')
      expect(apiService.client.config.apiUrl).toBe('test-url')
    })
  })

  describe('lifecycle management', () => {
    it('should support cleanup functions', () => {
      let cleaned = false
      const service = {
        cleanup: () => { cleaned = true }
      }
      
      container.register('cleanupService', service)
      container.cleanup()
      
      expect(cleaned).toBe(true)
    })

    it('should handle services without cleanup', () => {
      const service = { name: 'no-cleanup' }
      
      container.register('service', service)
      
      expect(() => container.cleanup()).not.toThrow()
    })
  })
})