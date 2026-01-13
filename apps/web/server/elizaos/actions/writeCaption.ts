import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export const writeCaptionAction: Action = {
  name: 'WRITE_CAPTION',
  description: 'Write Twitter/X captions for images',
  similes: ['write caption', 'tweet caption', 'twitter post', 'social media caption'],
  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Write a caption for my raid graphic about Ghost Score' },
      },
      {
        user: '{{agent}}',
        content: {
          text: "📝 **Here are 3 tweet options:**\n\n1. 🚀 Join the Ghost Army! Trust verified agents with Ghost Score - no more rug pulls in AI commerce. #GhostSpeak #Web3\n\n2. 👻 Ghost Score: The credit rating for AI agents you can actually trust. Built on Solana for transparency. #AI #Blockchain\n\n3. ⚡ Verify before you buy! Ghost Score brings trust to AI agent commerce. Join the revolution. #GhostSpeak #Solana",
        },
      },
    ],
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase()
    return (
      text.includes('caption') ||
      text.includes('tweet') && !text.includes('retweet') ||
      text.includes('twitter post') ||
      text.includes('write') && text.includes('post')
    )
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const userPrompt = message.content.text

      // Extract topic from user message
      const topic = userPrompt
        .replace(/write|caption|tweet|for|about|post/gi, '')
        .trim()

      const openai = createOpenAI({
        apiKey: runtime.getSetting('AI_GATEWAY_API_KEY') || process.env.AI_GATEWAY_API_KEY,
        baseURL: 'https://ai-gateway.vercel.sh/v1',
      })

      const systemPrompt = `You are Boo, GhostSpeak's community marketing helper.

Generate 3 Twitter/X captions for GhostSpeak community content.

**Rules:**
- Max 280 characters per caption
- Include 2-3 relevant hashtags (#GhostSpeak #Web3 #AI #Solana #Blockchain)
- Use emojis strategically (👻 💚 ⚡ 🚀)
- Energetic, community-focused tone
- Focus on GhostSpeak's value: AI agent trust, Ghost Score, verification
- Each caption should be unique but on-brand

**Brand Voice:**
- Energetic about GhostSpeak
- Community-focused (raids, memes)
- Tech-savvy but accessible
- Trust and verification focused

Return ONLY the 3 captions, numbered 1-3, nothing else.`

      const { text: captionsText } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Generate 3 Twitter captions for: ${topic}`,
        system: systemPrompt,
        maxTokens: 500,
      })

      // Parse and format captions
      const captions = captionsText
        .split(/\n(?=\d\.)/)
        .filter(line => line.trim())
        .slice(0, 3)

      let response = '📝 **Twitter/X Captions Generated!**\n\n'

      captions.forEach((caption, index) => {
        const cleanCaption = caption.replace(/^\d+\.\s*/, '').trim()
        const charCount = cleanCaption.length
        const status = charCount <= 280 ? '✅' : '⚠️'

        response += `**CAPTION ${index + 1}:** (${charCount}/280 ${status})\n${cleanCaption}\n\n`
      })

      response += `Ready to share on Twitter! 🚀`

      if (callback) {
        callback({ text: response })
      }

      return true
    } catch (error) {
      console.error('Error in writeCaption:', error)
      if (callback) {
        callback({
          text: 'Failed to generate captions. Please try again.',
        })
      }
      return false
    }
  },
}
