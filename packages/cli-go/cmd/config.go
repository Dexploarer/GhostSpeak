package cmd

import (
	"fmt"
	"path/filepath"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage CLI configuration",
	Long: `Manage CLI configuration settings.

Commands include viewing current configuration, setting network, and resetting to defaults.`,
}

var configShowCmd = &cobra.Command{
	Use:   "show",
	Short: "Show current configuration",
	Long:  `Display the current CLI configuration including network, RPC endpoints, and paths.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := application.Config

		// Display configuration
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render("GhostSpeak CLI Configuration"))
		fmt.Println()

		fmt.Println(titleStyle.Render("🌐 Network"))
		fmt.Printf("%s %s\n", labelStyle.Render("Current:"), valueStyle.Render(cfg.Network.Current))
		fmt.Printf("%s %s\n", labelStyle.Render("Commitment:"), valueStyle.Render(cfg.Network.Commitment))
		fmt.Println()

		fmt.Println(titleStyle.Render("🔗 RPC Endpoints"))
		for network, endpoint := range cfg.Network.RPC {
			marker := " "
			if network == cfg.Network.Current {
				marker = "●"
			}
			fmt.Printf("%s %s: %s\n", marker, labelStyle.Render(network), valueStyle.Render(endpoint))
		}
		fmt.Println()

		fmt.Println(titleStyle.Render("📦 Program IDs"))
		fmt.Printf("%s %s\n", labelStyle.Render("Devnet:"), valueStyle.Render(cfg.Program.DevnetID))
		fmt.Printf("%s %s\n", labelStyle.Render("Testnet:"), valueStyle.Render(cfg.Program.TestnetID))
		fmt.Printf("%s %s\n", labelStyle.Render("Mainnet:"), valueStyle.Render(cfg.Program.MainnetID))
		fmt.Println()

		fmt.Println(titleStyle.Render("💾 Storage"))
		dataDir := config.GetConfigDir()
		fmt.Printf("%s %s\n", labelStyle.Render("Data Dir:"), valueStyle.Render(dataDir))
		fmt.Printf("%s %s\n", labelStyle.Render("Wallets Dir:"), valueStyle.Render(cfg.Wallet.Directory))
		fmt.Printf("%s %s\n", labelStyle.Render("Cache Dir:"), valueStyle.Render(cfg.Storage.CacheDir))
		fmt.Println()

		fmt.Println(titleStyle.Render("🔧 API"))
		hasJWT := cfg.API.PinataJWT != ""
		if hasJWT {
			fmt.Printf("%s %s\n", labelStyle.Render("Pinata JWT:"), valueStyle.Render("***configured***"))
		} else {
			fmt.Printf("%s %s\n", labelStyle.Render("Pinata JWT:"), valueStyle.Render("not set"))
		}
		fmt.Println()

		fmt.Println(titleStyle.Render("📝 Logging"))
		fmt.Printf("%s %s\n", labelStyle.Render("Level:"), valueStyle.Render(cfg.Logging.Level))
		fmt.Printf("%s %s\n", labelStyle.Render("Format:"), valueStyle.Render(cfg.Logging.Format))
		fmt.Println()

		configPath := filepath.Join(config.GetConfigDir(), "config.yaml")
		fmt.Printf("%s %s\n", labelStyle.Render("Config File:"), valueStyle.Render(configPath))
		fmt.Println()

		return nil
	},
}

var configSetNetworkCmd = &cobra.Command{
	Use:   "set-network <network>",
	Short: "Set the active network",
	Long: `Set which Solana network to use (devnet, testnet, or mainnet).

This will update the configuration and all subsequent commands will use the selected network.`,
	Args: cobra.ExactArgs(1),
	ValidArgs: []string{"devnet", "testnet", "mainnet"},
	RunE: func(cmd *cobra.Command, args []string) error {
		network := args[0]

		// Validate network
		validNetworks := map[string]bool{
			"devnet":  true,
			"testnet": true,
			"mainnet": true,
		}

		if !validNetworks[network] {
			return fmt.Errorf("invalid network: %s (must be devnet, testnet, or mainnet)", network)
		}

		// Update configuration
		application.Config.Network.Current = network
		if err := config.SaveConfig(application.Config); err != nil {
			return fmt.Errorf("failed to save config: %w", err)
		}

		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		fmt.Println()
		fmt.Println(successStyle.Render("✓ Network set to: " + network))
		fmt.Println()

		return nil
	},
}

var configResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "Reset configuration to defaults",
	Long: `Reset the CLI configuration to default values.

This will NOT delete your wallets or agent data, only reset configuration settings.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get confirmation
		fmt.Print("Are you sure you want to reset configuration to defaults? (y/N): ")
		var confirm string
		fmt.Scanln(&confirm)

		if confirm != "y" && confirm != "Y" {
			fmt.Println("Cancelled.")
			return nil
		}

		// Reset to defaults
		defaultConfig := config.GetDefaultConfig()
		if err := config.SaveConfig(defaultConfig); err != nil {
			return fmt.Errorf("failed to reset config: %w", err)
		}

		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		fmt.Println()
		fmt.Println(successStyle.Render("✓ Configuration reset to defaults"))
		fmt.Println()

		return nil
	},
}

var configPathCmd = &cobra.Command{
	Use:   "path",
	Short: "Show configuration file path",
	Long:  `Display the path to the configuration file.`,
	Run: func(cmd *cobra.Command, args []string) {
		configPath := filepath.Join(config.GetConfigDir(), "config.yaml")
		fmt.Println(configPath)
	},
}

func init() {
	// Add subcommands
	configCmd.AddCommand(configShowCmd)
	configCmd.AddCommand(configSetNetworkCmd)
	configCmd.AddCommand(configResetCmd)
	configCmd.AddCommand(configPathCmd)

	// Add to root
	rootCmd.AddCommand(configCmd)
}
