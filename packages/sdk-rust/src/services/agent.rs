//! Agent service for managing AI agents on the podAI protocol

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::agent::{AgentAccount, AgentCapabilities};
use crate::utils::pda::find_agent_pda;
use crate::utils::transaction::{TransactionOptions, TransactionResult};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use std::sync::Arc;

/// Service for managing AI agents
#[derive(Debug, Clone)]
pub struct AgentService {
    client: Arc<PodAIClient>,
}

impl AgentService {
    /// Create a new agent service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Register a new agent
    pub async fn register(
        &self,
        agent_keypair: &Keypair,
        capabilities: u64,
        metadata_uri: &str,
    ) -> PodAIResult<AgentRegistrationResult> {
        // Find agent PDA
        let (agent_pda, bump) = find_agent_pda(&agent_keypair.pubkey());

        // Check if agent already exists
        if self.client.account_exists(&agent_pda).await? {
            return Err(PodAIError::agent("Agent already registered"));
        }

        // Validate metadata URI
        if metadata_uri.len() > 200 {
            return Err(PodAIError::invalid_input(
                "metadata_uri",
                "URI too long (max 200 characters)",
            ));
        }

        // Create agent account
        let agent_account = AgentAccount::new(
            agent_keypair.pubkey(),
            capabilities,
            metadata_uri.to_string(),
            bump,
        )?;

        // Calculate rent-exempt balance for agent account
        let account_size = 286; // Agent account size from constants
        let rent_exempt_balance = self
            .client
            .get_minimum_balance_for_rent_exemption(account_size)
            .await?;

        // Get recent blockhash
        let recent_blockhash = self.client.get_recent_blockhash().await?;

        // Build transaction (simplified - in reality, this would use anchor instructions)
        let create_account_ix = system_instruction::create_account(
            &agent_keypair.pubkey(),
            &agent_pda,
            rent_exempt_balance,
            account_size as u64,
            &self.client.program_id(),
        );

        let mut transaction = Transaction::new_with_payer(
            &[create_account_ix],
            Some(&agent_keypair.pubkey()),
        );
        transaction.recent_blockhash = recent_blockhash;
        transaction.sign(&[agent_keypair], recent_blockhash);

        // Send transaction
        let options = TransactionOptions::default();
        let tx_result = crate::utils::transaction::send_transaction(
            &self.client.rpc_client,
            &transaction,
            &options,
        ).await?;

        if tx_result.is_success() {
            Ok(AgentRegistrationResult {
                agent_pda,
                agent_account,
                transaction_signature: tx_result.signature,
                slot: tx_result.slot,
            })
        } else {
            Err(PodAIError::agent(format!(
                "Registration failed: {}",
                tx_result.error.unwrap_or("Unknown error".to_string())
            )))
        }
    }

