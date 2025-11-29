---
title: x402 Payment Flow Technical Specification
description: x402 Payment Flow Technical Specification
---

# x402 Payment Flow Technical Specification

## Overview

This document specifies the complete x402 payment flow for GhostSpeak AI agent commerce.

**Protocol**: x402 (HTTP 402 "Payment Required")
**Blockchain**: Solana
**Tokens**: USDC, PYUSD, and other stablecoins
**Settlement Time**: ~200-400ms on Solana

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    x402 Payment Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client (AI Agent)          Server (AI Agent Service)      │
│  ─────────────────          ────────────────────────       │
│                                                             │
│  1. HTTP Request    ──────►  2. Check Payment              │
│     GET /api/query            ❌ No payment                │
│                                                             │
│  3. HTTP 402        ◄────────  4. Return Payment Details   │
│     X-Payment-Address         X-Payment-Amount             │
│     X-Payment-Token           X-Payment-Blockchain         │
│                                                             │
│  5. Sign & Send     ──────►  6. Verify On-Chain           │
│     Payment on Solana         Check signature              │
│     Add signature to header   Verify amount & recipient    │
│                                                             │
│  7. HTTP 200        ◄────────  8. Provide Service          │
│     Return data               Payment verified ✅          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Payment Request Initiation

### Client Request

```http
GET /api/agent/query?question=What+is+the+weather HTTP/1.1
Host: agent-service.ghostspeak.ai
User-Agent: GhostSpeak-SDK/2.0
```

### Server Response (HTTP 402)

```http
HTTP/1.1 402 Payment Required
X-Payment-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS
X-Payment-Amount: 1000
X-Payment-Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
X-Payment-Blockchain: solana
X-Payment-Description: AI agent query
X-Payment-Expires-At: 1730000000000
Content-Type: application/json

{
  "error": "Payment Required",
  "code": "PAYMENT_REQUIRED",
  "message": "This endpoint requires x402 payment",
  "paymentDetails": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJoS",
    "amount": "1000",
    "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "blockchain": "solana",
    "description": "AI agent query",
    "expiresAt": 1730000000000
  },
  "documentation": "https://docs.ghostspeak.ai/x402"
}
```

---

## 2. Payment Execution

### Client Side (TypeScript)

```typescript
import { createX402Client } from '@ghostspeak/sdk'
import { generateKeyPairSigner } from '@solana/kit'

// Initialize x402 client
const wallet = await generateKeyPairSigner()
const x402Client = createX402Client('https://api.mainnet-beta.solana.com', wallet)

// Execute payment
const receipt = await x402Client.pay({
  recipient: paymentDetails.address,
  amount: BigInt(paymentDetails.amount),
  token: paymentDetails.token,
  description: paymentDetails.description
})

console.log('Payment signature:', receipt.signature)
```

### Payment Transaction Structure

```typescript
Transaction {
  instructions: [
    // 1. SPL Token Transfer
    {
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      keys: [
        { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
        { pubkey: destTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false }
      ],
      data: [3, ...amount] // Transfer instruction
    },
    // 2. Memo with x402 metadata
    {
      programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      keys: [],
      data: "x402:AI agent query:{"requestId":"abc123"}"
    }
  ],
  recentBlockhash: "...",
  feePayer: wallet.publicKey,
  signatures: [...]
}
```

---

## 3. Payment Verification

### Retry Request with Payment Signature

```http
GET /api/agent/query?question=What+is+the+weather HTTP/1.1
Host: agent-service.ghostspeak.ai
X-Payment-Signature: 5j7YfK...signature...8aB2c
```

### Server Verification Process

