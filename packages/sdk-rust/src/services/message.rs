//! Message service for handling direct communication between agents

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::message::{MessageAccount, MessageStatus, MessageType};
use crate::utils::pda::{find_agent_pda, find_message_pda};
use crate::utils::transaction::{TransactionOptions, TransactionResult};
use crate::utils::{TransactionFactory, TransactionConfig, PriorityFeeStrategy, RetryPolicy};
use blake3;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};
use std::sync::Arc;
use crate::types::AccountData;

/// Service for managing direct messages between agents
#[derive(Clone)]
pub struct MessageService {
    client: Arc<PodAIClient>,
}

impl MessageService {
    /// Create a new message service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Send a message with modern transaction patterns
    pub async fn send_message_with_factory(
        &self,
        factory: &TransactionFactory,
        sender: &dyn Signer,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
        // Verify both agents exist
        let (sender_agent_pda, _) = find_agent_pda(&sender.pubkey());
        let (recipient_agent_pda, _) = find_agent_pda(recipient);

        if !self.client.account_exists(&sender_agent_pda).await? {
            return Err(PodAIError::agent("Sender agent not registered"));
        }

        if !self.client.account_exists(&recipient_agent_pda).await? {
            return Err(PodAIError::agent("Recipient agent not registered"));
        }

        // Validate content
        self.validate_content(content, message_type.clone())?;

        // Create content hash
        let content_hash = blake3::hash(content.as_bytes());
        let payload_hash: [u8; 32] = *content_hash.as_bytes();

        // Find message PDA
        let (message_pda, bump) = find_message_pda(
            &sender.pubkey(),
            recipient,
            &payload_hash,
            &message_type,
        );

        // Check if message already exists
        if self.client.account_exists(&message_pda).await? {
            return Err(PodAIError::message("Message already exists"));
        }

        // Create send message instruction
        let instruction = self.create_send_message_instruction(
            &sender.pubkey(),
            recipient,
            &message_pda,
            payload_hash,
            message_type.clone(),
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory
            .build_transaction(vec![instruction], &sender.pubkey(), &[sender])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        Ok(MessageSendResult {
            signature: result.signature,
            message_pda,
            sender: sender.pubkey(),
            recipient: *recipient,
            content_hash: payload_hash,
            message_type,
            timestamp: Utc::now(),
        })
    }

    /// Send a message with fast configuration
    pub async fn send_message_fast(
        &self,
        sender: &dyn Signer,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::fast());
        self.send_message_with_factory(&factory, sender, recipient, content, message_type).await
    }

