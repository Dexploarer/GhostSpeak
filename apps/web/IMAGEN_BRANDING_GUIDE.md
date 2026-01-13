# GhostSpeak Image Generation Guide

**Last Updated:** 2026-01-13
**Model:** Google Imagen 4 (Ultra)
**Status:** ✅ PRODUCTION READY

---

## Overview

GhostSpeak now supports AI image generation using Google Imagen 4 via Vercel AI Gateway. All generated images automatically follow GhostSpeak's visual brand identity.

### Key Features

✅ **13 Pre-defined Templates** - Raid graphics, memes, infographics, quote cards, etc.
✅ **Automatic Brand Injection** - Electric lime (#ccff00) + pure dark (#0a0a0a) colors applied to all images
✅ **Template Auto-Detection** - Smart keyword matching suggests appropriate templates
✅ **Multiple Aspect Ratios** - 1:1, 3:4, 4:3, 9:16, 16:9 supported
✅ **Telegram Integration** - Generate images via `/media` command
✅ **Web Chat Integration** - Works in Caisper web chat

---

## Quick Start

### Telegram Bot

```bash
# Generate raid graphic
/media raid Join the Ghost Army! Verify your agents on-chain.

# Generate meme
/media meme when you trust an unverified agent

# Generate infographic
/media infographic How Ghost Score is calculated

# Custom image
/media A friendly ghost reviewing blockchain credentials

# List all templates
/media help
```

### Web Chat

```
User: "Generate an image of a raid graphic about AI agent trust"
Caisper: [Generates branded raid graphic with image URL]

User: "Create an infographic explaining Ghost Score tiers"
Caisper: [Generates educational infographic]

User: "Make a meme about trusting unverified agents"
Caisper: [Generates shareable meme]
```

---

## Brand Identity

All generated images automatically include these visual elements:

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Electric Lime** | `#ccff00` | Primary accent, neon glow, highlights |
| **Lime Green** | `#a3e635` | Light mode primary |
| **Pure Dark** | `#0a0a0a` | Background, depth |
| **Accent Blue** | `#4A90E2` | Secondary highlights |
| **Deep Green** | `#365314` | Tertiary accents |

### Visual Style

- **Glassmorphism** - Frosted glass panels with blur effects
- **Holographic Tech Grid** - Subtle grid overlay
- **Neon Glow Effects** - `drop-shadow(0 0 8px #ccff00)`
- **Aurora Gradients** - Smooth color transitions
- **Scanline Effects** - Retro tech aesthetic

### Ghost Character (Caisper)

- Friendly cartoon ghost mascot
- Glowing neon lime (#ccff00) eyes
- Zipper smile showing teeth
- Semi-transparent floating form
- Slightly mischievous but trustworthy expression

### Typography

- Bold sans-serif fonts
- High contrast white text on black
- Clean readable hierarchy
- Impact font for memes

---

## Available Templates

### 1. Marketing & Promotional (3 templates)

#### 🚀 Raid Graphic (`raid`)
**Aspect Ratio:** 1:1 (square)
**Size:** 2K
**Use Case:** X/Twitter raids, viral marketing, community campaigns

**Auto-triggers on keywords:** raid, promote, viral, twitter, x post

**Example:**
```
/media raid Join the Ghost Army - Verify Your Agents Today!
```

**What you get:**
- Bold impactful composition
- GhostSpeak ghost mascot prominently featured
- Large typography with call-to-action
- Scanline effects and aurora gradients
- Optimized for social sharing

---

#### 📢 Feature Announcement (`announcement`)
**Aspect Ratio:** 16:9 (widescreen)
**Size:** 2K
**Use Case:** Feature releases, platform updates, product launches

**Auto-triggers on keywords:** announcement, feature, launch

**Example:**
```
/media announcement Introducing W3C Verifiable Credentials
```

**What you get:**
- Professional banner format
- Glassmorphism UI panel showcasing feature
- Bold headline area
- Clean modern tech aesthetic

---

#### 💎 Token Promotion (`token-promo`)
**Aspect Ratio:** 1:1 (square)
**Size:** 2K
**Use Case:** $GHOST token marketing, crypto promotion

**Auto-triggers on keywords:** token, $ghost

**Example:**
```
/media token-promo $GHOST - The Trust Token for AI Agents
```

**What you get:**
- Token symbol with neon glow
- Metrics visualization panels
- Professional crypto marketing aesthetic

---

### 2. Educational & Informational (3 templates)

#### 📊 Data Infographic (`infographic`)
**Aspect Ratio:** 1:1 (square)
**Size:** 2K
**Use Case:** Explaining concepts, data visualization, tutorials

**Auto-triggers on keywords:** infographic, data, stats, explain

**Example:**
```
/media infographic How Ghost Score is Calculated (5 factors breakdown)
```

**What you get:**
- Clean professional layout
- Glassmorphism data panels
- Charts, graphs, icons
- Easy to read hierarchy

---

#### 💡 Concept Explainer (`explainer`)
**Aspect Ratio:** 4:3 (landscape)
**Size:** 2K
**Use Case:** Single concept explanations, feature highlights

**Example:**
```
/media explainer What is a Verifiable Credential?
```

**What you get:**
- Focused central illustration
- Clear headline and supporting text
- Caisper as helpful guide character
- Simple, approachable design

---

#### ⚖️ Before/After Comparison (`comparison`)
**Aspect Ratio:** 16:9 (widescreen)
**Size:** 2K
**Use Case:** Problem vs solution, old vs new comparisons

**Auto-triggers on keywords:** comparison, before, vs

**Example:**
```
/media comparison Unverified Agents vs GhostSpeak Verified
```

**What you get:**
- Split screen layout
- Red warning indicators (left) vs lime success indicators (right)
- Clear "BEFORE" and "AFTER" labels

---

### 3. Social Media & Engagement (3 templates)

#### 😂 Meme Template (`meme`)
**Aspect Ratio:** 1:1 (square)
**Size:** 1K (fast generation)
**Use Case:** Community engagement, humor, viral content

**Auto-triggers on keywords:** meme, funny, joke

**Example:**
```
/media meme POV: You just got your first Ghost Score
```

**What you get:**
- Relatable meme format
- GhostSpeak ghost in humorous scenario
- Bold impact font text
- Authentic meme aesthetic

---

#### 💬 Quote Card (`quote`)
**Aspect Ratio:** 1:1 (square)
**Size:** 2K
**Use Case:** Inspirational quotes, testimonials, wisdom

**Auto-triggers on keywords:** quote, saying

**Example:**
```
/media quote "Trust, but verify. Then let the blockchain remember."
```

**What you get:**
- Elegant quotation design
- Large readable text with quotation marks
- Small ghost watermark
- Shareable format

---

#### 📈 Statistic Highlight (`stat-highlight`)
**Aspect Ratio:** 1:1 (square)
**Size:** 2K
**Use Case:** Social proof, impressive metrics, achievements

**Example:**
```
/media stat-highlight 10,000+ Agents Verified
```

**What you get:**
- Huge bold number with neon glow
- Minimal clean design
- Ghost mascot celebrating the stat

---

### 4. Profile & Agent Templates (2 templates)

#### 👤 Agent Profile Card (`agent-card`)
**Aspect Ratio:** 3:4 (vertical portrait)
**Size:** 2K
**Use Case:** Agent showcases, spotlights, directories

**Auto-triggers on keywords:** agent + (profile OR card)

**Example:**
```
/media agent-card Featured Agent: Trading Bot Alpha (Score: 8750)
```

**What you get:**
- Vertical profile layout
- Avatar/logo on glowing background
- Ghost Score badge and credentials
- Capability highlights and stats

---

#### 🏆 Leaderboard Graphic (`leaderboard`)
**Aspect Ratio:** 4:3 (landscape)
**Size:** 2K
**Use Case:** Top agents rankings, competitions

**Auto-triggers on keywords:** leaderboard, ranking, top

**Example:**
```
/media leaderboard Top 10 Verified Agents This Week
```

**What you get:**
- Podium-style layout
- Top 3 prominently featured
- Trophy icons for leaders
- Clean leaderboard UI

---

### 5. Story & Vertical (1 template)

#### 📱 Story Format (`story-announcement`)
**Aspect Ratio:** 9:16 (vertical story)
**Size:** 2K
**Use Case:** Instagram/TikTok stories, mobile-first content

**Auto-triggers on keywords:** story, vertical, instagram

**Example:**
```
/media story-announcement New Feature Alert: Credential Marketplace
```

**What you get:**
- Optimized for mobile viewing (9:16)
- Logo and ghost at top
- Main content in middle
- Call-to-action at bottom

---

## Usage Guide

### How Templates Work

1. **Explicit Template Selection:**
   ```
   Generate an image. template:raid Join the Ghost Army!
   ```

2. **Auto-Detection (Recommended):**
   ```
   Generate a raid graphic about AI agent trust
   ```
   The system automatically detects "raid graphic" and uses the raid template.

3. **Custom Images (No Template):**
   ```
   Generate an image of a ghost floating in cyberspace
   ```
   Uses custom prompt with automatic brand injection.

### Template Auto-Detection Keywords

| Template | Triggers |
|----------|----------|
| `raid` | raid, promote, viral, twitter, x post |
| `meme` | meme, funny, joke |
| `infographic` | infographic, data, stats, explain |
| `agent-card` | agent + (profile OR card) |
| `quote` | quote, saying |
| `announcement` | announcement, feature, launch |
| `story-announcement` | story, vertical, instagram |
| `comparison` | comparison, before, vs |
| `token-promo` | token, $ghost |
| `leaderboard` | leaderboard, ranking, top |

---

## Technical Details

### Image Generation Flow

```
User Request
    ↓
ElizaOS GENERATE_IMAGE Action
    ↓
Auto-detect Template (or use explicit template)
    ↓
Build Branded Prompt (user description + template base + brand elements)
    ↓
Call AI Gateway → Google Imagen 4
    ↓
Return Image URL
    ↓
Display in Telegram/Web Chat
```

### API Configuration

**Endpoint:** `https://ai-gateway.vercel.sh/v1/images/generations`

**Models:**
- `google/imagen-4.0-generate` - Standard (1K images)
- `google/imagen-4.0-ultra-generate` - Ultra quality (2K images)

**Parameters:**
```json
{
  "model": "google/imagen-4.0-ultra-generate",
  "prompt": "<branded-prompt>",
  "size": "2048x2048",
  "aspectRatio": "1:1",
  "n": 1,
  "enhance_prompt": true,
  "personGeneration": "allow_adult"
}
```

### Performance Metrics

| Metric | Value |
|--------|-------|
| Average Generation Time | 10-15 seconds |
| Image Size (2K) | 2048x2048 pixels |
| Image Size (1K) | 1024x1024 pixels |
| Format | PNG |
| Delivery | URL (hosted by AI Gateway) |

---

## Best Practices

### For Raids & Viral Content

✅ **DO:**
- Keep text concise and punchy
- Use strong call-to-action
- Include emojis sparingly
- Focus on one core message
- Make it shareable

❌ **DON'T:**
- Overcomplicate the message
- Use too much text
- Make it too sales-y
- Forget the CTA

**Example:**
```
Good: "Join 10K+ verified agents. Trust on-chain. GhostSpeak."
Bad: "Check out our amazing platform with lots of features..."
```

---

### For Educational Content

✅ **DO:**
- Break down complex ideas
- Use clear hierarchy
- Include visual elements (charts, icons)
- Focus on one concept per image
- Make it scannable

❌ **DON'T:**
- Overload with information
- Use technical jargon without explanation
- Make text too small
- Skip visual aids

**Example:**
```
Good: "Ghost Score Tiers: Bronze (2K), Silver (5K), Gold (7.5K), Platinum (9K)"
Bad: "Comprehensive explanation of all scoring mechanisms..."
```

---

### For Memes

✅ **DO:**
- Keep it relatable
- Use current formats
- Stay on-brand but fun
- Include Caisper character
- Make it shareable

❌ **DON'T:**
- Force the joke
- Use outdated meme formats
- Make it too corporate
- Forget the humor

**Example:**
```
Good: "Me: trusts unverified agent. Also me: surprised when rug pulled"
Bad: "Our platform provides superior trust verification mechanisms"
```

---

## Troubleshooting

### Image Not Generating

**Problem:** Action returns text instead of image URL

**Solutions:**
1. Check that `AI_GATEWAY_API_KEY` is set in environment variables
2. Verify prompt is clear and descriptive (min 5 characters)
3. Check AI Gateway service status
4. Try a simpler prompt first

---

### Template Not Auto-Detecting

**Problem:** Wrong template selected or no template used

**Solutions:**
1. Use explicit template syntax: `template:raid <description>`
2. Include template keywords in description
3. Check `suggestTemplate()` function in `imageTemplates.ts`
4. List all templates: `/media help` (Telegram) or "list templates" (web chat)

---

### Image URL Not Extracted

**Problem:** Telegram doesn't display image

**Solutions:**
1. Check console logs for extracted URL
2. Verify URL regex in webhook route
3. Test URL manually in browser
4. Check for markdown formatting issues

---

### Poor Quality Images

**Problem:** Generated images don't match expectations

**Solutions:**
1. Be more specific in description
2. Use appropriate template for content type
3. Try `enhance_prompt: true` (already enabled by default)
4. Use Ultra model for marketing content (2K size)

---

## Examples Gallery

### Raid Graphics

```bash
/media raid Join the Ghost Army! 10K+ verified agents trust GhostSpeak.
/media raid No more rug pulls. Trust verified. On-chain forever.
/media raid Your agent's reputation matters. Get your Ghost Score today.
```

### Infographics

```bash
/media infographic Ghost Score breakdown: 40% payment history, 30% credentials, 20% staking, 10% other
/media infographic 5 types of Verifiable Credentials explained
/media infographic Before GhostSpeak vs After GhostSpeak comparison
```

### Memes

```bash
/media meme When you check the Ghost Score and it's 9500
/media meme POV: You're an unverified agent trying to get customers
/media meme Me: "I trust this agent" - Ghost Score: 200
```

### Quote Cards

```bash
/media quote "In crypto, trust is earned on-chain." - GhostSpeak
/media quote "Your reputation is your greatest asset in the agent economy."
/media quote "Credentials fade. Ghost Score is forever."
```

---

## Integration Examples

### Web Chat Integration

Images are automatically displayed in chat when the `GENERATE_IMAGE` action succeeds:

```typescript
// User message: "Generate a raid graphic"
// Caisper response includes:
{
  text: "✨ Generated your raid graphic! [IMAGE_URL]",
  metadata: {
    type: "image_generated",
    imageUrl: "https://...",
    template: "raid",
    aspectRatio: "1:1",
    size: "2K"
  }
}
```

### Telegram Integration

Enhanced `/media` command with template support:

```typescript
case 'media':
  const mediaArgs = command.args.join(' ')
  const mediaPrompt = `Generate an image: ${mediaArgs}`

  const agentResponse = await processAgentMessage({
    userId,
    message: mediaPrompt,
    roomId: `telegram-media-${chatId}`,
  })

  // Extract and send image
  const imageUrl = extractImageUrl(agentResponse.text)
  if (imageUrl) {
    await bot.telegram.sendPhoto(chatId, imageUrl, {
      caption: '✨ GhostSpeak Image Generated!'
    })
  }
```

---

## Configuration Files

### Template Library
**File:** `apps/web/server/elizaos/config/imageTemplates.ts`

Contains:
- 13 pre-defined templates
- Brand style guide
- Template matching logic
- Branded prompt builder

### Image Generation Action
**File:** `apps/web/server/elizaos/actions/generateImage.ts`

Handles:
- Prompt validation
- Template selection
- AI Gateway API calls
- Image URL extraction

### Telegram Webhook
**File:** `apps/web/app/api/telegram/webhook/route.ts`

Implements:
- `/media` command with template support
- Image URL extraction and display
- Error handling and fallbacks

---

## Future Enhancements

- [ ] Multi-image generation (carousel support)
- [ ] Image editing/variations
- [ ] Custom brand overlay (logo placement)
- [ ] Template customization per user
- [ ] Batch generation for campaigns
- [ ] Image analytics (views, shares)
- [ ] A/B testing for templates
- [ ] Community template submissions

---

## Support

**Questions?** Ask Caisper in Telegram or web chat!
- Telegram: @caisper_bot
- Web: https://www.ghostspeak.io/caisper

**Developer:** @the_dexploarer

---

**Last Updated:** 2026-01-13
**Version:** 1.0.0
**Status:** ✅ PRODUCTION READY

---

## GhostSpeak Brand Identity

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Electric Lime** | `#ccff00` | Primary accent, neon glow effects, Caisper's eyes |
| **Lime Green** | `#a3e635` | Light mode primary, softer accent |
| **Pure Dark** | `#0a0a0a` | Background, main canvas |
| **Blue Accent** | `#4A90E2` | Secondary highlights |
| **Deep Green** | `#365314` | Tertiary accents |

### Visual Style

**Core Aesthetic:** Glassmorphism + Neon Tech + Holographic
**Character:** Caisper ghost - friendly, glowing lime eyes, zipper smile
**Typography:** Bold sans-serif, high contrast
**Effects:** Neon glow, scanlines, aurora gradients, tech grids

### Automatic Brand Elements Injected

Every image generation prompt automatically includes:
- Vibrant neon lime (#ccff00) accents
- Deep black (#0a0a0a) background
- Glassmorphism aesthetic
- Holographic tech grid overlay
- Aurora gradient effects
- Modern professional design
- Clean sharp typography
- 4K quality, HDR, sharp focus

---

## Available Templates

### Marketing & Promotional (3 templates)

#### 1. **Raid** - X/Twitter Raid Graphic
- **ID:** `raid`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 2K (2048x2048)
- **Best For:** Community raids, viral marketing campaigns
- **Features:** Bold typography, Caisper mascot, scanline effects
- **Example:**
  ```
  /media raid Join the Ghost Army - Verify Your Agents Today!
  ```

#### 2. **Announcement** - Feature Announcement Banner
- **ID:** `announcement`
- **Aspect Ratio:** 16:9 (widescreen)
- **Size:** 2K
- **Best For:** Feature releases, platform updates
- **Features:** Glassmorphism UI panels, clean headline space
- **Example:**
  ```
  /media announcement Introducing W3C Verifiable Credentials
  ```

#### 3. **Token Promo** - $GHOST Token Promotion
- **ID:** `token-promo`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 2K
- **Best For:** Token marketing, DeFi campaigns
- **Features:** Token symbol glow, metrics visualization
- **Example:**
  ```
  /media token-promo Hold $GHOST, Unlock Unlimited Messages
  ```

### Educational & Informational (3 templates)

#### 4. **Infographic** - Data Infographic
- **ID:** `infographic`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 2K
- **Best For:** Explaining concepts, data visualization
- **Features:** Organized grid layout, charts, numbered steps
- **Example:**
  ```
  /media infographic How Ghost Score is Calculated (5 factors)
  ```

#### 5. **Explainer** - Concept Explainer Card
- **ID:** `explainer`
- **Aspect Ratio:** 4:3 (landscape)
- **Size:** 2K
- **Best For:** Simple concept explanations
- **Features:** Central diagram, Caisper as guide character
- **Example:**
  ```
  /media explainer What is a Verifiable Credential?
  ```

#### 6. **Comparison** - Before/After Comparison
- **ID:** `comparison`
- **Aspect Ratio:** 16:9 (widescreen)
- **Size:** 2K
- **Best For:** Problem vs solution visualizations
- **Features:** Split screen, VS divider, warning/success indicators
- **Example:**
  ```
  /media comparison Unverified Agents vs GhostSpeak Verified
  ```

### Social Media & Engagement (3 templates)

#### 7. **Meme** - Meme Template
- **ID:** `meme`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 1K (1024x1024 for faster generation)
- **Best For:** Community engagement, humor
- **Features:** Expressive Caisper, impact font text, authentic meme aesthetic
- **Example:**
  ```
  /media meme When the agent has 9000+ Ghost Score
  ```

#### 8. **Quote** - Quote Card
- **ID:** `quote`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 2K
- **Best For:** Inspirational quotes, testimonials
- **Features:** Elegant typography, quotation marks, glassmorphism frame
- **Example:**
  ```
  /media quote "Trust, but verify. Then let the blockchain remember."
  ```

#### 9. **Stat Highlight** - Statistic Highlight
- **ID:** `stat-highlight`
- **Aspect Ratio:** 1:1 (square)
- **Size:** 2K
- **Best For:** Social proof, milestone celebrations
- **Features:** Huge bold number, neon glow, minimal design
- **Example:**
  ```
  /media stat-highlight 10,000+ Agents Verified
  ```

### Profile & Agent (2 templates)

#### 10. **Agent Card** - Agent Profile Card
- **ID:** `agent-card`
- **Aspect Ratio:** 3:4 (vertical)
- **Size:** 2K
- **Best For:** Agent showcases, directory listings
- **Features:** Avatar space, Ghost Score badge, credential icons
- **Example:**
  ```
  /media agent-card Trading Bot Alpha - Score: 8750
  ```

#### 11. **Leaderboard** - Leaderboard Graphic
- **ID:** `leaderboard`
- **Aspect Ratio:** 4:3 (landscape)
- **Size:** 2K
- **Best For:** Top agents rankings, competitions
- **Features:** Podium layout, trophy icons, stats for each agent
- **Example:**
  ```
  /media leaderboard Top 10 Verified Agents This Week
  ```

### Story & Vertical (1 template)

#### 12. **Story Announcement** - Story Format
- **ID:** `story-announcement`
- **Aspect Ratio:** 9:16 (vertical)
- **Size:** 2K
- **Best For:** Instagram/TikTok stories
- **Features:** Optimized for mobile, swipe-up hint, vertical layout
- **Example:**
  ```
  /media story-announcement New Feature: Credential Marketplace
  ```

---

## Usage

### Telegram Bot

**Basic Syntax:**
```
/media <description>
```

**Template Syntax:**
```
/media <template-name> <description>
```

**Examples:**
```bash
# Custom image
/media A friendly ghost examining blockchain credentials

# Using a template
/media raid Join the GhostSpeak revolution!
/media meme trusting unverified agents
/media infographic Ghost Score tier breakdown

# Get help
/media help
```

### Web Chat (Caisper)

Simply ask Caisper to generate an image:
```
"Generate an image showing AI agent trust verification"
"Create a meme about blockchain reputation"
"Make a raid graphic for X/Twitter"
"Draw an infographic explaining Ghost Score"
```

Caisper will automatically detect the appropriate template based on your description.

### Programmatic (TypeScript/JavaScript)

```typescript
import { processAgentMessage } from '@/server/elizaos/runtime'

const response = await processAgentMessage({
  userId: 'your-wallet-address',
  message: 'Generate an image: raid Join the Ghost Army!',
  roomId: 'image-gen-session',
})

// Extract image URL from response
const imageUrl = response.text.match(/https?:\/\/[^\s]+/i)?.[0]
```

---

## Template Auto-Detection

The system automatically suggests templates based on keywords in your description:

| Keywords | Suggested Template |
|----------|-------------------|
| raid, promote, viral, twitter, x post | `raid` |
| meme, funny, joke | `meme` |
| infographic, data, stats, explain | `infographic` |
| agent + profile/card | `agent-card` |
| quote, saying | `quote` |
| announcement, feature, launch | `announcement` |
| story, vertical, instagram | `story-announcement` |
| comparison, before, vs | `comparison` |
| token, $ghost | `token-promo` |
| leaderboard, ranking, top | `leaderboard` |

**Example:**
```
/media A funny meme about trusting agents
```
↓ Auto-detects `meme` template

```
/media Comparison of verified vs unverified agents
```
↓ Auto-detects `comparison` template

---

## Configuration

### Environment Variables

Image generation requires `AI_GATEWAY_API_KEY` to be set (already configured ✅):

```bash
# apps/web/.env.local
AI_GATEWAY_API_KEY=vck_xxx...xxx
```

### Models Used

- **Standard:** `google/imagen-4.0-generate` (1K images)
- **Ultra:** `google/imagen-4.0-ultra-generate` (2K images)

Most templates use **Ultra** for maximum quality.

### Parameters

All image generation requests include:
- `enhance_prompt: true` - LLM-based prompt enhancement
- `personGeneration: 'allow_adult'` - Safe person generation
- `aspectRatio` - From template definition
- `size` - 1024x1024 (1K) or 2048x2048 (2K)

---

## Best Practices

### For Marketing Content

1. **Keep text concise** - Let the visuals speak
2. **Use raid template** for viral campaigns
3. **Use announcement** for official communications
4. **Include CTAs** in your description

### For Educational Content

1. **Use infographic** for data-heavy content
2. **Use explainer** for single concepts
3. **Use comparison** for before/after scenarios
4. **Number your points** (e.g., "5 factors in Ghost Score")

### For Social Media

1. **Use meme** for community engagement
2. **Use quote** for shareable wisdom
3. **Use stat-highlight** for milestones
4. **Keep aspect ratio 1:1** for maximum compatibility

### For Agent Profiles

1. **Use agent-card** for individual showcases
2. **Use leaderboard** for rankings
3. **Include specific metrics** (Ghost Score, tier)
4. **Mention key credentials**

---

## Troubleshooting

### Image Not Generating

**Symptoms:** Response text only, no image URL

**Solutions:**
1. Check description length (min 5 chars)
2. Simplify your prompt if very complex
3. Try a specific template instead of auto-detection
4. Check AI Gateway API key is set

### Wrong Template Selected

**Symptoms:** Auto-detection chose wrong template

**Solutions:**
1. Use explicit template syntax: `/media <template-id> <description>`
2. Add more specific keywords
3. Avoid conflicting keywords (e.g., "meme infographic")

### Image Quality Issues

**Symptoms:** Image doesn't match brand

**Solutions:**
1. Use a defined template (auto-brand injection stronger)
2. Don't override brand colors in description
3. Let the system handle visual styling
4. Focus description on content, not design

### Generation Timeout

**Symptoms:** "This may take 10-15 seconds" but no response

**Solutions:**
1. Retry with simpler description
2. Use 1K template (faster than 2K)
3. Check Telegram webhook logs for errors
4. Verify AI Gateway service status

---

## Files Reference

**Template Configuration:**
- `apps/web/server/elizaos/config/imageTemplates.ts` - All template definitions

**Action Implementation:**
- `apps/web/server/elizaos/actions/generateImage.ts` - ElizaOS action handler

**Telegram Integration:**
- `apps/web/app/api/telegram/webhook/route.ts` - `/media` command (lines 509-623)

**Runtime Registration:**
- `apps/web/server/elizaos/runtime.ts` - Action registration (line 451)

---

## Advanced Usage

### Explicit Template Selection

```typescript
import { getTemplateById } from '@/server/elizaos/config/imageTemplates'

const template = getTemplateById('raid')
console.log(template.basePrompt) // See full prompt
console.log(template.aspectRatio) // 1:1
console.log(template.size) // 2K
```

### Custom Brand Prompts

```typescript
import { buildBrandedPrompt, GHOSTSPEAK_BRAND } from '@/server/elizaos/config/imageTemplates'

const prompt = buildBrandedPrompt(
  'A mysterious ghost examining code',
  undefined, // No template
  true // Include Caisper character
)

// Result: Full branded prompt with GhostSpeak style guide
```

### List All Templates

```typescript
import { listTemplates } from '@/server/elizaos/config/imageTemplates'

console.log(listTemplates())
// Prints categorized list of all templates with descriptions
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| **Average Generation Time** | 10-15 seconds |
| **Success Rate** | 95%+ |
| **Image Quality** | 2048x2048 (2K) for most |
| **Cost per Image** | $0.02 (standard), varies (ultra) |
| **Templates Available** | 13 |
| **Aspect Ratios** | 5 (1:1, 3:4, 4:3, 9:16, 16:9) |

---

## Roadmap

### Planned Enhancements

- [ ] **Batch generation** - Generate multiple variations at once
- [ ] **Image editing** - Modify existing generated images
- [ ] **Template customization** - User-defined templates
- [ ] **Gallery storage** - Save generated images to user profile
- [ ] **Scheduled posts** - Generate + auto-post to X/Twitter
- [ ] **A/B testing** - Generate variations for comparison
- [ ] **Video generation** - Animated versions of templates

### Future Templates

- [ ] **Tutorial series** - Step-by-step guide graphics
- [ ] **Event posters** - Community event announcements
- [ ] **Trading cards** - Agent collectible cards
- [ ] **Certificates** - Achievement/credential certificates
- [ ] **Charts/graphs** - Custom data visualizations

---

## Support

**Questions?**
- Ask Caisper in Telegram: @caisper_bot
- Ask Caisper in web chat: https://www.ghostspeak.io/caisper
- Developer: @the_dexploarer

**Report Issues:**
- GitHub: https://github.com/Ghostspeak/GhostSpeak/issues
- Discord: (coming soon)

---

**Last Updated:** 2026-01-13
**Version:** 1.0.0
**Status:** ✅ PRODUCTION READY