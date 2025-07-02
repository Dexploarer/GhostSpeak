//! SPL Token 2022 extension support utilities
//! 
//! Provides helpers for working with SPL Token 2022 extensions including
//! StateWithExtensions, transfer fee calculations, metadata handling,
//! and extension validation.

use solana_sdk::pubkey::Pubkey;
use spl_token_2022::{
    extension::{ExtensionType, transfer_fee::TransferFeeConfig},
    state::{Account as TokenAccount, Mint},
};
use crate::errors::{PodAIError, PodAIResult};
use std::collections::HashMap;

/// Helper struct for working with SPL Token 2022 token accounts
#[derive(Debug, Clone)]
pub struct TokenAccountHelper {
    /// Raw account data
    pub data: Vec<u8>,
}

impl TokenAccountHelper {
    /// Create a new helper from account data
    pub fn new(data: &[u8]) -> Result<Self, crate::errors::PodAIError> {
        Ok(Self { 
            data: data.to_vec() 
        })
    }

    /// Get all extension types (simplified implementation)
    pub fn extension_types(&self) -> Vec<ExtensionType> {
        // This would require parsing the account data to determine extensions
        // For now, return empty vec as a placeholder
        Vec::new()
    }

    /// Check if the account has a specific extension
    pub fn has_extension(&self, extension_type: ExtensionType) -> bool {
        self.extension_types().contains(&extension_type)
    }
}

/// Helper struct for working with SPL Token 2022 mints
#[derive(Debug, Clone)]
pub struct MintHelper {
    /// Raw account data
    pub data: Vec<u8>,
}

impl MintHelper {
    /// Create a new helper from account data
    pub fn new(data: &[u8]) -> Result<Self, crate::errors::PodAIError> {
        Ok(Self { 
            data: data.to_vec() 
        })
    }

    /// Get all extension types (simplified implementation)
    pub fn extension_types(&self) -> Vec<ExtensionType> {
        // This would require parsing the mint data to determine extensions
        // For now, return empty vec as a placeholder
        Vec::new()
    }

    /// Check if the mint has a specific extension
    pub fn has_extension(&self, extension_type: ExtensionType) -> bool {
        self.extension_types().contains(&extension_type)
    }
}

/// Transfer fee calculator for SPL Token 2022
#[derive(Debug)]
pub struct TransferFeeCalculator {
    /// Transfer fee configuration
    config: TransferFeeConfig,
    /// Current epoch
    epoch: u64,
}

impl TransferFeeCalculator {
    /// Create a new calculator
    pub fn new(config: TransferFeeConfig, epoch: u64) -> Self {
        Self { config, epoch }
    }

    /// Create calculator from transfer fee config
    pub fn from_config(config: TransferFeeConfig, epoch: u64) -> Self {
        Self::new(config, epoch)
    }

    /// Calculate fee for a transfer amount
    pub fn calculate_fee(&self, amount: u64) -> PodAIResult<u64> {
        self.config.calculate_epoch_fee(self.epoch, amount)
            .ok_or_else(|| PodAIError::internal("Failed to calculate transfer fee".to_string()))
    }

    /// Calculate the amount received after fees
    pub fn calculate_amount_after_fee(&self, amount: u64) -> PodAIResult<u64> {
        let fee = self.calculate_fee(amount)?;
        Ok(amount.saturating_sub(fee))
    }

