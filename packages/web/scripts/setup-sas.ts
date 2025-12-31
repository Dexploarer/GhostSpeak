#!/usr/bin/env bun
/**
 * One-time setup script for Solana Attestation Service
 *
 * This script:
 * 1. Creates the GhostSpeak credential (issuing authority)
 * 2. Creates all 5 credential schemas
 * 3. Saves the PDAs for future use
 *
 * Run with: bun run scripts/setup-sas.ts
 */

import {
	createSolanaClient,
	generateExtractableKeyPairSigner,
	extractBytesFromKeyPairSigner,
	createKeyPairSignerFromBytes,
	airdropFactory,
	lamports,
	createTransaction,
	type TransactionSigner,
	type SolanaClient,
	type Instruction,
} from "gill";
import { estimateComputeUnitLimitFactory } from "gill/programs";
import { createGhostSpeakCredential } from "../lib/sas/credential";
import { createSchema } from "../lib/sas/schemas";
import { SAS_CONFIG } from "../lib/sas/config";
import type { Blockhash } from "gill";

// Configuration
const CLUSTER = (process.env.SOLANA_CLUSTER || "devnet") as
	| "mainnet-beta"
	| "devnet";

async function sendAndConfirmInstructions(
	client: SolanaClient,
	payer: TransactionSigner,
	instructions: Instruction[],
	description: string,
) {
	console.log(`\n${description}...`);

	// Simulate transaction to get compute units
	const simulationTx = createTransaction({
		version: "legacy",
		feePayer: payer,
		instructions,
		latestBlockhash: {
			blockhash: "11111111111111111111111111111111" as Blockhash,
			lastValidBlockHeight: 0n,
		},
		computeUnitLimit: 1_400_000,
		computeUnitPrice: 1,
	});

	const estimateCompute = estimateComputeUnitLimitFactory({ rpc: client.rpc });
	const computeUnitLimit = await estimateCompute(simulationTx);

	// Get latest blockhash
	const { value: latestBlockhash } = await client.rpc
		.getLatestBlockhash()
		.send();

	// Create and send transaction
	const tx = createTransaction({
		version: "legacy",
		feePayer: payer,
		instructions,
		latestBlockhash,
		computeUnitLimit,
		computeUnitPrice: 1,
	});

	const signature = await client.sendAndConfirmTransaction(tx);
	console.log(`✅ ${description} - Signature: ${signature}`);

	return signature;
}

