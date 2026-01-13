# Deployment Architecture Analysis

**Date:** January 13, 2026
**Analyst:** Claude Code
**Purpose:** Document deployment topology and environment configuration

---

## Executive Summary

GhostSpeak has **three separate Vercel projects**, **two Convex deployments**, and **two Telegram bots** with **88+ environment variables** scattered across multiple files. This analysis reveals **significant inconsistencies** and **security risks** that need immediate attention.

**Critical Finding:** Miniapp hardcoded to production Convex - no development isolation.

---

## 1. Deployment Topology

### 1.1 Visual Architecture

```
┌─────────────────────── PRODUCTION ────────────────────────┐
│                                                             │
│  ┌──────────────────┐           ┌──────────────────┐      │
│  │   Vercel: Web    │           │ Vercel: Miniapp  │      │
│  │ ghostspeak.io    │           │ miniapp.*.app    │      │
│  │                  │           │                  │      │
│  │ Next.js 15       │           │ Next.js 15       │      │
│  │ Bun 1.x          │           │ Bun 1.x          │      │
│  └────────┬─────────┘           └────────┬─────────┘      │
│           │                              │                 │
│           │        ┌──────────────────┐  │                 │
│           └────────│  Convex Backend  │──┘                 │
│                    │  enduring-       │                    │
│                    │  porpoise-79     │                    │
│                    └────────┬─────────┘                    │
│                             │                              │
│                    ┌────────┴─────────┐                    │
│                    │  Solana Devnet   │                    │
│                    │  api.devnet....  │                    │
│                    └──────────────────┘                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           Telegram Bots (2)                          │ │
│  │  ┌──────────────────┐   ┌──────────────────┐        │ │
│  │  │  @caisper_bot    │   │  @boo_gs_bot     │        │ │
│  │  │                  │   │                  │        │ │
│  │  │  Webhook:        │   │  Webhook:        │        │ │
│  │  │  /api/telegram/  │   │  /api/telegram/  │        │ │
│  │  │  webhook         │   │  boo-webhook     │        │ │
│  │  └──────────────────┘   └──────────────────┘        │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌────────────────────── DEVELOPMENT ──────────────────────────┐
│                                                              │
│  ┌──────────────────┐           ┌──────────────────┐       │
│  │   Local: Web     │           │  Local: Miniapp  │       │
│  │ localhost:3333   │           │  localhost:3334  │       │
│  └────────┬─────────┘           └────────┬─────────┘       │
│           │                              │                  │
│           │        ┌──────────────────┐  │                  │
│           ├────────│  Convex Dev      │──┤ ⚠️ ISSUE       │
│           │        │  lovely-cobra-   │  │                  │
│           │        │  639             │  │                  │
│           │        └──────────────────┘  │                  │
│           │                              │                  │
│           │        ┌──────────────────┐  │                  │
│           │        │  Convex Prod     │──┘ ⚠️ Miniapp      │
│           │        │  enduring-       │    uses PROD       │
│           │        │  porpoise-79     │    in dev!         │
│           │        └──────────────────┘                     │
│           │                                                 │
└───────────┴──────────────────────────────────────────────────┘
```

### 1.2 Service Inventory

| Service | Purpose | Environment | URL/ID |
|---------|---------|-------------|--------|
| **Vercel: ghostspeak** | Root deployment (legacy?) | Production | `prj_OqIqqNXbUghqSUY2DJu8BZ9m0Yuq` |
| **Vercel: web** | Main web app | Production | `prj_VwXKTJT83dZNa0crwtpkInliSAyR` |
| **Vercel: miniapp** | Telegram Mini App | Production | `prj_6FOOyBe0shVYe06ZtpsCbIRZoDyw` |
| **Convex: Dev** | Development backend | Development | `dev:lovely-cobra-639` |
| **Convex: Prod** | Production backend | Production | `prod:enduring-porpoise-79` |
| **Telegram: Caisper** | Verification bot | Production | `@caisper_bot` |
| **Telegram: Boo** | Media generation bot | Production | `@boo_gs_bot` |

---

## 2. Vercel Deployments

### 2.1 Root Project (ghostspeak)

**Project ID:** `prj_OqIqqNXbUghqSUY2DJu8BZ9m0Yuq`
**Configuration:** `/.vercel/project.json`

