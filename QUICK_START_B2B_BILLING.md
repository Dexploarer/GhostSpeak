# Quick Start: B2B Prepaid Billing

**TL;DR:** Teams prepay USDC → API usage deducts in real-time → Overage fees → GHOST stakers.

---

## For Developers (Using the API)

### 1. Get an API Key

```bash
# Dashboard → API Keys → Create New Key
# Copy: gs_live_abc123...
```

### 2. Create Billing Account

```typescript
import { program, wallet } from './setup'
import { USDC_MINT } from '@solana/spl-token'

// Create team billing account
const [teamAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from('team_billing'), wallet.publicKey.toBuffer()],
  program.programId
)

const [teamUsdcAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from('team_usdc'), wallet.publicKey.toBuffer()],
  program.programId
)

await program.methods
  .createTeamAccount({ startup: {} }) // or growth, enterprise
  .accounts({
    owner: wallet.publicKey,
    teamAccount,
    usdcMint: USDC_MINT,
    usdcTokenAccount: teamUsdcAccount,
  })
  .rpc()

console.log('Team USDC Account:', teamUsdcAccount.toString())
```

### 3. Deposit USDC

```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token'

const userUsdcAccount = await getAssociatedTokenAddress(
  USDC_MINT,
  wallet.publicKey
)

await program.methods
  .depositFunds(new BN(100_000_000)) // 100 USDC
  .accounts({
    depositor: wallet.publicKey,
    teamAccount,
    depositorUsdcAccount: userUsdcAccount,
    teamUsdcAccount,
  })
  .rpc()

console.log('Deposited 100 USDC!')
```

### 4. Make API Calls

```bash
curl -X POST https://api.ghostspeak.ai/v1/verify \
  -H "X-API-Key: gs_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "AgentPubkeyHere..."}'
```

**Response:**
```json
{
  "verified": true,
  "ghostScore": 7500,
  "tier": "GOLD",
  "billing": {
    "cost": 0.01,
    "note": "Overage charge applied"
  }
}
```

### 5. Check Balance

```bash
curl https://api.ghostspeak.ai/v1/billing/balance \
  -H "X-API-Key: gs_live_abc123..."
```

**Response:**
```json
{
  "balance": {
    "usdc": 98.50,
    "formatted": "$98.50"
  },
  "projection": {
    "daysRemaining": 45,
    "needsRefill": false
  },
  "alerts": {
    "lowBalance": false
  }
}
```

---

## For Backend Engineers (Protecting Routes)

### Wrap Your Handler with Billing

```typescript
// /app/api/v1/your-endpoint/route.ts
import { withBilling } from '@/middleware/api-billing'
import { NextRequest, NextResponse } from 'next/server'

async function handleRequest(
  req: NextRequest,
  billingContext: { teamId: string; cost: number }
) {
  // Your logic here
  const result = await processData(req)

  return NextResponse.json({
    success: true,
    result,
    billing: {
      cost: billingContext.cost,
      teamId: billingContext.teamId,
    }
  })
}

// Middleware automatically:
// 1. Checks balance
// 2. Returns 402 if insufficient
// 3. Deducts after success
export const POST = withBilling(handleRequest, 'POST /v1/your-endpoint', 1)
```

### Batch Requests

```typescript
// Charge for 100 requests at once
export const POST = withBilling(handleBatch, 'POST /v1/batch', 100)
```

---

## For Frontend Developers (Dashboard)

### Display Balance

```tsx
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function BalanceWidget({ teamId }) {
  const billing = useQuery(api.teamBilling.getTeamBilling, { teamId })

  if (!billing) return <Skeleton />

  const balanceUsdc = (billing.team.currentBalance || 0) / 1_000_000

  return (
    <Card>
      <CardHeader>Current Balance</CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">
          ${balanceUsdc.toFixed(2)}
        </div>
        {balanceUsdc < 10 && (
          <Alert variant="destructive">
            Low balance! Please refill.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
```

### Deposit Form