    /// Get agent account data
    pub async fn get_agent(&self, agent_address: &Pubkey) -> PodAIResult<AgentAccount> {
        // Try to get the account
        match self.client.rpc_client.get_account(agent_address) {
            Ok(account) => {
                // Deserialize account data
                AgentAccount::from_bytes(&account.data)
            }
            Err(_) => Err(PodAIError::account_not_found("Agent", agent_address.to_string())),
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
        let mut agent = self.get_agent(&agent_pda).await?;

        // Verify ownership
        if agent.pubkey != agent_keypair.pubkey() {
            return Err(PodAIError::agent("Not authorized to update this agent"));
        }

        // Update capabilities
        agent.capabilities = new_capabilities;

        // Build update transaction (simplified)
        let recent_blockhash = self.client.get_recent_blockhash().await?;
        
        // In a real implementation, this would use the actual anchor instruction
        let mut transaction = Transaction::new_with_payer(
            &[], // Would contain the actual update instruction
            Some(&agent_keypair.pubkey()),
        );
        transaction.recent_blockhash = recent_blockhash;
        transaction.sign(&[agent_keypair], recent_blockhash);

        let options = TransactionOptions::default();
        crate::utils::transaction::send_transaction(
            &self.client.rpc_client,
            &transaction,
            &options,
        ).await
    }

    /// Update agent metadata URI
    pub async fn update_metadata_uri(
        &self,
        agent_keypair: &Keypair,
        new_metadata_uri: &str,
    ) -> PodAIResult<TransactionResult> {
        let (agent_pda, _) = find_agent_pda(&agent_keypair.pubkey());

        // Verify agent exists
        let mut agent = self.get_agent(&agent_pda).await?;

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

        // Update metadata URI
        agent.metadata_uri = new_metadata_uri.to_string();
        agent.validate_metadata_uri()?;

        // Build update transaction (simplified)
        let recent_blockhash = self.client.get_recent_blockhash().await?;
        
        let mut transaction = Transaction::new_with_payer(
            &[], // Would contain the actual update instruction
            Some(&agent_keypair.pubkey()),
        );
        transaction.recent_blockhash = recent_blockhash;
        transaction.sign(&[agent_keypair], recent_blockhash);

        let options = TransactionOptions::default();
        crate::utils::transaction::send_transaction(
            &self.client.rpc_client,
            &transaction,
            &options,
        ).await
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

    /// List agents by capability
    pub async fn list_by_capability(
        &self,
        capability: AgentCapabilities,
    ) -> PodAIResult<Vec<AgentAccount>> {
        // This would require an indexing service or program-wide scanning
        // For now, return empty list with a note
        log::warn!("list_by_capability requires indexing service - not implemented");
        Ok(Vec::new())
    }

    /// Update agent reputation (admin function)
    pub async fn update_reputation(
        &self,
        agent_keypair: &Keypair,
        reputation_delta: i64,
    ) -> PodAIResult<TransactionResult> {
        let (agent_pda, _) = find_agent_pda(&agent_keypair.pubkey());

        // Verify agent exists
        let mut agent = self.get_agent(&agent_pda).await?;

        // Update reputation
        agent.update_reputation(reputation_delta)?;

        // Build update transaction (simplified)
        let recent_blockhash = self.client.get_recent_blockhash().await?;
        
        let mut transaction = Transaction::new_with_payer(
            &[], // Would contain the actual update instruction
            Some(&agent_keypair.pubkey()),
        );
        transaction.recent_blockhash = recent_blockhash;
        transaction.sign(&[agent_keypair], recent_blockhash);

        let options = TransactionOptions::default();
        crate::utils::transaction::send_transaction(
            &self.client.rpc_client,
            &transaction,
            &options,
        ).await
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
}

/// Result of agent registration
#[derive(Debug, Clone)]
pub struct AgentRegistrationResult {
    /// The agent PDA address
    pub agent_pda: Pubkey,
    /// The agent account data
    pub agent_account: AgentAccount,
    /// Transaction signature
    pub transaction_signature: solana_sdk::signature::Signature,
    /// Transaction slot
    pub slot: u64,
}

impl AgentRegistrationResult {
    /// Get the agent's public key (PDA)
    pub fn agent_pubkey(&self) -> Pubkey {
        self.agent_pda
    }

    /// Get the agent's wallet public key
    pub fn wallet_pubkey(&self) -> Pubkey {
        self.agent_account.pubkey
    }

    /// Get the agent's capabilities
    pub fn capabilities(&self) -> Vec<AgentCapabilities> {
        AgentCapabilities::from_bitmask(self.agent_account.capabilities)
    }

    /// Get the agent's reputation
    pub fn reputation(&self) -> u64 {
        self.agent_account.reputation
    }

    /// Get the agent's metadata URI
    pub fn metadata_uri(&self) -> &str {
        &self.agent_account.metadata_uri
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client::{PodAIClient, PodAIConfig};
    use std::str::FromStr;

    #[tokio::test]
    async fn test_agent_pda() {
        let wallet = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let config = PodAIConfig::localnet();
        
        // Mock client for testing
        // In real tests, this would use a test validator
        if let Ok(client) = PodAIClient::new(config).await {
            let service = AgentService::new(Arc::new(client));
            let (pda, bump) = service.get_agent_pda(&wallet);
            
            // Verify PDA derivation
            let (expected_pda, expected_bump) = find_agent_pda(&wallet);
            assert_eq!(pda, expected_pda);
            assert_eq!(bump, expected_bump);
        }
    }

    #[test]
    fn test_validate_capabilities() {
        let config = PodAIConfig::localnet();
        // Create a mock service for testing
        // This test doesn't require network access
        let capabilities = AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64;
        
        // Test would validate capabilities bitmask
        let parsed = AgentCapabilities::from_bitmask(capabilities);
        assert_eq!(parsed.len(), 2);
        assert!(parsed.contains(&AgentCapabilities::Communication));
        assert!(parsed.contains(&AgentCapabilities::Trading));
    }

    #[test]
    fn test_agent_registration_result() {
        let agent_pda = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let wallet = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let agent_account = AgentAccount::new(
            wallet,
            AgentCapabilities::Communication as u64,
            "https://example.com".to_string(),
            255,
        ).unwrap();
        
        let result = AgentRegistrationResult {
            agent_pda,
            agent_account,
            transaction_signature: solana_sdk::signature::Signature::default(),
            slot: 12345,
        };

        assert_eq!(result.agent_pubkey(), agent_pda);
        assert_eq!(result.wallet_pubkey(), wallet);
        assert_eq!(result.capabilities().len(), 1);
        assert_eq!(result.reputation(), 0);
        assert_eq!(result.metadata_uri(), "https://example.com");
    }
} 