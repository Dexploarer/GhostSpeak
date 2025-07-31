/**
 * Browser Compatibility and Feature Detection
 * 
 * Provides comprehensive browser compatibility checks and progressive
 * enhancement for WebAssembly cryptographic operations.
 */

// Browser globals for Node.js compatibility
declare const navigator: {
  userAgent: string
  hardwareConcurrency?: number
}
declare const performance: {
  now(): number
}
declare const crypto: {
  getRandomValues(array: Uint8Array): Uint8Array
}
// Browser globals declared but may not be used in all contexts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const window: object | undefined
// eslint-disable-next-line @typescript-eslint/no-unused-vars  
declare const self: object | undefined

// =====================================================
// BROWSER FEATURE DETECTION
// =====================================================

/**
 * Browser capability detection results
 */
export interface BrowserCapabilities {
  /** WebAssembly basic support */
  webAssembly: boolean
  /** WebAssembly SIMD support */
  webAssemblySIMD: boolean
  /** WebAssembly threads support */
  webAssemblyThreads: boolean
  /** BigInt support */
  bigInt: boolean
  /** TextEncoder/TextDecoder support */
  textEncoding: boolean
  /** Crypto.getRandomValues support */
  cryptoRandom: boolean
  /** Performance.now() support */
  performanceNow: boolean
  /** Worker support */
  workers: boolean
  /** SharedArrayBuffer support */
  sharedArrayBuffer: boolean
  /** Browser name and version */
  browser: {
    name: string
    version: string
    engine: string
  }
  /** Performance score (0-100) */
  performanceScore: number
}

/**
 * Recommended configuration based on browser capabilities
 */
export interface BrowserConfig {
  /** Should use WASM acceleration */
  useWasm: boolean
  /** Should use batch operations */
  useBatchOperations: boolean
  /** Should use parallel processing */
  useParallelProcessing: boolean
  /** Maximum concurrent operations */
  maxConcurrentOps: number
  /** Preferred proof batch size */
  preferredBatchSize: number
  /** Should use fallback implementations */
  useFallbacks: boolean
  /** Optimization level */
  optimizationLevel: 'basic' | 'standard' | 'advanced'
}

// =====================================================
// FEATURE DETECTION FUNCTIONS
// =====================================================

/**
 * Check if WebAssembly is supported
 */
function detectWebAssembly(): boolean {
  try {
    if (typeof WebAssembly !== 'object' || WebAssembly === null) {
      return false
    }
    const wasm = WebAssembly as unknown as { instantiate?: unknown; compile?: unknown }
    return typeof wasm.instantiate === 'function' &&
           typeof wasm.compile === 'function'
  } catch {
    return false
  }
}

/**
 * Check if WebAssembly SIMD is supported
 */
