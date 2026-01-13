# GhostSpeak Monorepo Modernization Roadmap

**Date:** January 13, 2026
**Status:** Ready for Execution
**Timeline:** 2 months (8 weeks)
**Goal:** Modernize monorepo architecture, fix critical issues, align with 2026 best practices

---

## Executive Summary

This roadmap consolidates findings from 6 comprehensive analysis documents:
1. **Miniapp Architecture** - Thin client pattern analysis
2. **Agent Implementations** - Caisper + Boo integration
3. **Convex Architecture** - Backend sharing patterns
4. **Monorepo Structure** - Package necessity evaluation
5. **Deployment Architecture** - Environment & deployment topology
6. **2026 Best Practices** - Industry standards compliance

**Current Grade: B (73/100)**
**Target Grade: A (90/100)**
**Estimated Impact:** 50% size reduction, 90% faster builds, improved security

---

## Critical Issues Identified

### 🔴 Severity: CRITICAL

1. **Miniapp has NO development isolation**
   - Always uses production Convex (`prod:enduring-porpoise-79`)
   - Developers risk corrupting production data
   - **Impact:** High - Data loss risk

2. **Exposed API keys in client bundle**
   - `NEXT_PUBLIC_OPENAI_API_KEY` visible in browser
   - Billing fraud risk
   - **Impact:** High - Security vulnerability

3. **Hardcoded URLs throughout miniapp**
   - Cannot test against localhost
   - Staging broken
   - **Impact:** Medium - Development friction

### 🟡 Severity: HIGH

4. **SDK is over-engineered (7.5MB, barely used)**
   - Web app uses 1 file
   - Miniapp lists it but NEVER imports
   - **Impact:** Medium - Build slowness, confusion

5. **API package is completely redundant**
   - Not deployed anywhere
   - Web app has its own REST API
   - **Impact:** Low - Maintenance burden

6. **CLI should be separate repository**
   - Zero internal usage
   - 2.4MB added to monorepo
   - **Impact:** Low - Monorepo bloat

### 🟢 Severity: MEDIUM

7. **Duplicate Caisper.json character files**
8. **88+ environment variables** (poorly organized)
9. **No remote caching for Turbo** (missing 90% faster builds)
10. **Missing 2026 patterns** (ElizaOS v2, Convex Threads)

---

## Modernization Phases

### Phase 1: Critical Fixes (Week 1)

**Goal:** Fix security and development issues

**Tasks:**

#### 1.1 Add Miniapp Development Isolation ⏱️ 30 minutes

Create `apps/miniapp/.env.local`:

```bash
# Development environment
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3333
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
NEXT_PUBLIC_GHOST_TOKEN_ADDRESS=<devnet-test-token>
NEXT_PUBLIC_APP_URL=http://localhost:3334
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=boo_gs_bot
```

Update `apps/miniapp/components/providers/ConvexProvider.tsx`:
```typescript
// Remove hardcoded fallback
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL must be set")
}
```

**Verification:**
```bash
cd apps/miniapp
bun run dev
# Should connect to dev Convex, not production
```

#### 1.2 Remove Exposed API Keys ⏱️ 15 minutes

1. Remove `NEXT_PUBLIC_OPENAI_API_KEY` from all `.env` files
2. Keep `OPENAI_API_KEY` (server-only) in `apps/web/.env.local`
3. Verify client bundle doesn't contain secrets:
   ```bash
   bunx @next/bundle-analyzer
   ```

#### 1.3 Remove Duplicate Caisper.json ⏱️ 5 minutes

```bash
# Keep the correct one
# apps/web/server/elizaos/Caisper.json ✅

# Delete duplicate
rm apps/web/Caisper.json
```

#### 1.4 Enable Vercel Remote Caching ⏱️ 5 minutes

```bash
bunx turbo login
bunx turbo link
# Select team: dexploarer
# Select project: ghostspeak
```

Update `vercel.json` in both apps:
```json
{
  "bunVersion": "1.x",
  "buildCommand": "cd ../.. && bunx turbo build --filter=web",
  "cacheDirectories": [".turbo", "node_modules/.cache"]
}
```

**Expected Result:** 90% faster builds (45s → 2s with cache)

