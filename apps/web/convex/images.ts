/**
 * Image Storage & Gallery Functions
 *
 * Handles:
 * - Storing base64 images to Convex storage
 * - Serving images via HTTP routes
 * - Community gallery with voting
 * - Analytics and moderation
 */

import { v } from 'convex/values'
import { mutation, query, internalAction, internalMutation, ActionCtx } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'

/**
 * Store a base64-encoded image to Convex storage
 *
 * Accepts base64 image data, uploads to Convex storage, and creates gallery record.
 * Must be an action (not mutation) to access ctx.storage
 */
export const storeImage: ReturnType<typeof internalAction> = internalAction({
  args: {
    userId: v.string(),
    base64Data: v.string(), // Base64-encoded image (without data:image/png;base64, prefix)
    contentType: v.string(), // image/png, image/jpeg, etc.
    prompt: v.string(),
    enhancedPrompt: v.optional(v.string()),
    templateId: v.optional(v.string()),
    aspectRatio: v.string(),
    resolution: v.string(),
    model: v.string(),
    generationTime: v.number(),
    source: v.string(), // 'web' | 'telegram'
    characterId: v.string(),
    isPublic: v.optional(v.boolean()), // Default true
  },
  handler: async (ctx, args) => {
    // Convert base64 to bytes (browser-compatible)
    // Convex doesn't have Buffer, use atob for base64 decoding
    const binaryString = atob(args.base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Store in Convex storage
    const storageId = await ctx.storage.store(new Blob([bytes], { type: args.contentType }))

    // Create gallery record via runMutation (actions can't directly access db)
    const imageId = await ctx.runMutation(internal.images.createImageRecord, {
      userId: args.userId,
      storageId,
      contentType: args.contentType,
      size: bytes.length,
      prompt: args.prompt,
      enhancedPrompt: args.enhancedPrompt,
      templateId: args.templateId,
      aspectRatio: args.aspectRatio,
      resolution: args.resolution,
      model: args.model,
      generationTime: args.generationTime,
      source: args.source,
      characterId: args.characterId,
      isPublic: args.isPublic ?? true,
    })

    return {
      imageId,
      storageId,
      // Return URL for serving
      imageUrl: `/api/images/${imageId}`,
    }
  },
})

/**
 * Internal mutation to create image record in database
 * Called by storeImage action after uploading to storage
 */
export const createImageRecord = internalMutation({
  args: {
    userId: v.string(),
    storageId: v.id('_storage'),
    contentType: v.string(),
    size: v.number(),
    prompt: v.string(),
    enhancedPrompt: v.optional(v.string()),
    templateId: v.optional(v.string()),
    aspectRatio: v.string(),
    resolution: v.string(),
    model: v.string(),
    generationTime: v.number(),
    source: v.string(),
    characterId: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('generatedImages', {
      ...args,
      upvotes: 0,
      downvotes: 0,
      views: 0,
      isFlagged: false,
      isHidden: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

/**
 * Get image metadata by ID
 */
export const getImage = query({
  args: { imageId: v.id('generatedImages') },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId)
    if (!image) return null

    return {
      ...image,
      // Include storage URL for serving
      storageUrl: await ctx.storage.getUrl(image.storageId),
    }
  },
})

/**
 * Get user's generated images
 */
export const getUserImages = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    const images = await ctx.db
      .query('generatedImages')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)

    // Add storage URLs
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        storageUrl: await ctx.storage.getUrl(image.storageId),
      }))
    )
  },
})

/**
 * Get public gallery images (sorted by recency)
 */
export const getGalleryImages = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const images = await ctx.db
      .query('generatedImages')
      .withIndex('by_gallery', (q) => q.eq('isPublic', true).eq('isHidden', false))
      .order('desc')
      .take(limit)

    // Add storage URLs
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        storageUrl: await ctx.storage.getUrl(image.storageId),
      }))
    )
  },
})

/**
 * Get trending images (sorted by upvotes)
 */
