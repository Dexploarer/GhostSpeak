/**
 * Database Instance
 * 
 * Provides Drizzle database instance with connection.
 * Separated from schema to avoid circular dependencies during migration generation.
 * 
 * @module database/db
 */

import { drizzle } from 'drizzle-orm/libsql'
import { getConnection } from './connection.js'
import { schema } from './schema/index.js'

/**
 * Get Drizzle database instance
 * 
 * Creates a type-safe Drizzle ORM instance connected to Turso.
 * Throws error if database not configured.
 * 
 * @returns Drizzle database instance
 * @throws Error if Turso not configured
 * 
 * @example
 * ```typescript
 * import { getDb } from '@ghostspeak/sdk/database'
 * 
 * const db = await getDb()
 * const allAgents = await db.select().from(schema.agents)
 * ```
 */
export async function getDb() {
    const client = await getConnection()
    return drizzle(client, { schema })
}

// Export type for database instance
export type Database = Awaited<ReturnType<typeof getDb>>
