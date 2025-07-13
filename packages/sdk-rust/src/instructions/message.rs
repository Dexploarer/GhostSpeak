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
    types::message::{Message, MessageType},
    utils::find_message_pda,
    impl_instruction_builder_basics,
};

// Instruction discriminators for message operations
const SEND_DIRECT_MESSAGE_DISCRIMINATOR: [u8; 8] = [182, 94, 226, 201, 42, 249, 43, 236];
const SEND_SYSTEM_MESSAGE_DISCRIMINATOR: [u8; 8] = [117, 206, 69, 188, 165, 180, 17, 84];
const MARK_MESSAGE_READ_DISCRIMINATOR: [u8; 8] = [233, 25, 117, 208, 77, 63, 160, 146];
const DELETE_MESSAGE_DISCRIMINATOR: [u8; 8] = [50, 172, 141, 22, 187, 97, 234, 120];

// Instruction data structures
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SendDirectMessageInstructionData {
    pub recipient: Pubkey,
    pub content: Vec<u8>,
    pub encrypted: bool,
    pub priority: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SendSystemMessageInstructionData {
    pub message_type: u8,
    pub content: Vec<u8>,
    pub targets: Vec<Pubkey>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct MarkMessageReadInstructionData {
    pub message_id: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct DeleteMessageInstructionData {
    pub message_id: u64,
}

/// Result of message sending
#[derive(Debug, Clone)]
pub struct MessageSendResult {
    pub signature: solana_sdk::signature::Signature,
    pub message_pda: Pubkey,
    pub message_id: u64,
    pub transaction_result: TransactionResult,
}

/// Builder for sending a direct message
pub struct SendDirectMessageBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    recipient: Option<Pubkey>,
    content: Option<Vec<u8>>,
    encrypted: bool,
    priority: u8,
    transaction_factory: Option<TransactionFactory>,
}

impl SendDirectMessageBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            recipient: None,
            content: None,
            encrypted: false,
            priority: 0,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn recipient(mut self, recipient: Pubkey) -> Self {
        self.recipient = Some(recipient);
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

    pub fn priority(mut self, priority: u8) -> Self {
        self.priority = priority.min(10); // Cap at 10
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

        if self.recipient.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "recipient".to_string(),
                reason: "Recipient is required".to_string(),
            });
        }

        if self.content.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "content".to_string(),
                reason: "Message content is required".to_string(),
            });
        }

        if let Some(content) = &self.content {
            if content.len() > 5000 {
                return Err(PodAIError::InvalidInput {
                    field: "content".to_string(),
                    reason: "Message too long (max 5000 bytes)".to_string(),
                });
            }
        }

        Ok(())
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<MessageSendResult> {
        debug!("Executing direct message send");
        
        self.validate_params()?;

        let signer = self.signer.unwrap();
        let recipient = self.recipient.unwrap();
        let content = self.content.unwrap();

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        // Generate message ID
        let message_id = chrono::Utc::now().timestamp() as u64;
        let message_pda = find_message_pda(&signer.pubkey(), &recipient, message_id);

        let instruction_builder = SendDirectMessageInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            recipient,
            content,
            encrypted: self.encrypted,
            priority: self.priority,
            message_id,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        Ok(MessageSendResult {
            signature: transaction_result.signature,
            message_pda,
            message_id,
            transaction_result,
        })
    }
}

/// Internal instruction builder for direct message sending
struct SendDirectMessageInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    recipient: Pubkey,
    content: Vec<u8>,
    encrypted: bool,
    priority: u8,
    message_id: u64,
}

#[async_trait]
impl InstructionBuilder for SendDirectMessageInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let message_pda = find_message_pda(&self.signer.pubkey(), &self.recipient, self.message_id);
        
        // Verify recipient exists (has an agent account)
        let recipient_agent_pda = crate::utils::find_agent_pda(&self.recipient);
        let _recipient_exists = self.client
            .get_account(&recipient_agent_pda)
            .await
            .map_err(|_| PodAIError::InvalidInput {
                field: "recipient".to_string(),
                reason: "Recipient agent not found".to_string(),
            })?;

        let instruction = build_send_direct_message_instruction(
            &self.signer.pubkey(),
            &self.recipient,
            &message_pda,
            &self.content,
            self.encrypted,
            self.priority,
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
        "send_direct_message"
    }

    fn validate(&self) -> PodAIResult<()> {
        if self.content.len() > 5000 {
            return Err(PodAIError::ValidationFailed {
                field: "content".to_string(),
                reason: "Content too long".to_string(),
            });
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for SendDirectMessageInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Message sending with encryption check
        if self.encrypted {
            60_000
        } else {
            40_000
        }
    }
}

