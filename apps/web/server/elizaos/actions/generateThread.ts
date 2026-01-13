import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'

/**
 * Thread template types for different use cases
 */
export type ThreadTemplate = 'raid' | 'announcement' | 'educational' | 'product' | 'community' | 'alpha'

/**
 * Thread configuration interface
 */
interface ThreadConfig {
  name: string
  description: string
  tweetCount: { min: number; max: number }
  systemPrompt: string
  hashtags: string[]
}

/**
 * Template configurations for different thread types
 */
const THREAD_TEMPLATES: Record<ThreadTemplate, ThreadConfig> = {
  raid: {
    name: 'Raid Thread',
    description: 'Coordinated X/Twitter raid thread',
    tweetCount: { min: 3, max: 5 },
    systemPrompt: `Generate a coordinated raid thread for GhostSpeak.

**RAID THREAD FORMAT:**
- Tweet 1: Hook (attention-grabbing opener, question, or bold statement)
- Tweet 2-3: Value propositions (what GhostSpeak offers, why it matters)
- Tweet 4: Call-to-Action (engage, follow, join community)
- Tweet 5 (optional): Closing impact statement

**RAID VOICE:**
- High-energy, community-focused
- Use power words: revolutionary, game-changing, unprecedented
- Create FOMO (fear of missing out)
- Include emojis strategically: 👻 💚 ⚡ 🚀 🔥 💎

**HASHTAG STRATEGY:**
- Include #GhostSpeak in Tweet 1
- Distribute 2-3 relevant hashtags across thread: #Web3 #AI #Solana #Blockchain #DeFi #BuildInPublic`,
    hashtags: ['#GhostSpeak', '#Web3', '#AI', '#Solana', '#Blockchain', '#DeFi', '#BuildInPublic'],
  },
  announcement: {
    name: 'Announcement Thread',
    description: 'Product updates, partnerships, or news',
    tweetCount: { min: 3, max: 6 },
    systemPrompt: `Generate a professional announcement thread for GhostSpeak.

**ANNOUNCEMENT FORMAT:**
- Tweet 1: Main announcement (what's new)
- Tweet 2: Why it matters (impact on users/community)
- Tweet 3-4: Details and features
- Tweet 5: How to get involved/access
- Tweet 6 (optional): Thank you + CTA

**ANNOUNCEMENT VOICE:**
- Professional yet approachable
- Clear, concise, informative
- Excitement without hype
- Gratitude to community

**HASHTAG STRATEGY:**
- #GhostSpeak in Tweet 1
- Product-specific tags: #ProductUpdate #NewFeature #Partnership`,
    hashtags: ['#GhostSpeak', '#ProductUpdate', '#NewFeature', '#Partnership', '#BuildInPublic'],
  },
  educational: {
    name: 'Educational Thread',
    description: 'Technical explainers, tutorials, how-tos',
    tweetCount: { min: 5, max: 10 },
    systemPrompt: `Generate an educational thread for GhostSpeak.

**EDUCATIONAL FORMAT:**
- Tweet 1: Hook (interesting fact, common misconception, or question)
- Tweet 2: Problem statement (what challenge does this solve?)
- Tweet 3-7: Step-by-step explanation or key concepts
- Tweet 8-9: Examples, use cases, or best practices
- Tweet 10: Summary + resources/links

**EDUCATIONAL VOICE:**
- Clear, simple, accessible (avoid jargon)
- Use numbered steps or bullet points
- Include real-world examples
- Encourage questions and discussion

**HASHTAG STRATEGY:**
- #GhostSpeak in Tweet 1
- Educational tags: #LearnWeb3 #Web3Education #SolanaDev #AIExplained`,
    hashtags: ['#GhostSpeak', '#LearnWeb3', '#Web3Education', '#SolanaDev', '#AIExplained'],
  },
  product: {
    name: 'Product Thread',
    description: 'Feature showcases, demos, use cases',
    tweetCount: { min: 4, max: 7 },
    systemPrompt: `Generate a product showcase thread for GhostSpeak.

**PRODUCT FORMAT:**
- Tweet 1: Feature introduction (what it is)
- Tweet 2: Problem it solves (pain point)
- Tweet 3-4: How it works (step-by-step)
- Tweet 5: Benefits and advantages
- Tweet 6: Use cases or examples
- Tweet 7: CTA (try it now, learn more)

**PRODUCT VOICE:**
- Benefits-focused (not feature-focused)
- Show, don't just tell
- Use concrete examples
- Address user pain points

**HASHTAG STRATEGY:**
- #GhostSpeak in Tweet 1
- Feature tags: #VerifiableCredentials #GhostScore #AIAgents #TrustLayer`,
    hashtags: ['#GhostSpeak', '#VerifiableCredentials', '#GhostScore', '#AIAgents', '#TrustLayer'],
  },
  community: {
    name: 'Community Thread',
    description: 'Community highlights, achievements, milestones',
    tweetCount: { min: 3, max: 5 },
    systemPrompt: `Generate a community-focused thread for GhostSpeak.

**COMMUNITY FORMAT:**
- Tweet 1: Celebration or milestone announcement
- Tweet 2: Community contribution highlights
- Tweet 3: Thank you and appreciation
- Tweet 4: Next goals or opportunities to contribute
- Tweet 5 (optional): Call to action (join, participate)

**COMMUNITY VOICE:**
- Warm, inclusive, appreciative
- Celebrate individuals and groups
- Foster belonging and participation
- Authentic enthusiasm

**HASHTAG STRATEGY:**
- #GhostSpeak in Tweet 1
- Community tags: #GhostSpeakCommunity #Web3Community #BuildTogether`,
    hashtags: ['#GhostSpeak', '#GhostSpeakCommunity', '#Web3Community', '#BuildTogether'],
  },
  alpha: {
    name: 'Alpha Thread',
    description: 'Insider insights, technical deep-dives, industry analysis',
    tweetCount: { min: 6, max: 10 },
    systemPrompt: `Generate an alpha (insider insights) thread for GhostSpeak.

**ALPHA FORMAT:**
- Tweet 1: Hook (contrarian take or non-obvious insight)
- Tweet 2: Context (why this matters now)
- Tweet 3-7: Deep analysis, technical details, or data
- Tweet 8: Implications and opportunities
- Tweet 9: Action items (what to do with this info)
- Tweet 10: Summary + invite discussion

**ALPHA VOICE:**
- Authoritative, data-driven
- Contrarian but well-reasoned
- Technical depth without gatekeeping
- Share insights generously

**HASHTAG STRATEGY:**
- #GhostSpeak in Tweet 1
- Alpha tags: #Web3Alpha #SolanaAlpha #AIInsights #TechAnalysis`,
    hashtags: ['#GhostSpeak', '#Web3Alpha', '#SolanaAlpha', '#AIInsights', '#TechAnalysis'],
  },
}

