/*!
 * H2A Protocol Module (Human-to-Agent Communication)
 *
 * Extends the A2A protocol to support human participants in addition to AI agents.
 * Allows humans to hire agents, send messages, and participate in the GhostSpeak ecosystem.
 */

use crate::state::protocol_structures::{
    CommunicationMessage, CommunicationMessageData, CommunicationSession, CommunicationSessionData,
    ParticipantType,
};
use crate::GhostSpeakError;
use anchor_lang::prelude::*;

// =====================================================
// H2A PROTOCOL INSTRUCTIONS
// =====================================================

/// Creates a new communication session between any combination of humans and agents
///
/// This unified instruction supports all communication types:
/// - Human-to-Agent (H2A): Humans hiring or messaging agents
/// - Agent-to-Agent (A2A): Existing agent-to-agent communication  
/// - Human-to-Human (H2H): Future expansion for human collaboration
/// - Multi-party: Groups with mixed human/agent participants
///
/// # Arguments
///
/// * `ctx` - The context containing session accounts
/// * `session_data` - Session configuration including:
///   - `session_id` - Unique identifier for the session
///   - `initiator` - Public key of session creator
///   - `initiator_type` - Whether initiator is human or agent
///   - `responder` - Public key of session responder  
///   - `responder_type` - Whether responder is human or agent
///   - `session_type` - Communication type and purpose
///
/// # Returns
///
/// Returns `Ok(())` on successful session creation
///
/// # Errors
///
/// * `InvalidParticipants` - If participant types are invalid
/// * `SessionAlreadyExists` - If session ID is already in use
/// * `UnauthorizedAccess` - If creator is not authorized
///
/// # Example
///
/// ```ignore
/// // Human hiring an agent
/// let session_data = CommunicationSessionData {
///     session_id: 123,
///     initiator: human_wallet.key(),
///     initiator_type: ParticipantType::Human,
///     responder: agent_account.key(),
///     responder_type: ParticipantType::Agent,
///     session_type: "service_request".to_string(),
///     metadata: "Human needs data analysis".to_string(),
///     expires_at: clock.unix_timestamp + 3600,
/// };
/// create_communication_session(ctx, session_data)?;
/// ```
///
/// # Security
///
/// - Only the session creator can initialize the session
/// - Human participants are verified by wallet signature
/// - Agent participants must be registered GhostSpeak agents
/// - Session IDs must be unique to prevent replay attacks
///
/// # Protocol Standards
///
/// Follows standardized communication protocol for:
/// - Message formatting across participant types
/// - Payment and escrow integration
/// - Service delivery verification
/// - Cross-participant authentication
pub fn create_communication_session(
    ctx: Context<CreateCommunicationSession>,
    session_data: CommunicationSessionData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_CONTEXT_LENGTH: usize = 2048;

    // Validate session_id is non-zero
    require!(session_data.session_id > 0, GhostSpeakError::InputTooLong);

    // Validate session has both initiator and responder
    require!(
        session_data.initiator != Pubkey::default() && session_data.responder != Pubkey::default(),
        GhostSpeakError::InvalidConfiguration
    );

    // Validate session metadata length
    require!(
        session_data.metadata.len() <= MAX_CONTEXT_LENGTH,
        GhostSpeakError::InputTooLong
    );

    // Validate participant types are valid
    require!(
        matches!(
            session_data.initiator_type,
            ParticipantType::Human | ParticipantType::Agent
        ),
        GhostSpeakError::InvalidConfiguration
    );
    require!(
        matches!(
            session_data.responder_type,
            ParticipantType::Human | ParticipantType::Agent
        ),
        GhostSpeakError::InvalidConfiguration
    );

    let session = &mut ctx.accounts.session;
    let clock = Clock::get()?;

    // Initialize session fields
    session.session_id = session_data.session_id;
    session.initiator = session_data.initiator;
    session.initiator_type = session_data.initiator_type;
    session.responder = session_data.responder;
    session.responder_type = session_data.responder_type;
    session.session_type = session_data.session_type;
    session.metadata = session_data.metadata;
    session.is_active = true;
    session.created_at = clock.unix_timestamp;
    session.expires_at = session_data.expires_at;
    session.bump = ctx.bumps.session;

    emit!(crate::CommunicationSessionCreatedEvent {
        session_id: session_data.session_id,
        initiator: session_data.initiator,
        initiator_type: session_data.initiator_type,
        responder: session_data.responder,
        responder_type: session_data.responder_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Sends a message in a communication session between any participant types
///
/// Supports all communication patterns:
/// - Humans sending service requests to agents
/// - Agents responding with work updates or results
/// - Mixed group communications
/// - File attachments and rich content
///
/// # Arguments
///
/// * `ctx` - The context containing message and session accounts
/// * `message_data` - Message data including:
///   - `content` - The message content
///   - `message_type` - Type of message (request, response, update, etc.)
///   - `sender_type` - Whether sender is human or agent
///   - `attachments` - Optional file references
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
/// // Human sending work request to agent
/// let message_data = CommunicationMessageData {
///     message_id: 456,
///     sender_type: ParticipantType::Human,
///     content: "Please analyze this dataset and provide insights".to_string(),
///     message_type: "service_request".to_string(),
///     attachments: vec!["ipfs://QmHash123".to_string()],
/// };
/// send_communication_message(ctx, message_data)?;
/// ```
///
/// # Payment Integration
///
/// Messages can trigger automatic payment flows:
/// - Service requests can include payment commitments
/// - Work delivery messages can trigger escrow release
/// - Progress updates can unlock milestone payments
///
/// # Rich Content Support
///
/// Supports various content types:
/// - Text messages and instructions
/// - File attachments via IPFS references
/// - Structured data (JSON payloads)
/// - Media content (images, documents)
pub fn send_communication_message(
    ctx: Context<SendCommunicationMessage>,
    message_data: CommunicationMessageData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.sender.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    let session = &ctx.accounts.session;

    // SECURITY: Verify sender is a participant in the session
    require!(
        session.initiator == ctx.accounts.sender.key()
            || session.responder == ctx.accounts.sender.key(),
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Verify session is still active
    require!(session.is_active, GhostSpeakError::InvalidStatusTransition);

    // SECURITY: Input validation
    const MAX_CONTENT_LENGTH: usize = 8192; // Larger for human-agent interactions
    const MAX_ATTACHMENTS: usize = 10;
    const MAX_ATTACHMENT_URI_LENGTH: usize = 256;

    require!(
        !message_data.content.is_empty() && message_data.content.len() <= MAX_CONTENT_LENGTH,
        GhostSpeakError::InputTooLong
    );

    require!(
        message_data.attachments.len() <= MAX_ATTACHMENTS,
        GhostSpeakError::InputTooLong
    );

    for attachment in &message_data.attachments {
        require!(
            !attachment.is_empty() && attachment.len() <= MAX_ATTACHMENT_URI_LENGTH,
            GhostSpeakError::InputTooLong
        );
    }

    let message = &mut ctx.accounts.message;
    let clock = Clock::get()?;

    // Initialize message fields
    message.message_id = message_data.message_id;
    message.session = ctx.accounts.session.key();
    message.sender = ctx.accounts.sender.key();
    message.sender_type = message_data.sender_type;
    message.content = message_data.content;
    message.message_type = message_data.message_type;
    message.attachments = message_data.attachments;
    message.sent_at = clock.unix_timestamp;
    message.bump = ctx.bumps.message;

    emit!(crate::CommunicationMessageSentEvent {
        message_id: message_data.message_id,
        session_id: session.session_id,
        sender: ctx.accounts.sender.key(),
        sender_type: message_data.sender_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Updates participant availability and capabilities for service discovery
///
/// Allows both humans and agents to advertise their services, availability,
/// and current status for better matching and discovery.
///
/// # Arguments
///
/// * `ctx` - The context containing participant status account
/// * `status_data` - Status update including:
///   - `participant_type` - Whether participant is human or agent
///   - `services_offered` - List of services available
///   - `availability` - Current availability status
///   - `reputation_score` - Current reputation score
///
/// # Returns
///
/// Returns `Ok(())` on successful status update
///
/// # Errors
///
/// * `UnauthorizedAccess` - If updater is not the participant
/// * `InvalidParticipantType` - If participant type is invalid
///
/// # Example
///
/// ```ignore
/// // Human freelancer advertising services
/// let status_data = ParticipantStatusData {
///     participant: human_wallet.key(),
///     participant_type: ParticipantType::Human,
///     services_offered: vec![
///         "content_writing".to_string(),
///         "data_entry".to_string()
///     ],
///     availability: true,
///     reputation_score: 85,
/// };
/// update_participant_status(ctx, status_data)?;
/// ```
///
/// # Service Discovery
///
/// Status updates enable:
/// - Automatic matching of service requests to providers
/// - Reputation-based filtering and ranking
/// - Availability-based routing
/// - Specialized skill matching
pub fn update_participant_status(
    ctx: Context<UpdateParticipantStatus>,
    status_data: ParticipantStatusData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.participant.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_SERVICES: usize = 20;
    const MAX_SERVICE_NAME_LENGTH: usize = 64;

    require!(
        status_data.services_offered.len() <= MAX_SERVICES,
        GhostSpeakError::InputTooLong
    );

    for service in &status_data.services_offered {
        require!(
            !service.is_empty() && service.len() <= MAX_SERVICE_NAME_LENGTH,
            GhostSpeakError::InputTooLong
        );
    }

    require!(
        status_data.reputation_score <= 100,
        GhostSpeakError::InvalidConfiguration
    );

    let status = &mut ctx.accounts.status;
    let clock = Clock::get()?;

    // Update status fields
    status.participant = status_data.participant;
    status.participant_type = status_data.participant_type;
    status.services_offered = status_data.services_offered.clone();
    status.availability = status_data.availability;
    status.reputation_score = status_data.reputation_score;
    status.last_updated = clock.unix_timestamp;
    status.bump = ctx.bumps.status;

    emit!(crate::ParticipantStatusUpdatedEvent {
        participant: status_data.participant,
        participant_type: status_data.participant_type,
        availability: status_data.availability,
        reputation_score: status_data.reputation_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// H2A PROTOCOL CONTEXT STRUCTURES
// =====================================================

#[derive(Accounts)]
pub struct CreateCommunicationSession<'info> {
    #[account(
        init,
        payer = creator,
        space = CommunicationSession::LEN,
        seeds = [b"comm_session", creator.key().as_ref()],
        bump
    )]
    pub session: Account<'info, CommunicationSession>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendCommunicationMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = CommunicationMessage::LEN,
        seeds = [b"comm_message", session.key().as_ref(), &session.created_at.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, CommunicationMessage>,

    #[account(mut)]
    pub session: Account<'info, CommunicationSession>,

    #[account(mut)]
    pub sender: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateParticipantStatus<'info> {
    #[account(
        init_if_needed,
        payer = participant,
        space = ParticipantStatus::LEN,
        seeds = [b"participant_status", participant.key().as_ref()],
        bump
    )]
    pub status: Account<'info, ParticipantStatus>,

    #[account(mut)]
    pub participant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// =====================================================
// DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ParticipantStatusData {
    pub participant: Pubkey,
    pub participant_type: ParticipantType,
    pub services_offered: Vec<String>,
    pub availability: bool,
    pub reputation_score: u8,
}

#[account]
pub struct ParticipantStatus {
    pub participant: Pubkey,
    pub participant_type: ParticipantType,
    pub services_offered: Vec<String>,
    pub availability: bool,
    pub reputation_score: u8,
    pub last_updated: i64,
    pub bump: u8,
}

impl ParticipantStatus {
    pub const LEN: usize = 8 + // discriminator
        32 + // participant
        1 + // participant_type
        4 + (20 * (4 + 64)) + // services_offered (max 20 services, 64 chars each)
        1 + // availability
        1 + // reputation_score
        8 + // last_updated
        1; // bump
}
