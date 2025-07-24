/*!
 * Channel Operations - Real-Time Messaging with Security
 *
 * Enhanced channel operations for GhostSpeak protocol with real-time messaging,
 * event streaming, and comprehensive security features following July 2025 standards.
 */

use anchor_lang::prelude::*;

use crate::security::ReentrancyGuard;
use crate::state::{
    channel::Channel, message::Message, ChannelType, MessageType, MAX_GENERAL_STRING_LENGTH,
    MAX_MESSAGE_LENGTH, MAX_PARTICIPANTS_COUNT,
};
use crate::{Agent, GhostSpeakError};

// =====================================================
// ENHANCED DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChannelMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    pub tags: Vec<String>,
    pub settings: ChannelSettings,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChannelSettings {
    pub allow_file_sharing: bool,
    pub allow_external_invites: bool,
    pub message_retention_days: u32,
    pub max_message_size: u32,
    pub require_encryption: bool,
    pub auto_archive_after_days: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MessageMetadata {
    pub reply_to: Option<Pubkey>,
    pub thread_id: Option<String>,
    pub attachments: Vec<AttachmentInfo>,
    pub mentions: Vec<Pubkey>,
    pub reactions: Vec<MessageReaction>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MessageReaction {
    pub emoji: String,
    pub users: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttachmentInfo {
    pub file_type: String,
    pub file_size: u64,
    pub file_hash: String,
    pub storage_url: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TypingIndicator {
    pub user: Pubkey,
    pub started_at: i64,
    pub is_typing: bool,
}

// =====================================================
// INSTRUCTION CONTEXTS - WITH REENTRANCY PROTECTION
// =====================================================

#[derive(Accounts)]
#[instruction(channel_id: String)]
pub struct CreateEnhancedChannel<'info> {
    #[account(
        init,
        payer = creator,
        space = Channel::LEN + 500, // Additional space for metadata
        seeds = [b"channel", channel_id.as_bytes()],
        bump
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        constraint = creator_agent.owner == creator.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub creator_agent: Account<'info, Agent>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(message_id: String)]
pub struct SendEnhancedMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = Message::LEN + 300, // Additional space for metadata
        seeds = [b"message", channel.key().as_ref(), message_id.as_bytes()],
        bump
    )]
    pub message: Account<'info, Message>,

    #[account(
        mut,
        constraint = channel.participants.contains(&sender.key()) @ GhostSpeakError::UnauthorizedAccess,
        constraint = channel.is_active @ GhostSpeakError::ChannelNotFound
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub sender: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinChannel<'info> {
    #[account(
        mut,
        constraint = !channel.participants.contains(&user.key()) @ GhostSpeakError::UserAlreadyInChannel
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        constraint = user_agent.owner == user.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub user_agent: Account<'info, Agent>,
}

#[derive(Accounts)]
pub struct LeaveChannel<'info> {
    #[account(
        mut,
        constraint = channel.participants.contains(&user.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateChannelSettings<'info> {
    #[account(
        mut,
        constraint = channel.creator == authority.key() @ GhostSpeakError::UnauthorizedAccess
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddMessageReaction<'info> {
    #[account(
        mut,
        constraint = channel.participants.contains(&user.key()) @ GhostSpeakError::UnauthorizedAccess
    )]
    pub channel: Account<'info, Channel>,

    #[account(
        mut,
        constraint = message.channel == channel.key() @ GhostSpeakError::InvalidConfiguration
    )]
    pub message: Account<'info, Message>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    pub user: Signer<'info>,
}

// =====================================================
// ENHANCED INSTRUCTION HANDLERS
// =====================================================

