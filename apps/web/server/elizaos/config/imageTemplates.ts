/**
 * Image Generation Templates for GhostSpeak
 *
 * Branded prompt templates for Google Imagen 4 image generation.
 * All templates maintain GhostSpeak's visual identity:
 * - Primary: Electric Lime (#ccff00) on Pure Dark (#0a0a0a)
 * - Style: Glassmorphism, neon glow, holographic tech aesthetic
 * - Character: Caisper ghost with glowing lime eyes and zipper smile
 */

export type ImageSource = 'web' | 'telegram'

export interface ImageTemplate {
  /**
   * Template identifier
   */
  id: string

  /**
   * Human-readable name
   */
  name: string

  /**
   * Template description
   */
  description: string

  /**
   * Aspect ratio for generated image
   * - 1:1 - Square (ideal for social media posts)
   * - 3:4 - Portrait (vertical agent cards)
   * - 4:3 - Landscape (presentations)
   * - 9:16 - Vertical story (Instagram/TikTok)
   * - 16:9 - Widescreen (banners, headers)
   */
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'

  /**
   * Image size
   * - 1K - Faster generation, lower cost
   * - 2K - Higher quality for marketing
   */
  size: '1K' | '2K'

  /**
   * Base prompt with GhostSpeak branding baked in
   * User's description will be appended to this
   */
  basePrompt: string

  /**
   * Category for organization
   */
  category: 'marketing' | 'educational' | 'social' | 'promotional' | 'profile'

  /**
   * Allowed sources for this template
   * - web: Product-focused templates only (no viral/social content)
   * - telegram: All templates including raids, memes, viral content
   * If undefined, defaults to both
   */
  allowedSources?: ImageSource[]

  /**
   * Example use cases
   */
  examples: string[]
}

/**
 * GhostSpeak Brand Style Guide
 * Core visual identity elements to inject into all prompts
 */
export const GHOSTSPEAK_BRAND = {
  /**
   * Primary color palette
   */
  colors: {
    primary: '#ccff00', // Electric lime (neon)
    primaryLight: '#a3e635', // Lime green (light mode)
    background: '#0a0a0a', // Pure dark
    accent1: '#4A90E2', // Blue
    accent2: '#365314', // Deep green
  },

  /**
   * Visual style keywords
   */
  style: [
    'vibrant neon lime (#ccff00) accents',
    'deep black (#0a0a0a) background',
    'glassmorphism aesthetic',
    'holographic tech grid overlay',
    'aurora gradient effects',
    'modern professional design',
    'clean sharp typography',
  ],

  /**
   * Caisper ghost character description
   */
  character: {
    full: 'friendly cartoon ghost mascot with glowing neon lime (#ccff00) eyes, zipper smile showing teeth, floating ethereal semi-transparent form, slightly mischievous but trustworthy expression',
    simple: 'GhostSpeak ghost mascot with neon lime glowing eyes and zipper smile',
    minimal: 'friendly ghost with lime neon eyes',
  },

  /**
   * Quality and technical modifiers
   */
  quality: ['4K quality', 'HDR', 'sharp focus', 'professional photography lighting'],
}

/**
 * Build complete branded prompt
 */
export function buildBrandedPrompt(
  userDescription: string,
  template?: ImageTemplate,
  includeCharacter: boolean = true
): string {
  const parts: string[] = []

  // Start with user description
  parts.push(userDescription)

  // Add template base prompt if provided
  if (template) {
    parts.push(template.basePrompt)
  } else {
    // Default branding
    parts.push(GHOSTSPEAK_BRAND.style.slice(0, 4).join(', '))
  }

  // Add ghost character if requested
  if (includeCharacter) {
    parts.push(`Featuring ${GHOSTSPEAK_BRAND.character.simple}`)
  }

  // Add quality modifiers
  parts.push(GHOSTSPEAK_BRAND.quality.join(', '))

  return parts.join('. ')
}

/**
 * Marketing & Promotional Templates
 * For X/Twitter raids, announcements, campaigns
 */
