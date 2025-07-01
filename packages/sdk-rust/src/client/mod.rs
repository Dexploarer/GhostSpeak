//! Main client module for the podAI SDK

use crate::errors::{PodAIError, PodAIResult};
use crate::services::{AgentService, ChannelService, EscrowService, MarketplaceService, MessageService};
use crate::PROGRAM_ID;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};
use std::sync::Arc;
use std::time::Duration;

/// Network type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NetworkType {
    /// Devnet network
    Devnet,
    /// Mainnet network
    Mainnet,
    /// Testnet network
    Testnet,
    /// Local network
    Localnet,
    /// Custom network
    Custom,
}

impl NetworkType {
    /// Get the default RPC endpoint for this network
    pub fn default_rpc_endpoint(&self) -> &'static str {
        match self {
            Self::Devnet => "https://api.devnet.solana.com",
            Self::Mainnet => "https://api.mainnet-beta.solana.com",
            Self::Testnet => "https://api.testnet.solana.com",
            Self::Localnet => "http://localhost:8899",
            Self::Custom => "", // Must be provided by user
        }
    }

    /// Get the network name as string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Devnet => "devnet",
            Self::Mainnet => "mainnet",
            Self::Testnet => "testnet",
            Self::Localnet => "localnet",
            Self::Custom => "custom",
        }
    }
}

/// Configuration for the podAI client
#[derive(Debug, Clone)]
pub struct PodAIConfig {
    /// RPC endpoint URL
    pub rpc_endpoint: String,
    /// Network type
    pub network: NetworkType,
    /// RPC client timeout
    pub timeout: Duration,
    /// Commitment level for transactions
    pub commitment: CommitmentConfig,
    /// Maximum retries for failed requests
    pub max_retries: u32,
    /// Retry delay in milliseconds
    pub retry_delay_ms: u64,
    /// Whether to use compression features
    pub enable_compression: bool,
    /// Program ID (can be overridden for testing)
    pub program_id: Pubkey,
}

impl PodAIConfig {
    /// Create a new configuration for devnet
    pub fn devnet() -> Self {
        Self {
            rpc_endpoint: NetworkType::Devnet.default_rpc_endpoint().to_string(),
            network: NetworkType::Devnet,
            timeout: Duration::from_secs(30),
            commitment: CommitmentConfig::confirmed(),
            max_retries: 3,
            retry_delay_ms: 1000,
            enable_compression: true,
            program_id: PROGRAM_ID,
        }
    }

    /// Create a new configuration for mainnet
    pub fn mainnet() -> Self {
        Self {
            rpc_endpoint: NetworkType::Mainnet.default_rpc_endpoint().to_string(),
            network: NetworkType::Mainnet,
            timeout: Duration::from_secs(60),
            commitment: CommitmentConfig::finalized(),
            max_retries: 5,
            retry_delay_ms: 2000,
            enable_compression: true,
            program_id: PROGRAM_ID,
        }
    }

    /// Create a new configuration for localnet
    pub fn localnet() -> Self {
        Self {
            rpc_endpoint: NetworkType::Localnet.default_rpc_endpoint().to_string(),
            network: NetworkType::Localnet,
            timeout: Duration::from_secs(10),
            commitment: CommitmentConfig::processed(),
            max_retries: 1,
            retry_delay_ms: 500,
            enable_compression: false,
            program_id: PROGRAM_ID,
        }
    }

    /// Create a new configuration for a custom RPC endpoint
    pub fn custom(rpc_endpoint: String) -> Self {
        Self {
            rpc_endpoint,
            network: NetworkType::Custom,
            timeout: Duration::from_secs(30),
            commitment: CommitmentConfig::confirmed(),
            max_retries: 3,
            retry_delay_ms: 1000,
            enable_compression: true,
            program_id: PROGRAM_ID,
        }
    }

    /// Set the RPC endpoint
    pub fn with_rpc_endpoint(mut self, endpoint: String) -> Self {
        self.rpc_endpoint = endpoint;
        self
    }

    /// Set the timeout
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Set the commitment level
    pub fn with_commitment(mut self, commitment: CommitmentConfig) -> Self {
        self.commitment = commitment;
        self
    }

    /// Set max retries
    pub fn with_max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    /// Enable or disable compression
    pub fn with_compression(mut self, enable: bool) -> Self {
        self.enable_compression = enable;
        self
    }

    /// Set custom program ID
    pub fn with_program_id(mut self, program_id: Pubkey) -> Self {
        self.program_id = program_id;
        self
    }

    /// Validate the configuration
    pub fn validate(&self) -> PodAIResult<()> {
        // Validate RPC endpoint
        if self.rpc_endpoint.is_empty() {
            return Err(PodAIError::configuration("RPC endpoint cannot be empty"));
        }

        // For custom networks, ensure endpoint is provided
        if self.network == NetworkType::Custom && self.rpc_endpoint == NetworkType::Custom.default_rpc_endpoint() {
            return Err(PodAIError::configuration("Custom network requires RPC endpoint"));
        }

        // Validate timeout
        if self.timeout.as_secs() == 0 {
            return Err(PodAIError::configuration("Timeout must be greater than 0"));
        }

        // Validate retry settings
        if self.max_retries > 10 {
            return Err(PodAIError::configuration("Max retries should not exceed 10"));
        }

        Ok(())
    }
}

