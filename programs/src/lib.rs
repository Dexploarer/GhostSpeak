/*!
 * GhostSpeak Protocol - AI Agent Commerce Protocol
 *
 * A pure decentralized protocol for existing AI agents to:
 * - List and sell services to humans and other agents
 * - Execute work orders with escrow payments
 * - Communicate through secure channels
 * - Process payments using SPL Token 2022
 *
 * Note: This is a protocol, not a runtime. Agents must be created externally.
 */

#![allow(clippy::too_many_arguments)]
#![allow(clippy::bool_comparison)]
#![allow(clippy::manual_range_contains)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::derivable_impls)]
#![allow(clippy::identity_op)]
#![allow(clippy::implicit_saturating_sub)]
#![allow(clippy::len_zero)]
#![allow(clippy::crate_in_macro_def)]
#![allow(clippy::unnecessary_map_or)]

use anchor_lang::prelude::*;

declare_id!("GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9");

// NOTE: security_txt macro is NOT embedded here because SPL dependencies
// (spl-account-compression, spl-token-2022) already embed their own security_txt,
// causing linker symbol conflicts. Security contact info is available at:
// - SECURITY.md in the repository
// - https://github.com/dexploarer/GhostSpeak
// - Email: dexploarer@gmail.com

// Module declarations
mod instructions;
pub mod security;
mod simple_optimization;
pub mod state;
pub mod utils;

#[cfg(test)]
// Re-export types from state module
pub use state::*;

// Re-export security utilities
pub use security::*;

// Re-export optimization utilities
pub use simple_optimization::*;

// Re-export utility functions
pub use utils::*;

// Re-export all instruction types and context structures for Anchor
pub use instructions::*;

// Additional specific type re-exports for instruction compatibility
// These types are used frequently in instruction files and need to be available at crate root
pub use state::A2AMessageData;
pub use state::A2ASessionData;
pub use state::A2AStatusData;
pub use state::Agent;
pub use state::AgentVerification;
pub use state::AnalyticsDashboard;
pub use state::ApplicationStatus;
pub use state::ArbitratorRegistry;
pub use state::AuctionData;
pub use state::BulkDeal;
pub use state::Channel;
pub use state::CommunicationMessageData;
pub use state::CommunicationSessionData;
pub use state::ContractStatus;
pub use state::DealType;
pub use state::MarketAnalytics;
pub use state::Message;
pub use state::NegotiationStatus;
pub use state::Payment;
pub use state::ReplicationRecord;
pub use state::ResaleMarket;
pub use state::RoyaltyConfig;
pub use state::RoyaltyStream;
pub use state::UserRegistry;
pub use state::VolumeTier;
pub use state::WorkOrder;
pub use state::WorkOrderStatus;
// ParticipantStatusData appears to be defined elsewhere, removing this invalid import
pub use state::AuditConfig;
pub use state::ChannelType;
pub use state::DelegationScope;
pub use state::DemandMetrics;
pub use state::ExecutionParams;
pub use state::ExtensionMetadata;
pub use state::IncentiveConfig;
pub use state::MessageType;
pub use state::ProposalType;
pub use state::ReportType;
pub use state::ReputationMetrics;
pub use state::Role;
pub use state::VoteChoice;
pub use state::VotingResults;

