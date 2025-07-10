/*!
 * Compliance and Governance Instructions
 * 
 * This module implements instruction handlers for enterprise-grade compliance
 * and governance features including audit trails, multi-signature operations,
 * role-based access control, and risk management.
 */

use anchor_lang::prelude::*;
use crate::state::*;

// =====================================================
// AUDIT TRAIL INSTRUCTIONS
// =====================================================

/// Initialize a new audit trail
#[derive(Accounts)]
#[instruction(trail_id: u64)]
pub struct InitializeAuditTrail<'info> {
    #[account(
        init,
        payer = authority,
        space = AuditTrail::space(),
        seeds = [b"audit_trail", authority.key().as_ref(), &trail_id.to_le_bytes()],
        bump
    )]
    pub audit_trail: Account<'info, AuditTrail>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeAuditTrailParams {
    pub trail_id: u64,
    pub config: AuditConfig,
}

/// Add entry to audit trail
#[derive(Accounts)]
pub struct AddAuditEntry<'info> {
    #[account(
        mut,
        constraint = audit_trail.authority == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub audit_trail: Account<'info, AuditTrail>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AddAuditEntryParams {
    pub action: AuditAction,
    pub target: Option<Pubkey>,
    pub context: AuditContext,
    pub compliance_flags: ComplianceFlags,
    pub signature: Option<[u8; 64]>,
}

/// Generate compliance report
#[derive(Accounts)]
#[instruction(report_id: u64)]
pub struct GenerateComplianceReport<'info> {
    #[account(
        init,
        payer = authority,
        space = ComplianceReport::space(),
        seeds = [b"compliance_report", authority.key().as_ref(), &report_id.to_le_bytes()],
        bump
    )]
    pub compliance_report: Account<'info, ComplianceReport>,
    
    #[account(
        constraint = audit_trail.authority == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub audit_trail: Account<'info, AuditTrail>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GenerateComplianceReportParams {
    pub report_id: u64,
    pub report_type: ReportType,
    pub period_start: i64,
    pub period_end: i64,
}

// =====================================================
// MULTI-SIGNATURE INSTRUCTIONS
// =====================================================

/// Initialize a multi-signature wallet
#[derive(Accounts)]
#[instruction(multisig_id: u64)]
pub struct InitializeMultisig<'info> {
    #[account(
        init,
        payer = owner,
        space = Multisig::space(),
        seeds = [b"multisig", owner.key().as_ref(), &multisig_id.to_le_bytes()],
        bump
    )]
    pub multisig: Account<'info, Multisig>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeMultisigParams {
    pub multisig_id: u64,
    pub threshold: u8,
    pub signers: Vec<Pubkey>,
    pub config: MultisigConfig,
    pub emergency_config: EmergencyConfig,
}

/// Create a pending transaction in multisig
#[derive(Accounts)]
pub struct CreateMultisigTransaction<'info> {
    #[account(
        mut,
        constraint = multisig.signers.contains(&creator.key()) @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub multisig: Account<'info, Multisig>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMultisigTransactionParams {
    pub transaction_id: u64,
    pub transaction_type: TransactionType,
    pub target: Pubkey,
    pub data: Vec<u8>,
    pub priority: TransactionPriority,
    pub expires_at: i64,
    pub execution_conditions: Vec<ExecutionCondition>,
    pub time_lock: Option<TimeLock>,
}

/// Sign a pending multisig transaction
#[derive(Accounts)]
pub struct SignMultisigTransaction<'info> {
    #[account(
        mut,
        constraint = multisig.signers.contains(&signer.key()) @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub multisig: Account<'info, Multisig>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SignMultisigTransactionParams {
    pub transaction_id: u64,
    pub signature: [u8; 64],
    pub verification_data: Option<Vec<u8>>,
}

