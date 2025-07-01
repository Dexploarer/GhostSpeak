use std::sync::Arc;

use async_trait::async_trait;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_program,
};
use tracing::{debug, instrument};

use crate::{
    client::PodAIClient,
    client::transaction_factory::{TransactionFactory, TransactionResult},
    errors::{PodAIError, PodAIResult},
    instructions::{ComputeUnitEstimator, InstructionBuilder},
    types::agent::{AgentAccount, AgentCapabilities},
    utils::find_agent_pda,
    impl_instruction_builder_basics,
};

/// Result of agent registration
#[derive(Debug, Clone)]
pub struct AgentRegistrationResult {
    pub signature: solana_sdk::signature::Signature,
    pub agent_pda: Pubkey,
    pub capabilities: u64,
    pub metadata_uri: String,
    pub transaction_result: TransactionResult,
}

/// Builder for agent registration instruction
pub struct AgentRegistrationBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    capabilities: Option<u64>,
    metadata_uri: Option<String>,
    transaction_factory: Option<TransactionFactory>,
}

impl AgentRegistrationBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            capabilities: None,
            metadata_uri: None,
            transaction_factory: None,
        }
    }

    /// Set the signer (agent keypair)
    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    /// Set agent capabilities
    pub fn capabilities(mut self, capabilities: AgentCapabilities) -> Self {
        self.capabilities = Some(capabilities.bits());
        self
    }

    /// Set agent capabilities from raw bits
    pub fn capabilities_raw(mut self, capabilities: u64) -> Self {
        self.capabilities = Some(capabilities);
        self
    }

    /// Set metadata URI
    pub fn metadata_uri(mut self, uri: impl Into<String>) -> Self {
        self.metadata_uri = Some(uri.into());
        self
    }

    /// Set custom transaction factory
    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    /// Validate all parameters before building
    fn validate_params(&self) -> PodAIResult<()> {
        if self.signer.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "signer".to_string(),
                reason: "Signer is required for agent registration".to_string(),
            });
        }

        if self.capabilities.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "capabilities".to_string(),
                reason: "Capabilities are required for agent registration".to_string(),
            });
        }

        if let Some(uri) = &self.metadata_uri {
            if uri.len() > 200 {
                return Err(PodAIError::InvalidInput {
                    field: "metadata_uri".to_string(),
                    reason: "Metadata URI too long (max 200 chars)".to_string(),
                });
            }

            if !uri.starts_with("https://") {
                return Err(PodAIError::InvalidInput {
                    field: "metadata_uri".to_string(),
                    reason: "Metadata URI must use HTTPS".to_string(),
                });
            }
        }

        Ok(())
    }

    /// Execute the agent registration
    #[instrument(skip(self), fields(capabilities = ?self.capabilities))]
    pub async fn execute(self) -> PodAIResult<AgentRegistrationResult> {
        debug!("Executing agent registration");
        
        self.validate_params()?;

        let signer = self.signer.unwrap();
        let capabilities = self.capabilities.unwrap();
        let metadata_uri = self.metadata_uri.unwrap_or_default();

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let instruction_builder = AgentRegistrationInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            capabilities,
            metadata_uri: metadata_uri.clone(),
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        let agent_pda = find_agent_pda(&signer.pubkey());

        Ok(AgentRegistrationResult {
            signature: transaction_result.signature,
            agent_pda,
            capabilities,
            metadata_uri,
            transaction_result,
        })
    }
}

/// Internal instruction builder for agent registration
struct AgentRegistrationInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    capabilities: u64,
    metadata_uri: String,
}

#[async_trait]
impl InstructionBuilder for AgentRegistrationInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let agent_pda = find_agent_pda(&self.signer.pubkey());
        
        // Check if agent already exists
        if let Ok(_existing_agent) = self.client.get_account(&agent_pda).await {
            return Err(PodAIError::InvalidInput {
                field: "agent".to_string(),
                reason: "Agent already registered".to_string(),
            });
        }

        // Build the register agent instruction
        let instruction = build_register_agent_instruction(
            &self.signer.pubkey(),
            &agent_pda,
            self.capabilities,
            &self.metadata_uri,
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "register_agent"
    }

    fn validate(&self) -> PodAIResult<()> {
        if self.metadata_uri.len() > 200 {
            return Err(PodAIError::ValidationFailed {
                field: "metadata_uri".to_string(),
                reason: "URI too long".to_string(),
            });
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for AgentRegistrationInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Agent registration is relatively simple
        50_000
    }
}

/// Builder for agent update instruction
pub struct AgentUpdateBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    capabilities: Option<u64>,
    metadata_uri: Option<String>,
    transaction_factory: Option<TransactionFactory>,
}

