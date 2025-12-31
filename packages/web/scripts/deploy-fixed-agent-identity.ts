#!/usr/bin/env bun
/**
 * Deploy the fixed AgentIdentityFixed schema with type 12 for capabilities
 * This avoids the Vec<String> bug in sas-lib@1.0.10
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
	createTransaction,
} from "gill";
import { createSchema } from "../lib/sas/schemas";
import { getGhostSpeakCredentialPda } from "../lib/sas/credential";
import { SCHEMA_DEFINITIONS } from "../lib/sas/config";

const CLUSTER = "devnet";

async function main() {
	console.log("🚀 Deploying AgentIdentityFixed schema\n");

	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Load existing keypairs
	console.log("1. Loading keypairs...");
	const saved = await Bun.file("sas-keypairs.json").json();
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer));
	const authority = await createKeyPairSignerFromBytes(
		new Uint8Array(saved.authority),
	);

	console.log(`   Payer: ${payer.address}`);
	console.log(`   Authority: ${authority.address}`);

	// Check balance
	const balance = await client.rpc.getBalance(payer.address).send();
	console.log(`   Balance: ${Number(balance.value) / 1_000_000_000} SOL\n`);

	if (balance.value < 100_000_000n) {
		throw new Error("Insufficient balance. Need at least 0.1 SOL");
	}

	// Get credential PDA
	const credentialPda = await getGhostSpeakCredentialPda(authority.address);
	console.log(`2. Credential PDA: ${credentialPda}\n`);

	// Create AgentIdentityFixed schema
	console.log("3. Creating AgentIdentityFixed schema...");
	console.log(
		`   Layout: ${Array.from(SCHEMA_DEFINITIONS.AGENT_IDENTITY.layout)}`,
	);
	console.log("   ^ All type 12 (String) - no Vec<String> issues!\n");

	const { instruction, schemaPda } = await createSchema({
		client,
		payer,
		authority,
		credentialPda,
		schemaType: "AGENT_IDENTITY",
	});

	console.log(`   Schema PDA: ${schemaPda}`);

	// Get latest blockhash
	const { value: latestBlockhash } = await client.rpc
		.getLatestBlockhash()
		.send();

	// Build and send transaction
	const tx = createTransaction({
		version: "legacy",
		feePayer: payer,
		instructions: [instruction],
		latestBlockhash,
		computeUnitLimit: 300_000,
		computeUnitPrice: 1,
	});

	try {
		console.log("4. Sending transaction...");
		const signature = await client.sendAndConfirmTransaction(tx);
		console.log(`   ✅ Schema created successfully!`);
		console.log(`   Signature: ${signature}`);
		console.log(
			`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`,
		);

		console.log("✅ AgentIdentityFixed schema deployed!");
		console.log(`   Schema PDA: ${schemaPda}`);
		console.log(
			`   Explorer: https://explorer.solana.com/address/${schemaPda}?cluster=devnet`,
		);
		console.log(
			"   capabilities field is now String (type 12) - comma-separated values",
		);
		console.log("   Ready to test on-chain attestation!");
	} catch (error: any) {
		console.error("   ❌ Transaction failed:", error.message);
		if (error.context?.logs) {
			console.error("   Transaction logs:");
			error.context.logs.forEach((log: string) =>
				console.error(`     ${log}`),
			);
		}
		throw error;
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Deployment failed:", error);
		process.exit(1);
	});
