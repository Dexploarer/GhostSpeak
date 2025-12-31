package solana

import (
	"fmt"

	"github.com/gagliardetto/solana-go"
)

// PDA seeds for different account types
const (
	AgentSeed      = "agent"
	PaymentSeed    = "payment"
	EscrowSeed     = "escrow"
	ReviewSeed     = "review"
)

// DeriveAgentPDA derives the PDA for an agent account
func DeriveAgentPDA(programID solana.PublicKey, agentID string, owner solana.PublicKey) (solana.PublicKey, uint8, error) {
	// Ensure agentID is exactly 32 bytes (padded with zeros)
	agentIDBytes := make([]byte, 32)
	copy(agentIDBytes, []byte(agentID))

	seeds := [][]byte{
		[]byte(AgentSeed),
		agentIDBytes,
		owner.Bytes(),
	}

	pda, bump, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return solana.PublicKey{}, 0, fmt.Errorf("failed to derive agent PDA: %w", err)
	}

	return pda, bump, nil
}

// DerivePaymentPDA derives the PDA for a payment account
func DerivePaymentPDA(programID solana.PublicKey, paymentID string) (solana.PublicKey, uint8, error) {
	paymentIDBytes := make([]byte, 32)
	copy(paymentIDBytes, []byte(paymentID))

	seeds := [][]byte{
		[]byte(PaymentSeed),
		paymentIDBytes,
	}

	pda, bump, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return solana.PublicKey{}, 0, fmt.Errorf("failed to derive payment PDA: %w", err)
	}

	return pda, bump, nil
}

// DeriveEscrowPDA derives the PDA for an escrow account
func DeriveEscrowPDA(programID solana.PublicKey, escrowID string) (solana.PublicKey, uint8, error) {
	escrowIDBytes := make([]byte, 32)
	copy(escrowIDBytes, []byte(escrowID))

	seeds := [][]byte{
		[]byte(EscrowSeed),
		escrowIDBytes,
	}

	pda, bump, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return solana.PublicKey{}, 0, fmt.Errorf("failed to derive escrow PDA: %w", err)
	}

	return pda, bump, nil
}

// DeriveReviewPDA derives the PDA for a review account
func DeriveReviewPDA(programID solana.PublicKey, agentPDA solana.PublicKey, reviewer solana.PublicKey) (solana.PublicKey, uint8, error) {
	seeds := [][]byte{
		[]byte(ReviewSeed),
		agentPDA.Bytes(),
		reviewer.Bytes(),
	}

	pda, bump, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return solana.PublicKey{}, 0, fmt.Errorf("failed to derive review PDA: %w", err)
	}

	return pda, bump, nil
}

// VerifyPDA verifies that a PDA was derived correctly
func VerifyPDA(pda solana.PublicKey, seeds [][]byte, programID solana.PublicKey) bool {
	derivedPDA, _, err := solana.FindProgramAddress(seeds, programID)
	if err != nil {
		return false
	}
	return derivedPDA.Equals(pda)
}
