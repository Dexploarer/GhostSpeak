/**
 * Verifiable Credentials API Routes
 *
 * POST /api/credentials - Issue a new credential
 * GET /api/credentials?id=XXX - Get a credential by ID
 * DELETE /api/credentials?id=XXX - Revoke a credential
 */

import { NextRequest, NextResponse } from 'next/server'
import { CrossmintVCClient } from '@ghostspeak/sdk/credentials'

// Get environment variables
const CROSSMINT_API_KEY = process.env.CROSSMINT_SECRET_KEY
const CROSSMINT_ENVIRONMENT = process.env.CROSSMINT_API_URL?.includes('www.crossmint')
  ? 'production'
  : 'staging'

// Template IDs - should be set after creating templates via admin panel or init script
const TEMPLATE_IDS = {
  agentIdentity: process.env.CROSSMINT_AGENT_TEMPLATE_ID || '',
  reputation: process.env.CROSSMINT_REPUTATION_TEMPLATE_ID || '',
  jobCompletion: process.env.CROSSMINT_JOB_TEMPLATE_ID || '',
}

/**
 * POST /api/credentials
 * Issue a new credential
 *
 * Body:
 * - type: 'agent' | 'reputation' | 'job'
 * - recipientEmail: string
 * - subject: credential subject data
 * - expiresAt?: string (optional, ISO date)
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
    const { type, recipientEmail, subject, expiresAt } = body

    if (!type || !recipientEmail || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipientEmail, subject' },
        { status: 400 }
      )
    }

    // Validate credential type
    if (!['agent', 'reputation', 'job'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid credential type. Must be: agent, reputation, or job' },
        { status: 400 }
      )
    }

    // Get the appropriate template ID
    const templateId =
      type === 'agent'
        ? TEMPLATE_IDS.agentIdentity
        : type === 'reputation'
          ? TEMPLATE_IDS.reputation
          : TEMPLATE_IDS.jobCompletion

    if (!templateId) {
      return NextResponse.json(
        {
          error: `Template for ${type} credentials not configured`,
          hint: 'Set CROSSMINT_<TYPE>_TEMPLATE_ID environment variable after creating templates',
        },
        { status: 500 }
      )
    }

    // Initialize the client - using base-sepolia for VCs (Crossmint doesn't support Solana for VCs)
    const client = new CrossmintVCClient({
      apiKey: CROSSMINT_API_KEY,
      environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
      chain: 'base-sepolia',
    })

    // Issue the credential based on type
    let credential
    switch (type) {
      case 'agent':
        credential = await client.issueAgentCredential(
          templateId,
          recipientEmail,
          subject as Record<string, unknown>,
          expiresAt
        )
        break
      case 'reputation':
        credential = await client.issueReputationCredential(
          templateId,
          recipientEmail,
          subject as Record<string, unknown>,
          expiresAt
        )
        break
      case 'job':
        credential = await client.issueJobCompletionCredential(
          templateId,
          recipientEmail,
          subject as Record<string, unknown>,
          expiresAt
        )
        break
    }

    return NextResponse.json({
      success: true,
      credential,
      message: `${type} credential issued successfully`,
    })
  } catch (error) {
    console.error('Issue credential error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to issue credential',
        type: 'credential_issuance_error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/credentials?id=XXX
 * Retrieve a credential by ID
 */
export async function GET(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API key' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const credentialId = searchParams.get('id')

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID parameter' }, { status: 400 })
    }

    const client = new CrossmintVCClient({
      apiKey: CROSSMINT_API_KEY,
      environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
    })

    const credential = await client.getCredential(credentialId)

    return NextResponse.json({
      success: true,
      credential,
    })
  } catch (error) {
    console.error('Get credential error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get credential',
        type: 'credential_retrieval_error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/credentials?id=XXX
 * Revoke a credential
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API key' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const credentialId = searchParams.get('id')

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID parameter' }, { status: 400 })
    }

    const client = new CrossmintVCClient({
      apiKey: CROSSMINT_API_KEY,
      environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
    })

    const result = await client.revokeCredential(credentialId)

    return NextResponse.json({
      success: true,
      result,
      message: 'Credential revoked successfully',
    })
  } catch (error) {
    console.error('Revoke credential error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to revoke credential',
        type: 'credential_revocation_error',
      },
      { status: 500 }
    )
  }
}
