# Telegram Mini App Architecture Analysis

**Date:** 2026-01-13
**Apps Analyzed:** `apps/miniapp` vs `apps/web`
**Status:** Production Deployed (Vercel)

---

## Executive Summary

The Telegram Mini App (`apps/miniapp`) is a **UI-only frontend** that provides a native Telegram experience for GhostSpeak's two AI agents: **Caisper** (verification) and **Boo** (media generation). It follows a thin-client architecture where **all business logic remains in `apps/web`**, eliminating code duplication and maintaining a single source of truth.

**Key Characteristics:**
- Zero backend duplication
- API calls proxy to `apps/web`
- Convex database shared with web app (production deployment)
- Two distinct agent personalities exposed via tabbed interface
- Deployed separately to Vercel with Bun runtime

---

## 1. Architecture Overview

### 1.1 Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini App                        │
│                    (apps/miniapp)                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Caisper  │  │   Boo    │  │ Profile  │  ◄── UI Only   │
│  │  (Tab)   │  │  (Tab)   │  │  (Tab)   │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│       │              │              │                      │
│       └──────────────┴──────────────┘                      │
│                      │                                      │
│                 API Calls                                   │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Web App                             │
│                    (apps/web)                               │
│                                                             │
│  ├─ /api/agent/chat          ◄── ElizaOS Runtime           │
│  ├─ /api/v1/agent/:address   ◄── Ghost Score API           │
│  ├─ /api/images/:id           ◄── Image serving            │
│  │                                                          │
│  ├─ convex/                   ◄── Shared Database           │
│  │   ├─ images.ts             (getUserImages, storeImage)  │
│  │   ├─ messageQuota.ts       (quota tracking)             │
│  │   ├─ ghostDiscovery.ts     (agent discovery)            │
│  │                                                          │
│  ├─ server/elizaos/           ◄── Agent Runtime            │
│      ├─ runtime.ts             (Caisper & Boo)             │
│      ├─ characters/boo.ts      (Boo character def)         │
│      └─ Caisper.json           (Caisper character def)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Critical Design Decision:** NO business logic in miniapp. Everything proxies to `apps/web`.

---

## 2. Agent Implementation

### 2.1 Character Separation

The miniapp exposes **two distinct AI agents** from the shared ElizaOS runtime:

#### **Caisper** (Verification Agent)
- **Tab:** "Verify" (👻)
- **Character ID:** `caisper`
- **Purpose:** Ghost Score verification, credential checking, trust assessment
- **Actions Available:**
  - `discoverAgentsAction`
  - `ghostScoreAction`
  - `getCredentialsAction`
  - `issueCredentialAction`
  - `trustAssessmentAction`
  - `agentDirectoryAction`
  - `scoreHistoryAction`
  - `getUserPortfolioAction`
  - `generateOuijaAction`
  - And more (12 total actions)

**Implementation:**
- UI: `/apps/miniapp/app/verify/page.tsx`
- API Endpoint: `POST /api/agent/chat` with `characterId: 'caisper'`
- Runtime: `apps/web/server/elizaos/runtime.ts` (line 404-497)
- Character: `apps/web/server/elizaos/Caisper.json`

#### **Boo** (Marketing Agent)
- **Tab:** "Create" (🎨)
- **Character ID:** `boo`
- **Purpose:** AI image generation with GhostSpeak branding
- **Actions Available:**
  - `generateImageAction` (Google Imagen 4)
  - `showMyImagesAction`
  - `writeCaptionAction`
  - `checkQuotaAction`
  - `generateOuijaAction`

**Implementation:**
- UI: `/apps/miniapp/app/create/page.tsx`
- API Endpoint: `POST /api/agent/chat` with `characterId: 'boo'`
- Runtime: `apps/web/server/elizaos/runtime.ts` (line 463-471)
- Character: `apps/web/server/elizaos/characters/boo.ts`

### 2.2 Character Selection Pattern

The ElizaOS runtime in `apps/web` supports **character switching** via the `characterId` parameter:

```typescript
// apps/web/server/elizaos/runtime.ts (lines 404-497)
export async function initializeAgent(
  characterId: 'caisper' | 'boo' = 'caisper'
): Promise<IAgentRuntime> {
  // Return cached instance or create new one
  if (runtimeInstances.has(characterId)) {
    return runtimeInstances.get(characterId)!
  }

  // Load character definition
  const character = characterId === 'boo' ? booCharacter : CaisperCharacter

  // Register character-specific actions
  if (characterId === 'caisper') {
    // 12 verification & credential actions
  } else if (characterId === 'boo') {
    // 5 community marketing actions
  }

  return runtime
}
```