/// Execute a fully approved multisig transaction
#[derive(Accounts)]
pub struct ExecuteMultisigTransaction<'info> {
    #[account(
        mut,
        constraint = multisig.signers.contains(&executor.key()) @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub multisig: Account<'info, Multisig>,
    
    #[account(mut)]
    pub executor: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExecuteMultisigTransactionParams {
    pub transaction_id: u64,
}

// =====================================================
// GOVERNANCE PROPOSAL INSTRUCTIONS
// =====================================================

/// Create a governance proposal
#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct CreateGovernanceProposal<'info> {
    #[account(
        init,
        payer = proposer,
        space = GovernanceProposal::space(),
        seeds = [b"proposal", proposer.key().as_ref(), &proposal_id.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, GovernanceProposal>,
    
    #[account(
        constraint = governance_config.authority == proposer.key() || 
                    governance_config.proposal_config.proposer_requirements.approved_proposers
                        .as_ref().map_or(true, |approved| approved.contains(&proposer.key())) @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub governance_config: Account<'info, GovernanceConfig>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateGovernanceProposalParams {
    pub proposal_id: u64,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub voting_starts_at: i64,
    pub voting_ends_at: i64,
    pub execution_params: ExecutionParams,
    pub quorum_requirements: QuorumRequirements,
    pub metadata: ProposalMetadata,
}

/// Cast a vote on a governance proposal
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CastVoteParams {
    pub choice: VoteChoice,
    pub voting_power: u64,
    pub reasoning: Option<String>,
    pub delegation_info: Option<DelegationInfo>,
}

/// Execute an approved governance proposal
#[derive(Accounts)]
pub struct ExecuteGovernanceProposal<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Passed @ PodAIMarketplaceError::InvalidStatusTransition
    )]
    pub proposal: Account<'info, GovernanceProposal>,
    
    #[account(mut)]
    pub executor: Signer<'info>,
}

// =====================================================
// ROLE-BASED ACCESS CONTROL INSTRUCTIONS
// =====================================================

/// Initialize RBAC configuration
#[derive(Accounts)]
pub struct InitializeRbac<'info> {
    #[account(
        init,
        payer = authority,
        space = RbacConfig::space(),
        seeds = [b"rbac_config", authority.key().as_ref()],
        bump
    )]
    pub rbac_config: Account<'info, RbacConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeRbacParams {
    pub security_policies: SecurityPolicies,
    pub audit_config: AccessAuditConfig,
    pub emergency_access: EmergencyAccessConfig,
}

/// Create a new role
#[derive(Accounts)]
pub struct CreateRole<'info> {
    #[account(
        mut,
        constraint = rbac_config.authority == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub rbac_config: Account<'info, RbacConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateRoleParams {
    pub role: Role,
}

/// Assign role to user
#[derive(Accounts)]
pub struct AssignRole<'info> {
    #[account(
        mut,
        constraint = rbac_config.authority == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub rbac_config: Account<'info, RbacConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: This is the user being assigned the role
    pub assignee: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AssignRoleParams {
    pub role_id: String,
    pub assignee: Pubkey,
    pub assignment_metadata: AssignmentMetadata,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AssignmentMetadata {
    pub assigned_by: Pubkey,
    pub assigned_at: i64,
    pub expires_at: Option<i64>,
    pub business_justification: String,
    pub approval_reference: Option<String>,
}

/// Create access policy
#[derive(Accounts)]
pub struct CreateAccessPolicy<'info> {
    #[account(
        mut,
        constraint = rbac_config.authority == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub rbac_config: Account<'info, RbacConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateAccessPolicyParams {
    pub policy: AccessPolicy,
}

// =====================================================
// REGULATORY COMPLIANCE INSTRUCTIONS
// =====================================================

