//! Channel account types and related functionality

use super::message::MessageType;
use super::time_utils::{datetime_to_timestamp, timestamp_to_datetime};
use super::AccountData;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Maximum channel name length
pub const MAX_CHANNEL_NAME_LENGTH: usize = 50;

/// Maximum channel description length
pub const MAX_CHANNEL_DESCRIPTION_LENGTH: usize = 200;

/// Maximum participants per channel
pub const MAX_PARTICIPANTS_PER_CHANNEL: u32 = 1000;

/// Maximum message content length for channels
pub const MAX_CHANNEL_MESSAGE_CONTENT_LENGTH: usize = 1000;

/// Channel visibility enumeration
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub enum ChannelVisibility {
    /// Public channel - anyone can join
    Public,
    /// Private channel - requires invitation
    Private,
}

impl Default for ChannelVisibility {
    fn default() -> Self {
        Self::Public
    }
}

impl ChannelVisibility {
    /// Get the visibility as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Public => "Public",
            Self::Private => "Private",
        }
    }

    /// Parse visibility from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "public" => Some(Self::Public),
            "private" => Some(Self::Private),
            _ => None,
        }
    }
}

/// Channel account data matching the on-chain program structure
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChannelAccount {
    /// Channel creator (agent PDA)
    pub creator: Pubkey,
    /// Fee per message in lamports
    pub fee_per_message: u64,
    /// Escrow balance in lamports
    pub escrow_balance: u64,
    /// Channel creation timestamp
    pub created_at: i64,
    /// Maximum number of participants
    pub max_participants: u32,
    /// Current number of participants
    pub current_participants: u32,
    /// Channel name
    pub name: String,
    /// Channel description
    pub description: String,
    /// Channel visibility
    pub visibility: ChannelVisibility,
    /// Whether channel is active
    pub is_active: bool,
    /// Last batch sync timestamp for compression
    pub last_sync_timestamp: i64,
    /// Total compressed messages
    pub total_compressed_messages: u64,
    /// Total compressed data size
    pub compressed_data_size: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl ChannelAccount {
    /// Create a new channel account
    pub fn new(
        creator: Pubkey,
        name: String,
        description: String,
        visibility: ChannelVisibility,
        max_participants: u32,
        fee_per_message: u64,
        bump: u8,
    ) -> Result<Self, crate::errors::PodAIError> {
        // Validate name
        if let Err(e) = Self::validate_name(&name) {
            return Err(e);
        }

        // Validate description length
        if description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "description",
                &format!("Description too long: {} > {}", description.len(), MAX_CHANNEL_DESCRIPTION_LENGTH),
            ));
        }

        // Validate max participants
        if max_participants > MAX_PARTICIPANTS_PER_CHANNEL {
            return Err(crate::errors::PodAIError::invalid_input(
                "max_participants",
                &format!("Too many participants: {} > {}", max_participants, MAX_PARTICIPANTS_PER_CHANNEL),
            ));
        }

        let now = Utc::now().timestamp();
        Ok(Self {
            creator,
            fee_per_message,
            escrow_balance: 0,
            created_at: now,
            max_participants,
            current_participants: 0,
            name,
            description,
            visibility,
            is_active: true,
            last_sync_timestamp: now,
            total_compressed_messages: 0,
            compressed_data_size: 0,
            bump,
        })
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Set the creation time from DateTime
    pub fn set_created_at(&mut self, datetime: DateTime<Utc>) {
        self.created_at = datetime_to_timestamp(datetime);
    }

    /// Get the last sync time as DateTime
    pub fn last_sync_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.last_sync_timestamp)
    }

    /// Set the last sync time from DateTime
    pub fn set_last_sync(&mut self, datetime: DateTime<Utc>) {
        self.last_sync_timestamp = datetime_to_timestamp(datetime);
    }

    /// Check if channel is full
    pub fn is_full(&self) -> bool {
        self.current_participants >= self.max_participants
    }

    /// Check if channel has capacity for more participants
    pub fn has_capacity(&self) -> bool {
        !self.is_full()
    }

    /// Get available capacity
    pub fn available_capacity(&self) -> u32 {
        self.max_participants.saturating_sub(self.current_participants)
    }

    /// Add a participant (increment count)
    pub fn add_participant(&mut self) -> Result<(), crate::errors::PodAIError> {
        if self.is_full() {
            return Err(crate::errors::PodAIError::channel("Channel is full"));
        }
        
        self.current_participants += 1;
        Ok(())
    }

    /// Remove a participant (decrement count)
    pub fn remove_participant(&mut self) -> Result<(), crate::errors::PodAIError> {
        if self.current_participants == 0 {
            return Err(crate::errors::PodAIError::channel("No participants to remove"));
        }
        
        self.current_participants -= 1;
        Ok(())
    }

    /// Add to escrow balance
    pub fn add_escrow(&mut self, amount: u64) {
        self.escrow_balance = self.escrow_balance.saturating_add(amount);
    }

    /// Remove from escrow balance
    pub fn remove_escrow(&mut self, amount: u64) -> Result<(), crate::errors::PodAIError> {
        if self.escrow_balance < amount {
            return Err(crate::errors::PodAIError::insufficient_balance(
                amount, 
                self.escrow_balance
            ));
        }
        
        self.escrow_balance -= amount;
        Ok(())
    }

    /// Update compression statistics
    pub fn update_compression_stats(&mut self, messages_added: u64, data_size_added: u64) {
        self.total_compressed_messages = self.total_compressed_messages.saturating_add(messages_added);
        self.compressed_data_size = self.compressed_data_size.saturating_add(data_size_added);
        self.last_sync_timestamp = Utc::now().timestamp();
    }

    /// Get compression efficiency ratio (lower is better)
    pub fn compression_ratio(&self) -> f64 {
        if self.total_compressed_messages == 0 {
            return 1.0;
        }
        
        let uncompressed_estimate = self.total_compressed_messages * 1000; // Estimate 1KB per message
        self.compressed_data_size as f64 / uncompressed_estimate as f64
    }

    /// Validate channel data
    pub fn validate(&self) -> Result<(), crate::errors::PodAIError> {
        // Validate name
        if self.name.is_empty() {
            return Err(crate::errors::PodAIError::invalid_input(
                "name",
                "Channel name cannot be empty"
            ));
        }

        if let Err(e) = Self::validate_name(&self.name) {
            return Err(e);
        }

        // Validate description
        if self.description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "description",
                &format!("Description too long: {} > {}", self.description.len(), MAX_CHANNEL_DESCRIPTION_LENGTH),
            ));
        }

        // Validate participant counts
        if self.current_participants > self.max_participants {
            return Err(crate::errors::PodAIError::channel(
                "Current participants cannot exceed maximum"
            ));
        }

        if self.max_participants > MAX_PARTICIPANTS_PER_CHANNEL {
            return Err(crate::errors::PodAIError::invalid_input(
                "max_participants",
                &format!("Too many participants: {} > {}", self.max_participants, MAX_PARTICIPANTS_PER_CHANNEL),
            ));
        }

        Ok(())
    }

    pub fn validate_name(name: &str) -> Result<(), crate::errors::PodAIError> {
        if name.len() > MAX_CHANNEL_NAME_LENGTH {
            return Err(crate::errors::PodAIError::InvalidInput {
                field: "name".to_string(),
                reason: format!("Name too long: {} > {}", name.len(), MAX_CHANNEL_NAME_LENGTH),
            });
        }
        Ok(())
    }

    pub fn validate_description(description: &str) -> Result<(), crate::errors::PodAIError> {
        if description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::InvalidInput {
                field: "description".to_string(),
                reason: format!("Description too long: {} > {}", description.len(), MAX_CHANNEL_DESCRIPTION_LENGTH),
            });
        }
        Ok(())
    }

    pub fn validate_participants(max_participants: usize) -> Result<(), crate::errors::PodAIError> {
        if max_participants > MAX_PARTICIPANTS_PER_CHANNEL as usize {
            return Err(crate::errors::PodAIError::InvalidInput {
                field: "max_participants".to_string(),
                reason: format!("Too many participants: {} > {}", max_participants, MAX_PARTICIPANTS_PER_CHANNEL),
            });
        }
        Ok(())
    }

    pub fn validate_content(content: &str) -> Result<(), crate::errors::PodAIError> {
        if content.len() > MAX_CHANNEL_MESSAGE_CONTENT_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "content",
                &format!("Content too long: {} > {}", content.len(), MAX_CHANNEL_MESSAGE_CONTENT_LENGTH),
            ));
        }
        Ok(())
    }
}

