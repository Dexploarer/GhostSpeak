/*!
 * Credential State Module
 *
 * Native Solana-based Verifiable Credentials that are portable and
 * W3C-compatible. Can be synced to Crossmint on EVM for cross-chain verification.
 */

use anchor_lang::prelude::*;

// PDA Seeds
pub const CREDENTIAL_TYPE_SEED: &[u8] = b"credential_type";
pub const CREDENTIAL_TEMPLATE_SEED: &[u8] = b"credential_template";
pub const CREDENTIAL_SEED: &[u8] = b"credential";

// Maximum lengths
pub const MAX_CREDENTIAL_NAME: usize = 64;
pub const MAX_SCHEMA_URI: usize = 128;
pub const MAX_CREDENTIAL_ID: usize = 64; // urn:uuid:xxx format
pub const MAX_SUBJECT_DATA: usize = 512; // JSON subject data

/// Credential type enum for built-in GhostSpeak credentials
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy)]
pub enum CredentialKind {
    /// Agent identity verification - issued after verify_agent
    AgentIdentity,
    /// Reputation score snapshot - issued periodically
    ReputationScore,
    /// Job completion certificate - issued after escrow completion
    JobCompletion,
    /// Delegated signer authorization - issued after CLI linking
    DelegatedSigner,
    /// Custom credential type
    Custom,
}

impl Default for CredentialKind {
    fn default() -> Self {
        CredentialKind::Custom
    }
}

/// Credential status for lifecycle tracking
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy)]
pub enum CredentialStatus {
    /// Credential is pending (just created, awaiting signature)
    Pending,
    /// Credential is active and valid
    Active,
    /// Credential has been revoked
    Revoked,
    /// Credential has expired
    Expired,
}

impl Default for CredentialStatus {
    fn default() -> Self {
        CredentialStatus::Pending
    }
}

/// Cross-chain sync status for Crossmint integration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy)]
pub enum CrossChainStatus {
    /// Not synced to EVM
    NotSynced,
    /// Sync pending
    SyncPending,
    /// Successfully synced to Crossmint (EVM)
    SyncedToCrossmint,
    /// Sync failed
    SyncFailed,
}

impl Default for CrossChainStatus {
    fn default() -> Self {
        CrossChainStatus::NotSynced
    }
}

