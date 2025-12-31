#!/usr/bin/env bun
/**
 * Test the custom Borsh serializer for AgentIdentity
 * This verifies our serialization matches what the on-chain program expects
 */

import { serializeAgentIdentityData, deserializeAgentIdentityData } from "../lib/sas/borsh-serializer";
import type { AgentIdentityData } from "../lib/sas/schemas";

console.log("🧪 Testing custom Borsh serializer\n");

const testData: AgentIdentityData = {
	agent: "3ZLCyEv44BNZde4zdFkFAkzABzW4cxbQNmV1Jo5bAzyE",
	did: "did:sol:3ZLCyEv44BNZde4zdFkFAkzABzW4cxbQNmV1Jo5bAzyE",
	name: "Test Agent - Custom Serializer",
	capabilities: ["testing", "verification", "on-chain"],
	x402Enabled: true,
	x402ServiceEndpoint: "https://test-agent.example.com/x402",
	owner: "3ZLCyEv44BNZde4zdFkFAkzABzW4cxbQNmV1Jo5bAzyE",
	registeredAt: Math.floor(Date.now() / 1000),
	issuedAt: Math.floor(Date.now() / 1000),
};

console.log("📦 Original data:");
console.log(JSON.stringify(testData, null, 2));

// Serialize
console.log("\n🔨 Serializing...");
const serialized = serializeAgentIdentityData(testData);
console.log(`✅ Serialized to ${serialized.length} bytes`);
console.log(`   First 50 bytes: ${Array.from(serialized.slice(0, 50)).join(', ')}...`);

// Deserialize
console.log("\n🔄 Deserializing...");
const deserialized = deserializeAgentIdentityData(serialized);
console.log("✅ Deserialized data:");
console.log(JSON.stringify(deserialized, (key, value) =>
	typeof value === 'bigint' ? value.toString() : value
, 2));

// Verify round-trip
console.log("\n🔍 Verifying round-trip...");
const checks = {
	agent: deserialized.agent === testData.agent,
	did: deserialized.did === testData.did,
	name: deserialized.name === testData.name,
	capabilities: JSON.stringify(deserialized.capabilities) === JSON.stringify(testData.capabilities),
	x402Enabled: deserialized.x402Enabled === testData.x402Enabled,
	x402ServiceEndpoint: deserialized.x402ServiceEndpoint === testData.x402ServiceEndpoint,
	owner: deserialized.owner === testData.owner,
	registeredAt: deserialized.registeredAt === BigInt(testData.registeredAt),
	issuedAt: deserialized.issuedAt === BigInt(testData.issuedAt),
};

console.log("  agent:", checks.agent ? "✅" : "❌");
console.log("  did:", checks.did ? "✅" : "❌");
console.log("  name:", checks.name ? "✅" : "❌");
console.log("  capabilities:", checks.capabilities ? "✅" : "❌");
console.log("  x402Enabled:", checks.x402Enabled ? "✅" : "❌");
console.log("  x402ServiceEndpoint:", checks.x402ServiceEndpoint ? "✅" : "❌");
console.log("  owner:", checks.owner ? "✅" : "❌");
console.log("  registeredAt:", checks.registeredAt ? "✅ (BigInt)" : "❌");
console.log("  issuedAt:", checks.issuedAt ? "✅ (BigInt)" : "❌");

const allCorrect = Object.values(checks).every(v => v);

if (allCorrect) {
	console.log("\n✅ ALL CHECKS PASSED!");
	console.log("   Custom serializer is working correctly.");
	console.log("   Ready to test on-chain.");
} else {
	console.log("\n❌ Some checks failed!");
	process.exit(1);
}
