# Payment Infrastructure - Screenshot Testing Guide

This guide shows exactly what to test and what screenshots to capture for proof of completion.

---

## Setup First

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

2. **Create Stripe Products** (follow STRIPE_SETUP_CHECKLIST.md)

3. **Add env vars** to `.env.local`

4. **Start webhook listener**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

5. **Start dev server**:
   ```bash
   cd packages/web
   bun dev
   ```

---

## Test 1: B2C Subscription - Stripe Checkout

### Steps
1. Navigate to `http://localhost:3000/ghost-score/pricing`
2. Click **"Start Free Trial"** on Pro plan
3. Fill checkout form:
   - Email: `test@example.com`
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - Name: `Test User`
4. Click **"Subscribe"**
5. Should redirect to success page

### Screenshots to Capture

**Screenshot 1: Pricing Page**
- URL: `/ghost-score/pricing`
- Highlight: "Start Free Trial" button on Pro plan
- Caption: "Pricing page with Subscribe buttons"

**Screenshot 2: Stripe Checkout**
- URL: `checkout.stripe.com/...`
- Show: Test card entered (`4242 4242 4242 4242`)
- Caption: "Stripe Checkout with test card"

**Screenshot 3: Convex Subscriptions Table**
- Go to: Convex Dashboard > Data > `subscriptions`
- Show: New row with:
  - `tier: "pro"`
  - `status: "trialing"` or `"active"`
  - `stripeCustomerId: "cus_..."`
  - `stripeSubscriptionId: "sub_..."`
- Caption: "Subscription created in Convex database"

**Screenshot 4: Stripe Dashboard**
- Go to: Stripe Dashboard > Customers
- Show: New customer with successful payment
- Caption: "Stripe Dashboard showing successful subscription"

---

## Test 2: Freemium Enforcement

### Steps
1. Ensure you're on **free tier** (no active subscription)
2. Navigate to `/ghost-score`
3. Search for an agent
4. Click **"Verify Agent"** button
5. Repeat 3 times total
6. On 4th attempt, should see error

### Screenshots to Capture

**Screenshot 5: Browser DevTools - Network Tab**
- Open DevTools > Network tab
- Make 4th verification request
- Show: Response with:
  - Status: `402 Payment Required`
  - Body:
    ```json
    {
      "error": "Verification limit reached",
      "verificationsUsed": 3,
      "verificationsLimit": 3,
      "upgradeUrl": "/ghost-score/pricing"
    }
    ```
- Caption: "402 Payment Required on 4th verification"

**Screenshot 6: UpgradeModal**
- Show: Modal displayed with:
  - Title: "Verification Limit Reached"
  - Message: "You've used 3 of 3 free verifications"
  - Pro plan card with "Start Free Trial" button
  - Power plan card
- Caption: "UpgradeModal shown when limit reached"

**Screenshot 7: Convex Verifications Table**
- Go to: Convex Dashboard > Data > `verifications`
- Show: 3 rows for current month
- Highlight: All have same `userId`
- Caption: "Convex tracking all 3 free verifications"

---

## Test 3: Pro Subscription Unlimited Access

### Steps
1. Subscribe to Pro (from Test 1)
2. Navigate to `/ghost-score`
3. Verify 5+ agents in a row
4. All should succeed

### Screenshots to Capture

**Screenshot 8: Multiple Successful Verifications**
- Show: Browser console or Network tab
- Multiple requests to `/api/ghost-score/verify`
- All returning `200 OK`
- Caption: "Pro user: Unlimited verifications working"

**Screenshot 9: Convex Verifications (Pro User)**
- Convex Dashboard > `verifications`
- Show: More than 3 rows for current month
- Highlight: `subscriptionTier: "pro"`
- Caption: "Pro user verifications tracked (no limit)"

---

## Test 4: B2B API Metered Billing

### Prerequisites
- Create API key via dashboard
- Set up metered Stripe subscription for API key

### Steps
1. Make API request:
   ```bash
   curl -X POST http://localhost:3000/api/v1/verify \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "agentAddress": "SOME_AGENT_ADDRESS",
       "returnMetrics": true
     }' | jq
   ```
2. Should return 200 with agent data

### Screenshots to Capture

