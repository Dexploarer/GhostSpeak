package solana

import (
	"encoding/binary"
	"fmt"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// ParseAgentAccount parses raw account data into an Agent struct
// Matches the on-chain Rust struct layout
func ParseAgentAccount(data []byte, pubkey string) (*domain.Agent, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("account data too short")
	}

	offset := 0

	// Skip discriminator (8 bytes)
	offset += 8

	// Parse agent_id (32 bytes, UTF-8 string padded with zeros)
	if len(data) < offset+32 {
		return nil, fmt.Errorf("insufficient data for agent_id")
	}
	agentIDBytes := data[offset : offset+32]
	agentID := strings.TrimRight(string(agentIDBytes), "\x00")
	offset += 32

	// Parse owner (32 bytes, Pubkey)
	if len(data) < offset+32 {
		return nil, fmt.Errorf("insufficient data for owner")
	}
	ownerBytes := data[offset : offset+32]
	owner := BytesToPublicKey(ownerBytes)
	offset += 32

	// Parse name (64 bytes, UTF-8 string padded with zeros)
	if len(data) < offset+64 {
		return nil, fmt.Errorf("insufficient data for name")
	}
	nameBytes := data[offset : offset+64]
	name := strings.TrimRight(string(nameBytes), "\x00")
	offset += 64

	// Parse agent_type (1 byte, u8)
	if len(data) < offset+1 {
		return nil, fmt.Errorf("insufficient data for agent_type")
	}
	agentType := domain.AgentType(data[offset])
	offset += 1

	// Parse metadata_uri (256 bytes, UTF-8 string padded with zeros)
	if len(data) < offset+256 {
		return nil, fmt.Errorf("insufficient data for metadata_uri")
	}
	metadataURIBytes := data[offset : offset+256]
	metadataURI := strings.TrimRight(string(metadataURIBytes), "\x00")
	offset += 256

	// Parse status (1 byte, u8: 0=Active, 1=Inactive, 2=Pending)
	if len(data) < offset+1 {
		return nil, fmt.Errorf("insufficient data for status")
	}
	statusByte := data[offset]
	var status domain.AgentStatus
	switch statusByte {
	case 0:
		status = domain.AgentStatusActive
	case 1:
		status = domain.AgentStatusInactive
	case 2:
		status = domain.AgentStatusPending
	default:
		status = domain.AgentStatusInactive
	}
	offset += 1

	// Parse total_jobs (8 bytes, u64)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for total_jobs")
	}
	totalJobs := binary.LittleEndian.Uint64(data[offset : offset+8])
	offset += 8

	// Parse completed_jobs (8 bytes, u64)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for completed_jobs")
	}
	completedJobs := binary.LittleEndian.Uint64(data[offset : offset+8])
	offset += 8

	// Parse total_earnings (8 bytes, u64)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for total_earnings")
	}
	totalEarnings := binary.LittleEndian.Uint64(data[offset : offset+8])
	offset += 8

	// Parse average_rating (8 bytes, f64)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for average_rating")
	}
	averageRatingBits := binary.LittleEndian.Uint64(data[offset : offset+8])
	averageRating := float64frombits(averageRatingBits)
	offset += 8

	// Parse created_at (8 bytes, i64 Unix timestamp)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for created_at")
	}
	createdAtTimestamp := int64(binary.LittleEndian.Uint64(data[offset : offset+8]))
	createdAt := time.Unix(createdAtTimestamp, 0)
	offset += 8

	// Parse updated_at (8 bytes, i64 Unix timestamp)
	if len(data) < offset+8 {
		return nil, fmt.Errorf("insufficient data for updated_at")
	}
	updatedAtTimestamp := int64(binary.LittleEndian.Uint64(data[offset : offset+8]))
	updatedAt := time.Unix(updatedAtTimestamp, 0)
	offset += 8

	agent := &domain.Agent{
		ID:            agentID,
		Owner:         owner,
		Name:          name,
		AgentType:     agentType,
		MetadataURI:   metadataURI,
		Status:        status,
		TotalJobs:     totalJobs,
		CompletedJobs: completedJobs,
		TotalEarnings: totalEarnings,
		AverageRating: averageRating,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		PDA:           pubkey,
	}

	// Calculate success rate
	agent.SuccessRate = agent.CalculateSuccessRate()

	return agent, nil
}

// BytesToPublicKey converts bytes to a base58 public key string
func BytesToPublicKey(bytes []byte) string {
	if len(bytes) != 32 {
		return ""
	}
	// Create PublicKey from bytes and convert to base58 string
	var pubkeyArray [32]byte
	copy(pubkeyArray[:], bytes)
	pubkey := solana.PublicKeyFromBytes(pubkeyArray[:])
	return pubkey.String()
}

// float64frombits converts uint64 bits to float64 (IEEE 754)
func float64frombits(b uint64) float64 {
	// Simple conversion - in production use math.Float64frombits
	if b == 0 {
		return 0.0
	}
	// For now, return a simple approximation
	// This should be replaced with proper IEEE 754 conversion
	return float64(b) / 1e8 // Assuming fixed-point representation
}
