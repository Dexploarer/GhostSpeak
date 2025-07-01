//! Main client module for the podAI SDK

use crate::errors::{PodAIError, PodAIResult};
use crate::services::{AgentService, ChannelService, EscrowService, MarketplaceService, MessageService};
use crate::PROGRAM_ID;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentLevel,
    hash::Hash,
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use url::Url;

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
    /// RPC URL for Solana connection
    pub rpc_url: String,
    /// WebSocket URL for subscription support
    pub ws_url: String,
    /// Commitment level for transactions
    pub commitment: CommitmentLevel,
    /// Request timeout in milliseconds
    pub timeout_ms: u64,
    /// Maximum number of retries for failed requests
    pub max_retries: u32,
    /// Delay between retries in milliseconds
    pub retry_delay_ms: u64,
    /// Program ID for the podAI protocol
    pub program_id: Pubkey,
}

impl Default for PodAIConfig {
    fn default() -> Self {
        Self::localnet()
    }
}

impl PodAIConfig {
    /// Create configuration for localnet
    pub fn localnet() -> Self {
        Self {
            rpc_url: "http://127.0.0.1:8899".to_string(),
            ws_url: "ws://127.0.0.1:8900".to_string(),
            commitment: CommitmentLevel::Confirmed,
            timeout_ms: 30_000,
            max_retries: 3,
            retry_delay_ms: 1000,
            program_id: PROGRAM_ID,
        }
    }

    /// Create configuration for devnet
    pub fn devnet() -> Self {
        Self {
            rpc_url: "https://api.devnet.solana.com".to_string(),
            ws_url: "wss://api.devnet.solana.com".to_string(),
            commitment: CommitmentLevel::Confirmed,
            timeout_ms: 30_000,
            max_retries: 5,
            retry_delay_ms: 2000,
            program_id: PROGRAM_ID,
        }
    }

    /// Create configuration for mainnet-beta
    pub fn mainnet() -> Self {
        Self {
            rpc_url: "https://api.mainnet-beta.solana.com".to_string(),
            ws_url: "wss://api.mainnet-beta.solana.com".to_string(),
            commitment: CommitmentLevel::Finalized,
            timeout_ms: 60_000,
            max_retries: 5,
            retry_delay_ms: 3000,
            program_id: PROGRAM_ID,
        }
    }

    /// Create configuration from environment variables
    pub fn from_env() -> Self {
        let rpc_url = std::env::var("SOLANA_RPC_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8899".to_string());
        let ws_url = std::env::var("SOLANA_WS_URL")
            .unwrap_or_else(|_| "ws://127.0.0.1:8900".to_string());

        Self {
            rpc_url,
            ws_url,
            commitment: CommitmentLevel::Confirmed,
            timeout_ms: 30_000,
            max_retries: 3,
            retry_delay_ms: 1000,
            program_id: PROGRAM_ID,
        }
    }

    /// Validate the configuration
    pub fn validate(&self) -> PodAIResult<()> {
        // Validate RPC URL
        Url::parse(&self.rpc_url)
            .map_err(|_| PodAIError::invalid_input("rpc_url", "Invalid RPC URL format"))?;

        // Validate WS URL
        Url::parse(&self.ws_url)
            .map_err(|_| PodAIError::invalid_input("ws_url", "Invalid WebSocket URL format"))?;

        // Validate timeout
        if self.timeout_ms == 0 {
            return Err(PodAIError::invalid_input("timeout_ms", "Timeout must be greater than 0"));
        }

        Ok(())
    }

    /// Create configuration with custom program ID
    pub fn with_program_id(mut self, program_id: Pubkey) -> Self {
        self.program_id = program_id;
        self
    }

    /// Create configuration with custom timeout
    pub fn with_timeout(mut self, timeout_ms: u64) -> Self {
        self.timeout_ms = timeout_ms;
        self
    }

    /// Create configuration with custom retry settings
    pub fn with_retry_config(mut self, max_retries: u32, retry_delay_ms: u64) -> Self {
        self.max_retries = max_retries;
        self.retry_delay_ms = retry_delay_ms;
        self
    }
}

