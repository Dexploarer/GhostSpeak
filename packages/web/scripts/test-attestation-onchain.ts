#!/usr/bin/env bun
/**
 * Actually send an attestation transaction on-chain to fully test SAS
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
	createTransaction,
} from "gill";
import { issueAttestation } from "../lib/sas/attestations";
import type { AgentIdentityData } from "../lib/sas/schemas";
import { parseCapabilities } from "../lib/sas/schemas";

const CLUSTER = "devnet";

async function main() {
	console.log("🚀 Testing full on-chain attestation issuance\n");

	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Load keypairs
	console.log("1. Loading keypairs...");
	const saved = await Bun.file("sas-keypairs.json").json();
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer));
	const authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority));
	const authorizedSigner = await createKeyPairSignerFromBytes(new Uint8Array(saved.authorizedSigner1));

	console.log(`   Payer: ${payer.address}`);
	console.log(`   Authority: ${authority.address}`);

	// Check balance
	const balance = await client.rpc.getBalance(payer.address).send();
	console.log(`   Balance: ${Number(balance.value) / 1_000_000_000} SOL\n`);

	// Create test data (with comma-separated capabilities)
	console.log("2. Creating test AgentIdentity attestation...");
	const testData: AgentIdentityData = {
		agent: payer.address,
		did: `did:sol:${payer.address}`,
		name: "Test Agent - On-Chain",
		capabilities: "testing,verification,on-chain", // Comma-separated string!
		x402Enabled: true,
		x402ServiceEndpoint: "https://test-agent.example.com/x402",
		owner: payer.address,
		registeredAt: Math.floor(Date.now() / 1000),
		issuedAt: Math.floor(Date.now() / 1000),
	};

	const { instruction, attestationPda, expiryTimestamp } = await issueAttestation({
		client,
		payer,
		authority,
		authorizedSigner,
		schemaType: "AGENT_IDENTITY",
		data: testData,
		nonce: payer.address,
		expiryDays: 365,
	});

	console.log(`   Attestation PDA: ${attestationPda}`);
	console.log(`   Expires: ${new Date(expiryTimestamp * 1000).toISOString()}\n`);

	// Get latest blockhash
	console.log("3. Building and sending transaction...");
	const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

	const tx = createTransaction({
		version: "legacy",
		feePayer: payer,
		instructions: [instruction],
		latestBlockhash,
		computeUnitLimit: 300_000,
		computeUnitPrice: 1,
	});

	try {
		const signature = await client.sendAndConfirmTransaction(tx);
		console.log(`   ✅ Transaction confirmed!`);
		console.log(`   Signature: ${signature}`);
		console.log(`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`);

		// Verify attestation exists
		console.log("4. Verifying attestation on-chain...");
		const { verifyAttestation } = await import("../lib/sas/attestations");
		const result = await verifyAttestation({
			client,
			authority: authority.address,
			schemaType: "AGENT_IDENTITY",
			nonce: payer.address,
		});

		if (result?.isValid) {
			console.log(`   ✅ ATTESTATION VERIFIED!`);
			console.log(`   Agent: ${result.data.agent}`);
			console.log(`   Name: ${result.data.name}`);
			// Parse comma-separated capabilities for display
			const capabilities = parseCapabilities(result.data.capabilities);
			console.log(`   Capabilities: ${capabilities.join(", ")}`);
			console.log(`   X402 Enabled: ${result.data.x402Enabled}`);
			console.log(`   Expires: ${new Date(result.expiry * 1000).toISOString()}\n`);

			console.log("🎉 SUCCESS! SAS integration is fully functional!");
			console.log(`   View attestation: https://explorer.solana.com/address/${attestationPda}?cluster=devnet`);
		} else {
			console.log("   ⚠️  Attestation found but invalid");
		}
	} catch (error: any) {
		console.error("   ❌ Transaction failed:", error.message);
		throw error;
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Test failed:", error);
		process.exit(1);
	});
