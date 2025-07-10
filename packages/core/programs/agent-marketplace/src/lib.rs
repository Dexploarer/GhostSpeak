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

use anchor_lang::prelude::*;

declare_id!("4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP");

// Program ID is already exported by declare_id! macro

// Module declarations
mod instructions;
pub mod state;
mod simple_optimization;

// Re-export all instruction handlers

// Re-export types from state module  
pub use state::*;

// Re-export optimization utilities
pub use simple_optimization::*;

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
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
pub const MAX_GENERAL_STRING_LENGTH: usize = 256;
pub const MAX_CAPABILITIES_COUNT: usize = 20;
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// Additional constants for various operations
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_REQUIREMENTS_ITEMS: usize = 10;
pub const MAX_MESSAGE_LENGTH: usize = 1024;

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

// =====================================================
// MISSING EVENT DEFINITIONS
// =====================================================

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

// =====================================================
// ADVANCED ERROR DEFINITIONS
// =====================================================

#[error_code]
pub enum PodAIMarketplaceError {
    // Agent-related errors (1000-1099)
    #[msg("Agent is not active")]
    AgentNotActive = 1000,
    #[msg("Agent not found")]
    AgentNotFound = 1001,
    
    // Pricing and payment errors (1100-1199)
    #[msg("Invalid price range")]
    InvalidPriceRange = 1100,
    #[msg("Invalid payment amount")]
    InvalidPaymentAmount = 1101,
    #[msg("Insufficient balance")]
    InsufficientBalance = 1102,
    #[msg("Payment already processed")]
    PaymentAlreadyProcessed = 1103,
    
    // Access control errors (1200-1299)
    #[msg("Unauthorized access")]
    UnauthorizedAccess = 1200,
    #[msg("Invalid agent owner")]
    InvalidAgentOwner = 1201,
    
    // State transition errors (1300-1399)
    #[msg("Invalid status transition")]
    InvalidStatusTransition = 1300,
    #[msg("Work order not found")]
    WorkOrderNotFound = 1301,
    #[msg("Service not found")]
    ServiceNotFound = 1302,
    #[msg("Invalid work order status")]
    InvalidWorkOrderStatus = 1303,
    #[msg("Invalid task status")]
    InvalidTaskStatus = 1304,
    #[msg("Invalid escrow status")]
    InvalidEscrowStatus = 1305,
    #[msg("Invalid report status")]
    InvalidReportStatus = 1306,
    #[msg("Invalid negotiation status")]
    InvalidNegotiationStatus = 1307,
    
    // Time-related errors (1400-1499)
    #[msg("Deadline passed")]
    DeadlinePassed = 1400,
    #[msg("Invalid deadline")]
    InvalidDeadline = 1401,
    #[msg("Update frequency too high")]
    UpdateFrequencyTooHigh = 1403,
    #[msg("Invalid period")]
    InvalidPeriod = 1406,
    #[msg("Invalid expiration")]
    InvalidExpiration = 1407,
    #[msg("Task deadline exceeded")]
    TaskDeadlineExceeded = 1408,
    #[msg("Negotiation expired")]
    NegotiationExpired = 1409,
    #[msg("Deal expired")]
    DealExpired = 1410,
    
