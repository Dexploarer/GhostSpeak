import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs'
import { envConfig } from './env-config.js'
// Define Cluster type locally since it's not exported from @solana/kit
type Cluster = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'

export interface GhostSpeakConfig {
  network: Cluster
  walletPath: string
  rpcUrl?: string
  programId: string
}

const CONFIG_DIR = join(homedir(), '.ghostspeak')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: GhostSpeakConfig = {
  network: envConfig.network,
  walletPath: envConfig.walletPath.startsWith('~') 
    ? join(homedir(), envConfig.walletPath.slice(2))
    : envConfig.walletPath,
  programId: envConfig.programId.toString(),
  rpcUrl: envConfig.rpcUrl
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
}

export function loadConfig(): GhostSpeakConfig {
  ensureConfigDir()
  
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG
  }
  
  try {
    const configData = readFileSync(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(configData) as Partial<GhostSpeakConfig>
    return { ...DEFAULT_CONFIG, ...config }
  } catch (error) {
    console.error('Error loading config:', error)
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: Partial<GhostSpeakConfig>): void {
  ensureConfigDir()
  
  const currentConfig = loadConfig()
  const newConfig = { ...currentConfig, ...config }
  
  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
  // Set file permissions to owner-only
  chmodSync(CONFIG_FILE, 0o600)
}

export function resetConfig(): void {
  ensureConfigDir()
  
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2))
    // Set file permissions to owner-only
    chmodSync(CONFIG_FILE, 0o600)
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE
}