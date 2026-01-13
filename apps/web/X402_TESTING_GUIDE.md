# x402 Payment System - Testing Guide

Complete guide for testing GhostSpeak's x402 v2 payment implementation.

## Overview

GhostSpeak implements the x402 v2 specification for HTTP 402 Payment Required with:
- CAIP-2 network identifiers
- Full SPL token transfer instruction parsing
- Replay attack protection
- On-chain transaction verification
- Facilitator integration

## Prerequisites

### Environment Setup

```bash
# Required environment variables (.env.local)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment

# GhostSpeak Program Configuration (DEVNET)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# x402 Payment Configuration (MAINNET)
# IMPORTANT: x402 uses MAINNET for real USDC payments
X402_NETWORK=mainnet
PAYAI_FACILITATOR_URL=https://facilitator.payai.network/v1/settle
NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS=2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4

# Caisper (GhostSpeak agent)
# Will be auto-configured via Convex
```

### Key Architecture Note

**GhostSpeak uses a hybrid network configuration:**
- 🔵 **GhostSpeak Program**: Devnet (program still in testing)
- 🟢 **x402 Payments**: Mainnet (real USDC, real PayAI facilitator)

This allows testing the GhostSpeak program on devnet while processing real payments on mainnet.

### Test Wallet Setup

**For Mainnet x402 Testing:**

```bash
# Create test wallet (or use existing mainnet wallet)
solana-keygen new -o ~/.config/solana/x402-mainnet.json

# Get wallet address
solana address -k ~/.config/solana/x402-mainnet.json

# Fund with mainnet SOL (for transaction fees)
# Use a crypto exchange to send ~0.1 SOL to your wallet

# Get mainnet USDC
# Option 1: Buy USDC on exchange and transfer to wallet
# Option 2: Swap SOL for USDC using Jupiter: https://jup.ag
# Need at least $0.10 USDC for testing (100+ test transactions)
```

**USDC Token Addresses:**
- Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (for testing only)

## Test Scenarios

### 1. Service Discovery Test

**Verify /.well-known/x402.json endpoint**

```bash
curl https://ghostspeak.ai/.well-known/x402.json | jq
```

**Expected Response:**
```json
{
  "provider": {
    "name": "GhostSpeak",
    "description": "On-chain reputation and trust verification for AI agents on Solana",
    "agentAddress": "<caisper_address>"
  },
  "endpoints": [
    {
      "name": "Agent Verification",
      "url": "https://ghostspeak.ai/api/x402/verify",
      "method": "POST",
      "price": 0.01,
      "accepts": [
        {
          "scheme": "exact",
          "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          "payTo": "<caisper_address>",
          "maxAmountRequired": "10000"
        }
      ]
    }
  ],
  "version": "2.0"
}
```

**Validation Checklist:**
- ✅ CAIP-2 network format (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` for MAINNET)
- ✅ Correct USDC mainnet mint address (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- ✅ Version is `2.0`
- ✅ All three services exposed (verify, score, capabilities)
- ✅ Both mainnet AND devnet accepts arrays (for backward compatibility)

### 2. Payment Required Response Test

**Request without payment:**

```bash
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "test123"}' \
  -v
```

**Expected Response:**
- Status: `402 Payment Required`
- Headers should include:
  - `PAYMENT-REQUIRED: x402 scheme="exact", network="solana:...", ...`
  - `WWW-Authenticate: x402 ...` (for v1 compatibility)

**Validation Checklist:**
- ✅ Status code is 402
- ✅ `PAYMENT-REQUIRED` header present
- ✅ Response body contains `accepts` array
- ✅ Network uses CAIP-2 format

### 3. Full Payment Flow Test

**Step 1: Get Payment Requirements**

```bash
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "test"}' | jq '.accepts[0]'
```

Save the payment requirements for next step.

**Step 2: Create Payment Transaction**

Use the GhostSpeak SDK or Solana CLI to create a USDC transfer:

```typescript
import { createX402Payment } from '@ghostspeak/sdk'

const paymentRequirements = {
  scheme: 'exact',
  network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  payTo: '<caisper_address>',
  maxAmountRequired: '10000',
  extra: {
    feePayer: '<facilitator_address>'
  }
}

const { encodedPayload } = await createX402Payment(paymentRequirements)
```

**Step 3: Submit Payment**

```bash
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <encoded_payload>" \
  -d '{"agentAddress": "test"}' \
  -v
