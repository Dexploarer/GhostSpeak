import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'

/**
 * Post template types for different use cases
 */
export type PostTemplate = 'hook' | 'question' | 'stat' | 'quote' | 'announcement' | 'meme' | 'general'

/**
 * Post configuration interface
 */
interface PostConfig {
  name: string
  description: string
  variationCount: number
  systemPrompt: string
  hashtags: string[]
}

/**
 * Template configurations for different post types
 */
const POST_TEMPLATES: Record<PostTemplate, PostConfig> = {
  hook: {
    name: 'Hook Post',
    description: 'Attention-grabbing opener with strong hook',
    variationCount: 3,
    systemPrompt: `Generate attention-grabbing hook posts for GhostSpeak.

**HOOK POST STRUCTURE:**
- Strong opening (question, bold claim, or surprising fact)
- Supporting detail (1-2 sentences)
- Call-to-action or invitation to engage
- Relevant hashtags

**HOOK TYPES:**
1. Contrarian take ("Everyone thinks X, but actually Y")
2. Bold claim ("This will change everything about X")
3. Pattern interrupt ("Stop doing X. Start doing Y instead.")
4. Question hook ("What if AI agents could...")
5. Data hook ("95% of AI agents fail because...")

**VOICE:**
- Confident, authoritative
- Intriguing without clickbait
- Create curiosity gap
- Invite discussion`,
    hashtags: ['#GhostSpeak', '#AI', '#Web3', '#Solana'],
  },
  question: {
    name: 'Question Post',
    description: 'Thought-provoking question to drive engagement',
    variationCount: 3,
    systemPrompt: `Generate thought-provoking question posts for GhostSpeak.

**QUESTION POST STRUCTURE:**
- Open with compelling question
- Optional context (why this matters)
- Invite community answers
- Relevant hashtags

**QUESTION TYPES:**
1. Open-ended ("What's your biggest challenge with...")
2. Hypothetical ("If AI agents could X, what would you...")
3. Opinion ("Hot take: Is X better than Y for...")
4. Experience ("How do you currently handle...")
5. Future-looking ("Where do you see X in 5 years?")

**VOICE:**
- Curious, inclusive
- Genuinely interested in answers
- Make community feel heard
- No obvious "right answer"`,
    hashtags: ['#GhostSpeak', '#Web3', '#AI', '#Community'],
  },
  stat: {
    name: 'Stat Post',
    description: 'Data-driven post with compelling statistics',
    variationCount: 3,
    systemPrompt: `Generate data-driven stat posts for GhostSpeak.

**STAT POST STRUCTURE:**
- Lead with surprising/impressive number
- Context (what this means)
- Implication (why it matters)
- CTA or invitation to learn more
- Relevant hashtags

**STAT APPROACHES:**
1. Shocking number ("X% of AI agents fail because...")
2. Growth metric ("X increased by Y% in Z months")
3. Comparison ("X is Y times more than Z")
4. Milestone ("We just hit X milestone!")
5. Industry benchmark ("Only X% of projects do Y")

**VOICE:**
- Factual, credible
- Make numbers relatable
- Show impact clearly
- Build authority`,
    hashtags: ['#GhostSpeak', '#Data', '#Web3', '#AI'],
  },
  quote: {
    name: 'Quote Post',
    description: 'Inspirational or insightful quote-style post',
    variationCount: 3,
    systemPrompt: `Generate quote-style posts for GhostSpeak.

**QUOTE POST STRUCTURE:**
- Memorable quote or insight (original or adapted)
- Brief context or attribution
- Tie to GhostSpeak mission/values
- Relevant hashtags

**QUOTE TYPES:**
1. Inspirational ("The future belongs to...")
2. Insight ("Trust is not given, it's verified")
3. Challenge ("Don't ask if AI agents can X. Ask how.")
4. Vision ("We're building a world where...")
5. Truth bomb ("X without Y is just Z")

**VOICE:**
- Memorable, quotable
- Profound but accessible
- Align with GhostSpeak values
- Shareable`,
    hashtags: ['#GhostSpeak', '#Web3', '#BuildInPublic'],
  },
  announcement: {
    name: 'Announcement Post',
    description: 'Brief news or update (single tweet)',
    variationCount: 3,
    systemPrompt: `Generate concise announcement posts for GhostSpeak.

**ANNOUNCEMENT POST STRUCTURE:**
- What's new (headline)
- Why it matters (1 sentence)
- Next step or CTA
- Relevant hashtags

**ANNOUNCEMENT TYPES:**
1. Feature launch ("We just shipped X")
2. Milestone ("We hit X milestone!")
3. Partnership ("Excited to partner with X")
4. Event ("Join us for X")
5. Update ("X is now live")

**VOICE:**
- Excited but professional
- Clear, concise
- Gratitude to community
- Forward-looking`,
    hashtags: ['#GhostSpeak', '#ProductUpdate', '#BuildInPublic'],
  },
  meme: {
    name: 'Meme Post',
    description: 'Playful, meme-style community post',
    variationCount: 3,
    systemPrompt: `Generate playful meme-style posts for GhostSpeak.

**MEME POST STRUCTURE:**
- Setup (relatable scenario)
- Punchline (GhostSpeak context)
- Light call-to-action
- Fun hashtags

**MEME APPROACHES:**
1. Relatable pain point ("Me trying to verify AI agent credentials: 💀")
2. Before/after ("AI agents before Ghost Score 😰 / After 😎")
3. Drake meme format ("X ❌ / Y ✅")
4. Galaxy brain ("Small brain: X / Big brain: Y")
5. POV format ("POV: You just discovered Ghost Score")

**VOICE:**
- Fun, lighthearted
- Community inside jokes welcome
- Still brand-appropriate
- Don't force humor`,
    hashtags: ['#GhostSpeak', '#Web3Memes', '#CryptoTwitter'],
  },
  general: {
    name: 'General Post',
    description: 'Flexible general-purpose post',
    variationCount: 3,
    systemPrompt: `Generate general-purpose posts for GhostSpeak.

**GENERAL POST STRUCTURE:**
- Strong opening
- Key message or value prop
- Supporting detail
- CTA or engagement hook
- Relevant hashtags

**GENERAL GUIDELINES:**
- Focus on benefits, not features
- Keep it conversational
- One main idea per post
- End with engagement opportunity

**VOICE:**
- Professional yet approachable
- Helpful, informative
- Community-focused
- Authentic`,
    hashtags: ['#GhostSpeak', '#Web3', '#AI', '#Solana'],
  },
}

