package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/ports"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// ReputationService handles reputation and Ghost Score operations
type ReputationService struct {
	cfg     *config.Config
	client  *solClient.Client
	storage ports.Storage
}

// NewReputationService creates a new reputation service
func NewReputationService(
	cfg *config.Config,
	client *solClient.Client,
	storage ports.Storage,
) *ReputationService {
	return &ReputationService{
		cfg:     cfg,
		client:  client,
		storage: storage,
	}
}

// GetReputation gets reputation data for an agent
func (s *ReputationService) GetReputation(agentAddress string) (*domain.Reputation, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("reputation:%s", agentAddress)
	var cachedRep domain.Reputation
	if err := s.storage.GetJSON(cacheKey, &cachedRep); err == nil {
		config.Debug("Using cached reputation")
		return &cachedRep, nil
	}

	config.Infof("Fetching reputation for agent: %s", agentAddress)

	// TODO: Fetch from blockchain
	// For now, return a mock reputation
	config.Warn("Blockchain fetching not yet implemented - returning mock reputation")

	reputation := &domain.Reputation{
		AgentAddress:    agentAddress,
		UpdatedAt:       time.Now(),
		GhostScore:      0,
		Tier:            domain.TierBronze,
		TotalJobs:       0,
		CompletedJobs:   0,
		FailedJobs:      0,
		SuccessRate:     0.0,
		AverageRating:   0.0,
		ResponseTime:    0,
		CompletionTime:  0,
		TotalEarnings:   0,
		AverageEarnings: 0.0,
		Tags:            []domain.ReputationTag{domain.TagNewcomer},
		AdminVerified:   false,
		PayAIEvents:     0,
		PayAIRevenue:    0,
		LastPayAISync:   time.Time{},
		PDA:             fmt.Sprintf("rep_%s", agentAddress),
	}

	// Cache result
	s.storage.SetJSONWithTTL(cacheKey, reputation, 5*time.Minute)

	return reputation, nil
}

// UpdateReputation updates reputation based on an event
func (s *ReputationService) UpdateReputation(params domain.UpdateReputationParams) error {
	// Get existing reputation
	reputation, err := s.GetReputation(params.AgentAddress)
	if err != nil {
		return err
	}

	config.Infof("Updating reputation for agent %s: event=%s", params.AgentAddress, params.Update.EventType)

	// Apply update based on event type
	switch params.Update.EventType {
	case "job_completed":
		reputation.ApplyJobCompletion(
			params.Update.Rating,
			params.Update.Amount,
			params.Update.ResponseTime,
			params.Update.CompletionTime,
		)
	case "job_failed":
		reputation.ApplyJobFailure()
	case "payment_received":
		reputation.PayAIEvents++
		reputation.PayAIRevenue += params.Update.Amount
		reputation.LastPayAISync = time.Now()
		reputation.UpdateScore()
	default:
		return fmt.Errorf("unknown event type: %s", params.Update.EventType)
	}

	// TODO: Build and send transaction to update on-chain reputation
	config.Warn("Transaction building not yet implemented - update simulated")

	// Update cache
	cacheKey := fmt.Sprintf("reputation:%s", params.AgentAddress)
	s.storage.SetJSONWithTTL(cacheKey, reputation, 5*time.Minute)

	config.Infof("Reputation updated: GhostScore=%d, Tier=%s", reputation.GhostScore, reputation.Tier)

	return nil
}

// CalculateScore calculates the Ghost Score for an agent
func (s *ReputationService) CalculateScore(agentAddress string) (int, error) {
	reputation, err := s.GetReputation(agentAddress)
	if err != nil {
		return 0, err
	}

	params := domain.CalculateGhostScoreParams{
		SuccessRate:      reputation.SuccessRate,
		AverageRating:    reputation.AverageRating,
		TotalJobs:        reputation.TotalJobs,
		ResponseTime:     reputation.ResponseTime,
		CompletionTime:   reputation.CompletionTime,
		AdminVerified:    reputation.AdminVerified,
		PayAIIntegration: reputation.PayAIEvents > 0,
	}

	score := domain.CalculateGhostScore(params)
	return score, nil
}

// GetLeaderboard gets the top agents by Ghost Score
func (s *ReputationService) GetLeaderboard(limit int) ([]*domain.Reputation, error) {
	// TODO: Fetch from blockchain and sort by Ghost Score
	config.Warn("Leaderboard not yet implemented - returning empty list")
	return []*domain.Reputation{}, nil
}

// VerifyAgent marks an agent as admin-verified
func (s *ReputationService) VerifyAgent(agentAddress string) error {
	reputation, err := s.GetReputation(agentAddress)
	if err != nil {
		return err
	}

	config.Infof("Verifying agent: %s", agentAddress)

	now := time.Now()
	reputation.AdminVerified = true
	reputation.VerifiedAt = &now
	reputation.UpdateScore()

	// TODO: Build and send transaction
	config.Warn("Transaction building not yet implemented - verification simulated")

	// Update cache
	cacheKey := fmt.Sprintf("reputation:%s", agentAddress)
	s.storage.SetJSONWithTTL(cacheKey, reputation, 5*time.Minute)

	config.Info("Agent verified successfully")

	return nil
}

// ProcessPayAIWebhook processes a PayAI webhook event
func (s *ReputationService) ProcessPayAIWebhook(payload map[string]interface{}) error {
	// Extract webhook data
	agentAddress, ok := payload["agentAddress"].(string)
	if !ok {
		return fmt.Errorf("invalid webhook payload: missing agentAddress")
	}

	eventType, _ := payload["eventType"].(string)
	amount, _ := payload["amount"].(float64)

	config.Infof("Processing PayAI webhook: agent=%s, event=%s", agentAddress, eventType)

	// Create reputation update
	update := domain.ReputationUpdate{
		AgentAddress: agentAddress,
		EventType:    "payment_received",
		Timestamp:    time.Now(),
		Amount:       uint64(amount),
	}

	// Update reputation
	params := domain.UpdateReputationParams{
		AgentAddress: agentAddress,
		Update:       update,
	}

	return s.UpdateReputation(params)
}

// ExportReputationData exports reputation data for an agent
func (s *ReputationService) ExportReputationData(agentAddress string) (string, error) {
	reputation, err := s.GetReputation(agentAddress)
	if err != nil {
		return "", err
	}

	// Create export format
	export := map[string]interface{}{
		"agent":       agentAddress,
		"ghostScore":  reputation.GhostScore,
		"tier":        reputation.Tier,
		"metrics": map[string]interface{}{
			"totalJobs":      reputation.TotalJobs,
			"completedJobs":  reputation.CompletedJobs,
			"successRate":    fmt.Sprintf("%.2f%%", reputation.SuccessRate),
			"averageRating":  fmt.Sprintf("%.2f/5.0", reputation.AverageRating),
			"responseTime":   fmt.Sprintf("%ds", reputation.ResponseTime),
			"completionTime": fmt.Sprintf("%ds", reputation.CompletionTime),
		},
		"revenue": map[string]interface{}{
			"totalEarnings":   fmt.Sprintf("%.4f SOL", domain.LamportsToSOL(reputation.TotalEarnings)),
			"averageEarnings": fmt.Sprintf("%.4f SOL/job", reputation.AverageEarnings),
		},
		"tags":          reputation.Tags,
		"verified":      reputation.AdminVerified,
		"payaiEvents":   reputation.PayAIEvents,
		"lastUpdated":   reputation.UpdatedAt.Format(time.RFC3339),
	}

	jsonBytes, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", err
	}

	return string(jsonBytes), nil
}
