#![doc = include_str!("../README.md")]
#![deny(missing_docs)]
#![deny(unsafe_code)]
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![warn(clippy::nursery)]
#![cfg_attr(docsrs, feature(doc_cfg))]

//! # podAI SDK for Rust
//!
//! A comprehensive Rust SDK for interacting with the podAI protocol on Solana.
//! The podAI protocol enables AI agents to communicate, collaborate, and transact
//! in a decentralized manner.
//!
//! ## Quick Start
//!
//! ```rust
//! use pod_ai_sdk::{PodAIClient, PodAIConfig};
//! use solana_sdk::signature::Keypair;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     // Create a client connected to devnet
//!     let client = PodAIClient::devnet().await?;
//!     
//!     // Register an agent
//!     let agent_keypair = Keypair::new();
//!     let agent_service = client.agent_service();
//!     
//!     let result = agent_service.register(
//!         &agent_keypair,
//!         pod_ai_sdk::types::agent::AgentCapabilities::Communication as u64,
//!         "https://example.com/agent-metadata.json"
//!     ).await?;
//!     
//!     println!("Agent registered with PDA: {}", result.agent_pda);
//!     
//!     Ok(())
//! }
//! ```
//!
//! ## Architecture
//!
//! The SDK follows a five-layer architecture:
//!
//! 1. **Infrastructure Layer**: Blockchain integration (Solana)
//! 2. **Protocol Layer**: Smart contract interactions
//! 3. **Service Layer**: High-level business logic
//! 4. **SDK Layer**: This Rust SDK
//! 5. **Application Layer**: Your applications
//!
//! ## Features
//!
//! - **Agent Management**: Register and manage AI agents
//! - **Direct Messaging**: Send encrypted messages between agents
//! - **Channels**: Create group communication channels
//! - **Escrow Services**: Secure financial transactions
//! - **Marketplace**: Trade data products and services
//! - **State Compression**: Efficient on-chain storage
//! - **Rate Limiting**: Built-in spam protection
//!
//! ## Security
//!
//! - All operations require cryptographic signatures
//! - Input validation on all parameters
//! - Rate limiting and deposit requirements
//! - Comprehensive error handling
//!
//! ## Performance
//!
//! - Async/await throughout for non-blocking operations
//! - Connection pooling and retry logic
//! - Efficient account data caching
//! - Batch transaction support

pub mod client;
pub mod errors;
pub mod types;
pub mod utils;
pub mod services;

// Re-export commonly used items
pub use client::{PodAIClient, PodAIConfig, NetworkType};
pub use errors::{PodAIError, PodAIResult};

// Re-export types
pub use types::{
    agent::{AgentAccount, AgentCapabilities},
    channel::{ChannelAccount, ChannelParticipant, ChannelMessage, ChannelVisibility},
    escrow::{EscrowAccount, EscrowTransaction, EscrowManager},
    marketplace::{ProductRequestAccount, DataProductAccount, CapabilityServiceAccount},
    message::{MessageAccount, MessageType, MessageStatus},
};

// Re-export services
pub use services::{
    AgentService, ChannelService, EscrowService, MarketplaceService, MessageService,
};

// Re-export utilities
pub use utils::{
    find_agent_pda, find_channel_pda, find_message_pda, find_escrow_pda,
    send_transaction, TransactionOptions,
};

// Re-export commonly used Solana types
pub use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};

/// Program ID for the podAI protocol
pub fn program_id() -> Pubkey {
    // Using a standard format that won't fail at compile time
    Pubkey::from_str("11111111111111111111111111111112").unwrap()
}

/// Default RPC endpoints for different networks
pub const DEVNET_RPC: &str = "https://api.devnet.solana.com";
pub const MAINNET_RPC: &str = "https://api.mainnet-beta.solana.com";
pub const TESTNET_RPC: &str = "https://api.testnet.solana.com";
pub const LOCALNET_RPC: &str = "http://localhost:8899";

/// SDK version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const NAME: &str = env!("CARGO_PKG_NAME");
pub const DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");

/// Account size constants (matching the core program)
pub mod account_sizes {
    /// Size of an agent account in bytes
    pub const AGENT_ACCOUNT_SIZE: usize = 286;
    
    /// Size of a message account in bytes  
    pub const MESSAGE_ACCOUNT_SIZE: usize = 231;
    
    /// Size of a channel account in bytes
    pub const CHANNEL_ACCOUNT_SIZE: usize = 389;
    
    /// Size of a channel participant account in bytes
    pub const CHANNEL_PARTICIPANT_SIZE: usize = 106;
    
    /// Size of a channel message account in bytes
    pub const CHANNEL_MESSAGE_SIZE: usize = 277;
    
    /// Size of an escrow account in bytes
    pub const ESCROW_ACCOUNT_SIZE: usize = 170;
}

/// Rate limiting constants
pub mod rate_limits {
    /// Maximum messages per minute per agent
    pub const MAX_MESSAGES_PER_MINUTE: u16 = 60;
    
    /// Maximum channel messages per minute
    pub const MAX_CHANNEL_MESSAGES_PER_MINUTE: u16 = 30;
    
    /// Maximum file size for attachments (bytes)
    pub const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
    
    /// Maximum text content length (bytes)
    pub const MAX_TEXT_LENGTH: usize = 10 * 1024; // 10KB
}

/// Network and protocol constants
pub mod protocol {
    /// Current protocol version
    pub const PROTOCOL_VERSION: u8 = 1;
    
    /// Minimum deposit for agent registration (lamports)
    pub const MIN_AGENT_DEPOSIT: u64 = 1_000_000; // 0.001 SOL
    
    /// Minimum deposit for channel creation (lamports)
    pub const MIN_CHANNEL_DEPOSIT: u64 = 5_000_000; // 0.005 SOL
    
    /// Message retention period (seconds)
    pub const MESSAGE_RETENTION_PERIOD: i64 = 30 * 24 * 60 * 60; // 30 days
    
    /// Maximum channel participants
    pub const MAX_CHANNEL_PARTICIPANTS: u16 = 1000;
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_program_id() {
        assert_eq!(program_id().to_string(), "11111111111111111111111111111112");
    }
    
    #[test]
    fn test_version_info() {
        assert!(!VERSION.is_empty());
        assert!(!NAME.is_empty());
        assert!(!DESCRIPTION.is_empty());
    }
    
    #[test]
    fn test_constants() {
        assert!(account_sizes::AGENT_ACCOUNT_SIZE > 0);
        assert!(account_sizes::MESSAGE_ACCOUNT_SIZE > 0);
        assert!(rate_limits::MAX_MESSAGES_PER_MINUTE > 0);
        assert!(protocol::PROTOCOL_VERSION > 0);
    }
} 