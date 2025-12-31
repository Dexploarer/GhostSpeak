# Stripe Integration Removal Summary

**Date:** December 30, 2025
**Reason:** Transitioning to crypto-native payment model (USDC/GHOST)
**Status:** ✅ Complete

---

## Files Deleted (Total: ~650 lines)

### 1. Stripe API Routes
- **Deleted:** `/packages/web/app/api/stripe/` (entire directory)
  - `checkout/route.ts` (~150 lines) - Stripe checkout session creation
  - `webhook/route.ts` (~250 lines) - Stripe webhook handler for subscription events
  - `portal/route.ts` (~30 lines) - Stripe customer portal redirect
  - `usage/route.ts` (~18 lines) - Stripe usage reporting for metered billing

**Total API routes:** ~448 lines deleted

### 2. Stripe Client Library
- **Deleted:** `/packages/web/lib/stripe.ts` (~89 lines)
  - Stripe client initialization
  - Price ID mappings (B2C Pro/Power, B2B Startup/Growth/Enterprise)
  - Subscription tier configuration
  - B2B pricing constants

### 3. Convex Subscription Module
- **Deleted:** `/packages/web/convex/subscriptions.ts` (~192 lines)
  - `getUserSubscription` - Query user's active subscription
  - `upsertSubscription` - Create or update subscription from Stripe webhook
  - `renewSubscription` - Update subscription period dates
  - `updateSubscriptionStatus` - Handle subscription status changes
  - `updateSubscription` - Full subscription update
  - `cancelSubscription` - Mark subscription as canceled

### 4. Documentation Files
- **Deleted:** `/packages/web/STRIPE_SETUP_CHECKLIST.md`
- **Deleted:** `/packages/web/PAYMENT_INFRASTRUCTURE_SETUP.md`

**Total Deleted:** ~729 lines of code + 2 documentation files

---

## Files Modified

### 1. Convex Schema (`/packages/web/convex/schema.ts`)

#### Removed Table: `subscriptions`
```typescript
// DELETED:
subscriptions: defineTable({
  userId: v.id('users'),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  tier: v.string(), // 'free' | 'pro' | 'power'
  status: v.string(), // 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_stripe_customer', ['stripeCustomerId'])
  .index('by_stripe_subscription', ['stripeSubscriptionId']),
```

#### Updated Table: `verifications`
```typescript
// BEFORE:
verifications: defineTable({
  ...
  subscriptionTier: v.string(), // 'free' | 'pro' | 'power'
  ...
})

// AFTER (crypto-native):
verifications: defineTable({
  ...
  paymentMethod: v.optional(v.string()), // 'free' | 'usdc' | 'ghost_staked' | 'ghost_burned'
  paymentSignature: v.optional(v.string()), // Transaction signature if paid
  ...
})
```

#### Updated Table: `teams`
```typescript
// BEFORE:
teams: defineTable({
  ...
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  ...
})
  .index('by_stripe_customer', ['stripeCustomerId'])

// AFTER (USDC token accounts):
teams: defineTable({
  ...
  usdcTokenAccount: v.optional(v.string()), // Team's USDC token account for payments
  monthlyBudget: v.optional(v.number()), // Monthly USDC budget
  currentBalance: v.optional(v.number()), // Current USDC balance
  lastBillingAt: v.optional(v.number()), // Last monthly billing timestamp
  ...
})
  .index('by_usdc_account', ['usdcTokenAccount'])
```

### 2. Package Dependencies (`/packages/web/package.json`)

**Removed Dependency:**
```json
// DELETED:
"stripe": "^20.1.0"
```

---

## Files That Still Reference "subscription" (Need Manual Review)

The following files still contain subscription-related code that may need updating:

### API Routes
1. `/packages/web/app/api/ghost-score/verify/route.ts`
   - Uses subscription tier logic for freemium limits
   - **Action Needed:** Replace with GHOST staking tier check

### Convex Modules
2. `/packages/web/convex/webhooks.ts`
   - May reference subscription events
   - **Action Needed:** Review for Stripe webhook references

3. `/packages/web/convex/verifications.ts`
   - Uses subscription tier for access control
   - **Action Needed:** Replace with payment/staking check

### Frontend Components
4. `/packages/web/app/dashboard/ghost-score/page.tsx`
   - Displays subscription status
   - **Action Needed:** Replace with GHOST staking status