/**
 * GhostSpeak brand voice guidelines for threads
 */
const GHOSTSPEAK_BRAND_VOICE = {
  personality: [
    'Friendly ghost mascot (Boo)',
    'Helpful, knowledgeable, enthusiastic',
    'Professional yet approachable',
    'Community-first mindset',
  ],
  keyMessages: [
    'Trust layer for AI agent commerce',
    'Verifiable credentials (W3C standard)',
    'Ghost Score: credit rating for AI agents (0-1000)',
    'Built on Solana for speed and low cost',
    'Bridging to EVM chains via Crossmint',
  ],
  toneGuidelines: [
    'Avoid crypto jargon unless explaining',
    'Focus on real-world benefits',
    'Be specific, not vague',
    'Use active voice',
    'Keep sentences concise',
  ],
}

/**
 * Generate X/Twitter thread action
 */
export const generateThreadAction: Action = {
  name: 'GENERATE_THREAD',
  similes: [
    'CREATE_THREAD',
    'WRITE_THREAD',
    'MAKE_THREAD',
    'BUILD_THREAD',
    'COMPOSE_THREAD',
    'THREAD_GENERATOR',
  ],
  description: 'Generate X/Twitter threads for GhostSpeak marketing, announcements, education, and community engagement',
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'generate a raid thread about GhostSpeak Ghost Score' },
      },
      {
        name: 'Boo',
        content: {
          text: '🧵 **RAID THREAD GENERATED!**\n\n**Type:** Raid Thread\n**Topic:** GhostSpeak Ghost Score\n**Tweets:** 5\n\n---\n\n**TWEET 1/5:**\n🚨 BREAKING: AI agents can now have credit scores\n\nIntroducing Ghost Score by @GhostSpeak 👻\n\nThis changes EVERYTHING for AI commerce 🧵⚡\n\n#GhostSpeak #AI\n\n---\n\n**TWEET 2/5:**\nJust like humans need credit scores for loans, AI agents need trust metrics for autonomous commerce\n\nGhost Score (0-1000) tracks:\n✅ Transaction history\n✅ Payment reliability  \n✅ Community reputation\n\n#Web3 #Blockchain\n\n---\n\n**TWEET 3/5:**\nBuilt on Solana for lightning-fast verification ⚡\n\nW3C standard verifiable credentials 🔐\n\nBridged to EVM chains via Crossmint 🌉\n\nThis is the trust infrastructure Web3 needed 💎\n\n#Solana #DeFi\n\n---\n\n**TWEET 4/5:**\n🎯 CALL TO ACTION:\n\n1️⃣ Follow @GhostSpeak\n2️⃣ Join the community  \n3️⃣ Start building with Ghost Score\n\nFirst movers get the alpha 👻💚\n\n#BuildInPublic\n\n---\n\n**TWEET 5/5:**\nAI agents with verifiable reputation = the future of autonomous commerce\n\nDon\'t get left behind 🚀\n\nGM to those building the trust layer 💚👻\n\n#GhostSpeak',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'create an educational thread explaining verifiable credentials' },
      },
      {
        name: 'Boo',
        content: {
          text: '🧵 **EDUCATIONAL THREAD GENERATED!**\n\nReady to copy and post to X/Twitter!',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'write a product thread about GhostSpeak SDK' },
      },
      {
        name: 'Boo',
        content: {
          text: '🧵 **PRODUCT THREAD GENERATED!**\n\nShowcasing GhostSpeak SDK features and benefits.',
        },
      },
    ],
  ],

  /**
   * Validate if message should trigger thread generation
   */
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const text = (message.content.text || '').toLowerCase()

    // Must mention thread generation
    const hasThreadKeyword =
      text.includes('thread') ||
      text.includes('tweet storm') ||
      text.includes('twitter thread') ||
      text.includes('x thread')

    // Must have generation intent
    const hasGenerateIntent =
      text.includes('generate') ||
      text.includes('create') ||
      text.includes('write') ||
      text.includes('make') ||
      text.includes('build') ||
      text.includes('compose')

    return hasThreadKeyword && hasGenerateIntent
  },

  /**
   * Generate thread handler
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    try {
      console.log('🧵 Boo: Generating X/Twitter thread...')

      // Extract user's prompt and thread type
      const userPrompt = message.content.text || ''
      const topic = extractTopic(userPrompt)
      const templateType = extractTemplateType(userPrompt)
      const template = THREAD_TEMPLATES[templateType]

      console.log(`📋 Thread type: ${template.name}`)
      console.log(`📝 Topic: ${topic}`)

      // Get AI Gateway API key
      const apiKey = String(runtime.getSetting('AI_GATEWAY_API_KEY') || process.env.AI_GATEWAY_API_KEY || '')
      if (!apiKey) {
        throw new Error('AI Gateway API key not configured')
      }

      // Determine tweet count (prefer user-specified, fallback to template defaults)
      const requestedCount = extractTweetCount(userPrompt)
      const tweetCount =
        requestedCount ||
        Math.floor((template.tweetCount.min + template.tweetCount.max) / 2) // Use midpoint

      // Build system prompt with brand voice
      const systemPrompt = `${template.systemPrompt}

**GHOSTSPEAK BRAND VOICE:**
${GHOSTSPEAK_BRAND_VOICE.personality.map(p => `- ${p}`).join('\n')}

**KEY MESSAGES TO INCLUDE:**
${GHOSTSPEAK_BRAND_VOICE.keyMessages.map(m => `- ${m}`).join('\n')}

**TONE GUIDELINES:**
${GHOSTSPEAK_BRAND_VOICE.toneGuidelines.map(t => `- ${t}`).join('\n')}

**CRITICAL RULES:**
1. Each tweet MUST be ≤280 characters (strictly enforced)
2. Number tweets clearly: "1/${tweetCount}", "2/${tweetCount}", etc.
3. Use emojis strategically (not excessively)
4. Include hashtags from approved list: ${template.hashtags.join(', ')}
5. First tweet MUST include #GhostSpeak
6. Make each tweet self-contained (readable even if thread is broken)
7. Create natural flow between tweets
8. End with strong CTA (call-to-action)

Return ONLY the numbered tweets, one per line, nothing else.`

      // Generate thread using AI Gateway (direct fetch)
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
            { role: 'user', content: `Generate a ${tweetCount}-tweet ${template.name.toLowerCase()} about: ${topic}` },
          ],
          temperature: 0.8,
        }),
      })

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text()
        throw new Error(`AI Gateway request failed: ${aiResponse.status} ${errorText}`)
      }

      const data = await aiResponse.json()
      const threadText = data.choices[0]?.message?.content || ''

      if (!threadText) {
        throw new Error('No thread content generated')
      }

      console.log('✅ Thread generated, parsing tweets...')

      // Parse and validate tweets
      const tweets = parseThreadTweets(threadText, tweetCount)

      // Build formatted response
      let response = `🧵 **${template.name.toUpperCase()} GENERATED!**\n\n`
      response += `**Topic:** ${topic}\n`
      response += `**Tweets:** ${tweets.length}\n`
      response += `**Template:** ${template.name}\n\n`
      response += `---\n\n`

      // Add each tweet with character count
      tweets.forEach((tweet: any, index: number) => {
        const charCount = tweet.length
        const status = charCount <= 280 ? '✅' : '⚠️'
        response += `**TWEET ${index + 1}/${tweets.length}:** (${charCount}/280 ${status})\n`
        response += `${tweet}\n\n`
        response += `---\n\n`
      })

      response += `💡 **TIP:** Copy each tweet individually and post as a thread on X/Twitter!\n\n`
      response += `📊 **Thread stats:**\n`
      response += `- Total tweets: ${tweets.length}\n`
      response += `- Avg chars/tweet: ${Math.round(tweets.reduce((sum, t) => sum + t.length, 0) / tweets.length)}\n`
      response += `- Hashtags used: ${extractHashtags(tweets).join(', ')}\n`

      // Message will be saved to Convex by the API route (/api/agent/chat)

      console.log('✅ Thread generation complete')

      // Send response via callback
      if (callback) {
        callback({
          text: response,
          ui: {
            type: 'thread',
            template: templateType,
            topic,
            tweets,
            threadStats: {
              tweetCount: tweets.length,
              avgCharsPerTweet: Math.round(tweets.reduce((sum, t) => sum + t.length, 0) / tweets.length),
              hashtags: extractHashtags(tweets),
            },
          },
        })
      }

      // Success
    } catch (error) {
      console.error('❌ Thread generation error:', error)

      const errorMessage = `❌ **Failed to generate thread**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or rephrase your request.`

      if (callback) {
        callback({ text: errorMessage })
      }

      // Error handled
    }
  },
}

/**
 * Extract topic from user prompt
 */
