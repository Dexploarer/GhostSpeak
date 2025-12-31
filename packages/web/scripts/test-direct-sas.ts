#!/usr/bin/env bun
/**
 * Direct SAS test without Convex
 * This bypasses Convex entirely to verify SAS functionality works
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
	createTransaction,
} from 'gill'
import { issueAttestation } from '../lib/sas/attestations'
import { serializeCapabilities } from '../lib/sas/schemas'
import type { AgentIdentityData } from '../lib/sas/schemas'

const CLUSTER = 'devnet'

async function main() {
	console.log('🧪 Direct SAS Test (bypassing Convex)\n')

	// Load keypairs
	console.log('1. Loading SAS keypairs...')
	const saved = await Bun.file('sas-keypairs.json').json()
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer))
	const authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority))
	const authorizedSigner = await createKeyPairSignerFromBytes(new Uint8Array(saved.authorizedSigner1))

	console.log(`   Payer: ${payer.address}`)
	console.log(`   Authority: ${authority.address}\n`)

	// Create Solana client
	console.log('2. Creating Solana client...')
	const client = createSolanaClient({ urlOrMoniker: CLUSTER })

	// Build test credential data
	console.log('3. Building test credential...')
	const credentialData: AgentIdentityData = {
		agent: payer.address,
		did: `did:sol:${CLUSTER}:${payer.address}`,
		name: 'Direct SAS Test Agent',
		capabilities: serializeCapabilities(['testing', 'direct', 'bypass-convex']),
		x402Enabled: true,
		x402ServiceEndpoint: 'https://direct-test.ghostspeak.dev/x402',
		owner: payer.address,
		registeredAt: Math.floor(Date.now() / 1000),
		issuedAt: Math.floor(Date.now() / 1000),
	}

	console.log(`   Agent: ${credentialData.agent}`)
	console.log(`   DID: ${credentialData.did}`)
	console.log(`   Capabilities: ${credentialData.capabilities}\n`)

	// Issue attestation with unique nonce
	const uniqueNonce = `${payer.address}-${Date.now()}` as any
	console.log('4. Issuing attestation on-chain...')
	const { instruction, attestationPda, expiryTimestamp } = await issueAttestation({
		client,
		payer,
		authority,
		authorizedSigner,
		schemaType: 'AGENT_IDENTITY',
		data: credentialData as any,
		nonce: uniqueNonce,
		expiryDays: 365,
	})

	console.log(`   Attestation PDA: ${attestationPda}`)
	console.log(`   Expires: ${new Date(expiryTimestamp * 1000).toISOString()}\n`)

	// Get latest blockhash
	console.log('5. Building and sending transaction...')
	const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send()

	const tx = createTransaction({
		version: 'legacy',
		feePayer: payer,
		instructions: [instruction],
		latestBlockhash,
		computeUnitLimit: 300_000,
		computeUnitPrice: 1,
	})

	const signature = await client.sendAndConfirmTransaction(tx)

	console.log('   ✅ Transaction confirmed!')
	console.log(`   Signature: ${signature}`)
	console.log(`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`)

	// Verify attestation
	console.log('6. Verifying attestation...')
	const { verifyAttestation } = await import('../lib/sas/attestations')
	const result = await verifyAttestation({
		client,
		authority: authority.address,
		schemaType: 'AGENT_IDENTITY',
		nonce: uniqueNonce,
	})

	if (result?.isValid) {
		console.log('   ✅ ATTESTATION VERIFIED!')
		console.log(`   Agent: ${result.data.agent}`)
		console.log(`   Name: ${result.data.name}`)
		console.log(`   DID: ${result.data.did}`)
		console.log(`   Capabilities: ${result.data.capabilities}`)
		console.log(`   Expires: ${new Date(result.expiry! * 1000).toISOString()}\n`)

		console.log('🎉 SUCCESS! Direct SAS issuance works perfectly!')
		console.log('\n📍 Attestation Details:')
		console.log(`   PDA: ${attestationPda}`)
		console.log(`   View: https://explorer.solana.com/address/${attestationPda}?cluster=devnet`)
	} else {
		console.log('   ❌ Verification failed')
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n❌ Test failed:', error.message)
		if (error.stack) {
			console.error('\nStack trace:')
			console.error(error.stack)
		}
		process.exit(1)
	})
