/**
 * Team Members Module
 *
 * User-to-team mappings and permissions
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Get team memberships for a user
 */
export const getByUser = query({
  args: { userId: v.id('users') },
  returns: v.array(
    v.object({
      _id: v.id('teamMembers'),
      _creationTime: v.number(),
      teamId: v.id('teams'),
      userId: v.id('users'),
      role: v.string(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('teamMembers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
  },
})

/**
 * Get members of a team
 */
export const getByTeam = query({
  args: { teamId: v.id('teams') },
  returns: v.array(
    v.object({
      _id: v.id('teamMembers'),
      _creationTime: v.number(),
      teamId: v.id('teams'),
      userId: v.id('users'),
      role: v.string(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('teamMembers')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .collect()
  },
})
