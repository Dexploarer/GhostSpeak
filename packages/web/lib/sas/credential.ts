/**
 * Credential management for Solana Attestation Service
 *
 * Handles creation and management of the GhostSpeak credential (issuing authority)
 */

import {
	getCreateCredentialInstruction,
	fetchCredential,
	deriveCredentialPda,
	getChangeAuthorizedSignersInstruction,
} from "sas-lib";
import type { Address, SolanaClient, TransactionSigner } from "gill";
import { SAS_CONFIG } from "./config";

/**
 * Get the GhostSpeak credential PDA
 * This is the top-level credential that represents GhostSpeak as an issuing authority
 */
export async function getGhostSpeakCredentialPda(
	authority: Address,
): Promise<Address> {
	const [credentialPda] = await deriveCredentialPda({
		authority,
		name: SAS_CONFIG.credentialName,
	});
	return credentialPda;
}

/**
 * Create the GhostSpeak credential
 * This should only be called once during initial setup
 */
export async function createGhostSpeakCredential(params: {
	client: SolanaClient;
	payer: TransactionSigner;
	authority: TransactionSigner;
	authorizedSigners: Address[];
}) {
	const { client, payer, authority, authorizedSigners } = params;

	const credentialPda = await getGhostSpeakCredentialPda(authority.address);

	// Check if credential already exists
	try {
		const existingCredential = await fetchCredential(client.rpc, credentialPda);
		if (existingCredential) {
			console.log("GhostSpeak credential already exists:", credentialPda);
			return { credentialPda, existed: true };
		}
	} catch (error) {
		// Credential doesn't exist, continue with creation
	}

	const instruction = getCreateCredentialInstruction({
		payer,
		credential: credentialPda,
		authority,
		name: SAS_CONFIG.credentialName,
		signers: authorizedSigners,
	});

	return {
		instruction,
		credentialPda,
		existed: false,
	};
}

/**
 * Fetch the GhostSpeak credential from on-chain
 */
export async function getGhostSpeakCredential(
	client: SolanaClient,
	authority: Address,
) {
	const credentialPda = await getGhostSpeakCredentialPda(authority);
	return await fetchCredential(client.rpc, credentialPda);
}

/**
 * Update authorized signers for the GhostSpeak credential
 * Only the authority can call this
 */
export async function updateAuthorizedSigners(params: {
	client: SolanaClient;
	payer: TransactionSigner;
	authority: TransactionSigner;
	newSigners: Address[];
}) {
	const { client, payer, authority, newSigners } = params;

	const credentialPda = await getGhostSpeakCredentialPda(authority.address);

	const instruction = await getChangeAuthorizedSignersInstruction({
		payer,
		authority,
		credential: credentialPda,
		signers: newSigners,
	});

	return {
		instruction,
		credentialPda,
	};
}

/**
 * Check if a signer is authorized to issue credentials
 */
export async function isAuthorizedSigner(
	client: SolanaClient,
	authority: Address,
	signer: Address,
): Promise<boolean> {
	try {
		const credential = await getGhostSpeakCredential(client, authority);
		return credential.data.authorizedSigners.some(
			(s) => s.toString() === signer.toString(),
		);
	} catch (error) {
		console.error("Error checking authorized signer:", error);
		return false;
	}
}