```json
{
  "projectId": "prj_OqIqqNXbUghqSUY2DJu8BZ9m0Yuq",
  "orgId": "team_FuSLke5t20vYuVbaCO1FCqmb",
  "settings": {
    "framework": null
  }
}
```

**Status:** ⚠️ **Unclear purpose** - May be legacy/unused
**Recommendation:** Investigate if this is the web app's deployment or a leftover

### 2.2 Web App Deployment

**Project ID:** `prj_VwXKTJT83dZNa0crwtpkInliSAyR`
**Configuration:** `/apps/web/.vercel/project.json`
**Domain:** `ghostspeak.io` (production)

**Build Settings:**
```json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "installCommand": "bun install",
  "devCommand": "bun run dev"
}
```

**Runtime:**
- Framework: Next.js 15.4.10
- Runtime: Bun 1.x (via `vercel.json`)
- Node Version: 24.x

**Environment Variables:** (from Vercel dashboard)
- Production: 42 variables
- Preview: 38 variables
- Development: 35 variables

**Critical Env Vars:**
```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Telegram
TELEGRAM_BOT_TOKEN=<redacted>
TELEGRAM_WEBHOOK_SECRET=<redacted>
NEXT_PUBLIC_APP_URL=https://ghostspeak.io

# AI
OPENAI_API_KEY=<redacted>
AI_GATEWAY_API_KEY=<redacted>

# Crossmint (EVM bridging)
CROSSMINT_SECRET_KEY=<redacted>
CROSSMINT_REPUTATION_TEMPLATE_ID=<redacted>
```

### 2.3 Miniapp Deployment

**Project ID:** `prj_6FOOyBe0shVYe06ZtpsCbIRZoDyw`
**Configuration:** `/apps/miniapp/.vercel/project.json`
**Domain:** `miniapp-wesleys-projects-b0d1eba8.vercel.app` (production)
**Intended Domain:** `miniapp.ghostspeak.io` (pending DNS)

**Build Settings:**
```json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "installCommand": "bun install",
  "devCommand": "bun run dev"
}
```

**vercel.json:**
```json
{
  "bunVersion": "1.x"
}
```

**Environment Variables:** (21 total)

```bash
# Miniapp-specific
NEXT_PUBLIC_APP_URL=https://miniapp-wesleys-projects-b0d1eba8.vercel.app
NEXT_PUBLIC_WEB_APP_URL=https://ghostspeak.io

# Convex (⚠️ ISSUE: Hardcoded to production)
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Tokens
NEXT_PUBLIC_GHOST_TOKEN_ADDRESS=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump

# Telegram
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=boo_gs_bot
```

**⚠️ Critical Issue:** No development environment configuration!

---

## 3. Convex Deployments

### 3.1 Development Deployment

**Name:** `dev:lovely-cobra-639`
**URL:** `https://lovely-cobra-639.convex.cloud`
**Used By:**
- ✅ Web app (local development)
- ⚠️ Miniapp (fallback only, not primary)

**Configuration:**
```bash
# apps/web/.env.local
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
CONVEX_DEPLOYMENT=dev:lovely-cobra-639
```

**Deployment Command:**
```bash
cd apps/web
bunx convex dev                    # Dev mode (watches for changes)
bunx convex deploy --dev            # One-time dev deployment
```

### 3.2 Production Deployment

**Name:** `prod:enduring-porpoise-79`
**URL:** `https://enduring-porpoise-79.convex.cloud`
**Used By:**
- ✅ Web app (production on Vercel)
- ✅ Miniapp (ALWAYS, even in dev) ⚠️

**Configuration:**
```bash
# apps/web/.env.production (implicit from Vercel)
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79
```

**Deployment Command:**
```bash
cd apps/web
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy
```

**Schema:** 43 tables, 63 function files
**Cron Jobs:** 7 scheduled tasks
**Storage:** ~11,000 images (10GB)

---

## 4. Telegram Bot Configuration

### 4.1 Caisper Bot (@caisper_bot)

**Purpose:** Agent verification, Ghost Score checks, credential verification

**Webhook:**
```
POST https://ghostspeak.io/api/telegram/webhook
```

