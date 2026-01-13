# Agent Architecture Analysis - Mini App vs Web App

**Date:** January 13, 2026
**Issue:** Ensuring proper agent context separation and optimal implementation
**Focus:** "Boo should only be on the telegram miniapp/bot"

---

## Current Architecture

### Shared ElizaOS Runtime (Web App)

**Location:** `apps/web/server/elizaos/runtime.ts`

The web app has a **shared runtime** that can initialize either Caisper or Boo:

```typescript
export async function initializeAgent(
  characterId: 'caisper' | 'boo' = 'caisper'
): Promise<IAgentRuntime> {
  const character = characterId === 'boo' ? booCharacter : CaisperCharacter

  // Register actions based on character
  if (characterId === 'caisper') {
    // Caisper: Full verification suite (12 actions)
    runtime.registerAction(discoverAgentsAction)
    runtime.registerAction(claimAgentAction)
    runtime.registerAction(getReputationAction)
    runtime.registerAction(getCredentialAction)
    // ... 8 more verification actions
  } else if (characterId === 'boo') {
    // Boo: Only image generation (1 action)
    runtime.registerAction(generateImageAction)
  }

  return runtime
}
```

### Character Definitions

**Caisper** (`apps/web/server/elizaos/characters/caisper.ts`):
- **Purpose:** Trust verification, credential validation, Ghost Score checking
- **Actions:** 12 actions (agent discovery, reputation lookup, credential verification, etc.)
- **Personality:** Professional, security-focused, helpful guide
- **Context:** Full GhostSpeak protocol knowledge

**Boo** (`apps/web/server/elizaos/characters/boo.ts`):
- **Purpose:** Creative marketing, image generation, social media content
- **Actions:** 1 action (generateImage with branded prompts)
- **Personality:** Energetic, creative, fun marketing persona
- **Context:** Limited to creative tasks, refers verification questions to Caisper
- **System Prompt Includes:**
  ```
  # What You DON'T Do
  - Verify credentials (that's Caisper's job)
  - Check Ghost Scores (refer to Caisper)
  - Handle agent registration (refer to Caisper)

  When users ask for verification or credentials, politely refer them to Caisper.
  ```

---

## Current Mini App Implementation (PROBLEM)

### How Image Generation Works Now

**File:** `apps/miniapp/app/create/page.tsx` (lines 40-54)

```typescript
const handleGenerate = async () => {
  // Build branded prompt
  const brandedPrompt = `${prompt}

GhostSpeak branding: Electric lime (#ccff00)...`

  // Directly call Vercel AI Gateway
  const response = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY}`, // ⚠️ EXPOSED
    },
    body: JSON.stringify({
      model: 'google/imagen-4.0-ultra-generate',
      prompt: brandedPrompt,
      // ...
    }),
  })
}
```

### Problems with Current Implementation

❌ **Problem 1: Bypasses Boo's Character**
- Calls AI Gateway directly, not through ElizaOS runtime
- Boo's personality, context, and system prompt are NOT used
- Missing Boo's proper prompt engineering and branding logic

❌ **Problem 2: Security Risk**
- API key exposed in browser code (`NEXT_PUBLIC_` prefix)
- Anyone can inspect source and extract key
- No rate limiting or usage tracking per user

❌ **Problem 3: No Context Awareness**
- Boo's character knows about GhostSpeak brand guidelines
- Boo should apply consistent style across all generations
- Current implementation has hardcoded branding in frontend

❌ **Problem 4: Inconsistent Implementation**
- Web app uses `generateImageAction` through ElizaOS
- Mini App duplicates logic in frontend
- Two different codepaths for same feature

---

## Recommended Architecture