async function main() {
	console.log("🚀 Setting up Solana Attestation Service for GhostSpeak\n");
	console.log(`Cluster: ${CLUSTER}`);
	console.log(`Credential Name: ${SAS_CONFIG.credentialName}\n`);

	// Create client
	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Setup wallets - check if keypairs exist, otherwise generate new ones
	console.log("1. Setting up wallets...");

	let payer: TransactionSigner;
	let authority: TransactionSigner;
	let authorizedSigner1: TransactionSigner;
	let authorizedSigner2: TransactionSigner;

	// Try to load existing keypairs from file
	const keypairFile = "sas-keypairs.json";
	try {
		const file = Bun.file(keypairFile);
		if (await file.exists()) {
			console.log("   Loading existing keypairs...");
			const saved = await file.json();

			// Reconstruct signers from saved byte arrays
			payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer));
			authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority));
			authorizedSigner1 = await createKeyPairSignerFromBytes(new Uint8Array(saved.authorizedSigner1));
			authorizedSigner2 = await createKeyPairSignerFromBytes(new Uint8Array(saved.authorizedSigner2));
		} else {
			throw new Error("No saved keypairs");
		}
	} catch {
		console.log("   Generating new keypairs...");
		payer = await generateExtractableKeyPairSigner();
		authority = await generateExtractableKeyPairSigner();
		authorizedSigner1 = await generateExtractableKeyPairSigner();
		authorizedSigner2 = await generateExtractableKeyPairSigner();

		// Extract and save keypairs as byte arrays for reuse
		const payerBytes = await extractBytesFromKeyPairSigner(payer);
		const authorityBytes = await extractBytesFromKeyPairSigner(authority);
		const signer1Bytes = await extractBytesFromKeyPairSigner(authorizedSigner1);
		const signer2Bytes = await extractBytesFromKeyPairSigner(authorizedSigner2);

		await Bun.write(
			keypairFile,
			JSON.stringify({
				payer: Array.from(payerBytes),
				authority: Array.from(authorityBytes),
				authorizedSigner1: Array.from(signer1Bytes),
				authorizedSigner2: Array.from(signer2Bytes),
			}, null, 2)
		);
		console.log(`   ✅ Keypairs saved to ${keypairFile}`);
	}

	console.log(`   Payer: ${payer.address}`);
	console.log(`   Authority: ${authority.address}`);
	console.log(`   Authorized Signer 1: ${authorizedSigner1.address}`);
	console.log(`   Authorized Signer 2: ${authorizedSigner2.address}`);

	// Check payer balance
	console.log("\n2. Checking payer balance...");
	const balance = await client.rpc.getBalance(payer.address).send();
	const solBalance = Number(balance.value) / 1_000_000_000;
	console.log(`   Balance: ${solBalance} SOL`);

	if (balance.value < 1_000_000_000n) {
		console.log(`\n   ⚠️  Insufficient funds!`);
		console.log(`   Please fund the payer wallet with at least 1 SOL:`);
		console.log(`   Address: ${payer.address}`);
		console.log(`   Faucet: https://faucet.solana.com/`);
		throw new Error(`Payer wallet needs at least 1 SOL. Current balance: ${solBalance} SOL`);
	}
	console.log(`   ✅ Sufficient funds to proceed`);

	// Create GhostSpeak credential
	console.log("\n3. Creating GhostSpeak credential...");
	const { instruction: credentialInstruction, credentialPda } =
		await createGhostSpeakCredential({
			client,
			payer,
			authority,
			authorizedSigners: [authorizedSigner1.address, authorizedSigner2.address],
		});

	await sendAndConfirmInstructions(
		client,
		payer,
		[credentialInstruction],
		"Created GhostSpeak credential",
	);
	console.log(`   Credential PDA: ${credentialPda}`);

	// Create all 5 schemas
	const schemaTypes = [
		"AGENT_IDENTITY",
		"REPUTATION_TIER",
		"PAYMENT_MILESTONE",
		"VERIFIED_STAKER",
		"VERIFIED_HIRE",
	] as const;

	const schemaPdas: Record<string, string> = {};

	for (const schemaType of schemaTypes) {
		console.log(`\n4. Creating ${schemaType} schema...`);

		const { instruction, schemaPda } = await createSchema({
			client,
			payer,
			authority,
			credentialPda,
			schemaType,
		});

		await sendAndConfirmInstructions(
			client,
			payer,
			[instruction],
			`Created ${schemaType} schema`,
		);

		schemaPdas[schemaType] = schemaPda;
		console.log(`   Schema PDA: ${schemaPda}`);
	}

	// Save configuration
	console.log("\n5. Saving configuration...");
	const config = {
		cluster: CLUSTER,
		credentialName: SAS_CONFIG.credentialName,
		authority: authority.address,
		authorizedSigners: [
			authorizedSigner1.address,
			authorizedSigner2.address,
		],
		credentialPda,
		schemas: schemaPdas,
		setupDate: new Date().toISOString(),
	};

	await Bun.write(
		"sas-config.json",
		JSON.stringify(config, null, 2),
	);

	console.log(`   ✅ Configuration saved to sas-config.json`);

	// Print environment variables
	console.log("\n6. Environment variables to set:\n");
	console.log(`export SAS_CLUSTER="${CLUSTER}"`);
	console.log(`export SAS_AUTHORITY_ADDRESS="${authority.address}"`);
	console.log(`export SAS_CREDENTIAL_PDA="${credentialPda}"`);
	console.log(
		`export SAS_AGENT_IDENTITY_SCHEMA="${schemaPdas.AGENT_IDENTITY}"`,
	);
	console.log(
		`export SAS_REPUTATION_SCHEMA="${schemaPdas.REPUTATION_TIER}"`,
	);
	console.log(
		`export SAS_PAYMENT_MILESTONE_SCHEMA="${schemaPdas.PAYMENT_MILESTONE}"`,
	);
	console.log(
		`export SAS_VERIFIED_STAKER_SCHEMA="${schemaPdas.VERIFIED_STAKER}"`,
	);
	console.log(
		`export SAS_VERIFIED_HIRE_SCHEMA="${schemaPdas.VERIFIED_HIRE}"`,
	);

	// IMPORTANT: Save the authority keypair securely
	console.log("\n⚠️  IMPORTANT: Save these keypairs securely!\n");
	console.log(
		"Authority keypair (NEVER share this - it controls the credential):",
	);
	console.log(`   Authority: ${JSON.stringify(authority)}`);
	console.log("\nAuthorized signer keypairs (for issuing attestations):");
	console.log(`   Signer 1: ${JSON.stringify(authorizedSigner1)}`);
	console.log(`   Signer 2: ${JSON.stringify(authorizedSigner2)}`);

	console.log("\n✅ Setup complete!");
	console.log("\nNext steps:");
	console.log("1. Save the keypairs to secure storage");
	console.log("2. Set the environment variables");
	console.log(
		"3. Test issuing an attestation with: bun run scripts/test-sas.ts",
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Setup failed:", error);
		process.exit(1);
	});