/// Initialize regulatory compliance configuration
#[derive(Accounts)]
pub struct InitializeRegulatoryCompliance<'info> {
    #[account(
        init,
        payer = authority,
        space = RegulatoryCompliance::space(),
        seeds = [b"regulatory_compliance", authority.key().as_ref()],
        bump
    )]
    pub regulatory_compliance: Account<'info, RegulatoryCompliance>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeRegulatoryComplianceParams {
    pub compliance_officer: Pubkey,
    pub jurisdictions: Vec<JurisdictionCompliance>,
    pub kyc_aml_config: KycAmlConfig,
    pub data_privacy: DataPrivacyConfig,
    pub sanctions_screening: SanctionsConfig,
    pub financial_compliance: FinancialComplianceConfig,
    pub reporting_requirements: ReportingConfig,
    pub monitoring_config: MonitoringConfig,
}

/// Update compliance status
#[derive(Accounts)]
pub struct UpdateComplianceStatus<'info> {
    #[account(
        mut,
        constraint = regulatory_compliance.authority == authority.key() ||
                    regulatory_compliance.compliance_officer == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub regulatory_compliance: Account<'info, RegulatoryCompliance>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateComplianceStatusParams {
    pub jurisdiction_code: String,
    pub new_status: JurisdictionStatus,
    pub evidence: Vec<ComplianceEvidence>,
    pub notes: String,
}

// =====================================================
// RISK MANAGEMENT INSTRUCTIONS
// =====================================================

/// Initialize risk management system
#[derive(Accounts)]
pub struct InitializeRiskManagement<'info> {
    #[account(
        init,
        payer = authority,
        space = RiskManagement::space(),
        seeds = [b"risk_management", authority.key().as_ref()],
        bump
    )]
    pub risk_management: Account<'info, RiskManagement>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeRiskManagementParams {
    pub chief_risk_officer: Pubkey,
    pub risk_framework: RiskFramework,
    pub assessment_policies: RiskAssessmentPolicies,
    pub monitoring_config: RiskMonitoringConfig,
    pub risk_appetite: RiskAppetite,
}

/// Perform risk assessment
#[derive(Accounts)]
pub struct PerformRiskAssessment<'info> {
    #[account(
        mut,
        constraint = risk_management.authority == authority.key() ||
                    risk_management.chief_risk_officer == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub risk_management: Account<'info, RiskManagement>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PerformRiskAssessmentParams {
    pub risk_category: String,
    pub assessment_results: RiskAssessmentResults,
    pub mitigation_recommendations: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RiskAssessmentResults {
    pub overall_risk_score: u8,
    pub risk_factors: Vec<AssessedRiskFactor>,
    pub control_effectiveness: Vec<ControlEffectivenessResult>,
    pub residual_risk: u8,
    pub confidence_level: ConfidenceLevel,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AssessedRiskFactor {
    pub factor_id: String,
    pub likelihood_score: u8,
    pub impact_score: u8,
    pub risk_score: u8,
    pub trending: TrendDirection,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ControlEffectivenessResult {
    pub control_id: String,
    pub design_effectiveness: EffectivenessRating,
    pub operating_effectiveness: EffectivenessRating,
    pub overall_score: u8,
    pub deficiencies: Vec<String>,
}

/// Update Key Risk Indicators (KRIs)
#[derive(Accounts)]
pub struct UpdateKri<'info> {
    #[account(
        mut,
        constraint = risk_management.authority == authority.key() ||
                    risk_management.chief_risk_officer == authority.key() @ PodAIMarketplaceError::UnauthorizedAccess
    )]
    pub risk_management: Account<'info, RiskManagement>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateKriParams {
    pub kri_id: String,
    pub new_value: f64,
    pub measurement_timestamp: i64,
    pub notes: Option<String>,
}

// =====================================================
// INSTRUCTION IMPLEMENTATIONS
// =====================================================

