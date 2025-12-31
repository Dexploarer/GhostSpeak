/*!
 * DID (Decentralized Identifier) Instructions
 *
 * Implements instruction handlers for DID operations following the did:sol specification.
 * All handlers use canonical PDA validation and comprehensive security checks.
 */

use crate::state::did::*;
use crate::GhostSpeakError;
use crate::*;
use anchor_lang::prelude::*;

/// Create a new DID document
#[derive(Accounts)]
#[instruction(did_string: String)]
pub struct CreateDidDocument<'info> {
    /// DID document account with canonical PDA
    #[account(
        init,
        payer = controller,
        space = DidDocument::LEN,
        seeds = [
            DID_DOCUMENT_SEED,
            controller.key().as_ref()
        ],
        bump
    )]
    pub did_document: Account<'info, DidDocument>,

    /// Controller of the DID (owner)
    #[account(mut)]
    pub controller: Signer<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Update an existing DID document
#[derive(Accounts)]
pub struct UpdateDidDocument<'info> {
    /// DID document account with canonical PDA validation
    #[account(
        mut,
        seeds = [
            DID_DOCUMENT_SEED,
            controller.key().as_ref()
        ],
        bump = did_document.bump,
        constraint = did_document.controller == controller.key() @ DidError::UnauthorizedDidOperation,
        constraint = did_document.is_active() @ DidError::DidDeactivated
    )]
    pub did_document: Account<'info, DidDocument>,

    /// Controller of the DID (must match document controller)
    #[account(mut)]
    pub controller: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Deactivate a DID document
#[derive(Accounts)]
pub struct DeactivateDidDocument<'info> {
    /// DID document account with canonical PDA validation
    #[account(
        mut,
        seeds = [
            DID_DOCUMENT_SEED,
            controller.key().as_ref()
        ],
        bump = did_document.bump,
        constraint = did_document.controller == controller.key() @ DidError::UnauthorizedDidOperation,
        constraint = did_document.is_active() @ DidError::AlreadyDeactivated
    )]
    pub did_document: Account<'info, DidDocument>,

    /// Controller of the DID (must match document controller)
    #[account(mut)]
    pub controller: Signer<'info>,

    /// Clock sysvar for timestamp validation
    pub clock: Sysvar<'info, Clock>,
}

/// Resolve a DID document (read-only operation)
#[derive(Accounts)]
pub struct ResolveDidDocument<'info> {
    /// DID document account
    #[account(
        seeds = [
            DID_DOCUMENT_SEED,
            did_controller.key().as_ref()
        ],
        bump = did_document.bump
    )]
    pub did_document: Account<'info, DidDocument>,

    /// Controller public key (used for PDA derivation)
    /// CHECK: This is safe as we only use it for PDA seeds
    pub did_controller: UncheckedAccount<'info>,
}

/// Create a DID document for an agent or user
///
/// # Arguments
/// * `ctx` - Accounts context
/// * `did_string` - The DID string (e.g., "did:sol:devnet:...")
/// * `verification_methods` - Initial verification methods
/// * `service_endpoints` - Initial service endpoints
///
/// # Security
/// - Validates DID format
/// - Ensures controller authorization
/// - Initializes with secure defaults
pub fn create_did_document(
    ctx: Context<CreateDidDocument>,
    did_string: String,
    verification_methods: Vec<VerificationMethod>,
    service_endpoints: Vec<ServiceEndpoint>,
) -> Result<()> {
    let did_document = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    // Validate DID format (did:sol:network:pubkey)
    require!(
        did_string.starts_with("did:sol:"),
        DidError::InvalidDidFormat
    );

    // Validate verification methods count
    require!(
        verification_methods.len() <= MAX_VERIFICATION_METHODS,
        DidError::TooManyVerificationMethods
    );

    // Validate service endpoints count
    require!(
        service_endpoints.len() <= MAX_SERVICE_ENDPOINTS,
        DidError::TooManyServiceEndpoints
    );

    // Initialize DID document
    did_document.did = did_string.clone();
    did_document.controller = ctx.accounts.controller.key();
    did_document.verification_methods = verification_methods;
    did_document.service_endpoints = service_endpoints;

    // Set W3C context
    did_document.context = vec![
        "https://www.w3.org/ns/did/v1".to_string(),
        "https://w3id.org/security/suites/ed25519-2020/v1".to_string(),
    ];

    did_document.also_known_as = Vec::new();
    did_document.created_at = clock.unix_timestamp;
    did_document.updated_at = clock.unix_timestamp;
    did_document.version = 1;
    did_document.deactivated = false;
    did_document.deactivated_at = None;
    did_document.bump = ctx.bumps.did_document;

    msg!(
        "DID document created: {} by controller: {}",
        did_string,
        ctx.accounts.controller.key()
    );

    Ok(())
}

