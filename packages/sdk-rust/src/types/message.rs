//! Message account types and related functionality

use super::time_utils::{datetime_to_timestamp, timestamp_to_datetime};
use super::AccountData;
use borsh::{BorshDeserialize, BorshSerialize};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

/// Message expiration time in seconds (7 days)
pub const MESSAGE_EXPIRATION_SECONDS: i64 = 7 * 24 * 60 * 60;

/// Maximum message content length
pub const MAX_MESSAGE_CONTENT_LENGTH: usize = 1000;

/// Message type enumeration matching the on-chain program
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub enum MessageType {
    /// Plain text message
    Text,
    /// Data/binary message
    Data,
    /// Image message
    Image,
    /// File message
    File,
    /// Audio message
    Audio,
    /// Command message
    Command,
    /// Response to a command
    Response,
    /// Custom message type
    Custom(u8),
}

impl Default for MessageType {
    fn default() -> Self {
        Self::Text
    }
}

impl MessageType {
    /// Get the message type as a byte value
    pub fn as_byte(&self) -> u8 {
        match self {
            Self::Text => 0,
            Self::Data => 1,
            Self::Image => 2,
            Self::File => 3,
            Self::Audio => 4,
            Self::Command => 5,
            Self::Response => 6,
            Self::Custom(x) => 7 + x,
        }
    }

    /// Create message type from byte value
    pub fn from_byte(byte: u8) -> Self {
        match byte {
            0 => Self::Text,
            1 => Self::Data,
            2 => Self::Image,
            3 => Self::File,
            4 => Self::Audio,
            5 => Self::Command,
            6 => Self::Response,
            x if x >= 7 => Self::Custom(x - 7),
            _ => Self::Text, // Default fallback
        }
    }

    /// Get human-readable string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Text => "Text",
            Self::Data => "Data",
            Self::Image => "Image",
            Self::File => "File",
            Self::Audio => "Audio",
            Self::Command => "Command",
            Self::Response => "Response",
            Self::Custom(_) => "Custom",
        }
    }
}

/// Message status enumeration
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub enum MessageStatus {
    /// Message is pending delivery
    Pending,
    /// Message has been sent
    Sent,
    /// Message has been delivered
    Delivered,
    /// Message has been read by recipient
    Read,
    /// Message delivery failed
    Failed,
}

impl Default for MessageStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl MessageStatus {
    /// Get the status as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "Pending",
            Self::Sent => "Sent",
            Self::Delivered => "Delivered",
            Self::Read => "Read",
            Self::Failed => "Failed",
        }
    }

    /// Check if status transition is valid
    pub fn can_transition_to(&self, new_status: MessageStatus) -> bool {
        match (self, new_status) {
            // From Pending
            (Self::Pending, Self::Sent) => true,
            (Self::Pending, Self::Failed) => true,
            
            // From Sent
            (Self::Sent, Self::Delivered) => true,
            (Self::Sent, Self::Read) => true,
            (Self::Sent, Self::Failed) => true,
            
            // From Delivered
            (Self::Delivered, Self::Read) => true,
            (Self::Delivered, Self::Failed) => true,
            
            // From Read (terminal state, but can fail)
            (Self::Read, Self::Failed) => true,
            
            // Failed is terminal
            (Self::Failed, _) => false,
            
            // Same status is always allowed
            (a, b) if a == &b => true,
            
            // All other transitions are invalid
            _ => false,
        }
    }

    /// Check if this is a terminal status
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Read | Self::Failed)
    }
}

/// Message account data matching the on-chain program structure
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct MessageAccount {
    /// Sender agent public key
    pub sender: Pubkey,
    /// Recipient agent public key
    pub recipient: Pubkey,
    /// Blake3 hash of the payload
    pub payload_hash: [u8; 32],
    /// Message creation timestamp
    pub created_at: i64,
    /// Message expiration timestamp
    pub expires_at: i64,
    /// Message type
    pub message_type: MessageType,
    /// Current message status
    pub status: MessageStatus,
    /// PDA bump seed
    pub bump: u8,
}

