//! Service layer for the podAI SDK
//!
//! This module contains specialized service implementations for different
//! aspects of the podAI protocol, providing high-level APIs for common operations.

pub mod agent;
pub mod agent_replication;
pub mod channel;
pub mod compression;
pub mod confidential_transfer;
pub mod escrow;
pub mod marketplace;
pub mod message;
pub mod mev_protection;

// Re-export services for convenience
pub use agent::AgentService;
pub use agent_replication::{
    AgentReplicationService, ReplicationTemplate, ReplicationRecord, 
    AgentCustomization, CustomizationType, ReplicationConfig
};
pub use channel::ChannelService;
pub use compression::{CompressionService, CompressionResult};
pub use confidential_transfer::{
    ConfidentialTransferService, ConfidentialMintConfig, ConfidentialAccountConfig,
    ConfidentialBalance, ConfidentialTransfer, TransferProofs, EncryptionKeys, ApprovePolicy
};
pub use escrow::EscrowService;
pub use marketplace::MarketplaceService;
pub use message::MessageService;
pub use mev_protection::{
    MEVProtectionService, MEVProtectionConfig, MEVProtectionResult, TransactionProtection,
    ProtectionLevel, MEVRisk, ProtectionMeasure
}; 