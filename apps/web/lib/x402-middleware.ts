/**
 * x402 Payment Required Middleware
 *
 * Returns 402 Payment Required if no valid payment is included in the request.
 * Verifies payment signatures on-chain using Solana RPC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentTransaction, isTransactionUsed } from './solana/payment-verification'

export interface X402PaymentInfo {
  recipientAddress: string
  priceUsdc: number
  acceptedTokens: string[]
  paymentEndpoint?: string
}

/**
 * Check if request has valid x402 payment
 * Returns the payment signature if valid, null otherwise
 *
 * Supports both v2 (PAYMENT-SIGNATURE) and v1 (X-Payment-Signature) headers
 */
export function getPaymentFromRequest(req: NextRequest): string | null {
  // Check for v2 header (PAYMENT-SIGNATURE)
  const v2PaymentSignature =
    req.headers.get('PAYMENT-SIGNATURE') || req.headers.get('payment-signature')
  if (v2PaymentSignature) {
    return v2PaymentSignature
  }

  // Check for v1 header (X-Payment-Signature) - backward compatibility
  const v1PaymentSignature = req.headers.get('X-Payment-Signature')
  if (v1PaymentSignature) {
    return v1PaymentSignature
  }

  // Check for payment in query params (for GET requests)
  const url = new URL(req.url)
  const queryPayment = url.searchParams.get('payment_signature')
  if (queryPayment) {
    return queryPayment
  }

  return null
}

/**
 * Create 402 Payment Required response
 */
export function createPaymentRequiredResponse(
  paymentInfo: X402PaymentInfo,
  message?: string
): NextResponse {
  const caisperAddress = process.env.CAISPER_WALLET_ADDRESS || paymentInfo.recipientAddress

  return NextResponse.json(
    {
      error: 'Payment Required',
      message: message || 'This endpoint requires x402 payment to access.',
      payment: {
        recipient: caisperAddress,
        amount: paymentInfo.priceUsdc.toString(),
        currency: 'USDC',
        acceptedTokens: paymentInfo.acceptedTokens,
        network: 'solana',
        cluster: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
      },
      instructions: {
        method: 'Include PAYMENT-SIGNATURE header with valid Solana transaction signature',
        example: 'PAYMENT-SIGNATURE: <transaction_signature>',
        docs: 'https://ghostspeak.ai/docs/x402',
        legacy: 'X-Payment-Signature header also supported (v1 compatibility)',
      },
    },
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'PAYMENT-REQUIRED': 'true',
        'PAYMENT-RECIPIENT': caisperAddress,
        'PAYMENT-AMOUNT': paymentInfo.priceUsdc.toString(),
        'PAYMENT-CURRENCY': 'USDC',
        // v1 compatibility headers
        'X-Payment-Required': 'true',
        'X-Payment-Recipient': caisperAddress,
        'X-Payment-Amount': paymentInfo.priceUsdc.toString(),
        'X-Payment-Currency': 'USDC',
      },
    }
  )
}

/**
 * Middleware wrapper for x402 protected routes
 *
 * Usage:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const paymentCheck = await requireX402Payment(req, { priceUsdc: 0.001 })
 *   if (paymentCheck) return paymentCheck // Returns 402 if no payment
 *
 *   // ... rest of handler
 * }
 * ```
 */
export async function requireX402Payment(
  req: NextRequest,
  options: Partial<X402PaymentInfo> & { priceUsdc: number },
  convexClient?: any // Optional Convex client for replay protection
): Promise<NextResponse | null> {
  const paymentSignature = getPaymentFromRequest(req)

  if (!paymentSignature) {
    return createPaymentRequiredResponse({
      recipientAddress: options.recipientAddress || process.env.CAISPER_WALLET_ADDRESS || '',
      priceUsdc: options.priceUsdc,
      acceptedTokens: options.acceptedTokens || ['USDC', 'SOL'],
    })
  }

  // Check for replay attacks if Convex client is provided
  if (convexClient) {
    const isUsed = await isTransactionUsed(paymentSignature, convexClient)
    if (isUsed) {
      return NextResponse.json(
        {
          error: 'Payment Already Used',
          message: 'This transaction signature has already been used for a previous request.',
        },
        { status: 402 }
      )
    }
  }

  // Verify payment on-chain
  const recipientAddress = options.recipientAddress || process.env.CAISPER_WALLET_ADDRESS || ''
  const verificationResult = await verifyPaymentTransaction(
    paymentSignature,
    recipientAddress,
    options.priceUsdc
  )

  if (!verificationResult.valid) {
    return NextResponse.json(
      {
        error: 'Invalid Payment',
        message: verificationResult.error || 'Payment verification failed',
        payment: {
          recipient: recipientAddress,
          amount: options.priceUsdc.toString(),
          currency: 'USDC',
        },
      },
      { status: 402 }
    )
  }

  console.log(`x402: Payment verified successfully:`, {
    signature: paymentSignature.slice(0, 20),
    amount: verificationResult.details?.amount,
    payer: verificationResult.details?.payer,
  })

  return null // Payment valid, continue to handler
}