**Screenshot 10: API Request/Response**
- Terminal showing:
  - Request command
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "verified": true,
        "ghostScore": 7500,
        "tier": "PLATINUM",
        "metrics": { ... }
      }
    }
    ```
- Caption: "B2B API verification request successful"

**Screenshot 11: Convex apiUsage Table**
- Convex Dashboard > `apiUsage`
- Show: New row with:
  - `endpoint: "/verify"`
  - `statusCode: 200`
  - `billable: true`
  - `cost: 1`
  - `agentAddress: "..."`
- Caption: "API usage tracked in Convex"

**Screenshot 12: Stripe Usage Record** (if subscription exists)
- Stripe Dashboard > Subscriptions > Usage
- Show: Usage increment
- Caption: "Stripe metered billing usage reported"

---

## Test 5: Review System

### Steps
1. Navigate to `/ghost-score/AGENT_ADDRESS`
2. Click **"Write a Review"**
3. Fill form:
   - Rating: 4 stars
   - Review: "Excellent agent! Fast and accurate responses. Highly recommended for data analysis tasks."
   - Job Category: "Data Analysis"
   - Verified Hire: ✓
4. Click **"Submit Review"**
5. Should see success toast

### Screenshots to Capture

**Screenshot 13: Review Form**
- Show: Form filled out
  - 4 stars selected
  - Review text entered
  - Job category selected
  - Verified hire checked
- Caption: "Review form ready to submit"

**Screenshot 14: Success Toast**
- Show: Toast notification:
  - "Review submitted successfully!"
  - "Reward: 0.1 GHOST tokens will be sent to your wallet!"
- Caption: "Review submission success message"

**Screenshot 15: Convex Reviews Table**
- Convex Dashboard > `reviews`
- Show: New row with:
  - `agentAddress: "..."`
  - `rating: 4`
  - `review: "Excellent agent..."`
  - `verifiedHire: true`
  - `upvotes: 0`
  - `downvotes: 0`
- Caption: "Review stored in Convex database"

**Screenshot 16: Duplicate Prevention**
- Try submitting another review for same agent
- Show: Error toast:
  - "You have already reviewed this agent"
- Caption: "Duplicate review prevention working"

---

## Test 6: Review Voting

### Steps
1. Navigate to agent profile with reviews
2. Click **upvote** button on a review
3. Counter should increment
4. Click **downvote** button on another review
5. Counter should increment

### Screenshots to Capture

**Screenshot 17: Review with Voting**
- Show: Review card with:
  - Upvote button (highlighted)
  - Upvote count: 1
  - Downvote button
- Caption: "Review voting UI"

**Screenshot 18: Convex reviewVotes Table**
- Convex Dashboard > `reviewVotes`
- Show: New row with:
  - `reviewId: "..."`
  - `userId: "..."`
  - `vote: 1` (for upvote)
- Caption: "Vote tracked in Convex"

---

## Test 7: Stripe Webhook Events

### Steps
1. With Stripe CLI running (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
2. Trigger events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.payment_succeeded
   stripe trigger invoice.payment_failed
   ```
3. Check server logs

### Screenshots to Capture

**Screenshot 19: Stripe CLI Output**
- Terminal showing:
  - Webhook events received
  - Status: 200 OK
  - Events processed successfully
- Caption: "Stripe webhooks forwarded to local server"

**Screenshot 20: Server Logs**
- Show console output:
  - "Subscription created for user XXX: pro"
  - "Payment succeeded for subscription sub_XXX"
  - "Payment failed for subscription sub_XXX"
- Caption: "Webhook events processed by server"

**Screenshot 21: Stripe Dashboard - Webhooks**
- Stripe Dashboard > Developers > Webhooks
- Show: Recent webhook deliveries
- All showing "Succeeded" status
- Caption: "Webhook delivery confirmation in Stripe"

---

## Test 8: Customer Portal

### Steps
1. Subscribe to a plan
2. Navigate to `/dashboard/ghost-score` (or wherever you add portal link)
3. Click **"Manage Subscription"**
4. Should redirect to Stripe Customer Portal
5. Can update payment method, cancel subscription, etc.

### Screenshots to Capture

**Screenshot 22: Customer Portal**
- Show: Stripe Customer Portal page
  - Current plan displayed
  - Update payment method option
  - Cancel subscription option
- Caption: "Stripe Customer Portal for subscription management"

---

## Summary of Required Screenshots

| # | Test | Screenshot |
|---|------|------------|
| 1 | B2C Checkout | Pricing page with Subscribe buttons |
| 2 | B2C Checkout | Stripe Checkout with test card |
| 3 | B2C Checkout | Convex subscriptions table |
| 4 | B2C Checkout | Stripe Dashboard payment |
| 5 | Freemium | 402 Payment Required response |
| 6 | Freemium | UpgradeModal displayed |
| 7 | Freemium | Convex verifications table (3 max) |
| 8 | Pro Unlimited | Multiple successful verifications |
| 9 | Pro Unlimited | Convex verifications (more than 3) |
| 10 | B2B API | API request/response |
| 11 | B2B API | Convex apiUsage table |
| 12 | B2B API | Stripe usage record (optional) |
| 13 | Reviews | Review form filled |
| 14 | Reviews | Success toast |
| 15 | Reviews | Convex reviews table |
| 16 | Reviews | Duplicate prevention error |
| 17 | Voting | Review with vote UI |
| 18 | Voting | Convex reviewVotes table |
| 19 | Webhooks | Stripe CLI output |
| 20 | Webhooks | Server logs |
| 21 | Webhooks | Stripe webhook delivery status |
| 22 | Portal | Customer portal page |

---

## Quick Test Script

Run all tests in sequence:

```bash
# 1. Start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook &

# 2. Start dev server
bun dev &

# 3. Open browser
open http://localhost:3000/ghost-score/pricing

# 4. Follow screenshot guide above
# 5. Take screenshots at each step
# 6. Verify all data in Convex Dashboard
# 7. Check Stripe Dashboard for payments/usage

# When done:
killall stripe
```

---

## Validation Checklist

After capturing all screenshots, verify:

- [ ] All 22 screenshots captured
- [ ] Convex shows data in all 4 tables: `subscriptions`, `verifications`, `apiUsage`, `reviews`
- [ ] Stripe Dashboard shows payments and usage
- [ ] No console errors during testing
- [ ] All API responses are correct (200, 402, etc.)
- [ ] Webhook events logged successfully
- [ ] Review system prevents duplicates
- [ ] Freemium enforcement works after 3 verifications
- [ ] Pro users have unlimited access
- [ ] B2B API tracks billable requests

---

**Ready to test!** Follow this guide step-by-step and capture all screenshots for proof of completion.
