
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";


const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    const walletAddress = "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4";
    console.log("Testing getUserDashboard for:", walletAddress);

    try {
        const dashboard = await convex.query(api.dashboard.getUserDashboard, { walletAddress });
        console.log("Dashboard Data:", JSON.stringify(dashboard, null, 2));
    } catch (error) {
        console.error("Error fetching dashboard:", error);
    }
}

main();
