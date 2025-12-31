# GhostSpeak Codebase Audit: Reputation Oracle Realignment

**Date:** December 30, 2025
**Purpose:** Audit what was built vs what should exist for reputation oracle model
**Decision:** Option 3 (Hybrid) + Option 2 (Repurpose staking)

---

## The Misalignment

**What GhostSpeak Actually Is:**
- Reputation oracle (FICO/Moody's for AI agents)
- Ingest payment data from PayAI webhooks
- Calculate Ghost Score from transaction history
- Sell API access to Ghost Scores (B2B SaaS)

**What We Mistakenly Built:**
- Payment verification platform (competing with PayAI ❌)
- "Pay 1 USDC to verify an agent" (wrong business model ❌)
- Revenue-share staking (no payment revenue to share ❌)

---

## Codebase Audit Results

### ✅ KEEP (Correct Implementation)

#### 1. PayAI Webhook Integration
**Files:**
- `/packages/web/app/api/payai/webhook/route.ts` ✅
- `/packages/web/lib/server-wallet.ts` ✅
- `/packages/web/convex/payaiRetries.ts` ✅
- `/packages/web/convex/payaiPayments.ts` ✅

**Why Keep:**
- This IS our data source
- PayAI sends us: agent ID, payment success/fail, amount, response time
- We use this to calculate Ghost Score
- **Status:** CORRECT - Keep as-is

**Minor Changes Needed:**
- Remove on-chain recording (we don't need to write to Solana for every payment)
- Just store in Convex database for Ghost Score calculation
- Keep webhook signature verification

---

#### 2. Ghost Score Calculation
**Files:**
- `/packages/web/convex/ghostScore.ts` ✅
- Ghost Score algorithm (Success Rate 40%, Quality 30%, Response Time 20%, Volume 10%)

**Why Keep:**
- This IS our core product
- Ghost Score = reputation metric
- **Status:** CORRECT - Keep as-is

**Minor Changes Needed:**
- None - algorithm is correct

---

#### 3. GHOST Token Integration
**Files:**
- `/packages/sdk-typescript/src/constants/ghostspeak.ts` ✅
- GHOST_TOKEN_MINT, GHOST_TOKEN_CONFIG, STAKING_TIERS

**Why Keep:**
- Token exists, we need to use it
- **Status:** CORRECT - But repurpose the tiers

**Changes Needed:**
- Repurpose tiers from "payment discounts" → "API access levels"
  - Basic (1K GHOST): Free tier (100 API calls/day)
  - Verified (5K GHOST): Starter tier (1K API calls/day)
  - Pro (50K GHOST): Professional tier (10K API calls/day)
  - Whale (500K GHOST): Enterprise tier (unlimited API calls)

---

#### 4. Staking Smart Contracts (Repurpose)
**Files:**
- `/programs/src/state/staking.rs` ✅ (keep structure)
- `/programs/src/instructions/staking.rs` ✅ (keep logic)
- `/programs/src/instructions/access_control.rs` ✅ (repurpose for API access)

**Why Keep:**
- Staking prevents Sybil attacks (must stake 1K GHOST to register agent)
- Staking = voting power (governance on score formula)
- Staking = API access tier (not payment discounts)

**Changes Needed:**
- Remove "revenue multiplier" (no revenue to share)
- Add "API rate limit" based on tier
- Add "governance voting power" (1 GHOST staked = 1 vote)
- Keep tier calculation (stake amount → tier)

**New Purpose:**
```rust
pub struct StakingAccount {
    pub agent: Pubkey,
    pub amount_staked: u64,          // GHOST tokens staked
    pub tier: AccessTier,            // Basic/Verified/Pro/Whale
    pub api_calls_remaining: u32,   // Daily API quota (NEW)
    pub voting_power: u64,          // = amount_staked (NEW)
    pub reputation_boost: u8,       // 5%, 10%, 15%, 20% (keep)
    pub locked_until: i64,          // Unstake lockup period
}
```

---

### ❌ DELETE (Wrong Implementation)

#### 1. USDC Payment Processing
**Files to DELETE:**
- `/programs/src/instructions/pay_with_usdc.rs` ❌
- `/programs/src/instructions/burn_ghost_for_payment.rs` ❌
- `/programs/src/instructions/pay_with_crossmint.rs` ❌

**Why Delete:**
- We're NOT a payment processor
- PayAI handles payments
- No one "pays to verify" - they query our API

**Impact:**
- ~450 lines of code deleted
- 3 smart contract instructions removed

---

#### 2. Crossmint Integration
**Files to DELETE:**
- `/packages/web/components/payments/CrossmintCheckout.tsx` ❌
- `/packages/web/components/payments/VerificationPaymentModal.tsx` ❌
- `/packages/web/app/api/crossmint/webhook/route.ts` ❌
- `/packages/web/scripts/test-crossmint-webhook.ts` ❌
- `CROSSMINT_INTEGRATION.md` ❌
- `CROSSMINT_QUICKSTART.md` ❌

**Why Delete:**
- We're not processing fiat payments
- Crossmint is for payment platforms (like PayAI)
- We're a data/API company (like FICO)

**Impact:**
- ~650 lines of code deleted
- Remove `svix` dependency

---

#### 3. B2B Prepaid Billing
**Files to DELETE:**
- `/programs/src/state/b2b_billing.rs` ❌
- `/programs/src/instructions/b2b_billing.rs` ❌
- `/packages/web/middleware/api-billing.ts` ❌
- `/packages/web/convex/teamBillingEnhanced.ts` ❌
- `/packages/web/app/dashboard/billing/page.tsx` ❌
- `B2B_BILLING_SUMMARY.md` ❌

**Why Delete:**
- This was for "prepaid USDC accounts" (payment processing model)
- B2B customers should pay via Stripe (normal SaaS billing)
- No need for on-chain billing for API subscriptions

**Impact:**
- ~1,245 lines of code deleted
- Remove smart contract billing logic

---

#### 4. Revenue Distribution System
**Files to DELETE:**
- `/programs/src/state/revenue_pool.rs` ❌
- `/programs/src/instructions/revenue_distribution.rs` ❌
- `/packages/web/convex/revenueShare.ts` ❌
- `/packages/web/components/revenue/*` (9 components) ❌
- `/packages/web/app/dashboard/revenue-share/page.tsx` ❌
- `REVENUE_SHARE_STAKING_IMPLEMENTATION.md` ❌
- `REVENUE_DISTRIBUTION_SUMMARY.md` ❌

**Why Delete:**
- No payment revenue to share (we're not processing payments)
- B2B SaaS revenue goes to company treasury (normal business)
- GHOST staking is for Sybil resistance + governance, NOT revenue share

**Impact:**
- ~2,040 lines of code deleted
- Remove entire transparency dashboard

---

#### 5. Payment-Focused Documentation
**Files to DELETE:**
- `PAYMENT_INSTRUCTIONS_SUMMARY.md` ❌
- `CRYPTO_NATIVE_PRICING_STRATEGY.md` ❌
- `STRIPE_REMOVAL_SUMMARY.md` ❌ (we actually NEED Stripe for B2B)
- `/docs/quickstart.mdx` (payment examples) ❌ (rewrite)

**Why Delete:**
- Focused on payment processing (wrong model)
- Need B2B API documentation instead

**Impact:**
- ~5,000+ lines of docs deleted
- Need complete rewrite

---

### 🔄 REPURPOSE (Correct Idea, Wrong Implementation)

#### 1. Staking Tiers → API Access Tiers
**Current (Wrong):**
```typescript
STAKING_TIERS = {
  BASIC: { required: 1K GHOST, multiplier: 1.0x, benefits: 'Revenue share' }
  VERIFIED: { required: 5K GHOST, multiplier: 1.5x, benefits: 'Unlimited verifications' }
  PRO: { required: 50K GHOST, multiplier: 2.0x, benefits: 'API access' }
  WHALE: { required: 500K GHOST, multiplier: 3.0x, benefits: 'Unlimited API' }
}
```

**Correct (Repurposed):**
```typescript
STAKING_TIERS = {
  BASIC: { required: 1K GHOST, apiCalls: 100/day, benefits: 'Register agent, basic API' }
  VERIFIED: { required: 5K GHOST, apiCalls: 1000/day, benefits: 'Verified badge, higher quota' }
  PRO: { required: 50K GHOST, apiCalls: 10000/day, benefits: 'Pro tier, bulk queries' }
  WHALE: { required: 500K GHOST, apiCalls: Unlimited, benefits: 'Enterprise tier, priority support' }
}
```

**Changes:**
- Remove: `multiplier` (no revenue to multiply)
- Add: `apiCalls` (daily quota)
- Update: `benefits` (focus on API access, not payments)

---

#### 2. Agent Registration → Sybil Resistance
**Current (Correct but incomplete):**
- Agents register via `register_agent()` instruction
- Creates compressed NFT (cost-efficient)

**Repurposed (Add staking requirement):**
```rust
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    metadata: AgentMetadata,
) -> Result<()> {
    // NEW: Check if user has staked at least 1,000 GHOST
    let staking_account = &ctx.accounts.staking_account;
    require!(
        staking_account.amount_staked >= 1_000_000_000, // 1K GHOST (6 decimals)
        ErrorCode::InsufficientStake
    );

    // Existing registration logic
    // ...
}
```

**Why:**
- Prevents Sybil attacks (can't create 1000 fake agents without 1M GHOST)
- Makes GHOST token valuable (need to buy to register)
- Aligns with original roadmap "stake-to-register"

---

### 🆕 ADD (Missing Core Product)

#### 1. B2B Ghost Score API (THE ACTUAL PRODUCT)
**What's Missing:**
- REST API endpoints for Ghost Score queries
- API key management
- Rate limiting by subscription tier
- Stripe subscriptions for B2B customers

**What to Build:**

**A. API Endpoints** (`/packages/web/app/api/v1/`)
```typescript
// Core reputation queries
GET  /v1/score/{agentId}              // Get Ghost Score (0-1000)
GET  /v1/credentials/{agentId}        // Get W3C VCs
GET  /v1/history/{agentId}            // Payment history summary
POST /v1/bulk/scores                  // Batch queries (up to 100)

// Analytics (Premium tiers only)
GET  /v1/analytics/top-agents         // Top performers
GET  /v1/analytics/trends             // Score trends
GET  /v1/analytics/fraud-alerts       // Fraud detection

// Webhooks (Enterprise tier only)
POST /v1/webhooks/configure           // Set up webhook
GET  /v1/webhooks/test                // Test webhook
```

**B. API Key Management** (`/packages/web/convex/apiKeys.ts`)
```typescript
// Create API key for B2B customer
mutation createApiKey(teamId, tier: 'starter' | 'professional' | 'enterprise')

// Rate limiting by tier
query checkRateLimit(apiKey) → { remaining: number, resetAt: timestamp }

// Usage tracking
mutation trackApiCall(apiKey, endpoint, responseTime)
```

**C. Stripe Subscriptions** (YES, we need Stripe for B2B SaaS)
```typescript
// Pricing tiers (from original roadmap)
const B2B_PRICING = {
  starter: {
    price: '$99/month',
    apiCalls: 10_000,
    features: ['Ghost Score API', 'Basic support']
  },
  professional: {
    price: '$499/month',
    apiCalls: 100_000,
    features: ['Everything in Starter', 'Analytics API', 'Priority support']
  },
  enterprise: {
    price: '$2,499/month',
    apiCalls: 1_000_000,
    features: ['Everything in Pro', 'Webhooks', 'Custom SLA', 'Dedicated support']
  }
}
```

**D. Rate Limiting Middleware**
```typescript
// /packages/web/middleware/api-rate-limit.ts
export async function withRateLimit(req: Request, apiKey: string) {
  const team = await getTeamByApiKey(apiKey);
  const usage = await getMonthlyUsage(team._id);

  const limit = team.tier === 'starter' ? 10_000 :
                team.tier === 'professional' ? 100_000 :
                1_000_000;

  if (usage >= limit) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Process request
  await trackApiCall(team._id);
  return await processRequest(req);
}
```

---

#### 2. Governance System (NEW)
**What's Missing:**
- Vote on Ghost Score formula parameters
- Propose changes to tier thresholds
- Emergency pause mechanism

**What to Build:**

**A. Governance Smart Contract** (`/programs/src/instructions/governance.rs`)
```rust
pub fn create_proposal(
    ctx: Context<CreateProposal>,
    proposal_type: ProposalType,
    description: String,
    new_value: u64,
) -> Result<()> {
    // ProposalType: AdjustScoreWeights, ChangeTierThreshold, UpdateFee, etc.
}

pub fn vote(
    ctx: Context<Vote>,
    proposal_id: u64,
    support: bool, // true = yes, false = no
) -> Result<()> {
    // Voting power = amount of GHOST staked
    let voting_power = ctx.accounts.staking_account.amount_staked;

    if support {
        proposal.votes_for += voting_power;
    } else {
        proposal.votes_against += voting_power;
    }
}

pub fn execute_proposal(
    ctx: Context<ExecuteProposal>,
    proposal_id: u64,
) -> Result<()> {
    // If votes_for > votes_against && quorum reached (10% of supply)
    // Execute the change
}
```

**B. Governance UI** (`/packages/web/app/dashboard/governance/page.tsx`)
- List active proposals
- Vote on proposals
- View voting history
- Proposal creation form (requires 1M GHOST to propose)

---

## Implementation Plan

### Phase 1: Cleanup (Week 1)
**Delete wrong code:**
- [ ] Delete payment processing (pay_with_usdc.rs, burn_ghost_for_payment.rs, pay_with_crossmint.rs)
- [ ] Delete Crossmint integration (components, webhook, docs)
- [ ] Delete B2B billing (smart contracts, middleware, dashboard)
- [ ] Delete revenue distribution (smart contracts, convex, dashboard)
- [ ] Delete payment-focused documentation

**Impact:**
- ~4,385 lines of code deleted
- Cleaner codebase aligned with reputation oracle model

---

### Phase 2: Repurpose Staking (Week 2)
**Update staking for new purpose:**
- [ ] Add `api_calls_remaining` to StakingAccount
- [ ] Add `voting_power` to StakingAccount
- [ ] Remove `revenue_multiplier` from tiers
- [ ] Add Sybil resistance check to `register_agent()`
- [ ] Update tier benefits (API quotas, not payment discounts)

**Impact:**
- Staking now serves: Sybil resistance + governance + API access
- No longer about revenue-share

---

### Phase 3: Build B2B API (Week 3-4)
**Add missing core product:**
- [ ] Create API endpoints (GET /v1/score, /v1/credentials, /v1/history, POST /v1/bulk)
- [ ] Add API key management (Convex)
- [ ] Add rate limiting middleware
- [ ] Integrate Stripe for B2B subscriptions
- [ ] Add usage tracking and analytics

**Impact:**
- THIS is the actual revenue product
- $99-$2,499/month per original roadmap

---

### Phase 4: Add Governance (Week 5)
**Enable decentralized governance:**
- [ ] Create governance smart contract (proposals, voting, execution)
- [ ] Add governance UI (list proposals, vote, create proposal)
- [ ] Add voting power display (based on staked GHOST)

**Impact:**
- Community can vote on score formula
- Decentralized parameter updates

---

### Phase 5: Update Documentation (Week 6)
**Rewrite all docs:**
- [ ] Update /docs/pricing.mdx (B2B API tiers, not payments)
- [ ] Update /docs/tokenomics.mdx (Sybil resistance + governance, not revenue-share)
- [ ] Update /docs/quickstart.mdx (API integration, not payment examples)
- [ ] Update README.md (reputation oracle positioning)
- [ ] Create B2B API documentation (OpenAPI spec)

---

## Code Deletion Summary

| Category | Files | Lines of Code | Reason |
|----------|-------|---------------|--------|
| **Payment Processing** | 3 Rust files | ~450 | Not a payment processor |
| **Crossmint** | 8 files | ~650 | Not processing fiat |
| **B2B Billing** | 5 files | ~1,245 | Wrong billing model |
| **Revenue Distribution** | 11 files | ~2,040 | No payment revenue |
| **Documentation** | 5 files | ~5,000 | Wrong business model |
| **TOTAL** | **32 files** | **~9,385 lines** | **Major cleanup needed** |

---

## Code Addition Summary

| Category | Files | Lines of Code | Purpose |
|----------|-------|---------------|---------|
| **B2B API Endpoints** | 6 route files | ~800 | Core revenue product |
| **API Key Management** | 2 Convex files | ~300 | Authentication |
| **Rate Limiting** | 1 middleware | ~150 | Quota enforcement |
| **Stripe Integration** | 3 files | ~400 | B2B subscriptions |
| **Governance Contract** | 2 Rust files | ~600 | Decentralized voting |
| **Governance UI** | 3 React components | ~500 | Proposal/voting interface |
| **Documentation** | 5 updated files | ~2,000 | B2B API docs |
| **TOTAL** | **22 files** | **~4,750 lines** | **Core product build** |

**Net Change:** -4,635 lines (delete 9,385, add 4,750)

---

## Revised Revenue Model (Correct)

### B2C (Free Ghost Score Dashboard)
- Users check their own agent's Ghost Score (free)
- Premium analytics: $10/month (optional)
- **Revenue:** ~$100K/year (10K users × $10/month × 10% conversion)

### B2B (Ghost Score API - PRIMARY REVENUE)
**Pricing Tiers:**
- **Starter:** $99/month (10K API calls)
- **Professional:** $499/month (100K API calls)
- **Enterprise:** $2,499/month (1M API calls)

**Year 1 Targets:**
- 20 Starter customers: $23.8K/year
- 10 Professional customers: $59.9K/year
- 5 Enterprise customers: $149.9K/year
- **Total B2B:** $233.6K ARR (Year 1)

**Year 2 Targets:**
- 100 Starter: $118.8K/year
- 50 Professional: $299.4K/year
- 20 Enterprise: $599.8K/year
- **Total B2B:** $1.02M ARR

**End of 2026 Target (Original Roadmap):**
- Starter: 500 × $99 = $594K
- Professional: 200 × $499 = $1.2M
- Enterprise: 60 × $2,499 = $1.8M
- **Total:** $3.6M ARR (more realistic than $32.9M)

### GHOST Token Utility (Correct)
1. **Sybil Resistance:** Stake 1K GHOST to register agent
2. **Governance:** 1 GHOST staked = 1 vote on formula changes
3. **API Access:** Higher stakes = higher API quotas (alternative to paying)
4. **Reputation Boost:** 5-20% score boost based on tier

---

## What We Keep from 7 Agents' Work

### Agent #1 (USDC Payments) - ❌ DELETE
- 0% salvageable
- All payment processing code deleted

### Agent #2 (Staking Tiers) - ✅ 80% KEEP
- Keep staking contract structure
- Keep tier calculation logic
- Remove revenue multiplier
- Add API quotas and voting power

### Agent #3 (Revenue Distribution) - ❌ DELETE
- 0% salvageable
- No payment revenue to distribute

### Agent #4 (B2B Billing) - ❌ DELETE (but learn from it)
- Delete prepaid USDC billing
- But learn lessons for Stripe integration

### Agent #5 (Crossmint) - ❌ DELETE
- 0% salvageable
- Not processing payments

### Agent #6 (Documentation) - ❌ DELETE & REWRITE
- Delete payment-focused docs
- Rewrite for B2B API model

### Agent #7 (Transparency Dashboard) - ❌ DELETE
- Delete revenue-share dashboard
- Build API usage dashboard instead

**Summary:**
- **Keep:** 20% of Agent #2's work (staking structure)
- **Delete:** 80% of all agents' work (~7,400 lines)
- **Lesson learned:** Should have clarified business model first

---

## Next Steps (Immediate)

### Decision Point 1: Approve Cleanup Plan?
- Delete ~9,385 lines of wrong code
- Will this break anything critical? (Need to audit dependencies)

### Decision Point 2: Prioritize B2B API Build?
- This is the actual revenue product
- Should be priority #1 after cleanup

### Decision Point 3: Keep or Delete GHOST Token Work?
- If we repurpose for Sybil + governance: KEEP
- If we don't want staking at all: DELETE everything

**What's your call on these 3 decisions?**

---

**Status:** Awaiting approval to proceed with cleanup + B2B API build

**Date:** December 30, 2025
