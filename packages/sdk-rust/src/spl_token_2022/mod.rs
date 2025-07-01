pub mod extensions;
pub mod handlers;
pub mod types;

use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    account::Account,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
};
use spl_token_2022::{
    extension::{
        BaseStateWithExtensions, StateWithExtensions, ExtensionType,
        transfer_fee::{TransferFeeConfig, calculate_epoch_fee},
        metadata_pointer::MetadataPointer,
        mint_close_authority::MintCloseAuthority,
    },
    state::{Account as TokenAccount, Mint},
};
use tracing::{debug, info, instrument, warn};

use crate::{
    client::{PodAIClient, transaction_factory::TransactionFactory},
    errors::{PodAIError, PodAIResult},
    utils::{send_transaction, TransactionOptions},
};

/// Configuration for SPL Token 2022 operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token2022Config {
    /// Default extensions to enable for new mints
    pub default_extensions: Vec<ExtensionType>,
    /// Whether to use ZK compression for token operations
    pub use_compression: bool,
    /// Maximum transfer fee in basis points (100 = 1%)
    pub max_transfer_fee_basis_points: u16,
    /// Whether to automatically handle transfer fees
    pub auto_handle_transfer_fees: bool,
}

impl Default for Token2022Config {
    fn default() -> Self {
        Self {
            default_extensions: vec![
                ExtensionType::TransferFeeConfig,
                ExtensionType::MetadataPointer,
            ],
            use_compression: true,
            max_transfer_fee_basis_points: 500, // 5%
            auto_handle_transfer_fees: true,
        }
    }
}

/// Main handler for SPL Token 2022 operations
pub struct Token2022Handler {
    client: Arc<PodAIClient>,
    config: Token2022Config,
    mint: Pubkey,
    extensions: Vec<ExtensionType>,
}

impl Token2022Handler {
    /// Create a new Token 2022 handler
    pub fn new(
        client: Arc<PodAIClient>,
        mint: Pubkey,
        config: Option<Token2022Config>,
    ) -> Self {
        let config = config.unwrap_or_default();
        
        Self {
            client,
            config,
            mint,
            extensions: Vec::new(),
        }
    }

