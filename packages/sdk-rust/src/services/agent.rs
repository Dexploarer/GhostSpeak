//! Agent service implementation for PodAI SDK
//! 
//! Provides high-level agent operations including registration, capability management,
//! and performance tracking with comprehensive error handling and validation.

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::{agent::*, AgentCapabilities, AccountData};
use crate::utils::{find_agent_pda, transaction_factory::{TransactionFactory, TransactionConfig, TransactionResult, PriorityFeeStrategy, RetryPolicy}};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
};
use std::sync::Arc;

/// Service for managing AI agents
#[derive(Clone)]
pub struct AgentService {
    client: Arc<PodAIClient>,
}

impl AgentService {
    /// Create a new agent service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Register an agent with fast configuration
    pub async fn register_fast(
        &self,
        signer: &dyn Signer,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<RegisterAgentResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::fast());
        self.register_with_factory(&factory, signer, capabilities, metadata_uri).await
    }

    /// Register an agent with reliable configuration
    pub async fn register_reliable(
        &self,
        signer: &dyn Signer,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<RegisterAgentResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::reliable());
        self.register_with_factory(&factory, signer, capabilities, metadata_uri).await
    }

    /// Register an agent with factory pattern
    pub async fn register_with_factory(
        &self,
        factory: &TransactionFactory,
        signer: &dyn Signer,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<RegisterAgentResult> {
        let (agent_pda, bump) = find_agent_pda(&signer.pubkey());

        // Check if agent already exists
        if self.client.account_exists(&agent_pda).await? {
            return Err(PodAIError::agent("Agent already registered"));
        }

        // Create registration instruction
        let instruction = self.create_register_instruction(
            &signer.pubkey(),
            &agent_pda,
            capabilities,
            metadata_uri,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory
            .build_transaction(vec![instruction], &signer.pubkey(), &[signer])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        Ok(RegisterAgentResult {
            signature: result.signature,
            agent_pda,
            agent_pubkey: signer.pubkey(),
            capabilities,
            metadata_uri: metadata_uri.to_string(),
            timestamp: Utc::now(),
        })
    }

    /// Get agent account data
    pub async fn get_agent(&self, agent_address: &Pubkey) -> PodAIResult<AgentAccount> {
        match self.client.rpc_client.get_account(agent_address).await {
            Ok(account) => AgentAccount::from_bytes(&account.data),
            Err(_) => Err(PodAIError::account_not_found("Agent", &agent_address.to_string())),
        }
    }

    /// Update agent capabilities
    pub async fn update_capabilities(
        &self,
        agent_keypair: &Keypair,
        new_capabilities: u64,
    ) -> PodAIResult<TransactionResult> {
        let (agent_pda, _) = find_agent_pda(&agent_keypair.pubkey());

        // Verify agent exists
        let agent = self.get_agent(&agent_pda).await?;

        // Verify ownership
        if agent.pubkey != agent_keypair.pubkey() {
            return Err(PodAIError::agent("Not authorized to update this agent"));
        }

        // Create update instruction (simplified for now)
        let instruction = self.create_update_capabilities_instruction(
            &agent_keypair.pubkey(),
            &agent_pda,
            new_capabilities,
        )?;

        // Build and send transaction using factory
        let factory = TransactionFactory::new(&self.client);
        let transaction = factory
            .build_transaction(vec![instruction], &agent_keypair.pubkey(), &[agent_keypair])
            .await?;

        factory.send_transaction(&transaction).await
    }

    /// Update agent metadata URI
    pub async fn update_metadata_uri(
        &self,
        agent_keypair: &Keypair,
        new_metadata_uri: &str,
    ) -> PodAIResult<TransactionResult> {
        let (agent_pda, _) = find_agent_pda(&agent_keypair.pubkey());

        // Verify agent exists
        let agent = self.get_agent(&agent_pda).await?;

        // Verify ownership
        if agent.pubkey != agent_keypair.pubkey() {
            return Err(PodAIError::agent("Not authorized to update this agent"));
        }

        // Validate new URI
        if new_metadata_uri.len() > 200 {
            return Err(PodAIError::invalid_input(
                "metadata_uri",
                "URI too long (max 200 characters)",
            ));
        }

        // Create update instruction (simplified for now)
        let instruction = self.create_update_metadata_instruction(
            &agent_keypair.pubkey(),
            &agent_pda,
            new_metadata_uri,
        )?;

        // Build and send transaction using factory
        let factory = TransactionFactory::new(&self.client);
        let transaction = factory
            .build_transaction(vec![instruction], &agent_keypair.pubkey(), &[agent_keypair])
            .await?;

        factory.send_transaction(&transaction).await
    }

    /// Get agent PDA for a wallet
    pub fn get_agent_pda(&self, wallet: &Pubkey) -> (Pubkey, u8) {
        find_agent_pda(wallet)
    }

    /// Check if an agent is registered
    pub async fn is_registered(&self, wallet: &Pubkey) -> PodAIResult<bool> {
        let (agent_pda, _) = find_agent_pda(wallet);
        self.client.account_exists(&agent_pda).await
    }

    /// Get agent balance
    pub async fn get_balance(&self, agent_wallet: &Pubkey) -> PodAIResult<u64> {
        self.client.get_balance(agent_wallet).await
    }

    /// Validate agent capabilities
    pub fn validate_capabilities(&self, capabilities: u64) -> PodAIResult<Vec<AgentCapabilities>> {
        let parsed_capabilities = AgentCapabilities::from_bitmask(capabilities);
        
        if parsed_capabilities.is_empty() && capabilities != 0 {
            return Err(PodAIError::invalid_input(
                "capabilities",
                "Invalid capability bitmask",
            ));
        }

        Ok(parsed_capabilities)
    }

    /// Create register instruction for the agent
    fn create_register_instruction(
        &self,
        authority: &Pubkey,
        agent_pda: &Pubkey,
        capabilities: u64,
        metadata_uri: &str,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Validate metadata URI
        if metadata_uri.len() > 200 {
            return Err(PodAIError::invalid_input(
                "metadata_uri",
                "URI too long (max 200 characters)",
            ));
        }

        // Build instruction discriminator for register_agent
        let discriminator = [135, 157, 66, 195, 2, 113, 175, 30]; // register_agent discriminator

        // Serialize instruction data following Anchor patterns
        let mut instruction_data = Vec::with_capacity(
            8 + 8 + 4 + metadata_uri.len() + 1
        );
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(&capabilities.to_le_bytes());
        instruction_data.extend_from_slice(&(metadata_uri.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(metadata_uri.as_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*agent_pda, false),             // agent_account (writable, PDA)
            AccountMeta::new(*authority, true),              // authority (writable, signer)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create update capabilities instruction (simplified)
    fn create_update_capabilities_instruction(
        &self,
        authority: &Pubkey,
        agent_pda: &Pubkey,
        new_capabilities: u64,
    ) -> PodAIResult<Instruction> {
        // This would normally be a proper Anchor instruction
        // For now, create a placeholder instruction
        let discriminator = [123, 45, 67, 89, 10, 11, 12, 13]; // update_capabilities discriminator

        let mut instruction_data = Vec::with_capacity(8 + 8);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(&new_capabilities.to_le_bytes());

        let account_metas = vec![
            AccountMeta::new(*agent_pda, false),
            AccountMeta::new_readonly(*authority, true),
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create update metadata instruction (simplified)
    fn create_update_metadata_instruction(
        &self,
        authority: &Pubkey,
        agent_pda: &Pubkey,
        new_metadata_uri: &str,
    ) -> PodAIResult<Instruction> {
        // This would normally be a proper Anchor instruction
        // For now, create a placeholder instruction
        let discriminator = [234, 56, 78, 90, 12, 34, 56, 78]; // update_metadata discriminator

        let mut instruction_data = Vec::with_capacity(8 + 4 + new_metadata_uri.len());
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(&(new_metadata_uri.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(new_metadata_uri.as_bytes());

        let account_metas = vec![
            AccountMeta::new(*agent_pda, false),
            AccountMeta::new_readonly(*authority, true),
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Register a new agent with default configuration (legacy method)
    pub async fn register(
        &self,
        agent_keypair: &Keypair,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<RegisterAgentResult> {
        self.register_fast(agent_keypair, capabilities, metadata_uri).await
    }
}

/// Result of agent registration with enhanced information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterAgentResult {
    /// Transaction signature
    pub signature: Signature,
    /// The agent PDA address
    pub agent_pda: Pubkey,
    /// The agent's wallet public key
    pub agent_pubkey: Pubkey,
    /// Agent capabilities
    pub capabilities: u64,
    /// Metadata URI
    pub metadata_uri: String,
    /// Registration timestamp
    pub timestamp: DateTime<Utc>,
}

impl RegisterAgentResult {
    /// Get the agent's capabilities as enum values
    pub fn parsed_capabilities(&self) -> Vec<AgentCapabilities> {
        AgentCapabilities::from_bitmask(self.capabilities)
    }

    /// Check if agent has a specific capability
    pub fn has_capability(&self, capability: AgentCapabilities) -> bool {
        self.capabilities & (capability as u64) != 0
    }
}

/// Builder for agent registration with custom configuration
pub struct AgentRegistrationBuilder<'a> {
    service: &'a AgentService,
    transaction_config: Option<TransactionConfig>,
    priority_fee_strategy: Option<PriorityFeeStrategy>,
    retry_policy: Option<RetryPolicy>,
    simulate_before_send: Option<bool>,
}

impl<'a> AgentRegistrationBuilder<'a> {
    /// Create a new builder
    pub fn new(service: &'a AgentService) -> Self {
        Self {
            service,
            transaction_config: None,
            priority_fee_strategy: None,
            retry_policy: None,
            simulate_before_send: None,
        }
    }

    /// Set transaction configuration
    pub fn with_config(mut self, config: TransactionConfig) -> Self {
        self.transaction_config = Some(config);
        self
    }

    /// Set priority fee strategy
    pub fn with_priority_fee_strategy(mut self, strategy: PriorityFeeStrategy) -> Self {
        self.priority_fee_strategy = Some(strategy);
        self
    }

    /// Set retry policy
    pub fn with_retry_policy(mut self, policy: RetryPolicy) -> Self {
        self.retry_policy = Some(policy);
        self
    }

    /// Enable or disable simulation
    pub fn with_simulation(mut self, simulate: bool) -> Self {
        self.simulate_before_send = Some(simulate);
        self
    }

    /// Use fast execution configuration
    pub fn fast(mut self) -> Self {
        self.transaction_config = Some(TransactionConfig::fast());
        self
    }

    /// Use reliable execution configuration
    pub fn reliable(mut self) -> Self {
        self.transaction_config = Some(TransactionConfig::reliable());
        self
    }

    /// Execute the registration
    pub async fn execute(
        self,
        signer: &dyn Signer,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<RegisterAgentResult> {
        // Build configuration
        let mut config = self.transaction_config.unwrap_or_default();

        if let Some(strategy) = self.priority_fee_strategy {
            config = config.with_priority_fee_strategy(strategy);
        }

        if let Some(policy) = self.retry_policy {
            config = config.with_retry_policy(policy);
        }

        if let Some(simulate) = self.simulate_before_send {
            config = config.with_simulation(simulate);
        }

        // Create factory and execute
        let factory = TransactionFactory::with_config(&self.service.client, config);
        self.service.register_with_factory(&factory, signer, capabilities, metadata_uri).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_registration_result() {
        let agent_pda = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        
        let result = RegisterAgentResult {
            signature: Signature::default(),
            agent_pda,
            agent_pubkey: wallet,
            capabilities: AgentCapabilities::Communication as u64,
            metadata_uri: "https://example.com".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(result.agent_pubkey, wallet);
        assert_eq!(result.parsed_capabilities().len(), 1);
        assert_eq!(result.parsed_capabilities()[0], AgentCapabilities::Communication);
        assert_eq!(result.metadata_uri, "https://example.com");
    }
} 