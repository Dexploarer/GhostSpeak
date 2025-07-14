/*!
 * Message State
 * 
 * Account structures for messages in the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use super::MessageType;

#[account]
pub struct Message {
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub message_type: MessageType,
    pub timestamp: i64,
    pub is_encrypted: bool,
    pub bump: u8,
}

impl Message {
    pub const LEN: usize = 8 + // discriminator
        32 + // channel
        32 + // sender
        4 + 1000 + // content (max 1000 chars)
        1 + // message_type
        8 + // timestamp
        1 + // is_encrypted
        1; // bump
}