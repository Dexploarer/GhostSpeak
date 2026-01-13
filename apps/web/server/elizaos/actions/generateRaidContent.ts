import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

/**
 * Raid package types
 */
export type RaidType = 'product' | 'partnership' | 'milestone' | 'event' | 'general'

/**
 * Raid package interface - complete coordinated raid content
 */
export interface RaidPackage {
  mainThread: string[] // 3-5 tweet thread (raid anchor)
  quoteTweets: string[] // 3 quote tweet variations (for community to use)
  standalonePosts: string[] // 2-3 standalone posts (different angles)
  callToAction: string // Primary CTA (what raiders should do)
  hashtags: string[] // Coordinated hashtags
  timing: string // Best time to raid
  strategy: string // How to execute the raid
}

/**
 * Raid configuration interface
 */
interface RaidConfig {
  name: string
  description: string
  threadLength: { min: number; max: number }
  quoteCount: number
  postCount: number
  systemPrompt: string
  hashtags: string[]
}

/**
 * Raid configurations for different types
 */
const RAID_CONFIGS: Record<RaidType, RaidConfig> = {
  product: {
    name: 'Product Raid',
    description: 'Coordinated raid for product launch or feature announcement',
    threadLength: { min: 4, max: 6 },
    quoteCount: 3,
    postCount: 3,
    systemPrompt: `Generate a coordinated product raid package for GhostSpeak.

**RAID OBJECTIVE:** Drive awareness and engagement for a product/feature launch

**MAIN THREAD STRATEGY:**
- Tweet 1: Hook (problem statement or bold claim)
- Tweet 2: Solution (introduce the product/feature)
- Tweet 3-4: Benefits and use cases (why it matters)
- Tweet 5: Social proof or milestone
- Tweet 6: Strong CTA (try it now, learn more, join waitlist)

**QUOTE TWEET STRATEGY:**
- Variation 1: User benefit angle ("This solves X for me")
- Variation 2: Technical innovation angle ("The way they built X is genius")
- Variation 3: Community excitement angle ("GM to everyone building with X")

**STANDALONE POST STRATEGY:**
- Post 1: One-liner value prop (quick share)
- Post 2: Data/stat driven (credibility)
- Post 3: Question-based (drive replies)

**RAID VOICE:**
- High energy, FOMO-inducing
- Specific benefits over vague claims
- Community-first language ("we", "us", "together")
- Excitement without hype`,
    hashtags: ['#GhostSpeak', '#ProductLaunch', '#Web3', '#AI', '#Solana', '#BuildInPublic'],
  },
  partnership: {
    name: 'Partnership Raid',
    description: 'Coordinated raid for partnership announcements',
    threadLength: { min: 3, max: 5 },
    quoteCount: 3,
    postCount: 3,
    systemPrompt: `Generate a coordinated partnership raid package for GhostSpeak.

**RAID OBJECTIVE:** Maximize visibility for partnership announcement

**MAIN THREAD STRATEGY:**
- Tweet 1: Announcement hook (excitement + tag partner)
- Tweet 2: Why this partnership matters (combined strengths)
- Tweet 3: What this enables (new possibilities)
- Tweet 4: Benefits for community (what's in it for users)
- Tweet 5 (optional): CTA (join, follow, stay tuned)

**QUOTE TWEET STRATEGY:**
- Variation 1: Partnership value ("X + Y = game changing")
- Variation 2: Community benefit ("This means we can now...")
- Variation 3: Future vision ("This is just the beginning")

**STANDALONE POST STRATEGY:**
- Post 1: Simple announcement (shareable)
- Post 2: Partnership milestone (credibility)
- Post 3: Call for community engagement

**RAID VOICE:**
- Professional excitement
- Mutual respect for partner
- Forward-looking, optimistic
- Gratitude to community`,
    hashtags: ['#GhostSpeak', '#Partnership', '#Web3', '#Collaboration', '#BuildInPublic'],
  },
  milestone: {
    name: 'Milestone Raid',
    description: 'Coordinated raid for celebrating achievements',
    threadLength: { min: 3, max: 5 },
    quoteCount: 3,
    postCount: 3,
    systemPrompt: `Generate a coordinated milestone raid package for GhostSpeak.

**RAID OBJECTIVE:** Celebrate achievement and build momentum

**MAIN THREAD STRATEGY:**
- Tweet 1: Milestone announcement (exciting number/achievement)
- Tweet 2: How we got here (journey, not just destination)
- Tweet 3: Community appreciation (thank supporters)
- Tweet 4: What's next (forward momentum)
- Tweet 5 (optional): CTA (join us, stay tuned)

**QUOTE TWEET STRATEGY:**
- Variation 1: Celebration ("Huge milestone! 🚀")
- Variation 2: Community pride ("So proud to be part of this")
- Variation 3: Forward-looking ("Can't wait to see what's next")

**STANDALONE POST STRATEGY:**
- Post 1: Simple milestone share (easy to retweet)
- Post 2: Behind-the-scenes insight
- Post 3: Community invitation

**RAID VOICE:**
- Grateful, humble
- Celebratory without arrogance
- Community-focused ("we" not "I")
- Momentum-building`,
    hashtags: ['#GhostSpeak', '#Milestone', '#Web3', '#Community', '#BuildInPublic'],
  },
  event: {
    name: 'Event Raid',
    description: 'Coordinated raid for event promotion',
    threadLength: { min: 4, max: 5 },
    quoteCount: 3,
    postCount: 3,
    systemPrompt: `Generate a coordinated event raid package for GhostSpeak.

**RAID OBJECTIVE:** Drive registrations and event awareness

**MAIN THREAD STRATEGY:**
- Tweet 1: Event announcement (what, when, where)
- Tweet 2: Why attend (value proposition)
- Tweet 3: Speakers/agenda highlights
- Tweet 4: Registration CTA (link to sign up)
- Tweet 5 (optional): FOMO element (limited spots, exclusive access)

**QUOTE TWEET STRATEGY:**
- Variation 1: Excitement ("Can't wait for this! 🚀")
- Variation 2: Value highlight ("The speaker lineup is incredible")
- Variation 3: Community invitation ("Who else is coming?")

**STANDALONE POST STRATEGY:**
- Post 1: Event date/time reminder
- Post 2: Key speaker/topic highlight
- Post 3: Registration urgency

**RAID VOICE:**
- Inviting, inclusive
- Create FOMO without pressure
- Highlight exclusive value
- Make registration easy`,
    hashtags: ['#GhostSpeak', '#Web3Events', '#Blockchain', '#AI'],
  },
  general: {
    name: 'General Raid',
    description: 'Coordinated raid for general awareness and engagement',
    threadLength: { min: 4, max: 6 },
    quoteCount: 3,
    postCount: 3,
    systemPrompt: `Generate a coordinated general raid package for GhostSpeak.

**RAID OBJECTIVE:** Increase brand awareness and community engagement

**MAIN THREAD STRATEGY:**
- Tweet 1: Hook (problem or opportunity)
- Tweet 2: GhostSpeak solution
- Tweet 3-4: Key benefits and use cases
- Tweet 5: Social proof or traction
- Tweet 6: CTA (follow, join community, learn more)

**QUOTE TWEET STRATEGY:**
- Variation 1: Value prop ("This is exactly what Web3 needs")
- Variation 2: Technical insight ("The way they solve X is brilliant")
- Variation 3: Community building ("Who else is excited about this?")

**STANDALONE POST STRATEGY:**
- Post 1: One-liner mission statement
- Post 2: Key differentiator
- Post 3: Community invitation

**RAID VOICE:**
- Confident, authoritative
- Clear value proposition
- Community-first
- Authentic enthusiasm`,
    hashtags: ['#GhostSpeak', '#Web3', '#AI', '#Solana', '#TrustLayer', '#BuildInPublic'],
  },
}