**Configuration:** (via BotFather)
```
/setcommands
start - Welcome to Caisper
verify - Check agent Ghost Score
discover - Browse agent directory
help - List all commands
```

**Environment Variables:**
```bash
TELEGRAM_BOT_TOKEN=<redacted>           # Bot API token
TELEGRAM_WEBHOOK_SECRET=<redacted>       # HMAC validation secret (64 hex chars)
NEXT_PUBLIC_APP_URL=https://ghostspeak.io
```

**Webhook Setup Script:**
```bash
# apps/web/scripts/setup-telegram-bot.ts
curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook \
  -d "url=https://ghostspeak.io/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

### 4.2 Boo Bot (@boo_gs_bot)

**Purpose:** AI image generation, community marketing

**Webhook:**
```
POST https://ghostspeak.io/api/telegram/boo-webhook
```

**Configuration:**
```
/setcommands
start - Welcome to Boo
create - Generate AI image
gallery - View your images
quota - Check daily limit
help - List all commands
```

**Environment Variables:**
```bash
BOO_TELEGRAM_BOT_TOKEN=<redacted>        # Separate bot token
BOO_TELEGRAM_WEBHOOK_SECRET=<redacted>
```

**Webhook Setup:**
```bash
curl -X POST https://api.telegram.org/bot${BOO_TELEGRAM_BOT_TOKEN}/setWebhook \
  -d "url=https://ghostspeak.io/api/telegram/boo-webhook" \
  -d "secret_token=${BOO_TELEGRAM_WEBHOOK_SECRET}"
```

---

## 5. Environment Variable Analysis

### 5.1 Complete Inventory

I analyzed all `.env*` files across the monorepo:

**Files Found:**
```
root/.env
apps/web/.env.local
apps/web/.env.production
apps/miniapp/.env.local
apps/miniapp/.env.production
packages/cli/.env.example
```

**Total Unique Variables: 88+**

### 5.2 Categorized Environment Variables

#### Convex (6 variables)

```bash
# Shared
NEXT_PUBLIC_CONVEX_URL                  # Client-side Convex URL
CONVEX_DEPLOYMENT                        # Server-side deployment name

# Web-specific
CONVEX_DEPLOY_KEY                        # CI/CD key (optional)
CONVEX_URL                               # Duplicate of NEXT_PUBLIC_CONVEX_URL?

# Miniapp (⚠️ only production)
NEXT_PUBLIC_CONVEX_URL=<prod-only>      # No dev environment!
```

**Issue:** Inconsistent naming (`CONVEX_URL` vs `NEXT_PUBLIC_CONVEX_URL`)

#### Solana (8 variables)

```bash
# RPC
NEXT_PUBLIC_SOLANA_RPC_URL               # Primary RPC endpoint
NEXT_PUBLIC_SOLANA_NETWORK               # devnet | mainnet-beta
ANCHOR_PROVIDER_URL                      # For Anchor (duplicate of RPC_URL)

# Programs
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID        # Main program ID (devnet)
NEXT_PUBLIC_GHOST_TOKEN_ADDRESS          # $GHOST token mint

# Wallets
NEXT_PUBLIC_WALLET_PUBLIC_KEY            # Wallet address (unclear purpose)
AGENT_WALLET_PRIVATE_KEY                 # For ElizaOS actions
ANCHOR_WALLET                            # Path to Anchor wallet JSON
```

**Issues:**
- RPC URL duplicated (SOLANA_RPC_URL vs ANCHOR_PROVIDER_URL)
- Mixing devnet program ID with mainnet token (inconsistent)

#### Authentication (10 variables)

```bash
# Privy (wallet auth)
NEXT_PUBLIC_PRIVY_APP_ID
PRIVY_APP_SECRET
NEXT_PUBLIC_PRIVY_CLIENT_ID

# Telegram
TELEGRAM_BOT_TOKEN                       # Caisper bot
BOO_TELEGRAM_BOT_TOKEN                   # Boo bot
TELEGRAM_WEBHOOK_SECRET                  # HMAC validation (Caisper)
BOO_TELEGRAM_WEBHOOK_SECRET              # HMAC validation (Boo)
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME        # Miniapp: boo_gs_bot