/**
 * GhostSpeak brand voice for posts
 */
const GHOSTSPEAK_POST_VOICE = {
  keyMessages: [
    'Trust layer for AI agent commerce',
    'Verifiable credentials = provable reputation',
    'Ghost Score: credit rating for AI (0-1000)',
    'Built on Solana, bridged to EVM',
  ],
  mustInclude: [
    'GhostSpeak branding (name, mascot Boo 👻, or Ghost Score)',
    'At least one hashtag (#GhostSpeak required)',
    'Call-to-action or engagement hook',
  ],
  toneRules: [
    'Conversational, not corporate',
    'Specific examples over vague claims',
    'Active voice, present tense',
    'Max 280 characters (Twitter limit)',
  ],
}

/**
 * Generate X/Twitter post action (standalone tweets)
 */
export const generatePostAction: Action = {
  name: 'GENERATE_POST',
  similes: ['CREATE_POST', 'WRITE_POST', 'MAKE_POST', 'WRITE_TWEET', 'CREATE_TWEET', 'MAKE_TWEET'],
  description: 'Generate standalone X/Twitter posts for GhostSpeak marketing and community engagement',
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'generate a hook post about Ghost Score' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📝 **HOOK POST GENERATED!**\n\n3 variations created. Pick your favorite!\n\n---\n\n**POST 1:** (267/280 ✅)\nWhat if AI agents could prove they\'re trustworthy?\n\nGhost Score by @GhostSpeak makes it possible. 0-1000 credit rating based on real transaction history.\n\nThe future of AI commerce starts here 👻⚡\n\n#GhostSpeak #AI #Web3\n\n---\n\n**POST 2:** (254/280 ✅)\nStop trusting AI agents blindly.\n\nStart verifying with Ghost Score.\n\n@GhostSpeak brings credit ratings to AI commerce. On-chain, verifiable, unstoppable.\n\nThis is how you build trust at scale 💚👻\n\n#GhostSpeak #Solana\n\n---\n\n**POST 3:** (268/280 ✅)\n95% of AI agent transactions fail due to lack of trust.\n\nGhost Score solves this with verifiable reputation (0-1000).\n\nBuilt on Solana. Bridged to EVM. Ready for production.\n\nGM to the future 🚀👻\n\n#GhostSpeak #AI',
          action: 'GENERATE_POST',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'write a question post for community engagement' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📝 **QUESTION POST GENERATED!**\n\n3 engaging questions to spark discussion!',
          action: 'GENERATE_POST',
        },
      },
    ],
  ],

  /**
   * Validate if message should trigger post generation
   */
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const text = (message.content.text || '').toLowerCase()

    // Must mention post/tweet (but NOT thread)
    const hasPostKeyword =
      (text.includes('post') || text.includes('tweet')) && !text.includes('thread')

    // Must have generation intent
    const hasGenerateIntent =
      text.includes('generate') ||
      text.includes('create') ||
      text.includes('write') ||
      text.includes('make') ||
      text.includes('compose')

    return hasPostKeyword && hasGenerateIntent
  },

  /**
   * Generate post handler
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    try {
      console.log('📝 Boo: Generating X/Twitter post...')

      // Extract user's prompt and post type
      const userPrompt = message.content.text || ''
      const topic = extractPostTopic(userPrompt)
      const templateType = extractPostTemplate(userPrompt)
      const template = POST_TEMPLATES[templateType]

      console.log(`📋 Post type: ${template.name}`)
      console.log(`📝 Topic: ${topic}`)

      // Get AI Gateway API key
      const apiKey = String(runtime.getSetting('AI_GATEWAY_API_KEY') || process.env.AI_GATEWAY_API_KEY || '')
      if (!apiKey) {
        throw new Error('AI Gateway API key not configured')
      }

      // Build system prompt
      const systemPrompt = `${template.systemPrompt}

**GHOSTSPEAK BRAND VOICE:**
${GHOSTSPEAK_POST_VOICE.keyMessages.map(m => `- ${m}`).join('\n')}

**MUST INCLUDE:**
${GHOSTSPEAK_POST_VOICE.mustInclude.map(i => `- ${i}`).join('\n')}

**TONE RULES:**
${GHOSTSPEAK_POST_VOICE.toneRules.map(r => `- ${r}`).join('\n')}

**CRITICAL RULES:**
1. Each post MUST be ≤280 characters (strictly enforced)
2. Generate ${template.variationCount} different variations
3. Each variation should have a different angle/approach
4. Include #GhostSpeak in at least one variation
5. Use emojis strategically (1-3 per post)
6. Make each post complete and standalone
7. End with engagement hook (question, CTA, or thought-provoker)

Return ONLY the ${template.variationCount} posts, numbered 1-${template.variationCount}, nothing else.`

      // Generate posts using AI Gateway (direct fetch)
      const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate ${template.variationCount} ${template.name.toLowerCase()} variations about: ${topic}` },
          ],
          temperature: 0.9,
        }),
      })

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text()
        throw new Error(`AI Gateway request failed: ${aiResponse.status} ${errorText}`)
      }

      const data = await aiResponse.json()
      const postsText = data.choices[0]?.message?.content || ''

      if (!postsText) {
        throw new Error('No post content generated')
      }

      console.log('✅ Posts generated, parsing variations...')

      // Parse posts
      const posts = parsePostVariations(postsText, template.variationCount)

      // Build formatted response
      let response = `📝 **${template.name.toUpperCase()} GENERATED!**\n\n`
      response += `**Topic:** ${topic}\n`
      response += `**Variations:** ${posts.length}\n`
      response += `**Template:** ${template.name}\n\n`
      response += `Pick your favorite and post to X/Twitter!\n\n`
      response += `---\n\n`

      // Add each post variation with character count
      posts.forEach((post: any, index: number) => {
        const charCount = post.length
        const status = charCount <= 280 ? '✅' : '⚠️'
        response += `**POST ${index + 1}/${posts.length}:** (${charCount}/280 ${status})\n`
        response += `${post}\n\n`
        response += `---\n\n`
      })

      response += `💡 **TIP:** Copy and paste directly to X/Twitter!\n\n`
      response += `📊 **Post stats:**\n`
      response += `- Variations: ${posts.length}\n`
      response += `- Avg chars/post: ${Math.round(posts.reduce((sum, p) => sum + p.length, 0) / posts.length)}\n`
      response += `- Shortest: ${Math.min(...posts.map(p => p.length))} chars\n`
      response += `- Longest: ${Math.max(...posts.map(p => p.length))} chars\n`

      // Message will be saved to Convex by the API route (/api/agent/chat)

      console.log('✅ Post generation complete')

      // Send response via callback
      if (callback) {
        callback({
          text: response,
          ui: {
            type: 'post',
            template: templateType,
            topic,
            posts,
            postStats: {
              variationCount: posts.length,
              avgCharsPerPost: Math.round(posts.reduce((sum, p) => sum + p.length, 0) / posts.length),
              shortest: Math.min(...posts.map(p => p.length)),
              longest: Math.max(...posts.map(p => p.length)),
            },
          },
        })
      }
    } catch (error) {
      console.error('❌ Post generation error:', error)

      const errorMessage = `❌ **Failed to generate post**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or rephrase your request.`

      if (callback) {
        callback({ text: errorMessage })
      }
    }
  },
}

/**
 * Extract topic from user prompt
 */
