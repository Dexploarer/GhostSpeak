//! Enhanced Agent Registration Example
//! 
//! This example demonstrates agent registration using the podAI Rust SDK.

use podai_sdk::{
    client::PodAIClient,
    services::agent::AgentService,
    types::agent::AgentCapabilities,
    errors::{PodAIResult, PodAIError},
};
use solana_sdk::{
    signature::{Keypair, Signer},
    pubkey::Pubkey,
};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Enhanced Agent Registration Example");
    println!("====================================");

    // Create client with devnet configuration
    let client = Arc::new(PodAIClient::devnet());
    let agent_service = AgentService::new(client.clone());

    // Generate a new keypair for the agent
    let agent_keypair = Keypair::new();
    println!("💼 Agent wallet: {}", agent_keypair.pubkey());

    // Example 1: Basic registration
    println!("\n📦 Example 1: Basic Registration");
    println!("------------------------------");
    
    let result = agent_service.register(
        &agent_keypair,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
        "https://example.com/agent-metadata.json"
    ).await?;

    println!("✅ Agent registered successfully!");
    println!("   📍 Agent PDA: {}", result.agent_pda);
    println!("   🔐 Signature: {}", result.signature);

    // Example 2: Another agent with different capabilities
    println!("\n🔒 Example 2: Research Agent");
    println!("----------------------------------");

    let another_agent = Keypair::new();
    
    let result = agent_service.register(
        &another_agent,
        AgentCapabilities::Analysis as u64,
        "https://example.com/research-agent.json"
    ).await?;

    println!("✅ Research agent registered!");
    println!("   📍 Agent PDA: {}", result.agent_pda);

    // Example 3: Market maker agent
    println!("\n🛠️  Example 3: Market Maker Agent");
    println!("------------------------------------------");

    let custom_agent = Keypair::new();

    let result = agent_service.register(
        &custom_agent,
        AgentCapabilities::Trading as u64,
        "https://example.com/market-maker.json"
    ).await?;

    println!("✅ Market maker agent registered!");
    println!("   📍 Agent PDA: {}", result.agent_pda);

    // Example validation patterns
    demo_validation_patterns(&agent_service).await?;

    println!("\n🎉 All examples completed successfully!");
    println!("💡 The SDK supports:");
    println!("   ✓ Agent registration with various capabilities");
    println!("   ✓ PDA calculation and validation");
    println!("   ✓ Type-safe error handling");

    Ok(())
}

/// Demonstrate validation patterns
async fn demo_validation_patterns(agent_service: &AgentService) -> PodAIResult<()> {
    println!("\n✅ Validation Patterns");
    println!("---------------------");

    // PDA calculation
    let test_wallet = Keypair::new();
    let (agent_pda, bump) = agent_service.calculate_agent_pda(&test_wallet.pubkey());
    println!("📍 Generated PDA: {} (bump: {})", agent_pda, bump);

    println!("🎯 Capability values:");
    println!("   • Communication: {}", AgentCapabilities::Communication as u64);
    println!("   • Trading: {}", AgentCapabilities::Trading as u64);
    println!("   • Analysis: {}", AgentCapabilities::Analysis as u64);

    Ok(())
} 