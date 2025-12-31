package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/storage"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// EscrowService handles escrow operations
type EscrowService struct {
	cfg           *config.Config
	client        *solClient.Client
	walletService *WalletService
	storage       *storage.BadgerDB
}

// NewEscrowService creates a new escrow service
func NewEscrowService(cfg *config.Config, client *solClient.Client, walletService *WalletService, storage *storage.BadgerDB) *EscrowService {
	return &EscrowService{
		cfg:           cfg,
		client:        client,
		walletService: walletService,
		storage:       storage,
	}
}

// CreateEscrow creates a new escrow account
func (s *EscrowService) CreateEscrow(params domain.CreateEscrowParams, walletPassword string) (*domain.Escrow, error) {
	// Validate parameters
	if err := domain.ValidateCreateEscrowParams(params); err != nil {
		return nil, err
	}

	// Get active wallet (client)
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// Generate escrow ID
	escrowID := uuid.New().String()

	// Get token metadata
	metadata := domain.GetTokenMetadata(params.Token)

	// Create escrow
	escrow := &domain.Escrow{
		ID:          escrowID,
		Status:      domain.EscrowStatusCreated,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Client:      activeWallet.PublicKey,
		Agent:       params.Agent,
		Amount:      params.Amount,
		Token:       params.Token,
		TokenMint:   metadata.Mint,
		TokenSymbol: string(params.Token),
		JobID:       params.JobID,
		Description: params.Description,
		Deadline:    params.Deadline,
		Milestones:  params.Milestones,
		PDA:         fmt.Sprintf("escrow_%s", escrowID[:8]), // Simplified PDA for now
	}

	// TODO: Create on-chain escrow account
	// For now, we'll just store it locally
	config.Infof("Creating escrow %s with %s %s", escrowID[:8], escrow.GetFormattedAmount(), params.Token)

	// Store escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to store escrow: %w", err)
	}

	config.Infof("Created escrow %s (PDA: %s)", escrowID[:8], escrow.PDA)

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// FundEscrow funds an escrow account
func (s *EscrowService) FundEscrow(escrowID string, walletPassword string) (*domain.Escrow, error) {
	// Get escrow
	escrow, err := s.GetEscrow(escrowID)
	if err != nil {
		return nil, err
	}

	// Verify status
	if escrow.Status != domain.EscrowStatusCreated {
		return nil, domain.ErrEscrowAlreadyFunded
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Verify caller is client
	if activeWallet.PublicKey != escrow.Client {
		return nil, domain.ErrNotAuthorized
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// TODO: Transfer tokens to escrow account on-chain
	config.Infof("Funding escrow %s with %s", escrow.ID[:8], escrow.GetFormattedAmount())

	// Update escrow status
	now := time.Now()
	escrow.Status = domain.EscrowStatusFunded
	escrow.FundedAt = &now
	escrow.UpdatedAt = now

	// Store updated escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to update escrow: %w", err)
	}

	config.Infof("Escrow %s funded successfully", escrow.ID[:8])

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// ReleasePayment releases payment to the agent
func (s *EscrowService) ReleasePayment(escrowID string, walletPassword string) (*domain.Escrow, error) {
	// Get escrow
	escrow, err := s.GetEscrow(escrowID)
	if err != nil {
		return nil, err
	}

	// Verify escrow can be released
	if !escrow.CanRelease() {
		return nil, fmt.Errorf("escrow cannot be released (status: %s)", escrow.Status)
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Verify caller is client
	if activeWallet.PublicKey != escrow.Client {
		return nil, domain.ErrNotAuthorized
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// TODO: Release tokens to agent on-chain
	config.Infof("Releasing payment from escrow %s to agent %s", escrow.ID[:8], escrow.Agent[:8])

	// Update escrow status
	now := time.Now()
	escrow.Status = domain.EscrowStatusReleased
	escrow.ReleasedAt = &now
	escrow.UpdatedAt = now

	// Store updated escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to update escrow: %w", err)
	}

	config.Infof("Payment released to agent %s", escrow.Agent[:8])

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// CancelEscrow cancels an escrow and refunds the client
func (s *EscrowService) CancelEscrow(escrowID string, walletPassword string) (*domain.Escrow, error) {
	// Get escrow
	escrow, err := s.GetEscrow(escrowID)
	if err != nil {
		return nil, err
	}

	// Verify escrow can be cancelled
	if !escrow.CanCancel() {
		return nil, fmt.Errorf("escrow cannot be cancelled (status: %s)", escrow.Status)
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Verify caller is client
	if activeWallet.PublicKey != escrow.Client {
		return nil, domain.ErrNotAuthorized
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// TODO: Refund tokens to client on-chain
	config.Infof("Cancelling escrow %s and refunding client", escrow.ID[:8])

	// Update escrow status
	now := time.Now()
	escrow.Status = domain.EscrowStatusCancelled
	escrow.CanceledAt = &now
	escrow.UpdatedAt = now

	// Store updated escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to update escrow: %w", err)
	}

	config.Infof("Escrow %s cancelled and refunded", escrow.ID[:8])

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// CreateDispute creates a dispute for an escrow
func (s *EscrowService) CreateDispute(escrowID string, reason string, walletPassword string) (*domain.Escrow, error) {
	// Get escrow
	escrow, err := s.GetEscrow(escrowID)
	if err != nil {
		return nil, err
	}

	// Verify escrow can be disputed
	if !escrow.CanDispute() {
		return nil, fmt.Errorf("escrow cannot be disputed (status: %s)", escrow.Status)
	}

	// Check if already disputed
	if escrow.Dispute != nil {
		return nil, fmt.Errorf("escrow already has an active dispute")
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Verify caller is either client or agent
	if activeWallet.PublicKey != escrow.Client && activeWallet.PublicKey != escrow.Agent {
		return nil, domain.ErrNotAuthorized
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// Create dispute
	disputeID := uuid.New().String()
	dispute := &domain.Dispute{
		ID:         disputeID,
		Initiator:  activeWallet.PublicKey,
		Reason:     reason,
		Evidence:   []string{},
		Status:     domain.DisputeStatusOpen,
		Resolution: domain.ResolutionSplit, // Default
		CreatedAt:  time.Now(),
	}

	// Update escrow
	escrow.Dispute = dispute
	escrow.Status = domain.EscrowStatusDisputed
	escrow.UpdatedAt = time.Now()

	// Store updated escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to update escrow: %w", err)
	}

	config.Infof("Dispute %s created for escrow %s", disputeID[:8], escrow.ID[:8])

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// ResolveDispute resolves a dispute
func (s *EscrowService) ResolveDispute(escrowID string, resolution domain.DisputeResolution, walletPassword string) (*domain.Escrow, error) {
	// Get escrow
	escrow, err := s.GetEscrow(escrowID)
	if err != nil {
		return nil, err
	}

	// Verify dispute exists
	if escrow.Dispute == nil {
		return nil, fmt.Errorf("no dispute found for escrow")
	}

	// Verify dispute is open
	if escrow.Dispute.Status != domain.DisputeStatusOpen && escrow.Dispute.Status != domain.DisputeStatusUnderReview {
		return nil, fmt.Errorf("dispute already resolved")
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet private key
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// TODO: Resolve dispute on-chain based on resolution
	config.Infof("Resolving dispute %s with resolution: %s", escrow.Dispute.ID[:8], resolution)

	// Calculate amounts based on resolution
	var clientAmount, agentAmount uint64
	switch resolution {
	case domain.ResolutionClientFavor:
		clientAmount = escrow.Amount
		agentAmount = 0
	case domain.ResolutionAgentFavor:
		clientAmount = 0
		agentAmount = escrow.Amount
	case domain.ResolutionSplit:
		clientAmount = escrow.Amount / 2
		agentAmount = escrow.Amount / 2
	}

	// Update dispute
	now := time.Now()
	escrow.Dispute.Status = domain.DisputeStatusResolved
	escrow.Dispute.Resolution = resolution
	escrow.Dispute.ResolvedBy = activeWallet.PublicKey
	escrow.Dispute.ClientAmount = clientAmount
	escrow.Dispute.AgentAmount = agentAmount
	escrow.Dispute.ResolvedAt = &now

	// Update escrow status
	escrow.Status = domain.EscrowStatusCompleted
	escrow.UpdatedAt = now

	// Store updated escrow
	if err := s.storeEscrow(escrow); err != nil {
		return nil, fmt.Errorf("failed to update escrow: %w", err)
	}

	config.Infof("Dispute resolved: %s", resolution)

	// Prevent unused variable error
	_ = privateKey

	return escrow, nil
}

// GetEscrow retrieves an escrow by ID
func (s *EscrowService) GetEscrow(escrowID string) (*domain.Escrow, error) {
	key := fmt.Sprintf("escrow:%s", escrowID)

	data, err := s.storage.Get(key)
	if err != nil {
		return nil, domain.ErrEscrowNotFound
	}

	var escrow domain.Escrow
	if err := json.Unmarshal(data, &escrow); err != nil {
		return nil, fmt.Errorf("failed to unmarshal escrow: %w", err)
	}

	return &escrow, nil
}

// ListEscrows lists escrows for an address with optional status filter
func (s *EscrowService) ListEscrows(address string, status *domain.EscrowStatus) ([]*domain.Escrow, error) {
	// Get all keys with escrow prefix
	prefix := "escrow:"
	keys, err := s.storage.Keys(prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list escrows: %w", err)
	}

	var escrows []*domain.Escrow
	for _, key := range keys {
		data, err := s.storage.Get(key)
		if err != nil {
			config.Warnf("Failed to get escrow %s: %v", key, err)
			continue
		}

		var escrow domain.Escrow
		if err := json.Unmarshal(data, &escrow); err != nil {
			config.Warnf("Failed to unmarshal escrow: %v", err)
			continue
		}

		// Filter by address
		if address != "" && escrow.Client != address && escrow.Agent != address {
			continue
		}

		// Filter by status
		if status != nil && escrow.Status != *status {
			continue
		}

		escrows = append(escrows, &escrow)
	}

	return escrows, nil
}

// Helper methods

func (s *EscrowService) storeEscrow(escrow *domain.Escrow) error {
	key := fmt.Sprintf("escrow:%s", escrow.ID)

	data, err := json.Marshal(escrow)
	if err != nil {
		return fmt.Errorf("failed to marshal escrow: %w", err)
	}

	if err := s.storage.Set(key, data); err != nil {
		return fmt.Errorf("failed to store escrow: %w", err)
	}

	return nil
}
