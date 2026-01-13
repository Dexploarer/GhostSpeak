/**
 * Semantic Search Test Script
 *
 * Verifies that the Convex RAG component is correctly returning search results.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL is not set");
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function testSearch() {
    const queries = [
        "How does escrow work?",
        "What are the latest issues with agent performance?",
        "Compare Gold and Platinum Ghost Score tiers",
        "Show me recent x402 transactions for agent 5DHh..."
    ];

    for (const query of queries) {
        console.log(`\n🔍 SEARCHING: "${query}"`);
        try {
            const results = await client.action(api.agent.searchContext, {
                query,
                limit: 3,
            });

            if (results.results && results.results.length > 0) {
                results.results.forEach((result: any, index: number) => {
                    const snippet = result.content[0]?.text || "No text content";
                    const namespace = result.namespace || "unknown";
                    console.log(`\n📄 [${namespace}] Result ${index + 1} (Score: ${result.score.toFixed(3)}):`);
                    console.log(`"${snippet.substring(0, 150)}..."`);
                });
            } else {
                console.log("⚠️ No results found.");
            }
        } catch (error) {
            console.error("❌ Search failed for query:", query, error);
        }

        // Add delay to avoid rate limits
        console.log("⏳ Waiting 2s before next query...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    process.exit(0);
}

testSearch();
