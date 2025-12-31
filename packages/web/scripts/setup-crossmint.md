# Crossmint Fiat-to-Crypto Checkout Setup Guide

This guide will help you configure Crossmint for Ghost Score verification payments.

## Overview

**Payment Flow:**

1. User wants verification but has no crypto
2. Clicks "Pay with Card" → Crossmint checkout opens
3. User pays $1.03 with credit card (includes 3% fee)
4. Crossmint converts to 1 USDC and sends to protocol treasury
5. Crossmint webhook notifies backend
6. Backend verifies signature, credits user verification

## Step 1: Create Crossmint Account

1. Go to [Crossmint Console](https://www.crossmint.com/console)
2. Sign up for a developer account
3. Choose "Payments" as your product

## Step 2: Create a Collection

Crossmint uses "collections" to group related payments.

1. In the Crossmint Console, navigate to "Collections"
2. Click "Create Collection"
3. Configure:
   - **Name:** GhostSpeak Verifications
   - **Description:** Ghost Score agent verification payments
   - **Network:** Solana Mainnet (or Devnet for testing)
   - **Type:** Payment
4. Save the Collection ID (starts with `crossmint:...`)

## Step 3: Generate API Keys

1. Go to "API Keys" in the Crossmint Console
2. Create a **Client-side API Key**:
   - Scope: `orders.create`
   - Environment: Staging (for testing) or Production
   - Save this as `NEXT_PUBLIC_CROSSMINT_API_KEY`

## Step 4: Configure Webhook

1. In Crossmint Console, go to "Webhooks"
2. Click "Add Endpoint"
3. Configure:
   - **URL:** `https://your-domain.com/api/crossmint/webhook`
   - **Events:** Select:
     - `orders.payment.succeeded`
     - `orders.payment.failed`
     - `orders.delivery.completed`
4. Save the endpoint
5. Copy the **Signing Secret** (starts with `whsec_...`)
   - Save this as `CROSSMINT_WEBHOOK_SECRET`

## Step 5: Update Environment Variables

Add to your `.env.local` file:

```bash
# Crossmint Configuration
NEXT_PUBLIC_CROSSMINT_API_KEY=sk_staging_... # or sk_production_...
NEXT_PUBLIC_CROSSMINT_COLLECTION_ID=crossmint:your-collection-id
CROSSMINT_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

## Step 6: Configure Treasury Wallet

The USDC payments will be sent to the wallet address configured in your collection settings.

1. In Crossmint Console, go to your collection settings
2. Under "Payment Settings", set:
   - **Recipient Wallet:** Your Solana treasury wallet address
   - **Token:** USDC (SPL Token)
   - **Amount:** 1.00 USDC

## Step 7: Test with Sandbox

Crossmint provides test credit cards for staging:

**Test Cards:**

- **Success:** 4242 4242 4242 4242
- **Failure:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

**Test Details:**

- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any ZIP code (e.g., 12345)

**Test USDC:**
Get test USDC from the Crossmint faucet (available in staging console)

## Step 8: Verify Webhook Integration

1. Trigger a test payment in staging
2. Check your server logs for:
   ```
   [Crossmint Webhook] Verified event: orders.payment.succeeded <orderId>
   [Convex] Verification credited: { userId, agentAddress, paymentMethod }
   ```
3. Verify the webhook endpoint returns 200 OK
4. Check Convex database for the verification record

## Step 9: Go Live

Before production:

1. Switch to **Production API Key** in Crossmint Console
2. Update environment variables with production credentials
3. Test with a real $1.00 payment
4. Monitor webhook deliveries in Crossmint Console
5. Check payment success rate and error logs

## Troubleshooting

### Webhook Signature Verification Fails

**Problem:** Webhook returns 401 Invalid Signature

**Solution:**

1. Ensure you're using the correct signing secret from Crossmint Console
2. Check that the webhook URL is publicly accessible (not localhost)
3. Verify you're using the raw request body (not parsed JSON)
4. Use Crossmint webhook testing tool to send test events

### Payment Succeeds but Verification Not Credited

**Problem:** Payment completes but user doesn't get verification

**Solution:**

1. Check webhook delivery logs in Crossmint Console
2. Verify webhook endpoint is responding with 200 OK
3. Check Convex logs for mutation errors
4. Ensure metadata (userId, agentAddress) is being passed correctly

### User Gets Charged but Payment Shows Failed

**Problem:** User's card is charged but payment shows as failed

**Solution:**

1. Check Crossmint transaction logs for detailed error
2. Verify recipient wallet address is correct
3. Ensure wallet has sufficient SOL for rent
4. Contact Crossmint support with transaction ID

## Security Checklist

- [ ] Webhook signature verification enabled
- [ ] HTTPS only for webhook endpoint
- [ ] Environment variables secured (not in git)
- [ ] Idempotency handling implemented (prevents duplicate credits)
- [ ] Rate limiting on webhook endpoint
- [ ] Error logging and monitoring configured
- [ ] Test mode API keys separate from production

## Integration Testing Checklist

- [ ] Test successful credit card payment
- [ ] Test failed payment (declined card)
- [ ] Test 3D Secure verification flow
- [ ] Test webhook signature verification
- [ ] Test idempotent webhook handling (duplicate events)
- [ ] Test payment with metadata (userId, agentAddress)
- [ ] Verify Convex record creation
- [ ] Test concurrent payments (race conditions)

## Production Monitoring

Monitor these metrics in production:

1. **Payment Success Rate:** Target >95%
2. **Webhook Delivery Rate:** Target >99%
3. **Average Payment Time:** Target <60 seconds
4. **Failed Payment Reasons:** Track common failures
5. **Verification Credit Rate:** Should match payment success rate

## Support

- **Crossmint Docs:** https://docs.crossmint.com
- **Crossmint Support:** support@crossmint.com
- **Svix Webhook Docs:** https://docs.svix.com
- **GhostSpeak Support:** support@ghostspeak.io

## Cost Analysis

**Per Verification:**

- User pays: $1.03 USD
- Crossmint fee: $0.03 (3%)
- Protocol receives: 1.00 USDC
- Net revenue: 1.00 USDC

**Monthly Projections (from GHOST_TOKEN_RESEARCH.md):**

- 100K verifications/month = $100K revenue
- Crossmint fees: $3K/month
- Net revenue: $100K USDC

**Alternative: Direct USDC Payment**

- User pays: 1.00 USDC (no fee)
- Protocol receives: 1.00 USDC
- Net revenue: 1.00 USDC
- **Recommendation:** Show both options, let user choose
