//! Escrow service for managing secure financial transactions

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::escrow::{EscrowAccount, EscrowTransaction, EscrowOperation};
use crate::utils::pda::find_escrow_pda;
use crate::utils::{TransactionFactory, TransactionConfig, PriorityFeeStrategy, RetryPolicy};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
};
use std::sync::Arc;
use crate::types::AccountData;

/// Service for managing escrow accounts
pub struct EscrowService {
    client: Arc<PodAIClient>,
}

impl EscrowService {
    /// Create a new escrow service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create an escrow account with modern transaction patterns
    pub async fn create_escrow_with_factory(
        &self,
        factory: &TransactionFactory,
        depositor: &dyn Signer,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        let (escrow_pda, bump) = find_escrow_pda(channel, &depositor.pubkey());

        // Check if escrow already exists
        if self.client.account_exists(&escrow_pda).await? {
            return Err(PodAIError::escrow("Escrow already exists"));
        }

        // Validate initial deposit
        if initial_deposit == 0 {
            return Err(PodAIError::invalid_input(
                "initial_deposit",
                "Initial deposit must be greater than 0",
            ));
        }

        // Create escrow creation instruction
        let instruction = self.create_escrow_instruction(
            &depositor.pubkey(),
            &escrow_pda,
            channel,
            initial_deposit,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory
            .build_transaction(vec![instruction], &depositor.pubkey(), &[depositor])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        Ok(EscrowCreationResult {
            signature: result.signature,
            escrow_pda,
            depositor: depositor.pubkey(),
            channel: *channel,
            initial_deposit,
            timestamp: Utc::now(),
        })
    }

    /// Create escrow with fast configuration
    pub async fn create_escrow_fast(
        &self,
        depositor: &dyn Signer,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::fast());
        self.create_escrow_with_factory(&factory, depositor, channel, initial_deposit).await
    }

    /// Create escrow with reliable configuration
    pub async fn create_escrow_reliable(
        &self,
        depositor: &dyn Signer,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        let factory = TransactionFactory::with_config(&self.client, TransactionConfig::reliable());
        self.create_escrow_with_factory(&factory, depositor, channel, initial_deposit).await
    }

    /// Create a builder for escrow creation with custom configuration
    pub fn create_escrow_builder(&self) -> EscrowCreationBuilder {
        EscrowCreationBuilder::new(self)
    }

    /// Deposit to escrow with factory pattern
    pub async fn deposit_with_factory(
        &self,
        factory: &TransactionFactory,
        depositor: &dyn Signer,
        escrow_pda: &Pubkey,
        amount: u64,
    ) -> PodAIResult<EscrowDepositResult> {
        // Get escrow account
        let escrow = self.get_escrow(escrow_pda).await?;
        
        // Verify depositor is authorized
        if escrow.depositor != depositor.pubkey() {
            return Err(PodAIError::escrow("Only the original depositor can add funds"));
        }

        // Validate amount
        if amount == 0 {
            return Err(PodAIError::invalid_input("amount", "Deposit amount must be greater than 0"));
        }

        // Create deposit instruction
        let instruction = self.create_deposit_instruction(
            &depositor.pubkey(),
            escrow_pda,
            amount,
        )?;

        // Build and send transaction
        let transaction = factory
            .build_transaction(vec![instruction], &depositor.pubkey(), &[depositor])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        // Create transaction record
        let escrow_transaction = EscrowTransaction::new(
            *escrow_pda,
            EscrowOperation::Deposit,
            amount,
            escrow.amount,
            escrow.amount + amount,
        ).with_signature(result.signature.to_string());

        Ok(EscrowDepositResult {
            signature: result.signature,
            escrow_pda: *escrow_pda,
            depositor: depositor.pubkey(),
            amount,
            new_balance: escrow.amount + amount,
            transaction: escrow_transaction,
            timestamp: Utc::now(),
        })
    }

