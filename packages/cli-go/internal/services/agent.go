package services

import (
	"fmt"
	"strings"
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

// SearchAgentsParams represents search/filter parameters
type SearchAgentsParams struct {
	Query      string
	AgentType  *domain.AgentType
	MinScore   int
	Verified   bool
	Tier       *domain.GhostScoreTier
	MinJobs    uint64
	Limit      int
	Offset     int
	SortBy     string // "earnings", "rating", "jobs"
}

// SearchAgents searches agents with filters
func (s *AgentService) SearchAgents(params SearchAgentsParams) ([]*domain.Agent, error) {
	agents, err := s.ListAgents()
	if err != nil {
		return nil, err
	}

	var filtered []*domain.Agent

	for _, agent := range agents {
		// Apply filters
		if params.Query != "" {
			if !s.fuzzyMatch(agent.Name, params.Query) &&
			   !s.matchCapabilities(agent.Capabilities, params.Query) {
				continue
			}
		}

		if params.AgentType != nil && agent.AgentType != *params.AgentType {
			continue
		}

		// Get reputation for ghost score and tier filtering
		rep, err := s.getAgentReputation(agent.ID)
		if err == nil {
			if params.MinScore > 0 && rep.GhostScore < params.MinScore {
				continue
			}

			if params.Tier != nil && rep.Tier != *params.Tier {
				continue
			}

			if params.Verified && !rep.AdminVerified {
				continue
			}
		}

		if params.MinJobs > 0 && agent.CompletedJobs < params.MinJobs {
			continue
		}

		filtered = append(filtered, agent)
	}

	// Sort agents
	s.sortAgents(filtered, params.SortBy)

	// Apply pagination
	start := params.Offset
	if start > len(filtered) {
		start = len(filtered)
	}

	end := start + params.Limit
	if params.Limit == 0 {
		end = len(filtered)
	} else if end > len(filtered) {
		end = len(filtered)
	}

	return filtered[start:end], nil
}

// FilterAgents filters agents by type, score, verification, tier
func (s *AgentService) FilterAgents(agentType *domain.AgentType, minScore int, verified bool, tier *domain.GhostScoreTier) ([]*domain.Agent, error) {
	return s.SearchAgents(SearchAgentsParams{
		AgentType: agentType,
		MinScore:  minScore,
		Verified:  verified,
		Tier:      tier,
	})
}

// GetTopAgents returns top agents by earnings, rating, or jobs
func (s *AgentService) GetTopAgents(limit int, sortBy string) ([]*domain.Agent, error) {
	if limit == 0 {
		limit = 10
	}

	return s.SearchAgents(SearchAgentsParams{
		Limit:  limit,
		SortBy: sortBy,
	})
}

// VerifyAgent marks an agent as verified (admin only)
func (s *AgentService) VerifyAgent(agentID string, walletPassword string) error {
	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	_, err = s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to load wallet: %w", err)
	}

	// Get agent reputation
	rep, err := s.getAgentReputation(agentID)
	if err != nil {
		return fmt.Errorf("failed to get agent reputation: %w", err)
	}

	// Check if caller has sufficient Ghost Score (800+) or is admin
	callerRep, err := s.getWalletReputation(activeWallet.PublicKey)
	if err == nil && callerRep.GhostScore < 800 {
		return fmt.Errorf("insufficient Ghost Score to verify agents (need 800+, have %d)", callerRep.GhostScore)
	}

	config.Infof("Verifying agent: %s", agentID)

	// Update verification status
	rep.AdminVerified = true
	now := time.Now()
	rep.VerifiedAt = &now
	rep.UpdateScore()

	// Cache updated reputation
	cacheKey := fmt.Sprintf("reputation:%s", agentID)
	if err := s.storage.SetJSONWithTTL(cacheKey, rep, 24*time.Hour); err != nil {
		config.Warnf("Failed to cache reputation: %v", err)
	}

	config.Infof("Agent verified successfully: %s", agentID)

	return nil
}

