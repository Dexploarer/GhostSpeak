import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://lovely-cobra-639.convex.cloud";
const CAISPER_ADDRESS = "CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc";
// The user's wallet from the prompt
const NEW_OWNER = "12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD"; 

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log(`🔄 Transferring Caisper to ${NEW_OWNER}...`);
  
  try {
    const result = await client.mutation(api.ghostDiscovery.adminTransferAgent, {
      ghostAddress: CAISPER_ADDRESS,
      newOwner: NEW_OWNER
    });
    console.log(`✅ Transfer successful!`);
    console.log(`   Previous Owner: ${result.previousOwner}`);
    console.log(`   New Owner: ${result.newOwner}`);
  } catch (err) {
    console.error(`❌ Transfer failed:`, err);
  }
}

main().catch(console.error);
