# GHOST Token Configuration

## Token Details
- **Token Address:** `DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump`
- **Decimals:** 9
- **Network:** Solana Mainnet

## Staking Tier Thresholds (With 9 Decimals)

### For Smart Contract (Rust)
```rust
// Token amounts in smallest unit (with 9 decimals)
const TIER_NONE: u64 = 0;
const TIER_BASIC: u64 = 1_000_000_000_000;     // 1,000 GHOST
const TIER_VERIFIED: u64 = 5_000_000_000_000;  // 5,000 GHOST
const TIER_PRO: u64 = 50_000_000_000_000;      // 50,000 GHOST
const TIER_WHALE: u64 = 500_000_000_000_000;   // 500,000 GHOST
```

### For Frontend (TypeScript)
```typescript
// Token amounts in smallest unit (with 9 decimals)
export const GHOST_DECIMALS = 9;
export const ONE_GHOST = BigInt(10 ** GHOST_DECIMALS);

export const TIER_THRESHOLDS = {
  NONE: BigInt(0),
  BASIC: ONE_GHOST * 1_000n,        // 1,000 GHOST
  VERIFIED: ONE_GHOST * 5_000n,     // 5,000 GHOST
  PRO: ONE_GHOST * 50_000n,         // 50,000 GHOST
  WHALE: ONE_GHOST * 500_000n,      // 500,000 GHOST
} as const;

// Human-readable amounts
export const TIER_AMOUNTS_DISPLAY = {
  NONE: '0',
  BASIC: '1,000',
  VERIFIED: '5,000',
  PRO: '50,000',
  WHALE: '500,000',
} as const;

// Convert UI input to token amount
export function ghostToLamports(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** GHOST_DECIMALS));
}

// Convert token amount to UI display
export function lamportsToGhost(lamports: bigint): number {
  return Number(lamports) / 10 ** GHOST_DECIMALS;
}
```

## Tier Benefits

| Tier | Min Stake | Revenue Share | Verifications | API Access | API Limit |
|------|-----------|---------------|---------------|------------|-----------|
| None | 0 | 0x | Pay (1 USDC or 75 GHOST) | ❌ | 0 |
| Basic | 1,000 GHOST | 1.0x | Pay (1 USDC or 75 GHOST) | ❌ | 0 |
| Verified | 5,000 GHOST | 1.5x | ✅ Unlimited | ❌ | 0 |
| Pro | 50,000 GHOST | 2.0x | ✅ Unlimited | ✅ | 100K req/month |
| Whale | 500,000 GHOST | 3.0x | ✅ Unlimited | ✅ | Unlimited |

## Revenue Share Multipliers

| Tier | Multiplier (float) | Multiplier (stored as u16) |
|------|-------------------|---------------------------|
| None | 0.0 | 0 |
| Basic | 1.0 | 100 |
| Verified | 1.5 | 150 |
| Pro | 2.0 | 200 |
| Whale | 3.0 | 300 |

**Note:** On-chain, multipliers are stored as `u16` (integer) where 100 = 1.0x to avoid floating-point precision issues.

## Payment Options

### B2C (Pay-Per-Check)
1. **USDC**: 1 USDC per verification
2. **Credit Card**: $1.03 via Crossmint (includes 3% processing fee)
3. **GHOST Burn**: 75 GHOST burned per verification (25% discount)

### B2B (API Access)
| Plan | Monthly Cost | GHOST Stake Alternative | Requests Included | Overage |
|------|-------------|------------------------|------------------|---------|
| Starter | 50 USDC/month | 10,000 GHOST | 10K | 0.01 USDC/req |
| Growth | 250 USDC/month | 50,000 GHOST (Pro tier) | 100K | 0.005 USDC/req |
| Scale | 1,000 USDC/month | 200,000 GHOST | 500K | 0.002 USDC/req |
| Enterprise | Custom | 500,000+ GHOST (Whale tier) | Custom | Negotiable |

**Staking Advantage:** Instead of paying monthly USDC, stake GHOST to get:
- Same access tier
- Revenue-share from protocol fees
- Unlock stake anytime (after minimum lock period)

## Example Calculations

