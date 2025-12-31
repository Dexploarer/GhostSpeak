#!/usr/bin/env bun
/**
 * Update the AGENT_IDENTITY schema to use type 25 (VecString)
 *
 * This recreates the schema with the correct type mapping to match
 * the on-chain Solana program's expectations.
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
	createTransaction,
} from "gill";
import { getCreateSchemaInstruction } from "sas-lib";
import { SCHEMA_DEFINITIONS } from "../lib/sas/config";
import { getGhostSpeakCredentialPda } from "../lib/sas/credential";

const CLUSTER = "devnet";

async function main() {
	console.log("🔄 Updating AGENT_IDENTITY schema to type 25\n");

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

	// Create new AGENT_IDENTITY schema with type 25
	// Use different name since schemas are immutable
	const schemaName = "AgentIdentityFixed";
	const schemaLayout = Buffer.from([12, 12, 12, 25, 10, 12, 12, 8, 8]); // Type 25 for VecString
	console.log(`3. Creating ${schemaName} schema with type 25...`);
	console.log(`   Layout: ${Array.from(schemaLayout)}`);
	console.log("   ^ Note: Type 25 = VecString (variable-length strings)\n");

	const schemaInstruction = await getCreateSchemaInstruction({
		payer,
		authority,
		credential: credentialPda,
		name: schemaName,
		version: 1, // New schema, version 1
		layout: schemaLayout,
		fieldNames: SCHEMA_DEFINITIONS.AGENT_IDENTITY.fieldNames.flatMap(
			(name) => {
				const bytes = new TextEncoder().encode(name);
				const len = new Uint8Array(4);
				new DataView(len.buffer).setUint32(0, bytes.length, true);
				return [...len, ...bytes];
			},
		),
	});

	// Get latest blockhash
	const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

	// Build and send transaction
	const tx = createTransaction({
		version: "legacy",
		feePayer: payer,
		instructions: [schemaInstruction],
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

		console.log("✅ AGENT_IDENTITY schema updated to use type 25!");
		console.log(
			"   You can now test on-chain attestation with the custom serializer.",
		);
	} catch (error: any) {
		console.error("   ❌ Transaction failed:", error.message);
		if (error.logs) {
			console.error("   Transaction logs:");
			error.logs.forEach((log: string) => console.error(`     ${log}`));
		}
		throw error;
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Update failed:", error);
		process.exit(1);
	});