/// Builder for sending system messages
pub struct SendSystemMessageBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    message_type: Option<MessageType>,
    content: Option<Vec<u8>>,
    targets: Vec<Pubkey>,
    transaction_factory: Option<TransactionFactory>,
}

impl SendSystemMessageBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            message_type: None,
            content: None,
            targets: Vec::new(),
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn message_type(mut self, message_type: MessageType) -> Self {
        self.message_type = Some(message_type);
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

    pub fn add_target(mut self, target: Pubkey) -> Self {
        self.targets.push(target);
        self
    }

    pub fn targets(mut self, targets: Vec<Pubkey>) -> Self {
        self.targets = targets;
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<TransactionResult> {
        debug!("Executing system message send");

        let signer = self.signer.ok_or_else(|| PodAIError::InvalidInput {
            field: "signer".to_string(),
            reason: "Signer is required".to_string(),
        })?;

        let message_type = self.message_type.unwrap_or(MessageType::SystemNotification);
        let content = self.content.unwrap_or_default();

        if self.targets.is_empty() {
            return Err(PodAIError::InvalidInput {
                field: "targets".to_string(),
                reason: "At least one target is required".to_string(),
            });
        }

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let instruction_builder = SendSystemMessageInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            message_type,
            content,
            targets: self.targets,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await
    }
}

/// Internal instruction builder for system message sending
struct SendSystemMessageInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    message_type: MessageType,
    content: Vec<u8>,
    targets: Vec<Pubkey>,
}

#[async_trait]
impl InstructionBuilder for SendSystemMessageInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let instruction = build_send_system_message_instruction(
            &self.signer.pubkey(),
            self.message_type,
            &self.content,
            &self.targets,
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
        "send_system_message"
    }
}

impl ComputeUnitEstimator for SendSystemMessageInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // System messages with multiple targets
        50_000 + (self.targets.len() as u32 * 5_000)
    }
}

// Helper functions to build Anchor-compatible instructions

fn build_send_direct_message_instruction(
    sender: &Pubkey,
    recipient: &Pubkey,
    message_pda: &Pubkey,
    content: &[u8],
    encrypted: bool,
    priority: u8,
) -> PodAIResult<Instruction> {
    // Find inbox PDAs for both sender and recipient
    let (sender_inbox_pda, _) = Pubkey::find_program_address(
        &[b"inbox", sender.as_ref()],
        &crate::PROGRAM_ID,
    );
    let (recipient_inbox_pda, _) = Pubkey::find_program_address(
        &[b"inbox", recipient.as_ref()],
        &crate::PROGRAM_ID,
    );

    let accounts = vec![
        AccountMeta::new(*message_pda, false),
        AccountMeta::new(sender_inbox_pda, false),
        AccountMeta::new(recipient_inbox_pda, false),
        AccountMeta::new(*sender, true),
        AccountMeta::new_readonly(*recipient, false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&SEND_DIRECT_MESSAGE_DISCRIMINATOR);
    
    let args = SendDirectMessageInstructionData {
        recipient: *recipient,
        content: content.to_vec(),
        encrypted,
        priority,
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize send_direct_message instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

fn build_send_system_message_instruction(
    sender: &Pubkey,
    message_type: MessageType,
    content: &[u8],
    targets: &[Pubkey],
) -> PodAIResult<Instruction> {
    // System message PDA
    let message_id = chrono::Utc::now().timestamp() as u64;
    let (system_message_pda, _) = Pubkey::find_program_address(
        &[b"system_message", &message_id.to_le_bytes()],
        &crate::PROGRAM_ID,
    );

    let mut accounts = vec![
        AccountMeta::new(system_message_pda, false),
        AccountMeta::new(*sender, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    // Add target accounts
    for target in targets {
        accounts.push(AccountMeta::new_readonly(*target, false));
    }

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&SEND_SYSTEM_MESSAGE_DISCRIMINATOR);
    
    let args = SendSystemMessageInstructionData {
        message_type: message_type as u8,
        content: content.to_vec(),
        targets: targets.to_vec(),
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize send_system_message instruction: {}", e),
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
    async fn test_send_direct_message_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        let recipient = Keypair::new().pubkey();
        
        let builder = SendDirectMessageBuilder::new(client)
            .signer(signer)
            .recipient(recipient)
            .content_string("Hello from AI agent!")
            .priority(5);
        
        assert!(builder.validate_params().is_ok());
    }

    #[tokio::test]
    async fn test_send_system_message_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        
        let builder = SendSystemMessageBuilder::new(client)
            .signer(signer)
            .message_type(MessageType::SystemNotification)
            .content_string("System maintenance scheduled")
            .add_target(Keypair::new().pubkey())
            .add_target(Keypair::new().pubkey());
        
        // Basic validation
        assert!(!builder.targets.is_empty());
        assert!(builder.content.is_some());
    }
}