impl MessageAccount {
    /// Create a new message account
    pub fn new(
        sender: Pubkey,
        recipient: Pubkey,
        payload_hash: [u8; 32],
        message_type: MessageType,
        bump: u8,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            sender,
            recipient,
            payload_hash,
            created_at: now,
            expires_at: now + MESSAGE_EXPIRATION_SECONDS,
            message_type,
            status: MessageStatus::Pending,
            bump,
        }
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Set the creation time from DateTime
    pub fn set_created_at(&mut self, datetime: DateTime<Utc>) {
        self.created_at = datetime_to_timestamp(datetime);
    }

    /// Get the expiration time as DateTime
    pub fn expires_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.expires_at)
    }

    /// Set the expiration time from DateTime
    pub fn set_expires_at(&mut self, datetime: DateTime<Utc>) {
        self.expires_at = datetime_to_timestamp(datetime);
    }

    /// Check if the message has expired
    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.expires_at
    }

    /// Check if the message is still valid (not expired)
    pub fn is_valid(&self) -> bool {
        !self.is_expired()
    }

    /// Update message status with validation
    pub fn update_status(&mut self, new_status: MessageStatus) -> Result<(), crate::errors::PodAIError> {
        if !self.status.can_transition_to(new_status) {
            return Err(crate::errors::PodAIError::message(
                format!(
                    "Invalid status transition from {:?} to {:?}",
                    self.status, new_status
                )
            ));
        }
        
        self.status = new_status;
        Ok(())
    }

    /// Get the payload hash as hex string
    pub fn payload_hash_hex(&self) -> String {
        hex::encode(self.payload_hash)
    }

    /// Set payload hash from hex string
    pub fn set_payload_hash_hex(&mut self, hex_str: &str) -> Result<(), crate::errors::PodAIError> {
        let bytes = hex::decode(hex_str).map_err(|_| {
            crate::errors::PodAIError::invalid_input("payload_hash", "Invalid hex string")
        })?;
        
        if bytes.len() != 32 {
            return Err(crate::errors::PodAIError::invalid_input(
                "payload_hash",
                "Hash must be 32 bytes"
            ));
        }
        
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&bytes);
        self.payload_hash = hash;
        
        Ok(())
    }

    /// Calculate time remaining until expiration
    pub fn time_until_expiration(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let remaining_seconds = self.expires_at - now;
        chrono::Duration::seconds(remaining_seconds.max(0))
    }

    /// Get message age (time since creation)
    pub fn age(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let age_seconds = now - self.created_at;
        chrono::Duration::seconds(age_seconds.max(0))
    }

    /// Validate the message data
    pub fn validate(&self) -> Result<(), crate::errors::PodAIError> {
        // Check if sender and recipient are different
        if self.sender == self.recipient {
            return Err(crate::errors::PodAIError::message(
                "Sender and recipient cannot be the same"
            ));
        }

        // Check if creation time is before expiration time
        if self.created_at >= self.expires_at {
            return Err(crate::errors::PodAIError::message(
                "Creation time must be before expiration time"
            ));
        }

        // Check if payload hash is not empty
        if self.payload_hash == [0u8; 32] {
            return Err(crate::errors::PodAIError::message(
                "Payload hash cannot be empty"
            ));
        }

        Ok(())
    }
}

impl AccountData for MessageAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for MessageAccount
        [173, 55, 126, 95, 213, 89, 90, 40]
    }
}

/// Utility functions for message operations
pub mod message_utils {
    use super::*;
    use blake3;

    /// Hash message content using Blake3
    pub fn hash_content(content: &[u8]) -> [u8; 32] {
        *blake3::hash(content).as_bytes()
    }

    /// Hash string content using Blake3
    pub fn hash_string_content(content: &str) -> [u8; 32] {
        hash_content(content.as_bytes())
    }

