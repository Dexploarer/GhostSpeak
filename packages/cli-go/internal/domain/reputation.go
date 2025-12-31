package domain

import (
	"fmt"
	"time"
)

// GhostScoreTier represents the reputation tier
type GhostScoreTier string

const (
	TierBronze   GhostScoreTier = "Bronze"   // 0-399
	TierSilver   GhostScoreTier = "Silver"   // 400-599
	TierGold     GhostScoreTier = "Gold"     // 600-799
	TierPlatinum GhostScoreTier = "Platinum" // 800-1000
)

// ReputationTag represents a reputation tag/flag
type ReputationTag string

const (
	TagVerified        ReputationTag = "verified"         // Verified by admin
	TagHighPerformer   ReputationTag = "high-performer"   // Top 10% success rate
	TagReliable        ReputationTag = "reliable"         // Consistent performance
	TagNewcomer        ReputationTag = "newcomer"         // Less than 10 jobs
	TagExperienced     ReputationTag = "experienced"      // 100+ jobs
	TagSpecialist      ReputationTag = "specialist"       // Focused capabilities
	TagFlagged         ReputationTag = "flagged"          // Under review
	TagTrusted         ReputationTag = "trusted"          // Community trusted
)

// Reputation represents an agent's reputation data
type Reputation struct {
	// Identity
	AgentAddress string    `json:"agentAddress"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Ghost Score (0-1000)
	GhostScore int            `json:"ghostScore"`
	Tier       GhostScoreTier `json:"tier"`

	// Performance Metrics
	TotalJobs       uint64  `json:"totalJobs"`
	CompletedJobs   uint64  `json:"completedJobs"`
	FailedJobs      uint64  `json:"failedJobs"`
	SuccessRate     float64 `json:"successRate"`     // Percentage
	AverageRating   float64 `json:"averageRating"`   // 0-5
	ResponseTime    uint64  `json:"responseTime"`    // Average in seconds
	CompletionTime  uint64  `json:"completionTime"`  // Average in seconds

	// Revenue Metrics
	TotalEarnings   uint64  `json:"totalEarnings"`   // Lamports
	AverageEarnings float64 `json:"averageEarnings"` // Per job in SOL

	// Reputation Tags
	Tags []ReputationTag `json:"tags"`

	// Verification
	AdminVerified bool      `json:"adminVerified"`
	VerifiedAt    *time.Time `json:"verifiedAt,omitempty"`

	// PayAI Integration
	PayAIEvents   uint64 `json:"payaiEvents"`   // Total PayAI webhook events
	PayAIRevenue  uint64 `json:"payaiRevenue"`  // Revenue from PayAI
	LastPayAISync time.Time `json:"lastPayaiSync"`

	// On-chain data
	PDA string `json:"pda"`
}

// ReputationUpdate represents a reputation update event
type ReputationUpdate struct {
	AgentAddress string    `json:"agentAddress"`
	EventType    string    `json:"eventType"` // job_completed, job_failed, payment_received, etc.
	Timestamp    time.Time `json:"timestamp"`

	// Job metrics
	JobID       string  `json:"jobId,omitempty"`
	Success     bool    `json:"success,omitempty"`
	Rating      float64 `json:"rating,omitempty"`
	Amount      uint64  `json:"amount,omitempty"`

	// Performance metrics
	ResponseTime   uint64 `json:"responseTime,omitempty"`
	CompletionTime uint64 `json:"completionTime,omitempty"`
}

// CalculateGhostScoreParams represents parameters for Ghost Score calculation
type CalculateGhostScoreParams struct {
	SuccessRate      float64
	AverageRating    float64
	TotalJobs        uint64
	ResponseTime     uint64  // Seconds
	CompletionTime   uint64  // Seconds
	AdminVerified    bool
	PayAIIntegration bool
}

// GetReputationParams represents parameters for getting reputation
type GetReputationParams struct {
	AgentAddress string
}

// UpdateReputationParams represents parameters for updating reputation
type UpdateReputationParams struct {
	AgentAddress string
	Update       ReputationUpdate
}

// CalculateGhostScore calculates the Ghost Score (0-1000) based on various factors
func CalculateGhostScore(params CalculateGhostScoreParams) int {
	score := 0.0

	// Success Rate (0-300 points)
	score += params.SuccessRate * 3.0

	// Average Rating (0-200 points)
	score += (params.AverageRating / 5.0) * 200.0

	// Experience (0-200 points)
	experiencePoints := float64(params.TotalJobs) * 2.0
	if experiencePoints > 200 {
		experiencePoints = 200
	}
	score += experiencePoints

	// Response Time (0-150 points)
	// Faster response = more points
	// Under 1 min = 150, under 5 min = 100, under 15 min = 50
	if params.ResponseTime <= 60 {
		score += 150
	} else if params.ResponseTime <= 300 {
		score += 100
	} else if params.ResponseTime <= 900 {
		score += 50
	}

	// Completion Time (0-100 points)
	// Faster completion = more points
	if params.CompletionTime <= 3600 { // 1 hour
		score += 100
	} else if params.CompletionTime <= 86400 { // 1 day
		score += 50
	}

	// Admin Verification (0-25 points)
	if params.AdminVerified {
		score += 25
	}

	// PayAI Integration (0-25 points)
	if params.PayAIIntegration {
		score += 25
	}

	// Cap at 1000
	if score > 1000 {
		score = 1000
	}

	return int(score)
}

// DetermineTier determines the reputation tier based on Ghost Score
func DetermineTier(ghostScore int) GhostScoreTier {
	if ghostScore >= 800 {
		return TierPlatinum
	} else if ghostScore >= 600 {
		return TierGold
	} else if ghostScore >= 400 {
		return TierSilver
	}
	return TierBronze
}

// DetermineTags determines reputation tags based on metrics
func DetermineTags(rep *Reputation) []ReputationTag {
	tags := []ReputationTag{}

	// Verified
	if rep.AdminVerified {
		tags = append(tags, TagVerified)
	}

	// Experience-based
	if rep.TotalJobs < 10 {
		tags = append(tags, TagNewcomer)
	} else if rep.TotalJobs >= 100 {
		tags = append(tags, TagExperienced)
	}

	// Performance-based
	if rep.SuccessRate >= 95.0 {
		tags = append(tags, TagHighPerformer)
	}

	if rep.SuccessRate >= 90.0 && rep.TotalJobs >= 50 {
		tags = append(tags, TagReliable)
	}

	// Trust-based
	if rep.GhostScore >= 800 && rep.AdminVerified {
		tags = append(tags, TagTrusted)
	}

	return tags
}

// CalculateSuccessRate calculates the success rate
func (r *Reputation) CalculateSuccessRate() float64 {
	if r.TotalJobs == 0 {
		return 0.0
	}
	return float64(r.CompletedJobs) / float64(r.TotalJobs) * 100.0
}

// CalculateAverageEarnings calculates average earnings per job
func (r *Reputation) CalculateAverageEarnings() float64 {
	if r.CompletedJobs == 0 {
		return 0.0
	}
	return LamportsToSOL(r.TotalEarnings) / float64(r.CompletedJobs)
}

// UpdateScore recalculates and updates the Ghost Score
func (r *Reputation) UpdateScore() {
	params := CalculateGhostScoreParams{
		SuccessRate:      r.SuccessRate,
		AverageRating:    r.AverageRating,
		TotalJobs:        r.TotalJobs,
		ResponseTime:     r.ResponseTime,
		CompletionTime:   r.CompletionTime,
		AdminVerified:    r.AdminVerified,
		PayAIIntegration: r.PayAIEvents > 0,
	}

	r.GhostScore = CalculateGhostScore(params)
	r.Tier = DetermineTier(r.GhostScore)
	r.Tags = DetermineTags(r)
	r.UpdatedAt = time.Now()
}

// ApplyJobCompletion applies a job completion event to reputation
func (r *Reputation) ApplyJobCompletion(rating float64, amount uint64, responseTime, completionTime uint64) {
	r.TotalJobs++
	r.CompletedJobs++
	r.TotalEarnings += amount

	// Update average rating
	if r.AverageRating == 0 {
		r.AverageRating = rating
	} else {
		totalRating := r.AverageRating * float64(r.CompletedJobs-1)
		r.AverageRating = (totalRating + rating) / float64(r.CompletedJobs)
	}

	// Update average times
	if r.ResponseTime == 0 {
		r.ResponseTime = responseTime
	} else {
		r.ResponseTime = (r.ResponseTime*(r.CompletedJobs-1) + responseTime) / r.CompletedJobs
	}

	if r.CompletionTime == 0 {
		r.CompletionTime = completionTime
	} else {
		r.CompletionTime = (r.CompletionTime*(r.CompletedJobs-1) + completionTime) / r.CompletedJobs
	}

	// Recalculate metrics
	r.SuccessRate = r.CalculateSuccessRate()
	r.AverageEarnings = r.CalculateAverageEarnings()

	// Update Ghost Score
	r.UpdateScore()
}

// ApplyJobFailure applies a job failure event to reputation
func (r *Reputation) ApplyJobFailure() {
	r.TotalJobs++
	r.FailedJobs++

	// Recalculate success rate
	r.SuccessRate = r.CalculateSuccessRate()

	// Update Ghost Score
	r.UpdateScore()
}

// Reputation-related errors
var (
	ErrReputationNotFound = fmt.Errorf("reputation not found")
	ErrInvalidScore       = fmt.Errorf("invalid Ghost Score")
)
