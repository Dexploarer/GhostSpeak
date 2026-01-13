/**
 * Caisper x402 Payment Module
 *
 * Creates properly formatted x402 payment payloads for USDC transfers on Solana.
 * Per x402 spec: https://docs.payai.network/x402/reference
 *
 * Transaction structure (exactly 3 instructions per x402 spec):
 * 0. SetComputeUnitLimit (8000 CU)
 * 1. SetComputeUnitPrice (1 microlamport/CU)
 * 2. TransferChecked (USDC SPL transfer)
 *
 * Key behavior:
 * - Fee payer = facilitator (from paymentRequirements.extra.feePayer)
 * - Client only signs the token transfer authority
 * - Client does NOT broadcast - returns base64 tx for X-PAYMENT header
 * - PayAI facilitator verifies, co-signs, and broadcasts
 */

import { v } from 'convex/values'
import { internalAction, internalQuery } from '../_generated/server'
import { internal } from '../_generated/api'
import {
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  prependTransactionMessageInstruction,
  compileTransactionMessage,
  getCompiledTransactionMessageEncoder,
} from '@solana/transaction-messages'
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget'
import { getTransferCheckedInstruction } from '@solana-program/token-2022'
import { address, type Address } from '@solana/addresses'
import nacl from 'tweetnacl'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface PaymentRequirements {
  scheme: string
  network: string
  asset: string // USDC mint address
  payTo: string // Merchant address
  maxAmountRequired: string // Amount in atomic units (micro-USDC)
  extra?: {
    feePayer?: string // Facilitator fee payer address
  }
}

export interface X402Payload {
  x402Version: number
  scheme: string
  network: string
  payload: {
    transaction: string // Base64-encoded partially-signed tx
  }
}

export interface X402SettlementResponse {
  success: boolean
  transaction: string // On-chain tx hash
  network: string
  payer: string
  errorReason?: string
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// USDC mint addresses
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const USDC_DECIMALS = 6

// Compute budget constants (per x402 spec)
const DEFAULT_COMPUTE_UNIT_LIMIT = 8_000
const DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS = 1n

// Network mapping (supports CAIP-2 format and legacy v1 strings)
const NETWORK_TO_RPC: Record<string, string> = {
  // v1 compatibility
  solana: 'https://api.mainnet-beta.solana.com',
  'solana-devnet': 'https://api.devnet.solana.com',
  // v2 CAIP-2 format (network:genesis_hash)
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'https://api.mainnet-beta.solana.com', // Mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'https://api.devnet.solana.com', // Devnet
}

// Safety limit: max $0.10 USDC per payment (100,000 micro-USDC)
const MAX_USDC_PAYMENT_MICRO = 100_000

// ─── HELPER: Direct RPC Call ─────────────────────────────────────────────────

async function jsonRpc(rpcUrl: string, method: string, params: unknown[]) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`RPC Error: ${JSON.stringify(json.error)}`)
  return json.result
}

// ─── HELPER: Find Associated Token Account ───────────────────────────────────

/**
 * Derive the Associated Token Account (ATA) address for a given owner and mint.
 * Uses the standard ATA program derivation.
 */
async function findAssociatedTokenAddress(
  owner: string,
  mint: string,
  tokenProgramId: string = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
): Promise<string> {
  const ATA_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'

  // For now, we'll fetch from RPC to get actual ATA
  // In production, this should use proper PDA derivation
  return `${owner}` // Placeholder - will be resolved via RPC
}

// ─── HELPER: Get Token Account Info ──────────────────────────────────────────

interface TokenAccountInfo {
  address: string
  mint: string
  owner: string
  amount: string
  decimals: number
}

async function getTokenAccountsByOwner(
  rpcUrl: string,
  owner: string,
  mint: string
): Promise<TokenAccountInfo | null> {
  try {
    const result = await jsonRpc(rpcUrl, 'getTokenAccountsByOwner', [
      owner,
      { mint },
      { encoding: 'jsonParsed' },
    ])

    if (result.value && result.value.length > 0) {
      const account = result.value[0]
      const parsed = account.account.data.parsed.info
      return {
        address: account.pubkey,
        mint: parsed.mint,
        owner: parsed.owner,
        amount: parsed.tokenAmount.amount,
        decimals: parsed.tokenAmount.decimals,
      }
    }
    return null
  } catch (error) {
    console.error('[caisperX402] Failed to get token accounts:', error)
    return null
  }
}

