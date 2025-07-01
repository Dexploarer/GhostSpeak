//! Service layer for the podAI SDK
//!
//! This module contains specialized service implementations for different
//! aspects of the podAI protocol, providing high-level APIs for common operations.

pub mod agent;
pub mod channel;
pub mod escrow;
pub mod marketplace;
pub mod message;

// Re-export services for convenience
pub use agent::AgentService;
pub use channel::ChannelService;
pub use escrow::EscrowService;
pub use marketplace::MarketplaceService;
pub use message::MessageService; 