#!/usr/bin/env bun
/**
 * Verify schema type mappings are correct BEFORE creating on-chain
 * This tests serialization without needing any SOL or on-chain accounts
 */

import { serializeAttestationData, deserializeAttestationData } from "sas-lib";
import { SCHEMA_DEFINITIONS } from "../lib/sas/config";

console.log("🔍 Verifying AgentIdentity schema type mappings\n");

// Create a mock schema object that matches what fetchSchema returns
const mockSchema = {
	data: {
		name: Buffer.from(SCHEMA_DEFINITIONS.AGENT_IDENTITY.name),
		version: SCHEMA_DEFINITIONS.AGENT_IDENTITY.version,
		layout: SCHEMA_DEFINITIONS.AGENT_IDENTITY.layout,
		fieldNames: new Uint8Array(
			SCHEMA_DEFINITIONS.AGENT_IDENTITY.fieldNames
				.map((name) => {
					const bytes = new TextEncoder().encode(name);
					const len = new Uint8Array(4);
					new DataView(len.buffer).setUint32(0, bytes.length, true);
					return [...len, ...bytes];
				})
				.flat()
		),
		authority: new Uint8Array(32),
		credential: new Uint8Array(32),
		isPaused: false,
	},
};

console.log("Schema layout:", Array.from(mockSchema.data.layout));
console.log("Expected types:");
console.log("  0: agent (12=String)");
console.log("  1: did (12=String)");
console.log("  2: name (12=String)");
console.log("  3: capabilities (24=Vec<String>)");
console.log("  4: x402Enabled (10=Bool)");
console.log("  5: x402ServiceEndpoint (12=String)");
console.log("  6: owner (12=String)");
console.log("  7: registeredAt (8=i64)");
console.log("  8: issuedAt (8=i64)");
console.log();

// Test data
const testData = {
	agent: "TestAgentAddress123456789012345678901234",
	did: "did:sol:TestAgentAddress123456789012345678901234",
	name: "Test Agent",
	capabilities: ["testing", "verification"],
	x402Enabled: true,
	x402ServiceEndpoint: "https://test-agent.example.com/x402",
	owner: "OwnerAddress123456789012345678901234567",
	registeredAt: Math.floor(Date.now() / 1000),
	issuedAt: Math.floor(Date.now() / 1000),
};

console.log("📦 Test data:");
console.log(JSON.stringify(testData, null, 2));

// Try to serialize using sas-lib
try {
	console.log("\n🧪 Attempting serialization with sas-lib...");
	const serialized = serializeAttestationData(mockSchema.data, testData);
	console.log(`✅ SUCCESS! Serialized to ${serialized.length} bytes`);
	console.log(`   First 20 bytes: ${Array.from(serialized.slice(0, 20)).join(', ')}...`);

	// Try to deserialize
	console.log("\n🔄 Attempting deserialization...");
	const deserialized = deserializeAttestationData(mockSchema.data, serialized);
	console.log("✅ SUCCESS! Deserialized data");

	// Verify round-trip
	console.log("\n🔍 Verifying round-trip...");
	console.log("  agent:", deserialized.agent === testData.agent ? "✅" : "❌");
	console.log("  did:", deserialized.did === testData.did ? "✅" : "❌");
	console.log("  name:", deserialized.name === testData.name ? "✅" : "❌");
	console.log("  capabilities:", JSON.stringify(deserialized.capabilities) === JSON.stringify(testData.capabilities) ? "✅" : "❌");
	console.log("  x402Enabled:", deserialized.x402Enabled === testData.x402Enabled ? "✅" : "❌");
	console.log("  x402ServiceEndpoint:", deserialized.x402ServiceEndpoint === testData.x402ServiceEndpoint ? "✅" : "❌");
	console.log("  owner:", deserialized.owner === testData.owner ? "✅" : "❌");
	console.log("  registeredAt:", typeof deserialized.registeredAt === "bigint" ? "✅ (BigInt)" : "❌");
	console.log("  issuedAt:", typeof deserialized.issuedAt === "bigint" ? "✅ (BigInt)" : "❌");

	const allCorrect =
		deserialized.agent === testData.agent &&
		deserialized.did === testData.did &&
		deserialized.name === testData.name &&
		JSON.stringify(deserialized.capabilities) === JSON.stringify(testData.capabilities) &&
		deserialized.x402Enabled === testData.x402Enabled &&
		deserialized.x402ServiceEndpoint === testData.x402ServiceEndpoint &&
		deserialized.owner === testData.owner &&
		typeof deserialized.registeredAt === "bigint" &&
		typeof deserialized.issuedAt === "bigint";

	if (allCorrect) {
		console.log("\n✅ ALL SCHEMA TYPES ARE CORRECT!");
		console.log("   Safe to fund wallet: 3ZLCyEv44BNZde4zdFkFAkzABzW4cxbQNmV1Jo5bAzyE");
		console.log("   Then run: bun run scripts/setup-sas.ts");
		process.exit(0);
	} else {
		throw new Error("Round-trip verification failed");
	}

} catch (error: any) {
	console.error("\n❌ SERIALIZATION FAILED!");
	console.error("Error:", error.message);
	console.error("\n🚫 DO NOT FUND THE WALLET - Schema types are still wrong!");
	process.exit(1);
}
