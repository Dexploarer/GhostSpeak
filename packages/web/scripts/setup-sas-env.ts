#!/usr/bin/env bun
/**
 * Setup SAS Environment Variables
 *
 * Generates base64-encoded keypairs for Vercel Edge environment
 */

async function main() {
	console.log('🔐 Setting up SAS Environment Variables\n')

	// Load existing keypairs
	const keypairsFile = await Bun.file('sas-keypairs.json')
	if (!(await keypairsFile.exists())) {
		console.error('❌ sas-keypairs.json not found!')
		console.log('   Run: bun run scripts/setup-sas.ts')
		process.exit(1)
	}

	const keypairs = await keypairsFile.json()

	// Convert to base64
	const payerBase64 = Buffer.from(keypairs.payer).toString('base64')
	const authorityBase64 = Buffer.from(keypairs.authority).toString('base64')
	const authorizedSignerBase64 = Buffer.from(keypairs.authorizedSigner1).toString(
		'base64'
	)

	// Generate random API key
	const apiKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
		'base64'
	)

	console.log('✅ Environment variables generated!\n')
	console.log('Add these to your Vercel project environment variables:')
	console.log('(Settings → Environment Variables)\n')

	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log('SAS_PAYER_KEYPAIR=')
	console.log(payerBase64)
	console.log('')

	console.log('SAS_AUTHORITY_KEYPAIR=')
	console.log(authorityBase64)
	console.log('')

	console.log('SAS_AUTHORIZED_SIGNER_KEYPAIR=')
	console.log(authorizedSignerBase64)
	console.log('')

	console.log('SAS_API_KEY=')
	console.log(apiKey)
	console.log('')

	console.log('SOLANA_CLUSTER=')
	console.log('devnet')
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

	console.log('Also add to Convex environment:')
	console.log('(https://dashboard.convex.dev)\n')
	console.log('SAS_API_KEY=' + apiKey)
	console.log('SAS_API_URL=https://ghostspeak.io/api/sas/issue\n')

	console.log('💡 For local development, add to .env.local:')
	const envContent = `
# SAS Configuration
SAS_PAYER_KEYPAIR=${payerBase64}
SAS_AUTHORITY_KEYPAIR=${authorityBase64}
SAS_AUTHORIZED_SIGNER_KEYPAIR=${authorizedSignerBase64}
SAS_API_KEY=${apiKey}
SOLANA_CLUSTER=devnet
`

	await Bun.write('.env.sas', envContent.trim())
	console.log('   ✅ Saved to .env.sas')
	console.log('   Copy these to .env.local for local testing\n')

	console.log('🎉 Setup complete!')
	console.log('\nNext steps:')
	console.log('1. Add environment variables to Vercel')
	console.log('2. Add SAS_API_KEY to Convex')
	console.log('3. Deploy: bunx convex env set SAS_API_KEY=<key>')
	console.log('4. Deploy: bunx convex env set SAS_API_URL=https://ghostspeak.io/api/sas/issue')
	console.log('5. Test: bun run scripts/test-sas-edge.ts')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n💥 Setup failed:', error.message)
		process.exit(1)
	})