### How It SHOULD Work

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Mini App                        │
│  (apps/miniapp)                                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ create/page.tsx (Boo tab)                          │    │
│  │                                                     │    │
│  │  const handleGenerate = async () => {              │    │
│  │    // Call web app API endpoint                    │    │
│  │    const response = await fetch(                   │    │
│  │      '/api/agent/chat',  // ← Route through ElizaOS│    │
│  │      {                                              │    │
│  │        method: 'POST',                              │    │
│  │        body: JSON.stringify({                       │    │
│  │          message: prompt,                           │    │
│  │          characterId: 'boo',  // ← Use Boo         │    │
│  │          source: 'telegram',  // ← Track source    │    │
│  │        }),                                          │    │
│  │      }                                              │    │
│  │    )                                                │    │
│  │  }                                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ HTTPS POST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Web App Backend                         │
│  (apps/web)                                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ app/api/agent/chat/route.ts                        │    │
│  │                                                     │    │
│  │  export async function POST(req: Request) {        │    │
│  │    const { message, characterId, source } =        │    │
│  │      await req.json()                              │    │
│  │                                                     │    │
│  │    // Route to appropriate character               │    │
│  │    const response = await processAgentMessage({    │    │
│  │      characterId,  // 'boo'                        │    │
│  │      source,       // 'telegram'                   │    │
│  │      message,                                       │    │
│  │    })                                              │    │
│  │                                                     │    │
│  │    return Response.json(response)                  │    │
│  │  }                                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ server/elizaos/runtime.ts                          │    │
│  │                                                     │    │
│  │  const runtime = await initializeAgent('boo')      │    │
│  │                                                     │    │
│  │  // Boo's action registered:                       │    │
│  │  runtime.registerAction(generateImageAction)       │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ server/elizaos/actions/generateImage.ts            │    │
│  │                                                     │    │
│  │  // Boo's character context applied                │    │
│  │  const brandedPrompt = applyBooStyle(message)      │    │
│  │                                                     │    │
│  │  // Call AI Gateway (API key server-side only)     │    │
│  │  const response = await fetch(                     │    │
│  │    'https://ai-gateway.vercel.sh/v1/...',          │    │
│  │    {                                                │    │
│  │      headers: {                                     │    │
│  │        Authorization: `Bearer ${                    │    │
│  │          runtime.settings.AI_GATEWAY_API_KEY       │    │
│  │        }`,  // ← Secret, server-side only          │    │
│  │      },                                             │    │
│  │    }                                                │    │
│  │  )                                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits of Recommended Architecture

### ✅ Proper Character Context

- **Boo's personality applied**: System prompt, tone, style guidelines
- **Consistent branding**: Boo knows how to apply GhostSpeak style
- **Smart prompt engineering**: Boo can enhance user prompts based on context
- **Character isolation**: Boo won't answer verification questions, refers to Caisper

### ✅ Security Improvements

- **API key server-side only**: No `NEXT_PUBLIC_` exposure
- **Rate limiting**: Can track usage per user/session
- **Usage monitoring**: Track costs per character
- **Authentication**: Can require valid Telegram user

### ✅ Code Reusability

- **Single implementation**: `generateImageAction` used by both web and Telegram
- **Consistent behavior**: Same prompts, same quality, same branding
- **Easier maintenance**: Update once, applies everywhere
- **Less duplication**: No need to sync frontend logic

### ✅ Feature Richness

- **Conversation context**: Boo can remember previous generations
- **Template intelligence**: Boo can suggest appropriate templates
- **Error handling**: Centralized error messages in Boo's voice
- **Future actions**: Easy to add more Boo actions (video, audio, etc.)

---

## Agent Separation: Current vs Recommended

### Current State

| Feature | Web App | Mini App |
|---------|---------|----------|
| **Caisper** | ✅ Available (via /caisper chat) | ✅ Available (verify tab - agent search) |
| **Boo** | ✅ Available (via /api/agent/chat with characterId: 'boo') | ⚠️ **NOT using Boo** (direct API call) |
| **Context** | Full ElizaOS runtime | Missing character context |
| **API Key** | Server-side secret | ❌ Exposed in browser |

### Recommended State

| Feature | Web App | Mini App |
|---------|---------|----------|
| **Caisper** | ✅ Available (via /caisper chat) | ✅ Available (verify tab) |
| **Boo** | ✅ Available (if needed for admin) | ✅ **Primary home** (create tab) |
| **Context** | Full ElizaOS runtime | ✅ **Full Boo context** via API |
| **API Key** | Server-side secret | ✅ Server-side secret |

### Is Boo Separate from Web App?

**Answer:** Boo is NOT a separate agent - Boo is a **character** within the shared ElizaOS runtime.

**Current Reality:**
- Boo can be used on web app via `/api/agent/chat?characterId=boo`
- Boo can be used on Telegram bot via webhook with character selection
- Mini App SHOULD use Boo but currently bypasses it

**Your Goal:** "Boo should only be on the telegram miniapp/bot"

**How to Achieve This:**

1. **Mini App:** Route image generation through Boo character (via `/api/agent/chat`)
2. **Telegram Bot:** Use Boo character for creative requests
3. **Web App:** Remove Boo from web UI, keep only Caisper chat
4. **Backend:** Keep shared runtime but only expose Boo via Telegram endpoints

**Implementation:**
```typescript
// apps/web/app/api/agent/chat/route.ts
export async function POST(req: Request) {
  const { characterId, source } = await req.json()

  // Enforce Boo only on Telegram
  if (characterId === 'boo' && source !== 'telegram') {
    return Response.json(
      { error: 'Boo is only available on Telegram' },
      { status: 403 }
    )
  }

  // Continue with agent processing...
}
```

---

## Implementation Plan

### Phase 1: Update Mini App to Use Boo (HIGH PRIORITY)

**File:** `apps/miniapp/app/create/page.tsx`

**Changes:**
1. Replace direct AI Gateway call with web app API endpoint
2. Send user prompt to `/api/agent/chat` with `characterId: 'boo'`
3. Let Boo's character handle prompt enhancement and branding
4. Remove `NEXT_PUBLIC_AI_GATEWAY_API_KEY` from `.env.local`

