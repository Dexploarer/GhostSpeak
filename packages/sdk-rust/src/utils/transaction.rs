//! Transaction utilities for the podAI SDK

use crate::errors::{PodAIError, PodAIResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    signature::{Signature, Signer},
    transaction::Transaction,
};
use solana_transaction_status::UiTransactionEncoding;
use std::time::{Duration, Instant};

/// Transaction options for customizing transaction behavior
#[derive(Debug, Clone)]
pub struct TransactionOptions {
    /// Maximum retries for failed transactions
    pub max_retries: u32,
    /// Retry delay in milliseconds
    pub retry_delay_ms: u64,
    /// Transaction timeout in seconds
    pub timeout_seconds: u64,
    /// Commitment level for confirmation
    pub commitment: CommitmentConfig,
    /// Whether to skip preflight checks
    pub skip_preflight: bool,
    /// Whether to simulate before sending
    pub simulate_first: bool,
}

impl Default for TransactionOptions {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_delay_ms: 1000,
            timeout_seconds: 60,
            commitment: CommitmentConfig::confirmed(),
            skip_preflight: false,
            simulate_first: true,
        }
    }
}

impl TransactionOptions {
    /// Create options for fast execution (lower retries, shorter timeout)
    pub fn fast() -> Self {
        Self {
            max_retries: 1,
            retry_delay_ms: 500,
            timeout_seconds: 30,
            commitment: CommitmentConfig::processed(),
            skip_preflight: true,
            simulate_first: false,
        }
    }

    /// Create options for reliable execution (more retries, longer timeout)
    pub fn reliable() -> Self {
        Self {
            max_retries: 5,
            retry_delay_ms: 2000,
            timeout_seconds: 120,
            commitment: CommitmentConfig::finalized(),
            skip_preflight: false,
            simulate_first: true,
        }
    }

    /// Set max retries
    pub fn with_max_retries(mut self, retries: u32) -> Self {
        self.max_retries = retries;
        self
    }

    /// Set timeout
    pub fn with_timeout(mut self, seconds: u64) -> Self {
        self.timeout_seconds = seconds;
        self
    }

    /// Set commitment level
    pub fn with_commitment(mut self, commitment: CommitmentConfig) -> Self {
        self.commitment = commitment;
        self
    }

    /// Enable or disable simulation
    pub fn with_simulation(mut self, simulate: bool) -> Self {
        self.simulate_first = simulate;
        self
    }
}

/// Result of a transaction operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    /// Transaction signature
    pub signature: Signature,
    /// Transaction slot
    pub slot: u64,
    /// Whether transaction was confirmed
    pub confirmed: bool,
    /// Execution time
    pub execution_time: Duration,
    /// Number of retry attempts
    pub retry_attempts: u32,
    /// Transaction logs (if available)
    pub logs: Option<Vec<String>>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Transaction timestamp
    pub timestamp: DateTime<Utc>,
}

impl TransactionResult {
    /// Create a successful result
    pub fn success(
        signature: Signature,
        slot: u64,
        execution_time: Duration,
        retry_attempts: u32,
        logs: Option<Vec<String>>,
    ) -> Self {
        Self {
            signature,
            slot,
            confirmed: true,
            execution_time,
            retry_attempts,
            logs,
            error: None,
            timestamp: Utc::now(),
        }
    }

    /// Create a failed result
    pub fn failure(
        signature: Signature,
        slot: u64,
        execution_time: Duration,
        retry_attempts: u32,
        error: String,
        logs: Option<Vec<String>>,
    ) -> Self {
        Self {
            signature,
            slot,
            confirmed: false,
            execution_time,
            retry_attempts,
            logs,
            error: Some(error),
            timestamp: Utc::now(),
        }
    }

    /// Check if transaction was successful
    pub fn is_success(&self) -> bool {
        self.confirmed && self.error.is_none()
    }

    /// Check if transaction failed
    pub fn is_failure(&self) -> bool {
        !self.is_success()
    }

    /// Get error message if any
    pub fn error_message(&self) -> Option<&str> {
        self.error.as_deref()
    }
}

