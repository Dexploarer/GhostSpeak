# GhostSpeak Mainnet Deployment Checklist

**Current Status:** Devnet Deployment
**Target:** Mainnet Production Launch
**Program ID (Devnet):** `GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9`
**Program ID (Mainnet):** `TBD - Generate after audit completion`

---

## Pre-Deployment

### Smart Contract Audit
- [ ] **Security audit completed**
  - Auditor: `[TBD - e.g., Kudelski Security, Trail of Bits, OtterSec]`
  - Audit report published: `[Link to report]`
  - All critical issues resolved
  - All high-priority issues resolved
  - Medium/low issues documented with mitigation plan

- [ ] **Internal security review passed**
  - No unprotected state mutations
  - All arithmetic operations checked for overflow/underflow
  - PDA derivations verified (no collision potential)
  - Authority checks on all sensitive operations
  - Re-entrancy protections in place
  - Cross-program invocation (CPI) safety verified

- [ ] **Code freeze implemented**
  - Main branch locked (require PR reviews)
  - No changes without security team approval
  - Change log maintained

### Infrastructure Setup

- [ ] **Multisig wallet configured**
  - Type: 3-of-5 Squads Protocol multisig
  - Signers documented:
    - Signer 1: `[Name, Role, Public Key]`
    - Signer 2: `[Name, Role, Public Key]`
    - Signer 3: `[Name, Role, Public Key]`
    - Signer 4: `[Name, Role, Public Key]`
    - Signer 5: `[Name, Role, Public Key]`
  - Backup recovery plan documented
  - Test transaction executed on devnet

- [ ] **Protocol admin keys secured**
  - Hardware wallets configured (Ledger/Trezor)
  - Multisig is upgrade authority
  - Multisig is protocol config authority
  - Admin keys stored in secure vault (1Password/AWS Secrets Manager)
  - Key rotation procedure documented

- [ ] **Treasury addresses confirmed**
  - Treasury wallet: `[Public Key]`
  - Buyback pool wallet: `[Public Key]`
  - Moderator pool wallet: `[Public Key]`
  - All wallets controlled by multisig
  - Withdrawal procedures documented

### Testing & Validation

- [ ] **All instructions tested on devnet**
  - Agent registration (regular + compressed)
  - Agent updates
  - Credential issuance
  - Reputation updates
  - Governance voting
  - Protocol fee collection (enabled on devnet test)

- [ ] **Load testing completed**
  - Target TPS: `[e.g., 100 TPS]`
  - Sustained load test: 1 hour at 50% capacity
  - Spike test: Handle 2x normal load for 15 minutes
  - RPC fallback tested (primary node failure)
  - Database performance validated

- [ ] **Monitor devnet for stability**
  - 7 consecutive days without critical errors
  - Error rate < 1%
  - Transaction success rate > 99%
  - Average confirmation time < 2 seconds

- [ ] **Integration testing**
  - SDK tested with all instructions
  - CLI tested with all commands
  - Web app tested end-to-end
  - PayAI integration verified
  - Crossmint integration verified

---

## Smart Contract Verification

### Source Code Verification
- [ ] **Program binary matches source code**
  - Verifiable build completed: `anchor build --verifiable`
  - Hash verified: `solana program dump PROGRAM_ID dump.so && sha256sum dump.so`
  - Source code published to GitHub with tag (e.g., `v1.0.0-mainnet`)

- [ ] **IDL verified and published**
  - IDL exported: `anchor idl init`
  - IDL uploaded to on-chain account
  - IDL published to npm: `@ghostspeak/idl`
  - SDK regenerated from verified IDL

- [ ] **All PDAs documented**
  - Protocol config: `["protocol_config"]`
  - Agent account: `["agent", agent_mint]`
  - Credential: `["credential", agent_account, credential_type]`
  - Reputation account: `["reputation", agent_account]`
  - Governance proposal: `["proposal", proposal_id]`
  - All seeds and bumps documented in README

- [ ] **Authority keys documented**
  - Upgrade authority: Multisig `[Address]`
  - Protocol config authority: Multisig `[Address]`
  - Emergency pause authority (if applicable): `[Address]`

- [ ] **Upgrade authority confirmed**
  - Set to multisig (NOT deployer wallet)
  - Verified: `solana program show PROGRAM_ID`
  - Upgrade process tested on devnet

---

## Protocol Configuration

### Fee Structure Setup
- [ ] **Initialize protocol_config account**
  - Script: `bun scripts/mainnet/initialize-protocol-fees.ts`
  - Transaction signature: `[Signature after execution]`
  - Config PDA verified on-chain

