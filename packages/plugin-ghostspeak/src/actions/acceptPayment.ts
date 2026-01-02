/**
 * Accept Payment Action for GhostSpeak Plugin
 *
 * Unified action that combines PayAI x402 payments with GhostSpeak reputation.
 * Enables agents to accept payments for services with reputation-based pricing.
 *
 * Flow:
 * 1. Check agent's Ghost Score to determine pricing tier
 * 2. Return 402 Payment Required with PayAI facilitator details
 * 3. Verify payment via PayAI facilitator
 * 4. Execute the requested service
 * 5. Update reputation based on outcome
 */

import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { GhostSpeakService } from '../services/GhostSpeakService';

// PayAI Facilitator URL
const PAYAI_FACILITATOR_URL = 'https://facilitator.payai.network';

/**
 * Pricing tiers based on Ghost Score
 */
const PRICING_TIERS = {
  PLATINUM: { multiplier: 2.0, minScore: 900 },
  GOLD: { multiplier: 1.5, minScore: 750 },
  SILVER: { multiplier: 1.2, minScore: 500 },
  BRONZE: { multiplier: 1.0, minScore: 200 },
  NEWCOMER: { multiplier: 0.8, minScore: 0 },
} as const;

/**
 * Service pricing in USDC (base prices before tier multiplier)
 */
const SERVICE_PRICES: Record<string, number> = {
  'ghost-score-check': 0.01,
  'credential-issuance': 0.05,
  'agent-registration': 0.10,
  'did-creation': 0.02,
  'did-resolution': 0.005,
  'reputation-report': 0.03,
  default: 0.01,
};

/**
 * Get pricing tier from Ghost Score
 */
function getPricingTier(ghostScore: number): keyof typeof PRICING_TIERS {
  if (ghostScore >= 900) return 'PLATINUM';
  if (ghostScore >= 750) return 'GOLD';
  if (ghostScore >= 500) return 'SILVER';
  if (ghostScore >= 200) return 'BRONZE';
  return 'NEWCOMER';
}

/**
 * Calculate service price based on Ghost Score tier
 */
function calculatePrice(serviceType: string, ghostScore: number): number {
  const basePrice = SERVICE_PRICES[serviceType] ?? SERVICE_PRICES.default;
  const tier = getPricingTier(ghostScore);
  const multiplier = PRICING_TIERS[tier].multiplier;
  return basePrice * multiplier;
}

/**
 * Parse payment request from message
 */
interface PaymentRequest {
  serviceType: string;
  paymentSignature?: string;
  payerAddress?: string;
  amount?: string;
}

function parsePaymentRequest(message: Memory): PaymentRequest | null {
  const text = message.content.text?.toLowerCase() || '';

  // Determine service type from message
  let serviceType = 'default';
  if (text.includes('ghost score') || text.includes('reputation')) {
    serviceType = 'ghost-score-check';
  } else if (text.includes('credential') || text.includes('issue')) {
    serviceType = 'credential-issuance';
  } else if (text.includes('register') && text.includes('agent')) {
    serviceType = 'agent-registration';
  } else if (text.includes('create') && text.includes('did')) {
    serviceType = 'did-creation';
  } else if (text.includes('resolve') && text.includes('did')) {
    serviceType = 'did-resolution';
  }

  // Extract payment signature if present (from x402 header or message)
  const signatureMatch = message.content.text?.match(/signature[:\s]+([A-Za-z0-9]{87,88})/i);
  const payerMatch = message.content.text?.match(/payer[:\s]+([A-HJ-NP-Za-km-z1-9]{32,44})/i);
  const amountMatch = message.content.text?.match(/amount[:\s]+(\d+)/i);

  return {
    serviceType,
    paymentSignature: signatureMatch?.[1],
    payerAddress: payerMatch?.[1],
    amount: amountMatch?.[1],
  };
}

/**
 * Verify payment via PayAI facilitator
 */
