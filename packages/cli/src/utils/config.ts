import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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
  network: 'devnet',
  walletPath: join(homedir(), '.config', 'solana', 'id.json'),
  programId: 'FVknDdFF634i2gLyVaXrgaM1eYpb7LNPdV14Y3Egb73E'
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadConfig(): GhostSpeakConfig {
  ensureConfigDir()
  
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG
  }
  
  try {
    const configData = readFileSync(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(configData)
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
}

export function resetConfig(): void {
  ensureConfigDir()
  
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2))
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE
}