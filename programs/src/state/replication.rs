/*!
 * Replication State Module
 *
 * Contains state structures for agent replication and template management.
 */

use anchor_lang::prelude::*;

#[account]
pub struct ReplicationTemplate {
    pub source_agent: Pubkey,
    pub creator: Pubkey,
    pub genome_hash: String,
    pub base_capabilities: Vec<String>,
    pub replication_fee: u64,
    pub max_replications: u32,
    pub current_replications: u32,
    pub is_active: bool,
    pub created_at: i64,
    pub cnft_asset_id: Option<Pubkey>, // Compressed NFT asset ID
    pub merkle_tree: Option<Pubkey>,   // Merkle tree for cNFT
    pub metadata_uri: String,          // IPFS/Arweave URI for agent genome
    pub bump: u8,
}

#[account]
pub struct ReplicationRecord {
    pub record_id: u64,
    pub original_agent: Pubkey,
    pub replicated_agent: Pubkey,
    pub replicator: Pubkey,
    pub fee_paid: u64,
    pub replicated_at: i64,
    pub cnft_mint: Option<Pubkey>, // Compressed NFT mint for this replication
    pub bump: u8,
}

#[event]
pub struct ReplicationTemplateCreatedEvent {
    pub template: Pubkey,
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct AgentReplicatedEvent {
    pub original_agent: Pubkey,
    pub replicated_agent: Pubkey,
    pub replicator: Pubkey,
    pub fee_paid: u64,
    pub timestamp: i64,
}

impl ReplicationTemplate {
    // Reduced sizes to prevent memory allocation failures
    pub const MAX_CAPABILITIES: usize = 5; // Reduced from 20
    pub const MAX_HASH_LEN: usize = 64;    // Reduced for genome_hash
    pub const MAX_URI_LEN: usize = 64;     // Reduced for metadata_uri
    
    pub const LEN: usize = 8 + // discriminator
        32 + // source_agent
        32 + // creator
        4 + Self::MAX_HASH_LEN + // genome_hash (reduced)
        4 + (Self::MAX_CAPABILITIES * (4 + 32)) + // base_capabilities (max 5, 32 chars each)
        8 + // replication_fee
        4 + // max_replications
        4 + // current_replications
        1 + // is_active
        8 + // created_at
        1 + 32 + // cnft_asset_id Option
        1 + 32 + // merkle_tree Option
        4 + Self::MAX_URI_LEN + // metadata_uri (reduced)
        1; // bump
}

impl ReplicationRecord {
    pub const LEN: usize = 8 + // discriminator
        8 + // record_id
        32 + // original_agent
        32 + // replicated_agent
        32 + // replicator
        8 + // fee_paid
        8 + // replicated_at
        1 + 32 + // cnft_mint Option
        1; // bump
}