```

**Expected Response:**
- Status: `200 OK`
- Headers include:
  - `PAYMENT-RESPONSE: <base64_settlement_response>`
- Body includes:
  - `success: true`
  - `paymentAccepted: true`
  - `transactionSignature: <tx_sig>`
  - `payer: <wallet_address>`
  - `data: { verified: true, ... }`

**Validation Checklist:**
- ✅ Payment accepted (200 status)
- ✅ Transaction signature returned
- ✅ Service data returned
- ✅ `PAYMENT-RESPONSE` header present

### 4. Replay Attack Protection Test

**Attempt to reuse same transaction:**

```bash
# Use same PAYMENT-SIGNATURE from previous request
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <same_encoded_payload>" \
  -d '{"agentAddress": "test2"}' \
  -v
```

**Expected Response:**
- Status: `402 Payment Required`
- Error: `"Transaction already used"`

**Validation Checklist:**
- ✅ Replay attack blocked
- ✅ Error message clear
- ✅ Transaction tracked in `x402UsedTransactions` table

### 5. Instruction Parsing Verification Test

**Create a malicious payment (wrong recipient):**

```typescript
// Modify the payment to send to a different address
const maliciousPaymentRequirements = {
  ...paymentRequirements,
  payTo: '<attacker_address>' // Different from expected recipient
}

const { encodedPayload } = await createX402Payment(maliciousPaymentRequirements)
```

**Submit malicious payment:**

```bash
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "PAYMENT-SIGNATURE: <malicious_payload>" \
  -d '{"agentAddress": "test"}' \
  -v
```

**Expected Response:**
- Status: `402 Payment Required`
- Error: `"Payment sent to wrong recipient"`

**Validation Checklist:**
- ✅ Wrong recipient detected
- ✅ Transaction rejected
- ✅ Clear error message

### 6. Amount Verification Test

**Create underpayment:**

```typescript
const underpaymentRequirements = {
  ...paymentRequirements,
  maxAmountRequired: '5000' // Half the required amount
}
```

**Expected Response:**
- Status: `402 Payment Required`
- Error: `"Insufficient payment amount. Expected: 10000 micro-USDC, Got: 5000"`

**Validation Checklist:**
- ✅ Amount verified
- ✅ Underpayment rejected
- ✅ Expected vs actual amounts shown

### 7. Facilitator Integration Test

**Prerequisites:**
- PayAI facilitator account
- Facilitator URL configured
- Facilitator wallet funded

**Test Flow:**
1. Create x402 payment with facilitator as fee payer
2. Submit to GhostSpeak endpoint
3. Verify facilitator co-signs transaction
4. Confirm transaction on-chain

**Validation via Solana Explorer:**

```bash
# Get transaction signature from response
TX_SIG=<transaction_signature>

# View on Solana Explorer (MAINNET - not devnet!)
open "https://explorer.solana.com/tx/${TX_SIG}"
```

**Check for:**
- ✅ 3 instructions (compute limit, compute price, transfer)
- ✅ SPL token transfer to Caisper's USDC account
- ✅ Correct amount (10,000 micro-USDC = $0.01)
- ✅ Fee paid by PayAI facilitator
- ✅ Transaction confirmed on MAINNET
- ✅ Token mint is mainnet USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)

## Convex Dashboard Verification

### Check Used Transactions Table

```bash
# Open Convex dashboard
open "https://dashboard.convex.dev"

# Navigate to: Data > x402UsedTransactions

# Verify records show:
# - transactionSignature
# - network (CAIP-2 format)
# - recipient (Caisper address)
# - payer (test wallet)
# - amount (10000 micro-USDC)
# - service (e.g., "verify")
# - usedAt (timestamp)
# - expiresAt (30 days from now)
```

### Monitor Logs

```bash
# In Convex dashboard: Logs tab
# Filter for "[x402"

# Expected log sequence:
# 1. [x402Route] Request for service: verify
# 2. [x402Route] Checking for replay attacks...
# 3. [x402Route] Verifying payment on-chain...
# 4. [x402Verify] Checking transaction: <tx_sig>
# 5. [x402Verify] Parsing SPL token transfer instructions...
# 6. [x402Verify] Found 1 SPL token instructions
# 7. [x402Verify] ✅ Payment verified successfully
# 8. [x402] Transaction marked as used: <tx_sig>
```

## Testing All Services

### Verify Service ($0.01)

```bash
curl -X POST https://ghostspeak.ai/api/x402/verify \
  -H "PAYMENT-SIGNATURE: <payment>" \
  -d '{"agentAddress": "test"}'
```

### Score Service ($0.005)

```bash
curl https://ghostspeak.ai/api/x402/score?agent=<address> \
  -H "PAYMENT-SIGNATURE: <payment>"