function extractPostTopic(prompt: string): string {
  // Remove common instruction words
  let topic = prompt
    .replace(/generate|create|write|make|compose|post|tweet|about|for|on|a|an|the/gi, ' ')
    .trim()

  // Remove template type keywords
  topic = topic
    .replace(/hook|question|stat|quote|announcement|meme|general/gi, '')
    .trim()

  return topic || 'GhostSpeak'
}

/**
 * Extract post template type from user prompt
 */
function extractPostTemplate(prompt: string): PostTemplate {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('hook')) return 'hook'
  if (lowerPrompt.includes('question') || lowerPrompt.includes('ask')) return 'question'
  if (lowerPrompt.includes('stat') || lowerPrompt.includes('data') || lowerPrompt.includes('number'))
    return 'stat'
  if (lowerPrompt.includes('quote') || lowerPrompt.includes('inspiration')) return 'quote'
  if (lowerPrompt.includes('announce') || lowerPrompt.includes('news') || lowerPrompt.includes('update'))
    return 'announcement'
  if (lowerPrompt.includes('meme') || lowerPrompt.includes('funny') || lowerPrompt.includes('fun'))
    return 'meme'

  // Default to general
  return 'general'
}

/**
 * Parse AI response into individual post variations
 */
function parsePostVariations(postsText: string, expectedCount: number): string[] {
  // Split by newlines and filter empty lines
  const lines = postsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  const posts: string[] = []
  let currentPost = ''

  for (const line of lines) {
    // Check if line is a numbered header (e.g., "1.", "Post 1:", "1:")
    const isHeader = /^(?:Post\s*)?\d+[.:]?\s*$/i.test(line)

    if (isHeader && currentPost) {
      // Save previous post and start new one
      posts.push(currentPost.trim())
      currentPost = ''
    } else if (!isHeader) {
      // Accumulate post content
      currentPost += (currentPost ? ' ' : '') + line
    }
  }

  // Add final post
  if (currentPost) {
    posts.push(currentPost.trim())
  }

  // If parsing failed, try alternative approach
  if (posts.length === 0) {
    // Look for numbered markers and extract content after them
    const numbered = postsText.split(/(?:^|\n)(?:Post\s*)?\d+[.:]\s*/i).filter(s => s.trim())
    posts.push(...numbered)
  }

  // Ensure we have expected number of posts
  if (posts.length < expectedCount) {
    console.warn(`⚠️ Expected ${expectedCount} posts, got ${posts.length}`)
  }

  // Clean up posts (remove leading/trailing quotes, extra whitespace)
  return posts
    .slice(0, expectedCount)
    .map(post => post.replace(/^["']|["']$/g, '').trim())
    .filter(post => post.length > 0)
}