**Key Insight:** Both agents share the same runtime infrastructure but have different:
1. Personality definitions (character files)
2. Action registrations (capabilities)
3. Conversational prompts (RAG context)

---

## 3. Convex Integration

### 3.1 Shared Database Architecture

**CRITICAL:** The miniapp does NOT have its own Convex deployment. It shares the production Convex instance with `apps/web`.

**Configuration:**

```bash
# apps/miniapp/.env.production
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud  # PRODUCTION
```

```bash
# apps/web/.env.local (for comparison)
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79  # Same deployment
```

**Convex Functions Used by Miniapp:**

| Function | Location | Purpose | Called From |
|----------|----------|---------|-------------|
| `images:getUserImages` | `apps/web/convex/images.ts` | Fetch user's generated images | Profile tab |
| `images:storeImage` | `apps/web/convex/images.ts` | Store generated images | Boo create flow |
| `images:getGalleryImages` | `apps/web/convex/images.ts` | Public gallery | (Future) |
| `messageQuota:checkQuota` | `apps/web/convex/messageQuota.ts` | Daily image limit | Create/Profile tabs |
| `ghostDiscovery:*` | `apps/web/convex/ghostDiscovery.ts` | Agent discovery | Verify tab |

### 3.2 Convex Provider Implementation

```typescript
// apps/miniapp/components/providers/ConvexProvider.tsx
export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      console.warn('NEXT_PUBLIC_CONVEX_URL not set, using default')
      return new ConvexReactClient('https://lovely-cobra-639.convex.cloud')  // DEV fallback
    }
    return new ConvexReactClient(convexUrl)
  }, [])

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}
```

**Issue Identified:** Hardcoded dev fallback URL could cause confusion. Should default to production or fail loudly.

### 3.3 Database Tables Used

The miniapp relies on these Convex tables (defined in `apps/web/convex/schema/*`):

- `generatedImages` - User's AI-generated images
- `imageVotes` - Upvote/downvote tracking
- `imageViews` - View analytics
- `agentMessages` - Chat history (via ElizaOS adapter)
- `users` - User profiles and quotas

**Generated Files:** The miniapp has auto-generated Convex bindings at `apps/miniapp/convex/_generated/` but these are **symlinks or copies** of the web app's schema. There are NO custom Convex functions in the miniapp.

---

## 4. Deployment Configuration

### 4.1 Vercel Setup

**Project:**
- Name: `miniapp`
- Org: `team_FuSLke5t20vYuVbaCO1FCqmb`
- Project ID: `prj_6FOOyBe0shVYe06ZtpsCbIRZoDyw`

**Domain:**
- Production: `https://miniapp-wesleys-projects-b0d1eba8.vercel.app`
- Intended: `https://miniapp.ghostspeak.io` (needs DNS configuration)

**Runtime:**
```json
// apps/miniapp/vercel.json
{
  "bunVersion": "1.x"
}
```

Uses **Bun 1.x** runtime (faster, smaller bundles than Node.js).

### 4.2 Next.js Configuration

```typescript
// apps/miniapp/next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',  // Optimized for serverless

  // Disable build checks (intentional for rapid deployment)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Telegram WebView iframe headers
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'ALLOWALL' },
        { key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://web.telegram.org https://telegram.org" }
      ]
    }]
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  },

  // Webpack externals (Solana polyfills)
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
}
```

**Key Differences from `apps/web`:**
1. **Iframe headers** - Allows Telegram embedding
2. **Build checks disabled** - Faster deployment cycle
3. **Standalone output** - Optimized for Vercel edge functions

### 4.3 Environment Variables

**Production Environment:**

```bash
# Critical for proper backend communication
NEXT_PUBLIC_APP_URL=https://miniapp-wesleys-projects-b0d1eba8.vercel.app
NEXT_PUBLIC_WEB_APP_URL=https://ghostspeak.io  # Main web app

# Convex (PRODUCTION deployment)
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud

# Solana (devnet for now)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# $GHOST Token
NEXT_PUBLIC_GHOST_TOKEN_ADDRESS=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump

# Telegram Bot (Boo)
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=boo_gs_bot
```

**Critical Finding:** All API calls go to `NEXT_PUBLIC_WEB_APP_URL` (ghostspeak.io), not the miniapp's own domain. This confirms the thin-client architecture.

---

## 5. Comparison with `apps/web`

### 5.1 Feature Duplication