async function detectWebAssemblySIMD(): Promise<boolean> {
  if (!detectWebAssembly()) {
    return false
  }

  try {
    // Test SIMD with a minimal WebAssembly module
    // In a real implementation, we would compile and test a SIMD module
    // For now, we'll use browser detection heuristics
    
    // For now, we'll use a heuristic based on browser support
    const userAgent = navigator.userAgent.toLowerCase()
    
    // Chrome 91+, Firefox 89+, Safari 14.1+ have SIMD support
    if (userAgent.includes('chrome')) {
      const chromeRegex = /chrome\/(\d+)/
      const chromeMatch = chromeRegex.exec(userAgent)
      return chromeMatch ? parseInt(chromeMatch[1]) >= 91 : false
    }
    
    if (userAgent.includes('firefox')) {
      const firefoxMatch = /firefox\/(\d+)/.exec(userAgent)
      return firefoxMatch ? parseInt(firefoxMatch[1]) >= 89 : false
    }
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      const safariMatch = /version\/(\d+)/.exec(userAgent)
      return safariMatch ? parseInt(safariMatch[1]) >= 14 : false
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Check if WebAssembly threads are supported
 */
function detectWebAssemblyThreads(): boolean {
  try {
    return typeof SharedArrayBuffer !== 'undefined' &&
           typeof Atomics !== 'undefined' &&
           detectWebAssembly()
  } catch {
    return false
  }
}

/**
 * Detect browser name, version, and engine
 */
function detectBrowser(): { name: string; version: string; engine: string } {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
  
  // Chrome
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    const match = /chrome\/(\d+\.\d+)/.exec(userAgent)
    return {
      name: 'Chrome',
      version: match ? match[1] : 'unknown',
      engine: 'Blink'
    }
  }
  
  // Firefox
  if (userAgent.includes('firefox')) {
    const match = /firefox\/(\d+\.\d+)/.exec(userAgent)
    return {
      name: 'Firefox',
      version: match ? match[1] : 'unknown',
      engine: 'Gecko'
    }
  }
  
  // Safari
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    const match = /version\/(\d+\.\d+)/.exec(userAgent)
    return {
      name: 'Safari',
      version: match ? match[1] : 'unknown',
      engine: 'WebKit'
    }
  }
  
  // Edge
  if (userAgent.includes('edg')) {
    const match = /edg\/(\d+\.\d+)/.exec(userAgent)
    return {
      name: 'Edge',
      version: match ? match[1] : 'unknown',
      engine: 'Blink'
    }
  }
  
  return {
    name: 'Unknown',
    version: 'unknown',
    engine: 'unknown'
  }
}

/**
 * Calculate performance score based on capabilities
 */
function calculatePerformanceScore(capabilities: Omit<BrowserCapabilities, 'performanceScore'>): number {
  let score = 0
  
  // Basic requirements (40 points)
  if (capabilities.webAssembly) score += 20
  if (capabilities.bigInt) score += 10
  if (capabilities.cryptoRandom) score += 10
  
  // Advanced features (40 points)  
  if (capabilities.webAssemblySIMD) score += 20
  if (capabilities.webAssemblyThreads) score += 10
  if (capabilities.sharedArrayBuffer) score += 10
  
  // Performance features (20 points)
  if (capabilities.performanceNow) score += 5
  if (capabilities.workers) score += 10
  if (capabilities.textEncoding) score += 5
  
  return Math.min(score, 100)
}

// =====================================================
// MAIN DETECTION FUNCTION
// =====================================================

/**
 * Detect comprehensive browser capabilities
 */
export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
  console.log('🔍 Detecting browser capabilities...')
  
  const capabilities = {
    webAssembly: detectWebAssembly(),
    webAssemblySIMD: await detectWebAssemblySIMD(),
    webAssemblyThreads: detectWebAssemblyThreads(),
    bigInt: typeof BigInt !== 'undefined',
    textEncoding: typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined',
    cryptoRandom: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
    performanceNow: typeof performance !== 'undefined' && typeof performance.now === 'function',
    workers: typeof Worker !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    browser: detectBrowser(),
    performanceScore: 0 // Will be calculated below
  }
  
  capabilities.performanceScore = calculatePerformanceScore(capabilities)
  
  console.log('📊 Browser Capabilities:', capabilities)
  
  return capabilities
}

// =====================================================
// CONFIGURATION GENERATION
// =====================================================

/**
 * Generate optimal configuration based on browser capabilities
 */
