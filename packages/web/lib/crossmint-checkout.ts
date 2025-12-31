/**
 * Crossmint Checkout Integration for Ghost Score Verifications
 *
 * Handles fiat-to-crypto payments:
 * - User pays $1.03 via credit card
 * - Crossmint takes 3% fee ($0.03)
 * - Protocol receives 1 USDC
 * - Payment triggers on-chain verification grant
 *
 * Flow:
 * 1. Create checkout order for 1 USDC payment
 * 2. User completes payment via Crossmint UI
 * 3. Webhook confirms payment
 * 4. Smart contract grants verification to user
 */

import crypto from 'crypto'

export interface CrossmintCheckoutConfig {
  /** Crossmint API key (server-side) */
  apiKey: string
  /** Crossmint API base URL */
  apiUrl: string
  /** Your webhook URL for payment notifications */
  webhookUrl: string
  /** GhostSpeak protocol wallet to receive USDC */
  recipientWallet: string
}

export interface CheckoutOrderParams {
  /** User's email for receipt */
  userEmail: string
  /** User's Solana wallet address */
  userWallet: string
  /** Agent address being verified */
  agentAddress: string
  /** Network - 'solana' for mainnet */
  network?: 'solana' | 'solana-devnet'
}

export interface CheckoutOrderResponse {
  /** Crossmint order ID */
  orderId: string
  /** Order status */
  phase: 'payment' | 'delivery' | 'completed' | 'failed'
  /** Checkout URL for user */
  checkoutUrl?: string
  /** Payment details */
  payment?: {
    status: string
    transactionHash?: string
  }
}

/**
 * Create a Crossmint checkout order for Ghost Score verification
 *
 * @param config - Crossmint configuration
 * @param params - Order parameters
 * @returns Checkout order response with checkout URL
 */
export async function createVerificationCheckout(
  config: CrossmintCheckoutConfig,
  params: CheckoutOrderParams
): Promise<CheckoutOrderResponse> {
  const { apiKey, apiUrl, recipientWallet, webhookUrl } = config
  const { userEmail, userWallet, agentAddress, network = 'solana' } = params

  // Create order payload for 1 USDC payment
  const payload = {
    recipient: {
      email: userEmail,
      walletAddress: userWallet,
    },
    payment: {
      method: network === 'solana-devnet' ? 'solana-devnet' : 'solana',
      currency: 'usdc',
      amount: '1.00', // 1 USDC (user pays $1.03 with fee)
    },
    lineItems: [
      {
        metadata: {
          type: 'ghost_score_verification',
          agentAddress,
          userWallet,
          network,
        },
        productName: 'Ghost Score Verification',
        productDescription: `Verify AI agent ${agentAddress.slice(0, 8)}...${agentAddress.slice(-6)}`,
        price: '1.00',
        quantity: 1,
      },
    ],
    metadata: {
      agentAddress,
      userWallet,
      verificationType: 'ghost_score',
    },
    locale: 'en-US',
    successCallbackUrl: `${webhookUrl.replace('/api/crossmint/webhook', '')}/dashboard/ghost-score?payment=success`,
    failureCallbackUrl: `${webhookUrl.replace('/api/crossmint/webhook', '')}/dashboard/ghost-score?payment=failed`,
  }

  const response = await fetch(`${apiUrl}/api/2022-06-09/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create checkout: ${error.message || response.statusText}`)
  }

  const data = await response.json()

  return {
    orderId: data.orderId,
    phase: data.phase,
    checkoutUrl: data.checkoutUrl,
    payment: data.payment,
  }
}

/**
 * Get order status from Crossmint
 *
 * @param config - Crossmint configuration
 * @param orderId - Crossmint order ID
 * @returns Order status
 */
export async function getOrderStatus(
  config: CrossmintCheckoutConfig,
  orderId: string
): Promise<CheckoutOrderResponse> {
  const { apiKey, apiUrl } = config

  const response = await fetch(`${apiUrl}/api/2022-06-09/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get order status: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    orderId: data.orderId,
    phase: data.phase,
    payment: data.payment,
  }
}

/**
 * Verify Crossmint webhook signature
 *
 * @param payload - Raw webhook payload
 * @param signature - Signature from X-Crossmint-Signature header
 * @param secret - Webhook secret from Crossmint dashboard
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    const expectedSignature = hmac.update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

/**
 * Parse Crossmint webhook event
 */
export interface CrossmintWebhookEvent {
  type: 'order.completed' | 'order.failed' | 'payment.completed'
  orderId: string
  metadata?: {
    agentAddress?: string
    userWallet?: string
    verificationType?: string
  }
  payment?: {
    status: string
    transactionHash?: string
    amount?: string
    currency?: string
  }
}

/**
 * Poll order status until completion
 * Useful for client-side payment confirmation
 *
 * @param config - Crossmint configuration
 * @param orderId - Order ID to poll
 * @param maxAttempts - Maximum polling attempts (default: 60 = 3 minutes)
 * @param intervalMs - Polling interval in milliseconds (default: 3000)
 * @returns Completed order
 */
export async function pollOrderCompletion(
  config: CrossmintCheckoutConfig,
  orderId: string,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<CheckoutOrderResponse> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const order = await getOrderStatus(config, orderId)

    if (order.phase === 'completed') {
      return order
    }

    if (order.phase === 'failed') {
      throw new Error('Order payment failed')
    }

    attempts++
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Order polling timeout - payment not completed')
}

/**
 * Client-side checkout initialization
 * Returns checkout URL for redirect or iframe
 */
export async function initializeCheckout(params: {
  userEmail: string
  userWallet: string
  agentAddress: string
}): Promise<{ checkoutUrl: string; orderId: string }> {
  // Call our API route which has access to server-side API keys
  const response = await fetch('/api/crossmint/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to initialize checkout')
  }

  const data = await response.json()
  return {
    checkoutUrl: data.checkoutUrl,
    orderId: data.orderId,
  }
}