| Feature | `apps/web` | `apps/miniapp` | Duplication? |
|---------|------------|----------------|--------------|
| Agent Chat UI | ✅ `/caisper` page | ✅ `/verify` tab | **UI Only** (different layout) |
| Image Generation | ✅ Boo webhook | ✅ `/create` tab | **UI Only** (same backend) |
| Ghost Score Lookup | ✅ `/dashboard` | ✅ `/verify` tab | **UI Only** (API call) |
| User Profile | ✅ `/dashboard` | ✅ `/profile` tab | **UI Only** (quota display) |
| **Backend Logic** | ✅ Full ElizaOS runtime | ❌ None | **ZERO duplication** |
| **Convex Functions** | ✅ 40+ functions | ❌ None | **ZERO duplication** |
| **API Endpoints** | ✅ `/api/*` routes | ❌ None | **ZERO duplication** |

**Verdict:** No business logic duplication. UI is reimagined for mobile/Telegram UX.

### 5.2 Agent Integration Patterns

#### **Web App Pattern:**
```typescript
// apps/web/app/caisper/page.tsx
// Full chat interface with message history, streaming, UI cards
<AgentChatInterface characterId="caisper" />
```

#### **Miniapp Pattern:**
```typescript
// apps/miniapp/app/verify/page.tsx
// Simple search box → API call → display result
const handleSearch = async () => {
  const response = await fetch(`${webAppUrl}/api/v1/agent/${address}`)
  const score = await response.json()
  setResult(score)
}
```

**Difference:** Miniapp has **simplified interactions** (single request/response) vs web app's **persistent chat sessions**.

### 5.3 Authentication Differences

| Aspect | `apps/web` | `apps/miniapp` |
|--------|------------|----------------|
| Auth Method | Solana wallet (Privy, Phantom) | Telegram `initData` |
| User ID Format | Solana address (base58) | `telegram_${telegramUserId}` |
| Session Storage | Convex `sessions` table | Session via `TelegramProvider` |
| Persistence | Wallet signature required | Telegram-managed |

**Key Insight:** Miniapp users are identified by Telegram ID, mapped to `telegram_${id}` format for quota tracking and image storage.

---

## 6. Identified Issues and Inconsistencies

### 6.1 Environment Variable Confusion

**Problem:** `.env.local` has dev Convex URL, `.env.production` has production URL.

```bash
# .env.local (dev)
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud

# .env.production (prod)
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
```

**Risk:** If deployed with wrong env vars, images will go to dev database.

**Recommendation:** Add validation in `ConvexProvider` to check deployment name matches expected environment.

### 6.2 Hardcoded API Endpoints

**Issue:** Multiple hardcoded URLs in miniapp code:

```typescript
// apps/miniapp/app/verify/page.tsx (line 30-32)
const response = await fetch(
  `https://www.ghostspeak.io/api/v1/agent/${searchQuery.trim()}`
)

// apps/miniapp/app/create/page.tsx (line 37-40)
const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://ghostspeak.io'
const response = await fetch(`${webAppUrl}/api/agent/chat`, { ... })
```

**Problem:** If main web app changes domain or deploys to staging, miniapp breaks.

**Recommendation:** Centralize API base URL in `lib/api.ts` and use throughout.

### 6.3 Error Handling Gaps

**Observed Pattern:**
```typescript
// apps/miniapp/app/create/page.tsx (line 54-63)
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
  if (response.status === 429) {
    throw new Error(errorData.message || 'Daily image limit reached. Hold $GHOST for more!')
  }
  throw new Error(errorData.error || 'Image generation failed')
}
```

**Issue:** Quota errors are caught but not surfaced with upgrade CTA.

**Recommendation:** Add quota display + "Buy $GHOST" button on 429 errors.

### 6.4 Missing Features

**Features in Web App but NOT in Miniapp:**

1. **Agent Chat History** - No persistent conversation view
2. **Community Gallery** - No public image browsing (UI exists but not wired)
3. **Credential Issuance** - Caisper can verify but not issue in miniapp UI
4. **Wallet Connection** - No way to check actual $GHOST holdings (uses API proxy)
5. **Ghost Score History Chart** - Only shows current score, no trend graph

**Reason:** Intentional simplification for mobile UX. Complex features remain web-only.

### 6.5 Tab Navigation Hardcoding

```typescript
// apps/miniapp/components/layout/TabNavigation.tsx
const tabs: Tab[] = [
  { id: 'verify', label: 'Caisper', icon: '👻', href: '/verify' },
  { id: 'create', label: 'Boo', icon: '🎨', href: '/create' },
  { id: 'profile', label: 'Profile', icon: '👤', href: '/profile' }
]
```

**Issue:** Adding new agents requires manual code changes. Not extensible.

**Recommendation:** Load agent list from config or API (`/api/v1/agents`).

### 6.6 Telegram SDK Version Mismatch

**Miniapp:**
```json
// apps/miniapp/package.json
"@tma.js/sdk": "^3.1.4",
"@tma.js/sdk-react": "^3.0.15"
```

**Web App:**
```json
// apps/web/package.json
"telegraf": "^4.16.3"  // Different library (bot framework)
```

**Not an issue:** Different SDKs for different purposes (miniapp = client SDK, web = bot server).

---

## 7. Architecture Strengths

### 7.1 Excellent Separation of Concerns

✅ **Single Source of Truth:** All business logic in `apps/web`
✅ **Database Sharing:** Production Convex instance used by both apps
✅ **Character Reuse:** Same ElizaOS runtime serves web and miniapp
✅ **API Consistency:** Miniapp uses public API endpoints, no special routes

### 7.2 Deployment Independence

✅ Miniapp can deploy without touching web app
✅ Web app can update backend without miniapp changes (as long as API contract stable)
✅ Separate Vercel projects for independent scaling

### 7.3 Mobile-First UX

✅ Tab navigation optimized for thumb reach
✅ Simplified workflows (search → result, not multi-turn chat)
✅ Telegram theme integration (dark mode, colors)
✅ Native back button handling

---

## 8. Recommendations

### 8.1 Critical Fixes

1. **Centralize API Base URL**
   - Create `apps/miniapp/lib/config.ts` with validated env vars
   - Remove all hardcoded `https://ghostspeak.io` references

