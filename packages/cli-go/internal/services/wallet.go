package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/pkg/crypto"
	solClient "github.com/ghostspeak/cli-go/pkg/solana"
)

// WalletService handles wallet operations
type WalletService struct {
	cfg    *config.Config
	client *solClient.Client
}

// NewWalletService creates a new wallet service
func NewWalletService(cfg *config.Config, client *solClient.Client) *WalletService {
	return &WalletService{
		cfg:    cfg,
		client: client,
	}
}

// CreateWallet creates a new wallet with a random keypair
func (s *WalletService) CreateWallet(params domain.CreateWalletParams) (*domain.Wallet, error) {
	// Validate parameters
	if err := params.Validate(); err != nil {
		return nil, err
	}

	// Check if wallet already exists
	walletPath := s.getWalletPath(params.Name)
	if _, err := os.Stat(walletPath); err == nil {
		return nil, domain.ErrWalletExists
	}

	// Generate new keypair
	account := solana.NewWallet()
	privateKey := account.PrivateKey

	// Encrypt private key
	encrypted, salt, nonce, err := crypto.EncryptPrivateKey(privateKey, params.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt private key: %w", err)
	}

	// Create encrypted wallet
	encryptedWallet := &domain.EncryptedWallet{
		Name:         params.Name,
		PublicKey:    account.PublicKey().String(),
		EncryptedKey: encrypted,
		Salt:         salt,
		Nonce:        nonce,
		CreatedAt:    time.Now(),
	}

	// Save to disk
	if err := s.saveEncryptedWallet(encryptedWallet); err != nil {
		return nil, fmt.Errorf("failed to save wallet: %w", err)
	}

	// Set as active wallet
	if err := config.UpdateActiveWallet(params.Name); err != nil {
		config.Warnf("Failed to set as active wallet: %v", err)
	}

	config.Infof("Created new wallet: %s (%s)", params.Name, account.PublicKey().String())

	return encryptedWallet.ToWallet(), nil
}

// ImportWallet imports a wallet from a private key
func (s *WalletService) ImportWallet(params domain.ImportWalletParams) (*domain.Wallet, error) {
	// Validate parameters
	if err := params.Validate(); err != nil {
		return nil, err
	}

	// Check if wallet already exists
	walletPath := s.getWalletPath(params.Name)
	if _, err := os.Stat(walletPath); err == nil {
		return nil, domain.ErrWalletExists
	}

	// Parse private key (base58 encoded)
	privateKey, err := solana.PrivateKeyFromBase58(params.PrivateKey)
	if err != nil {
		return nil, domain.ErrInvalidPrivateKey
	}

	// Get public key
	publicKey := privateKey.PublicKey()

	// Encrypt private key
	encrypted, salt, nonce, err := crypto.EncryptPrivateKey(privateKey, params.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt private key: %w", err)
	}

	// Create encrypted wallet
	encryptedWallet := &domain.EncryptedWallet{
		Name:         params.Name,
		PublicKey:    publicKey.String(),
		EncryptedKey: encrypted,
		Salt:         salt,
		Nonce:        nonce,
		CreatedAt:    time.Now(),
	}

	// Save to disk
	if err := s.saveEncryptedWallet(encryptedWallet); err != nil {
		return nil, fmt.Errorf("failed to save wallet: %w", err)
	}

	// Set as active wallet
	if err := config.UpdateActiveWallet(params.Name); err != nil {
		config.Warnf("Failed to set as active wallet: %v", err)
	}

	config.Infof("Imported wallet: %s (%s)", params.Name, publicKey.String())

	return encryptedWallet.ToWallet(), nil
}

// LoadWallet loads and decrypts a wallet
func (s *WalletService) LoadWallet(name, password string) (solana.PrivateKey, error) {
	// Load encrypted wallet
	encryptedWallet, err := s.loadEncryptedWallet(name)
	if err != nil {
		return solana.PrivateKey{}, err
	}

	// Decrypt private key
	privateKeyBytes, err := crypto.DecryptPrivateKey(
		encryptedWallet.EncryptedKey,
		password,
		encryptedWallet.Salt,
		encryptedWallet.Nonce,
	)
	if err != nil {
		return solana.PrivateKey{}, domain.ErrInvalidPassword
	}

	// Parse private key
	var privateKey solana.PrivateKey
	copy(privateKey[:], privateKeyBytes)

	return privateKey, nil
}

