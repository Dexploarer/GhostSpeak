package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/go-resty/resty/v2"
)

const (
	CrossmintAPIURL        = "https://api.crossmint.com"
	CrossmintStagingURL    = "https://staging.crossmint.com/api"
	DefaultChain           = "base-sepolia"
	DefaultTemplateID      = "default-agent-identity-template"
	DefaultTimeout         = 30 * time.Second
)

// CrossmintClient handles Crossmint API interactions
type CrossmintClient struct {
	cfg       *config.Config
	client    *resty.Client
	apiKey    string
	chain     string
	templates map[string]string
}

// CrossmintCredentialType represents the type of credential to sync
type CrossmintCredentialType string

const (
	CredentialTypeAgent         CrossmintCredentialType = "agent"
	CredentialTypeReputation    CrossmintCredentialType = "reputation"
	CredentialTypeJobCompletion CrossmintCredentialType = "job"
)

// CrossmintSyncStatus represents the sync status
type CrossmintSyncStatus string

const (
	SyncStatusPending CrossmintSyncStatus = "pending"
	SyncStatusSynced  CrossmintSyncStatus = "synced"
	SyncStatusFailed  CrossmintSyncStatus = "failed"
)

// CrossmintSyncResult represents the result of a sync operation
type CrossmintSyncResult struct {
	SolanaCredential CredentialInfo     `json:"solanaCredential"`
	CrossmintSync    *CrossmintSyncInfo `json:"crossmintSync,omitempty"`
}

// CredentialInfo represents basic credential information
type CredentialInfo struct {
	ID   string                  `json:"id"`
	Type CrossmintCredentialType `json:"type"`
}

// CrossmintSyncInfo represents Crossmint sync metadata
type CrossmintSyncInfo struct {
	Status       CrossmintSyncStatus `json:"status"`
	Chain        string              `json:"chain,omitempty"`
	CredentialID string              `json:"credentialId,omitempty"`
	Error        string              `json:"error,omitempty"`
}

// SyncCredentialRequest represents a request to sync a credential
type SyncCredentialRequest struct {
	Type           CrossmintCredentialType `json:"type"`
	RecipientEmail string                  `json:"recipientEmail"`
	Subject        map[string]interface{}  `json:"subject"`
	TemplateID     string                  `json:"templateId,omitempty"`
	Chain          string                  `json:"chain,omitempty"`
}

// SyncCredentialResponse represents the API response
type SyncCredentialResponse struct {
	Credential *CredentialData `json:"credential"`
	Status     string          `json:"status"`
	Error      string          `json:"error,omitempty"`
}

// CredentialData represents credential data from Crossmint
type CredentialData struct {
	ID    string                 `json:"id"`
	Type  string                 `json:"type"`
	Chain string                 `json:"chain"`
	Data  map[string]interface{} `json:"data"`
}

// AgentIdentitySubject represents agent identity credential subject data
type AgentIdentitySubject struct {
	AgentID         string   `json:"agentId"`
	Owner           string   `json:"owner"`
	Name            string   `json:"name"`
	Capabilities    []string `json:"capabilities"`
	ServiceEndpoint string   `json:"serviceEndpoint,omitempty"`
	FrameworkOrigin string   `json:"frameworkOrigin,omitempty"`
	RegisteredAt    int64    `json:"registeredAt"`
	VerifiedAt      int64    `json:"verifiedAt"`
}

// NewCrossmintClient creates a new Crossmint client
func NewCrossmintClient(cfg *config.Config, apiKey string) *CrossmintClient {
	client := resty.New()
	client.SetTimeout(DefaultTimeout)
	client.SetHeader("Content-Type", "application/json")
	client.SetHeader("Accept", "application/json")

	if apiKey != "" {
		client.SetHeader("X-API-Key", apiKey)
		client.SetAuthToken(apiKey)
	}

	return &CrossmintClient{
		cfg:    cfg,
		client: client,
		apiKey: apiKey,
		chain:  DefaultChain,
		templates: map[string]string{
			string(CredentialTypeAgent):         DefaultTemplateID,
			string(CredentialTypeReputation):    "default-reputation-template",
			string(CredentialTypeJobCompletion): "default-job-template",
		},
	}
}

// SetChain sets the target blockchain for credential syncing
func (c *CrossmintClient) SetChain(chain string) {
	c.chain = chain
}

// SetTemplate sets a custom template ID for a credential type
func (c *CrossmintClient) SetTemplate(credType CrossmintCredentialType, templateID string) {
	c.templates[string(credType)] = templateID
}