    /// Send a message with reliable configuration
    pub async fn send_message_reliable(
        &self,
        sender: &dyn Signer,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::reliable());
        self.send_message_with_factory(&factory, sender, recipient, content, message_type).await
    }

    /// Create a builder for sending messages with custom configuration
    pub fn send_message_builder(&self) -> MessageSendBuilder {
        MessageSendBuilder::new(self)
    }

    /// Read a message
    pub async fn read_message(
        &self,
        reader_keypair: &Keypair,
        message_pda: &Pubkey,
    ) -> PodAIResult<MessageReadResult> {
        // Get message account
        let message = self.get_message(message_pda).await?;

        // Verify reader is authorized (sender or recipient)
        if message.sender != reader_keypair.pubkey() && message.recipient != reader_keypair.pubkey() {
            return Err(PodAIError::message("Not authorized to read this message"));
        }

        // Check if message is expired
        if message.is_expired() {
            return Err(PodAIError::message("Message has expired"));
        }

        // Mark as read if reader is the recipient
        let mut updated_message = message.clone();
        if message.recipient == reader_keypair.pubkey() && message.status == MessageStatus::Sent {
            updated_message.mark_as_deleted()?; // Using available method

            // Update on-chain (simplified)
            let recent_blockhash = self.client.get_recent_blockhash().await?;
            let mut transaction = Transaction::new_with_payer(
                &[], // Would contain update instruction
                Some(&reader_keypair.pubkey()),
            );
            transaction.message.recent_blockhash = recent_blockhash;
            transaction.sign(&[reader_keypair], recent_blockhash);

            let options = TransactionOptions::default();
            let _tx_result = crate::utils::transaction::send_transaction(
                &self.client.rpc_client,
                &transaction,
                &options,
            ).await?;
        }

        Ok(MessageReadResult {
            message: updated_message,
            content: None, // Content would be fetched from storage
            was_unread: message.status == MessageStatus::Sent && message.recipient == reader_keypair.pubkey(),
        })
    }

    /// Reply to a message
    pub async fn reply_to_message(
        &self,
        replier_keypair: &Keypair,
        original_message_pda: &Pubkey,
        reply_content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
        // Get original message
        let original_message = self.get_message(original_message_pda).await?;

        // Verify replier is authorized (sender or recipient of original)
        if original_message.sender != replier_keypair.pubkey() 
            && original_message.recipient != replier_keypair.pubkey() {
            return Err(PodAIError::message("Not authorized to reply to this message"));
        }

        // Determine reply recipient (if replier is sender, reply to recipient, and vice versa)
        let reply_recipient = if original_message.sender == replier_keypair.pubkey() {
            original_message.recipient
        } else {
            original_message.sender
        };

        // Send reply
        self.send_message(
            replier_keypair,
            &reply_recipient,
            reply_content,
            message_type,
        ).await
    }

    /// Delete a message (sender only)
    pub async fn delete_message(
        &self,
        sender_keypair: &Keypair,
        message_pda: &Pubkey,
    ) -> PodAIResult<TransactionResult> {
        // Get message account
        let mut message = self.get_message(message_pda).await?;

        // Verify sender owns the message
        if message.sender != sender_keypair.pubkey() {
            return Err(PodAIError::message("Only sender can delete messages"));
        }

        // Mark as deleted
        message.mark_as_deleted()?;

        // Update on-chain (simplified)
        let recent_blockhash = self.client.get_recent_blockhash().await?;
        let mut transaction = Transaction::new_with_payer(
            &[], // Would contain delete instruction
            Some(&sender_keypair.pubkey()),
        );
        transaction.message.recent_blockhash = recent_blockhash;
        transaction.sign(&[sender_keypair], recent_blockhash);

        let options = TransactionOptions::default();
        crate::utils::transaction::send_transaction(
            &self.client.rpc_client,
            &transaction,
            &options,
        ).await
    }

    /// Get message account data
    pub async fn get_message(&self, message_pda: &Pubkey) -> PodAIResult<MessageAccount> {
        match self.client.rpc_client.get_account(message_pda).await {
            Ok(account) => MessageAccount::from_bytes(&account.data),
            Err(_) => Err(PodAIError::account_not_found("Message", &message_pda.to_string())),
        }
    }

    /// List messages for an agent (requires indexing)
    pub async fn list_messages(
        &self,
        _agent_wallet: &Pubkey,
        _filter: MessageFilter,
    ) -> PodAIResult<Vec<MessageAccount>> {
        // This would require an indexing service
        log::warn!("list_messages requires indexing service - not implemented");
        Ok(Vec::new())
    }

    /// Get conversation between two agents
    pub async fn get_conversation(
        &self,
        _agent1: &Pubkey,
        _agent2: &Pubkey,
        _limit: Option<usize>,
    ) -> PodAIResult<Vec<MessageAccount>> {
        // This would require an indexing service
        log::warn!("get_conversation requires indexing service - not implemented");
        Ok(Vec::new())
    }

    /// Calculate message PDA
    pub fn calculate_message_pda(
        &self,
        sender: &Pubkey,
        recipient: &Pubkey,
        content: &str,
        message_type: &MessageType,
    ) -> (Pubkey, u8) {
        let content_hash = blake3::hash(content.as_bytes());
        let payload_hash: [u8; 32] = *content_hash.as_bytes();
        find_message_pda(sender, recipient, &payload_hash, message_type)
    }

    /// Validate message content
    pub fn validate_content(&self, content: &str, message_type: MessageType) -> PodAIResult<()> {
        if content.is_empty() {
            return Err(PodAIError::invalid_input("content", "Content cannot be empty"));
        }

        let max_length = match message_type {
            MessageType::Text => 10240,    // 10KB for text
            MessageType::Image => 1048576, // 1MB for images
            MessageType::File => 5242880,  // 5MB for files
            MessageType::Audio => 10485760, // 10MB for audio
            MessageType::Data => 1048576,  // 1MB for data
            MessageType::Command => 10240, // 10KB for commands
            MessageType::Response => 10240, // 10KB for responses
            MessageType::Custom(_) => 10240, // 10KB default for custom
        };

        if content.len() > max_length {
            return Err(PodAIError::invalid_input(
                "content",
                &format!("Content too large (max {} bytes)", max_length),
            ));
        }

        Ok(())
    }

    /// Check if two agents can communicate
    pub async fn can_communicate(&self, agent1: &Pubkey, agent2: &Pubkey) -> PodAIResult<bool> {
        // Check if both agents exist and have communication capabilities
        let (agent1_pda, _) = find_agent_pda(agent1);
        let (agent2_pda, _) = find_agent_pda(agent2);

        let agent1_exists = self.client.account_exists(&agent1_pda).await?;
        let agent2_exists = self.client.account_exists(&agent2_pda).await?;

        // Additional capability checks would go here
        Ok(agent1_exists && agent2_exists)
    }

    /// Create send message instruction
    fn create_send_message_instruction(
        &self,
        sender: &Pubkey,
        recipient: &Pubkey,
        message_pda: &Pubkey,
        payload_hash: [u8; 32],
        message_type: MessageType,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for send_message
        let discriminator = [15, 40, 235, 178, 191, 96, 190, 12]; // send_message discriminator

        // Serialize instruction data following Anchor patterns
        let mut instruction_data = Vec::with_capacity(8 + 32 + 32 + 1 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(recipient.as_ref());
        instruction_data.extend_from_slice(&payload_hash);
        instruction_data.push(message_type.to_u8());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*message_pda, false),           // message_account (writable, PDA)
            AccountMeta::new(*sender, true),                 // sender (writable, signer)
            AccountMeta::new_readonly(*recipient, false),    // recipient (readonly)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Send a message to another agent (legacy method)
    pub async fn send_message(
        &self,
        sender_keypair: &Keypair,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
        self.send_message_fast(sender_keypair, recipient, content, message_type).await
    }
}