- [ ] **Set escrow fee: 50 basis points (0.5%)**
  - Confirmed in protocol_config: `escrowFeeBps = 50`
  - Treasury allocation: 80% (40 bps to treasury)
  - Buyback allocation: 20% (10 bps to buyback pool)

- [ ] **Set dispute fee: 100 basis points (1%)**
  - Confirmed in protocol_config: `disputeFeeBps = 100`
  - Moderator pool receives 100% of dispute fees

- [ ] **Set agent registration fee: 0.01 SOL**
  - Confirmed in protocol_config: `agentRegistrationFee = 10_000_000 lamports`
  - Prevents spam registrations
  - 100% to treasury

- [ ] **Set listing fee: 0.001 SOL**
  - Confirmed in protocol_config: `listingFee = 1_000_000 lamports`
  - Prevents spam listings
  - 100% to treasury

- [ ] **Configure fee distribution**
  - Treasury wallet verified: `[Public Key]`
  - Buyback pool wallet verified: `[Public Key]`
  - Moderator pool wallet verified: `[Public Key]`
  - Test transaction sent to each wallet

- [ ] **Enable protocol fees**
  - Execute: `enable_protocol_fees` instruction
  - Requires multisig approval
  - Confirmed: `feesEnabled = true`
  - Transaction signature: `[Signature after execution]`

### Fee Collection Verification
- [ ] **Test fee collection on devnet**
  - Create test escrow with fees enabled
  - Complete escrow and verify fee distribution
  - Verify treasury received 80%
  - Verify buyback pool received 20%

- [ ] **Test agent registration fee**
  - Register test agent on devnet with fees enabled
  - Verify 0.01 SOL deducted from payer
  - Verify treasury received payment

---

## Infrastructure

### RPC Configuration
- [ ] **Production RPC nodes configured**
  - Primary RPC: `[e.g., Helius, Triton, QuickNode]`
  - API key secured in environment variables
  - Rate limits confirmed: `[e.g., 1000 req/s]`
  - Websocket support verified

- [ ] **Backup RPC nodes configured**
  - Secondary RPC: `[Provider name]`
  - Tertiary RPC: `[Provider name]`
  - Automatic failover tested
  - Health check endpoint: `/api/health/rpc`

- [ ] **RPC monitoring**
  - Latency alerts: > 1000ms
  - Error rate alerts: > 5%
  - Daily RPC usage tracked

### Database & Caching
- [ ] **Database backups automated**
  - Provider: `[e.g., Neon, Supabase, AWS RDS]`
  - Backup frequency: Every 6 hours
  - Retention: 30 days
  - Restore procedure tested
  - Last test restore: `[Date]`

- [ ] **Redis cache configured**
  - Provider: `[e.g., Upstash, AWS ElastiCache]`
  - Cache TTL configured: 5 minutes for agent data
  - Cache invalidation tested
  - Fallback to database on cache miss

### Monitoring & Alerting
- [ ] **Monitoring dashboard set up**
  - Platform: `[Datadog / Grafana / New Relic]`
  - Dashboards created (see `infrastructure/monitoring/grafana-dashboard.json`)
  - Access granted to team members

- [ ] **Error alerting configured**
  - Platform: `[PagerDuty / Opsgenie / Slack]`
  - Alert thresholds defined (see `infrastructure/monitoring/alerts.yaml`)
  - Test alert sent and acknowledged
  - On-call rotation configured

- [ ] **DDoS protection enabled**
  - Cloudflare Enterprise plan active
  - Rate limiting: 100 req/min per IP
  - Bot protection enabled
  - WAF rules configured

- [ ] **Performance monitoring**
  - Sentry error tracking configured
  - APM (Application Performance Monitoring) enabled
  - Custom metrics tracked:
    - Transaction volume per instruction
    - Agent registration rate
    - Ghost Score updates/day
    - Protocol fee revenue (USD equivalent)

### CI/CD Pipeline
- [ ] **Production deployment pipeline**
  - GitHub Actions workflow: `.github/workflows/deploy-mainnet.yml`
  - Requires manual approval for mainnet
  - Automatic rollback on failure
  - Deployment notifications to Discord/Slack

- [ ] **Staging environment**
  - Staging deployed to devnet
  - Smoke tests run before mainnet deploy
  - Database migration tested on staging

---

## Web Application

### Environment Configuration
- [ ] **Production environment variables set**
  - See `.env.mainnet.example`
  - All secrets stored in Vercel/Railway environment
  - No hardcoded values in codebase
  - Environment variables validated on startup

- [ ] **Mainnet RPC URLs configured**
  - `NEXT_PUBLIC_SOLANA_RPC_URL`: Mainnet RPC
  - `NEXT_PUBLIC_SOLANA_WS_URL`: Mainnet WebSocket
  - Fallback URLs configured

