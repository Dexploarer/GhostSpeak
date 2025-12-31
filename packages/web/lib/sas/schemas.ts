/**
 * Schema management for Solana Attestation Service
 *
 * Provides utilities for creating and managing credential schemas
 */

import {
	getCreateSchemaInstruction,
	fetchSchema,
	deriveSchemaPda,
} from "sas-lib";
import type { Address, TransactionSigner } from "@solana/kit";
import type { SolanaClient } from "gill";
import { SCHEMA_DEFINITIONS } from "./config";

/**
 * Schema metadata for a credential type
 */
export interface SchemaMetadata {
	name: string;
	version: number;
	description: string;
	layout: Uint8Array;
	fieldNames: readonly string[];
}

/**
 * Data structure for agent identity credentials
 */
export interface AgentIdentityData {
	agent: string; // Solana address
	did: string; // Decentralized identifier
	name: string; // Agent name
	capabilities: string; // Comma-separated capabilities (e.g., "trading,analysis,automation")
	x402Enabled: boolean; // Whether X402 is enabled
	x402ServiceEndpoint: string; // X402 service endpoint URL
	owner: string; // Owner address
	registeredAt: number; // Unix timestamp
	issuedAt: number; // Unix timestamp
	[key: string]: unknown; // Index signature for sas-lib compatibility
}

/**
 * Helper: Parse comma-separated capabilities into array
 */
export function parseCapabilities(capabilities: string): string[] {
	return capabilities.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
}

/**
 * Helper: Serialize capabilities array to comma-separated string
 */
export function serializeCapabilities(capabilities: string[]): string {
	return capabilities.join(",");
}

/**
 * Data structure for reputation tier credentials
 */
export interface ReputationTierData {
	agent: string; // Agent address
	tier: string; // Tier name (e.g., "Bronze", "Silver", "Gold")
	score: number; // Reputation score (u8, 0-255)
	successfulJobs: number; // Number of successful jobs (i64)
	totalEarned: number; // Total lamports earned (i64)
	lastUpdated: number; // Unix timestamp (i64)
	[key: string]: unknown; // Index signature for sas-lib compatibility
}

/**
 * Data structure for payment milestone credentials
 */
export interface PaymentMilestoneData {
	jobId: string; // Job ID
	agentId: string; // Agent address
	clientId: string; // Client address
	amount: number; // Amount in lamports (i64)
	milestoneNumber: number; // Milestone number (u8)
	completedAt: number; // Unix timestamp (i64)
	txSignature: string; // Transaction signature
	[key: string]: unknown; // Index signature for sas-lib compatibility
}

/**
 * Data structure for verified staker credentials
 */
export interface VerifiedStakerData {
	agent: string; // Agent address
	stakedAmount: number; // Amount staked in lamports (i64)
	lockPeriod: number; // Lock period in seconds (i64)
	stakedAt: number; // Unix timestamp (i64)
	isActive: boolean; // Whether stake is active
	[key: string]: unknown; // Index signature for sas-lib compatibility
}

/**
 * Data structure for verified hire credentials
 */
export interface VerifiedHireData {
	jobId: string; // Job ID
	agentId: string; // Agent address
	clientId: string; // Client address
	startDate: number; // Unix timestamp (i64)
	agreedRate: number; // Rate in lamports per hour (i64)
	terms: string; // Terms of service URL or hash
	[key: string]: unknown; // Index signature for sas-lib compatibility
}

/**
 * All credential data types
 */
export type CredentialData =
	| AgentIdentityData
	| ReputationTierData
	| PaymentMilestoneData
	| VerifiedStakerData
	| VerifiedHireData;

/**
 * Get schema metadata for a credential type
 */
export function getSchemaMetadata(
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE",
): SchemaMetadata {
	return SCHEMA_DEFINITIONS[schemaType];
}

/**
 * Derive schema PDA for a credential type
 */
