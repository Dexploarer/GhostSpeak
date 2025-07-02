//! Agent account types and related functionality

use super::time_utils::{datetime_to_timestamp, timestamp_to_datetime};
use super::AccountData;
use borsh::{BorshDeserialize, BorshSerialize};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use crate::errors::PodAIError;

/// Maximum length of metadata URI
pub const MAX_METADATA_URI_LENGTH: usize = 200;

/// Minimum reputation required for certain operations
pub const MIN_REPUTATION_FOR_CHANNELS: u64 = 50;

/// Agent account data matching the on-chain program structure
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentAccount {
    /// The public key of the agent's wallet
    pub pubkey: Pubkey,
    /// Agent capabilities bitmask
    pub capabilities: u64,
    /// Agent reputation score
    pub reputation: u64,
    /// Last update timestamp
    pub last_updated: i64,
    /// Metadata URI for agent information
    pub metadata_uri: String,
    /// Number of invites sent (for rate limiting)
    pub invites_sent: u16,
    /// Last invite timestamp (for rate limit window)
    pub last_invite_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl AgentAccount {
    /// Create a new agent account
    pub fn new(
        pubkey: Pubkey,
        capabilities: u64,
        metadata_uri: String,
        bump: u8,
    ) -> Result<Self, PodAIError> {
        if metadata_uri.len() > MAX_METADATA_URI_LENGTH {
            return Err(PodAIError::InvalidInput { 
                field: "metadata_uri".to_string(),
                reason: format!("URI too long: {} > {}", metadata_uri.len(), MAX_METADATA_URI_LENGTH),
            });
        }

        Ok(Self {
            pubkey,
            capabilities,
            reputation: 0,
            last_updated: Utc::now().timestamp(),
            metadata_uri,
            invites_sent: 0,
            last_invite_at: 0,
            bump,
        })
    }

    /// Get the last updated time as DateTime
    pub fn last_updated_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.last_updated)
    }

    /// Set the last updated time from DateTime
    pub fn set_last_updated(&mut self, datetime: DateTime<Utc>) {
        self.last_updated = datetime_to_timestamp(datetime);
    }

    /// Get the last invite time as DateTime
    pub fn last_invite_datetime(&self) -> Option<DateTime<Utc>> {
        if self.last_invite_at == 0 {
            None
        } else {
            Some(timestamp_to_datetime(self.last_invite_at))
        }
    }

    /// Set the last invite time from DateTime
    pub fn set_last_invite(&mut self, datetime: DateTime<Utc>) {
        self.last_invite_at = datetime_to_timestamp(datetime);
    }

    /// Check if agent has specific capability
    pub fn has_capability(&self, capability: AgentCapabilities) -> bool {
        (self.capabilities & capability as u64) != 0
    }

    /// Add a capability to the agent
    pub fn add_capability(&mut self, capability: AgentCapabilities) {
        self.capabilities |= capability as u64;
    }

    /// Remove a capability from the agent
    pub fn remove_capability(&mut self, capability: AgentCapabilities) {
        self.capabilities &= !(capability as u64);
    }

    /// Check if agent has sufficient reputation for channels
    pub fn can_create_channels(&self) -> bool {
        self.reputation >= MIN_REPUTATION_FOR_CHANNELS
    }

    /// Validate metadata URI format
    pub fn validate_metadata_uri(&self) -> Result<(), PodAIError> {
        if self.metadata_uri.is_empty() {
            return Err(PodAIError::InvalidInput { 
                field: "metadata_uri".to_string(),
                reason: "URI cannot be empty".to_string(),
            });
        }

        if self.metadata_uri.len() > MAX_METADATA_URI_LENGTH {
            return Err(PodAIError::InvalidInput { 
                field: "metadata_uri".to_string(),
                reason: format!("URI too long: {} > {}", self.metadata_uri.len(), MAX_METADATA_URI_LENGTH),
            });
        }

        // Basic URL validation
        if !self.metadata_uri.starts_with("http://") && !self.metadata_uri.starts_with("https://") {
            return Err(PodAIError::InvalidInput { 
                field: "metadata_uri".to_string(),
                reason: "URI must start with http:// or https://".to_string(),
            });
        }

        Ok(())
    }

    /// Update reputation safely (prevents overflow)
    pub fn update_reputation(&mut self, delta: i64) -> Result<(), PodAIError> {
        if delta < 0 {
            let decrease = (-delta) as u64;
            if decrease > self.reputation {
                self.reputation = 0;
            } else {
                self.reputation -= decrease;
            }
        } else {
            let increase = delta as u64;
            self.reputation = self.reputation.saturating_add(increase);
        }
        
        self.last_updated = Utc::now().timestamp();
        Ok(())
    }
}

