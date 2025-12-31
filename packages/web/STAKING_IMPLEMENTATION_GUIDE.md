# GHOST Token Staking UI - Implementation Guide

## Overview

Complete GHOST token staking interface for reputation boosts, built using Next.js 15, Convex, and the GhostSpeak SDK.

## Files Created

### 1. Convex Schema & Queries (`/packages/web/convex/`)

**Schema Updates** (`schema.ts`)

- `stakingAccounts` table: Tracks active stakes with tier info
- `stakingEvents` table: Historical staking events (staked/unstaked/slashed)

**Queries & Mutations** (`staking.ts`)

- `getStakingAccount`: Fetch staking data for an agent
- `getStakingLeaderboard`: Top stakers
- `getStakingHistory`: Staking event history
- `getStakingStats`: Platform-wide statistics
- `recordStake`: Record on-chain stake
- `recordUnstake`: Record on-chain unstake
- `recordSlash`: Record slashing event (admin only)

### 2. Staking Components (`/packages/web/components/staking/`)

**Core Components:**

#### `TierBadge.tsx`

- Reusable tier badge with tooltip
- Shows Bronze/Silver/Gold tiers with gradient backgrounds
- Displays tier benefits on hover
- **Usage:**
  ```tsx
  <TierBadge tier={2} showLabel size="md" />
  ```

#### `StakingStatsCard.tsx`

- Displays current staking stats for an agent
- Shows total staked amount, reputation boost, unlock countdown
- Active benefits list
- Stake More / Unstake action buttons
- **Features:**
  - Real-time countdown to unlock
  - Visual tier indicator
  - Empty state for unstaked agents

#### `StakeForm.tsx`

- Form to stake GHOST tokens
- Lock duration selector (30/90/180/365 days)
- Tier preview based on amount
- Balance validation
- **Features:**
  - Max button for quick full stake
  - Visual tier preview
  - Unlock date calculation
  - Warning about lock period

#### `TierProgressCard.tsx`

- Shows progress toward next tier
- Visual progress bar
- All tiers overview with unlock status
- **Features:**
  - Current → Next tier visualization
  - GHOST amount needed display
  - Completion celebration for max tier

#### `BenefitsDisplayCard.tsx`

- Lists all benefits by tier
- Visual unlock indicators (✓ or 🔒)
- Highlights current active tier
- **Features:**
  - Color-coded tier sections
  - Check/lock icons for status
  - "Active" badge for current tier

#### `UnstakeDialog.tsx`

- Confirmation dialog for unstaking
- Shows benefits that will be lost
- Requires explicit confirmation checkbox
- **Features:**
  - Warning about lost benefits
  - Amount display
  - Cancel protection

### 3. Dashboard Page (`/packages/web/app/dashboard/staking/page.tsx`)

**Layout:**

- 3-column layout: Stats | Stake Form | Benefits & Progress
- Agent selector dropdown
- Platform-wide stats cards
- Tabbed interface: Overview | History

**Features:**

- Real-time staking data via Convex
- Staking history timeline
- Platform statistics
- Agent selection for multi-agent wallets

### 4. UI Components Added

**New shadcn/ui components:**

- `checkbox.tsx`: Confirmation checkboxes
- `use-toast.ts`: Toast notification hook

### 5. Navigation Updates

**Sidebar** (`components/dashboard/layout/Sidebar.tsx`)

- Added "Staking" nav item with Coins icon
- Positioned after Ghost Score for logical flow

### 6. Agent Profile Updates (`/packages/web/app/agents/[id]/page.tsx`)

**Added:**

- Tier badge display in header
- Verified badge for Tier 2+
- Premium badge for Tier 3
- Reputation boost indicator (+X% badge)

**Visual Changes:**

- Staking tier shown prominently
- Green boost percentage next to reputation score
- Badge collection shows staking status

## Tier System

### Tier 1: Bronze (1,000 GHOST)

- **Boost:** +5% reputation (500 bps)
- **Benefits:**
  - Priority Support
  - Early Feature Access

### Tier 2: Silver (10,000 GHOST)