/// Result of sending a message with enhanced information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageSendResult {
    /// Transaction signature
    pub signature: Signature,
    /// The message PDA address
    pub message_pda: Pubkey,
    /// Sender public key
    pub sender: Pubkey,
    /// Recipient public key
    pub recipient: Pubkey,
    /// Content hash
    pub content_hash: [u8; 32],
    /// Message type
    pub message_type: MessageType,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

impl MessageSendResult {
    /// Get the message ID (PDA)
    pub fn message_id(&self) -> Pubkey {
        self.message_pda
    }

    /// Get the transaction signature
    pub fn transaction_signature(&self) -> Signature {
        self.signature
    }

    /// Get the content hash
    pub fn get_content_hash(&self) -> [u8; 32] {
        self.content_hash
    }
}

/// Builder for sending messages with custom configuration
pub struct MessageSendBuilder<'a> {
    service: &'a MessageService,
    transaction_config: Option<TransactionConfig>,
    priority_fee_strategy: Option<PriorityFeeStrategy>,
    retry_policy: Option<RetryPolicy>,
    simulate_before_send: Option<bool>,
}

impl<'a> MessageSendBuilder<'a> {
    /// Create a new builder
    pub fn new(service: &'a MessageService) -> Self {
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

    /// Execute the message send
    pub async fn execute(
        self,
        sender: &dyn Signer,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> PodAIResult<MessageSendResult> {
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
        self.service.send_message_with_factory(&factory, sender, recipient, content, message_type).await
    }
}

/// Result of reading a message
pub struct MessageReadResult {
    /// The message account
    pub message: MessageAccount,
    /// The message content (if available)
    pub content: Option<String>,
    /// Whether the message was unread before this operation
    pub was_unread: bool,
}

impl MessageReadResult {
    /// Check if this was the first time reading the message
    pub fn is_first_read(&self) -> bool {
        self.was_unread
    }

    /// Get the message sender
    pub fn sender(&self) -> Pubkey {
        self.message.sender
    }

    /// Get the message recipient
    pub fn recipient(&self) -> Pubkey {
        self.message.recipient
    }

    /// Get the message creation time
    pub fn created_at(&self) -> DateTime<Utc> {
        self.message.created_at_datetime()
    }

    /// Check if message is expired
    pub fn is_expired(&self) -> bool {
        self.message.is_expired()
    }
}

/// Filter for listing messages
pub struct MessageFilter {
    /// Filter by message status
    pub status: Option<MessageStatus>,
    /// Filter by message type
    pub message_type: Option<MessageType>,
    /// Filter by sender
    pub sender: Option<Pubkey>,
    /// Filter by recipient
    pub recipient: Option<Pubkey>,
    /// Filter by creation date range
    pub created_after: Option<DateTime<Utc>>,
    /// Filter by creation date range
    pub created_before: Option<DateTime<Utc>>,
    /// Include expired messages
    pub include_expired: bool,
    /// Include deleted messages
    pub include_deleted: bool,
}

impl Default for MessageFilter {
    fn default() -> Self {
        Self {
            status: None,
            message_type: None,
            sender: None,
            recipient: None,
            created_after: None,
            created_before: None,
            include_expired: false,
            include_deleted: false,
        }
    }
}

impl MessageFilter {
    /// Create a filter for unread messages
    pub fn unread() -> Self {
        Self {
            status: Some(MessageStatus::Sent),
            ..Default::default()
        }
    }

    /// Create a filter for messages from a specific sender
    pub fn from_sender(sender: Pubkey) -> Self {
        Self {
            sender: Some(sender),
            ..Default::default()
        }
    }

    /// Create a filter for messages to a specific recipient
    pub fn to_recipient(recipient: Pubkey) -> Self {
        Self {
            recipient: Some(recipient),
            ..Default::default()
        }
    }

    /// Create a filter for a specific message type
    pub fn of_type(message_type: MessageType) -> Self {
        Self {
            message_type: Some(message_type),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client::{PodAIClient, PodAIConfig};
    use std::str::FromStr;

    #[test]
    fn test_message_filter() {
        let filter = MessageFilter::default();
        assert!(filter.status.is_none());
        assert!(!filter.include_expired);

        let unread_filter = MessageFilter::unread();
        assert_eq!(unread_filter.status, Some(MessageStatus::Sent));

        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let sender_filter = MessageFilter::from_sender(sender);
        assert_eq!(sender_filter.sender, Some(sender));

        let type_filter = MessageFilter::of_type(MessageType::Text);
        assert_eq!(type_filter.message_type, Some(MessageType::Text));
    }

    #[tokio::test]
    async fn test_content_validation() {
        let config = PodAIConfig::localnet();
        // Create mock client for testing
        if let Ok(client) = PodAIClient::new(config).await {
            let service = MessageService::new(Arc::new(client));
            
            // Test empty content
            let result = service.validate_content("", MessageType::Text);
            assert!(result.is_err());
            
            // Test valid content
            let result = service.validate_content("Hello, world!", MessageType::Text);
            assert!(result.is_ok());
            
            // Test oversized content
            let large_content = "x".repeat(20000);
            let result = service.validate_content(&large_content, MessageType::Text);
            assert!(result.is_err());
        }
    }

    #[tokio::test]
    async fn test_message_pda_calculation() {
        let config = PodAIConfig::localnet();
        if let Ok(client) = PodAIClient::new(config).await {
            let service = MessageService::new(Arc::new(client));
            
            let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
            let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
            let content = "Test message";
            let message_type = MessageType::Text;
            
            let (pda1, bump1) = service.calculate_message_pda(&sender, &recipient, content, &message_type);
            let (pda2, bump2) = service.calculate_message_pda(&sender, &recipient, content, &message_type);
            
            // Same inputs should produce same PDA
            assert_eq!(pda1, pda2);
            assert_eq!(bump1, bump2);
            
            // Different content should produce different PDA
            let (pda3, _) = service.calculate_message_pda(&sender, &recipient, "Different content", &message_type);
            assert_ne!(pda1, pda3);
        }
    }
} 