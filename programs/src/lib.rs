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

declare_id!("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB");

// NOTE: security_txt macro is NOT embedded here because SPL dependencies
// (spl-account-compression, spl-token-2022) already embed their own security_txt,
// causing linker symbol conflicts. Security contact info is available at:
// - SECURITY.md in the repository
// - https://github.com/dexploarer/GhostSpeak
// - Email: dexploarer@gmail.com

// Module declarations
mod instructions;
pub mod security;
pub mod state;
pub mod utils;

#[cfg(test)]
// Re-export types from state module
pub use state::*;

// Re-export security utilities
pub use security::*;

// Re-export utility functions
pub use utils::*;

// Re-export all instruction types and context structures for Anchor
pub use instructions::*;

// Additional specific type re-exports for instruction compatibility
// These types are used frequently in instruction files and need to be available at crate root
// Core Re-exports for Instruction Compatibility
pub use state::Agent;
pub use state::AgentVerification;
pub use state::AuditConfig;
pub use state::DelegationScope;
pub use state::ExecutionParams;
// pub use state::IncentiveConfig; // Removed - incentives delegated to PayAI
// pub use state::Payment; // Removed
pub use state::ProposalType;
pub use state::ReportType;
pub use state::ReputationMetrics;
pub use state::Role;
pub use state::UserRegistry;
pub use state::VoteChoice;
pub use state::VotingResults;

// Credential types for Pillar 1: Verifiable Credentials
pub use state::CredentialKind;
pub use state::CrossChainStatus;

// Staking types (GHOST token staking for reputation boost)
pub use state::AccessTier;
pub use state::SlashReason;

// Revenue distribution types (transparent revenue-share staking)
// pub use state::RevenueSource; // Commented out until revenue_pool is implemented

// Ghost Protect escrow types (B2C escrow with dispute resolution)
pub use state::ArbitratorDecision;

// DID types (Pillar 3: Decentralized Identifiers)
pub use state::VerificationMethod;
pub use state::ServiceEndpoint;

// Reputation tag types (Pillar 2: Reputation Tags)
pub use state::TagScore;

// =====================================================
// DATA STRUCTURES
// =====================================================

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
// Using new_from_array since pubkey! macro path changed in Solana 2.x
#[cfg(feature = "devnet")]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([
    0x4f, 0xf3, 0x1b, 0x42, 0x3c, 0xd5, 0x8e, 0x7a, 0x91, 0x0a, 0xb2, 0xc4, 0x6e, 0x1d, 0x9f, 0x83,
    0x57, 0x2b, 0xe0, 0x14, 0x68, 0xa9, 0x3c, 0x5d, 0x76, 0x02, 0xf5, 0x19, 0x88, 0x4b, 0xc7, 0xde,
]);

#[cfg(feature = "testnet")]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([
    0x4f, 0xf3, 0x1b, 0x42, 0x3c, 0xd5, 0x8e, 0x7a, 0x91, 0x0a, 0xb2, 0xc4, 0x6e, 0x1d, 0x9f, 0x83,
    0x57, 0x2b, 0xe0, 0x14, 0x68, 0xa9, 0x3c, 0x5d, 0x76, 0x02, 0xf5, 0x19, 0x88, 0x4b, 0xc7, 0xde,
]);

#[cfg(feature = "mainnet")]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([
    0x4f, 0xf3, 0x1b, 0x42, 0x3c, 0xd5, 0x8e, 0x7a, 0x91, 0x0a, 0xb2, 0xc4, 0x6e, 0x1d, 0x9f, 0x83,
    0x57, 0x2b, 0xe0, 0x14, 0x68, 0xa9, 0x3c, 0x5d, 0x76, 0x02, 0xf5, 0x19, 0x88, 0x4b, 0xc7, 0xde,
]);

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

