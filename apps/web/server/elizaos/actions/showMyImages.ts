import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core'
// import { ConvexDatabaseAdapter } from '../../lib/convex-adapter' // File doesn't exist, using any instead

export const showMyImagesAction: Action = {
  name: 'SHOW_MY_IMAGES',
  description: "Show user's last 10 generated images",
  similes: ['show my images', 'my creations', 'what i made', 'my recent images', 'image history'],
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Show my recent images' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "Here are your last 10 generated images:\n\n1. **Raid Graphic** - 'Join the Ghost Army'\n   🖼️ https://ai-gateway.vercel.sh/generated/xyz123.png\n   📅 2 days ago\n\n2. **Meme** - 'Trust verified agents'\n   🖼️ https://ai-gateway.vercel.sh/generated/abc456.png\n   📅 3 days ago",
        },
      },
    ],
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text || '').toLowerCase()
    return (
      text.includes('my images') ||
      text.includes('my creations') ||
      text.includes('what i made') ||
      text.includes('show') && text.includes('images') ||
      text.includes('image history')
    )
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      const userId = (message as any).userId || message.id

      // Get user's last 10 images from memory
      const adapter = (runtime as unknown as { adapter: any }).adapter
      const memories = await adapter.getMemories({
        roomId: message.roomId,
        count: 50, // Get more to filter for images
        unique: false,
      })

      // Filter for image generation memories
      const imageMemories = memories
        .filter((mem: any) => {
          const text = mem.content.text || ''
          return text.includes('🖼️') || text.includes('Image generated')
        })
        .slice(0, 10)

      if (imageMemories.length === 0) {
        if (callback) {
          callback({
            text: "You haven't generated any images yet! 👻\n\nTry: 'Create a raid graphic about Ghost Score' or 'Make a meme about AI agent trust'",
          })
        }
        // Success
      }

      // Format response
      let response = `📸 **Your Last ${imageMemories.length} Generated Images:**\n\n`

      imageMemories.forEach((mem: any, index: number) => {
        const text = mem.content.text || ''
        const lines = text.split('\n')

        // Extract image URL
        const urlMatch = text.match(/https?:\/\/[^\s]+/)
        const url = urlMatch ? urlMatch[0] : 'No URL found'

        // Extract description (first non-empty line)
        const description = lines.find((line: string) => line.trim() && !line.includes('http')) || 'Image'

        // Calculate days ago
        const createdAt = mem.createdAt || Date.now()
        const daysAgo = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))
        const timeAgo = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`

        response += `**${index + 1}.** ${description}\n`
        response += `   🖼️ ${url}\n`
        response += `   📅 ${timeAgo}\n\n`
      })

      response += `Want me to generate more branded content? Just describe what you need! 🚀`

      if (callback) {
        callback({ text: response })
      }

      // Success
    } catch (error) {
      console.error('Error in showMyImages:', error)
      if (callback) {
        callback({
          text: 'Failed to retrieve your image history. Please try again.',
        })
      }
      // Error handled
    }
  },
}