/// Send a transaction with the given options
pub async fn send_transaction(
    rpc_client: &RpcClient,
    transaction: &Transaction,
    options: &TransactionOptions,
) -> PodAIResult<TransactionResult> {
    let start_time = Instant::now();
    let mut retry_attempts = 0;
    let mut last_error = None;

    // Simulate transaction first if requested
    if options.simulate_first {
        match rpc_client.simulate_transaction(transaction).await {
            Ok(simulation_result) => {
                if let Some(_err) = simulation_result.value.err {
                    return Err(PodAIError::transaction_simulation_failed(
                        simulation_result.value.logs.unwrap_or_default(),
                    ));
                }
            }
            Err(e) => {
                log::warn!("Transaction simulation failed: {}", e);
                // Continue anyway unless it's a critical error
            }
        }
    }

    // Retry loop
    for attempt in 0..=options.max_retries {
        retry_attempts = attempt;

        match rpc_client.send_and_confirm_transaction(transaction).await {
            Ok(signature) => {
                // Get transaction details
                let slot = rpc_client.get_slot().await.unwrap_or(0);
                let execution_time = start_time.elapsed();

                // Try to get transaction logs
                let logs = match rpc_client.get_transaction(&signature, UiTransactionEncoding::Json).await {
                    Ok(tx_with_meta) => {
                        tx_with_meta.transaction.meta.and_then(|meta| {
                            // Handle OptionSerializer properly - it has an into() method
                            meta.log_messages.into()
                        })
                    }
                    Err(_) => None,
                };

                return Ok(TransactionResult::success(
                    signature,
                    slot,
                    execution_time,
                    retry_attempts,
                    logs,
                ));
            }
            Err(e) => {
                last_error = Some(e);

                // Don't retry on the last attempt
                if attempt == options.max_retries {
                    break;
                }

                // Wait before retrying
                let delay = Duration::from_millis(options.retry_delay_ms * (attempt + 1) as u64);
                tokio::time::sleep(delay).await;

                log::debug!("Transaction attempt {} failed, retrying in {:?}", attempt + 1, delay);
            }
        }
    }

    // If we get here, all retries failed
    let execution_time = start_time.elapsed();
    let error_msg = last_error
        .map(|e| e.to_string())
        .unwrap_or_else(|| "Unknown transaction error".to_string());

    // Try to get the signature for failed transaction (might be partial)
    let signature = transaction.signatures.first().copied().unwrap_or_default();
    let slot = rpc_client.get_slot().await.unwrap_or(0);

    Ok(TransactionResult::failure(
        signature,
        slot,
        execution_time,
        retry_attempts,
        error_msg,
        None,
    ))
}

/// Send multiple transactions in batch with parallel processing
pub async fn send_transaction_batch(
    rpc_client: &RpcClient,
    transactions: &[Transaction],
    options: &TransactionOptions,
) -> PodAIResult<Vec<TransactionResult>> {
    let mut results = Vec::with_capacity(transactions.len());

    if transactions.is_empty() {
        return Ok(results);
    }

    // For small batches, send sequentially to avoid overwhelming the RPC
    if transactions.len() <= 3 {
        for transaction in transactions {
            let result = send_transaction(rpc_client, transaction, options).await?;
            results.push(result);

            // Small delay between transactions to avoid rate limiting
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        return Ok(results);
    }

    // For larger batches, implement parallel sending with proper rate limiting
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(5)); // Max 5 concurrent transactions
    let rpc_url = rpc_client.url(); // Get the URL to create new clients
    let mut handles = Vec::new();

    for (index, transaction) in transactions.iter().enumerate() {
        let semaphore = semaphore.clone();
        let rpc_url = rpc_url.clone();
        let transaction = transaction.clone();
        let options = options.clone();

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.map_err(|_| {
                PodAIError::internal("Failed to acquire semaphore permit")
            })?;

            // Create a new RPC client for this task
            let task_rpc_client = RpcClient::new(rpc_url);

            // Add staggered delay to spread out transaction submissions
            let delay_ms = (index * 50) as u64; // 50ms per transaction index
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;

            send_transaction(&task_rpc_client, &transaction, &options).await
        });

        handles.push(handle);
    }

    // Collect results in order
    for handle in handles {
        match handle.await {
            Ok(result) => {
                match result {
                    Ok(tx_result) => results.push(tx_result),
                    Err(e) => {
                        log::warn!("Transaction in batch failed: {}", e);
                        // Continue processing other transactions even if one fails
                        // Create a failure result with default values
                        results.push(TransactionResult::failure(
                            Signature::default(),
                            0,
                            Duration::from_millis(0),
                            0,
                            e.to_string(),
                            None,
                        ));
                    }
                }
            }
            Err(e) => {
                log::error!("Task join error in batch transaction: {}", e);
                results.push(TransactionResult::failure(
                    Signature::default(),
                    0,
                    Duration::from_millis(0),
                    0,
                    format!("Task error: {}", e),
                    None,
                ));
            }
        }
    }

    Ok(results)
}

