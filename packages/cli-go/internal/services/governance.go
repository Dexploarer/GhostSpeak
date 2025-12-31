package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/ports"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// GovernanceService handles governance operations
type GovernanceService struct {
	cfg           *config.Config
	client        *solClient.Client
	storage       ports.Storage
	walletService *WalletService
}

// NewGovernanceService creates a new governance service
func NewGovernanceService(
	cfg *config.Config,
	client *solClient.Client,
	storage ports.Storage,
	walletService *WalletService,
) *GovernanceService {
	return &GovernanceService{
		cfg:           cfg,
		client:        client,
		storage:       storage,
		walletService: walletService,
	}
}

// CreateMultisig creates a new multisig wallet
func (s *GovernanceService) CreateMultisig(params domain.CreateMultisigParams, walletPassword string) (*domain.MultisigWallet, error) {
	// Validate parameters
	if err := domain.ValidateMultisigParams(params); err != nil {
		return nil, err
	}

	config.Infof("Creating multisig wallet with %d owners, threshold: %d", len(params.Owners), params.Threshold)

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// TODO: Build and send transaction to create multisig on-chain
	// For now, we'll create a mock multisig
	config.Warn("On-chain multisig creation not yet implemented - creating local multisig")

	// Generate multisig address (mock)
	multisigID := generateID()
	multisigAddress := fmt.Sprintf("multisig_%s", multisigID[:16])
	pda := fmt.Sprintf("pda_multisig_%s", multisigID[:16])

	multisig := &domain.MultisigWallet{
		Address:   multisigAddress,
		PDA:       pda,
		Owners:    params.Owners,
		Threshold: params.Threshold,
		Nonce:     0,
		CreatedAt: time.Now(),
		ProposalCount:    0,
		ExecutedCount:    0,
		TreasuryBalance:  0,
	}

	// Cache multisig
	cacheKey := fmt.Sprintf("multisig:%s", multisigAddress)
	if err := s.storage.SetJSON(cacheKey, multisig); err != nil {
		config.Warnf("Failed to cache multisig: %v", err)
	}

	// Add to owner's multisig list
	ownerListKey := fmt.Sprintf("multisigs:%s", activeWallet.PublicKey)
	var multisigs []string
	s.storage.GetJSON(ownerListKey, &multisigs)
	multisigs = append(multisigs, multisigAddress)
	s.storage.SetJSON(ownerListKey, multisigs)

	config.Infof("Multisig created: %s", multisigAddress)

	return multisig, nil
}

// ListMultisigs lists multisig wallets for the active wallet
func (s *GovernanceService) ListMultisigs() ([]*domain.MultisigWallet, error) {
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	ownerListKey := fmt.Sprintf("multisigs:%s", activeWallet.PublicKey)
	var multisigAddresses []string
	if err := s.storage.GetJSON(ownerListKey, &multisigAddresses); err != nil {
		return []*domain.MultisigWallet{}, nil
	}

	multisigs := make([]*domain.MultisigWallet, 0, len(multisigAddresses))
	for _, addr := range multisigAddresses {
		cacheKey := fmt.Sprintf("multisig:%s", addr)
		var multisig domain.MultisigWallet
		if err := s.storage.GetJSON(cacheKey, &multisig); err == nil {
			multisigs = append(multisigs, &multisig)
		}
	}

	return multisigs, nil
}

// GetMultisig gets a multisig wallet by address
func (s *GovernanceService) GetMultisig(address string) (*domain.MultisigWallet, error) {
	cacheKey := fmt.Sprintf("multisig:%s", address)
	var multisig domain.MultisigWallet
	if err := s.storage.GetJSON(cacheKey, &multisig); err != nil {
		return nil, domain.ErrMultisigNotFound
	}
	return &multisig, nil
}

