/*!
 * External ID Mapping Module
 *
 * Cross-platform identity mapping for Ghost resolution.
 * Allows fast lookups like: "What's the Ghost for PayAI agent-123?"
 */

use anchor_lang::prelude::*;
use super::MAX_GENERAL_STRING_LENGTH;

// PDA Seeds
pub const EXTERNAL_ID_MAPPING_SEED: &[u8] = b"external_id";

/// Cross-platform identity mapping PDA
/// Allows resolution of Ghost from platform-specific IDs
///
/// Example: platform="payai", external_id="agent-123" → ghost_pubkey
#[account]
pub struct ExternalIdMapping {
    /// The Ghost (Agent) PDA this maps to
    pub ghost_pubkey: Pubkey,

    /// Platform name ("payai", "eliza", "crossmint", etc.)
    pub platform: String,

    /// Platform-specific agent ID
    pub external_id: String,

    /// When this mapping was created
    pub created_at: i64,

    /// Whether ownership has been verified
    pub verified: bool,

    /// When ownership was verified (if applicable)
    pub verified_at: Option<i64>,

    /// PDA bump seed
    pub bump: u8,
}

impl ExternalIdMapping {
    pub const MAX_PLATFORM_LEN: usize = 32;
    pub const MAX_EXTERNAL_ID_LEN: usize = 128;

    pub const LEN: usize = 8 + // discriminator
        32 + // ghost_pubkey
        4 + Self::MAX_PLATFORM_LEN + // platform
        4 + Self::MAX_EXTERNAL_ID_LEN + // external_id
        8 + // created_at
        1 + // verified bool
        1 + 8 + // verified_at Option<i64>
        1; // bump

    /// Initialize a new external ID mapping
    pub fn initialize(
        &mut self,
        ghost_pubkey: Pubkey,
        platform: String,
        external_id: String,
        verified: bool,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.ghost_pubkey = ghost_pubkey;
        self.platform = platform;
        self.external_id = external_id;
        self.created_at = clock.unix_timestamp;
        self.verified = verified;
        self.verified_at = if verified { Some(clock.unix_timestamp) } else { None };
        self.bump = bump;

        Ok(())
    }

    /// Mark as verified
    pub fn mark_verified(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.verified = true;
        self.verified_at = Some(clock.unix_timestamp);
        Ok(())
    }

    /// Derive PDA seeds for this mapping
    pub fn seeds(platform: &str, external_id: &str) -> Vec<Vec<u8>> {
        vec![
            EXTERNAL_ID_MAPPING_SEED.to_vec(),
            platform.as_bytes().to_vec(),
            external_id.as_bytes().to_vec(),
        ]
    }
}
