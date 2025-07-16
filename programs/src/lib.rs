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

declare_id!("AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR");

// Module declarations
mod instructions;
mod simple_optimization;
pub mod state;

// Re-export types from state module
pub use state::*;

// Re-export optimization utilities
pub use simple_optimization::*;

// Re-export all instruction types and context structures for Anchor
pub use instructions::*;

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
pub const MAX_GENERAL_STRING_LENGTH: usize = 256;
pub const MAX_CAPABILITIES_COUNT: usize = 20;
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// Protocol admin for governance and critical operations
// For devnet/testnet: Use a development admin key
// For mainnet: This should be set to a multisig or governance-controlled account
#[cfg(feature = "devnet")]
pub const PROTOCOL_ADMIN: Pubkey =
    anchor_lang::solana_program::pubkey!("11111111111111111111111111111111");
#[cfg(not(feature = "devnet"))]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([1u8; 32]);

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

#[error_code]
pub enum GhostSpeakError {
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
    WorkOrderAlreadyExists = 2200,

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

    #[msg("Invalid input length")]
    InvalidInputLength = 2186,

    #[msg("Invalid parameter")]
    InvalidParameter = 2187,

    #[msg("Invalid deal status")]
    InvalidDealStatus = 2188,

    #[msg("Dispute window expired")]
    DisputeWindowExpired = 2189,

    #[msg("Evidence window expired")]
    EvidenceWindowExpired = 2190,

    #[msg("Too many evidence submissions")]
    TooManyEvidenceSubmissions = 2191,

    #[msg("Unauthorized arbitrator")]
    UnauthorizedArbitrator = 2192,

    #[msg("Invalid transaction status")]
    InvalidTransactionStatus = 2193,

    #[msg("Invalid extension status")]
    InvalidExtensionStatus = 2194,
}

// =====================================================
// PROGRAM MODULE - 2025 ANCHOR BEST PRACTICES
// =====================================================

#[program]
pub mod ghostspeak_marketplace {
    use super::*;

    // =====================================================
    // AGENT MANAGEMENT INSTRUCTIONS
    // =====================================================

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_type: u8,
        metadata_uri: String,
        _agent_id: String,
    ) -> Result<()> {
        instructions::agent::register_agent(ctx, agent_type, metadata_uri, _agent_id)
    }

    /// Register Agent using ZK compression (solves error 2006 with 5000x cost reduction)
    pub fn register_agent_compressed(
        ctx: Context<RegisterAgentCompressed>,
        agent_type: u8,
        metadata_uri: String,
        agent_id: String,
    ) -> Result<()> {
        instructions::agent_compressed::register_agent_compressed(ctx, agent_type, metadata_uri, agent_id)
    }

    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        _agent_type: u8,
        metadata_uri: String,
        _agent_id: String,
    ) -> Result<()> {
        instructions::agent::update_agent(ctx, _agent_type, metadata_uri, _agent_id)
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
        instructions::escrow_payment::process_payment(ctx, amount, use_confidential_transfer)
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

    pub fn finalize_auction(ctx: Context<FinalizeAuction>) -> Result<()> {
        instructions::auction::finalize_auction(ctx)
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
    ) -> Result<()> {
        instructions::replication::replicate_agent(ctx, customization)
    }

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
    // TYPE EXPORT INSTRUCTIONS FOR IDL GENERATION
    // =====================================================
    // These dummy instructions force Anchor to include nested types in the IDL
    // They are never meant to be called - they exist solely for IDL generation

    /// Dummy instruction to export AuditContext type
    pub fn _export_audit_context(_ctx: Context<DummyContext>, _data: crate::state::audit::AuditContext) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export BiometricQuality type
    pub fn _export_biometric_quality(_ctx: Context<DummyContext>, _data: crate::state::security_governance::BiometricQuality) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ComplianceStatus type
    pub fn _export_compliance_status(_ctx: Context<DummyContext>, _data: crate::state::audit::ComplianceStatus) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export DynamicPricingConfig type
    pub fn _export_dynamic_pricing_config(_ctx: Context<DummyContext>, _data: crate::state::pricing::DynamicPricingConfig) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export MultisigConfig type
    pub fn _export_multisig_config(_ctx: Context<DummyContext>, _data: crate::state::governance::MultisigConfig) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export Action type
    pub fn _export_action(_ctx: Context<DummyContext>, _data: crate::state::security_governance::Action) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export RuleCondition type
    pub fn _export_rule_condition(_ctx: Context<DummyContext>, _data: crate::state::security_governance::RuleCondition) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ReportEntry type
    pub fn _export_report_entry(_ctx: Context<DummyContext>, _data: crate::state::audit::ReportEntry) -> Result<()> {
        err!(GhostSpeakError::FeatureNotEnabled)
    }

    /// Dummy instruction to export ResourceConstraints type
    pub fn _export_resource_constraints(_ctx: Context<DummyContext>, _data: crate::state::security_governance::ResourceConstraints) -> Result<()> {
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
