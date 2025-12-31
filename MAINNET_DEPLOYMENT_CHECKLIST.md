# GhostSpeak Mainnet Deployment Checklist

**Target Date**: Q1 2026
**Status**: Pre-Production
**Last Updated**: 2025-12-30

---

## Table of Contents

1. [Pre-Deployment Preparation](#pre-deployment-preparation)
2. [Smart Contract Deployment](#smart-contract-deployment)
3. [Infrastructure & Configuration](#infrastructure--configuration)
4. [Crossmint Production Setup](#crossmint-production-setup)
5. [Security & Testing](#security--testing)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Go-Live Procedures](#go-live-procedures)
8. [Rollback Plan](#rollback-plan)
9. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Preparation

### Code Freeze & Audits
- [ ] **Code freeze** - Tag release candidate (e.g., `v1.0.0-rc.1`)
- [ ] **Security audit** - Anchor smart contracts (recommend Sec3 or OtterSec)
  - Focus areas: Escrow logic, staking rewards, governance voting
  - Estimated cost: $15K-$25K
  - Timeline: 2-3 weeks
- [ ] **Penetration testing** - Web app API endpoints
  - Test: PayAI webhook authentication, CSRF protection, rate limiting
  - Estimated cost: $5K-$10K
- [ ] **Dependency audit** - Run `bun audit` and update vulnerable packages
- [ ] **Gas/fee optimization** - Review transaction costs on mainnet
- [ ] **Legal review** - Terms of Service, Privacy Policy, disclaimer pages

### Testing Validation
- [ ] **E2E test suite passing** - All Playwright tests green
- [ ] **Load testing** - Simulate 1000+ concurrent users
  - Target: <500ms p95 latency for PayAI webhooks
- [ ] **Stress testing** - Ghost Score calculation under high load
- [ ] **Disaster recovery drill** - Test database backup restoration
- [ ] **Manual QA** - Full user journey on staging environment
  - Agent registration → Staking → Receiving payments → Credential issuance

### Documentation
- [ ] **API documentation** - Complete OpenAPI spec for all endpoints
- [ ] **Deployment runbook** - Step-by-step deployment guide
- [ ] **Incident response plan** - On-call procedures, escalation paths
- [ ] **User migration guide** - If migrating devnet users to mainnet

---

## Smart Contract Deployment

### Prerequisites
- [ ] **Mainnet wallet funded** - At least 5 SOL for deployment + buffer
  - Wallet address: `___________________________` (to be filled)
- [ ] **Anchor version locked** - Record exact version: `anchor --version`
- [ ] **Program keypairs backed up** - Store in encrypted vault (1Password, AWS Secrets Manager)

### Deployment Steps
```bash
# 1. Switch to mainnet cluster
solana config set --url https://api.mainnet-beta.solana.com

# 2. Verify wallet balance
solana balance

# 3. Build programs with mainnet flag
anchor build -- --features mainnet

# 4. Deploy GhostSpeak program
anchor deploy --provider.cluster mainnet

# 5. Record program IDs
GHOSTSPEAK_PROGRAM_ID=$(solana address -k target/deploy/ghostspeak_marketplace-keypair.json)
echo "GhostSpeak Program ID: $GHOSTSPEAK_PROGRAM_ID"
```

### Post-Deployment Verification
- [ ] **Verify program on Solscan** - https://solscan.io/account/{PROGRAM_ID}
- [ ] **Test program instructions** - Call `registerAgent` on mainnet with test wallet
- [ ] **Initialize program state** - Run initialization scripts
  - Staking config account
  - Governance proposal counter
  - Audit trail account
- [ ] **Verify program upgrade authority** - Transfer to multisig (if applicable)

### Program IDs (to be filled after deployment)
```bash
GHOSTSPEAK_PROGRAM_ID=________________
STAKING_CONFIG_PDA=__________________
GOVERNANCE_COUNTER_PDA=_______________
```

---

## Infrastructure & Configuration

### Environment Variables

#### Production `.env.local` Changes
```bash
# 1. App URL
NEXT_PUBLIC_APP_URL=https://www.ghostspeak.io

# 2. Solana RPC (switch to mainnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key={YOUR_KEY}
# Recommendation: Use Helius Pro ($99/month) for 1000 req/s

# 3. GhostSpeak Program ID (from deployment)
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID={DEPLOYED_PROGRAM_ID}

# 4. $GHOST Token (verify mainnet token address)
NEXT_PUBLIC_GHOST_TOKEN_MINT={MAINNET_TOKEN_ADDRESS}

# 5. Crossmint (switch to production)
NEXT_PUBLIC_CROSSMINT_API_KEY={PRODUCTION_CLIENT_KEY}
CROSSMINT_SECRET_KEY={PRODUCTION_SERVER_KEY}
CROSSMINT_API_URL=https://www.crossmint.com

# 6. Crossmint Templates (production template IDs)
CROSSMINT_AGENTIDENTITY_TEMPLATE_ID={PROD_TEMPLATE_ID}
CROSSMINT_REPUTATION_TEMPLATE_ID={PROD_TEMPLATE_ID}
CROSSMINT_JOBCOMPLETION_TEMPLATE_ID={PROD_TEMPLATE_ID}
CROSSMINT_DELEGATEDSIGNER_TEMPLATE_ID={PROD_TEMPLATE_ID}

# 7. Server Wallet (NEW wallet for mainnet - CRITICAL)
PAYMENT_RECORDER_PRIVATE_KEY={NEW_MAINNET_WALLET_PRIVATE_KEY}

# 8. Convex (production deployment)
NEXT_PUBLIC_CONVEX_URL={PRODUCTION_CONVEX_URL}
CONVEX_DEPLOY_KEY={PRODUCTION_DEPLOY_KEY}
```

**Action Items**:
- [ ] Create new mainnet server wallet (DO NOT reuse devnet key)
- [ ] Fund server wallet with 1 SOL minimum for credential issuance fees
- [ ] Rotate all API keys to production values
- [ ] Set environment variables in Vercel project settings
- [ ] Verify `.env.example` is updated with production placeholders

### Database & Convex
- [ ] **Deploy Convex production** - `bunx convex deploy --prod`
- [ ] **Migrate data** (if needed) - Export devnet agents, reimport to mainnet
- [ ] **Set up backups** - Daily Convex snapshots (automatic in production)
- [ ] **Configure CORS** - Whitelist `https://www.ghostspeak.io`

### RPC & Network Infrastructure
- [ ] **Fix `createSolanaRpc` import issue** (HIGH PRIORITY)
  ```typescript
  // Current issue in packages/web/lib/server-wallet.ts
  // Error: Export createSolanaRpc doesn't exist in @solana/web3.js

  // Option 1: Use @solana/web3.js v1.x legacy API
  import { Connection, clusterApiUrl } from '@solana/web3.js'
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'))

  // Option 2: Use @solana/web3.js v2 (if available)
  import { createSolanaRpc } from '@solana/web3.js'
  const rpc = createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
  ```
- [ ] **Re-enable on-chain recording** - Uncomment payment recording logic in webhook
- [ ] **Set up RPC fallbacks** - Add backup RPC URLs (Alchemy, Quicknode)
- [ ] **Configure rate limits** - Helius Pro: 1000 req/s, track usage

### CDN & Assets
- [ ] **Configure Vercel Edge Network** - Deploy to all global regions
- [ ] **Optimize images** - Use Next.js Image component with Vercel optimization
- [ ] **Set up IPFS gateway** - For agent metadata (if using IPFS)

---

## Crossmint Production Setup

### Credential Templates Migration
- [ ] **Create production templates** - Replicate staging templates in production console
  - https://www.crossmint.com/console/templates
- [ ] **Update template IDs** - Record new production template IDs
  ```bash
  CROSSMINT_AGENTIDENTITY_TEMPLATE_ID={NEW_ID}
  CROSSMINT_REPUTATION_TEMPLATE_ID={NEW_ID}
  CROSSMINT_JOBCOMPLETION_TEMPLATE_ID={NEW_ID}
  CROSSMINT_DELEGATEDSIGNER_TEMPLATE_ID={NEW_ID}
  ```
- [ ] **Test credential issuance** - Issue test credential on production
- [ ] **Verify on-chain** - Check Base mainnet for credential contract

### Production API Configuration
- [ ] **Generate production API keys**
  - Client key: `ck_production_...` (limited scopes: read-only)
  - Server key: `sk_production_...` (full scopes: credentials.create)
- [ ] **Configure webhook endpoints** (if using Crossmint webhooks)
  - URL: `https://www.ghostspeak.io/api/crossmint/webhook`
  - Events: `credential.issued`, `credential.revoked`
- [ ] **Set up IP allowlisting** - Whitelist server IPs for sensitive endpoints
- [ ] **Rate limits** - Confirm Crossmint production limits (contact support)

### Blockchain Configuration
- [ ] **Choose credential chains** - Recommend: Base (low fees), Polygon (ecosystem)
  ```typescript
  const PRODUCTION_CHAINS = ['base', 'polygon'] as const
  ```
- [ ] **Fund chain wallets** - Crossmint may require gas fees (confirm with support)
- [ ] **Test multi-chain issuance** - Issue credentials to both chains

---

## Security & Testing

### Pre-Production Security Checklist
- [ ] **Secrets rotation** - All private keys, API keys rotated for production
- [ ] **Principle of least privilege** - Server wallet has minimal SOL (1-2 SOL)
- [ ] **HTTPS enforcement** - All endpoints use TLS 1.3
- [ ] **CSRF protection** - Verify CSRF tokens on all POST/PUT/DELETE routes
- [ ] **Rate limiting** - Webhook endpoints: 100 req/min per IP
- [ ] **Input validation** - All user inputs sanitized (Zod schemas)
- [ ] **SQL injection prevention** - Using Drizzle ORM (parameterized queries)
- [ ] **XSS prevention** - React escapes by default, no `dangerouslySetInnerHTML`
- [ ] **Dependency security** - No critical vulnerabilities in `bun audit`

### Final Testing Phase
- [ ] **Mainnet dry run** - Deploy to production with "Coming Soon" page
- [ ] **Smoke tests** - Test critical paths on production:
  - Agent registration
  - Staking 1000 $GHOST
  - Receiving PayAI webhook
  - Ghost Score update
  - Credential issuance
- [ ] **Performance testing** - Load test production infrastructure
  - Target: 1000 concurrent users, <500ms p95 latency
- [ ] **Security scan** - Run OWASP ZAP against production domain
- [ ] **Accessibility audit** - WCAG 2.1 Level AA compliance

---

## Monitoring & Alerting

### Observability Setup
- [ ] **Error tracking** - Sentry integration
  ```bash
  # Install Sentry SDK
  bun add @sentry/nextjs

  # Configure sentry.client.config.ts
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  })
  ```
- [ ] **Performance monitoring** - Vercel Analytics + Sentry Performance
- [ ] **Uptime monitoring** - Pingdom or UptimeRobot (5-minute checks)
  - Critical endpoints:
    - `https://www.ghostspeak.io`
    - `https://www.ghostspeak.io/api/health`
    - `https://www.ghostspeak.io/api/payai/webhook`
- [ ] **Log aggregation** - Vercel logs + Axiom or Datadog
  - Alert on: 500 errors, webhook failures, credential issuance errors

### Alert Configuration
- [ ] **PagerDuty/Opsgenie setup** - 24/7 on-call rotation
- [ ] **Critical alerts** (immediate notification):
  - Server wallet balance < 0.1 SOL
  - Webhook endpoint 5xx errors
  - RPC failures (>5% error rate)
  - Credential issuance failures
- [ ] **Warning alerts** (Slack notification):
  - High latency (p95 > 1s)
  - Rate limit approaching (>80% of limit)
  - Unusual traffic patterns
- [ ] **Daily digest** - Email report with:
  - Total agents registered
  - Ghost Score updates
  - Credentials issued
  - Revenue metrics

### Dashboards
- [ ] **Create Grafana/Datadog dashboard** with:
  - Active agents (real-time)
  - PayAI webhook volume
  - Ghost Score distribution (histogram)
  - Credential issuance rate
  - Server wallet balance
  - RPC latency & error rate
  - API response times (p50, p95, p99)

---

## Go-Live Procedures

### T-7 Days: Final Preparation
- [ ] **Freeze all code changes** - Only hotfixes allowed
- [ ] **Notify stakeholders** - Engineering, product, marketing, support
- [ ] **Prepare rollback plan** - Document step-by-step rollback
- [ ] **Staff on-call rotation** - Ensure 24/7 coverage for launch week

### T-3 Days: Staging Validation
- [ ] **Full regression test** - All E2E tests passing
- [ ] **Security re-scan** - No new vulnerabilities
- [ ] **Performance baseline** - Record current staging metrics
- [ ] **Backup production database** - Pre-deployment snapshot

### T-1 Day: Pre-Flight Checks
- [ ] **All checklist items complete** - 100% green checkmarks
- [ ] **Deployment runbook reviewed** - Team walkthrough
- [ ] **Support team trained** - FAQ, known issues, escalation paths
- [ ] **Marketing assets ready** - Blog post, social media, press release

### T-0: Deployment Day
**Recommended time**: Tuesday or Wednesday, 10 AM PST (avoid Fridays)

1. **Deploy smart contracts** (30 minutes)
   - [ ] Run Anchor deployment script
   - [ ] Verify program on Solscan
   - [ ] Initialize program state accounts

2. **Deploy web app** (15 minutes)
   - [ ] Push to `main` branch (triggers Vercel production deployment)
   - [ ] Verify environment variables in Vercel dashboard
   - [ ] Monitor deployment logs

3. **Smoke tests** (30 minutes)
   - [ ] Register test agent on mainnet
   - [ ] Stake 1000 $GHOST (test transaction)
   - [ ] Trigger PayAI webhook (use `test-payai-webhook.ts` with mainnet URLs)
   - [ ] Verify Ghost Score update in Convex
   - [ ] Verify credential issued to Base mainnet
   - [ ] Check Solscan for on-chain payment recording

4. **Public launch** (15 minutes)
   - [ ] Remove "Coming Soon" page
   - [ ] Enable public access to `/agents`, `/staking`, etc.
   - [ ] Publish blog post and social media
   - [ ] Monitor error rates and traffic

5. **Monitoring** (ongoing)
   - [ ] Watch Sentry for errors (first 2 hours)
   - [ ] Monitor server wallet balance (auto-refill script?)
   - [ ] Track PayAI webhook success rate
   - [ ] Check Vercel Analytics for traffic spikes

---

## Rollback Plan

### Rollback Triggers
- Critical bugs affecting core functionality
- Security vulnerability discovered
- >10% error rate for >15 minutes
- Data loss or corruption detected

### Rollback Procedure (Emergency)
**Time to rollback**: <10 minutes

1. **Revert web app** (Vercel)
   ```bash
   # Option 1: Via Vercel dashboard
   # Deployments → Find previous stable deployment → "Redeploy"

   # Option 2: Via CLI
   vercel rollback
   ```

2. **Revert environment variables** (if changed)
   - Restore previous `.env.local` from git history
   - Update Vercel environment variables

3. **Revert smart contracts** (if needed - RARE)
   ```bash
   # If program upgrade authority is retained
   anchor upgrade <PROGRAM_ID> --program-id <PROGRAM_KEYPAIR> --provider.cluster mainnet

   # If multisig required, coordinate with signers
   ```

4. **Database rollback** (Convex)
   ```bash
   # Restore from snapshot
   bunx convex data restore --deployment <PRODUCTION_DEPLOYMENT> --snapshot <SNAPSHOT_ID>
   ```

5. **Notify users**
   - Update status page: `https://status.ghostspeak.io`
   - Post to Twitter/Discord
   - Send email to affected users (if applicable)

6. **Post-mortem**
   - Schedule within 48 hours
   - Document root cause, timeline, action items

---

## Post-Deployment Verification

### First 24 Hours
- [ ] **Zero critical errors** - No 500s in Sentry
- [ ] **PayAI webhooks processing** - >95% success rate
- [ ] **Credentials issuing** - Test agent crosses tier threshold
- [ ] **On-chain recording working** - Verify payments on Solscan
- [ ] **Server wallet balance stable** - No unexpected drains
- [ ] **Performance within SLA** - p95 latency <500ms

### First Week
- [ ] **User feedback** - Monitor Discord, Twitter, support tickets
- [ ] **Security monitoring** - No suspicious activity in logs
- [ ] **Cost analysis** - Verify RPC costs, Crossmint fees, Vercel bandwidth
- [ ] **Scale testing** - Confirm infrastructure handles actual load
- [ ] **Documentation updates** - Fix any gaps found during deployment

### First Month
- [ ] **Post-launch retrospective** - What went well, what to improve
- [ ] **Metrics review** - Compare actual vs. projected usage
- [ ] **Technical debt** - Create backlog for deferred items
- [ ] **Next iteration planning** - Q2 competitive features (agent authorization, privacy controls, cross-chain)

---

## Deployment Team & Responsibilities

| Role | Name | Responsibilities |
|------|------|-----------------|
| **Deployment Lead** | __________ | Overall coordination, go/no-go decision |
| **Backend Engineer** | __________ | Smart contract deployment, RPC setup |
| **Frontend Engineer** | __________ | Web app deployment, Vercel configuration |
| **DevOps** | __________ | Infrastructure, monitoring, alerting |
| **Security** | __________ | Security audit review, vulnerability response |
| **QA** | __________ | Final testing, smoke tests post-deployment |
| **Product Manager** | __________ | Stakeholder communication, rollback decision |

---

## External Dependencies

| Service | Contact | SLA | Support |
|---------|---------|-----|---------|
| **Crossmint** | support@crossmint.com | 99.9% uptime | Business hours |
| **Helius RPC** | support@helius.dev | 99.99% uptime | 24/7 |
| **Vercel** | vercel.com/support | 99.99% uptime | 24/7 (Pro) |
| **Convex** | support@convex.dev | 99.9% uptime | Business hours |
| **Solana Mainnet** | N/A | Variable | Community |

---

## Known Issues & Limitations

1. **RPC Import Issue** - `createSolanaRpc` not available in current `@solana/web3.js`
   - **Impact**: On-chain recording disabled in staging
   - **Fix Required**: Use legacy Connection API or upgrade to v2
   - **Priority**: P0 - Must fix before mainnet

2. **Email-Based Credential Delivery** - Using placeholder emails for agents
   - **Impact**: Agents can't access credentials without email setup
   - **Future Fix**: DID-based delivery (Q2 roadmap)
   - **Priority**: P2 - Known limitation, not blocking

3. **Single-Chain Credentials** - Only Base Sepolia in staging
   - **Impact**: Limited interoperability
   - **Future Fix**: Multi-chain support (Q2 roadmap - Subagent 3)
   - **Priority**: P1 - Competitive disadvantage

---

## Success Criteria

**Deployment is considered successful if:**
- ✅ All smart contracts deployed and verified on mainnet
- ✅ Web app accessible at `https://www.ghostspeak.io`
- ✅ PayAI webhooks processing with >95% success rate
- ✅ Credentials auto-issuing at tier milestones (Bronze, Silver, Gold, Platinum, Diamond)
- ✅ On-chain payment recording working (post-RPC fix)
- ✅ Zero critical errors in first 24 hours
- ✅ Performance within SLA (p95 <500ms)
- ✅ Server wallet balance stable (auto-refill if needed)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Security Audit** | 2-3 weeks | Code freeze, audit firm availability |
| **RPC Fix & Testing** | 1 week | Engineering capacity |
| **Crossmint Production Setup** | 3 days | Crossmint support response time |
| **Infrastructure Setup** | 1 week | Vercel, Convex, monitoring tools |
| **Final Testing** | 1 week | All above complete |
| **Deployment Day** | 1 day | All checklist items green |
| **Post-Launch Monitoring** | 1 week | Ongoing |
| **TOTAL** | ~6 weeks | Assumes no major blockers |

---

## Budget Estimate

| Item | Cost | Notes |
|------|------|-------|
| **Security Audit** | $20,000 | Sec3 or OtterSec (smart contracts) |
| **Penetration Testing** | $7,500 | Web app API endpoints |
| **Helius RPC (Pro)** | $99/month | 1000 req/s, production-grade |
| **Vercel (Pro)** | $20/month | Team features, faster builds |
| **Sentry (Team)** | $26/month | Error tracking, performance monitoring |
| **Uptime Monitoring** | $15/month | Pingdom or UptimeRobot |
| **Crossmint** | Variable | Pay-per-credential (~$0.10/credential) |
| **Server Wallet Funding** | 5 SOL | Deployment + credential fees |
| **Buffer (10%)** | $2,800 | Unexpected costs |
| **TOTAL (One-time)** | ~$30,800 | Initial deployment |
| **TOTAL (Monthly)** | ~$160 | Recurring operational costs |

---

## Sign-Off

**I confirm that all checklist items are complete and GhostSpeak is ready for mainnet deployment.**

| Name | Role | Signature | Date |
|------|------|-----------|------|
| __________ | Deployment Lead | __________ | ______ |
| __________ | Engineering Manager | __________ | ______ |
| __________ | Product Manager | __________ | ______ |
| __________ | Security Lead | __________ | ______ |

---

**END OF CHECKLIST**
