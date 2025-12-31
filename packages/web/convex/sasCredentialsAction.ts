/**
 * Convex Actions for SAS (Solana Attestation Service) Credential Issuance
 *
 * Replaces Crossmint with native Solana on-chain verifiable credentials.
 * Actions make on-chain transactions to issue attestations.
 */

import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { serializeCapabilities } from '../lib/sas/schemas'
import type {
	AgentIdentityData,
	ReputationTierData,
	PaymentMilestoneData,
	VerifiedStakerData,
	VerifiedHireData,
} from '../lib/sas/schemas'

// Credential type constants
export const CREDENTIAL_TYPES = {
	REPUTATION_TIER: 'reputation_tier', // Bronze/Silver/Gold/Platinum
	PAYMENT_MILESTONE: 'payment_milestone', // 10/100/1000 payments
	AGENT_IDENTITY: 'agent_identity', // Agent registration
	STAKING_VERIFIED: 'staking_verified', // GHOST staker badge
	VERIFIED_HIRE: 'verified_hire', // Review with payment proof
} as const

// Payment milestone thresholds
export const PAYMENT_MILESTONES = [
	{ count: 10, tier: 'Bronze' },
	{ count: 100, tier: 'Silver' },
	{ count: 1000, tier: 'Gold' },
] as const

// Staking tier thresholds (in GHOST tokens)
export const STAKING_TIERS = [
	{ amount: 5000, tier: 'Basic', badge: 'Verified Staker' },
	{ amount: 50000, tier: 'Premium', badge: 'Premium Staker' },
	{ amount: 500000, tier: 'Elite', badge: 'Elite Staker' },
] as const

/**
 * Call SAS Edge API to issue attestation
 *
 * Calls the Vercel Edge API instead of using gill/sas-lib directly
 * because Convex doesn't support Web Crypto API required by Solana v5
 */
async function issueSASAttestation(
	schemaType:
		| 'AGENT_IDENTITY'
		| 'REPUTATION_TIER'
		| 'PAYMENT_MILESTONE'
		| 'VERIFIED_STAKER'
		| 'VERIFIED_HIRE',
	data: Record<string, unknown>,
	nonce: string,
	expiryDays?: number
): Promise<{ attestationPda: string; signature: string; expiry: number }> {
	// Support localhost for local development
	const sasApiUrl = process.env.SAS_API_URL ||
		(process.env.NODE_ENV === 'development'
			? 'http://localhost:3000/api/sas/issue'
			: 'https://ghostspeak.io/api/sas/issue')
	const sasApiKey = process.env.SAS_API_KEY

	if (!sasApiKey) {
		throw new Error('SAS_API_KEY not configured in Convex environment')
	}

	const response = await fetch(sasApiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': sasApiKey,
		},
		body: JSON.stringify({
			schemaType,
			data,
			nonce,
			expiryDays,
		}),
	})

	if (!response.ok) {
		const error = await response.json()
		throw new Error(`SAS API error: ${error.error || response.statusText}`)
	}

	const result = await response.json()

	if (!result.success) {
		throw new Error(`SAS API failed: ${result.error}`)
	}

	return {
		attestationPda: result.attestationPda,
		signature: result.signature,
		expiry: result.expiry,
	}
}

/**
 * Issue a reputation tier credential (Bronze/Silver/Gold/Platinum)
 */