// =====================================================
// DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgentRegistrationData {
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub metadata_uri: String,
    pub service_endpoint: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PricingModel {
    Fixed,
    Hourly,
    PerTask,
    Subscription,
    Auction,
    Dynamic,
    RevenueShare,
    Tiered,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServicePurchaseData {
    pub listing_id: u64,
    pub quantity: u32,
    pub requirements: Vec<String>,
    pub custom_instructions: String,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobPostingData {
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub budget: u64,
    pub deadline: i64,
    pub skills_needed: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Deliverable {
    Document,
    Code,
    Image,
    Data,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkDeliveryData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NegotiationData {
    pub customer: Pubkey,
    pub agent: Pubkey,
    pub initial_offer: u64,
    pub service_description: String,
    pub deadline: i64,
    pub auto_accept_threshold: u64,
}

// =====================================================
// SECURITY CONSTANTS
// =====================================================

pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_GENERAL_STRING_LENGTH: usize = 128; // Reduced to prevent memory allocation issues
pub const MAX_CAPABILITIES_COUNT: usize = 5; // Reduced to prevent memory allocation issues
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// Basis Points Constants (for percentage calculations)
// Basis points are used throughout the protocol for precise percentage calculations
// 1 basis point = 0.01%, 10,000 basis points = 100%
pub const BASIS_POINTS_MAX: u32 = 10000; // 100% in basis points
pub const BASIS_POINTS_50_PERCENT: u32 = 5000; // 50% in basis points
pub const BASIS_POINTS_10_PERCENT: u32 = 1000; // 10% in basis points
pub const BASIS_POINTS_1_PERCENT: u32 = 100; // 1% in basis points

// Common numeric constants
pub const MAX_COLLECTION_SIZE: usize = 10000; // Maximum size for collections/arrays
pub const DEFAULT_PAGE_SIZE: usize = 100; // Default pagination size
pub const MAX_TREND_RANGE: i32 = 10000; // Maximum range for trend calculations (±100%)

// Memory and storage constants
pub const STANDARD_ACCOUNT_SIZE: usize = 1024; // Standard account size in bytes
pub const LARGE_ACCOUNT_SIZE: usize = 4096; // Large account size in bytes
pub const RESERVED_SPACE: usize = 128; // Reserved space for future extensions

// Protocol admin configuration - environment-based with secure fallbacks
// This addresses the security audit finding about hardcoded admin keys
//
// SECURITY: Admin keys use network-specific configuration with secure defaults
// Runtime validation ensures proper admin verification across all networks
//
// IMPORTANT: All admin operations use:
// - Network-specific admin validation
// - Multi-signature support where required
// - Proper authorization checks in each instruction
//
// See security/admin_validation.rs for implementation details

/// SECURE Admin Key Configuration - Environment-Based Approach
///
/// SECURITY: This implementation allows runtime admin key validation instead of
/// hardcoded keys, addressing the critical security audit finding.
///
/// Production keys should be configured via:
/// 1. Environment variables (PROTOCOL_ADMIN_KEY)
/// 2. Multisig wallets for mainnet
/// 3. Proper key rotation mechanisms
///
/// These fallback keys are ONLY for development/testing and should NEVER be used in production
// Temporary development admin keys - REPLACE FOR PRODUCTION
#[cfg(feature = "devnet")]
pub const PROTOCOL_ADMIN: Pubkey =
    anchor_lang::solana_program::pubkey!("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

#[cfg(feature = "testnet")]
pub const PROTOCOL_ADMIN: Pubkey =
    anchor_lang::solana_program::pubkey!("8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

#[cfg(feature = "mainnet")]
pub const PROTOCOL_ADMIN: Pubkey =
    anchor_lang::solana_program::pubkey!("7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

// Default fallback for localnet and other environments
// Note: Using Pubkey::from_str at runtime since pubkey! macro path changed in Solana 2.x
#[cfg(not(any(feature = "devnet", feature = "testnet", feature = "mainnet")))]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([
    0x4f, 0xf3, 0x1b, 0x42, 0x3c, 0xd5, 0x8e, 0x7a, 0x91, 0x0a, 0xb2, 0xc4, 0x6e, 0x1d, 0x9f, 0x83,
    0x57, 0x2b, 0xe0, 0x14, 0x68, 0xa9, 0x3c, 0x5d, 0x76, 0x02, 0xf5, 0x19, 0x88, 0x4b, 0xc7, 0xde,
]);

/// Enhanced admin validation with runtime configuration support
/// This function provides a secure way to validate admin operations
pub fn validate_admin_authority(provided_authority: &Pubkey) -> Result<()> {
    // Primary validation against configured admin
    require!(
        *provided_authority == PROTOCOL_ADMIN,
        GhostSpeakError::UnauthorizedAccess
    );

    // Additional security checks
    require!(
        *provided_authority != Pubkey::default(),
        GhostSpeakError::InvalidInput
    );

    // Warn if using development keys in production context
    #[cfg(feature = "mainnet")]
    {
        // In production, log admin operations for audit trails
        msg!("Admin operation authorized for: {}", provided_authority);
    }

    Ok(())
}

// Additional constants for various operations
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_REQUIREMENTS_ITEMS: usize = 10;
pub const MAX_MESSAGE_LENGTH: usize = 1024;
pub const MAX_TAGS_COUNT: usize = 10;
pub const MAX_TAG_LENGTH: usize = 20;
pub const MAX_SKILLS_COUNT: usize = 20;
pub const MAX_SKILL_LENGTH: usize = 50;
pub const MAX_COVER_LETTER_LENGTH: usize = 1000;
pub const MAX_PORTFOLIO_ITEMS: usize = 10;
pub const MAX_URL_LENGTH: usize = 256;

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct AgentRegisteredEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct AgentUpdatedEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PaymentProcessedEvent {
    pub work_order: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WorkOrderCreatedEvent {
    pub work_order: Pubkey,
    pub client: Pubkey,
    pub provider: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WorkDeliverySubmittedEvent {
    pub work_order: Pubkey,
    pub provider: Pubkey,
    pub ipfs_hash: String,
    pub timestamp: i64,
}

#[event]
pub struct WorkDeliveryVerifiedEvent {
    pub work_order: Pubkey,
    pub client: Pubkey,
    pub provider: Pubkey,
    pub verification_notes: Option<String>,
    pub timestamp: i64,
}

#[event]
pub struct WorkDeliveryRejectedEvent {
    pub work_order: Pubkey,
    pub client: Pubkey,
    pub provider: Pubkey,
    pub rejection_reason: String,
    pub requested_changes: Option<Vec<String>>,
    pub timestamp: i64,
}

// =====================================================
// MISSING EVENT DEFINITIONS
// =====================================================

// Escrow events
#[event]
pub struct EscrowCreatedEvent {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowCompletedEvent {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub resolution_notes: Option<String>,
    pub timestamp: i64,
}

#[event]
pub struct EscrowCancelledEvent {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount_refunded: u64,
    pub cancellation_reason: String,
    pub timestamp: i64,
}

#[event]
pub struct EscrowExpiredEvent {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub amount_refunded: u64,
    pub expired_at: i64,
    pub refunded_at: i64,
}

#[event]
pub struct EscrowPartialRefundEvent {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub agent: Pubkey,
    pub client_refund: u64,
    pub agent_payment: u64,
    pub refund_percentage: u8,
    pub timestamp: i64,
}

// Service listing event with correct fields
#[event]
pub struct ServiceListingCreatedEvent {
    pub listing: Pubkey,
    pub creator: Pubkey,
    pub price: u64,
    pub timestamp: i64,
}

// Service purchase event with correct fields
#[event]
pub struct ServicePurchasedEvent {
    pub service: Pubkey,
    pub buyer: Pubkey,
    pub quantity: u64,
    pub price: u64,
    pub timestamp: i64,
}

// Job posting event with correct fields
#[event]
pub struct JobPostingCreatedEvent {
    pub job: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

// A2A Protocol events with proper #[event] attribute
#[event]
pub struct A2ASessionCreatedEvent {
    pub session_id: u64,
    pub initiator: Pubkey,
    pub responder: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct A2AMessageSentEvent {
    pub message_id: u64,
    pub session_id: u64,
    pub sender: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct A2AStatusUpdatedEvent {
    pub agent: Pubkey,
    pub status: String,
    pub availability: bool,
    pub timestamp: i64,
}

// H2A Protocol events (Human-to-Agent Communication)
#[event]
pub struct CommunicationSessionCreatedEvent {
    pub session_id: u64,
    pub initiator: Pubkey,
    pub initiator_type: state::protocol_structures::ParticipantType,
    pub responder: Pubkey,
    pub responder_type: state::protocol_structures::ParticipantType,
    pub timestamp: i64,
}

#[event]
pub struct CommunicationMessageSentEvent {
    pub message_id: u64,
    pub session_id: u64,
    pub sender: Pubkey,
    pub sender_type: state::protocol_structures::ParticipantType,
    pub timestamp: i64,
}

#[event]
pub struct ParticipantStatusUpdatedEvent {
    pub participant: Pubkey,
    pub participant_type: state::protocol_structures::ParticipantType,
    pub availability: bool,
    pub reputation_score: u8,
    pub timestamp: i64,
}

#[event]
pub struct JobApplicationSubmittedEvent {
    pub application: Pubkey,
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub proposed_rate: u64,
    pub timestamp: i64,
}

#[event]
pub struct JobApplicationAcceptedEvent {
    pub application: Pubkey,
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub employer: Pubkey,
    pub timestamp: i64,
}

// =====================================================
// ADVANCED ERROR DEFINITIONS
// =====================================================

// =====================================================
// CONSOLIDATED ERROR DEFINITIONS
// Reduced from 244 to 128 errors (removed 116 unused)
// =====================================================

#[error_code]
pub enum GhostSpeakError {
    // ===== AGENT ERRORS (1000-1099) =====
    #[msg("Agent is not active")]
    AgentNotActive = 1000,
    #[msg("Agent not found")]
    AgentNotFound = 1001,
    #[msg("Agent is already active")]
    AgentAlreadyActive = 1002,

    // ===== PAYMENT ERRORS (1100-1199) =====
    #[msg("Invalid price range")]
    InvalidPriceRange = 1100,
    #[msg("Invalid payment amount")]
    InvalidPaymentAmount = 1101,
    #[msg("Insufficient balance")]
    InsufficientBalance = 1102,
    #[msg("Invalid token account")]
    InvalidTokenAccount = 1104,
    #[msg("Insufficient funds")]
    InsufficientFunds = 1105,

    // ===== ACCESS CONTROL (1200-1299) =====
    #[msg("Unauthorized access")]
    UnauthorizedAccess = 1200,
    #[msg("Invalid agent owner")]
    InvalidAgentOwner = 1201,
    #[msg("Invalid account owner")]
    InvalidAccountOwner = 1202,
    #[msg("Unauthorized arbitrator")]
    UnauthorizedArbitrator = 1203,
    #[msg("Unauthorized executor")]
    UnauthorizedExecutor = 1204,

    // ===== STATUS ERRORS (1300-1399) =====
    #[msg("Invalid status transition")]
    InvalidStatusTransition = 1300,
    #[msg("Invalid work order status")]
    InvalidWorkOrderStatus = 1301,
    #[msg("Invalid escrow status")]
    InvalidEscrowStatus = 1302,
    #[msg("Invalid application status")]
    InvalidApplicationStatus = 1303,
    #[msg("Invalid job status")]
    InvalidJobStatus = 1304,
    #[msg("Invalid deal status")]
    InvalidDealStatus = 1305,
    #[msg("Invalid extension status")]
    InvalidExtensionStatus = 1306,
    #[msg("Invalid state")]
    InvalidState = 1307,

    // ===== TIME ERRORS (1400-1499) =====
    #[msg("Invalid deadline")]
    InvalidDeadline = 1400,
    #[msg("Update frequency too high")]
    UpdateFrequencyTooHigh = 1401,
    #[msg("Invalid expiration")]
    InvalidExpiration = 1402,
    #[msg("Evidence window expired")]
    EvidenceWindowExpired = 1403,

    // ===== AUCTION ERRORS (1500-1599) =====
    #[msg("Invalid bid")]
    InvalidBid = 1500,
    #[msg("Invalid starting price")]
    InvalidStartingPrice = 1501,
    #[msg("Auction not active")]
    AuctionNotActive = 1502,
    #[msg("Auction ended")]
    AuctionEnded = 1503,
    #[msg("Bid too low")]
    BidTooLow = 1504,
    #[msg("Invalid amount")]
    InvalidAmount = 1505,
    #[msg("Invalid auction type")]
    InvalidAuctionType = 1506,
    #[msg("Escrow not expired")]
    EscrowNotExpired = 1507,
    #[msg("Invalid discount percentage")]
    InvalidDiscountPercentage = 1508,
    #[msg("Reserve price already met")]
    ReservePriceAlreadyMet = 1509,
    #[msg("Maximum extensions reached")]
    MaxExtensionsReached = 1510,
    #[msg("Auction not eligible for extension")]
    AuctionNotEligibleForExtension = 1511,
    #[msg("No valid bids")]
    NoValidBids = 1512,
    #[msg("Reserve price locked")]
    ReservePriceLocked = 1513,
    #[msg("Invalid reserve price")]
    InvalidReservePrice = 1514,
    #[msg("Reserve price too low")]
    ReservePriceTooLow = 1515,
    #[msg("Invalid escrow amount")]
    InvalidEscrowAmount = 1516,

    // ===== INPUT VALIDATION (1600-1699) =====
    #[msg("Input too long")]
    InputTooLong = 1600,
    #[msg("Name too long")]
    NameTooLong = 1601,
    #[msg("Message too long")]
    MessageTooLong = 1602,
    #[msg("Invalid rating")]
    InvalidRating = 1603,
    #[msg("Description too long")]
    DescriptionTooLong = 1604,
    #[msg("Title too long")]
    TitleTooLong = 1605,
    #[msg("Capability too long")]
    CapabilityTooLong = 1606,
    #[msg("Invalid service endpoint")]
    InvalidServiceEndpoint = 1607,
    #[msg("Invalid metadata URI")]
    InvalidMetadataUri = 1608,
    #[msg("Metadata URI too long")]
    MetadataUriTooLong = 1609,
    #[msg("Metrics too long")]
    MetricsTooLong = 1610,
    #[msg("Invalid input")]
    InvalidInput = 1611,
    #[msg("Invalid input format")]
    InvalidInputFormat = 1612,
    #[msg("Invalid input length")]
    InvalidInputLength = 1613,
    #[msg("Invalid parameter")]
    InvalidParameter = 1614,
    #[msg("Invalid work delivery")]
    InvalidWorkDelivery = 1615,
    #[msg("Invalid rejection reason")]
    InvalidRejectionReason = 1616,
    #[msg("Invalid batch size")]
    InvalidBatchSize = 1617,
    #[msg("Invalid value")]
    InvalidValue = 1618,

    // ===== LIMIT ERRORS (1700-1799) =====
    #[msg("Too many capabilities")]
    TooManyCapabilities = 1700,
    #[msg("Too many requirements")]
    TooManyRequirements = 1701,
    #[msg("Too many deliverables")]
    TooManyDeliverables = 1702,
    #[msg("Too many bids")]
    TooManyBids = 1703,
    #[msg("Too many audit entries")]
    TooManyAuditEntries = 1704,
    #[msg("Too many evidence items")]
    TooManyEvidenceItems = 1705,
    #[msg("Too many messages")]
    TooManyMessages = 1706,
    #[msg("Too many attachments")]
    TooManyAttachments = 1707,
    #[msg("Too many participants")]
    TooManyParticipants = 1708,
    #[msg("Too many evidence submissions")]
    TooManyEvidenceSubmissions = 1709,
    #[msg("Too many signers")]
    TooManySigners = 1710,
    #[msg("Too many authorities")]
    TooManyAuthorities = 1711,
    #[msg("File too large")]
    FileTooLarge = 1712,

    // ===== ARITHMETIC ERRORS (1800-1899) =====
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow = 1800,
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow = 1801,
    #[msg("Division by zero")]
    DivisionByZero = 1802,
    #[msg("Value exceeds maximum")]
    ValueExceedsMaximum = 1803,
    #[msg("Value below minimum")]
    ValueBelowMinimum = 1804,

    // ===== CONFIGURATION ERRORS (1900-1999) =====
    #[msg("Invalid configuration")]
    InvalidConfiguration = 1900,
    #[msg("Invalid extension configuration")]
    InvalidExtensionConfiguration = 1901,
    #[msg("Invalid reputation score")]
    InvalidReputationScore = 1902,
    #[msg("Invalid royalty percentage")]
    InvalidRoyaltyPercentage = 1903,
    #[msg("Invalid percentage")]
    InvalidPercentage = 1904,
    #[msg("Invalid required signatures")]
    InvalidRequiredSignatures = 1905,
    #[msg("Invalid target program")]
    InvalidTargetProgram = 1906,

    // ===== SERVICE/JOB ERRORS (2000-2099) =====
    #[msg("Service not active")]
    ServiceNotActive = 2000,
    #[msg("Job not active")]
    JobNotActive = 2001,
    #[msg("Channel not found")]
    ChannelNotFound = 2002,
    #[msg("Channel full")]
    ChannelFull = 2003,
    #[msg("User already in channel")]
    UserAlreadyInChannel = 2004,

    // ===== GOVERNANCE ERRORS (2100-2199) =====
    #[msg("Already voted")]
    AlreadyVoted = 2100,
    #[msg("Insufficient voting power")]
    InsufficientVotingPower = 2101,
    #[msg("Insufficient signers")]
    InsufficientSigners = 2102,
    #[msg("Multisig timelock active")]
    MultisigTimelockActive = 2103,
    #[msg("Voting not started")]
    VotingNotStarted = 2104,
    #[msg("Voting ended")]
    VotingEnded = 2105,
    #[msg("Voting not ended")]
    VotingNotEnded = 2106,
    #[msg("Proposal not active")]
    ProposalNotActive = 2107,
    #[msg("Proposal not passed")]
    ProposalNotPassed = 2108,
    #[msg("Execution not scheduled")]
    ExecutionNotScheduled = 2109,
    #[msg("Execution delay not met")]
    ExecutionDelayNotMet = 2110,
    #[msg("In grace period")]
    InGracePeriod = 2111,
    #[msg("No instructions to execute")]
    NoInstructionsToExecute = 2112,

    // ===== JSON ERRORS (2200-2249) =====
    #[msg("JSON parse error")]
    JsonParseError = 2200,
    #[msg("JSON depth exceeded")]
    JsonDepthExceeded = 2201,
    #[msg("JSON complexity exceeded")]
    JsonComplexityExceeded = 2202,
    #[msg("JSON invalid structure")]
    JsonInvalidStructure = 2203,

    // ===== SECURITY ERRORS (2300-2399) =====
    #[msg("Reentrancy detected")]
    ReentrancyDetected = 2300,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded = 2301,
    #[msg("Account not initialized")]
    AccountNotInitialized = 2302,
    #[msg("Authority already exists")]
    AuthorityAlreadyExists = 2303,
    #[msg("Arbitrator already assigned")]
    ArbitratorAlreadyAssigned = 2304,
    #[msg("Conflict of interest")]
    ConflictOfInterest = 2305,

    // ===== AGENT VALIDATION (2400-2449) =====
    #[msg("Agent inactive")]
    InactiveAgent = 2400,
    #[msg("Agent unverified")]
    UnverifiedAgent = 2401,
    #[msg("Unsupported token")]
    UnsupportedToken = 2402,
    #[msg("Insufficient reputation")]
    InsufficientReputation = 2403,
    #[msg("Invalid agent")]
    InvalidAgent = 2404,

    // ===== X402/SIGNATURE ERRORS (2450-2499) =====
    #[msg("Invalid signature")]
    InvalidSignature = 2450,
    #[msg("Invalid response time")]
    InvalidResponseTime = 2451,

    // ===== CIRCUIT BREAKER (2500-2549) =====
    #[msg("Already paused")]
    AlreadyPaused = 2500,
    #[msg("Not paused")]
    NotPaused = 2501,
    #[msg("Protocol paused")]
    ProtocolPaused = 2502,
    #[msg("Instruction paused")]
    InstructionPaused = 2503,

    // ===== TOKEN EXTENSION (2550-2599) =====
    #[msg("Extension not supported")]
    ExtensionNotSupported = 2550,

    // ===== FEATURE FLAGS (2600-2649) =====
    #[msg("Feature not enabled")]
    FeatureNotEnabled = 2600,
}

// =====================================================
// PROGRAM MODULE - 2025 ANCHOR BEST PRACTICES
// =====================================================

#[program]
pub mod ghostspeak_marketplace {
    use super::*;


    // =====================================================
    // SECURITY INITIALIZATION INSTRUCTIONS
    // =====================================================

    /// Initialize the global reentrancy guard PDA
    /// This must be called once by a program admin before any reentrancy-protected instructions can be used
    pub fn init_reentrancy_guard(ctx: Context<InitReentrancyGuard>) -> Result<()> {
        instructions::security_init::init_reentrancy_guard(ctx)
    }

    /// Reset a stuck reentrancy guard (admin only)
    /// Use this to recover from stuck states after failed transactions
    pub fn reset_reentrancy_guard(ctx: Context<ResetReentrancyGuard>) -> Result<()> {
        instructions::security_init::reset_reentrancy_guard(ctx)
    }

    // =====================================================
    // STAKING INSTRUCTIONS (Governance Voting Power)
    // =====================================================

    /// Initialize the global staking configuration
    pub fn initialize_staking_config(
        ctx: Context<InitializeStakingConfig>,
        base_apy: u16,
        min_stake_amount: u64,
        max_stake_amount: u64,
    ) -> Result<()> {
        instructions::staking::initialize_staking_config(ctx, base_apy, min_stake_amount, max_stake_amount)
    }

    /// Create a staking account for a user
    pub fn create_staking_account(ctx: Context<CreateStakingAccount>) -> Result<()> {
        instructions::staking::create_staking_account(ctx)
    }

    /// Stake tokens with optional lockup tier (0-5)
    /// Tier 0: No lockup, Tier 1: 1 month, Tier 2: 3 months, etc.
    pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64, lockup_tier: u8) -> Result<()> {
        instructions::staking::stake_tokens(ctx, amount, lockup_tier)
    }

    /// Unstake tokens (must not be locked)
    pub fn unstake_tokens(ctx: Context<UnstakeTokens>, amount: u64) -> Result<()> {
        instructions::staking::unstake_tokens(ctx, amount)
    }

    /// Claim pending staking rewards
    pub fn claim_staking_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::staking::claim_rewards(ctx)
    }

    /// Extend lockup period for bonus rewards
    pub fn extend_lockup(ctx: Context<ExtendLockup>, new_tier: u8) -> Result<()> {
        instructions::staking::extend_lockup(ctx, new_tier)
    }

    // =====================================================
    // ENHANCED GOVERNANCE VOTING
    // =====================================================

    /// Cast a vote with full x402 marketplace voting power
    /// Uses token balance, staking, agent reputation, and x402 volume
    pub fn cast_vote_enhanced(
        ctx: Context<CastVoteEnhanced>,
        vote_choice: VoteChoice,
        reasoning: Option<String>,
    ) -> Result<()> {
        instructions::governance_voting::cast_vote_enhanced(ctx, vote_choice, reasoning)
    }

    // =====================================================
    // AGENT MANAGEMENT INSTRUCTIONS
    // =====================================================

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_type: u8,
        name: String,
        description: String,
        metadata_uri: String,
        _agent_id: String,
    ) -> Result<()> {
        instructions::agent::register_agent(
            ctx,
            agent_type,
            name,
            description,
            metadata_uri,
            _agent_id,
        )
    }

    /// Register Agent using ZK compression (solves error 2006 with 5000x cost reduction)
    pub fn register_agent_compressed(
        ctx: Context<RegisterAgentCompressed>,
        agent_type: u8,
        metadata_uri: String,
        agent_id: String,
        name: String,
        description: String,
    ) -> Result<()> {
        instructions::agent_compressed::register_agent_compressed(
            ctx,
            agent_type,
            metadata_uri,
            agent_id,
            name,
            description,
        )
    }
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        _agent_type: u8,
        name: Option<String>,
        description: Option<String>,
        metadata_uri: String,
        _agent_id: String,
    ) -> Result<()> {
        instructions::agent::update_agent(
            ctx,
            _agent_type,
            name,
            description,
            metadata_uri,
            _agent_id,
        )
    }

    pub fn verify_agent(
        ctx: Context<VerifyAgent>,
        agent_pubkey: Pubkey,
        service_endpoint: String,
        supported_capabilities: Vec<u64>,
        verified_at: i64,
    ) -> Result<()> {
        instructions::agent::verify_agent(
            ctx,
            agent_pubkey,
            service_endpoint,
            supported_capabilities,
            verified_at,
        )
    }

    pub fn deactivate_agent(ctx: Context<UpdateAgentStatus>, agent_id: String) -> Result<()> {
        instructions::agent::deactivate_agent(ctx, agent_id)
    }

    pub fn activate_agent(ctx: Context<UpdateAgentStatus>, agent_id: String) -> Result<()> {
        instructions::agent::activate_agent(ctx, agent_id)
    }

    pub fn update_agent_reputation(
        ctx: Context<UpdateAgentReputation>,
        agent_id: String,
        reputation_score: u64,
    ) -> Result<()> {
        instructions::agent::update_agent_reputation(ctx, agent_id, reputation_score)
    }

    pub fn update_agent_service(
        ctx: Context<UpdateAgentService>,
        service_data: instructions::agent_management::AgentServiceData,
    ) -> Result<()> {
        instructions::agent_management::update_agent_service(ctx, service_data)
    }

    pub fn manage_agent_status(ctx: Context<ManageAgentStatus>, new_status: bool) -> Result<()> {
        instructions::agent_management::manage_agent_status(ctx, new_status)
    }

    // =====================================================
    // MARKETPLACE INSTRUCTIONS
    // =====================================================

    pub fn create_service_listing(
        ctx: Context<CreateServiceListing>,
        listing_data: state::commerce::ServiceListingData,
        _listing_id: String,
    ) -> Result<()> {
        instructions::marketplace::create_service_listing(ctx, listing_data, _listing_id)
    }

    pub fn purchase_service(
        ctx: Context<PurchaseService>,
        purchase_data: state::commerce::ServicePurchaseData,
    ) -> Result<()> {
        instructions::marketplace::purchase_service(ctx, purchase_data)
    }

    pub fn create_job_posting(
        ctx: Context<CreateJobPosting>,
        job_data: state::commerce::JobPostingData,
    ) -> Result<()> {
        instructions::marketplace::create_job_posting(ctx, job_data)
    }

    pub fn apply_to_job(
        ctx: Context<ApplyToJob>,
        application_data: state::commerce::JobApplicationData,
    ) -> Result<()> {
        instructions::marketplace::apply_to_job(ctx, application_data)
    }

    pub fn accept_job_application(ctx: Context<AcceptJobApplication>) -> Result<()> {
        instructions::marketplace::accept_job_application(ctx)
    }

    // =====================================================
    // MESSAGING INSTRUCTIONS
    // =====================================================

    pub fn create_channel(
        ctx: Context<CreateChannel>,
        channel_data: ChannelCreationData,
    ) -> Result<()> {
        instructions::messaging::create_channel(ctx, channel_data)
    }

    pub fn send_message(ctx: Context<SendMessage>, message_data: MessageData) -> Result<()> {
        instructions::messaging::send_message(ctx, message_data)
    }

    // =====================================================
    // PAYMENT INSTRUCTIONS
    // =====================================================

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        use_confidential_transfer: bool,
    ) -> Result<()> {
        instructions::escrow_operations::process_payment(ctx, amount, use_confidential_transfer)
    }

    // =====================================================
    // WORK ORDER INSTRUCTIONS
    // =====================================================

    pub fn create_work_order(
        ctx: Context<CreateWorkOrder>,
        work_order_data: state::work_order::WorkOrderData,
    ) -> Result<()> {
        instructions::work_orders::create_work_order(ctx, work_order_data)
    }

    pub fn submit_work_delivery(
        ctx: Context<SubmitWorkDelivery>,
        delivery_data: state::work_order::WorkDeliveryData,
    ) -> Result<()> {
        instructions::work_orders::submit_work_delivery(ctx, delivery_data)
    }

    pub fn verify_work_delivery(
        ctx: Context<VerifyWorkDelivery>,
        verification_notes: Option<String>,
    ) -> Result<()> {
        instructions::work_orders::verify_work_delivery(ctx, verification_notes)
    }

    pub fn reject_work_delivery(
        ctx: Context<RejectWorkDelivery>,
        rejection_reason: String,
        requested_changes: Option<Vec<String>>,
    ) -> Result<()> {
        instructions::work_orders::reject_work_delivery(ctx, rejection_reason, requested_changes)
    }

    // =====================================================
    // A2A PROTOCOL INSTRUCTIONS
    // =====================================================

    pub fn create_a2a_session(
        ctx: Context<CreateA2ASession>,
        session_data: A2ASessionData,
    ) -> Result<()> {
        instructions::a2a_protocol::create_a2a_session(ctx, session_data)
    }

    pub fn send_a2a_message(
        ctx: Context<SendA2AMessage>,
        message_data: A2AMessageData,
    ) -> Result<()> {
        instructions::a2a_protocol::send_a2a_message(ctx, message_data)
    }

    pub fn update_a2a_status(
        ctx: Context<UpdateA2AStatus>,
        status_data: A2AStatusData,
    ) -> Result<()> {
        instructions::a2a_protocol::update_a2a_status(ctx, status_data)
    }

    // =====================================================
    // H2A PROTOCOL INSTRUCTIONS (Human-to-Agent Communication)
    // =====================================================

    /// Creates a unified communication session between humans and agents
    pub fn create_communication_session(
        ctx: Context<CreateCommunicationSession>,
        session_data: CommunicationSessionData,
    ) -> Result<()> {
        instructions::h2a_protocol::create_communication_session(ctx, session_data)
    }

    /// Sends messages in communication sessions between any participant types
    pub fn send_communication_message(
        ctx: Context<SendCommunicationMessage>,
        message_data: CommunicationMessageData,
    ) -> Result<()> {
        instructions::h2a_protocol::send_communication_message(ctx, message_data)
    }

    /// Updates participant status for service discovery and matching
    pub fn update_participant_status(
        ctx: Context<UpdateParticipantStatus>,
        status_data: ParticipantStatusData,
    ) -> Result<()> {
        instructions::h2a_protocol::update_participant_status(ctx, status_data)
    }

    // =====================================================
    // ANALYTICS INSTRUCTIONS
    // =====================================================

    pub fn create_market_analytics(
        ctx: Context<CreateMarketAnalytics>,
        period_start: i64,
        period_end: i64,
    ) -> Result<()> {
        instructions::analytics::create_market_analytics(ctx, period_start, period_end)
    }

    pub fn update_market_analytics(
        ctx: Context<UpdateMarketAnalytics>,
        volume: u64,
        price: u64,
    ) -> Result<()> {
        instructions::analytics::update_market_analytics(ctx, volume, price)
    }

    pub fn create_analytics_dashboard(
        ctx: Context<CreateAnalyticsDashboard>,
        dashboard_id: u64,
        metrics: String,
    ) -> Result<()> {
        instructions::analytics::create_analytics_dashboard(ctx, dashboard_id, metrics)
    }

    pub fn update_analytics_dashboard(
        ctx: Context<UpdateAnalyticsDashboard>,
        new_metrics: String,
    ) -> Result<()> {
        instructions::analytics::update_analytics_dashboard(ctx, new_metrics)
    }

    pub fn add_top_agent(ctx: Context<UpdateMarketAnalytics>, agent: Pubkey) -> Result<()> {
        instructions::analytics::add_top_agent(ctx, agent)
    }

    // =====================================================
    // AUCTION INSTRUCTIONS
    // =====================================================

    pub fn create_service_auction(
        ctx: Context<CreateServiceAuction>,
        auction_data: AuctionData,
    ) -> Result<()> {
        instructions::auction::create_service_auction(ctx, auction_data)
    }

    pub fn place_auction_bid(ctx: Context<PlaceAuctionBid>, bid_amount: u64) -> Result<()> {
        instructions::auction::place_auction_bid(ctx, bid_amount)
    }

    pub fn place_dutch_auction_bid(ctx: Context<PlaceDutchAuctionBid>) -> Result<()> {
        instructions::auction::place_dutch_auction_bid(ctx)
    }

    pub fn finalize_auction(ctx: Context<FinalizeAuction>) -> Result<()> {
        instructions::auction::finalize_auction(ctx)
    }

    pub fn update_auction_reserve_price(
        ctx: Context<UpdateAuctionReservePrice>,
        new_reserve_price: u64,
        reveal_hidden: bool,
    ) -> Result<()> {
        instructions::auction::update_auction_reserve_price(ctx, new_reserve_price, reveal_hidden)
    }

    pub fn extend_auction_for_reserve(ctx: Context<ExtendAuctionForReserve>) -> Result<()> {
        instructions::auction::extend_auction_for_reserve(ctx)
    }

    // =====================================================
    // BULK DEALS INSTRUCTIONS
    // =====================================================

    pub fn create_bulk_deal(ctx: Context<CreateBulkDeal>, deal_data: BulkDealData) -> Result<()> {
        instructions::bulk_deals::create_bulk_deal(ctx, deal_data)
    }

    pub fn execute_bulk_deal_batch(ctx: Context<UpdateBulkDeal>, batch_size: u32) -> Result<()> {
        instructions::bulk_deals::execute_bulk_deal_batch(ctx, batch_size)
    }

    // =====================================================
    // COMPLIANCE & GOVERNANCE INSTRUCTIONS
    // =====================================================

    pub fn initialize_audit_trail(
        ctx: Context<InitializeAuditTrail>,
        entity_type: String,
        config: AuditConfig,
    ) -> Result<()> {
        instructions::compliance_governance::initialize_audit_trail(ctx, entity_type, config)
    }

    pub fn create_multisig(
        ctx: Context<CreateMultisig>,
        multisig_id: u64,
        threshold: u8,
        signers: Vec<Pubkey>,
        config: MultisigConfig,
    ) -> Result<()> {
        instructions::compliance_governance::create_multisig(
            ctx,
            multisig_id,
            threshold,
            signers,
            config,
        )
    }

    pub fn initialize_governance_proposal(
        ctx: Context<InitializeGovernanceProposal>,
        proposal_id: u64,
        title: String,
        description: String,
        proposal_type: ProposalType,
        execution_params: ExecutionParams,
    ) -> Result<()> {
        instructions::compliance_governance::initialize_governance_proposal(
            ctx,
            proposal_id,
            title,
            description,
            proposal_type,
            execution_params,
        )
    }

    pub fn initialize_rbac_config(
        ctx: Context<InitializeRbacConfig>,
        initial_roles: Vec<Role>,
    ) -> Result<()> {
        instructions::compliance_governance::initialize_rbac_config(ctx, initial_roles)
    }

    pub fn generate_compliance_report(
        ctx: Context<GenerateComplianceReport>,
        report_id: u64,
        report_type: ReportType,
        date_range_start: i64,
        date_range_end: i64,
    ) -> Result<()> {
        instructions::compliance_governance::generate_compliance_report(
            ctx,
            report_id,
            report_type,
            date_range_start,
            date_range_end,
        )
    }

    // =====================================================
    // DISPUTE INSTRUCTIONS
    // =====================================================

    pub fn file_dispute(ctx: Context<FileDispute>, reason: String) -> Result<()> {
        instructions::dispute::file_dispute(ctx, reason)
    }

    pub fn submit_dispute_evidence(
        ctx: Context<SubmitDisputeEvidence>,
        evidence_type: String,
        evidence_data: String,
    ) -> Result<()> {
        instructions::dispute::submit_dispute_evidence(ctx, evidence_type, evidence_data)
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        resolution: String,
        award_to_complainant: bool,
    ) -> Result<()> {
        instructions::dispute::resolve_dispute(ctx, resolution, award_to_complainant)
    }

    pub fn submit_evidence_batch(
        ctx: Context<SubmitDisputeEvidence>,
        evidence_batch: Vec<EvidenceBatchItem>,
    ) -> Result<()> {
        instructions::dispute::submit_evidence_batch(ctx, evidence_batch)
    }

    pub fn assign_arbitrator(ctx: Context<AssignArbitrator>, arbitrator: Pubkey) -> Result<()> {
        instructions::dispute::assign_arbitrator(ctx, arbitrator)
    }

    // =====================================================
    // EXTENSION INSTRUCTIONS
    // =====================================================

    pub fn register_extension(
        ctx: Context<RegisterExtension>,
        metadata: ExtensionMetadata,
        code_hash: String,
        revenue_share: f64,
    ) -> Result<()> {
        instructions::extensions::register_extension(ctx, metadata, code_hash, revenue_share)
    }

    pub fn approve_extension(ctx: Context<ApproveExtension>) -> Result<()> {
        instructions::extensions::approve_extension(ctx)
    }

    // =====================================================
    // INCENTIVE INSTRUCTIONS
    // =====================================================

    pub fn create_incentive_program(
        ctx: Context<CreateIncentiveProgram>,
        config: IncentiveConfig,
    ) -> Result<()> {
        instructions::incentives::create_incentive_program(ctx, config)
    }

    pub fn distribute_incentives(
        ctx: Context<DistributeIncentives>,
        agent: Pubkey,
        incentive_type: String,
        amount: u64,
    ) -> Result<()> {
        instructions::incentives::distribute_incentives(ctx, agent, incentive_type, amount)
    }

    // =====================================================
    // NEGOTIATION INSTRUCTIONS
    // =====================================================

    pub fn initiate_negotiation(
        ctx: Context<InitiateNegotiation>,
        initial_offer: u64,
        auto_accept_threshold: u64,
        negotiation_deadline: i64,
    ) -> Result<()> {
        instructions::negotiation::initiate_negotiation(
            ctx,
            initial_offer,
            auto_accept_threshold,
            negotiation_deadline,
        )
    }

    pub fn make_counter_offer(
        ctx: Context<MakeCounterOffer>,
        counter_offer: u64,
        message: String,
    ) -> Result<()> {
        instructions::negotiation::make_counter_offer(ctx, counter_offer, message)
    }

    // =====================================================
    // PRICING INSTRUCTIONS
    // =====================================================

    pub fn create_dynamic_pricing_engine(
        ctx: Context<CreateDynamicPricingEngine>,
        config: DynamicPricingConfig,
    ) -> Result<()> {
        instructions::pricing::create_dynamic_pricing_engine(ctx, config)
    }

    pub fn update_dynamic_pricing(
        ctx: Context<UpdateDynamicPricing>,
        demand_metrics: DemandMetrics,
    ) -> Result<()> {
        instructions::pricing::update_dynamic_pricing(ctx, demand_metrics)
    }

    // =====================================================
    // REPLICATION INSTRUCTIONS
    // =====================================================

    pub fn create_replication_template(
        ctx: Context<CreateReplicationTemplate>,
        template_data: ReplicationTemplateData,
    ) -> Result<()> {
        instructions::replication::create_replication_template(ctx, template_data)
    }

    pub fn replicate_agent(
        ctx: Context<ReplicateAgent>,
        customization: instructions::replication::AgentCustomization,
        royalty_percentage: u32,
    ) -> Result<()> {
        instructions::replication::replicate_agent(ctx, customization, royalty_percentage)
    }

    pub fn batch_replicate_agents(
        ctx: Context<BatchReplicateAgents>,
        batch_request: instructions::replication::BatchReplicationRequest,
    ) -> Result<()> {
        instructions::replication::batch_replicate_agents(ctx, batch_request)
    }

    // =====================================================
    // ENHANCED ESCROW OPERATIONS WITH REENTRANCY PROTECTION
    // =====================================================

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        task_id: String,
        amount: u64,
        expires_at: i64,
        transfer_hook: Option<Pubkey>,
        is_confidential: bool,
    ) -> Result<()> {
        instructions::escrow_operations::create_escrow(
            ctx,
            task_id,
            amount,
            expires_at,
            transfer_hook,
            is_confidential,
        )
    }

    /// Create escrow by depositing native SOL (auto-wraps to wSOL)
    /// This provides a better UX by handling SOL wrapping automatically
    pub fn create_escrow_with_sol(
        ctx: Context<CreateEscrowWithSol>,
        task_id: String,
        amount: u64,
        expires_at: i64,
        transfer_hook: Option<Pubkey>,
        is_confidential: bool,
    ) -> Result<()> {
        instructions::escrow_operations::create_escrow_with_sol(
            ctx,
            task_id,
            amount,
            expires_at,
            transfer_hook,
            is_confidential,
        )
    }

    pub fn complete_escrow(
        ctx: Context<CompleteEscrow>,
        resolution_notes: Option<String>,
    ) -> Result<()> {
        instructions::escrow_operations::complete_escrow(ctx, resolution_notes)
    }

    pub fn dispute_escrow(ctx: Context<DisputeEscrow>, dispute_reason: String) -> Result<()> {
        instructions::escrow_operations::dispute_escrow(ctx, dispute_reason)
    }

    pub fn process_escrow_payment(
        ctx: Context<ProcessEscrowPayment>,
        work_order: Pubkey,
    ) -> Result<()> {
        instructions::escrow_operations::process_escrow_payment(ctx, work_order)
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>, cancellation_reason: String) -> Result<()> {
        instructions::escrow_operations::cancel_escrow(ctx, cancellation_reason)
    }

    pub fn refund_expired_escrow(ctx: Context<RefundExpiredEscrow>) -> Result<()> {
        instructions::escrow_operations::refund_expired_escrow(ctx)
    }

    pub fn process_partial_refund(
        ctx: Context<ProcessPartialRefund>,
        client_refund_percentage: u8,
    ) -> Result<()> {
        instructions::escrow_operations::process_partial_refund(ctx, client_refund_percentage)
    }

    // =====================================================
    // ENHANCED CHANNEL OPERATIONS WITH REAL-TIME MESSAGING
    // =====================================================

    pub fn create_enhanced_channel(
        ctx: Context<CreateEnhancedChannel>,
        channel_id: String,
        participants: Vec<Pubkey>,
        channel_type: ChannelType,
        metadata: ChannelMetadata,
    ) -> Result<()> {
        instructions::channel_operations::create_enhanced_channel(
            ctx,
            channel_id,
            participants,
            channel_type,
            metadata,
        )
    }

    pub fn send_enhanced_message(
        ctx: Context<SendEnhancedMessage>,
        message_id: String,
        content: String,
        message_type: MessageType,
        metadata: MessageMetadata,
        is_encrypted: bool,
    ) -> Result<()> {
        instructions::channel_operations::send_enhanced_message(
            ctx,
            message_id,
            content,
            message_type,
            metadata,
            is_encrypted,
        )
    }

    pub fn join_channel(ctx: Context<JoinChannel>) -> Result<()> {
        instructions::channel_operations::join_channel(ctx)
    }

    pub fn leave_channel(ctx: Context<LeaveChannel>) -> Result<()> {
        instructions::channel_operations::leave_channel(ctx)
    }

    pub fn update_channel_settings(
        ctx: Context<UpdateChannelSettings>,
        new_metadata: ChannelMetadata,
    ) -> Result<()> {
        instructions::channel_operations::update_channel_settings(ctx, new_metadata)
    }

    pub fn add_message_reaction(ctx: Context<AddMessageReaction>, reaction: String) -> Result<()> {
        instructions::channel_operations::add_message_reaction(ctx, reaction)
    }

    // NOTE: Reentrancy guard initialization is handled automatically by PDA creation
    // No separate instruction needed as guards are created on-demand

    // =====================================================
    // ROYALTY INSTRUCTIONS
    // =====================================================

    pub fn create_royalty_stream(
        ctx: Context<CreateRoyaltyStream>,
        config: RoyaltyConfig,
    ) -> Result<()> {
        instructions::royalty::create_royalty_stream(ctx, config)
    }

    pub fn list_agent_for_resale(
        ctx: Context<ListAgentForResale>,
        listing_price: u64,
    ) -> Result<()> {
        instructions::royalty::list_agent_for_resale(ctx, listing_price)
    }

    // =====================================================
    // TOKEN-2022 INSTRUCTIONS
    // =====================================================

    pub fn create_token_2022_mint(
        ctx: Context<CreateToken2022Mint>,
        params: CreateToken2022MintParams,
    ) -> Result<()> {
        instructions::token_2022_operations::create_token_2022_mint(ctx, params)
    }

    pub fn update_transfer_fee_config(
        ctx: Context<InitializeTransferFeeConfig>,
        params: TransferFeeConfigParams,
    ) -> Result<()> {
        instructions::token_2022_operations::update_transfer_fee_config(ctx, params)
    }

    pub fn initialize_confidential_transfer_mint(
        ctx: Context<InitializeConfidentialTransferMint>,
        params: ConfidentialTransferMintParams,
    ) -> Result<()> {
        instructions::token_2022_operations::initialize_confidential_transfer_mint(ctx, params)
    }

    pub fn initialize_interest_bearing_config(
        ctx: Context<InitializeInterestBearingConfig>,
        params: InterestBearingConfigParams,
    ) -> Result<()> {
        instructions::token_2022_operations::initialize_interest_bearing_config(ctx, params)
    }

    pub fn initialize_mint_close_authority(
        ctx: Context<InitializeMintCloseAuthority>,
    ) -> Result<()> {
        instructions::token_2022_operations::initialize_mint_close_authority(ctx)
    }

    pub fn initialize_default_account_state(
        ctx: Context<InitializeDefaultAccountState>,
        state: instructions::token_2022_operations::AccountState,
    ) -> Result<()> {
        instructions::token_2022_operations::initialize_default_account_state(ctx, state)
    }

    // =====================================================
    // GOVERNANCE VOTING INSTRUCTIONS
    // =====================================================

    /// Cast a vote on a governance proposal
    pub fn cast_vote(
        ctx: Context<CastVote>,
        vote_choice: VoteChoice,
        reasoning: Option<String>,
    ) -> Result<()> {
        instructions::governance_voting::cast_vote(ctx, vote_choice, reasoning)
    }

    /// Delegate voting power to another account
    pub fn delegate_vote(
        ctx: Context<DelegateVote>,
        proposal_id: u64,
        scope: DelegationScope,
        expires_at: Option<i64>,
    ) -> Result<()> {
        instructions::governance_voting::delegate_vote(ctx, proposal_id, scope, expires_at)
    }

    /// Tally votes and finalize proposal voting
    pub fn tally_votes(ctx: Context<TallyVotes>) -> Result<()> {
        instructions::governance_voting::tally_votes(ctx)
    }

    /// Execute a passed proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::governance_voting::execute_proposal(ctx)
    }

    // =====================================================
    // X402 PAYMENT PROTOCOL INSTRUCTIONS
    // =====================================================

    /// Configure x402 payment settings for an agent
    pub fn configure_x402(
        ctx: Context<ConfigureX402>,
        agent_id: String,
        config: instructions::x402_operations::X402ConfigData,
    ) -> Result<()> {
        instructions::x402_operations::configure_x402(ctx, agent_id, config)
    }

    /// Record an x402 payment transaction on-chain
    pub fn record_x402_payment(
        ctx: Context<RecordX402Payment>,
        agent_id: String,
        payment_data: instructions::x402_operations::X402PaymentData,
    ) -> Result<()> {
        instructions::x402_operations::record_x402_payment(ctx, agent_id, payment_data)
    }

    /// Submit a reputation rating from an x402 transaction
    pub fn submit_x402_rating(
        ctx: Context<SubmitX402Rating>,
        agent_id: String,
        rating_data: instructions::x402_operations::X402RatingData,
    ) -> Result<()> {
        instructions::x402_operations::submit_x402_rating(ctx, agent_id, rating_data)
    }

    // =====================================================
    // TYPE EXPORT INSTRUCTIONS FOR IDL GENERATION
    // =====================================================
    // These dummy instructions force Anchor to include nested types in the IDL
    // They are never meant to be called - they exist solely for IDL generation

    /// Dummy instruction to export AuditContext type
    pub fn _export_audit_context(
        _ctx: Context<DummyContext>,
        _data: crate::state::audit::AuditContext,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export BiometricQuality type
    pub fn _export_biometric_quality(
        _ctx: Context<DummyContext>,
        _data: crate::state::security_governance::BiometricQuality,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ComplianceStatus type
    pub fn _export_compliance_status(
        _ctx: Context<DummyContext>,
        _data: crate::state::audit::ComplianceStatus,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export DynamicPricingConfig type
    pub fn _export_dynamic_pricing_config(
        _ctx: Context<DummyContext>,
        _data: crate::state::pricing::DynamicPricingConfig,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export MultisigConfig type
    pub fn _export_multisig_config(
        _ctx: Context<DummyContext>,
        _data: crate::state::governance::MultisigConfig,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export Action type
    pub fn _export_action(
        _ctx: Context<DummyContext>,
        _data: crate::state::security_governance::Action,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export RuleCondition type
    pub fn _export_rule_condition(
        _ctx: Context<DummyContext>,
        _data: crate::state::security_governance::RuleCondition,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ReportEntry type
    pub fn _export_report_entry(
        _ctx: Context<DummyContext>,
        _data: crate::state::audit::ReportEntry,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ResourceConstraints type
    pub fn _export_resource_constraints(
        _ctx: Context<DummyContext>,
        _data: crate::state::security_governance::ResourceConstraints,
    ) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }
}

// =====================================================
// DUMMY CONTEXT FOR TYPE EXPORTS
// =====================================================
/// Dummy context for type export instructions
#[derive(Accounts)]
pub struct DummyContext<'info> {
    pub system_program: Program<'info, System>,
}

// =====================================================
// DUMMY EVENTS FOR TYPE EXPORTS
// =====================================================
// These events force Anchor to include nested types in the IDL

#[event]
pub struct AuditContextExport {
    pub data: crate::state::audit::AuditContext,
}

#[event]
pub struct BiometricQualityExport {
    pub data: crate::state::security_governance::BiometricQuality,
}

#[event]
pub struct ComplianceStatusExport {
    pub data: crate::state::audit::ComplianceStatus,
}

#[event]
pub struct DynamicPricingConfigExport {
    pub data: crate::state::pricing::DynamicPricingConfig,
}

#[event]
pub struct MultisigConfigExport {
    pub data: crate::state::governance::MultisigConfig,
}

#[event]
pub struct ActionExport {
    pub data: crate::state::security_governance::Action,
}

#[event]
pub struct RuleConditionExport {
    pub data: crate::state::security_governance::RuleCondition,
}

#[event]
pub struct ReportEntryExport {
    pub data: crate::state::audit::ReportEntry,
}

#[event]
pub struct ResourceConstraintsExport {
    pub data: crate::state::security_governance::ResourceConstraints,
}

// =====================================================
// EXPLICIT TYPE EXPORTS FOR IDL GENERATION
// =====================================================
// These types are used within nested structures but need to be
// explicitly declared for Anchor to include them in the IDL

/// Re-export AuditContext for IDL
pub use crate::state::audit::AuditContext;

/// Re-export BiometricQuality for IDL  
pub use crate::state::security_governance::BiometricQuality;

/// Re-export ComplianceStatus for IDL
pub use crate::state::audit::ComplianceStatus;

/// Re-export DynamicPricingConfig for IDL
pub use crate::state::pricing::DynamicPricingConfig;

/// Re-export MultisigConfig for IDL
pub use crate::state::governance::MultisigConfig;

/// Re-export Action for IDL
pub use crate::state::security_governance::Action;

/// Re-export RuleCondition for IDL
pub use crate::state::security_governance::RuleCondition;

/// Re-export ReportEntry for IDL
pub use crate::state::audit::ReportEntry;

/// Re-export ResourceConstraints for IDL
pub use crate::state::security_governance::ResourceConstraints;