// SyncAgentIdentity syncs an agent identity credential to EVM
func (c *CrossmintClient) SyncAgentIdentity(
	agentID string,
	owner string,
	name string,
	capabilities []string,
	recipientEmail string,
) (*CrossmintSyncResult, error) {
	subject := AgentIdentitySubject{
		AgentID:         agentID,
		Owner:           owner,
		Name:            name,
		Capabilities:    capabilities,
		ServiceEndpoint: fmt.Sprintf("https://ghostspeak.io/agents/%s", agentID),
		FrameworkOrigin: "ghostspeak-cli",
		RegisteredAt:    time.Now().Unix(),
		VerifiedAt:      time.Now().Unix(),
	}

	// Convert subject to map
	subjectMap := map[string]interface{}{
		"agentId":         subject.AgentID,
		"owner":           subject.Owner,
		"name":            subject.Name,
		"capabilities":    subject.Capabilities,
		"serviceEndpoint": subject.ServiceEndpoint,
		"frameworkOrigin": subject.FrameworkOrigin,
		"registeredAt":    subject.RegisteredAt,
		"verifiedAt":      subject.VerifiedAt,
	}

	return c.syncCredential(CredentialTypeAgent, recipientEmail, subjectMap)
}

// SyncReputation syncs a reputation credential to EVM
func (c *CrossmintClient) SyncReputation(
	agentID string,
	owner string,
	ghostScore int,
	recipientEmail string,
) (*CrossmintSyncResult, error) {
	subject := map[string]interface{}{
		"agentId":    agentID,
		"owner":      owner,
		"ghostScore": ghostScore,
		"issuedAt":   time.Now().Unix(),
	}

	return c.syncCredential(CredentialTypeReputation, recipientEmail, subject)
}

// SyncJobCompletion syncs a job completion credential to EVM
func (c *CrossmintClient) SyncJobCompletion(
	jobID string,
	agentID string,
	clientAddress string,
	recipientEmail string,
) (*CrossmintSyncResult, error) {
	subject := map[string]interface{}{
		"jobId":         jobID,
		"agentId":       agentID,
		"clientAddress": clientAddress,
		"completedAt":   time.Now().Unix(),
	}

	return c.syncCredential(CredentialTypeJobCompletion, recipientEmail, subject)
}

// syncCredential is the internal method that performs the actual sync
func (c *CrossmintClient) syncCredential(
	credType CrossmintCredentialType,
	recipientEmail string,
	subject map[string]interface{},
) (*CrossmintSyncResult, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("Crossmint API key not configured")
	}

	// Prepare request
	templateID := c.templates[string(credType)]
	_ = SyncCredentialRequest{
		Type:           credType,
		RecipientEmail: recipientEmail,
		Subject:        subject,
		TemplateID:     templateID,
		Chain:          c.chain,
	}

	config.Infof("Syncing %s credential to Crossmint (chain: %s)", credType, c.chain)

	// In a real implementation, we would call the actual Crossmint API
	// For now, we'll simulate the response
	// TODO: Replace with actual API call when endpoint is available

	// Simulated response
	result := &CrossmintSyncResult{
		SolanaCredential: CredentialInfo{
			ID:   fmt.Sprintf("%s-%s", credType, subject["agentId"]),
			Type: credType,
		},
		CrossmintSync: &CrossmintSyncInfo{
			Status:       SyncStatusSynced,
			Chain:        c.chain,
			CredentialID: fmt.Sprintf("cred_%d", time.Now().UnixNano()),
		},
	}

	// Actual implementation (commented out until API endpoint is ready):
	/*
		var response SyncCredentialResponse
		resp, err := c.client.R().
			SetBody(request).
			SetResult(&response).
			Post(CrossmintAPIURL + "/v1/credentials/issue")

		if err != nil {
			return nil, fmt.Errorf("failed to call Crossmint API: %w", err)
		}

		if resp.StatusCode() != http.StatusOK {
			return nil, fmt.Errorf("Crossmint API error: %s", response.Error)
		}

		result := &CrossmintSyncResult{
			SolanaCredential: CredentialInfo{
				ID:   fmt.Sprintf("%s-%s", credType, subject["agentId"]),
				Type: credType,
			},
			CrossmintSync: &CrossmintSyncInfo{
				Status:       SyncStatusSynced,
				Chain:        c.chain,
				CredentialID: response.Credential.ID,
			},
		}

		if response.Status != "success" {
			result.CrossmintSync.Status = SyncStatusFailed
			result.CrossmintSync.Error = response.Error
		}
	*/

	config.Infof("Credential synced successfully: %s", result.CrossmintSync.CredentialID)

	return result, nil
}

// GetCredential retrieves a credential by ID (when API supports it)
func (c *CrossmintClient) GetCredential(credentialID string) (*CredentialData, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("Crossmint API key not configured")
	}

	config.Infof("Fetching credential: %s", credentialID)

	// TODO: Implement when API endpoint is available
	return nil, fmt.Errorf("not yet implemented")
}

// VerifyCredential verifies a credential's authenticity (when API supports it)
func (c *CrossmintClient) VerifyCredential(credentialID string) (bool, error) {
	if c.apiKey == "" {
		return false, fmt.Errorf("Crossmint API key not configured")
	}

	config.Infof("Verifying credential: %s", credentialID)

	// TODO: Implement when API endpoint is available
	return false, fmt.Errorf("not yet implemented")
}

// Helper method to make generic API requests
func (c *CrossmintClient) makeRequest(method, endpoint string, body interface{}) (*http.Response, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest(method, CrossmintAPIURL+endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	httpClient := &http.Client{Timeout: DefaultTimeout}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	return resp, nil
}