export const issueReputationTierCredential = internalAction({
	args: {
		agentAddress: v.string(),
		tier: v.string(), // Bronze, Silver, Gold, Platinum
		ghostScore: v.number(),
		totalJobs: v.number(),
		successRate: v.number(),
		totalEarnings: v.string(), // BigInt as string
	},
	returns: v.object({
		success: v.boolean(),
		attestationPda: v.optional(v.string()),
		signature: v.optional(v.string()),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		try {
			console.log('[SAS] Issuing reputation tier credential:', {
				agent: args.agentAddress.slice(0, 8),
				tier: args.tier,
				score: args.ghostScore,
			})

			// Build credential data
			const credentialData: ReputationTierData = {
				agent: args.agentAddress,
				tier: args.tier,
				score: Math.min(255, Math.max(0, Math.floor(args.ghostScore / 100))), // Convert to u8 (0-255)
				successfulJobs: args.totalJobs,
				totalEarned: Number(args.totalEarnings), // Convert to number for serialization
				lastUpdated: Math.floor(Date.now() / 1000),
			}

			// Issue attestation via Edge API
			const result = await issueSASAttestation(
				'REPUTATION_TIER',
				credentialData as unknown as Record<string, unknown>,
				args.agentAddress, // Use agent address as nonce
				90 // 90 days expiry for reputation tier
			)

			// Record credential issuance in database
			await ctx.runMutation(internal.credentialsOrchestrator.recordCredentialIssuance, {
				agentAddress: args.agentAddress,
				credentialType: CREDENTIAL_TYPES.REPUTATION_TIER,
				tier: args.tier,
				credentialId: result.attestationPda, // Store attestation PDA
				crossmintId: result.signature, // Store transaction signature
				ghostScore: args.ghostScore,
				totalJobs: args.totalJobs,
			})

			console.log('[SAS] Credential issued successfully:', {
				attestationPda: result.attestationPda,
				signature: result.signature,
				tier: args.tier,
			})

			return {
				success: true,
				attestationPda: result.attestationPda,
				signature: result.signature,
			}
		} catch (error) {
			console.error('[SAS] Failed to issue credential:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	},
})

/**
 * Issue an Agent Identity credential on registration
 *
 * Includes DID, capabilities, x402 status, and agent metadata
 */
export const issueAgentIdentityCredential = internalAction({
	args: {
		agentAddress: v.string(),
		did: v.string(), // did:sol:network:address
		name: v.string(),
		capabilities: v.array(v.string()), // Will be converted to comma-separated string
		x402Enabled: v.boolean(),
		x402ServiceEndpoint: v.optional(v.string()),
		owner: v.string(),
		registeredAt: v.number(),
	},
	returns: v.object({
		success: v.boolean(),
		attestationPda: v.optional(v.string()),
		signature: v.optional(v.string()),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		try {
			console.log('[SAS] Issuing agent identity credential:', {
				agent: args.agentAddress.slice(0, 8),
				did: args.did,
				x402: args.x402Enabled,
			})

			// Build credential data (convert capabilities array to comma-separated string)
			const credentialData: AgentIdentityData = {
				agent: args.agentAddress,
				did: args.did,
				name: args.name,
				capabilities: serializeCapabilities(args.capabilities), // Convert to comma-separated
				x402Enabled: args.x402Enabled,
				x402ServiceEndpoint: args.x402ServiceEndpoint || '',
				owner: args.owner,
				registeredAt: args.registeredAt,
				issuedAt: Math.floor(Date.now() / 1000),
			}

			// Issue attestation via Edge API
			const result = await issueSASAttestation(
				'AGENT_IDENTITY',
				credentialData as unknown as Record<string, unknown>,
				args.agentAddress, // Use agent address as nonce
				365 // 1 year expiry for agent identity
			)

			// Record in database
			await ctx.runMutation(internal.credentialsOrchestrator.recordAgentIdentityCredential, {
				agentAddress: args.agentAddress,
				credentialId: result.attestationPda,
				crossmintId: result.signature, // Store transaction signature
				did: args.did,
			})

			console.log('[SAS] Agent identity credential issued:', {
				attestationPda: result.attestationPda,
				signature: result.signature,
				agent: args.agentAddress.slice(0, 8),
			})

			return {
				success: true,
				attestationPda: result.attestationPda,
				signature: result.signature,
			}
		} catch (error) {
			console.error('[SAS] Failed to issue agent identity credential:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	},
})

/**
 * Issue a Payment Milestone credential (10/100/1000 payments)
 */
export const issuePaymentMilestoneCredential = internalAction({
	args: {
		agentAddress: v.string(),
		milestone: v.number(), // 10, 100, or 1000
		tier: v.string(), // Bronze, Silver, Gold
		totalPayments: v.number(),
		totalVolume: v.string(), // BigInt as string
		successRate: v.number(),
	},
	returns: v.object({
		success: v.boolean(),
		attestationPda: v.optional(v.string()),
		signature: v.optional(v.string()),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		try {
			console.log('[SAS] Issuing payment milestone credential:', {
				agent: args.agentAddress.slice(0, 8),
				milestone: args.milestone,
				tier: args.tier,
			})

			// Build credential data
			const credentialData: PaymentMilestoneData = {
				jobId: `milestone-${args.milestone}-${args.agentAddress.slice(0, 8)}`,
				agentId: args.agentAddress,
				clientId: 'system', // System-issued milestone
				amount: Number(args.totalVolume), // Convert to number for serialization
				milestoneNumber: args.milestone === 10 ? 1 : args.milestone === 100 ? 2 : 3,
				completedAt: Math.floor(Date.now() / 1000),
				txSignature: '', // Will be filled with attestation tx
			}

			// Issue attestation via Edge API
			const result = await issueSASAttestation(
				'PAYMENT_MILESTONE',
				credentialData as unknown as Record<string, unknown>,
				`${args.agentAddress}-milestone-${args.milestone}`, // Unique nonce per milestone
				730 // 2 years expiry for payment milestones
			)

			// Record in database
			await ctx.runMutation(internal.credentialsOrchestrator.recordPaymentMilestoneCredential, {
				agentAddress: args.agentAddress,
				credentialId: result.attestationPda,
				crossmintId: result.signature,
				milestone: args.milestone,
				tier: args.tier,
			})

			console.log('[SAS] Payment milestone credential issued:', {
				attestationPda: result.attestationPda,
				signature: result.signature,
				milestone: args.milestone,
			})

			return {
				success: true,
				attestationPda: result.attestationPda,
				signature: result.signature,
			}
		} catch (error) {
			console.error('[SAS] Failed to issue payment milestone credential:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	},
})

/**
 * Issue a Staking Verified credential for GHOST token stakers
 */
export const issueStakingCredential = internalAction({
	args: {
		agentAddress: v.string(),
		tier: v.string(), // Basic, Premium, Elite
		badge: v.string(), // Verified Staker, Premium Staker, Elite Staker
		amountStaked: v.number(),
		stakingTier: v.number(), // 1, 2, 3
		reputationBoostBps: v.number(),
		unlockAt: v.number(),
	},
	returns: v.object({
		success: v.boolean(),
		attestationPda: v.optional(v.string()),
		signature: v.optional(v.string()),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		try {
			console.log('[SAS] Issuing staking credential:', {
				agent: args.agentAddress.slice(0, 8),
				tier: args.tier,
				amount: args.amountStaked,
			})

			// Build credential data
			const credentialData: VerifiedStakerData = {
				agent: args.agentAddress,
				stakedAmount: args.amountStaked,
				lockPeriod: args.unlockAt - Math.floor(Date.now() / 1000),
				stakedAt: Math.floor(Date.now() / 1000),
				isActive: true,
			}

			// Issue attestation via Edge API
			const result = await issueSASAttestation(
				'VERIFIED_STAKER',
				credentialData as unknown as Record<string, unknown>,
				args.agentAddress, // Use agent address as nonce
				365 // 1 year expiry for staking
			)

			// Record in database
			await ctx.runMutation(internal.credentialsOrchestrator.recordStakingCredential, {
				agentAddress: args.agentAddress,
				credentialId: result.attestationPda,
				crossmintId: result.signature,
				tier: args.tier,
				stakingTier: args.stakingTier,
				amountStaked: args.amountStaked,
			})

			console.log('[SAS] Staking credential issued:', {
				attestationPda: result.attestationPda,
				signature: result.signature,
				tier: args.tier,
			})

			return {
				success: true,
				attestationPda: result.attestationPda,
				signature: result.signature,
			}
		} catch (error) {
			console.error('[SAS] Failed to issue staking credential:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	},
})

/**
 * Issue a Verified Hire credential for reviews with payment proof
 */
export const issueVerifiedHireCredential = internalAction({
	args: {
		agentAddress: v.string(),
		clientAddress: v.string(),
		rating: v.number(), // 1-5 stars
		review: v.string(),
		transactionSignature: v.string(),
		jobCategory: v.optional(v.string()),
		timestamp: v.number(),
	},
	returns: v.object({
		success: v.boolean(),
		attestationPda: v.optional(v.string()),
		signature: v.optional(v.string()),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		try {
			console.log('[SAS] Issuing verified hire credential:', {
				agent: args.agentAddress.slice(0, 8),
				client: args.clientAddress.slice(0, 8),
				rating: args.rating,
			})

			// Build credential data
			const credentialData: VerifiedHireData = {
				jobId: args.transactionSignature.slice(0, 16), // Use first 16 chars of tx signature
				agentId: args.agentAddress,
				clientId: args.clientAddress,
				startDate: args.timestamp,
				agreedRate: 0, // Not tracked yet
				terms: args.review,
			}

			// Issue attestation via Edge API
			const result = await issueSASAttestation(
				'VERIFIED_HIRE',
				credentialData as unknown as Record<string, unknown>,
				`${args.agentAddress}-${args.transactionSignature}`, // Unique nonce per review
				365 // 1 year expiry for verified hires
			)

			// Record in database
			await ctx.runMutation(internal.credentialsOrchestrator.recordVerifiedHireCredential, {
				agentAddress: args.agentAddress,
				credentialId: result.attestationPda,
				crossmintId: result.signature,
				clientAddress: args.clientAddress,
				rating: args.rating,
				transactionSignature: args.transactionSignature,
			})

			console.log('[SAS] Verified hire credential issued:', {
				attestationPda: result.attestationPda,
				signature: result.signature,
				rating: args.rating,
			})

			return {
				success: true,
				attestationPda: result.attestationPda,
				signature: result.signature,
			}
		} catch (error) {
			console.error('[SAS] Failed to issue verified hire credential:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	},
})
