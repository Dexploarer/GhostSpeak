/**
 * x402 Payment Required Middleware
 *
 * Returns 402 Payment Required if no valid payment is included in the request.
 * For now, checks for X-Payment-Signature header as proof of payment.
 *
 * Future: Integrate with actual payment verification via PayAI/Solana
 */

import { NextRequest, NextResponse } from 'next/server'

export interface X402PaymentInfo {
    recipientAddress: string
    priceUsdc: number
    acceptedTokens: string[]
    paymentEndpoint?: string
}

/**
 * Check if request has valid x402 payment
 * Returns the payment signature if valid, null otherwise
 */
export function getPaymentFromRequest(req: NextRequest): string | null {
    // Check for payment signature in headers
    const paymentSignature = req.headers.get('X-Payment-Signature')
    if (paymentSignature) {
        // TODO: Verify signature on-chain
        return paymentSignature
    }

    // Check for payment in query params (for GET requests)
    const url = new URL(req.url)
    const queryPayment = url.searchParams.get('payment_signature')
    if (queryPayment) {
        // TODO: Verify signature on-chain
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
                method: 'Include X-Payment-Signature header with valid Solana transaction signature',
                example: 'X-Payment-Signature: <transaction_signature>',
                docs: 'https://ghostspeak.ai/docs/x402',
            },
        },
        {
            status: 402,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
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
 *   const paymentCheck = requireX402Payment(req, { priceUsdc: 0.001 })
 *   if (paymentCheck) return paymentCheck // Returns 402 if no payment
 *
 *   // ... rest of handler
 * }
 * ```
 */
export function requireX402Payment(
    req: NextRequest,
    options: Partial<X402PaymentInfo> & { priceUsdc: number }
): NextResponse | null {
    const paymentSignature = getPaymentFromRequest(req)

    if (!paymentSignature) {
        return createPaymentRequiredResponse({
            recipientAddress: options.recipientAddress || process.env.CAISPER_WALLET_ADDRESS || '',
            priceUsdc: options.priceUsdc,
            acceptedTokens: options.acceptedTokens || ['USDC', 'SOL'],
        })
    }

    // TODO: Actually verify the payment on-chain
    // For now, any signature is accepted (development mode)
    console.log(`x402: Payment signature provided: ${paymentSignature.slice(0, 20)}...`)

    return null // Payment valid, continue to handler
}
