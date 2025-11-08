/**
 * Plugin System for GhostSpeak CLI
 * 
 * Enables extensibility through plugins that can add new commands,
 * modify behavior, and integrate with external services.
 * 
 * @example
 * ```typescript
 * // Creating a plugin
 * const myPlugin: Plugin = {
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   initialize: async (context) => {
 *     context.addCommand('my-command', myCommandHandler)
 *   }
 * }
 * 
 * // Loading plugins
 * const pluginManager = new PluginManager()
 * await pluginManager.loadPlugin(myPlugin)
 * ```
 */

import { EventEmitter } from 'events'
import { Command } from 'commander'
import type { Container } from './Container'

/**
 * Plugin interface that all plugins must implement
 */
export interface Plugin {
  /** Unique plugin identifier */
  name: string
  /** Semantic version */
  version: string
  /** Plugin description */
  description?: string
  /** Plugin author */
  author?: string
  /** Plugin dependencies */
  dependencies?: string[]
  /** Plugin initialization function */
  initialize: (context: PluginContext) => Promise<void> | void
  /** Plugin cleanup function */
  cleanup?: () => Promise<void> | void
}

/**
 * Plugin context provided during initialization
 */
export interface PluginContext {
  /** Add a new CLI command */
  addCommand: (name: string, handler: CommandHandler) => void
  /** Add middleware to command execution */
  addMiddleware: (middleware: Middleware) => void
  /** Access the dependency injection container */
  container: Container
  /** Emit events */
  emit: (event: string, ...args: unknown[]) => void
  /** Listen to events */
  on: (event: string, listener: (...args: unknown[]) => void) => void
  /** Get configuration values */
  getConfig: (key: string) => unknown
  /** Set configuration values */
  setConfig: (key: string, value: unknown) => void
}

/**
 * Command handler function type
 */
export type CommandHandler = (args: unknown[], options: Record<string, unknown>) => Promise<void> | void

/**
 * Middleware function type
 */
export type Middleware = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void> | void

/**
 * Middleware execution context
 */
export interface MiddlewareContext {
  command: string
  args: unknown[]
  options: Record<string, unknown>
  user?: {
    address: string
    preferences: Record<string, unknown>
  }
}

/**
 * Plugin metadata for discovery and management
 */
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  author?: string
  enabled: boolean
  loadedAt?: Date
  error?: string
}

/**
 * Plugin manager handles plugin lifecycle and execution
 */
export class PluginManager extends EventEmitter {
  private plugins = new Map<string, Plugin>()
  private pluginMetadata = new Map<string, PluginMetadata>()
  private commands = new Map<string, CommandHandler>()
  private middlewares: Middleware[] = []
  private config = new Map<string, unknown>()

  constructor(
    private container: Container,
    private program: Command
  ) {
    super()
  }