/// Credential Type - defines the schema for a category of credentials
///
/// Example types: AgentIdentity, ReputationScore, JobCompletion
#[account]
pub struct CredentialType {
    /// Authority that can manage this type (governance/multisig)
    pub authority: Pubkey,
    /// Unique name for this credential type
    pub name: String,
    /// The kind of credential (built-in or custom)
    pub kind: CredentialKind,
    /// URI to the JSON-LD schema (IPFS or HTTPS)
    pub schema_uri: String,
    /// Human-readable description
    pub description: String,
    /// Whether this type is active (can issue new credentials)
    pub is_active: bool,
    /// Total credentials issued of this type
    pub total_issued: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl CredentialType {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + MAX_CREDENTIAL_NAME + // name
        1 + // kind enum
        4 + MAX_SCHEMA_URI + // schema_uri
        4 + 256 + // description (max 256 chars)
        1 + // is_active
        8 + // total_issued
        8 + // created_at
        1; // bump
}

/// Credential Template - a specific template within a credential type
///
/// Allows customization of credential appearance and metadata
#[account]
pub struct CredentialTemplate {
    /// Reference to the credential type
    pub credential_type: Pubkey,
    /// Name of the template
    pub name: String,
    /// Image/icon URI for visual display
    pub image_uri: String,
    /// Issuer authority (who can issue from this template)
    pub issuer: Pubkey,
    /// Whether template is active
    pub is_active: bool,
    /// Total issued from this template
    pub total_issued: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// Corresponding Crossmint template ID (for EVM sync)
    pub crossmint_template_id: Option<String>,
    /// PDA bump
    pub bump: u8,
}

impl CredentialTemplate {
    pub const LEN: usize = 8 + // discriminator
        32 + // credential_type
        4 + MAX_CREDENTIAL_NAME + // name
        4 + MAX_SCHEMA_URI + // image_uri
        32 + // issuer
        1 + // is_active
        8 + // total_issued
        8 + // created_at
        1 + 4 + 64 + // crossmint_template_id Option<String>
        1; // bump
}

/// Credential - an issued verifiable credential
///
/// This is the actual credential issued to a subject (user/agent).
/// Can be exported as a W3C Verifiable Credential and synced to Crossmint.
#[account]
pub struct Credential {
    /// Reference to the template used
    pub template: Pubkey,
    /// The subject (recipient) of the credential
    pub subject: Pubkey,
    /// The issuer who created this credential
    pub issuer: Pubkey,
    /// Unique credential ID (urn:uuid:xxx format)
    pub credential_id: String,
    /// SHA-256 hash of the credential subject data
    /// Actual data stored off-chain (IPFS) to save space
    pub subject_data_hash: [u8; 32],
    /// URI to the full credential subject data (IPFS/HTTPS)
    pub subject_data_uri: String,
    /// Current status
    pub status: CredentialStatus,
    /// Ed25519 signature of the credential for off-chain verification
    /// Signs: sha256(credential_id || subject || subject_data_hash || issued_at)
    pub signature: [u8; 64],
    /// Issuance timestamp
    pub issued_at: i64,
    /// Expiration timestamp (None = never expires)
    pub expires_at: Option<i64>,
    /// Revocation timestamp (if revoked)
    pub revoked_at: Option<i64>,
    /// Cross-chain sync status
    pub cross_chain_status: CrossChainStatus,
    /// Crossmint credential ID (if synced to EVM)
    pub crossmint_credential_id: Option<String>,
    /// Source data reference (e.g., agent PDA, escrow PDA)
    pub source_account: Option<Pubkey>,
    /// PDA bump
    pub bump: u8,
}

impl Credential {
    pub const LEN: usize = 8 + // discriminator
        32 + // template
        32 + // subject
        32 + // issuer
        4 + MAX_CREDENTIAL_ID + // credential_id
        32 + // subject_data_hash
        4 + MAX_SCHEMA_URI + // subject_data_uri
        1 + // status enum
        64 + // signature
        8 + // issued_at
        1 + 8 + // expires_at Option<i64>
        1 + 8 + // revoked_at Option<i64>
        1 + // cross_chain_status enum
        1 + 4 + 64 + // crossmint_credential_id Option<String>
        1 + 32 + // source_account Option<Pubkey>
        1; // bump

    /// Check if credential is currently valid
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        if self.status != CredentialStatus::Active {
            return false;
        }

        if let Some(expires) = self.expires_at {
            if current_timestamp >= expires {
                return false;
            }
        }

        true
    }

    /// Mark credential as revoked
    pub fn revoke(&mut self, timestamp: i64) {
        self.status = CredentialStatus::Revoked;
        self.revoked_at = Some(timestamp);
    }

    /// Update cross-chain sync status
    pub fn set_crossmint_synced(&mut self, crossmint_id: String) {
        self.cross_chain_status = CrossChainStatus::SyncedToCrossmint;
        self.crossmint_credential_id = Some(crossmint_id);
    }
}

/// Agent Identity Credential Subject Data
///
/// Serialized as JSON and stored off-chain
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentIdentitySubject {
    pub agent_id: String,
    pub owner: Pubkey,
    pub name: String,
    pub capabilities: Vec<String>,
    pub service_endpoint: String,
    pub framework_origin: String,
    pub x402_enabled: bool,
    pub registered_at: i64,
    pub verified_at: i64,
}

/// Reputation Credential Subject Data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReputationSubject {
    pub agent: Pubkey,
    pub reputation_score: u32,
    pub total_jobs_completed: u32,
    pub total_earnings: u64,
    pub success_rate: u64, // Basis points
    pub avg_rating: u64,   // 0-100 scale
    pub dispute_rate: u64, // Basis points
    pub snapshot_timestamp: i64,
}

/// Job Completion Credential Subject Data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobCompletionSubject {
    pub escrow_id: Pubkey,
    pub agent: Pubkey,
    pub client: Pubkey,
    pub amount_paid: u64,
    pub completed_at: i64,
    pub rating: u8, // 1-5 stars
    pub review_hash: Option<[u8; 32]>,
}

/// Delegated Signer Credential Subject Data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DelegatedSignerSubject {
    pub master_wallet: Pubkey,
    pub delegated_key: Pubkey,
    pub authorized_at: i64,
    pub permissions: Vec<String>,
}
