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

// StakingService handles GHOST token staking operations
type StakingService struct {
	cfg           *config.Config
	client        *solClient.Client
	storage       ports.Storage
	walletService *WalletService
}

// NewStakingService creates a new staking service
func NewStakingService(
	cfg *config.Config,
	client *solClient.Client,
	storage ports.Storage,
	walletService *WalletService,
) *StakingService {
	return &StakingService{
		cfg:           cfg,
		client:        client,
		storage:       storage,
		walletService: walletService,
	}
}

// Stake stakes GHOST tokens
func (s *StakingService) Stake(params domain.StakeParams) (*domain.StakingAccount, error) {
	// Validate parameters
	if err := params.Validate(); err != nil {
		return nil, err
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Check if already staking
	existingAccount, err := s.GetStakingAccount(activeWallet.PublicKey)
	if err == nil && existingAccount.Status != domain.StatusUnstaked {
		return nil, domain.ErrAlreadyStaking
	}

	config.Infof("Staking %s GHOST tokens for %s",
		fmt.Sprintf("%.2f", domain.LamportsToGhostTokens(params.Amount)),
		activeWallet.PublicKey)

	// Load wallet for signing
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, params.WalletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	// Calculate tier and benefits
	amountGhost := domain.LamportsToGhostTokens(params.Amount)
	tier := domain.DetermineStakingTier(amountGhost)
	repBoost, hasVerifiedBadge, hasPremiumBenefits := domain.GetTierBenefits(tier)

	// Calculate estimated variable APY (simplified for now)
	// In reality, APY varies based on protocol revenue distribution
	estimatedAPY := 10.0 // Default estimate
	if tier == domain.StakingTierGold {
		estimatedAPY = 15.0
	} else if tier == domain.StakingTierSilver {
		estimatedAPY = 12.0
	}

	// Calculate unlock time
	lockDuration := domain.GetLockPeriodDuration(params.LockPeriod)
	now := time.Now()
	unlocksAt := now.Add(lockDuration)

	// Determine status
	status := domain.StatusActive
	if params.LockPeriod != domain.LockNone {
		status = domain.StatusLocked
	}

	// Create staking account
	stakingAccount := &domain.StakingAccount{
		Staker:             activeWallet.PublicKey,
		CreatedAt:          now,
		UpdatedAt:          now,
		Amount:             params.Amount,
		AmountGHOST:        amountGhost,
		StakedAt:           now,
		LockPeriod:         params.LockPeriod,
		UnlocksAt:          unlocksAt,
		Status:             status,
		Tier:               tier,
		ReputationBoost:    repBoost,
		HasVerifiedBadge:   hasVerifiedBadge,
		HasPremiumBenefits: hasPremiumBenefits,
		TotalRewards:       0,
		ClaimedRewards:     0,
		UnclaimedRewards:   0,
		LastRewardClaim:    now,
		LastRewardUpdate:   now,
		CurrentAPY:         estimatedAPY,
		EstimatedAPY:       estimatedAPY,
		PDA:                fmt.Sprintf("stake_%s", activeWallet.PublicKey),
	}

	// TODO: Build and submit Solana transaction
	// Transaction should:
	// 1. Transfer GHOST tokens from user wallet to staking program
	// 2. Create staking account PDA
	// 3. Initialize staking account with parameters
	config.Warn("Blockchain transaction building not yet implemented - staking simulated")
	_ = privateKey // Prevent unused variable error

	// Cache staking account
	cacheKey := fmt.Sprintf("staking:%s", activeWallet.PublicKey)
	if err := s.storage.SetJSONWithTTL(cacheKey, stakingAccount, 5*time.Minute); err != nil {
		config.Warnf("Failed to cache staking account: %v", err)
	}

	config.Infof("Staking successful: %s GHOST at %s tier (~%.2f%% estimated APY)",
		fmt.Sprintf("%.2f", amountGhost), tier, estimatedAPY)

	return stakingAccount, nil
}

// Unstake unstakes GHOST tokens
func (s *StakingService) Unstake(params domain.UnstakeParams) error {
	// Validate parameters
	if err := params.Validate(); err != nil {
		return err
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Get staking account
	stakingAccount, err := s.GetStakingAccount(activeWallet.PublicKey)
	if err != nil {
		return fmt.Errorf("not staking: %w", err)
	}

	if stakingAccount.Status == domain.StatusUnstaked {
		return domain.ErrNotStaking
	}

	// Check if can unstake
	if !stakingAccount.CanUnstake() {
		timeRemaining := stakingAccount.TimeUntilUnlock()
		return fmt.Errorf("%w: %s remaining", domain.ErrStillLocked, timeRemaining)
	}

	config.Infof("Unstaking %s GHOST tokens for %s",
		fmt.Sprintf("%.2f", stakingAccount.AmountGHOST),
		activeWallet.PublicKey)

	// Load wallet for signing
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, params.WalletPassword)
	if err != nil {
		return fmt.Errorf("failed to load wallet: %w", err)
	}

	// Update rewards before unstaking
	stakingAccount.UpdateRewards()

	// TODO: Build and submit Solana transaction
	// Transaction should:
	// 1. Transfer staked GHOST tokens back to user wallet
	// 2. Transfer unclaimed rewards to user wallet
	// 3. Close staking account PDA
	config.Warn("Blockchain transaction building not yet implemented - unstaking simulated")
	config.Debugf("Would sign transaction with private key: %v", len(privateKey) > 0)

	// Update status
	stakingAccount.Status = domain.StatusUnstaked
	stakingAccount.UpdatedAt = time.Now()

	// Cache updated account
	cacheKey := fmt.Sprintf("staking:%s", activeWallet.PublicKey)
	if err := s.storage.SetJSONWithTTL(cacheKey, stakingAccount, 5*time.Minute); err != nil {
		config.Warnf("Failed to cache staking account: %v", err)
	}

	config.Infof("Unstaking successful: %s GHOST + %s GHOST rewards returned",
		fmt.Sprintf("%.4f", stakingAccount.AmountGHOST),
		fmt.Sprintf("%.4f", domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards)))

	return nil
}