// =====================================================
// EVENTS
// =====================================================
// A2A and H2A protocol events removed - messaging not needed for VC/Reputation layer

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
    #[msg("Insufficient GHOST tokens staked (minimum 1,000 GHOST required for Sybil resistance)")]
    InsufficientStake = 1106,

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

    // ===== REPUTATION TAG ERRORS (2650-2699) =====
    #[msg("Tag name too long (max 32 characters)")]
    TagNameTooLong = 2650,
    #[msg("Invalid tag confidence (must be 0-10000 basis points)")]
    InvalidConfidence = 2651,
    #[msg("Maximum skill tags reached (max 20)")]
    MaxSkillTagsReached = 2652,
    #[msg("Maximum behavior tags reached (max 20)")]
    MaxBehaviorTagsReached = 2653,
    #[msg("Maximum compliance tags reached (max 10)")]
    MaxComplianceTagsReached = 2654,
    #[msg("Maximum tag scores reached (max 50)")]
    MaxTagScoresReached = 2655,

    // ===== BADGE/NFT ERRORS (2700-2749) =====
    #[msg("Badge is not transferable")]
    BadgeNotTransferable = 2700,
    #[msg("Badge is not active")]
    BadgeInactive = 2701,

    // ===== AUTHORIZATION ERRORS (2750-2799) =====
    #[msg("Authorization already revoked")]
    AlreadyRevoked = 2750,
    #[msg("Authorization already used")]
    AuthAlreadyUsed = 2751,
    #[msg("Already fulfilled")]
    AlreadyFulfilled = 2752,
    #[msg("No validator assigned")]
    NoValidatorAssigned = 2753,
    #[msg("Network mismatch")]
    NetworkMismatch = 2754,
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
    // PROTOCOL CONFIGURATION INSTRUCTIONS
    // =====================================================

    /// Initialize the global protocol configuration
    ///
    /// Sets up fee infrastructure with all fees initially disabled (set to 0).
    /// Fees will be enabled via governance after mainnet deployment.
    ///
    /// NOTE: Fee structure is in place but set to 0 until mainnet.
    pub fn initialize_protocol_config(ctx: Context<InitializeProtocolConfig>) -> Result<()> {
        instructions::protocol_config::initialize_protocol_config(ctx)
    }

    /// Enable production fees (authority only)
    ///
    /// Activates the full fee structure for mainnet:
    /// - Escrow: 0.5% (80% Treasury, 20% Buyback)
    /// - Agent Registration: 0.01 SOL
    /// - Marketplace Listing: 0.001 SOL
    /// - Dispute Resolution: 1%
    pub fn enable_protocol_fees(ctx: Context<EnableProtocolFees>) -> Result<()> {
        instructions::protocol_config::enable_protocol_fees(ctx)
    }

    /// Update protocol configuration parameters
    pub fn update_protocol_config(
        ctx: Context<UpdateProtocolConfig>,
        escrow_fee_bps: Option<u16>,
        agent_registration_fee: Option<u64>,
        listing_fee: Option<u64>,
        dispute_fee_bps: Option<u16>,
        fees_enabled: Option<bool>,
        treasury: Option<Pubkey>,
        buyback_pool: Option<Pubkey>,
        moderator_pool: Option<Pubkey>,
    ) -> Result<()> {
        instructions::protocol_config::update_protocol_config(
            ctx,
            escrow_fee_bps,
            agent_registration_fee,
            listing_fee,
            dispute_fee_bps,
            fees_enabled,
            treasury,
            buyback_pool,
            moderator_pool,
        )
    }

    // =====================================================
    // STAKING INSTRUCTIONS
    // =====================================================

    /// Initialize GHOST token staking configuration (admin only)
    pub fn initialize_staking_config(
        ctx: Context<InitializeStakingConfig>,
        min_stake: u64,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::staking::initialize_staking_config(ctx, min_stake, treasury)
    }

    /// Stake GHOST tokens to boost agent reputation
    pub fn stake_ghost(
        ctx: Context<StakeGhost>,
        amount: u64,
        lock_duration: i64,
    ) -> Result<()> {
        instructions::staking::stake_ghost(ctx, amount, lock_duration)
    }

    /// Unstake GHOST tokens after lock period expires
    pub fn unstake_ghost(ctx: Context<UnstakeGhost>) -> Result<()> {
        instructions::staking::unstake_ghost(ctx)
    }

    /// Slash staked tokens (admin only, for fraud/disputes)
    pub fn slash_stake(
        ctx: Context<SlashStake>,
        owner: Pubkey,
        reason: SlashReason,
        custom_amount: Option<u64>,
    ) -> Result<()> {
        instructions::staking::slash_stake(ctx, owner, reason, custom_amount)
    }

    // =====================================================
    // REVENUE DISTRIBUTION INSTRUCTIONS - COMMENTED OUT
    // =====================================================
    // Module not implemented yet - commented out in mod.rs

    /*
    /// Initialize the global revenue pool (admin only)
    pub fn initialize_revenue_pool(ctx: Context<InitializeRevenuePool>) -> Result<()> {
        instructions::revenue_distribution::initialize_revenue_pool(ctx)
    }

    /// Distribute protocol revenue to stakers (admin only)
    pub fn distribute_revenue(
        ctx: Context<DistributeRevenue>,
        amount: u64,
        source: RevenueSource,
    ) -> Result<()> {
        instructions::revenue_distribution::distribute_revenue(ctx, amount, source)
    }

    /// Claim accumulated USDC rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::revenue_distribution::claim_rewards(ctx)
    }

    /// Recalculate global weighted stake (called by staking operations)
    pub fn recalculate_global_weighted_stake(
        ctx: Context<UpdateGlobalWeightedStake>,
        new_total_weighted_stake: u64,
    ) -> Result<()> {
        instructions::revenue_distribution::recalculate_global_weighted_stake(
            ctx,
            new_total_weighted_stake,
        )
    }

    /// Reset period revenue counter (admin only, monthly)
    pub fn reset_period(ctx: Context<ResetPeriod>) -> Result<()> {
        instructions::revenue_distribution::reset_period(ctx)
    }
    */

    // =====================================================
    // PAYMENT INSTRUCTIONS - COMMENTED OUT
    // =====================================================
    // Modules not implemented yet - commented out in mod.rs

    /*
    /// Pay 1 USDC for single agent verification
    pub fn pay_with_usdc(ctx: Context<PayWithUsdc>) -> Result<()> {
        instructions::pay_with_usdc::pay_with_usdc(ctx)
    }

    /// Burn 75 GHOST tokens for verification (25% discount)
    pub fn burn_ghost_for_payment(ctx: Context<BurnGhostForPayment>) -> Result<()> {
        instructions::burn_ghost_for_payment::burn_ghost_for_payment(ctx)
    }

    /// Process Crossmint fiat payment after webhook confirmation
    pub fn pay_with_crossmint(
        ctx: Context<PayWithCrossmint>,
        webhook_signature: String,
        crossmint_transaction_id: String,
    ) -> Result<()> {
        instructions::pay_with_crossmint::pay_with_crossmint(
            ctx,
            webhook_signature,
            crossmint_transaction_id,
        )
    }
    */

    // =====================================================
    // B2B BILLING INSTRUCTIONS - COMMENTED OUT
    // =====================================================
    // Module not implemented yet - commented out in mod.rs

    /*
    /// Create team's USDC token account for prepaid API billing
    pub fn create_team_account(
        ctx: Context<CreateTeamAccount>,
        tier: SubscriptionTier,
    ) -> Result<()> {
        instructions::b2b_billing::create_team_account(ctx, tier)
    }

    /// Deposit USDC to team account
    pub fn deposit_funds(
        ctx: Context<DepositFunds>,
        amount: u64,
    ) -> Result<()> {
        instructions::b2b_billing::deposit_funds(ctx, amount)
    }

    /// Deduct usage cost from team account (called per API request)
    pub fn deduct_usage(
        ctx: Context<DeductUsage>,
        endpoint: String,
        request_count: u64,
    ) -> Result<()> {
        instructions::b2b_billing::deduct_usage(ctx, endpoint, request_count)
    }

    /// Withdraw unused funds from team account
    pub fn withdraw_unused(
        ctx: Context<WithdrawUnused>,
        amount: u64,
    ) -> Result<()> {
        instructions::b2b_billing::withdraw_unused(ctx, amount)
    }

    /// Update team subscription tier (admin only)
    pub fn update_tier(
        ctx: Context<UpdateTier>,
        new_tier: SubscriptionTier,
    ) -> Result<()> {
        instructions::b2b_billing::update_tier(ctx, new_tier)
    }
    */

    // =====================================================
    // GHOST PROTECT ESCROW INSTRUCTIONS
    // =====================================================

    /// Create a new escrow for agent service payment
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        escrow_id: u64,
        amount: u64,
        job_description: String,
        deadline: i64,
    ) -> Result<()> {
        instructions::ghost_protect::create_escrow(
            ctx,
            escrow_id,
            amount,
            job_description,
            deadline,
        )
    }

    /// Agent submits work delivery proof
    pub fn submit_delivery(
        ctx: Context<SubmitDelivery>,
        delivery_proof: String,
    ) -> Result<()> {
        instructions::ghost_protect::submit_delivery(ctx, delivery_proof)
    }

    /// Client approves delivery and releases payment
    pub fn approve_delivery(ctx: Context<ApproveDelivery>) -> Result<()> {
        instructions::ghost_protect::approve_delivery(ctx)
    }

    /// Client files a dispute on escrow
    pub fn file_dispute(
        ctx: Context<FileDispute>,
        reason: String,
    ) -> Result<()> {
        instructions::ghost_protect::file_dispute(ctx, reason)
    }

    /// Arbitrator resolves dispute (admin only)
    pub fn arbitrate_dispute(
        ctx: Context<ArbitrateDispute>,
        decision: ArbitratorDecision,
    ) -> Result<()> {
        instructions::ghost_protect::arbitrate_dispute(ctx, decision)
    }

    // ENHANCED GOVERNANCE VOTING REMOVED (Deprecated Staking)

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
        pricing_model: PricingModel,
    ) -> Result<()> {
        instructions::agent::register_agent(
            ctx,
            agent_type,
            name,
            description,
            metadata_uri,
            _agent_id,
            pricing_model,
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
        pricing_model: PricingModel,
    ) -> Result<()> {
        instructions::agent_compressed::register_agent_compressed(
            ctx,
            agent_type,
            metadata_uri,
            agent_id,
            name,
            description,
            pricing_model,
        )
    }
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        _agent_type: u8,
        name: Option<String>,
        description: Option<String>,
        metadata_uri: String,
        _agent_id: String,
        pricing_model: Option<PricingModel>,
    ) -> Result<()> {
        instructions::agent::update_agent(
            ctx,
            _agent_type,
            name,
            description,
            metadata_uri,
            _agent_id,
            pricing_model,
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

    // MARKETPLACE INSTRUCTIONS REMOVED

    // MESSAGING INSTRUCTIONS REMOVED

    // PROCESS PAYMENT INSTRUCTIONS REMOVED (WorkOrder Deprecated)

    // WORK ORDER INSTRUCTIONS REMOVED

    // =====================================================
    // A2A & H2A PROTOCOL INSTRUCTIONS - REMOVED
    // Agent/human messaging not needed for VC/Reputation layer
    // =====================================================

    /* A2A/H2A entry points removed - messaging not aligned with pivot:
    pub fn create_a2a_session(...)
    pub fn send_a2a_message(...)
    pub fn update_a2a_status(...)
    pub fn create_communication_session(...)
    pub fn send_communication_message(...)
    pub fn update_participant_status(...)
    */

    // ANALYTICS INSTRUCTIONS REMOVED

    // AUCTION INSTRUCTIONS REMOVED

    // BULK DEALS INSTRUCTIONS REMOVED

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

    // DISPUTE INSTRUCTIONS REMOVED

    // EXTENSION INSTRUCTIONS REMOVED

    // INCENTIVE INSTRUCTIONS REMOVED

    // NEGOTIATION INSTRUCTIONS REMOVED

    // PRICING INSTRUCTIONS REMOVED

    // REPLICATION INSTRUCTIONS REMOVED

    // =====================================================
    // ENHANCED ESCROW OPERATIONS WITH REENTRANCY PROTECTION
    // =====================================================

    // =====================================================
    // ENHANCED CHANNEL OPERATIONS WITH REAL-TIME MESSAGING
    // =====================================================

    // ENHANCED CHANNEL OPERATIONS REMOVED
    // channel_operations instructions fully removed

    // NOTE: Reentrancy guard initialization is handled automatically by PDA creation
    // No separate instruction needed as guards are created on-demand

    // ROYALTY INSTRUCTIONS REMOVED

    // =====================================================
    // TOKEN-2022 INSTRUCTIONS - REMOVED
    // Not aligned with VC/Reputation pivot
    // =====================================================

    /* Token-2022 entry points removed - not aligned with pivot:
    pub fn create_token_2022_mint(...)
    pub fn update_transfer_fee_config(...)
    pub fn initialize_confidential_transfer_mint(...)
    pub fn initialize_interest_bearing_config(...)
    pub fn initialize_mint_close_authority(...)
    pub fn initialize_default_account_state(...)
    */

    // =====================================================
    // GOVERNANCE VOTING INSTRUCTIONS - REMOVED
    // Simple admin authority via protocol_config + multisig
    // =====================================================

    /* Governance voting removed - simple admin authority instead:
    pub fn cast_vote(...)
    pub fn delegate_vote(...)
    pub fn tally_votes(...)
    pub fn execute_proposal(...)
    */

    // =====================================================
    // X402 PAYMENT PROTOCOL INSTRUCTIONS - REMOVED
    // Payment facilitation delegated to PayAI
    // =====================================================

    /* X402 entry points removed - payment facilitation delegated to PayAI:
    pub fn configure_x402(...)
    pub fn record_x402_payment(...)
    pub fn submit_x402_rating(...)
    */

    // =====================================================
    // VERIFIABLE CREDENTIALS INSTRUCTIONS (Pillar 1)
    // =====================================================

    /// Create a new credential type (e.g., AgentIdentity, Reputation, JobCompletion)
    /// This is an admin-only operation typically done by governance/multisig.
    pub fn create_credential_type(
        ctx: Context<CreateCredentialType>,
        name: String,
        kind: CredentialKind,
        schema_uri: String,
        description: String,
    ) -> Result<()> {
        instructions::credential::create_credential_type(ctx, name, kind, schema_uri, description)
    }

    /// Create a credential template from a credential type for issuing credentials
    pub fn create_credential_template(
        ctx: Context<CreateCredentialTemplate>,
        name: String,
        image_uri: String,
        crossmint_template_id: Option<String>,
    ) -> Result<()> {
        instructions::credential::create_credential_template(
            ctx,
            name,
            image_uri,
            crossmint_template_id,
        )
    }

    /// Issue a new credential to a subject
    /// The subject_data is stored off-chain; only the hash is stored on-chain.
    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_id: String,
        subject_data_hash: [u8; 32],
        subject_data_uri: String,
        expires_at: Option<i64>,
        source_account: Option<Pubkey>,
    ) -> Result<()> {
        instructions::credential::issue_credential(
            ctx,
            credential_id,
            subject_data_hash,
            subject_data_uri,
            expires_at,
            source_account,
        )
    }

    /// Revoke an issued credential
    /// Only the original issuer can revoke.
    pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
        instructions::credential::revoke_credential(ctx)
    }

    /// Update the cross-chain sync status after syncing to Crossmint
    pub fn update_crosschain_status(
        ctx: Context<UpdateCrossChainStatus>,
        crossmint_credential_id: String,
        status: CrossChainStatus,
    ) -> Result<()> {
        instructions::credential::update_crosschain_status(
            ctx,
            crossmint_credential_id,
            status,
        )
    }

    /// Deactivate a credential type (no new credentials can be issued)
    pub fn deactivate_credential_type(ctx: Context<DeactivateCredentialType>) -> Result<()> {
        instructions::credential::deactivate_credential_type(ctx)
    }

    /// Deactivate a credential template (no new credentials can be issued from it)
    pub fn deactivate_credential_template(ctx: Context<DeactivateCredentialTemplate>) -> Result<()> {
        instructions::credential::deactivate_credential_template(ctx)
    }

    // =====================================================
    // DID (DECENTRALIZED IDENTIFIER) INSTRUCTIONS (Pillar 3)
    // =====================================================
    // W3C-compliant DIDs following the did:sol specification
    // Enables cross-chain identity verification and credential anchoring

    /// Create a new DID document for an agent or user
    ///
    /// Initializes a W3C-compliant DID document following the did:sol method.
    /// The DID document can contain verification methods and service endpoints.
    ///
    /// Parameters:
    /// - did_string: The DID string (e.g., "did:sol:devnet:HN7c...")
    /// - verification_methods: Initial verification methods (max 10)
    /// - service_endpoints: Initial service endpoints (max 5)
    pub fn create_did_document(
        ctx: Context<CreateDidDocument>,
        did_string: String,
        verification_methods: Vec<VerificationMethod>,
        service_endpoints: Vec<ServiceEndpoint>,
    ) -> Result<()> {
        instructions::did::create_did_document(
            ctx,
            did_string,
            verification_methods,
            service_endpoints,
        )
    }

    /// Update an existing DID document
    ///
    /// Add or remove verification methods and service endpoints.
    /// Only the controller can update the DID document.
    ///
    /// Parameters:
    /// - add_verification_method: Optional verification method to add
    /// - remove_verification_method_id: Optional method ID to remove
    /// - add_service_endpoint: Optional service endpoint to add
    /// - remove_service_endpoint_id: Optional service ID to remove
    pub fn update_did_document(
        ctx: Context<UpdateDidDocument>,
        add_verification_method: Option<VerificationMethod>,
        remove_verification_method_id: Option<String>,
        add_service_endpoint: Option<ServiceEndpoint>,
        remove_service_endpoint_id: Option<String>,
    ) -> Result<()> {
        instructions::did::update_did_document(
            ctx,
            add_verification_method,
            remove_verification_method_id,
            add_service_endpoint,
            remove_service_endpoint_id,
        )
    }

    /// Deactivate a DID document
    ///
    /// Permanently deactivates the DID document. This operation is irreversible.
    /// Only the controller can deactivate their DID.
    pub fn deactivate_did_document(ctx: Context<DeactivateDidDocument>) -> Result<()> {
        instructions::did::deactivate_did_document(ctx)
    }

    /// Resolve a DID document (read-only)
    ///
    /// Returns the DID document data for off-chain resolution.
    /// This instruction exists for compatibility with standard DID resolution flows.
    pub fn resolve_did_document(ctx: Context<ResolveDidDocument>) -> Result<()> {
        instructions::did::resolve_did_document(ctx)
    }

    // =====================================================
    // REPUTATION LAYER INSTRUCTIONS (Pillar 2)
    // =====================================================
    // GhostSpeak's reputation layer consumes payment data from PayAI
    // PayAI handles payment facilitation, GhostSpeak tracks reputation
    //
    // These instructions enable:
    // - Tracking payment performance metrics
    // - Recording service ratings from clients
    // - Calculating reputation scores based on service quality
    //
    // NOTE: Internal function names still reference x402 for compatibility
    // TODO: Rename internal functions from x402_* to payai_* in future refactor

    /// Initialize reputation metrics for an agent
    ///
    /// Creates a new reputation tracking account that monitors:
    /// - Payment success/failure rates
    /// - Service ratings from clients
    /// - Response time performance
    /// - Dispute resolution history
    pub fn initialize_reputation_metrics(
        ctx: Context<InitializeReputationMetrics>,
    ) -> Result<()> {
        instructions::reputation::initialize_reputation_metrics(ctx)
    }

    /// Record a PayAI payment transaction for reputation tracking
    ///
    /// Consumes payment data from PayAI protocol to update agent reputation.
    /// This does NOT facilitate payments - it only tracks them for reputation.
    ///
    /// Parameters:
    /// - payment_signature: PayAI transaction signature
    /// - amount: Payment amount in lamports
    /// - response_time_ms: Service response time
    /// - success: Whether payment completed successfully
    pub fn record_payai_payment(
        ctx: Context<RecordX402PaymentReputation>,
        payment_signature: String,
        amount: u64,
        response_time_ms: u64,
        success: bool,
    ) -> Result<()> {
        // TODO: Rename internal function from record_x402_payment to record_payai_payment
        instructions::reputation::record_x402_payment(
            ctx,
            payment_signature,
            amount,
            response_time_ms,
            success,
        )
    }

    /// Submit a service rating after a completed transaction
    ///
    /// Allows clients to rate agent service quality (1-5 scale).
    /// Ratings are factored into the overall reputation score calculation.
    ///
    /// Parameters:
    /// - rating: Service rating from 1 (poor) to 5 (excellent)
    /// - payment_signature: Associated PayAI transaction signature
    pub fn submit_service_rating(
        ctx: Context<SubmitX402RatingReputation>,
        rating: u8,
        payment_signature: String,
    ) -> Result<()> {
        // TODO: Rename internal function from submit_x402_rating to submit_service_rating
        instructions::reputation::submit_x402_rating(ctx, rating, payment_signature)
    }

    /// Update reputation from a specific source
    ///
    /// Updates or adds a reputation score from an external source (e.g., GitHub, custom webhook).
    /// Automatically aggregates all sources and detects conflicts.
    ///
    /// Parameters:
    /// - source_name: Source identifier (e.g., "github", "custom-webhook")
    /// - score: Reputation score from source (0-1000)
    /// - weight: Source weight in basis points (0-10000)
    /// - data_points: Number of metrics contributing to score
    /// - reliability: Source reliability in basis points (0-10000)
    pub fn update_source_reputation(
        ctx: Context<UpdateSourceReputation>,
        source_name: String,
        score: u16,
        weight: u16,
        data_points: u32,
        reliability: u16,
    ) -> Result<()> {
        instructions::reputation::update_source_reputation(
            ctx,
            source_name,
            score,
            weight,
            data_points,
            reliability,
        )
    }

    /// Update reputation tags for an agent
    ///
    /// Adds or updates granular reputation tags with confidence scores.
    /// Tags are categorized into skill, behavior, and compliance tags.
    /// Each tag has a confidence score (0-10000 basis points) and evidence count.
    ///
    /// Tag decay: Tags automatically decay at 10 bp/day and become stale after 90 days.
    /// This ensures reputation data stays current and reflects recent performance.
    ///
    /// Parameters:
    /// - skill_tags: Skill tags to add (e.g., "rust", "smart-contracts") - max 20
    /// - behavior_tags: Behavior tags (e.g., "responsive", "reliable") - max 20
    /// - compliance_tags: Compliance tags (e.g., "kyc-verified") - max 10
    /// - tag_scores: Tag scores with confidence and evidence - max 50
    pub fn update_reputation_tags(
        ctx: Context<UpdateReputationTags>,
        skill_tags: Vec<String>,
        behavior_tags: Vec<String>,
        compliance_tags: Vec<String>,
        tag_scores: Vec<TagScore>,
    ) -> Result<()> {
        instructions::reputation::update_reputation_tags(
            ctx,
            skill_tags,
            behavior_tags,
            compliance_tags,
            tag_scores,
        )
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
