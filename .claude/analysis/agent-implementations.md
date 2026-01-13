# Agent Implementations Analysis

**Date:** January 13, 2026
**Analyst:** Claude Code
**Purpose:** Complete inventory of all AI agents across GhostSpeak monorepo

---

## Executive Summary

GhostSpeak operates **two distinct AI agents** (Caisper and Boo) using a shared ElizaOS runtime. Both agents are accessible across multiple platforms (web, Telegram bots, and miniapp API) but with inconsistent integration patterns and some duplication issues.

**Key Finding:** Agent architecture is functional but has deployment inconsistencies and missing cross-platform features.

---

## 1. Agent Inventory

### 1.1 Caisper - The Verification Ghost

**Purpose:** Credential verification, reputation analysis, trust assessment
**Character Type:** Professional, analytical, security-focused
**Personality:** Bouncer & Concierge of the Solana Agents Club

**Capabilities:**
- Agent discovery and search
- Ghost Score verification (0-1000 reputation)
- W3C Verifiable Credentials issuance/verification
- Trust assessments ("vibe checks")
- Agent directory browsing
- Historical reputation tracking
- Token portfolio evaluation
- Ouija board visualization

### 1.2 Boo - The Marketing Ghost

**Purpose:** AI image generation, community marketing, media creation
**Character Type:** Creative, playful, community-focused
**Personality:** Social media manager & meme artist

**Capabilities:**
- AI image generation (Google Imagen 4)
- Template-based marketing materials (raids, memes, quotes)
- Caption generation
- Community gallery management
- Image voting/curation
- Quota management (3/day free, 100/day holder)

---

## 2. Where Agents Are Defined

### 2.1 Character Files

**Caisper:**
- **Primary:** `/Users/home/projects/GhostSpeak/apps/web/server/elizaos/Caisper.json`
- **Duplicate:** `/Users/home/projects/GhostSpeak/apps/web/Caisper.json` ⚠️ **ISSUE**

**Boo:**
- **Location:** `/Users/home/projects/GhostSpeak/apps/web/server/elizaos/characters/boo.ts`

**Issue Identified:** Caisper character file exists in two locations. The duplicate should be removed to prevent versioning conflicts.

### 2.2 Character Structure

#### Caisper Character (JSON)
```json
{
  "name": "Caisper",
  "bio": "Bouncer & Concierge of the Solana Agents Club...",
  "lore": "Born from the convergence of cryptography and consciousness...",
  "knowledge": [
    "Expert in Solana blockchain architecture",
    "W3C Verifiable Credentials specialist",
    "Ghost Score reputation system",
    "Agent identity verification"
  ],
  "messageExamples": [
    {
      "user": "{{user1}}: What's the ghost score for this agent?",
      "content": {"text": "Let me check their reputation..."}
    }
  ],
  "postExamples": [...],
  "topics": ["reputation", "credentials", "verification", "solana"],
  "style": {
    "all": ["professional", "analytical", "trustworthy"],
    "chat": ["direct", "informative", "security-focused"]
  },
  "adjectives": ["knowledgeable", "reliable", "thorough"]
}
```

#### Boo Character (TypeScript)
```typescript
export const booCharacter: Character = {
  name: "Boo",
  username: "boo_gs",
  bio: [
    "GhostSpeak's creative marketing ghost",
    "AI image generation wizard",
    "Community meme curator"
  ],
  lore: [
    "Materialized from the collective creativity of the Ghost Army",
    "Specializes in visual storytelling and community engagement"
  ],
  messageExamples: [
    {
      user: "{{user1}}",
      content: { text: "Create a raid image for our community!" }
    },
    {
      user: "Boo",
      content: { text: "On it! What's the vibe - hype, mysterious, or fun?" }
    }
  ],
  postExamples: [],
  topics: ["image-generation", "marketing", "community", "memes"],
  adjectives: ["creative", "playful", "energetic", "community-focused"],
  style: {
    all: ["friendly", "casual", "enthusiastic"],
    chat: ["helpful", "creative", "supportive"]
  },
  plugins: []
}
```

---

## 3. Runtime Implementation

### 3.1 Shared ElizaOS Runtime

**Location:** `/Users/home/projects/GhostSpeak/apps/web/server/elizaos/runtime.ts`

Both agents share the same ElizaOS runtime infrastructure but with character-specific configuration:

```typescript
// Simplified architecture
export async function initializeAgent(
  characterId: 'caisper' | 'boo' = 'caisper'
): Promise<IAgentRuntime> {
  // Check cache
  if (runtimeInstances.has(characterId)) {
    return runtimeInstances.get(characterId)!
  }

  // Load character
  const character = characterId === 'boo'
    ? booCharacter
    : CaisperCharacter

  // Create runtime
  const runtime = new AgentRuntime({
    character,
    databaseAdapter: new ConvexDatabaseAdapter(),
    modelProvider: ModelProviderName.OPENAI,
    serverUrl: process.env.NEXT_PUBLIC_APP_URL,
    token: process.env.OPENAI_API_KEY
  })

  // Register character-specific actions
  if (characterId === 'caisper') {
    // 12 verification actions
    runtime.registerAction(discoverAgentsAction)
    runtime.registerAction(ghostScoreAction)
    runtime.registerAction(getCredentialsAction)
    runtime.registerAction(issueCredentialAction)
    runtime.registerAction(trustAssessmentAction)
    runtime.registerAction(agentDirectoryAction)
    runtime.registerAction(evaluateAgentTokensAction)
    runtime.registerAction(scoreHistoryAction)
    runtime.registerAction(getUserPortfolioAction)
    runtime.registerAction(generateOuijaAction)
    runtime.registerAction(queryX402AgentAction)
    runtime.registerAction(claimAgentAction)
  } else if (characterId === 'boo') {
    // 5 marketing actions
    runtime.registerAction(generateImageAction)
    runtime.registerAction(showMyImagesAction)
    runtime.registerAction(writeCaptionAction)
    runtime.registerAction(checkQuotaAction)
    runtime.registerAction(generateOuijaAction) // Shared
  }

  // Cache instance
  runtimeInstances.set(characterId, runtime)
  return runtime
}
```

### 3.2 Action Breakdown

#### Caisper Actions (12 total)

1. **discoverAgentsAction** - Search agent directory by criteria
   - Calls: `convex/ghostDiscovery.ts:discoverAgents`

2. **claimAgentAction** - Register/claim agent ownership
   - Calls: `convex/ghostDiscovery.ts:claimAgent`

3. **queryX402AgentAction** - Query agent's x402 endpoint
   - Calls: `convex/observation.ts:testSingleEndpoint`

4. **ghostScoreAction** - Get agent's reputation score
   - Calls: `convex/ghostScoreCalculator.ts:calculateGhostScore`

5. **getCredentialsAction** - View issued credentials
   - Calls: `convex/credentials.ts:getAgentCredentials`

6. **issueCredentialAction** - Issue new W3C VC
   - Calls: `convex/credentials.ts:issueCredential`

7. **trustAssessmentAction** - Vibe check for agents
   - Uses LLM to analyze agent profile + history

8. **agentDirectoryAction** - Browse all agents
   - Calls: `convex/ghostDiscovery.ts:getDiscoveredAgents`

9. **evaluateAgentTokensAction** - Token portfolio analysis
   - Calls Solana RPC for token balances

10. **scoreHistoryAction** - Historical Ghost Score data
    - Calls: `convex/ghostScoreHistory.ts:getScoreHistory`

11. **getUserPortfolioAction** - User's stats and scores
    - Calls: `convex/users.ts:getUserProfile`

12. **generateOuijaAction** - Ouija board visualization
    - Generates mystical agent reputation display

#### Boo Actions (5 total)

1. **generateImageAction** - AI image generation
   - **Templates:** raid, meme, quote, infographic, announcement
   - **Model:** Google Imagen 4 via AI Gateway
   - **Process:**
     1. Parse user prompt + template
     2. Check quota (3/day free, 100/day holder)
     3. Enhance prompt with GhostSpeak branding
     4. Call AI Gateway (8-20s generation)
     5. Store in Convex storage
     6. Return image URL + metadata

2. **showMyImagesAction** - User's image gallery
   - Calls: `convex/images.ts:getUserImages`

3. **writeCaptionAction** - Caption generation
   - Uses LLM to create social media captions

4. **checkQuotaAction** - Check daily image quota
   - Calls: `convex/messageQuota.ts:checkMessageQuota`

5. **generateOuijaAction** - Shared with Caisper
   - Mystical visualization

---

## 4. Where Agents Are Accessible

### 4.1 Accessibility Matrix

| Platform | Caisper | Boo | Integration Method |
|----------|---------|-----|-------------------|
| **Web App** | ✅ `/caisper` page | ❌ No dedicated UI | Direct chat interface |
| **Telegram Bot** | ✅ `@caisper_bot` | ✅ `@boo_gs_bot` | Webhook integration |
| **Mini App** | ⚠️ API only (verify tab) | ⚠️ API only (create tab) | Proxied API calls |
| **REST API** | ✅ `/api/agent/chat?characterId=caisper` | ✅ `/api/agent/chat?characterId=boo` | Public HTTP endpoint |

