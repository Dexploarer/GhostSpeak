import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { gateway } from "./rag";
import { generateText } from "ai";

export const getAgentData = internalQuery({
    args: { agentAddress: v.string() },
    handler: async (ctx, args) => {
        // 1. Reputation
        const reputation = await ctx.db
            .query("agentReputationCache")
            .withIndex("by_address", (q) => q.eq("agentAddress", args.agentAddress))
            .first();

        // 2. Recent Observation Reports
        const reports = await ctx.db
            .query("dailyObservationReports")
            .withIndex("by_agent", (q) => q.eq("agentAddress", args.agentAddress))
            .order("desc")
            .take(5);

        // 3. Transactions (as Merchant)
        const transactions = await ctx.db
            .query("x402SyncEvents")
            .withIndex("by_merchant", (q) => q.eq("merchantAddress", args.agentAddress))
            .order("desc")
            .take(10);

        // 4. Discovery info (if any)
        const discovery = await ctx.db
            .query("discoveredAgents")
            .withIndex("by_address", (q) => q.eq("ghostAddress", args.agentAddress))
            .first();

        return { reputation, reports, transactions, discovery };
    },
});

export const generateOuijaReport = action({
    args: { agentAddress: v.string() },
    handler: async (ctx, args) => {
        const data: any = await ctx.runQuery(internal.reports.getAgentData, { agentAddress: args.agentAddress });

        // Construct prompt for LLM
        const prompt = `
    Analyze the following data for AI Agent ${args.agentAddress} and provide a mystical, "Ouija board" style summary of their spirit and reliability.
    
    Reputation:
    - Utility Score: ${data.reputation?.ghostScore || "Unknown"}
    - Tier: ${data.reputation?.tier || "Unranked"}
    
    Recent Observations:
    ${data.reports.map((r: any) => `- Date: ${r.date}, Grade: ${r.overallGrade}, Trust: ${r.trustworthiness}/100, Notes: ${r.recommendation}`).join('\n')}
    
    Transactions:
    - Count: ${data.transactions.length} recent analyzed
    
    Discovery:
    - Source: ${data.discovery?.discoverySource || "Unknown"}
    
    Output a VALID JSON object (and nothing else) with:
    - "spiritShort": A 3-5 word mystical title (e.g., "The Reliable Phantom").
    - "spiritLong": A 2 sentence mystical description of their nature.
    - "reliability": "Trustworthy", "Deceptive", or "Unknown".
    `;

        try {
            const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                }),
            });

            if (!response.ok) {
                throw new Error(`Gateway Error: ${response.status} ${await response.text()}`);
            }

            const json = await response.json();
            const content = json.choices[0].message.content;

            // Robust JSON extraction
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}');

            let summary;
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = content.substring(jsonStart, jsonEnd + 1);
                summary = JSON.parse(jsonStr);
            } else {
                throw new Error("No JSON found in response");
            }

            return {
                agentAddress: args.agentAddress,
                reputation: data.reputation,
                reports: data.reports,
                transactions: data.transactions,
                discovery: data.discovery,
                summary
            };
        } catch (e) {
            console.error("AI Generation failed:", e);
            return {
                agentAddress: args.agentAddress,
                reputation: data.reputation,
                reports: data.reports,
                transactions: data.transactions,
                discovery: data.discovery,
                summary: {
                    spiritShort: "The Unreachable Spirit",
                    spiritLong: "The spirits are silent. Data retrieval was successful but interpretation failed.",
                    reliability: "Unknown"
                }
            };
        }
    },
});
