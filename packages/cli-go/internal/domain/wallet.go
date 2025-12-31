package domain

import (
	"time"
)

// Wallet represents a Solana wallet
type Wallet struct {
	Name       string    `json:"name"`
	PublicKey  string    `json:"publicKey"`
	CreatedAt  time.Time `json:"createdAt"`
	IsActive   bool      `json:"isActive"`
}

// EncryptedWallet represents an encrypted wallet stored on disk
type EncryptedWallet struct {
	Name           string    `json:"name"`
	PublicKey      string    `json:"publicKey"`
	EncryptedKey   []byte    `json:"encryptedKey"`
	Salt           []byte    `json:"salt"`
	Nonce          []byte    `json:"nonce"`
	CreatedAt      time.Time `json:"createdAt"`
}

// WalletBalance represents a wallet's balance information
type WalletBalance struct {
	PublicKey string  `json:"publicKey"`
	Balance   uint64  `json:"balance"`
	BalanceSOL float64 `json:"balanceSOL"`
}

// CreateWalletParams represents parameters for creating a new wallet
type CreateWalletParams struct {
	Name     string
	Password string
}

// ImportWalletParams represents parameters for importing a wallet
type ImportWalletParams struct {
	Name       string
	Password   string
	PrivateKey string
	Mnemonic   string
}

// Validate validates wallet creation parameters
func (p CreateWalletParams) Validate() error {
	if p.Name == "" {
		return ErrInvalidWalletName
	}
	if len(p.Name) < 3 || len(p.Name) > 32 {
		return ErrInvalidWalletName
	}
	if p.Password == "" || len(p.Password) < 8 {
		return ErrInvalidPassword
	}
	return nil
}

// Validate validates wallet import parameters
func (p ImportWalletParams) Validate() error {
	if p.Name == "" {
		return ErrInvalidWalletName
	}
	if len(p.Name) < 3 || len(p.Name) > 32 {
		return ErrInvalidWalletName
	}
	if p.Password == "" || len(p.Password) < 8 {
		return ErrInvalidPassword
	}
	if p.PrivateKey == "" && p.Mnemonic == "" {
		return ErrInvalidPrivateKey
	}
	return nil
}

// ToWallet converts EncryptedWallet to Wallet (without sensitive data)
func (ew *EncryptedWallet) ToWallet() *Wallet {
	return &Wallet{
		Name:      ew.Name,
		PublicKey: ew.PublicKey,
		CreatedAt: ew.CreatedAt,
		IsActive:  false,
	}
}
