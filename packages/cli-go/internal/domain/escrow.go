package domain

import (
	"fmt"
	"time"
)

// EscrowStatus represents the status of an escrow
type EscrowStatus string

const (
	EscrowStatusCreated    EscrowStatus = "created"
	EscrowStatusFunded     EscrowStatus = "funded"
	EscrowStatusInProgress EscrowStatus = "in_progress"
	EscrowStatusCompleted  EscrowStatus = "completed"
	EscrowStatusReleased   EscrowStatus = "released"
	EscrowStatusDisputed   EscrowStatus = "disputed"
	EscrowStatusCancelled  EscrowStatus = "cancelled"
)

// PaymentToken represents supported payment tokens
type PaymentToken string

const (
	TokenSOL   PaymentToken = "SOL"
	TokenUSDC  PaymentToken = "USDC"
	TokenUSDT  PaymentToken = "USDT"
	TokenGHOST PaymentToken = "GHOST"
)

// DisputeStatus represents the status of a dispute
type DisputeStatus string

const (
	DisputeStatusOpen        DisputeStatus = "open"
	DisputeStatusUnderReview DisputeStatus = "under_review"
	DisputeStatusResolved    DisputeStatus = "resolved"
	DisputeStatusClosed      DisputeStatus = "closed"
)

// TokenMetadata contains information about a token
type TokenMetadata struct {
	Symbol   PaymentToken `json:"symbol"`
	Mint     string       `json:"mint"`
	Decimals uint8        `json:"decimals"`
}

// GetTokenMetadata returns metadata for supported tokens
func GetTokenMetadata(token PaymentToken) TokenMetadata {
	switch token {
	case TokenSOL:
		return TokenMetadata{
			Symbol:   TokenSOL,
			Mint:     "So11111111111111111111111111111111111111112", // Native SOL
			Decimals: 9,
		}
	case TokenUSDC:
		return TokenMetadata{
			Symbol:   TokenUSDC,
			Mint:     "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			Decimals: 6,
		}
	case TokenUSDT:
		return TokenMetadata{
			Symbol:   TokenUSDT,
			Mint:     "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
			Decimals: 6,
		}
	case TokenGHOST:
		return TokenMetadata{
			Symbol:   TokenGHOST,
			Mint:     "DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump",
			Decimals: 9,
		}
	default:
		return TokenMetadata{
			Symbol:   TokenSOL,
			Mint:     "So11111111111111111111111111111111111111112",
			Decimals: 9,
		}
	}
}

// DisputeResolution represents the resolution of a dispute
type DisputeResolution string

const (
	ResolutionClientFavor DisputeResolution = "client_favor"
	ResolutionAgentFavor  DisputeResolution = "agent_favor"
	ResolutionSplit       DisputeResolution = "split"
)

