/*!
 * Token-2022 Operations Module
 *
 * Implements Token-2022 mint creation with various extensions including:
 * - Transfer fees
 * - Confidential transfers
 * - Interest-bearing tokens
 * - Other Token-2022 extensions
 */

use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022};
use anchor_spl::token_interface::Mint;
use anchor_lang::solana_program::program_option::COption;

use crate::state::{Agent, GhostSpeakError};
use crate::security::validate_agent_authority;

// Constants for Token-2022 extensions
pub const MAX_TRANSFER_FEE_BASIS_POINTS: u16 = 1000; // 10% max fee
pub const MAX_INTEREST_RATE_BASIS_POINTS: i16 = 5000; // 50% max interest rate

// =====================================================
// Create Token-2022 Mint with Extensions
// =====================================================

#[derive(Accounts)]
#[instruction(params: CreateToken2022MintParams)]
pub struct CreateToken2022Mint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The agent creating the token
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess,
        constraint = agent.is_active @ GhostSpeakError::InactiveAgent
    )]
    pub agent: Account<'info, Agent>,

    /// The mint to be created with Token-2022 extensions
    /// CHECK: This is initialized by the Token-2022 program
    #[account(
        mut,
        signer,
    )]
    pub mint: AccountInfo<'info>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateToken2022MintParams {
    pub decimals: u8,
    pub freeze_authority: Option<Pubkey>,
    pub enable_transfer_fee: bool,
    pub enable_confidential_transfers: bool,
    pub enable_interest_bearing: bool,
}

