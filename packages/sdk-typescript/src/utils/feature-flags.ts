/**
 * Feature Flags for GhostSpeak Protocol
 * 
 * Centralized feature flag management for enabling/disabling features
 * based on network conditions and protocol status.
 */

export interface FeatureFlags {
  /** Enable confidential transfers (currently in beta) */
  CONFIDENTIAL_TRANSFERS_ENABLED: boolean
  
  /** Use client-side encryption as fallback */
  USE_CLIENT_ENCRYPTION: boolean
  
  /** Enable IPFS integration for private metadata */
  ENABLE_IPFS_STORAGE: boolean
  
  /** Enable compressed NFTs for agents */
  ENABLE_COMPRESSED_AGENTS: boolean
  
  /** Enable governance features */
  ENABLE_GOVERNANCE: boolean
  
  /** Enable analytics collection */
  ENABLE_ANALYTICS: boolean
  
  /** Show beta/experimental features in UI */
  SHOW_EXPERIMENTAL_FEATURES: boolean
}

/**
 * Default feature flags for production
 */
export const DEFAULT_FLAGS: FeatureFlags = {
  // Privacy features using client-side encryption
  CONFIDENTIAL_TRANSFERS_ENABLED: true,
  USE_CLIENT_ENCRYPTION: true,
  ENABLE_IPFS_STORAGE: true,
  
  // Enabled features
  ENABLE_COMPRESSED_AGENTS: true,
  ENABLE_GOVERNANCE: true,
  ENABLE_ANALYTICS: true,
  
  // UI/UX
  SHOW_EXPERIMENTAL_FEATURES: false
}

/**
 * Development feature flags (all features enabled)
 */
export const DEV_FLAGS: FeatureFlags = {
  CONFIDENTIAL_TRANSFERS_ENABLED: true,
  USE_CLIENT_ENCRYPTION: true,
  ENABLE_IPFS_STORAGE: true,
  ENABLE_COMPRESSED_AGENTS: true,
  ENABLE_GOVERNANCE: true,
  ENABLE_ANALYTICS: true,
  SHOW_EXPERIMENTAL_FEATURES: true
}

/**
 * Feature flag manager
 */
export class FeatureFlagManager {
  private flags: FeatureFlags
  private overrides: Partial<FeatureFlags> = {}
  
  constructor(environment: 'production' | 'development' = 'production') {
    this.flags = environment === 'development' ? { ...DEV_FLAGS } : { ...DEFAULT_FLAGS }
    this.loadOverridesFromEnv()
  }
  
  /**
   * Load flag overrides from environment variables
   */
  private loadOverridesFromEnv(): void {
    // Check for environment variable overrides
    if (typeof process !== 'undefined') {
      const envOverrides: Partial<FeatureFlags> = {}
      
      // Parse boolean environment variables
      const parseEnvBool = (key: string): boolean | undefined => {
        const value = process.env[key]
        if (value === undefined) return undefined
        return value.toLowerCase() === 'true'
      }
      
      // Check each flag
      const confidentialTransfers = parseEnvBool('GHOSTSPEAK_CONFIDENTIAL_TRANSFERS')
      if (confidentialTransfers !== undefined) {
        envOverrides.CONFIDENTIAL_TRANSFERS_ENABLED = confidentialTransfers
      }
      
      const useClientEncryption = parseEnvBool('GHOSTSPEAK_USE_CLIENT_ENCRYPTION')
      if (useClientEncryption !== undefined) {
        envOverrides.USE_CLIENT_ENCRYPTION = useClientEncryption
      }
      
      this.overrides = envOverrides
    }
  }
  
  /**
   * Get current feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags, ...this.overrides }
  }
  
  /**
   * Check if a specific feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    const flags = this.getFlags()
    return flags[feature]
  }
  
  /**
   * Set a feature flag (runtime override)
   */
  setFlag(feature: keyof FeatureFlags, enabled: boolean): void {
    this.overrides[feature] = enabled
  }
  
  /**
   * Reset all overrides
   */
  resetOverrides(): void {
    this.overrides = {}
    this.loadOverridesFromEnv()
  }
  
  /**
   * Get privacy feature status
   */
  getPrivacyStatus(): {
    mode: 'client-encryption' | 'disabled'
    beta: boolean
    message: string
  } {
    const flags = this.getFlags()
    
    if (!flags.CONFIDENTIAL_TRANSFERS_ENABLED) {
      return {
        mode: 'disabled',
        beta: false,
        message: 'Confidential transfers are currently disabled'
      }
    }
    
    if (flags.USE_CLIENT_ENCRYPTION) {
      return {
        mode: 'client-encryption',
        beta: false,
        message: 'Confidential transfers using client-side encryption (Production)'
      }
    }
    
    return {
      mode: 'disabled',
      beta: false,
      message: 'No privacy features enabled'
    }
  }
  
  /**
   * Check if we should use client encryption
   */
  shouldUseClientEncryption(): boolean {
    const flags = this.getFlags()
    return flags.CONFIDENTIAL_TRANSFERS_ENABLED && 
           flags.USE_CLIENT_ENCRYPTION
  }
}

// Global instance
let globalFeatureFlags: FeatureFlagManager | null = null

/**
 * Get or create the global feature flag manager
 */
export function getFeatureFlags(environment?: 'production' | 'development'): FeatureFlagManager {
  globalFeatureFlags ??= new FeatureFlagManager(environment)
  return globalFeatureFlags
}

/**
 * Quick helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags().isEnabled(feature)
}

/**
 * Quick helper to get privacy status
 */
export function getPrivacyStatus() {
  return getFeatureFlags().getPrivacyStatus()
}