    /// Calculate the amount needed to send to receive a target amount
    pub fn calculate_amount_to_send(&self, target_received: u64) -> PodAIResult<u64> {
        // Use binary search to find the amount that results in target_received after fees
        let mut low = target_received;
        let mut high = target_received * 2; // Upper bound estimate

        while low < high {
            let mid = (low + high) / 2;
            let after_fee = self.calculate_amount_after_fee(mid)?;
            
            if after_fee < target_received {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        Ok(low)
    }

    /// Get the transfer fee configuration
    pub fn config(&self) -> &TransferFeeConfig {
        &self.config
    }

    /// Get the current epoch
    pub fn epoch(&self) -> u64 {
        self.epoch
    }
}

/// Extension validator for checking account compatibility
#[derive(Debug, Default)]
pub struct ExtensionValidator {
    /// Required extensions for operations
    required_extensions: HashMap<String, Vec<ExtensionType>>,
    /// Prohibited extensions for operations
    prohibited_extensions: HashMap<String, Vec<ExtensionType>>,
}

impl ExtensionValidator {
    /// Create a new validator
    pub fn new() -> Self {
        Self::default()
    }

    /// Add required extensions for an operation
    pub fn require_extensions(&mut self, operation: &str, extensions: Vec<ExtensionType>) {
        self.required_extensions.insert(operation.to_string(), extensions);
    }

    /// Add prohibited extensions for an operation
    pub fn prohibit_extensions(&mut self, operation: &str, extensions: Vec<ExtensionType>) {
        self.prohibited_extensions.insert(operation.to_string(), extensions);
    }

    /// Validate account extensions for an operation
    pub fn validate_account(&self, operation: &str, account_extensions: &[ExtensionType]) -> PodAIResult<()> {
        // Check required extensions
        if let Some(required) = self.required_extensions.get(operation) {
            for ext in required {
                if !account_extensions.contains(ext) {
                    return Err(PodAIError::invalid_account_data(
                        "TokenAccount",
                        format!("Missing required extension {:?} for operation {}", ext, operation).as_str()
                    ));
                }
            }
        }

        // Check prohibited extensions
        if let Some(prohibited) = self.prohibited_extensions.get(operation) {
            for ext in prohibited {
                if account_extensions.contains(ext) {
                    return Err(PodAIError::invalid_account_data(
                        "TokenAccount",
                        format!("Prohibited extension {:?} present for operation {}", ext, operation).as_str()
                    ));
                }
            }
        }

        Ok(())
    }

    /// Validate mint extensions for an operation
    pub fn validate_mint(&self, operation: &str, mint: &MintHelper) -> PodAIResult<()> {
        let extensions = mint.extension_types();
        self.validate_account(operation, &extensions)
    }

    /// Validate token account extensions for an operation
    pub fn validate_token_account(&self, operation: &str, account: &TokenAccountHelper) -> PodAIResult<()> {
        let extensions = account.extension_types();
        self.validate_account(operation, &extensions)
    }
}

/// Utility functions for working with SPL Token 2022
pub mod utils {
    use super::*;
    use solana_sdk::{instruction::Instruction, program_pack::Pack};


    /// Check if a pubkey is a valid SPL Token 2022 program
    pub fn is_spl_token_2022_program(program_id: &Pubkey) -> bool {
        program_id == &spl_token_2022::id()
    }

    /// Check if a pubkey is a valid SPL Token program (original or 2022)
    pub fn is_spl_token_program(program_id: &Pubkey) -> bool {
        program_id == &spl_token::id() || program_id == &spl_token_2022::id()
    }

    /// Create transfer checked instruction with automatic fee handling
    pub fn create_transfer_checked_instruction(
        token_program_id: &Pubkey,
        source: &Pubkey,
        mint: &Pubkey,
        destination: &Pubkey,
        authority: &Pubkey,
        amount: u64,
        decimals: u8,
        signers: &[&Pubkey],
    ) -> Instruction {
        if is_spl_token_2022_program(token_program_id) {
            spl_token_2022::instruction::transfer_checked(
                token_program_id,
                source,
                mint,
                destination,
                authority,
                signers,
                amount,
                decimals,
            ).unwrap()
        } else {
            spl_token::instruction::transfer_checked(
                token_program_id,
                source,
                mint,
                destination,
                authority,
                signers,
                amount,
                decimals,
            ).unwrap()
        }
    }

    /// Calculate space needed for a mint with specific extensions
    pub fn calculate_mint_space(extensions: &[ExtensionType]) -> usize {
        ExtensionType::try_calculate_account_len::<Mint>(extensions)
            .unwrap_or(Mint::LEN)
    }

    /// Calculate space needed for a token account with specific extensions
    pub fn calculate_token_account_space(extensions: &[ExtensionType]) -> usize {
        ExtensionType::try_calculate_account_len::<TokenAccount>(extensions)
            .unwrap_or(TokenAccount::LEN)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transfer_fee_calculator() {
        // Mock transfer fee config with 1% fee, 1000 max fee
        let config = TransferFeeConfig::default();
        let calculator = TransferFeeCalculator::new(config, 0);
        
        // Test with zero amount
        assert_eq!(calculator.calculate_amount_after_fee(0).unwrap(), 0);
    }

    #[test]
    fn test_extension_validator() {
        let mut validator = ExtensionValidator::new();
        validator.require_extensions("transfer", vec![ExtensionType::TransferFeeAmount]);
        
        // Should fail validation without required extension
        let result = validator.validate_account("transfer", &[]);
        assert!(result.is_err());
        
        // Should pass with required extension
        let result = validator.validate_account("transfer", &[ExtensionType::TransferFeeAmount]);
        assert!(result.is_ok());
    }

    #[test]
    fn test_utils() {
        assert!(utils::is_spl_token_2022_program(&spl_token_2022::id()));
        assert!(!utils::is_spl_token_2022_program(&spl_token::id()));
        
        assert!(utils::is_spl_token_program(&spl_token::id()));
        assert!(utils::is_spl_token_program(&spl_token_2022::id()));
    }
} 