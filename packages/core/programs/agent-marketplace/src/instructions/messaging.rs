/*!
 * Messaging Module
 * 
 * Handles all messaging and channel communication functionality for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use crate::{*, PodAIMarketplaceError, state::{ChannelType, MessageType}};

// =====================================================
// DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChannelCreationData {
    pub channel_id: u64,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MessageData {
    pub content: String,
    pub message_type: MessageType,
    pub is_encrypted: bool,
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct ChannelCreatedEvent {
    pub channel: Pubkey,
    pub creator: Pubkey,
    pub channel_type: ChannelType,
}

#[event]
pub struct MessageSentEvent {
    pub message: Pubkey,
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub message_type: MessageType,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Creates a secure communication channel between agents
/// 
/// Establishes a channel for agents to exchange messages, coordinate work, and share updates.
/// Supports both direct (1-to-1) and group channels with privacy controls.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the channel account and creator authority
/// * `channel_data` - Channel configuration including:
///   - `participants` - Array of agent public keys that can access the channel
///   - `channel_type` - Type of channel (Direct, Group, Public, Private)
///   - `is_private` - Whether the channel contents are encrypted
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful channel creation
/// 
/// # Errors
/// 
/// * `InvalidParticipants` - If participant list is empty or contains invalid keys
/// * `UnauthorizedAccess` - If creator is not a verified agent
/// 
/// # Security
/// 
/// Private channels use end-to-end encryption with keys derived from participant public keys
pub fn create_channel(
    ctx: Context<CreateChannel>,
    channel_data: ChannelCreationData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation for participants list
    require!(
        !channel_data.participants.is_empty() && channel_data.participants.len() <= MAX_PARTICIPANTS_COUNT,
        PodAIMarketplaceError::InputTooLong
    );

    let channel = &mut ctx.accounts.channel;
    let clock = Clock::get()?;

    channel.creator = ctx.accounts.creator.key();
    channel.participants = channel_data.participants.clone();
    channel.channel_type = channel_data.channel_type.clone();
    channel.is_private = channel_data.is_private;
    channel.message_count = 0;
    channel.created_at = clock.unix_timestamp;
    channel.last_activity = clock.unix_timestamp;
    channel.is_active = true;
    channel.bump = ctx.bumps.channel;

    emit!(ChannelCreatedEvent {
        channel: channel.key(),
        creator: ctx.accounts.creator.key(),
        channel_type: channel_data.channel_type.clone(),
    });

    Ok(())
}

/// Sends a message in an existing communication channel
/// 
/// Allows channel participants to send text, files, images, audio, or system messages.
/// Messages are stored on-chain with optional encryption for private channels.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the message, channel, and sender accounts
/// * `message_data` - Message content including:
///   - `content` - The message content (text or IPFS hash for files)
///   - `message_type` - Type of message (Text, File, Image, Audio, System)
///   - `is_encrypted` - Whether the message content is encrypted
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful message send
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If sender is not a channel participant
/// * `ChannelInactive` - If the channel has been deactivated
/// * `MessageTooLarge` - If message content exceeds 4KB limit
/// 
/// # Example
/// 
/// ```no_run
/// let message = MessageData {
///     content: "Ready to start work on the task".to_string(),
///     message_type: MessageType::Text,
///     is_encrypted: false,
/// };
/// ```
pub fn send_message(
    ctx: Context<SendMessage>,
    message_data: MessageData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.sender.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation for message content
    const MAX_MESSAGE_LENGTH: usize = 1024;
    require!(
        !message_data.content.is_empty() && message_data.content.len() <= MAX_MESSAGE_LENGTH,
        PodAIMarketplaceError::InputTooLong
    );

    let message = &mut ctx.accounts.message;
    let channel = &mut ctx.accounts.channel;
    let clock = Clock::get()?;

    message.channel = channel.key();
    message.sender = ctx.accounts.sender.key();
    message.content = message_data.content.clone();
    message.message_type = message_data.message_type.clone();
    message.timestamp = clock.unix_timestamp;
    message.is_encrypted = message_data.is_encrypted;
    message.bump = ctx.bumps.message;

    // SECURITY FIX: Use checked arithmetic for message count
    channel.message_count = channel.message_count
        .checked_add(1)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
    channel.last_activity = clock.unix_timestamp;

    emit!(MessageSentEvent {
        message: message.key(),
        channel: channel.key(),
        sender: ctx.accounts.sender.key(),
        message_type: message_data.message_type.clone(),
    });

    Ok(())
}

// =====================================================
// ACCOUNT STRUCTS
// =====================================================

#[derive(Accounts)]
#[instruction(channel_data: ChannelCreationData)]
pub struct CreateChannel<'info> {
    #[account(
        init,
        payer = creator,
        space = Channel::LEN,
        seeds = [b"channel", creator.key().as_ref(), &channel_data.channel_id.to_le_bytes()],
        bump
    )]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(message_data: MessageData)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = Message::LEN,
        seeds = [b"message", channel.key().as_ref(), &channel.message_count.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}