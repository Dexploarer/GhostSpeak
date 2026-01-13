# Pre-Deployment Validation

Comprehensive pre-deployment checklist for GhostSpeak components.

## What This Command Does

Validates that all components are ready for deployment:

1. Run build check
2. Run test suite
3. Verify environment variables
4. Check Convex deployment
5. Verify Solana program
6. Lint and type check
7. Generate deployment report

## Usage

```bash
/deploy-check [environment]
```

## Arguments

- `environment`: `dev` or `prod` (default: `dev`)

## Deployment Checklist

### 1. Build Verification
- [ ] All packages build successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors

### 2. Test Coverage
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (optional for dev)

### 3. Environment Variables (apps/web)

**Dev Environment:**
- [ ] `NEXT_PUBLIC_CONVEX_URL` set to lovely-cobra-639.convex.cloud
- [ ] `CONVEX_DEPLOYMENT` set to dev:lovely-cobra-639
- [ ] `NEXT_PUBLIC_SOLANA_RPC_URL` set
- [ ] `NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID` set

**Prod Environment:**
- [ ] `NEXT_PUBLIC_CONVEX_URL` set to enduring-porpoise-79.convex.cloud
- [ ] `CONVEX_DEPLOYMENT` set to prod:enduring-porpoise-79
- [ ] All API keys set in Vercel
- [ ] Telegram webhook configured (if applicable)

### 4. Convex Backend

**Dev:**
```bash
CONVEX_DEPLOYMENT=dev:lovely-cobra-639 bunx convex deploy
```

**Prod:**
```bash
CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy
```

Verify:
- [ ] All functions deployed
- [ ] Schema migrations applied
- [ ] Cron jobs scheduled
- [ ] No errors in logs

### 5. Solana Program

**Devnet:**
- [ ] Program deployed: 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
- [ ] IDL uploaded
- [ ] Verify with: `solana program show <PROGRAM_ID>`

**Mainnet:**
- [ ] Security audit completed
- [ ] Multi-sig authority configured
- [ ] Upgrade authority set correctly
- [ ] Program verified on Solana Explorer

### 6. Web Application

```bash
# Dev
bun run build
vercel deploy --preview

# Prod
bun run build
vercel deploy --prod
```

Verify:
- [ ] Build succeeds
- [ ] Preview deployment works
- [ ] No runtime errors
- [ ] Wallet connection works
- [ ] API routes respond correctly

### 7. Package Publishing (if applicable)

For SDK, CLI, Plugin releases:
- [ ] Version bumped in package.json
- [ ] CHANGELOG updated
- [ ] Git tag created
- [ ] npm publish succeeds
- [ ] README updated

## Example Output

```
🚀 Pre-Deployment Check (dev environment)

✅ Builds
   ✅ SDK built successfully
   ✅ CLI built successfully
   ✅ Web built successfully

✅ Tests
   ✅ 89 unit tests passed
   ✅ 12 integration tests passed
   ⚠️  E2E tests skipped

✅ Environment Variables
   ✅ NEXT_PUBLIC_CONVEX_URL
   ✅ CONVEX_DEPLOYMENT
   ✅ NEXT_PUBLIC_SOLANA_RPC_URL
   ⚠️  TELEGRAM_BOT_TOKEN not set (optional)

✅ Convex Deployment
   ✅ Connected to dev:lovely-cobra-639
   ✅ 23 functions deployed
   ✅ Schema up to date
   ✅ Crons scheduled

✅ Solana Program
   ✅ Program active on devnet
   ✅ IDL version matches

⚠️  Warnings:
   - E2E tests not run (optional for dev)
   - Telegram bot not configured

✅ Ready for deployment!

Next steps:
1. Deploy Convex: CONVEX_DEPLOYMENT=dev:lovely-cobra-639 bunx convex deploy
2. Deploy Web: vercel deploy --preview
3. Test deployment: https://ghostspeak-preview.vercel.app
```

## Related Commands

- `/build-check` - Verify builds only
- `/test-all` - Run full test suite
- `/context-load web` - Load web app deployment knowledge