impl AccountData for ChannelAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for ChannelAccount
        [15, 112, 28, 12, 47, 89, 201, 76]
    }
}

/// Channel participant account data
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChannelParticipant {
    /// Channel public key
    pub channel: Pubkey,
    /// Participant agent public key
    pub participant: Pubkey,
    /// Join timestamp
    pub joined_at: i64,
    /// Number of messages sent
    pub messages_sent: u64,
    /// Last message timestamp
    pub last_message_at: i64,
    /// Whether participant is active
    pub is_active: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl ChannelParticipant {
    /// Create a new channel participant
    pub fn new(
        channel: Pubkey,
        participant: Pubkey,
        bump: u8,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            channel,
            participant,
            joined_at: now,
            messages_sent: 0,
            last_message_at: 0,
            is_active: true,
            bump,
        }
    }

    /// Get the join time as DateTime
    pub fn joined_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.joined_at)
    }

    /// Set the join time from DateTime
    pub fn set_joined_at(&mut self, datetime: DateTime<Utc>) {
        self.joined_at = datetime_to_timestamp(datetime);
    }

    /// Get the last message time as DateTime
    pub fn last_message_datetime(&self) -> Option<DateTime<Utc>> {
        if self.last_message_at == 0 {
            None
        } else {
            Some(timestamp_to_datetime(self.last_message_at))
        }
    }

    /// Set the last message time from DateTime
    pub fn set_last_message(&mut self, datetime: DateTime<Utc>) {
        self.last_message_at = datetime_to_timestamp(datetime);
    }

    /// Record a new message sent
    pub fn record_message_sent(&mut self) {
        self.messages_sent += 1;
        self.last_message_at = Utc::now().timestamp();
    }

    /// Deactivate the participant
    pub fn deactivate(&mut self) {
        self.is_active = false;
    }

    /// Reactivate the participant
    pub fn activate(&mut self) {
        self.is_active = true;
    }

    /// Get participation duration
    pub fn participation_duration(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let duration_seconds = now - self.joined_at;
        chrono::Duration::seconds(duration_seconds.max(0))
    }

    /// Get time since last message
    pub fn time_since_last_message(&self) -> Option<chrono::Duration> {
        if self.last_message_at == 0 {
            None
        } else {
            let now = Utc::now().timestamp();
            let duration_seconds = now - self.last_message_at;
            Some(chrono::Duration::seconds(duration_seconds.max(0)))
        }
    }
}

