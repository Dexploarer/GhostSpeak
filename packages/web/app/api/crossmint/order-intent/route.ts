import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { paymentMethodId, mandates, jwt } = body

    if (!paymentMethodId || !jwt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Default to staging if not configured
    const apiUrl = process.env.CROSSMINT_API_URL || 'https://staging.crossmint.com/api'
    const apiKey = process.env.CROSSMINT_SECRET_KEY ?? process.env.CROSSMINT_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 })
    }

    // Proxy request to Crossmint
    const response = await fetch(`${apiUrl}/unstable/order-intents`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment: { paymentMethodId },
        mandates: mandates || [
          {
            type: "maxAmount",
            value: "100.00",
            details: { currency: "usd", period: "month" } // Default mandate
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
       console.error('Crossmint API Error:', data)
       return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Order Intent Proxy Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
