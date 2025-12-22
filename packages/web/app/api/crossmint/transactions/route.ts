import { NextResponse } from 'next/server'

const CROSSMINT_API_URL = process.env.CROSSMINT_API_URL ?? 'https://staging.crossmint.com/api/2022-06-09'
const CROSSMINT_API_KEY = process.env.CROSSMINT_SECRET_KEY ?? process.env.CROSSMINT_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

/**
 * POST /api/crossmint/transactions
 * Create and sign a transaction for an agent wallet
 * 
 * Required body:
 * - walletId: string (the agent's Crossmint wallet ID)
 * - serializedTransaction: string (from order payment preparation)
 * - chain: string (e.g., 'solana', 'base-sepolia')
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
    const { walletId, serializedTransaction, chain = 'solana' } = body

    if (!walletId) {
      return NextResponse.json({ error: 'Missing walletId' }, { status: 400 })
    }

    if (!serializedTransaction) {
      return NextResponse.json({ error: 'Missing serializedTransaction' }, { status: 400 })
    }

    // Create transaction via Crossmint API
    const response = await fetch(`${CROSSMINT_API_URL}/wallets/${walletId}/transactions`, {
      method: 'POST',
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        params: {
          calls: [{
            transaction: serializedTransaction
          }],
          chain
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Create Transaction Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to create transaction', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Create Transaction Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/crossmint/transactions?walletId=xxx&transactionId=yyy
 * Get transaction status
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
    const transactionId = searchParams.get('transactionId')

    if (!walletId || !transactionId) {
      return NextResponse.json(
        { error: 'Missing walletId or transactionId parameter' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${CROSSMINT_API_URL}/wallets/${walletId}/transactions/${transactionId}`,
      {
        headers: {
          'X-API-KEY': CROSSMINT_API_KEY
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Get Transaction Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to get transaction', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get Transaction Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