#### Legend:
- ✅ Full integration
- ⚠️ Limited/indirect access
- ❌ Not available

### 4.2 Platform-Specific Implementations

#### Web App (`apps/web`)

**Caisper Page:** `/apps/web/app/caisper/page.tsx`
```typescript
export default function CaisperPage() {
  return (
    <AgentChatInterface
      characterId="caisper"
      title="Caisper - The Verification Ghost"
      description="Check agent reputation, verify credentials, assess trust"
    />
  )
}
```

**Features:**
- Full chat interface with streaming responses
- Message history (persisted in Convex)
- Action result cards (Ghost Score, credentials, galleries)
- Real-time typing indicators
- Mobile-responsive design

**Boo Integration:**
- ❌ No dedicated `/boo` page
- ✅ Image generation available via Telegram bot only
- **Gap:** Users on web app cannot access Boo directly

#### Telegram Bots

**Caisper Bot (`@caisper_bot`)**
- **Webhook:** `/apps/web/app/api/telegram/webhook/route.ts`
- **Commands:**
  - `/start` - Welcome message
  - `/help` - List of commands
  - `/verify <address>` - Check agent score
  - `/discover` - Browse agents
  - Text chat for full conversation

**Boo Bot (`@boo_gs_bot`)**
- **Webhook:** `/apps/web/app/api/telegram/boo-webhook/route.ts`
- **Commands:**
  - `/start` - Welcome to Boo
  - `/create <prompt>` - Generate image
  - `/gallery` - View your images
  - `/quota` - Check daily limit
  - Text chat for creative requests

**Webhook Flow:**
```
Telegram Message
       ↓
POST /api/telegram/{bot}-webhook
       ↓
1. Validate HMAC signature
2. Extract user message
3. Call initializeAgent(characterId)
4. Process message via runtime
5. Send response via Telegram API
```

#### Mini App (`apps/miniapp`)

**Verify Tab (Caisper):** `/apps/miniapp/app/verify/page.tsx`
```typescript
// Simplified - no direct agent chat
const handleVerify = async (address: string) => {
  const response = await fetch(
    `https://ghostspeak.io/api/v1/agent/${address}`
  )
  const data = await response.json()
  setGhostScore(data.ghostScore)
}
```

**Create Tab (Boo):** `/apps/miniapp/app/create/page.tsx`
```typescript
const handleGenerate = async (prompt: string) => {
  const response = await fetch(
    `${webAppUrl}/api/agent/chat`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: `Generate image: ${prompt}`,
        characterId: 'boo',
        userId: telegramUserId
      })
    }
  )
  const result = await response.json()
  setGeneratedImage(result.metadata.imageUrl)
}
```

**Issues:**
- ❌ No direct ElizaOS chat interface
- ⚠️ Simplified UX (single request/response)
- ❌ No chat history visible
- ⚠️ Hard depends on web app API availability

---

## 5. State Sharing via Convex

### 5.1 Agent Messages Table

**Schema:** `convex/schema/chat.ts`

```typescript
agentMessages: defineTable({
  userId: v.id("users"),
  role: v.union(v.literal("user"), v.literal("agent")),
  content: v.string(),
  actionTriggered: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.number()
})
  .index("by_user", ["userId"])
  .index("by_user_timestamp", ["userId", "timestamp"])
```

**Shared Across:**
- Web app Caisper chat
- Telegram Caisper bot
- Telegram Boo bot
- ⚠️ NOT accessible in miniapp UI (API only)

### 5.2 Generated Images Table

**Schema:** `convex/schema/images.ts`

```typescript
generatedImages: defineTable({
  userId: v.string(), // wallet or telegram_${userId}
  storageId: v.id("_storage"),
  prompt: v.string(),
  enhancedPrompt: v.optional(v.string()),
  templateId: v.optional(v.string()),
  characterId: v.string(), // 'boo'
  model: v.string(), // 'google/imagen-4.0-generate'
  isPublic: v.boolean(),
  upvotes: v.number(),
  downvotes: v.number(),
  views: v.number(),
  source: v.string(), // 'web' | 'telegram'
  createdAt: v.number()
})
  .index("by_user", ["userId"])
  .index("by_gallery", ["isPublic", "createdAt"])
  .searchIndex("search_prompt", {
    searchField: "prompt"
  })
