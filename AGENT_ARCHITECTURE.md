# GhostSpeak Agent Architecture

**Last Updated**: January 13, 2026
**ElizaOS Version**: 1.7.0
**Agent Count**: 2 (Caisper, Boo)

---

## Executive Summary

GhostSpeak operates two specialized AI agents powered by ElizaOS 1.7.0, each with distinct personalities and capabilities. Both agents share the same runtime infrastructure but serve different user needs across multiple platforms.

**Key Stats:**
- **Total Actions**: 15 unique actions (12 Caisper-exclusive, 3 Boo-exclusive, 1 shared)
- **Platforms**: Web, Telegram, Miniapp (Telegram WebView)
- **Backend**: Convex (serverless + real-time)
- **AI Model**: Google Imagen 4 (via Gateway-Ghost)
- **Database**: Convex HTTP client with custom ElizaOS adapter

---

## Agent Inventory

### 1. Caisper - Verification & Reputation Agent

**Character ID**: `caisper`
**Username**: `@caisper` (web), `@caisper_bot` (Telegram)
**Personality**: Trust detective, slightly sarcastic, loves ghost puns
**Primary Role**: Credential verification, Ghost Score analysis, trust assessment

**Actions** (12 total):
1. **discoverAgents** - Discover available agents on-chain
2. **ghostScore** - Calculate Ghost Score (0-10000 points system)
3. **getCredentials** - Retrieve agent's W3C Verifiable Credentials
4. **issueCredential** - Issue new W3C VC to agent
5. **trustAssessment** - Run vibe check (green/yellow/red flags)
6. **agentDirectory** - Browse full agent registry
7. **evaluateAgentTokens** - Assess token holdings & risk
8. **scoreHistory** - View historical Ghost Score changes
9. **getUserPortfolio** - Pull user's stats & portfolio
10. **queryX402Agent** - Query agent's x402 endpoint
11. **claimAgent** - Register new agent identity
12. **generateOuija** - Generate Ouija board visualization (shared with Boo)

**File Locations:**
- Character: `/apps/web/server/elizaos/Caisper.json`
- Actions: `/apps/web/server/elizaos/actions/{actionName}.ts`
- Runtime: `/apps/web/server/elizaos/runtime.ts` (lines 448-462)

**Deployment:**
- Web: `/caisper` route
- Telegram: `@caisper_bot` (webhook: `/api/telegram/webhook`)
- Miniapp: "Verify" tab (API-only, no chat UI)

---

### 2. Boo - Creative Marketing Agent

**Character ID**: `boo`
**Username**: `@boo_ghostspeak` (web), `@boo_gs_bot` (Telegram)
**Personality**: Enthusiastic, creative, loves visual content
**Primary Role**: AI image generation, marketing materials, branded content

**Actions** (5 total):
1. **generateImage** - Generate AI images with Google Imagen 4
2. **showMyImages** - View user's generated image gallery
3. **writeCaption** - Create captions for images
4. **checkQuota** - Check daily image generation quota
5. **generateOuija** - Generate Ouija board visualization (shared with Caisper)

**File Locations:**
- Character: `/apps/web/server/elizaos/characters/boo.ts`
- Actions: `/apps/web/server/elizaos/actions/{actionName}.ts`
- Runtime: `/apps/web/server/elizaos/runtime.ts` (lines 463-471)

**Deployment:**
- Web: **NO WEB UI** (Boo has no `/boo` route)
- Telegram: `@boo_gs_bot` (webhook: `/api/telegram/boo-webhook`)
- Miniapp: "Create" tab (full Boo UI with image generation)

**Templates** (13 available):
- raid, meme, infographic, quote, announcement, productShowcase
- celebration, comparison, explainer, tutorial, testimonial, event, custom

---

## Runtime Architecture

### ElizaOS 1.7.0 Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    ElizaOS Runtime                          │
│                                                             │
│  ┌──────────────┐              ┌──────────────┐           │
│  │   Caisper    │              │     Boo      │           │
│  │  (12 acts)   │              │   (5 acts)   │           │
│  └──────┬───────┘              └──────┬───────┘           │
│         │                             │                    │
│         └──────────┬──────────────────┘                    │
│                    │                                       │
│         ┌──────────▼──────────┐                           │
│         │  AgentRuntime       │                           │
│         │  - Action handler   │                           │
│         │  - LLM integration  │                           │
│         │  - Memory manager   │                           │
│         └──────────┬──────────┘                           │
│                    │                                       │
│         ┌──────────▼──────────┐                           │
│         │ ConvexDatabaseAdapter│                          │
│         │  - getMemories()    │                           │
│         │  - searchMemories() │                           │
│         │  - createMemory()   │                           │
│         └──────────┬──────────┘                           │
└────────────────────┼─────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Convex Backend      │
         │  - agentMessages      │
         │  - generatedImages    │
         │  - messageQuota       │
         │  - RAG search         │
         └───────────────────────┘
```

**Key Components:**

1. **Character Definition** (JSON/TypeScript)
   - Personality, bio, lore, knowledge
   - Message examples, style guidelines
   - Topics, adjectives, post examples

2. **Action Registration**
   ```typescript
   runtime.registerAction(discoverAgentsAction)
   runtime.registerAction(generateImageAction)
   ```

3. **Database Adapter** (`ConvexDatabaseAdapter`)
   - ElizaOS v1.7.0 `IDatabaseAdapter` interface
   - Stores chat history in Convex
   - RAG search via Convex vector embeddings
   - Minimal implementation (stateless chat)

4. **Message Processing** (`processAgentMessage()`)
   - Action evaluation loop
   - LLM fallback for conversational responses
   - RAG context injection
   - Wide Event logging

---

## Platform Deployment Matrix

| Platform | Caisper | Boo | Notes |
|----------|---------|-----|-------|
| **Web** (`apps/web`) | ✅ Full UI at `/caisper` | ❌ No route | Caisper only |
| **Telegram Bot** | ✅ `@caisper_bot` | ✅ `@boo_gs_bot` | Both have full functionality |
| **Miniapp** (`apps/miniapp`) | ✅ API-only (Verify tab) | ✅ Full UI (Create tab) | Complementary |

### Accessibility Analysis

**Where can users interact with each agent?**

#### Caisper Accessibility:
- ✅ **Web**: Full chat interface at `https://ghostspeak.io/caisper`
  - Rich UI cards for Ghost Scores, credentials, trust assessments
  - Ouija board visualizations
  - Agent directory browsing
- ✅ **Telegram**: Direct messages & group chats via `@caisper_bot`
  - Markdown formatting
  - Inline buttons for actions
  - Command system (`/start`, `/help`, `/verify`, etc.)
- ✅ **Miniapp**: API-only verification features (Verify tab)
  - Agent search by Solana address
  - Ghost Score display with tier badges
  - Score breakdown & quick stats
  - **NO CHAT INTERFACE** (API calls only)

#### Boo Accessibility:
- ❌ **Web**: **NO WEB UI** - Boo has no web route
  - Users cannot chat with Boo on `ghostspeak.io`
  - Image generation only available via Telegram/Miniapp
- ✅ **Telegram**: Full media bot via `@boo_gs_bot`
  - Image generation commands (`/media`, `/raid`, `/meme`)
  - Template system with 13 branded options
  - Quota system (free tier: 5/day, holder: 25/day, whale: 100/day)
- ✅ **Miniapp**: Full UI (Create tab)
  - Template selector with 6 visible templates
  - Image generation form
  - Image preview & download
  - Gallery of user's generated images

**Gap Identified**: Boo has no web presence. Users on `ghostspeak.io` cannot generate images unless they switch to Telegram or open the miniapp.

---

## Developer Guide

### Adding a New Action

**1. Create action file**: `/apps/web/server/elizaos/actions/myNewAction.ts`

```typescript
import { Action } from '@elizaos/core'

export const myNewAction: Action = {
  name: 'MY_NEW_ACTION',
  similes: ['MY_NEW_ACTION', 'TRIGGER_PHRASE'],
  description: 'Description of what this action does',

  validate: async (runtime, message, state) => {
    const text = message.content.text.toLowerCase()
    return text.includes('trigger phrase')
  },

  handler: async (runtime, message, state, options, callback) => {
    try {
      // Your action logic here
      const result = await doSomething()

      await callback({
        text: 'Response to user',
        ui: {
          type: 'custom-card',
          data: result
        }
      })

      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

**2. Import in runtime**: `/apps/web/server/elizaos/runtime.ts`

```typescript
import { myNewAction } from './actions/myNewAction'
```

**3. Register for appropriate character**:

```typescript
// For Caisper only
if (characterId === 'caisper') {
  runtime.registerAction(myNewAction)
}

// For Boo only
if (characterId === 'boo') {
  runtime.registerAction(myNewAction)
}

// For both agents (shared action)
runtime.registerAction(myNewAction)
```

**4. Add UI card** (if needed): `/apps/web/components/chat/MyNewCard.tsx`

```typescript
export function MyNewCard({ data, onActionClick }) {
  return (
    <div className="mt-4 border border-white/10 rounded-lg p-4">
      {/* Your UI here */}
    </div>
  )
}
```

**5. Render in chat**: `/apps/web/app/caisper/page.tsx`

```typescript
{msg.metadata?.type === 'my-new-type' && (
  <MyNewCard data={msg.metadata.data} onActionClick={handleSend} />
)}
```

---

### Testing Locally

**1. Start development environment**:
```bash
# Terminal 1: Convex backend
cd apps/web
bunx convex dev

# Terminal 2: Web app
bun run dev:web

# Terminal 3: Miniapp (optional)
cd apps/miniapp
bun run dev
```

**2. Test Caisper (web)**:
- Open `http://localhost:3333/caisper`
- Connect wallet
- Send test messages:
  - "What agents are available?"
  - "Check Ghost Score for <address>"
  - "Run trust assessment on <address>"

**3. Test Boo (miniapp)**:
- Open `http://localhost:3334/create`
- Click "Generate Image"
- Enter prompt: "A friendly ghost"
- Verify image generation works

**4. Test Telegram bots** (requires ngrok or production):
```bash
# Set up ngrok tunnel
ngrok http 3333

# Update bot webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-ngrok-url.ngrok.io/api/telegram/webhook"}'
```

**5. Test action directly** (bypass UI):
```typescript
// test-action.ts
import { getAgentRuntime } from '@/server/elizaos/runtime'

const runtime = await getAgentRuntime('caisper')
const result = await runtime.processMessage({
  userId: 'test-user',
  message: 'Test prompt',
  roomId: 'test-room'
})

console.log(result)
```

---

### Adding a New Agent

**1. Create character file**: `/apps/web/server/elizaos/characters/newAgent.ts`

```typescript
import { Character } from '@elizaos/core'

export const newAgentCharacter: Character = {
  name: 'NewAgent',
  username: 'newagent',
  system: 'You are NewAgent, a specialized AI for...',
  bio: ['Bio line 1', 'Bio line 2'],
  // ... full character definition
}
```

**2. Update runtime**: `/apps/web/server/elizaos/runtime.ts`

```typescript
import { newAgentCharacter } from './characters/newAgent'

// Update type
export async function initializeAgent(
  characterId: 'caisper' | 'boo' | 'newagent' = 'caisper'
): Promise<IAgentRuntime> {
  // ...

  const character =
    characterId === 'boo' ? booCharacter :
    characterId === 'newagent' ? newAgentCharacter :
    CaisperCharacter

  // Register actions
  if (characterId === 'newagent') {
    runtime.registerAction(action1)
    runtime.registerAction(action2)
  }
}
```

**3. Create web route** (optional): `/apps/web/app/newagent/page.tsx`

**4. Create Telegram bot** (optional):
- Create bot with @BotFather
- Add webhook route: `/apps/web/app/api/telegram/newagent-webhook/route.ts`
- Set environment variables: `TELEGRAM_NEWAGENT_BOT_TOKEN`, `TELEGRAM_NEWAGENT_WEBHOOK_SECRET`

