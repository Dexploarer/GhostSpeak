/**
 * Crossmint Credential Types Setup Script
 *
 * Run this script to create the GhostSpeak credential types in Crossmint.
 * These types define the schema for each credential kind.
 *
 * Usage:
 *   CROSSMINT_API_KEY=your_key bun run scripts/setup-crossmint-types.ts
 *   # Or for staging:
 *   CROSSMINT_API_KEY=your_key CROSSMINT_ENV=staging bun run scripts/setup-crossmint-types.ts
 */

interface CrossmintTypeSchema {
  $schema: string
  title: string
  description: string
  type: 'object'
  properties: {
    credentialSubject: {
      type: 'object'
      properties: Record<string, { type: string; items?: { type: string } }>
      required: string[]
      additionalProperties: false
    }
  }
}

interface CrossmintTypeResponse {
  id: string
  typeSchema: CrossmintTypeSchema & { $id: string }
}

// ============================================================================
// GhostSpeak Credential Type Schemas
// ============================================================================

const GHOSTSPEAK_CREDENTIAL_TYPES: Record<string, CrossmintTypeSchema> = {
  // Agent Identity Credential - Issued when an agent is verified
  GhostSpeakAgentIdentity_v2: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'GhostSpeak Agent Identity v2',
    description: 'Verifiable credential for a registered and verified AI agent on GhostSpeak',
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          owner: { type: 'string' },
          name: { type: 'string' },
          capabilities: { type: 'array', items: { type: 'string' } },
          serviceEndpoint: { type: 'string' },
          frameworkOrigin: { type: 'string' },
          x402Enabled: { type: 'boolean' },
          registeredAt: { type: 'integer' },
          verifiedAt: { type: 'integer' },
          id: { type: 'string' }, // Auto-added by Crossmint
        },
        required: [
          'agentId',
          'owner',
          'name',
          'capabilities',
          'serviceEndpoint',
          'frameworkOrigin',
          'x402Enabled',
          'registeredAt',
          'verifiedAt',
        ],
        additionalProperties: false,
      },
    },
  },

  // Reputation Credential - Snapshot of agent reputation
  GhostSpeakReputation_v2: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'GhostSpeak Reputation Score v2',
    description: 'Verifiable credential representing an agent reputation snapshot',
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: {
          agent: { type: 'string' },
          reputationScore: { type: 'integer' },
          totalJobsCompleted: { type: 'integer' },
          totalEarnings: { type: 'integer' },
          successRate: { type: 'integer' },
          avgRating: { type: 'integer' },
          disputeRate: { type: 'integer' },
          snapshotTimestamp: { type: 'integer' },
          id: { type: 'string' },
        },
        required: [
          'agent',
          'reputationScore',
          'totalJobsCompleted',
          'totalEarnings',
          'successRate',
          'avgRating',
          'disputeRate',
          'snapshotTimestamp',
        ],
        additionalProperties: false,
      },
    },
  },

  // Job Completion Credential - Issued after escrow completion
  GhostSpeakJobCompletion_v2: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'GhostSpeak Job Completion v2',
    description: 'Verifiable credential for a completed job/escrow on GhostSpeak',
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: {
          escrowId: { type: 'string' },
          agent: { type: 'string' },
          client: { type: 'string' },
          amountPaid: { type: 'integer' },
          completedAt: { type: 'integer' },
          rating: { type: 'integer' },
          reviewHash: { type: 'string' },
          id: { type: 'string' },
        },
        required: ['escrowId', 'agent', 'client', 'amountPaid', 'completedAt', 'rating'],
        additionalProperties: false,
      },
    },
  },

  // Delegated Signer Credential - Authorization for sub-wallets
  GhostSpeakDelegatedSigner_v2: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'GhostSpeak Delegated Signer v2',
    description: 'Verifiable credential for delegated signing authority',
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: {
          masterWallet: { type: 'string' },
          delegatedKey: { type: 'string' },
          authorizedAt: { type: 'integer' },
          permissions: { type: 'array', items: { type: 'string' } },
          id: { type: 'string' },
        },
        required: ['masterWallet', 'delegatedKey', 'authorizedAt', 'permissions'],
        additionalProperties: false,
      },
    },
  },
}

