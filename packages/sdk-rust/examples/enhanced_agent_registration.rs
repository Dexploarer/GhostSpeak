//! Enhanced Agent Registration Example
//! 
//! This example demonstrates agent registration using the podAI Rust SDK.

use podai_sdk::{
    client::{PodAIClient, PodAIConfig},
    services::agent::AgentService,
    types::agent::AgentCapabilities,
    errors::PodAIResult,
};
use solana_sdk::{
    signature::{Keypair, Signer},
};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Enhanced Agent Registration Example");
    println!("====================================");

    // Create client with devnet configuration
    let config = PodAIConfig::devnet();
    let client = Arc::new(PodAIClient::new(config).await?);
    let agent_service = AgentService::new(client.clone());

    // Generate a test wallet
    let test_wallet = Keypair::new();
    let capabilities = AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64;
    let metadata_uri = "https://example.com/agent-metadata.json";

    // Register the agent
    let result = agent_service.register(&test_wallet, capabilities, metadata_uri).await?;
    println!("✅ Agent registered: {}", result.agent_pda);

    // PDA calculation and validation
    let (agent_pda, bump) = agent_service.get_agent_pda(&test_wallet.pubkey());
    println!("Calculated PDA: {} (bump: {})", agent_pda, bump);
    assert_eq!(result.agent_pda, agent_pda);

    Ok(())
} 