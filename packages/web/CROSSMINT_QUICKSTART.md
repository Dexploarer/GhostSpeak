# Crossmint Integration - Quick Start

## 🚀 5-Minute Setup

### 1. Install Dependencies ✅ (Already Done)

```bash
bun add svix
```

### 2. Get Crossmint Credentials

1. Sign up: https://www.crossmint.com/console
2. Create collection for "GhostSpeak Verifications"
3. Generate client-side API key
4. Set up webhook endpoint
5. Copy signing secret

### 3. Set Environment Variables

Add to `/packages/web/.env.local`:

```bash
NEXT_PUBLIC_CROSSMINT_API_KEY=sk_staging_your_key_here
NEXT_PUBLIC_CROSSMINT_COLLECTION_ID=crossmint:your_collection_id
CROSSMINT_WEBHOOK_SECRET=whsec_your_secret_here
```

### 4. Test Webhook

```bash
cd packages/web
bun scripts/test-crossmint-webhook.ts
```

Expected output:
```
✅ Webhook test PASSED
✅ Invalid signature rejection test PASSED
✅ Idempotency test PASSED
```

### 5. Test Payment Flow

1. Start dev server: `bun dev`
2. Navigate to an agent page
3. Click "Verify Agent"
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. Check Convex for verification record

## 📁 Files Created

```
Frontend Components:
├── components/payments/CrossmintCheckout.tsx
└── components/payments/VerificationPaymentModal.tsx

Backend Routes:
├── app/api/crossmint/webhook/route.ts (updated)
└── app/api/ghost-score/verify/route.ts (updated)

Database:
└── convex/verifications.ts (updated)

Documentation:
├── scripts/setup-crossmint.md
├── scripts/test-crossmint-webhook.ts
├── CROSSMINT_INTEGRATION.md
└── CROSSMINT_QUICKSTART.md (this file)

Config:
└── .env.example (updated)
```

## 🔧 How to Use Components

### Basic Usage

```tsx
import { CrossmintCheckout } from '@/components/payments/CrossmintCheckout'

<CrossmintCheckout
  userId={userId}
  agentAddress={agentAddress}
  onSuccess={() => {
    console.log('Payment successful!')
    // Refresh verification status
  }}
  onError={(error) => {
    console.error('Payment failed:', error)
  }}
/>
```

### Full Payment Modal

```tsx
import { VerificationPaymentModal } from '@/components/payments/VerificationPaymentModal'

const [showPaymentModal, setShowPaymentModal] = useState(false)

<VerificationPaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  userId={userId}
  agentAddress={agentAddress}
  paymentOptions={[
    { method: 'crossmint', label: 'Pay with Card', price: '$1.03 USD', description: '...' },
    { method: 'usdc', label: 'Pay with USDC', price: '1.00 USDC', description: '...' },
    // ... more options
  ]}
  onPaymentSuccess={() => {
    // Refresh UI
  }}
/>
```

## 🔒 Security Features

- ✅ **Svix Signature Verification:** HMAC SHA-256
- ✅ **Idempotency:** Prevents duplicate credits
- ✅ **Raw Body Verification:** No JSON parsing before signature check
- ✅ **Timestamp Validation:** Prevents replay attacks
- ✅ **Database Idempotency:** Checks payment signature in Convex

## 💰 Payment Flow

```
User → Pay with Card ($1.03)
         ↓
Crossmint → Converts to 1 USDC → Treasury Wallet
         ↓
Webhook → Verifies Signature → Credits Verification
         ↓
User → Can now verify agent
```

## 🧪 Testing

### Test Cards (Staging)

| Card Number          | Result  |
|---------------------|---------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0027 6000 3184 | 3DS Auth|

Expiry: Any future date (12/34)
CVC: Any 3 digits (123)
ZIP: Any code (12345)

### Test Webhook

```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Test webhook
bun scripts/test-crossmint-webhook.ts
```

## 🐛 Troubleshooting

### Webhook 401 Error

**Problem:** `Invalid signature`

**Fix:**
1. Check `CROSSMINT_WEBHOOK_SECRET` is correct
2. Verify webhook URL is publicly accessible
3. Ensure using raw request body

### Payment Completes But No Verification

**Problem:** User paid but can't verify

**Fix:**
1. Check Crossmint console → Webhooks → Delivery logs
2. Verify webhook endpoint returns 200 OK
3. Check Convex logs for errors
4. Ensure metadata includes `userId` and `agentAddress`

### Component Not Rendering

**Problem:** CrossmintCheckout button shows "Payment Unavailable"

**Fix:**
1. Verify `NEXT_PUBLIC_CROSSMINT_API_KEY` is set
2. Check `.env.local` file exists
3. Restart dev server to load env vars

## 📊 Monitoring

Check these in production:

```typescript
// Webhook delivery rate
SELECT COUNT(*) FROM webhooks WHERE status = 'delivered'

// Payment success rate
SELECT COUNT(*) FROM verifications WHERE paymentMethod = 'crossmint'

// Average payment time
SELECT AVG(completedAt - createdAt) FROM payments
```

## 🔗 Links

- [Crossmint Console](https://www.crossmint.com/console)
- [Crossmint Docs](https://docs.crossmint.com)
- [Svix Docs](https://docs.svix.com)
- [Full Integration Guide](./CROSSMINT_INTEGRATION.md)
- [Setup Guide](./scripts/setup-crossmint.md)

## 🎯 Next Steps

After testing in staging:

1. [ ] Configure production API keys
2. [ ] Update webhook URL to production
3. [ ] Test with real $1.00 payment
4. [ ] Monitor first 100 payments
5. [ ] Set up error alerts
6. [ ] Go live!

## 💡 Pro Tips

- **Show both options:** Let users choose Crossmint (card) vs USDC (wallet)
- **Monitor closely:** First week is critical for catching issues
- **Optimize UX:** Show estimated wait time during payment
- **Handle errors gracefully:** Clear error messages for failed payments
- **Track metrics:** Payment success rate, average time, error types

---

**Questions?** Check the [full integration guide](./CROSSMINT_INTEGRATION.md) or contact support.