```

**Shared Across:**
- Telegram Boo bot (generation)
- Miniapp create tab (generation + gallery)
- Web app (future gallery feature)

### 5.3 Message Quota Table

Embedded in `users` table (should be separated per Convex analysis):

```typescript
users: defineTable({
  walletAddress: v.string(),
  telegramUserId: v.optional(v.string()),
  messageTier: v.union(
    v.literal("free"),
    v.literal("holder"),
    v.literal("whale")
  ),
  dailyMessageCount: v.number(),
  lastMessageDate: v.string() // YYYY-MM-DD
})
```

**Tiers:**
- Free: 3 images/day
- Holder ($10+ GHOST): 100 images/day
- Whale ($100+ GHOST): Unlimited

**Applies To:**
- Both Caisper and Boo actions
- Shared quota pool (not per-agent)

---

## 6. Code Duplication Analysis

### 6.1 Character Files

**DUPLICATION FOUND:**
- `/apps/web/Caisper.json` (duplicate)
- `/apps/web/server/elizaos/Caisper.json` (primary)

**Recommendation:** Delete root-level duplicate.

### 6.2 Shared Logic

**Well-Designed (No Duplication):**
- ElizaOS runtime is singleton per character
- Convex functions are centralized in `apps/web/convex/`
- Action implementations are single-source

**Potential Duplication:**
- Miniapp reimplements API client logic (should use shared package)
- Environment validation duplicated across apps

### 6.3 Action Registration

**Pattern:** Actions are registered in runtime initialization, not duplicated per platform.

```typescript
// Single registration, used everywhere
runtime.registerAction(generateImageAction)

// Used by:
// - Web app (future)
// - Telegram Boo bot
// - Miniapp API calls
```

---

## 7. Inconsistencies Identified

### 7.1 Agent UI Gaps

**Caisper:**
- ✅ Web app: Full chat interface
- ✅ Telegram: Full bot experience
- ⚠️ Miniapp: Simplified search-only (no chat)

**Boo:**
- ❌ Web app: No dedicated UI
- ✅ Telegram: Full bot experience
- ⚠️ Miniapp: Generation UI (no chat)

**Inconsistency:** Users expect consistent experience across platforms.

### 7.2 Feature Parity

| Feature | Web (Caisper) | Telegram (Caisper) | Telegram (Boo) | Miniapp |
|---------|---------------|-------------------|---------------|---------|
| Chat history | ✅ | ❌ (stateless) | ❌ (stateless) | ❌ |
| Image generation | ❌ | ❌ | ✅ | ✅ |
| Credential issuance | ✅ | ✅ | ❌ | ❌ |
| Ghost Score lookup | ✅ | ✅ | ❌ | ✅ (simplified) |
| Community gallery | ❌ (planned) | ❌ | ✅ (via bot) | ⚠️ (UI exists, not wired) |

**Inconsistency:** Features are scattered across platforms without clear strategy.

### 7.3 Authentication Patterns

**Web App:**
- Solana wallet signature
- User ID = wallet address

**Telegram:**
- Telegram `initData` validation
- User ID = `telegram_${telegramUserId}`

**Miniapp:**
- Telegram `initData` validation (same as bot)
- But proxies through web API

**Inconsistency:** Telegram users can't upgrade quota without wallet linking.

### 7.4 Missing Integrations

1. **Boo Web UI** - Users on web can't access Boo
2. **Miniapp Chat History** - No persistent conversation view
3. **Cross-Platform Sync** - Telegram chat doesn't sync with web
4. **Unified Quota** - Image quota separate from message quota (confusing)

---

## 8. Agent Action Flow Diagrams

### 8.1 Caisper Ghost Score Action

```
User: "What's the ghost score for agent X?"
       ↓
ElizaOS Runtime evaluates message
       ↓
Matches ghostScoreAction pattern
       ↓
1. Extract agent address from message
2. Call convex/ghostScoreCalculator.ts
       ↓
Convex Function:
  - Query discoveredAgents table
  - Calculate metrics:
    * x402 endpoint availability (40%)
    * Transaction success rate (30%)
    * Uptime history (20%)
    * Community trust (10%)
  - Return score (0-1000)
       ↓
Action returns metadata:
{
  type: 'ghost_score',
  agentAddress: 'X',
  score: 847,
  tier: 'excellent',
  breakdown: { ... }
}
       ↓
Runtime generates response:
"Agent X has a Ghost Score of 847 (Excellent tier).
Breakdown: 95% uptime, 98% success rate, strong community trust."
```

### 8.2 Boo Image Generation Action

```
User (Telegram): "Create a raid image: Join the Ghost Army!"
       ↓
