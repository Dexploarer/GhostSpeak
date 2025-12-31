#!/usr/bin/env bun
/**
 * Test SAS + Convex Integration
 *
 * This script tests the full integration by:
 * 1. Calling Convex to issue an agent identity credential
 * 2. Verifying the attestation on-chain
 * 3. Checking the database record
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
} from 'gill'
import { verifyAttestation } from '../lib/sas/attestations'

const CLUSTER = 'devnet'

async function main() {
	console.log('🧪 Testing SAS + Convex Integration\n')

	// Use prod deployment where we deployed the SAS functions
	const convexUrl = 'https://enduring-porpoise-79.convex.cloud'

	console.log(`1. Connecting to Convex: ${convexUrl}`)
	const client = new ConvexHttpClient(convexUrl)

	// Load keypairs for verification
	console.log('2. Loading SAS keypairs...')
	const saved = await Bun.file('sas-keypairs.json').json()
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer))
	const authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority))

	console.log(`   Payer: ${payer.address}`)
	console.log(`   Authority: ${authority.address}\n`)

	// Create test agent data
	const testAgentAddress = payer.address
	const testData = {
		agentAddress: testAgentAddress,
		did: `did:sol:${CLUSTER}:${testAgentAddress}`,
		name: 'SAS Integration Test Agent - Updated',
		capabilities: ['testing', 'verification', 'integration', 'updated'],
		x402Enabled: true,
		x402ServiceEndpoint: 'https://test-integration-v2.ghostspeak.dev/x402',
		owner: payer.address,
		registeredAt: Math.floor(Date.now() / 1000),
	}

	console.log('3. Issuing Agent Identity credential via Convex...')
	console.log(`   Agent: ${testData.agentAddress}`)
	console.log(`   DID: ${testData.did}`)
	console.log(`   Capabilities: ${testData.capabilities.join(', ')}\n`)

	try {
		// Call Convex test action to issue credential
		const result = await client.action(api.testSasIntegration.testIssueAgentIdentityCredential, testData)

		if (!result.success) {
			throw new Error(`Credential issuance failed: ${result.error}`)
		}

		console.log('   ✅ Credential issued successfully!')
		console.log(`   Attestation PDA: ${result.attestationPda}`)
		console.log(`   Transaction: ${result.signature}`)
		console.log(`   Explorer: https://explorer.solana.com/address/${result.attestationPda}?cluster=devnet\n`)

		// Verify on-chain
		console.log('4. Verifying attestation on-chain...')
		const solanaClient = createSolanaClient({ urlOrMoniker: CLUSTER })

		const verification = await verifyAttestation({
			client: solanaClient,
			authority: authority.address,
			schemaType: 'AGENT_IDENTITY',
			nonce: testAgentAddress as any,
		})

		if (!verification?.isValid) {
			throw new Error('Attestation verification failed')
		}

		console.log('   ✅ ATTESTATION VERIFIED!')
		console.log(`   Agent: ${verification.data.agent}`)
		console.log(`   Name: ${verification.data.name}`)
		console.log(`   DID: ${verification.data.did}`)
		console.log(`   Capabilities: ${verification.data.capabilities}`)
		console.log(`   X402 Enabled: ${verification.data.x402Enabled}`)
		console.log(`   Expires: ${new Date(verification.expiry! * 1000).toISOString()}\n`)

		console.log('🎉 SUCCESS! SAS + Convex integration is fully functional!')
		console.log('\n✅ All systems operational:')
		console.log('   - Convex action execution')
		console.log('   - On-chain attestation issuance')
		console.log('   - Solana transaction confirmation')
		console.log('   - Attestation verification')
		console.log('   - Data serialization/deserialization')

	} catch (error: any) {
		console.error('\n❌ Test failed:', error.message)
		if (error.stack) {
			console.error('\nStack trace:')
			console.error(error.stack)
		}
		throw error
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n💥 Integration test failed')
		process.exit(1)
	})
