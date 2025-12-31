/*!
 * DID (Decentralized Identifier) State Module
 *
 * Implements the did:sol method for Solana-based DIDs following W3C standards.
 * Based on Identity.com's did:sol specification v3.0.
 */

use anchor_lang::prelude::*;

// PDA Seeds
pub const DID_DOCUMENT_SEED: &[u8] = b"did_document";
pub const VERIFICATION_METHOD_SEED: &[u8] = b"verification_method";

// Maximum lengths
pub const MAX_DID_STRING: usize = 64;        // did:sol:devnet:{base58}
pub const MAX_VERIFICATION_METHODS: usize = 10;
pub const MAX_SERVICE_ENDPOINTS: usize = 5;
pub const MAX_AUTHENTICATION_KEYS: usize = 5;
pub const MAX_URI_LENGTH: usize = 256;
pub const MAX_METHOD_ID: usize = 128;

/// Verification method type for DIDs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum VerificationMethodType {
    /// Ed25519 verification key (Solana native)
    Ed25519VerificationKey2020,
    /// X25519 key agreement for encryption
    X25519KeyAgreementKey2020,
    /// Secp256k1 verification key (Ethereum compatibility)
    EcdsaSecp256k1VerificationKey2019,
}

impl Default for VerificationMethodType {
    fn default() -> Self {
        VerificationMethodType::Ed25519VerificationKey2020
    }
}

/// Verification relationship types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy)]
pub enum VerificationRelationship {
    /// Key can authenticate as the DID
    Authentication,
    /// Key can assert claims (issue credentials)
    AssertionMethod,
    /// Key can perform key agreement (encryption)
    KeyAgreement,
    /// Key can invoke capabilities (update DID document)
    CapabilityInvocation,
    /// Key can delegate capabilities
    CapabilityDelegation,
}

impl Default for VerificationRelationship {
    fn default() -> Self {
        VerificationRelationship::Authentication
    }
}

/// Service endpoint type
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ServiceEndpointType {
    /// AI agent service endpoint
    AIAgentService,
    /// Messaging service endpoint (DIDComm)
    DIDCommMessaging,
    /// Credential repository
    CredentialRepository,
    /// Linked domains verification
    LinkedDomains,
    /// Custom service type
    Custom,
}

impl Default for ServiceEndpointType {
    fn default() -> Self {
        ServiceEndpointType::Custom
    }
}

/// Verification method for DID document
///
/// Represents a cryptographic key that can be used to verify
/// signatures or perform other cryptographic operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VerificationMethod {
    /// Method identifier (e.g., "key-1")
    pub id: String,
    /// Type of verification method
    pub method_type: VerificationMethodType,
    /// DID of the controller (usually the DID itself)
    pub controller: String,
    /// Public key in multibase format (base58btc)
    pub public_key_multibase: String,
    /// Verification relationships this key has
    pub relationships: Vec<VerificationRelationship>,
    /// Creation timestamp
    pub created_at: i64,
    /// Revoked flag
    pub revoked: bool,
}

/// Service endpoint in DID document
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServiceEndpoint {
    /// Service identifier (e.g., "agent-api")
    pub id: String,
    /// Type of service
    pub service_type: ServiceEndpointType,
    /// Service endpoint URI
    pub service_endpoint: String,
    /// Optional description
    pub description: String,
}

/// DID Document - main account for storing decentralized identifiers
///
/// Follows W3C DID Core specification and did:sol method
#[account]
pub struct DidDocument {
    /// The DID string (e.g., "did:sol:devnet:HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH")
    pub did: String,

    /// Controller of the DID (can update the document)
    pub controller: Pubkey,

    /// Verification methods (public keys)
    pub verification_methods: Vec<VerificationMethod>,

    /// Service endpoints
    pub service_endpoints: Vec<ServiceEndpoint>,

    /// Context URIs (for W3C compatibility)
    pub context: Vec<String>,

    /// Also known as (alternative DIDs)
    pub also_known_as: Vec<String>,