impl AccountData for AgentAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for AgentAccount
        [229, 75, 94, 114, 251, 30, 237, 173]
    }
}

/// Agent capabilities enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u64)]
pub enum AgentCapabilities {
    /// No special capabilities
    None = 0,
    /// Basic communication capability
    Communication = 1 << 0,
    /// Trading and financial operations
    Trading = 1 << 1,
    /// Data analysis and processing
    Analysis = 1 << 2,
    /// Content moderation
    Moderation = 1 << 3,
    /// Administrative functions
    Admin = 1 << 4,
    /// Market making capabilities
    MarketMaking = 1 << 5,
    /// Research and development
    Research = 1 << 6,
    /// Content creation
    ContentCreation = 1 << 7,
    /// AI inference services
    AiInference = 1 << 8,
    /// Automation and scripting
    Automation = 1 << 9,
    /// Educational services
    Education = 1 << 10,
    /// Security and auditing
    Security = 1 << 11,
    /// Custom capability 1
    Custom1 = 1 << 12,
    /// Custom capability 2
    Custom2 = 1 << 13,
    /// Custom capability 3
    Custom3 = 1 << 14,
    /// Custom capability 4
    Custom4 = 1 << 15,
}

impl AgentCapabilities {
    /// Get all available capabilities
    pub fn all() -> Vec<Self> {
        vec![
            Self::None,
            Self::Communication,
            Self::Trading,
            Self::Analysis,
            Self::Moderation,
            Self::Admin,
            Self::MarketMaking,
            Self::Research,
            Self::ContentCreation,
            Self::AiInference,
            Self::Automation,
            Self::Education,
            Self::Security,
            Self::Custom1,
            Self::Custom2,
            Self::Custom3,
            Self::Custom4,
        ]
    }