```tsx
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation } from 'convex/react'

export function DepositForm({ teamId }) {
  const { publicKey, signTransaction } = useWallet()
  const [amount, setAmount] = useState('')
  const updateBalance = useMutation(api.teamBilling.updateBalance)

  async function handleDeposit() {
    // 1. Create transfer transaction
    const tx = await createUsdcTransfer(amount)

    // 2. Sign with wallet
    const signed = await signTransaction(tx)

    // 3. Send to blockchain
    const signature = await sendTransaction(signed)

    // 4. Update Convex
    await updateBalance({
      teamId,
      newBalanceMicroUsdc: newBalance * 1_000_000,
      depositAmount: amount * 1_000_000,
      transactionSignature: signature,
    })

    toast.success('Deposited ' + amount + ' USDC!')
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USDC)"
      />
      <Button onClick={handleDeposit}>
        Add Funds
      </Button>
    </div>
  )
}
```

---

## Pricing Tiers

| Tier | Monthly Quota | Overage Fee | Who It's For |
|------|---------------|-------------|--------------|
| **Startup** | 10,000 | $0.01/req | Small projects |
| **Growth** | 100,000 | $0.005/req | Growing apps |
| **Enterprise** | 500,000 | $0.002/req | Large scale |

**Example Cost:**
- Startup tier: 12,000 requests/month
- First 10,000: Free (within quota)
- Next 2,000: 2,000 × $0.01 = **$20 overage**
- **Total: $20** (no base fee, prepaid model)

---

## Error Codes

| Code | Status | Meaning | Solution |
|------|--------|---------|----------|
| `PAYMENT_REQUIRED` | 402 | Balance < cost | Deposit more USDC |
| `UNAUTHORIZED` | 401 | Invalid API key | Check API key |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Slow down |

---

## Key Concepts

### 1. Prepaid Model
No monthly billing. Deposit USDC once, use until depleted.

### 2. Overage Pricing
First N requests free (quota), then pay per request.

### 3. Real-Time Deduction
Balance checked **before** request, deducted **after** success.

### 4. Low Balance Alert
Alert at $10, critical at $5. No surprise shutdowns.

### 5. On-Chain Balance
USDC stored in Solana token account (PDA). Transparent, verifiable.

---

## Common Tasks

### Check Balance

```bash
# CLI
ghostspeak billing balance --api-key gs_live_abc123

# API
curl https://api.ghostspeak.ai/v1/billing/balance \
  -H "X-API-Key: gs_live_abc123"

# Dashboard
https://ghostspeak.ai/dashboard/billing
```

### Deposit Funds

```bash
# CLI
ghostspeak billing deposit 100 --api-key gs_live_abc123

# Dashboard
Dashboard → Billing → Add Funds → Enter amount → Sign with wallet
```

### View Usage

```bash
# Dashboard
Dashboard → Billing → Analytics → Last 30 Days

# API
curl https://api.ghostspeak.ai/v1/billing/usage \
  -H "X-API-Key: gs_live_abc123"
```

### Withdraw Unused

```typescript
await program.methods
  .withdrawUnused(new BN(50_000_000)) // 50 USDC
  .accounts({
    owner: wallet.publicKey,
    teamAccount,
    teamUsdcAccount,
    recipientUsdcAccount,
  })
  .rpc()
```

---

## Monitoring

### Dashboard Widgets

1. **Current Balance** - Real-time USDC amount
2. **Days Remaining** - At current burn rate
3. **Monthly Cost** - Total spent this month
4. **Top Endpoints** - Which APIs cost most
5. **Daily Chart** - Request volume over time

### Alerts

- **Email:** Low balance notification
- **Dashboard:** Banner when < $10
- **Webhook:** POST to your URL on low balance

---

## FAQ

**Q: What happens if my balance runs out?**
A: API returns 402 Payment Required. No service interruption for in-flight requests.

**Q: Can I get a refund?**
A: Yes, use `withdraw_unused()` to get remaining balance back.

**Q: How often is balance checked?**
A: Every API request. Real-time RPC call to Solana.

**Q: What if I make 1 million requests in a day?**
A: Overage fees apply. Startup tier: 990,000 × $0.01 = $9,900.

**Q: Can multiple team members share one account?**
A: Yes! All team members can use the same API key and USDC account.

**Q: Where do overage fees go?**
A: **100% to GHOST token stakers.** Transparent revenue-share.

---

## Support

- **Docs:** https://docs.ghostspeak.ai/b2b-billing
- **Discord:** https://discord.gg/ghostspeak
- **Email:** support@ghostspeak.ai
- **Status:** https://status.ghostspeak.ai

---

**Need help? Join our Discord!**
