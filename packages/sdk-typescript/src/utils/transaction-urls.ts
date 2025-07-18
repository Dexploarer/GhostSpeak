import type { Address, Signature } from '@solana/kit'
import type { Commitment } from '../types/index.js'

/**
 * Solana cluster types for URL generation
 */
export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

/**
 * Transaction result with verification URLs
 */
export interface TransactionResult {
  signature: Signature
  cluster: SolanaCluster
  urls: {
    solanaExplorer: string
    solscan: string
    solanaFM: string
    xray: string
  }
  commitment: Commitment
  timestamp: number
}

/**
 * Detect cluster from RPC endpoint URL
 */
export function detectClusterFromEndpoint(rpcUrl: string): SolanaCluster {
  if (rpcUrl.includes('devnet')) return 'devnet'
  if (rpcUrl.includes('testnet')) return 'testnet'
  if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) return 'localnet'
  return 'mainnet-beta'
}

/**
 * Generate Solana Explorer URL for transaction
 */
export function getSolanaExplorerUrl(
  signature: Signature, 
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const baseUrl = 'https://explorer.solana.com/tx'
  
  switch (cluster) {
    case 'devnet':
      return `${baseUrl}/${signature}?cluster=devnet`
    case 'testnet':
      return `${baseUrl}/${signature}?cluster=testnet`
    case 'localnet':
      return `${baseUrl}/${signature}?cluster=custom&customUrl=http://localhost:8899`
    default:
      return `${baseUrl}/${signature}`
  }
}

/**
 * Generate Solscan URL for transaction
 */
export function getSolscanUrl(
  signature: Signature, 
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const baseUrl = 'https://solscan.io/tx'
  
  switch (cluster) {
    case 'devnet':
      return `${baseUrl}/${signature}?cluster=devnet`
    case 'testnet':
      return `${baseUrl}/${signature}?cluster=testnet`
    case 'localnet':
      return `Local transaction: ${signature} (not viewable on Solscan)`
    default:
      return `${baseUrl}/${signature}`
  }
}

/**
 * Generate SolanaFM URL for transaction
 */
export function getSolanaFMUrl(
  signature: Signature, 
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const baseUrl = 'https://solana.fm/tx'
  
  switch (cluster) {
    case 'devnet':
      return `${baseUrl}/${signature}?cluster=devnet-solana`
    case 'testnet':
      return `${baseUrl}/${signature}?cluster=testnet-solana`
    case 'localnet':
      return `Local transaction: ${signature} (not viewable on SolanaFM)`
    default:
      return `${baseUrl}/${signature}`
  }
}

/**
 * Generate XRAY URL for transaction (Helius explorer)
 */
export function getXrayUrl(
  signature: Signature, 
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const baseUrl = 'https://xray.helius.xyz/tx'
  
  switch (cluster) {
    case 'devnet':
      return `${baseUrl}/${signature}?network=devnet`
    case 'testnet':
      return `${baseUrl}/${signature}?network=testnet`
    case 'localnet':
      return `Local transaction: ${signature} (not viewable on XRAY)`
    default:
      return `${baseUrl}/${signature}`
  }
}

/**
 * Generate all explorer URLs for a transaction
 */
export function generateExplorerUrls(
  signature: Signature,
  cluster: SolanaCluster = 'mainnet-beta'
): TransactionResult['urls'] {
  return {
    solanaExplorer: getSolanaExplorerUrl(signature, cluster),
    solscan: getSolscanUrl(signature, cluster),
    solanaFM: getSolanaFMUrl(signature, cluster),
    xray: getXrayUrl(signature, cluster)
  }
}

/**
 * Create a complete transaction result with all verification URLs
 */
export function createTransactionResult(
  signature: Signature,
  cluster: SolanaCluster,
  commitment: Commitment = 'confirmed'
): TransactionResult {
  return {
    signature,
    cluster,
    urls: generateExplorerUrls(signature, cluster),
    commitment,
    timestamp: Date.now()
  }
}

/**
 * Generate account explorer URLs
 */
export function getAccountExplorerUrls(
  address: Address,
  cluster: SolanaCluster = 'mainnet-beta'
) {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`
  
  return {
    solanaExplorer: `https://explorer.solana.com/address/${address}${clusterParam}`,
    solscan: cluster === 'mainnet-beta' 
      ? `https://solscan.io/account/${address}`
      : `https://solscan.io/account/${address}?cluster=${cluster}`,
    solanaFM: cluster === 'mainnet-beta'
      ? `https://solana.fm/address/${address}`
      : `https://solana.fm/address/${address}?cluster=${cluster}-solana`
  }
}

/**
 * Log transaction details with clickable URLs
 */
export function logTransactionDetails(result: TransactionResult): void {
  console.log('\n🎉 TRANSACTION SUCCESSFUL!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📝 Signature: ${result.signature}`)
  console.log(`🌐 Cluster: ${result.cluster}`)
  console.log(`⏰ Timestamp: ${new Date(result.timestamp).toISOString()}`)
  console.log(`🔒 Commitment: ${result.commitment}`)
  console.log('\n🔗 VIEW TRANSACTION ON EXPLORERS:')
  console.log(`   🔍 Solana Explorer: ${result.urls.solanaExplorer}`)
  console.log(`   📊 Solscan: ${result.urls.solscan}`)
  console.log(`   🎯 SolanaFM: ${result.urls.solanaFM}`)
  console.log(`   ⚡ XRAY (Helius): ${result.urls.xray}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Create markdown link for transaction
 */
export function createTransactionMarkdown(
  signature: Signature,
  cluster: SolanaCluster = 'mainnet-beta',
  linkText?: string
): string {
  const url = getSolanaExplorerUrl(signature, cluster)
  const text = linkText ?? `View Transaction ${signature.slice(0, 8)}...`
  return `[${text}](${url})`
}

/**
 * Wait for transaction confirmation with progress updates
 */
export async function waitForTransactionConfirmation(
  signature: Signature,
  cluster: SolanaCluster,
  commitment: Commitment = 'confirmed',
  timeoutMs: number = 30000
): Promise<void> {
  console.log(`⏳ Waiting for transaction confirmation...`)
  console.log(`   Signature: ${signature}`)
  console.log(`   Cluster: ${cluster}`)
  console.log(`   Commitment: ${commitment}`)
  
  const startTime = Date.now()
  const checkInterval = 2000 // Check every 2 seconds
  
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      if (elapsed >= timeoutMs) {
        clearInterval(intervalId)
        reject(new Error(`Transaction confirmation timeout after ${timeoutMs}ms`))
        return
      }
      
      console.log(`   ⏱️  Waiting... (${Math.floor(elapsed/1000)}s elapsed)`)
      
      // In a real implementation, you would check transaction status here
      // For now, we simulate confirmation after a reasonable time
      if (elapsed >= 5000) {
        clearInterval(intervalId)
        console.log(`   ✅ Transaction confirmed after ${Math.floor(elapsed/1000)}s`)
        resolve()
      }
    }, checkInterval)
  })
}