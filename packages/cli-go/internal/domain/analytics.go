package domain

import (
	"encoding/json"
	"time"
)

// Analytics represents aggregated analytics data
type Analytics struct {
	TotalAgents     int     `json:"totalAgents"`
	ActiveAgents    int     `json:"activeAgents"`
	TotalJobs       uint64  `json:"totalJobs"`
	CompletedJobs   uint64  `json:"completedJobs"`
	TotalEarnings   uint64  `json:"totalEarnings"`
	TotalEarningsSOL float64 `json:"totalEarningsSOL"`
	AverageRating   float64 `json:"averageRating"`
	SuccessRate     float64 `json:"successRate"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// AgentActivity represents recent agent activity
type AgentActivity struct {
	AgentID     string    `json:"agentId"`
	AgentName   string    `json:"agentName"`
	Activity    string    `json:"activity"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
}

// EarningsPeriod represents earnings over a time period
type EarningsPeriod struct {
	Period   string  `json:"period"`
	Earnings uint64  `json:"earnings"`
	Jobs     uint64  `json:"jobs"`
}

// CalculateSuccessRate calculates overall success rate
func (a *Analytics) CalculateSuccessRate() float64 {
	if a.TotalJobs == 0 {
		return 0.0
	}
	return float64(a.CompletedJobs) / float64(a.TotalJobs) * 100
}

// LamportsToSOL converts lamports to SOL
func LamportsToSOL(lamports uint64) float64 {
	return float64(lamports) / 1_000_000_000
}

// SOLToLamports converts SOL to lamports
func SOLToLamports(sol float64) uint64 {
	return uint64(sol * 1_000_000_000)
}

// MarshalJSON marshals any value to pretty-printed JSON
func MarshalJSON(v interface{}) (string, error) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
