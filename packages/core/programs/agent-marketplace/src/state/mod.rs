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
pub mod replication;
pub mod reputation;
pub mod risk_management;
pub mod royalty;
pub mod security_governance;
pub mod protocol_structures;
pub mod work_order;
pub mod user_registry;

// Re-export all types with selective imports to avoid conflicts
// Import from agent with conflict resolution
pub use agent::{
    Agent, AgentVerification, 
    AgentVerificationData, AgentServiceData, AgentCustomization,
    AgentAnalytics as AgentAgentAnalytics  // Rename to avoid conflict
};
// Import from analytics with conflict resolution
pub use analytics::{
    MarketAnalytics, MarketAnalyticsData, AnalyticsDashboard,
    AgentAnalytics as AnalyticsAgentAnalytics  // Rename to avoid conflict
};
pub use auction::*;
// Selective imports from audit to avoid conflicts
pub use audit::{
    AuditTrail, AuditEntry, AuditAction, AuditContext, ComplianceFlags,
    AuditConfig, BackupFrequency, ApprovalLevel,
    ComplianceViolation, ViolationType, ViolationSeverity, ResolutionStatus,
    RegulatoryStatus, RiskThresholds, ComplianceReport, ReportType,
    ReportData, ReportSummary, ReportEntry, ComplianceMetrics,
    ReportStatus, SubmissionDetails,
    // Rename conflicting types
    ReportingFrequency as AuditReportingFrequency,
    ComplianceStatus as AuditComplianceStatus,
    RiskAssessment as AuditRiskAssessment,
    RiskFactor as AuditRiskFactor,
    RiskFactorType as AuditRiskFactorType,
    RiskIndicator as AuditRiskIndicator,
    TrendDirection as AuditTrendDirection,
};
pub use bulk_deals::*;
pub use channel::*;
// Selective imports from commerce to avoid conflicts
pub use commerce::{
    ServiceListingData as CommerceServiceListingData,
    JobApplicationData as CommerceJobApplicationData,
};
// Selective imports from compliance to avoid conflicts  
pub use compliance::{
    RegulatoryCompliance, JurisdictionCompliance, RegulatoryFramework,
    License, LicenseStatus, ComplianceRequirement, RequirementType,
    ComplianceEvidence, EvidenceType, VerificationStatus,
    CompliancePenalty, PenaltyType, RegulatoryContact, ContactType,
    CommunicationMethod, JurisdictionStatus, KycAmlConfig, KycLevel,
    DocumentRequirement, DataPrivacyConfig, SanctionsConfig, 
    FinancialComplianceConfig, ReportingConfig, MonitoringConfig,
    // Rename conflicting types
    ImplementationStatus as ComplianceImplementationStatus,
    ComplianceStatus as ComplianceStatusEnum,
};
pub use dispute::*;
pub use escrow::*;
pub use extensions::*;
pub use governance::*;
// Selective imports from incentives
pub use incentives::{
    IncentiveConfig, IncentiveProgram, AgentIncentives
};
// Selective imports from marketplace to avoid conflicts
pub use marketplace::{
    PurchaseStatus, ServiceListing, ServicePurchase, JobPosting, 
    JobApplication, JobContract, JobCompletion,
    ServiceListingData as MarketplaceServiceListingData,
    JobApplicationData as MarketplaceJobApplicationData,
    ServiceListingCreatedEvent, ServicePurchasedEvent, 
    JobPostingCreatedEvent, JobApplicationSubmittedEvent, JobApplicationAcceptedEvent,
};
pub use message::*;
pub use negotiation::*;
pub use pricing::*;
pub use replication::*;
// Skip reputation module re-export as it's empty
pub use risk_management::*;
pub use royalty::*;
// Selective imports from security_governance to avoid conflicts
pub use security_governance::{
    RbacConfig, Role, RoleType, RoleConstraints, TimeConstraints, LocationConstraints,
    GeographicRegion, LatitudeRange, LongitudeRange, ResourceConstraints, ResourceQuota,
    QuotaResetBehavior, SessionConstraints, SodConstraint, SodConstraintType, EnforcementLevel,
    ActivationRequirement, ActivationRequirementType, RoleMetadata, RiskLevel, DataAccessLevel,
    RoleStatus, Permission, Action, ActionType, PermissionScope, ScopeType, ScopeBoundaries,
    HierarchicalBoundary, PermissionConstraint, PermissionConstraintType, ConstraintCondition,
    ConstraintOperator, ValueType, ActionConstraint, ApprovalRequirement, ApprovalType,
    EscalationStep, EscalationTrigger, NotificationMethod, AuditRequirement, AuditLevel,
    AuditElement, PermissionMetadata, RiskFactor, RiskCategory, RiskAcceptance,
    AccessPolicy, PolicyType, PolicyRule, RuleCondition, ConditionType, RuleEffect,
    PolicyScope, ScopeInheritance, PolicyStatus, PolicyMetadata, ReviewSchedule,
    SecurityPolicies, AuthenticationPolicies, AuthenticationMethod, AuthenticationStrength,
    AuthenticationLevel, StepUpTrigger, AccountLockoutPolicies, UnlockMethod,
    NotificationRequirement, SecurityEventType, NotificationTarget, NotificationTargetType,
    NotificationPriority, NotificationTiming, BiometricPolicies, BiometricType,
    BiometricQuality, BiometricProtection, BiometricStorageMethod, AgingPolicy,
    DegradationHandling, AuthorizationPolicies, PasswordPolicies, SessionPolicies,
    DataProtectionPolicies, NetworkSecurityPolicies, IncidentResponsePolicies,
    CompliancePolicies, AccessAuditConfig, EmergencyAccessConfig,
    RiskAssessment as SecurityRiskAssessment,
};
pub use protocol_structures::*;
pub use work_order::*;
pub use user_registry::*;

// Re-export error types from main lib
pub use crate::GhostSpeakError;

use anchor_lang::prelude::*;

// Security constants
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