export const MARKETING_TEMPLATES: ImageTemplate[] = [
  {
    id: 'raid',
    name: 'X/Twitter Raid Graphic',
    description: 'Eye-catching promotional graphic for community raids and viral marketing',
    aspectRatio: '1:1',
    size: '2K',
    category: 'promotional',
    allowedSources: ['telegram'], // TELEGRAM ONLY - viral/social content
    basePrompt:
      'Dynamic promotional social media graphic for X/Twitter. Bold impactful composition with GhostSpeak ghost mascot (glowing neon lime eyes, zipper smile) prominently featured. Large bold typography with call-to-action text. Vibrant neon lime (#ccff00) accents on pure black (#0a0a0a) background. Holographic tech grid overlay. Scanline effects. Aurora gradient backdrop. Eye-catching shareable design optimized for viral engagement. Modern tech aesthetic. Professional marketing quality.',
    examples: [
      'Join the Ghost Army - Verify Your Agents Today!',
      'Trust the Process - GhostSpeak Reputation on Solana',
      'No More Rug Pulls - AI Agent Trust Verified',
    ],
  },
  {
    id: 'announcement',
    name: 'Feature Announcement Banner',
    description: 'Widescreen banner for feature releases and platform updates',
    aspectRatio: '16:9',
    size: '2K',
    category: 'promotional',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused announcement
    basePrompt:
      'Professional feature announcement banner in widescreen format. GhostSpeak branding with neon lime (#ccff00) accent highlights on deep black (#0a0a0a). Glassmorphism UI panel showcasing new feature. Holographic grid background. Aurora gradient glow effects. Bold headline area with clear readable text. Modern tech product aesthetic. Clean professional design. Space for feature visualization on right side.',
    examples: [
      'Introducing W3C Verifiable Credentials',
      'New: x402 Payment Protection',
      'Ghost Score 2.0 - Enhanced Reputation System',
    ],
  },
  {
    id: 'token-promo',
    name: 'Token Promotion Card',
    description: 'Square promotional card for $GHOST token marketing',
    aspectRatio: '1:1',
    size: '2K',
    category: 'promotional',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused token info
    basePrompt:
      'Cryptocurrency token promotional card. $GHOST token symbol prominently displayed with neon lime (#ccff00) glow effect. GhostSpeak ghost mascot positioned confidently. Deep black (#0a0a0a) background with holographic tech elements. Token metrics visualization panels with glassmorphism. Aurora gradient accents. Professional crypto marketing aesthetic. Bold typography for token name and value proposition. Scanline overlay for tech feel.',
    examples: [
      '$GHOST - The Trust Token for AI Agents',
      'Hold $GHOST, Unlock Unlimited Messages',
      '$GHOST Staking - Earn While You Verify',
    ],
  },
]

/**
 * Educational & Informational Templates
 * For explainers, tutorials, guides
 */
export const EDUCATIONAL_TEMPLATES: ImageTemplate[] = [
  {
    id: 'infographic',
    name: 'Data Infographic',
    description: 'Professional infographic for explaining concepts and data visualization',
    aspectRatio: '1:1',
    size: '2K',
    category: 'educational',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused education
    basePrompt:
      'Clean professional infographic design. Glassmorphism data visualization panels arranged in organized grid layout. Neon lime (#ccff00) accent highlights for key data points on deep black (#0a0a0a) background. Modern sans-serif typography. Charts, graphs, and icons in consistent style. Holographic tech grid subtle overlay. Step-by-step flow with numbered sections. Information hierarchy clearly established. Professional educational aesthetic. Easy to read and understand.',
    examples: [
      'How Ghost Score is Calculated (5 factors breakdown)',
      'Agent Verification Process (3-step flow)',
      'Credential Types Explained (W3C VC taxonomy)',
    ],
  },
  {
    id: 'explainer',
    name: 'Concept Explainer Card',
    description: 'Simple visual explanation of a single concept or feature',
    aspectRatio: '4:3',
    size: '2K',
    category: 'educational',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused education
    basePrompt:
      'Educational explainer card with single focused concept. Central illustration or diagram explaining the idea. Neon lime (#ccff00) highlights on black (#0a0a0a) for emphasis. Clear headline at top. Supporting text in clean readable font. GhostSpeak ghost mascot as helpful guide character pointing to key elements. Glassmorphism info panel. Tech grid background. Simple, approachable, not overwhelming. Modern educational design.',
    examples: [
      'What is a Verifiable Credential?',
      'How x402 Payments Protect You',
      'Understanding Ghost Score Tiers',
    ],
  },
  {
    id: 'comparison',
    name: 'Before/After Comparison',
    description: 'Split comparison showing problem vs solution or old vs new',
    aspectRatio: '16:9',
    size: '2K',
    category: 'educational',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused education
    basePrompt:
      'Widescreen before/after comparison graphic split down the middle. Left side (BEFORE): darker, red warning indicators, showing problem state. Right side (AFTER): neon lime (#ccff00) success indicators, showing GhostSpeak solution. Clear dividing line with VS or arrow. Both sides on black (#0a0a0a) background. Glassmorphism panels. Icons and simple illustrations. Bold labels "BEFORE" and "AFTER". Professional educational comparison design.',
    examples: [
      'Unverified Agents vs GhostSpeak Verified',
      'Traditional Trust vs On-Chain Reputation',
      'Manual Checks vs Automated Ghost Score',
    ],
  },
]

/**
 * Social Media & Engagement Templates
 * For memes, quotes, community content
 */
