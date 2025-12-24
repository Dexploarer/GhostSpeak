/**
 * Credential Verification API Route
 *
 * POST /api/credentials/verify - Verify a credential's authenticity
 */

import { NextRequest, NextResponse } from 'next/server'
import { CrossmintVCClient } from '@ghostspeak/sdk/credentials'

// Get environment variables
const CROSSMINT_API_KEY = process.env.CROSSMINT_SECRET_KEY
const CROSSMINT_ENVIRONMENT = process.env.CROSSMINT_API_URL?.includes('www.crossmint')
  ? 'production'
  : 'staging'

/**
 * POST /api/credentials/verify
 * Verify a credential's authenticity
 *
 * Body:
 * - credential: The full W3C Verifiable Credential object to verify
 */
export async function POST(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API key' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { credential } = body

    if (!credential) {
      return NextResponse.json({ error: 'Missing credential in request body' }, { status: 400 })
    }

    // Basic credential structure validation
    if (!credential['@context'] || !credential.type || !credential.issuer) {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Invalid credential structure: missing required fields (@context, type, issuer)',
        },
        { status: 400 }
      )
    }

    const client = new CrossmintVCClient({
      apiKey: CROSSMINT_API_KEY,
      environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
    })

    const result = await client.verifyCredential(credential)

    return NextResponse.json({
      isValid: result.isValid,
      errors: result.errors,
      verifiedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Verify credential error:', error)
    return NextResponse.json(
      {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to verify credential',
        type: 'verification_error',
      },
      { status: 500 }
    )
  }
}