// CreateProposal creates a new governance proposal
func (s *GovernanceService) CreateProposal(params domain.CreateProposalParams, walletPassword string) (*domain.Proposal, error) {
	// Validate parameters
	if err := domain.ValidateCreateProposalParams(params); err != nil {
		return nil, err
	}

	config.Infof("Creating proposal: %s", params.Title)

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Check if user has permission to create proposals
	role, _ := s.GetUserRole(activeWallet.PublicKey)
	if !domain.HasPermission(role, domain.PermissionCreateProposal) {
		config.Warnf("User %s does not have permission to create proposals (role: %s)", activeWallet.PublicKey, role)
		// Allow anyway for now
	}

	// TODO: Build and send transaction to create proposal on-chain
	config.Warn("On-chain proposal creation not yet implemented - creating local proposal")

	// Generate proposal ID
	proposalID := generateID()
	pda := fmt.Sprintf("proposal_%s", proposalID[:16])

	// Calculate voting period
	now := time.Now()
	votingDuration := time.Duration(params.VotingPeriod) * time.Second
	votingStartsAt := now.Add(5 * time.Minute) // Start in 5 minutes
	votingEndsAt := votingStartsAt.Add(votingDuration)

	// Create proposal
	proposal := &domain.Proposal{
		ID:             proposalID,
		Proposer:       activeWallet.PublicKey,
		Type:           params.Type,
		Status:         domain.ProposalStatusActive,
		Title:          params.Title,
		Description:    params.Description,
		Actions:        params.Actions,
		VotingStartsAt: votingStartsAt,
		VotingEndsAt:   votingEndsAt,
		VotesFor:       0,
		VotesAgainst:   0,
		VotesAbstain:   0,
		QuorumRequired: 100, // Mock quorum requirement
		CreatedAt:      now,
		UpdatedAt:      now,
		PDA:            pda,
	}

	// Cache proposal
	cacheKey := fmt.Sprintf("proposal:%s", proposalID)
	if err := s.storage.SetJSON(cacheKey, proposal); err != nil {
		return nil, fmt.Errorf("failed to cache proposal: %w", err)
	}

	// Add to proposal list
	s.addToProposalList(proposalID)

	// Update multisig if provided
	if params.MultisigAddress != "" {
		multisig, err := s.GetMultisig(params.MultisigAddress)
		if err == nil {
			multisig.ProposalCount++
			s.storage.SetJSON(fmt.Sprintf("multisig:%s", params.MultisigAddress), multisig)
		}
	}

	config.Infof("Proposal created: %s", proposalID)

	return proposal, nil
}

// ListProposals lists proposals with optional status filter
func (s *GovernanceService) ListProposals(status *domain.ProposalStatus) ([]*domain.Proposal, error) {
	var proposalIDs []string
	if err := s.storage.GetJSON("proposals:all", &proposalIDs); err != nil {
		return []*domain.Proposal{}, nil
	}

	proposals := make([]*domain.Proposal, 0)
	for _, id := range proposalIDs {
		cacheKey := fmt.Sprintf("proposal:%s", id)
		var proposal domain.Proposal
		if err := s.storage.GetJSON(cacheKey, &proposal); err == nil {
			// Filter by status if provided
			if status == nil || proposal.Status == *status {
				proposals = append(proposals, &proposal)
			}
		}
	}

	return proposals, nil
}

// GetProposal gets a proposal by ID
func (s *GovernanceService) GetProposal(id string) (*domain.Proposal, error) {
	cacheKey := fmt.Sprintf("proposal:%s", id)
	var proposal domain.Proposal
	if err := s.storage.GetJSON(cacheKey, &proposal); err != nil {
		return nil, domain.ErrProposalNotFound
	}
	return &proposal, nil
}