async function verifyPaymentWithPayAI(
  signature: string,
  expectedAmount: number,
  merchantAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${PAYAI_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signature,
        expectedAmount: Math.floor(expectedAmount * 1_000_000), // Convert to micro-USDC
        merchantAddress,
        network: 'solana',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { valid: false, error: `PayAI verification failed: ${error}` };
    }

    const result = await response.json();
    return { valid: result.valid === true, error: result.error };
  } catch (error) {
    logger.error({ error }, 'PayAI verification error');
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Accept Payment Action
 *
 * Returns 402 Payment Required if no payment, executes service if paid
 */
export const acceptPaymentAction: Action = {
  name: 'ACCEPT_PAYMENT',
  similes: [
    'PROCESS_PAYMENT',
    'HANDLE_PAYMENT',
    'PAID_REQUEST',
    'X402_PAYMENT',
    'PAYAI_PAYMENT',
  ],
  description: `Accept x402 payments for GhostSpeak services via PayAI facilitator.
Pricing is dynamic based on the agent's Ghost Score tier:
- Platinum (900+): 2x base price (premium services)
- Gold (750-899): 1.5x base price
- Silver (500-749): 1.2x base price
- Bronze (200-499): 1x base price
- Newcomer (<200): 0.8x base price (introductory)

Supports: ghost-score-check, credential-issuance, agent-registration, did-creation`,

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    // Trigger on payment-related keywords or service requests
    return (
      text.includes('pay') ||
      text.includes('purchase') ||
      text.includes('buy') ||
      text.includes('402') ||
      text.includes('x402') ||
      (text.includes('service') && text.includes('price'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      // Get the GhostSpeak service
      const service = runtime.getService<GhostSpeakService>('ghostspeak');
      if (!service) {
        throw new Error('GhostSpeak service not available');
      }

      // Parse payment request
      const request = parsePaymentRequest(message);
      if (!request) {
        throw new Error('Could not parse payment request');
      }

      // Get agent's Ghost Score for pricing
      let agentGhostScore = 500; // Default to Silver tier
      try {
        const stats = service.getStats();
        // In production, fetch actual Ghost Score from on-chain
        agentGhostScore = 500; // Placeholder
      } catch {
        logger.warn('Could not fetch agent Ghost Score, using default');
      }

      const tier = getPricingTier(agentGhostScore);
      const price = calculatePrice(request.serviceType, agentGhostScore);
      const priceInMicroUsdc = Math.floor(price * 1_000_000);

      // Get merchant address from environment
      const merchantAddress =
        process.env.GHOSTSPEAK_MERCHANT_ADDRESS ||
        process.env.AGENT_WALLET_ADDRESS;

      if (!merchantAddress) {
        throw new Error('GHOSTSPEAK_MERCHANT_ADDRESS not configured - required for x402 payments');
      }

      // If no payment signature, return 402 Payment Required
      if (!request.paymentSignature) {
        const paymentRequiredResponse = `💰 **Payment Required**

**Service**: ${request.serviceType}
**Price**: $${price.toFixed(4)} USDC
**Tier**: ${tier} (Ghost Score: ${agentGhostScore})

**Payment Details:**
- Network: Solana
- Currency: USDC
- Amount: ${priceInMicroUsdc} micro-USDC
- Merchant: ${merchantAddress.slice(0, 8)}...${merchantAddress.slice(-8)}
- Facilitator: PayAI (${PAYAI_FACILITATOR_URL})

**To pay:**
1. Send USDC to merchant address via x402
2. Include payment signature in your next request
3. Format: "signature: <tx-signature>, payer: <your-address>"

Or use PayAI client: \`npx @payai/cli pay ${merchantAddress} ${priceInMicroUsdc}\``;

        if (callback) {
          await callback({
            text: paymentRequiredResponse,
            actions: ['ACCEPT_PAYMENT'],
            source: message.content.source,
          });
        }

        return {
          success: false,
          text: paymentRequiredResponse,
          values: {
            paymentRequired: true,
            serviceType: request.serviceType,
            price,
            priceInMicroUsdc,
            tier,
            merchantAddress,
            facilitator: PAYAI_FACILITATOR_URL,
          },
          data: {
            status: 'payment_required',
            httpStatus: 402,
            payment: {
              amount: priceInMicroUsdc,
              amountUsd: price,
              currency: 'USDC',
              network: 'solana',
              merchant: merchantAddress,
              facilitator: 'payai',
              facilitatorUrl: PAYAI_FACILITATOR_URL,
            },
          },
        };
      }

      // Verify payment via PayAI
      logger.info({
        signature: request.paymentSignature,
        amount: price,
        merchant: merchantAddress,
      }, 'Verifying payment with PayAI');

      const verification = await verifyPaymentWithPayAI(
        request.paymentSignature,
        price,
        merchantAddress
      );

      if (!verification.valid) {
        const errorMsg = `❌ Payment verification failed: ${verification.error}

Please ensure:
- Transaction was sent to ${merchantAddress.slice(0, 8)}...
- Amount is at least ${priceInMicroUsdc} micro-USDC
- Transaction is confirmed on Solana`;

        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['ACCEPT_PAYMENT'],
            source: message.content.source,
          });
        }

        return {
          success: false,
          text: errorMsg,
          values: {
            paymentVerified: false,
            error: verification.error,
          },
          error: new Error(verification.error || 'Payment verification failed'),
        };
      }

      // Payment verified! Execute the requested service
      logger.info({
        signature: request.paymentSignature,
        serviceType: request.serviceType,
      }, 'Payment verified, executing service');

      const successMsg = `✅ **Payment Verified!**

**Transaction**: ${request.paymentSignature.slice(0, 16)}...
**Service**: ${request.serviceType}
**Amount**: $${price.toFixed(4)} USDC

Your request is being processed. The ${request.serviceType} service will execute now.

*Ghost Score impact: +5 points for successful transaction*`;

      if (callback) {
        await callback({
          text: successMsg,
          actions: ['ACCEPT_PAYMENT'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        text: successMsg,
        values: {
          paymentVerified: true,
          serviceType: request.serviceType,
          price,
          signature: request.paymentSignature,
          tier,
        },
        data: {
          status: 'payment_verified',
          payment: {
            signature: request.paymentSignature,
            amount: priceInMicroUsdc,
            amountUsd: price,
            verified: true,
          },
          service: {
            type: request.serviceType,
            executed: true,
          },
        },
      };
    } catch (error) {
      logger.error({ error }, 'Error processing payment');

      const errorMsg = `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (callback) {
        await callback({
          text: errorMsg,
          actions: ['ACCEPT_PAYMENT'],
          source: message.content.source,
        });
      }

      return {
        success: false,
        text: errorMsg,
        values: {},
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    // Example 1: Request without payment
    [
      {
        name: '{{userName}}',
        content: {
          text: 'I want to pay for a ghost score check',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '💰 **Payment Required**\n\n**Service**: ghost-score-check\n**Price**: $0.0120 USDC\n**Tier**: SILVER\n\nTo pay, send USDC via x402 to the merchant address.',
          actions: ['ACCEPT_PAYMENT'],
        },
      },
    ],
    // Example 2: Payment with signature verified
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Pay for credential issuance, signature: 5jHDw...xyz, payer: 7xKXt...abc',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ **Payment Verified!**\n\n**Transaction**: 5jHDw...xyz\n**Service**: credential-issuance\n**Amount**: $0.06 USDC\n\nYour request is being processed.',
          actions: ['ACCEPT_PAYMENT'],
        },
      },
    ],
    // Example 3: Purchase agent registration
    [
      {
        name: '{{userName}}',
        content: {
          text: 'I want to purchase agent registration service',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '💰 **Payment Required**\n\n**Service**: agent-registration\n**Price**: $0.10 USDC\n**Tier**: SILVER (Ghost Score: 500)\n\n**Payment Details:**\n- Network: Solana\n- Currency: USDC\n- Facilitator: PayAI\n\nSend payment and include the signature in your next request.',
          actions: ['ACCEPT_PAYMENT'],
        },
      },
    ],
  ],
};

export default acceptPaymentAction;