    /// DID document creation timestamp
    pub created_at: i64,

    /// Last update timestamp
    pub updated_at: i64,

    /// Version number (incremented on each update)
    pub version: u32,

    /// Deactivated flag
    pub deactivated: bool,

    /// Deactivation timestamp (if deactivated)
    pub deactivated_at: Option<i64>,

    /// PDA bump
    pub bump: u8,
}

impl DidDocument {
    /// Calculate account size for a DID document
    ///
    /// Size varies based on number of verification methods and services
    pub fn calculate_space(
        verification_methods_count: usize,
        service_endpoints_count: usize,
    ) -> usize {
        8 + // discriminator
        4 + MAX_DID_STRING + // did
        32 + // controller
        4 + (verification_methods_count * Self::verification_method_size()) + // verification_methods
        4 + (service_endpoints_count * Self::service_endpoint_size()) + // service_endpoints
        4 + (3 * (4 + MAX_URI_LENGTH)) + // context (3 entries)
        4 + (2 * (4 + MAX_DID_STRING)) + // also_known_as (2 entries)
        8 + // created_at
        8 + // updated_at
        4 + // version
        1 + // deactivated
        1 + 8 + // deactivated_at Option<i64>
        1 // bump
    }

    /// Size of a single verification method
    fn verification_method_size() -> usize {
        4 + MAX_METHOD_ID + // id
        1 + // method_type enum
        4 + MAX_DID_STRING + // controller
        4 + 64 + // public_key_multibase (base58 encoded ~44 chars)
        4 + (5 * 1) + // relationships Vec<enum>
        8 + // created_at
        1 // revoked
    }

    /// Size of a single service endpoint
    fn service_endpoint_size() -> usize {
        4 + MAX_METHOD_ID + // id
        1 + // service_type enum
        4 + MAX_URI_LENGTH + // service_endpoint
        4 + 256 // description
    }

    /// Default space allocation (3 verification methods, 2 services)
    /// Manually calculated since const fn is not available
    pub const LEN: usize = 8 + // discriminator
        4 + MAX_DID_STRING + // did
        32 + // controller
        4 + (3 * (4 + MAX_METHOD_ID + 1 + 4 + MAX_DID_STRING + 4 + 64 + 4 + (5 * 1) + 8 + 1)) + // verification_methods (3)
        4 + (2 * (4 + MAX_METHOD_ID + 1 + 4 + MAX_URI_LENGTH + 4 + 256)) + // service_endpoints (2)
        4 + (3 * (4 + MAX_URI_LENGTH)) + // context (3 entries)
        4 + (2 * (4 + MAX_DID_STRING)) + // also_known_as (2 entries)
        8 + // created_at
        8 + // updated_at
        4 + // version
        1 + // deactivated
        1 + 8 + // deactivated_at Option<i64>
        1; // bump

    /// Check if DID is valid and active
    pub fn is_active(&self) -> bool {
        !self.deactivated
    }

    /// Add a verification method to the DID document
    pub fn add_verification_method(&mut self, method: VerificationMethod) -> Result<()> {
        require!(
            self.verification_methods.len() < MAX_VERIFICATION_METHODS,
            DidError::TooManyVerificationMethods
        );

        // Ensure no duplicate method IDs
        require!(
            !self.verification_methods.iter().any(|m| m.id == method.id),
            DidError::DuplicateMethodId
        );

        self.verification_methods.push(method);
        self.updated_at = Clock::get()?.unix_timestamp;
        self.version += 1;

        Ok(())
    }

    /// Remove a verification method by ID
    pub fn remove_verification_method(&mut self, method_id: &str) -> Result<()> {
        let initial_len = self.verification_methods.len();
        self.verification_methods.retain(|m| m.id != method_id);

        require!(
            self.verification_methods.len() < initial_len,
            DidError::MethodNotFound
        );

        self.updated_at = Clock::get()?.unix_timestamp;
        self.version += 1;

        Ok(())
    }

