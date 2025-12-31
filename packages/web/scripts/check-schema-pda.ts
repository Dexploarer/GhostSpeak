#!/usr/bin/env bun
/**
 * Check if schema PDAs exist on-chain
 */

import { createSolanaClient, createKeyPairSignerFromBytes } from "gill";
import { deriveSchemaPda } from "sas-lib";
import { getGhostSpeakCredentialPda } from "../lib/sas/credential";

const CLUSTER = "devnet";

async function main() {
	console.log("🔍 Checking schema PDAs\n");

	const client = createSolanaClient({ urlOrMoniker: CLUSTER });

	// Load authority
	const saved = await Bun.file("sas-keypairs.json").json();
	const authority = await createKeyPairSignerFromBytes(
		new Uint8Array(saved.authority),
	);

	const credentialPda = await getGhostSpeakCredentialPda(authority.address);
	console.log(`Credential PDA: ${credentialPda}\n`);

	const schemaConfigs = [
		{ name: "AgentIdentity", version: 1 },
		{ name: "AgentIdentity", version: 2 },
		{ name: "AgentIdentityV2", version: 1 },
		{ name: "AgentIdentityFixed", version: 1 },
	];

	for (const config of schemaConfigs) {
		const [schemaPda] = await deriveSchemaPda({
			credential: credentialPda,
			name: config.name,
			version: config.version,
		});

		console.log(`Schema: ${config.name} v${config.version}`);
		console.log(`  PDA: ${schemaPda}`);

		try {
			const accountInfo = await client.rpc.getAccountInfo(schemaPda).send();
			if (accountInfo.value) {
				console.log(`  ✅ EXISTS (${accountInfo.value.data.length} bytes)`);
			} else {
				console.log(`  ❌ Does not exist`);
			}
		} catch (error: any) {
			console.log(`  ❌ Does not exist (error: ${error.message})`);
		}
		console.log();
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("Error:", error);
		process.exit(1);
	});
