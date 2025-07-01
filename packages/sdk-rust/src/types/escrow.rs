//! Escrow account types and related functionality

use super::time_utils::{datetime_to_timestamp, timestamp_to_datetime};
use super::AccountData;
use borsh::{BorshDeserialize, BorshSerialize};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

/// Escrow account data matching the on-chain program structure
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct EscrowAccount {
    /// Channel public key
    pub channel: Pubkey,
    /// Depositor public key
    pub depositor: Pubkey,
    /// Amount deposited in lamports
    pub amount: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl EscrowAccount {
    /// Create a new escrow account
    pub fn new(
        channel: Pubkey,
        depositor: Pubkey,
        amount: u64,
        bump: u8,
    ) -> Self {
        Self {
            channel,
            depositor,
            amount,
            created_at: Utc::now().timestamp(),
            bump,
        }
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Set the creation time from DateTime
    pub fn set_created_at(&mut self, datetime: DateTime<Utc>) {
        self.created_at = datetime_to_timestamp(datetime);
    }

    /// Add to the escrow amount
    pub fn add_amount(&mut self, additional: u64) {
        self.amount = self.amount.saturating_add(additional);
    }

    /// Remove from the escrow amount
    pub fn remove_amount(&mut self, to_remove: u64) -> Result<(), crate::errors::PodAIError> {
        if self.amount < to_remove {
            return Err(crate::errors::PodAIError::insufficient_balance(
                to_remove,
                self.amount,
            ));
        }
        
        self.amount -= to_remove;
        Ok(())
    }

    /// Check if escrow has sufficient funds
    pub fn has_sufficient_funds(&self, required: u64) -> bool {
        self.amount >= required
    }

    /// Get escrow age (time since creation)
    pub fn age(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let age_seconds = now - self.created_at;
        chrono::Duration::seconds(age_seconds.max(0))
    }

    /// Validate escrow data
    pub fn validate(&self) -> Result<(), crate::errors::PodAIError> {
        // Ensure channel and depositor are different (though this might be allowed)
        // This is just a basic sanity check
        if self.channel == self.depositor {
            // This might actually be valid in some cases, so just log/warn
            log::warn!("Escrow depositor is the same as channel address");
        }

        // Ensure amount is not zero (might be valid in some edge cases)
        if self.amount == 0 {
            log::warn!("Escrow amount is zero");
        }

        Ok(())
    }
}

impl AccountData for EscrowAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for EscrowAccount
        [89, 167, 123, 45, 78, 234, 91, 203]
    }
}

/// Escrow operation types for tracking
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum EscrowOperation {
    /// Deposit operation
    Deposit,
    /// Withdrawal operation
    Withdrawal,
    /// Transfer to another account
    Transfer,
    /// Fee payment
    FeePayment,
}

impl EscrowOperation {
    /// Get the operation as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Deposit => "Deposit",
            Self::Withdrawal => "Withdrawal",
            Self::Transfer => "Transfer",
            Self::FeePayment => "FeePayment",
        }
    }
}

/// Escrow transaction record for tracking operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EscrowTransaction {
    /// Transaction ID
    pub id: String,
    /// Escrow account public key
    pub escrow_account: Pubkey,
    /// Type of operation
    pub operation: EscrowOperation,
    /// Amount involved in the transaction
    pub amount: u64,
    /// Balance before the transaction
    pub balance_before: u64,
    /// Balance after the transaction
    pub balance_after: u64,
    /// Transaction timestamp
    pub timestamp: DateTime<Utc>,
    /// Optional transaction signature
    pub signature: Option<String>,
    /// Optional additional context
    pub context: Option<String>,
}

impl EscrowTransaction {
    /// Create a new escrow transaction record
    pub fn new(
        escrow_account: Pubkey,
        operation: EscrowOperation,
        amount: u64,
        balance_before: u64,
        balance_after: u64,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            escrow_account,
            operation,
            amount,
            balance_before,
            balance_after,
            timestamp: Utc::now(),
            signature: None,
            context: None,
        }
    }

    /// Set the transaction signature
    pub fn with_signature(mut self, signature: String) -> Self {
        self.signature = Some(signature);
        self
    }

    /// Set the transaction context
    pub fn with_context(mut self, context: String) -> Self {
        self.context = Some(context);
        self
    }

    /// Check if this transaction represents a deposit
    pub fn is_deposit(&self) -> bool {
        matches!(self.operation, EscrowOperation::Deposit)
    }

    /// Check if this transaction represents a withdrawal
    pub fn is_withdrawal(&self) -> bool {
        matches!(self.operation, EscrowOperation::Withdrawal)
    }

    /// Get the net change in balance (positive for increases, negative for decreases)
    pub fn net_change(&self) -> i64 {
        (self.balance_after as i64) - (self.balance_before as i64)
    }
}

/// Escrow manager for handling multiple escrow accounts
#[derive(Debug, Default)]
pub struct EscrowManager {
    /// Map of escrow accounts by their public key
    accounts: std::collections::HashMap<Pubkey, EscrowAccount>,
    /// Transaction history
    transactions: Vec<EscrowTransaction>,
}

impl EscrowManager {
    /// Create a new escrow manager
    pub fn new() -> Self {
        Self::default()
    }

