/**
 * x402 Shared Utilities
 *
 * logic for parsing Solana transactions to identify x402 payments.
 * Shared between Onboarding (historical analysis) and Indexer (live monitoring).
 */

export interface ParsedX402Payment {
  isX402Payment: boolean
  payer: string | null
  amount: string
  token: 'USDC' | 'SOL' | 'UNKNOWN'
  timestamp: number
  metadata?: Record<string, unknown>
  transferInstruction?: any // The raw instruction if needed
}

export const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'
export const MEMO_PROGRAM_ID_SUBSTRING = 'Memo'

/**
 * Parse a transaction to extract x402 payment details.
 *
 * @param transaction The 'jsonParsed' transaction object from Solana RPC
 * @param facilitatorAddress The address of the facilitator (recipient)
 * @param blockTime The block time of the transaction
 */
export function parseTransactionForPayment(
  transaction: any,
  facilitatorAddress: string,
  blockTime?: number | null,
  facilitatorAta?: string
): ParsedX402Payment {
  const instructions = transaction?.message?.instructions || []
  const timestamp = blockTime ? blockTime * 1000 : Date.now()

  let isX402Payment = false
  let transferIx: any = null
  let token: 'USDC' | 'SOL' | 'UNKNOWN' = 'UNKNOWN'

  // Scan instructions for transfer
  for (const ix of instructions) {
    const programId = (ix as any).programId?.toString()

    // 1. Check for SPL Token Transfer (USDC/etc)
    if (programId === SPL_TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID) {
      const parsed = (ix as any).parsed
      if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
        const destination = parsed.info?.destination
        // In SPL, destination is an ATA, but for simple x402 checks we might look at owner if available
        // Or if the facilitatorAddress IS the ATA.
        // For robustness, in the indexer we checked if destination === facilitatorAddress
        // NOTE: In strict SPL, destination is an Account.
        // If facilitatorAddress is the wallet, we need the ATA.
        // However, the previous indexer impl checked `destination === facilitatorAddress`.
        // This implies the facilitator config might be the ATA address for SPL?
        // OR the indexer logic was simplified.
        // Let's stick to the previous indexer logic for compatibility:
        if (
          destination === facilitatorAddress ||
          (facilitatorAta && destination === facilitatorAta)
        ) {
          isX402Payment = true
          transferIx = ix
          token = 'USDC' // Assumption based on usage, technically could be any token
          break
        }
      }
    }

    // 2. Check for System Transfer (SOL)
    if (programId === SYSTEM_PROGRAM_ID) {
      const parsed = (ix as any).parsed
      if (parsed?.type === 'transfer') {
        const destination = parsed.info?.destination
        if (destination === facilitatorAddress) {
          isX402Payment = true
          transferIx = ix
          token = 'SOL'
          break
        }
      }
    }
  }

  // If no payment found
  if (!isX402Payment || !transferIx) {
    return {
      isX402Payment: false,
      payer: null,
      amount: '0',
      token: 'UNKNOWN',
      timestamp,
    }
  }

  // Extract payment details
  const transferInfo = (transferIx as any).parsed.info
  const payerAddress = transferInfo.source
  const amount =
    transferInfo.amount || transferInfo.tokenAmount?.amount || transferInfo.lamports || '0'

  // Extract Memo Metadata (if any)
  const memoIx = instructions.find((ix: any) =>
    ix.programId?.toString()?.includes(MEMO_PROGRAM_ID_SUBSTRING)
  )

  let metadata: Record<string, unknown> | undefined

  if (memoIx) {
    try {
      let memoText: string
      if ((memoIx as any).parsed) {
        memoText = (memoIx as any).parsed
      } else {
        // Handle raw data if needed, but jsonParsed usually handles generic memos
        memoText = ''
      }

      if (memoText) {
        // Try parsing JSON
        metadata = JSON.parse(memoText)
      }
    } catch {
      // Ignore non-JSON memos
    }
  }

  return {
    isX402Payment: true,
    payer: payerAddress,
    amount: amount.toString(),
    token,
    timestamp,
    metadata,
    transferInstruction: transferIx,
  }
}
