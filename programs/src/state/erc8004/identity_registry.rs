/*!
 * ERC-8004 Identity Registry (Solana Adapter)
 *
 * Implements the ERC-8004 Identity Registry interface on Solana.
 * Maps GhostSpeak agents to ERC-721-compatible token IDs for cross-chain discovery.
 */

use anchor_lang::prelude::*;
use crate::state::GhostSpeakError;

// PDA Seeds
pub const ERC8004_IDENTITY_SEED: &[u8] = b"erc8004_identity";
pub const IDENTITY_METADATA_SEED: &[u8] = b"identity_metadata";

/// ERC-8004 Protocol endpoint types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ProtocolEndpoint {
    /// Agent-to-Agent (A2A) protocol
    A2A,
    /// Model Context Protocol (MCP)
    MCP,
    /// Ethereum Name Service (ENS)
    ENS,
    /// Decentralized Identifier (DID)
    DID,
    /// Custom protocol
    Custom,
}

/// Agent registration file (ERC-8004 format)
/// This maps to the URI returned by ERC-721's tokenURI
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegistrationFile {
    /// Agent name
    pub name: String,
    /// Agent description
    pub description: String,
    /// Protocol endpoints
    pub endpoints: Vec<EndpointData>,
    /// Wallet addresses (for payment)
    pub wallet_addresses: Vec<WalletAddress>,
    /// Trust model (e.g., "reputation-based", "stake-backed")
    pub trust_model: Option<String>,
    /// Additional metadata URI (IPFS/Arweave)
    pub metadata_uri: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EndpointData {
    /// Protocol type
    pub protocol: ProtocolEndpoint,
    /// Endpoint URL
    pub url: String,
    /// Additional protocol-specific data
    pub metadata: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WalletAddress {
    /// Chain (e.g., "solana", "ethereum", "base")
    pub chain: String,
    /// Token type (e.g., "native", "USDC", "GHOST")
    pub token: String,
    /// Address on that chain
    pub address: String,
}

/// ERC-8004 Identity Registry entry for a GhostSpeak agent
#[account]
pub struct ERC8004Identity {
    /// GhostSpeak agent account
    pub agent: Pubkey,
    /// ERC-721 token ID (for cross-chain mapping)
    /// Derived from agent pubkey for uniqueness
    pub token_id: u64,
    /// Namespace (e.g., "eip155" for EVM chains)
    pub namespace: String,
    /// Chain ID where this identity was registered
    /// For Solana: devnet=1399811149, mainnet=1399811151
    pub chain_id: u64,
    /// Registry address on Solana (this program)
    pub registry_address: Pubkey,
    /// Registration file data (stored on-chain for verifiability)
    /// In production, this would be stored off-chain with URI
    pub registration_data_hash: [u8; 32],
    /// Registration file URI (IPFS/Arweave)
    pub registration_uri: String,
    /// Whether this identity has been synced to EVM chains
    pub synced_to_evm: bool,
    /// Neon EVM contract address (if deployed)
    pub neon_contract: Option<Pubkey>,
    /// Last sync timestamp
    pub last_sync: i64,
    /// Identity created timestamp
    pub created_at: i64,
    /// Identity updated timestamp
    pub updated_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl ERC8004Identity {
    pub const MAX_NAMESPACE_LEN: usize = 16;
    pub const MAX_URI_LEN: usize = 128;

    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        8 + // token_id
        4 + Self::MAX_NAMESPACE_LEN + // namespace
        8 + // chain_id
        32 + // registry_address
        32 + // registration_data_hash
        4 + Self::MAX_URI_LEN + // registration_uri
        1 + // synced_to_evm
        1 + 32 + // neon_contract Option<Pubkey>
        8 + // last_sync
        8 + // created_at
        8 + // updated_at
        1; // bump

    /// Initialize ERC-8004 identity
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        token_id: u64,
        namespace: String,
        chain_id: u64,
        registry_address: Pubkey,
        registration_data_hash: [u8; 32],
        registration_uri: String,
        bump: u8,
    ) -> Result<()> {
        require!(
            namespace.len() <= Self::MAX_NAMESPACE_LEN,
            GhostSpeakError::InvalidInput
        );
        require!(
            registration_uri.len() <= Self::MAX_URI_LEN,
            GhostSpeakError::InvalidMetadataUri
        );

        let clock = Clock::get()?;

        self.agent = agent;
        self.token_id = token_id;
        self.namespace = namespace;
        self.chain_id = chain_id;
        self.registry_address = registry_address;
        self.registration_data_hash = registration_data_hash;
        self.registration_uri = registration_uri;
        self.synced_to_evm = false;
        self.neon_contract = None;
        self.last_sync = 0;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    /// Generate global agent ID in ERC-8004 format
    /// Format: namespace:chain_id:registry_address:token_id
    pub fn generate_global_id(&self) -> String {
        format!(
            "{}:{}:{}:{}",
            self.namespace,
            self.chain_id,
            self.registry_address,
            self.token_id
        )
    }

    /// Mark as synced to EVM
    pub fn mark_synced(&mut self, neon_contract: Pubkey) -> Result<()> {
        self.synced_to_evm = true;
        self.neon_contract = Some(neon_contract);
        self.last_sync = Clock::get()?.unix_timestamp;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Update registration URI
    pub fn update_uri(&mut self, new_uri: String, data_hash: [u8; 32]) -> Result<()> {
        require!(
            new_uri.len() <= Self::MAX_URI_LEN,
            GhostSpeakError::InvalidMetadataUri
        );

        self.registration_uri = new_uri;
        self.registration_data_hash = data_hash;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

/// On-chain metadata for ERC-8004 identity
/// Stores minimal data for quick queries
#[account]
pub struct IdentityMetadata {
    /// Identity account this metadata is for
    pub identity: Pubkey,
    /// Agent name
    pub name: String,
    /// Primary endpoint URL
    pub primary_endpoint: String,
    /// Supported capabilities (comma-separated)
    pub capabilities: String,
    /// Last activity timestamp
    pub last_active: i64,
    /// Whether identity is verified
    pub is_verified: bool,
    /// PDA bump
    pub bump: u8,
}

impl IdentityMetadata {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_ENDPOINT_LEN: usize = 128;
    pub const MAX_CAPABILITIES_LEN: usize = 256;

    pub const LEN: usize = 8 + // discriminator
        32 + // identity
        4 + Self::MAX_NAME_LEN + // name
        4 + Self::MAX_ENDPOINT_LEN + // primary_endpoint
        4 + Self::MAX_CAPABILITIES_LEN + // capabilities
        8 + // last_active
        1 + // is_verified
        1; // bump
}
