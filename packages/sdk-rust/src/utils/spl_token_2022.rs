//! SPL Token 2022 extension support utilities
//! 
//! Provides helpers for working with SPL Token 2022 extensions including
//! StateWithExtensions, transfer fee calculations, metadata handling,
//! and extension validation.

use crate::errors::{PodAIError, PodAIResult};
use solana_sdk::{
    account::Account,
    clock::Clock,
    pubkey::Pubkey,
    sysvar::Sysvar,
};
use spl_token_2022::{
    extension::{
        transfer_fee::{TransferFeeConfig, TransferFeeAmount, calculate_epoch_fee},
        metadata_pointer::MetadataPointer,
        mint_close_authority::MintCloseAuthority,
        permanent_delegate::PermanentDelegate,
        transfer_hook::TransferHook,
        BaseStateWithExtensions,
        ExtensionType,
        StateWithExtensions,
    },
    state::{Account as TokenAccount, Mint},
};
use std::collections::HashMap;

/// Helper for working with token accounts that may have extensions
#[derive(Debug)]
pub struct TokenAccountHelper {
    /// The token account state with extensions
    pub state: StateWithExtensions<TokenAccount>,
    /// Raw account data
    pub data: Vec<u8>,
    /// Account pubkey
    pub pubkey: Pubkey,
}

impl TokenAccountHelper {
    /// Create a new helper from account data
    pub fn new(pubkey: Pubkey, account: &Account) -> PodAIResult<Self> {
        let state = StateWithExtensions::<TokenAccount>::unpack(&account.data)
            .map_err(|e| PodAIError::invalid_account_data(
                "TokenAccount",
                format!("Failed to unpack token account: {}", e)
            ))?;

        Ok(Self {
            state,
            data: account.data.clone(),
            pubkey,
        })
    }

    /// Get the base token account data
    pub fn base(&self) -> &TokenAccount {
        &self.state.base
    }

    /// Get token amount
    pub fn amount(&self) -> u64 {
        self.state.base.amount
    }

    /// Get mint pubkey
    pub fn mint(&self) -> Pubkey {
        self.state.base.mint
    }

    /// Get owner pubkey
    pub fn owner(&self) -> Pubkey {
        self.state.base.owner
    }

    /// Check if account is frozen
    pub fn is_frozen(&self) -> bool {
        self.state.base.is_frozen()
    }

    /// Get transfer fee amount extension if present
    pub fn transfer_fee_amount(&self) -> PodAIResult<Option<TransferFeeAmount>> {
        match self.state.get_extension::<TransferFeeAmount>() {
            Ok(extension) => Ok(Some(*extension)),
            Err(_) => Ok(None),
        }
    }

    /// Calculate withheld transfer fees
    pub fn withheld_transfer_fees(&self) -> PodAIResult<u64> {
        if let Some(fee_amount) = self.transfer_fee_amount()? {
            Ok(fee_amount.withheld_amount.into())
        } else {
            Ok(0)
        }
    }

    /// Get all extension types present on this account
    pub fn extension_types(&self) -> Vec<ExtensionType> {
        self.state.get_extension_types()
    }

    /// Check if account has a specific extension
    pub fn has_extension(&self, extension_type: ExtensionType) -> bool {
        self.extension_types().contains(&extension_type)
    }
}

/// Helper for working with mints that may have extensions
#[derive(Debug)]
pub struct MintHelper {
    /// The mint state with extensions
    pub state: StateWithExtensions<Mint>,
    /// Raw account data
    pub data: Vec<u8>,
    /// Mint pubkey
    pub pubkey: Pubkey,
}

impl MintHelper {
    /// Create a new helper from account data
    pub fn new(pubkey: Pubkey, account: &Account) -> PodAIResult<Self> {
        let state = StateWithExtensions::<Mint>::unpack(&account.data)
            .map_err(|e| PodAIError::invalid_account_data(
                "Mint",
                format!("Failed to unpack mint: {}", e)
            ))?;

        Ok(Self {
            state,
            data: account.data.clone(),
            pubkey,
        })
    }

    /// Get the base mint data
    pub fn base(&self) -> &Mint {
        &self.state.base
    }

    /// Get supply
    pub fn supply(&self) -> u64 {
        self.state.base.supply
    }

    /// Get decimals
    pub fn decimals(&self) -> u8 {
        self.state.base.decimals
    }

