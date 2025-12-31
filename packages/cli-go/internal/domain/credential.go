package domain

import (
	"fmt"
	"time"
)

// CredentialType represents the type of verifiable credential
type CredentialType string

const (
	CredentialTypeAgentIdentity CredentialType = "AgentIdentity"
	CredentialTypeReputation    CredentialType = "Reputation"
	CredentialTypeJobCompletion CredentialType = "JobCompletion"
)

// CredentialStatus represents the status of a credential
type CredentialStatus string

const (
	CredentialStatusActive  CredentialStatus = "active"
	CredentialStatusRevoked CredentialStatus = "revoked"
	CredentialStatusExpired CredentialStatus = "expired"
)

// Credential represents a W3C-compliant verifiable credential
type Credential struct {
	// Core fields
	ID      string           `json:"id"`
	Type    CredentialType   `json:"type"`
	Subject string           `json:"subject"`       // Agent address
	Issuer  string           `json:"issuer"`        // DID of issuer
	Status  CredentialStatus `json:"status"`

	// Subject data (credential-specific)
	SubjectData map[string]interface{} `json:"subjectData"`

	// Timestamps
	IssuedAt  time.Time  `json:"issuedAt"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`

	// Cross-chain sync
	CrossmintSync *CrossmintSyncInfo `json:"crossmintSync,omitempty"`

	// On-chain data
	PDA string `json:"pda"`
}

// CrossmintSyncInfo represents cross-chain sync metadata
type CrossmintSyncInfo struct {
	Status       string `json:"status"`       // pending, synced, failed
	Chain        string `json:"chain"`        // base-sepolia, polygon-amoy, etc.
	CredentialID string `json:"credentialId"` // EVM credential ID
	Error        string `json:"error,omitempty"`
}

// AgentIdentitySubjectData represents subject data for AgentIdentity credentials
type AgentIdentitySubjectData struct {
	AgentID         string   `json:"agentId"`
	Owner           string   `json:"owner"`
	Name            string   `json:"name"`
	Capabilities    []string `json:"capabilities"`
	ServiceEndpoint string   `json:"serviceEndpoint,omitempty"`
	FrameworkOrigin string   `json:"frameworkOrigin,omitempty"`
	RegisteredAt    int64    `json:"registeredAt"`
	VerifiedAt      int64    `json:"verifiedAt"`
}

// ReputationSubjectData represents subject data for Reputation credentials
type ReputationSubjectData struct {
	AgentID    string `json:"agentId"`
	Owner      string `json:"owner"`
	GhostScore int    `json:"ghostScore"` // 0-1000
	Tier       string `json:"tier"`       // Bronze, Silver, Gold, Platinum
	TotalJobs  uint64 `json:"totalJobs"`
	SuccessRate float64 `json:"successRate"`
	IssuedAt   int64  `json:"issuedAt"`
}

// JobCompletionSubjectData represents subject data for JobCompletion credentials
type JobCompletionSubjectData struct {
	JobID         string  `json:"jobId"`
	AgentID       string  `json:"agentId"`
	ClientAddress string  `json:"clientAddress"`
	Amount        uint64  `json:"amount"`
	Rating        float64 `json:"rating"`
	CompletedAt   int64   `json:"completedAt"`
}

// IssueCredentialParams represents parameters for issuing a credential
type IssueCredentialParams struct {
	Type           CredentialType
	Subject        string
	SubjectData    map[string]interface{}
	ExpiresAt      *time.Time
	SyncToCrossmint bool
	RecipientEmail  string // For Crossmint sync
}

// RevokeCredentialParams represents parameters for revoking a credential
type RevokeCredentialParams struct {
	CredentialPDA string
	Reason        string
}

// W3CCredential represents a W3C-compliant verifiable credential for export
type W3CCredential struct {
	Context           []string               `json:"@context"`
	ID                string                 `json:"id"`
	Type              []string               `json:"type"`
	Issuer            string                 `json:"issuer"`
	IssuanceDate      string                 `json:"issuanceDate"`
	ExpirationDate    string                 `json:"expirationDate,omitempty"`
	CredentialSubject map[string]interface{} `json:"credentialSubject"`
	Proof             *W3CProof              `json:"proof,omitempty"`
}

