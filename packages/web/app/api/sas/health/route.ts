/**
 * SAS API Health Check
 * GET /api/sas/health
 */

import { NextResponse } from 'next/server'

// Use Edge runtime
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		// Check if required environment variables are set
		const hasPayerKeypair = !!process.env.SAS_PAYER_KEYPAIR
		const hasAuthorityKeypair = !!process.env.SAS_AUTHORITY_KEYPAIR
		const hasAuthorizedSignerKeypair = !!process.env.SAS_AUTHORIZED_SIGNER_KEYPAIR
		const hasApiKey = !!process.env.SAS_API_KEY
		const cluster = process.env.SOLANA_CLUSTER || 'devnet'

		const allConfigured =
			hasPayerKeypair &&
			hasAuthorityKeypair &&
			hasAuthorizedSignerKeypair &&
			hasApiKey

		return NextResponse.json({
			healthy: allConfigured,
			timestamp: new Date().toISOString(),
			cluster,
			configuration: {
				payerKeypair: hasPayerKeypair,
				authorityKeypair: hasAuthorityKeypair,
				authorizedSignerKeypair: hasAuthorizedSignerKeypair,
				apiKey: hasApiKey,
			},
			runtime: 'edge',
		})
	} catch (error) {
		return NextResponse.json(
			{
				healthy: false,
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