/**
 * Generate raid content action - complete raid package
 */
export const generateRaidContentAction: Action = {
  name: 'GENERATE_RAID_CONTENT',
  similes: [
    'CREATE_RAID',
    'MAKE_RAID_PACKAGE',
    'BUILD_RAID_CONTENT',
    'RAID_PACKAGE',
    'COORDINATED_RAID',
  ],
  description: 'Generate complete raid packages for GhostSpeak (main thread + quote tweets + standalone posts + strategy)',
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'generate raid content for Ghost Score launch' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '🚀 **COMPLETE RAID PACKAGE GENERATED!**\n\n**RAID TYPE:** Product Raid\n**TARGET:** Ghost Score Launch\n**RAIDERS:** Community members\n\n---\n\n### MAIN THREAD (Raid Anchor)\n\nPost this as the main thread to rally around:\n\n**TWEET 1/5:** ...\n**TWEET 2/5:** ...\n...\n\n---\n\n### QUOTE TWEETS (For Community)\n\nCommunity members should quote tweet the main thread with these:\n\n**VARIATION 1:** ...\n**VARIATION 2:** ...\n**VARIATION 3:** ...\n\n---\n\n### STANDALONE POSTS (Alternative Shares)\n\nUse these for additional visibility:\n\n**POST 1:** ...\n**POST 2:** ...\n**POST 3:** ...\n\n---\n\n### RAID STRATEGY\n\n**Primary CTA:** Follow @GhostSpeak and share your Ghost Score\n**Hashtags:** #GhostSpeak #AI #Web3 #Solana\n**Best Time:** 10 AM - 2 PM EST (peak engagement)\n**Execution:** 1. Post main thread 2. Community quote tweets within 30 min 3. Standalone posts throughout day',
        },
      },
    ],
  ],

  /**
   * Validate if message should trigger raid content generation
   */
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const text = (message.content.text || '').toLowerCase()

    // Must mention raid
    const hasRaidKeyword =
      text.includes('raid') || text.includes('coordinated') || text.includes('raid package')

    // Must have generation intent
    const hasGenerateIntent =
      text.includes('generate') ||
      text.includes('create') ||
      text.includes('make') ||
      text.includes('build')

    return hasRaidKeyword && hasGenerateIntent
  },

  /**
   * Generate complete raid package
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    try {
      console.log('🚀 Boo: Generating complete raid package...')

      // Extract raid parameters
      const userPrompt = message.content.text || ''
      const topic = extractRaidTopic(userPrompt)
      const raidType = extractRaidType(userPrompt)
      const config = RAID_CONFIGS[raidType]

      console.log(`📋 Raid type: ${config.name}`)
      console.log(`📝 Topic: ${topic}`)

      // Initialize AI Gateway OpenAI client
      const openai = createOpenAI({
        apiKey: String(runtime.getSetting('AI_GATEWAY_API_KEY') || process.env.AI_GATEWAY_API_KEY || ''),
        baseURL: 'https://ai-gateway.vercel.sh/v1',
      })

      if (!openai) {
        throw new Error('AI Gateway API key not configured')
      }

      // Generate main thread
      console.log('🧵 Generating main raid thread...')
      const threadLength = Math.ceil((config.threadLength.min + config.threadLength.max) / 2)

      const { text: threadText } = await generateText({
        model: openai('gpt-4o-mini') as any,
        prompt: `Generate a ${threadLength}-tweet raid thread for GhostSpeak about: ${topic}`,
        system: `${config.systemPrompt}

Generate the MAIN THREAD only (${threadLength} tweets).

**CRITICAL RULES:**
- Each tweet ≤280 characters
- Number tweets: 1/${threadLength}, 2/${threadLength}, etc.
- First tweet MUST include #GhostSpeak
- Strong CTA in final tweet
- High energy, FOMO-inducing

Return numbered tweets only.`,
        temperature: 0.8,
      })

      const mainThread = parseThreadTweets(threadText, threadLength)

      // Generate quote tweets
      console.log('💬 Generating quote tweet variations...')
      const { text: quotesText } = await generateText({
        model: openai('gpt-4o-mini') as any,
        prompt: `Generate ${config.quoteCount} quote tweet variations for a raid about: ${topic}`,
        system: `Generate ${config.quoteCount} QUOTE TWEET variations that community members can use to quote tweet the main thread.

**QUOTE TWEET PURPOSE:**
- Amplify the main thread
- Add personal perspective
- Drive engagement
- Different angles (benefit, tech, community)

**CRITICAL RULES:**
- Each quote ≤280 characters
- Include relevant hashtags
- Varied perspectives
- Genuine enthusiasm

Return numbered quote tweets only (1-${config.quoteCount}).`,
        temperature: 0.9,
      })

      const quoteTweets = parsePostVariations(quotesText, config.quoteCount)

      // Generate standalone posts
      console.log('📝 Generating standalone posts...')
      const { text: postsText } = await generateText({
        model: openai('gpt-4o-mini') as any,
        prompt: `Generate ${config.postCount} standalone posts for a raid about: ${topic}`,
        system: `Generate ${config.postCount} STANDALONE POST variations for the raid.

**STANDALONE POST PURPOSE:**
- Alternative shares (not quote tweets)
- Different angles to reach different audiences
- Easy to copy and share
- Support the main thread

**CRITICAL RULES:**
- Each post ≤280 characters
- Include #GhostSpeak
- Varied hooks
- Complete thoughts (not thread-dependent)

Return numbered posts only (1-${config.postCount}).`,
        temperature: 0.9,
      })

      const standalonePosts = parsePostVariations(postsText, config.postCount)

      // Generate CTA and strategy
      const callToAction = generateRaidCTA(raidType, topic)
      const strategy = generateRaidStrategy(raidType, mainThread.length, quoteTweets.length)

      // Build complete raid package
      const raidPackage: RaidPackage = {
        mainThread,
        quoteTweets,
        standalonePosts,
        callToAction,
        hashtags: config.hashtags,
        timing: '10 AM - 2 PM EST (peak X/Twitter engagement)',
        strategy,
      }

      // Build formatted response
      let response = `🚀 **COMPLETE RAID PACKAGE GENERATED!**\n\n`
      response += `**RAID TYPE:** ${config.name}\n`
      response += `**TARGET:** ${topic}\n`
      response += `**RAIDERS:** GhostSpeak Community 👻💚\n\n`
      response += `---\n\n`

      // Main thread
      response += `### 🧵 MAIN THREAD (Raid Anchor)\n\n`
      response += `Post this as the main thread to rally around:\n\n`
      raidPackage.mainThread.forEach((tweet: any, i: number) => {
        const charCount = tweet.length
        const status = charCount <= 280 ? '✅' : '⚠️'
        response += `**TWEET ${i + 1}/${raidPackage.mainThread.length}:** (${charCount}/280 ${status})\n${tweet}\n\n`
      })
      response += `---\n\n`

      // Quote tweets
      response += `### 💬 QUOTE TWEETS (For Community)\n\n`
      response += `Community members should quote tweet the main thread with these:\n\n`
      raidPackage.quoteTweets.forEach((quote: any, i: number) => {
        const charCount = quote.length
        const status = charCount <= 280 ? '✅' : '⚠️'
        response += `**QUOTE ${i + 1}/${raidPackage.quoteTweets.length}:** (${charCount}/280 ${status})\n${quote}\n\n`
      })
      response += `---\n\n`

      // Standalone posts
      response += `### 📝 STANDALONE POSTS (Alternative Shares)\n\n`
      response += `Use these for additional visibility:\n\n`
      raidPackage.standalonePosts.forEach((post: any, i: number) => {
        const charCount = post.length
        const status = charCount <= 280 ? '✅' : '⚠️'
        response += `**POST ${i + 1}/${raidPackage.standalonePosts.length}:** (${charCount}/280 ${status})\n${post}\n\n`
      })
      response += `---\n\n`

      // Raid execution strategy
      response += `### 📋 RAID EXECUTION STRATEGY\n\n`
      response += `**🎯 Primary CTA:** ${raidPackage.callToAction}\n\n`
      response += `**🏷️ Coordinated Hashtags:** ${raidPackage.hashtags.join(', ')}\n\n`
      response += `**⏰ Best Timing:** ${raidPackage.timing}\n\n`
      response += `**🚀 Execution Plan:**\n${raidPackage.strategy}\n\n`
      response += `---\n\n`

      response += `💪 **LFG! Let's make this raid legendary!** 👻💚🚀`

      // Message will be saved to Convex by the API route (/api/agent/chat)

      console.log('✅ Raid package generation complete')

      // Send response
      if (callback) {
        callback({
          text: response,
          ui: {
            type: 'raid_package',
            raidType,
            topic,
            package: raidPackage,
          },
        })
      }

      // Success
    } catch (error) {
      console.error('❌ Raid package generation error:', error)

      const errorMessage = `❌ **Failed to generate raid package**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or rephrase your request.`

      if (callback) {
        callback({ text: errorMessage })
      }

      // Error handled
    }
  },
}

/**
 * Helper functions
 */

