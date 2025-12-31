/**
 * Webhook Management API
 *
 * Endpoints for managing webhook subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { randomBytes } from 'crypto'

/**
 * POST /api/webhooks - Create webhook subscription
 */
export async function POST(req: NextRequest) {
  try {
    // Get API key from headers
    const apiKey =
      req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Validate API key and get user
    // @ts-expect-error - validateApiKey not in generated types, run `bunx convex dev` to regenerate
    const keyData = await fetchQuery(api.apiKeys.validateApiKey, {
      apiKey,
    })

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { url, events, agentAddresses } = body

    // Validate URL
    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid webhook URL', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate events
    const validEvents = [
      'score.updated',
      'tier.changed',
      'credential.issued',
      'staking.created',
      'staking.updated',
    ]
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Must specify at least one event', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const invalidEvents = events.filter((e: string) => !validEvents.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid events: ${invalidEvents.join(', ')}`,
          code: 'VALIDATION_ERROR',
          validEvents,
        },
        { status: 400 }
      )
    }

    // Generate webhook secret
    const secret = `whsec_${randomBytes(32).toString('hex')}`

    // Create webhook subscription
    const subscriptionId = await fetchMutation(api.webhooks.createWebhookSubscription, {
      apiKeyId: keyData.apiKeyId,
      url,
      secret,
      events,
      agentAddresses: agentAddresses || undefined,
    })

    return NextResponse.json(
      {
        id: subscriptionId,
        url,
        events,
        agentAddresses: agentAddresses || null,
        secret, // Return secret only on creation
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[Webhooks API] Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks - List webhook subscriptions
 */
export async function GET(req: NextRequest) {
  try {
    // Get API key from headers
    const apiKey =
      req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Validate API key and get user
    // @ts-expect-error - validateApiKey not in generated types, run `bunx convex dev` to regenerate
    const keyData = await fetchQuery(api.apiKeys.validateApiKey, {
      apiKey,
    })

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Get user's webhook subscriptions
    const subscriptions = await fetchQuery(api.webhooks.listWebhookSubscriptions, {
      apiKeyId: keyData.apiKeyId,
    })

    // Don't return secrets in list
    const sanitized = subscriptions.map((sub) => ({
      id: sub._id,
      url: sub.url,
      events: sub.events,
      agentAddresses: sub.agentAddresses || null,
      isActive: sub.isActive,
      totalDeliveries: sub.totalDeliveries,
      failedDeliveries: sub.failedDeliveries,
      lastDeliveryAt: sub.lastDeliveryAt ? new Date(sub.lastDeliveryAt).toISOString() : null,
      lastFailureAt: sub.lastFailureAt ? new Date(sub.lastFailureAt).toISOString() : null,
      createdAt: new Date(sub.createdAt).toISOString(),
    }))

    return NextResponse.json({ webhooks: sanitized })
  } catch (error: unknown) {
    console.error('[Webhooks API] Error listing webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