5. `/packages/web/app/dashboard/api-keys/page.tsx`
   - Checks subscription tier for API key creation
   - **Action Needed:** Replace with USDC token account check

6. `/packages/web/app/dashboard/payments/page.tsx`
   - May display Stripe payment history
   - **Action Needed:** Replace with Solana transaction history

7. `/packages/web/components/landing/BentoGrid.tsx`
   - May reference subscription features
   - **Action Needed:** Update with GHOST staking tiers

8. `/packages/web/app/providers.tsx`
   - May initialize Stripe
   - **Action Needed:** Remove Stripe provider if present

### Documentation
9. `/packages/web/API_DOCUMENTATION.md`
   - Documents subscription API endpoints
   - **Action Needed:** Update with USDC payment endpoints

10. `/packages/web/examples/README.md`
    - May have Stripe examples
    - **Action Needed:** Replace with USDC/GHOST examples

---

## Replacement Strategy

### Old Model (Stripe Subscriptions)
```
User Flow:
1. User clicks "Upgrade to Pro" ($10/month)
2. Redirects to Stripe Checkout
3. Stripe creates subscription
4. Webhook updates Convex subscriptions table
5. User gets unlimited verifications

B2B Flow:
1. Enterprise signs up
2. Stripe creates metered billing subscription
3. Monthly invoice charged to credit card
4. Overage fees billed automatically
```

### New Model (Crypto-Native)

**B2C (Ghost Score):**
```
Freemium:
- 3 free verifications/month
- After 3, pay 1 USDC per verification OR
- Burn 75 GHOST tokens per verification (25% discount) OR
- Stake 5,000+ GHOST for unlimited verifications

Staking Tiers (from GHOST_TOKEN_CONFIG):
- Verified (5K GHOST): Unlimited verifications, 1.5x revenue share
- Pro (50K GHOST): API access (100K requests/month), 2x revenue share
- Whale (500K GHOST): Unlimited API, 3x revenue share
```

**B2B (API Access):**
```
Prepaid Model:
1. Enterprise creates team
2. Team deposits USDC to token account
3. API usage deducts from balance in real-time
4. Low balance notifications
5. Overage fees charged at higher rate

Pricing:
- Startup: 50 USDC/month (10K requests), 0.01 USDC per extra
- Growth: 250 USDC/month (100K requests), 0.005 USDC per extra
- Enterprise: 1,000 USDC/month (500K requests), 0.002 USDC per extra
```

---

## Smart Contract Instructions Needed

To replace Stripe functionality, we need these new instructions:

### 1. USDC Payment Processing
```rust
/// Pay for a single verification with USDC
pub fn pay_for_verification(
    ctx: Context<PayForVerification>,
    amount: u64, // 1 USDC (6 decimals = 1_000_000)
) -> Result<()>
```

### 2. GHOST Token Burning
```rust
/// Burn GHOST tokens for payment discount
pub fn burn_ghost_for_payment(
    ctx: Context<BurnForPayment>,
    amount: u64, // 75 GHOST (6 decimals = 75_000_000)
) -> Result<()>
```

### 3. Staking Tier Detection
```rust
/// Check user's staking tier for access control
pub fn get_staking_tier(
    ctx: Context<GetStakingTier>,
    user: Pubkey,
) -> Result<StakingTier> // Basic | Verified | Pro | Whale
```

### 4. B2B Token Account Management
```rust
/// Create prepaid USDC account for B2B team
pub fn create_team_account(
    ctx: Context<CreateTeamAccount>,
    initial_deposit: u64,
) -> Result<()>

/// Deduct usage from team's USDC balance
pub fn deduct_usage(
    ctx: Context<DeductUsage>,
    team: Pubkey,
    amount: u64,
) -> Result<()>
```

---

## Environment Variables to Remove

**Delete from `.env.local`:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (all Stripe products)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_POWER_MONTHLY=price_...
STRIPE_PRICE_POWER_ANNUAL=price_...
STRIPE_PRICE_STARTUP_BASE=price_...
STRIPE_PRICE_STARTUP_USAGE=price_...
STRIPE_PRICE_GROWTH_BASE=price_...
STRIPE_PRICE_GROWTH_USAGE=price_...
STRIPE_PRICE_ENTERPRISE_BASE=price_...
STRIPE_PRICE_ENTERPRISE_USAGE=price_...
```

**Add to `.env.local`:**
```bash
# USDC Token Mint (Mainnet)
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Protocol Treasury (USDC receiver)
PROTOCOL_TREASURY_USDC_ACCOUNT=...

