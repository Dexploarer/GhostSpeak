# PayAI Integration Setup Guide

This guide will help you set up the PayAI webhook integration for GhostSpeak.

## Prerequisites

- Bun installed (for running commands)
- Access to Solana devnet/mainnet
- PayAI webhook secret (obtained from PayAI team)
- Crossmint API key (optional, for credential syncing)

## Step 1: Generate Server Wallet

The server wallet is used to record PayAI payments on-chain via the `record_x402_payment` instruction.

```bash
# Generate a new Solana keypair
solana-keygen new --no-bip39-passphrase -o payment-recorder.json

# Display the public key (for funding)
solana-keygen pubkey payment-recorder.json

# Encode the private key as base58 for env variable
cat payment-recorder.json | jq -r '. | @json' | base64
```

## Step 2: Fund the Server Wallet

The wallet needs SOL for transaction fees (very minimal, < $0.001 per payment).

**Devnet:**
```bash
solana airdrop 2 <WALLET_ADDRESS> --url devnet
```

**Mainnet:**
```bash
# Transfer SOL from your main wallet
solana transfer <WALLET_ADDRESS> 0.1 --url mainnet-beta
```

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# ============================================
# PAYAI INTEGRATION
# ============================================

# Server wallet for on-chain recording
PAYMENT_RECORDER_PRIVATE_KEY=<base58_encoded_private_key>

# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com
# For mainnet: https://api.mainnet-beta.solana.com
# Or use Helius/QuickNode for better performance

# PayAI webhook secret (shared by PayAI team)
PAYAI_WEBHOOK_SECRET=<your_webhook_secret>

# ============================================
# CROSSMINT (Optional)
# ============================================

# Crossmint API key for credential syncing
CROSSMINT_API_KEY=<your_crossmint_api_key>
CROSSMINT_ENVIRONMENT=staging
# For production: production

# ============================================
# EXISTING ENV VARS (keep as-is)
# ============================================

NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# ... your other env vars
```

## Step 4: Test the Integration

### Test Webhook Handler

```bash
# Run the webhook test script
curl -X POST http://localhost:3000/api/payai/webhook \
  -H "Content-Type: application/json" \
  -H "x-payai-signature: test_signature" \
  -H "x-payai-timestamp: $(date +%s)000" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.settled",
    "timestamp": "2025-12-30T10:30:00Z",
    "data": {
      "paymentId": "pay_test_456",
      "transactionSignature": "5KqZ...",
      "network": "solana",
      "payer": "ABC...",
      "merchant": "DEF...",
      "amount": "1000000",
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "assetSymbol": "USDC",
      "status": "settled",
      "resource": "https://agent.example.com/api",
      "responseTimeMs": 450,
      "httpStatusCode": 200,
      "success": true,
      "settledAt": "2025-12-30T10:30:00Z"
    }
  }'
```

### Check Webhook Status

```bash
# GET request to check webhook endpoint
curl http://localhost:3000/api/payai/webhook
```

Expected response:
```json
{
  "status": "ok",
  "endpoint": "/api/payai/webhook",
  "description": "PayAI webhook endpoint for payment event processing",
  "signatureVerification": true,
  "stats": {
    "trackedAgents": 0,
    "averageScore": 0,
    "totalPayments": 0
  }
}
```

## Step 5: Configure PayAI Webhook

Contact the PayAI team to configure the webhook endpoint:

**Webhook URL:** `https://your-domain.com/api/payai/webhook`

**Events to Subscribe:**
- `payment.settled` (required)
- `payment.failed` (optional but recommended)

**Authentication:**
- HMAC-SHA256 signature
- Secret: `PAYAI_WEBHOOK_SECRET`
- Headers:
  - `x-payai-signature`: HMAC signature
  - `x-payai-timestamp`: Unix timestamp in milliseconds

## Step 6: Monitor Integration

### Check Server Logs

```bash
# View webhook processing logs
bun run dev | grep "PayAI Webhook"
```

### Expected Log Output

```
[PayAI Webhook] Reputation updated: {
  agent: 'ABC123...',
  success: true,
  responseTimeMs: 450,
  amount: '1000000',
  change: 125,
  newScore: 5125,
  tier: 'Silver',
  totalJobs: 15
}

[PayAI Webhook] On-chain instruction built: {
  agent: 'ABC123...',
  signature: 'pay_test_456',
  amount: '1000000',
  responseTimeMs: 450,
  success: true
}

[PayAI Webhook] Credential issued: {
  credentialId: 'rep_silver_ABC123_1703980800',
  tier: 'Silver',
  solanaSignature: '3Kq...',
  crossmintId: 'cred_...'
}
```

## Step 7: Production Deployment

### Vercel Environment Variables

Add the following to your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add each variable with production values
3. Ensure `SOLANA_RPC_URL` points to mainnet
4. Use a production-grade RPC provider (Helius, QuickNode, etc.)

### Health Check

Vercel automatically monitors your API routes. Optionally add:

```typescript
// app/api/health/route.ts
export async function GET() {
  const { isServerWalletConfigured } = await import('@/lib/server-wallet')

  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      serverWallet: isServerWalletConfigured(),
      payaiWebhook: !!process.env.PAYAI_WEBHOOK_SECRET,
      crossmint: !!process.env.CROSSMINT_API_KEY
    }
  })
}
```

## Troubleshooting

### Webhook Signature Verification Fails

**Problem:** `Invalid signature` error

**Solution:**
1. Ensure `PAYAI_WEBHOOK_SECRET` matches PayAI configuration
2. Check webhook timestamp is within 5 minutes
3. Verify payload hasn't been modified (Content-Type: application/json)

### On-Chain Recording Fails

**Problem:** Transaction fails or times out

**Solutions:**
1. **Insufficient SOL:** Fund the server wallet
2. **RPC congestion:** Use a premium RPC provider
3. **PDA derivation:** Ensure agent has reputation metrics account initialized

### Credential Issuance Fails

**Problem:** Credential not issued despite tier crossing

**Solutions:**
1. **Crossmint API key:** Check `CROSSMINT_API_KEY` is valid
2. **Tier already issued:** Credentials only issued once per tier
3. **Score threshold:** Verify score actually crossed milestone (2000, 5000, 7500, 9000)

### Rate Limiting

If you're processing high webhook volume (>100 req/min), consider:
1. Upgrading Vercel plan for higher limits
2. Implementing webhook batching
3. Using Redis for caching reputation data

## Security Checklist

- [ ] Server wallet private key stored securely (not in git)
- [ ] PayAI webhook secret rotated regularly (quarterly)
- [ ] Signature verification enabled in production
- [ ] Server wallet has minimal SOL (no more than needed)
- [ ] HTTPS enabled for all webhook endpoints
- [ ] Rate limiting configured (prevent DoS)
- [ ] Error logs don't expose sensitive data

## Support

For integration issues:
- Email: support@ghostspeak.io
- Discord: discord.gg/ghostspeak
- Documentation: https://docs.ghostspeak.io

For PayAI-specific issues:
- Contact PayAI support team
- Check PayAI documentation: https://docs.payai.network