2. **Add Convex Deployment Validation**
   - Check `NEXT_PUBLIC_CONVEX_URL` matches expected deployment
   - Fail loudly if wrong env used

3. **Implement Quota Display**
   - Show remaining images on Create tab BEFORE generation attempt
   - Add "Upgrade" CTA with Jupiter swap link

### 8.2 Feature Enhancements

4. **Add Chat History**
   - Show last 5 messages with Caisper/Boo in Profile tab
   - Use `convex/agent.ts:getChatHistory`

5. **Wire Community Gallery**
   - Use `convex/images.ts:getGalleryImages` in Create tab
   - Add "Browse Gallery" section with voting

6. **Ghost Score Chart**
   - Add `recharts` library (already in web app)
   - Display 30-day score trend in Verify tab

### 8.3 Infrastructure Improvements

7. **Add E2E Tests**
   - Playwright tests for Telegram WebView simulation
   - Test with mock `initData`

8. **Monitoring Integration**
   - Add Sentry breadcrumbs for API calls
   - Track Convex query performance

9. **Custom Domain Setup**
   - Configure `miniapp.ghostspeak.io` DNS
   - Update Telegram bot URLs

---

## 9. File Structure Summary

```
apps/miniapp/
├── app/
│   ├── layout.tsx                    # Root layout (Telegram providers)
│   ├── page.tsx                      # Landing/router (redirects to tabs)
│   ├── verify/page.tsx               # Caisper verification UI
│   ├── create/page.tsx               # Boo image generation UI
│   └── profile/page.tsx              # User quota & stats
│
├── components/
│   ├── providers/
│   │   ├── TelegramProvider.tsx      # @tma.js/sdk wrapper
│   │   ├── ConvexProvider.tsx        # Convex client (prod URL)
│   │   └── QueryProvider.tsx         # React Query client
│   ├── layout/
│   │   └── TabNavigation.tsx         # Bottom tab bar (Caisper/Boo/Profile)
│   └── auth/
│       └── TelegramAuthGate.tsx      # Auth check with login widget
│
├── lib/
│   ├── api.ts                        # API client (calls apps/web endpoints)
│   └── solana.ts                     # Solana RPC helpers
│
├── convex/
│   └── _generated/                   # AUTO-GENERATED (no custom functions)
│
├── .env.local                        # Dev config (dev Convex URL)
├── .env.production                   # Prod config (prod Convex URL)
├── next.config.ts                    # Telegram iframe headers
├── vercel.json                       # Bun runtime
└── README.md                         # Implementation docs

CRITICAL: Zero business logic. All API calls → apps/web
```

---

## 10. Conclusion

The Telegram Mini App is a **well-architected thin client** that successfully avoids code duplication by proxying all business logic to the main web app. The character separation (Caisper vs Boo) is cleanly implemented via the shared ElizaOS runtime, and the Convex database integration ensures consistent data across platforms.

**Major Strengths:**
- Zero backend duplication
- Production-ready Convex integration
- Clean character separation in UI

**Areas for Improvement:**
- Centralize configuration
- Add missing features (chat history, gallery)
- Improve error handling with actionable CTAs

**Deployment Status:**
- ✅ Production deployed to Vercel
- ✅ Using production Convex deployment
- ⚠️ Custom domain pending (`miniapp.ghostspeak.io`)
- ⚠️ Telegram bot integration incomplete (needs BotFather config)

**Overall Assessment:** 8/10 - Solid architecture with room for polish.
