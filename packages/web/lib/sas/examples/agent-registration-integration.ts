/**
 * Example: Integrating SAS attestation with agent registration
 *
 * This shows how to issue an AgentIdentity credential when an agent registers
 */

import { createSolanaClient, type Address } from 'gill'
import { issueAttestation } from '../attestations'
import type { AgentIdentityData } from '../schemas'
import { serializeCapabilities } from '../schemas'
import { SAS_CONFIG } from '../config'

/**
 * Example function that would be called when registering a new agent
 * This would integrate with your existing Convex agent registration flow
 */
export async function registerAgentWithCredential(params: {
  // Agent details from registration form
  agentAddress: Address
  agentDid: string
  agentName: string
  capabilities: string[]
  x402Enabled: boolean
  x402ServiceEndpoint?: string
  ownerAddress: Address

  // SAS configuration
  payerKeypair: any // TransactionSigner
  authorityKeypair: any // TransactionSigner
  authorizedSignerKeypair: any // TransactionSigner
}) {
  const {
    agentAddress,
    agentDid,
    agentName,
    capabilities,
    x402Enabled,
    x402ServiceEndpoint,
    ownerAddress,
    payerKeypair,
    authorityKeypair,
    authorizedSignerKeypair,
  } = params

  // 1. Register agent in your existing system (Convex, etc.)
  // ... your existing registration logic ...

  // 2. Create verifiable credential data
  const credentialData: AgentIdentityData = {
    agent: agentAddress,
    did: agentDid,
    name: agentName,
    capabilities: serializeCapabilities(capabilities), // Convert array to comma-separated string
    x402Enabled,
    x402ServiceEndpoint: x402ServiceEndpoint || '',
    owner: ownerAddress,
    registeredAt: Math.floor(Date.now() / 1000),
    issuedAt: Math.floor(Date.now() / 1000),
  }

  // 3. Issue on-chain attestation
  const client = createSolanaClient({
    urlOrMoniker: SAS_CONFIG.cluster,
  })

  const { instruction, attestationPda, expiryTimestamp } = await issueAttestation({
    client,
    payer: payerKeypair,
    authority: authorityKeypair,
    authorizedSigner: authorizedSignerKeypair,
    schemaType: 'AGENT_IDENTITY',
    data: credentialData,
    nonce: agentAddress, // Use agent's address as unique identifier
    expiryDays: 365, // 1 year validity
  })

  // 4. Send transaction
  // Note: You'd need to build and send the full transaction
  // This is simplified for demonstration

  console.log('AgentIdentity credential issued:')
  console.log(`  PDA: ${attestationPda}`)
  console.log(`  Expires: ${new Date(expiryTimestamp * 1000).toISOString()}`)

  return {
    attestationPda,
    expiryTimestamp,
    credentialData,
  }
}

/**
 * Example Convex action integration
 *
 * In your packages/web/convex/agents.ts file, you would add:
 */
export const EXAMPLE_CONVEX_ACTION = `
// In convex/agents.ts

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createSolanaClient } from "gill";
import { issueAttestation } from "../lib/sas/attestations";

export const registerAgent = action({
  args: {
    name: v.string(),
    capabilities: v.array(v.string()),
    x402Enabled: v.boolean(),
    x402ServiceEndpoint: v.optional(v.string()),
    // ... other args
  },
  handler: async (ctx, args) => {
    // 1. Create agent record in Convex
    const agentId = await ctx.runMutation(internal.agents.create, {
      name: args.name,
      capabilities: args.capabilities,
      // ... other fields
    });

    // 2. Issue verifiable credential on Solana
    // Note: In production, you'd want to queue this or handle errors gracefully
    try {
      const client = createSolanaClient({ urlOrMoniker: "mainnet-beta" });

      // Load your signing keypairs from secure storage
      const payer = /* ... */;
      const authority = /* ... */;
      const authorizedSigner = /* ... */;

      const { attestationPda } = await issueAttestation({
        client,
        payer,
        authority,
        authorizedSigner,
        schemaType: "AGENT_IDENTITY",
        data: {
          agent: /* agent's Solana address */,
          did: \`did:sol:\${/* agent's address */}\`,
          name: args.name,
          capabilities: args.capabilities,
          x402Enabled: args.x402Enabled,
          x402ServiceEndpoint: args.x402ServiceEndpoint || "",
          owner: /* owner's address */,
          registeredAt: Math.floor(Date.now() / 1000),
          issuedAt: Math.floor(Date.now() / 1000),
        },
        nonce: /* agent's address */,
      });

      // 3. Store attestation PDA in Convex for future reference
      await ctx.runMutation(internal.agents.updateCredential, {
        agentId,
        attestationPda: attestationPda.toString(),
      });

      return { agentId, attestationPda };
    } catch (error) {
      console.error("Failed to issue credential:", error);
      // Agent is still registered, credential issuance can be retried
      return { agentId, attestationPda: null };
    }
  },
});
`
