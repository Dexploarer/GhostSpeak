package domain

import (
	"fmt"
	"time"
)

// GHOST Token Constants
const (
	GhostTokenMint = "DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump"
)

// StakingTier represents the staking tier based on staked amount
type StakingTier string

const (
	StakingTierBronze StakingTier = "Bronze" // 1,000 - 9,999 GHOST
	StakingTierSilver StakingTier = "Silver" // 10,000 - 99,999 GHOST
	StakingTierGold   StakingTier = "Gold"   // 100,000+ GHOST
)

// LockPeriod represents the staking lock period
type LockPeriod string

const (
	LockNone   LockPeriod = "None"   // No lock, withdraw anytime (0% APY bonus)
	Lock30Days LockPeriod = "30days" // 30-day lock (5% APY bonus)
	Lock90Days LockPeriod = "90days" // 90-day lock (10% APY bonus)
	Lock1Year  LockPeriod = "1year"  // 1-year lock (20% APY bonus)
)

// StakingStatus represents the status of a staking account
type StakingStatus string

const (
	StatusActive   StakingStatus = "active"   // Currently staking
	StatusUnstaked StakingStatus = "unstaked" // Withdrawn
	StatusLocked   StakingStatus = "locked"   // Within lock period, cannot unstake
)

// StakingAccount represents a user's staking account
type StakingAccount struct {
	// Identity
	Staker    string    `json:"staker"`    // Public key of the staker
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Staking Details
	Amount       uint64     `json:"amount"`       // Amount staked in lamports
	AmountGHOST  float64    `json:"amountGhost"`  // Amount in GHOST tokens
	StakedAt     time.Time  `json:"stakedAt"`
	LockPeriod   LockPeriod `json:"lockPeriod"`
	UnlocksAt    time.Time  `json:"unlocksAt"`    // When the lock period ends
	Status       StakingStatus `json:"status"`

	// Tier Benefits
	Tier               StakingTier `json:"tier"`
	ReputationBoost    float64     `json:"reputationBoost"`    // Reputation boost percentage (e.g., 5.0 for +5%)
	HasVerifiedBadge   bool        `json:"hasVerifiedBadge"`   // Silver+ verified badge
	HasPremiumBenefits bool        `json:"hasPremiumBenefits"` // Gold premium listing/benefits

	// Rewards
	TotalRewards       uint64    `json:"totalRewards"`       // Total rewards earned (lamports)
	ClaimedRewards     uint64    `json:"claimedRewards"`     // Rewards already claimed
	UnclaimedRewards   uint64    `json:"unclaimedRewards"`   // Pending rewards
	LastRewardClaim    time.Time `json:"lastRewardClaim"`
	LastRewardUpdate   time.Time `json:"lastRewardUpdate"`

	// APY (Variable based on protocol revenue)
	CurrentAPY       float64 `json:"currentApy"`       // Current variable APY based on revenue distribution
	EstimatedAPY     float64 `json:"estimatedApy"`     // Estimated APY for current period

	// On-chain
	PDA string `json:"pda"` // Program Derived Address
}

// StakingStats represents global staking statistics
type StakingStats struct {
	TotalStaked      uint64    `json:"totalStaked"`      // Total GHOST staked (lamports)
	TotalStakedGHOST float64   `json:"totalStakedGhost"` // Total GHOST staked (tokens)
	TotalStakers     uint64    `json:"totalStakers"`     // Number of active stakers
	AverageAPY       float64   `json:"averageApy"`       // Average APY across all stakers
	TotalRewards     uint64    `json:"totalRewards"`     // Total rewards distributed
	UpdatedAt        time.Time `json:"updatedAt"`
}

// StakeParams represents parameters for staking
type StakeParams struct {
	Amount         uint64
	LockPeriod     LockPeriod
	WalletPassword string
}

// UnstakeParams represents parameters for unstaking
type UnstakeParams struct {
	WalletPassword string
}

// ClaimRewardsParams represents parameters for claiming rewards
type ClaimRewardsParams struct {
	WalletPassword string
}

// Validate validates stake parameters
func (p StakeParams) Validate() error {
	if p.Amount == 0 {
		return fmt.Errorf("stake amount must be greater than 0")
	}

	// Minimum stake: 1,000 GHOST (Basic tier)
	minStake := GhostTokensToLamports(1000.0)
	if p.Amount < minStake {
		return fmt.Errorf("minimum stake is 1,000 GHOST tokens")
	}

	if p.WalletPassword == "" {
		return fmt.Errorf("wallet password is required")
	}

	// Validate lock period
	switch p.LockPeriod {
	case LockNone, Lock30Days, Lock90Days, Lock1Year:
		// Valid
	default:
		return fmt.Errorf("invalid lock period: %s", p.LockPeriod)
	}

	return nil
}

// Validate validates unstake parameters
func (p UnstakeParams) Validate() error {
	if p.WalletPassword == "" {
		return fmt.Errorf("wallet password is required")
	}
	return nil
}

