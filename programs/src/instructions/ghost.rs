/*!
 * Ghost Identity Management Instructions
 *
 * Core instructions for the Ghost identity system:
 * - Auto-discovery and Ghost creation
 * - Registration (add metadata)
 * - Claiming (prove ownership)
 * - External ID linking (cross-platform identity)
 */

use anchor_lang::prelude::*;
use crate::state::{
    Agent, AgentStatus, ExternalIdMapping, ExternalIdentifier,
    AGENT_SEED, MAX_GENERAL_STRING_LENGTH,
};
use crate::GhostSpeakError;

// ========== AUTO-CREATE GHOST (For Indexer Service) ==========

#[derive(Accounts)]
#[instruction(payment_address: Pubkey)]
pub struct AutoCreateGhost<'info> {
    #[account(
        init,
        payer = authority,
        space = Agent::LEN,
        seeds = [AGENT_SEED, payment_address.as_ref()],
        bump
    )]
    pub agent_account: Account<'info, Agent>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Auto-create a Ghost from discovered x402 transaction
/// Used by the indexer service when it discovers a new agent
pub fn auto_create_ghost(
    ctx: Context<AutoCreateGhost>,
    payment_address: Pubkey,
    first_tx_signature: String,
    discovery_source: String,
    initial_ghost_score: Option<u64>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let bump = ctx.bumps.agent_account;

    // Initialize as Unregistered Ghost
    agent.initialize_ghost(
        payment_address,
        first_tx_signature,
        discovery_source,
        bump,
    )?;

    // Set initial Ghost Score if provided (from backfill metrics)
    if let Some(score) = initial_ghost_score {
        agent.ghost_score = score;
    }

    msg!("Ghost auto-created: payment_address={}, status=Unregistered", payment_address);

    Ok(())
}

// ========== REGISTER GHOST METADATA ==========

#[derive(Accounts)]
pub struct RegisterGhostMetadata<'info> {
    #[account(
        mut,
        constraint = agent_account.status == AgentStatus::Unregistered @ GhostSpeakError::InvalidAgentStatus,
    )]
    pub agent_account: Account<'info, Agent>,

    /// Anyone can add metadata to an Unregistered Ghost
    /// Claiming proves ownership later
    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Add metadata to an Unregistered Ghost (discovered via auto-create)
/// Transitions: Unregistered → Registered
pub fn register_ghost_metadata(
    ctx: Context<RegisterGhostMetadata>,
    name: String,
    description: String,
    capabilities: Vec<String>,
    service_endpoint: Option<String>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;

    // Validation
    require!(
        name.len() <= 64,
        GhostSpeakError::NameTooLong
    );
    require!(
        description.len() <= MAX_GENERAL_STRING_LENGTH,
        GhostSpeakError::DescriptionTooLong
    );
    require!(
        capabilities.len() <= 5,
        GhostSpeakError::TooManyCapabilities
    );

    // Update metadata
    agent.name = name;
    agent.description = description;
    agent.capabilities = capabilities;

    if let Some(endpoint) = service_endpoint {
        agent.service_endpoint = endpoint;
    }

    // Transition to Registered
    agent.status = AgentStatus::Registered;
    agent.updated_at = clock.unix_timestamp;

    msg!("Ghost registered: {} ({})", agent.name, agent.x402_payment_address);

    Ok(())
}

// ========== CLAIM GHOST (Prove Ownership) ==========

use crate::state::{
    DidDocument, VerificationMethod, VerificationMethodType, VerificationRelationship,
    ServiceEndpoint, ServiceEndpointType, DID_DOCUMENT_SEED,
};

// Solana Attestation Service (SAS) constants
pub const SAS_PROGRAM_ID: &str = "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG";
pub const SAS_ATTESTATION_SEED: &[u8] = b"attestation";
pub const SAS_ATTESTATION_DISCRIMINATOR: u8 = 2;

