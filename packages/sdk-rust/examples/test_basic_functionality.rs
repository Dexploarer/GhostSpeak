/**
 * Basic functionality test for the Rust SDK
 */

use podai_sdk::client::*;
use podai_sdk::services::agent::AgentService;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 Testing Rust SDK basic functionality...");
    
    // Create devnet RPC URL
    let rpc_url = "https://api.devnet.solana.com";
    
    // Test program ID parsing
    let program_id = match Pubkey::from_str("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps") {
        Ok(id) => {
            println!("✅ Program ID parsed successfully: {}", id);
            id
        }
        Err(e) => {
            println!("❌ Failed to parse program ID: {}", e);
            return Err(e.into());
        }
    };
    
    // Test agent service creation
    match AgentService::new(rpc_url, program_id) {
        Ok(agent_service) => {
            println!("✅ Agent service created successfully");
            
            // Test getting RPC client
            let _rpc_client = agent_service.get_rpc_client();
            println!("✅ RPC client accessible");
            
            println!("✅ All basic functionality tests passed!");
        }
        Err(e) => {
            println!("❌ Failed to create agent service: {}", e);
            return Err(e.into());
        }
    }
    
    Ok(())
} 