// ListWallets lists all wallets
func (s *WalletService) ListWallets() ([]*domain.Wallet, error) {
	walletDir := s.cfg.Wallet.Directory

	entries, err := os.ReadDir(walletDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []*domain.Wallet{}, nil
		}
		return nil, fmt.Errorf("failed to read wallet directory: %w", err)
	}

	var wallets []*domain.Wallet
	activeWallet := s.cfg.Wallet.Active

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		name := entry.Name()[:len(entry.Name())-5] // Remove .json

		encryptedWallet, err := s.loadEncryptedWallet(name)
		if err != nil {
			config.Warnf("Failed to load wallet %s: %v", name, err)
			continue
		}

		wallet := encryptedWallet.ToWallet()
		wallet.IsActive = (name == activeWallet)
		wallets = append(wallets, wallet)
	}

	return wallets, nil
}

// GetActiveWallet gets the active wallet
func (s *WalletService) GetActiveWallet() (*domain.Wallet, error) {
	activeWalletName := s.cfg.Wallet.Active
	if activeWalletName == "" {
		return nil, domain.ErrNoActiveWallet
	}

	encryptedWallet, err := s.loadEncryptedWallet(activeWalletName)
	if err != nil {
		return nil, err
	}

	wallet := encryptedWallet.ToWallet()
	wallet.IsActive = true
	return wallet, nil
}

// GetWalletByName gets a wallet by name
func (s *WalletService) GetWalletByName(name string) (*domain.Wallet, error) {
	encryptedWallet, err := s.loadEncryptedWallet(name)
	if err != nil {
		return nil, err
	}

	wallet := encryptedWallet.ToWallet()
	wallet.IsActive = (name == s.cfg.Wallet.Active)
	return wallet, nil
}

// GetBalance gets the balance of a wallet by public key
func (s *WalletService) GetBalance(publicKey string) (float64, error) {
	balanceInfo, err := s.client.GetBalance(publicKey)
	if err != nil {
		return 0, err
	}

	return domain.LamportsToSOL(balanceInfo), nil
}

// DeleteWallet deletes a wallet
func (s *WalletService) DeleteWallet(name string) error {
	walletPath := s.getWalletPath(name)

	if err := os.Remove(walletPath); err != nil {
		if os.IsNotExist(err) {
			return domain.ErrWalletNotFound
		}
		return fmt.Errorf("failed to delete wallet: %w", err)
	}

	// If this was the active wallet, clear it
	if s.cfg.Wallet.Active == name {
		config.UpdateActiveWallet("")
	}

	config.Infof("Deleted wallet: %s", name)
	return nil
}

// Helper methods

func (s *WalletService) getWalletPath(name string) string {
	return filepath.Join(s.cfg.Wallet.Directory, name+".json")
}

func (s *WalletService) saveEncryptedWallet(wallet *domain.EncryptedWallet) error {
	// Ensure wallet directory exists
	if err := s.cfg.EnsureWalletDir(); err != nil {
		return err
	}

	walletPath := s.getWalletPath(wallet.Name)

	data, err := json.MarshalIndent(wallet, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal wallet: %w", err)
	}

	if err := os.WriteFile(walletPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write wallet file: %w", err)
	}

	return nil
}

func (s *WalletService) loadEncryptedWallet(name string) (*domain.EncryptedWallet, error) {
	walletPath := s.getWalletPath(name)

	data, err := os.ReadFile(walletPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, domain.ErrWalletNotFound
		}
		return nil, fmt.Errorf("failed to read wallet file: %w", err)
	}

	var wallet domain.EncryptedWallet
	if err := json.Unmarshal(data, &wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet: %w", err)
	}

	return &wallet, nil
}