export const SOCIAL_TEMPLATES: ImageTemplate[] = [
  {
    id: 'meme',
    name: 'Meme Template',
    description: 'Shareable meme format for community engagement and humor',
    aspectRatio: '1:1',
    size: '1K',
    category: 'social',
    allowedSources: ['telegram'], // TELEGRAM ONLY - viral/social content
    basePrompt:
      'Relatable meme-style image. GhostSpeak ghost mascot (neon lime glowing eyes, expressive zipper smile) in humorous scenario or expression. Bold impact font text at top and/or bottom. Simple composition focused on character and joke. Neon lime (#ccff00) highlights on black (#0a0a0a) background. Shareable social media format. Fun lighthearted tone while maintaining brand identity. Not too polished - authentic meme aesthetic.',
    examples: [
      'Me checking agent reputation / Me trusting blindly (two-panel)',
      'POV: You just got your first Ghost Score',
      'When the agent has 9000+ Ghost Score (impressed ghost face)',
    ],
  },
  {
    id: 'quote',
    name: 'Quote Card',
    description: 'Inspirational or educational quote with GhostSpeak branding',
    aspectRatio: '1:1',
    size: '2K',
    category: 'social',
    allowedSources: ['telegram'], // TELEGRAM ONLY - viral/social content
    basePrompt:
      'Elegant quote card design. Large readable quotation text in center with quotation marks. Neon lime (#ccff00) accent on select words or quotation marks. Deep black (#0a0a0a) background with subtle holographic grid. Small GhostSpeak ghost mascot watermark in corner. Attribution text below quote. Glassmorphism frame around text. Professional yet shareable. Modern typography. Calming tech aesthetic.',
    examples: [
      '"Trust, but verify. Then let the blockchain remember." - GhostSpeak',
      '"Your reputation is your greatest asset in the agent economy."',
      '"Credentials fade. Ghost Score is forever."',
    ],
  },
  {
    id: 'stat-highlight',
    name: 'Statistic Highlight',
    description: 'Single impressive stat or metric for social proof',
    aspectRatio: '1:1',
    size: '2K',
    category: 'social',
    allowedSources: ['telegram'], // TELEGRAM ONLY - viral/social content
    basePrompt:
      'Impactful single statistic highlight card. Huge bold number or percentage in center with neon lime (#ccff00) glow effect. Supporting context text below in smaller font. GhostSpeak ghost mascot celebrating or presenting the stat. Black (#0a0a0a) background with aurora gradient accent. Minimal clean design putting focus on the number. Glassmorphism subtle frame. Social proof aesthetic. Shareable format.',
    examples: [
      '10,000+ Agents Verified',
      '99.7% Fraud Detection Rate',
      '$5M+ in Protected Transactions',
    ],
  },
]

/**
 * Profile & Agent Templates
 * For agent showcases, spotlights, directories
 */
export const PROFILE_TEMPLATES: ImageTemplate[] = [
  {
    id: 'agent-card',
    name: 'Agent Profile Card',
    description: 'Vertical profile card showcasing an individual agent',
    aspectRatio: '3:4',
    size: '2K',
    category: 'profile',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused agent showcase
    basePrompt:
      'Professional vertical agent profile card. Top third: agent avatar or logo on neon lime (#ccff00) glowing circular background. Middle section: glassmorphism panel with agent name, Ghost Score badge, and key credentials as icons. Bottom third: capability highlights and trust metrics. Black (#0a0a0a) background. Holographic tech grid overlay. Clean modern layout. Professional directory aesthetic. Verification checkmark badge. Stats visualization.',
    examples: [
      'Featured Agent: Trading Bot Alpha (Score: 8750)',
      'New Verified Agent: Content Creator Pro',
      'Agent Spotlight: DeFi Strategist',
    ],
  },
  {
    id: 'leaderboard',
    name: 'Leaderboard Graphic',
    description: 'Top agents leaderboard or ranking visualization',
    aspectRatio: '4:3',
    size: '2K',
    category: 'profile',
    allowedSources: ['web', 'telegram'], // BOTH - product-focused agent showcase
    basePrompt:
      'Agent leaderboard ranking visualization. Podium-style layout with top 3 agents prominently featured. Each entry shows agent avatar, name, Ghost Score with neon lime (#ccff00) highlights for leaders. Glassmorphism ranking cards stacked vertically. Black (#0a0a0a) background with holographic grid. Trophy or crown icons for top performers. Clean modern leaderboard UI. Professional competitive aesthetic. Stats and badges for each agent.',
    examples: [
      'Top 10 Verified Agents This Week',
      'Highest Ghost Scores - December 2025',
      'Rising Stars - New Agent Rankings',
    ],
  },
]

/**
 * Story & Vertical Templates
 * For Instagram/TikTok stories, vertical formats
 */