impl Default for PodAIConfig {
    fn default() -> Self {
        Self::devnet()
    }
}

/// Main client for interacting with the podAI protocol
#[derive(Debug)]
pub struct PodAIClient {
    /// RPC client for blockchain operations
    pub rpc_client: RpcClient,
    /// Client configuration
    pub config: PodAIConfig,
    /// Client creation timestamp
    created_at: DateTime<Utc>,
}

impl PodAIClient {
    /// Create a new podAI client
    pub async fn new(config: PodAIConfig) -> PodAIResult<Self> {
        // Validate configuration
        config.validate()?;

        // Create RPC client
        let rpc_client = RpcClient::new_with_timeout_and_commitment(
            config.rpc_endpoint.clone(),
            config.timeout,
            config.commitment,
        );

        // Test connection
        match rpc_client.get_health() {
            Ok(_) => log::info!("Successfully connected to RPC endpoint: {}", config.rpc_endpoint),
            Err(e) => {
                log::warn!("Failed to connect to RPC endpoint: {}", e);
                return Err(PodAIError::network(format!("RPC connection failed: {}", e)));
            }
        }

        Ok(Self {
            rpc_client,
            config,
            created_at: Utc::now(),
        })
    }

    /// Create a client with devnet configuration
    pub async fn devnet() -> PodAIResult<Self> {
        Self::new(PodAIConfig::devnet()).await
    }

    /// Create a client with mainnet configuration
    pub async fn mainnet() -> PodAIResult<Self> {
        Self::new(PodAIConfig::mainnet()).await
    }

    /// Create a client with localnet configuration
    pub async fn localnet() -> PodAIResult<Self> {
        Self::new(PodAIConfig::localnet()).await
    }

    /// Get the program ID being used
    pub fn program_id(&self) -> Pubkey {
        self.config.program_id
    }

    /// Get the network type
    pub fn network(&self) -> NetworkType {
        self.config.network
    }

    /// Get the RPC endpoint
    pub fn rpc_endpoint(&self) -> &str {
        &self.config.rpc_endpoint
    }

    /// Get client age
    pub fn age(&self) -> chrono::Duration {
        Utc::now() - self.created_at
    }

    /// Check if compression is enabled
    pub fn compression_enabled(&self) -> bool {
        self.config.enable_compression
    }

    /// Get the current slot
    pub async fn get_current_slot(&self) -> PodAIResult<u64> {
        self.rpc_client
            .get_slot()
            .map_err(Into::into)
    }

    /// Get account balance
    pub async fn get_balance(&self, pubkey: &Pubkey) -> PodAIResult<u64> {
        self.rpc_client
            .get_balance(pubkey)
            .map_err(Into::into)
    }

    /// Check if an account exists
    pub async fn account_exists(&self, pubkey: &Pubkey) -> PodAIResult<bool> {
        match self.rpc_client.get_account(pubkey) {
            Ok(_) => Ok(true),
            Err(e) => {
                // Check if it's a "not found" error
                if e.to_string().contains("not found") {
                    Ok(false)
                } else {
                    Err(PodAIError::from(e))
                }
            }
        }
    }

    /// Send and confirm a transaction
    pub async fn send_and_confirm_transaction(
        &self,
        transaction: &Transaction,
    ) -> PodAIResult<Signature> {
        self.rpc_client
            .send_and_confirm_transaction(transaction)
            .map_err(Into::into)
    }

    /// Simulate a transaction
    pub async fn simulate_transaction(
        &self,
        transaction: &Transaction,
    ) -> PodAIResult<solana_client::rpc_response::RpcSimulateTransactionResult> {
        self.rpc_client
            .simulate_transaction(transaction)
            .map_err(Into::into)
    }

    /// Get recent blockhash
    pub async fn get_recent_blockhash(&self) -> PodAIResult<solana_sdk::hash::Hash> {
        self.rpc_client
            .get_recent_blockhash()
            .map(|(hash, _)| hash)
            .map_err(Into::into)
    }

    /// Get minimum balance for rent exemption
    pub async fn get_minimum_balance_for_rent_exemption(&self, data_len: usize) -> PodAIResult<u64> {
        self.rpc_client
            .get_minimum_balance_for_rent_exemption(data_len)
            .map_err(Into::into)
    }

    /// Retry a function with exponential backoff
    async fn retry_with_backoff<F, T, E>(&self, mut f: F) -> Result<T, E>
    where
        F: FnMut() -> Result<T, E>,
        E: std::fmt::Display,
    {
        let mut delay = self.config.retry_delay_ms;
        
        for attempt in 0..=self.config.max_retries {
            match f() {
                Ok(result) => return Ok(result),
                Err(e) => {
                    if attempt == self.config.max_retries {
                        return Err(e);
                    }
                    
                    log::debug!("Attempt {} failed: {}, retrying in {}ms", attempt + 1, e, delay);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                    delay = (delay * 2).min(10000); // Cap at 10 seconds
                }
            }
        }
        
        unreachable!()
    }

