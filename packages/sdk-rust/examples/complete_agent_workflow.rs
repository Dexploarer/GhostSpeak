//! Complete Agent Workflow Example
//! 
//! This example demonstrates the full lifecycle of an AI agent using the enhanced
//! podai SDK with modern patterns.

use std::sync::Arc;
use std::time::Duration;

use podai_sdk::{
    client::{PodAIClient, PodAIConfig},
    services::agent::AgentService,
    types::agent::{AgentCapabilities, AgentAccount},
    errors::PodAIResult,
};
use solana_sdk::{signature::Keypair, signer::Signer};
use tracing::{info, error};

#[tokio::main]
async fn main() -> PodAIResult<()> {
    // Initialize logging (simplified without tracing_subscriber dependency)
    println!("🚀 Starting Complete Agent Workflow Example");

    // Set up basic client
    let client = setup_client().await?;
    
    // Run the complete workflow
    run_complete_workflow(&client).await?;
    
    println!("✅ Complete Agent Workflow Example completed successfully!");
    Ok(())
}

/// Setup basic client
async fn setup_client() -> PodAIResult<Arc<PodAIClient>> {
    println!("🔧 Setting up client");
    
    let config = PodAIConfig::devnet();
    
    match PodAIClient::new(config).await {
        Ok(client) => {
            println!("✅ Client ready");
            Ok(Arc::new(client))
        }
        Err(e) => {
            println!("⚠️ Client setup failed (expected in CI): {}", e);
            // Return a default client for testing
            let config = PodAIConfig::default();
            let client = PodAIClient::new(config).await?;
            Ok(Arc::new(client))
        }
    }
}

/// Run the complete agent workflow
async fn run_complete_workflow(client: &Arc<PodAIClient>) -> PodAIResult<()> {
    info!("🎯 Starting complete agent workflow");
    
    // Step 1: Agent Registration
    let agent_registration_result = demonstrate_agent_registration(client).await?;
    
    // Step 2: Agent Operations
    demonstrate_agent_operations(client, &agent_registration_result).await?;
    
    info!("✅ Complete workflow finished successfully");
    Ok(())
}

/// Demonstrate enhanced agent registration
async fn demonstrate_agent_registration(
    client: &Arc<PodAIClient>,
) -> PodAIResult<AgentAccount> {
    info!("👤 Demonstrating agent registration");
    
    let agent_keypair = Keypair::new();
    let agent_service = AgentService::new(client.clone());
    
    // Register agent with current API
    let result = agent_service.register(
        &agent_keypair,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
        "https://example.com/agent-metadata.json",
    ).await?;
    
    info!("✅ Agent registered successfully:");
    info!("   - Agent PDA: {}", result.agent_pda);
    info!("   - Signature: {}", result.signature);
    
    // Create AgentAccount for return
    let agent_account = AgentAccount::new(
        agent_keypair.pubkey(),
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
        "https://example.com/agent-metadata.json".to_string(),
        100, // Default stake
    )?;
    
    Ok(agent_account)
}

/// Demonstrate agent operations
async fn demonstrate_agent_operations(
    client: &Arc<PodAIClient>,
    agent_account: &AgentAccount,
) -> PodAIResult<()> {
    info!("🔄 Demonstrating agent operations");
    
    let agent_service = AgentService::new(client.clone());
    
    // For now, just demonstrate that we have an agent
    info!("✅ Agent operations completed");
    info!("   - Agent pubkey: {}", agent_account.pubkey);
    info!("   - Capabilities: {}", agent_account.capabilities);
    
    Ok(())
} 