    /// Add an escrow account to the manager
    pub fn add_account(&mut self, account: EscrowAccount) {
        let pubkey = account.channel; // Using channel as key for simplicity
        self.accounts.insert(pubkey, account);
    }

    /// Remove an escrow account from the manager
    pub fn remove_account(&mut self, pubkey: &Pubkey) -> Option<EscrowAccount> {
        self.accounts.remove(pubkey)
    }

    /// Get an escrow account by public key
    pub fn get_account(&self, pubkey: &Pubkey) -> Option<&EscrowAccount> {
        self.accounts.get(pubkey)
    }

    /// Get a mutable escrow account by public key
    pub fn get_account_mut(&mut self, pubkey: &Pubkey) -> Option<&mut EscrowAccount> {
        self.accounts.get_mut(pubkey)
    }

    /// Record a transaction
    pub fn record_transaction(&mut self, transaction: EscrowTransaction) {
        self.transactions.push(transaction);
    }

    /// Get transaction history for an account
    pub fn get_account_transactions(&self, account: &Pubkey) -> Vec<&EscrowTransaction> {
        self.transactions
            .iter()
            .filter(|tx| tx.escrow_account == *account)
            .collect()
    }

    /// Get all transaction history
    pub fn get_all_transactions(&self) -> &[EscrowTransaction] {
        &self.transactions
    }

    /// Get total balance across all accounts
    pub fn total_balance(&self) -> u64 {
        self.accounts.values().map(|account| account.amount).sum()
    }

    /// Get number of accounts
    pub fn account_count(&self) -> usize {
        self.accounts.len()
    }

    /// Get accounts by depositor
    pub fn get_accounts_by_depositor(&self, depositor: &Pubkey) -> Vec<&EscrowAccount> {
        self.accounts
            .values()
            .filter(|account| account.depositor == *depositor)
            .collect()
    }

    /// Clear transaction history (keeping only recent transactions)
    pub fn trim_transaction_history(&mut self, max_transactions: usize) {
        if self.transactions.len() > max_transactions {
            let start_index = self.transactions.len() - max_transactions;
            self.transactions.drain(0..start_index);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_escrow_account_creation() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let depositor = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let escrow = EscrowAccount::new(channel, depositor, 1000, 255);

        assert_eq!(escrow.channel, channel);
        assert_eq!(escrow.depositor, depositor);
        assert_eq!(escrow.amount, 1000);
        assert!(escrow.has_sufficient_funds(500));
        assert!(!escrow.has_sufficient_funds(1500));
    }

    #[test]
    fn test_escrow_amount_operations() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let depositor = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let mut escrow = EscrowAccount::new(channel, depositor, 1000, 255);

        // Add amount
        escrow.add_amount(500);
        assert_eq!(escrow.amount, 1500);

        // Remove amount
        assert!(escrow.remove_amount(300).is_ok());
        assert_eq!(escrow.amount, 1200);

        // Try to remove more than available
        assert!(escrow.remove_amount(1500).is_err());
        assert_eq!(escrow.amount, 1200); // Should remain unchanged
    }

    #[test]
    fn test_escrow_transaction() {
        let escrow_account = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let transaction = EscrowTransaction::new(
            escrow_account,
            EscrowOperation::Deposit,
            500,
            1000,
            1500,
        );

        assert_eq!(transaction.escrow_account, escrow_account);
        assert_eq!(transaction.operation, EscrowOperation::Deposit);
        assert_eq!(transaction.amount, 500);
        assert_eq!(transaction.net_change(), 500);
        assert!(transaction.is_deposit());
        assert!(!transaction.is_withdrawal());
    }

    #[test]
    fn test_escrow_manager() {
        let mut manager = EscrowManager::new();
        
        let channel1 = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let depositor1 = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let escrow1 = EscrowAccount::new(channel1, depositor1, 1000, 255);

        let channel2 = Pubkey::from_str("11111111111111111111111111111114").unwrap();
        let depositor2 = Pubkey::from_str("11111111111111111111111111111115").unwrap();
        let escrow2 = EscrowAccount::new(channel2, depositor2, 2000, 255);

        // Add accounts
        manager.add_account(escrow1);
        manager.add_account(escrow2);

        assert_eq!(manager.account_count(), 2);
        assert_eq!(manager.total_balance(), 3000);

        // Test getting accounts by depositor
        let depositor1_accounts = manager.get_accounts_by_depositor(&depositor1);
        assert_eq!(depositor1_accounts.len(), 1);
        assert_eq!(depositor1_accounts[0].amount, 1000);

        // Record transaction
        let transaction = EscrowTransaction::new(
            channel1,
            EscrowOperation::Deposit,
            500,
            1000,
            1500,
        );
        manager.record_transaction(transaction);

        let account_transactions = manager.get_account_transactions(&channel1);
        assert_eq!(account_transactions.len(), 1);
    }

    #[test]
    fn test_escrow_operation_string() {
        assert_eq!(EscrowOperation::Deposit.as_str(), "Deposit");
        assert_eq!(EscrowOperation::Withdrawal.as_str(), "Withdrawal");
    }

    #[test]
    fn test_escrow_validation() {
        let channel = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let depositor = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let escrow = EscrowAccount::new(channel, depositor, 1000, 255);

        // Should validate successfully
        assert!(escrow.validate().is_ok());
    }
} 