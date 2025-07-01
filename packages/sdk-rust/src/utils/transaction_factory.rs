//! Transaction factory system inspired by web3.js v2 patterns
//! 
//! Provides factory functions for building and managing transactions with
//! modern Solana development patterns including priority fees, simulation,
//! and intelligent retry logic.

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    compute_budget::ComputeBudgetInstruction,
    hash::Hash,
    instruction::Instruction,
    message::Message,
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    signers::Signers,
    transaction::{Transaction, VersionedTransaction},
};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

/// Priority fee strategy for transaction building
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PriorityFeeStrategy {
    /// No priority fee (rely on base fee)
    None,
    /// Fixed priority fee in micro-lamports per compute unit
    Fixed { micro_lamports_per_cu: u64 },
    /// Dynamic priority fee based on network conditions
    Dynamic { percentile: u8 },
    /// Use Helius priority fee API
    Helius { priority_level: String },
    /// Custom fee calculation function
    Custom { base_fee: u64, multiplier: f64 },
}

impl Default for PriorityFeeStrategy {
    fn default() -> Self {
        Self::Dynamic { percentile: 75 }
    }
}

/// Retry policy for failed transactions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RetryPolicy {
    /// No retries
    None,
    /// Fixed number of retries with constant delay
    Fixed { max_attempts: u32, delay_ms: u64 },
    /// Exponential backoff retries
    Exponential { max_attempts: u32, base_delay_ms: u64 },
    /// Custom retry logic
    Custom { max_attempts: u32, delays_ms: Vec<u64> },
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self::Exponential {
            max_attempts: 3,
            base_delay_ms: 1000,
        }
    }
}

/// Transaction building configuration
#[derive(Debug, Clone)]
pub struct TransactionConfig {
    /// Priority fee strategy
    pub priority_fee_strategy: PriorityFeeStrategy,
    /// Retry policy for failures
    pub retry_policy: RetryPolicy,
    /// Whether to simulate transaction before sending
    pub simulate_before_send: bool,
    /// Whether to skip preflight checks
    pub skip_preflight: bool,
    /// Commitment level for confirmation
    pub commitment: CommitmentConfig,
    /// Maximum compute units (0 = auto-calculate)
    pub max_compute_units: u32,
    /// Timeout for transaction confirmation
    pub confirmation_timeout: Duration,
    /// Whether to use versioned transactions
    pub use_versioned_transactions: bool,
}

impl Default for TransactionConfig {
    fn default() -> Self {
        Self {
            priority_fee_strategy: PriorityFeeStrategy::default(),
            retry_policy: RetryPolicy::default(),
            simulate_before_send: true,
            skip_preflight: false,
            commitment: CommitmentConfig::confirmed(),
            max_compute_units: 0, // Auto-calculate
            confirmation_timeout: Duration::from_secs(60),
            use_versioned_transactions: true,
        }
    }
}

impl TransactionConfig {
    /// Create fast execution configuration (lower retries, shorter timeout)
    pub fn fast() -> Self {
        Self {
            priority_fee_strategy: PriorityFeeStrategy::Fixed { micro_lamports_per_cu: 1000 },
            retry_policy: RetryPolicy::Fixed { max_attempts: 1, delay_ms: 500 },
            simulate_before_send: false,
            skip_preflight: true,
            commitment: CommitmentConfig::processed(),
            max_compute_units: 200_000,
            confirmation_timeout: Duration::from_secs(30),
            use_versioned_transactions: true,
        }
    }

    /// Create reliable execution configuration (more retries, longer timeout)
    pub fn reliable() -> Self {
        Self {
            priority_fee_strategy: PriorityFeeStrategy::Dynamic { percentile: 90 },
            retry_policy: RetryPolicy::Exponential { max_attempts: 5, base_delay_ms: 2000 },
            simulate_before_send: true,
            skip_preflight: false,
            commitment: CommitmentConfig::finalized(),
            max_compute_units: 0, // Auto-calculate
            confirmation_timeout: Duration::from_secs(120),
            use_versioned_transactions: true,
        }
    }

    /// Set priority fee strategy
    pub fn with_priority_fee_strategy(mut self, strategy: PriorityFeeStrategy) -> Self {
        self.priority_fee_strategy = strategy;
        self
    }

    /// Set retry policy
    pub fn with_retry_policy(mut self, policy: RetryPolicy) -> Self {
        self.retry_policy = policy;
        self
    }

    /// Enable/disable simulation
    pub fn with_simulation(mut self, simulate: bool) -> Self {
        self.simulate_before_send = simulate;
        self
    }

    /// Set commitment level
    pub fn with_commitment(mut self, commitment: CommitmentConfig) -> Self {
        self.commitment = commitment;
        self
    }

    /// Set maximum compute units
    pub fn with_max_compute_units(mut self, units: u32) -> Self {
        self.max_compute_units = units;
        self
    }
}

/// Transaction factory for building and sending transactions
#[derive(Debug)]
pub struct TransactionFactory {
    /// Reference to the RPC client
    rpc_client: Arc<RpcClient>,
    /// Transaction configuration
    config: TransactionConfig,
    /// Program ID
    program_id: Pubkey,
}

impl TransactionFactory {
    /// Create a new transaction factory
    pub fn new(client: &PodAIClient) -> Self {
        Self {
            rpc_client: Arc::new(client.rpc_client.clone()),
            config: TransactionConfig::default(),
            program_id: client.program_id(),
        }
    }

    /// Create factory with custom configuration
    pub fn with_config(client: &PodAIClient, config: TransactionConfig) -> Self {
        Self {
            rpc_client: Arc::new(client.rpc_client.clone()),
            config,
            program_id: client.program_id(),
        }
    }

    /// Get the current configuration
    pub fn config(&self) -> &TransactionConfig {
        &self.config
    }

    /// Update the configuration
    pub fn set_config(&mut self, config: TransactionConfig) {
        self.config = config;
    }

    /// Estimate priority fee for a transaction
    pub async fn estimate_priority_fee(&self, transaction: &Transaction) -> PodAIResult<u64> {
        match &self.config.priority_fee_strategy {
            PriorityFeeStrategy::None => Ok(0),
            PriorityFeeStrategy::Fixed { micro_lamports_per_cu } => Ok(*micro_lamports_per_cu),
            PriorityFeeStrategy::Dynamic { percentile } => {
                self.estimate_dynamic_priority_fee(*percentile).await
            }
            PriorityFeeStrategy::Helius { priority_level } => {
                self.estimate_helius_priority_fee(transaction, priority_level).await
            }
            PriorityFeeStrategy::Custom { base_fee, multiplier } => {
                Ok((*base_fee as f64 * multiplier) as u64)
            }
        }
    }

    /// Estimate dynamic priority fee based on network conditions
    async fn estimate_dynamic_priority_fee(&self, percentile: u8) -> PodAIResult<u64> {
        // Get recent prioritization fees
        let recent_fees = self.rpc_client
            .get_recent_prioritization_fees(&[])
            .map_err(PodAIError::from)?;

        if recent_fees.is_empty() {
            return Ok(0);
        }

        // Calculate percentile
        let mut fees: Vec<u64> = recent_fees.iter().map(|f| f.prioritization_fee).collect();
        fees.sort_unstable();
        
        let index = ((fees.len() as f64 * percentile as f64 / 100.0) as usize)
            .min(fees.len().saturating_sub(1));
        
        Ok(fees.get(index).copied().unwrap_or(0))
    }