### Phase 2: Configuration Cleanup (Week 2)

**Goal:** Centralize configuration, improve DX

#### 2.1 Centralize Miniapp Configuration ⏱️ 2 hours

Create `apps/miniapp/lib/config.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_WEB_APP_URL: z.string().url(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: z.string().length(44),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const config = envSchema.parse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

// API client helpers
export const api = {
  getAgent: (address: string) =>
    `${config.NEXT_PUBLIC_WEB_APP_URL}/api/v1/agent/${address}`,
  agentChat: () =>
    `${config.NEXT_PUBLIC_WEB_APP_URL}/api/agent/chat`,
}
```

#### 2.2 Remove Hardcoded URLs ⏱️ 1 hour

Update all files in `apps/miniapp/app/`:

```typescript
// Before
const response = await fetch(`https://www.ghostspeak.io/api/v1/agent/${address}`)

// After
import { api } from '@/lib/config'
const response = await fetch(api.getAgent(address))
```

**Files to update:**
- `app/verify/page.tsx`
- `app/create/page.tsx`
- `app/profile/page.tsx`

#### 2.3 Add Environment Validation (Web) ⏱️ 2 hours

Create `apps/web/lib/env.ts`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().startsWith("sk-"),
    CONVEX_DEPLOYMENT: z.string().regex(/^(dev|prod):/),
    TELEGRAM_BOT_TOKEN: z.string(),
    TELEGRAM_WEBHOOK_SECRET: z.string().length(64),
    AI_GATEWAY_API_KEY: z.string(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
    NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: z.string().length(44),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // ... (all env vars)
  },
})
```

Install dependency:
```bash
bun add @t3-oss/env-nextjs
```

#### 2.4 Implement turbo-ignore ⏱️ 1 hour

Update `vercel.json` in both apps:

```json
{
  "bunVersion": "1.x",
  "buildCommand": "cd ../.. && bunx turbo build --filter=web",
  "ignoreCommand": "cd ../.. && bunx turbo-ignore",
  "cacheDirectories": [".turbo"]
}
```

**Result:** Only rebuild affected apps (saves build minutes)

#### 2.5 Document Environment Variables ⏱️ 1 hour

Create `.claude/ENV_VARS.md`:

```markdown
# Environment Variables Reference

## Required (All Environments)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| NEXT_PUBLIC_CONVEX_URL | Client | Convex deployment URL | https://lovely-cobra-639.convex.cloud |
| ... (all 88 vars documented)

## Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| NEXT_PUBLIC_CONVEX_URL | lovely-cobra-639 | enduring-porpoise-79 |
| NEXT_PUBLIC_SOLANA_NETWORK | devnet | devnet (for now) |
```

### Phase 3: Package Cleanup (Week 3-4)

**Goal:** Remove unused packages, simplify SDK

#### 3.1 Remove API Package ⏱️ 30 minutes

```bash
# Archive (don't delete immediately)
mkdir -p archive/packages
mv packages/api archive/packages/api

# Remove from workspace
# Edit package.json workspaces (remove packages/api)

# Reinstall
bun install
```

#### 3.2 Remove SDK from Miniapp ⏱️ 15 minutes

```bash
cd apps/miniapp

# Remove from package.json
# "dependencies": {
#   "@ghostspeak/sdk": "workspace:*"  # DELETE THIS LINE
# }

bun install
```

#### 3.3 Document CLI Extraction Plan ⏱️ 2 hours

Create `CLI_MIGRATION.md`:

```markdown
# CLI Extraction Plan

## Goal
Move `packages/cli` to separate repository: `github.com/ghostspeak/ghostspeak-cli`

## Steps
1. Create new repository
2. Copy CLI code
3. Set up CI/CD (GitHub Actions)
4. Publish to npm
5. Remove from monorepo

## Timeline
Q2 2026 (not urgent)

## Benefit
- 2.4MB removed from monorepo
- Independent versioning
- Separate issue tracking
```

#### 3.4 Analyze SDK Usage Patterns ⏱️ 3 hours

Create `SDK_SIMPLIFICATION_PLAN.md`:

```markdown
# SDK Simplification Plan

## Current State
- Size: 7.5MB (370 files)
- Web usage: 1 file (lib/ghostspeak/client.ts)
- Miniapp usage: NONE

## Recommendation
Simplify SDK → "Core" package (1.5MB, 80% reduction)

### Keep:
- program-client/ (generated from Anchor IDL)
- credentials/ (W3C VC utilities)
- types/ (shared TypeScript types)

### Remove:
- modules/* (replaced by Convex functions)
- crypto/elgamal.ts (not used)
- wasm/ (over-engineered)

## Timeline
Q2 2026 (after more analysis)
```

### Phase 4: Agent Documentation (Week 4)

**Goal:** Document agent architecture clearly

#### 4.1 Create AGENT_ARCHITECTURE.md ⏱️ 2 hours

```markdown
# Agent Architecture

## Agents

### Caisper - Verification Ghost
- **Purpose:** Credential verification, Ghost Score checks
- **Actions:** 12 verification actions
- **Accessible:**
  - ✅ Web: /caisper page
  - ✅ Telegram: @caisper_bot
  - ⚠️ Miniapp: API proxy only (verify tab)

### Boo - Marketing Ghost
- **Purpose:** AI image generation, community marketing
- **Actions:** 5 marketing actions
- **Accessible:**
  - ❌ Web: No UI
  - ✅ Telegram: @boo_gs_bot
  - ⚠️ Miniapp: API proxy only (create tab)

## Runtime
- ElizaOS 1.7.0
- Shared runtime with character selection
- Custom ConvexDatabaseAdapter

## Recommendations
1. Add Boo web UI (/boo page)
2. Add chat interface to miniapp
3. Enable chat history in Telegram bots
```

### Phase 5: 2026 Modernization (Week 5-6)

**Goal:** Adopt latest patterns

#### 5.1 Migrate to ElizaOS v2 Actions ⏱️ 1 week

**Research:**
```bash
# Check ElizaOS v2 migration guide
bunx elizaos migrate --dry-run
```

**Update pattern:**
```typescript
// Before (v1)
export const ghostScoreAction: Action = {
  name: "GHOST_SCORE",
  handler: async (runtime, message) => { ... }
}

// After (v2)
export const ghostScoreAction = defineAction({
  name: "ghost_score",
  schema: z.object({ agentAddress: z.string() }),
  events: {
    onTrigger: async (ctx) => { ... }
  }
})
```

**Testing:**
```bash
bun test packages/plugin-ghostspeak
bun test apps/web  # Integration tests
```

#### 5.2 Adopt Convex Threads ⏱️ 3 days

**Update schema:**
```typescript
// convex/schema/chat.ts
import { defineThread } from "convex/ai"

export const threads = defineThread()
```

**Update functions:**
```typescript
export const createThread = mutation({
  handler: async (ctx) => {
    return await Thread.create(ctx, {
      metadata: { agentId: "caisper" }
    })
  }
})
```

**Migration script:**
```typescript
// convex/migrations/migrateToThreads.ts
export default internalMutation({
  handler: async (ctx) => {
    // Migrate existing agentMessages to threads
  }
})
```

#### 5.3 Add Telegram Cloud Storage ⏱️ 1 day

```typescript
// apps/miniapp/hooks/useCloudStorage.ts
import { useCloudStorage } from "@tma.js/sdk-react"

export function useUserPreferences() {
  const storage = useCloudStorage()

  return {
    async saveTab(tabId: string) {
      await storage.set("lastTab", tabId)
    },
    async getTab() {
      return await storage.get("lastTab")
    }
  }
}
```

#### 5.4 Upgrade Telegram Bot to Menu Commands ⏱️ 1 hour

```typescript
// apps/web/scripts/setup-telegram-bot.ts
await bot.telegram.setMyCommands([
  { command: "start", description: "👋 Welcome to Caisper" },
  { command: "verify", description: "👻 Check Ghost Score" },
  { command: "discover", description: "🔍 Browse agents" },
  { command: "help", description: "❓ Get help" }
], {
  scope: { type: "all_private_chats" },
  type: "menu"  // NEW: Shows as visual menu
})
```

### Phase 6: Optional Enhancements (Week 7-8)

**Goal:** Polish and optimize

#### 6.1 Create Shared UI Package ⏱️ 1 week

