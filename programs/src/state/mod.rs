/*!
 * State Module - Data Structures and Account Definitions
 *
 * This module contains all the data structures and account definitions
 * used by the GhostSpeak Protocol smart contract.
 */

// Core modules (working)
pub mod agent;

// Additional modules
pub mod analytics;
pub mod auction;
pub mod audit;
pub mod bulk_deals;
pub mod channel;
pub mod commerce;
pub mod compliance;
pub mod dispute;
pub mod escrow;
pub mod extensions;
pub mod governance;
pub mod incentives;
pub mod marketplace;
pub mod message;
pub mod negotiation;
pub mod pricing;
pub mod protocol_structures;
pub mod replication;
pub mod reputation;
pub mod risk_management;
pub mod royalty;
pub mod security_governance;
pub mod user_registry;
pub mod work_order;

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
// Import compressed agent types
pub use crate::instructions::agent_compressed::{
    AgentTreeConfig,
    CompressedAgentMetadata,
    CompressedAgentCreatedEvent,
};
// Import from analytics with conflict resolution
pub use analytics::{
    AgentAnalytics as AnalyticsAgentAnalytics, // Rename to avoid conflict
    AnalyticsDashboard,
    MarketAnalytics,
    MarketAnalyticsData,
};
pub use auction::*;
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
};
pub use bulk_deals::*;
pub use channel::*;
// Selective imports from commerce to avoid conflicts
pub use commerce::{
    JobApplicationData as CommerceJobApplicationData,
    ServiceListingData as CommerceServiceListingData,
};
// Selective imports from compliance to avoid conflicts
pub use compliance::{
    CommunicationMethod,
    ComplianceEvidence,
    CompliancePenalty,
    ComplianceRequirement,
    ComplianceStatus as ComplianceStatusEnum,
    ContactType,
    DataPrivacyConfig,
    DocumentRequirement,
    EvidenceType,
    FinancialComplianceConfig,
    // Rename conflicting types
    ImplementationStatus as ComplianceImplementationStatus,
    JurisdictionCompliance,
    JurisdictionStatus,
    KycAmlConfig,
    KycLevel,
    License,
    LicenseStatus,
    MonitoringConfig,
    PenaltyType,
    RegulatoryCompliance,
    RegulatoryContact,
    RegulatoryFramework,
    ReportingConfig,
    RequirementType,
    SanctionsConfig,
    VerificationStatus,
};
pub use dispute::*;
pub use escrow::*;
pub use extensions::*;
pub use governance::*;
// Selective imports from incentives
pub use incentives::{AgentIncentives, IncentiveConfig, IncentiveProgram};
// Selective imports from marketplace to avoid conflicts
pub use marketplace::{
    JobApplication, JobApplicationData as MarketplaceJobApplicationData, JobCompletion,
    JobContract, JobPosting, PurchaseStatus, ServiceListing,
    ServiceListingData as MarketplaceServiceListingData, ServicePurchase,
};
pub use message::*;
pub use negotiation::*;
pub use pricing::*;
pub use replication::*;
// Skip reputation module re-export as it's empty
pub use risk_management::*;
pub use royalty::*;
// Selective imports from security_governance to avoid conflicts
pub use protocol_structures::*;
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
pub use work_order::*;

// Re-export error types from main lib
pub use crate::GhostSpeakError;

use anchor_lang::prelude::*;

// Security constants
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_GENERAL_STRING_LENGTH: usize = 256;
pub const MAX_CAPABILITIES_COUNT: usize = 5;
pub const MAX_PARTICIPANTS_COUNT: usize = 50;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (with 6 decimals)
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000; // 0.001 tokens

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
pub const MIN_BID_INCREMENT: u64 = 100;
pub const MIN_AUCTION_DURATION: i64 = 3600; // 1 hour
pub const MAX_AUCTION_DURATION: i64 = 2592000; // 30 days
pub const MAX_BIDS_PER_AUCTION_PER_USER: usize = 50;

// Common enums used across modules
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChannelType {
    Direct,
    Group,
    Public,
    Private,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Text,
    File,
    Image,
    Audio,
    System,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ApplicationStatus {
    Submitted,
    Accepted,
    Rejected,
    Withdrawn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ContractStatus {
    Active,
    Completed,
    Cancelled,
    Disputed,
}