---

## Troubleshooting

### Common Issues

#### 1. "Action not triggering"
**Symptoms**: User message doesn't trigger expected action, LLM responds conversationally instead.

**Debugging**:
```typescript
// Add debug logging to action validate()
validate: async (runtime, message, state) => {
  console.log('🔍 Validating myAction:', message.content.text)
  const isValid = /* validation logic */
  console.log('✅ Validation result:', isValid)
  return isValid
}
```

**Common causes**:
- Validation logic too strict (user message doesn't match pattern)
- Another action validated first (first match wins)
- Action not registered for character (`characterId === 'boo'` but action only for Caisper)

**Solution**: Lower validation threshold or add more `similes` keywords.

---

#### 2. "Convex error: NEXT_PUBLIC_CONVEX_URL not set"
**Symptoms**: Runtime fails to initialize, database adapter errors.

**Fix**:
```bash
# Check .env files
cat apps/web/.env.local
cat apps/miniapp/.env.local

# Should contain:
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud  # dev
# OR
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud  # prod
```

---

#### 3. "Image generation fails in Telegram but works in miniapp"
**Symptoms**: Boo generates images in miniapp but fails in Telegram.

**Debugging**:
```bash
# Check Telegram bot logs
tail -f logs/telegram-boo.log

# Check webhook is receiving updates
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Common causes**:
- Webhook URL incorrect or not set
- `TELEGRAM_BOO_WEBHOOK_SECRET` mismatch
- Image quota exceeded (check `/quota`)
- Convex URL pointing to wrong deployment

**Solution**:
```bash
# Reset webhook
bun run telegram:setup:boo
```

---

#### 4. "Miniapp 'Create' tab shows no templates"
**Symptoms**: Template selector empty or shows loading indefinitely.

**Fix**:
```typescript
// Check template configuration
// File: /apps/web/server/elizaos/config/imageTemplates.ts

// Verify templates are exported
export const imageTemplates = [ /* ... */ ]

// Check miniapp is importing correctly
// File: /apps/miniapp/app/create/page.tsx
const templates = useQuery(api.images.getTemplates)
```

---

#### 5. "Chat history not persisting"
**Symptoms**: Refreshing page clears all messages.

**Debugging**:
```typescript
// Check Convex mutation is called
// File: /apps/web/server/elizaos/runtime.ts (lines 181-186)
await getConvexClient().mutation(api.agent.storeUserMessage, {
  walletAddress,
  message: messageText,
})

// Verify Convex schema has agentMessages table
// File: /apps/web/convex/schema.ts
agentMessages: defineTable({
  walletAddress: v.string(),
  message: v.string(),
  // ...
})
```

**Solution**: Check Convex deployment is correct (dev vs prod).

---

#### 6. "Boo responds with Caisper's personality"
**Symptoms**: Boo talks about verification instead of image generation.

**Cause**: Character ID not passed correctly to `processAgentMessage()`.

**Fix**:
```typescript
// Ensure characterId is set
const agentResponse = await processAgentMessage({
  userId,
  message: contextualMessage,
  roomId: `telegram-dm-${telegramUserId}`,
  source: 'telegram',
  characterId: 'boo', // ← Must be set!
})
```

---

### Logs & Monitoring

**Convex Logs**:
```bash
# Development
bunx convex logs --tail

# Production
bunx convex logs --tail --prod
```

**Wide Event Logs** (if enabled):
- Check `/api/v1/events` endpoint
- View in PostHog dashboard
- Correlation ID tracking across services

**ElizaOS Debug**:
```typescript
// Enable verbose logging
console.log('📨 Processing agent message:', params.message)
console.log('🏠 Room ID:', roomId)
console.log('🎯 Action executed successfully:', action.name)
```

---

## Performance Considerations

### Action Evaluation
- **Sequential**: Actions evaluated one-by-one until first match
- **First match wins**: Order matters in `registerAction()` calls
- **Validation cost**: Keep `validate()` logic lightweight
- **Typical evaluation time**: 50-200ms for full action loop

### LLM Calls
- **Conversational fallback**: Triggers when no action matches
- **RAG search**: Adds 100-300ms for context retrieval
- **Gateway-Ghost**: Model response time 1-3s
- **Caching**: Convex caches RAG results (15min TTL)

### Image Generation (Boo)
- **Google Imagen 4**: 10-15 seconds per image
- **Convex storage**: Uploads to Convex file storage
- **URL expiry**: Permanent URLs (stored in database)
- **Rate limiting**: 5/day free, 25/day holder, 100/day whale

---

## Security Model

### Authentication
- **Web**: Solana wallet signature (Phantom, Solflare)
- **Telegram**: Telegram initData validation (HMAC SHA-256)
- **Miniapp**: Inherits Telegram auth

### Authorization
- **Message Quota**: Tier-based (free/holder/whale)
- **Allowlist**: Admin override for unlimited access
- **Group Chat**: Rate limiting (5 msg/min per group)

### Webhook Security
- **Secret Token**: Validated on every webhook request
- **HTTPS Only**: Telegram requires 443, 80, 88, or 8443
- **Replay Protection**: Telegram update IDs are sequential

---

## Future Roadmap

### Phase 2: Web Integration
- [ ] Add `/boo` route for web-based image generation
- [ ] Unified agent switcher (toggle between Caisper/Boo)
- [ ] Gallery page for community images

### Phase 3: Advanced Features
- [ ] Multi-agent conversations (Caisper + Boo collaboration)
- [ ] Voice input for Telegram bots
- [ ] Image editing (regenerate, modify prompt)
- [ ] Template marketplace (user-submitted templates)

### Phase 4: Performance
- [ ] Action caching (memoize validation results)
- [ ] Parallel action evaluation (non-blocking)
- [ ] Streaming LLM responses (SSE)
- [ ] Edge runtime for webhooks (Cloudflare Workers)

---

## File Reference

### Core Files
- **Runtime**: `/apps/web/server/elizaos/runtime.ts` (826 lines)
- **Caisper Character**: `/apps/web/server/elizaos/Caisper.json`
- **Boo Character**: `/apps/web/server/elizaos/characters/boo.ts` (175 lines)
- **Database Adapter**: `/apps/web/server/elizaos/runtime.ts` (lines 43-396)

### Actions Directory
- `/apps/web/server/elizaos/actions/`
  - `discoverAgents.ts`
  - `ghostScore.ts`
  - `getCredentials.ts`
  - `issueCredential.ts`
  - `trustAssessment.ts`
  - `agentDirectory.ts`
  - `evaluateAgentTokens.ts`
  - `scoreHistory.ts`
  - `getUserPortfolio.ts`
  - `queryX402Agent.ts`
  - `claimAgent.ts`
  - `generateOuija.ts`
  - `generateImage.ts`
  - `showMyImages.ts`
  - `writeCaption.ts`
  - `checkQuota.ts`

### Web Routes
- `/apps/web/app/caisper/page.tsx` (681 lines)
- `/apps/web/app/api/agent/chat/route.ts` (Caisper endpoint)
- `/apps/web/app/api/telegram/webhook/route.ts` (Caisper bot)
- `/apps/web/app/api/telegram/boo-webhook/route.ts` (Boo bot, 592 lines)

### Miniapp
- `/apps/miniapp/app/verify/page.tsx` (Caisper API-only)
- `/apps/miniapp/app/create/page.tsx` (Boo full UI)
- `/apps/miniapp/app/profile/page.tsx` (User stats)

---

## Contact & Support

**Developer**: @the_dexploarer (Telegram)
**Repository**: [github.com/Ghostspeak/GhostSpeak](https://github.com/Ghostspeak/GhostSpeak)
**Documentation**: [docs.ghostspeak.io](https://docs.ghostspeak.io)
**Discord**: [discord.gg/ghostspeak](https://discord.gg/ghostspeak)

---

*Last Updated: January 13, 2026 - Phase 1 Modernization Complete*
