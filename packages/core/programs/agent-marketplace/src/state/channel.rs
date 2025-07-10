/*!
 * Channel State
 * 
 * Account structures for communication channels in the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use super::ChannelType;

#[account]
pub struct Channel {
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
    pub message_count: u64,
    pub created_at: i64,
    pub last_activity: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl Channel {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        4 + (10 * 32) + // participants (max 10 participants)
        1 + // channel_type
        1 + // is_private
        8 + // message_count
        8 + // created_at
        8 + // last_activity
        1 + // is_active
        1; // bump
}