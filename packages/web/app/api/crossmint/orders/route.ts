import { NextResponse } from 'next/server'

// Crossmint API base URL - append api path if not present
const BASE_URL = process.env.CROSSMINT_API_URL ?? 'https://staging.crossmint.com'
const CROSSMINT_API_URL = BASE_URL.includes('/api') ? BASE_URL : `${BASE_URL}/api/2022-06-09`
const CROSSMINT_API_KEY =
  process.env.CROSSMINT_SECRET_KEY ??
  process.env.CROSSMINT_SERVER_API_KEY ??
  process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

/**
 * POST /api/crossmint/orders
 * Create a purchase order for agentic commerce
 *
 * Required body:
 * - recipient: { email, physicalAddress? }
 * - lineItems: [{ productLocator: string }]
 * - payment: { method, currency, payerAddress? }
 *
 * Optional:
 * - locale: string (default: 'en-US')
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
    const { recipient, lineItems, payment, locale = 'en-US' } = body

    // Validate required fields
    if (!recipient?.email) {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 })
    }

    if (!lineItems?.length) {
      return NextResponse.json({ error: 'Missing line items' }, { status: 400 })
    }

    if (!payment?.method) {
      return NextResponse.json({ error: 'Missing payment method' }, { status: 400 })
    }

    // Create order via Crossmint API
    const response = await fetch(`${CROSSMINT_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient,
        lineItems,
        payment,
        locale,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Create Order Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to create order', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Create Order Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * GET /api/crossmint/orders?orderId=xxx
 * Get order status for tracking
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
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 })
    }

    const response = await fetch(`${CROSSMINT_API_URL}/orders/${orderId}`, {
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Crossmint Get Order Error:', data)
      return NextResponse.json(
        { error: data.message ?? 'Failed to get order', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get Order Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
