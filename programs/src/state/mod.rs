/*!
 * State Module - Data Structures and Account Definitions
 *
 * This module contains all the data structures and account definitions
 * used by the GhostSpeak Protocol smart contract.
 */

// Core modules (working)
pub mod agent;
// pub mod b2b_billing; // Commented out until implemented

// Advanced features (2025)
pub mod marketplace;
pub mod reputation_nft;
pub mod privacy;
pub mod erc8004;

// Additional modules
// pub mod analytics; // Removed
pub mod audit;
pub mod did; // Decentralized identifiers (did:sol)
// pub mod bulk_deals; // Removed
// pub mod channel; // Removed
// pub mod commerce; // Removed
// pub mod compliance; // REMOVED: Unused - saves ~2100 lines
pub mod credential;
// pub mod dispute; // Removed
// pub mod escrow; // Removed
pub mod ghost_protect;
// pub mod extensions; // Removed
pub mod governance; // Contains multisig types - pending extraction to separate module
// pub mod incentives; // Removed - payment-based incentives delegated to PayAI
// pub mod marketplace; // Removed
// pub mod message; // Removed
// pub mod negotiation; // Removed
// pub mod pricing; // Removed
pub mod protocol_config;
// pub mod protocol_structures; // REMOVED - messaging state not needed
// pub mod replication; // Removed
pub mod reputation;
// pub mod revenue_pool; // Commented out until implemented
// pub mod risk_management; // REMOVED: Unused - saves ~1950 lines
// pub mod royalty; // Removed
pub mod security_governance;
pub mod staking;
pub mod user_registry;
// pub mod work_order; // Removed