function extractRaidTopic(prompt: string): string {
  let topic = prompt
    .replace(/generate|create|make|build|raid|content|package|for|about|on|a|an|the/gi, ' ')
    .trim()

  topic = topic
    .replace(/product|partnership|milestone|event|general/gi, '')
    .trim()

  return topic || 'GhostSpeak'
}

function extractRaidType(prompt: string): RaidType {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('product') || lowerPrompt.includes('launch') || lowerPrompt.includes('feature'))
    return 'product'
  if (lowerPrompt.includes('partner') || lowerPrompt.includes('collaboration')) return 'partnership'
  if (lowerPrompt.includes('milestone') || lowerPrompt.includes('achievement')) return 'milestone'
  if (lowerPrompt.includes('event') || lowerPrompt.includes('conference') || lowerPrompt.includes('meetup'))
    return 'event'

  return 'general'
}

function generateRaidCTA(raidType: RaidType, topic: string): string {
  switch (raidType) {
    case 'product':
      return `Try ${topic} and share your experience with #GhostSpeak`
    case 'partnership':
      return `Follow both @GhostSpeak and partner, engage with announcement`
    case 'milestone':
      return `Celebrate with us! Share what ${topic} means to you`
    case 'event':
      return `Register for ${topic} and invite your network`
    case 'general':
    default:
      return `Follow @GhostSpeak, join community, spread the word about ${topic}`
  }
}