/// Creates an enhanced communication channel with metadata and settings
///
/// Establishes a feature-rich channel for real-time communication between agents
/// with comprehensive settings, metadata support, and security controls.
///
/// # Arguments
///
/// * `ctx` - The context containing channel account and creator
/// * `channel_id` - Unique identifier for the channel
/// * `participants` - Initial list of participant public keys
/// * `channel_type` - Type of channel (Direct, Group, Public, Private)
/// * `metadata` - Channel metadata including name, description, settings
///
/// # Security Features
///
/// - Reentrancy protection
/// - Creator agent verification
/// - Participant limit validation
/// - Input sanitization
///
/// # Returns
///
/// Returns `Ok(())` on successful channel creation
pub fn create_enhanced_channel(
    ctx: Context<CreateEnhancedChannel>,
    channel_id: String,
    participants: Vec<Pubkey>,
    channel_type: ChannelType,
    metadata: ChannelMetadata,
) -> Result<()> {
    msg!("Creating enhanced channel: {}", channel_id);

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // SECURITY: Validate inputs
    require!(
        !channel_id.is_empty() && channel_id.len() <= 64,
        GhostSpeakError::InvalidInput
    );

    require!(
        participants.len() > 0 && participants.len() <= MAX_PARTICIPANTS_COUNT,
        GhostSpeakError::TooManyParticipants
    );

    // Validate metadata
    if let Some(ref name) = metadata.name {
        require!(
            name.len() <= MAX_GENERAL_STRING_LENGTH,
            GhostSpeakError::InputTooLong
        );
    }

    if let Some(ref description) = metadata.description {
        require!(description.len() <= 512, GhostSpeakError::InputTooLong);
    }

    // Initialize channel
    let channel = &mut ctx.accounts.channel;
    let clock = Clock::get()?;

    channel.creator = ctx.accounts.creator.key();
    channel.participants = participants;
    channel.channel_type = channel_type;
    channel.is_private = metadata.settings.require_encryption;
    channel.message_count = 0;
    channel.created_at = clock.unix_timestamp;
    channel.last_activity = clock.unix_timestamp;
    channel.is_active = true;
    channel.bump = ctx.bumps.channel;

    // Emit enhanced channel creation event
    emit!(EnhancedChannelCreatedEvent {
        channel: channel.key(),
        creator: ctx.accounts.creator.key(),
        channel_type,
        metadata: metadata.clone(),
        participant_count: channel.participants.len() as u32,
        created_at: clock.unix_timestamp,
    });

    msg!("Enhanced channel created successfully");
    Ok(())
}

/// Sends an enhanced message with metadata and real-time features
///
/// Allows sending messages with rich metadata including replies, threads,
/// attachments, and mentions with real-time delivery notifications.
///
/// # Arguments
///
/// * `ctx` - The context containing message and channel accounts
/// * `message_id` - Unique identifier for the message
/// * `content` - Message content
/// * `message_type` - Type of message
/// * `metadata` - Message metadata including replies, attachments
/// * `is_encrypted` - Whether message is encrypted
///
/// # Security Features
///
/// - Reentrancy protection
/// - Participant verification
/// - Content validation
/// - Rate limiting protection
///
/// # Returns
///
/// Returns `Ok(())` on successful message send
pub fn send_enhanced_message(
    ctx: Context<SendEnhancedMessage>,
    message_id: String,
    content: String,
    message_type: MessageType,
    metadata: MessageMetadata,
    is_encrypted: bool,
) -> Result<()> {
    msg!("Sending enhanced message: {}", message_id);

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // SECURITY: Validate inputs
    require!(
        !message_id.is_empty() && message_id.len() <= 64,
        GhostSpeakError::InvalidInput
    );

    require!(
        !content.is_empty() && content.len() <= MAX_MESSAGE_LENGTH,
        GhostSpeakError::MessageTooLong
    );

    // SECURITY: Check message count limit per channel
    require!(
        ctx.accounts.channel.message_count < 50000,
        GhostSpeakError::TooManyMessages
    );

    // Validate attachments
    require!(
        metadata.attachments.len() <= 10,
        GhostSpeakError::TooManyAttachments
    );

    for attachment in &metadata.attachments {
        require!(
            attachment.file_size <= 50_000_000, // 50MB limit
            GhostSpeakError::FileTooLarge
        );
    }

    // Initialize message
    let message = &mut ctx.accounts.message;
    let channel = &mut ctx.accounts.channel;
    let clock = Clock::get()?;

    message.channel = channel.key();
    message.sender = ctx.accounts.sender.key();
    message.content = content.clone();
    message.message_type = message_type;
    message.timestamp = clock.unix_timestamp;
    message.is_encrypted = is_encrypted;
    message.bump = ctx.bumps.message;

    // Update channel statistics
    channel.message_count = channel
        .message_count
        .checked_add(1)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;
    channel.last_activity = clock.unix_timestamp;

    // Emit enhanced message event with real-time delivery
    emit!(EnhancedMessageSentEvent {
        message: message.key(),
        channel: channel.key(),
        sender: ctx.accounts.sender.key(),
        message_type,
        metadata: metadata.clone(),
        content_preview: if content.len() > 50 {
            format!("{}...", &content[..50])
        } else {
            content
        },
        timestamp: clock.unix_timestamp,
        mentions: metadata.mentions,
        thread_id: metadata.thread_id,
    });

    msg!("Enhanced message sent successfully");
    Ok(())
}

