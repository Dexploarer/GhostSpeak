#!/usr/bin/env bun
/**
 * Setup SAS Configuration in Convex Database
 * Loads keypairs from sas-keypairs.json and stores them in Convex
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const CLUSTER = 'devnet'
const convexUrl = 'https://enduring-porpoise-79.convex.cloud'

async function main() {
	console.log('🔧 Setting up SAS Configuration in Convex Database\n')

	// Load keypairs from file
	console.log('1. Loading SAS keypairs from file...')
	const keypairs = await Bun.file('sas-keypairs.json').json()

	console.log(`   ✅ Loaded keypairs`)
	console.log(`   Payer: ${keypairs.payer.length} bytes`)
	console.log(`   Authority: ${keypairs.authority.length} bytes`)
	console.log(`   Authorized Signer: ${keypairs.authorizedSigner1.length} bytes\n`)

	// Connect to Convex
	console.log('2. Connecting to Convex...')
	const client = new ConvexHttpClient(convexUrl)
	console.log(`   Connected to: ${convexUrl}\n`)

	// Insert configuration
	console.log('3. Storing configuration in database...')
	const result = await client.mutation(api.sasConfig.setSasConfiguration, {
		cluster: CLUSTER,
		payerKeypair: keypairs.payer,
		authorityKeypair: keypairs.authority,
		authorizedSignerKeypair: keypairs.authorizedSigner1,
	})

	if (result.success) {
		console.log(`   ✅ Configuration saved successfully!`)
		console.log(`   Config ID: ${result.configId}\n`)

		// Verify configuration is accessible
		console.log('4. Verifying configuration...')
		const isConfigured = await client.query(api.sasConfig.isSasConfigured)

		if (isConfigured) {
			console.log('   ✅ Configuration verified!\n')
			console.log('🎉 SUCCESS! SAS is now configured and ready to use.')
			console.log('\nNext steps:')
			console.log('1. Test the integration: bun run scripts/test-sas-convex-integration.ts')
			console.log('2. The integration will now work without environment variables')
		} else {
			console.log('   ❌ Configuration verification failed')
			process.exit(1)
		}
	} else {
		console.log('   ❌ Failed to save configuration')
		process.exit(1)
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n❌ Setup failed:', error.message)
		if (error.stack) {
			console.error('\nStack trace:')
			console.error(error.stack)
		}
		process.exit(1)
	})
