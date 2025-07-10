/*!
 * Security Governance Module - Role-Based Access Control and Security Policies
 * 
 * This module implements comprehensive security governance including role-based
 * access control, permission systems, security policies, and access reviews
 * for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use std::collections::BTreeMap;

// =====================================================
// ROLE-BASED ACCESS CONTROL STRUCTURES
// =====================================================

/// Role-Based Access Control (RBAC) configuration
#[account]
pub struct RbacConfig {
    /// Authority for RBAC management
    pub authority: Pubkey,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Version for compatibility
    pub version: u8,
    
    /// Role definitions
    pub roles: Vec<Role>,
    
    /// Permission definitions
    pub permissions: Vec<Permission>,
    
    /// Access policies
    pub access_policies: Vec<AccessPolicy>,
    
    /// Security policies
    pub security_policies: SecurityPolicies,
    
    /// Audit configuration
    pub audit_config: AccessAuditConfig,
    
    /// Emergency access procedures
    pub emergency_access: EmergencyAccessConfig,
    
    /// Reserved space
    pub reserved: [u8; 128],
}

/// Role definition with permissions and constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Role {
    /// Role identifier
    pub role_id: String,
    
    /// Role name
    pub name: String,
    
    /// Role description
    pub description: String,
    
    /// Role type
    pub role_type: RoleType,
    
    /// Permission assignments
    pub permissions: Vec<String>,
    
    /// Role constraints
    pub constraints: RoleConstraints,
    
    /// Inheritance relationships
    pub inherits_from: Vec<String>,
    
    /// Role metadata
    pub metadata: RoleMetadata,
    
    /// Role status
    pub status: RoleStatus,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last modification timestamp
    pub modified_at: i64,
}

/// Types of roles in the system
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoleType {
    /// System administrative roles
    Administrative,
    
    /// Operational roles for day-to-day activities
    Operational,
    
    /// Read-only roles for viewing
    ReadOnly,
    
    /// Compliance and audit roles
    Compliance,
    
    /// Emergency response roles
    Emergency,
    
    /// Custom application-specific roles
    Custom,
    
    /// Service account roles
    Service,
    
    /// Guest or temporary roles
    Guest,
}

/// Constraints applied to roles
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RoleConstraints {
    /// Time-based constraints
    pub time_constraints: Option<TimeConstraints>,
    
    /// Location-based constraints
    pub location_constraints: Option<LocationConstraints>,
    
    /// Resource-based constraints
    pub resource_constraints: Option<ResourceConstraints>,
    
    /// Session-based constraints
    pub session_constraints: Option<SessionConstraints>,
    
    /// Segregation of duties constraints
    pub sod_constraints: Vec<SodConstraint>,
    
    /// Maximum concurrent sessions
    pub max_concurrent_sessions: Option<u32>,
    
    /// Role activation requirements
    pub activation_requirements: Vec<ActivationRequirement>,
}

/// Time-based access constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TimeConstraints {
    /// Allowed hours (0-23)
    pub allowed_hours: Vec<u8>,
    
    /// Allowed days of week (1-7)
    pub allowed_days: Vec<u8>,
    
    /// Timezone for time calculations
    pub timezone: String,
    
    /// Maximum session duration (seconds)
    pub max_session_duration: Option<i64>,
    
    /// Role expiration timestamp
    pub expires_at: Option<i64>,
    
    /// Periodic reactivation required
    pub reactivation_period: Option<i64>,
}

/// Location-based access constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LocationConstraints {
    /// Allowed countries (ISO codes)
    pub allowed_countries: Vec<String>,
    
    /// Blocked countries (ISO codes)
    pub blocked_countries: Vec<String>,
    
    /// Allowed IP address ranges (CIDR)
    pub allowed_ip_ranges: Vec<String>,
    
    /// Blocked IP address ranges (CIDR)
    pub blocked_ip_ranges: Vec<String>,
    
    /// Geofencing enabled
    pub geofencing_enabled: bool,
    
    /// Allowed geographic regions
    pub allowed_regions: Vec<GeographicRegion>,
}

/// Geographic region definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GeographicRegion {
    /// Region name
    pub name: String,
    
    /// Latitude boundaries
    pub latitude_range: LatitudeRange,
    
    /// Longitude boundaries
    pub longitude_range: LongitudeRange,
    
    /// Radius for circular regions (meters)
    pub radius: Option<u32>,
}

/// Latitude range for geographic constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LatitudeRange {
    /// Minimum latitude
    pub min: f64,
    
    /// Maximum latitude
    pub max: f64,
}

/// Longitude range for geographic constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LongitudeRange {
    /// Minimum longitude
    pub min: f64,
    
    /// Maximum longitude
    pub max: f64,
}

/// Resource-based access constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ResourceConstraints {
    /// Allowed resource types
    pub allowed_resource_types: Vec<String>,
    
    /// Blocked resource types
    pub blocked_resource_types: Vec<String>,
    
    /// Resource access limits
    pub access_limits: BTreeMap<String, u64>,
    
    /// Resource quotas
    pub quotas: BTreeMap<String, ResourceQuota>,
    
    /// Compartmentalized access
    pub compartments: Vec<String>,
}

/// Resource quota definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ResourceQuota {
    /// Maximum usage
    pub max_usage: u64,
    
    /// Time period for quota (seconds)
    pub time_period: i64,
    
    /// Quota reset behavior
    pub reset_behavior: QuotaResetBehavior,
    
    /// Warning threshold
    pub warning_threshold: u8,
}

/// Quota reset behavior options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuotaResetBehavior {
    Rolling,
    Fixed,
    Manual,
    OnDemand,
}

/// Session-based access constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SessionConstraints {
    /// Maximum session duration
    pub max_session_duration: i64,
    
    /// Idle timeout
    pub idle_timeout: i64,
    
    /// Re-authentication interval
    pub reauth_interval: i64,
    
    /// Multi-factor authentication required
    pub mfa_required: bool,
    
    /// Device fingerprinting required
    pub device_fingerprinting: bool,
    
    /// Session encryption required
    pub session_encryption: bool,
}

/// Segregation of duties constraint
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SodConstraint {
    /// Constraint name
    pub name: String,
    
    /// Conflicting roles
    pub conflicting_roles: Vec<String>,
    
    /// Constraint type
    pub constraint_type: SodConstraintType,
    
    /// Enforcement level
    pub enforcement_level: EnforcementLevel,
    
    /// Exception procedures
    pub exception_procedures: Vec<String>,
}

/// Types of segregation of duties constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SodConstraintType {
    /// Static - roles cannot be assigned to same user
    Static,
    
    /// Dynamic - roles cannot be active simultaneously
    Dynamic,
    
    /// Temporal - roles cannot be used within time window
    Temporal,
    
    /// Contextual - roles conflict in specific contexts
    Contextual,
}

/// Enforcement levels for constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnforcementLevel {
    /// Hard enforcement - no exceptions
    Hard,
    
    /// Soft enforcement - warnings only
    Soft,
    
    /// Advisory - recommendations only
    Advisory,
    
    /// Exception-based - requires approval
    ExceptionBased,
}

/// Role activation requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ActivationRequirement {
    /// Requirement type
    pub requirement_type: ActivationRequirementType,
    
    /// Required approvers
    pub approvers: Vec<Pubkey>,
    
    /// Minimum approvals needed
    pub min_approvals: u8,
    
    /// Approval timeout
    pub approval_timeout: i64,
    
    /// Evidence requirements
    pub evidence_requirements: Vec<String>,
}

/// Types of role activation requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActivationRequirementType {
    ManagerApproval,
    PeerReview,
    SecurityClearance,
    BackgroundCheck,
    TrainingCompletion,
    CertificationRequired,
    BusinessJustification,
    TechnicalAssessment,
}

/// Role metadata for additional information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RoleMetadata {
    /// Business purpose
    pub business_purpose: String,
    
    /// Risk level
    pub risk_level: RiskLevel,
    
    /// Data access level
    pub data_access_level: DataAccessLevel,
    
    /// Compliance requirements
    pub compliance_requirements: Vec<String>,
    
    /// Role owner
    pub role_owner: Option<Pubkey>,
    
    /// Role custodian
    pub role_custodian: Option<Pubkey>,
    
    /// Review frequency
    pub review_frequency: i64,
    
    /// Last review timestamp
    pub last_review: Option<i64>,
    
    /// Next review due
    pub next_review: Option<i64>,
}

/// Risk levels for roles
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Data access levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DataAccessLevel {
    Public,
    Internal,
    Confidential,
    Restricted,
    TopSecret,
}

/// Role status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoleStatus {
    Active,
    Inactive,
    Deprecated,
    UnderReview,
    Suspended,
}

/// Permission definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Permission {
    /// Permission identifier
    pub permission_id: String,
    
    /// Permission name
    pub name: String,
    
    /// Permission description
    pub description: String,
    
    /// Resource type this permission applies to
    pub resource_type: String,
    
    /// Actions allowed by this permission
    pub actions: Vec<Action>,
    
    /// Permission scope
    pub scope: PermissionScope,
    
    /// Permission constraints
    pub constraints: Vec<PermissionConstraint>,
    
    /// Permission metadata
    pub metadata: PermissionMetadata,
}

/// Actions that can be performed
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Action {
    /// Action name
    pub name: String,
    
    /// Action type
    pub action_type: ActionType,
    
    /// Action parameters
    pub parameters: BTreeMap<String, String>,
    
    /// Action constraints
    pub constraints: Vec<ActionConstraint>,
}

/// Types of actions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActionType {
    Create,
    Read,
    Update,
    Delete,
    Execute,
    Approve,
    Reject,
    Transfer,
    Lock,
    Unlock,
    Freeze,
    Unfreeze,
    Audit,
    Monitor,
    Configure,
    Deploy,
    Custom,
}

/// Permission scope definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PermissionScope {
    /// Scope type
    pub scope_type: ScopeType,
    
    /// Scope boundaries
    pub boundaries: ScopeBoundaries,
    
    /// Hierarchical scope
    pub hierarchical: bool,
    
    /// Inherited permissions
    pub inherited: bool,
}

/// Types of permission scopes
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScopeType {
    Global,
    Organization,
    Department,
    Project,
    Resource,
    Individual,
}

/// Scope boundaries definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScopeBoundaries {
    /// Included resources
    pub included_resources: Vec<String>,
    
    /// Excluded resources
    pub excluded_resources: Vec<String>,
    
    /// Resource patterns (regex)
    pub resource_patterns: Vec<String>,
    
    /// Hierarchical boundaries
    pub hierarchical_boundaries: Vec<HierarchicalBoundary>,
}

/// Hierarchical boundary definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct HierarchicalBoundary {
    /// Boundary level
    pub level: String,
    
    /// Boundary value
    pub value: String,
    
    /// Include descendants
    pub include_descendants: bool,
}

/// Permission constraint
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PermissionConstraint {
    /// Constraint type
    pub constraint_type: PermissionConstraintType,
    
    /// Constraint conditions
    pub conditions: Vec<ConstraintCondition>,
    
    /// Constraint enforcement
    pub enforcement: EnforcementLevel,
}

/// Types of permission constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PermissionConstraintType {
    Temporal,
    Contextual,
    Conditional,
    ResourceBased,
    AttributeBased,
    RiskBased,
}

/// Constraint condition definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConstraintCondition {
    /// Attribute name
    pub attribute: String,
    
    /// Condition operator
    pub operator: ConstraintOperator,
    
    /// Expected value
    pub value: String,
    
    /// Value type
    pub value_type: ValueType,
}

/// Operators for constraint conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConstraintOperator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    Contains,
    NotContains,
    In,
    NotIn,
    Matches,
    NotMatches,
}

/// Value types for constraint conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValueType {
    String,
    Number,
    Boolean,
    Date,
    Time,
    Duration,
    List,
    Object,
}

/// Action constraints
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ActionConstraint {
    /// Constraint name
    pub name: String,
    
    /// Pre-conditions
    pub pre_conditions: Vec<ConstraintCondition>,
    
    /// Post-conditions
    pub post_conditions: Vec<ConstraintCondition>,
    
    /// Required approvals
    pub required_approvals: Vec<ApprovalRequirement>,
    
    /// Audit requirements
    pub audit_requirements: Vec<AuditRequirement>,
}

/// Approval requirement for actions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ApprovalRequirement {
    /// Approval type
    pub approval_type: ApprovalType,
    
    /// Required approvers
    pub approvers: Vec<Pubkey>,
    
    /// Minimum approvals
    pub min_approvals: u8,
    
    /// Approval timeout
    pub timeout: i64,
    
    /// Escalation procedures
    pub escalation: Vec<EscalationStep>,
}

/// Types of approvals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApprovalType {
    Managerial,
    Peer,
    Technical,
    Legal,
    Compliance,
    Security,
    Financial,
    Executive,
}

/// Escalation step definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EscalationStep {
    /// Step number
    pub step: u8,
    
    /// Trigger condition
    pub trigger: EscalationTrigger,
    
    /// Target approvers
    pub target_approvers: Vec<Pubkey>,
    
    /// Escalation timeout
    pub timeout: i64,
    
    /// Notification method
    pub notification_method: NotificationMethod,
}

/// Escalation triggers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EscalationTrigger {
    Timeout,
    Rejection,
    Unavailable,
    HighRisk,
    LargeAmount,
    SensitiveData,
}

/// Notification methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationMethod {
    OnChain,
    Email,
    Sms,
    Push,
    InApp,
    All,
}

/// Audit requirements for actions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AuditRequirement {
    /// Audit level
    pub audit_level: AuditLevel,
    
    /// Required audit trail elements
    pub required_elements: Vec<AuditElement>,
    
    /// Retention period
    pub retention_period: i64,
    
    /// Real-time monitoring
    pub real_time_monitoring: bool,
}

/// Audit levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuditLevel {
    None,
    Basic,
    Detailed,
    Comprehensive,
    Forensic,
}

/// Audit trail elements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuditElement {
    Timestamp,
    Actor,
    Action,
    Resource,
    Context,
    Result,
    Evidence,
    Justification,
}

/// Permission metadata
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PermissionMetadata {
    /// Business justification
    pub business_justification: String,
    
    /// Risk assessment
    pub risk_assessment: RiskAssessment,
    
    /// Compliance mapping
    pub compliance_mapping: Vec<String>,
    
    /// Related permissions
    pub related_permissions: Vec<String>,
    
    /// Permission owner
    pub owner: Option<Pubkey>,
    
    /// Last review
    pub last_review: Option<i64>,
    
    /// Review frequency
    pub review_frequency: i64,
}

/// Risk assessment for permissions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskAssessment {
    /// Overall risk score
    pub risk_score: u8,
    
    /// Risk factors
    pub risk_factors: Vec<RiskFactor>,
    
    /// Mitigation measures
    pub mitigation_measures: Vec<String>,
    
    /// Risk acceptance
    pub risk_acceptance: RiskAcceptance,
}

/// Individual risk factor
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskFactor {
    /// Factor name
    pub name: String,
    
    /// Factor category
    pub category: RiskCategory,
    
    /// Impact score
    pub impact: u8,
    
    /// Likelihood score
    pub likelihood: u8,
    
    /// Risk score
    pub risk_score: u8,
}

/// Risk categories
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskCategory {
    Operational,
    Financial,
    Compliance,
    Security,
    Reputational,
    Technical,
    Legal,
}

/// Risk acceptance status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskAcceptance {
    /// Risk accepted
    pub accepted: bool,
    
    /// Accepting authority
    pub accepting_authority: Option<Pubkey>,
    
    /// Acceptance date
    pub acceptance_date: Option<i64>,
    
    /// Acceptance reasoning
    pub reasoning: Option<String>,
    
    /// Review date
    pub review_date: Option<i64>,
}

// =====================================================
// ACCESS POLICY STRUCTURES
// =====================================================

/// Access policy definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AccessPolicy {
    /// Policy identifier
    pub policy_id: String,
    
    /// Policy name
    pub name: String,
    
    /// Policy description
    pub description: String,
    
    /// Policy type
    pub policy_type: PolicyType,
    
    /// Policy rules
    pub rules: Vec<PolicyRule>,
    
    /// Policy scope
    pub scope: PolicyScope,
    
    /// Policy priority
    pub priority: u8,
    
    /// Policy status
    pub status: PolicyStatus,
    
    /// Effective date
    pub effective_date: i64,
    
    /// Expiration date
    pub expiration_date: Option<i64>,
    
    /// Policy metadata
    pub metadata: PolicyMetadata,
}

/// Types of access policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyType {
    Allow,
    Deny,
    Conditional,
    Delegated,
    Temporary,
    Emergency,
}

/// Policy rule definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PolicyRule {
    /// Rule identifier
    pub rule_id: String,
    
    /// Rule conditions
    pub conditions: Vec<RuleCondition>,
    
    /// Rule effect
    pub effect: RuleEffect,
    
    /// Rule priority
    pub priority: u8,
    
    /// Rule enabled
    pub enabled: bool,
}

/// Rule condition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RuleCondition {
    /// Condition type
    pub condition_type: ConditionType,
    
    /// Subject attributes
    pub subject_attributes: BTreeMap<String, String>,
    
    /// Resource attributes
    pub resource_attributes: BTreeMap<String, String>,
    
    /// Action attributes
    pub action_attributes: BTreeMap<String, String>,
    
    /// Environment attributes
    pub environment_attributes: BTreeMap<String, String>,
}

/// Types of rule conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConditionType {
    AttributeBased,
    RoleBased,
    TimeBased,
    LocationBased,
    RiskBased,
    ContextBased,
}

/// Rule effects
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RuleEffect {
    Allow,
    Deny,
    AuditOnly,
    RequireApproval,
    RequireMfa,
    RequireJustification,
}

/// Policy scope
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PolicyScope {
    /// Applicable subjects
    pub subjects: Vec<String>,
    
    /// Applicable resources
    pub resources: Vec<String>,
    
    /// Applicable actions
    pub actions: Vec<String>,
    
    /// Scope inheritance
    pub inheritance: ScopeInheritance,
}

/// Scope inheritance options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScopeInheritance {
    None,
    Hierarchical,
    Delegated,
    Inherited,
}

/// Policy status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyStatus {
    Active,
    Inactive,
    Draft,
    UnderReview,
    Deprecated,
    Suspended,
}

/// Policy metadata
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PolicyMetadata {
    /// Policy author
    pub author: Option<Pubkey>,
    
    /// Policy approver
    pub approver: Option<Pubkey>,
    
    /// Approval date
    pub approval_date: Option<i64>,
    
    /// Business justification
    pub business_justification: String,
    
    /// Compliance references
    pub compliance_references: Vec<String>,
    
    /// Risk assessment
    pub risk_assessment: Option<String>,
    
    /// Review schedule
    pub review_schedule: ReviewSchedule,
}

/// Review schedule for policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReviewSchedule {
    /// Review frequency
    pub frequency: i64,
    
    /// Last review date
    pub last_review: Option<i64>,
    
    /// Next review date
    pub next_review: i64,
    
    /// Review owners
    pub review_owners: Vec<Pubkey>,
    
    /// Review criteria
    pub review_criteria: Vec<String>,
}

// =====================================================
// SECURITY POLICIES STRUCTURES
// =====================================================

/// Comprehensive security policies configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SecurityPolicies {
    /// Authentication policies
    pub authentication: AuthenticationPolicies,
    
    /// Authorization policies
    pub authorization: AuthorizationPolicies,
    
    /// Password policies
    pub password: PasswordPolicies,
    
    /// Session policies
    pub session: SessionPolicies,
    
    /// Data protection policies
    pub data_protection: DataProtectionPolicies,
    
    /// Network security policies
    pub network_security: NetworkSecurityPolicies,
    
    /// Incident response policies
    pub incident_response: IncidentResponsePolicies,
    
    /// Compliance policies
    pub compliance: CompliancePolicies,
}

/// Authentication policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AuthenticationPolicies {
    /// Multi-factor authentication required
    pub mfa_required: bool,
    
    /// Supported authentication methods
    pub supported_methods: Vec<AuthenticationMethod>,
    
    /// Authentication strength requirements
    pub strength_requirements: AuthenticationStrength,
    
    /// Account lockout policies
    pub lockout_policies: AccountLockoutPolicies,
    
    /// Biometric policies
    pub biometric_policies: Option<BiometricPolicies>,
}

/// Authentication methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuthenticationMethod {
    Password,
    DigitalSignature,
    Biometric,
    Token,
    Certificate,
    Sms,
    Email,
    App,
    Hardware,
}

/// Authentication strength requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AuthenticationStrength {
    /// Minimum authentication level
    pub minimum_level: AuthenticationLevel,
    
    /// Risk-based authentication
    pub risk_based: bool,
    
    /// Adaptive authentication
    pub adaptive: bool,
    
    /// Step-up authentication triggers
    pub step_up_triggers: Vec<StepUpTrigger>,
}

/// Authentication levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuthenticationLevel {
    Low,
    Medium,
    High,
    VeryHigh,
}

/// Triggers for step-up authentication
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum StepUpTrigger {
    HighRiskAction,
    SensitiveData,
    LargeTransaction,
    NewDevice,
    UnusualLocation,
    TimeBasedRisk,
    BehaviorAnomaly,
}

/// Account lockout policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AccountLockoutPolicies {
    /// Max failed attempts before lockout
    pub max_failed_attempts: u8,
    
    /// Lockout duration
    pub lockout_duration: i64,
    
    /// Progressive lockout enabled
    pub progressive_lockout: bool,
    
    /// Unlock methods
    pub unlock_methods: Vec<UnlockMethod>,
    
    /// Notification requirements
    pub notification_requirements: Vec<NotificationRequirement>,
}

/// Methods to unlock accounts
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum UnlockMethod {
    TimeBasedAutoUnlock,
    AdminUnlock,
    SelfServiceUnlock,
    MultiFactorUnlock,
    SupervisorUnlock,
}

/// Notification requirements for security events
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct NotificationRequirement {
    /// Event type
    pub event_type: SecurityEventType,
    
    /// Notification targets
    pub targets: Vec<NotificationTarget>,
    
    /// Notification method
    pub method: NotificationMethod,
    
    /// Notification timing
    pub timing: NotificationTiming,
}

/// Types of security events
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SecurityEventType {
    AccountLockout,
    PasswordChange,
    PrivilegeEscalation,
    SuspiciousActivity,
    PolicyViolation,
    AccessDenied,
    DataBreach,
    SystemCompromise,
}

/// Notification targets
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct NotificationTarget {
    /// Target type
    pub target_type: NotificationTargetType,
    
    /// Target identifier
    pub target_id: String,
    
    /// Notification priority
    pub priority: NotificationPriority,
}

/// Types of notification targets
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationTargetType {
    User,
    Administrator,
    SecurityTeam,
    ComplianceTeam,
    Manager,
    AuditTeam,
    ExternalSystem,
}

/// Notification priorities
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationPriority {
    Low,
    Medium,
    High,
    Critical,
    Emergency,
}

/// Notification timing
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationTiming {
    Immediate,
    Delayed,
    Batched,
    Scheduled,
}

/// Biometric authentication policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BiometricPolicies {
    /// Supported biometric types
    pub supported_types: Vec<BiometricType>,
    
    /// Biometric quality requirements
    pub quality_requirements: BiometricQuality,
    
    /// Liveness detection required
    pub liveness_detection: bool,
    
    /// Biometric template protection
    pub template_protection: BiometricProtection,
}

/// Types of biometric authentication
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum BiometricType {
    Fingerprint,
    FaceRecognition,
    IrisRecognition,
    VoiceRecognition,
    Signature,
    Gait,
    Behavioral,
}

/// Biometric quality requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BiometricQuality {
    /// Minimum quality score
    pub minimum_quality: u8,
    
    /// Quality assessment method
    pub assessment_method: String,
    
    /// Multiple samples required
    pub multiple_samples: bool,
    
    /// Quality thresholds
    pub quality_thresholds: BTreeMap<String, u8>,
}

/// Biometric template protection
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BiometricProtection {
    /// Template encryption required
    pub encryption_required: bool,
    
    /// Template storage method
    pub storage_method: BiometricStorageMethod,
    
    /// Template revocation support
    pub revocation_support: bool,
    
    /// Template aging policies
    pub aging_policies: Vec<AgingPolicy>,
}

/// Biometric template storage methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum BiometricStorageMethod {
    OnDevice,
    Encrypted,
    Hashed,
    Distributed,
    None,
}

/// Template aging policies
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AgingPolicy {
    /// Biometric type
    pub biometric_type: BiometricType,
    
    /// Maximum age
    pub max_age: i64,
    
    /// Refresh requirements
    pub refresh_requirements: Vec<String>,
    
    /// Degradation handling
    pub degradation_handling: DegradationHandling,
}

/// Handling of template degradation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DegradationHandling {
    RequireRefresh,
    GradualDegradation,
    ImmediateExpiry,
    AdaptiveThreshold,
}

// =====================================================
// SPACE CALCULATION STUBS
// =====================================================

// Due to the complexity and interconnected nature of these structures,
// providing exact space calculations would require careful analysis.
// These are conservative estimates for the account space requirements.

impl RbacConfig {
    pub const fn space() -> usize {
        8 + // discriminator
        32 + // authority
        8 + // created_at
        8 + // updated_at
        1 + // version
        4 + (100 * 2048) + // roles (estimated)
        4 + (200 * 1024) + // permissions (estimated)
        4 + (50 * 1024) + // access_policies (estimated)
        4096 + // security_policies (estimated)
        1024 + // audit_config (estimated)
        1024 + // emergency_access (estimated)
        128 // reserved
    }
}

// Additional type definitions for remaining structures
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AuthorizationPolicies {
    pub default_deny: bool,
    pub explicit_permissions_required: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PasswordPolicies {
    pub minimum_length: u8,
    pub complexity_requirements: Vec<String>,
    pub history_count: u8,
    pub max_age: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SessionPolicies {
    pub max_session_duration: i64,
    pub idle_timeout: i64,
    pub concurrent_sessions: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataProtectionPolicies {
    pub encryption_required: bool,
    pub classification_required: bool,
    pub dlp_enabled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct NetworkSecurityPolicies {
    pub firewall_required: bool,
    pub intrusion_detection: bool,
    pub traffic_monitoring: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct IncidentResponsePolicies {
    pub response_team: Vec<Pubkey>,
    pub escalation_procedures: Vec<String>,
    pub notification_requirements: Vec<NotificationRequirement>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompliancePolicies {
    pub frameworks: Vec<String>,
    pub audit_requirements: Vec<String>,
    pub reporting_requirements: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AccessAuditConfig {
    pub audit_enabled: bool,
    pub real_time_monitoring: bool,
    pub retention_period: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EmergencyAccessConfig {
    pub break_glass_enabled: bool,
    pub emergency_contacts: Vec<Pubkey>,
    pub approval_required: bool,
}

// =====================================================
// CONSTANTS
// =====================================================

/// Maximum number of roles
pub const MAX_ROLES: usize = 100;

/// Maximum number of permissions
pub const MAX_PERMISSIONS: usize = 200;

/// Maximum number of access policies
pub const MAX_ACCESS_POLICIES: usize = 50;

/// Maximum role name length
pub const MAX_ROLE_NAME_LENGTH: usize = 64;

/// Maximum permission name length
pub const MAX_PERMISSION_NAME_LENGTH: usize = 64;

/// Maximum policy name length
pub const MAX_POLICY_NAME_LENGTH: usize = 64;