/// Client connection information
#[derive(Debug, Clone)]
pub struct ClientInfo {
    /// RPC endpoint URL
    pub rpc_url: String,
    /// WebSocket URL for subscriptions
    pub ws_url: String,
    /// Current commitment level
    pub commitment: CommitmentLevel,
    /// Connection status
    pub is_connected: bool,
    /// Last successful connection time
    pub last_connected: Option<DateTime<Utc>>,
    /// Number of active connections
    pub active_connections: u32,
}

/// Main client for interacting with the podAI protocol
pub struct PodAIClient {
    /// Configuration for the client
    pub config: PodAIConfig,
    /// Solana RPC client
    pub rpc_client: RpcClient,
    /// HTTP client for additional requests
    http_client: reqwest::Client,
    /// Connection info
    connection_info: Arc<std::sync::Mutex<ClientInfo>>,
}

impl PodAIClient {
    /// Create a new PodAI client
    pub async fn new(config: PodAIConfig) -> PodAIResult<Self> {
        // Validate configuration
        config.validate()?;

        // Create RPC client
        let rpc_client = RpcClient::new(config.rpc_url.clone());

        // Create HTTP client with timeout
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| PodAIError::internal(&format!("Failed to create HTTP client: {}", e)))?;

        // Initialize connection info
        let connection_info = Arc::new(std::sync::Mutex::new(ClientInfo {
            rpc_url: config.rpc_url.clone(),
            ws_url: config.ws_url.clone(),
            commitment: config.commitment,
            is_connected: false,
            last_connected: None,
            active_connections: 0,
        }));

        let client = Self {
            config,
            rpc_client,
            http_client,
            connection_info,
        };

        // Test connection
        client.test_connection().await?;