### Example 1: Verified Tier User
```typescript
Stake: 10,000 GHOST
Tier: Verified
Revenue Multiplier: 1.5x
Benefits:
  - Unlimited agent verifications
  - 1.5x share of protocol revenue
  - Verified badge on profile

Monthly Revenue Share Calculation:
  Protocol Revenue: $50,000/month
  Staker Pool (10%): $5,000
  Your Weighted Stake: 10,000 × 1.5 = 15,000
  Total Weighted Stake: 5,000,000 (example)
  Your Share: (15,000 / 5,000,000) × $5,000 = $15 USDC/month
```

### Example 2: Pro Tier User
```typescript
Stake: 50,000 GHOST
Tier: Pro
Revenue Multiplier: 2.0x
Benefits:
  - Unlimited agent verifications
  - API access (100K requests/month)
  - 2.0x share of protocol revenue
  - Verified badge + Pro badge

Monthly Value:
  Verification savings: ~$100 (if used 100 times)
  API access value: $250 (equivalent to Growth plan)
  Revenue share: ~$30 USDC/month (based on protocol revenue)
  Total monthly benefit: ~$380
```

## Frontend Display Examples

### Tier Badge Component
```tsx
function TierBadge({ tier }: { tier: AccessTier }) {
  const badges = {
    None: { label: 'Free', color: 'gray' },
    Basic: { label: 'Basic', color: 'blue' },
    Verified: { label: 'Verified', color: 'green' },
    Pro: { label: 'Pro', color: 'purple' },
    Whale: { label: 'Whale', color: 'gold' },
  };

  const { label, color } = badges[tier];

  return (
    <span className={`badge badge-${color}`}>
      {tier === 'Verified' && '✓ '}
      {tier === 'Pro' && '⭐ '}
      {tier === 'Whale' && '👑 '}
      {label}
    </span>
  );
}
```

### Staking Calculator
```tsx
function StakingCalculator() {
  const [amount, setAmount] = useState(0);
  const tier = calculateTierForAmount(ghostToLamports(amount));

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Enter GHOST amount"
      />
      <div>Tier: <TierBadge tier={tier} /></div>
      <div>Revenue Multiplier: {getMultiplierForTier(tier) / 100}x</div>
    </div>
  );
}
```

## Migration Notes

### Old Accounts (Pre-Tier System)
```typescript
// Detect old account
if (stakingAccount.tier === null && stakingAccount.amountStaked > 0) {
  // Show migration prompt
  showMigrationBanner({
    message: 'Upgrade your staking account to unlock revenue-share benefits',
    action: () => migrateStakingAccount()
  });
}
```

### New Accounts (Post-Tier System)
```typescript
// New accounts automatically get tier assigned when staking
const tx = await program.methods
  .stakeGhost(
    new anchor.BN(amount),
    new anchor.BN(lockDuration)
  )
  .accounts({
    stakingAccount,
    agent,
    agentTokenAccount,
    stakingVault,
    stakingConfig,
    agentOwner: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Tier is automatically calculated and assigned
```

## API Usage Tracking (For Pro Tier)

### Track Monthly Usage
```typescript
interface ApiUsage {
  month: string; // YYYY-MM
  requestCount: number;
  limit: number | null; // null = unlimited (Whale)
  tier: AccessTier;
}

// Check if request is allowed
function canMakeApiRequest(usage: ApiUsage): boolean {
  if (usage.tier === 'Whale') return true; // Unlimited
  if (usage.tier === 'Pro') return usage.requestCount < 100_000;
  return false; // No API access
}
```

## Revenue Distribution Formula

```typescript
// Weighted stake calculation
function calculateWeightedStake(stakeAmount: bigint, tier: AccessTier): number {
  const baseStake = Number(stakeAmount) / 10 ** GHOST_DECIMALS;
  const multiplier = getMultiplierForTier(tier) / 100;
  return baseStake * multiplier;
}

// User's share calculation
function calculateUserShare(
  userWeightedStake: number,
  totalWeightedStake: number,
  revenuePoolAmount: number
): number {
  return (userWeightedStake / totalWeightedStake) * revenuePoolAmount;
}

// APY calculation (variable based on protocol revenue)
function calculateAPY(
  monthlyRewards: number,
  stakeValue: number
): number {
  const annualRewards = monthlyRewards * 12;
  return (annualRewards / stakeValue) * 100;
}
```

---

**Last Updated:** December 30, 2025
**Token Contract:** DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