/// Update a DID document by adding/removing verification methods or services
///
/// # Arguments
/// * `add_verification_method` - Optional verification method to add
/// * `remove_verification_method_id` - Optional method ID to remove
/// * `add_service_endpoint` - Optional service endpoint to add
/// * `remove_service_endpoint_id` - Optional service ID to remove
///
/// # Security
/// - Only controller can update
/// - Version number incremented
/// - Timestamp updated
pub fn update_did_document(
    ctx: Context<UpdateDidDocument>,
    add_verification_method: Option<VerificationMethod>,
    remove_verification_method_id: Option<String>,
    add_service_endpoint: Option<ServiceEndpoint>,
    remove_service_endpoint_id: Option<String>,
) -> Result<()> {
    let did_document = &mut ctx.accounts.did_document;

    // Add verification method if provided
    if let Some(method) = add_verification_method {
        did_document.add_verification_method(method)?;
    }

    // Remove verification method if provided
    if let Some(method_id) = remove_verification_method_id {
        did_document.remove_verification_method(&method_id)?;
    }

    // Add service endpoint if provided
    if let Some(service) = add_service_endpoint {
        did_document.add_service_endpoint(service)?;
    }

    // Remove service endpoint if provided
    if let Some(service_id) = remove_service_endpoint_id {
        did_document.remove_service_endpoint(&service_id)?;
    }

    msg!(
        "DID document updated: {} (version: {})",
        did_document.did,
        did_document.version
    );

    Ok(())
}

/// Deactivate a DID document
///
/// # Security
/// - Only controller can deactivate
/// - Deactivation is irreversible
/// - Timestamp recorded
pub fn deactivate_did_document(ctx: Context<DeactivateDidDocument>) -> Result<()> {
    let did_document = &mut ctx.accounts.did_document;

    // Deactivate the DID
    did_document.deactivate()?;

    msg!(
        "DID document deactivated: {} at {}",
        did_document.did,
        did_document.deactivated_at.unwrap()
    );

    Ok(())
}

/// Resolve a DID document (read-only query)
///
/// This is primarily used for off-chain resolution.
/// The actual resolution is done by reading the account data.
///
/// # Returns
/// The DID document data is returned via the account context
pub fn resolve_did_document(_ctx: Context<ResolveDidDocument>) -> Result<()> {
    // Resolution is implicit - the account data is returned
    // This instruction exists for compatibility with standard DID resolution flows
    Ok(())
}

/// Helper function to generate a did:sol string from a public key
pub fn generate_did_string(network: &str, pubkey: &Pubkey) -> String {
    format!("did:sol:{}:{}", network, pubkey.to_string())
}

/// Validate DID string format
pub fn validate_did_string(did: &str) -> Result<()> {
    // Must start with did:sol:
    require!(did.starts_with("did:sol:"), DidError::InvalidDidFormat);

    // Split into parts
    let parts: Vec<&str> = did.split(':').collect();

    // Must have 4 parts: did, sol, network, identifier
    require!(parts.len() == 4, DidError::InvalidDidFormat);

    // Validate network (mainnet-beta, devnet, testnet, or localnet)
    let valid_networks = ["mainnet-beta", "devnet", "testnet", "localnet"];
    require!(
        valid_networks.contains(&parts[2]),
        DidError::InvalidDidFormat
    );

    // Validate identifier is a valid base58 string (Solana pubkey)
    require!(
        bs58::decode(parts[3]).into_vec().is_ok(),
        DidError::InvalidDidFormat
    );

    Ok(())
}
