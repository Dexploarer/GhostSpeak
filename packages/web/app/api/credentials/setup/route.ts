/**
 * Credential Setup API Routes
 *
 * POST /api/credentials/setup - Initialize credential types and templates
 *
 * This is an admin endpoint that should only be called once during initial setup.
 * It creates the GhostSpeak credential types and templates in Crossmint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { CrossmintVCClient } from '@ghostspeak/sdk/credentials'

// Get environment variables
const CROSSMINT_API_KEY = process.env.CROSSMINT_SECRET_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'ghostspeak-admin-secret'
const CROSSMINT_ENVIRONMENT = process.env.CROSSMINT_API_URL?.includes('www.crossmint')
  ? 'production'
  : 'staging'

/**
 * POST /api/credentials/setup
 * Initialize GhostSpeak credential types and templates
 *
 * Headers:
 * - x-admin-secret: Admin secret key for authorization
 *
 * Body:
 * - action: 'create-types' | 'create-templates' | 'full-setup'
 * - typeIds?: { agentIdentity: string, reputation: string, jobCompletion: string } (required for create-templates)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminSecret = request.headers.get('x-admin-secret')
    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin secret' }, { status: 401 })
    }

    if (!CROSSMINT_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Crossmint API key' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { action, typeIds } = body

    if (!action || !['create-types', 'create-templates', 'full-setup'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: create-types, create-templates, or full-setup' },
        { status: 400 }
      )
    }

    const client = new CrossmintVCClient({
      apiKey: CROSSMINT_API_KEY,
      environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
      chain: 'base-sepolia', // VCs only work on EVM chains, not Solana
    })

    let result: Record<string, unknown> = {}

    switch (action) {
      case 'create-types': {
        console.log('Creating GhostSpeak credential types...')
        const types = await client.initializeAllTypes()
        result = {
          success: true,
          action: 'create-types',
          types: {
            agentIdentity: types.agentIdentity.id,
            reputation: types.reputation.id,
            jobCompletion: types.jobCompletion.id,
          },
          message: 'All GhostSpeak credential types created successfully',
          nextStep: 'Save these type IDs and call create-templates with them',
        }
        break
      }

      case 'create-templates': {
        if (!typeIds || !typeIds.agentIdentity || !typeIds.reputation || !typeIds.jobCompletion) {
          return NextResponse.json(
            {
              error: 'Missing typeIds for template creation',
              required: ['agentIdentity', 'reputation', 'jobCompletion'],
              hint: 'Run create-types first to get the type IDs',
            },
            { status: 400 }
          )
        }

        console.log('Creating GhostSpeak credential templates...')
        const templates = await client.createAllTemplates({
          agentIdentity: { id: typeIds.agentIdentity } as never,
          reputation: { id: typeIds.reputation } as never,
          jobCompletion: { id: typeIds.jobCompletion } as never,
        })

        result = {
          success: true,
          action: 'create-templates',
          templates: {
            agentIdentity: templates.agentIdentityTemplate.id,
            reputation: templates.reputationTemplate.id,
            jobCompletion: templates.jobCompletionTemplate.id,
          },
          message: 'All GhostSpeak credential templates created successfully',
          nextStep: 'Add these template IDs to your environment variables',
          envVars: {
            CROSSMINT_AGENT_TEMPLATE_ID: templates.agentIdentityTemplate.id,
            CROSSMINT_REPUTATION_TEMPLATE_ID: templates.reputationTemplate.id,
            CROSSMINT_JOB_TEMPLATE_ID: templates.jobCompletionTemplate.id,
          },
        }
        break
      }

      case 'full-setup': {
        console.log('Running full GhostSpeak credential setup...')

        // Step 1: Create types
        const types = await client.initializeAllTypes()
        console.log('Types created:', types)

        // Wait a moment for types to propagate
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 2: Create templates
        const templates = await client.createAllTemplates(types)
        console.log('Templates created:', templates)

        result = {
          success: true,
          action: 'full-setup',
          types: {
            agentIdentity: types.agentIdentity.id,
            reputation: types.reputation.id,
            jobCompletion: types.jobCompletion.id,
          },
          templates: {
            agentIdentity: templates.agentIdentityTemplate.id,
            reputation: templates.reputationTemplate.id,
            jobCompletion: templates.jobCompletionTemplate.id,
          },
          message: 'Full GhostSpeak credential setup completed successfully!',
          envVars: {
            CROSSMINT_AGENT_TEMPLATE_ID: templates.agentIdentityTemplate.id,
            CROSSMINT_REPUTATION_TEMPLATE_ID: templates.reputationTemplate.id,
            CROSSMINT_JOB_TEMPLATE_ID: templates.jobCompletionTemplate.id,
          },
        }
        break
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Credential setup error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Setup failed',
        type: 'setup_error',
        hint: 'Check that your Crossmint API key has the correct scopes: credentials.create, credentials:templates.create',
      },
      { status: 500 }
    )
  }
}
