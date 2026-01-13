/**
 * Agent Claim API - Signature-based or x402 Payment
 *
 * POST /api/v1/agent/claim - Claim ownership of an agent
 *
 * Two methods supported:
 * 1. Signature-based (free): Provide { agentAddress, signature, message }
 * 2. x402 Payment ($0.05): Provide x402 headers + { agentAddress, claimedBy }
 */

import { api } from '@/convex/_generated/api'
import { requireX402Payment } from '@/lib/x402-middleware'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'
import { verifyClaimSignature, type SignatureVerificationMessage } from '@/lib/solana/signature-verification'

export const POST = withMiddleware(async (request) => {
  const body = await request.json()
  const { agentAddress, claimedBy, claimTxSignature, signature, message } = body

  if (!agentAddress) {
    return errorResponse('Missing required field: agentAddress', 400)
  }

  // Method 1: Signature-based claiming (free)
  if (signature && message) {
    // Verify message structure
    const typedMessage = message as SignatureVerificationMessage
    if (typedMessage.action !== 'claim_agent') {
      return errorResponse('Invalid action in message (expected: claim_agent)', 400)
    }

    if (typedMessage.agentAddress !== agentAddress) {
      return errorResponse('Message agentAddress does not match request', 400)
    }

    // Verify signature
    const verification = verifyClaimSignature(typedMessage, signature, agentAddress)

    if (!verification.valid) {
      return errorResponse(`Signature verification failed: ${verification.error}`, 403)
    }

    // Signature verified - claimedBy is agentAddress (signature proves ownership)
  }
  // Method 2: x402 Payment-based claiming
  else {
    // Require x402 payment - $0.05 to claim
    const paymentRequired = await requireX402Payment(request, { priceUsdc: 0.05 }, getConvexClient())
    if (paymentRequired) return paymentRequired

    if (!claimedBy) {
      return errorResponse('Missing required field: claimedBy (when not using signature)', 400)
    }
  }

  // Determine the claiming wallet
  const finalClaimedBy = signature ? agentAddress : claimedBy!

  // Validate Solana addresses
  const solanaAddressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
  if (!solanaAddressRegex.test(agentAddress)) {
    return errorResponse('Invalid agent address format', 400)
  }
  if (!solanaAddressRegex.test(finalClaimedBy)) {
    return errorResponse('Invalid claimedBy address format', 400)
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

  // Register agent on-chain if signature-based claiming
  let onChainTxSignature = claimTxSignature
  if (signature) {
    try {
      const { GhostSpeakClient, createKeyPairSignerFromBytes } = await import('@ghostspeak/sdk')
      const bs58 = await import('bs58')

      const adminPrivateKey = process.env.GHOSTSPEAK_ADMIN_PRIVATE_KEY
      if (!adminPrivateKey) {
        throw new Error('GHOSTSPEAK_ADMIN_PRIVATE_KEY not configured')
      }

      const adminKeypair = await createKeyPairSignerFromBytes(bs58.default.decode(adminPrivateKey))

      const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      const client = new GhostSpeakClient({
        rpcEndpoint,
        commitment: 'confirmed',
      })

      onChainTxSignature = await client.agents.register(adminKeypair, {
        agentType: 10,
        name: `Ghost Agent ${agentAddress.slice(0, 8)}`,
        description: `Agent claimed via signature verification`,
        metadataUri: `https://ghostspeak.ai/agents/${agentAddress}`,
        agentId: agentAddress,
        skipSimulation: true,
      })
    } catch (error) {
      console.error('[Claim Agent API] On-chain registration failed:', error)
      return errorResponse(
        `Failed to register on-chain: ${error instanceof Error ? error.message : String(error)}`,
        500
      )
    }
  }

  // Determine registration network
  const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const registrationNetwork = rpcEndpoint.includes('devnet')
    ? ('devnet' as const)
    : rpcEndpoint.includes('testnet')
      ? ('testnet' as const)
      : ('mainnet-beta' as const)

  // Claim agent in Convex
  const result = await getConvexClient().mutation(api.ghostDiscovery.claimAgent, {
    ghostAddress: agentAddress,
    claimedBy: finalClaimedBy,
    claimTxSignature: onChainTxSignature || `api_claim_${Date.now()}`,
    registrationNetwork,
  })

  return jsonResponse({
    success: true,
    message: 'Agent claimed successfully',
    method: signature ? 'signature' : 'payment',
    agent: {
      address: agentAddress,
      status: 'claimed',
      claimedBy: finalClaimedBy,
      claimedAt: Date.now(),
      txSignature: onChainTxSignature,
      registrationNetwork,
    },
    credentialIssued: result.credentialIssued,
    credentialId: result.credentialId,
  })
})

export const OPTIONS = handleCORS