function extractTopic(prompt: string): string {
  // Remove common instruction words
  let topic = prompt
    .replace(
      /generate|create|write|make|build|compose|thread|tweet|storm|twitter|x|about|for|on|a|an|the/gi,
      ' ',
    )
    .trim()

  // Remove template type keywords
  topic = topic
    .replace(/raid|announcement|educational|product|community|alpha/gi, '')
    .trim()

  return topic || 'GhostSpeak'
}

/**
 * Extract thread template type from user prompt
 */
function extractTemplateType(prompt: string): ThreadTemplate {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('raid')) return 'raid'
  if (lowerPrompt.includes('announce') || lowerPrompt.includes('news')) return 'announcement'
  if (lowerPrompt.includes('educat') || lowerPrompt.includes('explain') || lowerPrompt.includes('tutorial'))
    return 'educational'
  if (lowerPrompt.includes('product') || lowerPrompt.includes('feature') || lowerPrompt.includes('demo'))
    return 'product'
  if (lowerPrompt.includes('community') || lowerPrompt.includes('milestone')) return 'community'
  if (lowerPrompt.includes('alpha') || lowerPrompt.includes('insight') || lowerPrompt.includes('analysis'))
    return 'alpha'

  // Default to raid (most common use case)
  return 'raid'
}

