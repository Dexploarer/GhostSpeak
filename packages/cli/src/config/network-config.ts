/**
 * Network configuration for GhostSpeak CLI
 * Centralized management of network endpoints and settings
 */

export interface NetworkConfig {
  rpc: string
  ws?: string
  name: string
  cluster: 'devnet' | 'testnet' | 'mainnet-beta'
  explorerUrl: string
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  devnet: {
    name: 'Devnet',
    cluster: 'devnet',
    rpc: 'https://api.devnet.solana.com',
    ws: 'wss://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com'
  },
  testnet: {
    name: 'Testnet', 
    cluster: 'testnet',
    rpc: 'https://api.testnet.solana.com',
    ws: 'wss://api.testnet.solana.com',
    explorerUrl: 'https://explorer.solana.com'
  },
  'mainnet-beta': {
    name: 'Mainnet Beta',
    cluster: 'mainnet-beta', 
    rpc: 'https://api.mainnet-beta.solana.com',
    ws: 'wss://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com'
  }
}

export function getNetworkConfig(network: string): NetworkConfig {
  const config = NETWORK_CONFIGS[network]
  if (!config) {
    throw new Error(`Unknown network: ${network}. Available networks: ${Object.keys(NETWORK_CONFIGS).join(', ')}`)
  }
  return config
}

export function isValidNetwork(network: string): boolean {
  return network in NETWORK_CONFIGS
}

export function getExplorerUrl(signature: string, network: string): string {
  const config = getNetworkConfig(network)
  return `${config.explorerUrl}/tx/${signature}?cluster=${config.cluster}`
}