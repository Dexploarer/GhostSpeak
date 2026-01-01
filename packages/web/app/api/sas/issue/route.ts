/**
 * SAS (Solana Attestation Service) API - Issue Credentials
 *
 * Vercel Edge Runtime endpoint for issuing on-chain verifiable credentials.
 * Called by Convex actions to issue SAS attestations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSolanaClient, createTransaction } from 'gill'
import { issueAttestation } from '@/lib/sas/attestations'
import type { CredentialData } from '@/lib/sas/schemas'
import { address } from '@solana/addresses'

// Use Edge runtime for Web Crypto API support (required by Solana v5)
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Validate API key from request
 */
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.SAS_API_KEY

  if (!expectedKey) {
    console.error('[SAS API] SAS_API_KEY not configured')
    return false
  }

  return apiKey === expectedKey
}

/**
 * Load SAS configuration from environment
 */
async function getSASConfig() {
  const cluster = (process.env.SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta'

  // Load keypairs from environment (base64 encoded)
  const payerKeypair = process.env.SAS_PAYER_KEYPAIR
  const authorityKeypair = process.env.SAS_AUTHORITY_KEYPAIR
  const authorizedSignerKeypair = process.env.SAS_AUTHORIZED_SIGNER_KEYPAIR

  if (!payerKeypair || !authorityKeypair || !authorizedSignerKeypair) {
    throw new Error('SAS keypairs not configured in environment')
  }

  // Decode base64 keypairs to Uint8Array
  const payerBytes = Uint8Array.from(Buffer.from(payerKeypair, 'base64'))
  const authorityBytes = Uint8Array.from(Buffer.from(authorityKeypair, 'base64'))
  const authorizedSignerBytes = Uint8Array.from(Buffer.from(authorizedSignerKeypair, 'base64'))

  // Create Solana client and signers
  const client = createSolanaClient({
    urlOrMoniker: cluster === 'devnet' ? 'devnet' : 'mainnet',
  })
  const payer = await createKeyPairSignerFromBytes(payerBytes)
  const authority = await createKeyPairSignerFromBytes(authorityBytes)
  const authorizedSigner = await createKeyPairSignerFromBytes(authorizedSignerBytes)

  return { client, payer, authority, authorizedSigner, cluster }
}

/**
 * POST /api/sas/issue
 *
 * Issue a SAS attestation (verifiable credential) on-chain
 *
 * Request body:
 * {
 *   schemaType: 'AGENT_IDENTITY' | 'REPUTATION_TIER' | 'PAYMENT_MILESTONE' | 'VERIFIED_STAKER' | 'VERIFIED_HIRE',
 *   data: CredentialData,
 *   nonce: string,
 *   expiryDays?: number
 * }
 *
 * Response:
 * {
 *   success: true,
 *   attestationPda: string,
 *   signature: string,
 *   expiry: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { schemaType, data, nonce, expiryDays } = body

    if (!schemaType || !data || !nonce) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: schemaType, data, nonce' },
        { status: 400 }
      )
    }

    // Validate schemaType
    const validSchemaTypes = [
      'AGENT_IDENTITY',
      'REPUTATION_TIER',
      'PAYMENT_MILESTONE',
      'VERIFIED_STAKER',
      'VERIFIED_HIRE',
    ]
    if (!validSchemaTypes.includes(schemaType)) {
      return NextResponse.json(
        { success: false, error: `Invalid schemaType: ${schemaType}` },
        { status: 400 }
      )
    }

    console.log('[SAS API] Issuing credential:', {
      schemaType,
      nonce: nonce.slice(0, 8),
    })

    // Load SAS configuration
    const config = await getSASConfig()

    // Issue attestation on-chain
    const { instruction, attestationPda, expiryTimestamp } = await issueAttestation({
      client: config.client,
      payer: config.payer,
      authority: config.authority,
      authorizedSigner: config.authorizedSigner,
      schemaType,
      data: data as CredentialData,
      nonce: address(nonce as string),
      expiryDays,
    })

    // Get latest blockhash
    const { value: latestBlockhash } = await config.client.rpc.getLatestBlockhash().send()

    // Build and send transaction
    const tx = createTransaction({
      version: 'legacy' as const,
      feePayer: config.payer,
      instructions: [instruction],
      latestBlockhash: latestBlockhash,
      computeUnitLimit: 300_000,
      computeUnitPrice: 1,
    })

    const signature = await config.client.sendAndConfirmTransaction(tx)

    console.log('[SAS API] Credential issued successfully:', {
      attestationPda,
      signature,
      schemaType,
    })

    return NextResponse.json({
      success: true,
      attestationPda,
      signature,
      expiry: expiryTimestamp,
    })
  } catch (error) {
    console.error('[SAS API] Failed to issue credential:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