    /// Estimate priority fee using Helius API
    async fn estimate_helius_priority_fee(
        &self,
        transaction: &Transaction,
        priority_level: &str,
    ) -> PodAIResult<u64> {
        // Serialize transaction to base64
        let serialized = bincode::serialize(transaction)
            .map_err(|e| PodAIError::internal(format!("Failed to serialize transaction: {}", e)))?;
        let base64_tx = base64::encode(serialized);

        // Prepare request payload
        let payload = serde_json::json!({
            "jsonrpc": "2.0",
            "id": "helius-priority-fee",
            "method": "getPriorityFeeEstimate",
            "params": [{
                "transaction": base64_tx,
                "options": {
                    "transactionEncoding": "base64",
                    "priorityLevel": priority_level
                }
            }]
        });

        // Make HTTP request to Helius API
        let client = reqwest::Client::new();
        let response = client
            .post(&self.rpc_client.url())
            .json(&payload)
            .send()
            .await
            .map_err(|e| PodAIError::network(format!("Helius API request failed: {}", e)))?;

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PodAIError::network(format!("Failed to parse Helius response: {}", e)))?;

        // Extract priority fee estimate
        result
            .get("result")
            .and_then(|r| r.get("priorityFeeEstimate"))
            .and_then(|f| f.as_u64())
            .ok_or_else(|| PodAIError::network("Invalid Helius API response".to_string()))
    }

    /// Estimate compute units for a transaction
    pub async fn estimate_compute_units(&self, transaction: &Transaction) -> PodAIResult<u32> {
        // Simulate the transaction to get compute unit usage
        let simulation = self.rpc_client
            .simulate_transaction(transaction)
            .map_err(PodAIError::from)?;

        // Extract compute units from simulation
        if let Some(units) = simulation.value.units_consumed {
            // Add 10% buffer
            Ok((units as f64 * 1.1) as u32)
        } else {
            // Fallback to reasonable default
            Ok(200_000)
        }
    }

    /// Build a transaction with priority fees and compute budget
    pub async fn build_transaction(
        &self,
        instructions: Vec<Instruction>,
        payer: &Pubkey,
        signers: &[&dyn Signer],
    ) -> PodAIResult<Transaction> {
        // Get recent blockhash
        let recent_blockhash = self.rpc_client
            .get_recent_blockhash()
            .map(|(hash, _)| hash)
            .map_err(PodAIError::from)?;

        // Create initial transaction for estimation
        let mut transaction = Transaction::new_with_payer(&instructions, Some(payer));
        transaction.sign(signers, recent_blockhash);

        // Estimate priority fee and compute units
        let priority_fee = self.estimate_priority_fee(&transaction).await?;
        let compute_units = if self.config.max_compute_units > 0 {
            self.config.max_compute_units
        } else {
            self.estimate_compute_units(&transaction).await?
        };

        // Build final instructions with compute budget
        let mut final_instructions = Vec::new();

        // Add compute unit limit instruction
        if compute_units > 0 {
            final_instructions.push(
                ComputeBudgetInstruction::set_compute_unit_limit(compute_units)
            );
        }

        // Add priority fee instruction
        if priority_fee > 0 {
            final_instructions.push(
                ComputeBudgetInstruction::set_compute_unit_price(priority_fee)
            );
        }

        // Add original instructions
        final_instructions.extend(instructions);

        // Create final transaction
        let mut final_transaction = Transaction::new_with_payer(&final_instructions, Some(payer));
        final_transaction.sign(signers, recent_blockhash);

        Ok(final_transaction)
    }

    /// Send a transaction with retry logic
    pub async fn send_transaction(
        &self,
        transaction: &Transaction,
    ) -> PodAIResult<TransactionResult> {
        let start_time = Instant::now();
        let mut last_error = None;

        // Simulate transaction if configured
        if self.config.simulate_before_send {
            let simulation = self.rpc_client
                .simulate_transaction(transaction)
                .map_err(PodAIError::from)?;

            if let Some(err) = simulation.value.err {
                return Err(PodAIError::transaction_simulation_failed(
                    simulation.value.logs.unwrap_or_default()
                ));
            }
        }

        let max_attempts = match &self.config.retry_policy {
            RetryPolicy::None => 1,
            RetryPolicy::Fixed { max_attempts, .. } => *max_attempts,
            RetryPolicy::Exponential { max_attempts, .. } => *max_attempts,
            RetryPolicy::Custom { max_attempts, .. } => *max_attempts,
        };

        for attempt in 0..max_attempts {
            match self.send_transaction_attempt(transaction).await {
                Ok(signature) => {
                    return Ok(TransactionResult {
                        signature,
                        confirmed: true,
                        execution_time: start_time.elapsed(),
                        retry_attempts: attempt,
                        logs: None,
                        error: None,
                        timestamp: Utc::now(),
                    });
                }
                Err(e) => {
                    last_error = Some(e);
                    
                    // Don't retry on the last attempt
                    if attempt < max_attempts - 1 {
                        let delay = self.calculate_retry_delay(attempt);
                        sleep(Duration::from_millis(delay)).await;
                    }
                }
            }
        }

        // All attempts failed
        Err(last_error.unwrap_or_else(|| PodAIError::internal("Unknown transaction error".to_string())))
    }

    /// Send a single transaction attempt
    async fn send_transaction_attempt(&self, transaction: &Transaction) -> PodAIResult<Signature> {
        if self.config.skip_preflight {
            self.rpc_client
                .send_transaction_with_config(
                    transaction,
                    solana_client::rpc_config::RpcSendTransactionConfig {
                        skip_preflight: true,
                        ..Default::default()
                    },
                )
                .map_err(PodAIError::from)
        } else {
            self.rpc_client
                .send_and_confirm_transaction_with_spinner_and_config(
                    transaction,
                    self.config.commitment,
                    solana_client::rpc_config::RpcSendTransactionConfig::default(),
                )
                .map_err(PodAIError::from)
        }
    }

    /// Calculate delay for retry attempt
    fn calculate_retry_delay(&self, attempt: u32) -> u64 {
        match &self.config.retry_policy {
            RetryPolicy::Fixed { delay_ms, .. } => *delay_ms,
            RetryPolicy::Exponential { base_delay_ms, .. } => {
                *base_delay_ms * 2_u64.pow(attempt)
            }
            RetryPolicy::Custom { delays_ms, .. } => {
                delays_ms.get(attempt as usize).copied().unwrap_or(1000)
            }
            RetryPolicy::None => 0,
        }
    }
}

