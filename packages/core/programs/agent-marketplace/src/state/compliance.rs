/*!
 * Compliance Module - Regulatory Compliance and Data Governance
 * 
 * This module implements comprehensive regulatory compliance tools,
 * privacy controls, data governance, and compliance reporting for
 * the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use std::collections::BTreeMap;

// =====================================================
// REGULATORY COMPLIANCE STRUCTURES
// =====================================================

/// Comprehensive regulatory compliance configuration
#[account]
pub struct RegulatoryCompliance {
    /// Compliance authority
    pub authority: Pubkey,
    
    /// Compliance officer
    pub compliance_officer: Pubkey,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Version for compatibility
    pub version: u8,
    
    /// Jurisdiction-specific compliance
    pub jurisdictions: Vec<JurisdictionCompliance>,
    
    /// KYC/AML requirements
    pub kyc_aml_config: KycAmlConfig,
    
    /// Data privacy configuration
    pub data_privacy: DataPrivacyConfig,
    
    /// Sanctions screening
    pub sanctions_screening: SanctionsConfig,
    
    /// Financial compliance
    pub financial_compliance: FinancialComplianceConfig,
    
    /// Reporting requirements
    pub reporting_requirements: ReportingConfig,
    
    /// Compliance monitoring
    pub monitoring_config: MonitoringConfig,
    
    /// Reserved space
    pub reserved: [u8; 128],
}

/// Jurisdiction-specific compliance configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct JurisdictionCompliance {
    /// Jurisdiction code (ISO 3166-1 alpha-2)
    pub jurisdiction_code: String,
    
    /// Jurisdiction name
    pub jurisdiction_name: String,
    
    /// Regulatory framework
    pub regulatory_framework: RegulatoryFramework,
    
    /// Required licenses
    pub required_licenses: Vec<License>,
    
    /// Compliance requirements
    pub requirements: Vec<ComplianceRequirement>,
    
    /// Regulatory contacts
    pub regulatory_contacts: Vec<RegulatoryContact>,
    
    /// Local compliance officer
    pub local_compliance_officer: Option<Pubkey>,
    
    /// Jurisdiction status
    pub status: JurisdictionStatus,
    
    /// Last compliance review
    pub last_review: i64,
    
    /// Next scheduled review
    pub next_review: i64,
}

/// Regulatory framework types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegulatoryFramework {
    /// Framework name (e.g., "MiCA", "GDPR", "BSA")
    pub name: String,
    
    /// Framework version
    pub version: String,
    
    /// Effective date
    pub effective_date: i64,
    
    /// Key requirements
    pub key_requirements: Vec<String>,
    
    /// Enforcement authority
    pub enforcement_authority: String,
    
    /// Penalties for non-compliance
    pub penalties: Vec<CompliancePenalty>,
}

/// License information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct License {
    /// License type
    pub license_type: String,
    
    /// License number
    pub license_number: String,
    
    /// Issuing authority
    pub issuing_authority: String,
    
    /// Issue date
    pub issued_date: i64,
    
    /// Expiration date
    pub expires_date: i64,
    
    /// License status
    pub status: LicenseStatus,
    
    /// License scope
    pub scope: Vec<String>,
    
    /// Renewal requirements
    pub renewal_requirements: Vec<String>,
}

/// License status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum LicenseStatus {
    Active,
    Pending,
    Expired,
    Suspended,
    Revoked,
    UnderReview,
}

/// Compliance requirement definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ComplianceRequirement {
    /// Requirement ID
    pub requirement_id: String,
    
    /// Requirement name
    pub name: String,
    
    /// Description
    pub description: String,
    
    /// Requirement type
    pub requirement_type: RequirementType,
    
    /// Mandatory or optional
    pub mandatory: bool,
    
    /// Implementation deadline
    pub deadline: Option<i64>,
    
    /// Current implementation status
    pub implementation_status: ImplementationStatus,
    
    /// Evidence of compliance
    pub evidence: Vec<ComplianceEvidence>,
    
    /// Last assessment
    pub last_assessment: Option<i64>,
    
    /// Next assessment due
    pub next_assessment: Option<i64>,
}

/// Types of compliance requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequirementType {
    KycVerification,
    AmlScreening,
    DataProtection,
    RecordKeeping,
    ReportingObligation,
    CapitalRequirement,
    OperationalRequirement,
    TechnicalStandard,
    SecurityRequirement,
    GovernanceRequirement,
}

/// Implementation status of requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ImplementationStatus {
    NotStarted,
    InProgress,
    Implemented,
    UnderReview,
    NonCompliant,
    Deferred,
    Exempted,
}

/// Evidence of compliance
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ComplianceEvidence {
    /// Evidence type
    pub evidence_type: EvidenceType,
    
    /// Evidence description
    pub description: String,
    
    /// Document reference
    pub document_reference: Option<String>,
    
    /// IPFS hash for documents
    pub ipfs_hash: Option<String>,
    
    /// Evidence timestamp
    pub timestamp: i64,
    
    /// Verification status
    pub verification_status: VerificationStatus,
    
    /// Verifier identity
    pub verifier: Option<Pubkey>,
}

/// Types of compliance evidence
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EvidenceType {
    Document,
    SystemConfiguration,
    ProcessDescription,
    AuditReport,
    TestResults,
    CertificationRecord,
    TrainingRecord,
    PolicyDocument,
}

/// Verification status of evidence
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    Verified,
    Rejected,
    RequiresUpdate,
    Expired,
}

/// Penalties for non-compliance
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompliancePenalty {
    /// Penalty type
    pub penalty_type: PenaltyType,
    
    /// Description
    pub description: String,
    
    /// Monetary penalty amount
    pub monetary_amount: Option<u64>,
    
    /// Penalty currency
    pub currency: Option<String>,
    
    /// Non-monetary penalties
    pub non_monetary_penalties: Vec<String>,
    
    /// Escalation procedures
    pub escalation_procedures: Vec<String>,
}

/// Types of compliance penalties
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PenaltyType {
    MonetaryFine,
    LicenseSuspension,
    LicenseRevocation,
    OperationalRestriction,
    PublicCensure,
    CriminalReferral,
    CorrectiveAction,
}

/// Regulatory contact information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegulatoryContact {
    /// Contact type
    pub contact_type: ContactType,
    
    /// Organization name
    pub organization: String,
    
    /// Contact person
    pub contact_person: Option<String>,
    
    /// Email address
    pub email: Option<String>,
    
    /// Phone number
    pub phone: Option<String>,
    
    /// Address
    pub address: Option<String>,
    
    /// Website
    pub website: Option<String>,
    
    /// Preferred communication method
    pub preferred_communication: CommunicationMethod,
}

/// Types of regulatory contacts
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ContactType {
    PrimaryRegulator,
    SecondaryRegulator,
    LicensingAuthority,
    EnforcementAgency,
    IndustryAssociation,
    LegalCounsel,
    ComplianceConsultant,
}

/// Communication methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum CommunicationMethod {
    Email,
    SecurePortal,
    RegisteredMail,
    InPerson,
    VideoConference,
    Phone,
}

/// Jurisdiction compliance status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum JurisdictionStatus {
    Compliant,
    PartiallyCompliant,
    NonCompliant,
    UnderReview,
    Suspended,
    Exempt,
    Prohibited,
}

// =====================================================
// KYC/AML COMPLIANCE STRUCTURES
// =====================================================

/// KYC/AML configuration and requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct KycAmlConfig {
    /// KYC requirements enabled
    pub kyc_enabled: bool,
    
    /// AML screening enabled
    pub aml_enabled: bool,
    
    /// KYC verification levels
    pub kyc_levels: Vec<KycLevel>,
    
    /// AML screening configuration
    pub aml_screening: AmlScreeningConfig,
    
    /// PEP (Politically Exposed Person) screening
    pub pep_screening: PepScreeningConfig,
    
    /// Enhanced due diligence triggers
    pub edd_triggers: Vec<EddTrigger>,
    
    /// Customer risk assessment
    pub risk_assessment: CustomerRiskConfig,
    
    /// Record retention requirements
    pub record_retention: RecordRetentionConfig,
    
    /// Reporting thresholds
    pub reporting_thresholds: ReportingThresholds,
}

/// KYC verification levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct KycLevel {
    /// Level identifier
    pub level: u8,
    
    /// Level name
    pub name: String,
    
    /// Required documents
    pub required_documents: Vec<DocumentRequirement>,
    
    /// Verification methods
    pub verification_methods: Vec<VerificationMethod>,
    
    /// Transaction limits
    pub transaction_limits: TransactionLimits,
    
    /// Service access levels
    pub service_access: Vec<String>,
    
    /// Periodic re-verification required
    pub re_verification_period: Option<i64>,
}

/// Document requirements for KYC
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DocumentRequirement {
    /// Document type
    pub document_type: DocumentType,
    
    /// Mandatory or optional
    pub mandatory: bool,
    
    /// Alternative documents accepted
    pub alternatives: Vec<DocumentType>,
    
    /// Document validation requirements
    pub validation_requirements: Vec<ValidationRequirement>,
    
    /// Document retention period
    pub retention_period: i64,
}

/// Types of identity documents
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DocumentType {
    Passport,
    DriverLicense,
    NationalId,
    ResidencePermit,
    UtilityBill,
    BankStatement,
    TaxReturn,
    CorporateRegistration,
    ArticlesOfIncorporation,
    PowerOfAttorney,
    TrustDeed,
    Other,
}

/// Document validation requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidationRequirement {
    /// Validation type
    pub validation_type: ValidationType,
    
    /// Required accuracy level
    pub accuracy_threshold: u8,
    
    /// Validation service provider
    pub service_provider: Option<String>,
    
    /// Validation timeout
    pub validation_timeout: i64,
    
    /// Manual review required
    pub manual_review_required: bool,
}

/// Types of document validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValidationType {
    OpticalCharacterRecognition,
    BiometricVerification,
    DatabaseCrossReference,
    ThirdPartyVerification,
    ManualReview,
    BlockchainVerification,
}

/// KYC verification methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VerificationMethod {
    DocumentUpload,
    VideoCall,
    InPersonVerification,
    BiometricScan,
    LivenessCheck,
    ThirdPartyProvider,
    BankVerification,
    UtilityVerification,
}

/// Transaction limits based on KYC level
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TransactionLimits {
    /// Daily transaction limit
    pub daily_limit: u64,
    
    /// Monthly transaction limit
    pub monthly_limit: u64,
    
    /// Annual transaction limit
    pub annual_limit: u64,
    
    /// Single transaction limit
    pub single_transaction_limit: u64,
    
    /// Transaction velocity limits
    pub velocity_limits: VelocityLimits,
}

/// Transaction velocity limits
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VelocityLimits {
    /// Maximum transactions per hour
    pub max_hourly_transactions: u32,
    
    /// Maximum transactions per day
    pub max_daily_transactions: u32,
    
    /// Cooling off period between large transactions
    pub cooling_off_period: i64,
    
    /// Large transaction threshold
    pub large_transaction_threshold: u64,
}

/// AML screening configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AmlScreeningConfig {
    /// Screening enabled
    pub enabled: bool,
    
    /// Screening frequency
    pub screening_frequency: ScreeningFrequency,
    
    /// Watchlist sources
    pub watchlist_sources: Vec<WatchlistSource>,
    
    /// Screening thresholds
    pub screening_thresholds: ScreeningThresholds,
    
    /// False positive handling
    pub false_positive_handling: FalsePositiveConfig,
    
    /// Escalation procedures
    pub escalation_procedures: Vec<EscalationProcedure>,
}

/// AML screening frequency
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScreeningFrequency {
    OnBoarding,
    PerTransaction,
    Daily,
    Weekly,
    Monthly,
    Triggered,
}

/// Watchlist data sources
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WatchlistSource {
    /// Source name
    pub name: String,
    
    /// Source type
    pub source_type: WatchlistType,
    
    /// Source priority
    pub priority: u8,
    
    /// Last update timestamp
    pub last_updated: i64,
    
    /// Update frequency
    pub update_frequency: i64,
    
    /// Source reliability score
    pub reliability_score: u8,
}

/// Types of watchlists
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum WatchlistType {
    SanctionsList,
    PepList,
    TerrorismList,
    FraudList,
    ProhibitedCountries,
    HighRiskEntities,
    InternalBlacklist,
    RegulatoryList,
}

/// AML screening thresholds
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScreeningThresholds {
    /// Minimum match score for alerts
    pub alert_threshold: u8,
    
    /// Auto-block threshold
    pub block_threshold: u8,
    
    /// Manual review threshold
    pub manual_review_threshold: u8,
    
    /// Fuzzy matching sensitivity
    pub fuzzy_match_sensitivity: u8,
}

/// False positive handling configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FalsePositiveConfig {
    /// Whitelist management enabled
    pub whitelist_enabled: bool,
    
    /// Machine learning tuning enabled
    pub ml_tuning_enabled: bool,
    
    /// Feedback collection enabled
    pub feedback_collection: bool,
    
    /// Auto-resolution threshold
    pub auto_resolution_threshold: u8,
    
    /// Manual override allowed
    pub manual_override_allowed: bool,
}

/// Escalation procedures for AML alerts
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EscalationProcedure {
    /// Trigger condition
    pub trigger: EscalationTrigger,
    
    /// Escalation level
    pub level: EscalationLevel,
    
    /// Target recipients
    pub recipients: Vec<Pubkey>,
    
    /// Response time requirement
    pub response_time: i64,
    
    /// Escalation actions
    pub actions: Vec<EscalationAction>,
}

/// Triggers for escalation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EscalationTrigger {
    HighRiskMatch,
    SanctionsMatch,
    PepMatch,
    MultipleAlerts,
    LargeTransaction,
    UnusualPattern,
    RegulatoryRequest,
}

/// Escalation levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EscalationLevel {
    Level1,
    Level2,
    Level3,
    Executive,
    Legal,
    Regulatory,
}

/// Actions to take during escalation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EscalationAction {
    NotifyCompliance,
    FreezeAccount,
    BlockTransaction,
    RequireAdditionalKyc,
    ContactRegulator,
    FileSar,
    LegalReview,
}

/// PEP screening configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PepScreeningConfig {
    /// PEP screening enabled
    pub enabled: bool,
    
    /// PEP categories to screen
    pub pep_categories: Vec<PepCategory>,
    
    /// Family member screening
    pub family_screening_enabled: bool,
    
    /// Associate screening
    pub associate_screening_enabled: bool,
    
    /// Enhanced monitoring period
    pub enhanced_monitoring_period: i64,
    
    /// Additional verification requirements
    pub additional_verification: Vec<VerificationMethod>,
}

/// PEP categories
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PepCategory {
    HeadOfState,
    GovernmentOfficial,
    JudiciaryMember,
    MilitaryOfficial,
    PartyOfficial,
    StateOwnedEnterprise,
    InternationalOrganization,
    FamilyMember,
    CloseAssociate,
}

/// Enhanced Due Diligence triggers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EddTrigger {
    /// Trigger type
    pub trigger_type: EddTriggerType,
    
    /// Trigger threshold
    pub threshold: u64,
    
    /// Additional requirements
    pub additional_requirements: Vec<String>,
    
    /// Enhanced monitoring period
    pub monitoring_period: i64,
    
    /// Review frequency
    pub review_frequency: i64,
}

/// Types of EDD triggers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EddTriggerType {
    HighRiskCountry,
    LargeTransaction,
    UnusualTransactionPattern,
    PepMatch,
    SanctionsRisk,
    CashIntensive,
    HighRiskIndustry,
    CorrespondentBanking,
}

/// Customer risk assessment configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CustomerRiskConfig {
    /// Risk scoring enabled
    pub risk_scoring_enabled: bool,
    
    /// Risk factors
    pub risk_factors: Vec<RiskFactor>,
    
    /// Risk categories
    pub risk_categories: Vec<RiskCategory>,
    
    /// Risk assessment frequency
    pub assessment_frequency: i64,
    
    /// Risk model version
    pub model_version: String,
    
    /// Machine learning enabled
    pub ml_enabled: bool,
}

/// Individual risk factor for customer assessment
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskFactor {
    /// Factor name
    pub name: String,
    
    /// Factor type
    pub factor_type: RiskFactorType,
    
    /// Weight in overall score
    pub weight: u8,
    
    /// Scoring methodology
    pub scoring_method: ScoringMethod,
    
    /// Factor parameters
    pub parameters: BTreeMap<String, String>,
}

/// Types of risk factors
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskFactorType {
    Geographic,
    Industry,
    ProductService,
    TransactionPattern,
    CustomerProfile,
    DeliveryChannel,
    PaymentMethod,
    RelationshipLength,
}

/// Risk scoring methods
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScoringMethod {
    Linear,
    Exponential,
    Categorical,
    Boolean,
    MachineLearning,
}

/// Risk categories for customers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskCategory {
    /// Category name
    pub name: String,
    
    /// Risk level
    pub risk_level: RiskLevel,
    
    /// Score range
    pub score_range: ScoreRange,
    
    /// Required controls
    pub required_controls: Vec<String>,
    
    /// Monitoring requirements
    pub monitoring_requirements: Vec<String>,
    
    /// Review frequency
    pub review_frequency: i64,
}

/// Risk levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Prohibited,
}

/// Score range definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreRange {
    /// Minimum score
    pub min_score: u32,
    
    /// Maximum score
    pub max_score: u32,
}

/// Record retention configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RecordRetentionConfig {
    /// Default retention period
    pub default_retention_period: i64,
    
    /// Record type specific retention
    pub record_retention_rules: Vec<RetentionRule>,
    
    /// Secure deletion enabled
    pub secure_deletion_enabled: bool,
    
    /// Backup retention
    pub backup_retention_period: i64,
    
    /// Legal hold procedures
    pub legal_hold_procedures: Vec<String>,
}

/// Retention rule for specific record types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RetentionRule {
    /// Record type
    pub record_type: RecordType,
    
    /// Retention period
    pub retention_period: i64,
    
    /// Destruction method
    pub destruction_method: DestructionMethod,
    
    /// Legal requirements
    pub legal_requirements: Vec<String>,
    
    /// Exceptions
    pub exceptions: Vec<String>,
}

/// Types of records for retention
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecordType {
    CustomerIdentification,
    TransactionRecords,
    SuspiciousActivityReports,
    CommunicationRecords,
    SystemLogs,
    AuditTrails,
    ComplianceDocuments,
    RiskAssessments,
}

/// Methods for secure record destruction
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DestructionMethod {
    SecureDelete,
    Cryptographic,
    Physical,
    Blockchain,
}

/// Reporting thresholds for AML
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReportingThresholds {
    /// Currency transaction report threshold
    pub ctr_threshold: u64,
    
    /// Suspicious activity report threshold
    pub sar_threshold: u64,
    
    /// Large cash transaction threshold
    pub large_cash_threshold: u64,
    
    /// Wire transfer reporting threshold
    pub wire_transfer_threshold: u64,
    
    /// Aggregation period for thresholds
    pub aggregation_period: i64,
    
    /// Structured transaction detection
    pub structured_transaction_detection: bool,
}

// =====================================================
// DATA PRIVACY STRUCTURES
// =====================================================

/// Data subject rights configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataSubjectRightsConfig {
    /// Right to access
    pub right_to_access: bool,
    
    /// Right to rectification
    pub right_to_rectification: bool,
    
    /// Right to erasure
    pub right_to_erasure: bool,
    
    /// Right to portability
    pub right_to_portability: bool,
    
    /// Right to object
    pub right_to_object: bool,
    
    /// Response time (days)
    pub response_time_days: u32,
}

/// Data retention configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataRetentionConfig {
    /// Default retention period (days)
    pub default_retention_days: u32,
    
    /// Maximum retention period (days)
    pub max_retention_days: u32,
    
    /// Automatic deletion enabled
    pub auto_deletion_enabled: bool,
    
    /// Retention schedule
    pub retention_schedule: String,
}

/// Cross-border transfer configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CrossBorderTransferConfig {
    /// Transfer mechanisms allowed
    pub allowed_mechanisms: Vec<String>,
    
    /// Prohibited countries
    pub prohibited_countries: Vec<String>,
    
    /// Requires explicit consent
    pub requires_explicit_consent: bool,
    
    /// Data localization required
    pub data_localization_required: bool,
}

/// Privacy by design configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PrivacyByDesignConfig {
    /// Data minimization enabled
    pub data_minimization: bool,
    
    /// Purpose limitation
    pub purpose_limitation: bool,
    
    /// Privacy impact assessment required
    pub pia_required: bool,
    
    /// Default privacy settings
    pub default_privacy_high: bool,
}

/// Breach notification configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BreachNotificationConfig {
    /// Notification timeline (hours)
    pub notification_timeline_hours: u32,
    
    /// Authorities to notify
    pub notify_authorities: Vec<String>,
    
    /// User notification required
    pub notify_users: bool,
    
    /// Breach threshold
    pub breach_threshold: u32,
}

/// Data privacy and protection configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataPrivacyConfig {
    /// Privacy framework compliance
    pub privacy_frameworks: Vec<PrivacyFramework>,
    
    /// Data classification scheme
    pub data_classification: DataClassificationConfig,
    
    /// Consent management
    pub consent_management: ConsentManagementConfig,
    
    /// Data subject rights
    pub data_subject_rights: DataSubjectRightsConfig,
    
    /// Data retention policies
    pub data_retention: DataRetentionConfig,
    
    /// Cross-border transfer rules
    pub cross_border_transfers: CrossBorderTransferConfig,
    
    /// Privacy by design requirements
    pub privacy_by_design: PrivacyByDesignConfig,
    
    /// Breach notification procedures
    pub breach_notification: BreachNotificationConfig,
}

/// Privacy framework (GDPR, CCPA, etc.)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PrivacyFramework {
    /// Framework name
    pub name: String,
    
    /// Applicable jurisdictions
    pub jurisdictions: Vec<String>,
    
    /// Framework requirements
    pub requirements: Vec<PrivacyRequirement>,
    
    /// Compliance status
    pub compliance_status: ComplianceStatus,
    
    /// Implementation deadline
    pub implementation_deadline: Option<i64>,
    
    /// Last assessment
    pub last_assessment: Option<i64>,
}

/// Individual privacy requirement
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PrivacyRequirement {
    /// Requirement ID
    pub requirement_id: String,
    
    /// Requirement description
    pub description: String,
    
    /// Implementation status
    pub status: ImplementationStatus,
    
    /// Technical measures
    pub technical_measures: Vec<String>,
    
    /// Organizational measures
    pub organizational_measures: Vec<String>,
    
    /// Evidence of compliance
    pub evidence: Vec<ComplianceEvidence>,
}

/// Overall compliance status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ComplianceStatus {
    FullyCompliant,
    PartiallyCompliant,
    NonCompliant,
    UnderImplementation,
    UnderReview,
    NotApplicable,
}

/// Data classification configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataClassificationConfig {
    /// Classification scheme
    pub classification_scheme: ClassificationScheme,
    
    /// Data categories
    pub data_categories: Vec<DataCategory>,
    
    /// Sensitivity levels
    pub sensitivity_levels: Vec<SensitivityLevel>,
    
    /// Classification rules
    pub classification_rules: Vec<ClassificationRule>,
    
    /// Auto-classification enabled
    pub auto_classification: bool,
}

/// Data classification scheme
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ClassificationScheme {
    Gdpr,
    Ccpa,
    Iso27001,
    Custom,
}

/// Data category definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DataCategory {
    /// Category name
    pub name: String,
    
    /// Category type
    pub category_type: DataCategoryType,
    
    /// Protection requirements
    pub protection_requirements: Vec<ProtectionRequirement>,
    
    /// Retention period
    pub retention_period: i64,
    
    /// Access restrictions
    pub access_restrictions: Vec<AccessRestriction>,
}

/// Types of data categories
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DataCategoryType {
    PersonalData,
    SensitivePersonalData,
    FinancialData,
    HealthData,
    BiometricData,
    LocationData,
    CommunicationData,
    TransactionData,
    SystemData,
    PublicData,
}

/// Data sensitivity levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SensitivityLevel {
    /// Level name
    pub name: String,
    
    /// Sensitivity score
    pub score: u8,
    
    /// Required protections
    pub required_protections: Vec<String>,
    
    /// Access controls
    pub access_controls: Vec<String>,
    
    /// Encryption requirements
    pub encryption_requirements: EncryptionRequirement,
}

/// Encryption requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EncryptionRequirement {
    /// Encryption required
    pub required: bool,
    
    /// Minimum encryption strength
    pub minimum_strength: u16,
    
    /// Encryption algorithms
    pub allowed_algorithms: Vec<String>,
    
    /// Key management requirements
    pub key_management: Vec<String>,
    
    /// Encryption at rest required
    pub at_rest_required: bool,
    
    /// Encryption in transit required
    pub in_transit_required: bool,
}

/// Data classification rule
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ClassificationRule {
    /// Rule name
    pub name: String,
    
    /// Rule conditions
    pub conditions: Vec<ClassificationCondition>,
    
    /// Resulting classification
    pub classification: String,
    
    /// Rule priority
    pub priority: u8,
    
    /// Rule enabled
    pub enabled: bool,
}

/// Condition for data classification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ClassificationCondition {
    /// Field to evaluate
    pub field: String,
    
    /// Condition operator
    pub operator: ConditionOperator,
    
    /// Condition value
    pub value: String,
    
    /// Case sensitive
    pub case_sensitive: bool,
}

/// Operators for classification conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConditionOperator {
    Equals,
    Contains,
    StartsWith,
    EndsWith,
    Regex,
    GreaterThan,
    LessThan,
}

/// Protection requirement for data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProtectionRequirement {
    /// Protection type
    pub protection_type: ProtectionType,
    
    /// Implementation details
    pub implementation_details: Vec<String>,
    
    /// Compliance verification
    pub verification_method: String,
    
    /// Review frequency
    pub review_frequency: i64,
}

/// Types of data protection
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProtectionType {
    Encryption,
    AccessControl,
    Anonymization,
    Pseudonymization,
    DataMasking,
    SecureDeletion,
    AuditLogging,
    Backup,
}

/// Access restriction definition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AccessRestriction {
    /// Restriction type
    pub restriction_type: RestrictionType,
    
    /// Allowed roles
    pub allowed_roles: Vec<String>,
    
    /// Allowed purposes
    pub allowed_purposes: Vec<String>,
    
    /// Time restrictions
    pub time_restrictions: Option<TimeRestriction>,
    
    /// Location restrictions
    pub location_restrictions: Option<Vec<String>>,
}

/// Types of access restrictions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RestrictionType {
    RoleBased,
    PurposeBased,
    TimeBased,
    LocationBased,
    ConsentBased,
    NeedToKnow,
}

/// Time-based access restrictions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TimeRestriction {
    /// Allowed hours start
    pub start_hour: u8,
    
    /// Allowed hours end
    pub end_hour: u8,
    
    /// Allowed days of week
    pub allowed_days: Vec<u8>,
    
    /// Timezone
    pub timezone: String,
    
    /// Exception dates
    pub exception_dates: Vec<i64>,
}

// =====================================================
// CONSENT MANAGEMENT STRUCTURES
// =====================================================

/// Consent management configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConsentManagementConfig {
    /// Consent required
    pub consent_required: bool,
    
    /// Consent types
    pub consent_types: Vec<ConsentType>,
    
    /// Consent granularity
    pub granularity_level: ConsentGranularity,
    
    /// Consent withdrawal enabled
    pub withdrawal_enabled: bool,
    
    /// Consent expiration
    pub consent_expiration: ConsentExpiration,
    
    /// Consent verification
    pub verification_requirements: ConsentVerification,
}

/// Types of consent
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConsentType {
    /// Consent purpose
    pub purpose: String,
    
    /// Purpose description
    pub description: String,
    
    /// Legal basis
    pub legal_basis: LegalBasis,
    
    /// Consent method
    pub consent_method: ConsentMethod,
    
    /// Required or optional
    pub required: bool,
    
    /// Dependent consents
    pub dependencies: Vec<String>,
}

/// Legal basis for data processing
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum LegalBasis {
    Consent,
    Contract,
    LegalObligation,
    VitalInterests,
    PublicTask,
    LegitimateInterests,
}

/// Methods for obtaining consent
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConsentMethod {
    OptIn,
    OptOut,
    ImpliedConsent,
    ExplicitConsent,
    DigitalSignature,
    BiometricConsent,
}

/// Granularity levels for consent
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConsentGranularity {
    Global,
    PerPurpose,
    PerDataType,
    PerProcessingActivity,
    Granular,
}

/// Consent expiration configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConsentExpiration {
    /// Default expiration period
    pub default_expiration: i64,
    
    /// Purpose-specific expiration
    pub purpose_expiration: BTreeMap<String, i64>,
    
    /// Auto-renewal enabled
    pub auto_renewal: bool,
    
    /// Renewal notification period
    pub renewal_notification: i64,
    
    /// Expired consent handling
    pub expired_consent_handling: ExpiredConsentHandling,
}

/// Handling of expired consent
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExpiredConsentHandling {
    AutoDelete,
    AutoAnonymize,
    RequestRenewal,
    SuspendProcessing,
    ManualReview,
}

/// Consent verification requirements
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConsentVerification {
    /// Identity verification required
    pub identity_verification: bool,
    
    /// Age verification required
    pub age_verification: bool,
    
    /// Capacity verification required
    pub capacity_verification: bool,
    
    /// Verification methods
    pub verification_methods: Vec<VerificationMethod>,
    
    /// Verification evidence retention
    pub evidence_retention_period: i64,
}

// =====================================================
// CONSTANTS AND SPACE CALCULATIONS
// =====================================================

/// Maximum jurisdictions supported
pub const MAX_JURISDICTIONS: usize = 50;

/// Maximum compliance requirements per jurisdiction
pub const MAX_REQUIREMENTS_PER_JURISDICTION: usize = 100;

/// Maximum evidence items per requirement
pub const MAX_EVIDENCE_PER_REQUIREMENT: usize = 20;

/// Maximum KYC levels
pub const MAX_KYC_LEVELS: usize = 10;

/// Maximum document requirements per KYC level
pub const MAX_DOCUMENTS_PER_LEVEL: usize = 20;

/// Maximum watchlist sources
pub const MAX_WATCHLIST_SOURCES: usize = 50;

/// Maximum escalation procedures
pub const MAX_ESCALATION_PROCEDURES: usize = 20;

/// Maximum risk factors
pub const MAX_RISK_FACTORS: usize = 100;

/// Maximum data categories
pub const MAX_DATA_CATEGORIES: usize = 50;

/// Maximum classification rules
pub const MAX_CLASSIFICATION_RULES: usize = 100;

/// Maximum consent types
pub const MAX_CONSENT_TYPES: usize = 50;

impl RegulatoryCompliance {
    pub const fn space() -> usize {
        8 + // discriminator
        32 + // authority
        32 + // compliance_officer
        8 + // created_at
        8 + // updated_at
        1 + // version
        4 + (MAX_JURISDICTIONS * JurisdictionCompliance::size()) + // jurisdictions
        KycAmlConfig::size() + // kyc_aml_config
        DataPrivacyConfig::size() + // data_privacy
        SanctionsConfig::size() + // sanctions_screening
        FinancialComplianceConfig::size() + // financial_compliance
        ReportingConfig::size() + // reporting_requirements
        MonitoringConfig::size() + // monitoring_config
        128 // reserved
    }
}

impl JurisdictionCompliance {
    pub const fn size() -> usize {
        4 + 8 + // jurisdiction_code
        4 + 64 + // jurisdiction_name
        RegulatoryFramework::size() + // regulatory_framework
        4 + (10 * License::size()) + // required_licenses
        4 + (MAX_REQUIREMENTS_PER_JURISDICTION * ComplianceRequirement::size()) + // requirements
        4 + (10 * RegulatoryContact::size()) + // regulatory_contacts
        1 + 32 + // local_compliance_officer
        1 + // status
        8 + // last_review
        8 // next_review
    }
}

impl RegulatoryFramework {
    pub const fn size() -> usize {
        4 + 128 + // name
        4 + 32 + // version
        8 + // effective_date
        4 + (20 * (4 + 256)) + // key_requirements
        4 + 128 + // enforcement_authority
        4 + (10 * CompliancePenalty::size()) // penalties
    }
}

impl License {
    pub const fn size() -> usize {
        4 + 64 + // license_type
        4 + 64 + // license_number
        4 + 128 + // issuing_authority
        8 + // issued_date
        8 + // expires_date
        1 + // status
        4 + (10 * (4 + 64)) + // scope
        4 + (10 * (4 + 256)) // renewal_requirements
    }
}

impl ComplianceRequirement {
    pub const fn size() -> usize {
        4 + 64 + // requirement_id
        4 + 128 + // name
        4 + 512 + // description
        1 + // requirement_type
        1 + // mandatory
        1 + 8 + // deadline
        1 + // implementation_status
        4 + (MAX_EVIDENCE_PER_REQUIREMENT * ComplianceEvidence::size()) + // evidence
        1 + 8 + // last_assessment
        1 + 8 // next_assessment
    }
}

impl ComplianceEvidence {
    pub const fn size() -> usize {
        1 + // evidence_type
        4 + 256 + // description
        1 + 4 + 128 + // document_reference
        1 + 4 + 128 + // ipfs_hash
        8 + // timestamp
        1 + // verification_status
        1 + 32 // verifier
    }
}

impl CompliancePenalty {
    pub const fn size() -> usize {
        1 + // penalty_type
        4 + 256 + // description
        1 + 8 + // monetary_amount
        1 + 4 + 8 + // currency
        4 + (10 * (4 + 256)) + // non_monetary_penalties
        4 + (5 * (4 + 256)) // escalation_procedures
    }
}

impl RegulatoryContact {
    pub const fn size() -> usize {
        1 + // contact_type
        4 + 128 + // organization
        1 + 4 + 64 + // contact_person
        1 + 4 + 128 + // email
        1 + 4 + 32 + // phone
        1 + 4 + 256 + // address
        1 + 4 + 128 + // website
        1 // preferred_communication
    }
}

// Define placeholder sizes for complex types to be implemented
impl KycAmlConfig {
    pub const fn size() -> usize { 2048 } // Placeholder
}

impl DataPrivacyConfig {
    pub const fn size() -> usize { 2048 } // Placeholder
}

impl SanctionsConfig {
    pub const fn size() -> usize { 1024 } // Placeholder
}

impl FinancialComplianceConfig {
    pub const fn size() -> usize { 1024 } // Placeholder
}

impl ReportingConfig {
    pub const fn size() -> usize { 1024 } // Placeholder
}

impl MonitoringConfig {
    pub const fn size() -> usize { 1024 } // Placeholder
}

// Additional type definitions that are referenced but not fully defined
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SanctionsConfig {
    pub enabled: bool,
    pub screening_frequency: ScreeningFrequency,
    pub watchlist_sources: Vec<WatchlistSource>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FinancialComplianceConfig {
    pub transaction_monitoring: bool,
    pub reporting_thresholds: ReportingThresholds,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReportingConfig {
    pub automated_reporting: bool,
    pub report_frequency: ReportingFrequency,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MonitoringConfig {
    pub real_time_monitoring: bool,
    pub alert_thresholds: Vec<u64>,
}

/// Reporting frequency options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReportingFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annually,
}