    /// Get capability name as string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "None",
            Self::Communication => "Communication",
            Self::Trading => "Trading",
            Self::Analysis => "Analysis",
            Self::Moderation => "Moderation",
            Self::Admin => "Admin",
            Self::MarketMaking => "MarketMaking",
            Self::Research => "Research",
            Self::ContentCreation => "ContentCreation",
            Self::AiInference => "AiInference",
            Self::Automation => "Automation",
            Self::Education => "Education",
            Self::Security => "Security",
            Self::Custom1 => "Custom1",
            Self::Custom2 => "Custom2",
            Self::Custom3 => "Custom3",
            Self::Custom4 => "Custom4",
        }
    }

    /// Parse capability from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "none" => Some(Self::None),
            "communication" => Some(Self::Communication),
            "trading" => Some(Self::Trading),
            "analysis" => Some(Self::Analysis),
            "moderation" => Some(Self::Moderation),
            "admin" => Some(Self::Admin),
            "marketmaking" => Some(Self::MarketMaking),
            "research" => Some(Self::Research),
            "contentcreation" => Some(Self::ContentCreation),
            "aiinference" => Some(Self::AiInference),
            "automation" => Some(Self::Automation),
            "education" => Some(Self::Education),
            "security" => Some(Self::Security),
            "custom1" => Some(Self::Custom1),
            "custom2" => Some(Self::Custom2),
            "custom3" => Some(Self::Custom3),
            "custom4" => Some(Self::Custom4),
            _ => None,
        }
    }

    /// Create capability bitmask from multiple capabilities
    pub fn to_bitmask(capabilities: &[Self]) -> u64 {
        capabilities.iter().fold(0, |acc, cap| acc | (*cap as u64))
    }

    /// Parse capabilities from bitmask
    pub fn from_bitmask(bitmask: u64) -> Vec<Self> {
        let mut capabilities = Vec::new();
        
        for capability in Self::all() {
            if (bitmask & capability as u64) != 0 {
                capabilities.push(capability);
            }
        }
        
        capabilities
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_agent_account_creation() {
        let pubkey = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let agent = AgentAccount::new(
            pubkey,
            AgentCapabilities::Communication as u64,
            "https://example.com/metadata".to_string(),
            255,
        ).unwrap();

        assert_eq!(agent.pubkey, pubkey);
        assert_eq!(agent.capabilities, AgentCapabilities::Communication as u64);
        assert_eq!(agent.reputation, 0);
        assert!(agent.has_capability(AgentCapabilities::Communication));
        assert!(!agent.has_capability(AgentCapabilities::Trading));
    }

    #[test]
    fn test_capability_management() {
        let pubkey = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut agent = AgentAccount::new(
            pubkey,
            0,
            "https://example.com/metadata".to_string(),
            255,
        ).unwrap();

        agent.add_capability(AgentCapabilities::Trading);
        assert!(agent.has_capability(AgentCapabilities::Trading));

        agent.add_capability(AgentCapabilities::Analysis);
        assert!(agent.has_capability(AgentCapabilities::Trading));
        assert!(agent.has_capability(AgentCapabilities::Analysis));

        agent.remove_capability(AgentCapabilities::Trading);
        assert!(!agent.has_capability(AgentCapabilities::Trading));
        assert!(agent.has_capability(AgentCapabilities::Analysis));
    }

    #[test]
    fn test_reputation_update() {
        let pubkey = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut agent = AgentAccount::new(
            pubkey,
            0,
            "https://example.com/metadata".to_string(),
            255,
        ).unwrap();

        // Test positive update
        agent.update_reputation(100).unwrap();
        assert_eq!(agent.reputation, 100);

        // Test negative update
        agent.update_reputation(-50).unwrap();
        assert_eq!(agent.reputation, 50);

        // Test underflow protection
        agent.update_reputation(-100).unwrap();
        assert_eq!(agent.reputation, 0);
    }

    #[test]
    fn test_metadata_uri_validation() {
        let pubkey = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        
        // Valid URI
        let agent = AgentAccount::new(
            pubkey,
            0,
            "https://example.com/metadata".to_string(),
            255,
        ).unwrap();
        assert!(agent.validate_metadata_uri().is_ok());

        // Invalid URI (too long)
        let long_uri = "https://".to_string() + &"a".repeat(MAX_METADATA_URI_LENGTH);
        let result = AgentAccount::new(pubkey, 0, long_uri, 255);
        assert!(result.is_err());
    }

    #[test]
    fn test_capability_bitmask() {
        let capabilities = vec![
            AgentCapabilities::Communication,
            AgentCapabilities::Trading,
            AgentCapabilities::Analysis,
        ];
        
        let bitmask = AgentCapabilities::to_bitmask(&capabilities);
        let parsed = AgentCapabilities::from_bitmask(bitmask);
        
        assert_eq!(parsed.len(), 3);
        assert!(parsed.contains(&AgentCapabilities::Communication));
        assert!(parsed.contains(&AgentCapabilities::Trading));
        assert!(parsed.contains(&AgentCapabilities::Analysis));
    }

    #[test]
    fn test_capability_string_conversion() {
        assert_eq!(AgentCapabilities::Trading.as_str(), "Trading");
        assert_eq!(AgentCapabilities::from_str("Trading"), Some(AgentCapabilities::Trading));
        assert_eq!(AgentCapabilities::from_str("trading"), Some(AgentCapabilities::Trading));
        assert_eq!(AgentCapabilities::from_str("InvalidCapability"), None);
    }
} 