// W3CProof represents a cryptographic proof
type W3CProof struct {
	Type               string `json:"type"`
	Created            string `json:"created"`
	VerificationMethod string `json:"verificationMethod"`
	ProofPurpose       string `json:"proofPurpose"`
	ProofValue         string `json:"proofValue"`
}

// ToW3C converts a credential to W3C format
func (c *Credential) ToW3C() *W3CCredential {
	w3c := &W3CCredential{
		Context: []string{
			"https://www.w3.org/2018/credentials/v1",
			"https://ghostspeak.io/credentials/v1",
		},
		ID:                fmt.Sprintf("https://ghostspeak.io/credentials/%s", c.ID),
		Type:              []string{"VerifiableCredential", string(c.Type)},
		Issuer:            c.Issuer,
		IssuanceDate:      c.IssuedAt.Format(time.RFC3339),
		CredentialSubject: c.SubjectData,
	}

	if c.ExpiresAt != nil {
		w3c.ExpirationDate = c.ExpiresAt.Format(time.RFC3339)
	}

	// Add subject ID
	w3c.CredentialSubject["id"] = c.Subject

	return w3c
}

// IsExpired checks if the credential has expired
func (c *Credential) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*c.ExpiresAt)
}

// IsValid checks if the credential is valid (active and not expired)
func (c *Credential) IsValid() bool {
	return c.Status == CredentialStatusActive && !c.IsExpired()
}

// ValidateIssueParams validates credential issuance parameters
func ValidateIssueCredentialParams(params IssueCredentialParams) error {
	if params.Type == "" {
		return fmt.Errorf("credential type is required")
	}
	if params.Subject == "" {
		return fmt.Errorf("subject is required")
	}
	if params.SubjectData == nil || len(params.SubjectData) == 0 {
		return fmt.Errorf("subject data is required")
	}
	if params.SyncToCrossmint && params.RecipientEmail == "" {
		return fmt.Errorf("recipient email is required for Crossmint sync")
	}
	return nil
}

// BuildAgentIdentitySubject builds subject data for an AgentIdentity credential
func BuildAgentIdentitySubject(
	agentID, owner, name string,
	capabilities []string,
	serviceEndpoint, frameworkOrigin string,
) map[string]interface{} {
	return map[string]interface{}{
		"agentId":         agentID,
		"owner":           owner,
		"name":            name,
		"capabilities":    capabilities,
		"serviceEndpoint": serviceEndpoint,
		"frameworkOrigin": frameworkOrigin,
		"registeredAt":    time.Now().Unix(),
		"verifiedAt":      time.Now().Unix(),
	}
}

// BuildReputationSubject builds subject data for a Reputation credential
func BuildReputationSubject(
	agentID, owner string,
	ghostScore int,
	tier string,
	totalJobs uint64,
	successRate float64,
) map[string]interface{} {
	return map[string]interface{}{
		"agentId":     agentID,
		"owner":       owner,
		"ghostScore":  ghostScore,
		"tier":        tier,
		"totalJobs":   totalJobs,
		"successRate": successRate,
		"issuedAt":    time.Now().Unix(),
	}
}

// BuildJobCompletionSubject builds subject data for a JobCompletion credential
func BuildJobCompletionSubject(
	jobID, agentID, clientAddress string,
	amount uint64,
	rating float64,
) map[string]interface{} {
	return map[string]interface{}{
		"jobId":         jobID,
		"agentId":       agentID,
		"clientAddress": clientAddress,
		"amount":        amount,
		"rating":        rating,
		"completedAt":   time.Now().Unix(),
	}
}

// Credential-related errors
var (
	ErrCredentialNotFound     = fmt.Errorf("credential not found")
	ErrCredentialRevoked      = fmt.Errorf("credential is revoked")
	ErrCredentialExpired      = fmt.Errorf("credential has expired")
	ErrInvalidCredentialType  = fmt.Errorf("invalid credential type")
	ErrUnauthorizedIssuer     = fmt.Errorf("unauthorized: signer is not authorized to issue credentials")
)
