package solana

import (
	"context"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// Client wraps the Solana RPC client
type Client struct {
	rpc        *rpc.Client
	commitment rpc.CommitmentType
	network    string
	programID  solana.PublicKey
}

// NewClient creates a new Solana client
func NewClient(cfg *config.Config) (*Client, error) {
	rpcURL := cfg.GetCurrentRPC()
	rpcClient := rpc.New(rpcURL)

	// Parse commitment level
	var commitment rpc.CommitmentType
	switch cfg.Network.Commitment {
	case "processed":
		commitment = rpc.CommitmentProcessed
	case "confirmed":
		commitment = rpc.CommitmentConfirmed
	case "finalized":
		commitment = rpc.CommitmentFinalized
	default:
		commitment = rpc.CommitmentConfirmed
	}

	// Parse program ID
	programIDStr := cfg.GetCurrentProgramID()
	programID, err := solana.PublicKeyFromBase58(programIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %w", err)
	}

	return &Client{
		rpc:        rpcClient,
		commitment: commitment,
		network:    cfg.Network.Current,
		programID:  programID,
	}, nil
}

// GetBalance returns the balance of an address
func (c *Client) GetBalance(address string) (uint64, error) {
	pubkey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return 0, fmt.Errorf("invalid address: %w", err)
	}

	balance, err := c.rpc.GetBalance(
		context.Background(),
		pubkey,
		c.commitment,
	)
	if err != nil {
		return 0, fmt.Errorf("failed to get balance: %w", err)
	}

	return balance.Value, nil
}

// GetAccountInfo returns account information
func (c *Client) GetAccountInfo(address string) (*rpc.GetAccountInfoResult, error) {
	pubkey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid address: %w", err)
	}

	accountInfo, err := c.rpc.GetAccountInfo(
		context.Background(),
		pubkey,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get account info: %w", err)
	}

	return accountInfo, nil
}

// GetProgramAccounts returns all accounts owned by a program
func (c *Client) GetProgramAccounts(programID string) ([]*rpc.KeyedAccount, error) {
	pubkey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %w", err)
	}

	accounts, err := c.rpc.GetProgramAccountsWithOpts(
		context.Background(),
		pubkey,
		&rpc.GetProgramAccountsOpts{
			Commitment: c.commitment,
			Encoding:   solana.EncodingBase64,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get program accounts: %w", err)
	}

	return accounts, nil
}

// GetAgentProgramAccounts returns all agent accounts
func (c *Client) GetAgentProgramAccounts() ([]*rpc.KeyedAccount, error) {
	return c.GetProgramAccounts(c.programID.String())
}

// SendTransaction sends a transaction to the network
func (c *Client) SendTransaction(tx *solana.Transaction) (solana.Signature, error) {
	sig, err := c.rpc.SendTransaction(
		context.Background(),
		tx,
	)
	if err != nil {
		return solana.Signature{}, fmt.Errorf("failed to send transaction: %w", err)
	}

	return sig, nil
}

// ConfirmTransaction waits for transaction confirmation
func (c *Client) ConfirmTransaction(signature solana.Signature) error {
	// Poll for transaction status
	_, err := c.rpc.GetSignatureStatuses(
		context.Background(),
		true, // searchTransactionHistory
		signature,
	)
	if err != nil {
		return fmt.Errorf("transaction confirmation failed: %w", err)
	}

	return nil
}

// GetRecentBlockhash returns the recent blockhash
func (c *Client) GetRecentBlockhash() (solana.Hash, error) {
	recent, err := c.rpc.GetRecentBlockhash(
		context.Background(),
		c.commitment,
	)
	if err != nil {
		return solana.Hash{}, fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	return recent.Value.Blockhash, nil
}

// GetMinimumBalanceForRentExemption returns minimum balance for rent exemption
func (c *Client) GetMinimumBalanceForRentExemption(dataSize uint64) (uint64, error) {
	balance, err := c.rpc.GetMinimumBalanceForRentExemption(
		context.Background(),
		dataSize,
		c.commitment,
	)
	if err != nil {
		return 0, fmt.Errorf("failed to get minimum balance: %w", err)
	}

	return balance, nil
}

// RequestAirdrop requests an airdrop on devnet/testnet
func (c *Client) RequestAirdrop(address string, lamports uint64) error {
	if c.network == "mainnet" {
		return fmt.Errorf("airdrops not available on mainnet")
	}

	pubkey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return fmt.Errorf("invalid address: %w", err)
	}

	sig, err := c.rpc.RequestAirdrop(
		context.Background(),
		pubkey,
		lamports,
		c.commitment,
	)
	if err != nil {
		return fmt.Errorf("airdrop request failed: %w", err)
	}

	// Wait for confirmation
	return c.ConfirmTransaction(sig)
}

// GetProgramID returns the GhostSpeak program ID
func (c *Client) GetProgramID() solana.PublicKey {
	return c.programID
}

// GetNetwork returns the current network
func (c *Client) GetNetwork() string {
	return c.network
}

// GetCommitment returns the commitment level
func (c *Client) GetCommitment() rpc.CommitmentType {
	return c.commitment
}

// HealthCheck verifies connection to RPC node
func (c *Client) HealthCheck() error {
	_, err := c.rpc.GetHealth(context.Background())
	if err != nil {
		return domain.ErrRPCConnection
	}
	return nil
}
