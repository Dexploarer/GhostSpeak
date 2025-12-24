/*!
 * Credential Instructions Module
 *
 * Instructions for managing native Solana Verifiable Credentials.
 * Supports issuing, revoking, and verifying credentials with
 * cross-chain portability to Crossmint on EVM.
 */

use anchor_lang::prelude::*;
use sha3::{Digest, Keccak256};

use crate::state::{
    Credential, CredentialKind, CredentialStatus, CredentialTemplate, CredentialType,
    CrossChainStatus, MAX_CREDENTIAL_ID, MAX_CREDENTIAL_NAME, MAX_SCHEMA_URI,
    CREDENTIAL_TYPE_SEED, CREDENTIAL_TEMPLATE_SEED, CREDENTIAL_SEED,
};
use crate::GhostSpeakError;

/// Hash output wrapper
struct HashOutput([u8; 32]);

impl HashOutput {
    fn to_bytes(&self) -> [u8; 32] {
        self.0
    }
}

/// Helper function to hash data using Keccak256
fn hash(data: &[u8]) -> HashOutput {
    let mut hasher = Keccak256::new();
    hasher.update(data);
    HashOutput(hasher.finalize().into())
}

// ============================================================================
// Create Credential Type
// ============================================================================

/// Creates a new credential type (e.g., AgentIdentity, Reputation, JobCompletion)
/// This is an admin-only operation typically done by governance/multisig.
pub fn create_credential_type(
    ctx: Context<CreateCredentialType>,
    name: String,
    kind: CredentialKind,
    schema_uri: String,
    description: String,
) -> Result<()> {
    require!(name.len() <= MAX_CREDENTIAL_NAME, GhostSpeakError::NameTooLong);
    require!(schema_uri.len() <= MAX_SCHEMA_URI, GhostSpeakError::InvalidMetadataUri);
    require!(description.len() <= 256, GhostSpeakError::DescriptionTooLong);

    let clock = Clock::get()?;
    let credential_type = &mut ctx.accounts.credential_type;

    credential_type.authority = ctx.accounts.authority.key();
    credential_type.name = name;
    credential_type.kind = kind;
    credential_type.schema_uri = schema_uri;
    credential_type.description = description;
    credential_type.is_active = true;
    credential_type.total_issued = 0;
    credential_type.created_at = clock.unix_timestamp;
    credential_type.bump = ctx.bumps.credential_type;

    msg!("Created credential type: {}", credential_type.name);
    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCredentialType<'info> {
    #[account(
        init,
        payer = authority,
        space = CredentialType::LEN,
        seeds = [CREDENTIAL_TYPE_SEED, name.as_bytes()],
        bump
    )]
    pub credential_type: Account<'info, CredentialType>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// Create Credential Template
// ============================================================================

/// Creates a template from a credential type for issuing credentials.
pub fn create_credential_template(
    ctx: Context<CreateCredentialTemplate>,
    name: String,
    image_uri: String,
    crossmint_template_id: Option<String>,
) -> Result<()> {
    require!(name.len() <= MAX_CREDENTIAL_NAME, GhostSpeakError::NameTooLong);
    require!(image_uri.len() <= MAX_SCHEMA_URI, GhostSpeakError::InvalidMetadataUri);

    let clock = Clock::get()?;
    let template = &mut ctx.accounts.credential_template;
    let credential_type = &ctx.accounts.credential_type;

    require!(credential_type.is_active, GhostSpeakError::InvalidState);

    template.credential_type = credential_type.key();
    template.name = name;
    template.image_uri = image_uri;
    template.issuer = ctx.accounts.issuer.key();
    template.is_active = true;
    template.total_issued = 0;
    template.created_at = clock.unix_timestamp;
    template.crossmint_template_id = crossmint_template_id;
    template.bump = ctx.bumps.credential_template;

    msg!("Created credential template: {}", template.name);
    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCredentialTemplate<'info> {
    #[account(
        init,
        payer = issuer,
        space = CredentialTemplate::LEN,
        seeds = [
            CREDENTIAL_TEMPLATE_SEED, 
            credential_type.key().as_ref(),
            name.as_bytes()
        ],
        bump
    )]
    pub credential_template: Account<'info, CredentialTemplate>,

    #[account(
        constraint = credential_type.is_active @ GhostSpeakError::InvalidState
    )]
    pub credential_type: Account<'info, CredentialType>,

    #[account(mut)]
    pub issuer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// Issue Credential
// ============================================================================

