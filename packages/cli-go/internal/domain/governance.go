package domain

import (
	"fmt"
	"time"
)

// ProposalStatus represents the status of a governance proposal
type ProposalStatus string

const (
	ProposalStatusActive   ProposalStatus = "active"
	ProposalStatusPassed   ProposalStatus = "passed"
	ProposalStatusFailed   ProposalStatus = "failed"
	ProposalStatusExecuted ProposalStatus = "executed"
	ProposalStatusCanceled ProposalStatus = "canceled"
)

// ProposalType represents the type of proposal
type ProposalType string

const (
	ProposalTypeParameterChange ProposalType = "parameter_change"
	ProposalTypeTreasurySpend   ProposalType = "treasury_spend"
	ProposalTypeUpgradeProgram  ProposalType = "upgrade_program"
	ProposalTypeEmergency       ProposalType = "emergency"
	ProposalTypeGeneral         ProposalType = "general"
)

// VoteChoice represents a vote choice
type VoteChoice string

const (
	VoteChoiceFor     VoteChoice = "for"
	VoteChoiceAgainst VoteChoice = "against"
	VoteChoiceAbstain VoteChoice = "abstain"
)

// Role represents a governance role for RBAC
type Role string

const (
	RoleAdmin     Role = "admin"     // Full administrative access
	RoleModerator Role = "moderator" // Content moderation and proposal management
	RoleVerifier  Role = "verifier"  // Can verify agents and credentials
	RoleUser      Role = "user"      // Basic user permissions
)

// Permission represents an action that can be performed
type Permission string

const (
	PermissionCreateProposal   Permission = "create_proposal"
	PermissionVote             Permission = "vote"
	PermissionExecuteProposal  Permission = "execute_proposal"
	PermissionCancelProposal   Permission = "cancel_proposal"
	PermissionVetoProposal     Permission = "veto_proposal"
	PermissionGrantRole        Permission = "grant_role"
	PermissionRevokeRole       Permission = "revoke_role"
	PermissionVerifyAgent      Permission = "verify_agent"
	PermissionManageTreasury   Permission = "manage_treasury"
	PermissionUpgradeProgram   Permission = "upgrade_program"
	PermissionEmergencyAction  Permission = "emergency_action"
)