- [ ] **Program IDs updated to mainnet**
  - `NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID`: Mainnet program ID
  - SDK package updated with mainnet address
  - Hard-coded devnet IDs removed

### Third-Party Integrations
- [ ] **Crossmint production credentials**
  - API key: `prod_...`
  - Webhook URL configured
  - Test transaction on mainnet
  - Custody wallet confirmed

- [ ] **PayAI webhook production URLs**
  - Webhook URL: `https://api.ghostspeak.io/api/payai/webhook`
  - Webhook secret configured
  - Signature verification tested
  - Contact PayAI to switch from devnet to mainnet

- [ ] **Stripe production keys** (if applicable)
  - Publishable key: `pk_live_...`
  - Secret key: `sk_live_...`
  - Webhook secret: `whsec_...`
  - Test payment completed

- [ ] **Analytics configured**
  - Platform: `[Mixpanel / Amplitude / PostHog]`
  - Events tracked:
    - Agent registered
    - Credential issued
    - Vote cast
    - Escrow created/completed
  - Dashboard created for KPIs

### Performance Optimization
- [ ] **CDN configured**
  - Static assets cached at edge (Cloudflare/Vercel Edge)
  - Image optimization enabled
  - Gzip/Brotli compression enabled

- [ ] **API rate limiting**
  - Per-user limits: 100 req/min
  - Per-IP limits: 200 req/min
  - Anonymous limits: 20 req/min
  - Rate limit headers returned

- [ ] **Database query optimization**
  - Indexes created on frequently queried fields
  - N+1 queries eliminated
  - Connection pooling configured

---

## Documentation

### Public Documentation
- [ ] **API documentation published**
  - Hosted at: `https://docs.ghostspeak.io`
  - All endpoints documented
  - Example requests/responses
  - Authentication described
  - Error codes documented

- [ ] **SDK documentation updated**
  - TypeScript SDK published to npm
  - README with quickstart guide
  - API reference generated (TypeDoc)
  - Example code for all features

- [ ] **Quickstart guide verified on mainnet**
  - Follow guide from scratch on mainnet
  - No errors or outdated instructions
  - Screenshots updated
  - Hosted at: `https://docs.ghostspeak.io/quickstart`

- [ ] **Security best practices documented**
  - Wallet security guidelines
  - Smart contract interaction safety
  - Phishing awareness
  - Hosted at: `https://docs.ghostspeak.io/security`

### Internal Documentation
- [ ] **Runbook created**
  - Common operations documented
  - Deployment procedures
  - Rollback procedures
  - Database migrations

- [ ] **Incident response playbook created**
  - See `docs/deployment/incident-response.md`
  - Team trained on procedures
  - Contact list updated
  - Escalation paths defined

- [ ] **Architecture documentation**
  - System architecture diagram
  - Data flow diagrams
  - Infrastructure diagram
  - Smart contract architecture

---

## Legal & Compliance

### Legal Documents
- [ ] **Terms of Service finalized**
  - Reviewed by legal counsel
  - Published at: `https://ghostspeak.io/terms`
  - User acceptance flow implemented
  - Version dated and logged

- [ ] **Privacy Policy finalized**
  - GDPR compliance verified (if applicable)
  - Data collection disclosed
  - Published at: `https://ghostspeak.io/privacy`
  - Cookie consent banner implemented

### Compliance
- [ ] **GDPR compliance verified** (if serving EU users)
  - Data processing agreement
  - Right to deletion implemented
  - Data export functionality
  - Privacy by design principles

- [ ] **KYC/AML considerations** (if applicable)
  - Legal opinion obtained
  - Compliance strategy documented
  - Geographic restrictions implemented (if needed)

### Security Disclosure
- [ ] **Bug bounty program launched**
  - Platform: `[Immunefi / HackerOne]`
  - Bounty amounts defined:
    - Critical: $50,000 - $100,000
    - High: $10,000 - $50,000
    - Medium: $5,000 - $10,000
    - Low: $1,000 - $5,000
  - Scope defined (smart contracts, web app, API)

- [ ] **Security disclosure policy published**
  - Responsible disclosure guidelines
  - Response SLA: 24 hours for critical
  - Public disclosure timeline: 90 days
  - Contact: security@ghostspeak.io

---

## Post-Deployment

### Deployment Verification
- [ ] **Verify program deployed successfully**
  - Program ID confirmed on mainnet: `[New Mainnet Program ID]`
  - Program executable data verified
  - Upgrade authority set to multisig
  - IDL uploaded to on-chain account

- [ ] **Initialize all protocol accounts**
  - Protocol config account initialized
  - Global state accounts initialized (if any)
  - Fee distribution wallets verified

