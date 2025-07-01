use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    compute_budget::ComputeBudgetInstruction,
    hash::Hash,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
    transaction::Transaction,
};
use tokio::time::{sleep, Instant};
use tracing::{debug, info, instrument, warn};

use crate::{
    client::PodAIClient,
    errors::{PodAIError, PodAIResult},
    utils::send_transaction,
};

/// Priority fee estimation strategies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PriorityFeeStrategy {
    /// Use fixed priority fee in micro-lamports per compute unit
    Fixed(u64),
    /// Auto-calculate based on recent network activity
    Auto,
    /// Use Helius API for intelligent fee estimation
    Helius,
    /// Use percentile-based estimation from recent transactions
    Percentile(u8), // 50th, 75th, 90th, etc.
    /// No priority fee
    None,
}

impl Default for PriorityFeeStrategy {
    fn default() -> Self {
        Self::Auto
    }
}

/// Retry policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RetryPolicy {
    /// No retries
    None,
    /// Fixed number of retries with constant delay
    Fixed { 
        max_attempts: u32, 
        delay_ms: u64 
    },
    /// Exponential backoff with jitter
    Exponential { 
        max_attempts: u32,
        base_delay_ms: u64,
        max_delay_ms: u64,
        jitter: bool,
    },
    /// Custom retry logic
    Custom(Box<dyn RetryLogic + Send + Sync>),
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self::Exponential {
            max_attempts: 3,
            base_delay_ms: 1000,
            max_delay_ms: 10000,
            jitter: true,
        }
    }
}

/// Trait for custom retry logic
#[async_trait]
pub trait RetryLogic {
    async fn should_retry(&self, attempt: u32, error: &PodAIError) -> bool;
    async fn delay_for_attempt(&self, attempt: u32) -> Duration;
}

/// Transaction simulation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationConfig {
    pub enabled: bool,
    pub replace_recent_blockhash: bool,
    pub commitment: solana_sdk::commitment_config::CommitmentConfig,
    pub accounts: Option<Vec<Pubkey>>, // Additional accounts to include in simulation
}

impl Default for SimulationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            replace_recent_blockhash: true,
            commitment: solana_sdk::commitment_config::CommitmentConfig::confirmed(),
            accounts: None,
        }
    }
}

/// Configuration for transaction factory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFactoryConfig {
    pub priority_fee_strategy: PriorityFeeStrategy,
    pub retry_policy: RetryPolicy,
    pub simulation: SimulationConfig,
    pub compute_unit_limit: Option<u32>,
    pub timeout_ms: u64,
}

impl Default for TransactionFactoryConfig {
    fn default() -> Self {
        Self {
            priority_fee_strategy: PriorityFeeStrategy::Auto,
            retry_policy: RetryPolicy::default(),
            simulation: SimulationConfig::default(),
            compute_unit_limit: Some(200_000), // Conservative default
            timeout_ms: 30_000, // 30 seconds
        }
    }
}

/// Result of transaction execution
#[derive(Debug, Clone)]
pub struct TransactionResult {
    pub signature: Signature,
    pub slot: u64,
    pub block_time: Option<i64>,
    pub compute_units_consumed: Option<u64>,
    pub fee_paid: u64,
    pub attempts: u32,
}

/// Builder for creating transactions with advanced configuration
pub struct TransactionFactory {
    client: Arc<PodAIClient>,
    config: TransactionFactoryConfig,
}

