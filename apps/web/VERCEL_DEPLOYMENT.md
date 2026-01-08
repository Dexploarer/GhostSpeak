# Vercel Deployment Guide - GhostSpeak Web App

## Prerequisites

- Vercel account connected to GitHub repository
- Bun installed on Vercel (configured via `vercel.json`)
- All required environment variables configured

## Required Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### 🔴 **CRITICAL** - App Will Not Work Without These

```bash
# Convex Backend (REQUIRED)
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79
CONVEX_DEPLOY_KEY=<from Convex dashboard>

# AI Gateway (REQUIRED for Caisper agent)
AI_GATEWAY_API_KEY=<vercel ai gateway key>

# Solana Network (REQUIRED)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your-key>
```

### 🟡 **IMPORTANT** - Features Limited Without These

```bash
# App URL
NEXT_PUBLIC_APP_URL=https://www.ghostspeak.io

# GhostSpeak Program
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# GHOST Token
NEXT_PUBLIC_GHOST_TOKEN_MINT=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
NEXT_PUBLIC_GHOST_TOKEN_DECIMALS=9

# Admin Whitelist (comma-separated Solana addresses for unlimited Caisper access)
ADMIN_WHITELIST=<wallet1>,<wallet2>
```

### 🟢 **OPTIONAL** - Enhanced Features

```bash
# PayAI x402 Payments
NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=<facilitator address>
FACILITATOR_URL=https://facilitator.payai.network
X402_NETWORK=solana
PAYAI_WEBHOOK_SECRET=<webhook secret>
X402_POLLING_ENABLED=true
X402_POLLING_BATCH_SIZE=100

# Crossmint Credentials (EVM bridging)
CROSSMINT_SECRET_KEY=<secret key>
CROSSMINT_API_URL=https://www.crossmint.com
NEXT_PUBLIC_CROSSMINT_API_KEY=<public key>
CROSSMINT_AGENTIDENTITY_TEMPLATE_ID=<template id>
CROSSMINT_REPUTATION_TEMPLATE_ID=<template id>
CROSSMINT_JOBCOMPLETION_TEMPLATE_ID=<template id>

# Jupiter API (Token Analysis)
NEXT_PUBLIC_JUPITER_API_KEY=<jupiter api key>

# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=<sentry dsn>
SENTRY_ORG=<org name>
SENTRY_PROJECT=<project name>
ENABLE_SENTRY_BUILD=false  # Keep false to save memory

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=<posthog key>
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### ⚙️ **BUILD CONFIGURATION**

```bash
# Build Settings (auto-configured in vercel.json)
SKIP_ENV_VALIDATION=true
ENABLE_SENTRY_BUILD=false
```

## Deployment Steps

### 1. Initial Setup

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import the `Ghostspeak/GhostSpeak` repository
   - Select the `main` branch for production

2. **Configure Project Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: Uses `vercel.json` (automatic)
   - **Install Command**: Uses `vercel.json` (automatic)
   - **Output Directory**: `.next` (automatic)

3. **Set Environment Variables**
   - Copy all required variables from above
   - Set them in Vercel Dashboard → Settings → Environment Variables
   - Mark sensitive variables as "Secret"

### 2. Deploy Convex First

**IMPORTANT**: Deploy Convex functions before deploying the web app.

```bash
cd apps/web
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy
```

This ensures the Convex functions are live and the web app can connect to them.

### 3. Deploy to Vercel

#### Option A: Auto-Deploy (Recommended)
- Push to `main` branch → Vercel auto-deploys
- Check deployment status in Vercel dashboard

#### Option B: Manual Deploy
```bash
cd apps/web
vercel --prod
```

### 4. Post-Deployment Checks

1. **Health Check**
   ```bash
   curl https://www.ghostspeak.io/api/health
   ```

2. **Convex Connection**
   - Visit https://www.ghostspeak.io
   - Open browser console
   - Should see: `Convex client connected`

3. **Wallet Connection**
   - Connect a Solana wallet
   - Verify wallet address displays correctly

4. **Caisper Agent**
   - Navigate to `/caisper`
   - Send a test message
   - Verify agent responds

## Build Command Explained

The `vercel.json` build command:

```bash
cd ../.. && bun install && bun run build:plugin && cd apps/web && bun run build && bun run deploy:convex:prod
```

**Step-by-step:**
1. `cd ../..` - Go to monorepo root
2. `bun install` - Install all workspace dependencies
3. `bun run build:plugin` - Build `@ghostspeak/plugin-elizaos` package
4. `cd apps/web` - Return to web app directory
5. `bun run build` - Build Next.js app
6. `bun run deploy:convex:prod` - Deploy Convex functions

## Troubleshooting

### Build Fails: Module not found '@ghostspeak/plugin-elizaos'

**Solution**: The build script now handles this by building the plugin first.

If still failing:
```bash
cd ../../packages/plugin-ghostspeak
bun run build
```

### Build Fails: Out of Memory

**Solution**: Already configured in `vercel.json`:
- Sentry build plugin disabled (`ENABLE_SENTRY_BUILD=false`)
- Webpack parallelism set to 1
- Source maps disabled in production

If still failing, contact Vercel support to increase memory limit.

### Convex Connection Fails

**Check**:
1. `NEXT_PUBLIC_CONVEX_URL` is set correctly
2. Convex functions deployed successfully
3. No CORS errors in browser console

**Solution**: Redeploy Convex:
```bash
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy
```

### AI Gateway API Errors

**Check**:
1. `AI_GATEWAY_API_KEY` is set in Vercel (server-side only, NOT NEXT_PUBLIC_)
2. Key is valid and not expired
3. Rate limits not exceeded

### RPC Connection Errors

**Check**:
1. `NEXT_PUBLIC_SOLANA_RPC_URL` includes valid Helius API key
2. Network matches: `mainnet-beta` for production
3. RPC endpoint is not rate-limited

## Monitoring

- **Vercel Logs**: Dashboard → Deployments → Select deployment → Runtime Logs
- **Convex Logs**: `CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex logs`
- **Sentry**: https://sentry.io (if configured)

## Rollback

If deployment fails:
1. Go to Vercel Dashboard → Deployments
2. Find last successful deployment
3. Click "..." → "Promote to Production"

## Domain Configuration

Custom domain `ghostspeak.io`:
1. Vercel Dashboard → Settings → Domains
2. Add domain: `ghostspeak.io` and `www.ghostspeak.io`
3. Configure DNS:
   - **A Record**: `@` → Vercel IP
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours)

## Security Checklist

- ✅ All secret keys stored in Vercel (not in code)
- ✅ `ADMIN_WHITELIST` configured for testing
- ✅ CORS configured in Convex
- ✅ CSP headers in `next.config.ts`
- ✅ No private keys in environment variables
- ✅ Rate limiting enabled in API routes

## Support

- **Vercel Support**: https://vercel.com/support
- **GhostSpeak Issues**: https://github.com/Ghostspeak/GhostSpeak/issues
- **Convex Support**: https://convex.dev/support