    /// Initialize the handler by detecting existing extensions
    #[instrument(skip(self))]
    pub async fn initialize(&mut self) -> PodAIResult<()> {
        info!("Initializing Token 2022 handler for mint: {}", self.mint);
        
        let account_data = self.client.get_account_data(&self.mint).await?;
        let mint_state = StateWithExtensions::<Mint>::unpack(&account_data)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to unpack mint state: {}", e),
            })?;

        // Detect available extensions
        self.extensions = mint_state.get_extension_types()?;
        
        debug!("Detected extensions: {:?}", self.extensions);
        Ok(())
    }

    /// Create a new token account with extensions
    #[instrument(skip(self, authority), fields(authority = %authority.pubkey()))]
    pub async fn create_account_with_extensions(
        &self,
        authority: &Keypair,
        extensions: &[ExtensionType],
    ) -> PodAIResult<Pubkey> {
        info!("Creating token account with {} extensions", extensions.len());

        let account_len = ExtensionType::try_calculate_account_len::<TokenAccount>(extensions)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to calculate account length: {}", e),
            })?;

        let account_keypair = Keypair::new();
        let rent = self.client
            .get_minimum_balance_for_rent_exemption(account_len)
            .await?;

        let mut instructions = vec![
            solana_sdk::system_instruction::create_account(
                &authority.pubkey(),
                &account_keypair.pubkey(),
                rent,
                account_len as u64,
                &spl_token_2022::id(),
            ),
        ];

        // Add extension initialization instructions
        for extension in extensions {
            match extension {
                ExtensionType::TransferFeeConfig => {
                    instructions.push(self.create_transfer_fee_config_instruction(
                        &account_keypair.pubkey(),
                        &authority.pubkey(),
                    )?);
                }
                ExtensionType::MetadataPointer => {
                    instructions.push(self.create_metadata_pointer_instruction(
                        &account_keypair.pubkey(),
                        &authority.pubkey(),
                    )?);
                }
                _ => {
                    warn!("Extension {:?} not yet supported in account creation", extension);
                }
            }
        }

        // Initialize the token account
        instructions.push(
            spl_token_2022::instruction::initialize_account3(
                &spl_token_2022::id(),
                &account_keypair.pubkey(),
                &self.mint,
                &authority.pubkey(),
            )?
        );

        let factory = TransactionFactory::new(self.client.clone());
        let signers = vec![authority, &account_keypair];
        
        let result = factory
            .execute_transaction(instructions, &signers, Some(&authority.pubkey()))
            .await?;

        info!(
            "Created token account {} with signature {}",
            account_keypair.pubkey(),
            result.signature
        );

        Ok(account_keypair.pubkey())
    }

    /// Transfer tokens with automatic fee calculation
    #[instrument(skip(self, authority), fields(
        from = %from,
        to = %to,
        amount,
        authority = %authority.pubkey()
    ))]
    pub async fn transfer_with_fee_calculation(
        &self,
        from: &Pubkey,
        to: &Pubkey,
        amount: u64,
        authority: &Keypair,
    ) -> PodAIResult<TransferResult> {
        info!("Transferring {} tokens from {} to {}", amount, from, to);

        // Get account data to check for extensions
        let from_account_data = self.client.get_account_data(from).await?;
        let from_account_state = StateWithExtensions::<TokenAccount>::unpack(&from_account_data)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to unpack from account: {}", e),
            })?;

        // Calculate actual transfer amount considering fees
        let (actual_amount, fee) = if self.extensions.contains(&ExtensionType::TransferFeeConfig) {
            self.calculate_transfer_fee(amount).await?
        } else {
            (amount, 0)
        };

        // Check sufficient balance
        if from_account_state.base.amount < amount {
            return Err(PodAIError::InsufficientBalance {
                required: amount,
                available: from_account_state.base.amount,
            });
        }

        // Get mint decimals for transfer_checked instruction
        let mint_data = self.client.get_account_data(&self.mint).await?;
        let mint_state = StateWithExtensions::<Mint>::unpack(&mint_data)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to unpack mint: {}", e),
            })?;

        let transfer_ix = spl_token_2022::instruction::transfer_checked(
            &spl_token_2022::id(),
            from,
            &self.mint,
            to,
            &authority.pubkey(),
            &[],
            amount,
            mint_state.base.decimals,
        )?;

        let factory = TransactionFactory::new(self.client.clone());
        let result = factory
            .execute_transaction(vec![transfer_ix], &[authority], Some(&authority.pubkey()))
            .await?;

        info!(
            "Transfer completed with signature {} (fee: {} tokens)",
            result.signature, fee
        );

        Ok(TransferResult {
            signature: result.signature,
            from: *from,
            to: *to,
            requested_amount: amount,
            actual_amount,
            fee,
            transaction_result: result,
        })
    }

    /// Calculate transfer fee for a given amount
    pub async fn calculate_transfer_fee(&self, amount: u64) -> PodAIResult<(u64, u64)> {
        if !self.extensions.contains(&ExtensionType::TransferFeeConfig) {
            return Ok((amount, 0));
        }

        let account_data = self.client.get_account_data(&self.mint).await?;
        let mint_state = StateWithExtensions::<Mint>::unpack(&account_data)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to unpack mint for fee calculation: {}", e),
            })?;

        if let Ok(transfer_fee_config) = mint_state.get_extension::<TransferFeeConfig>() {
            let current_epoch = self.client.get_epoch_info().await?.epoch;
            let fee = calculate_epoch_fee(&transfer_fee_config, current_epoch, amount)
                .map_err(|e| PodAIError::SplToken2022 {
                    message: format!("Failed to calculate fee: {}", e),
                })?;
            
            let actual_amount = amount.saturating_sub(fee);
            Ok((actual_amount, fee))
        } else {
            Ok((amount, 0))
        }
    }

    /// Get account balance with extension information
    pub async fn get_account_info(&self, account: &Pubkey) -> PodAIResult<TokenAccountInfo> {
        let account_data = self.client.get_account_data(account).await?;
        let account_state = StateWithExtensions::<TokenAccount>::unpack(&account_data)
            .map_err(|e| PodAIError::SplToken2022 {
                message: format!("Failed to unpack account: {}", e),
            })?;

        let extensions = account_state.get_extension_types()?;
        
        Ok(TokenAccountInfo {
            mint: account_state.base.mint,
            owner: account_state.base.owner,
            amount: account_state.base.amount,
            delegate: account_state.base.delegate,
            state: account_state.base.state.into(),
            extensions,
        })
    }

    /// Create transfer fee config instruction
    fn create_transfer_fee_config_instruction(
        &self,
        account: &Pubkey,
        authority: &Pubkey,
    ) -> PodAIResult<Instruction> {
        spl_token_2022::extension::transfer_fee::instruction::initialize_transfer_fee_config(
            &spl_token_2022::id(),
            &self.mint,
            Some(authority),
            Some(authority),
            self.config.max_transfer_fee_basis_points,
            10_000_000, // Maximum fee in token base units
        ).map_err(|e| PodAIError::SplToken2022 {
            message: format!("Failed to create transfer fee config instruction: {}", e),
        })
    }

    /// Create metadata pointer instruction
    fn create_metadata_pointer_instruction(
        &self,
        account: &Pubkey,
        authority: &Pubkey,
    ) -> PodAIResult<Instruction> {
        spl_token_2022::extension::metadata_pointer::instruction::initialize(
            &spl_token_2022::id(),
            &self.mint,
            Some(*authority),
            Some(self.mint), // Point to self for on-chain metadata
        ).map_err(|e| PodAIError::SplToken2022 {
            message: format!("Failed to create metadata pointer instruction: {}", e),
        })
    }

    /// Check if mint has specific extension
    pub fn has_extension(&self, extension_type: &ExtensionType) -> bool {
        self.extensions.contains(extension_type)
    }

    /// Get all extensions for this mint
    pub fn get_extensions(&self) -> &[ExtensionType] {
        &self.extensions
    }
}