impl AccountData for ChannelParticipant {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for ChannelParticipant
        [45, 78, 123, 201, 34, 156, 89, 67]
    }
}

/// Channel message account data
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChannelMessage {
    /// Channel public key
    pub channel: Pubkey,
    /// Sender agent public key
    pub sender: Pubkey,
    /// Optional reply-to message
    pub reply_to: Option<Pubkey>,
    /// Message creation timestamp
    pub created_at: i64,
    /// Optional edit timestamp
    pub edited_at: Option<i64>,
    /// Message content
    pub content: String,
    /// Message type
    pub message_type: MessageType,
    /// PDA bump seed
    pub bump: u8,
}

impl ChannelMessage {
    /// Create a new channel message
    pub fn new(
        channel: Pubkey,
        sender: Pubkey,
        content: String,
        message_type: MessageType,
        reply_to: Option<Pubkey>,
        bump: u8,
    ) -> Result<Self, crate::errors::PodAIError> {
        // Validate content length
        if content.len() > MAX_CHANNEL_MESSAGE_CONTENT_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "content",
                &format!("Content too long: {} > {}", content.len(), MAX_CHANNEL_MESSAGE_CONTENT_LENGTH),
            ));
        }

        Ok(Self {
            channel,
            sender,
            reply_to,
            created_at: Utc::now().timestamp(),
            edited_at: None,
            content,
            message_type,
            bump,
        })
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Set the creation time from DateTime
    pub fn set_created_at(&mut self, datetime: DateTime<Utc>) {
        self.created_at = datetime_to_timestamp(datetime);
    }

    /// Get the edit time as DateTime
    pub fn edited_at_datetime(&self) -> Option<DateTime<Utc>> {
        self.edited_at.map(timestamp_to_datetime)
    }

    /// Set the edit time from DateTime
    pub fn set_edited_at(&mut self, datetime: DateTime<Utc>) {
        self.edited_at = Some(datetime_to_timestamp(datetime));
    }

    /// Mark message as edited
    pub fn mark_edited(&mut self) {
        self.edited_at = Some(Utc::now().timestamp());
    }

    /// Check if message was edited
    pub fn is_edited(&self) -> bool {
        self.edited_at.is_some()
    }

    /// Check if message is a reply
    pub fn is_reply(&self) -> bool {
        self.reply_to.is_some()
    }

    /// Get message age
    pub fn age(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let age_seconds = now - self.created_at;
        chrono::Duration::seconds(age_seconds.max(0))
    }

    /// Validate message content
    pub fn validate(&self) -> Result<(), crate::errors::PodAIError> {
        if self.content.is_empty() {
            return Err(crate::errors::PodAIError::invalid_input(
                "content",
                "Message content cannot be empty"
            ));
        }

        if self.content.len() > MAX_CHANNEL_MESSAGE_CONTENT_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "content",
                &format!("Content too long: {} > {}", self.content.len(), MAX_CHANNEL_MESSAGE_CONTENT_LENGTH),
            ));
        }

        Ok(())
    }
}

