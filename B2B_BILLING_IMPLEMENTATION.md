# B2B Prepaid USDC Billing System - Implementation Summary

**Date:** December 30, 2025
**Status:** Complete - Ready for Testing

---

## Overview

Implemented a comprehensive prepaid USDC billing system for B2B API usage on GhostSpeak. Teams deposit USDC to dedicated token accounts, and API usage deducts in real-time based on tier and overage rates.

---

## Files Created

### 1. Smart Contract (Rust)

#### `/programs/src/state/b2b_billing.rs`
- **TeamBillingAccount**: PDA storing team billing config
- **SubscriptionTier**: Enum with Startup/Growth/Enterprise pricing
- **UsageRecord**: On-chain deduction log
- **Events**: TeamAccountCreated, FundsDeposited, UsageDeducted, LowBalanceAlert, FundsWithdrawn

#### `/programs/src/instructions/b2b_billing.rs`
**Instructions:**
- `create_team_account(tier)` - Initialize team's USDC token account PDA
- `deposit_funds(amount)` - Transfer USDC from user to team account
- `deduct_usage(endpoint, request_count)` - Real-time deduction per API call
- `withdraw_unused(amount)` - Team withdraws remaining balance
- `update_tier(new_tier)` - Admin changes subscription tier

**PDA Seeds:**
```rust
["team_billing", owner_pubkey] → TeamBillingAccount
["team_usdc", owner_pubkey] → USDC Token Account
["usage", team_account, timestamp] → UsageRecord
```

---

### 2. Backend Middleware

#### `/packages/web/middleware/api-billing.ts`
**Functions:**
- `apiBillingMiddleware(req, endpoint, requestCount)` - Check balance before request
- `withBilling(handler, endpoint, requestCount)` - Next.js route wrapper

**Logic:**
1. Extract API key from header
2. Query Convex for team
3. Fetch on-chain USDC balance via RPC
4. Calculate cost based on tier + overage
5. Return `{ allowed: boolean, cost: number, deduct: () => Promise<void> }`
6. Call `deduct()` after successful response

**Usage:**
```ts
export const POST = withBilling(handleVerify, 'POST /v1/verify', 1)
```

---

### 3. Convex Functions

#### `/packages/web/convex/teamBillingEnhanced.ts`
**Queries:**
- `getTeamByApiKey(apiKey)` - Lookup team for middleware
- `getTeamAnalytics(teamId, days)` - Daily usage/cost aggregation
- `getEndpointBreakdown(teamId, days)` - Cost by endpoint

**Mutations:**
- `incrementUsage(teamId, requestCount)` - Track usage counter
- `setUsdcTokenAccount(teamId, account)` - Link on-chain account
- `syncBalanceFromChain(teamId, balance)` - Cron sync (internal)

---

### 4. Frontend Dashboard

#### `/packages/web/app/dashboard/billing/page.tsx`
**Components:**
- Current balance card with deposit UI
- Usage stats (total requests, cost, avg daily)
- Endpoint breakdown (which APIs cost most)
- Daily charts (requests & cost over 30 days)
- Billing history table
- Low balance alerts

**Features:**
- Real-time on-chain balance checks
- USDC deposit via Solana wallet
- Recharts visualizations
- Automatic refill alerts at $10 threshold

---

### 5. API Routes

#### `/packages/web/app/api/v1/verify/route.ts`
Example protected route with billing middleware.

#### `/packages/web/app/api/v1/billing/balance/route.ts`
Returns balance, projection, and alerts for API clients.

---

## Pricing Model

### Tiers

| Tier | Monthly Fee | Quota | Overage Fee |
|------|-------------|-------|-------------|
| **Startup** | 50 USDC | 10K requests | 0.01 USDC/req |
| **Growth** | 250 USDC | 100K requests | 0.005 USDC/req |
| **Enterprise** | 1,000 USDC | 500K requests | 0.002 USDC/req |

### Overage Calculation

```typescript
const currentUsage = 12000 // requests this month
const tier = 'startup'
const quota = 10000

const overage = Math.max(0, currentUsage - quota) // 2000
const cost = overage * 0.01 // 20 USDC
```

### Revenue Distribution

- **Base fees**: 90% treasury, 10% staker pool
- **Overage fees**: **100% to staker pool** (high margin)

---

## PDAs Used

1. **TeamBillingAccount**
   - Seeds: `["team_billing", owner.key()]`
   - Stores: tier, quota, usage, thresholds

2. **USDC Token Account**
   - Seeds: `["team_usdc", owner.key()]`
   - Owned by TeamBillingAccount (PDA authority)
   - Receives deposits, pays deductions

3. **UsageRecord**
   - Seeds: `["usage", team_account.key(), timestamp]`
   - Logs: endpoint, request_count, amount_deducted

---

## Billing Flow

### 1. Setup (One-time)

```ts
// User creates team account on-chain
await program.methods
  .createTeamAccount({ startup: {} })
  .accounts({
    owner: wallet.publicKey,
    teamAccount,
    usdcMint: USDC_MINT,
    usdcTokenAccount: teamUsdcAccount,
  })
  .rpc()

// Link to Convex
await convex.mutation(api.teamBillingEnhanced.setUsdcTokenAccount, {
  teamId: 'convex-team-id',
  usdcTokenAccount: teamUsdcAccount.toString(),
})
```

### 2. Deposit

```ts
// User transfers USDC to team account
await program.methods
  .depositFunds(new BN(100_000_000)) // 100 USDC
  .accounts({
    depositor: wallet.publicKey,
    teamAccount,
    depositorUsdcAccount,
    teamUsdcAccount,
  })
  .rpc()
```