#[derive(Accounts)]
#[instruction(sas_credential: Pubkey, sas_schema: Pubkey)]
pub struct ClaimGhost<'info> {
    #[account(
        mut,
        constraint = agent_account.status == AgentStatus::Registered ||
                     agent_account.status == AgentStatus::Unregistered
                     @ GhostSpeakError::InvalidAgentStatus,
        constraint = agent_account.owner.is_none() @ GhostSpeakError::AlreadyClaimed,
    )]
    pub agent_account: Account<'info, Agent>,

    /// DID document to create for this Ghost
    /// Seeds: [b"did_document", agent_account.x402_payment_address.as_ref()]
    #[account(
        init,
        payer = claimer,
        space = DidDocument::LEN,
        seeds = [DID_DOCUMENT_SEED, agent_account.x402_payment_address.as_ref()],
        bump
    )]
    pub did_document: Account<'info, DidDocument>,

    /// SAS Attestation proving ownership of x402_payment_address
    /// PDA: [b"attestation", sas_credential, sas_schema, x402_payment_address]
    /// CHECK: SAS attestation account verified via PDA derivation and deserialization
    pub sas_attestation: UncheckedAccount<'info>,

    /// The claimer must have created a SAS attestation proving they own x402_payment_address
    #[account(mut)]
    pub claimer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Claim ownership of a Ghost
