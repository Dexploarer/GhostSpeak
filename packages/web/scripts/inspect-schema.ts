#!/usr/bin/env bun
/**
 * Inspect the on-chain schema to see what was actually created
 */

import { createSolanaClient } from "gill";
import { getSchema } from "../lib/sas/schemas";
import { getGhostSpeakCredentialPda } from "../lib/sas/credential";
import { getSchemaAddress } from "../lib/sas/schemas";
import { address } from "gill";

const CLUSTER = "devnet";

async function main() {
	console.log("🔍 Inspecting on-chain AGENT_IDENTITY schema\n");

	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Load config to get authority and schema PDA
	const configFile = Bun.file("sas-config.json");
	const config = await configFile.json();

	const authorityAddress = address(config.authority);
	const credentialPda = await getGhostSpeakCredentialPda(authorityAddress);
	const schemaPda = await getSchemaAddress(credentialPda, "AGENT_IDENTITY");

	console.log(`Authority: ${authorityAddress}`);
	console.log(`Credential PDA: ${credentialPda}`);
	console.log(`Schema PDA: ${schemaPda}\n`);

	// Fetch schema from chain
	const schema = await getSchema(client, schemaPda);

	console.log("Schema details:");
	console.log(`  Name: ${schema.data.name}`);
	console.log(`  Version: ${schema.data.version}`);
	console.log(`  Authority: ${schema.data.authority}`);
	console.log(`  Credential: ${schema.data.credential}`);
	console.log(`  Is Paused: ${schema.data.isPaused}`);
	console.log(`\nLayout (${schema.data.layout.length} fields):`);

	schema.data.layout.forEach((type, index) => {
		const typeName = getTypeName(type);
		console.log(`  [${index}] Type ${type} (${typeName})`);
	});

	console.log(`\nField Names (${schema.data.fieldNames.length} fields):`);
	schema.data.fieldNames.forEach((name, index) => {
		console.log(`  [${index}] ${name}`);
	});
}

function getTypeName(type: number): string {
	const types: Record<number, string> = {
		0: "U8",
		1: "I8",
		2: "Bool",
		3: "U16",
		4: "I16",
		5: "U32",
		6: "I32",
		7: "F32",
		8: "U64",
		9: "I64",
		10: "F64",
		11: "U128",
		12: "String",
		13: "Array",
		14: "Pubkey",
		25: "VecString",
	};
	return types[type] || "Unknown";
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Failed:", error);
		process.exit(1);
	});
