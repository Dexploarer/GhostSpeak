package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

var globalConfig *Config

// LoadConfig initializes and loads configuration from multiple sources
// Priority: explicit calls > flags > env vars > config file > defaults
func LoadConfig() (*Config, error) {
	// Set up Viper
	v := viper.New()

	// Set config file location
	configDir := GetConfigDir()
	configFile := GetConfigFilePath()

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(configDir)

	// Environment variables
	v.SetEnvPrefix("GHOSTSPEAK")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Set defaults
	setDefaults(v)

	// Ensure config directory exists
	if err := EnsureConfigDir(); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	// Read config file if it exists
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found - create default
			if err := createDefaultConfigFile(configFile); err != nil {
				return nil, fmt.Errorf("failed to create default config: %w", err)
			}
			// Read again
			if err := v.ReadInConfig(); err != nil {
				return nil, fmt.Errorf("failed to read config after creation: %w", err)
			}
		} else {
			return nil, fmt.Errorf("error reading config: %w", err)
		}
	}

	// Unmarshal into Config struct
	cfg := &Config{}
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Ensure required directories exist
	if err := cfg.EnsureWalletDir(); err != nil {
		return nil, fmt.Errorf("failed to create wallet directory: %w", err)
	}
	if err := cfg.EnsureCacheDir(); err != nil {
		return nil, fmt.Errorf("failed to create cache directory: %w", err)
	}

	globalConfig = cfg
	return cfg, nil
}

// GetConfig returns the global configuration instance
func GetConfig() *Config {
	if globalConfig == nil {
		// Try to load config
		cfg, err := LoadConfig()
		if err != nil {
			// Return defaults if loading fails
			return GetDefaultConfig()
		}
		return cfg
	}
	return globalConfig
}

// setDefaults sets default values in Viper
func setDefaults(v *viper.Viper) {
	defaults := GetDefaultConfig()

	// Network defaults
	v.SetDefault("network.current", defaults.Network.Current)
	v.SetDefault("network.commitment", defaults.Network.Commitment)
	for network, rpc := range defaults.Network.RPC {
		v.SetDefault(fmt.Sprintf("network.rpc.%s", network), rpc)
	}

	// Wallet defaults
	v.SetDefault("wallet.directory", defaults.Wallet.Directory)
	v.SetDefault("wallet.active", defaults.Wallet.Active)

	// Storage defaults
	v.SetDefault("storage.cache_dir", defaults.Storage.CacheDir)

	// API defaults (empty by default, loaded from env vars)
	v.SetDefault("api.pinata_api_key", defaults.API.PinataAPIKey)
	v.SetDefault("api.pinata_secret_key", defaults.API.PinataSecretKey)
	v.SetDefault("api.pinata_jwt", defaults.API.PinataJWT)

	// Logging defaults
	v.SetDefault("logging.level", defaults.Logging.Level)
	v.SetDefault("logging.format", defaults.Logging.Format)

	// Program defaults
	v.SetDefault("program.devnet_id", defaults.Program.DevnetID)
	v.SetDefault("program.testnet_id", defaults.Program.TestnetID)
	v.SetDefault("program.mainnet_id", defaults.Program.MainnetID)
}

// createDefaultConfigFile creates a default config.yaml file
func createDefaultConfigFile(path string) error {
	defaultYAML := `# GhostSpeak CLI Configuration
# Configuration precedence: CLI flags > Environment variables > This file > Defaults

# Network configuration
network:
  # Current network: devnet, testnet, or mainnet
  current: devnet
  # Commitment level: processed, confirmed, or finalized
  commitment: confirmed
  # RPC endpoints for each network
  rpc:
    devnet: https://api.devnet.solana.com
    testnet: https://api.testnet.solana.com
    mainnet: https://api.mainnet-beta.solana.com

# Wallet configuration
wallet:
  # Directory where encrypted wallets are stored
  directory: ~/.ghostspeak/wallets
  # Active wallet name (leave empty to prompt)
  active: ""

# Storage configuration
storage:
  # Cache directory for agent data and metadata
  cache_dir: ~/.ghostspeak/cache

# External API configuration
# Best practice: Set these via environment variables
# GHOSTSPEAK_API_PINATA_JWT=your_jwt_here
api:
  pinata_api_key: ""
  pinata_secret_key: ""
  pinata_jwt: ""

# Logging configuration
logging:
  # Log level: debug, info, warn, error
  level: info
  # Log format: text or json
  format: text

# GhostSpeak program addresses
program:
  devnet_id: GhostjQedvXgWr1RSfXaHbPz3kGM8HQE9Jq4nQWvr1YE
  testnet_id: ""
  mainnet_id: ""
`

	return os.WriteFile(path, []byte(defaultYAML), 0644)
}

// SaveConfig saves the current configuration to the config file
func SaveConfig(cfg *Config) error {
	v := viper.New()
	configFile := GetConfigFilePath()

	v.SetConfigFile(configFile)

	// Set all values
	v.Set("network", cfg.Network)
	v.Set("wallet", cfg.Wallet)
	v.Set("storage", cfg.Storage)
	v.Set("api", cfg.API)
	v.Set("logging", cfg.Logging)
	v.Set("program", cfg.Program)

	return v.WriteConfig()
}

// UpdateNetwork updates the current network and saves config
func UpdateNetwork(network string) error {
	cfg := GetConfig()
	cfg.Network.Current = network
	return SaveConfig(cfg)
}

// UpdateActiveWallet updates the active wallet and saves config
func UpdateActiveWallet(walletName string) error {
	cfg := GetConfig()
	cfg.Wallet.Active = walletName
	return SaveConfig(cfg)
}
