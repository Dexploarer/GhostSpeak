/*!
 * Governance Module - Multi-signature and Governance Systems
 *
 * This module implements comprehensive governance mechanisms including
 * multi-signature wallets, proposal systems, voting mechanisms, and
 * time-locked operations for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
// use std::collections::BTreeMap; // Commented out - using Vec<(K,V)> for Anchor compatibility

// =====================================================
// MULTI-SIGNATURE STRUCTURES
// =====================================================

// =====================================================
// MULTISIG TYPE CLASSIFICATION
// =====================================================

/// MultisigType defines the governance layer a multisig belongs to.
/// Different types have different permissions and requirements.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MultisigType {
    /// Protocol-level security council for emergency actions and upgrades
    /// Requirements: 5-9 signers, high reputation, token holdings
    /// Permissions: Protocol upgrade, emergency freeze, security patches
    Protocol,

    /// Community DAO governance for treasury and parameter changes
    /// Requirements: Token-weighted voting with quorum
    /// Permissions: Treasury allocation, fee parameters, grants
    Dao,

    /// Dispute resolution arbitrators for escrow disputes
    /// Requirements: Staked tokens + reputation-ranked arbitrators
    /// Permissions: Resolve disputes, release escrow, slash reputation
    Dispute,

    /// Multi-agent collaboration treasury
    /// Requirements: Agent owners or agents themselves
    /// Permissions: Shared treasury, collaborative service delivery
    AgentConsortium,

    /// Individual agent earnings management
    /// Requirements: Agent owner + backup + optional agent signer
    /// Permissions: Withdraw earnings, reinvestment
    AgentTreasury,

    /// Generic user-created multisig
    /// Requirements: Standard signer threshold
    /// Permissions: All standard operations
    Custom,
}

impl Default for MultisigType {
    fn default() -> Self {
        MultisigType::Custom
    }
}

/// Metadata and requirements for each MultisigType
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MultisigTypeConfig {
    /// The multisig type
    pub multisig_type: MultisigType,

    /// Required timelock duration in seconds (0 = no timelock)
    pub timelock_seconds: i64,

    /// Minimum number of signers allowed
    pub min_signers: u8,

    /// Maximum number of signers allowed
    pub max_signers: u8,

    /// Minimum reputation score required (0-10000 basis points)
    pub min_reputation_score: u16,

    /// Whether signers must hold governance tokens
    pub requires_token_holdings: bool,

    /// Minimum token balance required (if requires_token_holdings)
    pub min_token_balance: u64,
}

impl MultisigTypeConfig {
    /// Get default config for a MultisigType
    pub fn default_for_type(multisig_type: MultisigType) -> Self {
        match multisig_type {
            MultisigType::Protocol => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 48 * 3600, // 48 hours
                min_signers: 5,
                max_signers: 11,
                min_reputation_score: 9000, // 90%
                requires_token_holdings: true,
                min_token_balance: 50_000_000_000, // 50,000 tokens (6 decimals)
            },
            MultisigType::Dao => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 72 * 3600, // 72 hours
                min_signers: 3,
                max_signers: 20,
                min_reputation_score: 0,
                requires_token_holdings: true,
                min_token_balance: 1_000_000_000, // 1,000 tokens
            },
            MultisigType::Dispute => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 0, // No timelock for quick resolution
                min_signers: 3,
                max_signers: 7,
                min_reputation_score: 8000, // 80%
                requires_token_holdings: true,
                min_token_balance: 10_000_000_000, // 10,000 tokens
            },
            MultisigType::AgentConsortium => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 24 * 3600, // 24 hours
                min_signers: 2,
                max_signers: 10,
                min_reputation_score: 5000, // 50%
                requires_token_holdings: false,
                min_token_balance: 0,
            },
            MultisigType::AgentTreasury => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 0,
                min_signers: 2,
                max_signers: 5,
                min_reputation_score: 0,
                requires_token_holdings: false,
                min_token_balance: 0,
            },
            MultisigType::Custom => MultisigTypeConfig {
                multisig_type,
                timelock_seconds: 24 * 3600, // 24 hours default
                min_signers: 1,
                max_signers: 10,
                min_reputation_score: 0,
                requires_token_holdings: false,
                min_token_balance: 0,
            },
        }
    }
}

/// Multi-signature wallet for governance operations
#[account]
pub struct Multisig {
    /// Unique identifier
    pub multisig_id: u64,

    /// Multisig type classification (Protocol, DAO, Dispute, etc.)
    pub multisig_type: MultisigType,

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

    /// Type-specific configuration
    pub type_config: MultisigTypeConfig,

    /// Reserved space for future extensions
    pub reserved: [u8; 64],
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
    pub daily_limits: Vec<(String, u64)>,
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
    Queued,
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
// EXECUTION QUEUE STRUCTURES
// =====================================================

/// Execution queue for batched proposal execution
#[account]
pub struct ExecutionQueue {
    /// Unique batch ID
    pub batch_id: u64,

    /// Queue creator/executor
    pub executor: Pubkey,

    /// Creation timestamp
    pub created_at: i64,

    /// Last execution timestamp
    pub last_execution_at: Option<i64>,

    /// Queue status
    pub status: ExecutionQueueStatus,

    /// Queued proposals in priority order
    pub queued_proposals: Vec<QueuedProposal>,

    /// Maximum proposals in single batch
    pub max_batch_size: u8,

    /// Auto-execution enabled
    pub auto_execute: bool,

    /// Execution window (seconds)
    pub execution_window: i64,

    /// Reserved space
    pub reserved: [u8; 64],
}

/// Status of execution queue
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExecutionQueueStatus {
    Pending,
    Processing,
    PartiallyExecuted,
    Completed,
    Failed,
    Cancelled,
}

/// Individual queued proposal
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct QueuedProposal {
    /// Proposal account
    pub proposal: Pubkey,

    /// Proposal ID for reference
    pub proposal_id: u64,

    /// Execution priority
    pub priority: TransactionPriority,

    /// Timestamp when queued
    pub queued_at: i64,

    /// Execution status
    pub execution_status: ExecutionStatus,

    /// Execution result
    pub execution_result: Option<ExecutionResult>,
}

/// Execution status for individual proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExecutionStatus {
    Queued,
    Processing,
    Executed,
    Failed,
    Skipped,
}

/// Result of proposal execution
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ExecutionResult {
    /// Whether execution succeeded
    pub success: bool,

    /// Execution timestamp
    pub executed_at: i64,

    /// Error message if failed
    pub error_message: Option<String>,

    /// Gas used (for tracking)
    pub gas_used: u64,
}

// =====================================================
// AUTOMATIC EXECUTION STRUCTURES
// =====================================================

/// Automatic execution trigger configuration
#[account]
pub struct AutoExecutionTrigger {
    /// Trigger ID
    pub trigger_id: u64,

    /// Associated proposal or queue
    pub target: Pubkey,

    /// Trigger type
    pub trigger_type: TriggerType,

    /// Trigger conditions
    pub conditions: Vec<TriggerCondition>,

    /// Is trigger active
    pub active: bool,

    /// Created timestamp
    pub created_at: i64,

    /// Last triggered timestamp
    pub last_triggered_at: Option<i64>,

    /// Maximum trigger count (0 = unlimited)
    pub max_triggers: u32,

    /// Current trigger count
    pub trigger_count: u32,

    /// Reserved
    pub reserved: [u8; 32],
}

/// Types of execution triggers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TriggerType {
    /// Time-based trigger
    TimeBased,
    /// Event-based trigger
    EventBased,
    /// Condition-based trigger
    ConditionBased,
    /// Oracle-based trigger
    OracleBased,
}

/// Individual trigger condition
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TriggerCondition {
    /// Condition type
    pub condition_type: String,

    /// Target value
    pub target_value: Vec<u8>,

    /// Comparison operator
    pub operator: ComparisonOperator,

    /// Is condition met
    pub met: bool,

    /// Last checked timestamp
    pub last_checked_at: Option<i64>,
}

/// Comparison operators for conditions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ComparisonOperator {
    Equal,
    NotEqual,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
}

// =====================================================
// CONSTANTS
// =====================================================

/// Maximum number of signers in multisig
pub const MAX_MULTISIG_SIGNERS: usize = 20;

/// Maximum pending transactions in Multisig account
/// Set to 0 because Solana limits account creation via CPI to 10KB
/// Pending transactions should be stored in separate PDA accounts
/// Each pending transaction is ~13KB which exceeds the CPI limit
pub const MAX_PENDING_TRANSACTIONS: usize = 0;

/// Maximum proposal instructions
pub const MAX_PROPOSAL_INSTRUCTIONS: usize = 2; // Reduced from 10 to fit in account limits

/// Maximum council members
pub const MAX_COUNCIL_MEMBERS: usize = 15;

/// Maximum emergency conditions
pub const MAX_EMERGENCY_CONDITIONS: usize = 20;

/// Maximum voting power multiplier (10x)
pub const MAX_VOTING_POWER_MULTIPLIER: u32 = 100000; // Basis points

/// Maximum proposals in execution queue
pub const MAX_QUEUED_PROPOSALS: usize = 50;

// =====================================================
// ENHANCED VOTING POWER SYSTEM (x402 Marketplace)
// =====================================================

/// Voting power component weights (in basis points, total = 10000)
pub const VOTING_WEIGHT_TOKEN: u16 = 4000;       // 40% - Token balance
pub const VOTING_WEIGHT_REPUTATION: u16 = 2500;  // 25% - Agent reputation
pub const VOTING_WEIGHT_X402_VOLUME: u16 = 2000; // 20% - x402 payment volume
pub const VOTING_WEIGHT_STAKING: u16 = 1500;     // 15% - Staked tokens with lockup

/// Lockup tier thresholds and multipliers
pub const LOCKUP_TIER_NONE: i64 = 0;
pub const LOCKUP_TIER_1_MONTH: i64 = 30 * 24 * 60 * 60;      // 30 days
pub const LOCKUP_TIER_3_MONTHS: i64 = 90 * 24 * 60 * 60;     // 90 days
pub const LOCKUP_TIER_6_MONTHS: i64 = 180 * 24 * 60 * 60;    // 180 days
pub const LOCKUP_TIER_1_YEAR: i64 = 365 * 24 * 60 * 60;      // 365 days
pub const LOCKUP_TIER_2_YEARS: i64 = 730 * 24 * 60 * 60;     // 730 days

/// Lockup multipliers in basis points (10000 = 1.0x)
pub const LOCKUP_MULTIPLIER_NONE: u16 = 10000;       // 1.0x
pub const LOCKUP_MULTIPLIER_1_MONTH: u16 = 11000;    // 1.1x
pub const LOCKUP_MULTIPLIER_3_MONTHS: u16 = 12500;   // 1.25x
pub const LOCKUP_MULTIPLIER_6_MONTHS: u16 = 15000;   // 1.5x
pub const LOCKUP_MULTIPLIER_1_YEAR: u16 = 20000;     // 2.0x
pub const LOCKUP_MULTIPLIER_2_YEARS: u16 = 30000;    // 3.0x

/// Maximum x402 volume voting power (prevents volume dominance)
pub const MAX_X402_VOLUME_POWER: u64 = 1000;

/// x402 volume divisor for voting power (in smallest token units)
/// $10,000 volume = 100 voting power
pub const X402_VOLUME_DIVISOR: u64 = 100_000_000; // Assuming 6 decimals

/// Minimum requirements for voting
pub const MIN_VOTING_POWER: u64 = 100;
pub const MIN_REPUTATION_FOR_VOTE: u16 = 0; // Anyone can vote
pub const MIN_REPUTATION_FOR_PROPOSAL: u16 = 2500; // 25% reputation to create proposals

/// Enhanced voting power input data
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VotingPowerInput {
    /// User's token balance
    pub token_balance: u64,

    /// User's staked tokens
    pub staked_balance: u64,

    /// Lockup duration in seconds (0 if not locked)
    pub lockup_duration: i64,

    /// Agent reputation score (0-10000 basis points, 0 if not an agent)
    pub reputation_score: u16,

    /// Is the user a verified agent (has x402 payment history)
    pub is_verified_agent: bool,

    /// 30-day x402 payment volume in smallest token units
    pub x402_volume_30d: u64,

    /// Voting power delegated to this user
    pub delegated_power: u64,

    /// Voting power this user has delegated out
    pub delegated_out: u64,
}

impl Default for VotingPowerInput {
    fn default() -> Self {
        VotingPowerInput {
            token_balance: 0,
            staked_balance: 0,
            lockup_duration: 0,
            reputation_score: 0,
            is_verified_agent: false,
            x402_volume_30d: 0,
            delegated_power: 0,
            delegated_out: 0,
        }
    }
}

/// Detailed voting power breakdown
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct VotingPowerBreakdown {
    /// Token-based voting power (before weighting)
    pub token_power: u64,

    /// Reputation-based voting power (before weighting)
    pub reputation_power: u64,

    /// x402 volume-based voting power (before weighting)
    pub volume_power: u64,

    /// Staking-based voting power (before weighting)
    pub staking_power: u64,

    /// Lockup multiplier applied (basis points)
    pub lockup_multiplier: u16,

    /// Total weighted voting power (sum of weighted components)
    pub total_power: u64,

    /// Effective voting power (after delegations)
    pub effective_power: u64,

    /// Whether the user can vote
    pub can_vote: bool,
}

/// Calculate lockup multiplier based on duration
pub fn get_lockup_multiplier(lockup_duration: i64) -> u16 {
    if lockup_duration >= LOCKUP_TIER_2_YEARS {
        LOCKUP_MULTIPLIER_2_YEARS
    } else if lockup_duration >= LOCKUP_TIER_1_YEAR {
        LOCKUP_MULTIPLIER_1_YEAR
    } else if lockup_duration >= LOCKUP_TIER_6_MONTHS {
        LOCKUP_MULTIPLIER_6_MONTHS
    } else if lockup_duration >= LOCKUP_TIER_3_MONTHS {
        LOCKUP_MULTIPLIER_3_MONTHS
    } else if lockup_duration >= LOCKUP_TIER_1_MONTH {
        LOCKUP_MULTIPLIER_1_MONTH
    } else {
        LOCKUP_MULTIPLIER_NONE
    }
}

/// Calculate integer square root for token voting power
/// Uses Newton's method for efficiency
fn isqrt(n: u64) -> u64 {
    if n < 2 {
        return n;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

/// Calculate enhanced voting power with all components
/// 
/// Formula:
/// Voting Power = (Token × 0.40) + (Reputation × 0.25) + (x402Volume × 0.20) + (Staking × 0.15)
/// 
/// Where:
/// - Token uses square-root voting to reduce whale dominance
/// - Reputation is only counted for verified agents
/// - x402Volume rewards active marketplace participants
/// - Staking applies lockup multipliers
pub fn calculate_enhanced_voting_power(input: &VotingPowerInput) -> VotingPowerBreakdown {
    let mut breakdown = VotingPowerBreakdown::default();

    // 1. Token-based voting power (square root to reduce whale dominance)
    // sqrt(1,000,000 tokens) = 1000 power
    breakdown.token_power = isqrt(input.token_balance);

    // 2. Reputation-based voting power (only for verified agents)
    // reputation_score is 0-10000 basis points
    // 10000 bp = 100% = 1000 voting power
    if input.is_verified_agent && input.reputation_score > 0 {
        breakdown.reputation_power = (input.reputation_score as u64) / 10;
    }

    // 3. x402 Volume-based voting power
    // $10,000 volume = 100 voting power, capped at 1000
    if input.x402_volume_30d > 0 {
        let volume_power = input.x402_volume_30d / X402_VOLUME_DIVISOR;
        breakdown.volume_power = core::cmp::min(volume_power, MAX_X402_VOLUME_POWER);
    }

    // 4. Staking-based voting power with lockup multiplier
    breakdown.lockup_multiplier = get_lockup_multiplier(input.lockup_duration);
    if input.staked_balance > 0 {
        let base_staking_power = isqrt(input.staked_balance);
        // Apply lockup multiplier
        breakdown.staking_power = ((base_staking_power as u128 * breakdown.lockup_multiplier as u128) / 10000) as u64;
    }

    // Calculate weighted total
    let weighted_token = (breakdown.token_power as u128 * VOTING_WEIGHT_TOKEN as u128) / 10000;
    let weighted_reputation = (breakdown.reputation_power as u128 * VOTING_WEIGHT_REPUTATION as u128) / 10000;
    let weighted_volume = (breakdown.volume_power as u128 * VOTING_WEIGHT_X402_VOLUME as u128) / 10000;
    let weighted_staking = (breakdown.staking_power as u128 * VOTING_WEIGHT_STAKING as u128) / 10000;

    breakdown.total_power = (weighted_token + weighted_reputation + weighted_volume + weighted_staking) as u64;

    // Calculate effective power (including delegations)
    breakdown.effective_power = breakdown
        .total_power
        .saturating_add(input.delegated_power)
        .saturating_sub(input.delegated_out);

    // Can vote if meets minimum threshold
    breakdown.can_vote = breakdown.effective_power >= MIN_VOTING_POWER;

    breakdown
}

/// VotingPowerEvent emitted when voting power is calculated
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VotingPowerCalculatedEvent {
    pub voter: Pubkey,
    pub token_power: u64,
    pub reputation_power: u64,
    pub volume_power: u64,
    pub staking_power: u64,
    pub lockup_multiplier: u16,
    pub total_power: u64,
    pub effective_power: u64,
    pub timestamp: i64,
}

/// Maximum trigger conditions
pub const MAX_TRIGGER_CONDITIONS: usize = 10;

// =====================================================
// SPACE CALCULATIONS
// =====================================================

impl Multisig {
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // multisig_id
        1 + // multisig_type (enum)
        1 + // threshold
        4 + (MAX_MULTISIG_SIGNERS * 32) + // signers
        32 + // owner
        8 + // created_at
        8 + // updated_at
        8 + // nonce
        4 + (MAX_PENDING_TRANSACTIONS * PendingTransaction::size()) + // pending_transactions
        MultisigConfig::size() + // config
        EmergencyConfig::size() + // emergency_config
        MultisigTypeConfig::size() + // type_config
        64 // reserved (reduced from 128 to accommodate new fields)
    }
}

impl MultisigTypeConfig {
    pub const fn size() -> usize {
        1 + // multisig_type
        8 + // timelock_seconds
        1 + // min_signers
        1 + // max_signers
        2 + // min_reputation_score
        1 + // requires_token_holdings
        8   // min_token_balance
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
        4 + 64 + // title (reduced from 256)
        4 + 256 + // description (reduced from 2048)
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
        32 // reserved (reduced)
    }
}

impl VotingResults {
    pub const fn size() -> usize {
        8 + // votes_for
        8 + // votes_against
        8 + // votes_abstain
        8 + // total_voting_power
        1 + // participation_rate
        4 + (10 * Vote::size()) + // individual_votes (max 10 inline, rest stored separately)
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
        1 + 4 + 64 + // reasoning (reduced from 512)
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
        4 + (5 * ProposalAccount::size()) + // accounts (reduced from 20)
        4 + 256 + // data (reduced from 1024)
        4 + 64 // description (reduced from 256)
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
        1 + 4 + 64 + // ipfs_hash (reduced)
        4 + (3 * (4 + 64)) + // external_references (reduced from 10 * 260)
        4 + (5 * (4 + 32)) + // tags (reduced from 20 * 68)
        1 + 4 + 128 + // risk_assessment (reduced)
        1 + 4 + 128 + // impact_analysis (reduced)
        1 + 4 + 64 // implementation_timeline (reduced)
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

impl ExecutionQueue {
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // batch_id
        32 + // executor
        8 + // created_at
        1 + 8 + // last_execution_at
        1 + // status
        4 + (MAX_QUEUED_PROPOSALS * QueuedProposal::size()) + // queued_proposals
        1 + // max_batch_size
        1 + // auto_execute
        8 + // execution_window
        64 // reserved
    }
}

impl QueuedProposal {
    pub const fn size() -> usize {
        32 + // proposal
        8 + // proposal_id
        1 + // priority
        8 + // queued_at
        1 + // execution_status
        1 + ExecutionResult::size() // execution_result
    }
}

impl ExecutionResult {
    pub const fn size() -> usize {
        1 + // success
        8 + // executed_at
        1 + 4 + 256 + // error_message
        8 // gas_used
    }
}

impl AutoExecutionTrigger {
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // trigger_id
        32 + // target
        1 + // trigger_type
        4 + (MAX_TRIGGER_CONDITIONS * TriggerCondition::size()) + // conditions
        1 + // active
        8 + // created_at
        1 + 8 + // last_triggered_at
        4 + // max_triggers
        4 + // trigger_count
        32 // reserved
    }
}

impl TriggerCondition {
    pub const fn size() -> usize {
        4 + 64 + // condition_type
        4 + 256 + // target_value
        1 + // operator
        1 + // met
        1 + 8 // last_checked_at
    }
}
