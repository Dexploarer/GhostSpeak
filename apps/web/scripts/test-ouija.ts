import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL is not set");
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function testOuija() {
    const agentAddress = "5DHhYFTCwYcoUK9nh4omrcm6htGPThcnMHWcK4mCTtPz";
    console.log(`🔮 Summoning Ouija Report for Agent: ${agentAddress}...`);

    try {
        const report = await client.action(api.reports.generateOuijaReport, { agentAddress });
        console.log("👻 Report Summoned Successfully!");

        console.log("\n--- SPIRIT SUMMARY ---");
        console.log(`Title: ${report.summary.spiritShort}`);
        console.log(`Nature: ${report.summary.spiritLong}`);
        console.log(`Reliability: ${report.summary.reliability}`);

        console.log("\n--- EVIDENCE ---");
        console.log(`Reputation Tier: ${report.reputation?.tier}`);
        console.log(`Reports Analyzed: ${report.reports.length}`);
        console.log(`Transactions Found: ${report.transactions.length}`);

    } catch (e) {
        console.error("❌ Summoning Failed:", e);
    }
}

testOuija();
