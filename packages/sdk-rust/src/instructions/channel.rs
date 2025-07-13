use std::sync::Arc;

use async_trait::async_trait;
use borsh::{BorshSerialize, BorshDeserialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
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
    types::channel::{Channel, ChannelType},
    utils::find_channel_pda,
    impl_instruction_builder_basics,
};

// Instruction discriminators for channel operations
const CREATE_CHANNEL_DISCRIMINATOR: [u8; 8] = [116, 138, 172, 248, 94, 39, 19, 179];
const ADD_PARTICIPANT_DISCRIMINATOR: [u8; 8] = [108, 227, 130, 130, 252, 109, 75, 218];
const SEND_MESSAGE_DISCRIMINATOR: [u8; 8] = [154, 208, 10, 204, 134, 152, 135, 17];
const BROADCAST_MESSAGE_DISCRIMINATOR: [u8; 8] = [96, 150, 81, 215, 118, 164, 255, 181];

// Instruction data structures
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CreateChannelInstructionData {
    pub name: String,
    pub channel_type: u8,
    pub metadata_uri: String,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AddParticipantInstructionData {
    pub participant: Pubkey,
    pub permissions: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SendMessageInstructionData {
    pub content: Vec<u8>,
    pub encrypted: bool,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct BroadcastMessageInstructionData {
    pub content: Vec<u8>,
    pub priority: u8,
}

/// Result of channel creation
#[derive(Debug, Clone)]
pub struct ChannelCreationResult {
    pub signature: solana_sdk::signature::Signature,
    pub channel_pda: Pubkey,
    pub channel_id: u64,
    pub transaction_result: TransactionResult,
}

/// Builder for creating a channel
pub struct CreateChannelBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    name: Option<String>,
    channel_type: Option<ChannelType>,
    metadata_uri: Option<String>,
    transaction_factory: Option<TransactionFactory>,
}

impl CreateChannelBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            name: None,
            channel_type: None,
            metadata_uri: None,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    pub fn channel_type(mut self, channel_type: ChannelType) -> Self {
        self.channel_type = Some(channel_type);
        self
    }

    pub fn metadata_uri(mut self, uri: impl Into<String>) -> Self {
        self.metadata_uri = Some(uri.into());
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    fn validate_params(&self) -> PodAIResult<()> {
        if self.signer.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "signer".to_string(),
                reason: "Signer is required".to_string(),
            });
        }

        if self.name.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "name".to_string(),
                reason: "Channel name is required".to_string(),
            });
        }

        if let Some(name) = &self.name {
            if name.len() > 50 {
                return Err(PodAIError::InvalidInput {
                    field: "name".to_string(),
                    reason: "Channel name too long (max 50 chars)".to_string(),
                });
            }
        }

        Ok(())
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<ChannelCreationResult> {
        debug!("Executing channel creation");
        
        self.validate_params()?;

        let signer = self.signer.unwrap();
        let name = self.name.unwrap();
        let channel_type = self.channel_type.unwrap_or(ChannelType::Public);
        let metadata_uri = self.metadata_uri.unwrap_or_default();

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        // Generate channel ID
        let channel_id = chrono::Utc::now().timestamp() as u64;
        let channel_pda = find_channel_pda(&signer.pubkey(), channel_id);

        let instruction_builder = CreateChannelInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            name,
            channel_type,
            metadata_uri,
            channel_id,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        Ok(ChannelCreationResult {
            signature: transaction_result.signature,
            channel_pda,
            channel_id,
            transaction_result,
        })
    }
}

/// Internal instruction builder for channel creation
struct CreateChannelInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    name: String,
    channel_type: ChannelType,
    metadata_uri: String,
    channel_id: u64,
}

#[async_trait]
impl InstructionBuilder for CreateChannelInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let channel_pda = find_channel_pda(&self.signer.pubkey(), self.channel_id);
        
        let instruction = build_create_channel_instruction(
            &self.signer.pubkey(),
            &channel_pda,
            &self.name,
            self.channel_type,
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
        "create_channel"
    }

    fn validate(&self) -> PodAIResult<()> {
        if self.name.len() > 50 {
            return Err(PodAIError::ValidationFailed {
                field: "name".to_string(),
                reason: "Name too long".to_string(),
            });
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for CreateChannelInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        60_000
    }
}