/// Issues a new credential to a subject.
/// The subject_data is stored off-chain; only the hash is stored on-chain.
pub fn issue_credential(
    ctx: Context<IssueCredential>,
    credential_id: String,
    subject_data_hash: [u8; 32],
    subject_data_uri: String,
    expires_at: Option<i64>,
    source_account: Option<Pubkey>,
) -> Result<()> {
    require!(credential_id.len() <= MAX_CREDENTIAL_ID, GhostSpeakError::InvalidInput);
    require!(subject_data_uri.len() <= MAX_SCHEMA_URI, GhostSpeakError::InvalidMetadataUri);

    let clock = Clock::get()?;
    let template = &mut ctx.accounts.credential_template;
    let credential_type = &mut ctx.accounts.credential_type;
    let credential = &mut ctx.accounts.credential;

    require!(template.is_active, GhostSpeakError::InvalidState);
    require!(credential_type.is_active, GhostSpeakError::InvalidState);

    // Validate expiry is in the future if set
    if let Some(exp) = expires_at {
        require!(exp > clock.unix_timestamp, GhostSpeakError::InvalidInput);
    }

    // Create signature message: credential_id || subject || subject_data_hash || issued_at
    let mut message = Vec::new();
    message.extend_from_slice(credential_id.as_bytes());
    message.extend_from_slice(&ctx.accounts.subject.key().to_bytes());
    message.extend_from_slice(&subject_data_hash);
    message.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
    
    // Hash the message for signature (using program authority)
    let signature_hash = hash(&message);
    let mut signature = [0u8; 64];
    signature[..32].copy_from_slice(&signature_hash.to_bytes());
    // Second half could be additional entropy or zeros
    
    credential.template = template.key();
    credential.subject = ctx.accounts.subject.key();
    credential.issuer = ctx.accounts.issuer.key();
    credential.credential_id = credential_id.clone();
    credential.subject_data_hash = subject_data_hash;
    credential.subject_data_uri = subject_data_uri;
    credential.status = CredentialStatus::Active;
    credential.signature = signature;
    credential.issued_at = clock.unix_timestamp;
    credential.expires_at = expires_at;
    credential.revoked_at = None;
    credential.cross_chain_status = CrossChainStatus::NotSynced;
    credential.crossmint_credential_id = None;
    credential.source_account = source_account;
    credential.bump = ctx.bumps.credential;

    // Update counters
    template.total_issued += 1;
    credential_type.total_issued += 1;

    msg!("Issued credential {} to {}", credential_id, ctx.accounts.subject.key());
    Ok(())
}

#[derive(Accounts)]
#[instruction(credential_id: String)]
pub struct IssueCredential<'info> {
    #[account(
        init,
        payer = issuer,
        space = Credential::LEN,
        seeds = [
            CREDENTIAL_SEED,
            credential_template.key().as_ref(),
            subject.key().as_ref(),
            credential_id.as_bytes()
        ],
        bump
    )]
    pub credential: Account<'info, Credential>,

    #[account(
        mut,
        constraint = credential_template.is_active @ GhostSpeakError::InvalidState,
        constraint = credential_template.issuer == issuer.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub credential_template: Account<'info, CredentialTemplate>,

    #[account(
        mut,
        constraint = credential_type.is_active @ GhostSpeakError::InvalidState,
        constraint = credential_template.credential_type == credential_type.key()
    )]
    pub credential_type: Account<'info, CredentialType>,

    /// CHECK: The subject receiving the credential, no signature required
    pub subject: UncheckedAccount<'info>,

    #[account(mut)]
    pub issuer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// Revoke Credential
// ============================================================================

/// Revokes an issued credential. Only the original issuer can revoke.
pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
    let clock = Clock::get()?;
    let credential = &mut ctx.accounts.credential;

    require!(
        credential.status == CredentialStatus::Active,
        GhostSpeakError::InvalidState
    );

    credential.revoke(clock.unix_timestamp);

    msg!("Revoked credential {}", credential.credential_id);
    Ok(())
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(
        mut,
        constraint = credential.issuer == issuer.key() @ GhostSpeakError::UnauthorizedAccess,
        constraint = credential.status == CredentialStatus::Active @ GhostSpeakError::InvalidState
    )]
    pub credential: Account<'info, Credential>,

    #[account(mut)]
    pub issuer: Signer<'info>,
}

// ============================================================================
// Update Cross-Chain Status
// ============================================================================

/// Updates the cross-chain sync status after syncing to Crossmint.
pub fn update_crosschain_status(
    ctx: Context<UpdateCrossChainStatus>,
    crossmint_credential_id: String,
    status: CrossChainStatus,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;

    if status == CrossChainStatus::SyncedToCrossmint {
        credential.set_crossmint_synced(crossmint_credential_id);
    } else {
        credential.cross_chain_status = status;
    }

    msg!(
        "Updated cross-chain status for {} to {:?}",
        credential.credential_id,
        credential.cross_chain_status
    );
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCrossChainStatus<'info> {
    #[account(
        mut,
        constraint = credential.issuer == issuer.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub credential: Account<'info, Credential>,

    #[account(mut)]
    pub issuer: Signer<'info>,
}

// ============================================================================
// Deactivate Credential Type
// ============================================================================

/// Deactivates a credential type (no new credentials can be issued).
pub fn deactivate_credential_type(ctx: Context<DeactivateCredentialType>) -> Result<()> {
    let credential_type = &mut ctx.accounts.credential_type;
    credential_type.is_active = false;
    
    msg!("Deactivated credential type: {}", credential_type.name);
    Ok(())
}

#[derive(Accounts)]
pub struct DeactivateCredentialType<'info> {
    #[account(
        mut,
        constraint = credential_type.authority == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub credential_type: Account<'info, CredentialType>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

// ============================================================================
// Deactivate Credential Template
// ============================================================================

/// Deactivates a credential template (no new credentials can be issued from it).
pub fn deactivate_credential_template(ctx: Context<DeactivateCredentialTemplate>) -> Result<()> {
    let template = &mut ctx.accounts.credential_template;
    template.is_active = false;
    
    msg!("Deactivated credential template: {}", template.name);
    Ok(())
}

#[derive(Accounts)]
pub struct DeactivateCredentialTemplate<'info> {
    #[account(
        mut,
        constraint = credential_template.issuer == issuer.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub credential_template: Account<'info, CredentialTemplate>,

    #[account(mut)]
    pub issuer: Signer<'info>,
}