// Proposal represents a governance proposal
type Proposal struct {
	// Identity
	ID        string         `json:"id"`
	Proposer  string         `json:"proposer"`
	Type      ProposalType   `json:"type"`
	Status    ProposalStatus `json:"status"`

	// Content
	Title       string `json:"title"`
	Description string `json:"description"`
	Actions     string `json:"actions,omitempty"` // JSON-encoded actions

	// Voting
	VotingStartsAt time.Time `json:"votingStartsAt"`
	VotingEndsAt   time.Time `json:"votingEndsAt"`
	VotesFor       uint64    `json:"votesFor"`       // Weighted votes
	VotesAgainst   uint64    `json:"votesAgainst"`
	VotesAbstain   uint64    `json:"votesAbstain"`
	QuorumRequired uint64    `json:"quorumRequired"` // Minimum votes needed

	// Execution
	ExecutedAt *time.Time `json:"executedAt,omitempty"`
	CanceledAt *time.Time `json:"canceledAt,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// On-chain data
	PDA string `json:"pda"`
}

// Vote represents a user's vote on a proposal
type Vote struct {
	ProposalID string     `json:"proposalId"`
	Voter      string     `json:"voter"`
	Choice     VoteChoice `json:"choice"`
	Weight     uint64     `json:"weight"`     // Voting power (based on stake)
	VotedAt    time.Time  `json:"votedAt"`
}

// MultisigWallet represents a multisig governance wallet
type MultisigWallet struct {
	// On-chain data
	Address   string    `json:"address"`   // Multisig wallet address
	PDA       string    `json:"pda"`       // Program derived address
	Owners    []string  `json:"owners"`    // List of owner addresses
	Threshold uint8     `json:"threshold"` // Minimum signatures required
	Nonce     uint64    `json:"nonce"`     // Transaction nonce
	CreatedAt time.Time `json:"createdAt"`

	// Derived data
	ProposalCount    uint64 `json:"proposalCount"`    // Total proposals created
	ExecutedCount    uint64 `json:"executedCount"`    // Total proposals executed
	TreasuryBalance  uint64 `json:"treasuryBalance"`  // Treasury balance in lamports
}

// RoleAssignment represents a role assignment for RBAC
type RoleAssignment struct {
	Address    string    `json:"address"`    // Address with role
	Role       Role      `json:"role"`       // Assigned role
	GrantedBy  string    `json:"grantedBy"`  // Who granted the role
	GrantedAt  time.Time `json:"grantedAt"`  // When role was granted
	ExpiresAt  *time.Time `json:"expiresAt,omitempty"` // Optional expiration
	Active     bool      `json:"active"`     // Whether role is currently active
	PDA        string    `json:"pda"`        // On-chain PDA
}

// CreateProposalParams represents parameters for creating a proposal
type CreateProposalParams struct {
	Type        ProposalType
	Title       string
	Description string
	Actions     string // JSON-encoded actions
	VotingPeriod uint64 // Voting period in seconds
	MultisigAddress string // Optional multisig wallet
}

// VoteParams represents parameters for voting
type VoteParams struct {
	ProposalPDA string
	Choice      VoteChoice
}

// CancelProposalParams represents parameters for canceling a proposal
type CancelProposalParams struct {
	ProposalPDA string
}

// ExecuteProposalParams represents parameters for executing a proposal
type ExecuteProposalParams struct {
	ProposalPDA string
}

// CreateMultisigParams represents parameters for creating a multisig wallet
type CreateMultisigParams struct {
	Owners    []string
	Threshold uint8
}

// GrantRoleParams represents parameters for granting a role
type GrantRoleParams struct {
	Address   string
	Role      Role
	ExpiresAt *time.Time
}

// RevokeRoleParams represents parameters for revoking a role
type RevokeRoleParams struct {
	Address string
	Role    Role
}

// GetTotalVotes returns the total number of votes
func (p *Proposal) GetTotalVotes() uint64 {
	return p.VotesFor + p.VotesAgainst + p.VotesAbstain
}

// GetQuorumProgress returns the quorum progress percentage
func (p *Proposal) GetQuorumProgress() float64 {
	if p.QuorumRequired == 0 {
		return 0
	}
	return float64(p.GetTotalVotes()) / float64(p.QuorumRequired) * 100.0
}

// GetApprovalRate returns the approval rate (for votes / total votes)
func (p *Proposal) GetApprovalRate() float64 {
	total := p.VotesFor + p.VotesAgainst
	if total == 0 {
		return 0
	}
	return float64(p.VotesFor) / float64(total) * 100.0
}

// HasQuorum checks if the proposal has reached quorum
func (p *Proposal) HasQuorum() bool {
	return p.GetTotalVotes() >= p.QuorumRequired
}

// IsApproved checks if the proposal is approved (>50% for votes)
func (p *Proposal) IsApproved() bool {
	return p.GetApprovalRate() > 50.0
}

// CanVote checks if voting is currently active
func (p *Proposal) CanVote() bool {
	now := time.Now()
	return p.Status == ProposalStatusActive &&
		now.After(p.VotingStartsAt) &&
		now.Before(p.VotingEndsAt)
}

// GetTimeRemaining returns the time remaining for voting
func (p *Proposal) GetTimeRemaining() time.Duration {
	if p.Status != ProposalStatusActive {
		return 0
	}

	remaining := time.Until(p.VotingEndsAt)
	if remaining < 0 {
		return 0
	}

	return remaining
}

// ValidateCreateProposalParams validates proposal creation parameters
func ValidateCreateProposalParams(params CreateProposalParams) error {
	if params.Title == "" {
		return fmt.Errorf("title is required")
	}
	if len(params.Title) > 200 {
		return fmt.Errorf("title must be less than 200 characters")
	}
	if params.Description == "" {
		return fmt.Errorf("description is required")
	}
	if len(params.Description) > 2000 {
		return fmt.Errorf("description must be less than 2000 characters")
	}
	if params.VotingPeriod < 86400 { // Minimum 1 day
		return fmt.Errorf("voting period must be at least 1 day")
	}
	if params.VotingPeriod > 30*86400 { // Maximum 30 days
		return fmt.Errorf("voting period must be less than 30 days")
	}
	return nil
}

// ValidateMultisigParams validates multisig creation parameters
func ValidateMultisigParams(params CreateMultisigParams) error {
	if len(params.Owners) < 2 {
		return ErrInsufficientOwners
	}
	if len(params.Owners) > 10 {
		return ErrTooManyOwners
	}
	if params.Threshold == 0 {
		return ErrInvalidThreshold
	}
	if params.Threshold > uint8(len(params.Owners)) {
		return ErrThresholdTooHigh
	}
	return nil
}

// GetRolePermissions returns the permissions for a role
func GetRolePermissions(role Role) []Permission {
	switch role {
	case RoleAdmin:
		return []Permission{
			PermissionCreateProposal,
			PermissionVote,
			PermissionExecuteProposal,
			PermissionCancelProposal,
			PermissionVetoProposal,
			PermissionGrantRole,
			PermissionRevokeRole,
			PermissionVerifyAgent,
			PermissionManageTreasury,
			PermissionUpgradeProgram,
			PermissionEmergencyAction,
		}
	case RoleModerator:
		return []Permission{
			PermissionCreateProposal,
			PermissionVote,
			PermissionCancelProposal,
			PermissionVerifyAgent,
		}
	case RoleVerifier:
		return []Permission{
			PermissionVote,
			PermissionVerifyAgent,
		}
	case RoleUser:
		return []Permission{
			PermissionVote,
		}
	default:
		return []Permission{}
	}
}

// HasPermission checks if a role has a specific permission
func HasPermission(role Role, permission Permission) bool {
	permissions := GetRolePermissions(role)
	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// Governance-related errors
var (
	// Proposal errors
	ErrProposalNotFound  = fmt.Errorf("proposal not found")
	ErrVotingClosed      = fmt.Errorf("voting period has ended")
	ErrVotingNotStarted  = fmt.Errorf("voting period has not started")
	ErrAlreadyVoted      = fmt.Errorf("already voted on this proposal")
	ErrInsufficientVotingTokens = fmt.Errorf("insufficient voting tokens")
	ErrProposalExecuted  = fmt.Errorf("proposal already executed")
	ErrProposalCanceled  = fmt.Errorf("proposal has been canceled")
	ErrQuorumNotReached  = fmt.Errorf("quorum not reached")

	// Multisig errors
	ErrInsufficientOwners    = fmt.Errorf("multisig requires at least 2 owners")
	ErrTooManyOwners         = fmt.Errorf("multisig cannot have more than 10 owners")
	ErrInvalidThreshold      = fmt.Errorf("threshold must be greater than 0")
	ErrThresholdTooHigh      = fmt.Errorf("threshold cannot exceed number of owners")
	ErrMultisigNotFound      = fmt.Errorf("multisig wallet not found")

	// RBAC errors
	ErrInvalidRole          = fmt.Errorf("invalid role")
	ErrPermissionDenied     = fmt.Errorf("permission denied")
	ErrRoleNotFound         = fmt.Errorf("role assignment not found")
	ErrCannotRevokeOwnRole  = fmt.Errorf("cannot revoke your own role")
	ErrRoleAlreadyAssigned  = fmt.Errorf("role already assigned")
)
