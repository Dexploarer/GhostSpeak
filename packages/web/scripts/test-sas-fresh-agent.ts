#!/usr/bin/env bun
/**
 * Test SAS with a brand new agent (fresh keypair)
 * This avoids potential nonce collision issues
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import { generateKeyPairSigner, createSolanaClient } from 'gill'
import { verifyAttestation } from '../lib/sas/attestations'

const CLUSTER = 'devnet'
const convexUrl = 'https://enduring-porpoise-79.convex.cloud'

async function main() {
	console.log('🧪 Testing SAS with Fresh Agent Address\n')

	// Generate a completely new agent keypair
	console.log('1. Generating fresh agent keypair...')
	const newAgent = await generateKeyPairSigner()
	console.log(`   New Agent: ${newAgent.address}\n`)

	// Load authority keypair for verification
	console.log('2. Loading authority keypair...')
	const saved = await Bun.file('sas-keypairs.json').json()
	const { createKeyPairSignerFromBytes } = await import('gill')
	const authority = await createKeyPairSignerFromBytes(
		new Uint8Array(saved.authority)
	)
	console.log(`   Authority: ${authority.address}\n`)

	// Connect to Convex
	console.log('3. Connecting to Convex...')
	const client = new ConvexHttpClient(convexUrl)
	console.log(`   Connected to: ${convexUrl}\n`)

	// Create test data with the fresh agent
	const testData = {
		agentAddress: newAgent.address,
		did: `did:sol:${CLUSTER}:${newAgent.address}`,
		name: 'Fresh Test Agent',
		capabilities: ['testing', 'fresh', 'new-address'],
		x402Enabled: true,
		x402ServiceEndpoint: 'https://fresh-test.ghostspeak.dev/x402',
		owner: newAgent.address,
		registeredAt: Math.floor(Date.now() / 1000),
	}

	console.log('4. Issuing Agent Identity credential via Convex...')
	console.log(`   Agent: ${testData.agentAddress}`)
	console.log(`   DID: ${testData.did}`)
	console.log(`   Capabilities: ${testData.capabilities.join(', ')}\n`)

	try {
		// Call Convex action to issue credential
		const result = await client.action(
			api.testSasIntegration.testIssueAgentIdentityCredential,
			testData
		)

		if (!result.success) {
			throw new Error(`Credential issuance failed: ${result.error}`)
		}

		console.log('   ✅ Credential issued successfully!')
		console.log(`   Attestation PDA: ${result.attestationPda}`)
		console.log(`   Transaction: ${result.signature}`)
		console.log(
			`   Explorer: https://explorer.solana.com/address/${result.attestationPda}?cluster=devnet\n`
		)

		// Verify on-chain
		console.log('5. Verifying attestation on-chain...')
		const solanaClient = createSolanaClient({ urlOrMoniker: CLUSTER })

		const verification = await verifyAttestation({
			client: solanaClient,
			authority: authority.address,
			schemaType: 'AGENT_IDENTITY',
			nonce: newAgent.address as any,
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
		console.log(
			`   Expires: ${new Date(verification.expiry! * 1000).toISOString()}\n`
		)

		console.log('🎉 SUCCESS! Fresh agent attestation created and verified!')
		console.log('\n✅ This proves:')
		console.log('   - Database configuration works')
		console.log('   - Convex can issue attestations')
		console.log('   - On-chain transactions succeed')
		console.log('   - Verification works perfectly')
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
		console.error('\n💥 Test failed')
		process.exit(1)
	})