### 3. API Request

```ts
// Backend middleware checks balance
const billingCheck = await apiBillingMiddleware(req, '/v1/verify', 1)

if (!billingCheck.allowed) {
  return new Response(JSON.stringify({ error: billingCheck.error }), {
    status: 402, // Payment Required
  })
}

// Process request...
const response = await handleRequest(req)

// Deduct after success
if (response.ok) {
  await billingCheck.deduct()
}
```

### 4. Deduction (Automatic)

```ts
// If overage, deduct on-chain
await program.methods
  .deductUsage('POST /v1/verify', new BN(1))
  .accounts({
    teamAccount,
    teamUsdcAccount,
    treasury,
    usageRecord,
  })
  .rpc()

// Events emitted:
// - UsageDeducted { amount_deducted: 10000 } (0.01 USDC)
// - LowBalanceAlert (if balance < 10 USDC)
```

### 5. Low Balance Alert

When balance drops below threshold:
```ts
// Smart contract emits event
emit!(LowBalanceAlert {
  team_account,
  current_balance: 8_000_000, // 8 USDC
  threshold: 10_000_000,
  owner,
  timestamp,
})

// Frontend shows banner
<Alert variant="destructive">
  Low balance: $8.00. Please refill.
</Alert>
```

---

## Testing Strategy

### Unit Tests (Rust)

```bash
# Test smart contract instructions
cargo test-sbf -- --nocapture

# Tests:
# - create_team_account: PDA derivation, init values
# - deposit_funds: transfer, balance update
# - deduct_usage: overage calculation, insufficient funds
# - withdraw_unused: authorization, balance check
# - update_tier: quota recalculation
```

### Integration Tests (TypeScript)

```bash
# Test middleware + Convex
bun test packages/web/middleware/api-billing.test.ts

# Tests:
# - Balance check with valid API key
# - 402 error on insufficient balance
# - Deduction after successful request
# - Low balance alert trigger
```

### E2E Test Flow

1. Create team account (Startup tier)
2. Deposit 100 USDC
3. Make 10,000 requests (within quota, no cost)
4. Make 1,000 more requests (overage: 10 USDC deducted)
5. Balance drops to 90 USDC
6. Continue until balance < 10 USDC
7. Verify LowBalanceAlert event emitted
8. Verify 402 error on next request if balance < overage cost

---

## Middleware Integration

### Protect API Routes

```ts
// /app/api/v1/agents/[address]/score/route.ts
import { withBilling } from '@/middleware/api-billing'

async function handleGetScore(
  req: NextRequest,
  billingContext: { teamId: string; cost: number }
) {
  const { address } = req.params
  const score = await fetchGhostScore(address)

  return NextResponse.json({
    score,
    billing: {
      teamId: billingContext.teamId,
      cost: billingContext.cost,
    },
  })
}

export const GET = withBilling(handleGetScore, 'GET /v1/agents/:address/score', 1)
```

### Batch Requests

```ts
// Charge for multiple requests
export const POST = withBilling(handleBatchVerify, 'POST /v1/batch/verify', 100)
```

---

## Dashboard Components

### Balance Display
- Real-time USDC balance from on-chain
- Deposit form with Solana wallet integration
- Low balance banner (orange < $10, red < $5)

### Usage Charts
- Daily request volume (area chart)
- Daily cost (bar chart)
- Endpoint breakdown (table with cost/request)

### Billing History
- Scrollable list of deductions
- Date, endpoint, requests, cost
- Export to CSV button

### Projections
- Days remaining at current burn rate
- Projected balance in 30 days
- Refill recommendation

---

## Deployment Checklist

- [ ] Deploy Rust program to Solana mainnet
- [ ] Update `USDC_MINT` to mainnet address
- [ ] Configure `RPC_URL` for production
- [ ] Set up Convex cron job for balance sync
- [ ] Add webhook for low balance alerts (email)
- [ ] Create admin dashboard for tier management
- [ ] Document API endpoints for customers
- [ ] Set up monitoring for 402 errors
- [ ] Configure rate limiting per tier

---

## Next Steps

1. **Test on Devnet**
   - Deploy program
   - Create test team
   - Run full deposit → usage → alert flow

2. **Add Features**
   - Monthly auto-billing (deduct base fee)
   - Refund unused funds at end of month
   - Volume discounts for high usage
   - Team member invites sharing account

3. **Monitoring**
   - Track 402 errors (insufficient balance)
   - Alert on stuck deductions
   - Dashboard for admin revenue tracking

4. **Legal**
   - Terms of service for B2B billing
   - Refund policy
   - Service level agreements (SLA)

---

## Summary

**What we built:**
- ✅ Prepaid USDC billing with on-chain token accounts
- ✅ Real-time balance checks before API requests
- ✅ Automatic deductions with overage pricing
- ✅ Low balance alerts at $10 threshold
- ✅ Dashboard with charts and deposit UI
- ✅ Middleware for protecting API routes
- ✅ 100% of overage fees to GHOST stakers

**Key metrics:**
- Startup: 50 USDC/month, 10K quota, 0.01 USDC overage
- Growth: 250 USDC/month, 100K quota, 0.005 USDC overage
- Enterprise: 1,000 USDC/month, 500K quota, 0.002 USDC overage

**Revenue model:**
- Base fees: 90% treasury, 10% stakers
- Overage fees: **100% to stakers** (transparent revenue-share)

---

**Status:** Ready for devnet testing 🚀
