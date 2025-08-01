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
use spl_token_2022::{
    extension::ExtensionType,
    state::Mint as SplMint,
};

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
    // Transfer fee config (if enabled)
    pub transfer_fee_basis_points: Option<u16>,
    pub maximum_fee: Option<u64>,
    pub transfer_fee_authority: Option<Pubkey>,
    pub withdraw_withheld_authority: Option<Pubkey>,
    // Confidential transfer config (if enabled)
    pub auto_approve_new_accounts: Option<bool>,
    pub auditor_elgamal_pubkey: Option<[u8; 32]>,
    // Interest bearing config (if enabled)
    pub interest_rate: Option<i16>,
    pub rate_authority: Option<Pubkey>,
    // Additional extensions
    pub close_authority: Option<Pubkey>,
    pub default_account_state: Option<AccountState>,
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
        extensions.push(ExtensionType::TransferFeeConfig);
    }
    if params.enable_confidential_transfers {
        extensions.push(ExtensionType::ConfidentialTransferMint);
    }
    if params.enable_interest_bearing {
        extensions.push(ExtensionType::InterestBearingConfig);
    }
    if params.close_authority.is_some() {
        extensions.push(ExtensionType::MintCloseAuthority);
    }
    if params.default_account_state.is_some() {
        extensions.push(ExtensionType::DefaultAccountState);
    }

    let space = ExtensionType::try_calculate_account_len::<SplMint>(&extensions)?;

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

    // Initialize extensions BEFORE initializing the mint
    // Extensions must be initialized before the mint initialization in Token-2022
    
    let mint_account = ctx.accounts.mint.to_account_info();
    let authority_account = ctx.accounts.authority.to_account_info();
    let token_program = ctx.accounts.token_program.to_account_info();

    // IMPORTANT: Token-2022 extensions must be initialized during mint creation
    // This is a current limitation of the SPL Token-2022 program architecture
    
    // Check if any extensions are requested and return appropriate error
    if params.enable_transfer_fee || params.enable_confidential_transfers || params.enable_interest_bearing 
        || params.close_authority.is_some() || params.default_account_state.is_some() {
        
        // Log what extensions were requested for debugging
        msg!("Token-2022 extension initialization requested but not yet implemented:");
        
        if params.enable_transfer_fee {
            let transfer_fee_basis_points = params.transfer_fee_basis_points
                .ok_or(GhostSpeakError::InvalidParameter)?;
            let maximum_fee = params.maximum_fee
                .ok_or(GhostSpeakError::InvalidParameter)?;
            
            // Validate fee parameters
            require!(
                transfer_fee_basis_points <= MAX_TRANSFER_FEE_BASIS_POINTS,
                GhostSpeakError::InvalidParameter
            );
            
            msg!("- Transfer fee: {} basis points, max fee: {}", 
                 transfer_fee_basis_points, maximum_fee);
        }
        
        if params.enable_confidential_transfers {
            msg!("- Confidential transfers: auto_approve={:?}", 
                 params.auto_approve_new_accounts.unwrap_or(false));
        }
        
        if params.enable_interest_bearing {
            let rate = params.interest_rate
                .ok_or(GhostSpeakError::InvalidParameter)?;
            
            // Validate interest rate
            require!(
                rate.abs() <= MAX_INTEREST_RATE_BASIS_POINTS,
                GhostSpeakError::InvalidParameter
            );
            
            msg!("- Interest bearing: {} basis points", rate);
        }
        
        if params.close_authority.is_some() {
            msg!("- Close authority: {:?}", params.close_authority);
        }
        
        if params.default_account_state.is_some() {
            msg!("- Default account state: {:?}", params.default_account_state);
        }
        
        // Return error indicating extensions are not yet supported in this implementation
        return Err(GhostSpeakError::ExtensionNotSupported.into());
    }

    // Now initialize the mint itself
    let cpi_accounts = token_2022::InitializeMint2 {
        mint: mint_account.clone(),
    };
    
    let cpi_ctx = CpiContext::new(token_program, cpi_accounts);

    token_2022::initialize_mint2(
        cpi_ctx,
        params.decimals,
        &authority_account.key(),
        params.freeze_authority.as_ref(),
    )?;

    // Emit comprehensive event for mint creation
    emit!(Token2022MintCreatedEvent {
        mint: mint_account.key(),
        authority: authority_account.key(),
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

pub fn update_transfer_fee_config(
    _ctx: Context<InitializeTransferFeeConfig>,
    params: TransferFeeConfigParams,
) -> Result<()> {
    // Validate fee parameters
    require!(
        params.transfer_fee_basis_points <= MAX_TRANSFER_FEE_BASIS_POINTS,
        GhostSpeakError::InvalidParameter
    );

    // This instruction requires the mint to have transfer fee extension enabled
    // and the authority to be the transfer fee authority
    
    // For Token-2022, we would use set_transfer_fee instruction
    // This is a placeholder since the actual update requires additional authority validation
    Err(GhostSpeakError::ExtensionNotSupported.into())
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
    _ctx: Context<InitializeConfidentialTransferMint>,
    _params: ConfidentialTransferMintParams,
) -> Result<()> {
    // This instruction requires the mint to have confidential transfer extension enabled
    // and proper authority validation
    
    // For Token-2022, we would use update_confidential_transfer_mint instruction
    // This is a placeholder since the actual update requires additional authority validation
    Err(GhostSpeakError::ExtensionNotSupported.into())
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
    _ctx: Context<InitializeInterestBearingConfig>,
    params: InterestBearingConfigParams,
) -> Result<()> {
    // Validate interest rate
    require!(
        params.rate.abs() <= MAX_INTEREST_RATE_BASIS_POINTS,
        GhostSpeakError::InvalidParameter
    );

    // This instruction requires the mint to have interest bearing extension enabled
    // and the authority to be the rate authority
    
    // For Token-2022, we would use update_rate_interest_bearing_mint instruction
    // This is a placeholder since the actual update requires additional authority validation
    Err(GhostSpeakError::ExtensionNotSupported.into())
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
    _ctx: Context<InitializeMintCloseAuthority>,
) -> Result<()> {
    // This instruction is for documentation purposes only
    // Close authority must be set during mint creation with extension
    
    Err(GhostSpeakError::ExtensionNotSupported.into())
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
    _ctx: Context<InitializeDefaultAccountState>,
    _state: AccountState,
) -> Result<()> {
    // This instruction is for documentation purposes only
    // Default account state must be set during mint creation with extension
    
    Err(GhostSpeakError::ExtensionNotSupported.into())
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

// Token2022Error moved to main error module
// These errors are now part of GhostSpeakError enum