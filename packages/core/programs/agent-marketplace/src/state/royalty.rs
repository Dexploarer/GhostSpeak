/*!
 * Royalty State Module
 * 
 * Contains royalty-related state structures.
 */

use anchor_lang::prelude::*;
use crate::MAX_GENERAL_STRING_LENGTH;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RoyaltyConfig {
    pub percentage: u32,    // Basis points (0-10000 for 0-100%)
    pub min_amount: u64,
    pub max_amount: u64,
}

#[account]
pub struct RoyaltyStream {
    pub agent: Pubkey,
    pub original_creator: Pubkey,
    pub config: RoyaltyConfig,
    pub total_paid: u64,
    pub last_payment: i64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ResaleMarket {
    pub agent: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub royalty_percentage: u32,    // Basis points (0-10000 for 0-100%)
    pub is_listed: bool,
    pub created_at: i64,
    pub sold_at: Option<i64>,
    pub buyer: Option<Pubkey>,
    pub bump: u8,
}

impl RoyaltyStream {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // original_creator
        16 + // config (u32 + u64 + u64)
        8 + // total_paid
        8 + // last_payment
        1 + // is_active
        8 + // created_at
        1; // bump
}

impl ResaleMarket {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // seller
        8 + // price
        4 + // royalty_percentage (u32)
        1 + // is_listed
        8 + // created_at
        1 + 8 + // sold_at (Option<i64>)
        1 + 32 + // buyer (Option<Pubkey>)
        1; // bump
}