/// Builder for sending a message
pub struct SendMessageBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    channel: Option<Pubkey>,
    content: Option<Vec<u8>>,
    encrypted: bool,
    transaction_factory: Option<TransactionFactory>,
}

impl SendMessageBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            channel: None,
            content: None,
            encrypted: false,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn channel(mut self, channel: Pubkey) -> Self {
        self.channel = Some(channel);
        self
    }

    pub fn content(mut self, content: impl Into<Vec<u8>>) -> Self {
        self.content = Some(content.into());
        self
    }

    pub fn content_string(mut self, content: impl Into<String>) -> Self {
        self.content = Some(content.into().into_bytes());
        self
    }

    pub fn encrypted(mut self, encrypted: bool) -> Self {
        self.encrypted = encrypted;
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<TransactionResult> {
        debug!("Executing send message");

        let signer = self.signer.ok_or_else(|| PodAIError::InvalidInput {
            field: "signer".to_string(),
            reason: "Signer is required".to_string(),
        })?;

        let channel = self.channel.ok_or_else(|| PodAIError::InvalidInput {
            field: "channel".to_string(),
            reason: "Channel is required".to_string(),
        })?;

        let content = self.content.ok_or_else(|| PodAIError::InvalidInput {
            field: "content".to_string(),
            reason: "Message content is required".to_string(),
        })?;

        if content.len() > 1000 {
            return Err(PodAIError::InvalidInput {
                field: "content".to_string(),
                reason: "Message too long (max 1000 bytes)".to_string(),
            });
        }

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let instruction_builder = SendMessageInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            channel,
            content,
            encrypted: self.encrypted,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await
    }
}

/// Internal instruction builder for sending messages
struct SendMessageInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    channel: Pubkey,
    content: Vec<u8>,
    encrypted: bool,
}

#[async_trait]
impl InstructionBuilder for SendMessageInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        // Verify channel exists
        let _channel_account = self.client
            .get_account(&self.channel)
            .await
            .map_err(|_| PodAIError::AccountNotFound {
                account_type: "Channel".to_string(),
                address: self.channel.to_string(),
            })?;

        let instruction = build_send_message_instruction(
            &self.signer.pubkey(),
            &self.channel,
            &self.content,
            self.encrypted,
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
        "send_message"
    }
}

impl ComputeUnitEstimator for SendMessageInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        40_000
    }
}

// Helper functions to build Anchor-compatible instructions

fn build_create_channel_instruction(
    creator: &Pubkey,
    channel_pda: &Pubkey,
    name: &str,
    channel_type: ChannelType,
    metadata_uri: &str,
) -> PodAIResult<Instruction> {
    let accounts = vec![
        AccountMeta::new(*channel_pda, false),
        AccountMeta::new(*creator, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&CREATE_CHANNEL_DISCRIMINATOR);
    
    let args = CreateChannelInstructionData {
        name: name.to_string(),
        channel_type: channel_type as u8,
        metadata_uri: metadata_uri.to_string(),
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize create_channel instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

fn build_send_message_instruction(
    sender: &Pubkey,
    channel: &Pubkey,
    content: &[u8],
    encrypted: bool,
) -> PodAIResult<Instruction> {
    // Find message PDA
    let message_id = chrono::Utc::now().timestamp() as u64;
    let (message_pda, _) = Pubkey::find_program_address(
        &[b"message", channel.as_ref(), &message_id.to_le_bytes()],
        &crate::PROGRAM_ID,
    );

    let accounts = vec![
        AccountMeta::new(*channel, false),
        AccountMeta::new(message_pda, false),
        AccountMeta::new(*sender, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&SEND_MESSAGE_DISCRIMINATOR);
    
    let args = SendMessageInstructionData {
        content: content.to_vec(),
        encrypted,
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize send_message instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_channel_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        
        let builder = CreateChannelBuilder::new(client)
            .signer(signer)
            .name("AI Agent Coordination")
            .channel_type(ChannelType::Private);
        
        assert!(builder.validate_params().is_ok());
    }

    #[tokio::test]
    async fn test_send_message_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        let channel = Pubkey::new_unique();
        
        let builder = SendMessageBuilder::new(client)
            .signer(signer)
            .channel(channel)
            .content_string("Hello from AI agent!")
            .encrypted(false);
        
        // Basic validation
        assert!(builder.content.is_some());
        assert!(!builder.encrypted);
    }
}