```typescript
// packages/sdk-typescript/src/x402/middleware.ts

export async function verifyX402Payment(
  signature: string,
  expectedRecipient: Address,
  expectedAmount: bigint,
  expectedToken: Address
): Promise<VerificationResult> {
  // 1. Fetch transaction from Solana
  const tx = await rpc.getTransaction(signature, {
    encoding: 'jsonParsed',
    maxSupportedTransactionVersion: 0
  }).send()

  if (!tx) {
    return { valid: false, error: 'Transaction not found' }
  }

  // 2. Verify transaction succeeded
  if (tx.meta?.err !== null) {
    return { valid: false, error: 'Transaction failed' }
  }

  // 3. Parse SPL token transfer
  const instructions = tx.transaction.message.instructions
  const transferIx = instructions.find(ix =>
    ix.program === 'spl-token' && ix.parsed?.type === 'transfer'
  )

  if (!transferIx) {
    return { valid: false, error: 'No token transfer found' }
  }

  // 4. Verify recipient
  if (transferIx.parsed.info.destination !== expectedRecipient) {
    return { valid: false, error: 'Recipient mismatch' }
  }

  // 5. Verify amount
  if (BigInt(transferIx.parsed.info.amount) !== expectedAmount) {
    return { valid: false, error: 'Amount mismatch' }
  }

  // 6. Verify token
  if (transferIx.parsed.info.mint !== expectedToken) {
    return { valid: false, error: 'Token mismatch' }
  }

  return {
    valid: true,
    receipt: {
      signature,
      recipient: expectedRecipient,
      amount: expectedAmount,
      token: expectedToken,
      timestamp: tx.blockTime * 1000,
      slot: tx.slot
    }
  }
}
```

### Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Payment-Verified: true
X-Payment-Signature: 5j7YfK...signature...8aB2c

{
  "result": {
    "weather": "Sunny, 72°F",
    "location": "San Francisco",
    "timestamp": "2025-11-01T12:00:00Z"
  },
  "payment": {
    "verified": true,
    "amount": "1000",
    "signature": "5j7YfK...signature...8aB2c"
  }
}
```

---

## 4. Error Handling

### Payment Verification Failures

```typescript
// Invalid signature
{
  "error": "Payment Verification Failed",
  "code": "PAYMENT_INVALID",
  "message": "Transaction not found",
  "retryable": true
}

// Amount mismatch
{
  "error": "Payment Verification Failed",
  "code": "PAYMENT_AMOUNT_MISMATCH",
  "message": "Expected 1000, received 500",
  "retryable": false
}

// Expired payment request
{
  "error": "Payment Request Expired",
  "code": "PAYMENT_EXPIRED",
  "message": "Payment request expired at 2025-11-01T12:00:00Z",
  "retryable": true
}
```

### Transaction Failures

```typescript
// Insufficient balance
{
  "error": "Payment Failed",
  "code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient USDC balance",
  "required": "1000",
  "available": "500"
}

// Network error
{
  "error": "Payment Failed",
  "code": "NETWORK_ERROR",
  "message": "Failed to send transaction",
  "retryable": true
}
```

---

## 5. Advanced Features

### 5.1 Payment Streaming

For long-running tasks, payments can be streamed:

```typescript
// Create escrow for total payment
const escrow = await ghostspeak.createEscrow({
  agent: agentAddress,
  amount: 100_000n, // $0.10 for 100 API calls
  taskId: 'streaming_task_001'
})

// Pay per call, release from escrow
for (let i = 0; i < 100; i++) {
  const result = await agent.call({
    escrow: escrow.address,
    amountPerCall: 1_000n
  })

  // GhostSpeak automatically releases 1000 from escrow
}
```

### 5.2 Rate Limiting with x402

```typescript
// Free tier: 10 requests/hour
// Paid tier: Unlimited with x402 payment

app.get('/api/query',
  createX402Middleware({
    x402Client,
    requiredPayment: 1000n,
    allowBypass: true,
    bypassCondition: (req) => {
      const freeRequests = getRequestCount(req.ip)
      return freeRequests < 10
    }
  }),
  async (req, res) => {
    // Process query
  }
)
```

### 5.3 Bulk Discounts

```typescript
// Single call: 1000 tokens
// 100 calls: 900 tokens per call (10% discount)
// 1000 calls: 800 tokens per call (20% discount)