Telegram webhook receives message
       ↓
initializeAgent('boo')
       ↓
ElizaOS Runtime evaluates message
       ↓
Matches generateImageAction pattern
       ↓
1. Parse prompt: "Join the Ghost Army!"
2. Detect template: 'raid' (from keywords)
3. Check quota:
       ↓
convex/messageQuota.ts:checkQuota
  - User tier: free
  - Daily count: 1/3
  - Can send: true
       ↓
4. Enhance prompt with branding:
   "Join the Ghost Army! | GhostSpeak branding,
    purple/teal color scheme, ghost mascot,
    energetic raid vibe, high quality digital art"
       ↓
5. Call AI Gateway:
   POST https://ai-gateway.vercel.sh/v1/images/generations
   {
     "model": "google/imagen-4.0-generate",
     "prompt": "...",
     "size": "1024x1024"
   }
       ↓
6. Receive base64 image (14s generation time)
       ↓
7. Store in Convex:
   convex/images.ts:storeImage
   - Convert base64 → Uint8Array
   - Upload to Convex storage
   - Create database record
   - Returns: { imageId, imageUrl }
       ↓
8. Increment quota:
   convex/messageQuota.ts:incrementMessageCount
   - Daily count: 2/3
       ↓
Action returns metadata:
{
  type: 'image_generation',
  imageUrl: 'https://enduring-porpoise-79.convex.cloud/api/storage/...',
  prompt: 'Join the Ghost Army!',
  templateId: 'raid',
  generationTime: 14200
}
       ↓
Telegram bot sends image + caption:
"Your raid image is ready! (2/3 daily images used)"
```

---

## 9. Recommendations

### 9.1 Immediate Fixes

1. **Remove duplicate Caisper.json**
   - Keep: `apps/web/server/elizaos/Caisper.json`
   - Delete: `apps/web/Caisper.json`

2. **Add Boo web UI**
   - Create `/apps/web/app/boo/page.tsx`
   - Reuse `AgentChatInterface` component with `characterId="boo"`

3. **Wire miniapp community gallery**
   - Connect existing gallery UI to `convex/images.ts:getGalleryImages`
   - Add voting functionality

4. **Document agent capabilities**
   - Create `AGENT_CAPABILITIES.md` matrix
   - Show what each agent can do on each platform

### 9.2 Feature Parity

5. **Enable chat history in Telegram bots**
   - Use Convex `agentMessages` table
   - Show last 5 messages on `/history` command

6. **Add miniapp chat interface**
   - Option A: Embed web chat in iframe
   - Option B: Build native React chat component
   - Recommendation: Option A (faster, consistent UX)

7. **Unified quota system**
   - Separate image quota from message quota
   - Create `convex/schema/quotas.ts` table
   - Support multiple quota types per user

### 9.3 Platform Strategy

8. **Define platform specialization**
   - **Web:** Full-featured dashboard, analytics, credentials
   - **Telegram:** Quick interactions, notifications, bots
   - **Miniapp:** Mobile-first, essential features, Telegram-native

9. **Cross-platform sync**
   - Chat history syncs across web and Telegram
   - Images accessible everywhere
   - Quota shared across all platforms

### 9.4 Agent Governance

10. **Create agent registry**
    - `AGENTS.json` config file
    - List all agents with capabilities
    - Auto-generate UI tabs from config

11. **Version character files**
    - Add `version` field to character schema
    - Support A/B testing of personalities
    - Rollback capability

---

## 10. Conclusion

### Current State

**Strengths:**
- ✅ Clean agent separation (Caisper vs Boo)
- ✅ Shared runtime infrastructure (efficient)
- ✅ Action-based architecture (extensible)
- ✅ Multi-platform accessibility

**Weaknesses:**
- ⚠️ Inconsistent feature parity across platforms
- ⚠️ Duplicate character files
- ⚠️ Missing Boo web UI
- ⚠️ Miniapp lacks chat functionality

### Recommendation Priority

**High Priority:**
1. Remove duplicate Caisper.json
2. Add Boo web UI
3. Document agent capabilities

**Medium Priority:**
4. Wire miniapp gallery
5. Enable Telegram chat history
6. Separate quota tables

**Low Priority:**
7. Agent registry config
8. Cross-platform sync
9. Character versioning

### Overall Assessment

**Score:** 7/10 - Solid foundation with room for consistency improvements

The agent architecture is well-designed technically but needs **platform parity** and **feature documentation** to reach production excellence.

---

**End of Analysis**

*Generated by Claude Code on January 13, 2026*