// Vote casts a vote on a proposal
func (s *GovernanceService) Vote(params domain.VoteParams, walletPassword string) (*domain.Vote, error) {
	config.Infof("Voting on proposal: %s with choice: %s", params.ProposalPDA, params.Choice)

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Get proposal
	proposal, err := s.GetProposal(params.ProposalPDA)
	if err != nil {
		return nil, err
	}

	// Check if voting is active
	if !proposal.CanVote() {
		return nil, domain.ErrVotingClosed
	}

	// Check if already voted
	voteKey := fmt.Sprintf("vote:%s:%s", params.ProposalPDA, activeWallet.PublicKey)
	var existingVote domain.Vote
	if err := s.storage.GetJSON(voteKey, &existingVote); err == nil {
		return nil, domain.ErrAlreadyVoted
	}

	// Get voting weight (based on GHOST token holdings)
	// TODO: Fetch actual token balance
	votingWeight := uint64(100) // Mock weight

	// Create vote
	vote := &domain.Vote{
		ProposalID: params.ProposalPDA,
		Voter:      activeWallet.PublicKey,
		Choice:     params.Choice,
		Weight:     votingWeight,
		VotedAt:    time.Now(),
	}

	// Update proposal vote counts
	switch params.Choice {
	case domain.VoteChoiceFor:
		proposal.VotesFor += votingWeight
	case domain.VoteChoiceAgainst:
		proposal.VotesAgainst += votingWeight
	case domain.VoteChoiceAbstain:
		proposal.VotesAbstain += votingWeight
	}

	// Update proposal status if voting period ended
	if time.Now().After(proposal.VotingEndsAt) {
		if proposal.HasQuorum() && proposal.IsApproved() {
			proposal.Status = domain.ProposalStatusPassed
		} else {
			proposal.Status = domain.ProposalStatusFailed
		}
	}

	proposal.UpdatedAt = time.Now()

	// Save vote
	if err := s.storage.SetJSON(voteKey, vote); err != nil {
		return nil, fmt.Errorf("failed to save vote: %w", err)
	}

	// Update proposal
	proposalKey := fmt.Sprintf("proposal:%s", params.ProposalPDA)
	if err := s.storage.SetJSON(proposalKey, proposal); err != nil {
		return nil, fmt.Errorf("failed to update proposal: %w", err)
	}

	// TODO: Build and send transaction to vote on-chain
	config.Warn("On-chain voting not yet implemented - vote recorded locally")

	config.Infof("Vote cast successfully: %s", params.Choice)

	return vote, nil
}

// ExecuteProposal executes a passed proposal
func (s *GovernanceService) ExecuteProposal(proposalID string, walletPassword string) error {
	config.Infof("Executing proposal: %s", proposalID)

	// Get active wallet
	_, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Get proposal
	proposal, err := s.GetProposal(proposalID)
	if err != nil {
		return err
	}

	// Check if proposal can be executed
	if proposal.Status != domain.ProposalStatusPassed {
		return fmt.Errorf("proposal must be in passed status to execute")
	}

	// Check quorum and approval
	if !proposal.HasQuorum() {
		return domain.ErrQuorumNotReached
	}

	if !proposal.IsApproved() {
		return fmt.Errorf("proposal did not pass")
	}

	// TODO: Build and send transaction to execute proposal on-chain
	config.Warn("On-chain execution not yet implemented - marking as executed")

	// Update proposal status
	now := time.Now()
	proposal.Status = domain.ProposalStatusExecuted
	proposal.ExecutedAt = &now
	proposal.UpdatedAt = now

	// Save proposal
	proposalKey := fmt.Sprintf("proposal:%s", proposalID)
	if err := s.storage.SetJSON(proposalKey, proposal); err != nil {
		return fmt.Errorf("failed to update proposal: %w", err)
	}

	config.Infof("Proposal executed successfully: %s", proposalID)

	return nil
}