- [ ] **Test admin instructions (as multisig)**
  - Create test proposal in Squads
  - Execute simple transaction (e.g., update protocol config)
  - Verify multisig threshold works (3-of-5)

### Monitoring
- [ ] **Monitor transactions for 24 hours**
  - All team members on standby
  - Real-time dashboard monitoring
  - Error logs reviewed every 2 hours
  - No critical errors observed

- [ ] **Health checks passing**
  - API health: `/api/health` returns 200
  - Database connection healthy
  - RPC connection healthy
  - Cache connection healthy

- [ ] **Metrics within acceptable ranges**
  - Transaction success rate > 99%
  - Average RPC latency < 500ms
  - Error rate < 1%
  - No unexpected fee distributions

### Launch Communications
- [ ] **Announce mainnet launch**
  - Twitter announcement: `[Link to tweet]`
  - Discord announcement in #announcements
  - Blog post published: `[Link to blog]`
  - Press release (if applicable)

- [ ] **Update website to mainnet**
  - "Mainnet Beta" badge displayed
  - Devnet warning removed
  - Explorer links point to mainnet
  - Wallet connect defaults to mainnet

- [ ] **Contact PayAI to switch webhook**
  - Email PayAI support
  - Provide mainnet webhook URL
  - Verify webhook receives events
  - Test agent registration with PayAI payment

### Post-Launch Monitoring (First 7 Days)
- [ ] **Day 1: 24/7 monitoring**
  - All engineers on call
  - War room active (Discord/Slack)
  - Hourly metrics review

- [ ] **Day 2-3: Extended coverage**
  - 16-hour coverage (8am - 12am UTC)
  - 4-hour metrics review
  - Incident response team available

- [ ] **Day 4-7: Business hours coverage**
  - Standard business hours (9am - 6pm UTC)
  - Daily metrics review
  - Standard on-call rotation begins

- [ ] **Week 2+: Normal operations**
  - Standard on-call rotation
  - Weekly metrics review
  - Monthly infrastructure review

---

## Success Metrics (First 30 Days)

### Technical Metrics
- [ ] **Uptime > 99.9%**
  - Target: 99.95%
  - Maximum acceptable downtime: 43 minutes/month

- [ ] **Transaction success rate > 99%**
  - Failed transactions investigated
  - Root causes documented

- [ ] **Average RPC latency < 500ms**
  - P50: < 200ms
  - P95: < 500ms
  - P99: < 1000ms

- [ ] **Error rate < 1%**
  - Critical errors: 0
  - High-priority errors: < 0.1%
  - Medium errors: < 1%

### Business Metrics
- [ ] **User growth**
  - Target: `[e.g., 1,000 agents registered]`
  - Daily active users: `[Target]`
  - Retention rate: `[Target]`

- [ ] **Protocol fee revenue**
  - Track daily/weekly revenue
  - Compare to projections
  - Fee structure optimization (if needed)

- [ ] **Escrow completion rate**
  - Target: > 80% completion rate
  - Dispute rate: < 5%
  - Average escrow value

### Community Metrics
- [ ] **Community engagement**
  - Discord members: `[Target]`
  - Twitter followers: `[Target]`
  - GitHub stars: `[Target]`

- [ ] **Developer adoption**
  - SDK downloads: `[Target]`
  - Community-built tools: `[Count]`
  - Integration requests: `[Count]`

---

## Rollback Plan

### Rollback Triggers
- Critical smart contract vulnerability discovered
- Transaction success rate < 90%
- Multiple security incidents
- Catastrophic infrastructure failure

### Rollback Procedure
1. **Immediate:** Pause all protocol operations (if pause function exists)
2. **Communication:** Notify users via Twitter/Discord
3. **Investigation:** Identify root cause
4. **Decision:** Rollback vs. hotfix
5. **Execution:** Deploy previous version or emergency patch
6. **Verification:** Verify rollback successful
7. **Post-mortem:** Document incident and lessons learned

---

## Sign-Off

### Deployment Approval
- [ ] **Technical Lead:** `[Name, Signature, Date]`
- [ ] **Security Lead:** `[Name, Signature, Date]`
- [ ] **Product Lead:** `[Name, Signature, Date]`
- [ ] **Legal Counsel:** `[Name, Signature, Date]`
- [ ] **CEO/Founder:** `[Name, Signature, Date]`

### Final Verification
- [ ] **All checklist items completed**
- [ ] **No outstanding critical issues**
- [ ] **Team ready for launch**
- [ ] **Emergency contacts verified**
- [ ] **Rollback plan understood**

---

**Deployment Date:** `[TBD]`
**Deployment Time:** `[TBD - Recommend Tuesday/Wednesday, 10am UTC]`
**Deployment Lead:** `[Name]`

**Last Updated:** 2025-12-30
