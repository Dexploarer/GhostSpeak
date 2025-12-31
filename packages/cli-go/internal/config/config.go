package config

import (
	"os"
	"path/filepath"
)

// Config holds all application configuration
type Config struct {
	Network     NetworkConfig     `mapstructure:"network"`
	Wallet      WalletConfig      `mapstructure:"wallet"`
	Storage     StorageConfig     `mapstructure:"storage"`
	API         APIConfig         `mapstructure:"api"`
	Logging     LoggingConfig     `mapstructure:"logging"`
	Program     ProgramConfig     `mapstructure:"program"`
}

// NetworkConfig holds blockchain network settings
type NetworkConfig struct {
	Current    string            `mapstructure:"current"`
	Commitment string            `mapstructure:"commitment"`
	RPC        map[string]string `mapstructure:"rpc"`
}

// WalletConfig holds wallet-related settings
type WalletConfig struct {
	Directory string `mapstructure:"directory"`
	Active    string `mapstructure:"active"`
}

// StorageConfig holds local storage settings
type StorageConfig struct {
	CacheDir string `mapstructure:"cache_dir"`
}

// APIConfig holds external API settings
type APIConfig struct {
	PinataAPIKey    string `mapstructure:"pinata_api_key"`
	PinataSecretKey string `mapstructure:"pinata_secret_key"`
	PinataJWT       string `mapstructure:"pinata_jwt"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// ProgramConfig holds GhostSpeak program addresses
type ProgramConfig struct {
	DevnetID  string `mapstructure:"devnet_id"`
	TestnetID string `mapstructure:"testnet_id"`
	MainnetID string `mapstructure:"mainnet_id"`
}

// GetDefaultConfig returns a Config with sensible defaults
func GetDefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	ghostSpeakDir := filepath.Join(homeDir, ".ghostspeak")

	return &Config{
		Network: NetworkConfig{
			Current:    "devnet",
			Commitment: "confirmed",
			RPC: map[string]string{
				"devnet":  "https://api.devnet.solana.com",
				"testnet": "https://api.testnet.solana.com",
				"mainnet": "https://api.mainnet-beta.solana.com",
			},
		},
		Wallet: WalletConfig{
			Directory: filepath.Join(ghostSpeakDir, "wallets"),
			Active:    "",
		},
		Storage: StorageConfig{
			CacheDir: filepath.Join(ghostSpeakDir, "cache"),
		},
		API: APIConfig{
			PinataAPIKey:    "",
			PinataSecretKey: "",
			PinataJWT:       "",
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "text",
		},
		Program: ProgramConfig{
			DevnetID:  "GhostjQedvXgWr1RSfXaHbPz3kGM8HQE9Jq4nQWvr1YE",
			TestnetID: "",
			MainnetID: "",
		},
	}
}

// GetConfigDir returns the GhostSpeak configuration directory
func GetConfigDir() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, ".ghostspeak")
}

// GetConfigFilePath returns the full path to the config file
func GetConfigFilePath() string {
	return filepath.Join(GetConfigDir(), "config.yaml")
}

// GetCurrentRPC returns the RPC endpoint for the current network
func (c *Config) GetCurrentRPC() string {
	if rpc, ok := c.Network.RPC[c.Network.Current]; ok {
		return rpc
	}
	return c.Network.RPC["devnet"]
}

// GetCurrentProgramID returns the program ID for the current network
func (c *Config) GetCurrentProgramID() string {
	switch c.Network.Current {
	case "devnet":
		return c.Program.DevnetID
	case "testnet":
		return c.Program.TestnetID
	case "mainnet":
		return c.Program.MainnetID
	default:
		return c.Program.DevnetID
	}
}

// EnsureConfigDir creates the GhostSpeak config directory if it doesn't exist
func EnsureConfigDir() error {
	configDir := GetConfigDir()
	return os.MkdirAll(configDir, 0755)
}

// EnsureWalletDir creates the wallet directory if it doesn't exist
func (c *Config) EnsureWalletDir() error {
	return os.MkdirAll(c.Wallet.Directory, 0700)
}

// EnsureCacheDir creates the cache directory if it doesn't exist
func (c *Config) EnsureCacheDir() error {
	return os.MkdirAll(c.Storage.CacheDir, 0755)
}

// GetEnv returns the value of an environment variable
func (c *Config) GetEnv(key string) string {
	return os.Getenv(key)
}