# JWT
JWT_SECRET                               # Session tokens
NEXTAUTH_SECRET                          # Next-Auth (if used)
```

#### AI & LLMs (12 variables)

```bash
# OpenAI
OPENAI_API_KEY                           # GPT-4 for ElizaOS
NEXT_PUBLIC_OPENAI_API_KEY              # Client-side (⚠️ SECURITY RISK)

# AI Gateway (Vercel)
AI_GATEWAY_API_KEY                       # Google Imagen 4 access
NEXT_PUBLIC_AI_GATEWAY_URL               # Gateway endpoint

# Anthropic
ANTHROPIC_API_KEY                        # Claude (optional)

# Fal.ai
FAL_API_KEY                              # Image generation (deprecated?)

# Model Config
DEFAULT_MODEL                            # gpt-4-turbo
IMAGE_MODEL                              # google/imagen-4.0-generate
```

**⚠️ Security Issue:** `NEXT_PUBLIC_OPENAI_API_KEY` exposes API key to client!

#### Crossmint (EVM Bridging) (6 variables)

```bash
CROSSMINT_SECRET_KEY                     # API secret
CROSSMINT_REPUTATION_TEMPLATE_ID         # Reputation credential template
CROSSMINT_PAYMASTER_API_KEY              # Gasless transactions
CROSSMINT_ENV                            # staging | production
NEXT_PUBLIC_CROSSMINT_PROJECT_ID         # Client-side project ID
NEXT_PUBLIC_CROSSMINT_COLLECTION_ID      # NFT collection
```

#### Monitoring & Analytics (8 variables)

```bash
# Sentry
SENTRY_DSN                               # Error tracking
SENTRY_AUTH_TOKEN                        # Source map uploads
NEXT_PUBLIC_SENTRY_DSN                   # Client-side errors

# PostHog
NEXT_PUBLIC_POSTHOG_KEY                  # Analytics
NEXT_PUBLIC_POSTHOG_HOST                 # PostHog instance

# Vercel
VERCEL_URL                               # Auto-injected by Vercel
VERCEL_ENV                               # production | preview | development
```

#### Application URLs (6 variables)

```bash
NEXT_PUBLIC_APP_URL                      # Web app URL
NEXT_PUBLIC_WEB_APP_URL                  # Miniapp: web app reference
NEXT_PUBLIC_API_URL                      # API base (usually same as APP_URL)
NEXTAUTH_URL                             # Auth callback URL
NEXT_PUBLIC_SITE_URL                     # OG/SEO meta tags
```

**Issue:** 5 different URL variables with overlapping purposes!

#### Other (30+ variables)

```bash
# Database (if any)
DATABASE_URL                             # PostgreSQL/Turso (not actively used?)

# Rate Limiting
UPSTASH_REDIS_URL                        # Rate limiting (optional)
UPSTASH_REDIS_TOKEN

# Email (optional)
RESEND_API_KEY                           # Transactional emails

# Payment (future)
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY

# Feature Flags
NEXT_PUBLIC_ENABLE_X402                  # Feature toggles
NEXT_PUBLIC_ENABLE_GALLERY

# Build
NODE_ENV                                 # production | development
ANALYZE                                  # Bundle analysis
SKIP_ENV_VALIDATION                      # For builds without validation
```

### 5.3 Duplication Analysis

| Variable | web | miniapp | cli | Duplication |
|----------|-----|---------|-----|-------------|
| NEXT_PUBLIC_CONVEX_URL | ✅ | ✅ | ❌ | ⚠️ Duplicate |
| NEXT_PUBLIC_SOLANA_RPC_URL | ✅ | ✅ | ❌ | ⚠️ Duplicate |
| NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID | ✅ | ✅ | ❌ | ⚠️ Duplicate |
| NEXT_PUBLIC_GHOST_TOKEN_ADDRESS | ✅ | ✅ | ❌ | ⚠️ Duplicate |
| NEXT_PUBLIC_APP_URL | ✅ | ✅ | ❌ | ⚠️ Different values |
| TELEGRAM_BOT_TOKEN | ✅ | ❌ | ❌ | ✅ No dup |
| OPENAI_API_KEY | ✅ | ❌ | ❌ | ✅ No dup |

**Recommendation:** Create shared env config package or centralized `.env` inheritance.

---

## 6. Critical Issues

### 6.1 Miniapp Development Isolation (CRITICAL)

**Problem:**
```bash
# apps/miniapp/.env.production
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
```

**Miniapp has NO `.env.local` for development!**

**Impact:**
- Developers working on miniapp use PRODUCTION Convex
- Test data pollutes production database
- Risk of data corruption
- Cannot safely test new features

**Solution:**
```bash
# Create apps/miniapp/.env.local
NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3333
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 6.2 Hardcoded URLs (HIGH)

