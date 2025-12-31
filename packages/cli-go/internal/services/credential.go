package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/ports"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// CredentialService handles credential operations
type CredentialService struct {
	cfg              *config.Config
	client           *solClient.Client
	walletService    *WalletService
	didService       *DIDService
	crossmintService *CrossmintClient
	storage          ports.Storage
}

// NewCredentialService creates a new credential service
func NewCredentialService(
	cfg *config.Config,
	client *solClient.Client,
	walletService *WalletService,
	didService *DIDService,
	crossmintService *CrossmintClient,
	storage ports.Storage,
) *CredentialService {
	return &CredentialService{
		cfg:              cfg,
		client:           client,
		walletService:    walletService,
		didService:       didService,
		crossmintService: crossmintService,
		storage:          storage,
	}
}

// IssueCredential issues a new verifiable credential
func (s *CredentialService) IssueCredential(params domain.IssueCredentialParams, walletPassword string) (*domain.Credential, error) {
	// Validate parameters
	if err := domain.ValidateIssueCredentialParams(params); err != nil {
		return nil, err
	}

	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return nil, fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	issuer := privateKey.PublicKey().String()

	// Check if issuer has a DID
	issuerDID, err := s.didService.ResolveDID(issuer)
	if err != nil {
		config.Warn("Issuer does not have a DID - creating one...")
		// Auto-create DID for issuer
		didParams := domain.CreateDIDParams{
			Controller: issuer,
			Network:    s.cfg.Network.Current,
			VerificationMethods: []domain.VerificationMethod{
				{
					ID:                 "auth-key-1",
					MethodType:         domain.VerificationMethodEd25519,
					Controller:         domain.FormatDID(s.cfg.Network.Current, issuer),
					PublicKeyMultibase: fmt.Sprintf("z%s", issuer),
					Relationships:      []domain.VerificationRelationship{domain.RelationshipAuthentication, domain.RelationshipAssertionMethod},
					Revoked:            false,
				},
			},
			ServiceEndpoints: []domain.ServiceEndpoint{},
		}
		issuerDID, err = s.didService.CreateDID(didParams, walletPassword)
		if err != nil {
			return nil, fmt.Errorf("failed to create issuer DID: %w", err)
		}
	}

	config.Infof("Issuing %s credential for subject: %s", params.Type, params.Subject)

	// Generate credential ID
	credentialID := fmt.Sprintf("%s_%d", params.Type, time.Now().UnixNano())

	// Derive PDA for credential
	credentialPDA := fmt.Sprintf("cred_%s", credentialID) // Simplified - real implementation would derive proper PDA

	// TODO: Build and send transaction to issue credential
	config.Warn("Transaction building not yet implemented - creating mock credential")

	// Create credential
	credential := &domain.Credential{
		ID:          credentialID,
		Type:        params.Type,
		Subject:     params.Subject,
		Issuer:      issuerDID.DID,
		Status:      domain.CredentialStatusActive,
		SubjectData: params.SubjectData,
		IssuedAt:    time.Now(),
		ExpiresAt:   params.ExpiresAt,
		PDA:         credentialPDA,
	}

	// Sync to Crossmint if requested
	if params.SyncToCrossmint && s.crossmintService != nil {
		config.Info("Syncing credential to Crossmint...")

		var syncResult *CrossmintSyncResult
		var syncErr error

		switch params.Type {
		case domain.CredentialTypeAgentIdentity:
			agentID, _ := params.SubjectData["agentId"].(string)
			owner, _ := params.SubjectData["owner"].(string)
			name, _ := params.SubjectData["name"].(string)
			capabilities, _ := params.SubjectData["capabilities"].([]string)

			syncResult, syncErr = s.crossmintService.SyncAgentIdentity(
				agentID,
				owner,
				name,
				capabilities,
				params.RecipientEmail,
			)

		case domain.CredentialTypeReputation:
			agentID, _ := params.SubjectData["agentId"].(string)
			owner, _ := params.SubjectData["owner"].(string)
			ghostScore, _ := params.SubjectData["ghostScore"].(int)

			syncResult, syncErr = s.crossmintService.SyncReputation(
				agentID,
				owner,
				ghostScore,
				params.RecipientEmail,
			)

		case domain.CredentialTypeJobCompletion:
			jobID, _ := params.SubjectData["jobId"].(string)
			agentID, _ := params.SubjectData["agentId"].(string)
			clientAddress, _ := params.SubjectData["clientAddress"].(string)

			syncResult, syncErr = s.crossmintService.SyncJobCompletion(
				jobID,
				agentID,
				clientAddress,
				params.RecipientEmail,
			)
		}

		if syncErr != nil {
			config.Warnf("Failed to sync to Crossmint: %v", syncErr)
			credential.CrossmintSync = &domain.CrossmintSyncInfo{
				Status: "failed",
				Error:  syncErr.Error(),
			}
		} else if syncResult != nil && syncResult.CrossmintSync != nil {
			credential.CrossmintSync = &domain.CrossmintSyncInfo{
				Status:       string(syncResult.CrossmintSync.Status),
				Chain:        syncResult.CrossmintSync.Chain,
				CredentialID: syncResult.CrossmintSync.CredentialID,
			}
			config.Infof("Credential synced to %s: %s", syncResult.CrossmintSync.Chain, syncResult.CrossmintSync.CredentialID)
		}
	}

	// Cache credential locally
	cacheKey := fmt.Sprintf("credential:%s", credentialID)
	if err := s.storage.SetJSONWithTTL(cacheKey, credential, 24*time.Hour); err != nil {
		config.Warnf("Failed to cache credential: %v", err)
	}

	config.Infof("Credential issued successfully: %s", credentialID)

	return credential, nil
}

