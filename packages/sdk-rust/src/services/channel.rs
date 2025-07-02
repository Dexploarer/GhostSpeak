//! Channel service for managing group communication channels

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::channel::{ChannelAccount, ChannelVisibility};
use crate::utils::pda::{find_channel_pda, find_channel_participant_pda};
use crate::utils::{TransactionFactory, TransactionConfig, PriorityFeeStrategy, RetryPolicy};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
};
use std::sync::Arc;
use crate::types::AccountData;

/// Service for managing channels
pub struct ChannelService {
    client: Arc<PodAIClient>,
}

impl ChannelService {
    /// Create a new channel service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create a new channel with modern transaction patterns
    pub async fn create_channel_with_factory(
        &self,
        factory: &TransactionFactory,
        creator: &dyn Signer,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
        // Validate channel name
        if name.is_empty() || name.len() > 64 {
            return Err(PodAIError::invalid_input(
                "name",
                "Channel name must be 1-64 characters",
            ));
        }

        let (channel_pda, bump) = find_channel_pda(&creator.pubkey(), name);

        // Check if channel already exists
        if self.client.account_exists(&channel_pda).await? {
            return Err(PodAIError::channel("Channel already exists"));
        }

        // Create channel creation instruction
        let instruction = self.create_channel_instruction(
            &creator.pubkey(),
            &channel_pda,
            name,
            visibility.clone(),
            fee_per_message,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory
            .build_transaction(vec![instruction], &creator.pubkey(), &[creator])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        // Create channel account for the result (simplified validation)
        let _channel_account = ChannelAccount::new(
            creator.pubkey(),
            name.to_string(),
            "".to_string(), // description
            visibility.clone(),
            1000, // max_participants
            fee_per_message.unwrap_or(0),
            bump,
        )?;

        Ok(ChannelCreationResult {
            signature: result.signature,
            channel_pda,
            channel_name: name.to_string(),
            creator: creator.pubkey(),
            visibility,
            fee_per_message,
            timestamp: Utc::now(),
        })
    }

    /// Create a channel with fast configuration
    pub async fn create_channel_fast(
        &self,
        creator: &dyn Signer,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::fast());
        self.create_channel_with_factory(&factory, creator, name, visibility, fee_per_message).await
    }

