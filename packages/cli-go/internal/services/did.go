package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/ports"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// DIDService handles DID operations
type DIDService struct {
	cfg           *config.Config
	client        *solClient.Client
	walletService *WalletService
	storage       ports.Storage
}

// NewDIDService creates a new DID service
func NewDIDService(
	cfg *config.Config,
	client *solClient.Client,
	walletService *WalletService,
	storage ports.Storage,
) *DIDService {
	return &DIDService{
		cfg:           cfg,
		client:        client,
		walletService: walletService,
		storage:       storage,
	}
}

// CreateDID creates a new DID document on-chain
func (s *DIDService) CreateDID(params domain.CreateDIDParams, walletPassword string) (*domain.DIDDocument, error) {
	// Validate parameters
	if err := domain.ValidateCreateDIDParams(params); err != nil {
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

	controllerPubkey := privateKey.PublicKey()

	// Verify controller matches wallet
	if params.Controller != controllerPubkey.String() {
		return nil, fmt.Errorf("controller must match active wallet")
	}

	config.Infof("Creating DID for controller: %s", params.Controller)

	// Derive PDA for DID document
	didPDA, _, err := solClient.DeriveDIDPDA(
		s.client.GetProgramID(),
		controllerPubkey,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to derive PDA: %w", err)
	}

	config.Infof("DID PDA: %s", didPDA.String())

	// Format DID
	did := domain.FormatDID(params.Network, params.Controller)

	// TODO: Build and send transaction to create DID
	// For now, we'll create a mock DID document
	config.Warn("Transaction building not yet implemented - creating mock DID")

	didDoc := &domain.DIDDocument{
		DID:                 did,
		Controller:          params.Controller,
		Network:             params.Network,
		VerificationMethods: params.VerificationMethods,
		ServiceEndpoints:    params.ServiceEndpoints,
		Deactivated:         false,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
		PDA:                 didPDA.String(),
	}

	// Cache DID document locally
	cacheKey := fmt.Sprintf("did:%s", params.Controller)
	if err := s.storage.SetJSONWithTTL(cacheKey, didDoc, 24*time.Hour); err != nil {
		config.Warnf("Failed to cache DID: %v", err)
	}

	config.Infof("DID created successfully: %s", did)

	return didDoc, nil
}

// ResolveDID resolves a DID document by controller address
func (s *DIDService) ResolveDID(controller string) (*domain.DIDDocument, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("did:%s", controller)
	var cachedDID domain.DIDDocument
	if err := s.storage.GetJSON(cacheKey, &cachedDID); err == nil {
		config.Debug("Using cached DID")
		return &cachedDID, nil
	}

	config.Infof("Resolving DID for controller: %s", controller)

	// Parse controller as public key
	controllerPubkey, err := solana.PublicKeyFromBase58(controller)
	if err != nil {
		return nil, fmt.Errorf("invalid controller address: %w", err)
	}

	// Derive PDA
	didPDA, _, err := solClient.DeriveDIDPDA(
		s.client.GetProgramID(),
		controllerPubkey,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to derive PDA: %w", err)
	}

	// Fetch account data from blockchain
	accountInfo, err := s.client.GetAccountInfo(didPDA.String())
	if err != nil {
		return nil, domain.ErrDIDNotFound
	}

	if accountInfo == nil {
		return nil, domain.ErrDIDNotFound
	}

	// Parse DID document from account data
	// TODO: Implement proper account parsing
	// For now, return a mock document
	config.Warn("Account parsing not yet implemented - returning mock DID")

	didDoc := &domain.DIDDocument{
		DID:                 domain.FormatDID(s.cfg.Network.Current, controller),
		Controller:          controller,
		Network:             s.cfg.Network.Current,
		VerificationMethods: []domain.VerificationMethod{},
		ServiceEndpoints:    []domain.ServiceEndpoint{},
		Deactivated:         false,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
		PDA:                 didPDA.String(),
	}

	// Cache result
	s.storage.SetJSONWithTTL(cacheKey, didDoc, 5*time.Minute)

	return didDoc, nil
}

// UpdateDID updates a DID document
func (s *DIDService) UpdateDID(params domain.UpdateDIDParams, walletPassword string) error {
	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to load wallet: %w", err)
	}

	controller := privateKey.PublicKey().String()

	// Resolve existing DID to verify ownership
	didDoc, err := s.ResolveDID(controller)
	if err != nil {
		return err
	}

	if didDoc.Controller != controller {
		return domain.ErrUnauthorized
	}

	if didDoc.Deactivated {
		return domain.ErrDIDDeactivated
	}

	config.Infof("Updating DID: %s", didDoc.DID)

	// TODO: Build and send update transaction
	config.Warn("Transaction building not yet implemented - update simulated")

	// Clear cache to force refresh
	cacheKey := fmt.Sprintf("did:%s", controller)
	s.storage.Delete(cacheKey)

	config.Info("DID updated successfully")

	return nil
}