// ListCredentials lists all credentials for a subject
func (s *CredentialService) ListCredentials(subject string) ([]*domain.Credential, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("credentials:%s", subject)
	var cachedCredentials []*domain.Credential
	if err := s.storage.GetJSON(cacheKey, &cachedCredentials); err == nil {
		config.Debug("Using cached credentials")
		return cachedCredentials, nil
	}

	config.Infof("Fetching credentials for subject: %s", subject)

	// TODO: Fetch from blockchain
	// For now, return empty list
	config.Warn("Blockchain fetching not yet implemented - returning empty list")

	credentials := []*domain.Credential{}

	// Cache results
	s.storage.SetJSONWithTTL(cacheKey, credentials, 5*time.Minute)

	return credentials, nil
}

// GetCredential gets a specific credential by ID
func (s *CredentialService) GetCredential(credentialID string) (*domain.Credential, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("credential:%s", credentialID)
	var credential domain.Credential
	if err := s.storage.GetJSON(cacheKey, &credential); err == nil {
		config.Debug("Using cached credential")
		return &credential, nil
	}

	config.Infof("Fetching credential: %s", credentialID)

	// TODO: Fetch from blockchain
	config.Warn("Blockchain fetching not yet implemented")

	return nil, domain.ErrCredentialNotFound
}

// RevokeCredential revokes a credential
func (s *CredentialService) RevokeCredential(params domain.RevokeCredentialParams, walletPassword string) error {
	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	_, err = s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to load wallet: %w", err)
	}

	config.Warnf("Revoking credential: %s", params.CredentialPDA)

	// TODO: Build and send revocation transaction
	config.Warn("Transaction building not yet implemented - revocation simulated")

	config.Info("Credential revoked successfully")

	return nil
}

// ExportW3C exports a credential to W3C format
func (s *CredentialService) ExportW3C(credentialID string, pretty bool) (string, error) {
	credential, err := s.GetCredential(credentialID)
	if err != nil {
		return "", err
	}

	w3cCred := credential.ToW3C()

	var jsonBytes []byte
	if pretty {
		jsonBytes, err = json.MarshalIndent(w3cCred, "", "  ")
	} else {
		jsonBytes, err = json.Marshal(w3cCred)
	}

	if err != nil {
		return "", fmt.Errorf("failed to marshal W3C credential: %w", err)
	}

	return string(jsonBytes), nil
}

// VerifyCredential verifies a credential's validity
func (s *CredentialService) VerifyCredential(credentialID string) (bool, error) {
	credential, err := s.GetCredential(credentialID)
	if err != nil {
		return false, err
	}

	if !credential.IsValid() {
		return false, nil
	}

	// TODO: Verify signature and on-chain status
	config.Warn("Signature verification not yet implemented")

	return true, nil
}