    // === SERVICE ACCESSORS ===

    /// Get the agent service
    pub fn agent_service(&self) -> AgentService {
        AgentService::new(Arc::new(self.clone()))
    }

    /// Get the message service
    pub fn message_service(&self) -> MessageService {
        MessageService::new(Arc::new(self.clone()))
    }

    /// Get the channel service
    pub fn channel_service(&self) -> ChannelService {
        ChannelService::new(Arc::new(self.clone()))
    }

    /// Get the escrow service
    pub fn escrow_service(&self) -> EscrowService {
        EscrowService::new(Arc::new(self.clone()))
    }

    /// Get the marketplace service
    pub fn marketplace_service(&self) -> MarketplaceService {
        MarketplaceService::new(Arc::new(self.clone()))
    }
}

// Implement Clone for PodAIClient (needed for service accessors)
impl Clone for PodAIClient {
    fn clone(&self) -> Self {
        // Note: This creates a new RPC client with the same config
        // In production, you might want to share the RPC client
        let rpc_client = RpcClient::new_with_timeout_and_commitment(
            self.config.rpc_endpoint.clone(),
            self.config.timeout,
            self.config.commitment,
        );

        Self {
            rpc_client,
            config: self.config.clone(),
            created_at: self.created_at,
        }
    }
}

/// Transaction result information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    /// Transaction signature
    pub signature: Signature,
    /// Transaction slot
    pub slot: u64,
    /// Transaction confirmation status
    pub confirmed: bool,
    /// Transaction execution time
    pub execution_time: Duration,
    /// Optional error message
    pub error: Option<String>,
}

impl TransactionResult {
    /// Create a new successful transaction result
    pub fn success(signature: Signature, slot: u64, execution_time: Duration) -> Self {
        Self {
            signature,
            slot,
            confirmed: true,
            execution_time,
            error: None,
        }
    }

    /// Create a new failed transaction result
    pub fn failure(signature: Signature, slot: u64, execution_time: Duration, error: String) -> Self {
        Self {
            signature,
            slot,
            confirmed: false,
            execution_time,
            error: Some(error),
        }
    }

    /// Check if the transaction was successful
    pub fn is_success(&self) -> bool {
        self.confirmed && self.error.is_none()
    }

    /// Check if the transaction failed
    pub fn is_failure(&self) -> bool {
        !self.is_success()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_type() {
        assert_eq!(NetworkType::Devnet.as_str(), "devnet");
        assert_eq!(NetworkType::Mainnet.as_str(), "mainnet");
        assert_ne!(NetworkType::Devnet.default_rpc_endpoint(), "");
        assert_ne!(NetworkType::Mainnet.default_rpc_endpoint(), "");
    }

    #[test]
    fn test_config_creation() {
        let config = PodAIConfig::devnet();
        assert_eq!(config.network, NetworkType::Devnet);
        assert!(config.validate().is_ok());

        let config = PodAIConfig::mainnet();
        assert_eq!(config.network, NetworkType::Mainnet);
        assert!(config.validate().is_ok());

        let config = PodAIConfig::custom("https://api.custom.solana.com".to_string());
        assert_eq!(config.network, NetworkType::Custom);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation() {
        // Valid config
        let config = PodAIConfig::devnet();
        assert!(config.validate().is_ok());

        // Invalid: empty endpoint
        let mut config = PodAIConfig::devnet();
        config.rpc_endpoint = String::new();
        assert!(config.validate().is_err());

        // Invalid: custom network without endpoint
        let mut config = PodAIConfig::custom("".to_string());
        config.rpc_endpoint = String::new();
        assert!(config.validate().is_err());

        // Invalid: zero timeout
        let mut config = PodAIConfig::devnet();
        config.timeout = Duration::from_secs(0);
        assert!(config.validate().is_err());

        // Invalid: too many retries
        let mut config = PodAIConfig::devnet();
        config.max_retries = 20;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_builder_pattern() {
        let config = PodAIConfig::devnet()
            .with_timeout(Duration::from_secs(60))
            .with_max_retries(5)
            .with_compression(false);

        assert_eq!(config.timeout, Duration::from_secs(60));
        assert_eq!(config.max_retries, 5);
        assert!(!config.enable_compression);
    }

    #[test]
    fn test_transaction_result() {
        let signature = Signature::default();
        let execution_time = Duration::from_millis(500);

        let success = TransactionResult::success(signature, 12345, execution_time);
        assert!(success.is_success());
        assert!(!success.is_failure());
        assert!(success.error.is_none());

        let failure = TransactionResult::failure(
            signature, 
            12345, 
            execution_time, 
            "Transaction failed".to_string()
        );
        assert!(!failure.is_success());
        assert!(failure.is_failure());
        assert!(failure.error.is_some());
    }
} 