export function generateBrowserConfig(capabilities: BrowserCapabilities): BrowserConfig {
  const config: BrowserConfig = {
    useWasm: false,
    useBatchOperations: false,
    useParallelProcessing: false,
    maxConcurrentOps: 1,
    preferredBatchSize: 1,
    useFallbacks: true,
    optimizationLevel: 'basic'
  }
  
  // Enable WASM if supported and performant
  if (capabilities.webAssembly && capabilities.performanceScore >= 60) {
    config.useWasm = true
    config.useBatchOperations = true
    config.preferredBatchSize = capabilities.webAssemblySIMD ? 10 : 5
    config.optimizationLevel = 'standard'
  }
  
  // Enable advanced features for high-performance browsers
  if (capabilities.performanceScore >= 80) {
    config.useParallelProcessing = true
    config.maxConcurrentOps = capabilities.webAssemblyThreads ? 4 : 2
    config.preferredBatchSize = capabilities.webAssemblySIMD ? 20 : 10
    config.optimizationLevel = 'advanced'
  }
  
  // Browser-specific optimizations
  switch (capabilities.browser.name) {
    case 'Chrome':
      // Chrome has excellent WASM performance
      if (config.useWasm) {
        config.preferredBatchSize = Math.max(config.preferredBatchSize, 15)
        config.maxConcurrentOps = Math.max(config.maxConcurrentOps, 4)
      }
      break
      
    case 'Firefox':
      // Firefox has good WASM but slower startup
      if (config.useWasm) {
        config.preferredBatchSize = Math.max(config.preferredBatchSize, 8)
      }
      break
      
    case 'Safari':
      // Safari is more conservative with WASM
      if (config.useWasm) {
        config.preferredBatchSize = Math.min(config.preferredBatchSize, 8)
        config.maxConcurrentOps = Math.min(config.maxConcurrentOps, 2)
      }
      break
      
    case 'Edge':
      // Edge is similar to Chrome
      if (config.useWasm) {
        config.preferredBatchSize = Math.max(config.preferredBatchSize, 12)
      }
      break
  }
  
  // Always enable fallbacks for safety
  config.useFallbacks = true
  
  console.log('⚙️ Generated Browser Config:', config)
  
  return config
}

// =====================================================
// PROGRESSIVE ENHANCEMENT
// =====================================================

/**
 * Browser compatibility manager
 */
export class BrowserCompatibilityManager {
  private capabilities: BrowserCapabilities | null = null
  private config: BrowserConfig | null = null
  private initialized = false

  /**
   * Initialize the compatibility manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('🚀 Initializing browser compatibility manager...')
    
    this.capabilities = await detectBrowserCapabilities()
    this.config = generateBrowserConfig(this.capabilities)
    this.initialized = true
    
    console.log('✅ Browser compatibility manager initialized')
    
    // Log recommendations
    this.logRecommendations()
  }

  /**
   * Get browser capabilities
   */
  getCapabilities(): BrowserCapabilities | null {
    return this.capabilities
  }

  /**
   * Get recommended configuration
   */
  getConfig(): BrowserConfig | null {
    return this.config
  }

  /**
   * Check if feature is supported
   */
  isFeatureSupported(feature: keyof BrowserCapabilities): boolean {
    if (!this.capabilities) {
      return false
    }
    
    const value = this.capabilities[feature]
    return typeof value === 'boolean' ? value : false
  }

  /**
   * Get optimization level
   */
  getOptimizationLevel(): 'basic' | 'standard' | 'advanced' {
    return this.config?.optimizationLevel ?? 'basic'
  }

  /**
   * Should use WASM acceleration
   */
  shouldUseWasm(): boolean {
    return this.config?.useWasm ?? false
  }

  /**
   * Should use batch operations
   */
  shouldUseBatchOperations(): boolean {
    return this.config?.useBatchOperations ?? false
  }

  /**
   * Get preferred batch size
   */
  getPreferredBatchSize(): number {
    return this.config?.preferredBatchSize ?? 1
  }

  /**
   * Get maximum concurrent operations
   */
  getMaxConcurrentOps(): number {
    return this.config?.maxConcurrentOps ?? 1
  }

