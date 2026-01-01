/**
 * SAS Configuration Management
 * Store and retrieve SAS keypairs from database (workaround for env var issues)
 */

import { query, mutation, internalQuery, internalMutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get SAS configuration (internal only)
 */
export const getSasConfiguration = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      cluster: v.string(),
      payerKeypair: v.array(v.number()),
      authorityKeypair: v.array(v.number()),
      authorizedSignerKeypair: v.array(v.number()),
    })
  ),
  handler: async (ctx) => {
    const config = await ctx.db
      .query('sasConfiguration')
      .withIndex('by_config_key', (q) => q.eq('configKey', 'main'))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (!config) {
      return null
    }

    return {
      cluster: config.cluster,
      payerKeypair: config.payerKeypair,
      authorityKeypair: config.authorityKeypair,
      authorizedSignerKeypair: config.authorizedSignerKeypair,
    }
  },
})

/**
 * Set SAS configuration (admin only - for initial setup)
 */
export const setSasConfiguration = mutation({
  args: {
    cluster: v.string(),
    payerKeypair: v.array(v.number()),
    authorityKeypair: v.array(v.number()),
    authorizedSignerKeypair: v.array(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    configId: v.optional(v.id('sasConfiguration')),
  }),
  handler: async (ctx, args) => {
    // Deactivate any existing configuration
    const existing = await ctx.db
      .query('sasConfiguration')
      .withIndex('by_config_key', (q) => q.eq('configKey', 'main'))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { isActive: false })
    }

    // Insert new configuration
    const configId = await ctx.db.insert('sasConfiguration', {
      configKey: 'main',
      cluster: args.cluster,
      payerKeypair: args.payerKeypair,
      authorityKeypair: args.authorityKeypair,
      authorizedSignerKeypair: args.authorizedSignerKeypair,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    console.log('[SAS Config] Configuration saved:', {
      configId,
      cluster: args.cluster,
      payerAddress: `...${args.payerKeypair.slice(-8)}`,
    })

    return {
      success: true,
      configId,
    }
  },
})

/**
 * Check if SAS is configured
 */
export const isSasConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const config = await ctx.db
      .query('sasConfiguration')
      .withIndex('by_config_key', (q) => q.eq('configKey', 'main'))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    return config !== null
  },
})
