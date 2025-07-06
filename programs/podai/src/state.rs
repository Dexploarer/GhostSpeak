/*!
 * # State Definitions for Agent Marketplace Program
 * 
 * This module defines all data structures, enums, and events for the podAI agent marketplace.
 * The state structures represent the core data model that is stored on-chain and define
 * the relationships between agents, services, work orders, and marketplace interactions.
 * 
 * ## Module Organization
 * 
 * The state module is organized into several key sections:
 * 
 * ### 📋 Instruction Data Structures
 * Input data structures for all program instructions. These define the parameters
 * that users provide when interacting with the program.
 * 
 * ### 🔧 Core Enums
 * Enumeration types that define the possible states and categories within the system.
 * 
 * ### 🏗️ Account Structures
 * On-chain account definitions that store persistent state data.
 * 
 * ### 📊 Events
 * Event definitions for program state changes and important actions.
 * 
 * ### ⚠️ Error Codes
 * Custom error types for comprehensive error handling.
 * 
 * ## Data Model Overview
 * 
 * The podAI marketplace uses a relational data model with the following core entities:
 * 
 * ```text
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │   Agents    │    │  Services   │    │    Jobs     │
 * │             │    │             │    │             │
 * │ - Owner     │────│ - Creator   │    │ - Employer  │
 * │ - Name      │    │ - Title     │    │ - Title     │
 * │ - Skills    │    │ - Price     │    │ - Budget    │
 * │ - Pricing   │    │ - Tags      │    │ - Skills    │
 * └─────────────┘    └─────────────┘    └─────────────┘
 *        │                   │                   │
 *        │                   │                   │
 *        └───────────────────┼───────────────────┘
 *                            │
 *                   ┌─────────────┐
 *                   │ Work Orders │
 *                   │             │
 *                   │ - Client    │
 *                   │ - Provider  │
 *                   │ - Status    │
 *                   │ - Payment   │
 *                   └─────────────┘
 * ```
 * 
 * ## Security Considerations
 * 
 * All state structures implement proper access control and validation:
 * - **Owner checks**: Only authorized parties can modify data
 * - **State validation**: Transitions follow defined rules
 * - **Data integrity**: All fields are validated on update
 * - **Economic security**: Deposits and stakes protect against abuse
 * 
 * ## Account Size Management
 * 
 * Each account structure implements a `LEN` constant that calculates the exact
 * byte size needed for on-chain storage. This ensures efficient rent calculation
 * and prevents account size issues.
 * 
 * ## Usage Examples
 * 
 * ### Creating Agent Registration Data
 * ```rust
 * use crate::state::*;
 * 
 * let agent_data = AgentRegistrationData {
 *     name: "AI Code Assistant".to_string(),
 *     description: "Expert in Rust and blockchain development".to_string(),
 *     capabilities: vec!["Rust".to_string(), "Solana".to_string()],
 *     pricing_model: PricingModel::PerTask { base_rate: 50_000_000 },
 *     genome_hash: "QmGenomeHash123...".to_string(),
 *     is_replicable: true,
 *     replication_fee: 1_000_000,
 * };
 * ```
 * 
 * ### Defining Service Listings
 * ```rust
 * let service_data = ServiceListingData {
 *     title: "Logo Design".to_string(),
 *     description: "Professional logo design for startups".to_string(),
 *     service_type: ServiceType::Design,
 *     price: 25_000_000, // 0.025 SOL
 *     payment_token: spl_token::native_mint::id(),
 *     estimated_delivery: 24, // 24 hours
 *     tags: vec!["design".to_string(), "branding".to_string()],
 * };
 * ```
 * 
 * ### Managing Work Orders
 * ```rust
 * let work_order = WorkOrderData {
 *     order_id: 12345,
 *     provider: agent_pubkey,
 *     title: "Build DeFi Protocol".to_string(),
 *     description: "Design and implement a lending protocol".to_string(),
 *     requirements: vec!["Rust expertise".to_string(), "DeFi knowledge".to_string()],
 *     payment_amount: 500_000_000, // 0.5 SOL
 *     payment_token: spl_token::native_mint::id(),
 *     deadline: 1640995200, // Unix timestamp
 * };
 * ```
 */

use anchor_lang::prelude::*;

// =====================================================
// INSTRUCTION DATA STRUCTURES
// =====================================================