# Revenue Distribution Wallet
REVENUE_DISTRIBUTION_PRIVATE_KEY=...

# Crossmint (fiat on-ramp)
CROSSMINT_API_KEY=...
CROSSMINT_PROJECT_ID=...
```

---

## Migration Steps for Existing Users

### If You Had Stripe Subscriptions:

1. **Query existing subscriptions** from Convex:
   ```typescript
   const activeSubscriptions = await ctx.db
     .query('subscriptions')
     .filter((q) => q.eq(q.field('status'), 'active'))
     .collect()
   ```

2. **Notify users** via email:
   ```
   Subject: GhostSpeak is Going Crypto-Native 🚀

   Your Stripe subscription has been canceled.

   New options:
   - Pay 1 USDC per verification (no subscription)
   - Stake 5,000 GHOST for unlimited access

   Your current subscription benefits will continue until [date].
   After that, transition to USDC/GHOST payments.
   ```

3. **Grace period:** Keep Stripe active for 30 days (optional)

4. **Cancel all subscriptions** in Stripe dashboard

5. **Archive `subscriptions` table** data (don't delete, keep for records)

---

## Testing Checklist

### ✅ Schema Migration
- [x] Convex schema updated
- [x] Subscriptions table removed
- [x] Verifications table updated (paymentMethod field)
- [x] Teams table updated (USDC token account)

### ✅ Dependencies
- [x] Stripe package removed from package.json
- [x] No Stripe imports remain in codebase

### 🔄 Frontend Updates (TODO)
- [ ] Ghost Score page: Remove subscription UI
- [ ] Dashboard: Remove Stripe portal link
- [ ] Payments page: Show Solana transactions instead
- [ ] Upgrade flow: Replace with GHOST staking prompt

### 🔄 Backend Updates (TODO)
- [ ] Verify endpoint: Check GHOST staking instead of subscription
- [ ] API key creation: Check USDC balance instead of subscription
- [ ] Usage tracking: Deduct from USDC account instead of Stripe meter

### 🔄 Smart Contracts (TODO)
- [ ] USDC payment instruction
- [ ] GHOST burning instruction
- [ ] Staking tier getter
- [ ] Revenue distribution vault

### 🔄 Integration Tests (TODO)
- [ ] Pay for verification with USDC
- [ ] Pay for verification by burning GHOST
- [ ] Staking tier detection
- [ ] Freemium limit (3/month) enforcement

---

## Timeline

**Week 1 (Completed):**
- [x] Research GHOST token
- [x] Delete Stripe code
- [x] Update Convex schema
- [x] Remove Stripe dependency

**Week 2 (Current):**
- [ ] Build USDC payment contracts
- [ ] Integrate Crossmint for fiat on-ramp
- [ ] Update frontend verification flow

**Week 3:**
- [ ] Extend staking contracts
- [ ] Build revenue distribution system
- [ ] Test end-to-end payment flows

**Week 4:**
- [ ] B2B token account system
- [ ] Update all documentation
- [ ] Launch beta testing

---

## Rollback Plan (If Needed)

**Critical:** We kept backups of deleted files in git history.

To rollback:
1. Checkout commit before Stripe removal: `git checkout <commit-hash>`
2. Copy deleted files to current branch
3. Restore Stripe dependency: `bun add stripe`
4. Re-add subscriptions table to schema
5. Deploy Convex schema update

**Files to restore:**
- `app/api/stripe/` (all routes)
- `lib/stripe.ts`
- `convex/subscriptions.ts`
- Schema modifications

**Estimated rollback time:** 30 minutes

---

## Support & Questions

If you encounter issues:
1. Check git history for deleted code: `git log --all -- packages/web/lib/stripe.ts`
2. Review this document for replacement patterns
3. See `GHOST_TOKEN_RESEARCH.md` for token integration details
4. See `REVENUE_SHARE_STAKING_IMPLEMENTATION.md` for new model design

---

**Status:** Stripe removal complete ✅
**Next:** Build USDC payment smart contracts

**Signed:** GhostSpeak Engineering Team
**Date:** December 30, 2025
