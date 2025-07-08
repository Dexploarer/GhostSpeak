/*!
 * State definitions for Agent Marketplace Program
 * Defines all data structures, enums, and events for the agent marketplace
 */

use anchor_lang::prelude::*;

// =====================================================
// DATA STRUCTURES FOR INSTRUCTIONS
// =====================================================

// Human Purchasing & Job Hiring Structures
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServiceListingData {
    pub title: String,
    pub description: String,
    pub service_type: ServiceType,
    pub price: u64,
    pub payment_token: Pubkey,
    pub estimated_delivery: i64, // Hours
    pub tags: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServicePurchaseData {
    pub requirements: String,
    pub custom_instructions: String,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobPostingData {
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub skills_needed: Vec<String>,
    pub budget_min: u64,
    pub budget_max: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
    pub job_type: JobType,
    pub experience_level: ExperienceLevel,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobApplicationData {
    pub cover_letter: String,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<PortfolioItem>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PortfolioItem {
    pub title: String,
    pub description: String,
    pub url: String,
    pub category: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobCompletionData {
    pub deliverables: Vec<Deliverable>,
    pub work_summary: String,
    pub ipfs_hash: String,
    pub metadata_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReviewData {
    pub review_type: ReviewType,
    pub rating: u8, // 1-5 stars
    pub comment: String,
    pub work_reference: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentVerificationData {
    pub agent_pubkey: Pubkey,
    pub service_endpoint: String,
    pub supported_capabilities: Vec<String>,
    pub verified_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentServiceData {
    pub agent_pubkey: Pubkey,
    pub service_endpoint: String,
    pub is_active: bool,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ChannelCreationData {
    pub channel_id: u64,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MessageData {
    pub content: String,
    pub message_type: MessageType,
    pub is_encrypted: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WorkOrderData {
    pub order_id: u64,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WorkDeliveryData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReplicationTemplateData {
    pub replication_fee: u64,
    pub max_replications: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentCustomization {
    pub name: String,
    pub description: Option<String>,
    pub pricing_model: PricingModel,
    pub is_replicable: bool,
    pub replication_fee: Option<u64>,
}

// =====================================================
// ENUMS
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PricingModel {
    PerTask { base_rate: u64 },
    Hourly { hourly_rate: u64 },
    Subscription { monthly_fee: u64 },
    Revenue { percentage: u8 }, // 0-100
    Custom { terms: String },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ChannelType {
    DirectMessage,      // 1-on-1 communication
    GroupChat,         // Multi-agent discussion
    WorkOrder,         // Work-related communication
    Marketplace,       // Public marketplace discussion
    Support,          // Support and help channels
    Negotiation,      // Price and terms negotiation
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum MessageType {
    Text,
    WorkProposal,
    WorkAcceptance,
    WorkDelivery,
    PaymentRequest,
    StatusUpdate,
    File,
    System,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum WorkOrderStatus {
    Created,        // Just created, waiting for provider response
    Accepted,       // Provider accepted the work
    InProgress,     // Work is being performed
    Submitted,      // Work delivered, waiting for approval
    Approved,       // Client approved the work
    Completed,      // Payment processed, work finished
    Disputed,       // There's a dispute
    Cancelled,      // Work order cancelled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Deliverable {
    pub name: String,
    pub deliverable_type: DeliverableType,
    pub file_hash: String,
    pub file_size: u64,
    pub checksum: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum DeliverableType {
    Code,
    Documentation,
    Asset,
    Data,
    Report,
    Other,
}

// =====================================================
// ACCOUNT SIZE CALCULATIONS
// =====================================================

impl Agent {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        4 + 50 + // name (max 50 chars)
        4 + 200 + // description (max 200 chars)
        4 + (10 * (4 + 50)) + // capabilities (max 10 capabilities, 50 chars each)
        1 + 8 + 8 + 4 + 50 + // pricing_model (variant + data)
        8 + // reputation_score
        8 + // total_jobs_completed
        8 + // total_earnings
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        4 + 64 + // genome_hash (max 64 chars)
        1 + // is_replicable
        8 + // replication_fee
        1; // bump
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

impl WorkOrder {
    pub const LEN: usize = 8 + // discriminator
        32 + // client
        32 + // provider
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        4 + (5 * (4 + 100)) + // requirements (max 5 requirements, 100 chars each)
        8 + // payment_amount
        32 + // payment_token
        8 + // deadline
        1 + // status
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl WorkDelivery {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // provider
        32 + // client
        4 + (10 * (4 + 50 + 1 + 4 + 64 + 8 + 4 + 32)) + // deliverables (max 10)
        4 + 64 + // ipfs_hash
        4 + 200 + // metadata_uri
        8 + // submitted_at
        1 + // is_approved
        1; // bump
}

impl Payment {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // payer
        32 + // recipient
        8 + // amount
        32 + // token_mint
        1 + // is_confidential
        8 + // paid_at
        1; // bump
}

impl ReplicationTemplate {
    pub const LEN: usize = 8 + // discriminator
        32 + // source_agent
        32 + // creator
        4 + 64 + // genome_hash
        4 + (10 * (4 + 50)) + // base_capabilities
        8 + // replication_fee
        4 + // max_replications
        4 + // current_replications
        1 + // is_active
        8 + // created_at
        1; // bump
}

impl ReplicationRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // template
        32 + // source_agent
        32 + // replicated_agent
        32 + // buyer
        8 + // fee_paid
        8 + // replicated_at
        1; // bump
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct AgentRegisteredEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub capabilities: Vec<String>,
}

#[event]
pub struct AgentUpdatedEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct ChannelCreatedEvent {
    pub channel: Pubkey,
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
}

#[event]
pub struct MessageSentEvent {
    pub channel: Pubkey,
    pub message: Pubkey,
    pub sender: Pubkey,
    pub message_type: MessageType,
}

#[event]
pub struct WorkOrderCreatedEvent {
    pub work_order: Pubkey,
    pub client: Pubkey,
    pub provider: Pubkey,
    pub payment_amount: u64,
}

#[event]
pub struct WorkDeliverySubmittedEvent {
    pub work_order: Pubkey,
    pub work_delivery: Pubkey,
    pub provider: Pubkey,
    pub ipfs_hash: String,
}

#[event]
pub struct PaymentProcessedEvent {
    pub work_order: Pubkey,
    pub payment: Pubkey,
    pub amount: u64,
    pub is_confidential: bool,
}

#[event]
pub struct ReplicationTemplateCreatedEvent {
    pub template: Pubkey,
    pub source_agent: Pubkey,
    pub creator: Pubkey,
    pub replication_fee: u64,
}

#[event]
pub struct AgentReplicatedEvent {
    pub template: Pubkey,
    pub original_agent: Pubkey,
    pub new_agent: Pubkey,
    pub buyer: Pubkey,
    pub fee_paid: u64,
}

// =====================================================
// ERROR CODES
// =====================================================

#[error_code]
pub enum AgentMarketplaceError {
    #[msg("Unauthorized access to channel")]
    UnauthorizedChannelAccess,
    
    #[msg("Unauthorized work submission")]
    UnauthorizedWorkSubmission,
    
    #[msg("Invalid work order status")]
    InvalidWorkOrderStatus,
    
    #[msg("Work not approved for payment")]
    WorkNotApproved,
    
    #[msg("Incorrect payment amount")]
    IncorrectPaymentAmount,
    
    #[msg("Agent is not replicable")]
    AgentNotReplicable,
    
    #[msg("Replication limit exceeded")]
    ReplicationLimitExceeded,
    
    #[msg("Invalid pricing model")]
    InvalidPricingModel,
    
    #[msg("Channel is not active")]
    ChannelNotActive,
    
    #[msg("Agent is not active")]
    AgentNotActive,
    
    #[msg("Insufficient reputation")]
    InsufficientReputation,
    
    #[msg("Work deadline exceeded")]
    WorkDeadlineExceeded,
    
    #[msg("Invalid deliverable format")]
    InvalidDeliverableFormat,
    
    #[msg("Marketplace fee calculation error")]
    MarketplaceFeeError,
    
    #[msg("Unauthorized access to session")]
    UnauthorizedSessionAccess,
}