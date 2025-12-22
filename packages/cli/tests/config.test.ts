import { describe, it, expect, afterEach } from 'vitest'
import { loadConfig, saveConfig } from '../src/utils/config'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

describe('CLI Config', () => {
  const configDir = join(homedir(), '.ghostspeak')
  const configFile = join(configDir, 'config.json')
  
  afterEach(() => {
    // Clean up config file after each test
    if (existsSync(configFile)) {
      rmSync(configFile)
    }
  })
  
  it('should load default config when no file exists', () => {
    // Ensure config file doesn't exist
    if (existsSync(configFile)) {
      rmSync(configFile)
    }
    
    const config = loadConfig()
    
    // Default config should have these properties
    expect(config.network).toBe('devnet')
    expect(config.rpcUrl).toBe('https://api.devnet.solana.com')
    // walletPath comes from envConfig defaults
    expect(config.walletPath).toBeDefined()
    expect(typeof config.walletPath).toBe('string')
  })
  
  it('should save and load config correctly', () => {
    const customConfig = {
      network: 'testnet' as const,
      rpcUrl: 'https://api.testnet.solana.com',
      walletPath: '/path/to/wallet.json',
      programId: 'CustomProgramId123'
    }
    
    saveConfig(customConfig)
    const loadedConfig = loadConfig()
    
    expect(loadedConfig.network).toBe(customConfig.network)
    expect(loadedConfig.rpcUrl).toBe(customConfig.rpcUrl)
    expect(loadedConfig.walletPath).toBe(customConfig.walletPath)
    expect(loadedConfig.programId).toBe(customConfig.programId)
  })
  
  it('should merge with defaults when saving partial config', () => {
    const partialConfig = {
      network: 'mainnet-beta' as const
    }
    
    saveConfig(partialConfig)
    const loadedConfig = loadConfig()
    
    expect(loadedConfig.network).toBe('mainnet-beta')
    // Other defaults should still be present
    expect(loadedConfig.rpcUrl).toBeDefined()
    expect(loadedConfig.walletPath).toBeDefined()
  })
})
