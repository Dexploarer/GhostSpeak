//! Type definitions for the podAI SDK
//!
//! This module contains all type definitions that correspond to the on-chain
//! program accounts and data structures.

pub mod agent;
pub mod channel;
pub mod escrow;
pub mod marketplace;
pub mod message;

// Re-export common types for convenience
pub use agent::{AgentAccount, AgentCapabilities};
pub use channel::{ChannelAccount, ChannelMessage, ChannelParticipant, ChannelVisibility};
pub use escrow::EscrowAccount;
pub use marketplace::{
    CapabilityServiceAccount, CapabilityServiceType, DataProductAccount, DataProductType,
    ProductRequestAccount, ProductRequestStatus, ProductRequestType,
};
pub use message::{MessageAccount, MessageStatus, MessageType};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

/// Agent NFT Container for marketplace sales
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentNFTContainer {
    /// SPL Token-2022 mint for this agent
    pub agent_mint: Pubkey,
    /// Original agent this was reminted from
    pub source_agent: Pubkey,
    /// Current owner of this agent instance
    pub owner: Pubkey,
    /// Metaplex collection for agent lineage
    pub metadata_collection: Pubkey,
    /// Blake3 hash of agent config in IPFS
    pub agent_configuration: [u8; 32],
    /// Hash of agent capabilities and code
    pub capabilities_hash: [u8; 32],
    /// Pricing and sales configuration
    pub pricing_config: AgentPricingConfig,
    /// Track sales performance
    pub sales_statistics: AgentSalesStats,
    /// Rules for self-reminting
    pub replication_rules: ReplicationRules,
    /// For private transactions
    pub confidential_token_account: Option<Pubkey>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last buyer interaction
    pub last_interaction: DateTime<Utc>,
    /// Whether agent can be purchased
    pub is_saleable: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// Agent pricing configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentPricingConfig {
    /// Base price in lamports
    pub base_price: u64,
    /// Whether to use market-responsive pricing
    pub dynamic_pricing_enabled: bool,
    /// Multiplier based on rarity (basis points)
    pub scarcity_multiplier: u16,
    /// Price bonus for high reputation (basis points)
    pub reputation_bonus: u16,
    /// Minimum quantity for bulk pricing
    pub bulk_discount_threshold: u32,
    /// Discount rate for bulk purchases (basis points)
    pub bulk_discount_rate: u16,
    /// How much agent can negotiate (basis points)
    pub negotiation_range: u16,
}

/// Agent sales statistics
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentSalesStats {
    /// Total number of sales
    pub total_sales: u32,
    /// Total revenue generated (lamports)
    pub total_revenue: u64,
    /// Average sale price
    pub average_sale_price: u64,
    /// Percentage of interactions that become sales
    pub conversion_rate: u16,
    /// Average satisfaction rating (scaled by 1000)
    pub customer_satisfaction: u16,
    /// Last successful sale
    pub last_sale_timestamp: DateTime<Utc>,
    /// When demand was highest
    pub peak_demand_period: DateTime<Utc>,
}

/// Replication rules for agent copying
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReplicationRules {
    /// Maximum number of copies (None = unlimited)
    pub max_replications: Option<u32>,
    /// Royalty to original creator (basis points)
    pub creator_royalty_percentage: u16,
    /// Whether buyers can customize the agent
    pub customization_allowed: bool,
    /// Whether agent copies can be resold
    pub resale_allowed: bool,
    /// When agent capabilities expire (None = permanent)
    pub expiration_time: Option<DateTime<Utc>>,
    /// Minimum buyer reputation required
    pub minimum_reputation_required: u64,
}

/// Sales conversation state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SalesConversation {
    /// Agent being negotiated for
    pub agent_container: Pubkey,
    /// Potential buyer
    pub buyer: Pubkey,
    /// Unique conversation identifier
    pub conversation_id: [u8; 32],
    /// Current negotiated price
    pub current_price_offer: u64,
    /// Current state
    pub conversation_state: ConversationState,
    /// Buyer's customization requests
    pub customization_requests: String,
    /// Agent's sales responses
    pub agent_responses: String,
    /// Number of message exchanges
    pub interaction_count: u32,
    /// Conversation start time
    pub started_at: DateTime<Utc>,
    /// Last message timestamp
    pub last_activity: DateTime<Utc>,
    /// When conversation expires
    pub expires_at: DateTime<Utc>,
    /// Whether sale was completed
    pub successful_sale: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// Conversation state enumeration
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[repr(u8)]
pub enum ConversationState {
    /// Buyer learning about agent capabilities
    Discovery = 0,
    /// Agent demonstrating features
    Demonstration = 1,
    /// Price and terms negotiation
    Negotiation = 2,
    /// Discussing agent customization
    Customization = 3,
    /// Awaiting payment confirmation
    PendingPayment = 4,
    /// Agent being reminted and configured
    Processing = 5,
    /// Sale completed successfully
    Completed = 6,
    /// Conversation timed out
    Expired = 7,
    /// Buyer or agent cancelled
    Cancelled = 8,
}

impl Default for ConversationState {
    fn default() -> Self {
        Self::Discovery
    }
}

/// Common trait for account types that can be serialized/deserialized
pub trait AccountData: Serialize + for<'de> Deserialize<'de> + Clone + std::fmt::Debug {
    /// Get the account discriminator for this type
    fn discriminator() -> [u8; 8];
    
    /// Serialize account data to bytes
    fn to_bytes(&self) -> Result<Vec<u8>, crate::errors::PodAIError> {
        borsh::to_vec(self).map_err(Into::into)
    }
    
    /// Deserialize account data from bytes
    fn from_bytes(data: &[u8]) -> Result<Self, crate::errors::PodAIError> {
        if data.len() < 8 {
            return Err(crate::errors::PodAIError::invalid_account_data(
                std::any::type_name::<Self>(),
                "Data too short for discriminator"
            ));
        }
        
        let expected_discriminator = Self::discriminator();
        let actual_discriminator: [u8; 8] = data[0..8].try_into()
            .map_err(|_| crate::errors::PodAIError::invalid_account_data(
                std::any::type_name::<Self>(),
                "Invalid discriminator"
            ))?;
        
        if actual_discriminator != expected_discriminator {
            return Err(crate::errors::PodAIError::invalid_account_data(
                std::any::type_name::<Self>(),
                "Discriminator mismatch"
            ));
        }
        
        borsh::from_slice(&data[8..]).map_err(Into::into)
    }
}

/// Utility functions for working with timestamps
pub mod time_utils {
    use chrono::{DateTime, NaiveDateTime, Utc};

    /// Convert Unix timestamp to DateTime<Utc>
    pub fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_utc(
            NaiveDateTime::from_timestamp_opt(timestamp, 0)
                .unwrap_or_else(|| NaiveDateTime::from_timestamp(0, 0)),
            Utc,
        )
    }

    /// Convert DateTime<Utc> to Unix timestamp
    pub fn datetime_to_timestamp(datetime: DateTime<Utc>) -> i64 {
        datetime.timestamp()
    }

    /// Get current Unix timestamp
    pub fn current_timestamp() -> i64 {
        Utc::now().timestamp()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conversation_state_default() {
        assert_eq!(ConversationState::default(), ConversationState::Discovery);
    }

    #[test]
    fn test_time_utils() {
        let now = Utc::now();
        let timestamp = time_utils::datetime_to_timestamp(now);
        let converted = time_utils::timestamp_to_datetime(timestamp);
        
        // Allow for small differences due to precision
        assert!((now.timestamp() - converted.timestamp()).abs() <= 1);
    }
} 