- **Boost:** +15% reputation (1500 bps)
- **Benefits:**
  - Verified Badge
  - Featured in Search Results
  - Priority Dispute Resolution

### Tier 3: Gold (100,000 GHOST)

- **Boost:** +15% reputation (1500 bps)
- **Benefits:**
  - All Tier 2 Benefits
  - Premium Agent Listing
  - Custom Profile URL
  - API Rate Limit Increase
  - White Glove Support

## Smart Contract Integration

### Available Instructions (from SDK)

1. **Initialize Staking Config** (Admin Only)

   ```typescript
   import { getInitializeStakingConfigInstructionAsync } from '@ghostspeak/sdk'
   ```

2. **Stake GHOST**

   ```typescript
   import { getStakeGhostInstructionAsync } from '@ghostspeak/sdk'

   const instruction = await getStakeGhostInstructionAsync({
     agent: agentAddress,
     agentTokenAccount: ghostTokenAccount,
     stakingVault: vaultAddress,
     stakingConfig: configAddress,
     agentOwner: wallet,
     amount: BigInt(amountInTokens),
     lockDuration: BigInt(daysToSeconds(lockDays)),
   })
   ```

3. **Unstake GHOST**

   ```typescript
   import { getUnstakeGhostInstructionAsync } from '@ghostspeak/sdk'

   const instruction = await getUnstakeGhostInstructionAsync({
     agent: agentAddress,
     stakingVault: vaultAddress,
     agentTokenAccount: ghostTokenAccount,
     agentOwner: wallet,
   })
   ```

4. **Slash Stake** (Admin Only)
   ```typescript
   import { getSlashStakeInstructionAsync } from '@ghostspeak/sdk'
   ```

## Implementation Status

### ✅ Completed

1. Convex schema for staking accounts and events
2. Convex queries and mutations
3. All UI components (6 components)
4. Staking dashboard page
5. Navigation integration
6. Agent profile integration

### 🚧 TODO: Smart Contract Integration

The UI is complete but needs actual blockchain integration. Update these files:

#### `StakeForm.tsx` (Line ~104)

Replace the placeholder with:

```typescript
const handleStake = async () => {
  if (!isValid) return
  setIsStaking(true)

  try {
    // 1. Get GHOST token account
    const tokenAccount = await getAssociatedTokenAddress(GHOST_MINT_ADDRESS, wallet.publicKey)

    // 2. Create stake instruction
    const lockDurationSeconds = selectedDuration.days * 24 * 60 * 60
    const instruction = await getStakeGhostInstructionAsync({
      agent: agentAddress,
      agentTokenAccount: tokenAccount,
      stakingVault: STAKING_VAULT_ADDRESS,
      stakingConfig: STAKING_CONFIG_ADDRESS,
      agentOwner: wallet,
      amount: BigInt(parseFloat(amount) * 1e9), // Assuming 9 decimals
      lockDuration: BigInt(lockDurationSeconds),
    })

    // 3. Send transaction
    const tx = await sendTransaction([instruction])

    // 4. Wait for confirmation
    await confirmTransaction(tx)

    // 5. Record in Convex
    await convexMutation(api.staking.recordStake, {
      agentAddress,
      amountStaked: parseFloat(amount),
      lockDuration: lockDurationSeconds,
      txSignature: tx,
    })

    toast({ title: 'Staking Successful!', description: `Staked ${amount} GHOST` })
    onSuccess?.()
  } catch (error) {
    console.error('Staking error:', error)
    toast({ title: 'Staking Failed', description: error.message, variant: 'destructive' })
  } finally {
    setIsStaking(false)
  }
}
```

#### `UnstakeDialog.tsx` (Line ~44)

Replace the placeholder with similar blockchain integration for unstaking.

### Required Constants

Create `/packages/web/lib/constants/staking.ts`:

```typescript
export const GHOST_MINT_ADDRESS = 'YOUR_GHOST_TOKEN_MINT'
export const STAKING_VAULT_ADDRESS = 'YOUR_STAKING_VAULT_PDA'
export const STAKING_CONFIG_ADDRESS = 'YOUR_STAKING_CONFIG_PDA'
```