```
packages/ui/
  ├── src/
  │   ├── button.tsx
  │   ├── input.tsx
  │   ├── card.tsx
  │   └── agent-card.tsx
  ├── package.json
  └── tsconfig.json
```

**Usage:**
```typescript
// apps/web and apps/miniapp
import { Button, Card, AgentCard } from '@ghostspeak/ui'
```

#### 6.2 Implement Telegram Stars Payment ⏱️ 1 week

```typescript
// Upgrade quota for Telegram users (no crypto needed)
import { initInvoice } from "@tma.js/sdk"

const invoice = initInvoice("upgrade_quota", {
  title: "Upgrade to Holder Tier",
  description: "100 AI images per day",
  prices: [{ label: "Holder Tier", amount: 100 }],
  currency: "XTR"  // Telegram Stars ($1 = 100 stars)
})

await invoice.open()
```

#### 6.3 Add HMAC Webhook Validation ⏱️ 1 hour

```typescript
// apps/web/app/api/telegram/webhook/route.ts
import { createHmac } from "crypto"

const secretHash = createHmac("sha256", process.env.TELEGRAM_WEBHOOK_SECRET!)
  .update(await req.text())
  .digest("hex")

if (req.headers.get("x-telegram-signature") !== secretHash) {
  return Response.json({ error: "Invalid signature" }, { status: 401 })
}
```

---

## Timeline Visualization

```
Week 1: Critical Fixes
├─ Day 1: Miniapp dev isolation + Remove exposed keys
├─ Day 2: Remove duplicate Caisper.json + Enable remote caching
└─ Day 3-5: Verification & testing

Week 2: Configuration Cleanup
├─ Day 1-2: Centralize miniapp config
├─ Day 3: Remove hardcoded URLs
├─ Day 4: Add env validation
└─ Day 5: Implement turbo-ignore + document env vars

Week 3-4: Package Cleanup
├─ Week 3: Remove API package, SDK from miniapp, document plans
└─ Week 4: Agent architecture docs, SDK analysis

Week 5-6: 2026 Modernization
├─ Week 5: ElizaOS v2 migration
└─ Week 6: Convex Threads, Telegram features

Week 7-8: Optional Enhancements
├─ Week 7: Shared UI package
└─ Week 8: Telegram Stars, HMAC validation
```

---

## Success Metrics

### Before (Current State)

- Monorepo size: 15.4MB
- Build time (cold): 45s
- Build time (cached): 12s
- Environment variables: 88+
- Packages: 4 (2 unused/redundant)
- Security score: C (exposed API keys)
- Development isolation: ❌
- 2026 compliance: 73/100 (B)

### After (Target State)

- Monorepo size: 7.35MB (52% reduction)
- Build time (cold): 45s
- Build time (cached): 2s (90% faster!) ⚡
- Environment variables: 50 (documented)
- Packages: 3 (all essential)
- Security score: A (no exposed secrets)
- Development isolation: ✅
- 2026 compliance: 90/100 (A)

---

## Risk Assessment

### Low Risk (Safe to Execute)

- ✅ Add miniapp `.env.local`
- ✅ Remove duplicate Caisper.json
- ✅ Enable remote caching
- ✅ Remove API package
- ✅ Document environment variables

### Medium Risk (Test Thoroughly)

- ⚠️ Centralize miniapp configuration (breaking changes)
- ⚠️ Remove SDK from miniapp (verify no imports)
- ⚠️ ElizaOS v2 migration (API changes)
- ⚠️ Convex Threads (data migration)

### High Risk (Careful Planning Required)

- ❌ CLI extraction to separate repo (complex)
- ❌ SDK simplification (external users)
- ❌ Vercel project consolidation (deployment changes)

---

## Rollback Plans

### Phase 1-2 (Config Changes)

**If issues arise:**
```bash
# Rollback env changes
git checkout main -- apps/miniapp/.env.local apps/web/lib/env.ts

# Restore hardcoded URLs
git checkout main -- apps/miniapp/app/
```

### Phase 3 (Package Removal)

**If API package needed:**
```bash
# Restore from archive
mv archive/packages/api packages/api
bun install
```

### Phase 5 (ElizaOS v2)

