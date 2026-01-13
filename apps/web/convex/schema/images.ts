/**
 * Images Schema Module
 *
 * Handles AI-generated images with storage, gallery, and voting.
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Generated Images
 *
 * Stores all AI-generated images from Boo character (Telegram + Web).
 * Images are stored as Convex storage IDs (from base64 upload).
 */
export const generatedImages = defineTable({
  // User who generated the image
  userId: v.string(), // walletAddress or telegram_12345

  // Image storage
  storageId: v.id('_storage'), // Convex storage ID
  contentType: v.string(), // image/png, image/jpeg, etc.
  size: v.number(), // bytes

  // Generation metadata
  prompt: v.string(), // User's original prompt
  enhancedPrompt: v.optional(v.string()), // AI-enhanced prompt used
  templateId: v.optional(v.string()), // raid, meme, infographic, etc.
  aspectRatio: v.string(), // 1:1, 16:9, 9:16, 4:5, 3:2
  resolution: v.string(), // 1K, 2K
  model: v.string(), // google/imagen-4.0-generate, etc.
  generationTime: v.number(), // milliseconds

  // Source
  source: v.string(), // 'web' | 'telegram'
  characterId: v.string(), // 'boo'

  // Gallery & voting
  isPublic: v.boolean(), // Visible in community gallery
  upvotes: v.number(), // Total upvotes
  downvotes: v.number(), // Total downvotes
  views: v.number(), // Total views

  // Moderation
  isFlagged: v.boolean(), // Flagged for review
  isHidden: v.boolean(), // Hidden by admin/moderation

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId', 'createdAt'])
  .index('by_gallery', ['isPublic', 'isHidden', 'createdAt']) // Public gallery sorting
  .index('by_trending', ['isPublic', 'isHidden', 'upvotes']) // Trending sort
  .index('by_template', ['templateId', 'createdAt']) // Template browsing
  .searchIndex('search_prompt', {
    searchField: 'prompt',
    filterFields: ['isPublic', 'isHidden'],
  })

/**
 * Image Votes
 *
 * Tracks user votes on generated images (upvote/downvote).
 */
export const imageVotes = defineTable({
  imageId: v.id('generatedImages'),
  userId: v.string(), // walletAddress or telegram_12345
  vote: v.union(v.literal('up'), v.literal('down')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_image_user', ['imageId', 'userId']) // Check if user already voted
  .index('by_user', ['userId', 'createdAt']) // User's voting history

/**
 * Image Views
 *
 * Tracks image views for analytics (de-duplicated by user).
 */
export const imageViews = defineTable({
  imageId: v.id('generatedImages'),
  userId: v.optional(v.string()), // null for anonymous views
  viewedAt: v.number(),
})
  .index('by_image', ['imageId', 'viewedAt'])
  .index('by_user', ['userId', 'viewedAt'])
