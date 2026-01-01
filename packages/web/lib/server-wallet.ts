/**
 * Server Wallet for PayAI Integration
 *
 * Provides a server-side wallet for recording PayAI payments on-chain.
 * This wallet is authorized to call record_x402_payment instruction.
 *
 * SECURITY NOTES:
 * - Private key must be stored in environment variables (never committed)
 * - This wallet only needs enough SOL for transaction fees (~0.1 SOL recommended)
 * - Private key should have restricted permissions in production
 */

import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSolanaRpc } from '@solana/rpc'
import bs58 from 'bs58'

let _serverWallet: Awaited<ReturnType<typeof createKeyPairSignerFromBytes>> | null = null
let _rpc: ReturnType<typeof createSolanaRpc> | null = null
let _currentRpcIndex = 0

// RPC fallback URLs (try in order if one fails)
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL, // Primary RPC (Helius)
  process.env.SOLANA_RPC_FALLBACK_URL, // Fallback RPC (e.g., Alchemy, QuickNode)
  'https://api.devnet.solana.com', // Public devnet fallback
].filter(Boolean) as string[]

/**
 * Get or create the server wallet singleton
 *
 * The wallet private key must be provided via PAYMENT_RECORDER_PRIVATE_KEY
 * environment variable (base58 encoded).
 *
 * Generate a new wallet with:
 * ```bash
 * solana-keygen new --no-bip39-passphrase -o payment-recorder.json
 * cat payment-recorder.json | jq -r '.' | base64
 * ```
 */
export async function getServerWallet() {
  if (_serverWallet) return _serverWallet

  const privateKeyBase58 = process.env.PAYMENT_RECORDER_PRIVATE_KEY

  if (!privateKeyBase58) {
    throw new Error(
      'PAYMENT_RECORDER_PRIVATE_KEY not configured. ' +
        'Generate with: solana-keygen new --no-bip39-passphrase -o payment-recorder.json'
    )
  }

  // Decode base58 private key to Uint8Array
  let privateKeyBytes: Uint8Array
  try {
    privateKeyBytes = bs58.decode(privateKeyBase58)
  } catch (_error) {
    throw new Error(
      'Failed to decode PAYMENT_RECORDER_PRIVATE_KEY. ' +
        'Ensure it is a valid base58 encoded private key.'
    )
  }

  // Validate key length (should be 64 bytes for Ed25519)
  if (privateKeyBytes.length !== 64) {
    throw new Error(
      `Invalid private key length: ${privateKeyBytes.length} bytes. ` +
        'Expected 64 bytes for Ed25519 keypair.'
    )
  }

  // Create signer from bytes
  _serverWallet = await createKeyPairSignerFromBytes(privateKeyBytes)

  console.log('[Server Wallet] Initialized:', _serverWallet.address)

  return _serverWallet
}

/**
 * Get or create the RPC client singleton
 *
 * Uses fallback RPC endpoints if primary fails
 */
export function getRpc(): ReturnType<typeof createSolanaRpc> {
  if (_rpc) return _rpc

  const rpcUrl = RPC_ENDPOINTS[_currentRpcIndex] || 'https://api.devnet.solana.com'

  _rpc = createSolanaRpc(rpcUrl)

  console.log(
    '[Server RPC] Connected to:',
    rpcUrl,
    `(${_currentRpcIndex + 1}/${RPC_ENDPOINTS.length})`
  )

  return _rpc
}

/**
 * Switch to next RPC endpoint (for fallback)
 *
 * Call this when RPC requests are failing to try the next endpoint
 */
export function switchToFallbackRpc(): void {
  _currentRpcIndex = (_currentRpcIndex + 1) % RPC_ENDPOINTS.length
  _rpc = null // Reset RPC client

  console.log('[Server RPC] Switching to fallback RPC:', RPC_ENDPOINTS[_currentRpcIndex])
}

/**
 * Get current RPC URL (for logging/debugging)
 */
export function getCurrentRpcUrl(): string {
  return RPC_ENDPOINTS[_currentRpcIndex] || 'https://api.devnet.solana.com'
}

/**
 * Check if server wallet is configured
 */
export function isServerWalletConfigured(): boolean {
  return !!process.env.PAYMENT_RECORDER_PRIVATE_KEY
}

/**
 * Get server wallet address without loading the private key
 * (useful for logging/debugging)
 */
export async function getServerWalletAddress(): Promise<string | null> {
  try {
    const wallet = await getServerWallet()
    return wallet.address
  } catch {
    return null
  }
}

/**
 * Ensure the server wallet has sufficient balance for transactions
 *
 * @param minBalanceSol - Minimum balance in SOL (default: 0.1)
 * @throws Error if balance is insufficient
 */
export async function ensureWalletFunded(minBalanceSol: number = 0.1): Promise<void> {
  const wallet = await getServerWallet()
  const rpc = getRpc()

  try {
    // Get balance
    const balanceResponse = await rpc.getBalance(wallet.address).send()
    const balanceLamports = balanceResponse.value
    const balanceSol = Number(balanceLamports) / 1_000_000_000

    console.log(`[Server Wallet] Current balance: ${balanceSol.toFixed(4)} SOL`)

    if (balanceSol < minBalanceSol) {
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      const cluster = rpcUrl.includes('mainnet')
        ? 'mainnet-beta'
        : rpcUrl.includes('testnet')
          ? 'testnet'
          : 'devnet'

      if (cluster === 'mainnet-beta') {
        throw new Error(
          `Server wallet balance too low: ${balanceSol.toFixed(4)} SOL (minimum: ${minBalanceSol} SOL). ` +
            'Please fund the wallet at ' +
            wallet.address
        )
      } else {
        throw new Error(
          `Server wallet balance too low: ${balanceSol.toFixed(4)} SOL (minimum: ${minBalanceSol} SOL). ` +
            `Use the fund-server-wallet.ts script to airdrop funds on ${cluster}.`
        )
      }
    }

    console.log(
      `[Server Wallet] Balance check passed (${balanceSol.toFixed(4)} SOL >= ${minBalanceSol} SOL)`
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('balance too low')) {
      throw error
    }

    console.error('[Server Wallet] Balance check failed:', error)
    throw new Error(
      `Failed to check wallet balance: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get wallet info (for debugging and monitoring)
 */
export async function getWalletInfo(): Promise<{
  address: string
  balanceSol: number
  cluster: string
  rpcUrl: string
}> {
  const wallet = await getServerWallet()
  const rpc = getRpc()
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

  const cluster = rpcUrl.includes('mainnet')
    ? 'mainnet-beta'
    : rpcUrl.includes('testnet')
      ? 'testnet'
      : 'devnet'

  try {
    const balanceResponse = await rpc.getBalance(wallet.address).send()
    const balanceSol = Number(balanceResponse.value) / 1_000_000_000

    return {
      address: wallet.address.toString(),
      balanceSol,
      cluster,
      rpcUrl,
    }
  } catch (error) {
    console.error('[Server Wallet] Failed to get wallet info:', error)

    return {
      address: wallet.address.toString(),
      balanceSol: 0,
      cluster,
      rpcUrl,
    }
  }
}