// GetStakingAccount gets the staking account for an address
func (s *StakingService) GetStakingAccount(address string) (*domain.StakingAccount, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("staking:%s", address)
	var cachedAccount domain.StakingAccount
	if err := s.storage.GetJSON(cacheKey, &cachedAccount); err == nil {
		// Update rewards before returning
		cachedAccount.UpdateRewards()
		config.Debug("Using cached staking account")
		return &cachedAccount, nil
	}

	config.Infof("Fetching staking account for: %s", address)

	// TODO: Fetch from blockchain
	// Query staking program for account PDA
	config.Warn("Blockchain fetching not yet implemented - returning error")

	return nil, domain.ErrStakingAccountNotFound
}

// CalculateRewards calculates pending rewards for a staking account
func (s *StakingService) CalculateRewards(address string) (uint64, error) {
	stakingAccount, err := s.GetStakingAccount(address)
	if err != nil {
		return 0, err
	}

	// Calculate new rewards
	newRewards := domain.CalculateRewards(stakingAccount)
	totalPending := stakingAccount.UnclaimedRewards + newRewards

	return totalPending, nil
}

// ClaimRewards claims accumulated rewards
func (s *StakingService) ClaimRewards(params domain.ClaimRewardsParams) (uint64, error) {
	// Validate parameters
	if err := params.Validate(); err != nil {
		return 0, err
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return 0, fmt.Errorf("no active wallet: %w", err)
	}

	// Get staking account
	stakingAccount, err := s.GetStakingAccount(activeWallet.PublicKey)
	if err != nil {
		return 0, fmt.Errorf("not staking: %w", err)
	}

	// Update rewards
	stakingAccount.UpdateRewards()

	if stakingAccount.UnclaimedRewards == 0 {
		return 0, domain.ErrNoRewardsToClaim
	}

	config.Infof("Claiming %s GHOST in rewards for %s",
		fmt.Sprintf("%.4f", domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards)),
		activeWallet.PublicKey)

	// Load wallet for signing
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, params.WalletPassword)
	if err != nil {
		return 0, fmt.Errorf("failed to load wallet: %w", err)
	}

	rewardAmount := stakingAccount.UnclaimedRewards

	// TODO: Build and submit Solana transaction
	// Transaction should:
	// 1. Transfer rewards from rewards pool to user wallet
	// 2. Update staking account claimed rewards
	config.Warn("Blockchain transaction building not yet implemented - claim simulated")
	config.Debugf("Would sign transaction with private key: %v", len(privateKey) > 0)

	// Update account
	stakingAccount.ClaimedRewards += rewardAmount
	stakingAccount.UnclaimedRewards = 0
	stakingAccount.LastRewardClaim = time.Now()
	stakingAccount.UpdatedAt = time.Now()

	// Cache updated account
	cacheKey := fmt.Sprintf("staking:%s", activeWallet.PublicKey)
	if err := s.storage.SetJSONWithTTL(cacheKey, stakingAccount, 5*time.Minute); err != nil {
		config.Warnf("Failed to cache staking account: %v", err)
	}

	config.Infof("Claimed %s GHOST in rewards", fmt.Sprintf("%.4f", domain.LamportsToGhostTokens(rewardAmount)))

	return rewardAmount, nil
}

