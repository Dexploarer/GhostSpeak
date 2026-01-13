/**
 * Agent Claim API - x402 Protected + Rate Limited
 *
 * POST /api/v1/agent/claim - Claim ownership of an agent
 */

import { api } from '@/convex/_generated/api'
import { requireX402Payment } from '@/lib/x402-middleware'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const POST = withMiddleware(async (request) => {
  // Require x402 payment - $0.05 to claim (now async with on-chain verification)
  const paymentRequired = await requireX402Payment(request, { priceUsdc: 0.05 }, getConvexClient())
  if (paymentRequired) return paymentRequired

  const body = await request.json()
  const { agentAddress, claimedBy, claimTxSignature } = body

  if (!agentAddress || !claimedBy) {
    return errorResponse('Missing required fields: agentAddress, claimedBy', 400)
  }

  // Validate Solana addresses
  const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
  if (!solanaAddressRegex.test(agentAddress) || !solanaAddressRegex.test(claimedBy)) {
    return errorResponse('Invalid Solana address format', 400)
  }

  // Check if agent exists
  const agent = await getConvexClient().query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress: agentAddress,
  })

  if (!agent) {
    return errorResponse('Agent not found. Register the agent first.', 404)
  }

  if (agent.status === 'claimed' || agent.status === 'verified') {
    return jsonResponse(
      {
        error: 'Agent already claimed',
        currentOwner: agent.claimedBy,
        status: agent.status,
      },
      { status: 409 }
    )
  }

  // Claim agent
  const result = await getConvexClient().mutation(api.ghostDiscovery.claimAgent, {
    ghostAddress: agentAddress,
    claimedBy,
    claimTxSignature: claimTxSignature || `api_claim_${Date.now()}`,
  })

  return jsonResponse({
    success: true,
    message: 'Agent claimed successfully',
    agent: {
      address: agentAddress,
      status: 'claimed',
      claimedBy,
      claimedAt: Date.now(),
    },
    credentialIssued: result.credentialIssued,
    credentialId: result.credentialId,
  })
})

export const OPTIONS = handleCORS