    // Marketplace-specific errors (1404-1499)
    #[msg("Invalid bid")]
    InvalidBid = 1404,
    #[msg("Invalid application status")]
    InvalidApplicationStatus = 1405,
    #[msg("Auction duration too short")]
    AuctionDurationTooShort = 1411,
    #[msg("Auction duration too long")]
    AuctionDurationTooLong = 1412,
    #[msg("Bid increment too low")]
    BidIncrementTooLow = 1413,
    #[msg("Invalid starting price")]
    InvalidStartingPrice = 1414,
    #[msg("Auction not active")]
    AuctionNotActive = 1415,
    #[msg("Auction ended")]
    AuctionEnded = 1416,
    #[msg("Bid too low")]
    BidTooLow = 1417,
    #[msg("Auction not ended")]
    AuctionNotEnded = 1418,
    #[msg("Cannot cancel auction with bids")]
    CannotCancelAuctionWithBids = 1419,
    #[msg("Invalid amount")]
    InvalidAmount = 1420,
    #[msg("Invalid volume tier")]
    InvalidVolumeTier = 1421,
    #[msg("Invalid discount percentage")]
    InvalidDiscountPercentage = 1422,
    #[msg("Overlapping volume tiers")]
    OverlappingVolumeTiers = 1423,
    #[msg("Deal not active")]
    DealNotActive = 1424,
    #[msg("Deal full")]
    DealFull = 1425,
    #[msg("No participants")]
    NoParticipants = 1426,
    #[msg("Insufficient participants")]
    InsufficientParticipants = 1427,
    #[msg("Invalid min participants")]
    InvalidMinParticipants = 1428,
    #[msg("Invalid max participants")]
    InvalidMaxParticipants = 1429,
    
    // Input validation errors (1500-1599)
    #[msg("Input too long")]
    InputTooLong = 1500,
    #[msg("Name too long")]
    NameTooLong = 1501,
    #[msg("Message too long")]
    MessageTooLong = 1502,
    #[msg("Invalid rating")]
    InvalidRating = 1503,
    #[msg("Description too long")]
    DescriptionTooLong = 1504,
    #[msg("Title too long")]
    TitleTooLong = 1505,
    #[msg("Too many capabilities")]
    TooManyCapabilities = 1506,
    #[msg("Capability too long")]
    CapabilityTooLong = 1507,
    #[msg("Invalid genome hash")]
    InvalidGenomeHash = 1508,
    #[msg("Invalid service endpoint")]
    InvalidServiceEndpoint = 1509,
    #[msg("Invalid metadata URI")]
    InvalidMetadataUri = 1510,
    #[msg("Metadata URI too long")]
    MetadataUriTooLong = 1511,
    #[msg("Metrics too long")]
    MetricsTooLong = 1512,
    #[msg("Too many requirements")]
    TooManyRequirements = 1513,
    #[msg("Requirement too long")]
    RequirementTooLong = 1514,
    #[msg("No deliverables")]
    NoDeliverables = 1515,
    #[msg("Too many deliverables")]
    TooManyDeliverables = 1516,
    #[msg("IPFS hash too long")]
    IpfsHashTooLong = 1517,
    #[msg("Term too long")]
    TermTooLong = 1518,
    #[msg("Too many terms")]
    TooManyTerms = 1519,
    #[msg("Too many volume tiers")]
    TooManyVolumeTiers = 1520,
    #[msg("Too many bids")]
    TooManyBids = 1521,
    #[msg("Too many audit entries")]
    TooManyAuditEntries = 1522,
    #[msg("Too many top agents")]
    TooManyTopAgents = 1523,
    #[msg("Too many counter offers")]
    TooManyCounterOffers = 1524,
    #[msg("Task ID too long")]
    TaskIdTooLong = 1525,
    #[msg("Dispute reason too long")]
    DisputeReasonTooLong = 1526,
    #[msg("Completion proof too long")]
    CompletionProofTooLong = 1527,
    #[msg("Dispute details too long")]
    DisputeDetailsTooLong = 1528,
    #[msg("Resolution notes too long")]
    ResolutionNotesTooLong = 1529,
    
    // Arithmetic and overflow errors (1800-1899)
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
    
    // Configuration errors (2100-2199)
    #[msg("Invalid configuration")]
    InvalidConfiguration = 2100,
    
    // Additional errors
    #[msg("Invalid offer")]
    InvalidOffer = 2101,
    
    #[msg("Service is not active")]
    ServiceNotActive = 2104,
    
    #[msg("Invalid percentage value")]
    InvalidPercentage = 2105,
    
    #[msg("Compute budget exceeded")]
    ComputeBudgetExceeded = 2106,
    
    #[msg("Job posting is not active")]
    JobNotActive = 2107,
    
    #[msg("Insufficient funds for operation")]
    InsufficientFunds = 2108,
    
    #[msg("Agent is already active")]
    AgentAlreadyActive = 2109,
    
