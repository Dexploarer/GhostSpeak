package app

import (
	"fmt"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/services"
	"github.com/ghostspeak/cli-go/internal/storage"
	"github.com/ghostspeak/cli-go/pkg/solana"
)

// App is the main application container
type App struct {
	Config            *config.Config
	Client            *solana.Client // Alias for SolanaClient for backward compatibility
	SolanaClient      *solana.Client
	Storage           *storage.BadgerDB
	WalletService     *services.WalletService
	IPFSService       *services.IPFSService
	AgentService      *services.AgentService
	DIDService        *services.DIDService
	CredentialService *services.CredentialService
	ReputationService *services.ReputationService
	EscrowService     *services.EscrowService
	GovernanceService *services.GovernanceService
	StakingService    *services.StakingService
}

// NewApp creates and initializes a new application
func NewApp() (*App, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// Initialize logger
	config.InitLogger(cfg)
	config.Info("GhostSpeak CLI starting...")
	config.Infof("Network: %s", cfg.Network.Current)
	config.Infof("RPC: %s", cfg.GetCurrentRPC())

	// Initialize Solana client
	solanaClient, err := solana.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create Solana client: %w", err)
	}

	// Health check
	if err := solanaClient.HealthCheck(); err != nil {
		config.Warnf("RPC health check failed: %v", err)
	} else {
		config.Info("RPC connection healthy")
	}

	// Initialize storage
	badgerDB, err := storage.NewBadgerDB(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Initialize services
	walletService := services.NewWalletService(cfg, solanaClient)
	ipfsService := services.NewIPFSService(cfg)
	agentService := services.NewAgentService(cfg, solanaClient, walletService, ipfsService, badgerDB)
	didService := services.NewDIDService(cfg, solanaClient, walletService, badgerDB)

	// Initialize Crossmint client (optional - requires API key)
	var crossmintClient *services.CrossmintClient
	if cfg.API.PinataJWT != "" { // Using PinataJWT as placeholder for Crossmint key
		crossmintClient = services.NewCrossmintClient(cfg, cfg.API.PinataJWT)
	}

	credentialService := services.NewCredentialService(cfg, solanaClient, walletService, didService, crossmintClient, badgerDB)
	reputationService := services.NewReputationService(cfg, solanaClient, badgerDB)
	escrowService := services.NewEscrowService(cfg, solanaClient, walletService, badgerDB)
	governanceService := services.NewGovernanceService(cfg, solanaClient, badgerDB, walletService)
	stakingService := services.NewStakingService(cfg, solanaClient, badgerDB, walletService)

	config.Info("Application initialized successfully")

	return &App{
		Config:            cfg,
		Client:            solanaClient, // Alias
		SolanaClient:      solanaClient,
		Storage:           badgerDB,
		WalletService:     walletService,
		IPFSService:       ipfsService,
		AgentService:      agentService,
		DIDService:        didService,
		CredentialService: credentialService,
		ReputationService: reputationService,
		EscrowService:     escrowService,
		GovernanceService: governanceService,
		StakingService:    stakingService,
	}, nil
}

// ReloadConfig reloads the configuration from disk
func (a *App) ReloadConfig() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to reload config: %w", err)
	}

	a.Config = cfg
	config.Infof("Configuration reloaded (network: %s)", cfg.Network.Current)

	return nil
}

// Close closes all resources
func (a *App) Close() error {
	config.Info("Shutting down...")

	if a.Storage != nil {
		if err := a.Storage.Close(); err != nil {
			config.Errorf("Failed to close storage: %v", err)
		}
	}

	config.Info("Shutdown complete")
	return nil
}