// DeactivateDID permanently deactivates a DID
func (s *DIDService) DeactivateDID(params domain.DeactivateDIDParams, walletPassword string) error {
	// Get active wallet
	activeWallet, err := s.walletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet: %w", err)
	}

	// Load wallet keypair
	privateKey, err := s.walletService.LoadWallet(activeWallet.Name, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to load wallet: %w", err)
	}

	controller := privateKey.PublicKey().String()

	// Resolve existing DID to verify ownership
	didDoc, err := s.ResolveDID(controller)
	if err != nil {
		return err
	}

	if didDoc.Controller != controller {
		return domain.ErrUnauthorized
	}

	if didDoc.Deactivated {
		return domain.ErrDIDDeactivated
	}

	config.Warnf("Deactivating DID (PERMANENT): %s", didDoc.DID)

	// TODO: Build and send deactivation transaction
	config.Warn("Transaction building not yet implemented - deactivation simulated")

	// Clear cache
	cacheKey := fmt.Sprintf("did:%s", controller)
	s.storage.Delete(cacheKey)

	config.Info("DID deactivated successfully")

	return nil
}

// ExportW3C exports a DID document to W3C format
func (s *DIDService) ExportW3C(controller string, pretty bool) (string, error) {
	didDoc, err := s.ResolveDID(controller)
	if err != nil {
		return "", err
	}

	w3cDoc := didDoc.ToW3C()

	var jsonBytes []byte
	if pretty {
		jsonBytes, err = json.MarshalIndent(w3cDoc, "", "  ")
	} else {
		jsonBytes, err = json.Marshal(w3cDoc)
	}

	if err != nil {
		return "", fmt.Errorf("failed to marshal W3C document: %w", err)
	}

	return string(jsonBytes), nil
}

// GetW3CDocument returns the W3C DID document object
func (s *DIDService) GetW3CDocument(controller string) (*domain.W3CDIDDocument, error) {
	didDoc, err := s.ResolveDID(controller)
	if err != nil {
		return nil, err
	}

	return didDoc.ToW3C(), nil
}

// IsActive checks if a DID is active
func (s *DIDService) IsActive(controller string) (bool, error) {
	didDoc, err := s.ResolveDID(controller)
	if err != nil {
		return false, err
	}

	return didDoc.IsActive(), nil
}

// DeriveDIDPDA derives the PDA for a DID document
func (s *DIDService) DeriveDIDPDA(controller string) (string, error) {
	controllerPubkey, err := solana.PublicKeyFromBase58(controller)
	if err != nil {
		return "", fmt.Errorf("invalid controller address: %w", err)
	}

	didPDA, _, err := solClient.DeriveDIDPDA(
		s.client.GetProgramID(),
		controllerPubkey,
	)
	if err != nil {
		return "", err
	}

	return didPDA.String(), nil
}