/// Result of a token transfer operation
#[derive(Debug, Clone)]
pub struct TransferResult {
    pub signature: Signature,
    pub from: Pubkey,
    pub to: Pubkey,
    pub requested_amount: u64,
    pub actual_amount: u64,
    pub fee: u64,
    pub transaction_result: crate::client::transaction_factory::TransactionResult,
}

/// Information about a token account with extensions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenAccountInfo {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub delegate: Option<Pubkey>,
    pub state: TokenAccountState,
    pub extensions: Vec<ExtensionType>,
}

/// Token account state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TokenAccountState {
    Uninitialized,
    Initialized,
    Frozen,
}

impl From<spl_token_2022::state::AccountState> for TokenAccountState {
    fn from(state: spl_token_2022::state::AccountState) -> Self {
        match state {
            spl_token_2022::state::AccountState::Uninitialized => Self::Uninitialized,
            spl_token_2022::state::AccountState::Initialized => Self::Initialized,
            spl_token_2022::state::AccountState::Frozen => Self::Frozen,
        }
    }
}

/// Factory for creating Token 2022 handlers
pub struct Token2022Factory {
    client: Arc<PodAIClient>,
    default_config: Token2022Config,
}

impl Token2022Factory {
    /// Create a new factory
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            default_config: Token2022Config::default(),
        }
    }

    /// Create a new factory with custom config
    pub fn with_config(client: Arc<PodAIClient>, config: Token2022Config) -> Self {
        Self {
            client,
            default_config: config,
        }
    }

    /// Create a handler for an existing mint
    pub async fn for_mint(&self, mint: Pubkey) -> PodAIResult<Token2022Handler> {
        let mut handler = Token2022Handler::new(
            self.client.clone(),
            mint,
            Some(self.default_config.clone()),
        );
        
        handler.initialize().await?;
        Ok(handler)
    }

    /// Create a new mint with extensions
    pub async fn create_mint_with_extensions(
        &self,
        authority: &Keypair,
        decimals: u8,
        extensions: &[ExtensionType],
    ) -> PodAIResult<(Pubkey, Token2022Handler)> {
        // Implementation for creating a new mint would go here
        // This involves calculating space, creating account, and initializing mint
        todo!("Implement mint creation with extensions")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::signature::Keypair;

    #[tokio::test]
    async fn test_token_2022_config() {
        let config = Token2022Config::default();
        assert!(config.default_extensions.contains(&ExtensionType::TransferFeeConfig));
        assert!(config.default_extensions.contains(&ExtensionType::MetadataPointer));
        assert_eq!(config.max_transfer_fee_basis_points, 500);
    }

    #[test]
    fn test_token_account_state_conversion() {
        let state = TokenAccountState::from(spl_token_2022::state::AccountState::Initialized);
        assert!(matches!(state, TokenAccountState::Initialized));
    }

    #[tokio::test]
    async fn test_factory_creation() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let factory = Token2022Factory::new(client);
        
        // Test factory creation
        assert_eq!(factory.default_config.max_transfer_fee_basis_points, 500);
    }
} 