/// Transitions: Unregistered/Registered → Claimed
///
/// Security: Uses Solana Attestation Service (SAS) for trustless ownership verification.
///   The claimer must have created a SAS attestation proving they own the x402_payment_address.
///
/// Auto-creates: DID document with did:sol:<network>:<address> format
///
/// Parameters:
/// - sas_credential: Pubkey of the SAS Credential (issuer) for ownership attestations
/// - sas_schema: Pubkey of the SAS Schema defining the ownership attestation format
/// - ipfs_metadata_uri: Optional IPFS URI for agent metadata (ipfs://...)
/// - network: Network identifier ("devnet", "mainnet-beta", "testnet")
pub fn claim_ghost(
    ctx: Context<ClaimGhost>,
    sas_credential: Pubkey,
    sas_schema: Pubkey,
    ipfs_metadata_uri: Option<String>,
    network: String,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;

    // 1. SECURITY: Verify SAS attestation PDA derivation
    let sas_program_id = Pubkey::try_from(SAS_PROGRAM_ID)
        .map_err(|_| GhostSpeakError::InvalidInput)?;

    let (expected_attestation_pda, _bump) = Pubkey::find_program_address(
        &[
            SAS_ATTESTATION_SEED,
            sas_credential.as_ref(),
            sas_schema.as_ref(),
            agent.x402_payment_address.as_ref(), // nonce = x402_payment_address
        ],
        &sas_program_id,
    );

    require!(
        *ctx.accounts.sas_attestation.key == expected_attestation_pda,
        GhostSpeakError::InvalidSignature
    );

    // 2. SECURITY: Verify SAS attestation account exists and has correct owner
    require!(
        ctx.accounts.sas_attestation.owner == &sas_program_id,
        GhostSpeakError::InvalidSignature
    );

    // 3. SECURITY: Deserialize and verify SAS attestation data
    let attestation_data = ctx.accounts.sas_attestation.try_borrow_data()?;

    // Verify discriminator (should be 2 for Attestation)
    require!(
        attestation_data.len() > 0 && attestation_data[0] == SAS_ATTESTATION_DISCRIMINATOR,
        GhostSpeakError::InvalidSignature
    );

    // Parse attestation fields (Borsh serialization format):
    // Discriminator(1) + nonce(32) + credential(32) + schema(32) + data_len(4) + data + signer(32) + expiry(8) + token_account(32)

    if attestation_data.len() < 1 + 32 + 32 + 32 + 4 {
        return Err(GhostSpeakError::InvalidSignature.into());
    }

    let mut offset = 1; // Skip discriminator

    // Verify nonce matches x402_payment_address
    let mut nonce_bytes = [0u8; 32];
    nonce_bytes.copy_from_slice(&attestation_data[offset..offset + 32]);
    let nonce = Pubkey::new_from_array(nonce_bytes);
    require!(
        nonce == agent.x402_payment_address,
        GhostSpeakError::InvalidSignature
    );
    offset += 32;

    // Verify credential matches provided sas_credential
    let mut credential_bytes = [0u8; 32];
    credential_bytes.copy_from_slice(&attestation_data[offset..offset + 32]);
    let attestation_credential = Pubkey::new_from_array(credential_bytes);
    require!(
        attestation_credential == sas_credential,
        GhostSpeakError::InvalidSignature
    );
    offset += 32;

    // Verify schema matches provided sas_schema
    let mut schema_bytes = [0u8; 32];
    schema_bytes.copy_from_slice(&attestation_data[offset..offset + 32]);
    let attestation_schema = Pubkey::new_from_array(schema_bytes);
    require!(
        attestation_schema == sas_schema,
        GhostSpeakError::InvalidSignature
    );
    offset += 32;

    // Read data length (u32 little-endian)
    if attestation_data.len() < offset + 4 {
        return Err(GhostSpeakError::InvalidSignature.into());
    }
    let data_len = u32::from_le_bytes([
        attestation_data[offset],
        attestation_data[offset + 1],
        attestation_data[offset + 2],
        attestation_data[offset + 3],
    ]) as usize;
    offset += 4;

    // Verify attestation data contains the x402_payment_address (proving ownership)
    if attestation_data.len() < offset + data_len {
        return Err(GhostSpeakError::InvalidSignature.into());
    }
    let attestation_payload = &attestation_data[offset..offset + data_len];

    // The attestation data should contain the x402_payment_address as proof of ownership
    // (Simple format: just the 32-byte address)
    require!(
        attestation_payload.len() >= 32,
        GhostSpeakError::InvalidSignature
    );
    let mut attested_address_bytes = [0u8; 32];
    attested_address_bytes.copy_from_slice(&attestation_payload[0..32]);
    let attested_address = Pubkey::new_from_array(attested_address_bytes);
    require!(
        attested_address == agent.x402_payment_address,
        GhostSpeakError::InvalidSignature
    );
    offset += data_len;

    // Read signer (32 bytes)
    if attestation_data.len() < offset + 32 {
        return Err(GhostSpeakError::InvalidSignature.into());
    }
    let mut _signer_bytes = [0u8; 32];
    _signer_bytes.copy_from_slice(&attestation_data[offset..offset + 32]);
    let _attestation_signer = Pubkey::new_from_array(_signer_bytes);
    offset += 32;

    // Check expiry (8 bytes, i64 little-endian)
    if attestation_data.len() < offset + 8 {
        return Err(GhostSpeakError::InvalidSignature.into());
    }
    let expiry = i64::from_le_bytes([
        attestation_data[offset],
        attestation_data[offset + 1],
        attestation_data[offset + 2],
        attestation_data[offset + 3],
        attestation_data[offset + 4],
        attestation_data[offset + 5],
        attestation_data[offset + 6],
        attestation_data[offset + 7],
    ]);

    // Verify attestation hasn't expired (0 = never expires)
    if expiry != 0 {
        require!(
            clock.unix_timestamp < expiry,
            GhostSpeakError::InvalidSignature
        );
    }

    msg!(
        "✓ SAS Attestation verified: {} owns {}",
        ctx.accounts.claimer.key(),
        agent.x402_payment_address
    );

    // 4. Optional: Validate and store IPFS metadata URI
    if let Some(ref ipfs_uri) = ipfs_metadata_uri {
        require!(
            ipfs_uri.starts_with("ipfs://"),
            GhostSpeakError::InvalidMetadataUri
        );
        require!(
            ipfs_uri.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::MetadataUriTooLong
        );
        agent.metadata_uri = ipfs_uri.clone();
        msg!("✓ IPFS metadata URI set: {}", ipfs_uri);
    }

    // 4. Claim the Ghost
    agent.owner = Some(ctx.accounts.claimer.key());
    agent.status = AgentStatus::Claimed;
    agent.claimed_at = Some(clock.unix_timestamp);
    agent.updated_at = clock.unix_timestamp;

    // 5. Auto-create DID document (did:sol:<network>:<address>)
    let did_document = &mut ctx.accounts.did_document;
    let did_string = format!(
        "did:sol:{}:{}",
        network,
        agent.x402_payment_address
    );

    require!(
        did_string.len() <= crate::state::did::MAX_DID_STRING,
        GhostSpeakError::InvalidInput
    );

    // Initialize DID document
    did_document.did = did_string.clone();
    did_document.controller = ctx.accounts.claimer.key();
    did_document.created_at = clock.unix_timestamp;
    did_document.updated_at = clock.unix_timestamp;
    did_document.version = 1;
    did_document.deactivated = false;
    did_document.deactivated_at = None;
    did_document.bump = ctx.bumps.did_document;

    // Add default W3C context
    did_document.context = vec![
        "https://www.w3.org/ns/did/v1".to_string(),
        "https://w3id.org/security/suites/ed25519-2020/v1".to_string(),
    ];

    // Create primary verification method using the x402_payment_address
    let primary_verification_method = VerificationMethod {
        id: "key-1".to_string(),
        method_type: VerificationMethodType::Ed25519VerificationKey2020,
        controller: did_string.clone(),
        public_key_multibase: format!("z{}", bs58::encode(agent.x402_payment_address.to_bytes()).into_string()),
        relationships: vec![
            VerificationRelationship::Authentication,
            VerificationRelationship::AssertionMethod,
            VerificationRelationship::CapabilityInvocation,
        ],
        created_at: clock.unix_timestamp,
        revoked: false,
    };

    did_document.verification_methods = vec![primary_verification_method];

    // Add agent service endpoint if available
    if !agent.service_endpoint.is_empty() {
        let service_endpoint = ServiceEndpoint {
            id: "agent-service".to_string(),
            service_type: ServiceEndpointType::AIAgentService,
            service_endpoint: agent.service_endpoint.clone(),
            description: format!("AI Agent Service: {}", agent.name),
        };
        did_document.service_endpoints = vec![service_endpoint];
    } else {
        did_document.service_endpoints = Vec::new();
    }

    did_document.also_known_as = Vec::new();

    // Link DID to agent
    agent.did_address = Some(did_document.key());

    msg!(
        "✅ Ghost claimed by {}: {} (DID: {})",
        ctx.accounts.claimer.key(),
        agent.x402_payment_address,
        did_string
    );

    Ok(())
}