function generateRaidStrategy(raidType: RaidType, threadLength: number, quoteCount: number): string {
  return `1️⃣ **Anchor Tweet** (T+0 min): Post main thread (${threadLength} tweets)
2️⃣ **Community Amplification** (T+5-30 min): Raiders quote tweet with ${quoteCount} variations
3️⃣ **Sustained Engagement** (T+1-4 hours): Post standalone content, reply to raiders
4️⃣ **Follow-up** (T+24 hours): Share top performing content, thank community

**Pro Tips:**
- Coordinate timing in community channels
- Pin main thread for visibility
- Engage with every quote tweet and reply
- Track hashtag performance
- Follow up with metrics (reach, engagement)`
}

function parseThreadTweets(threadText: string, expectedCount: number): string[] {
  const lines = threadText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const tweets: string[] = []

  for (const line of lines) {
    const match = line.match(/^(?:Tweet\s*)?(\d+)[./:]?\s*(.+)$/i)
    if (match && match[2]) {
      tweets.push(match[2].trim())
    }
  }

  if (tweets.length === 0) {
    tweets.push(...lines.filter(line => line.length > 20 && /[.!?]$/.test(line)))
  }

  return tweets.slice(0, expectedCount)
}

function parsePostVariations(postsText: string, expectedCount: number): string[] {
  const lines = postsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const posts: string[] = []
  let currentPost = ''

  for (const line of lines) {
    const isHeader = /^(?:Post\s*|Quote\s*)?\d+[.:]?\s*$/i.test(line)

    if (isHeader && currentPost) {
      posts.push(currentPost.trim())
      currentPost = ''
    } else if (!isHeader) {
      currentPost += (currentPost ? ' ' : '') + line
    }
  }

  if (currentPost) {
    posts.push(currentPost.trim())
  }

  if (posts.length === 0) {
    const numbered = postsText.split(/(?:^|\n)(?:Post\s*|Quote\s*)?\d+[.:]\s*/i).filter(s => s.trim())
    posts.push(...numbered)
  }

  return posts
    .slice(0, expectedCount)
    .map(post => post.replace(/^["']|["']$/g, '').trim())
    .filter(post => post.length > 0)
}
