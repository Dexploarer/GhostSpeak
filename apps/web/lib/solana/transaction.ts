import { createServerSolanaClient } from './client'
import { TREASURY_WALLET, TOKENS } from '@/convex/lib/treasury'

interface VerifyResult {
  valid: boolean
  error?: string
}

// Define minimal transaction response shape
interface TransactionResponse {
  meta: {
    err: unknown | null
    preBalances: number[]
    postBalances: number[]
    preTokenBalances: Array<{
      mint: string
      owner: string
      uiTokenAmount: { uiAmount: number }
    }> | null
    postTokenBalances: Array<{
      mint: string
      owner: string
      uiTokenAmount: { uiAmount: number }
    }> | null
  } | null
  transaction: {
    message: {
      accountKeys: Array<string | { pubkey: string }>
    }
  }
}

export async function verifyTransaction(
  signature: string,
  expectedAmount: number,
  expectedToken: 'USDC' | 'SOL' | 'GHOST',
  _senderWallet: string
): Promise<VerifyResult> {
  const client = createServerSolanaClient()

  try {
    // 1. Fetch transaction
    // Using 'unknown' as intermediate cast to avoid branded type issues,
    // then casting to our defined interface

    const response = (await client.rpc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .getTransaction(signature as any, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      })
      .send()) as unknown as TransactionResponse

    if (!response) {
      return { valid: false, error: 'Transaction not found on-chain' }
    }

    if (response.meta?.err) {
      return { valid: false, error: 'Transaction failed on-chain' }
    }

    if (!response.meta) {
      return { valid: false, error: 'Transaction metadata missing' }
    }

    // 2. Verify Sender was involved (simplistic check, better to check signer)
    // For now we focus on Treasury receiving funds.

    // 3. Verify Treasury Received Funds
    const treasury = TREASURY_WALLET
    const mint = TOKENS[expectedToken].mint

    if (expectedToken === 'SOL') {
      // Check SOL balance change for treasury
      const accountKeys = response.transaction.message.accountKeys.map(
        (k: string | { pubkey: string }) => (typeof k === 'string' ? k : k.pubkey)
      )
      const treasuryIndex = accountKeys.findIndex((k: string) => k === treasury)

      if (treasuryIndex === -1) {
        return { valid: false, error: 'Treasury wallet not involved in transaction' }
      }

      const pre = response.meta.preBalances[treasuryIndex]
      const post = response.meta.postBalances[treasuryIndex]
      const diff = (post - pre) / Math.pow(10, 9) // SOL decimals = 9

      if (diff < expectedAmount - 0.000001) {
        return {
          valid: false,
          error: `Insufficient SOL deposit: received ${diff.toFixed(4)}, expected ${expectedAmount}`,
        }
      }
    } else {
      // Check Token Balance Change
      // Look at meta.postTokenBalances and meta.preTokenBalances
      const preBalanceEntry = response.meta?.preTokenBalances?.find(
        (b: { owner: string; mint: string }) => b.owner === treasury && b.mint === mint
      )
      const postBalanceEntry = response.meta?.postTokenBalances?.find(
        (b: { owner: string; mint: string }) => b.owner === treasury && b.mint === mint
      )

      const preAmount = preBalanceEntry?.uiTokenAmount?.uiAmount || 0
      const postAmount = postBalanceEntry?.uiTokenAmount?.uiAmount || 0
      const diff = postAmount - preAmount

      if (diff < expectedAmount - 0.000001) {
        return {
          valid: false,
          error: `Insufficient ${expectedToken} deposit: received ${diff.toFixed(2)}, expected ${expectedAmount}`,
        }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Verify transaction error:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to verify transaction',
    }
  }
}
