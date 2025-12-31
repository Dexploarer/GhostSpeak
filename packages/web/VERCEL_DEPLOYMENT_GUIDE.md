# Vercel Deployment Guide - SAS Test Branch

## Quick Deploy via Dashboard

Since CLI builds are encountering environment issues, here's the manual deployment process:

### Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: SAS Edge API deployment ready"
git push origin pivot
```

### Step 2: Create New Vercel Project

1. Go to https://vercel.com/new
2. Import your GitHub repository: **GhostSpeak**
3. Click "Import"
4. Configure Project:
   - **Project Name**: `ghostspeak-sas-test`
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: `bun run build`
   - **Install Command**: `bun install`

### Step 3: Add Environment Variables

Before deploying, add these environment variables:

#### Required for Build:
```
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
SKIP_ENV_VALIDATION=true
```

#### SAS Configuration:
```
SAS_PAYER_KEYPAIR=Xp7PAdcUYcddXrdkAyGMT1pVm44+JX5hGFd/J4jC+qsl/60sZUaem+UHWpFOptOUSJAIAwOkT3BlCryyPIWJyQ==

SAS_AUTHORITY_KEYPAIR=Lywj74HUYBGKaMmS4krfJQpk5AkraTyxFAyjOI6XK7npxKjkWvY37iUEp+8+0rYrEuP6Acpu0eIn+56E8HJm+g==

SAS_AUTHORIZED_SIGNER_KEYPAIR=8d5xjeUHVmedY+7rcihSVpbWcnoyaCWCTINiWs/yDtrETZ8D9kBlQtAeDFwjjyl0EGpKMDvr+Aq1G7XAmta+kQ==

SAS_API_KEY=IGJaAXUw2CjbE8hNXnu07myYsZCoLK9swSccXhlpMBs=

SOLANA_CLUSTER=devnet
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. You'll get a URL like: `https://ghostspeak-sas-test.vercel.app`

### Step 5: Test the Edge API

```bash
# Health check
curl https://your-deployment-url.vercel.app/api/sas/health

# Should return:
{
  "healthy": true,
  "cluster": "devnet",
  "configuration": {
    "payerKeypair": true,
    "authorityKeypair": true,
    "authorizedSignerKeypair": true,
    "apiKey": true
  },
  "runtime": "edge"
}
```

### Step 6: Update Convex to Use New URL

```bash
CONVEX_DEPLOYMENT=enduring-porpoise-79 bunx convex env set SAS_API_URL https://your-deployment-url.vercel.app/api/sas/issue
```

### Step 7: Test End-to-End

```bash
bun run scripts/test-sas-fresh-agent.ts
```

---

## Alternative: Use Existing Vercel Project

If you already have a Vercel project for GhostSpeak:

1. Go to your project settings
2. Add all the SAS environment variables listed above
3. Go to Git → Settings
4. Add `pivot` branch to auto-deploy list
5. Push code and it will auto-deploy

---

## Environment Variables Summary

All variables have been added to the Vercel project via CLI:
- ✅ SAS_PAYER_KEYPAIR
- ✅ SAS_AUTHORITY_KEYPAIR
- ✅ SAS_AUTHORIZED_SIGNER_KEYPAIR
- ✅ SAS_API_KEY
- ✅ SOLANA_CLUSTER

**Current Vercel Project**: `ghostspeak` (wes-projects-9373916e)

You can view/edit these at:
https://vercel.com/wes-projects-9373916e/ghostspeak/settings/environment-variables

---

## Troubleshooting

### Build Fails

If build fails, check:
1. `NEXT_PUBLIC_CONVEX_URL` is set
2. `SKIP_ENV_VALIDATION=true` is set
3. Root directory is `packages/web`
4. Install command is `bun install`
5. Build command is `bun run build`

### Edge API Returns Errors

If `/api/sas/health` returns errors:
1. Check all SAS environment variables are set
2. Verify they're available in the correct environment (production/preview)
3. Check Vercel function logs

---

## Current Status

✅ All SAS environment variables added to Vercel project
✅ Convex configured with SAS_API_KEY and SAS_API_URL
✅ Code ready for deployment
⏳ Waiting for successful Vercel deployment

Once deployed, update SAS_EDGE_DEPLOYMENT.md with the actual deployment URL.
