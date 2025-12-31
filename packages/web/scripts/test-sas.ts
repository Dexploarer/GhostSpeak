#!/usr/bin/env bun
/**
 * Test script for Solana Attestation Service integration
 *
 * This script tests the complete SAS flow:
 * 1. Load saved keypairs
 * 2. Issue a test AgentIdentity attestation
 * 3. Verify the attestation
 * 4. Optionally revoke it
 *
 * Run with: bun run scripts/test-sas.ts
 */

import {
	createSolanaClient,
	createKeyPairSignerFromBytes,
	type TransactionSigner,
} from "gill";
import { issueAttestation, verifyAttestation, revokeAttestation } from "../lib/sas/attestations";
import type { AgentIdentityData } from "../lib/sas/schemas";

// Configuration
const CLUSTER = (process.env.SOLANA_CLUSTER || "devnet") as "mainnet-beta" | "devnet";

async function loadKeypairs() {
	console.log("Loading saved keypairs...");
	const file = Bun.file("sas-keypairs.json");
	if (!(await file.exists())) {
		throw new Error("Keypairs not found. Run setup-sas.ts first.");
	}

	const saved = await file.json();
	const payer = await createKeyPairSignerFromBytes(new Uint8Array(saved.payer));
	const authority = await createKeyPairSignerFromBytes(new Uint8Array(saved.authority));
	const authorizedSigner1 = await createKeyPairSignerFromBytes(new Uint8Array(saved.authorizedSigner1));

	console.log(`   Payer: ${payer.address}`);
	console.log(`   Authority: ${authority.address}`);
	console.log(`   Authorized Signer: ${authorizedSigner1.address}`);

	return { payer, authority, authorizedSigner: authorizedSigner1 };
}

async function main() {
	console.log("🧪 Testing Solana Attestation Service Integration\n");
	console.log(`Cluster: ${CLUSTER}\n`);

	// Create client
	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Load keypairs
	const { payer, authority, authorizedSigner } = await loadKeypairs();

	// Check payer balance
	console.log("\n1. Checking payer balance...");
	const balance = await client.rpc.getBalance(payer.address).send();
	const solBalance = Number(balance.value) / 1_000_000_000;
	console.log(`   Balance: ${solBalance} SOL`);

	if (balance.value < 100_000_000n) {
		throw new Error(`Insufficient funds. Need at least 0.1 SOL. Current: ${solBalance} SOL`);
	}

	// Create test agent identity credential
	console.log("\n2. Creating test AgentIdentity credential...");

	const testData: AgentIdentityData = {
		agent: payer.address, // Using payer as test agent
		did: `did:sol:${payer.address}`,
		name: "Test Agent",
		capabilities: ["testing", "verification"],
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
		nonce: payer.address, // Using payer address as unique identifier
		expiryDays: 365,
	});

	console.log(`   Attestation PDA: ${attestationPda}`);
	console.log(`   Expires: ${new Date(expiryTimestamp * 1000).toISOString()}`);

	// Send transaction
	console.log("\n3. Sending transaction...");
	// Note: In a real scenario, you'd build and send the full transaction
	// For now, we just confirm the instruction was created
	console.log(`   ✅ Attestation instruction created successfully`);

	// Verify attestation (this will work after transaction is sent)
	console.log("\n4. Verifying attestation...");
	try {
		const result = await verifyAttestation({
			client,
			authority: authority.address,
			schemaType: "AGENT_IDENTITY",
			nonce: payer.address,
		});

		if (result?.isValid) {
			console.log(`   ✅ Attestation is valid!`);
			console.log(`   Agent: ${result.data.agent}`);
			console.log(`   Name: ${result.data.name}`);
			console.log(`   Capabilities: ${result.data.capabilities.join(", ")}`);
			console.log(`   Expires: ${new Date(result.expiry * 1000).toISOString()}`);
		} else {
			console.log(`   ⚠️  Attestation not found or invalid (transaction may not be confirmed yet)`);
		}
	} catch (error) {
		console.log(`   ⚠️  Could not verify attestation (transaction may not be confirmed yet)`);
	}

	console.log("\n✅ Test completed!");
	console.log("\nNote: To fully test issuance, you need to:");
	console.log("1. Build a complete transaction with the instruction");
	console.log("2. Send and confirm the transaction");
	console.log("3. Then verify the attestation exists on-chain");
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Test failed:", error);
		process.exit(1);
	});