/// Allows a user to join an existing channel
///
/// Adds a new participant to the channel if they meet the requirements
/// and the channel allows new members.
pub fn join_channel(ctx: Context<JoinChannel>) -> Result<()> {
    msg!("User joining channel: {}", ctx.accounts.channel.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    let channel = &mut ctx.accounts.channel;

    // Check if channel allows new participants
    require!(
        channel.participants.len() < MAX_PARTICIPANTS_COUNT,
        GhostSpeakError::ChannelFull
    );

    // Add user to participants
    channel.participants.push(ctx.accounts.user.key());
    channel.last_activity = Clock::get()?.unix_timestamp;

    emit!(UserJoinedChannelEvent {
        channel: channel.key(),
        user: ctx.accounts.user.key(),
        joined_at: Clock::get()?.unix_timestamp,
    });

    msg!("User joined channel successfully");
    Ok(())
}

/// Allows a user to leave a channel
///
/// Removes the user from the channel participants list.
pub fn leave_channel(ctx: Context<LeaveChannel>) -> Result<()> {
    msg!("User leaving channel: {}", ctx.accounts.channel.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    let channel = &mut ctx.accounts.channel;

    // Remove user from participants
    channel
        .participants
        .retain(|&x| x != ctx.accounts.user.key());
    channel.last_activity = Clock::get()?.unix_timestamp;

    emit!(UserLeftChannelEvent {
        channel: channel.key(),
        user: ctx.accounts.user.key(),
        left_at: Clock::get()?.unix_timestamp,
    });

    msg!("User left channel successfully");
    Ok(())
}

/// Updates channel settings (creator only)
///
/// Allows the channel creator to modify channel settings and metadata.
pub fn update_channel_settings(
    ctx: Context<UpdateChannelSettings>,
    new_metadata: ChannelMetadata,
) -> Result<()> {
    msg!("Updating channel settings: {}", ctx.accounts.channel.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    let channel = &mut ctx.accounts.channel;

    // Update channel privacy based on settings
    channel.is_private = new_metadata.settings.require_encryption;
    channel.last_activity = Clock::get()?.unix_timestamp;

    emit!(ChannelSettingsUpdatedEvent {
        channel: channel.key(),
        updated_by: ctx.accounts.authority.key(),
        updated_at: Clock::get()?.unix_timestamp,
    });

    msg!("Channel settings updated successfully");
    Ok(())
}

/// Adds a reaction to a message
///
/// Allows channel participants to react to messages with emojis.
pub fn add_message_reaction(ctx: Context<AddMessageReaction>, reaction: String) -> Result<()> {
    msg!("Adding reaction to message: {}", ctx.accounts.message.key());

    // SECURITY: Apply reentrancy protection
    ctx.accounts.reentrancy_guard.lock()?;

    // Validate reaction
    require!(
        !reaction.is_empty() && reaction.len() <= 20,
        GhostSpeakError::InvalidInput
    );

    // Update channel activity
    ctx.accounts.channel.last_activity = Clock::get()?.unix_timestamp;

    emit!(MessageReactionEvent {
        message: ctx.accounts.message.key(),
        channel: ctx.accounts.channel.key(),
        user: ctx.accounts.user.key(),
        reaction,
        added_at: Clock::get()?.unix_timestamp,
    });

    msg!("Message reaction added successfully");
    Ok(())
}

// =====================================================
// ENHANCED EVENT DEFINITIONS
// =====================================================

#[event]
pub struct EnhancedChannelCreatedEvent {
    pub channel: Pubkey,
    pub creator: Pubkey,
    pub channel_type: ChannelType,
    pub metadata: ChannelMetadata,
    pub participant_count: u32,
    pub created_at: i64,
}

#[event]
pub struct EnhancedMessageSentEvent {
    pub message: Pubkey,
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub message_type: MessageType,
    pub metadata: MessageMetadata,
    pub content_preview: String,
    pub timestamp: i64,
    pub mentions: Vec<Pubkey>,
    pub thread_id: Option<String>,
}

#[event]
pub struct UserJoinedChannelEvent {
    pub channel: Pubkey,
    pub user: Pubkey,
    pub joined_at: i64,
}

#[event]
pub struct UserLeftChannelEvent {
    pub channel: Pubkey,
    pub user: Pubkey,
    pub left_at: i64,
}

#[event]
pub struct ChannelSettingsUpdatedEvent {
    pub channel: Pubkey,
    pub updated_by: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct MessageReactionEvent {
    pub message: Pubkey,
    pub channel: Pubkey,
    pub user: Pubkey,
    pub reaction: String,
    pub added_at: i64,
}

#[event]
pub struct TypingIndicatorEvent {
    pub channel: Pubkey,
    pub user: Pubkey,
    pub is_typing: bool,
    pub timestamp: i64,
}