```

### Capabilities Service ($0.01)

```bash
curl -X POST https://ghostspeak.ai/api/x402/capabilities \
  -H "PAYMENT-SIGNATURE: <payment>" \
  -d '{"agentAddress": "test"}'
```

## Common Issues & Troubleshooting

### Issue: "Transaction not found on-chain"

**Cause:** Transaction not yet confirmed or invalid signature

**Fix:**
```bash
# Wait for confirmation
solana confirm <tx_signature> --url devnet

# Check transaction status
solana transaction <tx_signature> --url devnet
```

### Issue: "Invalid payment header format"

**Cause:** Malformed base64 encoding or invalid JSON

**Fix:**
- Verify base64 encoding
- Check JSON structure matches x402 v2 spec
- Ensure `x402Version`, `scheme`, `network`, `payload.transaction` are present

### Issue: "No SPL token transfer instruction found"

**Cause:** Transaction missing USDC transfer instruction

**Fix:**
- Ensure transaction has exactly 3 instructions
- Verify SPL token transfer is instruction #2
- Check token program is `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

### Issue: "Merchant not configured"

**Cause:** Caisper wallet not initialized in Convex

**Fix:**
```bash
# Run Caisper setup script
bun run scripts/setup-caisper-wallet.ts
```

## Performance Testing

### Load Test Script

```typescript
// test-x402-load.ts
import { test } from 'bun:test'
import { createX402Payment } from '@ghostspeak/sdk'

test('x402 load test - 100 sequential requests', async () => {
  const results = []

  for (let i = 0; i < 100; i++) {
    const start = Date.now()

    // Create unique payment for each request
    const payment = await createX402Payment(paymentRequirements)

    const response = await fetch('https://ghostspeak.ai/api/x402/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-SIGNATURE': payment.encodedPayload,
      },
      body: JSON.stringify({ agentAddress: `test${i}` }),
    })

    const duration = Date.now() - start
    results.push({ status: response.status, duration })
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const successRate = results.filter(r => r.status === 200).length / results.length

  console.log('Average response time:', avgDuration, 'ms')
  console.log('Success rate:', successRate * 100, '%')
})
```

**Run:**
```bash
bun test test-x402-load.ts
```

**Expected Performance:**
- Average response time: < 2000ms
- Success rate: 100%
- No timeout errors

## Production Readiness Checklist

Before deploying to mainnet:

- [ ] All tests passing in devnet
- [ ] Replay protection working (verified by duplicate transaction test)
- [ ] Instruction parsing correct (verified by malicious payment tests)
- [ ] Amount verification working (verified by underpayment tests)
- [ ] Service discovery accessible at /.well-known/x402.json
- [ ] v2 headers used (PAYMENT-SIGNATURE, PAYMENT-RESPONSE)
- [ ] CAIP-2 network identifiers throughout
- [ ] Facilitator integration tested end-to-end
- [ ] Load testing completed (100+ requests)
- [ ] Convex cleanup cron scheduled (cleanupExpiredTransactions)
- [ ] Monitoring and alerting configured
- [ ] Error tracking set up (Sentry/etc)

## Current Architecture: Hybrid Network Setup

### x402 Payments (MAINNET)

**Already configured for mainnet:**
- ✅ `X402_NETWORK=mainnet` (default)
- ✅ PayAI facilitator on mainnet
- ✅ Real USDC payments (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- ✅ Mainnet RPC for payment verification
- ✅ Service discovery shows mainnet as primary

### GhostSpeak Program (DEVNET)

**Currently on devnet for testing:**
- 🔵 `NEXT_PUBLIC_SOLANA_NETWORK=devnet`
- 🔵 `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`
- 🔵 Program ID: `GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9` (devnet)

### When to Migrate GhostSpeak Program to Mainnet

**Migration checklist for GhostSpeak program (not x402):**
- [ ] Security audit completed
- [ ] All program tests passing
- [ ] Upgrade authority configured
- [ ] Update `NEXT_PUBLIC_SOLANA_RPC_URL` to mainnet
- [ ] Update `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
- [ ] Deploy program to mainnet
- [ ] Update `NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID`

**x402 payments already work on mainnet!** No migration needed for payment system.

## Resources

- **x402 Specification:** https://docs.payai.network/x402
- **CAIP-2 Standard:** https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
- **Solana Explorer (Devnet):** https://explorer.solana.com/?cluster=devnet
- **Solana Explorer (Mainnet):** https://explorer.solana.com/
- **Circle USDC Faucet:** https://faucet.circle.com/

## Support

For issues or questions:
- GitHub: https://github.com/Ghostspeak/GhostSpeak/issues
- Discord: https://discord.gg/ghostspeak
- Email: dev@ghostspeak.ai
