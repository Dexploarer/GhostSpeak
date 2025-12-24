import { CrossmintVCClient } from '@ghostspeak/sdk'

// Bun loads .env/.env.local implicitly

async function main() {
  console.log('🔧 GhostSpeak Crossmint Template Setup')

  const apiKey = process.env.CROSSMINT_SECRET_KEY || process.env.CROSSMINT_API_KEY
  const env = (process.env.CROSSMINT_ENV || 'staging') as 'staging' | 'production'

  if (!apiKey) {
    console.error('❌ Missing API Key (CROSSMINT_SECRET_KEY)')
    process.exit(1)
  }

  const client = new CrossmintVCClient({
    apiKey,
    environment: env,
    chain: 'base-sepolia', // Default for Staging Templates
  })

  // Type IDs from env (populated by setup-crossmint-types.ts)
  const types = {
    AgentIdentity: process.env.CROSSMINT_AGENTIDENTITY_TYPE_ID,
    Reputation: process.env.CROSSMINT_REPUTATION_TYPE_ID,
    JobCompletion: process.env.CROSSMINT_JOBCOMPLETION_TYPE_ID,
    DelegatedSigner: process.env.CROSSMINT_DELEGATEDSIGNER_TYPE_ID,
  }

  const results: Record<string, string> = {}
  const errors: string[] = []

  // 1. Agent Identity
  if (types.AgentIdentity) {
    try {
      console.log('Creating AgentIdentity Template...')
      const res = await client.createTemplate(types.AgentIdentity, {
        name: 'GhostSpeak Agent Identity',
        description: 'Verified AI Agent Identity on GhostSpeak Protocol',
        imageUrl: 'https://picsum.photos/400',
      })
      results['AgentIdentity'] = res.id
      console.log(`✅ Created: ${res.id}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`❌ AgentIdentity Failed: ${message}`)
      errors.push(`AgentIdentity: ${message}`)
    }
  } else {
    console.warn('⚠️ Missing AgentIdentity Type ID - Skipping')
  }

  // 2. Reputation
  if (types.Reputation) {
    try {
      console.log('Creating Reputation Template...')
      const res = await client.createTemplate(types.Reputation, {
        name: 'GhostSpeak Reputation Score',
        description: 'Aggregated reputation score from GhostSpeak Marketplace',
        imageUrl: 'https://picsum.photos/400',
      })
      results['Reputation'] = res.id
      console.log(`✅ Created: ${res.id}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`❌ Reputation Failed: ${message}`)
      errors.push(`Reputation: ${message}`)
    }
  } else {
    console.warn('⚠️ Missing Reputation Type ID - Skipping')
  }

  // 3. Job Completion
  if (types.JobCompletion) {
    try {
      console.log('Creating JobCompletion Template...')
      const res = await client.createTemplate(types.JobCompletion, {
        name: 'GhostSpeak Job Completion',
        description: 'Verified completion of a job on GhostSpeak Marketplace',
        imageUrl: 'https://picsum.photos/400',
      })
      results['JobCompletion'] = res.id
      console.log(`✅ Created: ${res.id}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`❌ JobCompletion Failed: ${message}`)
      errors.push(`JobCompletion: ${message}`)
    }
  } else {
    console.warn('⚠️ Missing JobCompletion Type ID - Skipping')
  }

  // 4. Delegated Signer
  if (types.DelegatedSigner) {
    try {
      console.log('Creating DelegatedSigner Template...')
      const res = await client.createTemplate(types.DelegatedSigner, {
        name: 'GhostSpeak Delegated Signer',
        description: 'Authorized delegated signer for a GhostSpeak Agent',
        imageUrl: 'https://picsum.photos/400',
      })
      results['DelegatedSigner'] = res.id
      console.log(`✅ Created: ${res.id}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`❌ DelegatedSigner Failed: ${message}`)
      errors.push(`DelegatedSigner: ${message}`)
    }
  } else {
    console.warn('⚠️ Missing DelegatedSigner Type ID - Skipping')
  }

  // Summary & Output
  console.log('\n📝 Add these to your .env file:')
  console.log('─'.repeat(60))
  for (const [key, val] of Object.entries(results)) {
    console.log(`CROSSMINT_${key.toUpperCase()}_TEMPLATE_ID="${val}"`)
  }
  console.log('─'.repeat(60))

  if (errors.length > 0) process.exit(1)
}

main()