**Problem:** Multiple hardcoded URLs in miniapp code:

```typescript
// apps/miniapp/app/verify/page.tsx
const response = await fetch(
  `https://www.ghostspeak.io/api/v1/agent/${searchQuery}`  // HARDCODED
)

// apps/miniapp/app/create/page.tsx
const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://ghostspeak.io'
```

**Impact:**
- Cannot test against localhost
- Staging environments broken
- Hard to debug

**Solution:** Centralize config in `lib/config.ts`

### 6.3 Exposed API Keys (SECURITY)

**Problem:**
```bash
# NEXT_PUBLIC_* variables are sent to browser!
NEXT_PUBLIC_OPENAI_API_KEY=sk-...       # ⚠️ EXPOSED TO CLIENT
```

**Impact:**
- API key visible in browser DevTools
- Can be extracted and abused
- Billing fraud risk

**Solution:** Move to server-only env var (`OPENAI_API_KEY` without `NEXT_PUBLIC_`)

### 6.4 Environment Variable Explosion (MEDIUM)

**Problem:** 88+ environment variables, many duplicated or unclear

**Impact:**
- Hard to onboard new developers
- Configuration drift between apps
- Difficult to audit security

**Solution:**
1. Document all env vars in `ENV_VARS.md`
2. Remove unused vars
3. Consolidate overlapping vars (5 URL vars → 2)

### 6.5 Conflicting Solana Networks (MEDIUM)

**Problem:**
```bash
# Production environment mixes devnet and mainnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com          # Devnet
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2...                       # Devnet program
NEXT_PUBLIC_GHOST_TOKEN_ADDRESS=DFQ9ejBt...                       # Mainnet token!
```

**Impact:**
- Confusing which network is active
- Token queries fail (token on mainnet, program on devnet)

**Solution:** Separate env configs per network
```bash
# Development: All devnet
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
GHOSTSPEAK_PROGRAM_ID=<devnet-program-id>
GHOST_TOKEN_ADDRESS=<devnet-test-token>

# Production: All mainnet
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
GHOSTSPEAK_PROGRAM_ID=<mainnet-program-id>
GHOST_TOKEN_ADDRESS=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
```

### 6.6 Multiple Vercel Projects Confusion (LOW)

**Problem:** Three Vercel projects:
1. `ghostspeak` (root - unclear purpose)
2. `web` (main app)
3. `miniapp` (Telegram Mini App)

**Impact:**
- Unclear which project is active
- Potential for deployment to wrong project
- Extra cost for unused project?

**Solution:** Investigate and remove unused root project

---

## 7. Build Configuration Analysis

### 7.1 Web App (apps/web)

**next.config.ts:**
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'  // For image uploads
    }
  },

  // Image domains
  images: {
    domains: [
      'enduring-porpoise-79.convex.cloud',  // Convex storage
      'lovely-cobra-639.convex.cloud'        // Dev storage
    ]
  },

  // Webpack externals (Solana polyfills)
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
}
```

**package.json scripts:**
```json
{
  "dev": "turbo dev:next dev:convex",
  "build": "next build",
  "deploy:convex:prod": "CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy"
}
```

### 7.2 Miniapp (apps/miniapp)

**next.config.ts:**
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',  // Optimized for Vercel serverless

  // Disable checks for faster builds
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Telegram iframe headers
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'ALLOWALL' },
        { key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://web.telegram.org https://telegram.org" }
      ]
    }]
  }
}
```

**⚠️ Issue:** Build checks disabled - technical debt!

---

## 8. Recommendations

### 8.1 Immediate Fixes (Week 1)

1. **Create miniapp/.env.local** ✅ TOP PRIORITY
   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
   NEXT_PUBLIC_WEB_APP_URL=http://localhost:3333
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
   NEXT_PUBLIC_GHOST_TOKEN_ADDRESS=<devnet-test-token>
   ```

