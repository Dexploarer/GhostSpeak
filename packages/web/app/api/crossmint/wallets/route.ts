import { NextResponse } from 'next/server'

const CROSSMINT_API_URL =
  process.env.CROSSMINT_API_URL ?? 'https://staging.crossmint.com/api/2022-06-09'
const CROSSMINT_API_KEY =
  process.env.CROSSMINT_SECRET_KEY ??
  process.env.CROSSMINT_SERVER_API_KEY ??
  process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

/**
 * POST /api/crossmint/wallets
 * Create a programmable wallet for an AI agent
 *
 * Required body:
 * - type: 'solana-mpc-wallet' | 'evm-smart-wallet'
 * - linkedUser: string (email or userId)
 */
export async function POST(req: Request) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API Key' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { type = 'solana-mpc-wallet', linkedUser } = body

    if (!linkedUser) {
      return NextResponse.json({ error: 'Missing linkedUser' }, { status: 400 })
    }

    // Create wallet via Crossmint API
    const response = await fetch(`${CROSSMINT_API_URL}/wallets`, {
      method: 'POST',
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        linkedUser,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Create Wallet Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to create wallet', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Create Wallet Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * GET /api/crossmint/wallets?walletId=xxx
 * Get wallet details
 */
export async function GET(req: Request) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API Key' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const walletId = searchParams.get('walletId')

    if (!walletId) {
      return NextResponse.json({ error: 'Missing walletId parameter' }, { status: 400 })
    }

    const response = await fetch(`${CROSSMINT_API_URL}/wallets/${walletId}`, {
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Get Wallet Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to get wallet', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get Wallet Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