impl TransactionFactory {
    /// Create a new transaction factory with default configuration
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            config: TransactionFactoryConfig::default(),
        }
    }

    /// Create with custom configuration
    pub fn with_config(client: Arc<PodAIClient>, config: TransactionFactoryConfig) -> Self {
        Self { client, config }
    }

    /// Set priority fee strategy
    pub fn with_priority_fee_strategy(mut self, strategy: PriorityFeeStrategy) -> Self {
        self.config.priority_fee_strategy = strategy;
        self
    }

    /// Set retry policy
    pub fn with_retry_policy(mut self, policy: RetryPolicy) -> Self {
        self.config.retry_policy = policy;
        self
    }

    /// Enable/disable transaction simulation
    pub fn with_simulation(mut self, enabled: bool) -> Self {
        self.config.simulation.enabled = enabled;
        self
    }

    /// Set compute unit limit
    pub fn with_compute_unit_limit(mut self, limit: u32) -> Self {
        self.config.compute_unit_limit = Some(limit);
        self
    }

    /// Build and execute a transaction
    #[instrument(skip(self, instructions, signers), fields(num_instructions = instructions.len()))]
    pub async fn execute_transaction(
        &self,
        instructions: Vec<Instruction>,
        signers: &[&Keypair],
        payer: Option<&Pubkey>,
    ) -> PodAIResult<TransactionResult> {
        info!("Building transaction with {} instructions", instructions.len());

        let start_time = Instant::now();
        let mut attempt = 1;

        loop {
            match self.try_execute_transaction(&instructions, signers, payer).await {
                Ok(result) => {
                    info!(
                        "Transaction successful after {} attempts in {}ms", 
                        attempt, 
                        start_time.elapsed().as_millis()
                    );
                    return Ok(TransactionResult {
                        attempts: attempt,
                        ..result
                    });
                }
                Err(error) => {
                    if !self.should_retry(attempt, &error).await {
                        warn!("Transaction failed after {} attempts: {}", attempt, error);
                        return Err(error);
                    }

                    let delay = self.calculate_retry_delay(attempt).await;
                    debug!("Retrying transaction in {}ms (attempt {})", delay.as_millis(), attempt + 1);
                    
                    sleep(delay).await;
                    attempt += 1;
                }
            }
        }
    }

    /// Single attempt to execute transaction
    async fn try_execute_transaction(
        &self,
        instructions: &[Instruction],
        signers: &[&Keypair],
        payer: Option<&Pubkey>,
    ) -> PodAIResult<TransactionResult> {
        // Build the transaction
        let mut transaction = self.build_transaction(instructions, signers, payer).await?;

        // Add priority fee if configured
        if let Some(priority_fee) = self.estimate_priority_fee().await? {
            let compute_price_ix = ComputeBudgetInstruction::set_compute_unit_price(priority_fee);
            transaction.message.instructions.insert(0, compute_price_ix);
        }

        // Add compute unit limit if configured
        if let Some(compute_limit) = self.config.compute_unit_limit {
            let compute_limit_ix = ComputeBudgetInstruction::set_compute_unit_limit(compute_limit);
            transaction.message.instructions.insert(0, compute_limit_ix);
        }

        // Simulate transaction if enabled
        if self.config.simulation.enabled {
            self.simulate_transaction(&transaction).await?;
        }

        // Send and confirm the transaction
        let signature = send_transaction(&self.client, &transaction).await?;
        
        // Get transaction details
        let transaction_details = self.client
            .get_transaction(&signature, solana_sdk::commitment_config::UiTransactionEncoding::Json)
            .await?;

        Ok(TransactionResult {
            signature,
            slot: transaction_details.slot,
            block_time: transaction_details.block_time,
            compute_units_consumed: transaction_details.meta
                .and_then(|meta| meta.compute_units_consumed),
            fee_paid: transaction_details.meta
                .map(|meta| meta.fee)
                .unwrap_or(0),
            attempts: 0, // Will be set by caller
        })
    }

    /// Build a transaction from instructions
    async fn build_transaction(
        &self,
        instructions: &[Instruction],
        signers: &[&Keypair],
        payer: Option<&Pubkey>,
    ) -> PodAIResult<Transaction> {
        let payer_pubkey = payer
            .copied()
            .or_else(|| signers.first().map(|s| s.pubkey()))
            .ok_or(PodAIError::MissingPayer)?;

        let recent_blockhash = self.client.get_latest_blockhash().await?;

        let mut transaction = Transaction::new_with_payer(instructions, Some(&payer_pubkey));
        transaction.sign(signers, recent_blockhash);

        Ok(transaction)
    }

    /// Estimate priority fee based on strategy
    async fn estimate_priority_fee(&self) -> PodAIResult<Option<u64>> {
        match &self.config.priority_fee_strategy {
            PriorityFeeStrategy::None => Ok(None),
            PriorityFeeStrategy::Fixed(fee) => Ok(Some(*fee)),
            PriorityFeeStrategy::Auto => self.estimate_auto_priority_fee().await,
            PriorityFeeStrategy::Helius => self.estimate_helius_priority_fee().await,
            PriorityFeeStrategy::Percentile(percentile) => {
                self.estimate_percentile_priority_fee(*percentile).await
            }
        }
    }

    /// Auto-estimate priority fee from recent blocks
    async fn estimate_auto_priority_fee(&self) -> PodAIResult<Option<u64>> {
        // Implementation would analyze recent blocks and compute a reasonable fee
        // For now, return a conservative default
        Ok(Some(1000)) // 1000 micro-lamports per CU
    }

    /// Estimate priority fee using Helius API
    async fn estimate_helius_priority_fee(&self) -> PodAIResult<Option<u64>> {
        // Implementation would call Helius priority fee API
        // This requires the client to be configured with Helius endpoint
        warn!("Helius priority fee estimation not yet implemented, falling back to auto");
        self.estimate_auto_priority_fee().await
    }

    /// Estimate priority fee using percentile analysis
    async fn estimate_percentile_priority_fee(&self, _percentile: u8) -> PodAIResult<Option<u64>> {
        // Implementation would analyze recent transactions and use percentile-based estimation
        warn!("Percentile priority fee estimation not yet implemented, falling back to auto");
        self.estimate_auto_priority_fee().await
    }

    /// Simulate transaction execution
    async fn simulate_transaction(&self, transaction: &Transaction) -> PodAIResult<()> {
        debug!("Simulating transaction");

        let simulation_result = self.client
            .simulate_transaction_with_config(
                transaction,
                solana_sdk::rpc_config::RpcSimulateTransactionConfig {
                    sig_verify: false,
                    replace_recent_blockhash: self.config.simulation.replace_recent_blockhash,
                    commitment: Some(self.config.simulation.commitment),
                    encoding: Some(solana_sdk::commitment_config::UiTransactionEncoding::Base64),
                    accounts: self.config.simulation.accounts.clone().map(|accounts| {
                        solana_sdk::rpc_config::RpcSimulateTransactionAccountsConfig {
                            encoding: Some(solana_sdk::account_decoder::UiAccountEncoding::Base64),
                            addresses: accounts,
                        }
                    }),
                    min_context_slot: None,
                    inner_instructions: false,
                },
            )
            .await?;

        if let Some(err) = simulation_result.err {
            return Err(PodAIError::SimulationFailed {
                error: format!("{:?}", err),
            });
        }

        if let Some(logs) = simulation_result.logs {
            debug!("Simulation logs: {:#?}", logs);
        }

        info!("Transaction simulation successful");
        Ok(())
    }

    /// Check if we should retry based on error and attempt count
    async fn should_retry(&self, attempt: u32, error: &PodAIError) -> bool {
        match &self.config.retry_policy {
            RetryPolicy::None => false,
            RetryPolicy::Fixed { max_attempts, .. } => {
                attempt < *max_attempts && error.is_retryable()
            }
            RetryPolicy::Exponential { max_attempts, .. } => {
                attempt < *max_attempts && error.is_retryable()
            }
            RetryPolicy::Custom(logic) => logic.should_retry(attempt, error).await,
        }
    }

    /// Calculate delay for retry attempt
    async fn calculate_retry_delay(&self, attempt: u32) -> Duration {
        match &self.config.retry_policy {
            RetryPolicy::None => Duration::ZERO,
            RetryPolicy::Fixed { delay_ms, .. } => Duration::from_millis(*delay_ms),
            RetryPolicy::Exponential {
                base_delay_ms,
                max_delay_ms,
                jitter,
                ..
            } => {
                let mut delay = (*base_delay_ms as f64 * 2_f64.powi(attempt as i32 - 1)) as u64;
                delay = delay.min(*max_delay_ms);

                if *jitter {
                    let jitter_factor = 0.1; // 10% jitter
                    let jitter_range = (delay as f64 * jitter_factor) as u64;
                    let jitter_offset = fastrand::u64(0..=jitter_range);
                    delay = delay.saturating_add(jitter_offset);
                }

                Duration::from_millis(delay)
            }
            RetryPolicy::Custom(logic) => logic.delay_for_attempt(attempt).await,
        }
    }
}