  /**
   * Load a plugin
   */
  async loadPlugin(plugin: Plugin): Promise<void> {
    try {
      // Validate plugin
      this.validatePlugin(plugin)

      // Check dependencies
      await this.checkDependencies(plugin)

      // Create plugin context
      const context: PluginContext = {
        addCommand: (name, handler) => this.addCommand(name, handler),
        addMiddleware: (middleware) => this.addMiddleware(middleware),
        container: this.container,
        emit: (event, ...args) => this.emit(event, ...args),
        on: (event, listener) => this.on(event, listener),
        getConfig: (key) => this.config.get(key),
        setConfig: (key, value) => this.config.set(key, value)
      }

      // Initialize plugin
      await plugin.initialize(context)

      // Store plugin
      this.plugins.set(plugin.name, plugin)
      this.pluginMetadata.set(plugin.name, {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        enabled: true,
        loadedAt: new Date()
      })

      this.emit('plugin:loaded', plugin.name)
      console.log(`✅ Plugin loaded: ${plugin.name} v${plugin.version}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.pluginMetadata.set(plugin.name, {
        name: plugin.name,
        version: plugin.version,
        enabled: false,
        error: errorMessage
      })

      this.emit('plugin:error', plugin.name, error)
      console.error(`❌ Failed to load plugin ${plugin.name}: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`)
    }

    try {
      // Call cleanup if available
      if (plugin.cleanup) {
        await plugin.cleanup()
      }

      // Remove from collections
      this.plugins.delete(name)
      this.pluginMetadata.delete(name)

      // Remove plugin commands (simplified - in real implementation would track per plugin)
      // This would require more sophisticated tracking

      this.emit('plugin:unloaded', name)
      console.log(`✅ Plugin unloaded: ${name}`)

    } catch (error) {
      this.emit('plugin:error', name, error)
      throw error
    }
  }

  /**
   * Get list of loaded plugins
   */
  getPlugins(): PluginMetadata[] {
    return Array.from(this.pluginMetadata.values())
  }

  /**
   * Check if plugin is loaded
   */
  isPluginLoaded(name: string): boolean {
    return this.plugins.has(name) && this.pluginMetadata.get(name)?.enabled === true
  }

  /**
   * Execute command with middleware chain
   */
  async executeCommand(
    command: string,
    args: unknown[],
    options: Record<string, unknown>
  ): Promise<void> {
    const handler = this.commands.get(command)
    if (!handler) {
      throw new Error(`Command ${command} not found`)
    }

    const context: MiddlewareContext = {
      command,
      args,
      options
    }

    // Execute middleware chain
    await this.executeMiddlewareChain(context, () => handler(args, options))
  }

  /**
   * Add a command handler
   */
  private addCommand(name: string, handler: CommandHandler): void {
    if (this.commands.has(name)) {
      throw new Error(`Command ${name} already exists`)
    }

    this.commands.set(name, handler)

    // Add to Commander.js program
    this.program
      .command(name)
      .action(async (...args) => {
        const options = args.pop() // Commander passes options as last argument
        await this.executeCommand(name, args, options)
      })
  }

  /**
   * Add middleware
   */
  private addMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware)
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewareChain(
    context: MiddlewareContext,
    finalHandler: () => Promise<void> | void
  ): Promise<void> {
    let index = 0

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++]
        await middleware(context, next)
      } else {
        await finalHandler()
      }
    }

    await next()
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name')
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version')
    }

    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must have an initialize function')
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already loaded`)
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return
    }

    for (const dependency of plugin.dependencies) {
      if (!this.isPluginLoaded(dependency)) {
        throw new Error(`Plugin ${plugin.name} requires ${dependency} to be loaded first`)
      }
    }
  }

  /**
   * Load plugins from directory
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')

    try {
      const files = await fs.readdir(directory)
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const pluginPath = path.join(directory, file)
            const pluginModule = await import(pluginPath)
            const plugin = pluginModule.default || pluginModule
            
            if (plugin && typeof plugin.initialize === 'function') {
              await this.loadPlugin(plugin)
            }
          } catch (error) {
            console.warn(`Failed to load plugin from ${file}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read plugin directory ${directory}:`, error)
    }
  }

  /**
   * Create a plugin sandbox for security
   */
  createSandbox(): PluginSandbox {
    return new PluginSandbox()
  }
}

/**
 * Plugin sandbox for security isolation
 */
export class PluginSandbox {
  private allowedModules = new Set([
    'crypto',
    'url',
    'querystring',
    'util'
  ])

  /**
   * Execute plugin code in sandbox
   */
  execute(code: string, context: Record<string, unknown>): unknown {
    // In a real implementation, this would use vm module or similar
    // for proper sandboxing. This is a simplified version.
    
    const sandbox = {
      ...context,
      require: (moduleName: string) => {
        if (this.allowedModules.has(moduleName)) {
          return require(moduleName)
        }
        throw new Error(`Module ${moduleName} not allowed in sandbox`)
      },
      console: {
        log: (...args: unknown[]) => console.log('[Plugin]', ...args),
        error: (...args: unknown[]) => console.error('[Plugin]', ...args),
        warn: (...args: unknown[]) => console.warn('[Plugin]', ...args)
      }
    }

    // This is a simplified sandbox - real implementation would use vm.createContext
    const func = new Function(...Object.keys(sandbox), code)
    return func(...Object.values(sandbox))
  }
}

/**
 * Built-in plugin types for common use cases
 */
export namespace BuiltinPlugins {
  /**
   * Command plugin for adding simple commands
   */
  export function createCommandPlugin(
    name: string,
    command: string,
    handler: CommandHandler,
    description?: string
  ): Plugin {
    return {
      name,
      version: '1.0.0',
      description,
      initialize: (context) => {
        context.addCommand(command, handler)
      }
    }
  }

  /**
   * Middleware plugin for adding request/response processing
   */
  export function createMiddlewarePlugin(
    name: string,
    middleware: Middleware,
    description?: string
  ): Plugin {
    return {
      name,
      version: '1.0.0',
      description,
      initialize: (context) => {
        context.addMiddleware(middleware)
      }
    }
  }
}