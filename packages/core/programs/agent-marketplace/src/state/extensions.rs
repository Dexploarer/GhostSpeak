/*!
 * Extensions State Module
 * 
 * Contains data structures for third-party extensions and plugins.
 */

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ExtensionType {
    PricingModel,
    AgentCapability,
    Integration,
    Analytics,
    Security,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ExtensionStatus {
    Pending,
    Approved,
    Rejected,
    Active,
    Suspended,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExtensionMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub repository: String,
    pub license: String,
    pub dependencies: Vec<String>,
    pub extension_type: ExtensionType,
}

#[account]
pub struct Extension {
    pub extension: Pubkey,
    pub developer: Pubkey,
    pub extension_type: ExtensionType,
    pub status: ExtensionStatus,
    pub metadata: ExtensionMetadata,
    pub code_hash: String,       // IPFS hash of extension code
    pub install_count: u32,
    pub rating: f64,
    pub revenue_share: f64,      // Percentage to developer
    pub total_earnings: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl Extension {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 300 + 100 + 4 + 8 + 8 + 8 + 8 + 1;
}