export const STORY_TEMPLATES: ImageTemplate[] = [
  {
    id: 'story-announcement',
    name: 'Story Format Announcement',
    description: 'Vertical story format for Instagram/TikTok',
    aspectRatio: '9:16',
    size: '2K',
    category: 'promotional',
    allowedSources: ['telegram'], // TELEGRAM ONLY - viral/social story format
    basePrompt:
      'Vertical mobile story format (9:16). Top quarter: GhostSpeak logo and ghost mascot. Middle half: main announcement content with bold text and visual element. Bottom quarter: call-to-action with swipe-up gesture hint. Neon lime (#ccff00) accents throughout on black (#0a0a0a) background. Glassmorphism panels. Holographic tech elements. Optimized for mobile viewing. Professional story aesthetic. Clear readable text from top to bottom.',
    examples: [
      'New Feature Alert: Credential Marketplace',
      'Weekly Ghost Score Update',
      'Agent of the Week Spotlight',
    ],
  },
]

/**
 * Complete template registry
 */
export const ALL_TEMPLATES: ImageTemplate[] = [
  ...MARKETING_TEMPLATES,
  ...EDUCATIONAL_TEMPLATES,
  ...SOCIAL_TEMPLATES,
  ...PROFILE_TEMPLATES,
  ...STORY_TEMPLATES,
]

/**
 * Get template by ID with optional source filtering
 */
export function getTemplateById(id: string, source?: ImageSource): ImageTemplate | undefined {
  const template = ALL_TEMPLATES.find((t) => t.id === id)
  if (!template) return undefined

  // If source is specified, check if template allows it
  if (source && template.allowedSources && !template.allowedSources.includes(source)) {
    return undefined // Template not allowed for this source
  }

  return template
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: ImageTemplate['category']
): ImageTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get template suggestions based on user description
 * Filters by source if specified
 */
export function suggestTemplate(
  description: string,
  source?: ImageSource
): ImageTemplate | undefined {
  const lower = description.toLowerCase()

  // Keyword matching with source filtering
  if (
    lower.includes('raid') ||
    lower.includes('promote') ||
    lower.includes('viral') ||
    lower.includes('twitter') ||
    lower.includes('x post')
  ) {
    return getTemplateById('raid', source)
  }

  if (lower.includes('meme') || lower.includes('funny') || lower.includes('joke')) {
    return getTemplateById('meme', source)
  }

  if (
    lower.includes('infographic') ||
    lower.includes('data') ||
    lower.includes('stats') ||
    lower.includes('explain')
  ) {
    return getTemplateById('infographic', source)
  }

  if (lower.includes('agent') && (lower.includes('profile') || lower.includes('card'))) {
    return getTemplateById('agent-card', source)
  }

  if (lower.includes('quote') || lower.includes('saying')) {
    return getTemplateById('quote', source)
  }

  if (
    lower.includes('announcement') ||
    lower.includes('feature') ||
    lower.includes('launch')
  ) {
    return getTemplateById('announcement', source)
  }

  if (lower.includes('story') || lower.includes('vertical') || lower.includes('instagram')) {
    return getTemplateById('story-announcement', source)
  }

  if (lower.includes('comparison') || lower.includes('before') || lower.includes('vs')) {
    return getTemplateById('comparison', source)
  }

  if (lower.includes('token') || lower.includes('$ghost')) {
    return getTemplateById('token-promo', source)
  }

  if (lower.includes('leaderboard') || lower.includes('ranking') || lower.includes('top')) {
    return getTemplateById('leaderboard', source)
  }

  // Default to general infographic for educational content
  return undefined
}

/**
 * List all available templates with descriptions
 * Filters by source if specified
 */
export function listTemplates(source?: ImageSource): string {
  // Filter templates by source
  const filteredTemplates = source
    ? ALL_TEMPLATES.filter(
        (t) => !t.allowedSources || t.allowedSources.includes(source)
      )
    : ALL_TEMPLATES

  const grouped = new Map<string, ImageTemplate[]>()

  for (const template of filteredTemplates) {
    const existing = grouped.get(template.category) || []
    existing.push(template)
    grouped.set(template.category, existing)
  }

  const lines: string[] = ['📸 **Available Image Templates:**\n']

  for (const [category, templates] of Array.from(grouped.entries())) {
    lines.push(`\n**${category.toUpperCase()}**`)
    for (const t of templates) {
      lines.push(`• \`${t.id}\` - ${t.name} (${t.aspectRatio})`)
      lines.push(`  ${t.description}`)
    }
  }

  lines.push('\n**Usage:** `/media <template-id> <your description>`')
  lines.push('Example: `/media raid Join the GhostSpeak revolution!`')

  return lines.join('\n')
}
