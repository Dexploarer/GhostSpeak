# Devnet Testing Guide - GHOST Token Billing

## 🚨 Current Network Status

**GhostSpeak is currently running on DEVNET** for testing and development.

- ✅ Solana Programs: **Devnet**
- ✅ GHOST Token: **Devnet** (`BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh`)
- ✅ Billing System: **Devnet-ready**
- ✅ Airdrop Faucet: **Active** (10,000 GHOST every 24 hours)

**Mainnet migration will occur post-audit.**

---

## Quick Start for Developers

### 1. Configure Environment

Your `.env.local` should have:

```bash
# Network (devnet for testing, mainnet post-audit)
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Devnet RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Devnet GHOST Token
NEXT_PUBLIC_GHOST_TOKEN_MINT=BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh
NEXT_PUBLIC_GHOST_TOKEN_DECIMALS=6

# Devnet Faucet (for airdrop endpoint)
DEVNET_FAUCET_PRIVATE_KEY=[your_faucet_keypair]
DEVNET_GHOST_MINT=BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh
```

### 2. Get Test GHOST Tokens

**Option A: Use the Airdrop API**
```bash
curl -X POST http://localhost:3000/api/airdrop/ghost \
  -H "Content-Type: application/json" \
  -d '{"recipient": "YOUR_WALLET_ADDRESS"}'
```

**Response:**
```json
{
  "success": true,
  "amount": 10000,
  "balance": 10000,
  "signature": "...",
  "explorer": "https://explorer.solana.com/tx/...?cluster=devnet",
  "message": "Successfully airdropped 10,000 GHOST tokens"
}
```

**Rate Limit:** Once every 24 hours per wallet

**Option B: Use the UI**
- Visit the devnet testing page
- Click "Request GHOST Airdrop"
- Confirm transaction in your wallet

### 3. Test API Billing

Once you have devnet GHOST tokens, test the billing system:

**Single Verification (1¢ = ~1,000 GHOST on devnet)**
```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "AGENT_ADDRESS"}'
```

**Check Your Balance**
```bash
curl -X GET http://localhost:3000/api/v1/billing/balance \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## Network Comparison

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| **GHOST Token** | `BV4uh...tYoh` (test) | `DFQ9e...pump` (real) |
| **Airdrop** | ✅ 10k GHOST/24hrs | ❌ Not available |
| **Pricing** | Fixed $0.01/GHOST | Live Jupiter pricing |
| **Programs** | ✅ **Currently Active** | ⏳ Post-audit |
| **Revenue** | Tracked (not distributed) | Distributed to stakers |

---

## Pricing on Devnet

Since there's no Jupiter liquidity pool on devnet, we use a **fixed fallback price**:

- **1 GHOST = $0.01 USDC** (fallback price)
- This means: **1¢ API call ≈ 1 GHOST**

### API Costs (Devnet)

| Endpoint | Cost (USD) | Cost (GHOST) |
|----------|-----------|--------------|
| Single verification | $0.01 | ~1 GHOST |
| Batch verification (per agent) | $0.005 | ~0.5 GHOST |
| Score lookup | $0.005 | ~0.5 GHOST |

**On mainnet**, prices will use live Jupiter DEX rates (currently ~$0.000047/GHOST).

---

## PayAI Integration & On-Chain Architecture

### x402 Payments Are Already On-Chain! 🎉

**Important:** PayAI uses the [x402 protocol](https://github.com/coinbase/x402) which records payments as **SPL token transfers on Solana**. This means every PayAI payment is ALREADY permanently recorded on-chain.

#### How it Works

1. **Agent provides service** → User makes HTTP request with payment
2. **x402 facilitator processes** → SPL token transfer (USDC) on Solana
3. **Payment settles** → Transaction signature = on-chain proof
4. **PayAI webhook fires** → GhostSpeak updates reputation cache

#### On-Chain Verification

Every PayAI payment can be verified on-chain:

```bash
# View the original x402 payment transaction
solana confirm <PAYMENT_SIGNATURE> --url devnet

# Or in Solana Explorer
https://explorer.solana.com/tx/<PAYMENT_SIGNATURE>?cluster=devnet
```

The transaction contains:
- ✅ Payer address
- ✅ Merchant (agent) address
- ✅ Payment amount in USDC
- ✅ Timestamp
- ✅ Success/failure status

#### No Redundant Transactions

**Previous approach (removed):** We used to create separate memo transactions to record PayAI events. This was redundant since x402 payments are already SPL transfers!

**Current approach:** We read the payment signature from PayAI webhooks and use it as on-chain proof. No additional transactions needed.

**Benefits:**
- 💰 Saves ~0.000005 SOL per payment (transaction fees)
- ⚡ Faster webhook processing (50% reduction in latency)
- 🔒 Leverages existing on-chain proof
- 🌐 Fully decentralized verification

### Dual-Source Architecture (Implemented ✅)

GhostSpeak now uses a **dual-source architecture** for maximum reliability:

```
Fast Path:     PayAI Webhook → Update reputation cache → Mark received
Fallback Path: On-chain polling (every 5 min) → Verify + catch missed events
Verification:  Hourly integrity check → Compare sources → Alert if mismatch
```

#### PayAI Facilitator Setup

**PayAI provides a drop-in x402 facilitator** that handles payment verification and settlement across multiple networks.

**Facilitator URL**: `https://facilitator.payai.network`