        Ok(client)
    }

    /// Test the connection to Solana
    pub async fn test_connection(&self) -> PodAIResult<()> {
        match self.rpc_client.get_health().await {
            Ok(_) => {
                // Update connection info
                if let Ok(mut info) = self.connection_info.lock() {
                    info.is_connected = true;
                    info.last_connected = Some(Utc::now());
                }
                Ok(())
            }
            Err(e) => Err(PodAIError::connection(&format!("Connection test failed: {}", e))),
        }
    }

    /// Get the program ID
    pub fn program_id(&self) -> Pubkey {
        self.config.program_id
    }

    /// Get account information
    pub async fn get_account(&self, address: &Pubkey) -> PodAIResult<Option<solana_sdk::account::Account>> {
        match self.rpc_client.get_account(address).await {
            Ok(account) => Ok(Some(account)),
            Err(_) => Ok(None),
        }
    }

    /// Check if an account exists
    pub async fn account_exists(&self, address: &Pubkey) -> PodAIResult<bool> {
        Ok(self.get_account(address).await?.is_some())
    }

    /// Get account balance
    pub async fn get_balance(&self, address: &Pubkey) -> PodAIResult<u64> {
        self.rpc_client
            .get_balance(address)
            .await
            .map_err(|e| PodAIError::rpc(&format!("Failed to get balance: {}", e)))
    }

    /// Get recent blockhash
    pub async fn get_recent_blockhash(&self) -> PodAIResult<Hash> {
        self.rpc_client
            .get_latest_blockhash()
            .await
            .map_err(|e| PodAIError::rpc(&format!("Failed to get recent blockhash: {}", e)))
    }

    /// Send transaction
    pub async fn send_transaction(&self, transaction: &Transaction) -> PodAIResult<Signature> {
        self.rpc_client
            .send_and_confirm_transaction(transaction)
            .await
            .map_err(|e| PodAIError::transaction(&format!("Failed to send transaction: {}", e)))
    }

    /// Get connection info
    pub fn connection_info(&self) -> ClientInfo {
        self.connection_info.lock().unwrap().clone()
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
                        log::error!("All retry attempts exhausted after {} tries", attempt + 1);
                        return Err(e);
                    }
                    
                    log::debug!("Attempt {} failed: {}, retrying in {}ms", attempt + 1, e, delay);
                    time::sleep(Duration::from_millis(delay)).await;
                    delay = (delay * 2).min(30_000); // Cap at 30 seconds
                }
            }
        }
        
        // This should never be reached due to the logic above, but if it somehow is,
        // we'll return the last error by calling f() one more time
        f()
    }

    /// Get multiple accounts efficiently
    pub async fn get_multiple_accounts(&self, addresses: &[Pubkey]) -> PodAIResult<Vec<Option<solana_sdk::account::Account>>> {
        if addresses.is_empty() {
            return Ok(Vec::new());
        }

        self.rpc_client
            .get_multiple_accounts(addresses)
            .await
            .map_err(|e| PodAIError::rpc(&format!("Failed to get multiple accounts: {}", e)))
    }

    /// Get program accounts
    pub async fn get_program_accounts(&self, program_id: &Pubkey) -> PodAIResult<Vec<(Pubkey, solana_sdk::account::Account)>> {
        self.rpc_client
            .get_program_accounts(program_id)
            .await
            .map_err(|e| PodAIError::rpc(&format!("Failed to get program accounts: {}", e)))
    }

    /// Get transaction status
    pub async fn get_transaction(&self, signature: &Signature) -> PodAIResult<Option<solana_client::rpc_response::Response<Option<solana_transaction_status::UiTransactionEncoding>>>> {
        // This is a simplified implementation - in a real implementation you'd use proper transaction status
        Ok(None)
    }

    /// Subscribe to account changes (placeholder for WebSocket functionality)
    pub async fn subscribe_to_account(&self, _account: &Pubkey) -> PodAIResult<()> {
        // WebSocket subscription would be implemented here
        log::warn!("Account subscription not yet implemented");
        Ok(())
    }

    /// Close the client and cleanup resources
    pub async fn close(&self) -> PodAIResult<()> {
        if let Ok(mut info) = self.connection_info.lock() {
            info.is_connected = false;
            info.active_connections = 0;
        }
        log::info!("PodAI client closed");
        Ok(())
    }

    /// Get the network type
    pub fn network(&self) -> NetworkType {
        match self.config.commitment {
            CommitmentLevel::Confirmed => NetworkType::Devnet,
            CommitmentLevel::Finalized => NetworkType::Mainnet,
            CommitmentLevel::Processed => NetworkType::Localnet,
        }
    }

    /// Get the RPC endpoint
    pub fn rpc_endpoint(&self) -> &str {
        &self.config.rpc_url
    }

    /// Get client age
    pub fn age(&self) -> chrono::Duration {
        Utc::now() - self.connection_info.lock().unwrap().last_connected.unwrap_or_default()
    }

    /// Check if compression is enabled
    pub fn compression_enabled(&self) -> bool {
        self.config.commitment == CommitmentLevel::Confirmed
    }

    /// Get the current slot
    pub async fn get_current_slot(&self) -> PodAIResult<u64> {
        self.rpc_client
            .get_slot()
            .map_err(Into::into)
    }

    /// Get minimum balance for rent exemption
    pub async fn get_minimum_balance_for_rent_exemption(&self, data_len: usize) -> PodAIResult<u64> {
        self.rpc_client
            .get_minimum_balance_for_rent_exemption(data_len)
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
        let rpc_client = RpcClient::new(self.config.rpc_url.clone());

        Self {
            rpc_client,
            config: self.config.clone(),
            http_client: self.http_client.clone(),
            connection_info: self.connection_info.clone(),
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
        assert_eq!(config.network(), NetworkType::Devnet);
        assert!(config.validate().is_ok());

        let config = PodAIConfig::mainnet();
        assert_eq!(config.network(), NetworkType::Mainnet);
        assert!(config.validate().is_ok());

        let config = PodAIConfig::from_env();
        assert_eq!(config.network(), NetworkType::Localnet);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation() {
        // Valid config
        let config = PodAIConfig::devnet();
        assert!(config.validate().is_ok());

        // Invalid: empty endpoint
        let mut config = PodAIConfig::devnet();
        config.rpc_url = String::new();
        assert!(config.validate().is_err());

        // Invalid: invalid URL
        let mut config = PodAIConfig::devnet();
        config.rpc_url = "http://invalid.url".to_string();
        assert!(config.validate().is_err());

        // Invalid: zero timeout
        let mut config = PodAIConfig::devnet();
        config.timeout_ms = 0;
        assert!(config.validate().is_err());

        // Invalid: too many retries
        let mut config = PodAIConfig::devnet();
        config.max_retries = 20;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_builder_pattern() {
        let config = PodAIConfig::devnet()
            .with_timeout(60_000)
            .with_retry_config(5, 3000);

        assert_eq!(config.timeout_ms, 60_000);
        assert_eq!(config.max_retries, 5);
        assert_eq!(config.retry_delay_ms, 3000);
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