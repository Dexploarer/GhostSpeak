/**
 * Documentation Ingestion Script
 *
 * Reads llms.txt and ingests it into the Convex RAG component.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

// Bun automatically loads .env files

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL is not set");
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function ingestDocs() {
    try {
        const docsPath = path.join(process.cwd(), "../../docs/llms.txt");
        console.log(`📖 Reading docs from: ${docsPath}`);

        if (!fs.existsSync(docsPath)) {
            console.error("❌ Documentation file not found at", docsPath);
            process.exit(1);
        }

        const content = fs.readFileSync(docsPath, "utf-8");

        console.log("📥 Calling Convex ingestion action...");
        const result = await client.action(api.knowledge.ingest, {
            text: content,
            namespace: "docs",
            title: "GhostSpeak Protocol Documentation",
        });

        console.log("✅ Ingestion complete:", result);
    } catch (error) {
        console.error("❌ Ingestion failed:", error);
        process.exit(1);
    }
}

ingestDocs();
