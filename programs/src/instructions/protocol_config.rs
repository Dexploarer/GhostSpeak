/*!
 * Protocol Configuration Instructions
 *
 * Instructions for initializing and updating the global protocol configuration.
 * This includes fee rates and treasury addresses.
 *
 * NOTE: Fee infrastructure is in place but all fees are set to 0 during devnet.
 * Fees will be enabled via governance after mainnet deployment.
 */

use crate::state::protocol_config::{ProtocolConfig, ProtocolConfigUpdatedEvent};
use crate::GhostSpeakError;
use anchor_lang::prelude::*;

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

/// Initialize the global protocol configuration
///
/// This should be called once during program deployment to set up
/// the fee infrastructure (with fees initially disabled).
#[derive(Accounts)]
pub struct InitializeProtocolConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::LEN,
        seeds = [b"protocol_config"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// Authority who will control the config (typically DAO or multisig)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Treasury wallet to receive protocol fees
    /// CHECK: This is just a pubkey stored in config
    pub treasury: UncheckedAccount<'info>,

    /// Buyback pool wallet for token buybacks
    /// CHECK: This is just a pubkey stored in config
    pub buyback_pool: UncheckedAccount<'info>,

    /// Moderator pool for dispute fees
    /// CHECK: This is just a pubkey stored in config
    pub moderator_pool: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Update protocol configuration (authority only)
#[derive(Accounts)]
pub struct UpdateProtocolConfig<'info> {
    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ GhostSpeakError::UnauthorizedAccess,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub authority: Signer<'info>,
}

/// Enable production fees (authority only)
///
/// This instruction enables the full fee structure for mainnet.
/// Should only be called after governance approval.
#[derive(Accounts)]
pub struct EnableProtocolFees<'info> {
    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump = config.bump,
        constraint = config.authority == authority.key() @ GhostSpeakError::UnauthorizedAccess,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub authority: Signer<'info>,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Initializes the global protocol configuration with fees disabled
///
/// This instruction sets up the fee infrastructure for the protocol.
/// All fees are initially set to 0 for devnet testing. After mainnet
/// deployment and governance approval, call `enable_protocol_fees` to
/// activate the fee structure.
///
/// # Arguments
///
/// * `ctx` - The context containing config and wallet accounts
///
/// # Fee Structure (Initially Disabled)
///
/// | Fee Type | Target Rate | Distribution |
/// |----------|-------------|--------------|
/// | Escrow | 0.5% | 80% Treasury, 20% Buyback |
/// | Agent Registration | 0.01 SOL | Treasury |
/// | Marketplace Listing | 0.001 SOL | Treasury |
/// | Dispute Resolution | 1% | Moderator Pool |
pub fn initialize_protocol_config(ctx: Context<InitializeProtocolConfig>) -> Result<()> {
    msg!("Initializing protocol configuration (fees disabled for devnet)");

    let config = &mut ctx.accounts.config;
    config.initialize(
        ctx.accounts.authority.key(),
        ctx.accounts.treasury.key(),
        ctx.accounts.buyback_pool.key(),
        ctx.accounts.moderator_pool.key(),
        ctx.bumps.config,
    )?;

    msg!("Protocol config initialized successfully");
    msg!("  Treasury: {}", ctx.accounts.treasury.key());
    msg!("  Buyback Pool: {}", ctx.accounts.buyback_pool.key());
    msg!("  Moderator Pool: {}", ctx.accounts.moderator_pool.key());
    msg!("  Fees Enabled: false (set to 0 until mainnet)");

    Ok(())
}

/// Enables production fees after mainnet governance approval
///
/// This activates the full fee structure:
/// - Escrow: 0.5% (50 bps) → 80% Treasury, 20% Buyback
/// - Agent Registration: 0.01 SOL
/// - Marketplace Listing: 0.001 SOL
/// - Dispute Resolution: 1% (100 bps)
///
/// # Security
///
/// Only the config authority (DAO/multisig) can call this.
pub fn enable_protocol_fees(ctx: Context<EnableProtocolFees>) -> Result<()> {
    msg!("Enabling production fees for mainnet");

    let config = &mut ctx.accounts.config;
    config.enable_production_fees()?;

    emit!(ProtocolConfigUpdatedEvent {
        authority: ctx.accounts.authority.key(),
        fees_enabled: true,
        escrow_fee_bps: config.escrow_fee_bps,
        agent_registration_fee: config.agent_registration_fee,
        listing_fee: config.listing_fee,
        dispute_fee_bps: config.dispute_fee_bps,
        timestamp: config.updated_at,
    });

    msg!("Production fees enabled:");
    msg!(
        "  Escrow Fee: {}bps (0.{}%)",
        config.escrow_fee_bps,
        config.escrow_fee_bps
    );
    msg!(
        "  Agent Registration: {} lamports",
        config.agent_registration_fee
    );
    msg!("  Listing Fee: {} lamports", config.listing_fee);
    msg!("  Dispute Fee: {}bps", config.dispute_fee_bps);

    Ok(())
}

/// Updates protocol configuration parameters
///
/// Allows the authority to update fee rates and wallet addresses.
///
/// # Arguments
///
/// * `ctx` - The context containing config account
/// * `params` - New configuration parameters
pub fn update_protocol_config(
    ctx: Context<UpdateProtocolConfig>,
    escrow_fee_bps: Option<u16>,
    agent_registration_fee: Option<u64>,
    listing_fee: Option<u64>,
    dispute_fee_bps: Option<u16>,
    fees_enabled: Option<bool>,
    treasury: Option<Pubkey>,
    buyback_pool: Option<Pubkey>,
    moderator_pool: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(fee) = escrow_fee_bps {
        require!(fee <= 1000, GhostSpeakError::InvalidConfiguration); // Max 10%
        config.escrow_fee_bps = fee;
    }

    if let Some(fee) = agent_registration_fee {
        config.agent_registration_fee = fee;
    }

    if let Some(fee) = listing_fee {
        config.listing_fee = fee;
    }

    if let Some(fee) = dispute_fee_bps {
        require!(fee <= 1000, GhostSpeakError::InvalidConfiguration); // Max 10%
        config.dispute_fee_bps = fee;
    }

    if let Some(enabled) = fees_enabled {
        config.fees_enabled = enabled;
    }

    if let Some(addr) = treasury {
        config.treasury = addr;
    }

    if let Some(addr) = buyback_pool {
        config.buyback_pool = addr;
    }

    if let Some(addr) = moderator_pool {
        config.moderator_pool = addr;
    }

    config.updated_at = Clock::get()?.unix_timestamp;

    emit!(ProtocolConfigUpdatedEvent {
        authority: ctx.accounts.authority.key(),
        fees_enabled: config.fees_enabled,
        escrow_fee_bps: config.escrow_fee_bps,
        agent_registration_fee: config.agent_registration_fee,
        listing_fee: config.listing_fee,
        dispute_fee_bps: config.dispute_fee_bps,
        timestamp: config.updated_at,
    });

    msg!("Protocol config updated");
    Ok(())
}
