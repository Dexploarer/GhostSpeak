package domain

// GHOST Token Configuration
// Based on web package: packages/web/lib/b2b-token-accounts.ts

const (
	// GHOST Token Decimals (verified on-chain for both networks)
	GhostTokenDecimals = 6

	// Devnet GHOST Token (test token for development)
	// Use /api/airdrop/ghost endpoint for test tokens
	GhostTokenMintDevnet = "BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh"

	// Mainnet GHOST Token (real pump.fun token)
	GhostTokenMintMainnet = "DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump"
)

// GetGhostTokenMint returns the GHOST token mint address for the given network
func GetGhostTokenMint(network string) string {
	switch network {
	case "devnet":
		return GhostTokenMintDevnet
	case "mainnet", "mainnet-beta":
		return GhostTokenMintMainnet
	default:
		// Default to devnet for safety
		return GhostTokenMintDevnet
	}
}

// GhostTokensToMicroTokens converts GHOST tokens to micro tokens (6 decimals)
func GhostTokensToMicroTokens(tokens float64) uint64 {
	return uint64(tokens * 1_000_000)
}

// MicroTokensToGhostTokens converts micro tokens to GHOST tokens (6 decimals)
func MicroTokensToGhostTokens(microTokens uint64) float64 {
	return float64(microTokens) / 1_000_000
}

// Legacy functions for compatibility (deprecated - use MicroTokens versions)
// These will be removed in a future version

// GhostTokensToLamports is deprecated, use GhostTokensToMicroTokens
// Keeping for backwards compatibility with existing code
func GhostTokensToLamports(tokens float64) uint64 {
	return GhostTokensToMicroTokens(tokens)
}

// LamportsToGhostTokens is deprecated, use MicroTokensToGhostTokens
// Keeping for backwards compatibility with existing code
func LamportsToGhostTokens(lamports uint64) float64 {
	return MicroTokensToGhostTokens(lamports)
}
