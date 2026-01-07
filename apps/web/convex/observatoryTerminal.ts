import { v } from 'convex/values'
import { internalQuery, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

/**
 * Public-safe Observatory Terminal queries.
 *
 * Goal: Provide a single server-composed feed + detail endpoints with
 * server-side redaction/truncation so the public `/observatory` page never
 * receives sensitive raw fields (requestPayload/responseBody/full free text).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Redaction helpers (keep in this file per scope)
// ─────────────────────────────────────────────────────────────────────────────

function truncateText(value: string | undefined | null, max = 160): string {
  const str = (value ?? '').toString()
  if (!str) return ''
  if (str.length <= max) return str
  return `${str.slice(0, Math.max(0, max - 1))}…`
}

/**
 * Remove query/hash and aggressively cap URL length.
 *
 * This intentionally does NOT attempt to validate URLs strictly; it just
 * prevents leaking long query params / tokens.
 */
function sanitizeUrlForPublic(url: string | undefined | null, max = 180): string {
  const raw = (url ?? '').toString().trim()
  if (!raw) return ''

  // Fast path: strip query/hash without URL parsing.
  const noHash = raw.split('#')[0] ?? raw
  const noQuery = noHash.split('?')[0] ?? noHash

  // Best-effort URL parse to normalize.
  try {
    const parsed = new URL(noQuery)
    return truncateText(`${parsed.origin}${parsed.pathname}`, max)
  } catch {
    return truncateText(noQuery, max)
  }
}

/**
 * Public redaction for payer/client addresses.
 *
 * Keeps only a short prefix/suffix to help correlate activity without exposing
 * full addresses.
 */
function redactAddress(address: string | undefined | null): string {
  const a = (address ?? '').toString().trim()
  if (!a) return '[redacted]'
  if (a.length <= 12) return '[redacted]'
  return `${a.slice(0, 4)}…${a.slice(-4)}`
}

/**
 * Free text sanitizer:
 * - strips obvious secrets from URLs
 * - truncates aggressively
 */
function sanitizeFreeTextForPublic(value: string | undefined | null, max = 800): string {
  let text = (value ?? '').toString()
  if (!text) return ''

  // Remove query strings from any URLs inside the text.
  // NOTE: This is heuristic and intentionally conservative.
  text = text.replace(/https?:\/\/[^\s)\]]+/gi, (m) => sanitizeUrlForPublic(m, 200))

  return truncateText(text, max)
}