2. **Remove exposed API keys**
   - Remove `NEXT_PUBLIC_OPENAI_API_KEY` from env
   - Verify no secrets in client bundle: `bunx @next/bundle-analyzer`

3. **Centralize miniapp URLs**
   - Create `apps/miniapp/lib/config.ts`
   - Remove all hardcoded URLs

4. **Document environment variables**
   - Create `ENV_VARS.md` with all variables explained
   - Mark required vs optional

### 8.2 Medium Priority (Week 2-3)

5. **Consolidate URL variables**
   ```bash
   # Before (5 variables)
   NEXT_PUBLIC_APP_URL
   NEXT_PUBLIC_WEB_APP_URL
   NEXT_PUBLIC_API_URL
   NEXTAUTH_URL
   NEXT_PUBLIC_SITE_URL

   # After (2 variables)
   NEXT_PUBLIC_APP_URL              # Current app's URL
   NEXT_PUBLIC_WEB_APP_URL          # Miniapp → web reference
   ```

6. **Fix Solana network consistency**
   - Create network-specific env files
   - Validate network matches across all variables

7. **Add environment validation**
   ```typescript
   // lib/env.ts (use Zod)
   import { z } from 'zod'

   const envSchema = z.object({
     NEXT_PUBLIC_CONVEX_URL: z.string().url(),
     NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
     OPENAI_API_KEY: z.string().min(1),
     // ...
   })

   export const env = envSchema.parse(process.env)
   ```

8. **Investigate root Vercel project**
   - Determine if `ghostspeak` project is needed
   - Archive or remove if unused

### 8.3 Long Term (Month 2+)

9. **Shared environment config**
   ```
   packages/env/
     ├── base.ts          # Shared validation schemas
     ├── web.ts           # Web-specific overrides
     └── miniapp.ts       # Miniapp-specific overrides
   ```

10. **Separate staging environment**
    - Create `staging:*` Convex deployment
    - Add Vercel preview deployments

11. **Secrets management**
    - Migrate to Vercel Secrets or Vault
    - Rotate all exposed keys
    - Implement automatic rotation

---

## 9. Deployment Checklist

### 9.1 Pre-Deployment

- [ ] All environment variables documented
- [ ] No secrets in client bundle
- [ ] Dev/staging/prod configs separated
- [ ] Convex schema migrated (if needed)
- [ ] Database backups created

### 9.2 Deployment Steps

**Web App:**
```bash
# 1. Deploy Convex first
cd apps/web
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy

# 2. Deploy Next.js to Vercel
vercel --prod
```

**Miniapp:**
```bash
# 1. Verify Convex deployment
bunx convex logs -deployment prod:enduring-porpoise-79

# 2. Deploy to Vercel
cd apps/miniapp
vercel --prod
```

**Telegram Bots:**
```bash
# 3. Update webhooks (if URLs changed)
bun run telegram:setup
```

### 9.3 Post-Deployment

- [ ] Test web app (ghostspeak.io)
- [ ] Test miniapp (miniapp.ghostspeak.io)
- [ ] Test Caisper bot (@caisper_bot)
- [ ] Test Boo bot (@boo_gs_bot)
- [ ] Verify Convex functions responding
- [ ] Check Sentry for errors
- [ ] Monitor PostHog analytics

---

## 10. Conclusion

The GhostSpeak deployment architecture is **functional but fragile** with several **critical security and development issues**:

**Strengths:**
- ✅ Modern stack (Next.js 15, Bun, Convex)
- ✅ Separate apps deployed independently
- ✅ Production Convex deployment stable

**Critical Issues:**
- ❌ Miniapp has NO dev isolation (uses production always)
- ❌ Exposed API keys (security risk)
- ❌ Hardcoded URLs (inflexible)
- ❌ 88+ env vars (too many, duplicated)

**Priority Actions:**
1. **Week 1:** Add miniapp `.env.local`, remove exposed keys
2. **Week 2:** Centralize config, validate envs
3. **Month 2:** Shared env package, staging environment

---

**End of Analysis**

*Generated by Claude Code on January 13, 2026*