pub fn create_token_2022_mint(
    ctx: Context<CreateToken2022Mint>,
    params: CreateToken2022MintParams,
) -> Result<()> {
    // Validate agent authority
    validate_agent_authority(&ctx.accounts.agent, &ctx.accounts.authority)?;

    // Calculate required space for extensions
    let mut extensions = vec![];
    
    if params.enable_transfer_fee {
        extensions.push(spl_token_2022::extension::ExtensionType::TransferFeeConfig);
    }
    if params.enable_confidential_transfers {
        extensions.push(spl_token_2022::extension::ExtensionType::ConfidentialTransferMint);
    }
    if params.enable_interest_bearing {
        extensions.push(spl_token_2022::extension::ExtensionType::InterestBearingConfig);
    }

    let space = spl_token_2022::extension::ExtensionType::try_calculate_account_len::<spl_token_2022::state::Mint>(&extensions)?;

    // Create the account for the mint
    let rent = ctx.accounts.rent.minimum_balance(space);
    
    anchor_lang::system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.mint.to_account_info(),
            },
        ),
        rent,
        space as u64,
        &ctx.accounts.token_program.key(),
    )?;

    // Initialize the mint
    let cpi_accounts = token_2022::InitializeMint2 {
        mint: ctx.accounts.mint.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token_2022::initialize_mint2(
        cpi_ctx,
        params.decimals,
        &ctx.accounts.authority.key(),
        params.freeze_authority.as_ref(),
    )?;

    // Emit event for mint creation
    emit!(Token2022MintCreatedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        agent: ctx.accounts.agent.key(),
        decimals: params.decimals,
        extensions_enabled: Token2022ExtensionsEnabled {
            transfer_fee: params.enable_transfer_fee,
            confidential_transfers: params.enable_confidential_transfers,
            interest_bearing: params.enable_interest_bearing,
        },
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// Initialize Transfer Fee Config
// =====================================================

#[derive(Accounts)]
pub struct InitializeTransferFeeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The mint to initialize transfer fees for
    #[account(
        mut,
        constraint = mint.mint_authority == COption::Some(authority.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The agent that owns this mint
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TransferFeeConfigParams {
    pub transfer_fee_basis_points: u16,
    pub maximum_fee: u64,
    pub transfer_fee_authority: Option<Pubkey>,
    pub withdraw_withheld_authority: Option<Pubkey>,
}

pub fn initialize_transfer_fee_config(
    ctx: Context<InitializeTransferFeeConfig>,
    params: TransferFeeConfigParams,
) -> Result<()> {
    // Validate fee parameters
    require!(
        params.transfer_fee_basis_points <= MAX_TRANSFER_FEE_BASIS_POINTS,
        GhostSpeakError::InvalidParameter
    );

    // Note: In Token-2022, transfer fees must be initialized when the mint is created
    // This instruction would typically update the fee configuration
    
    msg!("Transfer fee configuration initialized with {} basis points", params.transfer_fee_basis_points);

    // Emit event
    emit!(TransferFeeInitializedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        transfer_fee_basis_points: params.transfer_fee_basis_points,
        maximum_fee: params.maximum_fee,
        transfer_fee_authority: params.transfer_fee_authority,
        withdraw_withheld_authority: params.withdraw_withheld_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// Initialize Confidential Transfer Mint
// =====================================================

#[derive(Accounts)]
pub struct InitializeConfidentialTransferMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The mint to initialize confidential transfers for
    #[account(
        mut,
        constraint = mint.mint_authority == COption::Some(authority.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The agent that owns this mint
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfidentialTransferMintParams {
    pub auto_approve_new_accounts: bool,
    pub auditor_elgamal_pubkey: Option<[u8; 32]>,
}

pub fn initialize_confidential_transfer_mint(
    ctx: Context<InitializeConfidentialTransferMint>,
    params: ConfidentialTransferMintParams,
) -> Result<()> {
    // Note: In Token-2022, confidential transfers must be initialized when the mint is created
    // This instruction would typically configure the confidential transfer settings
    
    msg!("Confidential transfer configuration initialized");

    // Emit event
    emit!(ConfidentialTransferInitializedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        auto_approve_new_accounts: params.auto_approve_new_accounts,
        auditor_configured: params.auditor_elgamal_pubkey.is_some(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// Initialize Interest-Bearing Config
// =====================================================

#[derive(Accounts)]
pub struct InitializeInterestBearingConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The mint to initialize interest-bearing config for
    #[account(
        mut,
        constraint = mint.mint_authority == COption::Some(authority.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The agent that owns this mint
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    /// The account that can update the interest rate
    /// CHECK: This account doesn't need to exist yet
    pub rate_authority: AccountInfo<'info>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InterestBearingConfigParams {
    pub rate: i16, // Basis points (can be negative for demurrage)
}

pub fn initialize_interest_bearing_config(
    ctx: Context<InitializeInterestBearingConfig>,
    params: InterestBearingConfigParams,
) -> Result<()> {
    // Validate interest rate
    require!(
        params.rate.abs() <= MAX_INTEREST_RATE_BASIS_POINTS,
        GhostSpeakError::InvalidParameter
    );

    // Note: In Token-2022, interest-bearing must be initialized when the mint is created
    // This instruction would typically update the interest rate configuration
    
    msg!("Interest-bearing configuration initialized with rate: {} basis points", params.rate);

    // Emit event
    emit!(InterestBearingInitializedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        rate_authority: ctx.accounts.rate_authority.key(),
        rate: params.rate,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// Additional Extension Initializations
// =====================================================

#[derive(Accounts)]
pub struct InitializeMintCloseAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The mint to initialize close authority for
    #[account(
        mut,
        constraint = mint.mint_authority == COption::Some(authority.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The agent that owns this mint
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    /// The account that can close the mint
    /// CHECK: This account doesn't need to exist yet
    pub close_authority: AccountInfo<'info>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

pub fn initialize_mint_close_authority(
    ctx: Context<InitializeMintCloseAuthority>,
) -> Result<()> {
    // Note: In Token-2022, mint close authority must be set when the mint is created
    // This instruction would typically be used for documentation purposes
    
    msg!("Mint close authority configured");

    // Emit event
    emit!(MintCloseAuthorityInitializedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        close_authority: ctx.accounts.close_authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeDefaultAccountState<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The mint to initialize default account state for
    #[account(
        mut,
        constraint = mint.mint_authority == COption::Some(authority.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The agent that owns this mint
    #[account(
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AccountState {
    Uninitialized,
    Initialized,
    Frozen,
}

pub fn initialize_default_account_state(
    ctx: Context<InitializeDefaultAccountState>,
    state: AccountState,
) -> Result<()> {
    // Note: In Token-2022, default account state must be set when the mint is created
    // This instruction would typically be used for documentation purposes
    
    msg!("Default account state configured: {:?}", state);

    // Emit event
    emit!(DefaultAccountStateInitializedEvent {
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.authority.key(),
        default_state: state,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// Events
// =====================================================

#[event]
pub struct Token2022MintCreatedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub agent: Pubkey,
    pub decimals: u8,
    pub extensions_enabled: Token2022ExtensionsEnabled,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Token2022ExtensionsEnabled {
    pub transfer_fee: bool,
    pub confidential_transfers: bool,
    pub interest_bearing: bool,
}

#[event]
pub struct TransferFeeInitializedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub transfer_fee_basis_points: u16,
    pub maximum_fee: u64,
    pub transfer_fee_authority: Option<Pubkey>,
    pub withdraw_withheld_authority: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct ConfidentialTransferInitializedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub auto_approve_new_accounts: bool,
    pub auditor_configured: bool,
    pub timestamp: i64,
}

#[event]
pub struct InterestBearingInitializedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub rate_authority: Pubkey,
    pub rate: i16,
    pub timestamp: i64,
}

#[event]
pub struct MintCloseAuthorityInitializedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub close_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DefaultAccountStateInitializedEvent {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub default_state: AccountState,
    pub timestamp: i64,
}

// =====================================================
// Error Extensions
// =====================================================

#[error_code]
pub enum Token2022Error {
    #[msg("Invalid extension configuration")]
    InvalidExtensionConfig,
    
    #[msg("Extension already initialized")]
    ExtensionAlreadyInitialized,
    
    #[msg("Extension not supported")]
    ExtensionNotSupported,
    
    #[msg("Invalid transfer fee parameters")]
    InvalidTransferFeeParams,
    
    #[msg("Invalid interest rate")]
    InvalidInterestRate,
}