impl AgentUpdateBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            capabilities: None,
            metadata_uri: None,
            transaction_factory: None,
        }
    }

    /// Set the signer (agent keypair)
    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    /// Set new capabilities (optional)
    pub fn capabilities(mut self, capabilities: AgentCapabilities) -> Self {
        self.capabilities = Some(capabilities.bits());
        self
    }

    /// Set new metadata URI (optional)
    pub fn metadata_uri(mut self, uri: impl Into<String>) -> Self {
        self.metadata_uri = Some(uri.into());
        self
    }

    /// Set custom transaction factory
    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    /// Execute the agent update
    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<TransactionResult> {
        debug!("Executing agent update");

        let signer = self.signer.ok_or_else(|| PodAIError::InvalidInput {
            field: "signer".to_string(),
            reason: "Signer is required for agent update".to_string(),
        })?;

        // Verify agent exists
        let agent_pda = find_agent_pda(&signer.pubkey());
        let _agent_account = self.client
            .get_account(&agent_pda)
            .await
            .map_err(|_| PodAIError::AccountNotFound {
                account_type: "Agent".to_string(),
                address: agent_pda.to_string(),
            })?;

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let instruction_builder = AgentUpdateInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            capabilities: self.capabilities,
            metadata_uri: self.metadata_uri,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await
    }
}

/// Internal instruction builder for agent updates
struct AgentUpdateInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    capabilities: Option<u64>,
    metadata_uri: Option<String>,
}

#[async_trait]
impl InstructionBuilder for AgentUpdateInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let agent_pda = find_agent_pda(&self.signer.pubkey());

        let instruction = build_update_agent_instruction(
            &self.signer.pubkey(),
            &agent_pda,
            self.capabilities,
            self.metadata_uri.as_deref(),
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "update_agent"
    }

    fn validate(&self) -> PodAIResult<()> {
        if let Some(uri) = &self.metadata_uri {
            if uri.len() > 200 {
                return Err(PodAIError::ValidationFailed {
                    field: "metadata_uri".to_string(),
                    reason: "URI too long".to_string(),
                });
            }
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for AgentUpdateInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Agent update is simpler than registration
        30_000
    }
}

// Helper functions to build actual Solana instructions
// These would integrate with your actual smart contract instruction builders

fn build_register_agent_instruction(
    signer: &Pubkey,
    agent_pda: &Pubkey,
    capabilities: u64,
    metadata_uri: &str,
) -> PodAIResult<Instruction> {
    // This would use your actual smart contract instruction building
    // For now, return a placeholder that shows the structure
    
    use solana_sdk::instruction::{AccountMeta, Instruction};
    
    let accounts = vec![
        AccountMeta::new(*agent_pda, false),
        AccountMeta::new(*signer, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    // This would use your actual program's instruction data format
    let instruction_data = format!("register_agent:{}:{}", capabilities, metadata_uri);
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data.into_bytes(),
    })
}

fn build_update_agent_instruction(
    signer: &Pubkey,
    agent_pda: &Pubkey,
    capabilities: Option<u64>,
    metadata_uri: Option<&str>,
) -> PodAIResult<Instruction> {
    use solana_sdk::instruction::{AccountMeta, Instruction};
    
    let accounts = vec![
        AccountMeta::new(*agent_pda, false),
        AccountMeta::new_readonly(*signer, true),
    ];

    // Build instruction data based on what's being updated
    let mut instruction_data = "update_agent".to_string();
    if let Some(caps) = capabilities {
        instruction_data.push_str(&format!(":capabilities:{}", caps));
    }
    if let Some(uri) = metadata_uri {
        instruction_data.push_str(&format!(":metadata_uri:{}", uri));
    }
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data.into_bytes(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::signature::Keypair;

    #[tokio::test]
    async fn test_agent_registration_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        
        let builder = AgentRegistrationBuilder::new(client)
            .signer(signer)
            .capabilities(AgentCapabilities::Communication)
            .metadata_uri("https://example.com/metadata.json");
        
        // Test validation
        assert!(builder.validate_params().is_ok());
    }

    #[test]
    fn test_agent_registration_validation() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        
        // Test missing signer
        let builder = AgentRegistrationBuilder::new(client.clone())
            .capabilities(AgentCapabilities::Communication)
            .metadata_uri("https://example.com/metadata.json");
        
        assert!(builder.validate_params().is_err());
        
        // Test invalid URI
        let signer = Keypair::new();
        let builder = AgentRegistrationBuilder::new(client)
            .signer(signer)
            .capabilities(AgentCapabilities::Communication)
            .metadata_uri("http://insecure.com/metadata.json");
        
        assert!(builder.validate_params().is_err());
    }
} 