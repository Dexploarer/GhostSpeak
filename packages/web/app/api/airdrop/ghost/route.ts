/**
 * Devnet GHOST Token Airdrop API Route
 *
 * Server-side endpoint to handle GHOST token airdrops.
 * Keeps the faucet private key secure on the server.
 *
 * Fully migrated to Solana v5 with @solana-program/token
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSolanaRpc } from '@solana/rpc'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import {
  getCreateAssociatedTokenInstructionAsync,
  getTransferInstruction,
  fetchToken,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token'
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  pipe,
} from '@solana/kit'
import { signAndSendTransactionMessageWithSigners } from '@solana/signers'

// Devnet configuration
const DEVNET_GHOST_MINT = address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh')
const DECIMALS = 6
const AIRDROP_AMOUNT = 10000 // 10,000 GHOST per request
const RATE_LIMIT_HOURS = 24

// In-memory rate limiting (consider using Redis in production)
const rateLimitMap = new Map<string, number>()

function checkRateLimit(wallet: string): boolean {
  const lastClaim = rateLimitMap.get(wallet)
  if (!lastClaim) return true

  const hoursSinceClaim = (Date.now() - lastClaim) / (1000 * 60 * 60)
  return hoursSinceClaim >= RATE_LIMIT_HOURS
}

function recordClaim(wallet: string) {
  rateLimitMap.set(wallet, Date.now())
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipient } = body

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient address required' }, { status: 400 })
    }

    // Validate recipient address
    let recipientAddress: Address
    try {
      recipientAddress = address(recipient)
    } catch {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 })
    }

    // Check rate limit
    if (!checkRateLimit(recipient)) {
      const lastClaim = rateLimitMap.get(recipient)
      const hoursRemaining = lastClaim
        ? Math.ceil(RATE_LIMIT_HOURS - (Date.now() - lastClaim) / (1000 * 60 * 60))
        : 0

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Please wait ${hoursRemaining} hour(s) before claiming again`,
          nextClaimIn: hoursRemaining,
        },
        { status: 429 }
      )
    }

    // Load faucet wallet from environment
    const faucetPrivateKeyStr = process.env.DEVNET_FAUCET_PRIVATE_KEY
    if (!faucetPrivateKeyStr) {
      console.error('DEVNET_FAUCET_PRIVATE_KEY not configured')
      return NextResponse.json({ error: 'Airdrop service not configured' }, { status: 500 })
    }

    // Parse private key (should be array of numbers or base64)
    let faucetKeypair
    try {
      // Try parsing as JSON array
      const keyArray = JSON.parse(faucetPrivateKeyStr)
      faucetKeypair = await createKeyPairSignerFromBytes(new Uint8Array(keyArray))
    } catch {
      // Try parsing as base64
      try {
        const decoded = Buffer.from(faucetPrivateKeyStr, 'base64')
        faucetKeypair = await createKeyPairSignerFromBytes(decoded)
      } catch {
        console.error('Failed to parse faucet private key')
        return NextResponse.json({ error: 'Airdrop service misconfigured' }, { status: 500 })
      }
    }

    // Connect to devnet
    const rpc = createSolanaRpc(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    )

    // Get faucet token account
    const [faucetTokenAccount] = await findAssociatedTokenPda({
      mint: DEVNET_GHOST_MINT,
      owner: faucetKeypair.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Check faucet balance
    try {
      const faucetAccount = await fetchToken(rpc, faucetTokenAccount)
      const faucetBalance = Number(faucetAccount.data.amount) / 10 ** DECIMALS

      if (faucetBalance < AIRDROP_AMOUNT) {
        console.error(`Faucet balance too low: ${faucetBalance} GHOST`)
        return NextResponse.json(
          {
            error: 'Faucet balance too low',
            message: 'Please contact the GhostSpeak team to refill the faucet',
            faucetBalance,
          },
          { status: 503 }
        )
      }
    } catch {
      console.error('Faucet token account not found')
      return NextResponse.json({ error: 'Faucet not initialized' }, { status: 500 })
    }

    // Get recipient token account
    const [recipientTokenAccount] = await findAssociatedTokenPda({
      mint: DEVNET_GHOST_MINT,
      owner: recipientAddress,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Build transaction
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    // Create ATA instruction (idempotent - no-op if already exists)
    const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
      payer: faucetKeypair,
      mint: DEVNET_GHOST_MINT,
      owner: recipientAddress,
      ata: recipientTokenAccount,
    })

    // Create transfer instruction
    const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS)
    const transferInstruction = getTransferInstruction({
      source: faucetTokenAccount,
      destination: recipientTokenAccount,
      authority: faucetKeypair,
      amount: amountWithDecimals,
    })

    // Build, sign, and send transaction
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(faucetKeypair, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstruction(createAtaInstruction, tx),
      (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
    )

    // Sign and send transaction
    const signature = await signAndSendTransactionMessageWithSigners(transactionMessage)
    console.log('[Airdrop] Transaction sent:', signature)

    // Record claim
    recordClaim(recipient)

    // Get new balance
    const updatedAccount = await fetchToken(rpc, recipientTokenAccount)
    const newBalance = Number(updatedAccount.data.amount) / 10 ** DECIMALS

    return NextResponse.json({
      success: true,
      signature,
      amount: AIRDROP_AMOUNT,
      balance: newBalance,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      message: `Successfully airdropped ${AIRDROP_AMOUNT.toLocaleString()} GHOST tokens`,
    })
  } catch (error: unknown) {
    console.error('Airdrop error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        error: 'Airdrop failed',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

// Optional: Health check endpoint
export async function GET() {
  try {
    const faucetPrivateKeyStr = process.env.DEVNET_FAUCET_PRIVATE_KEY

    if (!faucetPrivateKeyStr) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Faucet not configured',
        },
        { status: 500 }
      )
    }

    // Parse faucet keypair
    let faucetKeypair
    try {
      const keyArray = JSON.parse(faucetPrivateKeyStr)
      faucetKeypair = await createKeyPairSignerFromBytes(new Uint8Array(keyArray))
    } catch {
      try {
        const decoded = Buffer.from(faucetPrivateKeyStr, 'base64')
        faucetKeypair = await createKeyPairSignerFromBytes(decoded)
      } catch {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Faucet misconfigured',
          },
          { status: 500 }
        )
      }
    }

    const rpc = createSolanaRpc(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    )

    const [faucetTokenAccount] = await findAssociatedTokenPda({
      mint: DEVNET_GHOST_MINT,
      owner: faucetKeypair.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    const faucetAccount = await fetchToken(rpc, faucetTokenAccount)
    const balance = Number(faucetAccount.data.amount) / 10 ** DECIMALS

    return NextResponse.json({
      status: 'ok',
      faucetAddress: faucetKeypair.address,
      balance,
      airdropAmount: AIRDROP_AMOUNT,
      claimsRemaining: Math.floor(balance / AIRDROP_AMOUNT),
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
