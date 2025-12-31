/**
 * Lazy loading utilities for command modules and services
 */

/**
 * Cache for lazy-loaded modules
 */
const moduleCache = new Map<string, Promise<unknown>>()

/**
 * Lazy load a module with caching
 */
export function lazyLoad<T>(
  importFn: () => Promise<T>,
  cacheKey: string
): Promise<T> {
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey) as Promise<T>
  }
  
  const promise = importFn()
  moduleCache.set(cacheKey, promise)
  return promise
}

/**
 * Pre-load critical modules for better perceived performance
 */
export async function preloadCriticalModules(): Promise<void> {
  const criticalModules: Array<() => Promise<unknown>> = [
    () => import('../services/wallet-service.js'),
    () => import('../services/AgentService.js'),
    () => import('../utils/client.js')
  ]
  
  // Load critical modules in parallel
  await Promise.allSettled(
    criticalModules.map((loadFn, index) => 
      lazyLoad(loadFn, `critical-${index}`)
    )
  )
}

/**
 * Memory-efficient command loader that only loads when needed
 */
export class CommandLoader {
  private static loadedCommands = new Set<string>()
  
  static async loadCommand(commandName: string): Promise<void> {
    if (this.loadedCommands.has(commandName)) {
      return // Already loaded
    }
    
    try {
      switch (commandName) {
        case 'agent':
          await lazyLoad(
            () => import('../commands/agent/index.js'),
            'agent-commands'
          )
          break
        // Add more command modules as needed
      }
      
      this.loadedCommands.add(commandName)
    } catch (error) {
      console.warn(`Failed to load ${commandName} command:`, error)
    }
  }
  
  static getLoadedCommands(): string[] {
    return Array.from(this.loadedCommands)
  }
  
  static clearCache(): void {
    this.loadedCommands.clear()
    moduleCache.clear()
  }
}