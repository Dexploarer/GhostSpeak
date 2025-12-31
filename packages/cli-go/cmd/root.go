package cmd

import (
	"fmt"
	"os"
	"runtime"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/spf13/cobra"
)

var (
	// Global flags
	flagInteractive bool
	flagDebug       bool
	flagDryRun      bool
	flagNetwork     string

	// Global app instance
	application *app.App

	// Version information
	Version = "1.0.0"
	SDKVersion = "2.0.4"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "ghost",
	Short: "GhostSpeak AI Agent Commerce Protocol CLI",
	Long:  renderBanner(),
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Skip app initialization for certain commands
		skipInit := cmd.Name() == "version" || cmd.Name() == "help"
		if skipInit {
			return nil
		}

		// Initialize application
		var err error
		application, err = app.NewApp()
		if err != nil {
			return fmt.Errorf("failed to initialize application: %w", err)
		}

		// Set debug mode if flag is set
		if flagDebug {
			application.Config.Logging.Level = "debug"
			config.InitLogger(application.Config)
		}

		return nil
	},
	PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
		// Clean up application
		if application != nil {
			return application.Close()
		}
		return nil
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	// Global flags
	rootCmd.PersistentFlags().BoolVarP(&flagInteractive, "interactive", "i", false, "Run in interactive mode")
	rootCmd.PersistentFlags().BoolVar(&flagDebug, "debug", false, "Enable debug output")
	rootCmd.PersistentFlags().BoolVar(&flagDryRun, "dry-run", false, "Show what would be done without executing")
	rootCmd.PersistentFlags().StringVar(&flagNetwork, "network", "", "Override network (devnet, testnet, mainnet)")

	// Add version command (enhanced)
	rootCmd.AddCommand(&cobra.Command{
		Use:   "version",
		Short: "Show detailed version information",
		Run:   runVersion,
	})
}

// renderBanner creates the ASCII art banner
func renderBanner() string {
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FEF9A7")).
		Bold(true)

	subtitleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#666666"))

	banner := titleStyle.Render(`
  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███████╗██████╗ ███████╗ █████╗ ██╗  ██╗
 ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝██╔══██╗██║ ██╔╝
 ██║  ███╗███████║██║   ██║███████╗   ██║   ███████╗██████╔╝█████╗  ███████║█████╔╝
 ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ╚════██║██╔═══╝ ██╔══╝  ██╔══██║██╔═██╗
 ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ███████║██║     ███████╗██║  ██║██║  ██╗
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
`)

	subtitle := subtitleStyle.Render("\nAI Agent Commerce Protocol CLI")
	version := subtitleStyle.Render(fmt.Sprintf("CLI v%s | SDK v%s\n", Version, SDKVersion))

	return banner + "\n" + subtitle + "\n" + version
}

// GetApp returns the global application instance
func GetApp() *app.App {
	return application
}

// runVersion displays detailed version information
func runVersion(cmd *cobra.Command, args []string) {
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00D9FF")).
		Bold(true)

	labelStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#888888")).
		Width(20)

	valueStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true)

	fmt.Println(titleStyle.Render("GhostSpeak CLI"))
	fmt.Println()

	// Version information
	fmt.Printf("%s %s\n", labelStyle.Render("CLI Version:"), valueStyle.Render("v"+Version))
	fmt.Printf("%s %s\n", labelStyle.Render("SDK Version:"), valueStyle.Render("v"+SDKVersion))
	fmt.Printf("%s %s\n", labelStyle.Render("Go Version:"), valueStyle.Render(runtime.Version()))

	// Platform information
	platform := fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH)
	fmt.Printf("%s %s\n", labelStyle.Render("Platform:"), valueStyle.Render(platform))

	// Configuration paths
	configPath := config.GetConfigFilePath()
	dataDir := config.GetConfigDir()

	fmt.Println()
	fmt.Printf("%s %s\n", labelStyle.Render("Config File:"), valueStyle.Render(configPath))
	fmt.Printf("%s %s\n", labelStyle.Render("Data Directory:"), valueStyle.Render(dataDir))

	// Load config to show network
	cfg := config.GetConfig()
	if cfg != nil {
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Current Network:"), valueStyle.Render(cfg.Network.Current))
		fmt.Printf("%s %s\n", labelStyle.Render("RPC Endpoint:"), valueStyle.Render(cfg.GetCurrentRPC()))

		if cfg.Wallet.Active != "" {
			fmt.Printf("%s %s\n", labelStyle.Render("Active Wallet:"), valueStyle.Render(cfg.Wallet.Active))
		}
	}
}
