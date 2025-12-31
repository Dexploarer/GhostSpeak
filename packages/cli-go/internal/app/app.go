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
	Config        *config.Config
	SolanaClient  *solana.Client
	Storage       *storage.BadgerDB
	WalletService *services.WalletService
	IPFSService   *services.IPFSService
	AgentService  *services.AgentService
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

	config.Info("Application initialized successfully")

	return &App{
		Config:        cfg,
		SolanaClient:  solanaClient,
		Storage:       badgerDB,
		WalletService: walletService,
		IPFSService:   ipfsService,
		AgentService:  agentService,
	}, nil
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
