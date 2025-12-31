#!/usr/bin/env bun
/**
 * Setup Crossmint Verifiable Credentials for Production
 *
 * This script creates all GhostSpeak credential types and templates
 * in the Crossmint production environment.
 *
 * Usage:
 *   bun run scripts/setup-credentials-production.ts
 */

import { CrossmintVCClient } from '@ghostspeak/sdk'

const PRODUCTION_SERVER_KEY = process.env.CROSSMINT_SECRET_KEY

if (!PRODUCTION_SERVER_KEY) {
  console.error('❌ CROSSMINT_SECRET_KEY not found in environment')
  console.error('Make sure .env.production is loaded')
  process.exit(1)
}

if (!PRODUCTION_SERVER_KEY.startsWith('sk_production_')) {
  console.error('❌ Warning: API key does not appear to be a production key')
  console.error('Production keys should start with sk_production_')
  process.exit(1)
}

async function setupCredentials() {
  console.log('🔐 Initializing Crossmint VC Client (Production)...\n')

  const vcClient = new CrossmintVCClient({
    apiKey: PRODUCTION_SERVER_KEY!,
    environment: 'production',
    chain: 'base', // Using Base for production
  })

  try {
    // Step 1: Create credential types
    console.log('📝 Creating credential types...')
    const types = await vcClient.initializeAllTypes()

    console.log('✅ Credential types created:')
    console.log(`   - Agent Identity: ${types.agentIdentity.id}`)
    console.log(`   - Reputation: ${types.reputation.id}`)
    console.log(`   - Job Completion: ${types.jobCompletion.id}\n`)

    // Step 2: Create templates
    console.log('🎨 Creating credential templates...')
    const templates = await vcClient.createAllTemplates(types)

    console.log('✅ Credential templates created:')
    console.log(`   - Agent Identity Template: ${templates.agentIdentityTemplate.id}`)
    console.log(`   - Reputation Template: ${templates.reputationTemplate.id}`)
    console.log(`   - Job Completion Template: ${templates.jobCompletionTemplate.id}\n`)

    // Step 3: Output environment variables
    console.log('📋 Add these to your .env.production file:\n')
    console.log('# Credential Type IDs')
    console.log(`CROSSMINT_AGENTIDENTITY_TYPE_ID="${types.agentIdentity.id}"`)
    console.log(`CROSSMINT_REPUTATION_TYPE_ID="${types.reputation.id}"`)
    console.log(`CROSSMINT_JOBCOMPLETION_TYPE_ID="${types.jobCompletion.id}"`)
    console.log('')
    console.log('# Credential Template IDs')
    console.log(`CROSSMINT_AGENTIDENTITY_TEMPLATE_ID="${templates.agentIdentityTemplate.id}"`)
    console.log(`CROSSMINT_REPUTATION_TEMPLATE_ID="${templates.reputationTemplate.id}"`)
    console.log(`CROSSMINT_JOBCOMPLETION_TEMPLATE_ID="${templates.jobCompletionTemplate.id}"`)
    console.log('')

    console.log('✨ Setup complete! Update your .env.production with the values above.')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupCredentials()
