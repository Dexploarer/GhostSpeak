#!/usr/bin/env bun
/**
 * Test SAS Edge API locally
 */

const API_KEY = process.env.SAS_API_KEY || 'IGJaAXUw2CjbE8hNXnu07myYsZCoLK9swSccXhlpMBs='
const API_URL = 'http://localhost:3001/api/sas/issue'

async function main() {
	console.log('🧪 Testing SAS Edge API locally\n')

	// Generate a test agent address
	const { generateKeyPairSigner } = await import('gill')
	const testAgent = await generateKeyPairSigner()
	const agentAddress = testAgent.address

	console.log('Test Agent:', agentAddress)
	console.log('API URL:', API_URL)
	console.log()

	// Test data
	const requestData = {
		schemaType: 'AGENT_IDENTITY',
		data: {
			agent: agentAddress,
			did: `did:sol:devnet:${agentAddress}`,
			name: 'Test Agent',
			capabilities: 'testing,local,edge-api',
			x402Enabled: true,
			x402ServiceEndpoint: 'http://localhost:3001/api/x402',
			owner: agentAddress,
			registeredAt: Math.floor(Date.now() / 1000),
			issuedAt: Math.floor(Date.now() / 1000),
		},
		nonce: agentAddress,
		expiryDays: 365,
	}

	console.log('📤 Issuing Agent Identity credential...')
	console.log('Request:', JSON.stringify(requestData, null, 2))
	console.log()

	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': API_KEY,
			},
			body: JSON.stringify(requestData),
		})

		const result = await response.json()

		if (!response.ok) {
			console.error('❌ Edge API error:', result)
			process.exit(1)
		}

		console.log('✅ Success!')
		console.log('Response:', JSON.stringify(result, null, 2))
		console.log()
		console.log('Attestation PDA:', result.attestationPda)
		console.log('Transaction Signature:', result.signature)
		console.log('Expiry:', new Date(result.expiry * 1000).toISOString())
	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}

	console.log('\n🎉 SAS Edge API test completed!')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n💥 Test failed:', error.message)
		process.exit(1)
	})