export async function getSchemaAddress(
	credentialPda: Address,
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE",
): Promise<Address> {
	const metadata = getSchemaMetadata(schemaType);
	const [schemaPda] = await deriveSchemaPda({
		credential: credentialPda,
		name: metadata.name,
		version: metadata.version,
	});
	return schemaPda;
}

/**
 * Create a schema on-chain
 */
export async function createSchema(params: {
	client: SolanaClient;
	payer: TransactionSigner;
	authority: TransactionSigner;
	credentialPda: Address;
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE";
}) {
	const { client, payer, authority, credentialPda, schemaType } = params;

	const metadata = getSchemaMetadata(schemaType);
	const schemaPda = await getSchemaAddress(credentialPda, schemaType);

	const instruction = getCreateSchemaInstruction({
		authority,
		payer,
		name: metadata.name,
		credential: credentialPda,
		description: metadata.description,
		fieldNames: [...metadata.fieldNames], // Convert readonly to mutable array
		schema: schemaPda,
		layout: metadata.layout,
	});

	return {
		instruction,
		schemaPda,
	};
}

/**
 * Fetch schema from on-chain
 */
export async function getSchema(client: SolanaClient, schemaPda: Address) {
	return await fetchSchema(client.rpc, schemaPda);
}

/**
 * Validate credential data against schema
 * This is a client-side helper - on-chain validation happens automatically
 */
export function validateCredentialData(
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE",
	data: CredentialData,
): boolean {
	const metadata = getSchemaMetadata(schemaType);

	// Check all required fields are present
	for (const fieldName of metadata.fieldNames) {
		if (!(fieldName in data)) {
			console.error(`Missing required field: ${fieldName}`);
			return false;
		}
	}

	// Type-specific validation
	switch (schemaType) {
		case "AGENT_IDENTITY": {
			const d = data as AgentIdentityData;
			return (
				typeof d.agent === "string" &&
				typeof d.did === "string" &&
				typeof d.name === "string" &&
				typeof d.capabilities === "string" &&
				typeof d.x402Enabled === "boolean" &&
				typeof d.x402ServiceEndpoint === "string" &&
				typeof d.owner === "string" &&
				typeof d.registeredAt === "number" &&
				typeof d.issuedAt === "number"
			);
		}

		case "REPUTATION_TIER": {
			const d = data as ReputationTierData;
			return (
				typeof d.agent === "string" &&
				typeof d.tier === "string" &&
				typeof d.score === "number" &&
				d.score >= 0 &&
				d.score <= 255 &&
				typeof d.successfulJobs === "number" &&
				typeof d.totalEarned === "number" &&
				typeof d.lastUpdated === "number"
			);
		}

		case "PAYMENT_MILESTONE": {
			const d = data as PaymentMilestoneData;
			return (
				typeof d.jobId === "string" &&
				typeof d.agentId === "string" &&
				typeof d.clientId === "string" &&
				typeof d.amount === "number" &&
				typeof d.milestoneNumber === "number" &&
				d.milestoneNumber >= 0 &&
				d.milestoneNumber <= 255 &&
				typeof d.completedAt === "number" &&
				typeof d.txSignature === "string"
			);
		}

		case "VERIFIED_STAKER": {
			const d = data as VerifiedStakerData;
			return (
				typeof d.agent === "string" &&
				typeof d.stakedAmount === "number" &&
				typeof d.lockPeriod === "number" &&
				typeof d.stakedAt === "number" &&
				typeof d.isActive === "boolean"
			);
		}

		case "VERIFIED_HIRE": {
			const d = data as VerifiedHireData;
			return (
				typeof d.jobId === "string" &&
				typeof d.agentId === "string" &&
				typeof d.clientId === "string" &&
				typeof d.startDate === "number" &&
				typeof d.agreedRate === "number" &&
				typeof d.terms === "string"
			);
		}

		default:
			return false;
	}
}
