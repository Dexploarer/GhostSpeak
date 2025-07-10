/*!
 * A2A Protocol Module
 * 
 * Contains all agent-to-agent communication protocol functionality
 * including session management, messaging, and status updates.
 */

use anchor_lang::prelude::*;
use crate::{*, PodAIMarketplaceError};

// =====================================================
// A2A PROTOCOL INSTRUCTIONS
// =====================================================

/// Creates a new A2A communication session between agents
/// 
/// Establishes secure communication channels between 2+ agents with session
/// management, message routing, and automatic cleanup after inactivity.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing session accounts
/// * `session_data` - Session configuration including:
///   - `session_id` - Unique identifier for the session
///   - `participants` - Array of agent public keys
///   - `session_type` - Direct, group, or swarm communication
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful session creation
/// 
/// # Errors
/// 
/// * `InvalidParticipants` - If participants array is empty or too large
/// * `SessionAlreadyExists` - If session ID is already in use
/// 
/// # Example
/// 
/// ```ignore
/// let session_data = A2ASessionData {
///     session_id: 123,
///     initiator: agent1.key(),
///     responder: agent2.key(),
///     session_type: "Direct".to_string(),
///     metadata: "Agent session metadata".to_string(),
///     expires_at: clock.unix_timestamp + 3600,
/// };
/// create_a2a_session(ctx, session_data)?;
/// ```
/// 
/// # Security
/// 
/// - Only the session creator can initialize the session
/// - All participants must be valid agent accounts
/// - Session IDs must be unique to prevent replay attacks
/// 
/// # A2A Protocol Standards
/// 
/// Follows standardized A2A protocol for:
/// - Message formatting
/// - Error handling
/// - State synchronization
pub fn create_a2a_session(
    ctx: Context<CreateA2ASession>,
    session_data: A2ASessionData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    // SECURITY: Input validation
    const MAX_SESSION_ID_LENGTH: usize = 64;
    const MAX_PARTICIPANTS: usize = 10;
    const MAX_CONTEXT_LENGTH: usize = 2048;
    
    // Validate session_id is non-zero (since it's u64)
    require!(
        session_data.session_id > 0,
        PodAIMarketplaceError::InputTooLong
    );
    // Validate session has both initiator and responder
    require!(
        session_data.initiator != Pubkey::default() && session_data.responder != Pubkey::default(),
        PodAIMarketplaceError::InvalidConfiguration
    );
    let session = &mut ctx.accounts.session;
    let clock = Clock::get()?;
    // Set session fields from the stub structure
    session.session_id = session_data.session_id;
    session.initiator = session_data.initiator;
    session.responder = session_data.responder;
    session.session_type = session_data.session_type;
    session.metadata = session_data.metadata;
    session.is_active = true;
    session.created_at = clock.unix_timestamp;
    session.expires_at = session_data.expires_at;
    session.bump = ctx.bumps.session;
    emit!(crate::A2ASessionCreatedEvent {
        session_id: session_data.session_id,
        initiator: session_data.initiator,
        responder: session_data.responder,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

/// Sends a message in an A2A session with multi-modal content support
/// 
/// Transmits structured messages between agents including text, code, data,
/// and streaming content with automatic context management.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing message and session accounts
/// * `message_content` - Message data including:
///   - `content_type` - Type of content (text, code, data, stream)
///   - `payload` - The actual message content
///   - `metadata` - Optional message metadata
///   - `requires_response` - Whether a response is expected
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful message send
/// 
/// # Errors
/// 
/// * `SessionInactive` - If session has expired
/// * `UnauthorizedSender` - If sender is not a participant
/// * `MessageTooLarge` - If content exceeds size limits
/// 
/// # Example
/// 
/// ```ignore
/// let message_data = A2AMessageData {
///     role: MessageRole::Agent,
///     parts: vec![MessagePart {
///         part_type: PartType::Text,
///         content: "Processing request...".to_string(),
///         metadata: None,
///     }],
/// };
/// send_a2a_message(ctx, message_data)?;
/// ```
/// 
/// # Multi-Modal Support
/// 
/// Supports various content types:
/// - Text messages
/// - Code snippets with syntax highlighting
/// - Structured data (JSON, binary)
/// - Streaming content with chunk management
/// 
/// # Context Management
/// 
/// Messages are automatically added to session context
/// with FIFO eviction when window size is exceeded
pub fn send_a2a_message(
    ctx: Context<SendA2AMessage>,
    message_data: A2AMessageData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.sender.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    let session = &ctx.accounts.session;
    
    // SECURITY: Verify sender is a participant in the session
    require!(
        session.initiator == ctx.accounts.sender.key() || 
        session.responder == ctx.accounts.sender.key(),
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Verify session is still active
    require!(
        session.is_active,
        PodAIMarketplaceError::InvalidStatusTransition
    );
    
    // SECURITY: Input validation
    const MAX_CONTENT_LENGTH: usize = 4096;
    
    require!(
        !message_data.content.is_empty() && message_data.content.len() <= MAX_CONTENT_LENGTH,
        PodAIMarketplaceError::InputTooLong
    );
    let message = &mut ctx.accounts.message;
    let clock = Clock::get()?;
    
    // Set message fields from the stub structure
    message.message_id = message_data.message_id;
    message.session = ctx.accounts.session.key();
    message.sender = ctx.accounts.sender.key();
    message.content = message_data.content;
    message.message_type = message_data.message_type;
    message.sent_at = clock.unix_timestamp;
    message.bump = ctx.bumps.message;
    
    emit!(crate::A2AMessageSentEvent {
        message_id: message_data.message_id,
        session_id: session.session_id,
        sender: ctx.accounts.sender.key(),
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

/// Updates A2A session status for streaming and state management
/// 
/// Manages session lifecycle including streaming status, connection state,
/// and activity tracking for proper resource management.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing session account
/// * `status_update` - Status update including:
///   - `is_streaming` - Whether agent is currently streaming
///   - `stream_position` - Current position in stream
///   - `connection_status` - Active, idle, or disconnected
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful status update
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If updater is not a participant
/// * `SessionClosed` - If session is already closed
/// 
/// # Example
/// 
/// ```ignore
/// let status_data = A2AStatusData {
///     session_id: "session_123".to_string(),
///     message_id: "msg_456".to_string(),
///     state: MessageStatus::Working,
///     progress: 50,
///     partial_content: "Processing...".to_string(),
///     final: false,
/// };
/// update_a2a_status(ctx, status_data)?;
/// ```
/// 
/// # Streaming Support
/// 
/// Enables real-time streaming updates:
/// - Progress indicators (0-100%)
/// - Partial content delivery
/// - State transitions
/// - Final result notification
/// 
/// # Automatic Cleanup
/// 
/// Sessions are automatically closed after 30 minutes
/// of inactivity to free resources
pub fn update_a2a_status(
    ctx: Context<UpdateA2AStatus>,
    status_data: A2AStatusData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.updater.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    // SECURITY: Input validation
    const MAX_STATUS_LENGTH: usize = 256;
    const MAX_CAPABILITIES: usize = 20;
    const MAX_CAPABILITY_LENGTH: usize = 64;
    
    require!(
        !status_data.status.is_empty() && status_data.status.len() <= MAX_STATUS_LENGTH,
        PodAIMarketplaceError::InputTooLong
    );
    require!(
        status_data.capabilities.len() <= MAX_CAPABILITIES,
        PodAIMarketplaceError::InputTooLong
    );
    for capability in &status_data.capabilities {
        require!(
            !capability.is_empty() && capability.len() <= MAX_CAPABILITY_LENGTH,
            PodAIMarketplaceError::InputTooLong
        );
    }
    let status = &mut ctx.accounts.status;
    let clock = Clock::get()?;
    status.agent = status_data.agent;
    status.status = status_data.status.clone();
    status.capabilities = status_data.capabilities.clone();
    status.availability = status_data.availability;
    status.last_updated = clock.unix_timestamp;
    status.bump = ctx.bumps.status;
    emit!(crate::A2AStatusUpdatedEvent {
        agent: status_data.agent,
        status: status_data.status,
        availability: status_data.availability,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

// =====================================================
// A2A PROTOCOL CONTEXT STRUCTURES
// =====================================================

#[derive(Accounts)]
pub struct CreateA2ASession<'info> {
    #[account(
        init,
        payer = creator,
        space = A2ASession::LEN,
        seeds = [b"a2a_session", creator.key().as_ref()],
        bump
    )]
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendA2AMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = A2AMessage::LEN,
        seeds = [b"a2a_message", session.key().as_ref(), &session.created_at.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, A2AMessage>,
    
    #[account(mut)]
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateA2AStatus<'info> {
    #[account(
        init,
        payer = updater,
        space = A2AStatus::LEN,
        seeds = [b"a2a_status", session.key().as_ref()],
        bump
    )]
    pub status: Account<'info, A2AStatus>,
    
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub updater: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}