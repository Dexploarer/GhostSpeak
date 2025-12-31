/**
 * GhostSpeak SDK Integration Layer - Browser Safe
 *
 * Centralized SDK client management integrating with the real SDK modules.
 * Uses browser-safe SDK imports and the SDK client from lib/ghostspeak/client.
 */

import { createSolanaRpc, address } from '@solana/kit'
import type { Rpc, SolanaRpcApi, GetTransactionApi, Address } from '@solana/kit'
import { getGhostSpeakClient, type GhostSpeakClient } from './ghostspeak/client'

export type { Address }

// =====================================================
// CONFIGURATION
// =====================================================

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
export const GHOSTSPEAK_PROGRAM_ID =
  process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID ?? 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'

const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112'

/**
 * Browser-safe Token Balance Fetcher
 */
class BrowserTokenClient {
  private rpc: Rpc<SolanaRpcApi & GetTransactionApi>

  constructor(rpcUrl: string) {
    this.rpc = createSolanaRpc(rpcUrl)
  }

  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<bigint> {
    try {
      if (tokenMint === NATIVE_SOL_MINT) {
        const balance = await this.rpc.getBalance(walletAddress as Address).send()
        return balance.value
      }

      const response = await this.rpc
        .getTokenAccountsByOwner(
          walletAddress as Address,
          { mint: address(tokenMint) },
          { encoding: 'jsonParsed' }
        )
        .send()

      if (response.value && response.value.length > 0) {
        const accountData = response.value[0].account.data as {
          parsed: { info: { tokenAmount: { amount: string } } }
        }
        return BigInt(accountData.parsed.info.tokenAmount.amount)
      }

      return BigInt(0)
    } catch (error) {
      console.warn('Failed to get token balance:', error)
      return BigInt(0)
    }
  }

  async getAllTokenBalances(walletAddress: string): Promise<{ mint: string; balance: bigint }[]> {
    try {
      const solBalance = await this.rpc.getBalance(walletAddress as Address).send()

      const balances: { mint: string; balance: bigint }[] = [
        { mint: NATIVE_SOL_MINT, balance: solBalance.value },
      ]

      const tokenAccounts = await this.rpc
        .getTokenAccountsByOwner(
          walletAddress as Address,
          { programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
          { encoding: 'jsonParsed' }
        )
        .send()

      for (const account of tokenAccounts.value) {
        const data = account.account.data as {
          parsed: { info: { mint: string; tokenAmount: { amount: string } } }
        }
        balances.push({
          mint: data.parsed.info.mint,
          balance: BigInt(data.parsed.info.tokenAmount.amount),
        })
      }

      return balances
    } catch (error) {
      console.warn('Failed to get all token balances:', error)
      return []
    }
  }
}

// =====================================================
// SDK CLIENT MANAGER
// =====================================================

export class GhostSpeakSDKManager {
  public tokens: BrowserTokenClient
  public sdkClient: GhostSpeakClient

  constructor() {
    this.sdkClient = getGhostSpeakClient()
    this.tokens = new BrowserTokenClient(SOLANA_RPC_URL)
  }
}

// =====================================================
// GLOBAL SINGLETON
// =====================================================

let sdkManager: GhostSpeakSDKManager | null = null

export function getSDKManager(): GhostSpeakSDKManager {
  if (!sdkManager) {
    sdkManager = new GhostSpeakSDKManager()
  }
  return sdkManager
}

export function resetSDKManager(): void {
  sdkManager = null
}