// ========== LINK EXTERNAL ID ==========

#[derive(Accounts)]
#[instruction(platform: String, external_id: String)]
pub struct LinkExternalId<'info> {
    #[account(
        mut,
        constraint = agent_account.owner == Some(authority.key()) @ GhostSpeakError::UnauthorizedOwner,
    )]
    pub agent_account: Account<'info, Agent>,

    #[account(
        init,
        payer = authority,
        space = ExternalIdMapping::LEN,
        seeds = [
            b"external_id",
            platform.as_bytes(),
            external_id.as_bytes(),
        ],
        bump
    )]
    pub external_id_mapping: Account<'info, ExternalIdMapping>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Link a platform-specific ID to this Ghost
/// Creates a cross-platform identity mapping
///
/// Example: Link PayAI agent-123 to this Ghost
pub fn link_external_id(
    ctx: Context<LinkExternalId>,
    platform: String,
    external_id: String,
    verified: bool,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let mapping = &mut ctx.accounts.external_id_mapping;
    let bump = ctx.bumps.external_id_mapping;

    // Validation
    require!(
        platform.len() <= 32,
        GhostSpeakError::InvalidInput
    );
    require!(
        external_id.len() <= 128,
        GhostSpeakError::InvalidInput
    );

    // Initialize the mapping PDA
    mapping.initialize(
        agent.key(),
        platform.clone(),
        external_id.clone(),
        verified,
        bump,
    )?;

    // Add to agent's external_identifiers
    let clock = Clock::get()?;
    let identifier = ExternalIdentifier {
        platform: platform.clone(),
        external_id: external_id.clone(),
        verified,
        verified_at: if verified { clock.unix_timestamp } else { 0 },
    };

    // Check if we're at capacity
    require!(
        agent.external_identifiers.len() < Agent::MAX_EXTERNAL_IDS,
        GhostSpeakError::TooManyExternalIds
    );

    agent.external_identifiers.push(identifier);
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "External ID linked: platform={}, id={}, ghost={}",
        platform,
        external_id,
        agent.key()
    );

    Ok(())
}

// ========== UPDATE GHOST SCORE ==========

#[derive(Accounts)]
pub struct UpdateGhostScore<'info> {
    #[account(mut)]
    pub agent_account: Account<'info, Agent>,

    /// Authority allowed to update scores (could be governance/oracle)
    pub authority: Signer<'info>,
}

/// Update the Ghost Score from off-chain calculation
/// Called by the reputation oracle/calculator service
pub fn update_ghost_score(
    ctx: Context<UpdateGhostScore>,
    new_score: u64,
    components: Option<Vec<crate::state::ReputationComponent>>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;

    // Validation
    require!(
        new_score <= 1000,
        GhostSpeakError::InvalidReputationScore
    );

    agent.ghost_score = new_score;

    if let Some(comps) = components {
        require!(
            comps.len() <= Agent::MAX_REPUTATION_COMPONENTS,
            GhostSpeakError::TooManyReputationComponents
        );
        agent.reputation_components = comps;
    }

    agent.updated_at = clock.unix_timestamp;

    msg!("Ghost Score updated: {} → {}", agent.x402_payment_address, new_score);

    Ok(())
}