/// Data structure for human service purchases
/// 
/// This structure contains all the information needed when a human client
/// purchases a service from an AI agent. It includes customization options
/// and specific requirements for the service delivery.
/// 
/// # Fields
/// 
/// * `title` - Service title/name
/// * `description` - Detailed service description
/// * `service_type` - Category of service being offered
/// * `price` - Base price in lamports
/// * `payment_token` - SPL token mint for payment (or native SOL)
/// * `estimated_delivery` - Estimated delivery time in hours
/// * `tags` - Searchable tags for service discovery
/// 
/// # Examples
/// 
/// ```rust
/// let service_data = ServiceListingData {
///     title: "Logo Design".to_string(),
///     description: "Professional logo design for startups".to_string(),
///     service_type: ServiceType::Design,
///     price: 25_000_000, // 0.025 SOL
///     payment_token: spl_token::native_mint::id(),
///     estimated_delivery: 24, // 24 hours
///     tags: vec!["design".to_string(), "branding".to_string()],
/// };
/// ```
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServiceListingData {
    /// Display name of the service
    pub title: String,
    /// Detailed description of what the service provides
    pub description: String,
    /// Category/type of service
    pub service_type: ServiceType,
    /// Base price in lamports
    pub price: u64,
    /// Token mint for payment (native SOL if system program)
    pub payment_token: Pubkey,
    /// Estimated delivery time in hours
    pub estimated_delivery: i64,
    /// Tags for service discovery and categorization
    pub tags: Vec<String>,
}

/// Service purchase data from clients
/// 
/// When a client purchases a service, they provide specific requirements
/// and customization requests. This structure captures all the necessary
/// information for service delivery.
/// 
/// # Fields
/// 
/// * `requirements` - Specific requirements for the service
/// * `custom_instructions` - Additional instructions or preferences
/// * `deadline` - When the client needs the service completed
/// 
/// # Examples
/// 
/// ```rust
/// let purchase_data = ServicePurchaseData {
///     requirements: "Logo should be modern and include blue colors".to_string(),
///     custom_instructions: "Please provide vector and raster formats".to_string(),
///     deadline: 1640995200, // Unix timestamp
/// };
/// ```
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServicePurchaseData {
    /// Specific requirements for this service instance
    pub requirements: String,
    /// Additional custom instructions from the client
    pub custom_instructions: String,
    /// Deadline for service completion (Unix timestamp)
    pub deadline: i64,
}

/// Job posting data structure
/// 
/// When humans post jobs for AI agents to apply to, this structure
/// contains all the job details, requirements, and compensation information.
/// 
/// # Fields
/// 
/// * `title` - Job title
/// * `description` - Detailed job description
/// * `requirements` - List of job requirements
/// * `skills_needed` - Required skills for the job
/// * `budget_min` - Minimum budget in lamports
/// * `budget_max` - Maximum budget in lamports
/// * `payment_token` - Token for payment
/// * `deadline` - Project deadline
/// * `job_type` - Type of job (contract, full-time, etc.)
/// * `experience_level` - Required experience level
/// 
/// # Examples
/// 
/// ```rust
/// let job_data = JobPostingData {
///     title: "Solana DApp Developer".to_string(),
///     description: "Build a decentralized trading platform".to_string(),
///     requirements: vec!["Rust experience".to_string(), "Solana knowledge".to_string()],
///     skills_needed: vec!["Rust".to_string(), "React".to_string()],
///     budget_min: 100_000_000, // 0.1 SOL
///     budget_max: 500_000_000, // 0.5 SOL
///     payment_token: spl_token::native_mint::id(),
///     deadline: 1640995200,
///     job_type: JobType::Contract,
///     experience_level: ExperienceLevel::Intermediate,
/// };
/// ```
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JobPostingData {
    /// Job title
    pub title: String,
    /// Detailed job description
    pub description: String,
    /// List of specific requirements
    pub requirements: Vec<String>,
    /// Required skills for the position
    pub skills_needed: Vec<String>,
    /// Minimum budget/compensation
    pub budget_min: u64,
    /// Maximum budget/compensation
    pub budget_max: u64,
    /// Payment token mint
    pub payment_token: Pubkey,
    /// Project deadline
    pub deadline: i64,
    /// Type of job engagement
    pub job_type: JobType,
    /// Required experience level
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
pub struct AgentRegistrationData {
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentUpdateData {
    pub description: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub pricing_model: Option<PricingModel>,
    pub is_active: Option<bool>,
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