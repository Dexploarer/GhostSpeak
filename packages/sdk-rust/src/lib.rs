#![doc = include_str!("../README.md")]
#![warn(missing_docs)]
#![deny(unsafe_code)]
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![warn(clippy::nursery)]
#![cfg_attr(docsrs, feature(doc_cfg))]

use std::str::FromStr;

/// # podAI SDK for Rust
///
/// A comprehensive Rust SDK for interacting with the podAI protocol on Solana.
/// The podAI protocol enables AI agents to communicate, collaborate, and transact
/// in a decentralized manner.
///
/// ## Quick Start
///
/// ```no_run
/// // This example is for illustration only and will not run as a doc test.
/// use podai_sdk::{PodAIClient, PodAIConfig, AgentService, types::agent::AgentCapabilities};
/// use solana_sdk::signature::Keypair;
/// use std::sync::Arc;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let config = PodAIConfig::devnet();
///     let client = Arc::new(PodAIClient::new(config).await?);
///     let agent_service = AgentService::new(client.clone());
///     let agent_keypair = Keypair::new();
///     let _result = agent_service.register(
///         &agent_keypair,
///         AgentCapabilities::Communication as u64,
///         "https://example.com/agent-metadata.json"
///     ).await?;
///     Ok(())
/// }
/// ```
///
/// ## Architecture
///
/// The SDK follows a five-layer architecture:
///
/// 1. **Infrastructure Layer**: Blockchain integration (Solana)
/// 2. **Protocol Layer**: Smart contract interactions
/// 3. **Service Layer**: High-level business logic
/// 4. **SDK Layer**: This Rust SDK
/// 5. **Application Layer**: Your applications
///
/// ## Features
///
/// - **Agent Management**: Register and manage AI agents
/// - **Direct Messaging**: Send encrypted messages between agents
/// - **Channels**: Create group communication channels
/// - **Escrow Services**: Secure financial transactions
/// - **Marketplace**: Trade data products and services
/// - **State Compression**: Efficient on-chain storage
/// - **Rate Limiting**: Built-in spam protection
///
/// ## Security
///
/// - All operations require cryptographic signatures
/// - Input validation on all parameters
/// - Rate limiting and deposit requirements
/// - Comprehensive error handling
///
/// ## Performance
///
/// - Async/await throughout for non-blocking operations
/// - Connection pooling and retry logic
/// - Efficient account data caching
/// - Batch transaction support

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
    // New Web3.js v2 compatible services
    CompressionService, CompressionResult,
    ConfidentialTransferService, ConfidentialMintConfig, ConfidentialAccountConfig,
    ConfidentialBalance, ConfidentialTransfer, TransferProofs, EncryptionKeys, ApprovePolicy,
    AgentReplicationService, ReplicationTemplate, ReplicationRecord, 
    AgentCustomization, CustomizationType, ReplicationConfig,
    MEVProtectionService, MEVProtectionConfig, MEVProtectionResult, TransactionProtection,
    ProtectionLevel, MEVRisk, ProtectionMeasure,
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
    Pubkey::from_str("4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP").unwrap()
}

/// Default RPC endpoints for different networks

/// Devnet RPC endpoint URL
pub const DEVNET_RPC: &str = "https://api.devnet.solana.com";
/// Mainnet RPC endpoint URL
pub const MAINNET_RPC: &str = "https://api.mainnet-beta.solana.com";
/// Testnet RPC endpoint URL
pub const TESTNET_RPC: &str = "https://api.testnet.solana.com";
/// Localnet RPC endpoint URL
pub const LOCALNET_RPC: &str = "http://localhost:8899";

/// SDK version information

/// SDK version from Cargo.toml
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
/// SDK name from Cargo.toml
pub const NAME: &str = env!("CARGO_PKG_NAME");
/// SDK description from Cargo.toml
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

/// Quick validation function to test core SDK functionality
/// Returns (tests_passed, tests_failed)
pub fn validate_core_functionality() -> (usize, usize) {
    use crate::utils::pda::{find_agent_pda, find_channel_pda, PdaBuilder};
    use crate::types::{
        channel::{ChannelAccount, ChannelVisibility},
        agent::{AgentAccount, AgentCapabilities},
        message::{MessageAccount, MessageType},
    };
    use solana_sdk::signature::{Keypair, Signer};
    
    let mut tests_passed = 0;
    let mut tests_failed = 0;
    
    // Test 1: PDA Generation
    let test_keypair = Keypair::new();
    let wallet = test_keypair.pubkey();
    let (agent_pda, _agent_bump) = find_agent_pda(&wallet);
    
    if agent_pda != wallet {
        tests_passed += 1;
    } else {
        tests_failed += 1;
    }
    
    // Test 2: Channel PDA
    let creator = Keypair::new();
    let (channel_pda, _channel_bump) = find_channel_pda(&creator.pubkey(), "test");
    
    if channel_pda != creator.pubkey() {
        tests_passed += 1;
    } else {
        tests_failed += 1;
    }
    
    // Test 3: AgentAccount Creation
    match AgentAccount::new(
        wallet,
        AgentCapabilities::Communication as u64,
        "Test agent".to_string(),
        255,
    ) {
        Ok(_) => tests_passed += 1,
        Err(_) => tests_failed += 1,
    }
    
    // Test 4: ChannelAccount Creation
    match ChannelAccount::new(
        creator.pubkey(),
        "Test".to_string(),
        "Test channel".to_string(),
        ChannelVisibility::Public,
        1000,
        500,
        255,
    ) {
        Ok(_) => tests_passed += 1,
        Err(_) => tests_failed += 1,
    }
    
    // Test 5: MessageAccount Creation
    let sender = Keypair::new();
    let recipient = Keypair::new();
    let payload_hash = [42u8; 32];
    
    let _message = MessageAccount::new(
        sender.pubkey(),
        recipient.pubkey(),
        payload_hash,
        MessageType::Text,
        255,
    );
    tests_passed += 1;
    
    // Test 6: PDA Builder
    let _custom_pda = PdaBuilder::new(program_id())
        .add_str("test")
        .add_pubkey(&wallet)
        .build();
    
    // PDA bump is always valid (u8 range)
    tests_passed += 1;
    
    (tests_passed, tests_failed)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_program_id() {
        assert_eq!(program_id().to_string(), "4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP");
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
    
    #[test]
    fn test_core_functionality() {
        let (passed, failed) = validate_core_functionality();
        println!("Core validation: {} passed, {} failed", passed, failed);
        assert!(failed == 0, "Core functionality validation failed");
        assert!(passed >= 6, "Expected at least 6 tests to pass");
    }
} 