export const getTrendingImages = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const images = await ctx.db
      .query('generatedImages')
      .withIndex('by_trending', (q) => q.eq('isPublic', true).eq('isHidden', false))
      .order('desc')
      .take(limit)

    // Add storage URLs
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        storageUrl: await ctx.storage.getUrl(image.storageId),
      }))
    )
  },
})

/**
 * Vote on an image (upvote or downvote)
 */
export const voteOnImage = mutation({
  args: {
    imageId: v.id('generatedImages'),
    userId: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    // Check if user already voted
    const existingVote = await ctx.db
      .query('imageVotes')
      .withIndex('by_image_user', (q) => q.eq('imageId', args.imageId).eq('userId', args.userId))
      .first()

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote === args.vote) {
        // Remove vote if clicking same button again
        await ctx.db.delete(existingVote._id)

        // Decrement counter
        const image = await ctx.db.get(args.imageId)
        if (image) {
          await ctx.db.patch(args.imageId, {
            upvotes: args.vote === 'up' ? image.upvotes - 1 : image.upvotes,
            downvotes: args.vote === 'down' ? image.downvotes - 1 : image.downvotes,
            updatedAt: Date.now(),
          })
        }

        return { action: 'removed', vote: args.vote }
      } else {
        // Change vote
        await ctx.db.patch(existingVote._id, {
          vote: args.vote,
          updatedAt: Date.now(),
        })

        // Update counters (remove old, add new)
        const image = await ctx.db.get(args.imageId)
        if (image) {
          await ctx.db.patch(args.imageId, {
            upvotes: args.vote === 'up' ? image.upvotes + 1 : image.upvotes - 1,
            downvotes: args.vote === 'down' ? image.downvotes + 1 : image.downvotes - 1,
            updatedAt: Date.now(),
          })
        }

        return { action: 'changed', vote: args.vote }
      }
    } else {
      // Create new vote
      await ctx.db.insert('imageVotes', {
        imageId: args.imageId,
        userId: args.userId,
        vote: args.vote,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      // Increment counter
      const image = await ctx.db.get(args.imageId)
      if (image) {
        await ctx.db.patch(args.imageId, {
          upvotes: args.vote === 'up' ? image.upvotes + 1 : image.upvotes,
          downvotes: args.vote === 'down' ? image.downvotes + 1 : image.downvotes,
          updatedAt: Date.now(),
        })
      }

      return { action: 'created', vote: args.vote }
    }
  },
})

/**
 * Record image view (de-duplicated per user)
 */
export const recordView = mutation({
  args: {
    imageId: v.id('generatedImages'),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Record view
    await ctx.db.insert('imageViews', {
      imageId: args.imageId,
      userId: args.userId,
      viewedAt: Date.now(),
    })

    // Increment view counter
    const image = await ctx.db.get(args.imageId)
    if (image) {
      await ctx.db.patch(args.imageId, {
        views: image.views + 1,
        updatedAt: Date.now(),
      })
    }
  },
})

/**
 * Get user's vote for an image
 */
export const getUserVote = query({
  args: {
    imageId: v.id('generatedImages'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query('imageVotes')
      .withIndex('by_image_user', (q) => q.eq('imageId', args.imageId).eq('userId', args.userId))
      .first()

    return vote?.vote ?? null
  },
})

/**
 * Search images by prompt
 */
export const searchImages = query({
  args: {
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const images = await ctx.db
      .query('generatedImages')
      .withSearchIndex('search_prompt', (q) =>
        q.search('prompt', args.searchQuery).eq('isPublic', true).eq('isHidden', false)
      )
      .take(limit)

    // Add storage URLs
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        storageUrl: await ctx.storage.getUrl(image.storageId),
      }))
    )
  },
})

/**
 * Get images by template
 */
export const getImagesByTemplate = query({
  args: {
    templateId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const images = await ctx.db
      .query('generatedImages')
      .withIndex('by_template', (q) => q.eq('templateId', args.templateId))
      .order('desc')
      .take(limit)

    // Add storage URLs
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        storageUrl: await ctx.storage.getUrl(image.storageId),
      }))
    )
  },
})
