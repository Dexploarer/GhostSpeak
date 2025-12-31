#!/usr/bin/env bun
/**
 * Verify the existing SAS attestation
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
} from 'gill'
import { verifyAttestation } from '../lib/sas/attestations'
import { parseCapabilities } from '../lib/sas/schemas'

const CLUSTER = 'devnet'

async function main() {
	console.log('🔍 Verifying Existing SAS Attestation\n')

	// Load keypairs
	console.log('1. Loading SAS keypairs...')
	const saved = await Bun.file('sas-keypairs.json').json()
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer))
	const authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority))

	console.log(`   Payer/Agent: ${payer.address}`)
	console.log(`   Authority: ${authority.address}\n`)

	// Create Solana client
	console.log('2. Creating Solana client...')
	const client = createSolanaClient({ urlOrMoniker: CLUSTER })

	// Verify existing attestation
	console.log('3. Verifying existing attestation...')
	const result = await verifyAttestation({
		client,
		authority: authority.address,
		schemaType: 'AGENT_IDENTITY',
		nonce: payer.address as any,
	})

	if (result?.isValid) {
		console.log('   ✅ ATTESTATION VERIFIED!\n')
		console.log('📋 Attestation Details:')
		console.log(`   Agent: ${result.data.agent}`)
		console.log(`   Name: ${result.data.name}`)
		console.log(`   DID: ${result.data.did}`)

		const caps = parseCapabilities(result.data.capabilities as string)
		console.log(`   Capabilities: ${caps.join(', ')}`)
		console.log(`   X402 Enabled: ${result.data.x402Enabled}`)
		console.log(`   X402 Endpoint: ${result.data.x402ServiceEndpoint}`)
		console.log(`   Owner: ${result.data.owner}`)
		console.log(`   Registered: ${new Date(Number(result.data.registeredAt) * 1000).toISOString()}`)
		console.log(`   Issued: ${new Date(Number(result.data.issuedAt) * 1000).toISOString()}`)
		console.log(`   Expires: ${new Date(Number(result.expiry!) * 1000).toISOString()}\n`)

		console.log('🎉 SUCCESS! SAS attestation verified on-chain!')
		console.log('\nThis proves:')
		console.log('✅ SAS infrastructure is working')
		console.log('✅ Schemas are deployed correctly')
		console.log('✅ Attestations can be verified')
		console.log('✅ Data serialization/deserialization works')
		console.log('\nThe only remaining issue is Convex environment variable visibility.')
	} else {
		console.log('   ❌ No valid attestation found')
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n❌ Verification failed:', error.message)
		process.exit(1)
	})
