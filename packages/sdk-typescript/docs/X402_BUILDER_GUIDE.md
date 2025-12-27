# x402 Payment Protocol - Builder Guide

## Overview

The x402 protocol enables instant micropayments between clients and AI agents using HTTP 402
(Payment Required) status codes. This guide shows builders how to implement both sides: **paying for
services** and **accepting payments**.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Client Side: Making Payments](#client-side-making-payments)
3. [Server Side: Accepting Payments](#server-side-accepting-payments)
4. [Payment Verification](#payment-verification)
5. [Error Handling](#error-handling)
6. [Production Checklist](#production-checklist)

---

## Quick Start

### Installation

```bash
bun install @ghostspeak/sdk
```

### Environment Setup

```bash
# For Devnet testing
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_CROSSMINT_API_KEY=ck_staging_...

# Token Addresses (Devnet)
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

---

## Client Side: Making Payments

### Option 1: Using Crossmint Wallet (Recommended for Web Apps)

```typescript
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner';

function PayAgentButton() {
  const { sendTokens, isConnected } = useCrossmintSigner();

  const payAgent = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Make payment to agent
      const result = await sendTokens(
        'AGENT_WALLET_ADDRESS', // Agent's Solana address
        'usdc', // Token type
        '0.0025' // Amount in decimal form
      );

      // Extract signature from explorer link
      const signatureMatch = result.explorerLink.match(/\/tx\/([^?]+)/);
      const signature = signatureMatch ? signatureMatch[1] : null;

      // Call agent endpoint with payment proof
      const response = await fetch('https://agent-endpoint.com/api/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Signature': signature,
          'X-Payment-Amount': '2500', // Amount in base units (e.g., 0.0025 USDC = 2500 base units)
        },
        body: JSON.stringify({
          query: 'Your request to the agent',
        }),
      });

      const data = await response.json();
      console.log('Agent response:', data);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  return (
    <button onClick={payAgent} disabled={!isConnected}>
      Pay & Use Agent
    </button>
  );
}
```

### Option 2: Using SDK X402Client (For Node.js/CLI)

```typescript
import { X402Client, USDC_MINTS } from '@ghostspeak/sdk';
import { createSolanaRpc } from '@solana/kit';
import { generateKeyPairSigner } from '@solana/signers';

// Setup
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const wallet = await generateKeyPairSigner(); // or load from file
const x402 = new X402Client(rpc, wallet);

// Make payment
const paymentRequest = x402.createPaymentRequest({
  amount: 2500n, // USDC base units (6 decimals)
  token: USDC_MINTS.devnet,
  description: 'AI service payment',
});

const receipt = await x402.pay(paymentRequest);

// Call agent with payment proof
const agentResponse = await fetch('https://agent.example.com/api', {
  method: 'POST',
  headers: {
    'X-Payment-Signature': receipt.signature,
    'X-Payment-Amount': paymentRequest.amount.toString(),
  },
  body: JSON.stringify({ query: 'Process this data' }),
});
```

---

## Server Side: Accepting Payments

### Express/Node.js Example

```typescript
import express from 'express';
import { createSolanaRpc } from '@solana/kit';
import { X402Client } from '@ghostspeak/sdk';

const app = express();
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const x402 = new X402Client(rpc);

app.post('/api/service', async (req, res) => {
  try {
    // 1. Check payment headers
    const signature = req.headers['x-payment-signature'];
    const amount = req.headers['x-payment-amount'];

    if (!signature || !amount) {
      return res.status(402).json({
        error: 'Payment required',
        paymentAddress: process.env.AGENT_WALLET_ADDRESS,
        amount: '2500', // USDC base units
        token: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet
        blockchain: 'solana',
      });
    }

    // 2. Verify payment on-chain
    const verification = await x402.verifyPayment(signature as string);

    if (!verification.valid) {
      return res.status(402).json({ error: 'Invalid payment signature' });
    }

    // 3. Verify amount and recipient
    const expectedAmount = 2500n; // Your service price
    const expectedRecipient = process.env.AGENT_WALLET_ADDRESS;

    if (verification.receipt!.amount < expectedAmount) {
      return res.status(402).json({ error: 'Insufficient payment amount' });
    }

    if (verification.receipt!.recipient !== expectedRecipient) {
      return res.status(402).json({ error: 'Payment sent to wrong address' });
    }

    // 4. Process request (payment verified!)
    const result = await processAgentRequest(req.body.query);

    res.json({
      success: true,
      response: result,
      paymentVerified: true,
      paymentSignature: signature,
    });
  } catch (error) {
    res.status(500).json({ error: 'Processing failed' });
  }
});

app.listen(3000);
```

### Next.js API Route Example

```typescript
// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSolanaRpc } from '@solana/kit';
import { X402Client } from '@ghostspeak/sdk';

const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
const x402 = new X402Client(rpc);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-payment-signature');
  const amount = req.headers.get('x-payment-amount');

  // Require payment
  if (!signature || !amount) {
    return NextResponse.json(
      {
        error: 'Payment required',
        payment: {
          address: process.env.NEXT_PUBLIC_AGENT_ADDRESS!,
          amount: '2500',
          token: process.env.NEXT_PUBLIC_USDC_MINT!,
          blockchain: 'solana',
        },
      },
      { status: 402 }
    );
  }

  // Verify payment
  const verification = await x402.verifyPayment(signature);
  if (!verification.valid) {
    return NextResponse.json({ error: 'Invalid payment' }, { status: 402 });
  }

  // Process request
  const body = await req.json();
  const result = await yourAIFunction(body.query);

  return NextResponse.json({
    success: true,
    data: result,
    paymentVerified: true,
  });
}
```

---

## Payment Verification

### On-Chain Verification (Recommended)

```typescript
import { X402Client } from '@ghostspeak/sdk';
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
const x402 = new X402Client(rpc);

async function verifyPayment(signature: string) {
  const result = await x402.verifyPayment(signature);

  if (!result.valid) {
    console.error('Payment verification failed:', result.error);
    return false;
  }

  // Check payment details
  const { receipt } = result;
  console.log('Payment verified:', {
    amount: receipt!.amount,
    token: receipt!.token,
    recipient: receipt!.recipient,
    timestamp: new Date(receipt!.timestamp),
  });

  return true;
}
```

### Manual Verification

```typescript
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.devnet.solana.com');

async function manualVerifyPayment(signature: string) {
  // 1. Get transaction from blockchain
  const tx = await rpc
    .getTransaction(signature, {
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0,
    })
    .send();

  if (!tx || tx.meta.err) {
    throw new Error('Transaction not found or failed');
  }

  // 2. Parse transfer instruction
  const instruction = tx.transaction.message.instructions.find(
    (ix: any) => ix.parsed?.type === 'transfer' || ix.parsed?.type === 'transferChecked'
  );

  if (!instruction) {
    throw new Error('No transfer instruction found');
  }

  // 3. Verify details
  const info = instruction.parsed.info;
  const amount = BigInt(info.tokenAmount?.amount || info.amount || '0');
  const destination = info.destination;
  const mint = info.mint;

  return {
    amount,
    recipient: destination,
    token: mint,
    verified: true,
  };
}
```

---

## Error Handling

### Client-Side Error Handling

```typescript
import { toast } from 'sonner';

async function makePayment(agentAddress: string, amount: string) {
  try {
    const result = await sendTokens(agentAddress, 'usdc', amount);

    toast.success('Payment successful!', {
      description: 'View on explorer',
      action: {
        label: 'View',
        onClick: () => window.open(result.explorerLink, '_blank'),
      },
    });

    return result;
  } catch (error) {
    if (error.message.includes('insufficient funds')) {
      toast.error('Insufficient USDC balance');
    } else if (error.message.includes('rejected')) {
      toast.error('Payment cancelled by user');
    } else {
      toast.error(`Payment failed: ${error.message}`);
    }
    throw error;
  }
}
```

### Server-Side Error Handling

```typescript
app.post('/api/agent', async (req, res) => {
  try {
    const signature = req.headers['x-payment-signature'];

    if (!signature) {
      return res.status(402).json({
        error: 'Payment required',
        details: {
          method: 'SPL token transfer',
          address: process.env.AGENT_ADDRESS,
          amount: '2500',
          token: 'USDC',
        },
      });
    }

    const verification = await x402.verifyPayment(signature as string);

    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment verification failed',
        reason: verification.error,
        signature: signature,
      });
    }

    // Process request...
    const result = await processRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

---

## Production Checklist

### Security

- [ ] Verify payment signatures on-chain before processing requests
- [ ] Check payment amount matches expected price
- [ ] Verify payment recipient is your wallet address
- [ ] Validate token mint is expected (USDC/SOL/etc.)
- [ ] Rate limit requests to prevent abuse
- [ ] Log all payment verifications for audit

### Performance

- [ ] Cache verified payments to avoid duplicate verification
- [ ] Use connection pooling for RPC requests
- [ ] Implement request queuing for high volume
- [ ] Monitor RPC usage and costs

### User Experience

- [ ] Show clear payment requirements when returning 402
- [ ] Display payment confirmation with explorer link
- [ ] Handle wallet connection errors gracefully
- [ ] Provide clear error messages

### Testing

- [ ] Test with Devnet USDC before mainnet
- [ ] Test payment verification logic
- [ ] Test error scenarios (insufficient funds, wrong recipient, etc.)
- [ ] Load test with multiple concurrent payments

---

## Token Addresses

### Devnet

```typescript
const DEVNET_TOKENS = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  PYUSD: 'CXk2AMBfi3TwaEL2468xG2xL3j7iMQ4XZgd2fNKd4x7p',
  SOL: 'native', // Use native SOL
};
```

### Mainnet (Q4 2025)

```typescript
const MAINNET_TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  PYUSD: '2b1kV6DkPAnxd5ixpW2zbWJFZcv7BZRztXKEVJUfkS3',
  SOL: 'native',
};
```

---

## Complete Example: AI Agent Service

```typescript
// server.ts - Complete agent implementation
import express from 'express';
import { X402Client, createSolanaRpc } from '@ghostspeak/sdk';
import { processAIRequest } from './ai-model';

const app = express();
const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
const x402 = new X402Client(rpc);

const AGENT_CONFIG = {
  address: process.env.AGENT_WALLET_ADDRESS!,
  pricePerCall: 2500n, // 0.0025 USDC
  token: process.env.USDC_MINT!,
};

app.use(express.json());

app.post('/api/process', async (req, res) => {
  const signature = req.headers['x-payment-signature'] as string;
  const amount = req.headers['x-payment-amount'] as string;

  // Check if payment provided
  if (!signature || !amount) {
    return res.status(402).json({
      error: 'Payment required',
      payment: {
        address: AGENT_CONFIG.address,
        amount: AGENT_CONFIG.pricePerCall.toString(),
        token: AGENT_CONFIG.token,
        blockchain: 'solana',
        description: 'AI processing service - 0.0025 USDC per request',
      },
    });
  }

  // Verify payment
  const verification = await x402.verifyPayment(signature);

  if (!verification.valid) {
    return res.status(402).json({
      error: 'Invalid payment',
      details: verification.error,
    });
  }

  // Verify amount and recipient
  const receipt = verification.receipt!;
  if (receipt.amount < AGENT_CONFIG.pricePerCall) {
    return res.status(402).json({
      error: 'Insufficient payment',
      expected: AGENT_CONFIG.pricePerCall.toString(),
      received: receipt.amount.toString(),
    });
  }

  if (receipt.recipient !== AGENT_CONFIG.address) {
    return res.status(402).json({
      error: 'Payment sent to wrong address',
      expected: AGENT_CONFIG.address,
      received: receipt.recipient,
    });
  }

  // Process request
  try {
    const result = await processAIRequest(req.body.query);

    res.json({
      success: true,
      data: result,
      payment: {
        verified: true,
        signature,
        amount: receipt.amount.toString(),
        timestamp: receipt.timestamp,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Processing failed',
      paymentStillValid: true,
      refundAvailable: false,
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('x402 AI Agent running on port', process.env.PORT || 3000);
});
```

---

## Additional Resources

- [SDK API Documentation](../README.md)
- [x402 Protocol Specification](https://www.x402.org)
- [GhostSpeak GitHub](https://github.com/ghostspeak/ghostspeak)
- [Crossmint Documentation](https://docs.crossmint.com)
- [Solana Web3.js v2 Guide](https://github.com/solana-labs/solana-web3.js)

---

## Support

Questions? Join our Discord or open an issue on GitHub.

- Discord: https://discord.gg/ghostspeak
- GitHub Issues: https://github.com/ghostspeak/ghostspeak/issues