    /// Get mint authority
    pub fn mint_authority(&self) -> Option<Pubkey> {
        self.state.base.mint_authority.into()
    }

    /// Get freeze authority
    pub fn freeze_authority(&self) -> Option<Pubkey> {
        self.state.base.freeze_authority.into()
    }

    /// Check if mint is initialized
    pub fn is_initialized(&self) -> bool {
        self.state.base.is_initialized
    }

    /// Get transfer fee configuration if present
    pub fn transfer_fee_config(&self) -> PodAIResult<Option<TransferFeeConfig>> {
        match self.state.get_extension::<TransferFeeConfig>() {
            Ok(extension) => Ok(Some(*extension)),
            Err(_) => Ok(None),
        }
    }

    /// Calculate transfer fee for a given amount and epoch
    pub fn calculate_transfer_fee(&self, amount: u64, epoch: u64) -> PodAIResult<u64> {
        if let Some(config) = self.transfer_fee_config()? {
            config.calculate_epoch_fee(epoch, amount)
                .ok_or_else(|| PodAIError::internal("Failed to calculate transfer fee".to_string()))
        } else {
            Ok(0)
        }
    }

    /// Calculate transfer fee for current epoch
    pub async fn calculate_current_transfer_fee(&self, amount: u64) -> PodAIResult<u64> {
        let clock = Clock::get().map_err(|e| PodAIError::internal(format!("Failed to get clock: {}", e)))?;
        self.calculate_transfer_fee(amount, clock.epoch)
    }

    /// Get metadata pointer if present
    pub fn metadata_pointer(&self) -> PodAIResult<Option<MetadataPointer>> {
        match self.state.get_extension::<MetadataPointer>() {
            Ok(extension) => Ok(Some(*extension)),
            Err(_) => Ok(None),
        }
    }

    /// Get mint close authority if present
    pub fn close_authority(&self) -> PodAIResult<Option<Pubkey>> {
        match self.state.get_extension::<MintCloseAuthority>() {
            Ok(extension) => Ok(extension.close_authority.into()),
            Err(_) => Ok(None),
        }
    }

    /// Check if mint can be closed
    pub fn is_closable(&self) -> PodAIResult<bool> {
        Ok(self.close_authority()?.is_some() && self.supply() == 0)
    }

    /// Get permanent delegate if present
    pub fn permanent_delegate(&self) -> PodAIResult<Option<Pubkey>> {
        match self.state.get_extension::<PermanentDelegate>() {
            Ok(extension) => Ok(extension.delegate.into()),
            Err(_) => Ok(None),
        }
    }

    /// Get transfer hook if present
    pub fn transfer_hook(&self) -> PodAIResult<Option<TransferHook>> {
        match self.state.get_extension::<TransferHook>() {
            Ok(extension) => Ok(Some(*extension)),
            Err(_) => Ok(None),
        }
    }

    /// Get all extension types present on this mint
    pub fn extension_types(&self) -> Vec<ExtensionType> {
        self.state.get_extension_types()
    }

    /// Check if mint has a specific extension
    pub fn has_extension(&self, extension_type: ExtensionType) -> bool {
        self.extension_types().contains(&extension_type)
    }

    /// Get required account size for creating token accounts for this mint
    pub fn get_token_account_size(&self) -> usize {
        let mut extensions = vec![ExtensionType::ImmutableOwner]; // Always include for new accounts
        
        // Add transfer fee amount if mint has transfer fees
        if self.has_extension(ExtensionType::TransferFeeConfig) {
            extensions.push(ExtensionType::TransferFeeAmount);
        }

        ExtensionType::try_calculate_account_len::<TokenAccount>(&extensions)
            .unwrap_or(TokenAccount::LEN)
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

    /// Create calculator from mint helper
    pub async fn from_mint(mint: &MintHelper) -> PodAIResult<Option<Self>> {
        if let Some(config) = mint.transfer_fee_config()? {
            let clock = Clock::get().map_err(|e| PodAIError::internal(format!("Failed to get clock: {}", e)))?;
            Ok(Some(Self::new(config, clock.epoch)))
        } else {
            Ok(None)
        }
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
                        format!("Missing required extension {:?} for operation {}", ext, operation)
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
                        format!("Prohibited extension {:?} present for operation {}", ext, operation)
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
    use solana_sdk::instruction::Instruction;
    use spl_token_2022::instruction;

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