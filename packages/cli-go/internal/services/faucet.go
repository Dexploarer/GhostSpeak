package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
)

// FaucetService handles GHOST token airdrop requests
type FaucetService struct {
	config *config.Config
	client *http.Client
}

// NewFaucetService creates a new faucet service
func NewFaucetService(cfg *config.Config) *FaucetService {
	return &FaucetService{
		config: cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// AirdropRequest represents the request body for GHOST airdrop
type AirdropRequest struct {
	Recipient string `json:"recipient"`
}

// AirdropResponse represents the response from GHOST airdrop API
type AirdropResponse struct {
	Success bool    `json:"success"`
	Signature string `json:"signature,omitempty"`
	Amount  int     `json:"amount,omitempty"`
	Balance float64 `json:"balance,omitempty"`
	Explorer string `json:"explorer,omitempty"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
	NextClaimIn int `json:"nextClaimIn,omitempty"`
}

// RequestGhostAirdrop requests GHOST tokens from the devnet faucet
// Returns the transaction signature and new balance
func (s *FaucetService) RequestGhostAirdrop(walletAddress string) (*AirdropResponse, error) {
	// Get faucet API URL from config or use default
	apiURL := s.getFaucetAPIURL()

	// Build request
	reqBody := AirdropRequest{
		Recipient: walletAddress,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make HTTP request
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "GhostSpeak-CLI/1.0.0")

	config.Debugf("Requesting GHOST airdrop from %s", apiURL)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	config.Debugf("Airdrop response status: %d", resp.StatusCode)
	config.Debugf("Airdrop response body: %s", string(body))

	// Parse response
	var airdropResp AirdropResponse
	if err := json.Unmarshal(body, &airdropResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Check HTTP status code
	if resp.StatusCode == 429 {
		// Rate limit exceeded
		hours := airdropResp.NextClaimIn
		if hours == 0 {
			hours = 24 // Default fallback
		}
		return nil, fmt.Errorf("rate limit exceeded: please wait %d hour(s) before claiming again", hours)
	}

	if resp.StatusCode != 200 {
		errorMsg := airdropResp.Error
		if errorMsg == "" {
			errorMsg = airdropResp.Message
		}
		if errorMsg == "" {
			errorMsg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("airdrop failed: %s", errorMsg)
	}

	// Check success flag
	if !airdropResp.Success {
		errorMsg := airdropResp.Error
		if errorMsg == "" {
			errorMsg = "unknown error"
		}
		return nil, fmt.Errorf("airdrop failed: %s", errorMsg)
	}

	return &airdropResp, nil
}

// getFaucetAPIURL returns the faucet API URL based on configuration
func (s *FaucetService) getFaucetAPIURL() string {
	// Try to get from config (if we add it in the future)
	// if s.config.API.FaucetURL != "" {
	// 	return s.config.API.FaucetURL
	// }

	// Default based on network
	// For devnet, use the production GhostSpeak web API
	// This assumes the web server is deployed and accessible

	// Check if we're in local development
	// User can set GHOSTSPEAK_API_URL environment variable to override
	if apiURL := s.config.GetEnv("GHOSTSPEAK_API_URL"); apiURL != "" {
		return apiURL + "/api/airdrop/ghost"
	}

	// Default to production API
	// Note: This will work if the GhostSpeak web app is deployed
	// For local development, users should set GHOSTSPEAK_API_URL=http://localhost:3000
	return "https://ghostspeak.ai/api/airdrop/ghost"
}

// GetFaucetStatus checks the status of the GHOST faucet
func (s *FaucetService) GetFaucetStatus() (map[string]interface{}, error) {
	apiURL := s.getFaucetAPIURL()

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "GhostSpeak-CLI/1.0.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var status map[string]interface{}
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return status, nil
}
