package services

import (
	"fmt"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/ports"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// AgentService handles agent operations
type AgentService struct {
	cfg           *config.Config
	client        *solClient.Client
	walletService *WalletService
	ipfsService   *IPFSService
	storage       ports.Storage
}

// NewAgentService creates a new agent service
func NewAgentService(
	cfg *config.Config,
	client *solClient.Client,
	walletService *WalletService,
	ipfsService *IPFSService,
	storage ports.Storage,
) *AgentService {
	return &AgentService{
		cfg:           cfg,
		client:        client,
		walletService: walletService,
		ipfsService:   ipfsService,
		storage:       storage,
	}
}

// RegisterAgent registers a new agent on the blockchain
func (s *AgentService) RegisterAgent(params domain.RegisterAgentParams, walletPassword string) (*domain.Agent, error) {
	// Validate parameters
	if err := domain.ValidateRegisterParams(params); err != nil {
		return nil, err
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	config.Infof("Registering agent: %s", params.Name)

	// Generate agent ID
	agentID := fmt.Sprintf("agent_%d", time.Now().UnixNano())

	// Create metadata
	metadata := &domain.AgentMetadata{
		Name:         params.Name,
		Description:  params.Description,
		AgentType:    params.AgentType.String(),
		Capabilities: params.Capabilities,
		Version:      params.Version,
		ImageURL:     params.ImageURL,
		CreatedAt:    time.Now().Format(time.RFC3339),
	}

	// Upload metadata to IPFS
	config.Info("Uploading metadata to IPFS...")
	metadataURI, err := s.ipfsService.UploadAgentMetadata(metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to upload metadata: %w", err)
	}

	config.Infof("Metadata uploaded: %s", metadataURI)

	// Derive PDA for agent account
	ownerPubkey := privateKey.PublicKey()
	agentPDA, _, err := solClient.DeriveAgentPDA(
		s.client.GetProgramID(),
		agentID,
		ownerPubkey,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to derive PDA: %w", err)
	}

	config.Infof("Agent PDA: %s", agentPDA.String())

	// TODO: Build and send transaction to register agent
	// For now, we'll create a mock agent (real transaction building will be added later)
	config.Warn("Transaction building not yet implemented - creating mock agent")

	agent := &domain.Agent{
		ID:            agentID,
		Owner:         ownerPubkey.String(),
		Name:          params.Name,
		AgentType:     params.AgentType,
		MetadataURI:   metadataURI,
		Status:        domain.AgentStatusActive,
		Description:   params.Description,
		Capabilities:  params.Capabilities,
		Version:       params.Version,
		ImageURL:      params.ImageURL,
		PDA:           agentPDA.String(),
		TotalJobs:     0,
		CompletedJobs: 0,
		TotalEarnings: 0,
		AverageRating: 0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Cache agent locally
	cacheKey := fmt.Sprintf("agent:%s", agentID)
	if err := s.storage.SetJSONWithTTL(cacheKey, agent, 24*time.Hour); err != nil {
		config.Warnf("Failed to cache agent: %v", err)
	}

	config.Infof("Agent registered successfully: %s", agentID)

	return agent, nil
}

// ListAgents lists all agents owned by the active wallet
func (s *AgentService) ListAgents() ([]*domain.Agent, error) {
	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	config.Infof("Fetching agents for wallet: %s", activeWallet.PublicKey)

	// Check cache first
	cacheKey := fmt.Sprintf("agents:%s", activeWallet.PublicKey)
	var cachedAgents []*domain.Agent
	if err := s.storage.GetJSON(cacheKey, &cachedAgents); err == nil && cachedAgents != nil {
		config.Debug("Using cached agents")
		return cachedAgents, nil
	}

	// Fetch from blockchain
	accounts, err := s.client.GetAgentProgramAccounts()
	if err != nil {
		return nil, fmt.Errorf("failed to get program accounts: %w", err)
	}

	config.Infof("Found %d agent accounts on-chain", len(accounts))

	var agents []*domain.Agent
	for _, account := range accounts {
		// Parse account data
		agent, err := solClient.ParseAgentAccount(account.Account.Data.GetBinary(), account.Pubkey.String())
		if err != nil {
			config.Warnf("Failed to parse agent account %s: %v", account.Pubkey.String(), err)
			continue
		}

		// Filter by owner
		if agent.Owner != activeWallet.PublicKey {
			continue
		}

		// Fetch metadata from IPFS
		if agent.MetadataURI != "" {
			metadata, err := s.ipfsService.FetchAgentMetadata(agent.MetadataURI)
			if err != nil {
				config.Warnf("Failed to fetch metadata for agent %s: %v", agent.ID, err)
			} else {
				agent.Description = metadata.Description
				agent.Capabilities = metadata.Capabilities
				agent.Version = metadata.Version
				agent.ImageURL = metadata.ImageURL
			}
		}

		agents = append(agents, agent)
	}

	// Cache results
	if err := s.storage.SetJSONWithTTL(cacheKey, agents, 5*time.Minute); err != nil {
		config.Warnf("Failed to cache agents: %v", err)
	}

	config.Infof("Found %d agents for wallet", len(agents))

	return agents, nil
}

// GetAgent gets a specific agent by ID
func (s *AgentService) GetAgent(agentID string) (*domain.Agent, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("agent:%s", agentID)
	var agent domain.Agent
	if err := s.storage.GetJSON(cacheKey, &agent); err == nil {
		config.Debug("Using cached agent")
		return &agent, nil
	}

	// If not in cache, fetch all agents and find it
	agents, err := s.ListAgents()
	if err != nil {
		return nil, err
	}

	for _, a := range agents {
		if a.ID == agentID {
			// Cache it
			s.storage.SetJSONWithTTL(cacheKey, a, 24*time.Hour)
			return a, nil
		}
	}

	return nil, domain.ErrAgentNotFound
}

// GetAnalytics returns analytics for all agents
func (s *AgentService) GetAnalytics() (*domain.Analytics, error) {
	agents, err := s.ListAgents()
	if err != nil {
		return nil, err
	}

	analytics := &domain.Analytics{
		UpdatedAt: time.Now(),
	}

	for _, agent := range agents {
		analytics.TotalAgents++
		if agent.IsActive() {
			analytics.ActiveAgents++
		}
		analytics.TotalJobs += agent.TotalJobs
		analytics.CompletedJobs += agent.CompletedJobs
		analytics.TotalEarnings += agent.TotalEarnings
		analytics.AverageRating += agent.AverageRating
	}

	// Calculate averages
	if analytics.TotalAgents > 0 {
		analytics.AverageRating /= float64(analytics.TotalAgents)
	}

	analytics.SuccessRate = analytics.CalculateSuccessRate()
	analytics.TotalEarningsSOL = domain.LamportsToSOL(analytics.TotalEarnings)

	return analytics, nil
}
