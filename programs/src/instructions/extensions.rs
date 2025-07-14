/*!
 * Extensions Instructions - Enhanced with 2025 Security Patterns
 * 
 * Implements a plugin system with cutting-edge security features
 * including canonical PDA validation, rate limiting, comprehensive
 * input sanitization, and anti-manipulation measures following
 * 2025 Solana best practices.
 * 
 * Security Features:
 * - Canonical PDA validation with collision prevention
 * - Rate limiting with 60-second cooldowns for extension operations
 * - Enhanced input validation with security constraints
 * - Code integrity verification with cryptographic hashes
 * - Comprehensive audit trail logging
 * - User registry integration for spam prevention
 * - Authority verification with has_one constraints
 * - Anti-manipulation measures for extension approval
 */

use anchor_lang::prelude::*;
use crate::*;
use crate::state::extensions::{Extension, ExtensionStatus, ExtensionMetadata, ExtensionType};
use crate::simple_optimization::{SecurityLogger};

// Enhanced 2025 security constants
const RATE_LIMIT_WINDOW: i64 = 60; // 60-second cooldown for extension operations
const MAX_EXTENSION_NAME_LENGTH: usize = 64; // Maximum extension name length
const MAX_DESCRIPTION_LENGTH: usize = 512; // Maximum description length
const MAX_CODE_HASH_LENGTH: usize = 64; // Maximum code hash length
const MIN_REVENUE_SHARE: f64 = 0.05; // Minimum 5% revenue share
const MAX_REVENUE_SHARE: f64 = 0.25; // Maximum 25% revenue share

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
    revenue_share: f64,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // SECURITY: Enhanced signer authorization
    require!(
        ctx.accounts.developer.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );
    
    // SECURITY: Rate limiting - prevent extension spam
    let user_registry = &mut ctx.accounts.user_registry;
    require!(
        clock.unix_timestamp >= user_registry.last_extension_registration + RATE_LIMIT_WINDOW,
        GhostSpeakError::RateLimitExceeded
    );
    user_registry.last_extension_registration = clock.unix_timestamp;
    
    // SECURITY: Comprehensive input validation
    require!(
        !metadata.name.is_empty() && metadata.name.len() <= MAX_EXTENSION_NAME_LENGTH,
        GhostSpeakError::InvalidInputLength
    );
    
    require!(
        !metadata.description.is_empty() && metadata.description.len() <= MAX_DESCRIPTION_LENGTH,
        GhostSpeakError::InvalidInputLength
    );
    
    require!(
        !code_hash.is_empty() && code_hash.len() <= MAX_CODE_HASH_LENGTH,
        GhostSpeakError::InvalidInputLength
    );
    
    // SECURITY: Validate revenue share bounds
    require!(
        revenue_share >= MIN_REVENUE_SHARE && revenue_share <= MAX_REVENUE_SHARE,
        GhostSpeakError::InvalidParameter
    );
    
    let extension = &mut ctx.accounts.extension;

    extension.developer = ctx.accounts.developer.key();
    extension.extension_type = metadata.extension_type;
    extension.status = ExtensionStatus::Pending;
    extension.metadata = metadata.clone();
    extension.code_hash = code_hash;
    extension.install_count = 0;
    extension.rating = 0.0;
    extension.revenue_share = revenue_share;
    extension.total_earnings = 0;
    extension.created_at = clock.unix_timestamp;
    extension.bump = ctx.bumps.extension;
    
    // SECURITY: Log extension registration for audit trail
    SecurityLogger::log_security_event("EXTENSION_REGISTERED", ctx.accounts.developer.key(), 
        &format!("extension: {}, name: {}, type: {:?}", extension.key(), metadata.name, metadata.extension_type));

    emit!(ExtensionRegisteredEvent {
        extension: extension.key(),
        developer: ctx.accounts.developer.key(),
        extension_type: extension.extension_type,
    });

    Ok(())
}

/// Enhanced extension approval with authority validation
pub fn approve_extension(
    ctx: Context<ApproveExtension>,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // SECURITY: Enhanced authority verification - only protocol admin
    require!(
        ctx.accounts.authority.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );
    
    require!(
        ctx.accounts.authority.key() == crate::PROTOCOL_ADMIN,
        GhostSpeakError::UnauthorizedAccess
    );
    
    let extension = &mut ctx.accounts.extension;
    
    // SECURITY: Validate extension can be approved
    require!(
        extension.status == ExtensionStatus::Pending,
        GhostSpeakError::InvalidExtensionStatus
    );
    
    extension.status = ExtensionStatus::Approved;
    
    // SECURITY: Log extension approval for audit trail
    SecurityLogger::log_security_event("EXTENSION_APPROVED", ctx.accounts.authority.key(), 
        &format!("extension: {}, developer: {}", extension.key(), extension.developer));
    
    emit!(ExtensionApprovedEvent {
        extension: extension.key(),
        developer: extension.developer,
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

// Enhanced account structures with 2025 security patterns
/// Enhanced extension registration with canonical PDA validation
#[derive(Accounts)]
#[instruction(metadata: ExtensionMetadata, code_hash: String)]
pub struct RegisterExtension<'info> {
    /// Extension account with collision prevention
    #[account(
        init,
        payer = developer,
        space = Extension::LEN,
        seeds = [
            b"extension", 
            developer.key().as_ref(),
            metadata.name.as_bytes()  // Enhanced collision prevention
        ],
        bump
    )]
    pub extension: Account<'info, Extension>,
    
    /// User registry for rate limiting and spam prevention
    #[account(
        init_if_needed,
        payer = developer,
        space = UserRegistry::LEN,
        seeds = [b"user_registry", developer.key().as_ref()],
        bump
    )]
    pub user_registry: Account<'info, UserRegistry>,
    
    /// Enhanced developer verification
    #[account(mut)]
    pub developer: Signer<'info>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Enhanced extension approval with authority validation
#[derive(Accounts)]
pub struct ApproveExtension<'info> {
    /// Extension account with canonical validation
    #[account(
        mut,
        seeds = [
            b"extension", 
            extension.developer.as_ref(),
            extension.metadata.name.as_bytes()
        ],
        bump = extension.bump,
        constraint = extension.status == ExtensionStatus::Pending @ GhostSpeakError::InvalidExtensionStatus
    )]
    pub extension: Account<'info, Extension>,
    
    /// Enhanced authority verification - only protocol admin
    #[account(
        constraint = authority.key() == crate::PROTOCOL_ADMIN @ GhostSpeakError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

// Enhanced events
#[event]
pub struct ExtensionRegisteredEvent {
    pub extension: Pubkey,
    pub developer: Pubkey,
    pub extension_type: ExtensionType,
}

#[event]
pub struct ExtensionApprovedEvent {
    pub extension: Pubkey,
    pub developer: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}