function redactToolArgsForPublic(toolArgs: string | undefined | null): string | undefined {
  if (!toolArgs) return undefined
  return '[redacted]'
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO builders
// ─────────────────────────────────────────────────────────────────────────────

type PublicObservationListItem = {
  kind: 'observation'
  _id: Id<'endpointTests'>
  testedAt: number
  agentAddress: string
  responseStatus: number
  responseTimeMs: number
  paymentAmountUsdc: number
  qualityScore: number
  caisperNotes: string
  transcriptCount: number
  endpoint: null | {
    method: string
    endpoint: string
  }
}

type PublicX402FeedItem = {
  kind: 'x402'
  timestamp: number
  signature: string
  payer: string
  merchant: string
  amount: string
  facilitator: string
}

function toPublicObservationListItem(
  test: Doc<'endpointTests'>,
  endpoint: Doc<'observedEndpoints'> | null
): PublicObservationListItem {
  return {
    kind: 'observation',
    _id: test._id,
    testedAt: test.testedAt ?? test._creationTime,
    agentAddress: test.agentAddress,
    responseStatus: test.responseStatus,
    responseTimeMs: test.responseTimeMs,
    paymentAmountUsdc: test.paymentAmountUsdc,
    qualityScore: test.qualityScore,
    caisperNotes: sanitizeFreeTextForPublic(test.caisperNotes, 800),
    transcriptCount: Array.isArray(test.transcript) ? test.transcript.length : 0,
    endpoint: endpoint
      ? {
          method: endpoint.method,
          endpoint: sanitizeUrlForPublic(endpoint.endpoint, 200),
        }
      : null,
  }
}

function toPublicX402FeedItem(interaction: Doc<'historicalInteractions'>): PublicX402FeedItem {
  return {
    kind: 'x402',
    timestamp: interaction.blockTime * 1000,
    signature: interaction.transactionSignature,
    payer: redactAddress(interaction.userWalletAddress),
    merchant: interaction.agentWalletAddress,
    amount: truncateText(interaction.amount ?? '0', 32),
    facilitator: interaction.facilitatorAddress,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getPublicLiveFeed({ limit })
 *
 * Returns a single merged feed combining:
 * - recent endpoint tests (observations)
 * - recent x402 payments
 *
 * Output is public-safe (no requestPayload/responseBody, payer redacted).
 */
export const getPublicLiveFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200))

    const [tests, interactions] = await Promise.all([
      ctx.db.query('endpointTests').withIndex('by_tested_at').order('desc').take(limit),
      ctx.db
        .query('historicalInteractions')
        .withIndex('by_block_time')
        .filter((q) =>
          q.or(
            q.eq(q.field('discoverySource'), 'caisper_observation'),
            q.eq(q.field('discoverySource'), 'x402_indexer')
          )
        )
        .order('desc')
        .take(limit),
    ])

    const observationItems = await Promise.all(
      tests.map(async (test) => {
        const endpoint = await ctx.db.get(test.endpointId)
        return toPublicObservationListItem(test, endpoint)
      })
    )

    const x402Items = interactions.map(toPublicX402FeedItem)

    return [...observationItems, ...x402Items]
      .sort((a, b) => {
        const ta = a.kind === 'observation' ? a.testedAt : a.timestamp
        const tb = b.kind === 'observation' ? b.testedAt : b.timestamp
        return tb - ta
      })
      .slice(0, limit)
  },
})

/**
 * Internal wrapper used by deterministic verification/debug flows.
 *
 * Mirrors `getPublicLiveFeed` so debug actions can validate the *public* feed
 * output shape/filters without importing the generated `api` object (which can
 * create self-referential types inside Convex function modules).
 */
export const getPublicLiveFeedInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200))

    const [tests, interactions] = await Promise.all([
      ctx.db.query('endpointTests').withIndex('by_tested_at').order('desc').take(limit),
      ctx.db
        .query('historicalInteractions')
        .withIndex('by_block_time')
        .filter((q) =>
          q.or(
            q.eq(q.field('discoverySource'), 'caisper_observation'),
            q.eq(q.field('discoverySource'), 'x402_indexer')
          )
        )
        .order('desc')
        .take(limit),
    ])

    const observationItems = await Promise.all(
      tests.map(async (test) => {
        const endpoint = await ctx.db.get(test.endpointId)
        return toPublicObservationListItem(test, endpoint)
      })
    )

    const x402Items = interactions.map(toPublicX402FeedItem)

    return [...observationItems, ...x402Items]
      .sort((a, b) => {
        const ta = a.kind === 'observation' ? a.testedAt : a.timestamp
        const tb = b.kind === 'observation' ? b.testedAt : b.timestamp
        return tb - ta
      })
      .slice(0, limit)
  },
})

/**
 * getPublicObservationDetail({ testId })
 *
 * Returns observation drill-down detail with server-side truncation/redaction.
 * No requestPayload/responseBody/paymentSignature is returned.
 */
