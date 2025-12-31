/*!
 * State Module - Data Structures and Account Definitions
 *
 * This module contains all the data structures and account definitions
 * used by the GhostSpeak Protocol smart contract.
 */

// Core modules
pub mod agent;
pub mod audit;
pub mod credential;
pub mod did; // W3C-compliant decentralized identifiers (did:sol)
pub mod agent_auth; // Trustless agent pre-authorization system
pub mod ghost_protect; // B2C escrow with dispute resolution
pub mod governance; // Multisig and governance structures
pub mod marketplace; // Service listings and job postings
pub mod privacy; // Privacy-preserving reputation
pub mod protocol_config; // Global protocol configuration
pub mod reputation; // Multi-source reputation aggregation
pub mod reputation_nft; // Reputation NFT badges
pub mod security_governance; // RBAC and security policies
pub mod staking; // GHOST token staking for reputation boost
pub mod user_registry; // User and agent registry

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
// Compressed agent types
pub use crate::instructions::agent_compressed::{
    AgentTreeConfig, CompressedAgentCreatedEvent, CompressedAgentMetadata,
};
// Staking types
pub use staking::{
    AccessTier, GhostSlashedEvent, GhostStakedEvent, GhostUnstakedEvent, SlashReason,
    StakingAccount, StakingConfig, TierUpdatedEvent,
};
// Import Ghost Protect escrow types
pub use ghost_protect::{
    ArbitratorDecision, DeliverySubmittedEvent, DisputeFiledEvent, DisputeResolvedEvent,
    EscrowCompletedEvent, EscrowCreatedEvent, EscrowStatus, GhostProtectEscrow,
};
// Audit module types
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
};
// Credential and DID modules
pub use credential::*;
pub use did::*;
// Governance and multisig
pub use governance::*;
// Protocol configuration
pub use protocol_config::*;
// Reputation types
pub use reputation::{ReputationMetrics, TagScore};
// Security and governance types
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
// User registry
pub use user_registry::*;

// Advanced feature modules
pub use marketplace::*;
pub use reputation_nft::*;
pub use privacy::*;
pub use agent_auth::*;

// Re-export error types from main lib
pub use crate::GhostSpeakError;

// Security constants
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_GENERAL_STRING_LENGTH: usize = 128;
pub const MAX_CAPABILITIES_COUNT: usize = 5;
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens
