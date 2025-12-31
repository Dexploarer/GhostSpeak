/**
 * Webhook Management API - Individual Webhook Operations
 *
 * DELETE /api/webhooks/:id - Delete webhook subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { fetchQuery, fetchMutation } from 'convex/nextjs'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

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

    // Delete webhook subscription
    await fetchMutation(api.webhooks.deleteWebhookSubscription, {
      subscriptionId: id as Id<'webhookSubscriptions'>,
      apiKeyId: keyData.apiKeyId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Webhooks API] Error deleting webhook:', error)

    if (error instanceof Error && (error.message?.includes('not found') || error.message?.includes('Unauthorized'))) {
      return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/:id - Get webhook details and delivery history
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

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

    // Get webhook subscription details
    const subscription = await fetchQuery(api.webhooks.getWebhookSubscription, {
      subscriptionId: id as Id<'webhookSubscriptions'>,
      apiKeyId: keyData.apiKeyId,
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Webhook not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Get delivery history
    const deliveries = await fetchQuery(api.webhookDelivery.getWebhookHistory, {
      subscriptionId: id as Id<'webhookSubscriptions'>,
      limit: 100,
    })

    return NextResponse.json({
      webhook: {
        id: subscription._id,
        url: subscription.url,
        events: subscription.events,
        agentAddresses: subscription.agentAddresses || null,
        isActive: subscription.isActive,
        totalDeliveries: subscription.totalDeliveries,
        failedDeliveries: subscription.failedDeliveries,
        lastDeliveryAt: subscription.lastDeliveryAt
          ? new Date(subscription.lastDeliveryAt).toISOString()
          : null,
        lastFailureAt: subscription.lastFailureAt
          ? new Date(subscription.lastFailureAt).toISOString()
          : null,
        createdAt: new Date(subscription.createdAt).toISOString(),
      },
      deliveries: deliveries.map((d) => ({
        id: d._id,
        event: d.event,
        status: d.status,
        attemptCount: d.attemptCount,
        lastError: d.lastError,
        lastResponseStatus: d.lastResponseStatus,
        deliveredAt: d.deliveredAt ? new Date(d.deliveredAt).toISOString() : null,
        createdAt: new Date(d.createdAt).toISOString(),
      })),
    })
  } catch (error: unknown) {
    console.error('[Webhooks API] Error fetching webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
