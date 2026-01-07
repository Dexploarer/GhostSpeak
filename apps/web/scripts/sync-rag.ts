import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL is not set");
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function syncRag() {
    console.log("🚀 Starting RAG Data Sync...");

    try {
        // Start the Durable Workflow
        console.log("🔄 Starting RAG Sync Workflow...");
        const result = await client.mutation(api.workflow_sync.startSync, { limit: 5 });
        console.log(`✅ Workflow started successfully!`);
        console.log(`🆔 Run ID: ${result.runId}`);
        console.log("Check Convex dashboard for workflow progress.");

        console.log("\n🎉 RAG Sync Initiated!");
    } catch (error) {
        console.error("❌ RAG Sync Failed:", error);
        process.exit(1);
    }
}

syncRag();