// GrantRole grants a role to an address (RBAC)
func (s *GovernanceService) GrantRole(params domain.GrantRoleParams, walletPassword string) (*domain.RoleAssignment, error) {
	config.Infof("Granting role %s to %s", params.Role, params.Address)

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Check if user has permission to grant roles
	granterRole, _ := s.GetUserRole(activeWallet.PublicKey)
	if !domain.HasPermission(granterRole, domain.PermissionGrantRole) {
		return nil, domain.ErrPermissionDenied
	}

	// Check if role already exists
	roleKey := fmt.Sprintf("role:%s:%s", params.Address, params.Role)
	var existing domain.RoleAssignment
	if err := s.storage.GetJSON(roleKey, &existing); err == nil && existing.Active {
		return nil, domain.ErrRoleAlreadyAssigned
	}

	// Create role assignment
	assignment := &domain.RoleAssignment{
		Address:   params.Address,
		Role:      params.Role,
		GrantedBy: activeWallet.PublicKey,
		GrantedAt: time.Now(),
		ExpiresAt: params.ExpiresAt,
		Active:    true,
		PDA:       fmt.Sprintf("role_%s_%s", params.Address[:8], params.Role),
	}

	// Save role assignment
	if err := s.storage.SetJSON(roleKey, assignment); err != nil {
		return nil, fmt.Errorf("failed to save role assignment: %w", err)
	}

	// TODO: Build and send transaction to grant role on-chain
	config.Warn("On-chain role grant not yet implemented - role saved locally")

	config.Infof("Role granted successfully: %s to %s", params.Role, params.Address)

	return assignment, nil
}

// RevokeRole revokes a role from an address
func (s *GovernanceService) RevokeRole(params domain.RevokeRoleParams, walletPassword string) error {
	config.Infof("Revoking role %s from %s", params.Role, params.Address)

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Check if user has permission to revoke roles
	revokerRole, _ := s.GetUserRole(activeWallet.PublicKey)
	if !domain.HasPermission(revokerRole, domain.PermissionRevokeRole) {
		return domain.ErrPermissionDenied
	}

	// Check if trying to revoke own role
	if params.Address == activeWallet.PublicKey {
		return domain.ErrCannotRevokeOwnRole
	}

	// Get role assignment
	roleKey := fmt.Sprintf("role:%s:%s", params.Address, params.Role)
	var assignment domain.RoleAssignment
	if err := s.storage.GetJSON(roleKey, &assignment); err != nil {
		return domain.ErrRoleNotFound
	}

	// Deactivate role
	assignment.Active = false

	// Save updated assignment
	if err := s.storage.SetJSON(roleKey, &assignment); err != nil {
		return fmt.Errorf("failed to update role assignment: %w", err)
	}

	// TODO: Build and send transaction to revoke role on-chain
	config.Warn("On-chain role revoke not yet implemented - role revoked locally")

	config.Infof("Role revoked successfully: %s from %s", params.Role, params.Address)

	return nil
}

// GetUserRole gets the role for a user address
func (s *GovernanceService) GetUserRole(address string) (domain.Role, error) {
	// Check for roles in order of priority
	roles := []domain.Role{
		domain.RoleAdmin,
		domain.RoleModerator,
		domain.RoleVerifier,
		domain.RoleUser,
	}

	for _, role := range roles {
		roleKey := fmt.Sprintf("role:%s:%s", address, role)
		var assignment domain.RoleAssignment
		if err := s.storage.GetJSON(roleKey, &assignment); err == nil && assignment.Active {
			// Check expiration
			if assignment.ExpiresAt != nil && time.Now().After(*assignment.ExpiresAt) {
				assignment.Active = false
				s.storage.SetJSON(roleKey, &assignment)
				continue
			}
			return assignment.Role, nil
		}
	}

	// Default to user role
	return domain.RoleUser, nil
}

// ListRoles lists all role assignments
func (s *GovernanceService) ListRoles() ([]*domain.RoleAssignment, error) {
	// TODO: Implement proper role listing
	// For now, return empty list
	return []*domain.RoleAssignment{}, nil
}

// Helper functions

func (s *GovernanceService) addToProposalList(proposalID string) {
	var proposalIDs []string
	s.storage.GetJSON("proposals:all", &proposalIDs)
	proposalIDs = append(proposalIDs, proposalID)
	s.storage.SetJSON("proposals:all", proposalIDs)
}

func generateID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