/// Estimate transaction fee
pub async fn estimate_transaction_fee(
    rpc_client: &RpcClient,
    transaction: &Transaction,
) -> PodAIResult<u64> {
    // Simulate transaction to get fee estimate
    match rpc_client.simulate_transaction(transaction).await {
        Ok(_simulation_result) => {
            // Extract fee from simulation if available
            // For now, return a default estimate
            Ok(5000) // 0.000005 SOL as base fee estimate
        }
        Err(e) => {
            log::warn!("Failed to simulate transaction for fee estimation: {}", e);
            // Return default fee estimate
            Ok(5000)
        }
    }
}

/// Check transaction status
pub async fn check_transaction_status(
    rpc_client: &RpcClient,
    signature: &Signature,
) -> PodAIResult<TransactionStatus> {
    match rpc_client.get_signature_status(signature).await {
        Ok(Some(result)) => {
            let confirmed = result.is_ok();
            let slot = 0; // Slot information not directly available from signature status
            let error = result.err().map(|e| e.to_string());

            Ok(TransactionStatus {
                signature: *signature,
                confirmed,
                slot,
                error,
                checked_at: Utc::now(),
            })
        }
        Ok(None) => Ok(TransactionStatus {
            signature: *signature,
            confirmed: false,
            slot: 0,
            error: Some("Transaction not found".to_string()),
            checked_at: Utc::now(),
        }),
        Err(e) => Err(PodAIError::from(e)),
    }
}

/// Transaction status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionStatus {
    /// Transaction signature
    pub signature: Signature,
    /// Whether transaction is confirmed
    pub confirmed: bool,
    /// Transaction slot
    pub slot: u64,
    /// Error message if failed
    pub error: Option<String>,
    /// When status was checked
    pub checked_at: DateTime<Utc>,
}

impl TransactionStatus {
    /// Check if transaction was successful
    pub fn is_success(&self) -> bool {
        self.confirmed && self.error.is_none()
    }

    /// Check if transaction failed
    pub fn is_failure(&self) -> bool {
        self.error.is_some()
    }

    /// Check if transaction is pending
    pub fn is_pending(&self) -> bool {
        !self.confirmed && self.error.is_none()
    }
}

/// Transaction builder utility for constructing complex transactions
#[derive(Debug)]
pub struct TransactionBuilder {
    instructions: Vec<solana_sdk::instruction::Instruction>,
    signers: Vec<Box<dyn Signer>>,
    recent_blockhash: Option<solana_sdk::hash::Hash>,
}

impl TransactionBuilder {
    /// Create a new transaction builder
    pub fn new() -> Self {
        Self {
            instructions: Vec::new(),
            signers: Vec::new(),
            recent_blockhash: None,
        }
    }

    /// Add an instruction
    pub fn add_instruction(mut self, instruction: solana_sdk::instruction::Instruction) -> Self {
        self.instructions.push(instruction);
        self
    }

    /// Add multiple instructions
    pub fn add_instructions(mut self, instructions: Vec<solana_sdk::instruction::Instruction>) -> Self {
        self.instructions.extend(instructions);
        self
    }