// GetStakingStats gets global staking statistics
func (s *StakingService) GetStakingStats() (*domain.StakingStats, error) {
	// Check cache first
	cacheKey := "staking:stats"
	var cachedStats domain.StakingStats
	if err := s.storage.GetJSON(cacheKey, &cachedStats); err == nil {
		config.Debug("Using cached staking stats")
		return &cachedStats, nil
	}

	config.Info("Fetching global staking statistics")

	// TODO: Fetch from blockchain
	// Query all staking accounts and aggregate
	config.Warn("Blockchain fetching not yet implemented - returning mock stats")

	// Mock stats
	stats := &domain.StakingStats{
		TotalStaked:      domain.GhostTokensToLamports(1_500_000), // 1.5M GHOST
		TotalStakedGHOST: 1_500_000,
		TotalStakers:     150,
		AverageAPY:       12.5,
		TotalRewards:     domain.GhostTokensToLamports(50_000), // 50K GHOST
		UpdatedAt:        time.Now(),
	}

	// Cache stats
	if err := s.storage.SetJSONWithTTL(cacheKey, stats, 5*time.Minute); err != nil {
		config.Warnf("Failed to cache staking stats: %v", err)
	}

	return stats, nil
}

// ExportStakingData exports staking data for an address
func (s *StakingService) ExportStakingData(address string) (string, error) {
	stakingAccount, err := s.GetStakingAccount(address)
	if err != nil {
		return "", err
	}

	// Create export format
	export := map[string]interface{}{
		"staker":   address,
		"tier":     stakingAccount.Tier,
		"status":   stakingAccount.Status,
		"staking": map[string]interface{}{
			"amount":      fmt.Sprintf("%.2f GHOST", stakingAccount.AmountGHOST),
			"stakedAt":    stakingAccount.StakedAt.Format(time.RFC3339),
			"lockPeriod":  stakingAccount.LockPeriod,
			"unlocksAt":   stakingAccount.UnlocksAt.Format(time.RFC3339),
			"timeUntil":   stakingAccount.TimeUntilUnlock().String(),
		},
		"benefits": map[string]interface{}{
			"reputationBoost":    fmt.Sprintf("+%.1f%%", stakingAccount.ReputationBoost),
			"hasVerifiedBadge":   stakingAccount.HasVerifiedBadge,
			"hasPremiumBenefits": stakingAccount.HasPremiumBenefits,
		},
		"rewards": map[string]interface{}{
			"totalRewards":     fmt.Sprintf("%.4f GHOST", domain.LamportsToGhostTokens(stakingAccount.TotalRewards)),
			"claimedRewards":   fmt.Sprintf("%.4f GHOST", domain.LamportsToGhostTokens(stakingAccount.ClaimedRewards)),
			"unclaimedRewards": fmt.Sprintf("%.4f GHOST", domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards)),
		},
		"apy": map[string]interface{}{
			"currentAPY":   fmt.Sprintf("~%.2f%%", stakingAccount.CurrentAPY),
			"estimatedAPY": fmt.Sprintf("~%.2f%%", stakingAccount.EstimatedAPY),
			"note":         "APY varies based on protocol revenue distribution",
		},
		"updatedAt": stakingAccount.UpdatedAt.Format(time.RFC3339),
	}

	jsonBytes, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", err
	}

	return string(jsonBytes), nil
}