export const getPublicObservationDetail = query({
  args: { testId: v.optional(v.id('endpointTests')) },
  handler: async (ctx, args) => {
    if (!args.testId) return null

    const test = await ctx.db.get(args.testId)
    if (!test) return null

    const endpoint = await ctx.db.get(test.endpointId)

    return {
      kind: 'observation' as const,
      _id: test._id,
      testedAt: test.testedAt ?? test._creationTime,
      agentAddress: test.agentAddress,
      responseStatus: test.responseStatus,
      responseTimeMs: test.responseTimeMs,
      paymentAmountUsdc: test.paymentAmountUsdc,
      qualityScore: test.qualityScore,
      caisperNotes: sanitizeFreeTextForPublic(test.caisperNotes, 800),
      issues: (test.issues ?? []).map((i) => sanitizeFreeTextForPublic(i, 240)),
      endpoint: endpoint
        ? {
            method: endpoint.method,
            endpoint: sanitizeUrlForPublic(endpoint.endpoint, 240),
          }
        : null,
      transcript: (test.transcript ?? []).map((entry) => ({
        role: entry.role,
        isToolCall: entry.isToolCall,
        toolName: entry.toolName ? truncateText(entry.toolName, 48) : undefined,
        toolArgs: redactToolArgsForPublic(entry.toolArgs),
        timestamp: entry.timestamp,
        content: sanitizeFreeTextForPublic(entry.content, entry.role === 'agent' ? 1400 : 900),
      })),
    }
  },
})

/**
 * searchPublicObservations({ filters... })
 *
 * Cursor-based history paging over endpoint tests.
 */
export const searchPublicObservations = query({
  args: {
    startTimeMs: v.optional(v.number()),
    endTimeMs: v.optional(v.number()),
    agentAddress: v.optional(v.string()),
    status: v.optional(v.number()),
    minQualityScore: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200))
    const start = args.startTimeMs ?? 0
    const end = args.endTimeMs ?? Number.MAX_SAFE_INTEGER

    let base = ctx.db
      .query('endpointTests')
      .withIndex('by_tested_at', (q) => q.gte('testedAt', start).lt('testedAt', end))
      .order('desc')

    const hasExtraFilters =
      !!args.agentAddress ||
      typeof args.status === 'number' ||
      typeof args.minQualityScore === 'number'

    if (hasExtraFilters) {
      base = base.filter((q) => {
        const clauses = [] as any[]
        if (args.agentAddress) clauses.push(q.eq(q.field('agentAddress'), args.agentAddress))
        if (typeof args.status === 'number')
          clauses.push(q.eq(q.field('responseStatus'), args.status))
        if (typeof args.minQualityScore === 'number')
          clauses.push(q.gte(q.field('qualityScore'), args.minQualityScore))
        return q.and(...clauses)
      })
    }

    const page = await base.paginate({ cursor: args.cursor ?? null, numItems: limit })

    const endpointsById = new Map<Id<'observedEndpoints'>, Doc<'observedEndpoints'>>()

    const items = await Promise.all(
      page.page.map(async (test) => {
        let endpoint = endpointsById.get(test.endpointId) ?? null
        if (!endpoint) {
          endpoint = await ctx.db.get(test.endpointId)
          if (endpoint) endpointsById.set(test.endpointId, endpoint)
        }
        return toPublicObservationListItem(test, endpoint)
      })
    )

    return {
      items,
      cursor: page.continueCursor,
      isDone: page.isDone,
    }
  },
})

/**
 * getPublicX402Payments({ limit })
 *
 * A public-safe x402 payments list (payer redacted server-side).
 */
export const getPublicX402Payments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))

    const payments = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_block_time')
      .filter((q) =>
        q.or(
          q.eq(q.field('discoverySource'), 'caisper_observation'),
          q.eq(q.field('discoverySource'), 'x402_indexer')
        )
      )
      .order('desc')
      .take(limit)

    return payments.map(toPublicX402FeedItem)
  },
})

/**
 * Internal wrapper used by deterministic verification/debug flows.
 *
 * Mirrors `getPublicX402Payments` so we can validate public redaction/filtering
 * without importing the generated `api` object (which creates self-referential types).
 */
export const getPublicX402PaymentsInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))

    const payments = await ctx.db
      .query('historicalInteractions')
      .withIndex('by_block_time')
      .filter((q) =>
        q.or(
          q.eq(q.field('discoverySource'), 'caisper_observation'),
          q.eq(q.field('discoverySource'), 'x402_indexer')
        )
      )
      .order('desc')
      .take(limit)

    return payments.map(toPublicX402FeedItem)
  },
})
