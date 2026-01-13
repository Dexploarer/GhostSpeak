/**
 * Solana utilities for Telegram Mini App
 * Handles wallet linking and balance checking
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { config } from './config'
import { isDevelopment } from './env'

const GHOST_TOKEN_MINT = config.solana.ghostTokenAddress

/**
 * Get user's linked Solana wallet address
 * Currently uses Telegram user ID mapping
 */
export function getUserWalletAddress(telegramUserId: number): string {
  // For now, use telegram_ prefix
  // In production, this would come from a wallet linking flow
  return `telegram_${telegramUserId}`
}

/**
 * Check if user has linked a real Solana wallet
 */
export function hasLinkedWallet(walletAddress: string): boolean {
  return !walletAddress.startsWith('telegram_')
}

/**
 * Get $GHOST token balance for a Solana wallet
 */
export async function getGhostBalance(walletAddress: string): Promise<{
  balance: number
  usdValue: number
}> {
  // If it's a telegram_ address, they haven't linked a wallet yet
  if (!hasLinkedWallet(walletAddress)) {
    return { balance: 0, usdValue: 0 }
  }

  try {
    const rpcUrl = config.solana.rpcUrl

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: GHOST_TOKEN_MINT },
          { encoding: 'jsonParsed' }
        ],
      }),
    })

    const data = await response.json()

    let balance = 0
    if (data.result?.value?.length > 0) {
      const accountInfo = data.result.value[0].account.data.parsed.info
      balance = accountInfo.tokenAmount.uiAmount || 0
    }

    // Get $GHOST price from Jupiter
    let priceUsd = 0
    try {
      const priceResponse = await fetch(`https://api.jup.ag/price/v2?ids=${GHOST_TOKEN_MINT}`)
      const priceData = await priceResponse.json()
      priceUsd = priceData.data?.[GHOST_TOKEN_MINT]?.price || 0
    } catch (e) {
      if (isDevelopment) {
        console.warn('[Dev] Could not fetch $GHOST price:', e)
      }
    }

    return {
      balance,
      usdValue: balance * priceUsd,
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('[Dev] Error fetching $GHOST balance:', error)
    }
    return { balance: 0, usdValue: 0 }
  }
}
