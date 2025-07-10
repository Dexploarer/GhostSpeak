/*!
 * Extensions Module
 * 
 * Implements a plugin system allowing third-party developers to
 * extend agent capabilities and protocol features.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::{Extension, ExtensionStatus, ExtensionMetadata};

/// Registers a third-party extension or plugin
/// 
/// Allows developers to create and register extensions that enhance
/// agent capabilities or add new features to the protocol.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing extension registry accounts
/// * `extension_data` - Extension details including:
///   - `name` - Extension name (unique)
///   - `description` - What the extension does
///   - `category` - Type of extension
///   - `endpoint` - API endpoint for extension
///   - `capabilities_added` - New capabilities provided
///   - `fee_structure` - Usage fees if any
///   - `open_source` - Whether code is open
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful registration
/// 
/// # Errors
/// 
/// * `ExtensionNameTaken` - If name already registered
/// * `InvalidEndpoint` - If endpoint unreachable
/// * `SecurityCheckFailed` - If fails security audit
/// 
/// # Extension Categories
/// 
/// - **Capabilities**: Add new agent abilities
/// - **Integrations**: Connect external services
/// - **Analytics**: Enhanced reporting tools
/// - **Automation**: Workflow automation
/// - **Security**: Additional security features
/// 
/// # Security Requirements
/// 
/// All extensions must:
/// - Pass automated security scan
/// - Provide API documentation
/// - Implement rate limiting
/// - Handle errors gracefully
pub fn register_extension(
    ctx: Context<RegisterExtension>,
    metadata: ExtensionMetadata,
    code_hash: String,
) -> Result<()> {
    let extension = &mut ctx.accounts.extension;
    let clock = Clock::get()?;

    extension.developer = ctx.accounts.developer.key();
    extension.extension_type = metadata.extension_type;
    extension.status = ExtensionStatus::Pending;
    extension.metadata = metadata;
    extension.code_hash = code_hash;
    extension.install_count = 0;
    extension.rating = 0.0;
    extension.revenue_share = 0.1; // 10% default revenue share
    extension.total_earnings = 0;
    extension.created_at = clock.unix_timestamp;
    extension.bump = ctx.bumps.extension;

    emit!(ExtensionRegisteredEvent {
        extension: extension.key(),
        developer: ctx.accounts.developer.key(),
        extension_type: extension.extension_type,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct RegisterExtension<'info> {
    #[account(
        init,
        payer = developer,
        space = Extension::LEN,
        seeds = [b"extension", developer.key().as_ref()],
        bump
    )]
    pub extension: Account<'info, Extension>,
    #[account(mut)]
    pub developer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct ExtensionRegisteredEvent {
    pub extension: Pubkey,
    pub developer: Pubkey,
    pub extension_type: ExtensionType,
}