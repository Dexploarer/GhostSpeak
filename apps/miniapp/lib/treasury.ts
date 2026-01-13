/**
 * Treasury Configuration for Mini App
 *
 * Minimal treasury configuration copied from web app.
 * Used for transaction verification in lib/solana/transaction.ts
 */

// ─── TREASURY WALLET ─────────────────────────────────────────────────────────

export const TREASURY_WALLET = '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'

// ─── TOKEN ADDRESSES ─────────────────────────────────────────────────────────

export const TOKENS = {
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    symbol: 'USDC',
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    decimals: 9,
    symbol: 'SOL',
  },
  GHOST: {
    mint: 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump',
    decimals: 6,
    symbol: 'GHOST',
  },
}
