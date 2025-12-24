/*!
 * Protocol Configuration State
 *
 * Global configuration for protocol fees and treasury management.
 *
 * NOTE: Fee infrastructure is in place but all fees are set to 0 during devnet.
 * Fees will be enabled via governance after mainnet deployment.
 */

use anchor_lang::prelude::*;

/// Protocol configuration PDA storing fee rates and treasury addresses
///
/// Seeds: ["protocol_config"]
///
/// # Fee Structure (Currently Disabled - Set to 0)
///
/// | Fee Type | Rate | Distribution | Status |
/// |----------|------|--------------|--------|
/// | Escrow | 0.5% (50 bps) | 80% Treasury, 20% Buyback | Disabled until mainnet |
/// | Agent Registration | 0.01 SOL | 100% Treasury | Disabled until mainnet |
/// | Marketplace Listing | 0.001 SOL | 100% Treasury | Disabled until mainnet |
/// | Dispute Resolution | 1% (100 bps) | Moderator Pool | Disabled until mainnet |
///
/// # Enabling Fees
///
/// After mainnet deployment, call `update_protocol_config` with:
/// - `escrow_fee_bps`: 50 (0.5%)
/// - `agent_registration_fee`: 10_000_000 (0.01 SOL)
/// - `listing_fee`: 1_000_000 (0.001 SOL)
/// - `dispute_fee_bps`: 100 (1%)
#[account]
pub struct ProtocolConfig {
    /// Authority who can update the config (typically DAO or multisig)
    pub authority: Pubkey,

    /// Treasury wallet that receives protocol fees
    pub treasury: Pubkey,

    /// Buyback pool wallet for token buybacks (receives 20% of escrow fees)
    pub buyback_pool: Pubkey,

    /// Moderator pool for dispute resolution fees
    pub moderator_pool: Pubkey,

    /// Escrow completion fee in basis points (100 = 1%)
    /// Default: 0 (disabled until mainnet)
    /// Target: 50 (0.5%)
    pub escrow_fee_bps: u16,

    /// Agent registration fee in lamports
    /// Default: 0 (disabled until mainnet)
    /// Target: 10_000_000 (0.01 SOL)
    pub agent_registration_fee: u64,

    /// Marketplace listing fee in lamports
    /// Default: 0 (disabled until mainnet)
    /// Target: 1_000_000 (0.001 SOL)
    pub listing_fee: u64,

    /// Dispute resolution fee in basis points (100 = 1%)
    /// Default: 0 (disabled until mainnet)
    /// Target: 100 (1%)
    pub dispute_fee_bps: u16,

    /// Whether fees are enabled
    /// Set to false during devnet, true after mainnet governance approval
    pub fees_enabled: bool,

    /// Timestamp when config was last updated
    pub updated_at: i64,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved for future use
    pub _reserved: [u8; 64],
}

impl ProtocolConfig {
    /// Account size for rent calculation
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // treasury
        32 + // buyback_pool
        32 + // moderator_pool
        2 +  // escrow_fee_bps
        8 +  // agent_registration_fee
        8 +  // listing_fee
        2 +  // dispute_fee_bps
        1 +  // fees_enabled
        8 +  // updated_at
        1 +  // bump
        64; // _reserved

    /// Initialize with fees disabled (for devnet)
    pub fn initialize(
        &mut self,
        authority: Pubkey,
        treasury: Pubkey,
        buyback_pool: Pubkey,
        moderator_pool: Pubkey,
        bump: u8,
    ) -> Result<()> {
        self.authority = authority;
        self.treasury = treasury;
        self.buyback_pool = buyback_pool;
        self.moderator_pool = moderator_pool;

        // All fees set to 0 until mainnet deployment
        self.escrow_fee_bps = 0;
        self.agent_registration_fee = 0;
        self.listing_fee = 0;
        self.dispute_fee_bps = 0;
        self.fees_enabled = false;

        self.updated_at = Clock::get()?.unix_timestamp;
        self.bump = bump;
        self._reserved = [0u8; 64];

        Ok(())
    }

    /// Enable fees with target rates (call after mainnet governance approval)
    pub fn enable_production_fees(&mut self) -> Result<()> {
        self.escrow_fee_bps = 50; // 0.5%
        self.agent_registration_fee = 10_000_000; // 0.01 SOL
        self.listing_fee = 1_000_000; // 0.001 SOL
        self.dispute_fee_bps = 100; // 1%
        self.fees_enabled = true;
        self.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Calculate escrow fee amount
    /// Returns (agent_amount, treasury_share, buyback_share)
    pub fn calculate_escrow_fee(&self, amount: u64) -> (u64, u64, u64) {
        if !self.fees_enabled || self.escrow_fee_bps == 0 {
            return (amount, 0, 0);
        }

        let total_fee = (amount as u128 * self.escrow_fee_bps as u128 / 10000) as u64;
        let treasury_share = (total_fee * 80) / 100; // 80% to treasury
        let buyback_share = total_fee - treasury_share; // 20% to buyback
        let agent_amount = amount - total_fee;

        (agent_amount, treasury_share, buyback_share)
    }

    /// Get agent registration fee (0 if disabled)
    pub fn get_registration_fee(&self) -> u64 {
        if self.fees_enabled {
            self.agent_registration_fee
        } else {
            0
        }
    }

    /// Get listing fee (0 if disabled)
    pub fn get_listing_fee(&self) -> u64 {
        if self.fees_enabled {
            self.listing_fee
        } else {
            0
        }
    }

    /// Calculate dispute resolution fee
    pub fn calculate_dispute_fee(&self, amount: u64) -> u64 {
        if !self.fees_enabled || self.dispute_fee_bps == 0 {
            return 0;
        }

        (amount as u128 * self.dispute_fee_bps as u128 / 10000) as u64
    }
}

/// Event emitted when protocol config is updated
#[event]
pub struct ProtocolConfigUpdatedEvent {
    pub authority: Pubkey,
    pub fees_enabled: bool,
    pub escrow_fee_bps: u16,
    pub agent_registration_fee: u64,
    pub listing_fee: u64,
    pub dispute_fee_bps: u16,
    pub timestamp: i64,
}
