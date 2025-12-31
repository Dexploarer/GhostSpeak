package domain

import "errors"

// Agent errors
var (
	ErrInvalidAgentID       = errors.New("invalid agent ID")
	ErrInvalidOwner         = errors.New("invalid owner")
	ErrInvalidAgentName     = errors.New("invalid agent name")
	ErrAgentNameLength      = errors.New("agent name must be between 3 and 32 characters")
	ErrInvalidMetadataURI   = errors.New("invalid metadata URI")
	ErrInvalidDescription   = errors.New("invalid description")
	ErrDescriptionTooLong   = errors.New("description must be 200 characters or less")
	ErrNoCapabilities       = errors.New("agent must have at least one capability")
	ErrTooManyCapabilities  = errors.New("agent can have at most 10 capabilities")
	ErrAgentNotFound        = errors.New("agent not found")
)

// Wallet errors
var (
	ErrInvalidWalletName    = errors.New("invalid wallet name")
	ErrWalletExists         = errors.New("wallet already exists")
	ErrWalletNotFound       = errors.New("wallet not found")
	ErrInvalidPassword      = errors.New("invalid password")
	ErrInvalidPrivateKey    = errors.New("invalid private key")
	ErrInvalidMnemonic      = errors.New("invalid mnemonic phrase")
	ErrNoActiveWallet       = errors.New("no active wallet set")
	ErrInsufficientBalance  = errors.New("insufficient balance")
)

// Storage errors
var (
	ErrStorageNotInitialized = errors.New("storage not initialized")
	ErrInvalidKey            = errors.New("invalid storage key")
	ErrKeyNotFound           = errors.New("key not found in storage")
)

// Blockchain errors
var (
	ErrRPCConnection        = errors.New("failed to connect to RPC")
	ErrTransactionFailed    = errors.New("transaction failed")
	ErrInvalidProgramID     = errors.New("invalid program ID")
	ErrInvalidAccountData   = errors.New("invalid account data")
	ErrAccountNotFound      = errors.New("account not found")
)

// IPFS errors
var (
	ErrIPFSUploadFailed     = errors.New("failed to upload to IPFS")
	ErrIPFSFetchFailed      = errors.New("failed to fetch from IPFS")
	ErrInvalidIPFSHash      = errors.New("invalid IPFS hash")
)