    /// Withdraw from escrow with factory pattern
    pub async fn withdraw_with_factory(
        &self,
        factory: &TransactionFactory,
        withdrawer: &dyn Signer,
        escrow_pda: &Pubkey,
        amount: u64,
    ) -> PodAIResult<EscrowWithdrawResult> {
        // Get escrow account
        let escrow = self.get_escrow(escrow_pda).await?;
        
        // Verify withdrawer is authorized
        if escrow.depositor != withdrawer.pubkey() {
            return Err(PodAIError::escrow("Only the depositor can withdraw funds"));
        }

        // Validate amount
        if amount == 0 {
            return Err(PodAIError::invalid_input("amount", "Withdraw amount must be greater than 0"));
        }

        if amount > escrow.amount {
            return Err(PodAIError::escrow("Insufficient escrow balance"));
        }

        // Create withdraw instruction
        let instruction = self.create_withdraw_instruction(
            &withdrawer.pubkey(),
            escrow_pda,
            &escrow.channel,
            amount,
            escrow.bump,
        )?;

        // Build and send transaction
        let transaction = factory
            .build_transaction(vec![instruction], &withdrawer.pubkey(), &[withdrawer])
            .await?;

        let result = factory.send_transaction(&transaction).await?;

        // Create transaction record
        let escrow_transaction = EscrowTransaction::new(
            *escrow_pda,
            EscrowOperation::Withdrawal,
            amount,
            escrow.amount,
            escrow.amount - amount,
        ).with_signature(result.signature.to_string());

        Ok(EscrowWithdrawResult {
            signature: result.signature,
            escrow_pda: *escrow_pda,
            withdrawer: withdrawer.pubkey(),
            amount,
            new_balance: escrow.amount - amount,
            transaction: escrow_transaction,
            timestamp: Utc::now(),
        })
    }

    /// Get escrow account data
    pub async fn get_escrow(&self, escrow_pda: &Pubkey) -> PodAIResult<EscrowAccount> {
        match self.client.rpc_client.get_account(escrow_pda).await {
            Ok(account) => EscrowAccount::from_bytes(&account.data),
            Err(_) => Err(PodAIError::account_not_found("Escrow", &escrow_pda.to_string())),
        }
    }

    /// Get escrow balance
    pub async fn get_balance(&self, escrow_pda: &Pubkey) -> PodAIResult<u64> {
        let escrow = self.get_escrow(escrow_pda).await?;
        Ok(escrow.amount)
    }

    /// Get escrow PDA
    pub fn get_escrow_pda(&self, channel: &Pubkey, depositor: &Pubkey) -> (Pubkey, u8) {
        find_escrow_pda(channel, depositor)
    }

    /// Create instruction for escrow creation
    fn create_escrow_instruction(
        &self,
        depositor: &Pubkey,
        escrow_pda: &Pubkey,
        channel_pda: &Pubkey,
        amount: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for create_escrow
        let discriminator = [135, 157, 66, 195, 2, 113, 175, 30]; // create_escrow discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 32 + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(channel_pda.as_ref());
        instruction_data.extend_from_slice(&amount.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*escrow_pda, false),            // escrow_account (writable, PDA)
            AccountMeta::new(*depositor, true),              // depositor (writable, signer)
            AccountMeta::new(*channel_pda, false),           // channel_account (readonly)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create instruction for escrow withdrawal
    fn create_withdraw_instruction(
        &self,
        withdrawer: &Pubkey,
        escrow_pda: &Pubkey,
        channel_pda: &Pubkey,
        amount: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for withdraw_escrow
        let discriminator = [15, 40, 235, 178, 191, 96, 190, 12]; // withdraw_escrow discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(&amount.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*escrow_pda, false),            // escrow_account (writable, PDA)
            AccountMeta::new(*withdrawer, true),             // withdrawer (writable, signer)
            AccountMeta::new(*channel_pda, false),           // channel_account (readonly)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create instruction for escrow release
    #[allow(dead_code)]
    fn create_release_instruction(
        &self,
        releaser: &Pubkey,
        escrow_pda: &Pubkey,
        channel_pda: &Pubkey,
        recipient: &Pubkey,
        amount: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for release_escrow
        let discriminator = [11, 18, 104, 9, 104, 174, 59, 33]; // release_escrow discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 32 + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(recipient.as_ref());
        instruction_data.extend_from_slice(&amount.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*escrow_pda, false),            // escrow_account (writable, PDA)
            AccountMeta::new(*releaser, true),               // releaser (writable, signer)
            AccountMeta::new(*channel_pda, false),           // channel_account (readonly)
            AccountMeta::new(*recipient, false),             // recipient (writable)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create escrow creation instruction
    fn create_deposit_instruction(
        &self,
        depositor: &Pubkey,
        escrow_pda: &Pubkey,
        amount: u64,
    ) -> PodAIResult<Instruction> {
        // This would be replaced with actual Anchor instruction generation
        let mut instruction_data = vec![];
        instruction_data.extend_from_slice(&amount.to_le_bytes()); // Include amount in instruction data
        
        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: vec![
                AccountMeta::new(*depositor, true),
                AccountMeta::new(*escrow_pda, false),
                AccountMeta::new_readonly(solana_sdk::system_program::id(), false),
            ],
            data: instruction_data,
        })
    }

    /// Create an escrow account (legacy method)
    pub async fn create_escrow(
        &self,
        depositor_keypair: &Keypair,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        self.create_escrow_fast(depositor_keypair, channel, initial_deposit).await
    }
}

/// Result of escrow creation with enhanced information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowCreationResult {
    /// Transaction signature
    pub signature: Signature,
    /// The escrow PDA
    pub escrow_pda: Pubkey,
    /// Depositor public key
    pub depositor: Pubkey,
    /// Channel public key
    pub channel: Pubkey,
    /// Initial deposit amount
    pub initial_deposit: u64,
    /// Creation timestamp
    pub timestamp: DateTime<Utc>,
}

