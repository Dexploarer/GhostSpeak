/**
 * Team Management
 *
 * Queries and mutations for enterprise team management.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Create a new team
 */
export const createTeam = mutation({
  args: {
    name: v.string(),
    plan: v.string(), // 'startup', 'growth', 'enterprise'
  },
  returns: v.id('teams'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    // Get or create user
    let user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      const userId = await ctx.db.insert('users', {
        walletAddress: identity.subject,
        email: identity.email,
        name: identity.name,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
      user = { _id: userId, walletAddress: identity.subject } as any
    }

    // Set limits based on plan
    const limits = {
      startup: { maxMembers: 5, maxApiKeys: 3 },
      growth: { maxMembers: 20, maxApiKeys: 10 },
      enterprise: { maxMembers: 100, maxApiKeys: 50 },
    }

    const planLimits = limits[args.plan as keyof typeof limits] || limits.startup

    // Create team
    const teamId = await ctx.db.insert('teams', {
      name: args.name,
      ownerUserId: user!._id,
      plan: args.plan,
      maxMembers: planLimits.maxMembers,
      maxApiKeys: planLimits.maxApiKeys,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Add owner as team member
    await ctx.db.insert('teamMembers', {
      teamId,
      userId: user!._id,
      role: 'owner',
      canManageMembers: true,
      canManageApiKeys: true,
      canViewBilling: true,
      isActive: true,
      joinedAt: Date.now(),
    })

    return teamId
  },
})

/**
 * Get team by ID
 */
export const getById = query({
  args: { teamId: v.id('teams') },
  returns: v.union(
    v.object({
      _id: v.id('teams'),
      _creationTime: v.number(),
      name: v.string(),
      ownerUserId: v.id('users'),
      plan: v.string(),
      usdcTokenAccount: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      currentBalance: v.optional(v.number()),
      lastBillingAt: v.optional(v.number()),
      maxMembers: v.number(),
      maxApiKeys: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId)
  },
})

/**
 * Get user's teams
 */
export const getUserTeams = query({
  args: {},
  returns: v.array(
    v.union(
      v.object({
        _id: v.id('teams'),
        _creationTime: v.number(),
        name: v.string(),
        ownerUserId: v.id('users'),
        plan: v.string(),
        maxMembers: v.number(),
        maxApiKeys: v.number(),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
        role: v.string(),
        memberCount: v.number(),
      }),
      v.null()
    )
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      return []
    }

    // Get team memberships
    const memberships = await ctx.db
      .query('teamMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    // Get team details
    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId)
        if (!team) return null

        // Count members
        const memberCount = await ctx.db
          .query('teamMembers')
          .withIndex('by_team', (q) => q.eq('teamId', team._id))
          .collect()

        return {
          ...team,
          role: membership.role,
          memberCount: memberCount.length,
        }
      })
    )

    return teams.filter((t) => t !== null)
  },
})

/**
 * Invite user to team
 */
export const inviteTeamMember = mutation({
  args: {
    teamId: v.id('teams'),
    email: v.string(),
    role: v.string(), // 'admin', 'developer', 'viewer'
  },
  returns: v.object({
    inviteId: v.id('teamInvites'),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user has permission to invite
    const membership = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', user._id))
      .first()

    if (!membership || !membership.canManageMembers) {
      throw new Error('Insufficient permissions')
    }

    // Check if team is at member limit
    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    const memberCount = await ctx.db
      .query('teamMembers')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .collect()

    if (memberCount.length >= team.maxMembers) {
      throw new Error('Team member limit reached')
    }

    // Generate invite token using Web Crypto (V8 compatible)
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')

    // Create invite
    const inviteId = await ctx.db.insert('teamInvites', {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      invitedBy: user._id,
      token,
      status: 'pending',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    })

    // TODO: Send email with invite link
    // await sendInviteEmail(args.email, token, team.name)

    return { inviteId, token }
  },
})

/**
 * Accept team invite
 */
export const acceptTeamInvite = mutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    teamId: v.id('teams'),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    // Find invite
    const invite = await ctx.db
      .query('teamInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!invite) {
      throw new Error('Invite not found')
    }

    if (invite.status !== 'pending') {
      throw new Error('Invite already used or expired')
    }

    if (Date.now() > invite.expiresAt) {
      await ctx.db.patch(invite._id, { status: 'expired' })
      throw new Error('Invite expired')
    }

    // Get or create user
    let user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      const userId = await ctx.db.insert('users', {
        walletAddress: identity.subject,
        email: identity.email,
        name: identity.name,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })
      user = { _id: userId } as any
    }

    // Set permissions based on role
    const permissions = {
      admin: { canManageMembers: true, canManageApiKeys: true, canViewBilling: true },
      developer: { canManageMembers: false, canManageApiKeys: true, canViewBilling: false },
      viewer: { canManageMembers: false, canManageApiKeys: false, canViewBilling: false },
    }

    const rolePermissions =
      permissions[invite.role as keyof typeof permissions] || permissions.viewer

    // Add user to team
    await ctx.db.insert('teamMembers', {
      teamId: invite.teamId,
      userId: user!._id,
      role: invite.role,
      ...rolePermissions,
      isActive: true,
      joinedAt: Date.now(),
    })

    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: 'accepted',
      acceptedAt: Date.now(),
    })

    return { success: true, teamId: invite.teamId }
  },
})

/**
 * Get team members
 */
export const getTeamMembers = query({
  args: {
    teamId: v.id('teams'),
  },
  returns: v.array(
    v.object({
      _id: v.id('teamMembers'),
      _creationTime: v.number(),
      teamId: v.id('teams'),
      userId: v.id('users'),
      role: v.string(),
      canManageMembers: v.boolean(),
      canManageApiKeys: v.boolean(),
      canViewBilling: v.boolean(),
      isActive: v.boolean(),
      joinedAt: v.number(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      walletAddress: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    // Verify user is team member
    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      return []
    }

    const membership = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', user._id))
      .first()

    if (!membership) {
      throw new Error('Not a team member')
    }

    // Get all team members
    const members = await ctx.db
      .query('teamMembers')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .collect()

    // Get user details
    return await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId)
        return {
          ...member,
          email: memberUser?.email,
          name: memberUser?.name,
          walletAddress: memberUser?.walletAddress,
        }
      })
    )
  },
})

/**
 * Remove team member
 */
export const removeTeamMember = mutation({
  args: {
    teamId: v.id('teams'),
    memberId: v.id('teamMembers'),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user has permission
    const membership = await ctx.db
      .query('teamMembers')
      .withIndex('by_team_user', (q) => q.eq('teamId', args.teamId).eq('userId', user._id))
      .first()

    if (!membership || !membership.canManageMembers) {
      throw new Error('Insufficient permissions')
    }

    // Don't allow removing the owner
    const memberToRemove = await ctx.db.get(args.memberId)
    if (memberToRemove?.role === 'owner') {
      throw new Error('Cannot remove team owner')
    }

    // Remove member
    await ctx.db.delete(args.memberId)

    return { success: true }
  },
})