    #[msg("Invalid reputation score")]
    InvalidReputationScore = 2110,
    
    #[msg("Invalid service configuration")]
    InvalidServiceConfiguration = 2111,
    
    #[msg("Invalid job status")]
    InvalidJobStatus = 2112,
    
    // Missing error variants found in codebase
    #[msg("Auction already ended")]
    AuctionAlreadyEnded = 2113,
    
    #[msg("Dispute case not found")]
    DisputeCaseNotFound = 2114,
    
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved = 2115,
    
    #[msg("Invalid dispute status")]
    InvalidDisputeStatus = 2116,
    
    #[msg("Too many evidence items")]
    TooManyEvidenceItems = 2117,
    
    #[msg("Invalid contract status")]
    InvalidContractStatus = 2118,
    
    #[msg("String too long")]
    StringTooLong = 2119,
    
    #[msg("Invalid volume")]
    InvalidVolume = 2120,
    
    #[msg("Invalid value")]
    InvalidValue = 2121,
    
    #[msg("Invalid duration")]
    InvalidDuration = 2122,
    
    #[msg("Job already filled")]
    JobAlreadyFilled = 2123,
    
    #[msg("Application not found")]
    ApplicationNotFound = 2124,
    
    #[msg("Application already processed")]
    ApplicationAlreadyProcessed = 2125,
    
    #[msg("Listing already active")]
    ListingAlreadyActive = 2126,
    
    #[msg("Listing not active")]
    ListingNotActive = 2127,
    
    #[msg("Invalid service type")]
    InvalidServiceType = 2128,
    
    #[msg("Agent already registered")]
    AgentAlreadyRegistered = 2129,
    
    #[msg("Invalid agent status")]
    InvalidAgentStatus = 2130,
    
    #[msg("Message not found")]
    MessageNotFound = 2131,
    
    #[msg("Invalid message status")]
    InvalidMessageStatus = 2132,
    
    #[msg("Channel not found")]
    ChannelNotFound = 2133,
    
    #[msg("Channel already exists")]
    ChannelAlreadyExists = 2134,
    
    #[msg("Invalid channel configuration")]
    InvalidChannelConfiguration = 2135,
    
    #[msg("Work order already exists")]
    WorkOrderAlreadyExists = 2186,
    
    #[msg("Invalid delivery status")]
    InvalidDeliveryStatus = 2136,
    
    #[msg("Escrow not found")]
    EscrowNotFound = 2137,
    
    #[msg("Escrow already released")]
    EscrowAlreadyReleased = 2138,
    
    #[msg("Invalid escrow amount")]
    InvalidEscrowAmount = 2139,
    
    #[msg("Negotiation not found")]
    NegotiationNotFound = 2140,
    
    #[msg("Invalid offer amount")]
    InvalidOfferAmount = 2141,
    
    #[msg("Royalty configuration invalid")]
    RoyaltyConfigurationInvalid = 2142,
    
    #[msg("Invalid royalty percentage")]
    InvalidRoyaltyPercentage = 2143,
    
    #[msg("Analytics not enabled")]
    AnalyticsNotEnabled = 2144,
    
    #[msg("Invalid metrics data")]
    InvalidMetricsData = 2145,
    
    #[msg("Extension not found")]
    ExtensionNotFound = 2146,
    
    #[msg("Extension already enabled")]
    ExtensionAlreadyEnabled = 2147,
    
    #[msg("Invalid extension configuration")]
    InvalidExtensionConfiguration = 2148,
    
    #[msg("Incentive pool exhausted")]
    IncentivePoolExhausted = 2149,
    
    #[msg("Invalid incentive configuration")]
    InvalidIncentiveConfiguration = 2150,
    
    #[msg("Compliance check failed")]
    ComplianceCheckFailed = 2151,
    
    #[msg("Governance proposal invalid")]
    GovernanceProposalInvalid = 2152,
    
    #[msg("Voting period ended")]
    VotingPeriodEnded = 2153,
    
    #[msg("Already voted")]
    AlreadyVoted = 2154,
    