// Escrow represents an escrow agreement
type Escrow struct {
	// Identity
	ID        string       `json:"id"`
	Status    EscrowStatus `json:"status"`
	CreatedAt time.Time    `json:"createdAt"`
	UpdatedAt time.Time    `json:"updatedAt"`

	// Parties
	Client string `json:"client"` // Client address
	Agent  string `json:"agent"`  // Agent address

	// Payment details
	Amount      uint64       `json:"amount"`      // Amount in smallest unit
	Token       PaymentToken `json:"token"`       // Payment token
	TokenMint   string       `json:"tokenMint"`   // Token mint address
	TokenSymbol string       `json:"tokenSymbol"` // Token symbol for display

	// Terms
	JobID       string     `json:"jobId,omitempty"`
	Description string     `json:"description"`
	Deadline    *time.Time `json:"deadline,omitempty"`
	Milestones  []string   `json:"milestones,omitempty"` // Optional milestones

	// Timeline
	FundedAt    *time.Time `json:"fundedAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	ReleasedAt  *time.Time `json:"releasedAt,omitempty"`
	CanceledAt  *time.Time `json:"canceledAt,omitempty"`

	// Dispute
	Dispute *Dispute `json:"dispute,omitempty"`

	// On-chain data
	PDA string `json:"pda"`
}

// Dispute represents a dispute on an escrow
type Dispute struct {
	ID            string            `json:"id"`
	Initiator     string            `json:"initiator"`     // Who started the dispute
	Reason        string            `json:"reason"`
	Evidence      []string          `json:"evidence"`      // IPFS hashes
	Status        DisputeStatus     `json:"status"`
	Resolution    DisputeResolution `json:"resolution,omitempty"`
	ResolvedBy    string            `json:"resolvedBy,omitempty"`    // Resolver address
	ClientAmount  uint64            `json:"clientAmount,omitempty"`  // Amount to client
	AgentAmount   uint64            `json:"agentAmount,omitempty"`   // Amount to agent
	CreatedAt     time.Time         `json:"createdAt"`
	ResolvedAt    *time.Time        `json:"resolvedAt,omitempty"`
}

// CreateEscrowParams represents parameters for creating an escrow
type CreateEscrowParams struct {
	JobID       string
	Agent       string
	Amount      uint64
	Token       PaymentToken
	Description string
	Deadline    *time.Time
	Milestones  []string
}

// FundEscrowParams represents parameters for funding an escrow
type FundEscrowParams struct {
	EscrowPDA string
}

// ReleaseEscrowParams represents parameters for releasing funds
type ReleaseEscrowParams struct {
	EscrowPDA string
}

// DisputeEscrowParams represents parameters for disputing an escrow
type DisputeEscrowParams struct {
	EscrowPDA string
	Reason    string
	Evidence  []string
}

// ResolveDisputeParams represents parameters for resolving a dispute
type ResolveDisputeParams struct {
	EscrowPDA     string
	Resolution    DisputeResolution
	ClientAmount  uint64
	AgentAmount   uint64
}

// CancelEscrowParams represents parameters for canceling an escrow
type CancelEscrowParams struct {
	EscrowPDA string
}

// IsActive checks if the escrow is active
func (e *Escrow) IsActive() bool {
	return e.Status == EscrowStatusFunded || e.Status == EscrowStatusCompleted
}

// CanRelease checks if funds can be released
func (e *Escrow) CanRelease() bool {
	return e.Status == EscrowStatusCompleted && e.Dispute == nil
}

// CanDispute checks if the escrow can be disputed
func (e *Escrow) CanDispute() bool {
	return e.Status == EscrowStatusFunded || e.Status == EscrowStatusCompleted
}

// CanCancel checks if the escrow can be canceled
func (e *Escrow) CanCancel() bool {
	return e.Status == EscrowStatusCreated || e.Status == EscrowStatusFunded
}

// GetStatusEmoji returns an emoji for the escrow status
func (e *Escrow) GetStatusEmoji() string {
	switch e.Status {
	case EscrowStatusCompleted, EscrowStatusReleased:
		return "🟢"
	case EscrowStatusInProgress, EscrowStatusFunded:
		return "🟡"
	case EscrowStatusDisputed:
		return "🔴"
	case EscrowStatusCancelled:
		return "⚫"
	default:
		return "⚪"
	}
}

// GetFormattedAmount returns the amount formatted with proper decimals
func (e *Escrow) GetFormattedAmount() string {
	return FormatTokenAmount(e.Amount, e.Token)
}

// FormatTokenAmount formats an amount with proper decimals for a token
func FormatTokenAmount(amount uint64, token PaymentToken) string {
	metadata := GetTokenMetadata(token)
	divisor := uint64(1)
	for i := uint8(0); i < metadata.Decimals; i++ {
		divisor *= 10
	}

	floatAmount := float64(amount) / float64(divisor)

	if metadata.Decimals >= 9 {
		return fmt.Sprintf("%.9f %s", floatAmount, token)
	}
	return fmt.Sprintf("%.6f %s", floatAmount, token)
}

// ParseTokenAmount parses a string amount to the smallest unit for a token
func ParseTokenAmount(amountStr string, token PaymentToken) (uint64, error) {
	var floatAmount float64
	_, err := fmt.Sscanf(amountStr, "%f", &floatAmount)
	if err != nil {
		return 0, fmt.Errorf("invalid amount format: %w", err)
	}

	if floatAmount <= 0 {
		return 0, ErrInvalidAmount
	}

	metadata := GetTokenMetadata(token)
	multiplier := uint64(1)
	for i := uint8(0); i < metadata.Decimals; i++ {
		multiplier *= 10
	}

	return uint64(floatAmount * float64(multiplier)), nil
}

// IsOverdue checks if the escrow is past its deadline
func (e *Escrow) IsOverdue() bool {
	if e.Deadline == nil {
		return false
	}
	return time.Now().After(*e.Deadline) && e.Status != EscrowStatusReleased
}

// GetTimeUntilDeadline returns the time remaining until deadline
func (e *Escrow) GetTimeUntilDeadline() time.Duration {
	if e.Deadline == nil {
		return 0
	}

	remaining := time.Until(*e.Deadline)
	if remaining < 0 {
		return 0
	}

	return remaining
}

// GetDuration returns the duration of the escrow
func (e *Escrow) GetDuration() time.Duration {
	if e.ReleasedAt != nil {
		return e.ReleasedAt.Sub(e.CreatedAt)
	}
	if e.CanceledAt != nil {
		return e.CanceledAt.Sub(e.CreatedAt)
	}
	return time.Since(e.CreatedAt)
}

// ValidateCreateEscrowParams validates escrow creation parameters
func ValidateCreateEscrowParams(params CreateEscrowParams) error {
	if params.Agent == "" {
		return fmt.Errorf("agent address is required")
	}
	if params.Amount < 1000 { // Minimum amount
		return fmt.Errorf("minimum escrow amount is 0.000001 SOL")
	}
	if params.Description == "" {
		return fmt.Errorf("description is required")
	}
	if len(params.Description) > 500 {
		return fmt.Errorf("description must be less than 500 characters")
	}
	if params.Deadline != nil && params.Deadline.Before(time.Now()) {
		return fmt.Errorf("deadline must be in the future")
	}
	return nil
}

// ValidateDisputeParams validates dispute parameters
func ValidateDisputeEscrowParams(params DisputeEscrowParams) error {
	if params.Reason == "" {
		return fmt.Errorf("dispute reason is required")
	}
	if len(params.Reason) > 1000 {
		return fmt.Errorf("reason must be less than 1000 characters")
	}
	return nil
}

// Escrow-related errors
var (
	ErrEscrowNotFound     = fmt.Errorf("escrow not found")
	ErrEscrowNotFunded    = fmt.Errorf("escrow is not funded")
	ErrEscrowAlreadyFunded = fmt.Errorf("escrow is already funded")
	ErrEscrowCanceled     = fmt.Errorf("escrow has been canceled")
	ErrEscrowDisputed     = fmt.Errorf("escrow is disputed")
	ErrNotAuthorized      = fmt.Errorf("not authorized to perform this action")
	ErrDeadlinePassed     = fmt.Errorf("deadline has passed")
	ErrInvalidAmount      = fmt.Errorf("invalid amount")
)