    /// Add a service endpoint
    pub fn add_service_endpoint(&mut self, service: ServiceEndpoint) -> Result<()> {
        require!(
            self.service_endpoints.len() < MAX_SERVICE_ENDPOINTS,
            DidError::TooManyServiceEndpoints
        );

        // Ensure no duplicate service IDs
        require!(
            !self.service_endpoints.iter().any(|s| s.id == service.id),
            DidError::DuplicateServiceId
        );

        self.service_endpoints.push(service);
        self.updated_at = Clock::get()?.unix_timestamp;
        self.version += 1;

        Ok(())
    }

    /// Remove a service endpoint by ID
    pub fn remove_service_endpoint(&mut self, service_id: &str) -> Result<()> {
        let initial_len = self.service_endpoints.len();
        self.service_endpoints.retain(|s| s.id != service_id);

        require!(
            self.service_endpoints.len() < initial_len,
            DidError::ServiceNotFound
        );

        self.updated_at = Clock::get()?.unix_timestamp;
        self.version += 1;

        Ok(())
    }

    /// Deactivate the DID document
    pub fn deactivate(&mut self) -> Result<()> {
        require!(!self.deactivated, DidError::AlreadyDeactivated);

        self.deactivated = true;
        self.deactivated_at = Some(Clock::get()?.unix_timestamp);
        self.updated_at = Clock::get()?.unix_timestamp;
        self.version += 1;

        Ok(())
    }

    /// Get verification methods for a specific relationship
    pub fn get_methods_for_relationship(
        &self,
        relationship: VerificationRelationship,
    ) -> Vec<&VerificationMethod> {
        self.verification_methods
            .iter()
            .filter(|m| m.relationships.contains(&relationship) && !m.revoked)
            .collect()
    }

    /// Verify that a public key can perform a specific action
    pub fn can_perform_action(
        &self,
        public_key: &Pubkey,
        relationship: VerificationRelationship,
    ) -> bool {
        // Controller can always perform actions
        if public_key == &self.controller {
            return true;
        }

        // Check if public key is in verification methods with correct relationship
        let pubkey_multibase = format!("z{}", bs58::encode(public_key.to_bytes()).into_string());

        self.verification_methods.iter().any(|method| {
            !method.revoked
                && method.public_key_multibase == pubkey_multibase
                && method.relationships.contains(&relationship)
        })
    }
}

/// DID Resolution Metadata
///
/// Additional metadata for DID resolution
#[account]
pub struct DidResolutionMetadata {
    /// DID being resolved
    pub did: String,

    /// Pointer to the DID document account
    pub did_document: Pubkey,

    /// Resolution timestamp
    pub resolved_at: i64,

    /// Content type (application/did+json)
    pub content_type: String,

    /// DID document version at resolution time
    pub version: u32,

    /// PDA bump
    pub bump: u8,
}

impl DidResolutionMetadata {
    pub const LEN: usize = 8 + // discriminator
        4 + MAX_DID_STRING + // did
        32 + // did_document
        8 + // resolved_at
        4 + 64 + // content_type
        4 + // version
        1; // bump
}

/// DID-related errors
#[error_code]
pub enum DidError {
    #[msg("DID document is already deactivated")]
    AlreadyDeactivated,

    #[msg("Maximum number of verification methods reached")]
    TooManyVerificationMethods,

    #[msg("Maximum number of service endpoints reached")]
    TooManyServiceEndpoints,

    #[msg("Duplicate verification method ID")]
    DuplicateMethodId,

    #[msg("Duplicate service endpoint ID")]
    DuplicateServiceId,

    #[msg("Verification method not found")]
    MethodNotFound,

    #[msg("Service endpoint not found")]
    ServiceNotFound,

    #[msg("Invalid DID format")]
    InvalidDidFormat,

    #[msg("Unauthorized DID operation")]
    UnauthorizedDidOperation,

    #[msg("DID is deactivated")]
    DidDeactivated,
}