pub fn initialize_audit_trail(
    ctx: Context<InitializeAuditTrail>,
    params: InitializeAuditTrailParams,
) -> Result<()> {
    let audit_trail = &mut ctx.accounts.audit_trail;
    let clock = Clock::get()?;
    
    audit_trail.authority = ctx.accounts.authority.key();
    audit_trail.trail_id = params.trail_id;
    audit_trail.created_at = clock.unix_timestamp;
    audit_trail.updated_at = clock.unix_timestamp;
    audit_trail.version = 1;
    audit_trail.entries = Vec::new();
    audit_trail.config = params.config;
    audit_trail.compliance_status = ComplianceStatus {
        compliance_score: 100,
        last_review: clock.unix_timestamp,
        next_review: clock.unix_timestamp + 86400 * 30, // 30 days
        active_violations: Vec::new(),
        regulatory_status: Vec::new(),
        risk_assessment: RiskAssessment {
            risk_score: 0,
            last_assessment: clock.unix_timestamp,
            next_assessment: clock.unix_timestamp + 86400 * 7, // 7 days
            risk_factors: Vec::new(),
            mitigation_strategies: Vec::new(),
            risk_thresholds: RiskThresholds {
                low_threshold: 25,
                medium_threshold: 50,
                high_threshold: 75,
                critical_threshold: 90,
                auto_mitigation_threshold: 85,
                manual_review_threshold: 70,
            },
        },
        compliance_officers: vec![ctx.accounts.authority.key()],
    };
    audit_trail.hash_chain = Vec::new();
    audit_trail.reserved = [0; 128];
    
    // Emit audit trail creation event
    emit!(AuditTrailCreatedEvent {
        trail_id: params.trail_id,
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn add_audit_entry(
    ctx: Context<AddAuditEntry>,
    params: AddAuditEntryParams,
) -> Result<()> {
    let audit_trail = &mut ctx.accounts.audit_trail;
    let clock = Clock::get()?;
    
    // Check if audit trail is at capacity
    if audit_trail.entries.len() >= audit_trail.config.max_entries as usize {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    // Calculate entry hash
    let entry_id = audit_trail.entries.len() as u64 + 1;
    let previous_hash = audit_trail.hash_chain.last()
        .copied()
        .unwrap_or([0; 32]);
    
    // Create audit entry
    let audit_entry = AuditEntry {
        entry_id,
        timestamp: clock.unix_timestamp,
        action: params.action,
        actor: ctx.accounts.authority.key(),
        target: params.target,
        context: params.context,
        compliance_flags: params.compliance_flags,
        previous_hash,
        entry_hash: [0; 32], // Would be calculated using proper hash function
        signature: params.signature,
    };
    
    // Add entry to trail
    audit_trail.entries.push(audit_entry);
    audit_trail.hash_chain.push([0; 32]); // Would be actual hash
    audit_trail.updated_at = clock.unix_timestamp;
    
    // Emit audit entry event
    emit!(AuditEntryAddedEvent {
        trail_id: audit_trail.trail_id,
        entry_id,
        action: params.action,
        actor: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn initialize_multisig(
    ctx: Context<InitializeMultisig>,
    params: InitializeMultisigParams,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let clock = Clock::get()?;
    
    // Validate threshold
    if params.threshold == 0 || params.threshold as usize > params.signers.len() {
        return Err(PodAIMarketplaceError::InvalidOffer.into());
    }
    
    multisig.multisig_id = params.multisig_id;
    multisig.threshold = params.threshold;
    multisig.signers = params.signers;
    multisig.owner = ctx.accounts.owner.key();
    multisig.created_at = clock.unix_timestamp;
    multisig.updated_at = clock.unix_timestamp;
    multisig.nonce = 0;
    multisig.pending_transactions = Vec::new();
    multisig.config = params.config;
    multisig.emergency_config = params.emergency_config;
    multisig.reserved = [0; 128];
    
    // Emit multisig creation event
    emit!(MultisigCreatedEvent {
        multisig_id: params.multisig_id,
        owner: ctx.accounts.owner.key(),
        threshold: params.threshold,
        signers: multisig.signers.clone(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn create_multisig_transaction(
    ctx: Context<CreateMultisigTransaction>,
    params: CreateMultisigTransactionParams,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let clock = Clock::get()?;
    
    // Check if transaction limit reached
    if multisig.pending_transactions.len() >= 100 {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    // Create pending transaction
    let pending_transaction = PendingTransaction {
        transaction_id: params.transaction_id,
        transaction_type: params.transaction_type,
        target: params.target,
        data: params.data,
        required_signatures: multisig.threshold,
        signatures: Vec::new(),
        created_at: clock.unix_timestamp,
        expires_at: params.expires_at,
        priority: params.priority,
        execution_conditions: params.execution_conditions,
        status: TransactionStatus::Pending,
        time_lock: params.time_lock,
    };
    
    multisig.pending_transactions.push(pending_transaction);
    multisig.updated_at = clock.unix_timestamp;
    
    // Emit transaction creation event
    emit!(MultisigTransactionCreatedEvent {
        multisig_id: multisig.multisig_id,
        transaction_id: params.transaction_id,
        creator: ctx.accounts.creator.key(),
        transaction_type: params.transaction_type,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn initialize_rbac(
    ctx: Context<InitializeRbac>,
    params: InitializeRbacParams,
) -> Result<()> {
    let rbac_config = &mut ctx.accounts.rbac_config;
    let clock = Clock::get()?;
    
    rbac_config.authority = ctx.accounts.authority.key();
    rbac_config.created_at = clock.unix_timestamp;
    rbac_config.updated_at = clock.unix_timestamp;
    rbac_config.version = 1;
    rbac_config.roles = Vec::new();
    rbac_config.permissions = Vec::new();
    rbac_config.access_policies = Vec::new();
    rbac_config.security_policies = params.security_policies;
    rbac_config.audit_config = params.audit_config;
    rbac_config.emergency_access = params.emergency_access;
    rbac_config.reserved = [0; 128];
    
    // Emit RBAC initialization event
    emit!(RbacInitializedEvent {
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn initialize_risk_management(
    ctx: Context<InitializeRiskManagement>,
    params: InitializeRiskManagementParams,
) -> Result<()> {
    let risk_management = &mut ctx.accounts.risk_management;
    let clock = Clock::get()?;
    
    risk_management.authority = ctx.accounts.authority.key();
    risk_management.chief_risk_officer = params.chief_risk_officer;
    risk_management.created_at = clock.unix_timestamp;
    risk_management.updated_at = clock.unix_timestamp;
    risk_management.version = 1;
    risk_management.risk_framework = params.risk_framework;
    risk_management.assessment_policies = params.assessment_policies;
    risk_management.monitoring_config = params.monitoring_config;
    risk_management.mitigation_strategies = Vec::new();
    risk_management.risk_appetite = params.risk_appetite;
    risk_management.key_risk_indicators = Vec::new();
    risk_management.risk_register = RiskRegister {
        register_id: "default".to_string(),
        risks: Vec::new(),
    };
    risk_management.compliance_validation = ComplianceValidationConfig {
        validation_enabled: true,
        validation_rules: Vec::new(),
    };
    risk_management.reserved = [0; 128];
    
    // Emit risk management initialization event
    emit!(RiskManagementInitializedEvent {
        authority: ctx.accounts.authority.key(),
        chief_risk_officer: params.chief_risk_officer,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

// =====================================================
// EVENTS
// =====================================================

#[event]
pub struct AuditTrailCreatedEvent {
    pub trail_id: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuditEntryAddedEvent {
    pub trail_id: u64,
    pub entry_id: u64,
    pub action: AuditAction,
    pub actor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MultisigCreatedEvent {
    pub multisig_id: u64,
    pub owner: Pubkey,
    pub threshold: u8,
    pub signers: Vec<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct MultisigTransactionCreatedEvent {
    pub multisig_id: u64,
    pub transaction_id: u64,
    pub creator: Pubkey,
    pub transaction_type: TransactionType,
    pub timestamp: i64,
}

#[event]
pub struct RbacInitializedEvent {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RiskManagementInitializedEvent {
    pub authority: Pubkey,
    pub chief_risk_officer: Pubkey,
    pub timestamp: i64,
}