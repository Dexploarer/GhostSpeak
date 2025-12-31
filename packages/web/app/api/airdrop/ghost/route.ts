/**
 * Devnet GHOST Token Airdrop API Route
 *
 * Server-side endpoint to handle GHOST token airdrops.
 * Keeps the faucet private key secure on the server.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
} from '@solana/spl-token'

// Devnet configuration
const DEVNET_GHOST_MINT = new PublicKey('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh')
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
      return NextResponse.json(
        { error: 'Recipient address required' },
        { status: 400 }
      )
    }

    // Validate recipient address
    let recipientPubkey: PublicKey
    try {
      recipientPubkey = new PublicKey(recipient)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      )
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
          nextClaimIn: hoursRemaining
        },
        { status: 429 }
      )
    }

    // Load faucet wallet from environment
    const faucetPrivateKeyStr = process.env.DEVNET_FAUCET_PRIVATE_KEY
    if (!faucetPrivateKeyStr) {
      console.error('DEVNET_FAUCET_PRIVATE_KEY not configured')
      return NextResponse.json(
        { error: 'Airdrop service not configured' },
        { status: 500 }
      )
    }

    // Parse private key (should be array of numbers or base58)
    let faucetKeypair: Keypair
    try {
      // Try parsing as JSON array
      const keyArray = JSON.parse(faucetPrivateKeyStr)
      faucetKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray))
    } catch {
      // Try parsing as base58
      try {
        const decoded = Buffer.from(faucetPrivateKeyStr, 'base64')
        faucetKeypair = Keypair.fromSecretKey(decoded)
      } catch (error) {
        console.error('Failed to parse faucet private key')
        return NextResponse.json(
          { error: 'Airdrop service misconfigured' },
          { status: 500 }
        )
      }
    }

    // Connect to devnet
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Get faucet token account
    const faucetTokenAccount = await getAssociatedTokenAddress(
      DEVNET_GHOST_MINT,
      faucetKeypair.publicKey
    )

    // Check faucet balance
    try {
      const faucetAccount = await getAccount(connection, faucetTokenAccount)
      const faucetBalance = Number(faucetAccount.amount) / 10 ** DECIMALS

      if (faucetBalance < AIRDROP_AMOUNT) {
        console.error(`Faucet balance too low: ${faucetBalance} GHOST`)
        return NextResponse.json(
          {
            error: 'Faucet balance too low',
            message: 'Please contact the GhostSpeak team to refill the faucet',
            faucetBalance
          },
          { status: 503 }
        )
      }
    } catch (error) {
      console.error('Faucet token account not found:', error)
      return NextResponse.json(
        { error: 'Faucet not initialized' },
        { status: 500 }
      )
    }

    // Get or create recipient token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      faucetKeypair,
      DEVNET_GHOST_MINT,
      recipientPubkey
    )

    // Transfer tokens
    const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS)

    const signature = await transfer(
      connection,
      faucetKeypair,
      faucetTokenAccount,
      recipientTokenAccount.address,
      faucetKeypair.publicKey,
      amountWithDecimals
    )

    // Record claim
    recordClaim(recipient)

    // Get new balance
    const updatedAccount = await getAccount(connection, recipientTokenAccount.address)
    const newBalance = Number(updatedAccount.amount) / 10 ** DECIMALS

    return NextResponse.json({
      success: true,
      signature,
      amount: AIRDROP_AMOUNT,
      balance: newBalance,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      message: `Successfully airdropped ${AIRDROP_AMOUNT.toLocaleString()} GHOST tokens`
    })

  } catch (error: any) {
    console.error('Airdrop error:', error)

    return NextResponse.json(
      {
        error: 'Airdrop failed',
        message: error.message || 'Unknown error occurred'
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
      return NextResponse.json({
        status: 'error',
        message: 'Faucet not configured'
      }, { status: 500 })
    }

    // Parse faucet keypair
    let faucetKeypair: Keypair
    try {
      const keyArray = JSON.parse(faucetPrivateKeyStr)
      faucetKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray))
    } catch {
      try {
        const decoded = Buffer.from(faucetPrivateKeyStr, 'base64')
        faucetKeypair = Keypair.fromSecretKey(decoded)
      } catch {
        return NextResponse.json({
          status: 'error',
          message: 'Faucet misconfigured'
        }, { status: 500 })
      }
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    const faucetTokenAccount = await getAssociatedTokenAddress(
      DEVNET_GHOST_MINT,
      faucetKeypair.publicKey
    )

    const faucetAccount = await getAccount(connection, faucetTokenAccount)
    const balance = Number(faucetAccount.amount) / 10 ** DECIMALS

    return NextResponse.json({
      status: 'ok',
      faucetAddress: faucetKeypair.publicKey.toBase58(),
      balance,
      airdropAmount: AIRDROP_AMOUNT,
      claimsRemaining: Math.floor(balance / AIRDROP_AMOUNT)
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 })
  }
}
