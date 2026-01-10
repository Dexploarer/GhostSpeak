/**
 * Shared Convex Client Singleton
 *
 * Lazy initialization to prevent build-time errors when NEXT_PUBLIC_CONVEX_URL
 * is not available during Next.js build process.
 *
 * Usage:
 * ```ts
 * import { getConvexClient } from '@/lib/convex-client'
 *
 * export async function GET() {
 *   const convex = getConvexClient()
 *   const data = await convex.query(api.myQuery, {})
 *   return Response.json(data)
 * }
 * ```
 */

import { ConvexHttpClient } from 'convex/browser'

let convexClient: ConvexHttpClient | null = null

/**
 * Get singleton Convex HTTP client
 * Initializes on first call with NEXT_PUBLIC_CONVEX_URL
 * Throws if environment variable is not set
 */
export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set')
    }
    convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  }
  return convexClient
}

/**
 * Reset client (primarily for testing)
 */
export function resetConvexClient(): void {
  convexClient = null
}