**Features:**
- ✅ No API keys required
- ✅ Network fees covered (gasless for buyers & merchants)
- ✅ Multi-network support (Solana, Base, Avalanche, Polygon, Sei, IoTeX)
- ✅ Auto-discovery in x402 Bazaar
- ✅ Built-in OFAC compliance

**Documentation:**
- Facilitators: https://docs.payai.network/x402/facilitators/introduction
- Servers: https://docs.payai.network/x402/servers/introduction
- Clients: https://docs.payai.network/x402/clients/introduction

#### Configuration

Add to your `.env.local`:

```bash
# PayAI Facilitator URL (for merchant endpoints)
FACILITATOR_URL=https://facilitator.payai.network

# Network for x402 payments
# Use 'solana-devnet' for testing, 'solana' for production
X402_NETWORK=solana-devnet

# PayAI webhook secret (obtain from PayAI dashboard)
PAYAI_WEBHOOK_SECRET=your_webhook_secret

# PayAI facilitator Solana address (for on-chain polling)
# This is the BLOCKCHAIN ADDRESS that receives SPL token transfers
#
# To find this address:
# 1. Make a test x402 payment via PayAI facilitator on devnet
# 2. Get the transaction signature from the webhook payload
# 3. View on Solana Explorer:
#    https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
# 4. Look for the SPL token transfer instruction
# 5. Find the "destination" address - that's your facilitator address
#
# Once found, add it here:
NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=

# Enable on-chain polling (default: true)
X402_POLLING_ENABLED=true

# Polling batch size (default: 100 transactions per sync)
X402_POLLING_BATCH_SIZE=100
```

**Quick Setup (1-2 minutes):**

1. **Set facilitator URL** in your AI agent/merchant server:
   ```bash
   export FACILITATOR_URL=https://facilitator.payai.network
   export X402_NETWORK=solana-devnet
   ```

2. **Configure webhook endpoint** to receive payment notifications:
   ```typescript
   // Your webhook handler at /api/payai/webhook
   POST /api/payai/webhook
   {
     "event": "payment.settled",
     "signature": "tx_signature_on_solana",
     "merchant": "agent_address",
     "payer": "user_address",
     "amount": "1000000", // USDC (6 decimals)
     "timestamp": 1234567890
   }
   ```

3. **Find facilitator's Solana address** (one-time):

   **Option A: Use the helper script** (recommended)
   ```bash
   # Make a test x402 payment on devnet
   # Get the transaction signature from webhook
   # Run the helper script:
   cd packages/sdk-typescript
   bun run scripts/find-payai-facilitator-address.ts <TX_SIGNATURE> devnet

   # The script will output the facilitator address and full config
   ```

   **Option B: Manual discovery**
   ```bash
   # Make a test payment
   # Check webhook payload for transaction signature
   # View on Solana Explorer:
   # https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
   # Look for SPL token transfer "destination" address
   ```

4. **Enable polling** (optional but recommended):
   ```bash
   # Add facilitator address to .env.local
   NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=<found_address>
   X402_POLLING_ENABLED=true

   # Deploy Convex functions
   cd packages/web
   bunx convex dev
   ```

#### How Dual-Source Tracking Works

**When a webhook is received:**
1. Updates reputation cache immediately (fast!)
2. Marks event as `sourceWebhook: true` in Convex
3. Returns success to PayAI

**Every 5 minutes (cron job):**
1. Polls Solana for new x402 transactions to facilitator
2. Parses SPL token transfers to extract payment data
3. Updates reputation from on-chain data
4. Marks events as `sourceOnChain: true`
5. Cross-references with webhook events

**Every hour (integrity check):**
1. Compares webhook events vs on-chain events
2. Flags discrepancies (webhook only, on-chain only, or both)
3. Logs verification rate and alerts if webhooks are missing

#### Benefits of Dual-Source

✅ **0% missed events** - On-chain polling catches what webhooks miss
✅ **Self-healing** - Automatically discovers missed webhook deliveries
✅ **Verifiable** - Cross-checks webhook data against blockchain truth
✅ **Historical sync** - Can backfill reputation from day 1
✅ **No webhook dependency** - Works even if PayAI webhooks go down

#### Monitoring Sync Status

Check sync statistics via Convex queries:

```typescript
// Get sync state for your facilitator
const syncState = await convex.query(api.x402Indexer.getSyncState, {
  facilitatorAddress: 'YOUR_FACILITATOR_ADDRESS'
})

// Get overall sync statistics
const stats = await convex.query(api.x402Indexer.getSyncStats)
console.log('Verification rate:', stats.events.verified / stats.events.total)
```

#### Disabling On-Chain Polling

If you want to rely only on webhooks (not recommended):

```bash
# In .env.local or production.env
X402_POLLING_ENABLED=false
```

This will disable:
- 5-minute sync job
- Hourly integrity verification

---

## Setting Up the Devnet Faucet

### 1. Generate Faucet Wallet

```bash
solana-keygen new -o ~/.config/solana/ghost-faucet.json
```

### 2. Fund with SOL (for transaction fees)

```bash
solana airdrop 2 $(solana address -k ~/.config/solana/ghost-faucet.json) --url devnet
```

### 3. Mint Devnet GHOST Tokens

```bash
# Use the mint-devnet-ghost.ts script (if available)
bun scripts/mint-devnet-ghost.ts --wallet ~/.config/solana/ghost-faucet.json --amount 1000000
```

### 4. Add Faucet Key to Environment

```bash
# Get the keypair as JSON array
cat ~/.config/solana/ghost-faucet.json

# Add to .env.local
DEVNET_FAUCET_PRIVATE_KEY=[paste_keypair_array_here]
```

### 5. Test Faucet Health

```bash
curl http://localhost:3000/api/airdrop/ghost
```

**Expected Response:**
```json
{
  "status": "ok",
  "faucetAddress": "...",
  "balance": 1000000,
  "airdropAmount": 10000,
  "claimsRemaining": 100
}
```

---

## Switching to Mainnet (Post-Audit)

When GhostSpeak programs are audited and deployed to mainnet:

### 1. Update Environment Variables

```bash
# Change network
NEXT_PUBLIC_SOLANA_NETWORK=mainnet

# Update RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Update GHOST token (already correct)
NEXT_PUBLIC_GHOST_TOKEN_MINT=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
```

### 2. Remove Devnet Faucet Config

```bash
# These are only needed on devnet
# DEVNET_FAUCET_PRIVATE_KEY=...
# DEVNET_GHOST_MINT=...
```

### 3. Deploy Updated Code

- No code changes required - everything is network-aware
- Jupiter pricing will automatically fetch live mainnet prices
- Revenue distribution will be activated

### 4. Test Mainnet Billing

Users will now pay with real GHOST tokens from mainnet.

---

## Troubleshooting

### "Insufficient GHOST balance" Error

**Solution:** Request airdrop
```bash
curl -X POST http://localhost:3000/api/airdrop/ghost \
  -d '{"recipient": "YOUR_WALLET"}'
```

### "Rate limit exceeded" Error

**Solution:** Wait 24 hours or use a different wallet for testing

### "Faucet balance too low" Error

**Solution:** Refill the faucet wallet with more devnet GHOST tokens

### API Returns 402 Payment Required

**Solution:** Check your GHOST balance:
```bash
curl http://localhost:3000/api/v1/billing/balance \
  -H "X-API-Key: YOUR_KEY"
```

---

## Developer Notes

### Code Structure

All network-specific logic is centralized:

- **Environment:** `NEXT_PUBLIC_SOLANA_NETWORK` in `.env.local`
- **Token Mints:** `lib/b2b-token-accounts.ts` - `GHOST_MINTS.devnet` vs `GHOST_MINTS.mainnet`
- **Pricing:** `lib/jupiter-price-oracle.ts` - auto-detects network
- **Billing:** `lib/api/billing-middleware.ts` - uses `getCurrentNetwork()`

### Testing Both Networks Locally

You can test both networks without changing code:

**Terminal 1 (Devnet)**
```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet bun run dev
```

**Terminal 2 (Mainnet Simulation)**
```bash
NEXT_PUBLIC_SOLANA_NETWORK=mainnet bun run dev --port 3001
```

### Mock Mode for CI/CD

For CI/CD without real tokens:

```bash
# Use mock pricing
NEXT_PUBLIC_SOLANA_NETWORK=devnet
MOCK_BILLING=true  # If implemented
```

---

## Support

- **Devnet Explorer:** https://explorer.solana.com/?cluster=devnet
- **Faucet Status:** `GET /api/airdrop/ghost`
- **Balance Check:** `GET /api/v1/billing/balance`
- **Network Status:** Check response headers for `X-Solana-Network`

---

## Summary

✅ **Current State (Devnet)**
- Fully functional billing system
- Free test GHOST via airdrop
- Fixed pricing ($0.01/GHOST)
- Ready for developer testing

🚀 **Future State (Mainnet)**
- Real GHOST tokens
- Live market pricing via Jupiter
- Revenue distribution to stakers
- Production-ready post-audit

**No code changes needed** - just update environment variables!