/// Convenient builder methods for common transaction patterns
impl TransactionFactory {
    /// Create a factory optimized for high-frequency operations
    pub fn high_frequency(client: Arc<PodAIClient>) -> Self {
        Self::new(client)
            .with_priority_fee_strategy(PriorityFeeStrategy::Percentile(75))
            .with_simulation(false) // Skip simulation for speed
            .with_retry_policy(RetryPolicy::Fixed {
                max_attempts: 2,
                delay_ms: 500,
            })
    }

    /// Create a factory optimized for reliability over speed
    pub fn reliable(client: Arc<PodAIClient>) -> Self {
        Self::new(client)
            .with_priority_fee_strategy(PriorityFeeStrategy::Auto)
            .with_simulation(true)
            .with_retry_policy(RetryPolicy::Exponential {
                max_attempts: 5,
                base_delay_ms: 1000,
                max_delay_ms: 30_000,
                jitter: true,
            })
    }

    /// Create a factory for development/testing
    pub fn development(client: Arc<PodAIClient>) -> Self {
        Self::new(client)
            .with_priority_fee_strategy(PriorityFeeStrategy::None)
            .with_simulation(true)
            .with_retry_policy(RetryPolicy::Fixed {
                max_attempts: 3,
                delay_ms: 1000,
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::system_instruction;

    #[tokio::test]
    async fn test_transaction_factory_creation() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let factory = TransactionFactory::new(client);
        
        assert!(matches!(factory.config.priority_fee_strategy, PriorityFeeStrategy::Auto));
        assert!(factory.config.simulation.enabled);
    }

    #[tokio::test]
    async fn test_factory_configuration() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let factory = TransactionFactory::new(client)
            .with_priority_fee_strategy(PriorityFeeStrategy::Fixed(1500))
            .with_simulation(false)
            .with_compute_unit_limit(150_000);
        
        assert!(matches!(factory.config.priority_fee_strategy, PriorityFeeStrategy::Fixed(1500)));
        assert!(!factory.config.simulation.enabled);
        assert_eq!(factory.config.compute_unit_limit, Some(150_000));
    }

    #[tokio::test]
    async fn test_preset_configurations() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        
        let high_freq = TransactionFactory::high_frequency(client.clone());
        assert!(!high_freq.config.simulation.enabled);
        
        let reliable = TransactionFactory::reliable(client.clone());
        assert!(reliable.config.simulation.enabled);
        
        let dev = TransactionFactory::development(client);
        assert!(matches!(dev.config.priority_fee_strategy, PriorityFeeStrategy::None));
    }
} 