// Validate validates claim rewards parameters
func (p ClaimRewardsParams) Validate() error {
	if p.WalletPassword == "" {
		return fmt.Errorf("wallet password is required")
	}
	return nil
}

// DetermineStakingTier determines the staking tier based on staked amount
func DetermineStakingTier(amountGHOST float64) StakingTier {
	if amountGHOST >= 100000 {
		return StakingTierGold
	} else if amountGHOST >= 10000 {
		return StakingTierSilver
	}
	return StakingTierBronze
}

// GetTierBenefits returns the benefits for a given tier
// Returns: reputationBoost, hasVerifiedBadge, hasPremiumBenefits
func GetTierBenefits(tier StakingTier) (reputationBoost float64, hasVerifiedBadge bool, hasPremiumBenefits bool) {
	switch tier {
	case StakingTierBronze:
		return 5.0, false, false // +5% reputation boost
	case StakingTierSilver:
		return 15.0, true, false // +15% reputation boost + verified badge
	case StakingTierGold:
		return 15.0, true, true // +15% reputation boost + verified badge + premium benefits
	default:
		return 0.0, false, false
	}
}

// GetLockPeriodDuration returns the duration for a lock period
func GetLockPeriodDuration(lockPeriod LockPeriod) time.Duration {
	switch lockPeriod {
	case LockNone:
		return 0
	case Lock30Days:
		return 30 * 24 * time.Hour
	case Lock90Days:
		return 90 * 24 * time.Hour
	case Lock1Year:
		return 365 * 24 * time.Hour
	default:
		return 0
	}
}

// CalculateVariableAPY calculates variable APY based on protocol revenue
// Formula: APY = (annualRewards / userStakeValue) * 100
// This is a simplified calculation - actual APY varies based on:
// - Total protocol revenue
// - User's weighted stake (stake * tier multiplier)
// - Total weighted stake across all stakers
func CalculateVariableAPY(userStake uint64, tierMultiplier float64, monthlyRevenue float64, totalWeightedStake float64) float64 {
	if userStake == 0 || totalWeightedStake == 0 {
		return 0.0
	}

	// Calculate user's weighted stake
	userWeightedStake := float64(userStake) * tierMultiplier

	// Calculate user's share of monthly revenue
	userMonthlyReward := (userWeightedStake / totalWeightedStake) * monthlyRevenue

	// Annualize the reward
	annualReward := userMonthlyReward * 12

	// Calculate APY as percentage of stake value
	stakeValue := float64(userStake)
	apy := (annualReward / stakeValue) * 100

	return apy
}

// CalculateRewards calculates pending rewards for a staking account
// Formula: rewards = (stakedAmount * currentAPY * timeStaked) / (365 days * 100)
// Note: APY is variable and based on protocol revenue distribution
func CalculateRewards(account *StakingAccount) uint64 {
	if account.Status != StatusActive && account.Status != StatusLocked {
		return 0
	}

	// Time since last reward update
	now := time.Now()
	timeSinceUpdate := now.Sub(account.LastRewardUpdate)

	// Calculate rewards based on time elapsed
	// APY is annual, so we calculate proportional to time
	annualRewards := float64(account.Amount) * (account.CurrentAPY / 100.0)

	// Calculate rewards for the elapsed time
	secondsInYear := 365.0 * 24.0 * 60.0 * 60.0
	secondsElapsed := timeSinceUpdate.Seconds()

	rewards := uint64((annualRewards * secondsElapsed) / secondsInYear)

	return rewards
}

// UpdateRewards updates the rewards for a staking account
func (s *StakingAccount) UpdateRewards() {
	newRewards := CalculateRewards(s)
	s.UnclaimedRewards += newRewards
	s.TotalRewards += newRewards
	s.LastRewardUpdate = time.Now()
	s.UpdatedAt = time.Now()
}

// CanUnstake checks if the account can unstake
func (s *StakingAccount) CanUnstake() bool {
	if s.Status == StatusUnstaked {
		return false
	}

	// Check if lock period has expired
	if s.LockPeriod != LockNone {
		return time.Now().After(s.UnlocksAt)
	}

	return true
}

// IsLocked checks if the account is currently locked
func (s *StakingAccount) IsLocked() bool {
	if s.LockPeriod == LockNone {
		return false
	}
	return time.Now().Before(s.UnlocksAt)
}

// TimeUntilUnlock returns the time remaining until unlock
func (s *StakingAccount) TimeUntilUnlock() time.Duration {
	if s.LockPeriod == LockNone {
		return 0
	}

	remaining := time.Until(s.UnlocksAt)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// Staking-related errors
var (
	ErrStakingAccountNotFound = fmt.Errorf("staking account not found")
	ErrAlreadyStaking         = fmt.Errorf("already staking")
	ErrNotStaking             = fmt.Errorf("not staking")
	ErrStillLocked            = fmt.Errorf("staking account is still locked")
	ErrNoRewardsToClaim       = fmt.Errorf("no rewards to claim")
)
