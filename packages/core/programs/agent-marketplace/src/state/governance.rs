/*!
 * Governance Module - Multi-signature and Governance Systems
 * 
 * This module implements comprehensive governance mechanisms including
 * multi-signature wallets, proposal systems, voting mechanisms, and
 * time-locked operations for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use std::collections::BTreeMap;

// =====================================================
// MULTI-SIGNATURE STRUCTURES
// =====================================================

/// Multi-signature wallet for governance operations
#[account]
pub struct Multisig {
    /// Unique identifier
    pub multisig_id: u64,
    
    /// Required number of signatures
    pub threshold: u8,
    
    /// List of authorized signers
    pub signers: Vec<Pubkey>,
    
    /// Multisig owner (can modify signers)
    pub owner: Pubkey,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Current nonce (prevents replay attacks)
    pub nonce: u64,
    
    /// Pending transactions
    pub pending_transactions: Vec<PendingTransaction>,
    
    /// Configuration settings
    pub config: MultisigConfig,
    
    /// Emergency settings
    pub emergency_config: EmergencyConfig,
    
    /// Reserved space for future extensions
    pub reserved: [u8; 128],
}

/// Pending transaction in multisig queue
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PendingTransaction {
    /// Transaction ID
    pub transaction_id: u64,
    
    /// Transaction type
    pub transaction_type: TransactionType,
    
    /// Target program/account
    pub target: Pubkey,
    
    /// Transaction data
    pub data: Vec<u8>,
    
    /// Required signatures
    pub required_signatures: u8,
    
    /// Current signatures
    pub signatures: Vec<MultisigSignature>,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Expiration timestamp
    pub expires_at: i64,
    
    /// Transaction priority
    pub priority: TransactionPriority,
    
    /// Execution conditions
    pub execution_conditions: Vec<ExecutionCondition>,
    
    /// Transaction status
    pub status: TransactionStatus,
    
    /// Time lock (if applicable)
    pub time_lock: Option<TimeLock>,
}

/// Multi-signature configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MultisigConfig {
    /// Maximum number of signers
    pub max_signers: u8,
    
    /// Default transaction timeout (seconds)
    pub default_timeout: i64,
    
    /// Allow emergency override
    pub allow_emergency_override: bool,
    
    /// Emergency threshold (if different from normal)
    pub emergency_threshold: Option<u8>,
    
    /// Automatic execution enabled
    pub auto_execute: bool,
    
    /// Required confirmations for signer changes
    pub signer_change_threshold: u8,
    
    /// Allowed transaction types
    pub allowed_transaction_types: Vec<TransactionType>,
    
    /// Daily transaction limits
    pub daily_limits: BTreeMap<String, u64>,
}

/// Emergency configuration for multisig
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EmergencyConfig {
    /// Emergency contacts
    pub emergency_contacts: Vec<Pubkey>,
    
    /// Emergency threshold override
    pub emergency_threshold: u8,
    
    /// Emergency timeout (shorter than normal)
    pub emergency_timeout: i64,
    
    /// Allowed emergency transaction types
    pub emergency_transaction_types: Vec<TransactionType>,
    
    /// Emergency freeze enabled
    pub freeze_enabled: bool,
    
    /// Current freeze status
    pub frozen: bool,
    
    /// Freeze timestamp
    pub frozen_at: Option<i64>,
    
    /// Auto-unfreeze after duration
    pub auto_unfreeze_duration: Option<i64>,
}

/// Types of transactions that can be executed
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransactionType {
    // Financial operations
    Transfer,
    Withdrawal,
    EscrowRelease,
    
    // Governance operations
    ProposalCreation,
    VoteExecution,
    ParameterUpdate,
    
    // Administrative operations
    SignerAddition,
    SignerRemoval,
    ThresholdUpdate,
    ConfigUpdate,
    
    // Security operations
    EmergencyFreeze,
    EmergencyUnfreeze,
    SecurityPolicyUpdate,
    
    // Protocol operations
    ProtocolUpgrade,
    FeatureToggle,
    RiskParameterUpdate,
    
    // Custom operations
    CustomInstruction,
}

/// Transaction priority levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransactionPriority {
    Low,
    Normal,
    High,
    Critical,
    Emergency,
}

/// Transaction execution status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransactionStatus {
    Pending,
    PartiallyApproved,
    FullyApproved,
    Executed,
    Cancelled,
    Expired,
    Failed,
}

/// Individual signature in multisig
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MultisigSignature {
    /// Signer public key
    pub signer: Pubkey,
    
    /// Signature data
    pub signature: [u8; 64],
    
    /// Signature timestamp
    pub signed_at: i64,
    
    /// Signature method/algorithm
    pub signature_method: String,
    
    /// Additional verification data
    pub verification_data: Option<Vec<u8>>,
}

/// Execution conditions for transactions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ExecutionCondition {
    /// Condition type
    pub condition_type: ConditionType,
    
    /// Target value/threshold
    pub target_value: u64,
    
    /// Current value
    pub current_value: u64,
    
    /// Condition met
    pub met: bool,
    
    /// Condition description
    pub description: String,
}

/// Types of execution conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConditionType {
    TimeDelay,
    TokenBalance,
    PriceThreshold,
    VoteCount,
    ExternalOracle,
    CustomLogic,
}

/// Time lock mechanism for delayed execution
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TimeLock {
    /// Lock duration in seconds
    pub duration: i64,
    
    /// Lock start timestamp
    pub locked_at: i64,
    
    /// Unlock timestamp
    pub unlocks_at: i64,
    
    /// Early unlock conditions
    pub early_unlock_conditions: Vec<ExecutionCondition>,
    
    /// Lock type
    pub lock_type: TimeLockType,
    
    /// Can be cancelled before execution
    pub cancellable: bool,
}

/// Types of time locks
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TimeLockType {
    Standard,
    Vesting,
    Emergency,
    Governance,
}

// =====================================================
// GOVERNANCE PROPOSAL STRUCTURES
// =====================================================

/// Governance proposal for protocol changes
#[account]
pub struct GovernanceProposal {
    /// Proposal ID
    pub proposal_id: u64,
    
    /// Proposer
    pub proposer: Pubkey,
    
    /// Proposal title
    pub title: String,
    
    /// Proposal description
    pub description: String,
    
    /// Proposal type
    pub proposal_type: ProposalType,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Voting start timestamp
    pub voting_starts_at: i64,
    
    /// Voting end timestamp
    pub voting_ends_at: i64,
    
    /// Execution timestamp (if approved)
    pub execution_timestamp: Option<i64>,
    
    /// Proposal status
    pub status: ProposalStatus,
    
    /// Voting results
    pub voting_results: VotingResults,
    
    /// Execution parameters
    pub execution_params: ExecutionParams,
    
    /// Quorum requirements
    pub quorum_requirements: QuorumRequirements,
    
    /// Proposal metadata
    pub metadata: ProposalMetadata,
    
    /// Reserved space
    pub reserved: [u8; 64],
}

/// Types of governance proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProposalType {
    /// Protocol parameter updates
    ParameterUpdate,
    
    /// Smart contract upgrades
    ProtocolUpgrade,
    
    /// Treasury operations
    TreasuryOperation,
    
    /// Fee structure changes
    FeeUpdate,
    
    /// Security policy updates
    SecurityUpdate,
    
    /// Governance rule changes
    GovernanceUpdate,
    
    /// Emergency actions
    EmergencyAction,
    
    /// Custom proposals
    Custom,
}

/// Proposal execution status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProposalStatus {
    Draft,
    Active,
    Passed,
    Failed,
    Executed,
    Cancelled,
    Expired,
}

/// Voting results for proposal
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VotingResults {
    /// Total votes for
    pub votes_for: u64,
    
    /// Total votes against
    pub votes_against: u64,
    
    /// Total votes abstain
    pub votes_abstain: u64,
    
    /// Total voting power
    pub total_voting_power: u64,
    
    /// Participation rate
    pub participation_rate: u8,
    
    /// Individual votes
    pub individual_votes: Vec<Vote>,
    
    /// Weighted voting enabled
    pub weighted_voting: bool,
    
    /// Quorum reached
    pub quorum_reached: bool,
    
    /// Approval threshold met
    pub approval_threshold_met: bool,
}

/// Individual vote record
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Vote {
    /// Voter public key
    pub voter: Pubkey,
    
    /// Vote choice
    pub choice: VoteChoice,
    
    /// Voting power used
    pub voting_power: u64,
    
    /// Vote timestamp
    pub voted_at: i64,
    
    /// Vote reasoning (optional)
    pub reasoning: Option<String>,
    
    /// Delegation info (if delegated vote)
    pub delegation_info: Option<DelegationInfo>,
}

/// Vote choices
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

/// Vote delegation information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DelegationInfo {
    /// Original delegator
    pub delegator: Pubkey,
    
    /// Delegation timestamp
    pub delegated_at: i64,
    
    /// Delegation scope
    pub scope: DelegationScope,
    
    /// Delegation expiry
    pub expires_at: Option<i64>,
}

/// Scope of vote delegation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DelegationScope {
    All,
    ProposalType(ProposalType),
    SingleProposal,
    Limited,
}

/// Execution parameters for proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ExecutionParams {
    /// Instructions to execute if passed
    pub instructions: Vec<ProposalInstruction>,
    
    /// Time delay before execution
    pub execution_delay: i64,
    
    /// Execution conditions
    pub execution_conditions: Vec<ExecutionCondition>,
    
    /// Can be cancelled after approval
    pub cancellable: bool,
    
    /// Automatic execution enabled
    pub auto_execute: bool,
    
    /// Required execution authority
    pub execution_authority: Pubkey,
}

/// Individual instruction in proposal
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposalInstruction {
    /// Target program
    pub program_id: Pubkey,
    
    /// Accounts required
    pub accounts: Vec<ProposalAccount>,
    
    /// Instruction data
    pub data: Vec<u8>,
    
    /// Instruction description
    pub description: String,
}

/// Account specification for proposal instruction
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposalAccount {
    /// Account public key
    pub pubkey: Pubkey,
    
    /// Is signer required
    pub is_signer: bool,
    
    /// Is writable
    pub is_writable: bool,
    
    /// Account description
    pub description: String,
}

/// Quorum requirements for proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct QuorumRequirements {
    /// Minimum participation rate (0-100)
    pub minimum_participation: u8,
    
    /// Approval threshold (0-100)
    pub approval_threshold: u8,
    
    /// Super majority required
    pub super_majority_required: bool,
    
    /// Minimum total voting power
    pub minimum_voting_power: u64,
    
    /// Quorum calculation method
    pub quorum_method: QuorumMethod,
}

/// Methods for calculating quorum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuorumMethod {
    Absolute,
    Relative,
    Weighted,
    Dynamic,
}

/// Proposal metadata
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposalMetadata {
    /// IPFS hash for detailed proposal
    pub ipfs_hash: Option<String>,
    
    /// External references
    pub external_references: Vec<String>,
    
    /// Proposal tags
    pub tags: Vec<String>,
    
    /// Risk assessment
    pub risk_assessment: Option<String>,
    
    /// Impact analysis
    pub impact_analysis: Option<String>,
    
    /// Implementation timeline
    pub implementation_timeline: Option<String>,
}

// =====================================================
// GOVERNANCE SYSTEM STRUCTURES
// =====================================================

/// Global governance configuration
#[account]
pub struct GovernanceConfig {
    /// Governance authority
    pub authority: Pubkey,
    
    /// Version for upgrades
    pub version: u8,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Voting configuration
    pub voting_config: VotingConfig,
    
    /// Proposal configuration
    pub proposal_config: ProposalConfig,
    
    /// Token-based governance settings
    pub token_governance: TokenGovernance,
    
    /// Council-based governance settings
    pub council_governance: Option<CouncilGovernance>,
    
    /// Emergency governance settings
    pub emergency_governance: EmergencyGovernance,
    
    /// Reserved space
    pub reserved: [u8; 128],
}

/// Voting system configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VotingConfig {
    /// Voting period duration (seconds)
    pub voting_period: i64,
    
    /// Minimum voting delay before voting starts
    pub voting_delay: i64,
    
    /// Default quorum threshold
    pub default_quorum_threshold: u8,
    
    /// Default approval threshold
    pub default_approval_threshold: u8,
    
    /// Vote delegation enabled
    pub delegation_enabled: bool,
    
    /// Weighted voting enabled
    pub weighted_voting_enabled: bool,
    
    /// Vote privacy settings
    pub vote_privacy: VotePrivacy,
    
    /// Snapshot strategy
    pub snapshot_strategy: SnapshotStrategy,
}

/// Vote privacy settings
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VotePrivacy {
    Public,
    Private,
    Shielded,
    Mixed,
}

/// Snapshot strategy for voting power calculation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SnapshotStrategy {
    ProposalCreation,
    VotingStart,
    BlockHeight,
    Timestamp,
}

/// Proposal system configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposalConfig {
    /// Minimum proposal deposit
    pub minimum_deposit: u64,
    
    /// Proposal deposit token
    pub deposit_token: Pubkey,
    
    /// Maximum active proposals
    pub max_active_proposals: u32,
    
    /// Proposal cooldown period
    pub proposal_cooldown: i64,
    
    /// Required proposer qualifications
    pub proposer_requirements: ProposerRequirements,
    
    /// Automatic execution settings
    pub auto_execution: AutoExecutionConfig,
}

/// Requirements to create proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposerRequirements {
    /// Minimum token balance required
    pub minimum_token_balance: u64,
    
    /// Minimum reputation score
    pub minimum_reputation: Option<u32>,
    
    /// Required staking period
    pub required_staking_period: Option<i64>,
    
    /// Whitelist of approved proposers
    pub approved_proposers: Option<Vec<Pubkey>>,
    
    /// Blacklist of banned proposers
    pub banned_proposers: Vec<Pubkey>,
}

/// Automatic execution configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AutoExecutionConfig {
    /// Auto-execution enabled
    pub enabled: bool,
    
    /// Maximum execution delay
    pub max_execution_delay: i64,
    
    /// Execution window duration
    pub execution_window: i64,
    
    /// Gas limit for execution
    pub gas_limit: u64,
    
    /// Execution priority levels
    pub priority_levels: Vec<ExecutionPriority>,
}

/// Execution priority configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ExecutionPriority {
    /// Proposal type
    pub proposal_type: ProposalType,
    
    /// Priority level
    pub priority: TransactionPriority,
    
    /// Execution delay override
    pub delay_override: Option<i64>,
    
    /// Special conditions
    pub conditions: Vec<String>,
}

/// Token-based governance configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TokenGovernance {
    /// Governance token mint
    pub governance_token: Pubkey,
    
    /// Voting power calculation method
    pub voting_power_method: VotingPowerMethod,
    
    /// Token lockup requirements
    pub lockup_requirements: LockupRequirements,
    
    /// Staking rewards for participation
    pub staking_rewards: Option<StakingRewards>,
    
    /// Slashing conditions
    pub slashing_conditions: Vec<SlashingCondition>,
}

/// Methods for calculating voting power
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VotingPowerMethod {
    LinearBalance,
    SquareRootBalance,
    TimeWeightedBalance,
    StakedBalance,
    Custom,
}

/// Token lockup requirements for voting
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LockupRequirements {
    /// Minimum lockup period
    pub minimum_lockup_period: i64,
    
    /// Voting power multiplier for longer lockups
    pub lockup_multipliers: Vec<LockupMultiplier>,
    
    /// Early withdrawal penalties
    pub early_withdrawal_penalty: u8,
    
    /// Lockup extensions allowed
    pub extensions_allowed: bool,
}

/// Lockup multiplier configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LockupMultiplier {
    /// Lockup duration threshold
    pub duration_threshold: i64,
    
    /// Voting power multiplier
    pub multiplier: u16, // Basis points (10000 = 1.0x)
    
    /// Maximum multiplier cap
    pub max_multiplier: u16,
}

/// Staking rewards for governance participation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StakingRewards {
    /// Reward token mint
    pub reward_token: Pubkey,
    
    /// Base reward rate (per second)
    pub base_reward_rate: u64,
    
    /// Participation bonus multiplier
    pub participation_bonus: u16,
    
    /// Reward distribution frequency
    pub distribution_frequency: i64,
    
    /// Maximum reward pool
    pub max_reward_pool: u64,
}

/// Slashing conditions for malicious behavior
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SlashingCondition {
    /// Behavior that triggers slashing
    pub behavior_type: SlashingBehavior,
    
    /// Percentage of stake to slash
    pub slash_percentage: u8,
    
    /// Minimum slash amount
    pub minimum_slash_amount: u64,
    
    /// Evidence requirements
    pub evidence_requirements: Vec<String>,
}

/// Types of behavior that can be slashed
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SlashingBehavior {
    VoteManipulation,
    DoubleVoting,
    BribingVoters,
    MaliciousProposal,
    GovernanceAttack,
    SpamProposals,
}

/// Council-based governance (optional)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CouncilGovernance {
    /// Council members
    pub council_members: Vec<CouncilMember>,
    
    /// Council threshold for decisions
    pub council_threshold: u8,
    
    /// Council term length
    pub term_length: i64,
    
    /// Election process
    pub election_process: ElectionProcess,
    
    /// Council powers and limitations
    pub council_powers: CouncilPowers,
}

/// Individual council member
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CouncilMember {
    /// Member public key
    pub member: Pubkey,
    
    /// Election timestamp
    pub elected_at: i64,
    
    /// Term expiration
    pub term_expires_at: i64,
    
    /// Voting weight
    pub voting_weight: u16,
    
    /// Specialization areas
    pub specializations: Vec<String>,
    
    /// Performance metrics
    pub performance_metrics: MemberPerformance,
}

/// Council member performance metrics
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MemberPerformance {
    /// Proposals voted on
    pub proposals_voted: u32,
    
    /// Proposals created
    pub proposals_created: u32,
    
    /// Attendance rate
    pub attendance_rate: u8,
    
    /// Community satisfaction score
    pub satisfaction_score: u8,
    
    /// Expertise utilization
    pub expertise_utilization: u8,
}

/// Election process configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ElectionProcess {
    /// Election frequency
    pub election_frequency: i64,
    
    /// Nomination period
    pub nomination_period: i64,
    
    /// Campaign period
    pub campaign_period: i64,
    
    /// Voting period
    pub voting_period: i64,
    
    /// Candidate requirements
    pub candidate_requirements: CandidateRequirements,
    
    /// Election method
    pub election_method: ElectionMethod,
}

/// Requirements to become council candidate
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CandidateRequirements {
    /// Minimum token balance
    pub minimum_token_balance: u64,
    
    /// Required nominations
    pub required_nominations: u32,
    
    /// Minimum reputation score
    pub minimum_reputation: u32,
    
    /// Required experience areas
    pub required_experience: Vec<String>,
    
    /// Background check requirements
    pub background_checks: Vec<String>,
}

/// Methods for conducting elections
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ElectionMethod {
    SimplePlurality,
    RankedChoice,
    ApprovalVoting,
    QuadraticVoting,
}

/// Powers granted to council
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CouncilPowers {
    /// Can fast-track emergency proposals
    pub emergency_powers: bool,
    
    /// Can veto community proposals
    pub veto_power: bool,
    
    /// Can modify governance parameters
    pub parameter_modification: bool,
    
    /// Can manage treasury
    pub treasury_management: bool,
    
    /// Can oversee protocol upgrades
    pub upgrade_oversight: bool,
    
    /// Power limitations
    pub limitations: Vec<String>,
}

/// Emergency governance configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EmergencyGovernance {
    /// Emergency multisig
    pub emergency_multisig: Pubkey,
    
    /// Emergency threshold (lower than normal)
    pub emergency_threshold: u8,
    
    /// Emergency voting period (shorter)
    pub emergency_voting_period: i64,
    
    /// Types of emergency actions allowed
    pub emergency_actions: Vec<EmergencyAction>,
    
    /// Post-emergency review requirements
    pub post_emergency_review: bool,
    
    /// Emergency activation conditions
    pub activation_conditions: Vec<EmergencyCondition>,
}

/// Types of emergency actions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EmergencyAction {
    ProtocolPause,
    SecurityPatch,
    TreasuryFreeze,
    ParameterReset,
    AccessRevocation,
    ContractUpgrade,
}

/// Conditions that can trigger emergency governance
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EmergencyCondition {
    /// Condition type
    pub condition_type: EmergencyConditionType,
    
    /// Threshold value
    pub threshold: u64,
    
    /// Detection method
    pub detection_method: String,
    
    /// Automatic activation
    pub auto_activate: bool,
    
    /// Required confirmations
    pub required_confirmations: u8,
}

/// Types of emergency conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum EmergencyConditionType {
    SecurityBreach,
    ExploitDetected,
    LiquidityDrain,
    GovernanceAttack,
    OracleManipulation,
    SystemFailure,
}

// =====================================================
// CONSTANTS
// =====================================================

/// Maximum number of signers in multisig
pub const MAX_MULTISIG_SIGNERS: usize = 20;

/// Maximum pending transactions
pub const MAX_PENDING_TRANSACTIONS: usize = 100;

/// Maximum proposal instructions
pub const MAX_PROPOSAL_INSTRUCTIONS: usize = 10;

/// Maximum council members
pub const MAX_COUNCIL_MEMBERS: usize = 15;

/// Maximum emergency conditions
pub const MAX_EMERGENCY_CONDITIONS: usize = 20;

/// Maximum voting power multiplier (10x)
pub const MAX_VOTING_POWER_MULTIPLIER: u32 = 100000; // Basis points

// =====================================================
// SPACE CALCULATIONS
// =====================================================

impl Multisig {
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // multisig_id
        1 + // threshold
        4 + (MAX_MULTISIG_SIGNERS * 32) + // signers
        32 + // owner
        8 + // created_at
        8 + // updated_at
        8 + // nonce
        4 + (MAX_PENDING_TRANSACTIONS * PendingTransaction::size()) + // pending_transactions
        MultisigConfig::size() + // config
        EmergencyConfig::size() + // emergency_config
        128 // reserved
    }
}

impl PendingTransaction {
    pub const fn size() -> usize {
        8 + // transaction_id
        1 + // transaction_type
        32 + // target
        4 + 1024 + // data (max 1KB)
        1 + // required_signatures
        4 + (20 * MultisigSignature::size()) + // signatures
        8 + // created_at
        8 + // expires_at
        1 + // priority
        4 + (10 * ExecutionCondition::size()) + // execution_conditions
        1 + // status
        1 + TimeLock::size() // time_lock
    }
}

impl MultisigSignature {
    pub const fn size() -> usize {
        32 + // signer
        64 + // signature
        8 + // signed_at
        4 + 32 + // signature_method
        1 + 4 + 256 // verification_data
    }
}

impl MultisigConfig {
    pub const fn size() -> usize {
        1 + // max_signers
        8 + // default_timeout
        1 + // allow_emergency_override
        1 + 1 + // emergency_threshold
        1 + // auto_execute
        1 + // signer_change_threshold
        4 + (20 * 1) + // allowed_transaction_types
        4 + (10 * (32 + 8)) // daily_limits
    }
}

impl EmergencyConfig {
    pub const fn size() -> usize {
        4 + (10 * 32) + // emergency_contacts
        1 + // emergency_threshold
        8 + // emergency_timeout
        4 + (10 * 1) + // emergency_transaction_types
        1 + // freeze_enabled
        1 + // frozen
        1 + 8 + // frozen_at
        1 + 8 // auto_unfreeze_duration
    }
}

impl ExecutionCondition {
    pub const fn size() -> usize {
        1 + // condition_type
        8 + // target_value
        8 + // current_value
        1 + // met
        4 + 256 // description
    }
}

impl TimeLock {
    pub const fn size() -> usize {
        8 + // duration
        8 + // locked_at
        8 + // unlocks_at
        4 + (5 * ExecutionCondition::size()) + // early_unlock_conditions
        1 + // lock_type
        1 // cancellable
    }
}

impl GovernanceProposal {
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // proposal_id
        32 + // proposer
        4 + 256 + // title
        4 + 2048 + // description
        1 + // proposal_type
        8 + // created_at
        8 + // voting_starts_at
        8 + // voting_ends_at
        1 + 8 + // execution_timestamp
        1 + // status
        VotingResults::size() + // voting_results
        ExecutionParams::size() + // execution_params
        QuorumRequirements::size() + // quorum_requirements
        ProposalMetadata::size() + // metadata
        64 // reserved
    }
}

impl VotingResults {
    pub const fn size() -> usize {
        8 + // votes_for
        8 + // votes_against
        8 + // votes_abstain
        8 + // total_voting_power
        1 + // participation_rate
        4 + (1000 * Vote::size()) + // individual_votes
        1 + // weighted_voting
        1 + // quorum_reached
        1 // approval_threshold_met
    }
}

impl Vote {
    pub const fn size() -> usize {
        32 + // voter
        1 + // choice
        8 + // voting_power
        8 + // voted_at
        1 + 4 + 512 + // reasoning
        1 + DelegationInfo::size() // delegation_info
    }
}

impl DelegationInfo {
    pub const fn size() -> usize {
        32 + // delegator
        8 + // delegated_at
        1 + // scope (simplified)
        1 + 8 // expires_at
    }
}

impl ExecutionParams {
    pub const fn size() -> usize {
        4 + (MAX_PROPOSAL_INSTRUCTIONS * ProposalInstruction::size()) + // instructions
        8 + // execution_delay
        4 + (10 * ExecutionCondition::size()) + // execution_conditions
        1 + // cancellable
        1 + // auto_execute
        32 // execution_authority
    }
}

impl ProposalInstruction {
    pub const fn size() -> usize {
        32 + // program_id
        4 + (20 * ProposalAccount::size()) + // accounts
        4 + 1024 + // data
        4 + 256 // description
    }
}

impl ProposalAccount {
    pub const fn size() -> usize {
        32 + // pubkey
        1 + // is_signer
        1 + // is_writable
        4 + 128 // description
    }
}

impl QuorumRequirements {
    pub const fn size() -> usize {
        1 + // minimum_participation
        1 + // approval_threshold
        1 + // super_majority_required
        8 + // minimum_voting_power
        1 // quorum_method
    }
}

impl ProposalMetadata {
    pub const fn size() -> usize {
        1 + 4 + 128 + // ipfs_hash
        4 + (10 * (4 + 256)) + // external_references
        4 + (20 * (4 + 64)) + // tags
        1 + 4 + 512 + // risk_assessment
        1 + 4 + 512 + // impact_analysis
        1 + 4 + 256 // implementation_timeline
    }
}

impl GovernanceConfig {
    pub const fn space() -> usize {
        8 + // discriminator
        32 + // authority
        1 + // version
        8 + // created_at
        8 + // updated_at
        VotingConfig::size() + // voting_config
        ProposalConfig::size() + // proposal_config
        TokenGovernance::size() + // token_governance
        1 + CouncilGovernance::size() + // council_governance
        EmergencyGovernance::size() + // emergency_governance
        128 // reserved
    }
}

impl VotingConfig {
    pub const fn size() -> usize {
        8 + // voting_period
        8 + // voting_delay
        1 + // default_quorum_threshold
        1 + // default_approval_threshold
        1 + // delegation_enabled
        1 + // weighted_voting_enabled
        1 + // vote_privacy
        1 // snapshot_strategy
    }
}

impl ProposalConfig {
    pub const fn size() -> usize {
        8 + // minimum_deposit
        32 + // deposit_token
        4 + // max_active_proposals
        8 + // proposal_cooldown
        ProposerRequirements::size() + // proposer_requirements
        AutoExecutionConfig::size() // auto_execution
    }
}

impl ProposerRequirements {
    pub const fn size() -> usize {
        8 + // minimum_token_balance
        1 + 4 + // minimum_reputation
        1 + 8 + // required_staking_period
        1 + 4 + (100 * 32) + // approved_proposers
        4 + (100 * 32) // banned_proposers
    }
}

impl AutoExecutionConfig {
    pub const fn size() -> usize {
        1 + // enabled
        8 + // max_execution_delay
        8 + // execution_window
        8 + // gas_limit
        4 + (20 * ExecutionPriority::size()) // priority_levels
    }
}

impl ExecutionPriority {
    pub const fn size() -> usize {
        1 + // proposal_type
        1 + // priority
        1 + 8 + // delay_override
        4 + (5 * (4 + 128)) // conditions
    }
}

impl TokenGovernance {
    pub const fn size() -> usize {
        32 + // governance_token
        1 + // voting_power_method
        LockupRequirements::size() + // lockup_requirements
        1 + StakingRewards::size() + // staking_rewards
        4 + (20 * SlashingCondition::size()) // slashing_conditions
    }
}

impl LockupRequirements {
    pub const fn size() -> usize {
        8 + // minimum_lockup_period
        4 + (10 * LockupMultiplier::size()) + // lockup_multipliers
        1 + // early_withdrawal_penalty
        1 // extensions_allowed
    }
}

impl LockupMultiplier {
    pub const fn size() -> usize {
        8 + // duration_threshold
        2 + // multiplier
        2 // max_multiplier
    }
}

impl StakingRewards {
    pub const fn size() -> usize {
        32 + // reward_token
        8 + // base_reward_rate
        2 + // participation_bonus
        8 + // distribution_frequency
        8 // max_reward_pool
    }
}

impl SlashingCondition {
    pub const fn size() -> usize {
        1 + // behavior_type
        1 + // slash_percentage
        8 + // minimum_slash_amount
        4 + (5 * (4 + 256)) // evidence_requirements
    }
}

impl CouncilGovernance {
    pub const fn size() -> usize {
        4 + (MAX_COUNCIL_MEMBERS * CouncilMember::size()) + // council_members
        1 + // council_threshold
        8 + // term_length
        ElectionProcess::size() + // election_process
        CouncilPowers::size() // council_powers
    }
}

impl CouncilMember {
    pub const fn size() -> usize {
        32 + // member
        8 + // elected_at
        8 + // term_expires_at
        2 + // voting_weight
        4 + (10 * (4 + 64)) + // specializations
        MemberPerformance::size() // performance_metrics
    }
}

impl MemberPerformance {
    pub const fn size() -> usize {
        4 + // proposals_voted
        4 + // proposals_created
        1 + // attendance_rate
        1 + // satisfaction_score
        1 // expertise_utilization
    }
}

impl ElectionProcess {
    pub const fn size() -> usize {
        8 + // election_frequency
        8 + // nomination_period
        8 + // campaign_period
        8 + // voting_period
        CandidateRequirements::size() + // candidate_requirements
        1 // election_method
    }
}

impl CandidateRequirements {
    pub const fn size() -> usize {
        8 + // minimum_token_balance
        4 + // required_nominations
        4 + // minimum_reputation
        4 + (10 * (4 + 128)) + // required_experience
        4 + (5 * (4 + 256)) // background_checks
    }
}

impl CouncilPowers {
    pub const fn size() -> usize {
        1 + // emergency_powers
        1 + // veto_power
        1 + // parameter_modification
        1 + // treasury_management
        1 + // upgrade_oversight
        4 + (10 * (4 + 256)) // limitations
    }
}

impl EmergencyGovernance {
    pub const fn size() -> usize {
        32 + // emergency_multisig
        1 + // emergency_threshold
        8 + // emergency_voting_period
        4 + (20 * 1) + // emergency_actions
        1 + // post_emergency_review
        4 + (MAX_EMERGENCY_CONDITIONS * EmergencyCondition::size()) // activation_conditions
    }
}

impl EmergencyCondition {
    pub const fn size() -> usize {
        1 + // condition_type
        8 + // threshold
        4 + 256 + // detection_method
        1 + // auto_activate
        1 // required_confirmations
    }
}