/// Result of a transaction operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    /// Transaction signature
    pub signature: Signature,
    /// Whether transaction was confirmed
    pub confirmed: bool,
    /// Execution time
    pub execution_time: Duration,
    /// Number of retry attempts made
    pub retry_attempts: u32,
    /// Transaction logs (if available)
    pub logs: Option<Vec<String>>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Transaction timestamp
    pub timestamp: DateTime<Utc>,
}

impl TransactionResult {
    /// Check if transaction was successful
    pub fn is_success(&self) -> bool {
        self.confirmed && self.error.is_none()
    }

    /// Check if transaction failed
    pub fn is_failure(&self) -> bool {
        !self.is_success()
    }

    /// Get execution time in milliseconds
    pub fn execution_time_ms(&self) -> u64 {
        self.execution_time.as_millis() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_config_defaults() {
        let config = TransactionConfig::default();
        assert!(matches!(config.priority_fee_strategy, PriorityFeeStrategy::Dynamic { percentile: 75 }));
        assert!(config.simulate_before_send);
        assert!(!config.skip_preflight);
    }

    #[test]
    fn test_fast_config() {
        let config = TransactionConfig::fast();
        assert!(matches!(config.retry_policy, RetryPolicy::Fixed { max_attempts: 1, .. }));
        assert!(!config.simulate_before_send);
        assert!(config.skip_preflight);
    }

    #[test]
    fn test_reliable_config() {
        let config = TransactionConfig::reliable();
        assert!(matches!(config.retry_policy, RetryPolicy::Exponential { max_attempts: 5, .. }));
        assert!(config.simulate_before_send);
        assert!(!config.skip_preflight);
    }
} 