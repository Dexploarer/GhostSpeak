import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig, saveConfig } from '../src/utils/config'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

describe('CLI Config', () => {
  const testConfigPath = join(homedir(), '.ghostspeak', 'test-config.json')
  
  afterEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      rmSync(testConfigPath)
    }
  })
  
  it('should load default config when no file exists', () => {
    const config = loadConfig()
    
    expect(config.network).toBe('devnet')
    expect(config.rpcUrl).toBe('https://api.devnet.solana.com')
    expect(config.walletPath).toBeUndefined()
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
})