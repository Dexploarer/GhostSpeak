# PayAI Integration Setup Guide

Complete guide for setting up PayAI x402 payment integration with GhostSpeak reputation tracking and on-chain polling.

## 📋 Prerequisites

- ✅ Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- ✅ Solana CLI installed (`sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`)
- ✅ Devnet wallet with SOL
- ✅ Convex account (free: https://convex.dev)

## 🚀 Quick Start (5 minutes)

### Step 1: Environment Configuration ✅

Your `.env.local` has been pre-configured with:

```bash
# PayAI Integration
FACILITATOR_URL=https://facilitator.payai.network
X402_NETWORK=solana-devnet
PAYAI_WEBHOOK_SECRET=test_webhook_secret_replace_with_real_secret
X402_POLLING_ENABLED=true
X402_POLLING_BATCH_SIZE=100
```

**⚠️ Important:** The `PAYAI_WEBHOOK_SECRET` is a placeholder. For production:
1. Generate a secure secret: `openssl rand -base64 32`
2. Configure it in your PayAI merchant dashboard (when available)
3. Update `.env.local` with the real secret

### Step 2: Deploy Convex Functions

```bash
cd packages/web
bunx convex dev
```

This will:
- Deploy all Convex functions (x402Indexer, webhooks, etc.)
- Generate TypeScript types
- Start watching for changes

**First time?** Follow the Convex setup wizard:
1. Create/login to Convex account
2. Create new project: `ghostspeak-dev`
3. Authorize deployment
4. Copy deployment URL to `.env.local`:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

### Step 3: Test Payment Flow (Optional but Recommended)

This helps you discover the PayAI facilitator's Solana address for on-chain polling.

#### 3a. Start Test Merchant Server

```bash
cd packages/sdk-typescript

# Generate merchant wallet
solana-keygen new -o merchant-wallet.json

# Get merchant address
export MERCHANT_ADDRESS=$(solana address -k merchant-wallet.json)

# Start test merchant
bun run scripts/test-payai-merchant.ts
```

Server will run on `http://localhost:4000` with endpoints:
- `GET /` - Server info
- `GET /protected` - Protected resource (requires payment)
- `POST /webhook` - Webhook receiver

#### 3b. Make Test Payment

**Option A: Using PayAI Client SDK** (Recommended)

Install PayAI client SDK and make a payment:

```bash
# Install PayAI SDK (when available)
bun add @payai/client

# Use PayAI client to make payment
# See: https://docs.payai.network/x402/clients/introduction
```

**Option B: Using Test Client Script**

```bash
# Get devnet USDC from Circle faucet
# Visit: https://faucet.circle.com
# Select: Solana Devnet
# Enter your wallet address

# Run test client
bun run scripts/test-payai-client.ts ~/.config/solana/id.json
```

#### 3c. Discover Facilitator Address

After making a payment, check the merchant server logs for the transaction signature, then:

```bash
# Extract facilitator address from transaction
bun run scripts/find-payai-facilitator-address.ts <TX_SIGNATURE> devnet
```

Output will include:
```bash
NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=<discovered_address>
```

Add this to `/packages/web/.env.local`.

### Step 4: Initialize Sync State

Once you have the facilitator address:

```bash
# Using Convex dashboard
# 1. Open: https://dashboard.convex.dev
# 2. Go to Functions → x402Indexer → initializeSyncState
# 3. Run with: { facilitatorAddress: "<your_address>" }

# OR using Convex CLI
npx convex run x402Indexer:initializeSyncState \
  --arg facilitatorAddress="<your_facilitator_address>"
```

### Step 5: Start GhostSpeak Web App

```bash
cd packages/web
bun run dev
```

Your webhook endpoint will be available at:
```
http://localhost:3000/api/payai/webhook
```

For production, use your public URL:
```
https://your-domain.com/api/payai/webhook
```

## 📊 Verification

### Check Convex Sync Status

```bash
# Via Convex dashboard
# Functions → x402Indexer → getSyncStats

# OR via CLI
npx convex query x402Indexer:getSyncStats
```

Expected output:
```json
{
  "facilitators": [
    {
      "address": "<facilitator_address>",
      "lastSyncAt": 1234567890,
      "totalSynced": 0,
      "errors": 0
    }
  ],
  "events": {
    "total": 0,
    "webhookOnly": 0,
    "onChainOnly": 0,
    "verified": 0
  }
}
```

### Monitor Cron Jobs

In Convex dashboard, check:
- **sync-x402-payments**: Runs every 5 minutes
- **verify-webhook-integrity**: Runs hourly at :30

### Test Webhook Endpoint

```bash
curl http://localhost:3000/api/payai/webhook
```

Expected response:
```json
{
  "status": "ok",
  "endpoint": "/api/payai/webhook",
  "description": "PayAI webhook endpoint for payment event processing",
  "signatureVerification": false,
  "stats": {
    "trackedAgents": 0,
    "averageScore": 0,
    "totalPayments": 0
  }
}
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FACILITATOR_URL` | PayAI facilitator endpoint | Yes | `https://facilitator.payai.network` |
| `X402_NETWORK` | Blockchain network | Yes | `solana-devnet` |
| `PAYAI_WEBHOOK_SECRET` | Webhook signature secret | Production | `test_webhook_secret_*` |
| `NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS` | Facilitator Solana address | For polling | - |
| `X402_POLLING_ENABLED` | Enable on-chain polling | No | `true` |
| `X402_POLLING_BATCH_SIZE` | Transactions per sync | No | `100` |

### Networks

| Network | Value | Use Case |
|---------|-------|----------|
| Devnet | `solana-devnet` | Testing |
| Mainnet | `solana` | Production |

## 🐛 Troubleshooting

### Convex Deployment Fails

**Issue**: `ConvexError: Deployment not found`

**Solution**:
```bash
# Re-authenticate
bunx convex login

# Re-initialize
bunx convex dev
```

### Webhook Not Receiving Events

**Issue**: Payments succeed but webhooks don't arrive

**Checklist**:
1. ✅ Webhook endpoint is publicly accessible
2. ✅ PayAI configured with correct webhook URL
3. ✅ Webhook secret matches
4. ✅ Check server logs for errors

**Test locally with ngrok**:
```bash
# Install ngrok
brew install ngrok

# Expose local server
ngrok http 3000

# Use ngrok URL for webhooks
https://<random>.ngrok.io/api/payai/webhook
```

### On-Chain Polling Not Finding Payments

**Issue**: Cron job runs but finds no transactions

**Checklist**:
1. ✅ Facilitator address is correct
2. ✅ Network matches (devnet vs mainnet)
3. ✅ RPC endpoint is accessible
4. ✅ Sync state initialized

**Debug**:
```bash
# Check sync state
npx convex query x402Indexer:getSyncState \
  --arg facilitatorAddress="<your_address>"

# Manually trigger sync
npx convex mutation x402Indexer:syncX402Payments \
  --arg facilitatorAddress="<your_address>"
```

### Insufficient USDC Balance

**Issue**: Test payments fail with insufficient balance

**Solution**:
```bash
# Get devnet USDC
# 1. Visit: https://faucet.circle.com
# 2. Select: Solana Devnet
# 3. Enter your wallet address
# 4. Click "Get USDC"

# Check balance
spl-token balance --owner <your_wallet> Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

## 📚 Additional Resources

### Documentation

- **PayAI Docs**: https://docs.payai.network
- **x402 Protocol**: https://github.com/coinbase/x402
- **Convex Docs**: https://docs.convex.dev
- **Solana Docs**: https://docs.solana.com

### Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| `test-payai-merchant.ts` | Test merchant server | `packages/sdk-typescript/scripts/` |
| `test-payai-client.ts` | Test payment client | `packages/sdk-typescript/scripts/` |
| `find-payai-facilitator-address.ts` | Extract facilitator address | `packages/sdk-typescript/scripts/` |

### Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Payer)    │
└──────┬──────┘
       │ 1. Make payment
       ▼
┌─────────────────────────────────────┐
│    PayAI Facilitator                │
│    (https://facilitator.payai.network) │
│                                     │
│  • Verifies payment                │
│  • Settles on Solana                │
│  • Sends webhook                    │
└──────┬─────────────┬────────────────┘
       │             │
       │ 2. Webhook  │ 3. SPL Transfer (on-chain)
       ▼             ▼
┌─────────────┐ ┌──────────────┐
│ GhostSpeak  │ │   Solana     │
│  Webhook    │ │  Blockchain  │
│             │ │              │
│ • Updates   │ │ • Permanent  │
│   reputation│ │   record     │
│ • Marks     │ │ • Verifiable │
│   received  │ │              │
└──────┬──────┘ └───────┬──────┘
       │                │
       │                │ 4. Polls every 5min
       ▼                ▼
┌────────────────────────────────┐
│    Convex x402Indexer          │
│                                │
│  • Dual-source tracking        │
│  • Verifies webhooks           │
│  • Catches missed events       │
│  • Historical sync             │
└────────────────────────────────┘
```

## ✅ Success Checklist

After setup, verify:

- [ ] Convex deployed successfully
- [ ] x402Indexer functions visible in dashboard
- [ ] Cron jobs scheduled and running
- [ ] Webhook endpoint accessible
- [ ] Test payment successful (optional)
- [ ] Facilitator address discovered (optional)
- [ ] Sync state initialized (if using polling)
- [ ] Stats query returns data

## 🎉 You're Done!

Your GhostSpeak PayAI integration is now ready!

**What happens next:**

1. **Fast Path**: When PayAI payments occur, webhooks update reputation instantly
2. **Reliable Fallback**: Every 5 minutes, on-chain polling verifies all payments
3. **Integrity Check**: Hourly verification ensures no missed events
4. **Self-Healing**: Missed webhooks are automatically caught and processed

For questions or issues:
- Check logs in Convex dashboard
- Review server logs: `cd packages/web && bun run dev`
- Consult PayAI docs: https://docs.payai.network
