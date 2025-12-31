/**
 * Attestation issuance and verification for Solana Attestation Service
 *
 * Core functionality for issuing and verifying verifiable credentials
 */

import {
	serializeAttestationData,
	deserializeAttestationData,
	getCreateAttestationInstruction,
	fetchAttestation,
	deriveAttestationPda,
	getCloseAttestationInstruction,
	deriveEventAuthorityAddress,
	SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
} from "sas-lib";
import type { Address, TransactionSigner } from "@solana/kit";
import type { SolanaClient } from "gill";
import { getGhostSpeakCredentialPda } from "./credential";
import { getSchemaAddress, getSchema, validateCredentialData } from "./schemas";
import type { CredentialData, AgentIdentityData } from "./schemas";
import { DEFAULT_EXPIRY_DAYS } from "./config";
import {
	serializeAgentIdentityData,
	deserializeAgentIdentityData,
} from "./borsh-serializer";

/**
 * Issue an attestation (verifiable credential)
 */
export async function issueAttestation(params: {
	client: SolanaClient;
	payer: TransactionSigner;
	authority: TransactionSigner;
	authorizedSigner: TransactionSigner;
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE";
	data: CredentialData;
	nonce: Address; // Unique identifier for the attestation (e.g., user's wallet address)
	expiryDays?: number; // Optional custom expiry in days
}) {
	const {
		client,
		payer,
		authority,
		authorizedSigner,
		schemaType,
		data,
		nonce,
		expiryDays,
	} = params;

	// Validate credential data
	if (!validateCredentialData(schemaType, data)) {
		throw new Error(
			`Invalid credential data for schema type: ${schemaType}`,
		);
	}

	// Get credential and schema PDAs
	const credentialPda = await getGhostSpeakCredentialPda(authority.address);
	const schemaPda = await getSchemaAddress(credentialPda, schemaType);

	// Fetch schema to get layout info
	const schema = await getSchema(client, schemaPda);

	// Derive attestation PDA
	const [attestationPda] = await deriveAttestationPda({
		credential: credentialPda,
		schema: schemaPda,
		nonce,
	});

	// Calculate expiry timestamp
	const defaultExpiry = DEFAULT_EXPIRY_DAYS[schemaType];
	const expiryTimestamp =
		Math.floor(Date.now() / 1000) +
		(expiryDays || defaultExpiry) * 24 * 60 * 60;

	// Serialize attestation data according to schema layout
	// Use sas-lib serialization - type 24 works correctly for Vec<String>
	const serializedData = serializeAttestationData(schema.data, data);

	// Create attestation instruction
	const instruction = await getCreateAttestationInstruction({
		payer,
		authority: authorizedSigner,
		credential: credentialPda,
		schema: schemaPda,
		attestation: attestationPda,
		nonce,
		expiry: expiryTimestamp,
		data: serializedData,
	});

	return {
		instruction,
		attestationPda,
		expiryTimestamp,
	};
}

/**
 * Verify an attestation
 * Returns the attestation data if valid, or null if invalid/expired
 */
export async function verifyAttestation(params: {
	client: SolanaClient;
	authority: Address;
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE";
	nonce: Address; // The unique identifier used when creating the attestation
}): Promise<{
	isValid: boolean;
	data?: CredentialData;
	expiry?: number;
	signer?: Address;
} | null> {
	const { client, authority, schemaType, nonce } = params;

	try {
		// Get credential and schema PDAs
		const credentialPda = await getGhostSpeakCredentialPda(authority);
		const schemaPda = await getSchemaAddress(credentialPda, schemaType);

		// Fetch schema
		const schema = await getSchema(client, schemaPda);

		// Check if schema is paused
		if (schema.data.isPaused) {
			console.log("Schema is paused");
			return { isValid: false };
		}

		// Derive attestation PDA
		const [attestationPda] = await deriveAttestationPda({
			credential: credentialPda,
			schema: schemaPda,
			nonce,
		});

		// Fetch attestation
		const attestation = await fetchAttestation(client.rpc, attestationPda);

		// Check expiry
		const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
		const isExpired = currentTimestamp >= attestation.data.expiry;

		if (isExpired) {
			console.log("Attestation has expired");
			return { isValid: false };
		}

		// Deserialize attestation data
		const attestationData = deserializeAttestationData(
			schema.data,
			attestation.data.data as Uint8Array,
		);

		return {
			isValid: true,
			data: attestationData as CredentialData,
			expiry: Number(attestation.data.expiry),
			signer: attestation.data.signer,
		};
	} catch (error) {
		console.error("Error verifying attestation:", error);
		return null;
	}
}

/**
 * Close (revoke) an attestation
 * Only authorized signers can revoke attestations
 */
export async function revokeAttestation(params: {
	client: SolanaClient;
	payer: TransactionSigner;
	authority: Address;
	authorizedSigner: TransactionSigner;
	schemaType:
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE";
	nonce: Address;
}) {
	const { client, payer, authority, authorizedSigner, schemaType, nonce } =
		params;

	// Get credential and schema PDAs
	const credentialPda = await getGhostSpeakCredentialPda(authority);
	const schemaPda = await getSchemaAddress(credentialPda, schemaType);

	// Derive attestation PDA
	const [attestationPda] = await deriveAttestationPda({
		credential: credentialPda,
		schema: schemaPda,
		nonce,
	});

	// Get event authority
	const eventAuthority = await deriveEventAuthorityAddress();

	// Create close attestation instruction
	const instruction = await getCloseAttestationInstruction({
		payer,
		attestation: attestationPda,
		authority: authorizedSigner,
		credential: credentialPda,
		eventAuthority,
		attestationProgram: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
	});

	return {
		instruction,
		attestationPda,
	};
}

/**
 * Get all attestations for a specific nonce (user)
 * This is a convenience function that checks all schema types
 */
export async function getUserAttestations(params: {
	client: SolanaClient;
	authority: Address;
	nonce: Address; // User's wallet address
}): Promise<
	Array<{
		schemaType: string;
		isValid: boolean;
		data?: CredentialData;
		expiry?: number;
	}>
> {
	const { client, authority, nonce } = params;

	const schemaTypes: Array<
		| "AGENT_IDENTITY"
		| "REPUTATION_TIER"
		| "PAYMENT_MILESTONE"
		| "VERIFIED_STAKER"
		| "VERIFIED_HIRE"
	> = [
		"AGENT_IDENTITY",
		"REPUTATION_TIER",
		"PAYMENT_MILESTONE",
		"VERIFIED_STAKER",
		"VERIFIED_HIRE",
	];

	const attestations = await Promise.all(
		schemaTypes.map(async (schemaType) => {
			const result = await verifyAttestation({
				client,
				authority,
				schemaType,
				nonce,
			});

			return {
				schemaType,
				isValid: result?.isValid ?? false,
				data: result?.data,
				expiry: result?.expiry,
			};
		}),
	);

	return attestations.filter((a) => a.isValid);
}
