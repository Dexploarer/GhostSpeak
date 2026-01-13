import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import {
  buildBrandedPrompt,
  getTemplateById,
  suggestTemplate,
  listTemplates,
  type ImageTemplate,
  type ImageSource,
} from '../config/imageTemplates'

/**
 * GENERATE_IMAGE Action
 *
 * Generates AI images using Google Imagen 4 via AI Gateway.
 * All images follow GhostSpeak branding guidelines automatically.
 *
 * Supports:
 * - Custom prompts with automatic brand injection
 * - Pre-defined templates for common use cases
 * - Multiple aspect ratios and sizes
 * - Prompt enhancement for better quality
 */
export const generateImageAction: Action = {
  name: 'GENERATE_IMAGE',
  similes: [
    'CREATE_IMAGE',
    'MAKE_PICTURE',
    'DRAW_IMAGE',
    'GENERATE_MEDIA',
    'CREATE_GRAPHIC',
    'DESIGN_IMAGE',
  ],
  description:
    'Generate AI images with GhostSpeak branding using Google Imagen 4. Supports custom prompts and pre-defined templates.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Check for image generation keywords
    return (
      (text.includes('generate') ||
        text.includes('create') ||
        text.includes('make') ||
        text.includes('design') ||
        text.includes('draw')) &&
      (text.includes('image') ||
        text.includes('picture') ||
        text.includes('graphic') ||
        text.includes('media') ||
        text.includes('visual') ||
        text.includes('photo') ||
        text.includes('art'))
    )
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: unknown,
    callback?: HandlerCallback
  ) => {
    try {
      console.log('🎨 Generating GhostSpeak branded image...')

      const text = message.content.text || ''

      // Extract source from memory content metadata ('web' | 'telegram')
      const source = (message.content.source as ImageSource) || undefined
      console.log(`📍 Image source: ${source || 'unspecified (all templates available)'}`)

      // Check for template requests
      const templateMatch = text.match(/(?:template|style|type):\s*(\w+)/i)
      const templateId = templateMatch ? templateMatch[1] : null

      // Check for special commands
      if (text.toLowerCase().includes('list') && text.toLowerCase().includes('template')) {
        // User wants to see available templates (filtered by source)
        const templateList = listTemplates(source)

        if (callback) {
          callback({
            text: templateList,
          })
        }

        return {
          success: true,
          data: {
            type: 'template_list',
          },
        }
      }

      // Extract user description
      // Remove command keywords and template specifiers
      let description = text
        .replace(/generate|create|make|design|draw|image|picture|graphic|media|visual/gi, '')
        .replace(/(?:template|style|type):\s*\w+/gi, '')
        .replace(/with ghostspeak branding/gi, '')
        .trim()

      if (!description || description.length < 5) {
        if (callback) {
          callback({
            text: `I need more details about what image you want me to generate!

Try something like:
• "Generate a raid graphic about AI agent trust"
• "Create an infographic explaining Ghost Score"
• "Make a meme about blockchain verification"

Or use a template:
• \`template:raid <description>\`
• \`template:meme <description>\`
• \`template:infographic <description>\`

Type "list templates" to see all available templates!`,
          })
        }
        return { success: false }
      }

      // Get template (explicit ID or auto-suggest) with source filtering
      let template: ImageTemplate | undefined
      if (templateId) {
        template = getTemplateById(templateId.toLowerCase(), source)
        if (!template) {
          const templateExistsButNotAllowed = getTemplateById(templateId.toLowerCase())
          if (templateExistsButNotAllowed && source) {
            // Template exists but not allowed for this source
            if (callback) {
              callback({
                text: `⚠️ The "${templateId}" template is not available for ${source === 'web' ? 'web chat' : 'Telegram'}.\n\n${
                  source === 'web'
                    ? `This template is designed for social media content. On the web, I focus on product-specific images like infographics, explainers, and agent profiles.\n\nType "list templates" to see available templates!`
                    : 'This template is not available. Type "list templates" to see all available templates!'
                }`,
              })
            }
          } else {
            // Template doesn't exist at all
            if (callback) {
              callback({
                text: `I couldn't find a template called "${templateId}". Type "list templates" to see all available templates!`,
              })
            }
          }
          return { success: false }
        }
      } else {
        // Auto-suggest template based on description (with source filtering)
        template = suggestTemplate(description, source)
      }

      // Build branded prompt
      const brandedPrompt = buildBrandedPrompt(description, template, true)

      console.log(`📝 Generated prompt: ${brandedPrompt.substring(0, 100)}...`)
      console.log(`🎯 Template: ${template?.id || 'none (custom)'}`)
      console.log(`📐 Aspect ratio: ${template?.aspectRatio || '1:1'}`)
      console.log(`📏 Size: ${template?.size || '2K'}`)

      // Call AI Gateway Imagen 4 endpoint
      const imageGenStartTime = Date.now()

      const response = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${runtime.settings.AI_GATEWAY_API_KEY}`,
        },
        body: JSON.stringify({
          model: template?.size === '1K' ? 'google/imagen-4.0-generate' : 'google/imagen-4.0-ultra-generate',
          prompt: brandedPrompt,
          size: template?.size === '1K' ? '1024x1024' : '2048x2048',
          aspectRatio: template?.aspectRatio || '1:1',
          n: 1,
          enhance_prompt: true, // Use LLM-based prompt enhancement
          personGeneration: 'allow_adult', // Safe person generation
        }),
      })

      const imageGenDuration = Date.now() - imageGenStartTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Imagen 4 API error:', errorData)

        if (callback) {
          callback({
            text: `Oops! Image generation failed. ${
              errorData.error?.message || 'The AI image service might be temporarily unavailable.'
            }

Try again in a moment, or simplify your description!`,
          })
        }

        return { success: false }
      }

      const data = await response.json()

      // Extract image URL or base64
      let imageUrl: string | null = null
      let imageBase64: string | null = null

      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url
      } else if (data.data?.[0]?.b64_json) {
        imageBase64 = data.data[0].b64_json
      }

      if (!imageUrl && !imageBase64) {
        console.error('❌ No image URL or base64 in response:', data)

        if (callback) {
          callback({
            text: `Hmm, the image was generated but I couldn't get the URL. This is unusual. Try again?`,
          })
        }

        return { success: false }
      }

      // Store image in Convex if base64 (convert to permanent URL)
      if (imageBase64 && !imageUrl) {
        console.log('💾 Storing base64 image in Convex...')

        try {
          // Import Convex client
          const { getConvexClient } = await import('../../../lib/convex-client')
          const { api } = await import('../../../convex/_generated/api')

          // Get userId from message (userId is wallet address or telegram_12345)
          const userId = message.userId || 'unknown'

          console.log(`📤 Uploading image to Convex (userId: ${userId}, size: ${imageBase64.length} chars)`)

          // Store in Convex (must use action, not mutation, to access storage)
          const storeResult = await getConvexClient().action(api.images.storeImage, {
            userId,
            base64Data: imageBase64,
            contentType: 'image/png', // Imagen returns PNG
            prompt: description,
            enhancedPrompt: brandedPrompt,
            templateId: template?.id,
            aspectRatio: template?.aspectRatio || '1:1',
            resolution: template?.size || '2K',
            model: template?.size === '1K' ? 'google/imagen-4.0-generate' : 'google/imagen-4.0-ultra-generate',
            generationTime: imageGenDuration,
            source: (message.content.source as string) || 'web',
            characterId: 'boo',
            isPublic: true, // Default to public gallery
          })

          console.log(`💿 Stored in Convex:`, storeResult)

          // Get the image with storage URL
          const { api: convexApi } = await import('../../../convex/_generated/api')
          const imageWithUrl = await getConvexClient().query(convexApi.images.getImage, {
            imageId: storeResult.imageId,
          })

          if (imageWithUrl?.storageUrl) {
            imageUrl = imageWithUrl.storageUrl
            console.log(`✅ Image stored in Convex: ${imageUrl}`)
          } else {
            console.warn('⚠️  Failed to get storage URL from Convex')
          }

          // Clear base64 to save memory
          imageBase64 = null
        } catch (convexError) {
          console.error('❌ Failed to store image in Convex:', convexError)
          // Fall back to returning base64 (not ideal but better than failing)
          console.warn('⚠️  Falling back to base64 response')
        }
      }

      // Success! Return image URL in text for Telegram extraction
      const successMessage = `✨ Generated your GhostSpeak ${template ? template.name : 'custom image'}!

${description}

${imageUrl || '(base64 image generated)'}

${
  template
    ? `**Template:** ${template.id} (${template.aspectRatio}, ${template.size})`
    : '**Custom prompt** (1:1, 2K)'
}
**Generation time:** ${(imageGenDuration / 1000).toFixed(1)}s`

      if (callback) {
        callback({
          text: successMessage,
          ui: {
            type: 'image_generated',
            imageUrl,
            imageBase64,
            template: template?.id,
            description,
            aspectRatio: template?.aspectRatio || '1:1',
            size: template?.size || '2K',
            generationTime: imageGenDuration,
          },
        })
      }

      console.log(`✅ Image generated successfully in ${imageGenDuration}ms`)
      console.log(`🖼️  URL: ${imageUrl}`)

      return {
        success: true,
        data: {
          type: 'image_generated',
          imageUrl,
          imageBase64,
          template: template?.id,
          description,
          aspectRatio: template?.aspectRatio || '1:1',
          size: template?.size || '2K',
          generationTime: imageGenDuration,
        },
      }
    } catch (error) {
      console.error('❌ Generate image action failed:', error)

      if (callback) {
        callback({
          text: `Image generation failed due to a technical error. ${
            error instanceof Error ? error.message : 'Unknown error'
          }

This might be temporary. Try again in a moment!`,
        })
      }

      return { success: false }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Generate a raid graphic about AI agent trust verification' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Generating GhostSpeak branded raid graphic...',
          action: 'GENERATE_IMAGE',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Create an infographic explaining Ghost Score tiers' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Creating educational infographic with Ghost Score breakdown...',
          action: 'GENERATE_IMAGE',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Make a meme about trusting unverified agents vs using GhostSpeak',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Making a relatable GhostSpeak meme...',
          action: 'GENERATE_IMAGE',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'template:agent-card Profile for Trading Bot with 8500 Ghost Score' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Generating agent profile card...',
          action: 'GENERATE_IMAGE',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'List templates' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📸 Available Image Templates...',
          action: 'GENERATE_IMAGE',
        },
      },
    ],
  ],
}