    #[msg("Insufficient voting power")]
    InsufficientVotingPower = 2155,
    
    #[msg("Replication not allowed")]
    ReplicationNotAllowed = 2156,
    
    #[msg("Invalid replication config")]
    InvalidReplicationConfig = 2157,
    
    #[msg("Price model not supported")]
    PriceModelNotSupported = 2158,
    
    #[msg("Invalid price configuration")]
    InvalidPriceConfiguration = 2159,
    
    #[msg("Bulk deal not found")]
    BulkDealNotFound = 2160,
    
    #[msg("Invalid participant count")]
    InvalidParticipantCount = 2161,
    
    #[msg("Deal already finalized")]
    DealAlreadyFinalized = 2162,
    
    #[msg("Invalid A2A protocol message")]
    InvalidA2AProtocolMessage = 2163,
    
    #[msg("Protocol version mismatch")]
    ProtocolVersionMismatch = 2164,
    
    #[msg("Task not found")]
    TaskNotFound = 2165,
    
    #[msg("Task already completed")]
    TaskAlreadyCompleted = 2166,
    
    #[msg("Invalid task configuration")]
    InvalidTaskConfiguration = 2167,
    
    #[msg("Report not found")]
    ReportNotFound = 2168,
    
    #[msg("Invalid report data")]
    InvalidReportData = 2169,
    
    #[msg("Access denied")]
    AccessDenied = 2170,
    
    #[msg("Operation not supported")]
    OperationNotSupported = 2171,
    
    #[msg("Resource locked")]
    ResourceLocked = 2172,
    
    #[msg("Rate limit exceeded")]
    RateLimitExceeded = 2173,
    
    #[msg("Invalid state transition")]
    InvalidStateTransition = 2174,
    
    #[msg("Data corruption detected")]
    DataCorruptionDetected = 2175,
    
    #[msg("Signature verification failed")]
    SignatureVerificationFailed = 2176,
    
    #[msg("Token transfer failed")]
    TokenTransferFailed = 2177,
    
    #[msg("Account not initialized")]
    AccountNotInitialized = 2178,
    
    #[msg("Account already initialized")]
    AccountAlreadyInitialized = 2179,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner = 2180,
    
    #[msg("Maximum retries exceeded")]
    MaximumRetriesExceeded = 2181,
    
    #[msg("Operation timed out")]
    OperationTimedOut = 2182,
    
    #[msg("Invalid input format")]
    InvalidInputFormat = 2183,
    
    #[msg("Feature not enabled")]
    FeatureNotEnabled = 2184,
    
    #[msg("Maintenance mode active")]
    MaintenanceModeActive = 2185,
}

// =====================================================
// PROGRAM MODULE
// =====================================================

#[program]
pub mod podai_marketplace {
    use super::*;

    // Agent management instructions (core functionality)
    pub use instructions::agent::*;
    pub use instructions::agent_management::*;
    
    // Marketplace instructions
    pub use instructions::marketplace::*;
    
    // Work order instructions
    pub use instructions::work_orders::*;
    
    // Messaging instructions
    pub use instructions::messaging::*;
    
    // Payment instructions
    pub use instructions::escrow_payment::*;
    
    // Auction instructions
    pub use instructions::auction::*;
    
    // A2A protocol instructions
    pub use instructions::a2a_protocol::*;
    
    // Replication instructions
    pub use instructions::replication::*;
    
    // Pricing instructions
    pub use instructions::pricing::*;
    
    // Negotiation instructions
    pub use instructions::negotiation::*;
    
    // Bulk deals instructions
    pub use instructions::bulk_deals::*;
    
    // Royalty instructions
    pub use instructions::royalty::*;
    
    // Dispute resolution instructions
    pub use instructions::dispute::*;
    
    // Analytics instructions
    pub use instructions::analytics::*;
    
    // Extension instructions
    pub use instructions::extensions::*;
    
    // Incentive instructions
    pub use instructions::incentives::*;
    
    // Compliance and governance instructions
    pub use instructions::compliance_governance::*;
}