## Design Guidelines

### Color System

- **Bronze Tier:** Amber gradient (`from-amber-700 via-amber-600`)
- **Silver Tier:** Slate gradient (`from-slate-400 via-slate-300`)
- **Gold Tier:** Yellow gradient (`from-yellow-500 via-amber-400`)

### Visual Effects

- Smooth progress bar animations
- Hover scale on tier badges
- Pulsing network status indicator
- Countdown timer updates

### Mobile Responsive

- 3-column layout → 1-column on mobile
- Collapsible sidebar
- Touch-friendly buttons
- Responsive grid for stats

## User Flow

1. **Connect Wallet** → Dashboard
2. **Select Agent** (if multiple)
3. **View Current Stake** (if any)
4. **Choose Stake Amount** → See tier preview
5. **Select Lock Duration** → See unlock date
6. **Confirm Stake** → Wallet approval
7. **Track Progress** → Tier milestones
8. **Wait for Unlock** → Countdown timer
9. **Unstake** → Confirm loss of benefits

## Testing Checklist

- [ ] Agent selector with multiple agents
- [ ] Empty state for unstaked agents
- [ ] Tier badge tooltip displays correctly
- [ ] Progress bar fills accurately
- [ ] Countdown timer updates every minute
- [ ] Unstake button disabled when locked
- [ ] Confirmation checkbox required
- [ ] Toast notifications appear
- [ ] Mobile responsive layout
- [ ] Real-time Convex updates

## API Endpoints

### Convex Functions

- `api.staking.getStakingAccount`
- `api.staking.getStakingHistory`
- `api.staking.getStakingStats`
- `api.staking.getStakingLeaderboard`
- `api.staking.recordStake`
- `api.staking.recordUnstake`
- `api.staking.recordSlash`

## File Paths

```
packages/web/
├── app/
│   ├── dashboard/
│   │   └── staking/
│   │       └── page.tsx ..................... Staking Dashboard
│   └── agents/
│       └── [id]/
│           └── page.tsx ..................... Updated with staking badges
├── components/
│   ├── staking/
│   │   ├── TierBadge.tsx .................... Tier badge component
│   │   ├── StakingStatsCard.tsx ............. Current stake stats
│   │   ├── StakeForm.tsx .................... Staking form
│   │   ├── TierProgressCard.tsx ............. Progress visualization
│   │   ├── BenefitsDisplayCard.tsx .......... Benefits by tier
│   │   ├── UnstakeDialog.tsx ................ Unstake confirmation
│   │   └── index.ts ......................... Barrel export
│   ├── ui/
│   │   ├── checkbox.tsx ..................... New
│   │   └── use-toast.ts ..................... New
│   └── dashboard/
│       └── layout/
│           └── Sidebar.tsx .................. Updated navigation
└── convex/
    ├── schema.ts ............................ Updated with staking tables
    └── staking.ts ........................... New queries/mutations
```

## Next Steps

1. **Implement Smart Contract Integration**
   - Add transaction sending logic
   - Handle wallet connection
   - Add confirmation waiting

2. **Add GHOST Balance Fetching**
   - Query token account
   - Display real balance
   - Handle multiple token accounts

3. **Implement Leaderboard Page** (Optional)
   - Use `getStakingLeaderboard` query
   - Show top stakers
   - Gamification elements

4. **Add Notifications** (Optional)
   - Unlock date approaching
   - New tier unlocked
   - Stake expiring soon

5. **Testing**
   - Unit tests for tier calculations
   - Integration tests for staking flow
   - E2E tests with Playwright

## Support

For questions or issues:

- Check SDK documentation: `/packages/sdk-typescript/src/generated/instructions/`
- Review smart contract code: `/programs/src/instructions/`
- Consult Convex schema: `/packages/web/convex/schema.ts`

---

**Built with:**

- Next.js 15 (App Router)
- Convex (Real-time database)
- shadcn/ui (UI components)
- @ghostspeak/sdk (Smart contract interactions)
- Tailwind CSS (Styling)
- Lucide Icons (Icons)
