/**
 * Convex HTTP Routes
 *
 * Public HTTP endpoints served directly by Convex.
 */

import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

/**
 * Serve generated images by ID
 *
 * GET /images/:imageId
 *
 * Returns the image file with proper content-type headers.
 */
http.route({
  path: '/images/:imageId',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Extract imageId from URL path
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const imageId = pathParts[pathParts.length - 1] as any

    try {
      // Get image metadata
      const image = await ctx.runQuery(api.images.getImage, { imageId })

      if (!image) {
        return new Response('Image not found', { status: 404 })
      }

      // Get image blob from storage
      const blob = await ctx.storage.get(image.storageId)

      if (!blob) {
        return new Response('Image file not found in storage', { status: 404 })
      }

      // Return image with proper headers
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': image.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'Content-Length': image.size.toString(),
        },
      })
    } catch (error) {
      console.error('Error serving image:', error)
      return new Response('Internal server error', { status: 500 })
    }
  }),
})

export default http