// Re-export all types with selective imports to avoid conflicts
// Import from agent with conflict resolution
pub use agent::{
    Agent,
    AgentAnalytics as AgentAgentAnalytics, // Rename to avoid conflict
    AgentCustomization,
    AgentServiceData,
    AgentVerification,
    AgentVerificationData,
};
// Import B2B billing types - commented out until implemented
// pub use b2b_billing::{
//     FundsDeposited, FundsWithdrawn, LowBalanceAlert, SubscriptionTier, TeamAccountCreated,
//     TeamBillingAccount, TierUpdated, UsageDeducted, UsageRecord,
// };
// Import compressed agent types
pub use crate::instructions::agent_compressed::{
    AgentTreeConfig, CompressedAgentCreatedEvent, CompressedAgentMetadata,
};
// Import staking types
pub use staking::{
    AccessTier, GhostSlashedEvent, GhostStakedEvent, GhostUnstakedEvent, SlashReason,
    StakingAccount, StakingConfig, TierUpdatedEvent,
};
// Import revenue pool types - commented out until implemented
// pub use revenue_pool::{
//     RevenueDistributed, RevenuePool, RevenuePoolUpdated, RevenueSource, RewardsClaimed,
//     UserRewards, UserWeightedStakeUpdated,
// };
// Import Ghost Protect escrow types
pub use ghost_protect::{
    ArbitratorDecision, DeliverySubmittedEvent, DisputeFiledEvent, DisputeResolvedEvent,
    EscrowCompletedEvent, EscrowCreatedEvent, EscrowStatus, GhostProtectEscrow,
};
// Analytics re-exports removed
// pub use auction::*; // Removed
// Selective imports from audit to avoid conflicts
pub use audit::{
    ApprovalLevel,
    AuditAction,
    AuditConfig,
    AuditContext,
    AuditEntry,
    AuditTrail,
    BackupFrequency,
    ComplianceFlags,
    ComplianceMetrics,
    ComplianceReport,
    ComplianceStatus as AuditComplianceStatus,
    ComplianceViolation,
    RegulatoryStatus,
    ReportData,
    ReportEntry,
    ReportStatus,
    ReportSummary,
    ReportType,
    // Rename conflicting types
    ReportingFrequency as AuditReportingFrequency,
    ResolutionStatus,
    RiskAssessment as AuditRiskAssessment,
    RiskFactor as AuditRiskFactor,
    RiskFactorType as AuditRiskFactorType,
    RiskIndicator as AuditRiskIndicator,
    RiskThresholds,
    SubmissionDetails,
    TrendDirection as AuditTrendDirection,
    ViolationSeverity,
    ViolationType,
    // WorkOrder, // REMOVED: Deleted state struct
};
// pub use bulk_deals::*; // Removed
// pub use channel::*; // Removed
// Commerce re-exports removed
// REMOVED: compliance module exports - unused, saves ~2100 lines
// pub use dispute::*; // Removed
// pub use escrow::*; // Removed
// Extensions re-exports removed
pub use governance::*; // Multisig types needed - pending extraction to separate module
// Incentives removed - payment-based incentives delegated to PayAI
// pub use incentives::{AgentIncentives, IncentiveConfig, IncentiveProgram};
// Selective imports from marketplace to avoid conflicts
pub use credential::*;
// DID module exports
pub use did::*;
// pub use marketplace::{ // Removed
//     JobApplication, JobApplicationData as MarketplaceJobApplicationData, JobCompletion,
//     JobContract, JobPosting, PurchaseStatus, ServiceListing,
//     ServiceListingData as MarketplaceServiceListingData, ServicePurchase,
// };
// pub use message::*; // Removed
// pub use negotiation::*; // Removed
// Pricing and Replication re-exports removed
pub use reputation::{ReputationMetrics, TagScore};
// REMOVED: risk_management exports - unused, saves ~1950 lines
// Royalty re-exports removed
// Selective imports from security_governance to avoid conflicts
pub use protocol_config::*;
// pub use protocol_structures::*; // REMOVED - messaging state not needed
pub use security_governance::{
    AccessAuditConfig, AccessPolicy, AccountLockoutPolicies, Action, ActionConstraint, ActionType,
    ActivationRequirement, ActivationRequirementType, AgingPolicy, ApprovalRequirement,
    ApprovalType, AuditElement, AuditLevel, AuditRequirement, AuthenticationLevel,
    AuthenticationMethod, AuthenticationPolicies, AuthenticationStrength, AuthorizationPolicies,
    BiometricPolicies, BiometricProtection, BiometricQuality, BiometricStorageMethod,
    BiometricType, CompliancePolicies, ConditionType, ConstraintCondition, ConstraintOperator,
    DataAccessLevel, DataProtectionPolicies, DegradationHandling, EmergencyAccessConfig,
    EnforcementLevel, EscalationStep, EscalationTrigger, GeographicRegion, HierarchicalBoundary,
    IncidentResponsePolicies, LatitudeRange, LocationConstraints, LongitudeRange,
    NetworkSecurityPolicies, NotificationMethod, NotificationPriority, NotificationRequirement,
    NotificationTarget, NotificationTargetType, NotificationTiming, PasswordPolicies, Permission,
    PermissionConstraint, PermissionConstraintType, PermissionMetadata, PermissionScope,
    PolicyMetadata, PolicyRule, PolicyScope, PolicyStatus, PolicyType, QuotaResetBehavior,
    RbacConfig, ResourceConstraints, ResourceQuota, ReviewSchedule, RiskAcceptance,
    RiskAssessment as SecurityRiskAssessment, RiskCategory, RiskFactor, RiskLevel, Role,
    RoleConstraints, RoleMetadata, RoleStatus, RoleType, RuleCondition, RuleEffect,
    ScopeBoundaries, ScopeInheritance, ScopeType, SecurityEventType, SecurityPolicies,
    SessionConstraints, SessionPolicies, SodConstraint, SodConstraintType, StepUpTrigger,
    TimeConstraints, UnlockMethod, ValueType,
};
pub use user_registry::*;
// pub use work_order::*; // Removed

// Re-export error types from main lib
pub use crate::GhostSpeakError;

// Security constants
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_GENERAL_STRING_LENGTH: usize = 128; // Reduced from 256 to prevent memory allocation issues
pub const MAX_CAPABILITIES_COUNT: usize = 5; // Reduced from 20 to prevent memory allocation issues
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

// Export new advanced feature modules
pub use marketplace::*;
pub use reputation_nft::*;
pub use privacy::*;
pub use erc8004::*;

// Legacy constants removed

// Legacy enums removed