/**
 * Extract requested tweet count from user prompt
 */
function extractTweetCount(prompt: string): number | null {
  // Look for patterns like "5 tweets", "10-tweet thread", etc.
  const match = prompt.match(/(\d+)[\s-]*(tweet|post)/i)
  if (match) {
    const count = parseInt(match[1], 10)
    // Validate range (2-15 tweets)
    if (count >= 2 && count <= 15) {
      return count
    }
  }
  return null
}

/**
 * Parse thread text into individual tweets
 */
function parseThreadTweets(threadText: string, expectedCount: number): string[] {
  // Split by newlines and filter empty lines
  const lines = threadText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  const tweets: string[] = []

  // Try to extract numbered tweets (e.g., "1/5: tweet content" or "1. tweet content")
  for (const line of lines) {
    // Match patterns like "1/5:", "1.", "Tweet 1:", etc.
    const match = line.match(/^(?:Tweet\s*)?(\d+)[./:]?\s*(.+)$/i)
    if (match && match[2]) {
      tweets.push(match[2].trim())
    }
  }

  // If parsing failed, try splitting by likely tweet boundaries
  if (tweets.length === 0) {
    // Look for lines that look like complete thoughts (ending with punctuation)
    tweets.push(...lines.filter(line => line.length > 20 && /[.!?]$/.test(line)))
  }

  // Ensure we have expected number of tweets
  if (tweets.length < expectedCount) {
    console.warn(`⚠️ Expected ${expectedCount} tweets, got ${tweets.length}`)
  }

  // Trim to expected count
  return tweets.slice(0, expectedCount)
}

/**
 * Extract all hashtags from tweets
 */
function extractHashtags(tweets: string[]): string[] {
  const hashtagSet = new Set<string>()

  for (const tweet of tweets) {
    const matches = tweet.match(/#\w+/g) || []
    for (const hashtag of matches) {
      hashtagSet.add(hashtag)
    }
  }

  return Array.from(hashtagSet)
}