    /// Create a channel with reliable configuration
    pub async fn create_channel_reliable(
        &self,
        creator: &dyn Signer,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::reliable());
        self.create_channel_with_factory(&factory, creator, name, visibility, fee_per_message).await
    }

    /// Create a builder for channel creation with custom configuration
    pub fn create_channel_builder(&self) -> ChannelCreationBuilder {
        ChannelCreationBuilder::new(self)
    }

    /// Join a channel with factory pattern
    pub async fn join_channel_with_factory(
        &self,
        factory: &TransactionFactory,
        participant: &dyn Signer,
        channel_pda: &Pubkey,
    ) -> PodAIResult<ChannelJoinResult> {
        // Get channel info
        let _channel = self.get_channel(channel_pda).await?;
        
        // Find participant PDA
        let (participant_pda, bump) = find_channel_participant_pda(
            channel_pda,
            &participant.pubkey(),
        );

        // Check if already a participant
        if self.client.account_exists(&participant_pda).await? {
            return Err(PodAIError::channel("Already a participant in this channel"));
        }

        // Create join instruction
        let instruction = self.create_join_instruction(
            &participant.pubkey(),
            channel_pda,
            &participant_pda,
            bump,
        )?;

        // Build and send transaction
        let transaction = factory
            .build_transaction(vec![instruction], &participant.pubkey(), &[participant])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        Ok(ChannelJoinResult {
            signature: result.signature,
            channel_pda: *channel_pda,
            participant_pda,
            participant: participant.pubkey(),
            timestamp: Utc::now(),
        })
    }

    /// Get channel account data
    pub async fn get_channel(&self, channel_pda: &Pubkey) -> PodAIResult<ChannelAccount> {
        match self.client.rpc_client.get_account(channel_pda).await {
            Ok(account) => ChannelAccount::from_bytes(&account.data),
            Err(_) => Err(PodAIError::account_not_found("Channel", &channel_pda.to_string())),
        }
    }

    /// Get channel PDA
    pub fn get_channel_pda(&self, creator: &Pubkey, name: &str) -> (Pubkey, u8) {
        find_channel_pda(creator, name)
    }

    /// Get participant PDA
    pub fn get_participant_pda(&self, channel: &Pubkey, participant: &Pubkey) -> (Pubkey, u8) {
        find_channel_participant_pda(channel, participant)
    }

    /// Create instruction for channel creation
    fn create_channel_instruction(
        &self,
        creator: &Pubkey,
        channel_pda: &Pubkey,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for create_channel (based on Anchor patterns)
        let discriminator = [142, 179, 25, 199, 84, 243, 69, 80]; // create_channel discriminator

        // Serialize instruction data following Anchor patterns
        let mut instruction_data = Vec::with_capacity(
            8 + 4 + name.len() + 1 + 8 + 1
        );
        instruction_data.extend_from_slice(&discriminator);
        
        // Add name (string with length prefix)
        instruction_data.extend_from_slice(&(name.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(name.as_bytes());
        
        // Add visibility (u8 enum)
        instruction_data.push(visibility as u8);
        
        // Add fee_per_message (optional u64 - serialize 0 if None)
        instruction_data.extend_from_slice(&fee_per_message.unwrap_or(0).to_le_bytes());
        
        // Add bump seed
        instruction_data.push(bump);

        // Build account metas following Anchor constraint patterns
        let account_metas = vec![
            AccountMeta::new(*channel_pda, false),           // channel_account (writable, PDA)
            AccountMeta::new(*creator, true),                // creator (writable, signer)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create instruction for joining a channel
    fn create_join_instruction(
        &self,
        participant: &Pubkey,
        channel_pda: &Pubkey,
        participant_pda: &Pubkey,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for join_channel
        let discriminator = [15, 40, 235, 178, 191, 96, 190, 12]; // join_channel discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*channel_pda, false),           // channel_account (writable)
            AccountMeta::new(*participant_pda, false),       // participant_account (writable, PDA)
            AccountMeta::new(*participant, true),            // participant (writable, signer)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create a new channel (legacy method)
    pub async fn create_channel(
        &self,
        creator_keypair: &Keypair,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
        self.create_channel_fast(creator_keypair, name, visibility, fee_per_message).await
    }
}

/// Result of channel creation with enhanced information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelCreationResult {
    /// Transaction signature
    pub signature: Signature,
    /// The channel PDA
    pub channel_pda: Pubkey,
    /// Channel name
    pub channel_name: String,
    /// Channel creator
    pub creator: Pubkey,
    /// Channel visibility
    pub visibility: ChannelVisibility,
    /// Fee per message (if any)
    pub fee_per_message: Option<u64>,
    /// Creation timestamp
    pub timestamp: DateTime<Utc>,
}

/// Result of joining a channel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelJoinResult {
    /// Transaction signature
    pub signature: Signature,
    /// The channel PDA
    pub channel_pda: Pubkey,
    /// The participant PDA
    pub participant_pda: Pubkey,
    /// Participant pubkey
    pub participant: Pubkey,
    /// Join timestamp
    pub timestamp: DateTime<Utc>,
}

/// Builder for channel creation with custom configuration
pub struct ChannelCreationBuilder<'a> {
    service: &'a ChannelService,
    transaction_config: Option<TransactionConfig>,
    priority_fee_strategy: Option<PriorityFeeStrategy>,
    retry_policy: Option<RetryPolicy>,
    simulate_before_send: Option<bool>,
}

impl<'a> ChannelCreationBuilder<'a> {
    /// Create a new builder
    pub fn new(service: &'a ChannelService) -> Self {
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

    /// Execute the channel creation
    pub async fn execute(
        self,
        creator: &dyn Signer,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
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
        self.service.create_channel_with_factory(&factory, creator, name, visibility, fee_per_message).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client::{PodAIClient, PodAIConfig};
    use std::str::FromStr;

    #[tokio::test]
    async fn test_channel_pda() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let config = PodAIConfig::localnet();
        
        if let Ok(client) = PodAIClient::new(config).await {
            let service = ChannelService::new(Arc::new(client));
            let (pda, bump) = service.get_channel_pda(&creator, "test-channel");
            
            // Verify PDA derivation
            let (expected_pda, expected_bump) = find_channel_pda(&creator, "test-channel");
            assert_eq!(pda, expected_pda);
            assert_eq!(bump, expected_bump);
        }
    }

    #[test]
    fn test_channel_creation_result() {
        let result = ChannelCreationResult {
            signature: Signature::default(),
            channel_pda: Pubkey::default(),
            channel_name: "test-channel".to_string(),
            creator: Pubkey::default(),
            visibility: ChannelVisibility::Public,
            fee_per_message: Some(1000),
            timestamp: Utc::now(),
        };

        assert_eq!(result.channel_name, "test-channel");
        assert_eq!(result.visibility, ChannelVisibility::Public);
        assert_eq!(result.fee_per_message, Some(1000));
    }
}