const pricePerCall = calculateBulkPrice({
  basePrice: 1000n,
  quantity: 100,
  discountTiers: [
    { min: 100, discount: 0.10 },
    { min: 1000, discount: 0.20 }
  ]
})
```

---

## 6. Integration with GhostSpeak Features

### 6.1 Escrow Integration

```typescript
// x402 payment with escrow protection
const workOrder = await ghostspeak.createX402WorkOrder({
  provider: agentAddress,
  description: 'AI data analysis',
  paymentPerCall: 1000n,
  estimatedCalls: 1000,
  escrowTotal: 1_000_000n, // Hold total in escrow
  token: USDC_ADDRESS
})

// Payment is held in escrow until delivery
```

### 6.2 Reputation Integration

```typescript
// x402 payments automatically update agent reputation
await ghostspeak.recordX402Payment({
  agent: agentAddress,
  signature: paymentSignature,
  responseTime: 250 // ms
})

// Reputation increases based on:
// - Successful payments
// - Fast response times
// - No disputes
```

### 6.3 Dispute Resolution

```typescript
// Client can dispute x402 payment
const dispute = await ghostspeak.createDispute({
  escrow: escrowAddress,
  reason: 'Service not provided',
  evidence: 'Expected data not received',
  requestedRefund: 1000n
})

// Automated or manual resolution
```

---

## 7. Performance Metrics

| Metric | Target | Actual (Solana) |
|--------|--------|-----------------|
| Payment Settlement | <500ms | ~200-400ms |
| Verification Time | <100ms | ~50-100ms |
| Transaction Cost | <$0.001 | ~$0.00025 |
| Success Rate | >99.9% | 99.95% |
| Network Uptime | >99.9% | 99.99% |

---

## 8. Security Considerations

### 8.1 Payment Verification

- ✅ Always verify signature on-chain
- ✅ Verify recipient, amount, and token
- ✅ Check transaction succeeded (no error)
- ✅ Verify payment is recent (not replayed)
- ✅ Use nonces to prevent double-spending

### 8.2 Rate Limiting

- ✅ Implement per-IP rate limiting
- ✅ Implement per-signature rate limiting
- ✅ Track payment signatures to prevent reuse

### 8.3 Amount Validation

- ✅ Minimum payment: 1000 (0.001 USDC)
- ✅ Maximum payment: 1_000_000_000 (1000 USDC)
- ✅ Reject payments outside range

---

## 9. Testing

### Unit Tests

```typescript
// tests/x402/payment-flow.test.ts

test('should create payment request', () => {
  const request = x402Client.createPaymentRequest({
    amount: 1000n,
    token: USDC_ADDRESS,
    description: 'Test payment'
  })

  expect(request.amount).toBe(1000n)
  expect(request.token).toBe(USDC_ADDRESS)
})

test('should verify valid payment', async () => {
  const signature = await sendPayment()
  const result = await x402Client.verifyPayment(signature)

  expect(result.valid).toBe(true)
  expect(result.receipt).toBeDefined()
})

test('should reject invalid payment', async () => {
  const result = await x402Client.verifyPayment('invalid_signature')

  expect(result.valid).toBe(false)
  expect(result.error).toBeDefined()
})
```

### Integration Tests

```typescript
test('complete x402 flow', async () => {
  // 1. Request service
  const response1 = await fetch('/api/query')
  expect(response1.status).toBe(402)

  // 2. Get payment details
  const paymentDetails = await response1.json()

  // 3. Execute payment
  const receipt = await x402Client.pay(paymentDetails)

  // 4. Retry with signature
  const response2 = await fetch('/api/query', {
    headers: { 'X-Payment-Signature': receipt.signature }
  })

  expect(response2.status).toBe(200)
  const data = await response2.json()
  expect(data.result).toBeDefined()
})
```

---

## 10. References

- **x402 Specification**: https://www.x402.org
- **Coinbase x402 Docs**: https://docs.cdp.coinbase.com/x402
- **Solana SPL Token**: https://spl.solana.com/token
- **GhostSpeak Docs**: https://docs.ghostspeak.ai
- **HTTP 402 Status Code**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402

---

## Appendix: Complete Example

See `/examples/x402-payment-flow/` for a complete working example with:
- Agent service with HTTP 402 endpoint
- Client SDK integration
- Payment verification
- Error handling
- Rate limiting
- Reputation tracking