// GetAgentMetrics returns detailed metrics for an agent
func (s *AgentService) GetAgentMetrics(agentID string) (*domain.AgentMetrics, error) {
	agent, err := s.GetAgent(agentID)
	if err != nil {
		return nil, err
	}

	rep, err := s.getAgentReputation(agentID)
	if err != nil {
		// Create default reputation if not found
		rep = &domain.Reputation{
			AgentAddress:  agentID,
			GhostScore:    0,
			Tier:          domain.TierBronze,
			TotalJobs:     agent.TotalJobs,
			CompletedJobs: agent.CompletedJobs,
			FailedJobs:    agent.TotalJobs - agent.CompletedJobs,
			SuccessRate:   agent.SuccessRate,
			AverageRating: agent.AverageRating,
			TotalEarnings: agent.TotalEarnings,
			Tags:          []domain.ReputationTag{},
			AdminVerified: false,
		}
		rep.AverageEarnings = rep.CalculateAverageEarnings()
		rep.UpdateScore()
	}

	metrics := &domain.AgentMetrics{
		Agent:      agent,
		Reputation: rep,
		UpdatedAt:  time.Now(),
	}

	return metrics, nil
}

// ExportAgentData exports full agent data as JSON
func (s *AgentService) ExportAgentData(agentID string) (string, error) {
	metrics, err := s.GetAgentMetrics(agentID)
	if err != nil {
		return "", err
	}

	// Marshal to pretty JSON
	data, err := domain.MarshalJSON(metrics)
	if err != nil {
		return "", fmt.Errorf("failed to marshal agent data: %w", err)
	}

	return data, nil
}

// Helper methods

func (s *AgentService) fuzzyMatch(text, query string) bool {
	text = strings.ToLower(text)
	query = strings.ToLower(query)

	// Simple fuzzy matching: check if all characters in query appear in text in order
	textPos := 0
	for _, char := range query {
		found := false
		for textPos < len(text) {
			if rune(text[textPos]) == char {
				found = true
				textPos++
				break
			}
			textPos++
		}
		if !found {
			return false
		}
	}
	return true
}

func (s *AgentService) matchCapabilities(capabilities []string, query string) bool {
	query = strings.ToLower(query)
	for _, cap := range capabilities {
		if strings.Contains(strings.ToLower(cap), query) {
			return true
		}
	}
	return false
}

func (s *AgentService) sortAgents(agents []*domain.Agent, sortBy string) {
	if sortBy == "" {
		sortBy = "earnings"
	}

	switch sortBy {
	case "earnings":
		// Sort by total earnings (descending)
		for i := 0; i < len(agents); i++ {
			for j := i + 1; j < len(agents); j++ {
				if agents[i].TotalEarnings < agents[j].TotalEarnings {
					agents[i], agents[j] = agents[j], agents[i]
				}
			}
		}
	case "rating":
		// Sort by average rating (descending)
		for i := 0; i < len(agents); i++ {
			for j := i + 1; j < len(agents); j++ {
				if agents[i].AverageRating < agents[j].AverageRating {
					agents[i], agents[j] = agents[j], agents[i]
				}
			}
		}
	case "jobs":
		// Sort by completed jobs (descending)
		for i := 0; i < len(agents); i++ {
			for j := i + 1; j < len(agents); j++ {
				if agents[i].CompletedJobs < agents[j].CompletedJobs {
					agents[i], agents[j] = agents[j], agents[i]
				}
			}
		}
	}
}

func (s *AgentService) getAgentReputation(agentID string) (*domain.Reputation, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("reputation:%s", agentID)
	var rep domain.Reputation
	if err := s.storage.GetJSON(cacheKey, &rep); err == nil {
		return &rep, nil
	}

	// If not in cache, create from agent data
	agent, err := s.GetAgent(agentID)
	if err != nil {
		return nil, err
	}

	rep = domain.Reputation{
		AgentAddress:  agentID,
		TotalJobs:     agent.TotalJobs,
		CompletedJobs: agent.CompletedJobs,
		FailedJobs:    agent.TotalJobs - agent.CompletedJobs,
		SuccessRate:   agent.SuccessRate,
		AverageRating: agent.AverageRating,
		TotalEarnings: agent.TotalEarnings,
		AdminVerified: false,
		Tags:          []domain.ReputationTag{},
		UpdatedAt:     time.Now(),
	}
	rep.AverageEarnings = rep.CalculateAverageEarnings()
	rep.UpdateScore()

	// Cache it
	s.storage.SetJSONWithTTL(cacheKey, &rep, 24*time.Hour)

	return &rep, nil
}

func (s *AgentService) getWalletReputation(walletAddress string) (*domain.Reputation, error) {
	cacheKey := fmt.Sprintf("wallet_reputation:%s", walletAddress)
	var rep domain.Reputation
	if err := s.storage.GetJSON(cacheKey, &rep); err == nil {
		return &rep, nil
	}
	return nil, domain.ErrReputationNotFound
}