**New Implementation:**
```typescript
const handleGenerate = async () => {
  if (!prompt.trim()) return

  setIsGenerating(true)
  setError(null)
  setGeneratedImage(null)

  try {
    // Call web app API with Boo character
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        characterId: 'boo',
        source: 'telegram',
        template: selectedTemplate, // Pass template preference
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate image')
    }

    const data = await response.json()

    // Extract image URL from Boo's response
    const imageUrl = data.imageUrl || data.response?.imageUrl

    if (!imageUrl) {
      throw new Error('No image URL in response')
    }

    setGeneratedImage(imageUrl)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to generate image')
  } finally {
    setIsGenerating(false)
  }
}
```

### Phase 2: Enforce Boo = Telegram Only (MEDIUM PRIORITY)

**File:** `apps/web/app/api/agent/chat/route.ts`

**Changes:**
1. Add source validation for Boo character
2. Reject Boo requests from non-Telegram sources
3. Update web UI to hide Boo option (if it exists)

**Code:**
```typescript
// Enforce character-source restrictions
if (characterId === 'boo' && source !== 'telegram') {
  return Response.json(
    {
      error: 'Boo is only available on Telegram',
      suggestion: 'Chat with Caisper for verification and trust features'
    },
    { status: 403 }
  )
}
```

### Phase 3: Remove Boo from Web UI (LOW PRIORITY)

**Files:**
- `apps/web/app/caisper/page.tsx` (ensure only Caisper is accessible)
- Any character selection dropdowns (remove Boo option)

---

## Security Considerations

### Current Mini App (INSECURE)

```bash
# .env.local
NEXT_PUBLIC_AI_GATEWAY_API_KEY=vck_4xWq4ryNMa7otHji9RIHDG6Ls34VHgeZ0xM4vGCq2Iagyzkq7V1R8nbw
```

**Problem:** Anyone can:
1. Open browser DevTools
2. Search source code for `AI_GATEWAY_API_KEY`
3. Extract key and use it for free image generation
4. Rack up costs on your Vercel account

### Recommended Mini App (SECURE)

```bash
# .env.local (Mini App)
NEXT_PUBLIC_APP_URL=https://www.ghostspeak.io
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
# No AI Gateway key needed!
```

```bash
# .env.local (Web App Backend)
AI_GATEWAY_API_KEY=vck_4xWq4ryNMa7otHji9RIHDG6Ls34VHgeZ0xM4vGCq2Iagyzkq7V1R8nbw
# ^ Server-side only, never exposed
```

**Protection:**
- API key stays on server
- Rate limiting per user
- Usage tracking
- Authentication required

---

## Answer to Your Question

**Question:** "is the agents on the mini app seperate than the agent on the web app? boo should only be on the telegram miniapp/bot"

**Answer:**

1. **Current State:**
   - Agents are NOT separate - they share the same ElizaOS runtime
   - Boo exists as a character option in the web app backend
   - Mini App currently DOESN'T use Boo at all (bypasses character system)

2. **What "Separate" Should Mean:**
   - **Not separate infrastructure** - keep shared runtime for efficiency
   - **Separate access control** - Boo only accessible via Telegram source
   - **Separate UI exposure** - Boo not shown in web app UI

3. **Current Problem:**
   - Mini App bypasses Boo entirely (direct API call)
   - Missing Boo's character context, personality, prompt engineering
   - Security risk (exposed API key)

4. **Recommendation:**
   - **Update Mini App:** Route through Boo character via `/api/agent/chat`
   - **Add Access Control:** Reject `characterId: 'boo'` if `source !== 'telegram'`
   - **Keep Shared Runtime:** More efficient than separate deployments
   - **Result:** Boo effectively "only on Telegram" via access control

---

## Next Steps

### Immediate (Do Now)

1. **Update Mini App** to use Boo character instead of direct API calls
2. **Remove** `NEXT_PUBLIC_AI_GATEWAY_API_KEY` from Mini App `.env.local`
3. **Add** source enforcement in `/api/agent/chat` route
4. **Test** image generation through Boo character

### Short Term (This Week)

1. **Verify** Boo's prompt templates match desired branding
2. **Add** usage tracking for Boo image generations
3. **Document** Boo's capabilities in user-facing docs
4. **Test** error handling when API fails

### Long Term (Future Enhancement)

1. **Add more Boo actions** (video, audio, animations)
2. **Improve** Boo's conversation memory (track user's style preferences)
3. **Create** analytics dashboard for Boo usage
4. **Optimize** image generation costs with caching

---

**Status:** Ready for implementation
**Priority:** HIGH (security + proper architecture)
**Effort:** ~2 hours development + testing
**Impact:** Better security, proper context, maintainable codebase