// ============================================================================
// Crossmint API Client
// ============================================================================

async function createCredentialType(
  apiKey: string,
  baseUrl: string,
  typeName: string,
  schema: CrossmintTypeSchema
): Promise<CrossmintTypeResponse> {
  const url = `${baseUrl}/api/v1-alpha1/credentials/types/${typeName}`

  console.log(`Creating type: ${typeName}...`)

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schema),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create type ${typeName}: ${response.status} - ${errorText}`)
  }

  const result = (await response.json()) as CrossmintTypeResponse
  console.log(`  ✅ Created: ${result.id}`)
  return result
}

async function getExistingTypes(apiKey: string, baseUrl: string): Promise<string[]> {
  const url = `${baseUrl}/api/v1-alpha1/credentials/types`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
    },
  })

  if (!response.ok) {
    console.log('Could not fetch existing types, will attempt to create all')
    return []
  }

  const result = (await response.json()) as { types?: Array<{ id: string }> }
  return result.types?.map((t) => t.id) || []
}

// ============================================================================
// Main Script
// ============================================================================

// @ts-ignore - Duplicate function error from TypeScript, but this is the only main function
async function main() {
  const apiKey =
    process.env.CROSSMINT_API_KEY ||
    process.env.CROSSMINT_SECRET_KEY ||
    process.env.NEXT_PUBLIC_CROSSMINT_API_KEY
  const environment = process.env.CROSSMINT_ENV || 'staging'

  if (!apiKey) {
    console.error(
      '❌ Error: CROSSMINT_API_KEY (or NEXT_PUBLIC_CROSSMINT_API_KEY) environment variable is required'
    )
    console.log('\nUsage:')
    console.log('  CROSSMINT_API_KEY=your_key bun run scripts/setup-crossmint-types.ts')
    console.log(
      '  CROSSMINT_API_KEY=your_key CROSSMINT_ENV=production bun run scripts/setup-crossmint-types.ts'
    )
    process.exit(1)
  }

  const baseUrl =
    environment === 'production' ? 'https://www.crossmint.com' : 'https://staging.crossmint.com'

  console.log(`\n🔧 GhostSpeak Crossmint Credential Types Setup`)
  console.log(`   Environment: ${environment}`)
  console.log(`   API URL: ${baseUrl}`)
  console.log('')

  // Check existing types
  console.log('📋 Checking existing credential types...')
  const existingTypes = await getExistingTypes(apiKey, baseUrl)

  const results: Record<string, string> = {}
  const errors: string[] = []

  // Create each type
  for (const [typeName, schema] of Object.entries(GHOSTSPEAK_CREDENTIAL_TYPES)) {
    // Check if type already exists
    const existingType = existingTypes.find((t) => t.includes(typeName))
    if (existingType) {
      console.log(`🔄 Updating ${typeName} (existing: ${existingType})...`)
      // results[typeName] = existingType // Don't use old ID blindly if we want to ensure schema match, but ID should persist.
      // continue // DO NOT SKIP
    }

    try {
      const result = await createCredentialType(apiKey, baseUrl, typeName, schema)
      results[typeName] = result.id
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  ❌ Error: ${message}`)
      errors.push(`${typeName}: ${message}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))

  console.log('\n✅ Created/Existing Types:')
  for (const [name, id] of Object.entries(results)) {
    console.log(`   ${name}: ${id}`)
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    for (const error of errors) {
      console.log(`   ${error}`)
    }
  }

  // Generate .env snippet
  console.log('\n📝 Add these to your .env file:')
  console.log('─'.repeat(60))
  for (const [name, id] of Object.entries(results)) {
    const envKey = `CROSSMINT_${name.replace('GhostSpeak', '').toUpperCase()}_TYPE_ID`
    console.log(`${envKey}="${id}"`)
  }
  console.log('─'.repeat(60))

  if (errors.length > 0) {
    process.exit(1)
  }

  console.log('\n✨ Setup complete!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