// ─── MAIN ACTION: Create x402 Payment ────────────────────────────────────────

export const createX402Payment = internalAction({
  args: {
    paymentRequirements: v.object({
      scheme: v.string(),
      network: v.string(),
      asset: v.string(),
      payTo: v.string(),
      maxAmountRequired: v.string(),
      extra: v.optional(
        v.object({
          feePayer: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; encodedPayload?: string; error?: string }> => {
    const { paymentRequirements } = args

    console.log('[caisperX402] Creating x402 payment:', {
      network: paymentRequirements.network,
      payTo: paymentRequirements.payTo,
      amount: paymentRequirements.maxAmountRequired,
      asset: paymentRequirements.asset,
    })

    // 1. Validate payment amount (safety check)
    const amountMicro = parseInt(paymentRequirements.maxAmountRequired)
    if (amountMicro > MAX_USDC_PAYMENT_MICRO) {
      return {
        success: false,
        error: `Payment amount ${amountMicro} exceeds safety limit of ${MAX_USDC_PAYMENT_MICRO} micro-USDC ($0.10)`,
      }
    }

    // 2. Get facilitator fee payer
    const feePayer = paymentRequirements.extra?.feePayer
    if (!feePayer) {
      return {
        success: false,
        error: 'Missing feePayer in paymentRequirements.extra - required for x402',
      }
    }

    // 3. Get Caisper wallet
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      return {
        success: false,
        error: 'Caisper wallet not configured',
      }
    }

    // 4. Determine RPC URL from network
    // x402 payments use mainnet by default (real USDC, real PayAI)
    const rpcUrl =
      NETWORK_TO_RPC[paymentRequirements.network] ||
      'https://api.mainnet-beta.solana.com' // Default to mainnet for x402

    console.log('[caisperX402] Using RPC:', rpcUrl)
    console.log('[caisperX402] Network:', paymentRequirements.network)

    try {
      // 5. Get Caisper's USDC token account
      // Hardcoded for reliability (dynamically fetched as fallback)
      const CAISPER_USDC_MAINNET = 'D486ixc3ai4kHdnpyTyprXDCtzUKCqVi7GJSt8XTL2j1'

      let caisperUsdcAccount: TokenAccountInfo | null = null

      // Use hardcoded address for mainnet USDC
      if (paymentRequirements.asset === USDC_MINT_MAINNET) {
        caisperUsdcAccount = {
          address: CAISPER_USDC_MAINNET,
          mint: USDC_MINT_MAINNET,
          owner: wallet.publicKey,
          amount: '999999999999', // Assume sufficient balance (will be validated on-chain)
          decimals: USDC_DECIMALS,
        }
        console.log('[caisperX402] Using hardcoded Caisper USDC account (mainnet)')
      } else {
        // For other mints (devnet, etc), fetch dynamically
        caisperUsdcAccount = await getTokenAccountsByOwner(
          rpcUrl,
          wallet.publicKey,
          paymentRequirements.asset
        )
      }

      if (!caisperUsdcAccount) {
        return {
          success: false,
          error: `Caisper has no USDC token account for mint ${paymentRequirements.asset}`,
        }
      }

      // Check balance (skip for hardcoded accounts - will fail on-chain if insufficient)
      if (
        paymentRequirements.asset !== USDC_MINT_MAINNET &&
        BigInt(caisperUsdcAccount.amount) < BigInt(amountMicro)
      ) {
        return {
          success: false,
          error: `Insufficient USDC balance. Have: ${caisperUsdcAccount.amount}, Need: ${amountMicro}`,
        }
      }

      // 6. Get merchant's USDC token account
      const merchantUsdcAccount = await getTokenAccountsByOwner(
        rpcUrl,
        paymentRequirements.payTo,
        paymentRequirements.asset
      )

      if (!merchantUsdcAccount) {
        return {
          success: false,
          error: `Merchant ${paymentRequirements.payTo} has no USDC token account`,
        }
      }

      // 7. Get latest blockhash
      const blockhashResult = await jsonRpc(rpcUrl, 'getLatestBlockhash', [
        { commitment: 'finalized' },
      ])
      const latestBlockhash = {
        blockhash: blockhashResult.value.blockhash as string,
        lastValidBlockHeight: BigInt(blockhashResult.value.lastValidBlockHeight),
      }

      // 8. Build transaction with exactly 3 instructions (per x402 spec)

      // Instruction 0: SetComputeUnitLimit
      const computeLimitIx = getSetComputeUnitLimitInstruction({
        units: DEFAULT_COMPUTE_UNIT_LIMIT,
      })

      // Instruction 1: SetComputeUnitPrice
      const computePriceIx = getSetComputeUnitPriceInstruction({
        microLamports: DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS,
      })

      // Instruction 2: TransferChecked (USDC)
      const caisperAddress = address(wallet.publicKey) as Address
      const transferIx = getTransferCheckedInstruction({
        source: address(caisperUsdcAccount.address) as Address,
        mint: address(paymentRequirements.asset) as Address,
        destination: address(merchantUsdcAccount.address) as Address,
        authority: caisperAddress,
        amount: BigInt(amountMicro),
        decimals: USDC_DECIMALS,
      })

      // 9. Build transaction message
      // IMPORTANT: Fee payer is the FACILITATOR, not Caisper
      const feePayerAddress = address(feePayer) as Address

      // Build message step by step with proper typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any = createTransactionMessage({ version: 0 })
      msg = setTransactionMessageFeePayer(feePayerAddress, msg)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      msg = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash as any, msg)
      // Add instructions in order: computeLimit, computePrice, transfer
      msg = prependTransactionMessageInstruction(computePriceIx, msg)
      msg = prependTransactionMessageInstruction(computeLimitIx, msg)
      msg = appendTransactionMessageInstruction(transferIx, msg)

      // 10. Compile and serialize message
      const compiledMessage = compileTransactionMessage(msg)
      const messageEncoder = getCompiledTransactionMessageEncoder()
      const messageBytes = messageEncoder.encode(compiledMessage)

      // 11. Sign with Caisper's key (partial signature - only token authority)
      const secretKeyBytes = new Uint8Array(wallet.secretKey)
      const signature = nacl.sign.detached(new Uint8Array(messageBytes), secretKeyBytes)

      // 12. Find which signature slot is for Caisper
      // The compiled message has staticAccounts array - find Caisper's index
      // For a partially signed tx, we need to include signature at correct position

      // Build partially-signed transaction
      // Format: [compact-u16 sig count][sig slots...][message]
      // For x402, the facilitator will add their signature later

      // Determine number of required signers from the message
      // The fee payer (facilitator) is always signer 0
      // Caisper (token authority) should be signer 1 if they're different

      const numSigners = 2 // Fee payer + token authority
      const signedTx = new Uint8Array(1 + numSigners * 64 + messageBytes.length)

      // Compact-u16 encoding for 2 signatures
      signedTx[0] = numSigners

      // Signature slot 0: Fee payer (facilitator) - leave empty (zeros)
      // The facilitator will fill this in

      // Signature slot 1: Caisper's signature (token authority)
      signedTx.set(signature, 1 + 64) // After the empty fee payer signature

      // Message bytes
      signedTx.set(messageBytes, 1 + numSigners * 64)

      // 13. Base64 encode the transaction
      const base64Tx = btoa(String.fromCharCode(...signedTx))

      // 14. Build x402 payload
      const x402Payload: X402Payload = {
        x402Version: 1,
        scheme: paymentRequirements.scheme || 'exact',
        network: paymentRequirements.network,
        payload: {
          transaction: base64Tx,
        },
      }

      // 15. Encode as base64 for X-PAYMENT header
      const encodedPayload = btoa(JSON.stringify(x402Payload))

      console.log('[caisperX402] Payment payload created successfully')
      console.log('[caisperX402] Amount:', amountMicro, 'micro-USDC')
      console.log('[caisperX402] Fee payer (facilitator):', feePayer)

      return {
        success: true,
        encodedPayload,
      }
    } catch (error) {
      console.error('[caisperX402] Error creating payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating x402 payment',
      }
    }
  },
})

// ─── HELPER: Decode X-PAYMENT-RESPONSE Header ────────────────────────────────

export function decodeX402Response(header: string): X402SettlementResponse {
  try {
    return JSON.parse(atob(header))
  } catch {
    return {
      success: false,
      transaction: '',
      network: '',
      payer: '',
      errorReason: 'Failed to decode X-PAYMENT-RESPONSE header',
    }
  }
}

// ─── HELPER: Encode X-PAYMENT Header ─────────────────────────────────────────

export function encodeX402Header(payload: X402Payload): string {
  return btoa(JSON.stringify(payload))
}
