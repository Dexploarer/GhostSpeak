import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Hardcoded for reliability in this script
const CONVEX_URL = "https://lovely-cobra-639.convex.cloud";
const CAISPER_ADDRESS = "DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc";

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log(`🔍 Checking status for agent: ${CAISPER_ADDRESS}`);
  
  const agent = await client.query(api.ghostDiscovery.getDiscoveredAgent, {
    ghostAddress: CAISPER_ADDRESS
  });

  if (agent) {
    console.log(`✅ Agent found! Status: ${agent.status}`);
    if (agent.status === 'claimed') {
      console.log(`   Claimed by: ${agent.claimedBy}`);
    } else {
      console.log(`   Present in DB. Ready to be claimed via UI.`);
    }
  } else {
    console.log(`❌ Agent NOT found. Seeding it now...`);
    
    try {
      await client.mutation(api.ghostDiscovery.bulkImportDiscoveredAgents, {
        agents: [{
          ghostAddress: CAISPER_ADDRESS,
          firstTxSignature: "genesis_seed_signature_" + Date.now(),
          firstSeenTimestamp: Date.now(),
          discoverySource: "manual_seed",
          slot: 0,
          chain: "solana",
          environment: "devnet"
        }]
      });
      console.log(`✅ Successfully seeded Caisper! User can now claim it.`);
    } catch (err) {
      console.error(`❌ Failed to seed agent:`, err);
    }
  }
}

main().catch(console.error);