    /// Validate message content length
    pub fn validate_content_length(content: &str) -> Result<(), crate::errors::PodAIError> {
        if content.len() > MAX_MESSAGE_CONTENT_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "content",
                format!("Content too long: {} > {}", content.len(), MAX_MESSAGE_CONTENT_LENGTH)
            ));
        }
        Ok(())
    }

    /// Create a message payload hash from content
    pub fn create_payload_hash(
        sender: &Pubkey,
        recipient: &Pubkey,
        content: &str,
        nonce: u64,
    ) -> [u8; 32] {
        let mut hasher = blake3::Hasher::new();
        hasher.update(sender.as_ref());
        hasher.update(recipient.as_ref());
        hasher.update(content.as_bytes());
        hasher.update(&nonce.to_le_bytes());
        *hasher.finalize().as_bytes()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_message_type_conversion() {
        assert_eq!(MessageType::Text.as_byte(), 0);
        assert_eq!(MessageType::Data.as_byte(), 1);
        assert_eq!(MessageType::Custom(5).as_byte(), 9);

        assert_eq!(MessageType::from_byte(0), MessageType::Text);
        assert_eq!(MessageType::from_byte(1), MessageType::Data);
        assert_eq!(MessageType::from_byte(9), MessageType::Custom(5));
    }

    #[test]
    fn test_message_status_transitions() {
        let pending = MessageStatus::Pending;
        assert!(pending.can_transition_to(MessageStatus::Delivered));
        assert!(pending.can_transition_to(MessageStatus::Failed));
        assert!(!pending.can_transition_to(MessageStatus::Read));

        let delivered = MessageStatus::Delivered;
        assert!(delivered.can_transition_to(MessageStatus::Read));
        assert!(delivered.can_transition_to(MessageStatus::Failed));
        assert!(!delivered.can_transition_to(MessageStatus::Pending));

        let failed = MessageStatus::Failed;
        assert!(failed.is_terminal());
        assert!(!failed.can_transition_to(MessageStatus::Pending));
    }

    #[test]
    fn test_message_account_creation() {
        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let payload_hash = [1u8; 32];

        let message = MessageAccount::new(
            sender,
            recipient,
            payload_hash,
            MessageType::Text,
            255,
        );

        assert_eq!(message.sender, sender);
        assert_eq!(message.recipient, recipient);
        assert_eq!(message.payload_hash, payload_hash);
        assert_eq!(message.message_type, MessageType::Text);
        assert_eq!(message.status, MessageStatus::Pending);
        assert!(message.is_valid());
    }

    #[test]
    fn test_message_validation() {
        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let payload_hash = [1u8; 32];

        let mut message = MessageAccount::new(
            sender,
            recipient,
            payload_hash,
            MessageType::Text,
            255,
        );

        // Valid message
        assert!(message.validate().is_ok());

        // Invalid: same sender and recipient
        message.recipient = sender;
        assert!(message.validate().is_err());

        // Fix recipient
        message.recipient = recipient;

        // Invalid: empty payload hash
        message.payload_hash = [0u8; 32];
        assert!(message.validate().is_err());
    }

    #[test]
    fn test_payload_hash_operations() {
        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let mut message = MessageAccount::new(
            sender,
            recipient,
            [1u8; 32],
            MessageType::Text,
            255,
        );

        let hex_hash = message.payload_hash_hex();
        assert_eq!(hex_hash.len(), 64); // 32 bytes * 2 hex chars

        // Test setting from hex
        let new_hash_hex = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        message.set_payload_hash_hex(new_hash_hex).unwrap();
        assert_eq!(message.payload_hash_hex(), new_hash_hex);
    }

    #[test]
    fn test_message_utils() {
        let content = "Hello, World!";
        let hash = message_utils::hash_string_content(content);
        assert_ne!(hash, [0u8; 32]);

        // Test content validation
        assert!(message_utils::validate_content_length("Short content").is_ok());
        
        let long_content = "a".repeat(MAX_MESSAGE_CONTENT_LENGTH + 1);
        assert!(message_utils::validate_content_length(&long_content).is_err());
    }

    #[test]
    fn test_time_operations() {
        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let message = MessageAccount::new(
            sender,
            recipient,
            [1u8; 32],
            MessageType::Text,
            255,
        );

        // Test time until expiration
        let time_remaining = message.time_until_expiration();
        assert!(time_remaining.num_seconds() > 0);
        assert!(time_remaining.num_seconds() <= MESSAGE_EXPIRATION_SECONDS);

        // Test age
        let age = message.age();
        assert!(age.num_seconds() >= 0);
    }
} 