    /// Add a signer
    pub fn add_signer(mut self, signer: Box<dyn Signer>) -> Self {
        self.signers.push(signer);
        self
    }

    /// Set recent blockhash
    pub fn with_recent_blockhash(mut self, blockhash: solana_sdk::hash::Hash) -> Self {
        self.recent_blockhash = Some(blockhash);
        self
    }

    /// Build the transaction
    pub fn build(self, payer: &dyn Signer) -> PodAIResult<Transaction> {
        if self.instructions.is_empty() {
            return Err(PodAIError::invalid_input("instructions", "No instructions provided"));
        }

        let recent_blockhash = self.recent_blockhash.ok_or_else(|| {
            PodAIError::invalid_input("blockhash", "Recent blockhash is required")
        })?;

        let mut transaction = Transaction::new_with_payer(&self.instructions, Some(&payer.pubkey()));
        transaction.message.recent_blockhash = recent_blockhash;

        // Sign with payer
        transaction.sign(&[payer], recent_blockhash);

        // Sign with additional signers
        for signer in &self.signers {
            transaction.sign(&[signer.as_ref()], recent_blockhash);
        }

        Ok(transaction)
    }
}

impl Default for TransactionBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::signature::Keypair;

    #[test]
    fn test_transaction_options() {
        let options = TransactionOptions::default();
        assert_eq!(options.max_retries, 3);
        assert_eq!(options.retry_delay_ms, 1000);

        let fast_options = TransactionOptions::fast();
        assert_eq!(fast_options.max_retries, 1);
        assert!(fast_options.skip_preflight);

        let reliable_options = TransactionOptions::reliable();
        assert_eq!(reliable_options.max_retries, 5);
        assert_eq!(reliable_options.commitment, CommitmentConfig::finalized());
    }

    #[test]
    fn test_transaction_result() {
        let signature = Signature::default();
        let execution_time = Duration::from_millis(500);

        let success = TransactionResult::success(signature, 12345, execution_time, 1, None);
        assert!(success.is_success());
        assert!(!success.is_failure());
        assert!(success.error_message().is_none());

        let failure = TransactionResult::failure(
            signature,
            12345,
            execution_time,
            3,
            "Transaction failed".to_string(),
            None,
        );
        assert!(!failure.is_success());
        assert!(failure.is_failure());
        assert_eq!(failure.error_message(), Some("Transaction failed"));
    }

    #[test]
    fn test_transaction_status() {
        let signature = Signature::default();

        let success_status = TransactionStatus {
            signature,
            confirmed: true,
            slot: 12345,
            error: None,
            checked_at: Utc::now(),
        };
        assert!(success_status.is_success());
        assert!(!success_status.is_failure());
        assert!(!success_status.is_pending());

        let failed_status = TransactionStatus {
            signature,
            confirmed: false,
            slot: 12345,
            error: Some("Failed".to_string()),
            checked_at: Utc::now(),
        };
        assert!(!failed_status.is_success());
        assert!(failed_status.is_failure());
        assert!(!failed_status.is_pending());

        let pending_status = TransactionStatus {
            signature,
            confirmed: false,
            slot: 0,
            error: None,
            checked_at: Utc::now(),
        };
        assert!(!pending_status.is_success());
        assert!(!pending_status.is_failure());
        assert!(pending_status.is_pending());
    }

    #[test]
    fn test_transaction_builder() {
        let payer = Keypair::new();
        let recent_blockhash = solana_sdk::hash::Hash::default();

        // Test empty builder
        let empty_builder = TransactionBuilder::new().with_recent_blockhash(recent_blockhash);
        let result = empty_builder.build(&payer);
        assert!(result.is_err());

        // Test builder with instruction
        let instruction = solana_sdk::system_instruction::transfer(
            &payer.pubkey(),
            &Keypair::new().pubkey(),
            1000,
        );

        let builder = TransactionBuilder::new()
            .add_instruction(instruction)
            .with_recent_blockhash(recent_blockhash);

        let transaction = builder.build(&payer).unwrap();
        assert_eq!(transaction.message.instructions.len(), 1);
        assert!(!transaction.signatures.is_empty());
    }
}