**If migration fails:**
```bash
# Downgrade ElizaOS
bun add @elizaos/core@1.7.0

# Restore v1 actions
git checkout main -- apps/web/server/elizaos/
```

---

## Verification Checklist

### After Phase 1 (Critical Fixes)

- [ ] Miniapp dev connects to dev Convex (not production)
- [ ] No API keys in client bundle (verified with bundle analyzer)
- [ ] Only one Caisper.json exists
- [ ] Vercel builds use remote cache (build logs show "Remote cache hit")

### After Phase 2 (Configuration)

- [ ] All miniapp URLs centralized in `lib/config.ts`
- [ ] Environment validation catches missing vars
- [ ] turbo-ignore prevents unnecessary rebuilds
- [ ] All 88 env vars documented in `ENV_VARS.md`

### After Phase 3 (Package Cleanup)

- [ ] API package removed from workspace
- [ ] Miniapp doesn't import SDK
- [ ] CLI extraction plan reviewed by team
- [ ] SDK simplification plan created

### After Phase 4 (Documentation)

- [ ] `AGENT_ARCHITECTURE.md` explains all agents
- [ ] Clear matrix showing agent accessibility
- [ ] Recommendations documented

### After Phase 5 (Modernization)

- [ ] ElizaOS v2 actions working
- [ ] Convex Threads storing messages
- [ ] Telegram Cloud Storage persisting preferences
- [ ] Bot commands show as visual menu

### After Phase 6 (Polish)

- [ ] Shared UI package used in both apps
- [ ] Telegram Stars payment flow working
- [ ] HMAC validation securing webhooks

---

## Dependencies & Prerequisites

### Tools Required

```bash
# Verify installations
bun --version        # 1.3.4+
bunx turbo --version # 2.7.2+
vercel --version     # Latest
```

### Accounts Needed

- Vercel account (for remote caching)
- Telegram BotFather access (for menu commands)
- npm account (if publishing packages)

### Documentation to Review

1. `.claude/analysis/miniapp-architecture.md`
2. `.claude/analysis/agent-implementations.md`
3. `.claude/analysis/convex-architecture.md`
4. `.claude/analysis/monorepo-structure.md`
5. `.claude/analysis/deployment-architecture.md`
6. `.claude/analysis/2026-best-practices.md`

---

## Post-Modernization Roadmap (Q2 2026+)

### Future Enhancements

1. **CLI Extraction** (when ready for separate repo)
2. **SDK Simplification** (create `@ghostspeak/core`)
3. **Feature Module Pattern** (reorganize app structure)
4. **ElizaOS HTN Planner** (complex workflows)
5. **Convex Components** (when stable)
6. **Staging Environment** (separate Convex deployment)
7. **Automated Testing** (E2E with Playwright)

### Ongoing Maintenance

- Monthly review of new 2026 patterns
- Quarterly security audits
- Continuous dependency updates
- Performance monitoring

---

## Conclusion

This roadmap provides a **clear, executable path** to modernizing the GhostSpeak monorepo from a **B-grade (73/100)** architecture to an **A-grade (90/100)** system aligned with 2026 best practices.

**Immediate Focus:** Phases 1-2 (Weeks 1-2)
- Fix critical security issues
- Enable development isolation
- Improve configuration management

**High Value:** Phases 3-5 (Weeks 3-6)
- Clean up unused packages
- Adopt modern patterns (ElizaOS v2, Convex Threads)
- Improve Telegram UX

**Optional:** Phase 6 (Weeks 7-8)
- Polish and optimize
- Add nice-to-have features

**Timeline:** 8 weeks (2 months) to complete all phases
**Risk Level:** Low-Medium (most changes are additive or isolated)
**Expected ROI:** High (52% size reduction, 90% faster builds, better security)

---

## Next Steps

1. **Review this roadmap** with team
2. **Approve Phase 1** (critical fixes) - START IMMEDIATELY
3. **Schedule Phase 2-6** based on team capacity
4. **Track progress** using GitHub Issues/Projects
5. **Update this document** as you complete phases

---

**Document Status:** Ready for Execution
**Last Updated:** January 13, 2026
**Owner:** Development Team
**Priority:** HIGH

---

*Generated by Claude Code - Comprehensive Analysis of 6 Documents*