  /**
   * Log browser-specific recommendations
   */
  private logRecommendations(): void {
    if (!this.capabilities || !this.config) {
      return
    }

    const { browser, performanceScore } = this.capabilities
    
    console.log(`🌐 Browser: ${browser.name} ${browser.version} (${browser.engine})`)
    console.log(`📊 Performance Score: ${performanceScore}/100`)
    console.log(`⚡ Optimization Level: ${this.config.optimizationLevel}`)
    
    // Browser-specific recommendations
    const recommendations: string[] = []
    
    if (!this.capabilities.webAssembly) {
      recommendations.push('Consider updating your browser for WebAssembly support')
    }
    
    if (!this.capabilities.webAssemblySIMD) {
      recommendations.push('SIMD support would improve cryptographic performance')
    }
    
    if (!this.capabilities.cryptoRandom) {
      recommendations.push('Secure random number generation not available')
    }
    
    if (performanceScore < 60) {
      recommendations.push('Browser has limited performance capabilities')
    }
    
    if (browser.name === 'Safari' && this.config.useWasm) {
      recommendations.push('Safari users may experience slower WASM initialization')
    }
    
    if (recommendations.length > 0) {
      console.log('💡 Recommendations:')
      recommendations.forEach(rec => console.log(`  • ${rec}`))
    } else {
      console.log('✅ Browser is fully optimized for GhostSpeak crypto operations')
    }
  }

  /**
   * Get compatibility report
   */
  getCompatibilityReport(): {
    capabilities: BrowserCapabilities
    config: BrowserConfig
    recommendations: string[]
    status: 'excellent' | 'good' | 'fair' | 'poor'
  } {
    if (!this.capabilities || !this.config) {
      throw new Error('Compatibility manager not initialized')
    }

    const { performanceScore } = this.capabilities
    
    let status: 'excellent' | 'good' | 'fair' | 'poor'
    if (performanceScore >= 90) status = 'excellent'
    else if (performanceScore >= 75) status = 'good'
    else if (performanceScore >= 50) status = 'fair'
    else status = 'poor'

    const recommendations: string[] = []
    
    if (!this.capabilities.webAssembly) {
      recommendations.push('Update browser for WebAssembly support')
    }
    if (!this.capabilities.webAssemblySIMD) {
      recommendations.push('Enable WASM SIMD for better performance')
    }
    if (!this.capabilities.bigInt) {
      recommendations.push('BigInt support required for large number operations')
    }

    return {
      capabilities: this.capabilities,
      config: this.config,
      recommendations,
      status
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

// Global compatibility manager instance
let compatibilityManager: BrowserCompatibilityManager | null = null

/**
 * Get the global browser compatibility manager
 */
export function getBrowserCompatibilityManager(): BrowserCompatibilityManager {
  compatibilityManager ??= new BrowserCompatibilityManager()
  return compatibilityManager
}

/**
 * Initialize browser compatibility (convenience function)
 */
export async function initializeBrowserCompatibility(): Promise<BrowserCompatibilityManager> {
  const manager = getBrowserCompatibilityManager()
  await manager.initialize()
  return manager
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if browser supports minimum requirements for GhostSpeak
 */
export async function checkMinimumRequirements(): Promise<{
  supported: boolean
  missing: string[]
  warnings: string[]
}> {
  const capabilities = await detectBrowserCapabilities()
  
  const missing: string[] = []
  const warnings: string[] = []
  
  // Critical requirements
  if (!capabilities.bigInt) {
    missing.push('BigInt support')
  }
  
  if (!capabilities.cryptoRandom) {
    missing.push('Crypto.getRandomValues')
  }
  
  if (!capabilities.textEncoding) {
    missing.push('TextEncoder/TextDecoder')
  }
  
  // Performance warnings
  if (!capabilities.webAssembly) {
    warnings.push('WebAssembly not supported - performance will be limited')
  }
  
  if (!capabilities.webAssemblySIMD) {
    warnings.push('WASM SIMD not available - crypto operations will be slower')
  }
  
  if (capabilities.performanceScore < 40) {
    warnings.push('Browser has very limited performance capabilities')
  }
  
  return {
    supported: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Get user-friendly browser compatibility message
 */
export async function getBrowserCompatibilityMessage(): Promise<string> {
  const requirements = await checkMinimumRequirements()
  
  if (!requirements.supported) {
    return `❌ Browser not supported. Missing: ${requirements.missing.join(', ')}`
  }
  
  if (requirements.warnings.length > 0) {
    return `⚠️ Browser supported with limitations: ${requirements.warnings.join(', ')}`
  }
  
  return '✅ Browser fully supported with optimal performance'
}