impl AccountData for ChannelMessage {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for ChannelMessage
        [89, 123, 45, 167, 234, 78, 91, 12]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_channel_visibility() {
        assert_eq!(ChannelVisibility::Public.as_str(), "Public");
        assert_eq!(ChannelVisibility::Private.as_str(), "Private");
        
        assert_eq!(ChannelVisibility::from_str("public"), Some(ChannelVisibility::Public));
        assert_eq!(ChannelVisibility::from_str("private"), Some(ChannelVisibility::Private));
        assert_eq!(ChannelVisibility::from_str("invalid"), None);
    }

    #[test]
    fn test_channel_account_creation() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let channel = ChannelAccount::new(
            creator,
            "Test Channel".to_string(),
            "A test channel".to_string(),
            ChannelVisibility::Public,
            100,
            1000,
            255,
        ).unwrap();

        assert_eq!(channel.creator, creator);
        assert_eq!(channel.name, "Test Channel");
        assert_eq!(channel.visibility, ChannelVisibility::Public);
        assert_eq!(channel.max_participants, 100);
        assert_eq!(channel.current_participants, 0);
        assert!(channel.has_capacity());
        assert!(!channel.is_full());
    }

    #[test]
    fn test_channel_participant_management() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut channel = ChannelAccount::new(
            creator,
            "Test".to_string(),
            "Test".to_string(),
            ChannelVisibility::Public,
            2,
            0,
            255,
        ).unwrap();

        // Add participants
        assert!(channel.add_participant().is_ok());
        assert_eq!(channel.current_participants, 1);
        assert_eq!(channel.available_capacity(), 1);

        assert!(channel.add_participant().is_ok());
        assert_eq!(channel.current_participants, 2);
        assert!(channel.is_full());

        // Try to add when full
        assert!(channel.add_participant().is_err());

        // Remove participant
        assert!(channel.remove_participant().is_ok());
        assert_eq!(channel.current_participants, 1);
        assert!(!channel.is_full());
    }

    #[test]
    fn test_escrow_operations() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut channel = ChannelAccount::new(
            creator,
            "Test".to_string(),
            "Test".to_string(),
            ChannelVisibility::Public,
            100,
            0,
            255,
        ).unwrap();

        // Add escrow
        channel.add_escrow(1000);
        assert_eq!(channel.escrow_balance, 1000);

        // Remove escrow
        assert!(channel.remove_escrow(500).is_ok());
        assert_eq!(channel.escrow_balance, 500);

        // Try to remove more than available
        assert!(channel.remove_escrow(1000).is_err());
    }

    #[test]
    fn test_channel_participant() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let participant = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let mut cp = ChannelParticipant::new(channel, participant, 255);

        assert_eq!(cp.channel, channel);
        assert_eq!(cp.participant, participant);
        assert_eq!(cp.messages_sent, 0);
        assert!(cp.is_active);

        // Record message
        cp.record_message_sent();
        assert_eq!(cp.messages_sent, 1);
        assert!(cp.last_message_at > 0);

        // Deactivate
        cp.deactivate();
        assert!(!cp.is_active);

        // Reactivate
        cp.activate();
        assert!(cp.is_active);
    }

    #[test]
    fn test_channel_message() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let sender = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let mut message = ChannelMessage::new(
            channel,
            sender,
            "Hello, world!".to_string(),
            MessageType::Text,
            None,
            255,
        ).unwrap();

        assert_eq!(message.channel, channel);
        assert_eq!(message.sender, sender);
        assert_eq!(message.content, "Hello, world!");
        assert!(!message.is_edited());
        assert!(!message.is_reply());

        // Mark as edited
        message.mark_edited();
        assert!(message.is_edited());
        assert!(message.edited_at.is_some());
    }

    #[test]
    fn test_validation() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        
        // Valid channel
        let channel = ChannelAccount::new(
            creator,
            "Test".to_string(),
            "Test".to_string(),
            ChannelVisibility::Public,
            100,
            0,
            255,
        ).unwrap();
        assert!(channel.validate().is_ok());

        // Invalid name (too long)
        let long_name = "a".repeat(MAX_CHANNEL_NAME_LENGTH + 1);
        let result = ChannelAccount::new(
            creator,
            long_name,
            "Test".to_string(),
            ChannelVisibility::Public,
            100,
            0,
            255,
        );
        assert!(result.is_err());
    }
} 