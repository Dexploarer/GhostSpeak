#!/usr/bin/env bun
/**
 * Compare sas-lib type 24 serialization vs custom type 25 serialization
 */

import { serializeAttestationData } from "sas-lib";
import { serializeAgentIdentityData } from "../lib/sas/borsh-serializer";
import type { AgentIdentityData } from "../lib/sas/schemas";
import { SCHEMA_DEFINITIONS } from "../lib/sas/config";

console.log("🔍 Comparing serializations\n");

const testData: AgentIdentityData = {
	agent: "TestAgent",
	did: "did:sol:TestAgent",
	name: "Test",
	capabilities: ["cap1", "cap2"],
	x402Enabled: true,
	x402ServiceEndpoint: "https://test.com",
	owner: "TestOwner",
	registeredAt: 1234567890,
	issuedAt: 1234567890,
};

console.log("📦 Test data:");
console.log(JSON.stringify(testData, null, 2));
console.log();

// Create mock schema with type 24
const mockSchemaType24 = {
	name: Buffer.from(SCHEMA_DEFINITIONS.AGENT_IDENTITY.name),
	version: SCHEMA_DEFINITIONS.AGENT_IDENTITY.version,
	layout: Buffer.from([12, 12, 12, 24, 10, 12, 12, 8, 8]), // Type 24
	fieldNames: new Uint8Array(
		SCHEMA_DEFINITIONS.AGENT_IDENTITY.fieldNames
			.map((name) => {
				const bytes = new TextEncoder().encode(name);
				const len = new Uint8Array(4);
				new DataView(len.buffer).setUint32(0, bytes.length, true);
				return [...len, ...bytes];
			})
			.flat(),
	),
	authority: new Uint8Array(32),
	credential: new Uint8Array(32),
	isPaused: false,
};

console.log("1️⃣ sas-lib with type 24 (BorshSchema.Vec(String)):");
const sasLibSerialized = serializeAttestationData(mockSchemaType24, testData);
console.log(`   Length: ${sasLibSerialized.length} bytes`);
console.log(`   Hex: ${Buffer.from(sasLibSerialized).toString("hex")}`);
console.log();

console.log("2️⃣ Custom serializer (VecString format for type 25):");
const customSerialized = serializeAgentIdentityData(testData);
console.log(`   Length: ${customSerialized.length} bytes`);
console.log(`   Hex: ${Buffer.from(customSerialized).toString("hex")}`);
console.log();

// Compare byte by byte
console.log("🔎 Byte-by-byte comparison:");
const maxLen = Math.max(sasLibSerialized.length, customSerialized.length);
let firstDiff = -1;

for (let i = 0; i < maxLen; i++) {
	const sasLibByte = sasLibSerialized[i];
	const customByte = customSerialized[i];

	if (sasLibByte !== customByte && firstDiff === -1) {
		firstDiff = i;
		console.log(`   First difference at byte ${i}:`);
		console.log(`     sas-lib:  ${sasLibByte ?? "missing"}`);
		console.log(`     custom:   ${customByte ?? "missing"}`);
		console.log(`     Context (bytes ${Math.max(0, i - 5)}-${i + 5}):`);
		console.log(
			`       sas-lib:  ${Array.from(sasLibSerialized.slice(Math.max(0, i - 5), i + 6)).join(", ")}`,
		);
		console.log(
			`       custom:   ${Array.from(customSerialized.slice(Math.max(0, i - 5), i + 6)).join(", ")}`,
		);
		break;
	}
}

if (firstDiff === -1) {
	console.log("   ✅ Serializations are IDENTICAL!");
} else {
	console.log(`\n   ❌ Serializations differ starting at byte ${firstDiff}`);
}