/// Result of escrow deposit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowDepositResult {
    /// Transaction signature
    pub signature: Signature,
    /// The escrow PDA
    pub escrow_pda: Pubkey,
    /// Depositor public key
    pub depositor: Pubkey,
    /// Deposit amount
    pub amount: u64,
    /// New balance after deposit
    pub new_balance: u64,
    /// Transaction record
    pub transaction: EscrowTransaction,
    /// Deposit timestamp
    pub timestamp: DateTime<Utc>,
}

/// Result of escrow withdrawal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowWithdrawResult {
    /// Transaction signature
    pub signature: Signature,
    /// The escrow PDA
    pub escrow_pda: Pubkey,
    /// Withdrawer public key
    pub withdrawer: Pubkey,
    /// Withdrawal amount
    pub amount: u64,
    /// New balance after withdrawal
    pub new_balance: u64,
    /// Transaction record
    pub transaction: EscrowTransaction,
    /// Withdrawal timestamp
    pub timestamp: DateTime<Utc>,
}

/// Builder for escrow creation with custom configuration
pub struct EscrowCreationBuilder<'a> {
    service: &'a EscrowService,
    transaction_config: Option<TransactionConfig>,
    priority_fee_strategy: Option<PriorityFeeStrategy>,
    retry_policy: Option<RetryPolicy>,
    simulate_before_send: Option<bool>,
}

impl<'a> EscrowCreationBuilder<'a> {
    /// Create a new builder
    pub fn new(service: &'a EscrowService) -> Self {
        Self {
            service,
            transaction_config: None,
            priority_fee_strategy: None,
            retry_policy: None,
            simulate_before_send: None,
        }
    }

    /// Set transaction configuration
    pub fn with_config(mut self, config: TransactionConfig) -> Self {
        self.transaction_config = Some(config);
        self
    }

    /// Set priority fee strategy
    pub fn with_priority_fee_strategy(mut self, strategy: PriorityFeeStrategy) -> Self {
        self.priority_fee_strategy = Some(strategy);
        self
    }

    /// Set retry policy
    pub fn with_retry_policy(mut self, policy: RetryPolicy) -> Self {
        self.retry_policy = Some(policy);
        self
    }

    /// Enable or disable simulation
    pub fn with_simulation(mut self, simulate: bool) -> Self {
        self.simulate_before_send = Some(simulate);
        self
    }

    /// Use fast execution configuration
    pub fn fast(mut self) -> Self {
        self.transaction_config = Some(TransactionConfig::fast());
        self
    }

    /// Use reliable execution configuration
    pub fn reliable(mut self) -> Self {
        self.transaction_config = Some(TransactionConfig::reliable());
        self
    }

    /// Execute the escrow creation
    pub async fn execute(
        self,
        depositor: &dyn Signer,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        // Build configuration
        let mut config = self.transaction_config.unwrap_or_default();

        if let Some(strategy) = self.priority_fee_strategy {
            config = config.with_priority_fee_strategy(strategy);
        }

        if let Some(policy) = self.retry_policy {
            config = config.with_retry_policy(policy);
        }

        if let Some(simulate) = self.simulate_before_send {
            config = config.with_simulation(simulate);
        }

        // Create factory and execute
        let factory = TransactionFactory::with_config(&self.service.client, config);
        self.service.create_escrow_with_factory(&factory, depositor, channel, initial_deposit).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client::{PodAIClient, PodAIConfig};
    use std::str::FromStr;

    #[tokio::test]
    async fn test_escrow_pda() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let depositor = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let config = PodAIConfig::localnet();
        
        if let Ok(client) = PodAIClient::new(config).await {
            let service = EscrowService::new(Arc::new(client));
            let (pda, bump) = service.get_escrow_pda(&channel, &depositor);
            
            // Verify PDA derivation
            let (expected_pda, expected_bump) = find_escrow_pda(&channel, &depositor);
            assert_eq!(pda, expected_pda);
            assert_eq!(bump, expected_bump);
        }
    }

    #[test]
    fn test_escrow_creation_result() {
        let result = EscrowCreationResult {
            signature: Signature::default(),
            escrow_pda: Pubkey::default(),
            depositor: Pubkey::default(),
            channel: Pubkey::default(),
            initial_deposit: 1000000,
            timestamp: Utc::now(),
        };

        assert_eq!(result.initial_deposit, 1000000);
    }
}


